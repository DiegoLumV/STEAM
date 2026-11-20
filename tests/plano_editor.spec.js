// F4a · Editor 2D base del plano: overlay SVG con lote en metros, ejes, cotas, rejilla, zoom/pan, herramientas punto / línea /
// rectángulo, selección, movimiento, borrado, guardado aditivo en progreso.plano y aislamiento total del 3D (cámara y atajos).
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Se usan los clics, teclas y rueda reales del alumno.
// El estado interno se lee con window.__steamTest.plano() (solo lectura) y con el DOM del SVG. En un equipo sin GPU el simulador
// corre a ~1,5 FPS: las esperas son por condición. Decisión D5: el rectángulo es B; R queda reservada a la rotación 3D.
//
// Correspondencia con la autorización (P1–P20, C1–C5, D1–D6): ver el título de cada prueba y docs/F4a_cierre.md.
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
const EXCAVACION = { largo: 6, ancho: 4, profundidad: 1.5, volumen: 36, activa: true, tipo_suelo: 'tierra_vegetal', porcentaje_retiro: 100 };

const plano = page => page.evaluate(() => window.__steamTest.plano());
const elementos = async page => (await plano(page)).trabajo.elementos;
const camara = page => page.evaluate(() => window.__steamTest.camara());
const limites = (page, id) => page.evaluate(i => window.__steamTest.limitesObjeto(i), id);
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const overlay = page => page.locator('#plano-overlay');
const svg = page => page.locator('#plano-svg');
const pantalla = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.planoAPantalla(a, b), [x, z]);

async function abrir(page, opciones = {}) {
  const reg = await abrirSimulador(page, opciones);
  reg.telemetria = [];
  page.on('request', r => {
    if (!r.url().includes('/api/telemetria')) return;
    try { reg.telemetria.push(...(JSON.parse(r.postData() || '{}').eventos || [])); } catch (e) { /* no es JSON */ }
  });
  return reg;
}
/** Abre el simulador con piezas (para las pruebas que necesitan la escena 3D) y deja la cámara en una vista fija. */
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
/** Activa la rejilla (paso dado) para que los clics caigan en coordenadas exactas (D4: el imán va con la rejilla visible). */
async function rejilla(page, paso = 0.5) {
  const caja = page.locator('#plano-rejilla-visible');
  if (!(await caja.isChecked())) await caja.check();
  await page.selectOption('#plano-rejilla-paso', String(paso));
}
const herramienta = async page => (await plano(page)).herramienta;
async function ultimoPutConPlano(reg) {
  await expect.poll(() => reg.puts.filter(p => p.progreso?.plano).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  return reg.puts.filter(p => p.progreso?.plano).at(-1);
}
const sinCamara = c => ({ alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target });
const cercano = (a, b, tol = 0.03) => Math.abs(a - b) <= tol;

// ── P1 · botón siempre visible; abrir y cerrar el overlay (C4) ───────────────
test('P1 C4 · el botón «Plano» está siempre visible y habilitado; abre y cierra el overlay (sin cambios cierra directo)', async ({ page }) => {
  const reg = await abrir(page);
  const boton = page.locator('#btnPlano');
  await expect(boton).toBeVisible();
  await expect(boton).toBeEnabled();                                    // sin condiciones previas (ni excavación ni concreto)
  await expect(overlay(page)).toBeHidden();
  await boton.click();
  await expect(overlay(page)).toBeVisible();
  expect(await overlay(page).evaluate(el => getComputedStyle(el).zIndex)).toBe('60');
  expect(await page.evaluate(() => !!document.querySelector('[id$="-overlay"].open#plano-overlay'))).toBe(true); // F2.4c/d lo tratan como modal
  await expect(page.locator('#plano-confirma')).toBeHidden();
  await page.click('#plano-cerrar');
  await expect(overlay(page)).toBeHidden();                              // C5: sin cambios no pide confirmación
  await abrirEditor(page);
  await page.keyboard.press('Escape');
  await expect(overlay(page)).toBeHidden();
  expect(reg.errores).toEqual([]);
});

// ── P2 · lote 10×10 por defecto con cotas; editor vacío (C4) ─────────────────
test('P2 C4 · sin plano guardado el editor abre vacío con el lote 10×10 m y sus dimensiones en metros con un decimal', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  const p = await plano(page);
  expect(p.trabajo.lote).toEqual({ ancho: 10, largo: 10 });
  expect(p.trabajo.elementos).toEqual([]);
  expect(p.guardado).toBeNull();
  await expect(svg(page).locator('[data-cota="lote-ancho"]')).toHaveText('10.0 m');
  await expect(svg(page).locator('[data-cota="lote-largo"]')).toHaveText('10.0 m');
  const r = await svg(page).locator('rect[data-lote]').boundingBox();   // el lote cuadrado se ve cuadrado y centrado
  expect(Math.abs(r.width - r.height)).toBeLessThan(1);
  const s = await svg(page).boundingBox();
  expect(Math.abs((r.x + r.width / 2) - (s.x + s.width / 2))).toBeLessThan(1);
  expect(Math.abs((r.y + r.height / 2) - (s.y + s.height / 2))).toBeLessThan(1);
  await expect(svg(page).locator('[data-contorno]')).toHaveCount(0);    // sin excavación no se dibuja contorno
  // el lote es editable desde el propio editor y se rotula con un decimal
  await page.fill('#plano-lote-ancho', '14');
  await page.fill('#plano-lote-largo', '8.25');
  await page.locator('#plano-lote-largo').blur();
  await expect(svg(page).locator('[data-cota="lote-ancho"]')).toHaveText('14.0 m');
  await expect(svg(page).locator('[data-cota="lote-largo"]')).toHaveText('8.3 m');
  expect((await plano(page)).trabajo.lote).toEqual({ ancho: 14, largo: 8.25 });
  await page.fill('#plano-lote-ancho', '500');                           // fuera de rango: se rechaza y vuelve al valor anterior
  await page.locator('#plano-lote-ancho').blur();
  expect((await plano(page)).trabajo.lote).toEqual({ ancho: 14, largo: 8.25 });
  await expect(page.locator('#plano-lote-ancho')).toHaveValue('14');
  expect(reg.errores).toEqual([]);
});

