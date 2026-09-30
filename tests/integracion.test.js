import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function routeContext(path, query) {
  const handlers = {};
  const router = { use() {}, get() {}, put() {}, post(path, fn) { handlers[path] = fn; } };
  const ctx = vm.createContext({ Router: () => router, query, verifyToken() {}, requireAdmin() {}, console });
  vm.runInContext(read(path).replace(/^import .*;\r?\n/gm, '').replace('export default router;', ''), ctx);
  return handlers;
}
const response = () => ({ status() { return this; }, json(value) { this.body = value; } });

test('evaluación acepta booleanos y texto y distingue acierto tras error', async () => {
  for (const values of [[true], ['true'], [false, true], ['false', 'true']]) {
    const handlers = routeContext('server/routes/evaluacion.js', async sql => {
      if (sql.includes('SELECT id FROM sesiones')) return { rows: [{ id: 1 }] };
      if (sql.includes('SELECT * FROM telemetria')) return { rows: values.map((correcto, i) => ({ actividad_id: 9, contexto: { correcto }, marca_tiempo: new Date(i * 1000) })) };
      if (sql.includes('SELECT habilidad_id')) return { rows: [{ habilidad_id: 5 }] };
      return { rows: [{ id: 10 }] };
    });
    const res = response();
    await handlers['/evaluacion/sesion/:sesion_id']({ params: { sesion_id: '1' }, user: { id: 2 } }, res);
    assert.equal(res.body.evaluaciones[0].puntaje, values.length === 1 ? 100 : 70);
  }
});

test('telemetría resuelve IDs reales sin depender del orden del seed', async () => {
  let inserted;
  const handlers = routeContext('server/routes/telemetria.js', async (sql, params) => {
    if (sql.includes('SELECT id FROM sesiones')) return { rows: [{ id: 1 }] };
    if (sql.includes('SELECT id, nombre')) return { rows: [{ id: 42, nombre: 'Calcular área del terreno' }] };
    inserted = params;
    return { rows: [] };
  });
  const res = response();
  await handlers['/telemetria']({ user: { id: 2 }, body: { sesion_id: 1, eventos: [{ tipo_evento: 'matematicas_intento', contexto: { correcto: true } }] } }, res);
  assert.equal(inserted[5], 42);
  assert.equal(res.body.insertados, 1);
});

test('autoguardado conserva cambios durante una petición y ante beacon sin confirmación', async () => {
  let resolve;
  const ctx = vm.createContext({
    console, Blob, CustomEvent: class {},
    document: { dispatchEvent() {}, addEventListener() {} }, window: { addEventListener() {} },
    localStorage: { getItem: () => 'token' }, navigator: { sendBeacon: () => false },
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    fetch: () => new Promise(r => { resolve = r; }),
  });
  vm.runInContext(read('src/scripts/guardado.js').replaceAll('export ', ''), ctx);
  vm.runInContext('iniciarAutoguardado(() => ({estado:{objetos:[]},progreso:{}})); marcarSucio();', ctx);
  const pending = vm.runInContext('guardar()', ctx);
  vm.runInContext('marcarSucio()', ctx);
  resolve({ ok: true }); await pending;
  assert.equal(vm.runInContext('haySinGuardar()', ctx), true);
  vm.runInContext('flushBeacon()', ctx);
  assert.equal(vm.runInContext('haySinGuardar()', ctx), true);
  const retry = vm.runInContext('guardar()', ctx);
  resolve({ ok: true }); await retry;
  assert.equal(vm.runInContext('haySinGuardar()', ctx), false);
});

test('lámpara puede estar en azul y los bloques conservan su límite', () => {
  const source = read('src/scripts/casa.js');
  const ctx = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('const BUILD_ZONE ='), source.indexOf('// desbloquea fases')), ctx);
  for (const [type, x, expected] of [['lampara', 12, 12], ['lampara', 15, 12.5], ['block', 12, 9.5]]) {
    ctx.root = { userData: { type }, position: { x, y: -1, z: x }, getChildMeshes: () => [] };
    vm.runInContext('clampToZone(root)', ctx);
    assert.equal(ctx.root.position.x, expected);
    assert.equal(ctx.root.position.y, 0);
  }
});

test('cámara continua, Shift, parada al perder foco y rotaciones conservan autoguardado', () => {
  const source = read('src/scripts/casa.js');
  const callbacks = [], events = {};
  let dirty = 0;
  const camera = { alpha: 0, beta: 1 };
  const ctx = vm.createContext({
    GizmoManager: class { gizmos = { positionGizmo: { onDragEndObservable: { add() {} } } }; },
    gizmoMgr: null, selectedMesh: null, camera, clampToZone() {}, marcarSucio() { dirty++; },
    engine: { getDeltaTime: () => 1000 / 60 },
    scene: { registerBeforeRender(fn) { callbacks.push(fn); } },
    document: { activeElement: null, addEventListener() {} },
    window: { addEventListener(n, fn) { events[n] = fn; } },
  });
  vm.runInContext(source.slice(source.indexOf('function setupGizmos()'), source.indexOf('// selecciona o deselecciona')), ctx);
  vm.runInContext('setupGizmos()', ctx);
  const event = (code, shiftKey = false) => ({ code, shiftKey, target: { tagName: 'CANVAS' }, preventDefault() {} });
  const frame = () => callbacks.forEach(fn => fn());
  events.keydown(event('ArrowRight'));
  for (let i = 0; i < 60; i++) frame();
  assert.ok(Math.abs(camera.alpha - Math.PI / 3) < 1e-9);
  events.keyup(event('ArrowRight'));
  const angle = camera.alpha;
  frame(); assert.equal(camera.alpha, angle);
  events.keydown(event('ArrowRight', true)); frame();
  assert.ok(Math.abs(camera.alpha - angle - Math.PI / 3 / 60 * 2.5) < 1e-9);
  events.blur(); const stopped = camera.alpha; frame(); assert.equal(camera.alpha, stopped);
  ctx.selectedMesh = { userData: { type: 'lampara' }, rotation: { x: 0, y: 0, z: 0 } };
  events.keydown(event('KeyQ')); assert.equal(dirty, 1);
});
