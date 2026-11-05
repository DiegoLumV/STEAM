// Fase 2: pruebas HTTP de los manejadores REALES de guardado (GET/PUT /api/guardado y beacon).
// Monta una app Express independiente (NO importa server/index.js) y usa el db.js real, pero apuntado por
// variables de entorno a la base TEMPORAL descartable. No lee .env y se niega a correr si hay uno en el cwd.
//
//   cd <directorio sin .env>
//   STEAM_TEST_PG_SOCKET=/var/tmp/steam_pg_f2/sock node --test /ruta/al/proyecto/tests/http_guardado.test.js
//
// Sin STEAM_TEST_PG_SOCKET todas las pruebas se omiten. Solo se insertan y borran datos creados aquí
// (usuarios http_f2_*@example.test y sus guardados). Nunca crea ni elimina tablas.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SOCKET = process.env.STEAM_TEST_PG_SOCKET;
const OMITIR = SOCKET ? false : 'define STEAM_TEST_PG_SOCKET para ejecutar las pruebas HTTP con la base temporal';
const SOCKET_AUTORIZADO = '/var/tmp/steam_pg_f2/sock';
const SECRETO = 'solo-pruebas-http-fase2';
const FECHA = '2026-10-23T16:00:00.000Z';
const EXC = { largo: 12, ancho: 10, profundidad: 1.5, volumen: 180, activa: true };
const clon = o => JSON.parse(JSON.stringify(o));
const casa = n => JSON.parse(fs.readFileSync(new URL(`./casas/${n}.json`, import.meta.url), 'utf8'));
const dormir = ms => new Promise(r => setTimeout(r, ms));

let pool, server, base, jwt;
let verificada = false;
const usuarios = {};            // { a: {id,token}, b: {id,token} }
const idsGuardados = new Set(); // ids de guardados creados por estas pruebas (para limpiar el historial)
const SUFIJO = `${process.pid}_${Date.now()}`;

