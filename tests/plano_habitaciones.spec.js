// F4b · Habitaciones libres con nombre en el editor 2D del plano: herramienta H (dos clics), selección con handles y panel,
// solape con aviso (no bloquea), plantillas, guardado aditivo en progreso.plano.habitaciones y aislamiento del 3D.
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Se usan los clics, teclas y rueda reales del alumno.
// El estado interno se lee con window.__steamTest.plano() (solo lectura: habitaciones con área y perímetro calculados) y con el DOM
// del SVG. Los helpers se DUPLICAN desde plano_editor.spec.js (F4a no se toca). En un equipo sin GPU el simulador corre a ~1,5 FPS:
// las esperas son por condición. Color (opción A): selección celeste, solape ámbar; los elementos de F4a siguen ámbar.
// El WebSocket de recarga en caliente de Vite (ws://localhost) es ruido del entorno y se filtra solo aquí.
//
// Correspondencia con la autorización: H1–H22 (ver el título de cada prueba) y docs/F4b_cierre.md.
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador } from './helpers.js';

test.describe.configure({ timeout: 300_000 });

const PROGRESO = {
  buildPhase: 4, concretoUnlocked: true, matematicasValidadas: true,
  puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off',
};
const bloque = (id, x, y, z) => ({ id, type: 'block', p: [x, y, z], r: [0, 0, 0] });
const casa = (objetos, extra = {}) => {
  const progreso = { ...PROGRESO, ...extra };
  return { estado: { v: 2, objetos, contador: objetos.length + 1, progreso, terreno: { excavacion: extra.excavacion ?? null }, hitos: {} }, progreso };
};
const hab = (id, x, z, ancho, largo, nombre = `Habitación ${id.slice(1)}`) => ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre });
const planoCon = (extra = {}) => ({
  v: 1, lote: { ancho: 10, largo: 10 }, rejilla: { visible: false, paso: 0.5 }, elementos: [], contador: 1, ...extra,
});

const plano = page => page.evaluate(() => window.__steamTest.plano());
const habitaciones = async page => (await plano(page)).habitaciones;
const camara = page => page.evaluate(() => window.__steamTest.camara());
const limites = (page, id) => page.evaluate(i => window.__steamTest.limitesObjeto(i), id);
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const overlay = page => page.locator('#plano-overlay');
const panel = page => page.locator('#plano-panel');
const pantalla = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.planoAPantalla(a, b), [x, z]);
const errores = reg => reg.errores.filter(e => !/WebSocket connection to 'ws:\/\/localhost/.test(e));

async function abrir(page, opciones = {}) {
  const reg = await abrirSimulador(page, opciones);
  reg.telemetria = [];
  page.on('request', r => {
    if (!r.url().includes('/api/telemetria')) return;
    try { reg.telemetria.push(...(JSON.parse(r.postData() || '{}').eventos || [])); } catch (e) { /* no es JSON */ }
  });
  return reg;
}
async function abrirConPiezas(page, objetos, extra) {
  const reg = await abrir(page, casa(objetos, extra));
  await page.waitForFunction(n => window.__steamTest.resumenEscena().objetos.length === n, objetos.length, { timeout: 120_000 });
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  await cuadros(page, 2);
  return reg;
}
async function abrirEditor(page) {
  await page.click('#btnPlano');
  await expect(overlay(page)).toHaveClass(/open/);
  await expect.poll(async () => (await plano(page)).abierto).toBe(true);
}
async function clic(page, x, z) {
  const p = await pantalla(page, x, z);
  await page.mouse.click(p.x, p.y);
}
async function arrastrar(page, de, a, boton = 'left') {
  const p = await pantalla(page, de[0], de[1]), q = await pantalla(page, a[0], a[1]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: boton });
  await page.mouse.move((p.x + q.x) / 2, (p.y + q.y) / 2, { steps: 3 });
  await page.mouse.move(q.x, q.y, { steps: 3 });
  await page.mouse.up({ button: boton });
}
async function rejilla(page, paso = 0.5) {
  const caja = page.locator('#plano-rejilla-visible');
  if (!(await caja.isChecked())) await caja.check();
  await page.selectOption('#plano-rejilla-paso', String(paso));
}
/** Con la herramienta Habitación (H): dos clics en esquinas opuestas. */
async function crear(page, a, b) {
  if ((await plano(page)).herramienta !== 'habitacion') await page.keyboard.press('h');
  await clic(page, a[0], a[1]);
  await clic(page, b[0], b[1]);
}
async function ultimoPutConPlano(reg) {
  await expect.poll(() => reg.puts.filter(p => p.progreso?.plano).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  return reg.puts.filter(p => p.progreso?.plano).at(-1);
}
async function fijar(page, selector, valor) {
  await page.fill(selector, valor);
  await page.press(selector, 'Enter');
}
const sinCamara = c => ({ alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target });
const estiloHab = (page, id, selector, prop) =>
  page.locator(`#plano-svg [data-hab-id="${id}"] ${selector}`).evaluate((el, p) => getComputedStyle(el)[p], prop);

// ── H1 · crear con la herramienta H ──────────────────────────────────────────
test('H1 · la herramienta H dibuja una habitación con dos clics y le pone el nombre por defecto; el botón y el atajo la activan', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  const boton = page.locator('#plano-overlay [data-herr="habitacion"]');
  await expect(boton).toBeVisible();
  await boton.click();
  expect((await plano(page)).herramienta).toBe('habitacion');
  await expect(boton).toHaveAttribute('aria-pressed', 'true');
  await clic(page, -3, -2);
  expect((await plano(page)).inicio).toEqual({ x: -3, z: -2 });
  await clic(page, 1, 1);
  let h = await habitaciones(page);
  expect(h).toHaveLength(1);
  expect(h[0]).toMatchObject({ id: 'h1', tipo: 'habitacion', x: -3, z: -2, ancho: 4, largo: 3, nombre: 'Habitación 1', area: 12, perimetro: 14 });
  expect((await plano(page)).inicio).toBeNull();
  expect((await plano(page)).seleccionHab).toBe('h1');
  await expect(page.locator('#plano-svg .plano-hab')).toHaveCount(1);
  await expect(page.locator('#plano-svg [data-hab-nombre="h1"]')).toHaveText('Habitación 1');
  await expect(page.locator('#plano-svg [data-hab-area="h1"]')).toHaveText('12.0 m²');
  await crear(page, [2, 2], [4, 4]);                                       // la segunda: id y nombre siguientes
  h = await habitaciones(page);
  expect(h.map(x => [x.id, x.nombre])).toEqual([['h1', 'Habitación 1'], ['h2', 'Habitación 2']]);
  expect((await plano(page)).trabajo.elementos).toEqual([]);                // no son elementos de F4a
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  expect(errores(reg)).toEqual([]);
});

