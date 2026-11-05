// R5 (techos), R6 (excavación) y R9 (validación técnica de la excavación)
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador, resumen, instantanea } from './helpers.js';

const mallasDe = (r, regex) => r.mallas.filter(m => regex.test(m.name));

test('R5 los cuatro techos se reconstruyen con todas sus piezas', async ({ page }) => {
  const c = leerCasa('techos_cuatro_formas');
  await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const r = await resumen(page);
  // piezas por techo (id): plano, dos aguas, cuatro aguas, una agua
  const esperadas = { 1: 5, 2: 6, 3: 5, 4: 5 };
  for (const [id, n] of Object.entries(esperadas)) {
    expect(mallasDe(r, new RegExp(`^roof_.*_${id}$`)).length, `techo ${id}`).toBe(n);
  }
  const { estado } = await instantanea(page);
  const formas = estado.objetos.filter(o => o.type === 'roof').map(o => `${o.id}:${o.roofShape}:${o.roofMat}`);
  expect(formas).toEqual(['1:plano:concreto', '2:dos_aguas:teja', '3:cuatro_aguas:lamina', '4:una_agua:madera']);
});

test('R6 excavación guardada: se reconstruye la fosa y el terreno', async ({ page }) => {
  const c = leerCasa('excavacion_con_casa');
  await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const r = await resumen(page);
  expect(r.excavacion).toMatchObject({ largo: 6, ancho: 4, profundidad: 1.2, volumen: 28.8, activa: true });
  expect(r.mallas.find(m => m.name === 'ground').visible).toBe(false);
  expect(mallasDe(r, /^ground_seg_[nsew]$/)).toHaveLength(4);
  expect(mallasDe(r, /^exc_floor$/)).toHaveLength(1);
  expect(mallasDe(r, /^exc_w_[nsew]_(top|bot)$/)).toHaveLength(8);
  expect(mallasDe(r, /^exc_stake_\d$/)).toHaveLength(4);
  expect(mallasDe(r, /^exc_pile$/)).toHaveLength(1);
});

test('R6 guardado antiguo sin excavación: terreno original intacto', async ({ page }) => {
  const c = leerCasa('sin_excavacion_antigua');
  await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const r = await resumen(page);
  expect(r.excavacion).toBeNull();
  expect(r.mallas.find(m => m.name === 'ground').visible).toBe(true);
  expect(mallasDe(r, /^exc_|^ground_seg_/)).toHaveLength(0);
});

// ── Validación técnica (R9) ──
async function abrirModal(page) {
  await page.evaluate(() => window.openExcavacionModal());
  await expect(page.locator('#excavacion-overlay')).toHaveClass(/open/);
}
async function dims(page, l, a, p) {
  await page.fill('#exc-largo', String(l));
  await page.fill('#exc-ancho', String(a));
  await page.fill('#exc-profundidad', String(p));
}

test('R9 valores inválidos se rechazan y valores válidos se aceptan', async ({ page }) => {
  test.setTimeout(900_000); // antes 120_000 (global): en entornos sin GPU la prueba tarda ~7.5 min
  await abrirSimulador(page, { estado: null });
  await abrirModal(page);

  const invalidos = [
    ['', '10', '1.5'], ['12', '', '1.5'], ['12', '10', ''],
    ['-3', '10', '1.5'], ['12', '0', '1.5'], ['12', '10', '0'], ['12', '10', '-1'],
    ['18.01', '10', '1.5'], ['12', '19', '1.5'], ['12', '10', '5.01'],
  ];
  for (const [l, a, p] of invalidos) {
    await dims(page, l, a, p);
    await expect(page.locator('#exc-error'), `${l}/${a}/${p}`).toBeVisible();
    await expect(page.locator('#btn-iniciar-excavacion'), `${l}/${a}/${p}`).toBeDisabled();
  }

  // [largo, ancho, prof, volumen mostrado]  (incluye límites y casos de precisión decimal)
  const validos = [
    [6, 4, 1.2, '28.80'], [12, 10, 1.6, '192.00'], [12, 10, 1.4, '168.00'],
    [18, 18, 5, '1620.00'], [0.1, 3, 1.1, '0.33'], [0.1, 0.2, 0.3, '0.01'], [7.5, 2.5, 0.4, '7.50'],
  ];
  for (const [l, a, p, v] of validos) {
    await dims(page, l, a, p);
    await expect(page.locator('#exc-error'), `${l}/${a}/${p}`).toBeHidden();
    await expect(page.locator('#btn-iniciar-excavacion'), `${l}/${a}/${p}`).toBeEnabled();
    await expect(page.locator('#exc-stat-vol')).toHaveText(`${v} m³`);
    await expect(page.locator('#exc-stat-area')).toHaveText(`${(l * a).toFixed(2)} m²`);
  }
});

test('R6/R9 excavar con medidas libres: no mueve objetos, se guarda y se puede rellenar', async ({ page }) => {
  const c = leerCasa('muros_puerta_ventana');
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const antes = (await instantanea(page)).estado.objetos;

  await abrirModal(page);
  await dims(page, 7.5, 2.5, 0.4);                       // medidas distintas de cualquier "objetivo"
  await page.click('#btn-iniciar-excavacion');

  let r = await resumen(page);
  expect(r.excavacion).toMatchObject({ largo: 7.5, ancho: 2.5, profundidad: 0.4, volumen: 7.5, activa: true });
  expect(r.mallas.find(m => m.name === 'ground').visible).toBe(false);
  expect(mallasDe(r, /^exc_floor$/)).toHaveLength(1);
  // No hay ninguna condición de "cumple": el botón queda marcado como realizado con cualquier medida
  await expect(page.locator('#btnExcavacion')).toContainText('✓');

  const despues = (await instantanea(page)).estado.objetos;
  expect(despues).toEqual(antes);                          // ningún objeto se movió ni cambió

  // El autoguardado envía la excavación
  await expect.poll(() => reg.puts.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const ultimo = reg.puts.at(-1);
  expect(ultimo.progreso.excavacion).toMatchObject({ largo: 7.5, ancho: 2.5, profundidad: 0.4, volumen: 7.5 });
  expect(ultimo.progreso.excavacion).not.toHaveProperty('cumpleObjetivo');

  // Rellenar
  page.on('dialog', d => d.accept());
  await abrirModal(page);
  await page.click('#btn-eliminar-excavacion');
  r = await resumen(page);
  expect(r.excavacion).toBeNull();
  expect(r.mallas.find(m => m.name === 'ground').visible).toBe(true);
  expect(mallasDe(r, /^exc_|^ground_seg_/)).toHaveLength(0);
});

test('R9 la interfaz de excavación no muestra objetivos ni comprobación de cumplimiento', async ({ page }) => {
  await abrirSimulador(page, { estado: null });
  await abrirModal(page);
  await dims(page, 12, 10, 1.5);
  await expect(page.locator('#excavacion-modal')).not.toContainText(/Objetivo|objetivo|Cumple|cumple|Esperado/);
  await expect(page.locator('#btn-exc-preset')).toHaveCount(0);
});
