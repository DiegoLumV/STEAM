// server/routes/maestro.js
import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const router = Router();
router.use(verifyToken, requireRole('maestro', 'admin'));

/* ───────────────────────────────────────────
   GET /api/maestro/alumnos
   Lista de alumnos con su entrega y calificación del examen final.
   ─────────────────────────────────────────── */
router.get('/alumnos', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.nombre_completo, u.email, u.creado_en AS registrado_en,
              g.entregado_en,
              c.id AS calificacion_id, c.calificacion_final, c.fecha_realizacion
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         LEFT JOIN proyecto_guardados g ON g.usuario_id = u.id AND g.proyecto_id = 1 AND g.slot = 1
         LEFT JOIN calificaciones c ON c.alumno_id = u.id
           AND c.practica_id = (SELECT id FROM practicas WHERE titulo = 'Examen Final: Construcción de Casa' LIMIT 1)
        WHERE r.nombre = 'alumno'
        ORDER BY u.nombre_completo ASC`
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
   Asigna/actualiza la calificación del examen final de un alumno.
   ─────────────────────────────────────────── */
router.put('/calificaciones/:alumno_id', async (req, res) => {
  const alumnoId = parseInt(req.params.alumno_id);
  const { calificacion_final } = req.body;
  const num = Number(calificacion_final);
  if (Number.isNaN(num) || num < 0 || num > 100) {
    return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 100' });
  }
  try {
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
   Estructura preparada para crecer (Google Classroom-like), NO
   implementado todavía a propósito — solo la forma de las rutas
   para cuando se necesiten:

   GET  /api/maestro/actividades              · listar actividades/tareas
   POST /api/maestro/actividades               · crear una actividad nueva
   GET  /api/maestro/actividades/:id/entregas   · entregas de una actividad
   POST /api/maestro/alumnos/:id/comentarios    · retroalimentación individual
   ───────────────────────────────────────────────────────────── */

export default router;
