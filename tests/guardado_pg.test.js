// Fase 2: transacción de guardado con PostgreSQL REAL, solo contra la base temporal descartable.
// Se omite por completo si no se define STEAM_TEST_PG_SOCKET. No lee .env ni importa server/db.js.
//   STEAM_TEST_PG_SOCKET=/var/tmp/steam_pg_f2/sock node --test tests/guardado_pg.test.js
// (ejecutar desde un directorio de trabajo sin .env, o definir las variables; este archivo nunca lo lee)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import pg from 'pg';

const SOCKET = process.env.STEAM_TEST_PG_SOCKET;
const OMITIR = !SOCKET ? 'define STEAM_TEST_PG_SOCKET para ejecutar las pruebas con PostgreSQL temporal' : false;
const clon = o => JSON.parse(JSON.stringify(o));
const FECHA = '2026-10-23T16:00:00.000Z';

let pool, S;
const EMAIL = `pg_f2_${process.pid}_${Date.now()}@example.test`;
let uid;

async function identidad(c) {
  const { rows: [r] } = await c.query(
    `SELECT current_database() AS db, current_setting('port') AS port, current_setting('data_directory') AS dir, current_setting('listen_addresses') AS la`);
  if (r.db !== 'steam_tmp_fase2' || r.port !== '54329' || r.dir !== '/var/tmp/steam_pg_f2/data' || r.la !== '')
    throw new Error('BASE INCORRECTA, se aborta sin escribir: ' + JSON.stringify(r));
}

function cargarServidor(poolReal) {
  const src = fs.readFileSync(new URL('../server/routes/guardado.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace('export default router;', '')
    .replace(/^export const beaconRouter[\s\S]*$/m, '');
  const router = { use() {}, get() {}, put() {}, post() {}, delete() {} };
  const ctx = vm.createContext({ Router: () => router, query: (t, p) => poolReal.query(t, p), pool: poolReal, verifyToken() {}, console });
  vm.runInContext(src, ctx);
  return { guardar: (...a) => ctx.guardarSnapshot(...a).then(clon), migrar: (e, v) => clon(ctx.migrar(e, v)) };
}

const v1 = (extra = {}) => ({ v: 1, objetos: [{ id: 1, type: 'block', p: [0, 0, 0] }], contador: 2, progreso: { buildPhase: 1 }, ...extra });
const EXC = { largo: 12, ancho: 10, profundidad: 1.5, volumen: 180, activa: true };

async function insertarV1(slot, estado, progreso) {
  await pool.query(
    `INSERT INTO proyecto_guardados (usuario_id, proyecto_id, slot, schema_version, estado, progreso) VALUES ($1, 1, $2, 1, $3, $4)`,
    [uid, slot, estado, progreso]);
}
const fila = async slot => (await pool.query(
  `SELECT id, schema_version, estado, progreso, entregado_en, actualizado_en, xmin::text AS xmin FROM proyecto_guardados WHERE usuario_id=$1 AND proyecto_id=1 AND slot=$2`, [uid, slot])).rows[0];
const hist = async slot => (await pool.query(
  `SELECT schema_version, estado, progreso, motivo, guardado_id FROM proyecto_guardados_hist WHERE usuario_id=$1 AND proyecto_id=1 AND slot=$2`, [uid, slot])).rows;

test('PostgreSQL temporal: preparación', { skip: OMITIR }, async () => {
  pool = new pg.Pool({ host: SOCKET, port: 54329, database: 'steam_tmp_fase2', user: 'postgres', max: 12 });
  const c = await pool.connect();
  try {
    await identidad(c);
    const { rows } = await c.query(`INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id)
      SELECT 'Prueba fase 2', $1, 'x', id FROM roles WHERE nombre = 'alumno' RETURNING id`, [EMAIL]);
    uid = rows[0].id;
  } finally { c.release(); }
  S = cargarServidor(pool);
});

test('archivado único: N guardados concurrentes sobre una fila v1 → 1 sola copia, idéntica al v1 previo', { skip: OMITIR }, async () => {
  const estado = v1({ progreso: { buildPhase: 1 } });
  const progreso = { buildPhase: 2, excavacion: null };    // la columna difiere de estado.progreso a propósito
  await insertarV1(1, estado, progreso);
  const res = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    S.guardar(uid, 1, 1, v1({ contador: 10 + i }), { buildPhase: 3 })));
  assert.ok(res.every(r => r.id), 'todos terminaron');
  const h = await hist(1);
  assert.equal(h.length, 1, 'exactamente un archivo');
  assert.deepEqual(h[0].estado, estado, 'estado archivado idéntico');
  assert.deepEqual(h[0].progreso, progreso, 'columna progreso archivada idéntica');
  assert.equal(h[0].schema_version, 1);
  assert.equal(h[0].motivo, 'migracion_v2');
  const f = await fila(1);
  assert.equal(f.schema_version, 2);
  assert.equal(f.estado.v, 2);
  assert.deepEqual(f.estado.hitos, {});
});

