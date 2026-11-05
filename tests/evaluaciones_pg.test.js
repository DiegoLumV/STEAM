// A-03: migración 014 (evaluaciones_habilidad) con PostgreSQL REAL, solo contra la base temporal descartable.
// Se omite por completo si no se define STEAM_TEST_PG_SOCKET. No lee .env ni importa server/db.js.
//   STEAM_TEST_PG_SOCKET=/var/tmp/steam_pg_f2/sock node --test tests/evaluaciones_pg.test.js
// Cada prueba trabaja en un ESQUEMA propio (ev_*) dentro de ProyectoUPV_verif_tmp: no toca tablas existentes
// y no elimina nada. Aborta si la base, el puerto, el directorio de datos o listen_addresses no son los esperados.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import pg from 'pg';
import { MIGRACIONES, aplicarMigraciones } from '../server/migraciones.js';

const SOCKET = process.env.STEAM_TEST_PG_SOCKET;
const OMITIR = !SOCKET ? 'define STEAM_TEST_PG_SOCKET para ejecutar las pruebas con PostgreSQL temporal' : false;
const DB = 'ProyectoUPV_verif_tmp';
const ID_014 = '014_evaluaciones_habilidad_columnas';
const SILENCIO = () => {};
const clon = o => JSON.parse(JSON.stringify(o));
const RUN = `${process.pid}_${Date.now()}`;

let admin;
const pools = [];

async function identidad(c) {
  const { rows: [r] } = await c.query(
    `SELECT current_database() AS db, current_setting('port') AS port, current_setting('data_directory') AS dir,
            current_setting('listen_addresses') AS la`);
  if (r.db !== DB || r.port !== '54329' || r.dir !== '/var/tmp/steam_pg_f2/data' || r.la !== '')
    throw new Error('BASE INCORRECTA, se aborta sin escribir: ' + JSON.stringify(r));
}

