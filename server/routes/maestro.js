// server/routes/maestro.js
//
// Reutiliza tablas que ya existían, no se crean estructuras nuevas:
//   rutas_aprendizaje  = "cursos" (ya tenía profesor_id -> dueño del curso)
//   avance_rutas       = "inscripción" alumno<->curso (ya existía, se le
//                         agregó UNIQUE(alumno_id, ruta_id) en la migración 007)
//
// Reglas de propiedad (aplicadas aquí, en el backend, no solo ocultando
// botones en el HTML):
//   - Un maestro solo ve/administra alumnos inscritos en SUS cursos.
//   - Un maestro solo puede asignar alumnos a SUS propios cursos.
//   - Un admin que entre a estas mismas rutas ve todo, sin filtrar.
import { Router } from 'express';
import pool, { query } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const router = Router();
router.use(verifyToken, requireRole('maestro', 'admin'));

const esAdmin = (req) => req.rolActual === 'admin';

/* ───────────────────────────────────────────
   GET /api/maestro/cursos
   Cursos del maestro (rutas_aprendizaje que él imparte), con cuántos
   alumnos tiene inscritos cada uno. Si un maestro nuevo no tiene ningún
   curso todavía, se le crea uno por defecto la primera vez que entra
   aquí — así el dashboard nunca se queda sin nada que asignar.
   ─────────────────────────────────────────── */
router.get('/cursos', async (req, res) => {
  try {
    if (!esAdmin(req)) {
      const propios = await query('SELECT id FROM rutas_aprendizaje WHERE profesor_id = $1', [req.user.id]);
      if (!propios.rows.length) {
        await query(
          `INSERT INTO rutas_aprendizaje (profesor_id, titulo, descripcion, orden_secuencia)
           VALUES ($1, 'Constructor de Casa', 'Curso asignado automáticamente', 1)`,
          [req.user.id]
        );
      }
    }

    const filtro = esAdmin(req) ? '' : 'WHERE ra.profesor_id = $1';
    const params = esAdmin(req) ? [] : [req.user.id];
    const { rows } = await query(
      `SELECT ra.id, ra.titulo, ra.descripcion, ra.orden_secuencia,
              COUNT(av.alumno_id) AS total_alumnos
         FROM rutas_aprendizaje ra
         LEFT JOIN avance_rutas av ON av.ruta_id = ra.id
         ${filtro}
        GROUP BY ra.id
        ORDER BY ra.orden_secuencia ASC`,
      params
    );
    res.json({ cursos: rows });
  } catch (err) {
    console.error('Error listando cursos:', err);
    res.status(500).json({ error: 'Error obteniendo cursos' });
  }
});

/* ───────────────────────────────────────────
   GET /api/maestro/cursos/:id/alumnos
   Alumnos inscritos en un curso puntual (para la sección "Cursos").
   Valida que el curso sea del maestro antes de mostrar nada.
   ─────────────────────────────────────────── */
router.get('/cursos/:id/alumnos', async (req, res) => {
  const rutaId = parseInt(req.params.id);
  try {
    if (!esAdmin(req)) {
      const propio = await query('SELECT id FROM rutas_aprendizaje WHERE id = $1 AND profesor_id = $2', [rutaId, req.user.id]);
      if (!propio.rows.length) return res.status(403).json({ error: 'Ese curso no te pertenece' });
    }
    const { rows } = await query(
      `SELECT u.id, u.nombre_completo, u.email, av.estado_general
         FROM avance_rutas av
         JOIN usuarios u ON u.id = av.alumno_id
        WHERE av.ruta_id = $1
        ORDER BY u.nombre_completo ASC`,
      [rutaId]
    );
    res.json({ alumnos: rows });
  } catch (err) {
    console.error('Error listando alumnos del curso:', err);
    res.status(500).json({ error: 'Error obteniendo alumnos del curso' });
  }
});

/* ───────────────────────────────────────────
   GET /api/maestro/alumnos-disponibles
   Alumnos con rol 'alumno' que AÚN NO están inscritos en ningún curso
   de este maestro. Sirve para llenar el selector del modal de asignación.
   ─────────────────────────────────────────── */
router.get('/alumnos-disponibles', async (req, res) => {
  try {
    // Si es admin, no hay filtro de cursos propios
    const filtroProfesor = esAdmin(req) ? '' : 'AND ra.profesor_id = $1';
    const paramsSubquery = esAdmin(req) ? [] : [req.user.id];

    // IDs de alumnos ya inscritos en los cursos de este maestro
    const inscritos = await query(
      `SELECT DISTINCT av.alumno_id
         FROM avance_rutas av
         JOIN rutas_aprendizaje ra ON ra.id = av.ruta_id
        WHERE 1=1 ${filtroProfesor}`,
      paramsSubquery
    );
    const inscritosIds = inscritos.rows.map(r => r.alumno_id);

    // Todos los usuarios con rol alumno
    const { rows } = await query(
      `SELECT u.id, u.nombre_completo, u.email
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE r.nombre = 'alumno'
        ORDER BY u.nombre_completo ASC`
    );

    // Excluir los que ya están inscritos
    const disponibles = rows.filter(u => !inscritosIds.includes(u.id));
    res.json({ alumnos: disponibles });
  } catch (err) {
    console.error('Error listando alumnos disponibles:', err);
    res.status(500).json({ error: 'Error obteniendo alumnos disponibles' });
  }
});

/* ───────────────────────────────────────────
   POST /api/maestro/alumnos
   Body: { alumno_id, ruta_id }
   Asigna/inscribe un alumno EXISTENTE al curso del maestro.
   NO crea cuentas nuevas — el alumno ya debe estar registrado en el sistema.
   ─────────────────────────────────────────── */