// ── P3 · ejes X/Z, origen «0,0», norte arriba ────────────────────────────────
test('P3 · ejes X (este, a la derecha) y Z (norte, arriba) con flechas y el origen «0,0» en el centro del lote', async ({ page }) => {
  await abrir(page);
  await abrirEditor(page);
  const eje = n => svg(page).locator(`[data-eje="${n}"]`);
  await expect(eje('origen')).toHaveText('0,0');
  await expect(eje('x')).toContainText('X');
  await expect(eje('z')).toContainText('Z');
  expect(await svg(page).locator('[data-ejes] .plano-flecha').count()).toBe(2);
  const o = await pantalla(page, 0, 0), x = await eje('x').boundingBox(), z = await eje('z').boundingBox();
  expect(x.x).toBeGreaterThan(o.x + 40);                                // X a la derecha del origen
  expect(Math.abs((x.y + x.height / 2) - o.y)).toBeLessThan(12);        // y sobre la línea horizontal del origen
  expect(z.y).toBeLessThan(o.y - 40);                                   // Z arriba del origen (norte arriba)
  const norte = await pantalla(page, 0, 3), este = await pantalla(page, 3, 0);
  expect(norte.y).toBeLessThan(o.y);
  expect(este.x).toBeGreaterThan(o.x);
});

// ── P4 · rejilla: mostrar/ocultar y espaciado ─────────────────────────────────
test('P4 · la rejilla es opcional y admite 0.10 / 0.25 / 0.50 / 1.00 m; el paso cambia el número de líneas', async ({ page }) => {
  await abrir(page);
  await abrirEditor(page);
  await expect(svg(page).locator('[data-rejilla]')).toHaveCount(0);      // por defecto oculta
  expect(await page.locator('#plano-rejilla-paso').evaluate(el => [...el.options].map(o => o.value))).toEqual(['0.1', '0.25', '0.5', '1']);
  await expect(page.locator('#plano-rejilla-paso')).toBeDisabled();
  await page.locator('#plano-rejilla-visible').check();
  await expect(svg(page).locator('[data-rejilla]')).toHaveCount(1);
  const lineas = async () => (await svg(page).locator('[data-rejilla]').getAttribute('d')).split('M').length - 1;
  const esperadas = { 1: 22, 0.5: 42, 0.25: 82, 0.1: 202 };              // (lote 10 m: líneas verticales + horizontales)
  for (const paso of [1, 0.5, 0.25, 0.1]) {
    await page.selectOption('#plano-rejilla-paso', String(paso));
    expect((await plano(page)).rejilla.paso).toBe(paso);
    expect(await lineas()).toBe(esperadas[paso]);
  }
  // demasiado densa para dibujarla (0.10 m con zoom 0.5×): no se dibuja pero se avisa
  const c = await pantalla(page, 0, 0);
  await page.mouse.move(c.x, c.y);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 300);
  await expect.poll(async () => (await plano(page)).vista.zoom).toBe(0.5);
  await expect(svg(page).locator('[data-rejilla]')).toHaveCount(0);
  await expect(page.locator('#plano-rejilla-nota')).toBeVisible();
  await page.locator('#plano-rejilla-visible').uncheck();
  await expect(svg(page).locator('[data-rejilla]')).toHaveCount(0);
  await expect(page.locator('#plano-rejilla-nota')).toBeHidden();
});