// ── H2 · Esc cancela ─────────────────────────────────────────────────────────
test('H2 · Esc durante el dibujo cancela la habitación en curso: no se crea nada y el editor sigue abierto', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('h');
  await clic(page, 1, 1);
  expect((await plano(page)).inicio).toEqual({ x: 1, z: 1 });
  const q = await pantalla(page, 3, 3);
  await page.mouse.move(q.x, q.y);                                         // la vista previa sigue al puntero
  await expect(page.locator('#plano-svg [data-hab-previa]')).toHaveCount(1);
  await page.keyboard.press('Escape');                                     // cancela el dibujo (no cierra el editor)
  expect((await plano(page)).inicio).toBeNull();
  await expect(page.locator('#plano-svg [data-hab-previa]')).toHaveCount(0);
  expect(await habitaciones(page)).toEqual([]);
  await expect(overlay(page)).toHaveClass(/open/);
  expect((await plano(page)).herramienta).toBe('habitacion');              // la herramienta sigue activa
  await clic(page, 1, 1); await clic(page, 3, 3);                          // y se puede dibujar de nuevo
  expect(await habitaciones(page)).toHaveLength(1);
  expect(errores(reg)).toEqual([]);
});

// ── H3 · área ≤ 0.01 m² no se crea ───────────────────────────────────────────
test('H3 · una habitación con área ≤ 0.01 m² (o sin ancho) no se crea y se avisa; el primer clic sigue esperando y Esc lo limpia', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.1);
  await page.keyboard.press('h');
  await clic(page, 0, 0);
  await clic(page, 0, 0);                                                  // mismo punto: ancho y largo 0
  expect(await habitaciones(page)).toEqual([]);
  await expect(page.locator('#plano-tip')).toContainText('No se crea');
  expect((await plano(page)).inicio).toEqual({ x: 0, z: 0 });              // sigue esperando la esquina opuesta
  await page.keyboard.press('Escape');                                     // Esc limpia el primer clic (no cierra el editor)
  expect((await plano(page)).inicio).toBeNull();
  await clic(page, 0, 0);
  await clic(page, 0.1, 0.1);                                              // 0.1 × 0.1 = 0.01: no se crea
  expect(await habitaciones(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await clic(page, 0, 0);
  await clic(page, 1, 0);                                                  // largo 0: no se crea
  expect(await habitaciones(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await clic(page, 0, 0);
  await clic(page, 0.1, 0.2);                                              // 0.1 × 0.2: sí se crea (lados ≥ 0.1, área > 0.01)
  expect((await habitaciones(page)).map(x => [x.ancho, x.largo])).toEqual([[0.1, 0.2]]);
  await expect(overlay(page)).toHaveClass(/open/);
  expect(errores(reg)).toEqual([]);
});

// ── H4 · selección con V: handles y panel; exclusión mutua con los elementos de F4a; Supr ─────────────────
test('H4 · con V el clic selecciona la habitación: 4 handles y panel; deselecciona en vacío; no se mezcla con los elementos de F4a; Supr la borra', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await page.keyboard.press('p'); await clic(page, 3, -3);                // un punto de F4a
  await page.keyboard.press('v');
  await clic(page, 4.5, 4.5);                                              // vacío: nada seleccionado
  expect((await plano(page)).seleccionHab).toBeNull();
  expect((await plano(page)).seleccion).toBeNull();
  await expect(panel(page)).toBeHidden();                                  // sin H activa y sin selección el panel no estorba
  await expect(page.locator('#plano-svg [data-handle]')).toHaveCount(0);
  await clic(page, -1, -0.5);                                              // cuerpo de la habitación
  expect((await plano(page)).seleccionHab).toBe('h1');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('#plano-hab-nombre')).toHaveValue('Habitación 1');
  await expect(page.locator('#plano-hab-ancho')).toHaveValue('4');
  await expect(page.locator('#plano-hab-largo')).toHaveValue('3');
  await expect(page.locator('#plano-hab-area')).toHaveText('12.0 m²');
  await expect(page.locator('#plano-hab-perimetro')).toHaveText('14.0 m');
  await expect(page.locator('#plano-svg [data-handle]')).toHaveCount(4);
  expect(await page.locator('#plano-svg [data-handle]').evaluateAll(l => l.map(e => e.dataset.handle).sort())).toEqual(['ne', 'no', 'se', 'so']);
  await expect(page.locator('#plano-svg [data-hab-id="h1"]')).toHaveAttribute('data-sel', '1');
  await clic(page, 3, -3);                                                 // el punto de F4a: se selecciona él y se suelta la habitación
  expect((await plano(page)).seleccion).not.toBeNull();
  expect((await plano(page)).seleccionHab).toBeNull();
  await expect(page.locator('#plano-svg [data-handle]')).toHaveCount(0);
  await clic(page, -1, -0.5);                                              // y al revés
  expect((await plano(page)).seleccion).toBeNull();
  expect((await plano(page)).seleccionHab).toBe('h1');
  await page.keyboard.press('Delete');
  expect(await habitaciones(page)).toEqual([]);
  expect((await plano(page)).seleccionHab).toBeNull();
  expect((await plano(page)).trabajo.elementos).toHaveLength(1);           // el punto de F4a sigue ahí
  await crear(page, [-3, -2], [1, 1]);
  await page.keyboard.press('v'); await clic(page, -1, -0.5);
  await page.click('#plano-borrar');                                       // el botón Borrar de la barra también la borra
  expect(await habitaciones(page)).toEqual([]);
  await crear(page, [-3, -2], [1, 1]);
  await page.click('#plano-hab-borrar');                                   // y el botón del panel
  expect(await habitaciones(page)).toEqual([]);
  expect(errores(reg)).toEqual([]);
});