test('cliente antiguo sobre fila v2: no archiva de nuevo, conserva hitos, terreno y entregado_en', { skip: OMITIR }, async () => {
  await pool.query(`UPDATE proyecto_guardados SET estado = jsonb_set(jsonb_set(estado,'{hitos}', $2::jsonb), '{futuro}', '{"a":1}'::jsonb),
                    progreso = progreso || $3::jsonb, entregado_en = NOW() WHERE usuario_id=$1 AND slot=1`,
    [uid, JSON.stringify({ hecho: { en: FECHA } }), JSON.stringify({ excavacion: EXC })]);
  const antes = await fila(1);
  await S.guardar(uid, 1, 1, v1({ contador: 99, progreso: { buildPhase: 4 } }), { buildPhase: 4 });
  const f = await fila(1);
  assert.equal((await hist(1)).length, 1, 'sin archivo duplicado');
  assert.equal(f.schema_version, 2);
  assert.deepEqual(f.estado.hitos, { hecho: { en: FECHA } });
  assert.deepEqual(f.estado.futuro, { a: 1 });
  assert.deepEqual(f.estado.terreno.excavacion, EXC);
  assert.deepEqual(f.progreso, { buildPhase: 4, excavacion: EXC });
  assert.equal(new Date(f.entregado_en).getTime(), new Date(antes.entregado_en).getTime(), 'entregado_en conservado');
  assert.equal(f.estado.contador, 99);
});

test('rollback: si falla el upsert (CHECK de 2 MB) no queda archivo ni cambia la fila', { skip: OMITIR }, async () => {
  const estado = v1(); const progreso = { buildPhase: 2 };
  await insertarV1(2, estado, progreso);
  const antes = await fila(2);
  await assert.rejects(S.guardar(uid, 1, 2, v1({ relleno: 'x'.repeat(2.2 * 1024 * 1024) }), {}), /chk_tamano|violates check/);
  assert.equal((await hist(2)).length, 0, 'sin archivo parcial');
  const despues = await fila(2);
  assert.equal(despues.schema_version, 1);
  assert.deepEqual(despues.estado, estado);
  assert.equal(despues.xmin, antes.xmin, 'fila intacta');
  // la conexión volvió al pool en buen estado: se puede guardar normalmente
  await S.guardar(uid, 1, 2, v1(), { buildPhase: 2 });
  assert.equal((await hist(2)).length, 1);
});

test('payload inválido: no se guarda nada ni se archiva', { skip: OMITIR }, async () => {
  await insertarV1(3, v1(), { buildPhase: 1 });
  const antes = await fila(3);
  for (const estado of [{ ...v1(), v: 3 }, { ...v1(), hitos: { 'MAL': { en: FECHA } } }, { ...v1(), terreno: { excavacion: 5 } }]) {
    const r = await S.guardar(uid, 1, 3, estado, {});
    assert.ok(r.error, 'rechazado');
  }
  assert.equal((await hist(3)).length, 0);
  assert.equal((await fila(3)).xmin, antes.xmin, 'fila intacta');
});

test('fila inexistente: guarda v2 sin archivar', { skip: OMITIR }, async () => {
  const r = await S.guardar(uid, 1, 4, v1(), { buildPhase: 1, excavacion: EXC });
  assert.ok(r.id);
  const f = await fila(4);
  assert.equal(f.schema_version, 2);
  assert.deepEqual(f.estado.terreno.excavacion, EXC);
  assert.equal((await hist(4)).length, 0);
});

test('concurrencia sobre fila inexistente: un solo registro y ningún archivo', { skip: OMITIR }, async () => {
  await Promise.all(Array.from({ length: 8 }, (_, i) => S.guardar(uid, 1, 5, v1({ contador: 2 + i }), { buildPhase: 1 })));
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM proyecto_guardados WHERE usuario_id=$1 AND slot=5', [uid]);
  assert.equal(rows[0].n, 1);
  assert.equal((await hist(5)).length, 0);
});

test('la lectura migra en memoria y no escribe en la fila v1', { skip: OMITIR }, async () => {
  await insertarV1(6, v1({ progreso: { excavacion: EXC } }), { excavacion: EXC });
  const antes = await fila(6);
  const { estado, version } = S.migrar(antes.estado, antes.schema_version);
  assert.equal(version, 2);
  assert.deepEqual(estado.terreno.excavacion, EXC);
  const despues = await fila(6);
  assert.equal(despues.schema_version, 1);
  assert.equal(despues.xmin, antes.xmin, 'la fila no se reescribió');
  assert.deepEqual(despues.estado, antes.estado);
});

test('PostgreSQL temporal: limpieza de las filas de prueba', { skip: OMITIR }, async () => {
  try {
    await pool.query('DELETE FROM proyecto_guardados_hist WHERE usuario_id = $1', [uid]);
    await pool.query('DELETE FROM proyecto_guardados WHERE usuario_id = $1', [uid]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [uid]);
  } finally { await pool.end(); }
});
