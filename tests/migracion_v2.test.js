// Fase 2: estado v2 aditivo. Pruebas SIN base de datos (funciones puras de server/routes/guardado.js).
// Ejecutar: node --test tests/migracion_v2.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dir = new URL('./casas/', import.meta.url);
const nombres = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
const casa = n => JSON.parse(fs.readFileSync(new URL(`${n}.json`, dir), 'utf8'));
const clon = o => JSON.parse(JSON.stringify(o));

// Carga guardado.js del servidor tal cual (sin imports ni base de datos), igual que casas_referencia.test.js
function cargar() {
  const src = fs.readFileSync(new URL('../server/routes/guardado.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace('export default router;', '')
    .replace(/^export const beaconRouter[\s\S]*$/m, '');
  const router = { use() {}, get() {}, put() {}, post() {}, delete() {} };
  const ctx = vm.createContext({ Router: () => router, query() {}, pool: null, verifyToken() {}, console });
  vm.runInContext(src, ctx);
  // Los objetos creados dentro del contexto vm tienen otros prototipos: se pasan por JSON para compararlos con deepEqual
  return {
    validarEstado: e => ctx.validarEstado(e),
    normalizar: (p, ex) => clon(ctx.normalizarParaGuardar(p, ex)),
    migrar: (e, v) => clon(ctx.migrar(e, v)),
    version: vm.runInContext('SCHEMA_VERSION', ctx),
  };
}
const S = cargar();
const FECHA = '2026-10-23T16:00:00.000Z';
const base = (extra = {}) => ({ v: 2, objetos: [], contador: 1, progreso: {}, terreno: { excavacion: null }, hitos: {}, ...extra });
const EXC = { largo: 12, ancho: 10, profundidad: 1.5, volumen: 180, activa: true };

test('el servidor trabaja con la versión 2', () => assert.equal(S.version, 2));

for (const n of nombres) {
  test(`migración v1→v2 de lectura: ${n}`, () => {
    const { estado } = casa(n);
    const copia = clon(estado);
    const { estado: v2, version } = S.migrar(estado, 1);
    assert.equal(version, 2);
    assert.deepEqual(estado, copia, 'no muta la entrada');
    assert.equal(v2.v, 2);
    assert.deepEqual(v2.objetos, estado.objetos);
    assert.equal(v2.contador, estado.contador);
    assert.deepEqual(v2.progreso, estado.progreso);
    assert.deepEqual(v2.hitos, {});
    assert.deepEqual(v2.terreno, { excavacion: estado.progreso?.excavacion ?? null });
    assert.equal(S.validarEstado(v2), null, 'el v2 resultante es válido');
  });
}

test('la migración de lectura es idempotente y no pisa terreno ni hitos existentes', () => {
  const { estado } = casa('excavacion_con_casa');
  const una = S.migrar(estado, 1).estado;
  const dos = S.migrar(una, 1).estado;
  assert.deepEqual(dos, una);
  const conHito = base({ hitos: { primer_muro: { en: FECHA } }, terreno: { excavacion: EXC } });
  assert.deepEqual(S.migrar(conHito, 1).estado, conHito);
  assert.deepEqual(S.migrar(conHito, 2).estado, conHito, 'v2 no se toca');
});

test('un guardado v1 sin excavación queda con terreno.excavacion = null', () => {
  const { estado } = casa('sin_excavacion_antigua');
  assert.deepEqual(S.migrar(estado, 1).estado.terreno, { excavacion: null });
});

test('normalizar: un payload v1 se adapta a v2 (no se etiqueta v2 sin adaptar)', () => {
  const { estado, progreso } = casa('excavacion_con_casa');
  const r = S.normalizar({ estado, progreso }, null);
  assert.equal(r.error, undefined);
  assert.equal(r.estado.v, 2);
  assert.deepEqual(r.estado.hitos, {});
  assert.deepEqual(r.estado.terreno.excavacion, progreso.excavacion ?? null);
  assert.deepEqual(r.estado.objetos, estado.objetos);
});

for (const n of nombres) {
  test(`normalizar acepta la casa de referencia: ${n}`, () => {
    const { estado, progreso } = casa(n);
    const copia = clon({ estado, progreso });
    const r = S.normalizar({ estado, progreso }, null);
    assert.equal(r.error, undefined);
    assert.equal(r.estado.v, 2);
    assert.deepEqual({ estado, progreso }, copia, 'no muta el payload');
  });
}

test('cliente antiguo sobre un guardado v2: conserva hitos, terreno y campos futuros', () => {
  const existente = {
    schema_version: 2,
    estado: base({ hitos: { excavado: { en: FECHA } }, terreno: { excavacion: EXC }, futuro: { a: 1 }, progreso: { excavacion: EXC, buildPhase: 2 } }),
    progreso: { excavacion: EXC, buildPhase: 2 },
  };
  // payload v1: sin terreno, sin hitos, progreso incompleto (sin excavacion)
  const r = S.normalizar({ estado: { v: 1, objetos: [], contador: 3, progreso: { buildPhase: 3 } }, progreso: { buildPhase: 3 } }, existente);
  assert.equal(r.error, undefined);
  assert.equal(r.estado.v, 2);
  assert.deepEqual(r.estado.hitos, { excavado: { en: FECHA } });
  assert.deepEqual(r.estado.futuro, { a: 1 });
  assert.deepEqual(r.estado.terreno.excavacion, EXC, 'sin la clave excavacion se conserva el terreno');
  assert.deepEqual(r.progreso, { excavacion: EXC, buildPhase: 3 }, 'omitidas se conservan, enviadas se actualizan');
  assert.deepEqual(r.estado.progreso, { excavacion: EXC, buildPhase: 3 });
});

test('progreso: clave enviada reemplaza (incluido null); omitida se conserva; no objeto no cambia nada', () => {
  const existente = { schema_version: 2, estado: base({ terreno: { excavacion: EXC }, progreso: { excavacion: EXC, k: 1 } }), progreso: { excavacion: EXC, k: 1 } };
  const est = (p) => ({ v: 2, objetos: [], contador: 1, progreso: p });
  const rellenada = S.normalizar({ estado: est({ excavacion: null }), progreso: { excavacion: null } }, existente);
  assert.equal(rellenada.progreso.excavacion, null, 'excavacion: null es válido (rellenada)');
  assert.equal(rellenada.progreso.k, 1);
  assert.equal(rellenada.estado.terreno.excavacion, null);
  for (const raro of [undefined, null, [], 'x', 5]) {
    const r = S.normalizar({ estado: est({}), progreso: raro }, existente);
    assert.deepEqual(r.progreso, existente.progreso);
    assert.deepEqual(r.estado.terreno.excavacion, EXC);
  }
  const vacio = S.normalizar({ estado: est({}), progreso: {} }, existente);
  assert.deepEqual(vacio.progreso, existente.progreso, '{} no vacía el progreso');
});

test('terreno se deriva de la columna progreso ya combinada', () => {
  const existente = { schema_version: 1, estado: { v: 1, objetos: [], contador: 1, progreso: { excavacion: null } }, progreso: { excavacion: EXC } };
  // el estado entrante no trae excavacion pero la columna combinada sí (viene del existente)
  const r = S.normalizar({ estado: { v: 1, objetos: [], contador: 1, progreso: {} }, progreso: {} }, existente);
  assert.deepEqual(r.estado.terreno.excavacion, EXC);
});

test('hitos: el existente prevalece, el omitido se conserva, el nuevo se agrega', () => {
  const existente = { schema_version: 2, estado: base({ hitos: { a_1: { en: FECHA } } }), progreso: {} };
  const nuevoA = { en: '2027-01-01T00:00:00Z' };
  const r = S.normalizar({ estado: base({ hitos: { a_1: nuevoA, b_2: { en: FECHA } } }), progreso: {} }, existente);
  assert.deepEqual(r.estado.hitos, { a_1: { en: FECHA }, b_2: { en: FECHA } }, 'a_1 conserva su fecha original');
  const sin = S.normalizar({ estado: { v: 2, objetos: [], contador: 1 }, progreso: {} }, existente);
  assert.deepEqual(sin.estado.hitos, { a_1: { en: FECHA } });
  const vacios = S.normalizar({ estado: base({ hitos: {} }), progreso: {} }, existente);
  assert.deepEqual(vacios.estado.hitos, { a_1: { en: FECHA } }, '{} no borra hitos');
});

test('validación: versiones, terreno e hitos inválidos se rechazan', () => {
  for (const v of [3, 0, -1, 1.5, '2', null, 99]) assert.ok(S.validarEstado(base({ v })), `v=${JSON.stringify(v)}`);
  assert.equal(S.validarEstado(base({ v: undefined })), null);
  for (const t of [null, [], 'x', { excavacion: 5 }, { excavacion: { largo: 'a' } }, { excavacion: { largo: Infinity } }, { excavacion: { activa: 'si' } }])
    assert.ok(S.validarEstado(base({ terreno: t })), `terreno=${JSON.stringify(t)}`);
  const muchos = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`h_${i}`, { en: FECHA }]));
  const justos = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`h_${i}`, { en: FECHA }]));
  assert.ok(S.validarEstado(base({ hitos: muchos })), '101 hitos');
  assert.equal(S.validarEstado(base({ hitos: justos })), null, '100 hitos');
  for (const h of [null, [], 'x', { 'Mayus': { en: FECHA } }, { ['a'.repeat(65)]: { en: FECHA } }, { 'con-guion': { en: FECHA } }, { '': { en: FECHA } },
    { ok: null }, { ok: {} }, { ok: { en: 'ayer' } }, { ok: { en: '2026-13-45T00:00:00Z' } }, { ok: { en: 123 } }, { ok: { en: '2026-10-23' } }])
    assert.ok(S.validarEstado(base({ hitos: h })), `hitos=${JSON.stringify(h)}`);
  assert.ok(S.validarEstado(base({ hitos: { ['a'.repeat(64)]: { en: FECHA } } })) === null, 'clave de 64 caracteres');
});

test('normalizar rechaza sin guardar nada parcial y no excede 100 hitos al combinar', () => {
  assert.ok(S.normalizar({ estado: base({ v: 3 }), progreso: {} }, null).error);
  const existente = { schema_version: 2, estado: base({ hitos: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`h_${i}`, { en: FECHA }])) }), progreso: {} };
  const r = S.normalizar({ estado: base({ hitos: { nuevo: { en: FECHA } } }), progreso: {} }, existente);
  assert.ok(r.error, 'no se descarta ningún hito en silencio: se rechaza');
  const mala = S.normalizar({ estado: base(), progreso: { excavacion: { largo: 'x' } } }, null);
  assert.ok(mala.error, 'progreso.excavacion inválida produce terreno inválido y se rechaza');
});

test('v1 sigue siendo válido para el servidor (compatibilidad)', () => {
  for (const n of nombres) assert.equal(S.validarEstado(casa(n).estado), null, n);
});