// ── H5 · handles: redimensionar desde la esquina opuesta ─────────────────────
test('H5 · arrastrar un handle redimensiona desde la esquina opuesta; se detiene en 0.1 m y no se invierte', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);                                     // x −3…1, z −2…1
  await page.keyboard.press('v');
  await arrastrar(page, [1, -2], [3, -3]);                                 // handle sureste → la esquina noroeste (−3, 1) queda fija
  let h = (await habitaciones(page))[0];
  expect([h.x, h.z, h.ancho, h.largo]).toEqual([-3, -3, 6, 4]);
  await arrastrar(page, [-3, 1], [-2, 0]);                                 // handle noroeste → queda fija la sureste (3, −3)
  h = (await habitaciones(page))[0];
  expect([h.x, h.z, h.ancho, h.largo]).toEqual([-2, -3, 5, 3]);
  await arrastrar(page, [3, 0], [4, 1]);                                   // handle noreste → queda fija la suroeste (−2, −3)
  h = (await habitaciones(page))[0];
  expect([h.x, h.z, h.ancho, h.largo]).toEqual([-2, -3, 6, 4]);
  await arrastrar(page, [-2, -3], [-1, -2]);                               // handle suroeste → queda fija la noreste (4, 1)
  h = (await habitaciones(page))[0];
  expect([h.x, h.z, h.ancho, h.largo]).toEqual([-1, -2, 5, 3]);
  expect(h.area).toBe(15);
  await arrastrar(page, [4, -2], [-5, 5]);                                 // handle sureste pasado al otro lado: se detiene en 0.1
  h = (await habitaciones(page))[0];
  expect(h.ancho).toBe(0.1);
  expect(h.largo).toBe(0.1);
  expect(h.x).toBe(-1);                                                    // la esquina fija noroeste sigue en (−1, 1)
  expect(h.z + h.largo).toBe(1);
  await expect(page.locator('#plano-svg [data-handle]')).toHaveCount(4);
  expect((await plano(page)).seleccionHab).toBe('h1');
  expect(errores(reg)).toEqual([]);
});

// ── H6 · mover el cuerpo ─────────────────────────────────────────────────────
test('H6 · arrastrar el cuerpo mueve la habitación y conserva sus dimensiones (con imán a la rejilla)', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await page.keyboard.press('v');
  await arrastrar(page, [-1, -0.5], [1, 1.5]);                             // +2 en x, +2 en z
  let h = (await habitaciones(page))[0];
  expect([h.x, h.z, h.ancho, h.largo]).toEqual([-1, 0, 4, 3]);
  await arrastrar(page, [1, 1.5], [0.6, 1.3]);                             // el imán lleva la esquina a un múltiplo del paso
  h = (await habitaciones(page))[0];
  expect(h.ancho).toBe(4);
  expect(h.largo).toBe(3);
  expect(Math.abs(h.x * 2 - Math.round(h.x * 2))).toBeLessThan(1e-6);
  expect(Math.abs(h.z * 2 - Math.round(h.z * 2))).toBeLessThan(1e-6);
  await page.locator('#plano-rejilla-visible').uncheck();                  // sin rejilla el movimiento es libre (sin imán)
  const antes = (await habitaciones(page))[0];
  await arrastrar(page, [antes.x + 1, antes.z + 1], [antes.x + 1.37, antes.z + 1.21]);
  h = (await habitaciones(page))[0];
  expect(h.x - antes.x).toBeGreaterThan(0.2);
  expect(Math.abs((h.x - antes.x) * 2 - Math.round((h.x - antes.x) * 2))).toBeGreaterThan(0.001);
  expect(errores(reg)).toEqual([]);
});