// ── P5 · zoom con la rueda: límites 0.5×–10× y centrado en el cursor ─────────
test('P5 · zoom con la rueda entre 0.5× y 10×, centrado en el cursor (el punto bajo el cursor no se mueve)', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 2, -2);
  const antes = await pantalla(page, 2, -2);
  await page.mouse.move(antes.x, antes.y);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await plano(page)).vista.zoom).toBeGreaterThan(1.2);
  const despues = await pantalla(page, 2, -2);
  expect(Math.abs(despues.x - antes.x)).toBeLessThan(1.5);               // centrado en el cursor
  expect(Math.abs(despues.y - antes.y)).toBeLessThan(1.5);
  const lejos = { x: antes.x + 160, y: antes.y - 90 };                  // otro cursor, lejos del punto: el mundo bajo el cursor se conserva
  await page.mouse.move(lejos.x, lejos.y);
  const mundoAntes = await page.evaluate(([x, y]) => {
    const t = window.__steamTest; const o = t.planoAPantalla(0, 0), u = t.planoAPantalla(1, 1);
    return { x: (x - o.x) / (u.x - o.x), z: (y - o.y) / (u.y - o.y) };
  }, [lejos.x, lejos.y]);
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => (await plano(page)).vista.zoom).toBeLessThan(1.5);
  const mundoDespues = await page.evaluate(([x, y]) => {
    const t = window.__steamTest; const o = t.planoAPantalla(0, 0), u = t.planoAPantalla(1, 1);
    return { x: (x - o.x) / (u.x - o.x), z: (y - o.y) / (u.y - o.y) };
  }, [lejos.x, lejos.y]);
  expect(Math.abs(mundoDespues.x - mundoAntes.x)).toBeLessThan(0.03);
  expect(Math.abs(mundoDespues.z - mundoAntes.z)).toBeLessThan(0.03);
  // límites
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -500);
  await expect.poll(async () => (await plano(page)).vista.zoom).toBe(10);
  await expect(svg(page)).toHaveAttribute('data-zoom', '10');
  await expect(page.locator('#plano-zoom-val')).toHaveText('10.00×');
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 500);
  await expect.poll(async () => (await plano(page)).vista.zoom).toBe(0.5);
  await expect(page.locator('#plano-zoom-val')).toHaveText('0.50×');
  await page.click('#plano-encuadrar');                                 // Encuadrar vuelve a 1×
  expect((await plano(page)).vista).toEqual({ zoom: 1, cx: 0, cz: 0 });
  expect(reg.errores).toEqual([]);
});

// ── P6 · pan con botón central o Espacio + arrastrar; zoom/pan no se guardan ─
test('P6 · pan con el botón central y con Espacio + arrastrar; ni el pan ni el zoom se guardan al cerrar', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 1, 1);
  const base = await pantalla(page, 1, 1);
  await page.keyboard.press('v');
  await page.mouse.move(base.x + 200, base.y + 150);                    // en vacío
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(base.x + 260, base.y + 190, { steps: 4 });
  await page.mouse.up({ button: 'middle' });
  const tras1 = await pantalla(page, 1, 1);
  expect(Math.abs(tras1.x - (base.x + 60))).toBeLessThan(1.5);          // el plano se desplazó con el cursor
  expect(Math.abs(tras1.y - (base.y + 40))).toBeLessThan(1.5);
  await page.keyboard.down('Space');
  await page.mouse.move(base.x + 300, base.y + 300);
  await page.mouse.down();
  await page.mouse.move(base.x + 250, base.y + 270, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  const tras2 = await pantalla(page, 1, 1);
  expect(Math.abs(tras2.x - (tras1.x - 50))).toBeLessThan(1.5);
  expect(Math.abs(tras2.y - (tras1.y - 30))).toBeLessThan(1.5);
  const p = await plano(page);
  expect(p.trabajo.elementos).toHaveLength(1);                           // pan no dibuja ni selecciona nada
  expect(p.seleccion).toBeNull();
  await page.mouse.move(tras2.x, tras2.y);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => (await plano(page)).vista.zoom).toBeGreaterThan(1.2);
  await page.click('#plano-guardar');
  await page.click('#plano-cerrar');
  await abrirEditor(page);
  expect((await plano(page)).vista).toEqual({ zoom: 1, cx: 0, cz: 0 });  // la vista no se guarda
  expect(JSON.stringify((await plano(page)).guardado)).not.toMatch(/zoom|cx|vista/);
  expect(reg.errores).toEqual([]);
});

// ── P7 · punto ────────────────────────────────────────────────────────────────
test('P7 · herramienta punto: un clic crea el punto y se rotulan sus coordenadas', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 2, -3);
  await clic(page, -1.5, 4);
  const e = await elementos(page);
  expect(e.map(x => ({ tipo: x.tipo, x: x.x, z: x.z }))).toEqual([{ tipo: 'punto', x: 2, z: -3 }, { tipo: 'punto', x: -1.5, z: 4 }]);
  expect(e[0].id).not.toBe(e[1].id);
  await expect(svg(page).locator('.plano-el.punto')).toHaveCount(2);
  await expect(svg(page).locator(`[data-cota="${e[0].id}-0"]`)).toHaveText('2.00, -3.00');
  await expect(svg(page).locator(`[data-cota="${e[1].id}-0"]`)).toHaveText('-1.50, 4.00');
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  expect(reg.errores).toEqual([]);
});

// ── P8 · línea ────────────────────────────────────────────────────────────────
test('P8 · herramienta línea: dos clics crean la línea con su longitud en metros (un decimal); Esc cancela la línea en curso', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('l');
  await clic(page, 0, 0);
  expect((await plano(page)).inicio).toEqual({ x: 0, z: 0 });
  const medio = await pantalla(page, 2, 2);
  await page.mouse.move(medio.x, medio.y);
  await expect(svg(page).locator('.plano-el.fantasma')).toHaveCount(1);   // vista previa mientras se dibuja
  await expect(svg(page).locator('[data-cota="previa-0"]')).toHaveText('2.8 m');
  await page.keyboard.press('Escape');                                    // cancela la línea en curso (no cierra el editor)
  await expect(overlay(page)).toHaveClass(/open/);
  expect((await plano(page)).inicio).toBeNull();
  expect(await elementos(page)).toEqual([]);
  await clic(page, 0, 0);
  await clic(page, 0, 0);                                                 // longitud 0: se ignora
  expect(await elementos(page)).toEqual([]);
  await clic(page, 3, 4);
  const e = await elementos(page);
  expect(e).toHaveLength(1);
  expect(e[0]).toMatchObject({ tipo: 'linea', x1: 0, z1: 0, x2: 3, z2: 4 });
  await expect(svg(page).locator(`[data-cota="${e[0].id}-0"]`)).toHaveText('5.0 m');
  expect((await plano(page)).inicio).toBeNull();
  expect(reg.errores).toEqual([]);
});

