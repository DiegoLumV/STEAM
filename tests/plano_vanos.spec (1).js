// F4c · Vanos (puertas y ventanas) en el editor 2D del plano: herramientas D (puerta) y N (ventana) con un clic sobre una pared de la
// habitación seleccionada, selección con V, panel (tipo / ancho / alto / offset / lado), arrastre a lo largo de la pared, avisos
// (fuera de pared en rojo, solape en ámbar; no bloquean), borrado (vano sin confirmar; habitación con vanos con «Borrar / Cancelar»),
// topes (20 por habitación y 200 por plano), guardado aditivo en progreso.plano.habitaciones[].vanos y aislamiento del 3D.
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Se usan los clics, teclas y rueda reales del alumno.
// El estado interno se lee con window.__steamTest.plano() (solo lectura: lista plana de vanos con su segmento y avisos calculados)
// y con el DOM del SVG. Los helpers se DUPLICAN desde plano_habitaciones.spec.js (F4a y F4b no se tocan). En un equipo sin GPU el
// simulador corre a ~1,5 FPS: las esperas son por condición. Colores: selección celeste, fuera de pared rojo, solape ámbar.
// El WebSocket de recarga en caliente de Vite (ws://localhost) es ruido del entorno y se filtra solo aquí.
//
// Orientación (ver docs/F4c_cierre.md): norte = pared de mayor z (arriba en el editor); en norte/sur el offset crece con +x desde el
// extremo oeste; en este/oeste crece con +z desde el extremo sur. Habitación de prueba h1: x −3…1, z −2…1 (norte/sur 4 m, este/oeste 3 m).
//
// Correspondencia con la autorización: V1–V27 (ver el título de cada prueba), V28 (tope global), V29 (texto de la plantilla) y C2 (Esc).
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
const hab = (id, x, z, ancho, largo, nombre = `Habitación ${id.slice(1)}`, vanos) =>
  ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre, ...(vanos ? { vanos } : {}) });
const planoCon = (extra = {}) => ({
  v: 1, lote: { ancho: 10, largo: 10 }, rejilla: { visible: false, paso: 0.5 }, elementos: [], contador: 1, ...extra,
});
const PUERTA = { id: 'v1', tipo: 'puerta', lado: 'norte', offset: 1.5, ancho: 0.8, alto: 2.1 };
const VENTANA = { id: 'v2', tipo: 'ventana', lado: 'este', offset: 1, ancho: 1, alto: 1.2 };
const H1 = hab('h1', -3, -2, 4, 3, 'Sala');
const H1V = hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA]);