// ── H7 · panel: nombre ───────────────────────────────────────────────────────
test('H7 · el panel cambia el nombre (Enter o salir del campo); máximo 30 caracteres; vacío se restaura; el texto se escapa', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await fijar(page, '#plano-hab-nombre', 'Sala');
  expect((await habitaciones(page))[0].nombre).toBe('Sala');
  await expect(page.locator('#plano-svg [data-hab-nombre="h1"]')).toHaveText('Sala');
  await page.fill('#plano-hab-nombre', 'Cocina');                           // salir del campo (blur) también aplica
  await page.locator('#plano-hab-ancho').focus();
  expect((await habitaciones(page))[0].nombre).toBe('Cocina');
  await fijar(page, '#plano-hab-nombre', 'x'.repeat(45));
  expect((await habitaciones(page))[0].nombre).toBe('x'.repeat(30));
  await fijar(page, '#plano-hab-nombre', '   ');                           // vacío: se ignora y se restaura
  expect((await habitaciones(page))[0].nombre).toBe('x'.repeat(30));
  await expect(page.locator('#plano-hab-nombre')).toHaveValue('x'.repeat(30));
  await expect(page.locator('#plano-tip')).toContainText('no puede quedar vacío');
  await fijar(page, '#plano-hab-nombre', '<b onmouseover=x>Baño</b>');
  expect((await habitaciones(page))[0].nombre).toBe('<b onmouseover=x>Baño</b>');
  await expect(page.locator('#plano-svg [data-hab-nombre="h1"]')).toHaveText('<b onmouseover=x>Baño</b>');
  expect(await page.locator('#plano-svg b').count()).toBe(0);              // se muestra como texto, no como HTML
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  expect(errores(reg)).toEqual([]);
});

// ── H8 · panel: ancho y largo ────────────────────────────────────────────────
test('H8 · el panel cambia ancho y largo: la esquina mínima no se mueve y el área y el perímetro se recalculan', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await fijar(page, '#plano-hab-ancho', '5.5');
  let h = (await habitaciones(page))[0];
  expect([h.x, h.z, h.ancho, h.largo, h.area, h.perimetro]).toEqual([-3, -2, 5.5, 3, 16.5, 17]);
  expect(await page.locator('#plano-hab-area').getAttribute('data-valor')).toBe('16.5');
  expect(await page.locator('#plano-hab-perimetro').getAttribute('data-valor')).toBe('17');
  await expect(page.locator('#plano-hab-area')).toHaveText('16.5 m²');
  await fijar(page, '#plano-hab-largo', '0.1');
  h = (await habitaciones(page))[0];
  expect([h.ancho, h.largo, h.area, h.perimetro]).toEqual([5.5, 0.1, 0.55, 11.2]);
  await fijar(page, '#plano-hab-largo', '100');
  h = (await habitaciones(page))[0];
  expect(h.largo).toBe(100);
  await fijar(page, '#plano-hab-ancho', '2.345');                          // se redondea a milésimas
  expect((await habitaciones(page))[0].ancho).toBe(2.345);
  await expect(page.locator('#plano-svg [data-cota="h1-ancho"]')).toHaveText('2.3 m');
  expect(errores(reg)).toEqual([]);
});

// ── H9 · panel: valores inválidos ────────────────────────────────────────────
test('H9 · un valor inválido en el panel se ignora y se restaura el anterior (con aviso)', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  for (const malo of ['0', '-3', '150', '100.5', '0.05', '']) {
    await fijar(page, '#plano-hab-ancho', malo);
    const h = (await habitaciones(page))[0];
    expect([malo, h.ancho, h.largo, h.x, h.z]).toEqual([malo, 4, 3, -3, -2]);
    await expect(page.locator('#plano-hab-ancho')).toHaveValue('4');
    await expect(page.locator('#plano-tip')).toContainText('debe estar entre');
  }
  await fijar(page, '#plano-hab-largo', '-1');
  expect((await habitaciones(page))[0].largo).toBe(3);
  await expect(page.locator('#plano-hab-largo')).toHaveValue('3');
  await expect(page.locator('#plano-hab-area')).toHaveText('12.0 m²');
  expect(errores(reg)).toEqual([]);
});

// ── H10 · solape: aviso visual y colores (opción A) ──────────────────────────
test('H10 · dos habitaciones solapadas: borde ámbar y mensaje en el panel; selección celeste; los elementos de F4a siguen ámbar; no bloquea', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);                                     // h1: x −3…1, z −2…1
  await crear(page, [0, 0], [3, 2]);                                       // h2: se solapa con h1 (no bloquea la creación)
  await crear(page, [-5, 3], [-4, 4]);                                     // h3: lejos, sin solape
  expect(await habitaciones(page)).toHaveLength(3);
  expect((await plano(page)).solapes).toEqual({ h1: ['h2'], h2: ['h1'] });
  await expect(page.locator('#plano-svg [data-hab-id="h1"]')).toHaveAttribute('data-solape', '1');
  await expect(page.locator('#plano-svg [data-hab-id="h2"]')).toHaveAttribute('data-solape', '1');
  await expect(page.locator('#plano-svg [data-hab-id="h3"]')).not.toHaveAttribute('data-solape', '1');
  expect(await estiloHab(page, 'h1', '.hab-forma', 'stroke')).toBe('rgb(255, 194, 71)');    // ámbar
  expect(await estiloHab(page, 'h3', '.hab-forma', 'stroke')).not.toBe('rgb(255, 194, 71)');
  await page.keyboard.press('v');
  await clic(page, -2, -1.5);                                              // cuerpo de h1, fuera de h2
  expect((await plano(page)).seleccionHab).toBe('h1');
  await expect(page.locator('#plano-hab-solape')).toBeVisible();
  await expect(page.locator('#plano-hab-solape')).toHaveText('Se solapa con Habitación 2');
  expect(await estiloHab(page, 'h1', '.hab-halo', 'stroke')).toBe('rgb(127, 224, 255)');    // celeste
  expect(await page.locator('#plano-svg [data-handle]').first().evaluate(e => getComputedStyle(e).fill)).toBe('rgb(127, 224, 255)');
  expect(await estiloHab(page, 'h1', '.hab-forma', 'stroke')).toBe('rgb(255, 194, 71)');    // selección y solape se ven a la vez
  await clic(page, -4.5, 3.5);                                             // h3: sin solape, sin mensaje
  await expect(page.locator('#plano-hab-solape')).toBeHidden();
  // los elementos de F4a conservan su ámbar de selección
  await page.keyboard.press('p'); await clic(page, 3, -3);
  await page.keyboard.press('v'); await clic(page, 3, -3);
  expect((await plano(page)).seleccion).not.toBeNull();
  expect(await page.locator('#plano-svg .plano-el.sel .forma').first().evaluate(e => getComputedStyle(e).fill)).toBe('rgb(255, 183, 77)');
  // adosadas (solo comparten borde): sin aviso
  await crear(page, [-5, 1], [-3, 3]);                                     // h4 toca el borde z=1 de h1? h1 llega a z=1: solo borde
  expect((await plano(page)).solapes.h4).toBeUndefined();
  expect(errores(reg)).toEqual([]);
});