/* ───────── preparación ───────── */
before(async () => {
  if (OMITIR) return;
  if (SOCKET !== SOCKET_AUTORIZADO) throw new Error(`Socket no autorizado: ${SOCKET}`);
  if (fs.existsSync(path.join(process.cwd(), '.env')))
    throw new Error('Hay un .env en el directorio de trabajo: ejecuta desde un directorio sin .env');

  // Variables ANTES de importar db.js (que las lee al cargarse)
  Object.assign(process.env, { DB_HOST: SOCKET, DB_PORT: '54329', DB_NAME: 'steam_tmp_fase2', DB_USER: 'postgres', JWT_SECRET: SECRETO });
  delete process.env.DB_PASSWORD;

  pool = (await import('../server/db.js')).default;
  // Identidad ANTES de escribir cualquier dato
  const { rows: [id] } = await pool.query(
    `SELECT current_database() AS db, current_setting('port') AS port, current_setting('data_directory') AS dir, current_setting('listen_addresses') AS la`);
  if (id.db !== 'steam_tmp_fase2' || id.port !== '54329' || id.dir !== '/var/tmp/steam_pg_f2/data' || id.la !== '')
    throw new Error('BASE INCORRECTA, se aborta sin escribir: ' + JSON.stringify(id));
  verificada = true;

  jwt = (await import('jsonwebtoken')).default;
  const express = (await import('express')).default;
  const rutas = await import('../server/routes/guardado.js');
  const app = express();
  app.use(express.json());                 // igual que server/index.js
  app.use('/api', rutas.beaconRouter);     // mismo orden de montaje que producción
  app.use('/api', rutas.default);
  server = await new Promise(res => { const s = app.listen(0, '127.0.0.1', () => res(s)); });
  base = `http://127.0.0.1:${server.address().port}/api`;

  for (const k of ['a', 'b']) {
    const email = `http_f2_${SUFIJO}_${k}@example.test`;
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id)
       SELECT $1, $2, 'x', id FROM roles WHERE nombre = 'alumno' RETURNING id, rol_id`, [`Prueba HTTP fase 2 ${k}`, email]);
    usuarios[k] = {
      id: rows[0].id,
      token: jwt.sign({ id: rows[0].id, nombre_completo: `Prueba ${k}`, email, rol_id: rows[0].rol_id, rol_nombre: 'alumno' }, SECRETO),
    };
  }
});

/* ───────── limpieza: siempre, incluso si hay errores; solo datos creados aquí ───────── */
after(async () => {
  if (OMITIR || !verificada) { if (server) server.close(); if (pool) await pool.end(); return; }
  try {
    await dormir(300); // registrarActividad de DELETE es asíncrono
    const ids = Object.values(usuarios).map(u => u.id);
    if (ids.length) {
      const { rows } = await pool.query('SELECT id FROM proyecto_guardados WHERE usuario_id = ANY($1)', [ids]);
      rows.forEach(r => idsGuardados.add(Number(r.id)));
      await pool.query('DELETE FROM proyecto_guardados_hist WHERE usuario_id = ANY($1) OR guardado_id = ANY($2)', [ids, [...idsGuardados]]);
      await pool.query('DELETE FROM proyecto_guardados WHERE usuario_id = ANY($1)', [ids]);
      await pool.query(`DELETE FROM registro_actividad WHERE usuario_id = ANY($1)`, [ids]);
      await pool.query('DELETE FROM usuarios WHERE id = ANY($1)', [ids]);
      const { rows: [r] } = await pool.query(
        `SELECT (SELECT count(*) FROM usuarios WHERE email LIKE 'http_f2_%') AS usuarios,
                (SELECT count(*) FROM proyecto_guardados WHERE usuario_id = ANY($1)) AS guardados,
                (SELECT count(*) FROM proyecto_guardados_hist WHERE usuario_id = ANY($1) OR guardado_id = ANY($2)) AS historial`, [ids, [...idsGuardados]]);
      console.log('# limpieza: restantes de prueba ->', JSON.stringify(r));
    }
  } finally {
    await new Promise(res => { server.closeAllConnections?.(); server.close(res); });
    await pool.end();
  }
});

/* ───────── utilidades ───────── */
async function http(metodo, ruta, { token, body, crudo, tipo = 'application/json' } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let cuerpo;
  if (crudo !== undefined) { cuerpo = crudo; headers['Content-Type'] = tipo; }
  else if (body !== undefined) { cuerpo = JSON.stringify(body); headers['Content-Type'] = tipo; }
  const r = await fetch(base + ruta, { method: metodo, headers, body: cuerpo });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* cuerpo vacío o HTML */ }
  return { status: r.status, json, texto };
}
const put = (k, body) => http('PUT', '/guardado', { token: usuarios[k].token, body });
const get = (k, q = '') => http('GET', '/guardado' + q, { token: usuarios[k].token });
const beacon = body => http('POST', '/guardado/beacon', { body });

const v1 = (extra = {}) => ({ v: 1, objetos: [{ id: 1, type: 'block', p: [0, 0, 0] }], contador: 2, progreso: { buildPhase: 1 }, ...extra });
const v2 = (extra = {}) => ({ v: 2, objetos: [{ id: 1, type: 'block', p: [0, 0, 0] }], contador: 2, progreso: { buildPhase: 1 }, terreno: { excavacion: null }, hitos: {}, ...extra });

async function sembrar(k, slot, { version = 1, estado, progreso = {}, entregado = false }) {
  const { rows } = await pool.query(
    `INSERT INTO proyecto_guardados (usuario_id, proyecto_id, slot, schema_version, estado, progreso, entregado_en)
     VALUES ($1, 1, $2, $3, $4, $5, ${entregado ? 'NOW()' : 'NULL'}) RETURNING id`,
    [usuarios[k].id, slot, version, estado, progreso]);
  idsGuardados.add(Number(rows[0].id));
  return Number(rows[0].id);
}
const fila = async (k, slot) => (await pool.query(
  `SELECT id, schema_version, estado, progreso, entregado_en, actualizado_en::text AS act, xmin::text AS xmin
     FROM proyecto_guardados WHERE usuario_id = $1 AND proyecto_id = 1 AND slot = $2`, [usuarios[k].id, slot])).rows[0];
const hist = async (k, slot) => (await pool.query(
  `SELECT guardado_id, schema_version, estado, progreso, motivo, usuario_id, proyecto_id, slot
     FROM proyecto_guardados_hist WHERE usuario_id = $1 AND proyecto_id = 1 AND slot = $2`, [usuarios[k].id, slot])).rows;

/* ═════════════════ GET /api/guardado ═════════════════ */
test('GET: sin token → 401; token inválido → 401', { skip: OMITIR }, async () => {
  assert.equal((await http('GET', '/guardado')).status, 401);
  assert.equal((await http('GET', '/guardado', { token: 'basura' })).status, 401);
});

test('GET: sin guardado previo → 404', { skip: OMITIR }, async () => {
  const r = await get('a', '?proyecto_id=1&slot=90');
  assert.equal(r.status, 404);
  assert.match(r.json.error, /Sin guardado previo/);
});

test('GET: guardado v1 se entrega migrado a v2 y la fila de PostgreSQL NO se modifica', { skip: OMITIR }, async () => {
  const estado = v1({ progreso: { buildPhase: 1, excavacion: EXC } });
  const progreso = { buildPhase: 2, excavacion: EXC };
  await sembrar('a', 1, { estado, progreso });
  const antes = await fila('a', 1);
  const r = await get('a', '?proyecto_id=1&slot=1');
  assert.equal(r.status, 200);
  assert.equal(r.json.schema_version, 2);
  assert.equal(r.json.migrado, true);
  assert.equal(r.json.estado.v, 2);
  assert.deepEqual(r.json.estado.terreno, { excavacion: EXC });
  assert.deepEqual(r.json.estado.hitos, {});
  assert.deepEqual(r.json.estado.objetos, estado.objetos);
  assert.deepEqual(r.json.progreso, progreso, 'la columna progreso se entrega tal cual');
  await get('a', '?proyecto_id=1&slot=1'); // una segunda lectura tampoco escribe
  const despues = await fila('a', 1);
  assert.equal(despues.schema_version, 1);
  assert.equal(despues.xmin, antes.xmin, 'la fila no fue reescrita');
  assert.equal(despues.act, antes.act);
  assert.deepEqual(despues.estado, estado);
  assert.equal((await hist('a', 1)).length, 0, 'leer no archiva');
});

test('GET: guardado v2 se entrega sin migrar', { skip: OMITIR }, async () => {
  const estado = v2({ hitos: { primer_muro: { en: FECHA } } });
  await sembrar('a', 2, { version: 2, estado, progreso: { buildPhase: 3 } });
  const r = await get('a', '?proyecto_id=1&slot=2');
  assert.equal(r.status, 200);
  assert.equal(r.json.migrado, false);
  assert.equal(r.json.schema_version, 2);
  assert.deepEqual(r.json.estado, estado);
});

test('GET: un alumno que envía alumno_id ajeno recibe solo sus propios datos', { skip: OMITIR }, async () => {
  await sembrar('b', 3, { version: 2, estado: v2({ progreso: { dueno: 'b' } }), progreso: { dueno: 'b' } });
  await sembrar('a', 3, { version: 2, estado: v2({ progreso: { dueno: 'a' } }), progreso: { dueno: 'a' } });
  const r = await get('a', `?proyecto_id=1&slot=3&alumno_id=${usuarios.b.id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.progreso, { dueno: 'a' });
});