// Esquema nuevo y aislado, con las tablas base que las migraciones suponen (roles y usuarios, del respaldo proyectoUPV.sql).
async function esquema(sufijo) {
  const nombre = `ev_${sufijo}_${RUN}`;
  await admin.query(`CREATE SCHEMA ${nombre}`);
  const p = new pg.Pool({ host: SOCKET, port: 54329, database: DB, user: 'postgres', max: 4, options: `-c search_path=${nombre}` });
  pools.push(p);
  const { rows: [{ s }] } = await p.query('SELECT current_schema() AS s');
  if (s !== nombre) throw new Error('search_path inesperado: ' + s);
  await p.query(`CREATE TYPE tipo_estado AS ENUM ('en_progreso', 'completado')`);   // viene del respaldo, la 005b lo usa
  await p.query(`CREATE TABLE roles (id SERIAL PRIMARY KEY, nombre VARCHAR(50) NOT NULL UNIQUE, descripcion VARCHAR(255))`);
  await p.query(`CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY, nombre_completo VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, rol_id INTEGER NOT NULL REFERENCES roles(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  return p;
}

// Todas las migraciones EXCEPTO la 014: deja la tabla como la crea la 002 (7 columnas).
async function hastaAntesDe014(p) {
  for (const m of MIGRACIONES) {
    if (m.id === ID_014) continue;
    for (const sql of m.sql) await p.query(sql);
  }
}

const columnas = async (p) => Object.fromEntries((await p.query(
  `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'evaluaciones_habilidad'`)).rows.map(r => [r.column_name, r]));

async function sembrar(p, tag) {
  const q = async (t, a) => (await p.query(t, a)).rows;
  const [rol] = await q(`SELECT id FROM roles WHERE nombre = 'alumno'`);
  const [A] = await q(`INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id) VALUES ('Alumno A', $1, 'x', $2) RETURNING id`, [`ev_a_${tag}_${RUN}@example.test`, rol.id]);
  const [B] = await q(`INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id) VALUES ('Alumno B', $1, 'x', $2) RETURNING id`, [`ev_b_${tag}_${RUN}@example.test`, rol.id]);
  const [dim] = await q(`INSERT INTO dimensiones_steam (nombre, descripcion, color_hex) VALUES ('Ciencia', 'd', '#112233') RETURNING id`);
  const [hab] = await q(`INSERT INTO habilidades (dimension_id, nombre) VALUES ($1, 'Cálculo') RETURNING id`, [dim.id]);
  const [act] = await q(`INSERT INTO actividades_criticas (nombre, proyecto_id) VALUES ('Mezclar concreto', 1) RETURNING id`);
  await q(`INSERT INTO actividades_habilidades (actividad_id, habilidad_id) VALUES ($1, $2)`, [act.id, hab.id]);
  const [sA] = await q(`INSERT INTO sesiones_simulacion (usuario_id, proyecto_id) VALUES ($1, 1) RETURNING id`, [A.id]);
  const [sB] = await q(`INSERT INTO sesiones_simulacion (usuario_id, proyecto_id) VALUES ($1, 1) RETURNING id`, [B.id]);
  return { A: A.id, B: B.id, hab: hab.id, act: act.id, sA: sA.id, sB: sB.id };
}

// Filas "anteriores": solo las 7 columnas originales.
async function filasAntiguas(p, f) {
  await p.query(
    `INSERT INTO evaluaciones_habilidad (sesion_id, habilidad_id, puntaje, intentos_fallidos, tiempo_segundos, creado_en) VALUES
       ($1, $3, 50, 2, 30, '2026-03-01 10:00:00'),
       ($1, $3, 90, 0, 12, '2026-03-02 11:30:00'),
       ($2, $3, 10, 5, 99, '2026-03-03 12:45:00')`, [f.sA, f.sB, f.hab]);
}

const originales = async (p) => (await p.query(
  `SELECT id, sesion_id, habilidad_id, puntaje::text AS puntaje, intentos_fallidos, tiempo_segundos, creado_en::text AS creado_en
     FROM evaluaciones_habilidad WHERE creado_en < '2026-04-01' ORDER BY id`)).rows;
const completas = async (p) => (await p.query(
  `SELECT id, sesion_id, alumno_id, actividad_id, habilidad_id, puntaje::text AS puntaje, intentos_fallidos, tiempo_segundos,
          creado_en::text AS creado_en, fecha::text AS fecha, xmin::text AS xmin
     FROM evaluaciones_habilidad ORDER BY id`)).rows;

// Carga el evaluacion.js REAL con un Router de mentira (mismo método que guardado_pg.test.js).
function cargarEvaluacion(p) {
  const src = fs.readFileSync(new URL('../server/routes/evaluacion.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default router;', '');
  const rutas = {};
  const reg = metodo => (ruta, ...fns) => { rutas[`${metodo} ${ruta}`] = fns[fns.length - 1]; };
  const router = { use() {}, get: reg('GET'), post: reg('POST') };
  const ctx = vm.createContext({
    Router: () => router, query: (t, a) => p.query(t, a), verifyToken() {}, requireAdmin() {},
    console: { error: SILENCIO, log: SILENCIO, warn: SILENCIO },
  });
  vm.runInContext(src, ctx);
  const llamar = async (clave, req) => {
    const res = { code: 200, body: undefined, status(c) { this.code = c; return this; }, json(b) { this.body = clon(b); return this; } };
    await rutas[clave](req, res);
    return res;
  };
  return {
    post: (sesionId, userId) => llamar('POST /evaluacion/sesion/:sesion_id', { params: { sesion_id: String(sesionId) }, user: { id: userId, rol_nombre: 'alumno' } }),
    get: (alumnoId, userId, rol = 'alumno') => llamar('GET /evaluacion/:alumno_id', { params: { alumno_id: String(alumnoId) }, user: { id: userId, rol_nombre: rol } }),
    stats: () => llamar('GET /dashboard/steam-stats', { user: { id: 1, rol_nombre: 'admin' } }),
  };
}

test('PostgreSQL temporal: preparación e identidad', { skip: OMITIR }, async () => {
  admin = new pg.Pool({ host: SOCKET, port: 54329, database: DB, user: 'postgres', max: 2 });
  const c = await admin.connect();
  try { await identidad(c); } finally { c.release(); }
});

test('sin la 014 el código de evaluacion.js falla (reproduce A-03)', { skip: OMITIR }, async () => {
  const p = await esquema('antes');
  await hastaAntesDe014(p);
  const cols = await columnas(p);
  assert.deepEqual(Object.keys(cols).sort(),
    ['creado_en', 'habilidad_id', 'id', 'intentos_fallidos', 'puntaje', 'sesion_id', 'tiempo_segundos'], 'esquema de la 002: 7 columnas');
  const f = await sembrar(p, 'antes');
  await p.query(`INSERT INTO telemetria_3d (sesion_id, actividad_id, marca_tiempo, tipo_evento, contexto)
    VALUES ($1, $2, NOW(), 'x', '{"correcto": true}')`, [f.sA, f.act]);
  const ev = cargarEvaluacion(p);
  assert.equal((await ev.post(f.sA, f.A)).code, 500, 'INSERT falla: columnas inexistentes');
  assert.equal((await ev.get(f.A, f.A)).code, 500, 'SELECT falla: alumno_id inexistente');
});

test('migración 014: esquema, tipos, nulabilidad, claves foráneas e índice', { skip: OMITIR }, async () => {
  const p = await esquema('esq');
  await hastaAntesDe014(p);
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  const c = await columnas(p);
  for (const [col, tipo] of [['alumno_id', 'integer'], ['actividad_id', 'integer'], ['fecha', 'timestamp without time zone']]) {
    assert.equal(c[col]?.data_type, tipo, `${col}: tipo`);
    assert.equal(c[col]?.is_nullable, 'YES', `${col}: nullable`);
  }
  assert.match(c.fecha.column_default, /now\(\)/i, 'fecha tiene DEFAULT NOW()');
  assert.equal(c.alumno_id.column_default, null);
  assert.equal(c.actividad_id.column_default, null);
  const { rows: fks } = await p.query(
    `SELECT a.attname AS col, cf.relname AS destino, k.confdeltype AS al_borrar
       FROM pg_constraint k
       JOIN pg_class t ON t.oid = k.conrelid JOIN pg_class cf ON cf.oid = k.confrelid
       JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
      WHERE k.contype = 'f' AND t.relname = 'evaluaciones_habilidad' AND t.relnamespace = current_schema()::regnamespace`);
  const fk = Object.fromEntries(fks.map(r => [r.col, r]));
  assert.equal(fk.alumno_id?.destino, 'usuarios'); assert.equal(fk.alumno_id?.al_borrar, 'c', 'ON DELETE CASCADE');
  assert.equal(fk.actividad_id?.destino, 'actividades_criticas'); assert.equal(fk.actividad_id?.al_borrar, 'n', 'ON DELETE SET NULL');
  assert.ok(fk.sesion_id && fk.habilidad_id, 'las FK anteriores siguen');
  const { rows: idx } = await p.query(`SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'idx_evaluaciones_habilidad_alumno_id'`);
  assert.equal(idx.length, 1, 'índice por alumno_id');
});

test('migración 014: conserva las filas anteriores y recupera alumno_id y fecha', { skip: OMITIR }, async () => {
  const p = await esquema('datos');
  await hastaAntesDe014(p);
  const f = await sembrar(p, 'datos');
  await filasAntiguas(p, f);
  const antes = await originales(p);
  assert.equal(antes.length, 3);
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  assert.deepEqual(await originales(p), antes, 'las 7 columnas originales no cambian (mismos ids y valores)');
  const filas = await completas(p);
  assert.equal(filas.length, 3, 'ninguna fila perdida ni duplicada');
  assert.deepEqual(filas.map(r => r.alumno_id), [f.A, f.A, f.B], 'alumno_id = usuario de la sesión');
  assert.deepEqual(filas.map(r => r.fecha), filas.map(r => r.creado_en), 'fecha = creado_en (no la fecha de la migración)');
  assert.ok(filas.every(r => r.actividad_id === null), 'actividad_id queda NULL');
});

test('migración 014: idempotente (dos ejecuciones más no cambian ni reescriben filas)', { skip: OMITIR }, async () => {
  const p = await esquema('idem');
  await hastaAntesDe014(p);
  const f = await sembrar(p, 'idem');
  await filasAntiguas(p, f);
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  // Fila ya completa con valores propios: no debe pisarse.
  await p.query(`INSERT INTO evaluaciones_habilidad (sesion_id, alumno_id, actividad_id, habilidad_id, puntaje, fecha)
                 VALUES ($1, $2, $3, $4, 70, '2020-01-01 00:00:00')`, [f.sA, f.B, f.act, f.hab]);
  const base = await completas(p);
  const colsAntes = await columnas(p);
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  assert.deepEqual(await completas(p), base, 'mismos valores y mismo xmin: ninguna fila fue reescrita');
  assert.deepEqual(await columnas(p), colsAntes);
  const pisada = base.find(r => r.fecha === '2020-01-01 00:00:00');
  assert.equal(pisada.alumno_id, f.B, 'un alumno_id ya presente no se sobrescribe');
});

test('migración 014: tolera columnas ya agregadas a mano (BD con esquema distinto)', { skip: OMITIR }, async () => {
  const p = await esquema('manual');
  await hastaAntesDe014(p);
  await p.query(`ALTER TABLE evaluaciones_habilidad ADD COLUMN alumno_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`);
  await p.query(`ALTER TABLE evaluaciones_habilidad ADD COLUMN actividad_id INTEGER`);
  await p.query(`ALTER TABLE evaluaciones_habilidad ADD COLUMN fecha TIMESTAMP DEFAULT NOW()`);
  const f = await sembrar(p, 'manual');
  await p.query(`INSERT INTO evaluaciones_habilidad (sesion_id, alumno_id, actividad_id, habilidad_id, puntaje, fecha, creado_en)
                 VALUES ($1, $2, $3, $4, 80, '2026-02-02 02:02:02', '2026-02-02 02:02:02')`, [f.sA, f.A, f.act, f.hab]);
  await p.query(`INSERT INTO evaluaciones_habilidad (sesion_id, habilidad_id, puntaje, creado_en) VALUES ($1, $2, 40, '2026-02-03 03:03:03')`, [f.sB, f.hab]);
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  const filas = await completas(p);
  assert.equal(filas.length, 2);
  assert.equal(filas[0].alumno_id, f.A); assert.equal(filas[0].actividad_id, f.act); assert.equal(filas[0].fecha, '2026-02-02 02:02:02');
  assert.equal(filas[1].alumno_id, f.B, 'la fila sin alumno_id se completa desde la sesión');
});

test('backend real (evaluacion.js) sobre el esquema migrado: INSERT, GET y dashboard', { skip: OMITIR }, async () => {
  const p = await esquema('api');
  await hastaAntesDe014(p);
  const f = await sembrar(p, 'api');
  await filasAntiguas(p, f);                                    // legacy: A = 50 y 90 (2 fallos), B = 10
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  await p.query(`INSERT INTO telemetria_3d (sesion_id, actividad_id, marca_tiempo, tipo_evento, contexto) VALUES
    ($1, $2, '2026-10-01 10:00:00', 'intento', '{"correcto": false}'),
    ($1, $2, '2026-10-01 10:00:10', 'intento', '{"correcto": true}')`, [f.sA, f.act]);
  const ev = cargarEvaluacion(p);

  const post = await ev.post(f.sA, f.A);
  assert.equal(post.code, 201, JSON.stringify(post.body));
  assert.equal(post.body.evaluaciones.length, 1);
  assert.deepEqual([post.body.evaluaciones[0].puntaje, post.body.evaluaciones[0].intentos_fallidos, post.body.evaluaciones[0].tiempo_segundos], [70, 1, 10]);
  const [nueva] = (await completas(p)).filter(r => r.creado_en >= '2026-10');
  assert.equal(nueva.alumno_id, f.A); assert.equal(nueva.actividad_id, f.act); assert.ok(nueva.fecha, 'fecha escrita por el INSERT');

  const get = await ev.get(f.A, f.A);
  assert.equal(get.code, 200, JSON.stringify(get.body));
  const hab = get.body.dimensiones.find(d => d.nombre === 'Ciencia').habilidades[0];
  assert.equal(hab.nombre, 'Cálculo');
  assert.equal(hab.puntaje_promedio, '70.00', '(50 + 90 + 70) / 3: las filas antiguas cuentan para el alumno');
  assert.equal(hab.intentos_fallidos_total, 3, '2 + 0 + 1');
  assert.equal((await ev.get(f.A, f.B)).code, 403, 'otro alumno no puede leer');
  assert.equal((await ev.get(f.B, f.B)).body.dimensiones[0].habilidades[0].puntaje_promedio, '10.00', 'B solo ve lo suyo');

  const st = await ev.stats();
  assert.equal(st.code, 200, JSON.stringify(st.body));
  assert.equal(st.body.promedio_por_dimension[0].dimension, 'Ciencia');
  assert.equal(st.body.habilidades_con_mas_fallos[0].habilidad, 'Cálculo');
  assert.ok(st.body.actividades_mas_dificiles.some(a => a.actividad === f.act), 'dashboard agrupa por actividad_id');
});

test('claves foráneas: borrar actividad → actividad_id NULL; borrar usuario → sus evaluaciones', { skip: OMITIR }, async () => {
  const p = await esquema('fk');
  await hastaAntesDe014(p);
  const f = await sembrar(p, 'fk');
  await aplicarMigraciones((t, a) => p.query(t, a), SILENCIO);
  await p.query(`INSERT INTO evaluaciones_habilidad (sesion_id, alumno_id, actividad_id, habilidad_id, puntaje) VALUES ($1, $2, $3, $4, 100), ($5, $6, $3, $4, 60)`,
    [f.sA, f.A, f.act, f.hab, f.sB, f.B]);
  await p.query(`DELETE FROM actividades_criticas WHERE id = $1`, [f.act]);
  let filas = await completas(p);
  assert.equal(filas.length, 2, 'las evaluaciones sobreviven al borrado de la actividad');
  assert.ok(filas.every(r => r.actividad_id === null));
  await p.query(`DELETE FROM usuarios WHERE id = $1`, [f.B]);
  filas = await completas(p);
  assert.equal(filas.length, 1); assert.equal(filas[0].alumno_id, f.A, 'solo se fueron las del usuario borrado');
});

test('cierre', { skip: OMITIR }, async () => {
  for (const p of pools) await p.end();
  await admin.end();
});