// ── H11 · el aviso desaparece al dejar de solapar ────────────────────────────
test('H11 · al mover una habitación fuera del solape el aviso desaparece, y también al redimensionarla', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await crear(page, [0, 0], [3, 2]);
  expect(Object.keys((await plano(page)).solapes).sort()).toEqual(['h1', 'h2']);
  await page.keyboard.press('v');
  await arrastrar(page, [2, 1.5], [6, 1.5]);                               // h2 +4 en x: x 4…7
  expect((await habitaciones(page)).find(h => h.id === 'h2').x).toBe(4);
  expect((await plano(page)).solapes).toEqual({});
  await expect(page.locator('#plano-svg [data-solape]')).toHaveCount(0);
  expect(await estiloHab(page, 'h1', '.hab-forma', 'stroke')).not.toBe('rgb(255, 194, 71)');
  await arrastrar(page, [4, 0], [-1, 0]);                                  // handle suroeste de h2 hacia h1: vuelven a solaparse
  expect(Object.keys((await plano(page)).solapes).sort()).toEqual(['h1', 'h2']);
  await clic(page, -2, -1.5);                                              // cuerpo de h1 (fuera de h2): se selecciona h1
  expect((await plano(page)).seleccionHab).toBe('h1');
  await fijar(page, '#plano-hab-ancho', '1');                              // h1 queda en x −3…−2: el panel también actualiza el aviso
  expect((await plano(page)).solapes).toEqual({});
  await fijar(page, '#plano-hab-ancho', '4');                              // vuelve a solaparse
  expect(Object.keys((await plano(page)).solapes).sort()).toEqual(['h1', 'h2']);
  await page.keyboard.press('Delete');                                     // borrar una de las dos también lo quita
  expect((await plano(page)).solapes).toEqual({});
  expect((await habitaciones(page)).map(h => h.id)).toEqual(['h2']);
  expect(errores(reg)).toEqual([]);
});

// ── H12 · plantillas ─────────────────────────────────────────────────────────
test('H12 · las tres plantillas crean habitaciones con nombres editables, centradas en el lote y sin solapes', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await page.selectOption('#plano-plantilla', 'minima');
  let h = await habitaciones(page);
  expect(h.map(x => [x.nombre, x.x, x.z, x.ancho, x.largo])).toEqual([['Habitación 1', -3, -2, 6, 4]]);
  expect(await page.locator('#plano-plantilla').inputValue()).toBe('');     // el selector vuelve a «Plantillas…»
  await expect(page.locator('#plano-svg .plano-hab')).toHaveCount(1);
  await page.selectOption('#plano-plantilla', 'dos');                       // ya hay habitaciones: pregunta
  await page.click('#plano-plantilla-reemplazar');
  h = await habitaciones(page);
  expect(h.map(x => [x.nombre, x.x, x.z, x.ancho, x.largo])).toEqual([['Sala', -4.5, -2, 5, 4], ['Dormitorio', 0.5, -2, 4, 4]]);
  expect((await plano(page)).solapes).toEqual({});                          // adosadas: solo comparten borde
  await page.selectOption('#plano-plantilla', 'tres');
  await page.click('#plano-plantilla-reemplazar');
  h = await habitaciones(page);
  expect(h.map(x => [x.nombre, x.x, x.z, x.ancho, x.largo])).toEqual([
    ['Sala', -4.5, -0.5, 5, 4], ['Cocina', -4.5, -3.5, 3, 3], ['Dormitorio', 0.5, -0.5, 4, 4]]);
  expect(h.map(x => x.id)).toEqual(['h1', 'h2', 'h3']);
  expect((await plano(page)).solapes).toEqual({});
  await page.keyboard.press('v');                                           // se modifican como cualquier habitación
  await clic(page, -3, 1);                                                  // cuerpo de la sala
  await fijar(page, '#plano-hab-nombre', 'Comedor');
  expect((await habitaciones(page)).find(x => x.id === 'h1').nombre).toBe('Comedor');
  expect(errores(reg)).toEqual([]);
});