/* ═════════════════ PUT /api/guardado ═════════════════ */
test('PUT: sin token → 401; token inválido → 401', { skip: OMITIR }, async () => {
  assert.equal((await http('PUT', '/guardado', { body: { estado: v2() } })).status, 401);
  assert.equal((await http('PUT', '/guardado', { token: 'x', body: { estado: v2() } })).status, 401);
});

test('PUT: crea un guardado v2 (sin guardado previo) y no archiva nada', { skip: OMITIR }, async () => {
  const { estado, progreso } = casa('excavacion_con_casa');
  const r = await put('a', { proyecto_id: 1, slot: 10, estado, progreso });
  assert.equal(r.status, 200);
  assert.ok(r.json.guardado_id && r.json.actualizado_en);
  idsGuardados.add(Number(r.json.guardado_id));
  const f = await fila('a', 10);
  assert.equal(f.schema_version, 2);
  assert.equal(f.estado.v, 2);
  assert.deepEqual(f.estado.terreno.excavacion, progreso.excavacion ?? null);
  assert.deepEqual(f.estado.hitos, {});
  assert.deepEqual(f.progreso, progreso);
  assert.equal((await hist('a', 10)).length, 0);
  const g = await get('a', '?proyecto_id=1&slot=10');
  assert.equal(g.json.migrado, false);
});

