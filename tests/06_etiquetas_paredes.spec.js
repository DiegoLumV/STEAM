// Fase 4 (parte 2): las paredes de block, madera y lámina muestran la etiqueta y el emoji correctos
// al construirse y al restaurarse. Los valores esperados están escritos a mano (no leídos de MATERIALES).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador, resumen } from './helpers.js';

const filas = page => page.evaluate(() =>
  [...document.querySelectorAll('#obj-items > .obj-item')].map(e => [...e.querySelectorAll('span')].slice(0, 2).map(s => s.textContent)));

test('F4-P2 restaurar: las paredes conservan emoji y etiqueta', async ({ page }) => {
  const c = leerCasa('muros_puerta_ventana');
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const f = await filas(page);
  const paredes = f.filter(([, t]) => t.startsWith('Pared '));
  expect(paredes).toHaveLength(4);
  expect(paredes).toContainEqual(['🧱', 'Pared Block 5×4 + 🚪 Puerta']);
  expect(paredes).toContainEqual(['🧱', 'Pared Block 5×4']);
  expect(paredes).toContainEqual(['🪵', expect.stringMatching(/^Pared Madera 6×4 \+ 🪟 \d Ventana\(s\)$/)]);
  expect(paredes).toContainEqual(['🛡️', 'Pared Lámina 4×3']);
  expect(reg.errores).toEqual([]);
});

test('F4-P2 construir: cada material de pared muestra su emoji y etiqueta', async ({ page }) => {
  test.setTimeout(240_000);
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, {
    estado: c.estado,
    progreso: { ...c.progreso, buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true },
  });
  const esperado = [['block', '🧱', 'Pared Block 5×5'], ['madera', '🪵', 'Pared Madera 5×5'], ['lamina', '🛡️', 'Pared Lámina 5×5']];
  for (const [mat] of esperado) {
    await page.evaluate(() => openWallBuilder());
    await page.locator(`#wb-mat-options .wb-opt[data-mat="${mat}"]`).click();
    await page.locator('#wb-build-btn').click();
    await page.evaluate(() => document.getElementById('wall-overlay').classList.remove('open'));
  }
  await page.waitForFunction(() => window.__steamTest.resumenEscena().paredes >= 3, null, { timeout: 60_000 });
  const f = (await filas(page)).filter(([, t]) => t.startsWith('Pared '));
  for (const [, emoji, etiqueta] of esperado) expect(f).toContainEqual([emoji, etiqueta]);
  expect((await resumen(page)).paredes).toBe(3);
  expect(reg.errores).toEqual([]);
});