const plano = page => page.evaluate(() => window.__steamTest.plano());
const habitaciones = async page => (await plano(page)).habitaciones;
const vanos = async page => (await plano(page)).vanos;
const camara = page => page.evaluate(() => window.__steamTest.camara());
const limites = (page, id) => page.evaluate(i => window.__steamTest.limitesObjeto(i), id);
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const overlay = page => page.locator('#plano-overlay');
const pantalla = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.planoAPantalla(a, b), [x, z]);
const errores = reg => reg.errores.filter(e => !/WebSocket connection to 'ws:\/\/localhost/.test(e));
const vanoDom = (page, id) => page.locator(`#plano-svg .plano-vano[data-vano-id="${id}"]`);
const estiloVano = (page, id, selector, prop) => vanoDom(page, id).locator(selector).evaluate((el, p) => getComputedStyle(el)[p], prop);
const centro = v => [(v.x1 + v.x2) / 2, (v.z1 + v.z2) / 2];
const herr = async page => (await plano(page)).herramienta;
const sinCamara = c => ({ alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target });

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
async function fijar(page, selector, valor) {
  await page.fill(selector, valor);
  await page.press(selector, 'Enter');
}
async function ultimoPutConPlano(reg) {
  await expect.poll(() => reg.puts.filter(p => p.progreso?.plano).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  return reg.puts.filter(p => p.progreso?.plano).at(-1);
}
/** Casa con un plano de F4b precargado y el editor abierto con rejilla de 0.5 m. */
async function conHabitaciones(page, habs = [H1]) {
  const reg = await abrir(page, casa([], { plano: planoCon({ habitaciones: habs }) }));
  await abrirEditor(page);
  await rejilla(page, 0.5);
  return reg;
}
/** Selecciona h1 con V haciendo clic en su interior. */
async function selH1(page) {
  await page.keyboard.press('v');
  await clic(page, -1, -0.5);
  expect((await plano(page)).seleccionHab).toBe('h1');
}
/** h1 seleccionada y puerta norte creada con la herramienta D en (−1, 1): offset 1.5. */
async function conPuerta(page) {
  await selH1(page);
  await page.keyboard.press('d');
  await clic(page, -1, 1);
  await expect.poll(async () => (await vanos(page)).length).toBe(1);
}

// ── V1 · herramienta D ───────────────────────────────────────────────────────
test('V1 · la herramienta D crea una puerta (0.80 × 2.10) sobre la pared de la habitación seleccionada; queda seleccionada y la herramienta sigue activa', async ({ page }) => {
  const reg = await conHabitaciones(page);
  await selH1(page);
  const boton = page.locator('#plano-overlay [data-herr="puerta"]');
  await expect(boton).toBeVisible();
  await boton.click();
  expect(await herr(page)).toBe('puerta');
  await expect(boton).toHaveAttribute('aria-pressed', 'true');
  await clic(page, -1, 1);                                                  // pared norte: offset desde el extremo oeste, con imán a 0.5 m
  const v = await vanos(page);
  expect(v).toHaveLength(1);
  expect(v[0]).toMatchObject({ hab: 'h1', id: 'v1', tipo: 'puerta', lado: 'norte', offset: 1.5, ancho: 0.8, alto: 2.1, fuera: false, solapa: [] });
  expect(v[0].x1).toBeCloseTo(-1.5, 3); expect(v[0].x2).toBeCloseTo(-0.7, 3);
  expect(v[0].z1).toBeCloseTo(1, 3); expect(v[0].z2).toBeCloseTo(1, 3);
  expect((await plano(page)).seleccionVano).toEqual({ hab: 'h1', id: 'v1' });
  expect(await herr(page)).toBe('puerta');                                  // D5: la herramienta sigue activa
  await expect(vanoDom(page, 'v1')).toHaveAttribute('data-sel', '1');
  await expect(vanoDom(page, 'v1')).toHaveAttribute('data-vano-tipo', 'puerta');
  expect(await estiloVano(page, 'v1', '.vano-color', 'stroke')).toBe('rgb(176, 122, 74)');   // puerta marrón
  expect(await estiloVano(page, 'v1', '.vano-halo', 'stroke')).toBe('rgb(127, 224, 255)');   // selección celeste
  await expect(page.locator('#plano-svg [data-hab-id="h1"] .hab-forma')).toHaveAttribute('mask', 'url(#hm-h1)');   // hueco en la pared
  await expect(page.locator('#plano-svg mask#hm-h1 line')).toHaveCount(1);
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  expect((await habitaciones(page))[0].vanos).toEqual([{ id: 'v1', tipo: 'puerta', lado: 'norte', offset: 1.5, ancho: 0.8, alto: 2.1 }]);
  expect(errores(reg)).toEqual([]);
});

// ── V2 · herramienta N ───────────────────────────────────────────────────────
test('V2 · la herramienta N crea una ventana (1.00 × 1.20); el offset de las paredes este/oeste crece con +z desde el extremo sur', async ({ page }) => {
  const reg = await conHabitaciones(page);
  await selH1(page);
  const boton = page.locator('#plano-overlay [data-herr="ventana"]');
  await boton.click();
  expect(await herr(page)).toBe('ventana');
  await expect(boton).toHaveAttribute('aria-pressed', 'true');
  await clic(page, 1, -0.5);                                                // pared este (x = 1): z = −0.5 → centro a 1.5 m del sur
  const v = await vanos(page);
  expect(v).toHaveLength(1);
  expect(v[0]).toMatchObject({ hab: 'h1', id: 'v1', tipo: 'ventana', lado: 'este', offset: 1, ancho: 1, alto: 1.2 });
  expect(v[0].x1).toBeCloseTo(1, 3); expect(v[0].z1).toBeCloseTo(-1, 3); expect(v[0].z2).toBeCloseTo(0, 3);
  expect(await estiloVano(page, 'v1', '.vano-color', 'stroke')).toBe('rgb(143, 211, 255)');  // ventana azul claro
  await clic(page, -3, -1);                                                 // pared oeste (x = −3): otro lado, mismo origen (sur); centro a 1 m → inicio a 0.5
  const w = await vanos(page);
  expect(w).toHaveLength(2);
  expect(w[1]).toMatchObject({ id: 'v2', tipo: 'ventana', lado: 'oeste', offset: 0.5 });
  expect(w[1].z1).toBeCloseTo(-1.5, 3);
  expect(errores(reg)).toEqual([]);
});

// ── V3 · Esc cancela ─────────────────────────────────────────────────────────
test('V3 · con D, el cursor sobre la pared muestra el vano fantasma; Esc vuelve a V sin crear nada y conservando la habitación seleccionada; el 2.º Esc cierra', async ({ page }) => {
  const reg = await conHabitaciones(page);
  await selH1(page);
  await page.keyboard.press('d');
  const q = await pantalla(page, -1, 1);
  await page.mouse.move(q.x, q.y);
  await expect(page.locator('#plano-svg [data-vano-previa]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  expect(await herr(page)).toBe('select');
  await expect(page.locator('#plano-svg [data-vano-previa]')).toHaveCount(0);
  expect(await vanos(page)).toEqual([]);
  expect((await plano(page)).seleccionHab).toBe('h1');                      // D4: la selección se conserva
  await expect(overlay(page)).toHaveClass(/open/);
  await page.keyboard.press('Escape');                                      // 2.º Esc: cierra (sin cambios no pregunta)
  await expect(overlay(page)).not.toHaveClass(/open/);
  expect(errores(reg)).toEqual([]);
});

// ── V4 · sin habitación seleccionada ─────────────────────────────────────────
test('V4 · con D y ninguna habitación seleccionada, un clic sobre una pared avisa y no crea nada', async ({ page }) => {
  const reg = await conHabitaciones(page);
  await page.keyboard.press('d');
  await clic(page, -1, 1);
  await expect(page.locator('#plano-tip')).toContainText('Selecciona una habitación');
  expect(await vanos(page)).toEqual([]);
  expect(await herr(page)).toBe('puerta');
  expect(errores(reg)).toEqual([]);
});

// ── V5 · lejos de las paredes ────────────────────────────────────────────────
test('V5 · con D, un clic lejos de las paredes de la habitación seleccionada avisa y no crea nada', async ({ page }) => {
  const reg = await conHabitaciones(page);
  await selH1(page);
  await page.keyboard.press('d');
  await clic(page, -1, -0.5);                                               // el centro de la habitación
  await expect(page.locator('#plano-tip')).toContainText('Haz clic sobre una de las paredes');
  expect(await vanos(page)).toEqual([]);
  await clic(page, 3, 3);                                                   // fuera de la habitación
  expect(await vanos(page)).toEqual([]);
  expect(errores(reg)).toEqual([]);
});

// ── V6 · seleccionar con V y panel ───────────────────────────────────────────
test('V6 · con V el clic selecciona el vano y el panel muestra tipo, ancho, alto, offset y lado; un clic en vacío lo deselecciona', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  expect((await plano(page)).seleccionVano).toEqual({ hab: 'h1', id: 'v1' });
  expect((await plano(page)).seleccionHab).toBeNull();                       // la selección de vano es excluyente
  await expect(page.locator('#plano-panel')).toBeVisible();
  await expect(page.locator('#plano-panel-vano')).toBeVisible();
  await expect(page.locator('#plano-panel-campos')).toBeHidden();
  await expect(page.locator('#plano-vano-tipo')).toHaveValue('puerta');
  await expect(page.locator('#plano-vano-ancho')).toHaveValue('0.8');
  await expect(page.locator('#plano-vano-alto')).toHaveValue('2.1');
  await expect(page.locator('#plano-vano-offset')).toHaveValue('1.5');
  await expect(page.locator('#plano-vano-lado')).toHaveValue('norte');
  await expect(page.locator('#plano-vano-titulo')).toContainText('Puerta v1');
  await clic(page, 3, 3);
  expect((await plano(page)).seleccionVano).toBeNull();
  await expect(page.locator('#plano-panel')).toBeHidden();
  expect(errores(reg)).toEqual([]);
});

// ── V7 · cambiar ancho ───────────────────────────────────────────────────────
test('V7 · el panel cambia el ancho y el alto del vano y el dibujo se actualiza', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  await fijar(page, '#plano-vano-ancho', '1.2');
  let v = (await vanos(page))[0];
  expect(v).toMatchObject({ ancho: 1.2, offset: 1.5, alto: 2.1 });
  expect(v.x2 - v.x1).toBeCloseTo(1.2, 3);
  await fijar(page, '#plano-vano-alto', '2.4');
  v = (await vanos(page))[0];
  expect(v.alto).toBe(2.4);
  await page.selectOption('#plano-vano-tipo', 'ventana');                   // el tipo es un desplegable
  expect((await vanos(page))[0].tipo).toBe('ventana');
  await expect(vanoDom(page, 'v1')).toHaveAttribute('data-vano-tipo', 'ventana');
  expect(errores(reg)).toEqual([]);
});

// ── V8 · cambiar offset ──────────────────────────────────────────────────────
test('V8 · el panel cambia el offset y el vano se mueve a lo largo de la pared', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  await fijar(page, '#plano-vano-offset', '2');
  const v = (await vanos(page))[0];
  expect(v.offset).toBe(2);
  expect(v.x1).toBeCloseTo(-1, 3); expect(v.x2).toBeCloseTo(-0.2, 3);
  await fijar(page, '#plano-vano-offset', '0');
  expect((await vanos(page))[0].x1).toBeCloseTo(-3, 3);                      // origen oeste
  expect(errores(reg)).toEqual([]);
});

// ── V9 · cambiar lado ────────────────────────────────────────────────────────
test('V9 · el panel cambia el lado: el vano pasa a otra pared (con su propio origen) o se rechaza si no cabe', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  await page.selectOption('#plano-vano-lado', 'sur');
  let v = (await vanos(page))[0];
  expect(v).toMatchObject({ lado: 'sur', offset: 1.5 });
  expect(v.z1).toBeCloseTo(-2, 3);
  await page.selectOption('#plano-vano-lado', 'este');                      // 1.5 + 0.8 ≤ 3: cabe
  v = (await vanos(page))[0];
  expect(v).toMatchObject({ lado: 'este', offset: 1.5 });
  expect(v.x1).toBeCloseTo(1, 3); expect(v.z1).toBeCloseTo(-0.5, 3);
  await page.selectOption('#plano-vano-lado', 'norte');
  await fijar(page, '#plano-vano-offset', '3');                             // 3 + 0.8 ≤ 4 en la norte
  await page.selectOption('#plano-vano-lado', 'oeste');                     // 3 + 0.8 > 3: no cabe en la oeste
  expect((await vanos(page))[0].lado).toBe('norte');
  await expect(page.locator('#plano-vano-lado')).toHaveValue('norte');      // el desplegable se restaura
  await expect(page.locator('#plano-tip')).toContainText('No cabe');
  expect(errores(reg)).toEqual([]);
});