test('PUT: guardar sobre una fila v1 archiva UNA vez el estado y progreso anteriores', { skip: OMITIR }, async () => {
  const estado = v1({ progreso: { buildPhase: 1 } });
  const progreso = { buildPhase: 2, excavacion: null };  // la columna difiere de estado.progreso a propósito
  const id = await sembrar('a', 11, { estado, progreso });
  const r = await put('a', { proyecto_id: 1, slot: 11, estado: v1({ contador: 9 }), progreso: { buildPhase: 3 } });
  assert.equal(r.status, 200);
  assert.equal(Number(r.json.guardado_id), id, 'actualiza la misma fila (bigint llega como texto)');
  const h = await hist('a', 11);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].estado, estado);
  assert.deepEqual(h[0].progreso, progreso);
  assert.equal(h[0].schema_version, 1);
  assert.equal(h[0].motivo, 'migracion_v2');
  assert.equal(Number(h[0].guardado_id), id);
  const f = await fila('a', 11);
  assert.equal(f.schema_version, 2);
  assert.equal(f.estado.contador, 9);
  // un segundo guardado ya no archiva
  assert.equal((await put('a', { proyecto_id: 1, slot: 11, estado: v2({ contador: 10 }), progreso: { buildPhase: 3 } })).status, 200);
  assert.equal((await hist('a', 11)).length, 1);
});

test('PUT: 10 guardados HTTP simultáneos sobre una fila v1 → todos 200 y un solo archivo idéntico', { skip: OMITIR }, async () => {
  const estado = v1({ progreso: { buildPhase: 1 } });
  const progreso = { buildPhase: 2 };
  await sembrar('a', 12, { estado, progreso });
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    put('a', { proyecto_id: 1, slot: 12, estado: v1({ contador: 10 + i }), progreso: { buildPhase: 3 } })));
  assert.deepEqual(rs.map(r => r.status), Array(10).fill(200));
  const h = await hist('a', 12);
  assert.equal(h.length, 1, 'exactamente un archivo');
  assert.deepEqual(h[0].estado, estado);
  assert.deepEqual(h[0].progreso, progreso);
  assert.equal((await fila('a', 12)).schema_version, 2);
});

test('PUT: cliente antiguo (payload v1) sobre un guardado v2 conserva hitos, terreno, campos desconocidos y entregado_en', { skip: OMITIR }, async () => {
  const existente = v2({ hitos: { excavado: { en: FECHA } }, terreno: { excavacion: EXC }, futuro: { a: 1 }, progreso: { excavacion: EXC, buildPhase: 2 } });
  await sembrar('a', 13, { version: 2, estado: existente, progreso: { excavacion: EXC, buildPhase: 2 }, entregado: true });
  const antes = await fila('a', 13);
  const r = await put('a', { proyecto_id: 1, slot: 13, estado: v1({ contador: 77, progreso: { buildPhase: 4 } }), progreso: { buildPhase: 4 } });
  assert.equal(r.status, 200);
  const f = await fila('a', 13);
  assert.equal(f.schema_version, 2, 'no se baja la versión');
  assert.equal(f.estado.v, 2);
  assert.equal(f.estado.contador, 77);
  assert.deepEqual(f.estado.hitos, { excavado: { en: FECHA } });
  assert.deepEqual(f.estado.futuro, { a: 1 });
  assert.deepEqual(f.estado.terreno.excavacion, EXC);
  assert.deepEqual(f.progreso, { excavacion: EXC, buildPhase: 4 });
  assert.deepEqual(f.estado.progreso, { excavacion: EXC, buildPhase: 4 });
  assert.ok(f.entregado_en && new Date(f.entregado_en).getTime() === new Date(antes.entregado_en).getTime(), 'entregado_en conservado');
  assert.equal((await hist('a', 13)).length, 0, 'sin archivo duplicado');
});

test('PUT: un cliente v2 también conserva hitos existentes (el existente prevalece) y agrega los nuevos', { skip: OMITIR }, async () => {
  await sembrar('a', 14, { version: 2, estado: v2({ hitos: { a_1: { en: FECHA } } }), progreso: {}, entregado: true });
  const antes = await fila('a', 14);
  const r = await put('a', { proyecto_id: 1, slot: 14, estado: v2({ hitos: { a_1: { en: '2030-01-01T00:00:00Z' }, b_2: { en: FECHA } } }), progreso: {} });
  assert.equal(r.status, 200);
  const f = await fila('a', 14);
  assert.deepEqual(f.estado.hitos, { a_1: { en: FECHA }, b_2: { en: FECHA } });
  assert.equal(new Date(f.entregado_en).getTime(), new Date(antes.entregado_en).getTime());
  const sin = await put('a', { proyecto_id: 1, slot: 14, estado: { v: 2, objetos: [], contador: 1 }, progreso: {} });
  assert.equal(sin.status, 200);
  assert.deepEqual((await fila('a', 14)).estado.hitos, { a_1: { en: FECHA }, b_2: { en: FECHA } }, 'omitir hitos no los borra');
});