// ── H13 · plantilla con habitaciones existentes ──────────────────────────────
test('H13 · con habitaciones ya dibujadas la plantilla pregunta Reemplazar / Añadir / Cancelar; Esc cancela y las teclas quedan inertes', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-5, 3], [-4, 4]);                                      // una habitación propia (h1)
  await page.selectOption('#plano-plantilla', 'minima');
  await expect(page.locator('#plano-plantilla-conf')).toBeVisible();
  await expect(page.locator('#plano-plantilla-txt')).toContainText('Casa mínima');
  expect((await plano(page)).plantillaPendiente).toBe('minima');
  expect(await habitaciones(page)).toHaveLength(1);                         // todavía no se aplicó nada
  await page.keyboard.press('p');                                           // con el diálogo abierto las teclas no cambian de herramienta
  expect((await plano(page)).herramienta).toBe('habitacion');
  await page.keyboard.press('Escape');                                      // Esc = Cancelar
  await expect(page.locator('#plano-plantilla-conf')).toBeHidden();
  expect((await plano(page)).plantillaPendiente).toBeNull();
  expect(await habitaciones(page)).toHaveLength(1);
  await expect(overlay(page)).toHaveClass(/open/);
  await page.selectOption('#plano-plantilla', 'minima');
  await page.click('#plano-plantilla-cancelar');                            // Cancelar
  expect(await habitaciones(page)).toHaveLength(1);
  await page.selectOption('#plano-plantilla', 'minima');
  await page.click('#plano-plantilla-anadir');                              // Añadir: conserva la propia y suma la plantilla
  let h = await habitaciones(page);
  expect(h.map(x => [x.id, x.nombre])).toEqual([['h1', 'Habitación 1'], ['h2', 'Habitación 1']]);
  expect(h[0]).toMatchObject({ x: -5, z: 3, ancho: 1, largo: 1 });
  expect(h[1]).toMatchObject({ x: -3, z: -2, ancho: 6, largo: 4 });
  await page.selectOption('#plano-plantilla', 'dos');
  await page.click('#plano-plantilla-reemplazar');                          // Reemplazar: solo quedan las de la plantilla
  h = await habitaciones(page);
  expect(h.map(x => x.nombre)).toEqual(['Sala', 'Dormitorio']);
  expect(errores(reg)).toEqual([]);
});

// ── H14 · plantilla que no cabe ──────────────────────────────────────────────
test('H14 · si el lote es más pequeño que la plantilla se avisa y no se aplica; si cabe justo se aplica', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await fijar(page, '#plano-lote-ancho', '5');
  await fijar(page, '#plano-lote-largo', '5');
  expect((await plano(page)).trabajo.lote).toEqual({ ancho: 5, largo: 5 });
  await page.selectOption('#plano-plantilla', 'minima');                    // necesita 6 × 4
  await expect(page.locator('#plano-tip')).toContainText('no cabe en el lote');
  await expect(page.locator('#plano-tip')).toContainText('6 × 4');
  expect(await habitaciones(page)).toEqual([]);
  await expect(page.locator('#plano-plantilla-conf')).toBeHidden();
  await fijar(page, '#plano-lote-ancho', '6');
  await fijar(page, '#plano-lote-largo', '4');
  await page.selectOption('#plano-plantilla', 'minima');                    // cabe justo
  expect((await habitaciones(page)).map(x => [x.x, x.z, x.ancho, x.largo])).toEqual([[-3, -2, 6, 4]]);
  await page.selectOption('#plano-plantilla', 'tres');                      // necesita 9 × 7 y ya hay habitaciones: avisa sin preguntar
  await expect(page.locator('#plano-tip')).toContainText('no cabe en el lote');
  await expect(page.locator('#plano-plantilla-conf')).toBeHidden();
  expect(await habitaciones(page)).toHaveLength(1);
  expect(errores(reg)).toEqual([]);
});

// ── H15 · guardar y recargar ─────────────────────────────────────────────────
test('H15 · guardar con habitaciones escribe progreso.plano.habitaciones y al recargar se conservan (nombre y medidas)', async ({ page, context }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await fijar(page, '#plano-hab-nombre', 'Sala');
  await crear(page, [2, 2], [4, 4]);
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  expect((await plano(page)).guardado).toBeNull();
  await page.click('#plano-guardar');
  await expect(page.locator('#plano-dirty')).toContainText('Guardado');
  const put = await ultimoPutConPlano(reg);
  expect(put.progreso.plano.habitaciones).toEqual([hab('h1', -3, -2, 4, 3, 'Sala'), hab('h2', 2, 2, 2, 2)]);
  expect(put.progreso.plano.elementos).toEqual([]);                         // campo separado de «elementos»
  expect(put.estado.progreso.plano).toEqual(put.progreso.plano);
  await page.click('#plano-cerrar');
  const copia = await context.newPage();
  await abrir(copia, { estado: put.estado, progreso: put.progreso });
  await abrirEditor(copia);
  const h = await habitaciones(copia);
  expect(h.map(x => [x.id, x.nombre, x.x, x.z, x.ancho, x.largo, x.area])).toEqual([['h1', 'Sala', -3, -2, 4, 3, 12], ['h2', 'Habitación 2', 2, 2, 2, 2, 4]]);
  await expect(copia.locator('#plano-svg .plano-hab')).toHaveCount(2);
  await expect(copia.locator('#plano-dirty')).toContainText('Guardado');   // recién cargado: sin cambios pendientes
  expect(errores(reg)).toEqual([]);
});

// ── H16 · compatibilidad: casas sin habitaciones ─────────────────────────────
test('H16 · una casa sin habitaciones (sin plano o con un plano de F4a) carga con [] y sin errores; al guardar gana habitaciones: []', async ({ page, context }) => {
  const vieja = leerCasa('sin_excavacion_antigua');
  const regA = await abrir(page, { estado: vieja.estado, progreso: vieja.progreso });
  await abrirEditor(page);
  expect(await habitaciones(page)).toEqual([]);
  await page.keyboard.press('Escape');
  expect(errores(regA)).toEqual([]);
  const f4a = casa([], { plano: planoCon({ elementos: [{ id: 1, tipo: 'punto', x: 1, z: 1 }], contador: 2 }) });
  expect('habitaciones' in f4a.progreso.plano).toBe(false);                 // exactamente como lo guardaba F4a
  const copia = await context.newPage();
  const regB = await abrir(copia, f4a);
  await abrirEditor(copia);
  const p = await plano(copia);
  expect(p.habitaciones).toEqual([]);
  expect(p.trabajo.elementos).toHaveLength(1);
  await expect(copia.locator('#plano-dirty')).toContainText('Guardado');
  await crear(copia, [-3, -2], [1, 1]);
  await copia.click('#plano-guardar');
  const put = await ultimoPutConPlano(regB);
  expect(put.progreso.plano.elementos).toHaveLength(1);
  expect(put.progreso.plano.habitaciones).toHaveLength(1);
  expect(errores(regB)).toEqual([]);
});

