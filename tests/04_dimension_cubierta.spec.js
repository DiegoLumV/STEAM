// R8 (línea base): dimensiones sugeridas para el techo a partir de la casa (getHouseBounds -> roofAutoFit).
//   Regenerar solo si el cambio es intencional:  UPDATE_GOLDEN=1 npx playwright test 04_dimension
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { leerCasa, abrirSimulador } from './helpers.js';

const RUTA = new URL('./dorados/dimension_cubierta.json', import.meta.url);
const ACTUALIZAR = process.env.UPDATE_GOLDEN === '1';
const CASAS_PROBADAS = ['vacia', 'bloques_con_cortes', 'muros_puerta_ventana', 'pisos_vitropiso', 'excavacion_con_casa', 'sin_excavacion_antigua'];

test('R8 el ancho y largo sugeridos del techo coinciden con la línea base', async ({ page }) => {
  test.setTimeout(240_000);
  const obtenido = {};
  for (const nombre of CASAS_PROBADAS) {
    const c = leerCasa(nombre);
    const p = await page.context().newPage();
    await abrirSimulador(p, { estado: c.estado, progreso: c.progreso });
    obtenido[nombre] = await p.evaluate(() => {
      window.roofAutoFit(true);
      return { ancho: document.getElementById('roof-width').value, largo: document.getElementById('roof-depth').value };
    });
    await p.close();
  }
  if (ACTUALIZAR) {
    fs.writeFileSync(RUTA, JSON.stringify(obtenido, null, 2) + '\n');
    return;
  }
  expect(obtenido).toEqual(JSON.parse(fs.readFileSync(RUTA, 'utf8')));
});
