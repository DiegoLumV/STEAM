// server/routes/guardado.js
import { Router } from 'express';
import pool, { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const router = Router();
router.use(verifyToken);

export const SCHEMA_VERSION = 2;
const MAX_OBJETOS = 500;
const MAX_HITOS = 100;
const CLAVE_HITO = /^[a-z0-9_]{1,64}$/;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const esObjetoPlano = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const tiene = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* terreno.excavacion: null (sin excavación / rellenada) o medidas numéricas finitas */
function validarTerreno(terreno) {
  if (!esObjetoPlano(terreno)) return 'terreno debe ser objeto';
  const ex = terreno.excavacion;
  if (ex === undefined || ex === null) return null;
  if (!esObjetoPlano(ex)) return 'terreno.excavacion debe ser objeto o null';
  for (const k of ['largo', 'ancho', 'profundidad', 'volumen']) {
    if (ex[k] !== undefined && (typeof ex[k] !== 'number' || !isFinite(ex[k]))) return `terreno.excavacion.${k} inválido`;
  }
  if (ex.activa !== undefined && typeof ex.activa !== 'boolean') return 'terreno.excavacion.activa inválido';
  return null;
}

/* hitos: { "<id>": { en: "<fecha ISO>" } }; sin orden obligatorio. No se inventan ids. */
function validarHitos(hitos) {
  if (!esObjetoPlano(hitos)) return 'hitos debe ser objeto';
  const claves = Object.keys(hitos);
  if (claves.length > MAX_HITOS) return `máximo ${MAX_HITOS} hitos`;
  for (const k of claves) {
    if (!CLAVE_HITO.test(k)) return `clave de hito inválida: ${k.slice(0, 20)}`;
    const h = hitos[k];
    if (!esObjetoPlano(h) || typeof h.en !== 'string' || !FECHA_ISO.test(h.en) || isNaN(Date.parse(h.en)))
      return `hito "${k}" sin fecha ISO válida`;
  }
  return null;
}

/* Validación mínima del payload: sin esto el JSONB se ensucia en dos semanas */
function validarEstado(estado) {
  if (!estado || typeof estado !== 'object' || Array.isArray(estado)) return 'estado debe ser objeto';
  if (estado.v !== undefined && (!Number.isInteger(estado.v) || estado.v < 1 || estado.v > SCHEMA_VERSION))
    return `versión de estado no soportada (${String(estado.v).slice(0, 10)}); el servidor admite hasta la ${SCHEMA_VERSION}`;
  if (estado.terreno !== undefined) { const e = validarTerreno(estado.terreno); if (e) return e; }
  if (estado.hitos !== undefined) { const e = validarHitos(estado.hitos); if (e) return e; }
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
  // v1 -> v2 (aditiva, solo en memoria al leer; no reescribe la fila). Idempotente.
  1: (estado) => ({
    ...estado,
    v: 2,
    terreno: esObjetoPlano(estado.terreno)
      ? estado.terreno
      : { excavacion: esObjetoPlano(estado.progreso) && esObjetoPlano(estado.progreso.excavacion) ? estado.progreso.excavacion : null },
    hitos: esObjetoPlano(estado.hitos) ? estado.hitos : {},
  }),
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

/* Combina "progreso": las claves omitidas se conservan; las enviadas (incluido null) reemplazan
   el valor completo de esa clave. Nunca elimina claves. Un "nuevo" que no sea objeto no cambia nada. */
function combinarProgreso(existente, nuevo) {
  return { ...(esObjetoPlano(existente) ? existente : {}), ...(esObjetoPlano(nuevo) ? nuevo : {}) };
}

/* Hitos: nunca se eliminan por omisión; en claves repetidas prevalece el existente (fecha original). */
function combinarHitos(existentes, nuevos) {
  return { ...(esObjetoPlano(nuevos) ? nuevos : {}), ...(esObjetoPlano(existentes) ? existentes : {}) };
}

/* terreno.excavacion se deriva de la columna "progreso" ya combinada. Si la clave "excavacion" no está
   en ese progreso, se conserva el terreno previo (no se borra información válida por omisión). */
function derivarTerreno(progresoCombinado, terrenoPrevio) {
  const previo = esObjetoPlano(terrenoPrevio) ? terrenoPrevio : null;
  if (esObjetoPlano(progresoCombinado) && tiene(progresoCombinado, 'excavacion'))
    return { ...(previo || {}), excavacion: progresoCombinado.excavacion ?? null };
  return previo || { excavacion: null };
}

const CLAVES_ESTADO_CONOCIDAS = ['v', 'objetos', 'contador', 'progreso', 'terreno', 'hitos'];

/* Calcula lo que se guarda a partir del payload y del guardado existente (o null). Función pura.
   Un payload v1 se ADAPTA a v2 (nunca se etiqueta v2 sin adaptar) y un cliente antiguo no borra campos nuevos.
   Devuelve { estado, progreso } o { error }. */
function normalizarParaGuardar(payload, existente) {
  const err = validarEstado(payload && payload.estado);
  if (err) return { error: err };
  const pe = payload.estado;
  const ee = existente && esObjetoPlano(existente.estado) ? existente.estado : {};

  const progreso = combinarProgreso(existente && existente.progreso, payload.progreso);
  const estadoProgreso = combinarProgreso(ee.progreso, pe.progreso);
  const terreno = derivarTerreno(progreso, esObjetoPlano(ee.terreno) ? ee.terreno : pe.terreno);
  const hitos = combinarHitos(ee.hitos, pe.hitos);

  // Campos de nivel superior que el cliente no conoce (futuros) y que ya estaban guardados: se arrastran.
  const arrastrados = {};
  for (const k of Object.keys(ee)) if (!CLAVES_ESTADO_CONOCIDAS.includes(k) && !tiene(pe, k)) arrastrados[k] = ee[k];

  const estado = { ...arrastrados, ...pe, v: SCHEMA_VERSION, progreso: estadoProgreso, terreno, hitos };
  const errFinal = validarEstado(estado) || validarTerreno(terreno);
  if (errFinal) return { error: errFinal };
  return { estado, progreso };
}

/* Guarda en UNA transacción: bloqueo por (usuario, proyecto, slot) → lectura del guardado actual →
   archivo del estado y progreso anteriores si aún era anterior a v2 → upsert. Sin datos parciales.
   Devuelve { id, actualizado_en } o { error } (payload inválido). */
async function guardarSnapshot(usuarioId, proyectoId, slot, estado, progreso) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`guardado:${usuarioId}:${proyectoId}:${slot}`]);
    const { rows: previo } = await client.query(
      `SELECT id, schema_version, estado, progreso
         FROM proyecto_guardados
        WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3
          FOR UPDATE`,
      [usuarioId, proyectoId, slot]
    );
    const existente = previo[0] || null;
    const norm = normalizarParaGuardar({ estado, progreso }, existente);
    if (norm.error) {
      await client.query('ROLLBACK');
      return { error: norm.error };
    }
    if (existente && existente.schema_version < SCHEMA_VERSION) {
      await client.query(
        `INSERT INTO proyecto_guardados_hist (guardado_id, schema_version, estado, progreso, usuario_id, proyecto_id, slot, motivo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'migracion_v2')`,
        [existente.id, existente.schema_version, existente.estado, existente.progreso, usuarioId, proyectoId, slot]
      );
    }
    const { rows } = await client.query(
      `INSERT INTO proyecto_guardados (usuario_id, proyecto_id, slot, schema_version, estado, progreso)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id, proyecto_id, slot) DO UPDATE
         SET estado = EXCLUDED.estado,
             progreso = EXCLUDED.progreso,
             schema_version = EXCLUDED.schema_version
       RETURNING id, actualizado_en`,
      [usuarioId, proyectoId, slot, SCHEMA_VERSION, norm.estado, norm.progreso]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* conexión ya cerrada */ }
    throw e;
  } finally {
    client.release();
  }
}

