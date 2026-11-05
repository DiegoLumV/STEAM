import { test, expect } from '@playwright/test';
import { abrirSimulador, resumen } from './helpers.js';

test('el simulador arranca sin guardado previo y sin errores de página', async ({ page }) => {
  const reg = await abrirSimulador(page, { estado: null });
  const r = await resumen(page);
  expect(r.objetos).toHaveLength(0);
  expect(r.mallas.some(m => m.name === 'ground')).toBe(true);
  expect(reg.errores.filter(e => !/WebGL|GPU|swiftshader/i.test(e))).toEqual([]);
});