// ── H17 · sanearPlano con habitaciones corruptas ─────────────────────────────
test('H17 · un plano guardado con habitaciones corruptas no rompe la carga: lo inválido se descarta y lo válido se conserva', async ({ page, context }) => {
  const corruptas = [
    hab('h1', 0, 0, 3, 2, 'Sala'),
    { id: 'h2', tipo: 'punto', x: 0, z: 0, ancho: 1, largo: 1 },
    { id: 'h3', tipo: 'habitacion', x: 0, z: 0, ancho: -2, largo: 3 },
    { id: 'h4', tipo: 'habitacion', x: NaN, z: 0, ancho: 2, largo: 2 },
    { id: 'h1', tipo: 'habitacion', x: 4, z: 0, ancho: 2, largo: 2, nombre: '' },          // id repetido y nombre vacío
    null, 7, 'x', [], { tipo: 'habitacion' },
  ];
  const reg = await abrir(page, casa([], { plano: planoCon({ habitaciones: corruptas }) }));
  await abrirEditor(page);
  const h = await habitaciones(page);
  expect(h).toHaveLength(2);
  expect(h[0]).toMatchObject({ id: 'h1', nombre: 'Sala', ancho: 3, largo: 2 });
  expect(h[1].id).not.toBe('h1');                                           // el id repetido se reasignó
  expect(h[1].nombre).toBe(`Habitación ${h[1].id.slice(1)}`);
  await expect(page.locator('#plano-svg .plano-hab')).toHaveCount(2);
  await page.close();                                                       // una sola escena a la vez (sin GPU el simulador es lento)
  const otra = await context.newPage();
  const reg2 = await abrir(otra, casa([], { plano: planoCon({ habitaciones: 'esto no es una lista' }) }));
  await abrirEditor(otra);
  expect(await habitaciones(otra)).toEqual([]);
  await otra.close();
  const otra2 = await context.newPage();
  const reg3 = await abrir(otra2, casa([], { plano: planoCon({ habitaciones: { a: 1 }, lote: { ancho: 'x', largo: -1 } }) }));
  await abrirEditor(otra2);
  expect(await habitaciones(otra2)).toEqual([]);
  expect((await plano(otra2)).trabajo.lote).toEqual({ ancho: 10, largo: 10 });
  expect([...errores(reg), ...errores(reg2), ...errores(reg3)]).toEqual([]);
});

// ── H18 · máximo 50 ──────────────────────────────────────────────────────────
test('H18 · más de 50 habitaciones se trunca a 50 al cargar y la 51.ª no se crea (aviso)', async ({ page }) => {
  const muchas = Array.from({ length: 80 }, (_, i) => hab(`h${i + 1}`, -6 + (i % 10), -5 + Math.floor(i / 10) * 0.5, 0.8, 0.4));
  const reg = await abrir(page, casa([], { plano: planoCon({ habitaciones: muchas }) }));
  await abrirEditor(page);
  expect(await habitaciones(page)).toHaveLength(50);
  expect((await habitaciones(page)).at(-1).id).toBe('h50');
  await rejilla(page, 0.5);
  await crear(page, [4, 4], [5, 5]);
  expect(await habitaciones(page)).toHaveLength(50);
  await expect(page.locator('#plano-tip')).toContainText('Máximo 50 habitaciones');
  await page.keyboard.press('Escape');
  await page.keyboard.press('v');                                           // y borrar una libera un lugar
  await page.selectOption('#plano-plantilla', 'minima');                    // 50 + 1 > 50: la plantilla pregunta; Añadir no cabe
  await page.click('#plano-plantilla-anadir');
  expect(await habitaciones(page)).toHaveLength(50);
  await expect(page.locator('#plano-tip')).toContainText('Máximo 50 habitaciones');
  await page.selectOption('#plano-plantilla', 'minima');
  await page.click('#plano-plantilla-reemplazar');                          // Reemplazar sí cabe
  expect(await habitaciones(page)).toHaveLength(1);
  expect(errores(reg)).toEqual([]);
});

// ── H19 · guardado v2 intacto ────────────────────────────────────────────────
test('H19 · guardado v2: progreso.plano.habitaciones convive con el resto del progreso y del estado sin cambiarlos', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)]);
  const antes = await page.evaluate(() => window.__steamTest.snapshot());
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await page.click('#plano-guardar');
  const snap = await page.evaluate(() => window.__steamTest.snapshot());
  expect(snap.estado.v).toBe(2);
  expect(Object.keys(snap.estado).sort()).toEqual(['contador', 'hitos', 'objetos', 'progreso', 'terreno', 'v']);
  expect(snap.estado.terreno).toEqual({ excavacion: null });
  expect(snap.estado.objetos).toEqual(antes.estado.objetos);
  expect(snap.progreso.plano.v).toBe(1);                                    // la versión del plano no cambia (campo aditivo)
  expect(snap.progreso.plano.habitaciones).toHaveLength(1);
  expect(snap.progreso.plano).toMatchObject({ lote: { ancho: 10, largo: 10 }, rejilla: { visible: true, paso: 0.5 } });
  const { plano: _plano, ...sinPlano } = snap.progreso;
  const { plano: _plano0, ...sinPlano0 } = antes.progreso;
  expect(sinPlano).toEqual(sinPlano0);                                      // el resto del progreso, idéntico
  const put = await ultimoPutConPlano(reg);
  expect(put.estado.progreso.plano).toEqual(put.progreso.plano);
  expect(JSON.stringify(put.progreso.plano)).not.toMatch(/area|perimetro/); // el área y el perímetro NO se guardan
  expect(errores(reg)).toEqual([]);
});

