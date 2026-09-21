// server/routes/guardado.js
import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

export const SCHEMA_VERSION = 1;
const MAX_OBJETOS = 500;

/* Validación mínima del payload: sin esto el JSONB se ensucia en dos semanas */
function validarEstado(estado) {
  if (!estado || typeof estado !== 'object' || Array.isArray(estado)) return 'estado debe ser objeto';
  if (!Array.isArray(estado.objetos)) return 'estado.objetos debe ser arreglo';
  if (estado.objetos.length > MAX_OBJETOS) return `máximo ${MAX_OBJETOS} objetos`;
  for (const o of estado.objetos) {
    if (typeof o.type !== 'string' || !o.type) return 'objeto sin type';
    if (!Array.isArray(o.p) || o.p.length !== 3 || o.p.some(n => typeof n !== 'number' || !isFinite(n)))
      return `posición inválida en ${o.type}`;
    if (o.r && (!Array.isArray(o.r) || o.r.length !== 3)) return `rotación inválida en ${o.type}`;
  }
  return null;
}

/* Migradores: cada vez que cambie el formato, agrega una entrada aquí
   en lugar de parchar el frontend. */
const MIGRACIONES = {
  // 1: (estado) => ({ ...estado, objetos: estado.objetos.map(...) }),
};

function migrar(estado, desde) {
  let v = desde;
  while (v < SCHEMA_VERSION) {
    const fn = MIGRACIONES[v];
    if (!fn) break;
    estado = fn(estado);
    v++;
  }
  return { estado, version: v };
}

/* ── PUT /api/guardado  · crea o sobrescribe el snapshot ── */
router.put('/guardado', async (req, res) => {
  const { proyecto_id = 1, slot = 1, estado, progreso = {} } = req.body;
  const err = validarEstado(estado);
  if (err) return res.status(400).json({ error: `Estado inválido: ${err}` });

  try {
    const { rows } = await query(
      `INSERT INTO proyecto_guardados (usuario_id, proyecto_id, slot, schema_version, estado, progreso)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id, proyecto_id, slot) DO UPDATE
         SET estado = EXCLUDED.estado,
             progreso = EXCLUDED.progreso,
             schema_version = EXCLUDED.schema_version
       RETURNING id, actualizado_en`,
      [req.user.id, proyecto_id, slot, SCHEMA_VERSION, estado, progreso]
    );
    res.json({ guardado_id: rows[0].id, actualizado_en: rows[0].actualizado_en });
  } catch (e) {
    console.error('Error guardando snapshot:', e);
    res.status(500).json({ error: 'No se pudo guardar el progreso' });
  }
});

/* ── GET /api/guardado?proyecto_id=1&slot=1 ── */
router.get('/guardado', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  const slot = parseInt(req.query.slot || '1');
  try {
    const { rows } = await query(
      `SELECT id, schema_version, estado, progreso, actualizado_en
         FROM proyecto_guardados
        WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3`,
      [req.user.id, proyectoId, slot]
    );
    if (!rows.length) return res.status(404).json({ error: 'Sin guardado previo' });

    const { estado, version } = migrar(rows[0].estado, rows[0].schema_version);
    res.json({
      estado,
      progreso: rows[0].progreso,
      schema_version: version,
      migrado: version !== rows[0].schema_version,
      actualizado_en: rows[0].actualizado_en
    });
  } catch (e) {
    console.error('Error leyendo snapshot:', e);
    res.status(500).json({ error: 'No se pudo cargar el progreso' });
  }
});

/* ── DELETE /api/guardado  · reiniciar proyecto ── */
router.delete('/guardado', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  const slot = parseInt(req.query.slot || '1');
  try {
    // Archiva el estado antes de borrarlo (recuperable por un admin si el alumno
    // se equivoca; no se expone en la UI del alumno para no complicar el flujo).
    await query(
      `INSERT INTO proyecto_guardados_hist (guardado_id, schema_version, estado)
       SELECT id, schema_version, estado FROM proyecto_guardados
       WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3`,
      [req.user.id, proyectoId, slot]
    );
    await query(
      `DELETE FROM proyecto_guardados WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3`,
      [req.user.id, proyectoId, slot]
    );
    res.json({ message: 'Progreso reiniciado' });
  } catch (e) {
    console.error('Error borrando snapshot:', e);
    res.status(500).json({ error: 'No se pudo reiniciar' });
  }
});

/* ── GET /api/guardado/docente/:usuario_id  · solo admin ── */
router.get('/guardado/docente/:usuario_id', async (req, res) => {
  if (req.user.rol_nombre !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  try {
    const { rows } = await query(
      `SELECT g.id, g.proyecto_id, g.slot, g.schema_version, g.bytes, g.actualizado_en,
              jsonb_array_length(g.estado->'objetos') AS total_objetos
         FROM proyecto_guardados g
        WHERE g.usuario_id = $1
        ORDER BY g.actualizado_en DESC`,
      [parseInt(req.params.usuario_id)]
    );
    res.json({ guardados: rows });
  } catch (e) {
    console.error('Error consultando guardados:', e);
    res.status(500).json({ error: 'Error consultando guardados' });
  }
});

export default router;

/* ── Router aparte para sendBeacon: no puede mandar headers, el token va en el body.
   Móntalo ANTES de verifyToken:  app.use('/api', beaconRouter)  ── */
export const beaconRouter = Router();

beaconRouter.post('/guardado/beacon', async (req, res) => {
  const { token, proyecto_id = 1, slot = 1, estado, progreso = {} } = req.body || {};
  if (!token) return res.sendStatus(401);
  if (validarEstado(estado)) return res.sendStatus(400);
  try {
    const jwt = (await import('jsonwebtoken')).default;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    await query(
      `INSERT INTO proyecto_guardados (usuario_id, proyecto_id, slot, schema_version, estado, progreso)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id, proyecto_id, slot) DO UPDATE
         SET estado = EXCLUDED.estado, progreso = EXCLUDED.progreso,
             schema_version = EXCLUDED.schema_version`,
      [payload.id, proyecto_id, slot, SCHEMA_VERSION, estado, progreso]
    );
    res.sendStatus(204);
  } catch (e) {
    console.error('beacon:', e.message);
    res.sendStatus(401);
  }
});