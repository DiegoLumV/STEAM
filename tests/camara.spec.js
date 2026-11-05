// F1 · Cámara libre con colisión nativa de Babylon y «rayos X».
// La API se simula (tests/helpers.js); no hay base de datos ni backend.
// La cámara se lee con window.__steamTest.camara(); fijarCamara() solo prepara el caso inicial:
// los movimientos que se prueban se hacen con ratón y teclado reales.
// En un equipo sin GPU el simulador corre a ~1,5 FPS: las esperas son por condición y con márgenes amplios.
import { test, expect } from '@playwright/test';
import { abrirSimulador, leerCasa, instantanea } from './helpers.js';

test.describe.configure({ timeout: 300_000 });

const cam = page => page.evaluate(() => window.__steamTest.camara());
const fijar = (page, pose) => page.evaluate(p => window.__steamTest.fijarCamara(p), pose);
const aPantalla = (page, p) => page.evaluate(({ x, y, z }) => window.__steamTest.aPantalla(x, y, z), p);
const limites = (page, id) => page.evaluate(i => window.__steamTest.limitesObjeto(i), id);
const seleccionado = page => page.evaluate(() => window.__steamTest.seleccionado());
const centro = b => ({ x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Espera a que la condición sobre la cámara se cumpla (la inercia la sigue moviendo unos cuadros). */
const hasta = (page, fn, timeout = 150_000) =>
  expect.poll(async () => fn(await cam(page)), { timeout, intervals: [300] }).toBe(true);
/** Espera a que la cámara deje de moverse por inercia. */
const quieta = page =>
  page.waitForFunction(() => !window.__steamTest.camara().enMovimiento, null, { timeout: 150_000, polling: 300 });
/** Deja pasar varios cuadros (para comprobar que algo NO se movió). */
const cuadros = (page, n = 4) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);

async function centroCanvas(page) {
  const r = await page.locator('#c').boundingBox();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
async function arrastrar(page, desde, dx, dy, { button = 'left', pasos = 3 } = {}) {
  await page.mouse.move(desde.x, desde.y);
  await page.mouse.down({ button });
  for (let i = 1; i <= pasos; i++) await page.mouse.move(desde.x + dx * i / pasos, desde.y + dy * i / pasos);
  await page.mouse.up({ button });
}
async function rueda(page, punto, delta, veces) {
  await page.mouse.move(punto.x, punto.y);
  for (let i = 0; i < veces; i++) await page.mouse.wheel(0, delta);
}
const casaMuros = () => leerCasa('muros_puerta_ventana');

test('límites nuevos: radio mínimo 1.2 m y vista casi a nivel; colisión activa y rayos X apagado', async ({ page }) => {
  const reg = await abrirSimulador(page);
  const c = await cam(page);
  expect(c.radioMinimo).toBeCloseTo(1.2, 5);
  expect(c.betaMaximo).toBeCloseTo(Math.PI / 2 - 0.02, 5);
  expect(c.colision).toBe(true);
  expect(c.rayosX).toBe(false);
  await expect(page.locator('#btnRayosX')).toHaveText('🩻 Rayos X: OFF');
  expect(reg.errores).toEqual([]);
});

test('orbitar con clic izquierdo y arrastre; no selecciona nada', async ({ page }) => {
  await abrirSimulador(page);
  const antes = await cam(page);
  const c = await centroCanvas(page);
  await arrastrar(page, { x: c.x, y: c.y - 150 }, 220, 60);
  await hasta(page, k => Math.abs(k.alpha - antes.alpha) > 0.1 && Math.abs(k.beta - antes.beta) > 0.02);
  const despues = await cam(page);
  expect(despues.target).toEqual(antes.target);
  expect(await seleccionado(page)).toBeNull();
});

test('desplazar con botón central y con Ctrl + clic izquierdo; el botón derecho no mueve la cámara', async ({ page }) => {
  await abrirSimulador(page);
  const c = await centroCanvas(page);
  const t0 = (await cam(page)).target;
  await arrastrar(page, { x: c.x, y: c.y - 150 }, 160, 0, { button: 'middle' });
  await hasta(page, k => dist(k.target, t0) > 0.5);
  await quieta(page);

  const t1 = (await cam(page)).target;
  await page.keyboard.down('Control');
  await arrastrar(page, { x: c.x, y: c.y - 150 }, -160, 0);
  await page.keyboard.up('Control');
  await hasta(page, k => dist(k.target, t1) > 0.5);
  await quieta(page);

  const antes = await cam(page);
  await arrastrar(page, { x: c.x, y: c.y - 150 }, 200, 80, { button: 'right' });
  await cuadros(page, 4);
  const despues = await cam(page);
  expect(despues.alpha).toBeCloseTo(antes.alpha, 6);
  expect(despues.beta).toBeCloseTo(antes.beta, 6);
  expect(despues.target).toEqual(antes.target);
});

test('flechas del teclado y rueda siguen funcionando', async ({ page }) => {
  await abrirSimulador(page);
  const a0 = await cam(page);
  await page.keyboard.down('ArrowRight');
  await hasta(page, k => k.alpha > a0.alpha + 0.05);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');
  await hasta(page, k => k.beta > a0.beta + 0.05);
  await page.keyboard.up('ArrowDown');
  const a1 = await cam(page);
  await rueda(page, await centroCanvas(page), -1000, 3);
  await hasta(page, k => k.radius < a1.radius - 1);
});

test('entrar a la vivienda desde arriba y bajar a la altura de los ojos, sin atravesar muros', async ({ page }) => {
  await abrirSimulador(page, casaMuros());
  await fijar(page, { target: { x: 0, y: 1.4, z: 0 }, alpha: -Math.PI / 2, beta: 0.35, radius: 18 });
  await rueda(page, await centroCanvas(page), -1000, 35); // ~10 % por evento: de 18 m al límite de 1,2 m
  await hasta(page, k => k.radius < 1.5);
  await quieta(page);
  await page.keyboard.down('ArrowDown');
  await hasta(page, k => k.beta > 1.4);
  await page.keyboard.up('ArrowDown');
  const c = await cam(page);
  expect(c.colision).toBe(true);
  // Dentro del recinto de muros (±6 m) y por debajo de su remate (2,8 m).
  expect(Math.abs(c.posicion.x)).toBeLessThan(5.5);
  expect(Math.abs(c.posicion.z)).toBeLessThan(5.5);
  expect(c.posicion.y).toBeGreaterThan(0.5);
  expect(c.posicion.y).toBeLessThan(2.8);
});

// Muro 7 de la casa de referencia: block, en x = 6, girado 90°, 4 filas (2,8 m).
// Objetivo 3 m detrás del muro y cámara 8 m antes, casi horizontal: acercarse obliga a cruzarlo.
async function intentarCruzarMuro(page) {
  const b = await limites(page, 7);
  const xMuro = (b.min.x + b.max.x) / 2;
  await fijar(page, { target: { x: xMuro + 3, y: 1.4, z: 0 }, alpha: Math.PI, beta: Math.PI / 2 - 0.1, radius: 8 });
  await cuadros(page, 2);
  expect((await cam(page)).posicion.x).toBeLessThan(b.min.x);
  await rueda(page, await centroCanvas(page), -1000, 30); // sin obstáculo bastaría para llegar a 1,2 m
  await quieta(page);
  return { b, c: await cam(page) };
}

test('la cámara no atraviesa un muro sólido por defecto', async ({ page }) => {
  await abrirSimulador(page, casaMuros());
  const { b, c } = await intentarCruzarMuro(page);
  expect(c.colision).toBe(true);
  expect(c.posicion.x).toBeLessThan(b.min.x); // se queda del lado inicial…
  expect(c.posicion.x).toBeGreaterThan(b.min.x - 1.0); // …pero llegó hasta el muro: lo detuvo la colisión
  expect(c.radius).toBeGreaterThan(2.5);
});

test('«rayos X» permite atravesar el muro y al apagarlo vuelve la colisión', async ({ page }) => {
  await abrirSimulador(page, casaMuros());
  await page.locator('#btnRayosX').click();
  await expect(page.locator('#btnRayosX')).toHaveText('🩻 Rayos X: ON');
  const { b, c } = await intentarCruzarMuro(page);
  expect(c.colision).toBe(false);
  expect(c.posicion.x).toBeGreaterThan(b.max.x); // cruzó al otro lado
  await page.locator('#btnRayosX').click();
  await expect(page.locator('#btnRayosX')).toHaveText('🩻 Rayos X: OFF');
  expect((await cam(page)).colision).toBe(true);
  // Es solo de sesión: no aparece en lo que se guarda.
  expect(JSON.stringify(await instantanea(page))).not.toMatch(/rayos/i);
});

test('clic izquierdo sobre una pieza la selecciona y el arrastre del gizmo no mueve la cámara', async ({ page }) => {
  await abrirSimulador(page, casaMuros());
  const b = await limites(page, 7);
  await fijar(page, { target: centro(b), alpha: Math.PI, beta: 1.1, radius: 14 });
  await cuadros(page, 2);
  const p = await aPantalla(page, centro(b));
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(7);
  await cuadros(page, 3);
  const antes = await cam(page);
  const posAntes = centro(await limites(page, 7));
  // El gizmo gira con la pieza: se usa la flecha que en pantalla queda más horizontal respecto a la vertical (y).
  const gy = await page.evaluate(() => window.__steamTest.gizmoEnPantalla('y'));
  const candidatos = [];
  for (const eje of ['x', 'z']) {
    const p2 = await page.evaluate(e => window.__steamTest.gizmoEnPantalla(e), eje);
    if (p2) candidatos.push(p2);
  }
  expect(gy).not.toBeNull();
  expect(candidatos.length).toBeGreaterThan(0);
  const g = candidatos.sort((a, b2) => Math.abs(b2.x - gy.x) - Math.abs(a.x - gy.x))[0];
  await arrastrar(page, g, Math.sign(g.x - gy.x || 1) * 90, 0, { pasos: 4 });
  await cuadros(page, 3);
  const despues = await cam(page);
  const posDespues = centro(await limites(page, 7));
  expect(despues.alpha).toBeCloseTo(antes.alpha, 4);
  expect(despues.beta).toBeCloseTo(antes.beta, 4);
  expect(despues.radius).toBeCloseTo(antes.radius, 4);
  expect(despues.target).toEqual(antes.target);
  expect(dist(posDespues, posAntes)).toBeGreaterThan(0.2);
});

test('con un modal abierto, arrastrar y usar la rueda no mueven la cámara', async ({ page }) => {
  await abrirSimulador(page);
  await page.locator('#btnMatematicas').click();
  await expect(page.locator('#matematicas-overlay')).toHaveClass(/open/);
  const antes = await cam(page);
  const c = await centroCanvas(page);
  await arrastrar(page, c, 200, 50);
  await rueda(page, c, -1000, 3);
  await cuadros(page, 4);
  const despues = await cam(page);
  expect(despues.alpha).toBeCloseTo(antes.alpha, 6);
  expect(despues.beta).toBeCloseTo(antes.beta, 6);
  expect(despues.radius).toBeCloseTo(antes.radius, 6);
});

test('?libre=1: el interruptor sigue visible y funcional, y la cámara orbita', async ({ page }) => {
  await abrirSimulador(page);
  await page.goto('/sandbox.html?proyecto=1&steamTest=1&libre=1');
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  const btn = page.locator('#btnLibre');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(btn).toHaveText('🔓 Construcción libre: ON');
  const antes = await cam(page);
  const c = await centroCanvas(page);
  await arrastrar(page, { x: c.x, y: c.y - 150 }, 200, 0);
  await hasta(page, k => Math.abs(k.alpha - antes.alpha) > 0.1);
});