test('PUT: progreso omitido, null o {} no vacía la columna; excavacion:null rellena y se refleja en terreno', { skip: OMITIR }, async () => {
  await sembrar('a', 15, { version: 2, estado: v2({ terreno: { excavacion: EXC }, progreso: { excavacion: EXC, k: 1 } }), progreso: { excavacion: EXC, k: 1 } });
  for (const cuerpo of [{ proyecto_id: 1, slot: 15, estado: v2() }, { proyecto_id: 1, slot: 15, estado: v2(), progreso: null }, { proyecto_id: 1, slot: 15, estado: v2(), progreso: {} }]) {
    assert.equal((await put('a', cuerpo)).status, 200);
    const f = await fila('a', 15);
    assert.deepEqual(f.progreso, { excavacion: EXC, k: 1 });
    assert.deepEqual(f.estado.terreno.excavacion, EXC);
  }
  assert.equal((await put('a', { proyecto_id: 1, slot: 15, estado: v2(), progreso: { excavacion: null } })).status, 200);
  const f = await fila('a', 15);
  assert.equal(f.progreso.excavacion, null);
  assert.equal(f.progreso.k, 1);
  assert.equal(f.estado.terreno.excavacion, null);
});

test('PUT: datos inválidos → 400 y sin escrituras parciales (ni fila ni archivo)', { skip: OMITIR }, async () => {
  const estadoOriginal = v1();
  await sembrar('a', 16, { estado: estadoOriginal, progreso: { buildPhase: 1 } });
  const antes = await fila('a', 16);
  const cien = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`h_${i}`, { en: FECHA }]));
  const invalidos = {
    'versión futura': { estado: v2({ v: 3 }) },
    'versión cero': { estado: v2({ v: 0 }) },
    'hito con clave inválida': { estado: v2({ hitos: { MAL: { en: FECHA } } }) },
    'hito con fecha inválida': { estado: v2({ hitos: { ok: { en: 'ayer' } } }) },
    'terreno inválido': { estado: v2({ terreno: { excavacion: 5 } }) },
    'objetos no es arreglo': { estado: { v: 2, objetos: 'x' } },
    'más de 500 objetos': { estado: v2({ objetos: Array.from({ length: 501 }, (_, i) => ({ id: i, type: 'block', p: [0, 0, 0] })) }) },
    'objeto con posición inválida': { estado: v2({ objetos: [{ type: 'block', p: [0, 0] }] }) },
    'sin estado': {},
    'progreso.excavacion inválida': { estado: v2(), progreso: { excavacion: { largo: 'x' } } },
  };
  for (const [nombre, cuerpo] of Object.entries(invalidos)) {
    const r = await put('a', { proyecto_id: 1, slot: 16, ...cuerpo });
    assert.equal(r.status, 400, nombre);
    assert.match(r.json.error, /^Estado inválido:/, nombre);
  }
  // 100 hitos existentes + 1 nuevo no cabe: se rechaza en vez de descartar alguno en silencio
  await sembrar('a', 17, { version: 2, estado: v2({ hitos: cien }), progreso: {} });
  const lleno = await fila('a', 17);
  const r = await put('a', { proyecto_id: 1, slot: 17, estado: v2({ hitos: { nuevo: { en: FECHA } } }), progreso: {} });
  assert.equal(r.status, 400);
  assert.equal((await fila('a', 17)).xmin, lleno.xmin);

  const despues = await fila('a', 16);
  assert.equal(despues.xmin, antes.xmin, 'la fila no cambió');
  assert.equal(despues.schema_version, 1);
  assert.deepEqual(despues.estado, estadoOriginal);
  assert.equal((await hist('a', 16)).length, 0, 'un payload inválido no archiva');
});

