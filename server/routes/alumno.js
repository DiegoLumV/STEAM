// server/routes/alumno.js
import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

/* ───────────────────────────────────────────
   GET /api/alumno/calificaciones
   El alumno consulta sus propias calificaciones (solo las suyas: el filtro
   por req.user.id lo hace imposible ver las de otro alumno).
   ─────────────────────────────────────────── */
router.get('/calificaciones', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.calificacion_final, c.fecha_realizacion,
              p.titulo AS practica, ra.titulo AS ruta
         FROM calificaciones c
         JOIN practicas p ON p.id = c.practica_id
         JOIN rutas_aprendizaje ra ON ra.id = p.ruta_id
        WHERE c.alumno_id = $1
        ORDER BY c.fecha_realizacion DESC`,
      [req.user.id]
    );
    res.json({ calificaciones: rows });
  } catch (err) {
    console.error('Error obteniendo calificaciones:', err);
    res.status(500).json({ error: 'Error obteniendo calificaciones' });
  }
});

export default router;