/* ── PUT /api/guardado  · crea o sobrescribe el snapshot ── */
router.put('/guardado', async (req, res) => {
  const { proyecto_id = 1, slot = 1, estado, progreso = {} } = req.body;
  const err = validarEstado(estado);
  if (err) return res.status(400).json({ error: `Estado inválido: ${err}` });

  try {
    const r = await guardarSnapshot(req.user.id, proyecto_id, slot, estado, progreso);
    if (r.error) return res.status(400).json({ error: `Estado inválido: ${r.error}` });
    res.json({ guardado_id: r.id, actualizado_en: r.actualizado_en });
  } catch (e) {
    console.error('Error guardando snapshot:', e);
    res.status(500).json({ error: 'No se pudo guardar el progreso' });
  }
});

/* ── GET /api/guardado?proyecto_id=1&slot=1 ── */
router.get('/guardado', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  const slot = parseInt(req.query.slot || '1');
  let targetUserId = req.user.id;
  if (req.query.alumno_id && (req.user.rol_nombre === 'maestro' || req.user.rol_nombre === 'admin')) {
      targetUserId = parseInt(req.query.alumno_id);
  }
  try {
    const { rows } = await query(
      `SELECT id, schema_version, estado, progreso, actualizado_en
         FROM proyecto_guardados
        WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3`,
      [targetUserId, proyectoId, slot]
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

/* ── GET /api/guardado/meta?proyecto_id=1&slot=1 ── */
router.get('/guardado/meta', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  const slot = parseInt(req.query.slot || '1');
  let targetUserId = req.user.id;
  if (req.query.alumno_id && (req.user.rol_nombre === 'maestro' || req.user.rol_nombre === 'admin')) {
      targetUserId = parseInt(req.query.alumno_id);
  }
  try {
    const { rows } = await query(
      `SELECT actualizado_en
         FROM proyecto_guardados
        WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3`,
      [targetUserId, proyectoId, slot]
    );
    if (!rows.length) return res.status(404).json({ error: 'Sin guardado previo' });
    res.json({ actualizado_en: rows[0].actualizado_en });
  } catch (e) {
    console.error('Error leyendo meta:', e);
    res.status(500).json({ error: 'No se pudo cargar metadata' });
  }
});

/* ── DELETE /api/guardado  · reiniciar proyecto ── */
router.delete('/guardado', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  const slot = parseInt(req.query.slot || '1');
  try {
    // Archiva y borra en UNA sola sentencia (atómica): el historial recibe exactamente la fila que se
    // borró, con su "progreso", usuario, proyecto y slot (recuperable por un admin si el alumno se
    // equivoca; no se expone en la UI del alumno para no complicar el flujo). Si no hay fila, no archiva nada.
    await query(
      `WITH borrado AS (
         DELETE FROM proyecto_guardados
          WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3
          RETURNING id, schema_version, estado, progreso, usuario_id, proyecto_id, slot)
       INSERT INTO proyecto_guardados_hist
              (guardado_id, schema_version, estado, progreso, usuario_id, proyecto_id, slot, motivo)
       SELECT id, schema_version, estado, progreso, usuario_id, proyecto_id, slot, 'reinicio' FROM borrado`,
      [req.user.id, proyectoId, slot]
    );
    res.json({ message: 'Progreso reiniciado' });
    registrarActividad(req.user.id, 'reinicio_casa', { proyecto_id: proyectoId });
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
    const r = await guardarSnapshot(payload.id, proyecto_id, slot, estado, progreso);
    if (r.error) return res.sendStatus(400);
    res.sendStatus(204);
  } catch (e) {
    console.error('beacon:', e.message);
    res.sendStatus(401);
  }
});