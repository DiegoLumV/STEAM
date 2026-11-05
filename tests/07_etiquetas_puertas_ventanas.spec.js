// Fase 4 (parte 2): las puertas y ventanas incrustadas muestran el emoji y la etiqueta correctos
// al construirse y al restaurarse. Valores esperados escritos a mano (no leídos de MATERIALES).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador } from './helpers.js';

const filas = page => page.evaluate(() =>
  [...document.querySelectorAll('#obj-items > .obj-item')].map(e => [...e.querySelectorAll('span')].slice(0, 2).map(s => s.textContent)));
const cuenta = (f, par) => f.filter(([e, t]) => e === par[0] && t.startsWith(par[1])).length;

test('F4-P2b restaurar: puertas y ventanas incrustadas conservan emoji y etiqueta', async ({ page }) => {
  const c = leerCasa('muros_puerta_ventana'); // 1 puerta y 2 ventanas incrustadas
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const f = await filas(page);
  expect(cuenta(f, ['🚪', 'Puerta'])).toBe(1);
  expect(cuenta(f, ['🪟', 'Ventana'])).toBe(2);
  expect(f.filter(([, t]) => t.startsWith('Puerta') || t.startsWith('Ventana'))).toEqual(
    expect.arrayContaining([['🚪', 'Puerta'], ['🪟', 'Ventana (1)'], ['🪟', 'Ventana (2)']]));
  expect(reg.errores).toEqual([]);
});

test('F4-P2b construir: una pared con puerta y otra con ventanas crean sus elementos con emoji y etiqueta', async ({ page }) => {
  test.setTimeout(240_000);
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, {
    estado: c.estado,
    progreso: { ...c.progreso, buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true },
  });
  // Pared con puerta
  await page.evaluate(() => openWallBuilder());
  await page.evaluate(() => wbSelectMode('puerta'));
  await page.locator('#wb-build-btn').click();
  await page.evaluate(() => document.getElementById('wall-overlay').classList.remove('open'));
  // Pared con ventana
  await page.evaluate(() => openWallBuilder());
  await page.evaluate(() => wbSelectMode('ventana'));
  await page.locator('#wb-build-btn').click();
  await page.evaluate(() => document.getElementById('wall-overlay').classList.remove('open'));

  await page.waitForFunction(() => window.__steamTest.resumenEscena().paredes >= 2, null, { timeout: 60_000 });
  const f = await filas(page);
  expect(cuenta(f, ['🚪', 'Puerta'])).toBe(1);
  expect(cuenta(f, ['🪟', 'Ventana'])).toBe(1);
  expect(f).toContainEqual(['🚪', 'Puerta']);
  expect(f).toContainEqual(['🪟', 'Ventana']);
  expect(reg.errores).toEqual([]);
});