test('PUT: JSON malformado → 400 sin escribir', { skip: OMITIR }, async () => {
  const r = await http('PUT', '/guardado', { token: usuarios.a.token, crudo: '{"estado": {oops' });
  assert.equal(r.status, 400);
});

test('PUT: límites de tamaño del cuerpo HTTP (express.json: 100 KB)', { skip: OMITIR }, async () => {
  // casa de 500 objetos (≈31 KB) cabe
  const { estado, progreso } = casa('casa_500_objetos');
  const ok = await put('a', { proyecto_id: 1, slot: 18, estado, progreso });
  assert.equal(ok.status, 200);
  assert.equal((await fila('a', 18)).estado.objetos.length, 500);
  // un cuerpo de ~150 KB se rechaza antes de llegar a la ruta
  const grande = await put('a', { proyecto_id: 1, slot: 19, estado: v2({ relleno: 'x'.repeat(150 * 1024) }), progreso: {} });
  assert.equal(grande.status, 413);
  assert.equal(await fila('a', 19), undefined, 'no se creó ninguna fila');
});

/* ═════════════════ POST /api/guardado/beacon ═════════════════ */
test('beacon: sin token → 401; token inválido con estado válido → 401', { skip: OMITIR }, async () => {
  assert.equal((await beacon({ proyecto_id: 1, slot: 30, estado: v2(), progreso: {} })).status, 401);
  assert.equal((await beacon({ token: 'basura', proyecto_id: 1, slot: 30, estado: v2(), progreso: {} })).status, 401);
  assert.equal(await fila('a', 30), undefined);
});

test('beacon: estado inválido → 400 (se valida antes de verificar el token) y no escribe', { skip: OMITIR }, async () => {
  assert.equal((await beacon({ token: usuarios.a.token, proyecto_id: 1, slot: 30, estado: { objetos: 'x' } })).status, 400);
  assert.equal((await beacon({ token: usuarios.a.token, proyecto_id: 1, slot: 30, estado: v2({ v: 3 }) })).status, 400);
  assert.equal((await beacon({ token: usuarios.a.token, proyecto_id: 1, slot: 30, estado: v2({ hitos: { MAL: { en: FECHA } } }) })).status, 400);
  assert.equal((await beacon({ token: 'basura', proyecto_id: 1, slot: 30, estado: { objetos: 'x' } })).status, 400, 'observación: con estado inválido ni siquiera se mira el token');
  assert.equal(await fila('a', 30), undefined);
});

test('beacon: válido → 204 y guarda v2 en el usuario del TOKEN (ignora cualquier usuario del cuerpo)', { skip: OMITIR }, async () => {
  const r = await beacon({ token: usuarios.a.token, usuario_id: usuarios.b.id, usuarioId: usuarios.b.id, proyecto_id: 1, slot: 31,
    estado: v2({ contador: 5 }), progreso: { buildPhase: 2, excavacion: EXC } });
  assert.equal(r.status, 204);
  const f = await fila('a', 31);
  assert.equal(f.schema_version, 2);
  assert.equal(f.estado.contador, 5);
  assert.deepEqual(f.estado.terreno.excavacion, EXC);
  assert.equal(await fila('b', 31), undefined, 'nada se guardó para el otro usuario');
  idsGuardados.add(Number(f.id));
});

test('beacon: sobre una fila v1 archiva una sola vez (también con beacons simultáneos)', { skip: OMITIR }, async () => {
  const estado = v1({ progreso: { buildPhase: 1 } });
  const progreso = { buildPhase: 2 };
  await sembrar('a', 32, { estado, progreso });
  const rs = await Promise.all(Array.from({ length: 6 }, (_, i) =>
    beacon({ token: usuarios.a.token, proyecto_id: 1, slot: 32, estado: v1({ contador: 20 + i }), progreso: { buildPhase: 3 } })));
  assert.deepEqual(rs.map(r => r.status), Array(6).fill(204));
  const h = await hist('a', 32);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].estado, estado);
  assert.deepEqual(h[0].progreso, progreso);
  assert.equal(h[0].motivo, 'migracion_v2');
  assert.equal((await fila('a', 32)).schema_version, 2);
});

