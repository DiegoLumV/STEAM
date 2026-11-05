// Fase 4 (parte 2): materiales de techo. Selección en la interfaz y restauración desde un guardado.
// Valores esperados escritos a mano (no leídos de MATERIALES ni de ROOF_MATERIALS).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador } from './helpers.js';

const filas = page => page.evaluate(() =>
  [...document.querySelectorAll('#obj-items > .obj-item')].map(e => [...e.querySelectorAll('span')].slice(0, 2).map(s => s.textContent)));

test('F4-P2c restaurar: los 4 techos conservan emoji y etiqueta con su material', async ({ page }) => {
  const c = leerCasa('techos_cuatro_formas');
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const f = await filas(page);
  const techos = f.filter(([, t]) => /^(Techo Plano|A Dos Aguas|A Cuatro Aguas|A Una Agua) \(/.test(t));
  expect(techos).toHaveLength(4);
  for (const t of ['Techo Plano (Concreto)', 'A Dos Aguas (Teja)', 'A Cuatro Aguas (Lámina)', 'A Una Agua (Madera)'])
    expect(techos.some(([e, txt]) => e === '🏠' && txt.startsWith(t)), t).toBe(true);
  expect(reg.errores).toEqual([]);
});

test('F4-P2c seleccionar: cada opción de material de techo actualiza el panel y la etiqueta', async ({ page }) => {
  test.setTimeout(240_000);
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, {
    estado: c.estado,
    progreso: { ...c.progreso, buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true },
  });
  await page.evaluate(() => { openWallBuilder(); switchWallTab('techo'); });
  const opciones = [['concreto', 'Concreto'], ['madera', 'Madera'], ['lamina', 'Lámina'], ['teja', 'Teja']];
  for (const [clave, etiqueta] of opciones) {
    await page.locator(`#roof-mat-options .wb-opt[data-mat="${clave}"]`).click();
    await expect(page.locator('#roof-info-mat')).toHaveText(etiqueta);
  }
  // Construir uno con la última selección (teja) y comprobar la etiqueta del objeto
  await page.evaluate(() => buildRoof());
  await page.waitForFunction(() => document.querySelectorAll('#obj-items > .obj-item').length >= 1, null, { timeout: 60_000 });
  const f = await filas(page);
  expect(f.some(([e, t]) => e === '🏠' && /^Techo Plano \(Teja\) /.test(t))).toBe(true);
  expect(reg.errores).toEqual([]);
});