// ── V10 · valores inválidos ──────────────────────────────────────────────────
test('V10 · un valor inválido o que no cabe en la pared se ignora y se restaura el anterior (con aviso)', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  await fijar(page, '#plano-vano-offset', '3.5');                           // 3.5 + 0.8 > 4
  expect((await vanos(page))[0].offset).toBe(1.5);
  await expect(page.locator('#plano-vano-offset')).toHaveValue('1.5');
  await expect(page.locator('#plano-tip')).toContainText('No cabe');
  await fijar(page, '#plano-vano-ancho', '5');                              // más ancho que la pared
  expect((await vanos(page))[0].ancho).toBe(0.8);
  await fijar(page, '#plano-vano-ancho', '0');                              // fuera de rango
  expect((await vanos(page))[0].ancho).toBe(0.8);
  await fijar(page, '#plano-vano-alto', '11');                              // > 10 m
  expect((await vanos(page))[0].alto).toBe(2.1);
  await fijar(page, '#plano-vano-alto', '');                                // vacío
  expect((await vanos(page))[0].alto).toBe(2.1);
  await expect(page.locator('#plano-vano-alto')).toHaveValue('2.1');
  await fijar(page, '#plano-vano-offset', '-1');
  expect((await vanos(page))[0].offset).toBe(1.5);
  expect(errores(reg)).toEqual([]);
});

