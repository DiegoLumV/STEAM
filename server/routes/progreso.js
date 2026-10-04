// server/routes/progreso.js
//
// Guardado del progreso de los MÓDULOS DE APRENDIZAJE (learn.html) — no
// confundir con proyecto_guardados, que es el guardado de la CASA dentro
// del simulador y no se toca aquí.
//
// Reutiliza avance_rutas (alumno_id, ruta_id, detalle_avance JSONB), que
// ya existía en el esquema y nunca se estaba usando. No se crea tabla
// nueva. El filtro por req.user.id hace imposible que un alumno recupere
// el progreso de otro.
import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

const RUTA_TITULO = 'Constructor de Casa'; // misma ruta que ya usa /api/entrega

async function resolverRutaId() {
  const r = await query(`SELECT id FROM rutas_aprendizaje WHERE titulo = $1 LIMIT 1`, [RUTA_TITULO]);
  return r.rows[0]?.id || null;
}

/* ── GET /api/progreso-modulos  · recuperar progreso guardado ── */
router.get('/progreso-modulos', async (req, res) => {
  try {
    const rutaId = await resolverRutaId();
    if (!rutaId) return res.json({ completed: null }); // BD sin migrar aún: no romper learn.html

    const { rows } = await query(
      `SELECT detalle_avance, actualizado_en FROM avance_rutas WHERE alumno_id = $1 AND ruta_id = $2`,
      [req.user.id, rutaId]
    );
    if (!rows.length) return res.json({ completed: null });

    res.json({
      completed: rows[0].detalle_avance?.completed || null,
      actualizado_en: rows[0].actualizado_en,
    });
  } catch (err) {
    console.error('Error obteniendo progreso de módulos:', err);
    res.status(500).json({ error: 'No se pudo cargar tu progreso' });
  }
});

/* ── PUT /api/progreso-modulos  · guardar progreso ──
   Body: { completed: { intro:[1,2], math:[1], ... } } */
router.put('/progreso-modulos', async (req, res) => {
  const { completed } = req.body;
  if (!completed || typeof completed !== 'object') {
    return res.status(400).json({ error: 'Progreso inválido' });
  }
  try {
    const rutaId = await resolverRutaId();
    if (!rutaId) return res.status(400).json({ error: 'Falta correr las migraciones (ruta no encontrada)' });

    await query(
      `INSERT INTO avance_rutas (alumno_id, ruta_id, estado_general, detalle_avance, actualizado_en)
       VALUES ($1, $2, 'en_progreso', $3, NOW())
       ON CONFLICT (alumno_id, ruta_id) DO UPDATE
         SET detalle_avance = EXCLUDED.detalle_avance,
             actualizado_en = NOW()`,
      [req.user.id, rutaId, { completed }]
    );
    res.json({ message: 'Progreso guardado' });
  } catch (err) {
    console.error('Error guardando progreso de módulos:', err);
    res.status(500).json({ error: 'No se pudo guardar tu progreso' });
  }
});

export default router;