// ── H20 · cámara 3D inmóvil ──────────────────────────────────────────────────
test('H20 · crear, mover, redimensionar y editar habitaciones no mueve la cámara 3D', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)]);
  const cam0 = await camara(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);
  await page.keyboard.press('v');
  await arrastrar(page, [-1, -0.5], [1, 1.5]);
  await arrastrar(page, [3, 0], [4, -1]);                                  // tras mover (+2, +2) el handle sureste está en (3, 0)
  expect((await plano(page)).seleccionHab).toBe('h1');
  await page.mouse.wheel(0, -300);
  await fijar(page, '#plano-hab-ancho', '3');
  await page.selectOption('#plano-plantilla', 'minima');
  await page.click('#plano-plantilla-reemplazar');
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    await page.keyboard.down(k); await cuadros(page, 3); await page.keyboard.up(k);
  }
  await cuadros(page, 4);
  const cam1 = await camara(page);
  expect(sinCamara(cam1).alpha).toBeCloseTo(sinCamara(cam0).alpha, 6);
  expect(sinCamara(cam1).beta).toBeCloseTo(sinCamara(cam0).beta, 6);
  expect(sinCamara(cam1).radius).toBeCloseTo(sinCamara(cam0).radius, 6);
  expect(cam1.target).toEqual(cam0.target);
  expect(cam1.enMovimiento).toBe(false);
  expect(errores(reg)).toEqual([]);
});

// ── H21 · los atajos 3D no se disparan con el editor abierto ─────────────────
test('H21 · con el editor abierto (y una habitación seleccionada) A, Shift+A, Ctrl+Z, Q/E/R/F/T/G/X no actúan sobre la pieza 3D ni disparan telemetría', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)]);
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => page.evaluate(() => window.__steamTest.seleccionado()), { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.avisoColocacion())).estado?.estado ?? null, { timeout: 120_000, intervals: [300] }).toBe('apoyada');
  const rotAntes = (await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r;
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await crear(page, [-3, -2], [1, 1]);                                      // herramienta H activa y habitación seleccionada
  for (const tecla of ['Shift+A', 'a', 'Control+z', 'q', 'e', 'r', 'f', 't', 'g', 'x']) await page.keyboard.press(tecla);
  await cuadros(page, 6);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0, 3);                  // ni «Desapoyar» ni «Apoyar» actuaron
  expect((await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r).toEqual(rotAntes);
  expect(await page.locator('#desapoyar-deshacer').isHidden()).toBe(true);
  expect(await page.locator('#apoyar-deshacer').isHidden()).toBe(true);
  expect((await habitaciones(page))).toHaveLength(1);                        // ninguna de esas teclas tocó la habitación
  await expect(overlay(page)).toHaveClass(/open/);
  await page.waitForTimeout(12_000);                                          // un envío de telemetría por lotes
  expect(reg.telemetria.filter(e => ['apoyar_pieza', 'desapoyar_pieza', 'deshacer_apoyar', 'deshacer_desapoyar'].includes(e.tipo_evento))).toEqual([]);
  expect(errores(reg)).toEqual([]);
});

// ── H22 · el atajo H ─────────────────────────────────────────────────────────
test('H22 · el atajo H activa la herramienta Habitación sin chocar con V/P/L/B; con el editor cerrado o escribiendo en un campo no hace nada', async ({ page }) => {
  const reg = await abrir(page);
  await page.keyboard.press('h');                                           // editor cerrado: nada
  await expect(overlay(page)).toBeHidden();
  await abrirEditor(page);
  await rejilla(page, 0.5);
  const herr = async () => (await plano(page)).herramienta;
  expect(await herr()).toBe('select');
  await page.keyboard.press('h'); expect(await herr()).toBe('habitacion');
  await expect(page.locator('#plano-overlay [data-herr="habitacion"]')).toHaveAttribute('aria-pressed', 'true');
  for (const [tecla, esperada] of [['v', 'select'], ['p', 'punto'], ['l', 'linea'], ['b', 'rectangulo'], ['h', 'habitacion'], ['Shift+H', 'habitacion']]) {
    await page.keyboard.press(tecla);
    expect([tecla, await herr()]).toEqual([tecla, esperada]);
  }
  await page.keyboard.press('r');                                           // R sigue sin hacer nada en el editor
  expect(await herr()).toBe('habitacion');
  await expect(page.locator('#plano-tip')).toContainText('R rota en 3D');
  await crear(page, [-3, -2], [1, 1]);
  await page.keyboard.press('v');
  await page.locator('#plano-hab-nombre').focus();                          // escribir una «h» en un campo no cambia de herramienta
  await page.keyboard.type('hhh');
  expect(await herr()).toBe('select');
  await expect(page.locator('#plano-hab-nombre')).toHaveValue('Habitación 1hhh');
  await page.locator('#plano-lote-ancho').focus();
  await page.keyboard.press('h');
  expect(await herr()).toBe('select');
  await page.keyboard.press('Escape');                                      // sale del campo y Esc de nuevo cierra con aviso de cambios
  await page.locator('#plano-overlay').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#plano-confirma')).toBeVisible();
  await page.keyboard.press('h');                                           // con la confirmación abierta tampoco cambia de herramienta
  expect(await herr()).toBe('select');
  expect(errores(reg)).toEqual([]);
});