// ── V11 · arrastrar a lo largo de la pared ───────────────────────────────────
test('V11 · arrastrar el vano con V cambia solo su offset (con imán a la rejilla) y se detiene en los extremos de la pared', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await page.keyboard.press('v');
  let [cx, cz] = centro((await vanos(page))[0]);
  await arrastrar(page, [cx, cz], [cx + 1.5, cz]);
  let v = (await vanos(page))[0];
  expect(v).toMatchObject({ offset: 3, lado: 'norte', ancho: 0.8 });
  expect((await plano(page)).seleccionVano).toEqual({ hab: 'h1', id: 'v1' });
  [cx, cz] = centro(v);
  await arrastrar(page, [cx, cz], [3, cz]);                                  // más allá del extremo este de la pared
  v = (await vanos(page))[0];
  expect(v.offset).toBeCloseTo(3.2, 3);                                      // largo 4 − ancho 0.8
  await arrastrar(page, centro(v), [-5, 1.1]);                               // y más allá del extremo oeste
  expect((await vanos(page))[0].offset).toBe(0);
  expect((await habitaciones(page))[0]).toMatchObject({ x: -3, z: -2, ancho: 4, largo: 3 });   // la habitación no se movió
  expect(errores(reg)).toEqual([]);
});

// ── V12 · Supr ───────────────────────────────────────────────────────────────
test('V12 · Supr borra el vano seleccionado sin confirmación; la habitación se queda sin la clave «vanos»', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  await expect(page.locator('#plano-borrar')).toBeEnabled();
  await page.keyboard.press('Delete');
  expect(await vanos(page)).toEqual([]);
  expect((await plano(page)).seleccionVano).toBeNull();
  expect((await plano(page)).borrarPendiente).toBeNull();
  await expect(page.locator('#plano-vano-conf')).toBeHidden();
  const h = (await habitaciones(page))[0];
  expect('vanos' in h).toBe(false);
  await expect(page.locator('#plano-svg .plano-vano')).toHaveCount(0);
  await expect(page.locator('#plano-svg [data-hab-id="h1"] .hab-forma')).not.toHaveAttribute('mask', /./);
  expect(errores(reg)).toEqual([]);
});

// ── V13 · mover la habitación ────────────────────────────────────────────────
test('V13 · al mover la habitación sus vanos se mueven con ella y conservan lado y offset', async ({ page }) => {
  const reg = await conHabitaciones(page, [hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA, VENTANA])]);
  await page.keyboard.press('v');
  await arrastrar(page, [-1, -0.5], [1, 1.5]);                              // (+2, +2)
  expect((await habitaciones(page))[0]).toMatchObject({ x: -1, z: 0 });
  const v = await vanos(page);
  expect(v).toHaveLength(2);
  expect(v[0]).toMatchObject({ id: 'v1', lado: 'norte', offset: 1.5 });
  expect(v[0].x1).toBeCloseTo(0.5, 3); expect(v[0].z1).toBeCloseTo(3, 3);
  expect(v[1]).toMatchObject({ id: 'v2', lado: 'este', offset: 1 });
  expect(v[1].x1).toBeCloseTo(3, 3); expect(v[1].z1).toBeCloseTo(1, 3);
  expect(errores(reg)).toEqual([]);
});

// ── V14 · redimensionar con espacio ──────────────────────────────────────────
test('V14 · al redimensionar la habitación con un handle los vanos que siguen cabiendo se conservan sin aviso', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  await arrastrar(page, [1, 1], [3, 1]);                                     // handle noreste: ancho 4 → 6
  expect((await habitaciones(page))[0]).toMatchObject({ ancho: 6, largo: 3 });
  const v = (await vanos(page))[0];
  expect(v).toMatchObject({ id: 'v1', offset: 1.5, fuera: false });
  await expect(vanoDom(page, 'v1')).not.toHaveAttribute('data-fuera', /./);
  await expect(page.locator('#plano-hab-vanos')).toBeHidden();
  expect(errores(reg)).toEqual([]);
});

// ── V15 · redimensionar sin espacio ──────────────────────────────────────────
test('V15 · si la habitación se reduce y el vano ya no cabe, no se borra: borde rojo y aviso; al volver a ensancharla el aviso desaparece', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  await selH1(page);
  await fijar(page, '#plano-hab-ancho', '1');                               // la pared norte pasa a medir 1 m
  const v = (await vanos(page))[0];
  expect(v).toMatchObject({ id: 'v1', offset: 1.5, ancho: 0.8, fuera: true });
  await expect(vanoDom(page, 'v1')).toHaveAttribute('data-fuera', '1');
  expect(await estiloVano(page, 'v1', '.vano-aviso', 'stroke')).toBe('rgb(255, 138, 128)');   // rojo
  await expect(page.locator('#plano-hab-vanos')).toBeVisible();
  await expect(page.locator('#plano-hab-vanos')).toContainText('no cabe');
  const [cx, cz] = centro(v);
  await clic(page, cx, cz);                                                 // el vano sigue pudiendo seleccionarse
  await expect(page.locator('#plano-vano-aviso')).toContainText('Fuera de pared');
  await clic(page, -2.5, -0.5);                                             // la habitación ahora ocupa x −3…−2
  expect((await plano(page)).seleccionHab).toBe('h1');
  await fijar(page, '#plano-hab-ancho', '4');
  expect((await vanos(page))[0].fuera).toBe(false);
  await expect(vanoDom(page, 'v1')).not.toHaveAttribute('data-fuera', /./);
  await expect(page.locator('#plano-hab-vanos')).toBeHidden();
  expect(errores(reg)).toEqual([]);
});