test('beacon: cliente antiguo conserva hitos, campos desconocidos y entregado_en', { skip: OMITIR }, async () => {
  await sembrar('a', 33, { version: 2, estado: v2({ hitos: { h_1: { en: FECHA } }, futuro: { z: 1 }, terreno: { excavacion: EXC }, progreso: { excavacion: EXC } }), progreso: { excavacion: EXC }, entregado: true });
  const antes = await fila('a', 33);
  const r = await beacon({ token: usuarios.a.token, proyecto_id: 1, slot: 33, estado: v1({ contador: 8 }), progreso: { buildPhase: 3 } });
  assert.equal(r.status, 204);
  const f = await fila('a', 33);
  assert.deepEqual(f.estado.hitos, { h_1: { en: FECHA } });
  assert.deepEqual(f.estado.futuro, { z: 1 });
  assert.deepEqual(f.estado.terreno.excavacion, EXC);
  assert.deepEqual(f.progreso, { excavacion: EXC, buildPhase: 3 });
  assert.equal(new Date(f.entregado_en).getTime(), new Date(antes.entregado_en).getTime());
  assert.equal((await hist('a', 33)).length, 0);
});

test('beacon: con Content-Type text/plain el cuerpo no se interpreta → 401 (observación)', { skip: OMITIR }, async () => {
  const r = await http('POST', '/guardado/beacon', { crudo: JSON.stringify({ token: usuarios.a.token, proyecto_id: 1, slot: 34, estado: v2() }), tipo: 'text/plain' });
  assert.equal(r.status, 401);
  assert.equal(await fila('a', 34), undefined);
});

test('beacon: límites de tamaño del cuerpo HTTP → 413', { skip: OMITIR }, async () => {
  const r = await beacon({ token: usuarios.a.token, proyecto_id: 1, slot: 35, estado: v2({ relleno: 'x'.repeat(150 * 1024) }), progreso: {} });
  assert.equal(r.status, 413);
  assert.equal(await fila('a', 35), undefined);
});

/* ═════════════ DELETE: archivado atómico de la fila borrada (requisito) ═════════════ */
const histPorGuardado = async id => (await pool.query(
  `SELECT guardado_id, schema_version, estado, progreso, usuario_id, proyecto_id, slot, motivo
     FROM proyecto_guardados_hist WHERE guardado_id = $1`, [id])).rows;

test('DELETE: el historial conserva la fila eliminada completa (estado, progreso, usuario, proyecto, slot, motivo)', { skip: OMITIR }, async () => {
  const estado = v2({ progreso: { buildPhase: 2 } });
  const progreso = { buildPhase: 3, excavacion: null };   // la columna difiere de estado.progreso a propósito
  const id = await sembrar('a', 40, { version: 2, estado, progreso });
  const antes = await fila('a', 40);
  const r = await http('DELETE', '/guardado?proyecto_id=1&slot=40', { token: usuarios.a.token });
  assert.equal(r.status, 200);
  assert.equal(await fila('a', 40), undefined, 'la fila se borra');
  const rows = await histPorGuardado(id);
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].guardado_id), id);
  assert.equal(rows[0].schema_version, antes.schema_version);
  assert.deepEqual(rows[0].estado, antes.estado, 'estado idéntico al de la fila borrada');
  assert.deepEqual(rows[0].progreso, antes.progreso, 'progreso idéntico al de la fila borrada');
  assert.deepEqual(rows[0].progreso, progreso);
  assert.equal(rows[0].usuario_id, usuarios.a.id);
  assert.equal(rows[0].proyecto_id, 1);
  assert.equal(rows[0].slot, 40);
  assert.equal(rows[0].motivo, 'reinicio');
  assert.equal((await hist('a', 40)).length, 1, 'el historial ya es localizable por usuario, proyecto y slot');
});

test('DELETE: sin guardado previo responde igual (200) y no crea historial', { skip: OMITIR }, async () => {
  assert.equal(await fila('a', 41), undefined);
  const r = await http('DELETE', '/guardado?proyecto_id=1&slot=41', { token: usuarios.a.token });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { message: 'Progreso reiniciado' });
  assert.equal((await hist('a', 41)).length, 0);
});

test('DELETE: dos solicitudes consecutivas no duplican el historial', { skip: OMITIR }, async () => {
  const id = await sembrar('a', 42, { version: 2, estado: v2({ contador: 7 }), progreso: { buildPhase: 2 } });
  const r1 = await http('DELETE', '/guardado?proyecto_id=1&slot=42', { token: usuarios.a.token });
  const r2 = await http('DELETE', '/guardado?proyecto_id=1&slot=42', { token: usuarios.a.token });
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal((await histPorGuardado(id)).length, 1);
  assert.equal((await hist('a', 42)).length, 1);
});

