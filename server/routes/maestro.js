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
import bcrypt from 'bcrypt';
import pool, { query } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const SALT_ROUNDS = 10;
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
   POST /api/maestro/alumnos
   Body: { nombre_completo, email, password, ruta_id }
   Crea el alumno Y lo inscribe al curso en una sola transacción: si algo
   falla a medio camino, no queda un usuario huérfano sin curso.
   ─────────────────────────────────────────── */
router.post('/alumnos', async (req, res) => {
  const { nombre_completo, email, password, ruta_id } = req.body;
  if (!nombre_completo || !email || !password || !ruta_id) {
    return res.status(400).json({ error: 'Nombre, correo, contraseña y curso son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cursoQ = await client.query('SELECT id, profesor_id FROM rutas_aprendizaje WHERE id = $1', [ruta_id]);
    if (!cursoQ.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    if (!esAdmin(req) && cursoQ.rows[0].profesor_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Ese curso no te pertenece' });
    }

    const existe = await client.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const rolAlumno = await client.query(`SELECT id FROM roles WHERE nombre = 'alumno'`);
    if (!rolAlumno.rows.length) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Rol alumno no encontrado. Corre las migraciones.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const nuevo = await client.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, creado_en)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id, nombre_completo, email`,
      [nombre_completo, email.toLowerCase(), passwordHash, rolAlumno.rows[0].id]
    );

    await client.query(
      `INSERT INTO avance_rutas (alumno_id, ruta_id, estado_general, detalle_avance)
       VALUES ($1, $2, 'en_progreso', '{}'::jsonb)`,
      [nuevo.rows[0].id, ruta_id]
    );

    await client.query('COMMIT');

    res.status(201).json({ message: 'Alumno creado e inscrito', alumno: nuevo.rows[0] });
    registrarActividad(req.user.id, 'alumno_creado_por_maestro', { alumno_id: nuevo.rows[0].id, ruta_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando alumno:', err);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
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