// ── V16 · borrar habitación con vanos ────────────────────────────────────────
test('V16 · borrar una habitación con vanos pide confirmación («Borrar / Cancelar») y no borra nada hasta responder; las teclas quedan inertes', async ({ page }) => {
  const reg = await conHabitaciones(page, [hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA, VENTANA])]);
  await selH1(page);
  await page.keyboard.press('Delete');
  expect((await plano(page)).borrarPendiente).toBe('h1');
  await expect(page.locator('#plano-vano-conf')).toBeVisible();
  await expect(page.locator('#plano-vano-conf-txt')).toHaveText('Esta habitación tiene 2 vanos. ¿Borrar también?');
  expect(await habitaciones(page)).toHaveLength(1);
  expect(await vanos(page)).toHaveLength(2);
  await page.keyboard.press('h');                                           // con el diálogo abierto las teclas no hacen nada
  await page.keyboard.press('Delete');
  expect(await herr(page)).toBe('select');
  expect(await habitaciones(page)).toHaveLength(1);
  await expect(page.locator('#plano-vano-conf-borrar')).toBeVisible();
  await expect(page.locator('#plano-vano-conf-cancelar')).toBeVisible();
  expect(errores(reg)).toEqual([]);
});

// ── V17 · confirmar ──────────────────────────────────────────────────────────
test('V17 · «Borrar» elimina la habitación y todos sus vanos', async ({ page }) => {
  const reg = await conHabitaciones(page, [hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA, VENTANA]), hab('h2', 2, 2, 2, 2)]);
  await selH1(page);
  await page.click('#plano-hab-borrar');                                    // el botón del panel también pasa por la confirmación
  await expect(page.locator('#plano-vano-conf')).toBeVisible();
  await page.click('#plano-vano-conf-borrar');
  await expect(page.locator('#plano-vano-conf')).toBeHidden();
  expect((await habitaciones(page)).map(h => h.id)).toEqual(['h2']);
  expect(await vanos(page)).toEqual([]);
  await expect(page.locator('#plano-svg .plano-vano')).toHaveCount(0);
  expect((await plano(page)).seleccionHab).toBeNull();
  expect((await plano(page)).borrarPendiente).toBeNull();
  expect(errores(reg)).toEqual([]);
});

// ── V18 · cancelar ───────────────────────────────────────────────────────────
test('V18 · «Cancelar» (o Esc) no borra nada: la habitación y sus vanos siguen y la habitación sigue seleccionada', async ({ page }) => {
  const reg = await conHabitaciones(page, [hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA])]);
  await selH1(page);
  await page.keyboard.press('Delete');
  await expect(page.locator('#plano-vano-conf-txt')).toHaveText('Esta habitación tiene 1 vano. ¿Borrar también?');
  await page.click('#plano-vano-conf-cancelar');
  await expect(page.locator('#plano-vano-conf')).toBeHidden();
  expect(await habitaciones(page)).toHaveLength(1);
  expect(await vanos(page)).toHaveLength(1);
  expect((await plano(page)).seleccionHab).toBe('h1');
  await page.keyboard.press('Delete');
  await expect(page.locator('#plano-vano-conf')).toBeVisible();
  await page.keyboard.press('Escape');                                      // Esc cancela el diálogo (no cierra el editor)
  await expect(page.locator('#plano-vano-conf')).toBeHidden();
  await expect(overlay(page)).toHaveClass(/open/);
  expect(await habitaciones(page)).toHaveLength(1);
  expect(await vanos(page)).toHaveLength(1);
  expect((await plano(page)).borrarPendiente).toBeNull();
  expect(errores(reg)).toEqual([]);
});

// ── V19 · guardar y recargar ─────────────────────────────────────────────────
test('V19 · guardar con vanos escribe progreso.plano.habitaciones[].vanos y al recargar se conservan', async ({ page, context }) => {
  const reg = await conHabitaciones(page);
  await conPuerta(page);
  await page.keyboard.press('n');
  await clic(page, 1, -0.5);
  await expect.poll(async () => (await vanos(page)).length).toBe(2);
  await page.click('#plano-guardar');
  await expect(page.locator('#plano-dirty')).toContainText('Guardado');
  const put = await ultimoPutConPlano(reg);
  expect(put.progreso.plano.habitaciones).toEqual([hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA, VENTANA])]);
  expect(put.estado.progreso.plano).toEqual(put.progreso.plano);
  expect(JSON.stringify(put.progreso.plano)).not.toMatch(/fuera|solapa|area|perimetro/);   // los avisos y los cálculos no se guardan
  await page.click('#plano-cerrar');
  const copia = await context.newPage();
  const regCopia = await abrir(copia, { estado: put.estado, progreso: put.progreso });
  await abrirEditor(copia);
  const v = await vanos(copia);
  expect(v.map(x => [x.hab, x.id, x.tipo, x.lado, x.offset, x.ancho, x.alto])).toEqual([
    ['h1', 'v1', 'puerta', 'norte', 1.5, 0.8, 2.1], ['h1', 'v2', 'ventana', 'este', 1, 1, 1.2]]);
  await expect(copia.locator('#plano-svg .plano-vano')).toHaveCount(2);
  await expect(copia.locator('#plano-dirty')).toContainText('Guardado');
  expect(errores(reg)).toEqual([]);
  expect(errores(regCopia)).toEqual([]);
  await copia.close();
});