// ── P9 · rectángulo (B) ───────────────────────────────────────────────────────
test('P9 D5 · herramienta rectángulo (B): dos esquinas en cualquier orden; se rotulan ancho y largo con un decimal', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('b');
  expect(await herramienta(page)).toBe('rectangulo');
  await clic(page, 3, 2);
  await clic(page, -1, -1.5);                                              // esquinas en orden inverso
  await clic(page, -4, -4);
  await clic(page, -4, 0);                                                 // ancho 0: se ignora y sigue esperando la esquina opuesta
  expect(await elementos(page)).toHaveLength(1);
  expect((await plano(page)).inicio).toEqual({ x: -4, z: -4 });
  await page.keyboard.press('Escape');
  const e = await elementos(page);
  expect(e[0]).toMatchObject({ tipo: 'rectangulo', x: -1, z: -1.5, ancho: 4, largo: 3.5 });
  await expect(svg(page).locator(`[data-cota="${e[0].id}-0"]`)).toHaveText('4.0 m');
  await expect(svg(page).locator(`[data-cota="${e[0].id}-1"]`)).toHaveText('3.5 m');
  const caja = await svg(page).locator('.plano-el.rect .forma').boundingBox();
  const a = await pantalla(page, -1, 2), b = await pantalla(page, 3, -1.5);   // coincide con las esquinas en pantalla
  expect(Math.abs(caja.x - a.x)).toBeLessThan(1.5);
  expect(Math.abs(caja.y - a.y)).toBeLessThan(1.5);
  expect(Math.abs(caja.width - (b.x - a.x))).toBeLessThan(3);             // (el cuadro incluye el grosor del trazo, 2 px)
  expect(Math.abs(caja.height - (b.y - a.y))).toBeLessThan(3);
  expect(reg.errores).toEqual([]);
});

// ── P10 · imán a la rejilla solo con rejilla visible (D4) ────────────────────
test('P10 D4 · el imán a la rejilla solo actúa con la rejilla visible, sin casilla extra', async ({ page }) => {
  await abrir(page);
  await abrirEditor(page);
  await page.keyboard.press('p');
  const p = await pantalla(page, 1.13, 2.62);
  await page.mouse.click(p.x, p.y);                                        // sin rejilla: posición libre
  let e = (await elementos(page))[0];
  expect(cercano(e.x, 1.13, 0.03) && cercano(e.z, 2.62, 0.03)).toBe(true);
  expect(Math.abs(e.x - 1.0) > 0.05 && Math.abs(e.z - 2.5) > 0.05).toBe(true);                        // no quedó ajustada a 0.50
  await page.locator('#plano-rejilla-visible').check();
  await page.selectOption('#plano-rejilla-paso', '0.5');
  const q = await pantalla(page, 1.13, 2.62);
  await page.mouse.click(q.x, q.y);                                        // con rejilla 0.50: (1.0, 2.5)
  e = (await elementos(page))[1];
  expect([e.x, e.z]).toEqual([1, 2.5]);
  await page.selectOption('#plano-rejilla-paso', '0.25');
  await page.mouse.click(q.x, q.y);                                        // con 0.25: (1.25, 2.5)
  e = (await elementos(page))[2];
  expect([e.x, e.z]).toEqual([1.25, 2.5]);
  await page.locator('#plano-rejilla-visible').uncheck();
  await page.mouse.click(q.x, q.y);                                        // otra vez libre
  e = (await elementos(page))[3];
  expect(cercano(e.x, 1.13, 0.03) && cercano(e.z, 2.62, 0.03)).toBe(true);
  expect(await page.locator('#plano-overlay input[type=checkbox]').count()).toBe(1); // la única casilla es «Rejilla»
});

// ── P11 · seleccionar y resaltar ──────────────────────────────────────────────
test('P11 · con la herramienta de selección (V) el clic elige y resalta el elemento; el clic en vacío deselecciona', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p'); await clic(page, 2, -3);
  await page.keyboard.press('l'); await clic(page, -4, 2); await clic(page, -1, 2);
  await page.keyboard.press('b'); await clic(page, 1, 1); await clic(page, 4, 3);
  await page.keyboard.press('v');
  const [pt, ln, rc] = await elementos(page);
  await expect(page.locator('#plano-borrar')).toBeDisabled();
  await clic(page, 2, -3);
  expect((await plano(page)).seleccion).toBe(pt.id);
  await expect(svg(page).locator(`[data-el-id="${pt.id}"]`)).toHaveAttribute('data-sel', '1');
  await expect(svg(page).locator('[data-sel]')).toHaveCount(1);
  expect(await svg(page).locator('[data-sel] .forma').evaluate(el => getComputedStyle(el).fill)).toBe('rgb(255, 183, 77)'); // resaltado
  await expect(page.locator('#plano-borrar')).toBeEnabled();
  await clic(page, -2.5, 2);                                               // sobre la línea
  expect((await plano(page)).seleccion).toBe(ln.id);
  await clic(page, 2.5, 3);                                                // sobre el borde superior del rectángulo
  expect((await plano(page)).seleccion).toBe(rc.id);
  await clic(page, 2.5, 2);                                                // dentro del rectángulo
  expect((await plano(page)).seleccion).toBe(rc.id);
  await clic(page, -4, -4);                                                // vacío
  expect((await plano(page)).seleccion).toBeNull();
  await expect(svg(page).locator('[data-sel]')).toHaveCount(0);
  expect(reg.errores).toEqual([]);
});

