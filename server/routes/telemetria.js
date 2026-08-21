import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Todos los endpoints de telemetría requieren token
router.use(verifyToken);

/* ───────────────────────────────────────────
   POST /sesion
   Inicia una sesión de simulación
   ─────────────────────────────────────────── */
router.post('/sesion', async (req, res) => {
  try {
    const { proyecto_id = 1, metadata = {} } = req.body;
    const usuarioId = req.user.id;

    const result = await query(
      `INSERT INTO sesiones_simulacion (usuario_id, proyecto_id, fecha_inicio, metadata)
       VALUES ($1, $2, NOW(), $3)
       RETURNING id, fecha_inicio`,
      [usuarioId, proyecto_id, metadata]
    );

    const sesion = result.rows[0];
    res.status(201).json({
      sesion_id: sesion.id,
      fecha_inicio: sesion.fecha_inicio
    });
  } catch (err) {
    console.error('Error iniciando sesión:', err);
    res.status(500).json({ error: 'Error iniciando sesión de simulación' });
  }
});

/* ───────────────────────────────────────────
   PUT /sesion/:id/fin
   Cierra una sesión de simulación
   ─────────────────────────────────────────── */
router.put('/sesion/:id/fin', async (req, res) => {
  try {
    const sesionId = parseInt(req.params.id);
    const usuarioId = req.user.id;

    // Verificar que la sesión pertenezca al usuario
    const checkResult = await query(
      `SELECT id, fecha_inicio FROM sesiones_simulacion WHERE id = $1 AND usuario_id = $2`,
      [sesionId, usuarioId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o no autorizada' });
    }

    const fechaInicio = new Date(checkResult.rows[0].fecha_inicio);

    const result = await query(
      `UPDATE sesiones_simulacion
       SET fecha_fin = NOW()
       WHERE id = $1
       RETURNING fecha_fin`,
      [sesionId]
    );

    const fechaFin = new Date(result.rows[0].fecha_fin);
    const duracionSegundos = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 1000);

    res.json({
      message: 'Sesión cerrada',
      duracion_segundos: duracionSegundos
    });
  } catch (err) {
    console.error('Error cerrando sesión:', err);
    res.status(500).json({ error: 'Error cerrando sesión de simulación' });
  }
});

/* ───────────────────────────────────────────
   POST /telemetria
   Recibe un lote de eventos de telemetría
   ─────────────────────────────────────────── */
router.post('/telemetria', async (req, res) => {
  try {
    const { sesion_id, eventos } = req.body;
    const usuarioId = req.user.id;

    if (!sesion_id || !eventos || !Array.isArray(eventos) || eventos.length === 0) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (sesion_id, eventos)' });
    }

    // Verificar que la sesión pertenezca al usuario
    const checkResult = await query(
      `SELECT id FROM sesiones_simulacion WHERE id = $1 AND usuario_id = $2`,
      [sesion_id, usuarioId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o no autorizada' });
    }

    // Construir la consulta de inserción masiva
    const values = [];
    const params = [sesion_id]; // $1
    let paramIndex = 2;

    eventos.forEach(evt => {
      values.push(`($1, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(
        evt.tipo_evento,
        evt.pos_x,
        evt.pos_y,
        evt.pos_z,
        evt.actividad_id,
        evt.contexto || {},
        evt.marca_tiempo || new Date()
      );
    });

    const insertQuery = `
      INSERT INTO telemetria_3d (
        sesion_id, tipo_evento, pos_x, pos_y, pos_z, actividad_id, contexto, marca_tiempo
      ) VALUES ${values.join(', ')}
    `;

    await query(insertQuery, params);

    res.status(201).json({ insertados: eventos.length });
  } catch (err) {
    console.error('Error insertando eventos de telemetría:', err);
    res.status(500).json({ error: 'Error procesando eventos de telemetría' });
  }
});

/* ───────────────────────────────────────────
   GET /telemetria/:sesion_id
   Obtiene el timeline completo de una sesión
   ─────────────────────────────────────────── */
router.get('/telemetria/:sesion_id', async (req, res) => {
  try {
    const sesionId = parseInt(req.params.sesion_id);
    const usuarioId = req.user.id;
    const rolNombre = req.user.rol_nombre;

    // Verificar que la sesión pertenezca al usuario o sea admin
    const checkQuery = rolNombre === 'admin' 
      ? `SELECT id FROM sesiones_simulacion WHERE id = $1`
      : `SELECT id FROM sesiones_simulacion WHERE id = $1 AND usuario_id = $2`;
    
    const checkParams = rolNombre === 'admin' ? [sesionId] : [sesionId, usuarioId];
    
    const checkResult = await query(checkQuery, checkParams);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o no autorizada' });
    }

    const result = await query(
      `SELECT * FROM telemetria_3d
       WHERE sesion_id = $1
       ORDER BY marca_tiempo ASC`,
      [sesionId]
    );

    res.json({
      eventos: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Error obteniendo timeline de telemetría:', err);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
});

export default router;