// ── V20 · casa de F4b sin vanos ──────────────────────────────────────────────
test('V20 · una casa de F4b (habitaciones sin vanos) carga con vanos = [] y al guardar no gana la clave «vanos»', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1, hab('h2', 2, 2, 2, 2)]);
  expect(await vanos(page)).toEqual([]);
  expect((await habitaciones(page)).every(h => !('vanos' in h))).toBe(true);
  await expect(page.locator('#plano-svg .plano-vano')).toHaveCount(0);
  await expect(page.locator('#plano-svg .hab-forma[mask]')).toHaveCount(0);
  await page.click('#plano-guardar');
  const put = await ultimoPutConPlano(reg);
  expect(put.progreso.plano.habitaciones).toEqual([H1, hab('h2', 2, 2, 2, 2)]);
  expect(Object.keys(put.progreso.plano.habitaciones[0]).sort()).toEqual(['ancho', 'id', 'largo', 'nombre', 'tipo', 'x', 'z']);
  expect(JSON.stringify(put.progreso.plano)).not.toMatch(/vanos/);
  expect(errores(reg)).toEqual([]);
});

// ── V21 · vanos corruptos ────────────────────────────────────────────────────
test('V21 · un plano guardado con vanos corruptos no rompe la carga: lo inválido se descarta, los ids repetidos se reasignan y lo válido se conserva', async ({ page, context }) => {
  const corruptos = [
    PUERTA, null, 5, 'x',
    { tipo: 'puerta2', lado: 'norte', offset: 0, ancho: 1, alto: 2 },
    { tipo: 'puerta', lado: 'arriba', offset: 0, ancho: 1, alto: 2 },
    { tipo: 'puerta', lado: 'sur', offset: -1, ancho: 1, alto: 2 },
    { tipo: 'ventana', lado: 'sur', offset: 0, ancho: 0, alto: 1 },
    { tipo: 'ventana', lado: 'sur', offset: 0, ancho: 1, alto: 11 },
    { tipo: 'ventana', lado: 'sur', offset: 'a', ancho: 1, alto: 1 },
    { id: 'v1', tipo: 'ventana', lado: 'este', offset: 0.5, ancho: 1, alto: 1.2, extra: 'x' },
  ];
  const reg = await abrir(page, casa([], { plano: planoCon({ habitaciones: [{ ...H1, vanos: corruptos }, { ...hab('h2', 2, 2, 2, 2), vanos: 'esto no es una lista' }] }) }));
  await abrirEditor(page);
  expect((await vanos(page)).map(v => [v.hab, v.id, v.tipo, v.lado, v.offset])).toEqual([['h1', 'v1', 'puerta', 'norte', 1.5], ['h1', 'v2', 'ventana', 'este', 0.5]]);
  expect((await habitaciones(page)).find(h => h.id === 'h2').vanos).toBeUndefined();
  expect((await habitaciones(page))[0].vanos.every(v => !('extra' in v))).toBe(true);
  const otra = await context.newPage();
  const reg2 = await abrir(otra, casa([], { plano: planoCon({ habitaciones: [{ ...H1, vanos: { a: 1 } }] }) }));
  await abrirEditor(otra);
  expect(await vanos(otra)).toEqual([]);
  expect((await habitaciones(otra))).toHaveLength(1);
  expect(errores(reg)).toEqual([]);
  expect(errores(reg2)).toEqual([]);
  await otra.close();
});

// ── V22 · máximo por habitación ──────────────────────────────────────────────
test('V22 · más de 20 vanos en una habitación se trunca a 20 al cargar y el 21.º no se crea (aviso)', async ({ page }) => {
  const muchos = Array.from({ length: 25 }, (_, i) => ({ id: `v${i + 1}`, tipo: 'ventana', lado: 'sur', offset: i * 0.1, ancho: 0.1, alto: 1 }));
  const reg = await conHabitaciones(page, [{ ...H1, vanos: muchos }]);
  const v = await vanos(page);
  expect(v).toHaveLength(20);
  expect(v[0].id).toBe('v1'); expect(v[19].id).toBe('v20');
  await selH1(page);
  await page.keyboard.press('n');
  await clic(page, -1, 1);                                                  // pared norte, libre
  await expect(page.locator('#plano-tip')).toContainText('Máximo 20 vanos por habitación');
  expect(await vanos(page)).toHaveLength(20);
  expect(errores(reg)).toEqual([]);
});

// ── V23 · guardado v2 ────────────────────────────────────────────────────────
test('V23 · guardado v2: los vanos viven solo dentro de progreso.plano.habitaciones y el resto del estado y del progreso no cambia', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)], { plano: planoCon({ habitaciones: [H1] }) });
  const antes = await page.evaluate(() => window.__steamTest.snapshot());
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await conPuerta(page);
  await page.click('#plano-guardar');
  const snap = await page.evaluate(() => window.__steamTest.snapshot());
  expect(snap.estado.v).toBe(2);
  expect(Object.keys(snap.estado).sort()).toEqual(['contador', 'hitos', 'objetos', 'progreso', 'terreno', 'v']);
  expect(snap.estado.objetos).toEqual(antes.estado.objetos);
  expect(snap.estado.terreno).toEqual({ excavacion: null });
  expect(snap.progreso.plano.v).toBe(1);                                    // la versión del plano no cambia
  expect(Object.keys(snap.progreso.plano.habitaciones[0]).sort()).toEqual(['ancho', 'id', 'largo', 'nombre', 'tipo', 'vanos', 'x', 'z']);
  expect(snap.progreso.plano.habitaciones[0].vanos).toEqual([{ id: 'v1', tipo: 'puerta', lado: 'norte', offset: 1.5, ancho: 0.8, alto: 2.1 }]);
  const { plano: _p, ...sinPlano } = snap.progreso;
  const { plano: _p0, ...sinPlano0 } = antes.progreso;
  expect(sinPlano).toEqual(sinPlano0);
  expect(Object.keys(snap.progreso.plano).sort()).toEqual(Object.keys(antes.progreso.plano).sort());   // ninguna clave nueva fuera de la habitación
  const put = await ultimoPutConPlano(reg);
  expect(put.estado.progreso.plano).toEqual(put.progreso.plano);
  expect(errores(reg)).toEqual([]);
});