// ── P12 · mover ───────────────────────────────────────────────────────────────
test('P12 · arrastrar con la selección mueve el elemento (libre o con imán a la rejilla) y conserva sus dimensiones', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p'); await clic(page, 2, -3);
  await page.keyboard.press('l'); await clic(page, -4, 2); await clic(page, -1, 2);
  await page.keyboard.press('b'); await clic(page, 1, 1); await clic(page, 4, 3);
  await page.keyboard.press('v');
  const [pt, ln, rc] = await elementos(page);
  await arrastrar(page, [2, -3], [3, -2]);                                 // punto con imán
  let e = await elementos(page);
  expect([e[0].x, e[0].z]).toEqual([3, -2]);
  await arrastrar(page, [-2.5, 2], [-1.5, 3.5]);                           // línea: se mueve entera (+1, +1.5)
  e = await elementos(page);
  expect(e[1]).toMatchObject({ x1: -3, z1: 3.5, x2: 0, z2: 3.5 });
  await arrastrar(page, [2.5, 3], [3.5, 1]);                               // rectángulo por el borde (+1, −2)
  e = await elementos(page);
  expect(e[2]).toMatchObject({ x: 2, z: -1, ancho: 3, largo: 2 });
  expect(e.map(x => x.id)).toEqual([pt.id, ln.id, rc.id]);
  expect((await plano(page)).seleccion).toBe(rc.id);
  await page.locator('#plano-rejilla-visible').uncheck();                  // sin rejilla: desplazamiento libre
  const antes = (await elementos(page))[0];
  const a = await pantalla(page, antes.x, antes.z);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 30, a.y + 14, { steps: 4 });
  await page.mouse.up();
  const despues = (await elementos(page))[0];
  expect(despues.x).toBeGreaterThan(antes.x + 0.4);
  expect(despues.x % 0.5).not.toBe(0);
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  expect(reg.errores).toEqual([]);
});

// ── P13 · borrar con Supr ─────────────────────────────────────────────────────
test('P13 · Supr (y Retroceso y el botón) borran el elemento seleccionado; sin selección no hacen nada', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 1, 1); await clic(page, 2, 1); await clic(page, 3, 1); await clic(page, 4, 1);
  await page.keyboard.press('v');
  await page.keyboard.press('Delete');                                     // sin selección
  expect(await elementos(page)).toHaveLength(4);
  const ids = (await elementos(page)).map(e => e.id);
  await clic(page, 2, 1);
  await page.keyboard.press('Delete');
  expect((await elementos(page)).map(e => e.id)).toEqual([ids[0], ids[2], ids[3]]);
  expect((await plano(page)).seleccion).toBeNull();
  await clic(page, 3, 1);
  await page.keyboard.press('Backspace');
  expect((await elementos(page)).map(e => e.id)).toEqual([ids[0], ids[3]]);
  await clic(page, 4, 1);
  await page.click('#plano-borrar');
  expect((await elementos(page)).map(e => e.id)).toEqual([ids[0]]);
  await expect(svg(page).locator('[data-el-id]')).toHaveCount(1);
  expect(reg.errores).toEqual([]);
});

// ── P14 · guardar, JSON v2 y recarga ─────────────────────────────────────────
test('P14 · Guardar escribe progreso.plano de forma aditiva en el JSON v2 y al recargar se restaura (la vista no)', async ({ page, context }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.25);
  await page.keyboard.press('p'); await clic(page, 2, -3);
  await page.keyboard.press('l'); await clic(page, -4, 2); await clic(page, -1, 2.5);
  await page.keyboard.press('b'); await clic(page, 1, 1); await clic(page, 4, 3);
  expect((await plano(page)).guardado).toBeNull();
  await page.click('#plano-guardar');
  await expect(page.locator('#plano-dirty')).toContainText('Guardado');
  const g = (await plano(page)).guardado;
  expect(g.elementos).toHaveLength(3);
  const snap = await page.evaluate(() => window.__steamTest.snapshot());
  expect(snap.progreso.plano).toMatchObject({ v: 1, lote: { ancho: 10, largo: 10 }, rejilla: { visible: true, paso: 0.25 } });
  expect(snap.estado.v).toBe(2);                                          // el formato v2 no cambia
  expect(snap.estado.terreno).toEqual({ excavacion: null });
  expect(Object.keys(snap.estado).sort()).toEqual(['contador', 'hitos', 'objetos', 'progreso', 'terreno', 'v']);
  const put = await ultimoPutConPlano(reg);
  expect(put.progreso.plano.elementos).toHaveLength(3);
  expect(put.estado.progreso.plano).toEqual(put.progreso.plano);
  expect(put.estado.terreno).toEqual({ excavacion: null });
  expect(put.progreso.plano.elementos.map(e => e.tipo)).toEqual(['punto', 'linea', 'rectangulo']);
  await page.click('#plano-cerrar');
  const copia = await context.newPage();
  await abrir(copia, { estado: put.estado, progreso: put.progreso });
  await abrirEditor(copia);
  const p2 = await plano(copia);
  expect(p2.trabajo.elementos).toEqual(put.progreso.plano.elementos);
  expect(p2.trabajo.lote).toEqual({ ancho: 10, largo: 10 });
  expect(p2.rejilla).toEqual({ visible: true, paso: 0.25 });
  await expect(copia.locator('#plano-rejilla-visible')).toBeChecked();
  expect(p2.vista).toEqual({ zoom: 1, cx: 0, cz: 0 });
  await expect(copia.locator('#plano-svg .plano-el')).toHaveCount(3);
  expect(reg.errores).toEqual([]);
});

