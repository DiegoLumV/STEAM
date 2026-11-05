// Fase 0: comportamiento ACTUAL de POST /api/entrega (línea base antes de cualquier cambio).
// Hoy el servidor acepta cualquier casa guardada y rechaza la entrega si no hay nada guardado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const leerCasa = n => JSON.parse(fs.readFileSync(new URL(`./casas/${n}.json`, import.meta.url), 'utf8'));

function manejadorEntrega(query) {
  const handlers = {};
  const router = { use() {}, get() {}, put() {}, delete() {}, post(ruta, fn) { handlers[ruta] = fn; } };
  const src = fs.readFileSync(new URL('../server/routes/cuestionario.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export default router;', '');
  const ctx = vm.createContext({ Router: () => router, query, verifyToken() {}, registrarActividad() {}, console, parseInt });
  vm.runInContext(src, ctx);
  return handlers['/entrega'];
}
const respuesta = () => ({ code: 200, status(c) { this.code = c; return this; }, json(v) { this.body = v; } });

test('sin casa guardada la entrega se rechaza', async () => {
  const h = manejadorEntrega(async () => ({ rows: [] }));
  const res = respuesta();
  await h({ body: {}, user: { id: 1 } }, res);
  assert.equal(res.code, 400);
  assert.match(res.body.error, /Guarda tu casa/);
});

for (const n of ['vacia', 'bloques_con_cortes', 'muros_puerta_ventana', 'excavacion_con_casa', 'sin_excavacion_antigua']) {
  test(`con la casa "${n}" guardada la entrega se acepta (no se exigen mínimos)`, async () => {
    const { estado } = leerCasa(n);
    const llamadas = [];
    const h = manejadorEntrega(async (sql, params) => {
      llamadas.push(sql);
      if (/UPDATE proyecto_guardados/.test(sql)) return { rows: [{ entregado_en: new Date('2026-01-01'), estado }] };
      if (/SELECT id FROM practicas/.test(sql)) return { rows: [{ id: 7 }] };
      return { rows: [] };
    });
    const res = respuesta();
    await h({ body: {}, user: { id: 1 } }, res);
    assert.equal(res.code, 200);
    assert.ok(res.body.entregado_en);
    assert.ok(llamadas.some(s => /INSERT INTO calificaciones/.test(s)), 'crea la calificación pendiente');
  });
}