test('DELETE: una fila v1 se archiva con su estado y progreso originales (sin migrar)', { skip: OMITIR }, async () => {
  const estado = v1({ progreso: { buildPhase: 1 } });
  const progreso = { buildPhase: 2, excavacion: null };
  const id = await sembrar('a', 43, { estado, progreso });
  const r = await http('DELETE', '/guardado?proyecto_id=1&slot=43', { token: usuarios.a.token });
  assert.equal(r.status, 200);
  const rows = await histPorGuardado(id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].schema_version, 1);
  assert.deepEqual(rows[0].estado, estado, 'estado v1 tal cual (sin v:2, terreno ni hitos)');
  assert.equal(rows[0].estado.v, 1);
  assert.deepEqual(rows[0].progreso, progreso);
  assert.equal(rows[0].motivo, 'reinicio');
  assert.equal(rows[0].usuario_id, usuarios.a.id);
  assert.equal(rows[0].slot, 43);
});

test('DELETE: no afecta a otros slots ni a otro usuario con el mismo slot', { skip: OMITIR }, async () => {
  await sembrar('a', 44, { version: 2, estado: v2({ contador: 1 }), progreso: { buildPhase: 1 } });
  await sembrar('a', 45, { version: 2, estado: v2({ contador: 2 }), progreso: { buildPhase: 2 } });
  await sembrar('b', 44, { version: 2, estado: v2({ contador: 3 }), progreso: { buildPhase: 3 } });
  const a45 = await fila('a', 45), b44 = await fila('b', 44);
  const r = await http('DELETE', '/guardado?proyecto_id=1&slot=44', { token: usuarios.a.token });
  assert.equal(r.status, 200);
  assert.equal(await fila('a', 44), undefined, 'se borra solo el slot pedido del usuario del token');
  assert.deepEqual(await fila('a', 45), a45, 'otro slot del mismo usuario intacto');
  assert.deepEqual(await fila('b', 44), b44, 'mismo slot de otro usuario intacto');
  assert.equal((await hist('a', 44)).length, 1);
  assert.equal((await hist('a', 45)).length, 0);
  assert.equal((await hist('b', 44)).length, 0);
});

test('DELETE concurrente con PUT: la fila borrada siempre queda archivada, una sola vez', { skip: OMITIR }, async () => {
  for (let ronda = 0; ronda < 4; ronda++) {
    const slot = 50 + ronda;
    const id = await sembrar('a', slot, { version: 2, estado: v2({ contador: 1 }), progreso: { buildPhase: 1 } });
    const contadores = [1];
    const tareas = [http('DELETE', `/guardado?proyecto_id=1&slot=${slot}`, { token: usuarios.a.token })];
    for (let i = 0; i < 5; i++) {
      contadores.push(100 + i);
      tareas.push(put('a', { proyecto_id: 1, slot, estado: v2({ contador: 100 + i }), progreso: { buildPhase: 2 } }));
    }
    const rs = await Promise.all(tareas);
    assert.deepEqual(rs.map(r => r.status), Array(6).fill(200), `ronda ${ronda}: todas responden 200`);
    for (const r of rs.slice(1)) if (r.json && r.json.guardado_id) idsGuardados.add(Number(r.json.guardado_id));
    // La fila sembrada solo la quita el DELETE: debe haber exactamente un archivo suyo, con un estado que existió.
    const rows = await histPorGuardado(id);
    assert.equal(rows.length, 1, `ronda ${ronda}: la fila borrada tiene exactamente un historial`);
    assert.equal(rows[0].motivo, 'reinicio');
    assert.equal(rows[0].usuario_id, usuarios.a.id);
    assert.equal(rows[0].slot, slot);
    assert.ok(contadores.includes(rows[0].estado.contador), `ronda ${ronda}: archivó un estado válido (contador ${rows[0].estado.contador})`);
    assert.equal((await hist('a', slot)).filter(h => h.motivo === 'migracion_v2').length, 0);
    // Si un PUT posterior recreó la fila, es una fila nueva (otro id) y no está archivada.
    const f = await fila('a', slot);
    if (f) assert.notEqual(Number(f.id), id);
  }
});