// ── P15 · casa antigua sin progreso.plano ────────────────────────────────────
test('P15 C4 · una casa sin progreso.plano abre el editor vacío (10×10) y no gana la clave hasta que el alumno guarda', async ({ page }) => {
  const casaVieja = leerCasa('sin_excavacion_antigua');
  expect(casaVieja.progreso.plano).toBeUndefined();
  const reg = await abrir(page, { estado: casaVieja.estado, progreso: casaVieja.progreso });
  const antes = await page.evaluate(() => window.__steamTest.snapshot());
  expect('plano' in antes.progreso).toBe(false);
  await abrirEditor(page);
  const p = await plano(page);
  expect(p.trabajo.lote).toEqual({ ancho: 10, largo: 10 });
  expect(p.trabajo.elementos).toEqual([]);
  await page.keyboard.press('Escape');                                    // abrir y cerrar sin tocar nada no cambia lo guardado
  const medio = await page.evaluate(() => window.__steamTest.snapshot());
  expect('plano' in medio.progreso).toBe(false);
  expect(medio.estado.objetos).toEqual(antes.estado.objetos);
  expect(medio.estado.terreno).toEqual(antes.estado.terreno);
  await abrirEditor(page);
  await page.click('#plano-guardar');
  const despues = await page.evaluate(() => window.__steamTest.snapshot());
  expect(despues.progreso.plano.elementos).toEqual([]);
  expect(despues.estado.objetos).toEqual(antes.estado.objetos);           // el resto del guardado queda idéntico
  expect(reg.errores).toEqual([]);
});

// ── P16 · cámara 3D congelada ────────────────────────────────────────────────
test('P16 · con el editor abierto la cámara 3D no se mueve: flechas, C, rueda, arrastres y botón central no llegan al 3D', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)]);
  const cam0 = await camara(page);
  await abrirEditor(page);
  const c = await pantalla(page, 0, 0);
  await page.mouse.move(c.x, c.y);
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    await page.keyboard.down(k);
    await cuadros(page, 3);
    await page.keyboard.up(k);
  }
  await page.keyboard.press('c');
  await page.mouse.wheel(0, -400);
  await page.mouse.wheel(0, 400);
  await page.keyboard.press('v');
  await arrastrar(page, [-3, -3], [3, 3], 'left');                         // arrastre izquierdo (orbitaría en 3D)
  await arrastrar(page, [-3, 3], [3, -3], 'middle');                       // arrastre central (desplazaría en 3D)
  await cuadros(page, 4);
  const cam1 = await camara(page);
  expect(sinCamara(cam1).alpha).toBeCloseTo(sinCamara(cam0).alpha, 6);
  expect(sinCamara(cam1).beta).toBeCloseTo(sinCamara(cam0).beta, 6);
  expect(sinCamara(cam1).radius).toBeCloseTo(sinCamara(cam0).radius, 6);
  expect(cam1.target).toEqual(cam0.target);
  expect(cam1.enMovimiento).toBe(false);
  await page.click('#plano-cerrar');                                      // y después de cerrar los controles 3D vuelven a funcionar
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => Math.abs((await camara(page)).alpha - cam0.alpha), { timeout: 60_000, intervals: [300] }).toBeGreaterThan(0.001);
  await page.keyboard.up('ArrowLeft');
  expect(reg.errores).toEqual([]);
});

// ── P17 · C1 · el 3D y F2.2/F2.4c/F2.4d no se disparan con el editor abierto ──
test('P17 · con el editor abierto A, Shift+A, Ctrl+Z, Q/E/R/F/T/G/X no actúan sobre la pieza 3D ni disparan telemetría', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)]);
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => page.evaluate(() => window.__steamTest.seleccionado()), { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.avisoColocacion())).estado?.estado ?? null, { timeout: 120_000, intervals: [300] }).toBe('apoyada');
  const rotAntes = (await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r;
  await abrirEditor(page);
  for (const tecla of ['Shift+A', 'a', 'Control+z', 'q', 'e', 'r', 'f', 't', 'g', 'x']) await page.keyboard.press(tecla); // Esc lo atiende el editor (P20)
  await cuadros(page, 6);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0, 3);                // ni «Desapoyar» ni «Apoyar» actuaron
  const rotDespues = (await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r;
  expect(rotDespues).toEqual(rotAntes);                                    // ninguna rotación 3D
  expect(await page.locator('#desapoyar-deshacer').isHidden()).toBe(true);
  expect(await page.locator('#apoyar-deshacer').isHidden()).toBe(true);
  await expect(overlay(page)).toHaveClass(/open/);
  await page.waitForTimeout(12_000);                                        // un envío de telemetría por lotes
  expect(reg.telemetria.filter(e => ['apoyar_pieza', 'desapoyar_pieza', 'deshacer_apoyar', 'deshacer_desapoyar'].includes(e.tipo_evento))).toEqual([]);
  expect(reg.errores).toEqual([]);
});