// ── V24 · cámara 3D inmóvil ──────────────────────────────────────────────────
test('V24 · crear, mover, editar y borrar vanos no mueve la cámara 3D', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)], { plano: planoCon({ habitaciones: [H1] }) });
  const cam0 = await camara(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await conPuerta(page);
  await page.keyboard.press('n');
  await clic(page, 1, -0.5);
  await page.keyboard.press('v');
  await arrastrar(page, centro((await vanos(page))[0]), [0, 1]);
  await page.mouse.wheel(0, -300);
  await fijar(page, '#plano-vano-ancho', '1');
  await page.keyboard.press('Delete');
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

// ── V25 · los atajos 3D no se disparan ───────────────────────────────────────
test('V25 · con el editor abierto (y un vano seleccionado) A, Shift+A, Ctrl+Z, Q/E/R/F/T/G/X no actúan sobre la pieza 3D ni disparan telemetría', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)], { plano: planoCon({ habitaciones: [H1V] }) });
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => page.evaluate(() => window.__steamTest.seleccionado()), { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.avisoColocacion())).estado?.estado ?? null, { timeout: 120_000, intervals: [300] }).toBe('apoyada');
  const rotAntes = (await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r;
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('v');
  const [cx, cz] = centro((await vanos(page))[0]);
  await clic(page, cx, cz);
  expect((await plano(page)).seleccionVano).toEqual({ hab: 'h1', id: 'v1' });
  for (const tecla of ['Shift+A', 'a', 'Control+z', 'q', 'e', 'r', 'f', 't', 'g', 'x']) await page.keyboard.press(tecla);
  await cuadros(page, 6);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0, 3);
  expect((await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r).toEqual(rotAntes);
  expect(await page.locator('#desapoyar-deshacer').isHidden()).toBe(true);
  expect(await page.locator('#apoyar-deshacer').isHidden()).toBe(true);
  expect(await vanos(page)).toHaveLength(1);                                // ninguna de esas teclas tocó el vano
  await expect(overlay(page)).toHaveClass(/open/);
  await page.waitForTimeout(12_000);
  expect(reg.telemetria.filter(e => ['apoyar_pieza', 'desapoyar_pieza', 'deshacer_apoyar', 'deshacer_desapoyar'].includes(e.tipo_evento))).toEqual([]);
  expect(errores(reg)).toEqual([]);
});

