// Fase 4 (parte 2): la losa de concreto muestra 🪨 «Concreto 20×20» al construirse y al restaurarse.
// Valores esperados escritos a mano (no leídos de MATERIALES).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador } from './helpers.js';

const filas = page => page.evaluate(() =>
  [...document.querySelectorAll('#obj-items > .obj-item')].map(e => [...e.querySelectorAll('span')].slice(0, 2).map(s => s.textContent)));

const PROGRESO = { buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true, puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off' };

test('F4-LOSA restaurar: la losa conserva emoji y etiqueta', async ({ page }) => {
  const estado = { v: 1, objetos: [{ id: 1, type: 'concreto_slab_20', p: [0, 0, 0], r: [0, 0, 0] }], contador: 2, progreso: {} };
  const reg = await abrirSimulador(page, { estado, progreso: PROGRESO });
  expect(await filas(page)).toEqual([['🪨', 'Concreto 20×20']]);
  const { estado: e } = await page.evaluate(() => window.__steamTest.snapshot());
  expect(e.objetos.map(o => o.type)).toEqual(['concreto_slab_20']); // el tipo guardado no cambia
  expect(reg.errores).toEqual([]);
});

test('F4-LOSA construir: al mezclar el concreto correcto la losa aparece con emoji y etiqueta', async ({ page }) => {
  test.setTimeout(240_000);
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, {
    estado: c.estado,
    progreso: { ...c.progreso, buildPhase: 1, matematicasValidadas: true },
  });
  await page.evaluate(() => openConcretoModal());
  for (const [m, v] of [['cemento', '1000'], ['arena', '2000'], ['grava', '3000'], ['agua', '600']])
    await page.locator(`#inp-${m}`).fill(v);
  await page.locator('#btn-mezclar').click();
  await page.waitForFunction(() => window.__steamTest.resumenEscena().objetos.some(o => o.type === 'concreto_slab_20'), null, { timeout: 60_000 });
  expect(await filas(page)).toEqual([['🪨', 'Concreto 20×20']]);
  // La losa recién construida se serializa con el mismo tipo y se restaura igual
  const { estado, progreso } = await page.evaluate(() => window.__steamTest.snapshot());
  expect(estado.objetos.map(o => o.type)).toEqual(['concreto_slab_20']);
  const p2 = await page.context().newPage();
  const reg2 = await abrirSimulador(p2, { estado, progreso });
  expect(await filas(p2)).toEqual([['🪨', 'Concreto 20×20']]);
  expect(reg.errores).toEqual([]);
  expect(reg2.errores).toEqual([]);
});