// ── P18 · C1 · con el editor CERRADO los atajos 3D funcionan igual que antes ─
test('P18 C1 · con el editor cerrado: Shift+A desapoya, A apoya, Ctrl+Z deshace y R sigue rotando en X (la compuerta no interfiere)', async ({ page }) => {
  const reg = await abrirConPiezas(page, [bloque(1, 0, 0, 0)]);
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => page.evaluate(() => window.__steamTest.seleccionado()), { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.avisoColocacion())).estado?.estado ?? null, { timeout: 120_000, intervals: [300] }).toBe('apoyada');
  const base = () => limites(page, 1).then(l => l.min.y);
  await abrirEditor(page);                                                  // abrir y cerrar el editor antes de probar los atajos
  await page.keyboard.press('Escape');
  await expect(overlay(page)).toBeHidden();
  await page.keyboard.press('Shift+A');                                     // F2.4d
  await expect.poll(base, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0.5, 3);
  await page.keyboard.press('a');                                           // F2.4c
  await expect.poll(base, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0, 3);
  await page.keyboard.press('Control+z');                                   // deshace el «Apoyar»
  await expect.poll(base, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0.5, 3);
  await page.keyboard.press('r');                                           // setupGizmos: rotación en X
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r[0], { timeout: 60_000 }).toBeCloseTo(-Math.PI / 12, 2);
  await page.keyboard.press('q');
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.snapshot())).estado.objetos[0].r[1], { timeout: 60_000 }).toBeCloseTo(-Math.PI / 12, 2);
  expect(reg.errores).toEqual([]);
});

