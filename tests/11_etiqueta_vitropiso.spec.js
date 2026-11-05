// Fase 4 (parte 2): el vitropiso muestra 🔷 «Vitropiso A×B» al construirse y al restaurarse.
// Valores esperados escritos a mano (no leídos de MATERIALES).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador } from './helpers.js';

const filas = page => page.evaluate(() =>
  [...document.querySelectorAll('#obj-items > .obj-item')].map(e => [...e.querySelectorAll('span')].slice(0, 2).map(s => s.textContent)));

test('F4-VITRO restaurar: los vitropisos conservan emoji, etiqueta y datos guardados', async ({ page }) => {
  const c = leerCasa('pisos_vitropiso'); // 4×5, 6×6 y 3×3
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const f = await filas(page);
  expect(f).toHaveLength(3);
  for (const esperado of [['🔷', 'Vitropiso 4×5'], ['🔷', 'Vitropiso 6×6'], ['🔷', 'Vitropiso 3×3']]) expect(f).toContainEqual(esperado);
  // Tipo y datos serializados intactos
  const { estado } = await page.evaluate(() => window.__steamTest.snapshot());
  const pisos = estado.objetos.filter(o => o.type === 'floor_vitropiso').map(o => [o.id, o.w, o.d, o.area]);
  expect(pisos).toEqual([[1, 4, 5, 20], [2, 6, 6, 36], [3, 3, 3, 9]]);
  expect(reg.errores).toEqual([]);
});

test('F4-VITRO construir: un vitropiso nuevo muestra emoji y etiqueta y se restaura igual', async ({ page }) => {
  test.setTimeout(240_000);
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, {
    estado: c.estado,
    progreso: { ...c.progreso, buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true },
  });
  await page.evaluate(() => { openWallBuilder(); switchWallTab('piso'); });
  await page.locator('.wp-size-opt[data-w="5"][data-d="5"]').click();
  await page.locator('#wp-build-btn').click();
  await page.waitForFunction(() => window.__steamTest.resumenEscena().objetos.some(o => o.type === 'floor_vitropiso'), null, { timeout: 60_000 });
  expect(await filas(page)).toEqual([['🔷', 'Vitropiso 5×5']]);
  const { estado, progreso } = await page.evaluate(() => window.__steamTest.snapshot());
  expect(estado.objetos.map(o => [o.type, o.w, o.d, o.area])).toEqual([['floor_vitropiso', 5, 5, 25]]);

  const p2 = await page.context().newPage();
  const reg2 = await abrirSimulador(p2, { estado, progreso });
  expect(await filas(p2)).toEqual([['🔷', 'Vitropiso 5×5']]);
  expect(reg.errores).toEqual([]);
  expect(reg2.errores).toEqual([]);
});