router.post('/alumnos', async (req, res) => {
  const { alumno_id, ruta_id } = req.body;
  if (!alumno_id || !ruta_id) {
    return res.status(400).json({ error: 'alumno_id y ruta_id son obligatorios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el curso pertenece al maestro
    const cursoQ = await client.query('SELECT id, profesor_id FROM rutas_aprendizaje WHERE id = $1', [ruta_id]);
    if (!cursoQ.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    if (!esAdmin(req) && cursoQ.rows[0].profesor_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Ese curso no te pertenece' });
    }

    // Verificar que el alumno existe y tiene rol alumno
    const alumnoQ = await client.query(
      `SELECT u.id, u.nombre_completo FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE u.id = $1 AND r.nombre = 'alumno'`,
      [alumno_id]
    );
    if (!alumnoQ.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Verificar que no esté ya inscrito en este curso
    const yaInscrito = await client.query(
      'SELECT id FROM avance_rutas WHERE alumno_id = $1 AND ruta_id = $2',
      [alumno_id, ruta_id]
    );
    if (yaInscrito.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El alumno ya está inscrito en ese curso' });
    }

    await client.query(
      `INSERT INTO avance_rutas (alumno_id, ruta_id, estado_general, detalle_avance)
       VALUES ($1, $2, 'en_progreso', '{}'::jsonb)`,
      [alumno_id, ruta_id]
    );

    await client.query('COMMIT');

    res.status(201).json({ message: 'Alumno asignado al curso correctamente', alumno: alumnoQ.rows[0] });
    registrarActividad(req.user.id, 'alumno_asignado_por_maestro', { alumno_id, ruta_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error asignando alumno:', err);
    res.status(500).json({ error: 'No se pudo asignar el alumno' });
  } finally {
    client.release();
  }
});

/* ───────────────────────────────────────────
   GET /api/maestro/alumnos
   Solo alumnos inscritos en algún curso de este maestro (admin ve todos).
   ─────────────────────────────────────────── */
router.get('/alumnos', async (req, res) => {
  try {
    const filtroDueno = esAdmin(req) ? '' : 'AND ra.profesor_id = $1';
    const params = esAdmin(req) ? [] : [req.user.id];
    const { rows } = await query(
      `SELECT u.id, u.nombre_completo, u.email, u.creado_en AS registrado_en,
              ra.titulo AS curso, av.estado_general,
              g.entregado_en,
              c.id AS calificacion_id, c.calificacion_final, c.fecha_realizacion
         FROM avance_rutas av
         JOIN usuarios u ON u.id = av.alumno_id
         JOIN rutas_aprendizaje ra ON ra.id = av.ruta_id
         LEFT JOIN proyecto_guardados g ON g.usuario_id = u.id AND g.proyecto_id = 1 AND g.slot = 1
         LEFT JOIN calificaciones c ON c.alumno_id = u.id
           AND c.practica_id = (SELECT id FROM practicas WHERE titulo = 'Examen Final: Construcción de Casa' LIMIT 1)
        WHERE 1=1 ${filtroDueno}
        ORDER BY u.nombre_completo ASC`,
      params
    );
    res.json({ alumnos: rows });
  } catch (err) {
    console.error('Error listando alumnos:', err);
    res.status(500).json({ error: 'Error obteniendo alumnos' });
  }
});

/* ───────────────────────────────────────────
   PUT /api/maestro/calificaciones/:alumno_id
   Body: { calificacion_final: 0-100 }
   Solo se puede calificar a un alumno inscrito en un curso de este maestro.
   ─────────────────────────────────────────── */
router.put('/calificaciones/:alumno_id', async (req, res) => {
  const alumnoId = parseInt(req.params.alumno_id);
  const { calificacion_final } = req.body;
  const num = Number(calificacion_final);
  if (Number.isNaN(num) || num < 0 || num > 100) {
    return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 100' });
  }
  try {
    if (!esAdmin(req)) {
      const pertenece = await query(
        `SELECT 1 FROM avance_rutas av
           JOIN rutas_aprendizaje ra ON ra.id = av.ruta_id
          WHERE av.alumno_id = $1 AND ra.profesor_id = $2`,
        [alumnoId, req.user.id]
      );
      if (!pertenece.rows.length) return res.status(403).json({ error: 'Ese alumno no está en tus cursos' });
    }

    const practica = await query(
      `SELECT id FROM practicas WHERE titulo = 'Examen Final: Construcción de Casa' LIMIT 1`
    );
    if (!practica.rows.length) return res.status(400).json({ error: 'Falta correr las migraciones (práctica no encontrada)' });

    const { rows } = await query(
      `UPDATE calificaciones SET calificacion_final = $1
        WHERE alumno_id = $2 AND practica_id = $3
        RETURNING id`,
      [num, alumnoId, practica.rows[0].id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Este alumno todavía no ha entregado su casa' });

    res.json({ message: 'Calificación actualizada' });
    registrarActividad(req.user.id, 'calificacion_asignada', { alumno_id: alumnoId, calificacion_final: num });
  } catch (err) {
    console.error('Error asignando calificación:', err);
    res.status(500).json({ error: 'Error asignando calificación' });
  }
});

/* ─────────────────────────────────────────────────────────────
   Estructura preparada para crecer (Google Classroom), NO
   implementado todavía a propósito — solo la forma de las rutas
   para cuando se necesiten:

   GET  /api/maestro/actividades              · listar actividades/tareas
   POST /api/maestro/actividades               · crear una actividad nueva
   GET  /api/maestro/actividades/:id/entregas   · entregas de una actividad
   POST /api/maestro/alumnos/:id/comentarios    · retroalimentación individual
   ───────────────────────────────────────────────────────────── */

export default router;