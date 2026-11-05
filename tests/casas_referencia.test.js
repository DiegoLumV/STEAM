// Fase 0: las casas de referencia sintéticas son válidas para el servidor actual.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dir = new URL('./casas/', import.meta.url);
const nombres = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
const leer = n => JSON.parse(fs.readFileSync(new URL(`${n}.json`, dir), 'utf8'));

// Carga validarEstado() del servidor tal cual está en server/routes/guardado.js
function cargarValidador() {
  const src = fs.readFileSync(new URL('../server/routes/guardado.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace('export default router;', '')
    .replace(/^export const beaconRouter[\s\S]*$/m, '');
  const router = { use() {}, get() {}, put() {}, post() {}, delete() {} };
  const ctx = vm.createContext({ Router: () => router, query() {}, verifyToken() {}, console });
  vm.runInContext(src, ctx);
  return ctx.validarEstado;
}

test('existen las nueve casas de referencia', () => {
  assert.deepEqual(nombres, [
    'bloques_con_cortes', 'casa_500_objetos', 'excavacion_con_casa', 'lampara_exterior',
    'muros_puerta_ventana', 'pisos_vitropiso', 'sin_excavacion_antigua', 'techos_cuatro_formas', 'vacia',
  ]);
});

for (const n of nombres) {
  test(`casa de referencia "${n}" es válida para el servidor`, () => {
    const validarEstado = cargarValidador();
    const { descripcion, estado } = leer(n);
    assert.ok(descripcion, 'tiene descripción');
    assert.equal(validarEstado(estado), null, 'validarEstado la acepta');
    assert.ok(Buffer.byteLength(JSON.stringify(estado)) < 2 * 1024 * 1024, 'menos de 2 MB');
    const ids = estado.objetos.map(o => o.id);
    assert.equal(new Set(ids).size, ids.length, 'ids únicos');
    assert.ok(estado.contador > Math.max(0, ...ids), 'contador mayor que todos los ids');
    assert.ok(!/@|password|token/i.test(JSON.stringify(estado)), 'sin datos personales');
  });
}

test('la casa de 500 objetos está exactamente en el límite del servidor', () => {
  const validarEstado = cargarValidador();
  const { estado } = leer('casa_500_objetos');
  assert.equal(estado.objetos.length, 500);
  assert.equal(validarEstado(estado), null);
  const demasiados = { ...estado, objetos: [...estado.objetos, { id: 501, type: 'block', p: [0, 0, 0] }] };
  assert.match(validarEstado(demasiados), /máximo 500 objetos/);
});

test('el servidor rechaza datos inválidos (validación técnica)', () => {
  const validarEstado = cargarValidador();
  assert.ok(validarEstado(null));
  assert.ok(validarEstado({ objetos: 'x' }));
  assert.ok(validarEstado({ objetos: [{ type: '', p: [0, 0, 0] }] }));
  assert.ok(validarEstado({ objetos: [{ type: 'block', p: [0, 0] }] }));
  assert.ok(validarEstado({ objetos: [{ type: 'block', p: [0, NaN, 0] }] }));
  assert.ok(validarEstado({ objetos: [{ type: 'block', p: [0, 0, 0], r: [1] }] }));
});