// ── P19 · atajos P / L / B / V y R reservada al 3D (D5, D6) ──────────────────
test('P19 D5 D6 · atajos P, L, B y V cambian de herramienta; R no hace nada en el editor y muestra el aviso; no cambian al escribir en un campo', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  expect(await herramienta(page)).toBe('select');
  for (const [tecla, h] of [['p', 'punto'], ['l', 'linea'], ['b', 'rectangulo'], ['v', 'select'], ['P', 'punto'], ['L', 'linea'], ['B', 'rectangulo'], ['V', 'select']]) {
    await page.keyboard.press(tecla);
    expect(await herramienta(page)).toBe(h);
    await expect(page.locator(`#plano-overlay [data-herr="${h}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.keyboard.press('l');
  await page.keyboard.press('r');                                           // D5: R no cambia la herramienta ni crea nada
  expect(await herramienta(page)).toBe('linea');
  await expect(page.locator('#plano-tip')).toBeVisible();
  await expect(page.locator('#plano-tip')).toHaveText('R rota en 3D. Para rectángulo usa B');
  expect(await elementos(page)).toEqual([]);
  await page.click('#plano-lote-ancho');                                    // escribir en un campo no activa atajos
  await page.keyboard.press('b');
  await page.keyboard.press('p');
  expect(await herramienta(page)).toBe('linea');
  await page.locator('#plano-lote-ancho').blur();
  await page.keyboard.press('b');
  expect(await herramienta(page)).toBe('rectangulo');
  await expect(page.locator('#plano-tip')).toBeHidden({ timeout: 10_000 });
  expect(reg.errores).toEqual([]);
});

// ── P20 · Esc: cancelar, confirmar y cerrar (C5, D6) ─────────────────────────
test('P20 C5 D6 · Esc con cambios sin guardar pide confirmación (guardar / descartar / seguir); sin cambios cierra directo', async ({ page }) => {
  const reg = await abrir(page);
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 1, 1);
  await page.keyboard.press('Escape');                                      // con cambios: confirmación, no cierra
  await expect(page.locator('#plano-confirma')).toBeVisible();
  await expect(overlay(page)).toHaveClass(/open/);
  await page.keyboard.press('Escape');                                      // Esc dentro de la confirmación = seguir editando
  await expect(page.locator('#plano-confirma')).toBeHidden();
  await expect(overlay(page)).toHaveClass(/open/);
  await page.click('#plano-cerrar');                                        // el botón Cerrar sigue la misma regla
  await expect(page.locator('#plano-confirma')).toBeVisible();
  await page.click('#plano-conf-seguir');
  await expect(page.locator('#plano-confirma')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.click('#plano-conf-descartar');                                // descartar: no se guarda nada
  await expect(overlay(page)).toBeHidden();
  expect((await plano(page)).guardado).toBeNull();
  await abrirEditor(page);
  expect(await elementos(page)).toEqual([]);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 2, 2);
  await page.keyboard.press('Escape');
  await page.click('#plano-conf-guardar');                                  // guardar y cerrar
  await expect(overlay(page)).toBeHidden();
  expect((await plano(page)).guardado.elementos).toHaveLength(1);
  await abrirEditor(page);
  expect(await elementos(page)).toHaveLength(1);
  await page.keyboard.press('Escape');                                      // sin cambios: cierra directo
  await expect(overlay(page)).toBeHidden();
  await expect(page.locator('#plano-confirma')).toBeHidden();
  expect(reg.errores).toEqual([]);
});

// ── P21 · C2 · contorno de la excavación (referencia de solo lectura) ────────
test('P21 C2 D3 · el contorno de la excavación es gris punteado, con tooltip, no seleccionable, no editable y no se guarda', async ({ page }) => {
  const reg = await abrir(page, casa([], { excavacion: EXCAVACION }));
  await page.waitForFunction(() => window.__steamTest.resumenEscena().excavacion?.activa === true, null, { timeout: 120_000 });
  await abrirEditor(page);
  const g = svg(page).locator('[data-contorno="excavacion"]');
  await expect(g).toHaveCount(1);
  await expect(g.locator('title')).toHaveText('Contorno de la excavación actual (solo lectura)');
  const rect = g.locator('rect.plano-contorno');
  expect(await rect.evaluate(el => { const c = getComputedStyle(el); return [c.strokeDasharray, c.stroke]; })).toEqual(['6px, 4px', 'rgb(154, 160, 166)']);
  const caja = await rect.boundingBox();                                    // 4 m de ancho (X) × 6 m de largo (Z), centrado en el origen
  expect(Math.abs(caja.width / caja.height - 4 / 6)).toBeLessThan(0.02);
  const o = await pantalla(page, 0, 0);
  expect(Math.abs(caja.x + caja.width / 2 - o.x)).toBeLessThan(1.5);
  expect(Math.abs(caja.y + caja.height / 2 - o.y)).toBeLessThan(1.5);
  await page.keyboard.press('v');                                           // no seleccionable: ni el borde ni el interior
  const borde = await pantalla(page, 2, 0);
  await page.mouse.click(borde.x, borde.y);
  expect((await plano(page)).seleccion).toBeNull();
  await clic(page, 0, 0);
  expect((await plano(page)).seleccion).toBeNull();
  await arrastrar(page, [2, 0], [3, 1]);                                    // no se arrastra
  expect(await elementos(page)).toEqual([]);
  await expect(svg(page).locator('[data-sel]')).toHaveCount(0);
  await page.keyboard.press('Delete');
  await expect(g).toHaveCount(1);                                           // no se borra
  await page.keyboard.press('p'); await clic(page, -3, 4);                  // lo dibujado sí se guarda; el contorno no
  await page.click('#plano-guardar');
  const guardado = (await plano(page)).guardado;
  expect(guardado.elementos).toHaveLength(1);
  expect(JSON.stringify(guardado)).not.toMatch(/contorno|excavacion|rectangulo/);
  const put = await ultimoPutConPlano(reg);
  expect(put.progreso.plano.elementos).toHaveLength(1);
  expect(put.progreso.excavacion.largo).toBe(6);                            // la excavación sigue como estaba
  expect(reg.errores).toEqual([]);
});

// ── P22 · C3 · carga con JSON corrupto ───────────────────────────────────────
test('P22 C3 · progreso.plano corrupto no rompe la carga: lo inválido se descarta, el lote malo vuelve a 10×10 y se trunca a 500', async ({ page }) => {
  const muchos = Array.from({ length: 800 }, (_, i) => ({ id: i + 1, tipo: 'punto', x: (i % 40) * 0.5 - 10, z: Math.floor(i / 40) * 0.5 - 5 }));
  const corrupto = {
    lote: { ancho: -4, largo: 'x' },
    elementos: [
      { id: 1, tipo: 'punto', x: 1 }, { id: 2, tipo: 'punto', x: 1, z: 2 }, { id: 3, tipo: 'rectangulo', x: 0, z: 0, ancho: -2, largo: 1 },
      { id: 4, tipo: 'linea', x1: 0, z1: 0, x2: 0, z2: 0 }, { id: 5, tipo: 'circulo' }, 7, null, 'x', [],
    ],
  };
  for (const [plano_, esperado] of [
    [corrupto, { n: 1, lote: { ancho: 10, largo: 10 } }],
    ['no soy un objeto', { n: 0, lote: { ancho: 10, largo: 10 } }],
    [{ lote: { ancho: 12, largo: 9 }, elementos: muchos }, { n: 500, lote: { ancho: 12, largo: 9 } }],
  ]) {
    const reg = await abrir(page, casa([], { plano: plano_ }));
    await abrirEditor(page);
    const p = await plano(page);
    expect(p.trabajo.elementos).toHaveLength(esperado.n);
    expect(p.trabajo.lote).toEqual(esperado.lote);
    expect(reg.errores).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

// ── P23 · máximo de elementos y vista de maestro ─────────────────────────────
test('P23 · no se aceptan más de 500 elementos: el 501 se rechaza con un aviso', async ({ page }) => {
  const muchos = Array.from({ length: 499 }, (_, i) => ({ id: i + 1, tipo: 'punto', x: (i % 40) * 0.5 - 10, z: Math.floor(i / 40) * 0.5 - 5 }));
  const reg = await abrir(page, casa([], { plano: { lote: { ancho: 10, largo: 10 }, elementos: muchos, contador: 500 } }));
  await abrirEditor(page);
  await rejilla(page, 0.5);
  await page.keyboard.press('p');
  await clic(page, 4, 4);                                                   // el 500
  await clic(page, -4, 4);                                                  // el 501: rechazado
  expect(await elementos(page)).toHaveLength(500);
  await expect(page.locator('#plano-tip')).toContainText('Máximo 500');
  expect(reg.errores).toEqual([]);
});