// ── V26 · atajos D y N ───────────────────────────────────────────────────────
test('V26 · D y N activan Puerta y Ventana sin chocar con V/P/L/B/H; con el editor cerrado o escribiendo en un campo no hacen nada', async ({ page }) => {
  const reg = await abrir(page, casa([], { plano: planoCon({ habitaciones: [H1] }) }));
  await page.keyboard.press('d');                                           // editor cerrado: nada
  await page.keyboard.press('n');
  await expect(overlay(page)).toBeHidden();
  await abrirEditor(page);
  expect(await herr(page)).toBe('select');
  for (const [tecla, esperada] of [['d', 'puerta'], ['n', 'ventana'], ['v', 'select'], ['d', 'puerta'], ['p', 'punto'], ['n', 'ventana'],
    ['l', 'linea'], ['d', 'puerta'], ['b', 'rectangulo'], ['n', 'ventana'], ['h', 'habitacion'], ['Shift+D', 'puerta'], ['Shift+N', 'ventana']]) {
    await page.keyboard.press(tecla);
    expect([tecla, await herr(page)]).toEqual([tecla, esperada]);
  }
  await expect(page.locator('#plano-overlay [data-herr="ventana"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#plano-overlay [data-herr="puerta"]')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('v');
  await clic(page, -1, -0.5);
  await page.locator('#plano-hab-nombre').focus();                          // escribir «d» y «n» en un campo no cambia de herramienta
  await page.keyboard.type('dnDN');
  expect(await herr(page)).toBe('select');
  await page.keyboard.press('Enter');
  expect((await habitaciones(page))[0].nombre).toContain('dnDN');
  expect(await vanos(page)).toEqual([]);
  expect(errores(reg)).toEqual([]);
});

// ── V27 · solape ─────────────────────────────────────────────────────────────
test('V27 · dos vanos solapados en la misma pared: borde ámbar y aviso en el panel; no bloquea crear ni guardar', async ({ page }) => {
  const reg = await conHabitaciones(page);
  await conPuerta(page);
  await clic(page, -1, 1);                                                  // otra puerta exactamente encima (D sigue activa)
  const v = await vanos(page);
  expect(v).toHaveLength(2);                                                // se creó igualmente
  expect(v[0].solapa).toEqual(['v2']);
  expect(v[1].solapa).toEqual(['v1']);
  await expect(vanoDom(page, 'v1')).toHaveAttribute('data-solape', '1');
  await expect(vanoDom(page, 'v2')).toHaveAttribute('data-solape', '1');
  expect(await estiloVano(page, 'v1', '.vano-aviso', 'stroke')).toBe('rgb(255, 194, 71)');   // ámbar
  await expect(page.locator('#plano-vano-aviso')).toContainText('Se solapa con Puerta v1');
  await page.keyboard.press('v');
  await page.click('#plano-guardar');
  const put = await ultimoPutConPlano(reg);
  expect(put.progreso.plano.habitaciones[0].vanos).toHaveLength(2);
  await page.selectOption('#plano-vano-lado', 'sur');                       // al mover uno de pared el solape desaparece
  expect((await vanos(page)).every(x => x.solapa.length === 0)).toBe(true);
  await expect(vanoDom(page, 'v1')).not.toHaveAttribute('data-solape', /./);
  expect(errores(reg)).toEqual([]);
});

// ── V28 · tope global ────────────────────────────────────────────────────────
test('V28 · más de 200 vanos en el plano se trunca a 200 al cargar y el siguiente no se crea (aviso)', async ({ page }) => {
  const habs = Array.from({ length: 11 }, (_, i) => hab(`h${i + 1}`, -4.5 + (i % 5) * 2, -4 + Math.floor(i / 5) * 2, 1, 1, `H${i + 1}`,
    Array.from({ length: 20 }, (_, k) => ({ id: `v${k + 1}`, tipo: 'ventana', lado: 'sur', offset: 0, ancho: 0.1, alto: 1 }))));
  const reg = await conHabitaciones(page, habs);
  const v = await vanos(page);
  expect(v).toHaveLength(200);                                              // 10 habitaciones × 20; la 11.ª se queda sin vanos
  expect(v.filter(x => x.hab === 'h11')).toHaveLength(0);
  await page.keyboard.press('v');
  await clic(page, -4, 0.5);                                                // interior de h11 (x −4.5…−3.5, z 0…1)
  expect((await plano(page)).seleccionHab).toBe('h11');
  await page.keyboard.press('d');
  await clic(page, -4, 1);                                                  // su pared norte
  await expect(page.locator('#plano-tip')).toContainText('Máximo 200 vanos en el plano');
  expect(await vanos(page)).toHaveLength(200);
  expect(errores(reg)).toEqual([]);
});

// ── V29 · texto de la plantilla ──────────────────────────────────────────────
test('V29 · la plantilla «Reemplazar» avisa de cuántos vanos se borrarán (solo si los hay)', async ({ page }) => {
  const reg = await conHabitaciones(page, [hab('h1', -3, -2, 4, 3, 'Sala', [PUERTA, VENTANA])]);
  await page.selectOption('#plano-plantilla', 'minima');
  await expect(page.locator('#plano-plantilla-conf')).toBeVisible();
  const txt = page.locator('#plano-plantilla-txt');
  await expect(txt).toHaveText(/^Ya hay habitaciones en el plano\. ¿Qué hago con «.+»\? \(se borrarán también 2 vanos\)$/);
  await page.click('#plano-plantilla-cancelar');
  expect(await vanos(page)).toHaveLength(2);                                // cancelar no borra nada
  await page.selectOption('#plano-plantilla', 'minima');
  await page.click('#plano-plantilla-anadir');                              // añadir conserva los vanos
  expect((await vanos(page)).length).toBe(2);
  await page.selectOption('#plano-plantilla', 'minima');
  await page.click('#plano-plantilla-reemplazar');                          // reemplazar los elimina
  expect(await vanos(page)).toEqual([]);
  expect((await plano(page)).seleccionVano).toBeNull();
  await page.selectOption('#plano-plantilla', 'dos');                       // ahora hay habitaciones sin vanos: el texto no menciona vanos
  await expect(txt).not.toContainText('vano');
  await page.click('#plano-plantilla-cancelar');
  expect(errores(reg)).toEqual([]);
});

// ── C2 · Esc con D / N no afecta a las demás herramientas ────────────────────
test('C2 · Esc con D o N vuelve a V conservando la selección; con H, P, L, B y V se comporta como en F4a/F4b', async ({ page }) => {
  const reg = await conHabitaciones(page, [H1V]);
  const abierto = async () => (await plano(page)).abierto;
  // D y N: 1.er Esc → V (la selección del vano se conserva), 2.º Esc → cierra
  for (const [tecla, nombre] of [['d', 'puerta'], ['n', 'ventana']]) {
    await selH1(page);
    const [cx, cz] = centro((await vanos(page))[0]);
    await clic(page, cx, cz);
    await page.keyboard.press(tecla);
    expect(await herr(page)).toBe(nombre);
    await page.keyboard.press('Escape');
    expect(await herr(page)).toBe('select');
    expect((await plano(page)).seleccionVano).toEqual({ hab: 'h1', id: 'v1' });
    expect(await abierto()).toBe(true);
  }
  // H, L, B con el primer clic dado: el 1.er Esc solo cancela el dibujo; el 2.º cierra (F4a / F4b)
  for (const [tecla, nombre] of [['h', 'habitacion'], ['l', 'linea'], ['b', 'rectangulo']]) {
    await page.keyboard.press(tecla);
    expect(await herr(page)).toBe(nombre);
    await clic(page, 3, 3);
    expect((await plano(page)).inicio).not.toBeNull();
    await page.keyboard.press('Escape');
    expect((await plano(page)).inicio).toBeNull();
    expect(await herr(page)).toBe(nombre);                                  // la herramienta NO cambia a V
    expect(await abierto()).toBe(true);
  }
  // Con P y con V (y con H, L, B sin dibujo en curso) Esc cierra el editor de una vez
  for (const tecla of ['p', 'h', 'l', 'b', 'v']) {
    if (!(await abierto())) await abrirEditor(page);
    await page.keyboard.press(tecla);
    await page.keyboard.press('Escape');
    await expect.poll(abierto, { message: `Esc con ${tecla}` }).toBe(false);
  }
  expect(errores(reg)).toEqual([]);
});
