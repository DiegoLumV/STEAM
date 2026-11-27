// F2.2 · Avisos de colocación (solo informativos).
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Las piezas de cada caso nacen de un guardado
// sintético (posiciones exactas); los movimientos que se prueban se hacen con el gizmo, el ratón y el teclado reales.
// El aviso se lee con window.__steamTest.avisoColocacion() (solo lectura).
// En un equipo sin GPU el simulador corre a ~1,5 FPS: las esperas son por condición y con márgenes amplios.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { abrirSimulador, instantanea } from './helpers.js';
import { clasificarColocacion } from '../src/scripts/manipulacion.js';

test.describe.configure({ timeout: 300_000 });

const PROGRESO = {
  buildPhase: 4, concretoUnlocked: true, matematicasValidadas: true,
  puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off',
};
const bloque = (id, x, y, z) => ({ id, type: 'block', p: [x, y, z], r: [0, 0, 0] });
const losa = id => ({ id, type: 'concreto_slab_20', p: [0, 0, 0], r: [0, 0, 0] });
const muro = (id, x, z, w = 4, d = 4) => ({ id, type: 'wall_block', p: [x, 0, z], r: [0, 0, 0], w, d, wallMode: 'simple' });
const casa = objetos => ({
  estado: { v: 2, objetos, contador: objetos.length + 1, progreso: PROGRESO, terreno: { excavacion: null }, hitos: {} },
  progreso: PROGRESO,
});

const aviso = page => page.evaluate(() => window.__steamTest.avisoColocacion());
const camara = page => page.evaluate(() => window.__steamTest.camara());
const limites = (page, id) => page.evaluate(i => window.__steamTest.limitesObjeto(i), id);
const seleccionado = page => page.evaluate(() => window.__steamTest.seleccionado());
const aPantalla = (page, p) => page.evaluate(({ x, y, z }) => window.__steamTest.aPantalla(x, y, z), p);
const centro = b => ({ x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 });
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);

/** Abre el simulador con las piezas dadas y espera a que estén todas en la escena. */
async function abrirCon(page, objetos) {
  const reg = await abrirSimulador(page, casa(objetos));
  await page.waitForFunction(n => window.__steamTest.resumenEscena().objetos.length === n, objetos.length, { timeout: 120_000 });
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  await cuadros(page, 2);
  return reg;
}
/** Selecciona con el mismo clic de la lista «Colocados» que usa el alumno. */
async function seleccionar(page, id) {
  await page.locator(`#obj-items .obj-item[onclick="selectFromList(${id})"]`).click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(id);
}
/** Espera a que el aviso cumpla la condición (la evaluación tras soltar llega un cuadro después). */
const hasta = (page, fn, timeout = 120_000) =>
  expect.poll(async () => fn(await aviso(page)), { timeout, intervals: [300] }).toBe(true);
const estadosAlerta = a => a.alerta.filas.map(f => f.estado);

async function arrastrarEje(page, eje, dx, dy, pasos = 6) {
  let g = null;
  await expect.poll(async () => { g = await page.evaluate(e => window.__steamTest.gizmoEnPantalla(e), eje); return g !== null; }, { timeout: 60_000 }).toBe(true);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let i = 1; i <= pasos; i++) await page.mouse.move(g.x + dx * i / pasos, g.y + dy * i / pasos);
  await page.mouse.up();
}
async function clicVacio(page) {
  // Suelo despejado a la izquierda de las piezas: un clic ahí deselecciona (setupPicking trata 'ground' como vacío).
  const r = await page.locator('#c').boundingBox();
  await page.mouse.click(r.x + r.width * 0.3, r.y + r.height * 0.6);
}

// ── 1 ───────────────────────────────────────────────────────────────────────
test('1 · pieza apoyada: sin aviso en el overlay y panel verde', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.panel.visible);
  const a = await aviso(page);
  expect(a.estado.estado).toBe('apoyada');
  expect(a.estado.avisos).toEqual([]);
  expect(a.alerta.visible).toBe(false);
  expect(a.alerta.filas).toEqual([]);
  expect(a.panel.estado).toBe('apoyada');
  expect(a.panel.colorBorde).toBe('rgb(46, 125, 50)'); // #2E7D32
  expect(a.panel.pieza).toBe('Block');
  expect(a.panel.dy).toBe('0.0 cm');
  expect(a.panel.contacto).toBe('100 %');
  expect(reg.errores).toEqual([]);
});

// ── 2 ───────────────────────────────────────────────────────────────────────
test('2 · pieza flotante (Δy > 2 cm): overlay ámbar «Flotante», sin correcciones automáticas', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  const a = await aviso(page);
  expect(a.estado.estado).toBe('flotante');
  expect(a.alerta.filas).toEqual([{ estado: 'flotante', texto: 'Flotante', color: 'rgb(249, 168, 37)' }]); // #F9A825
  expect(a.panel.dy).toBe('+50.0 cm');
  await cuadros(page, 4);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0.5, 3); // la pieza sigue donde estaba
});

// ── 3 ───────────────────────────────────────────────────────────────────────
test('3 · pieza hundida (Δy < −2 cm): overlay amarillo «Hundida» (la losa cuenta como apoyo)', async ({ page }) => {
  await abrirCon(page, [losa(1), bloque(2, 0, 0, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => a.alerta.visible);
  const a = await aviso(page);
  expect(a.estado.estado).toBe('hundida');
  expect(a.alerta.filas).toEqual([{ estado: 'hundida', texto: 'Hundida', color: 'rgb(251, 192, 45)' }]); // #FBC02D
  expect(a.panel.dy).toBe('-20.0 cm'); // la losa llega a y = 0.2 y el bloque nace en y = 0
});

// ── 4 ───────────────────────────────────────────────────────────────────────
test('4 · pieza superpuesta (solapaCon): overlay rojo «Superpuesta»', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 0.3, 0, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => a.alerta.visible);
  const a = await aviso(page);
  expect(a.estado.estado).toBe('superpuesta');
  expect(a.estado.solapaCon).toBe(1);
  // La pieza que la penetra no cuenta además como «hundida» respecto a ella.
  expect(a.alerta.filas).toEqual([{ estado: 'superpuesta', texto: 'Superpuesta', color: 'rgb(198, 40, 40)' }]); // #C62828
});

// ── 5 ───────────────────────────────────────────────────────────────────────
test('5 · al mover y soltar una pieza, el aviso se actualiza', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.panel.visible && !a.alerta.visible);
  await arrastrarEje(page, 'y', 0, -110);
  await hasta(page, a => a.alerta.visible && estadosAlerta(a).includes('flotante'));
  const a = await aviso(page);
  expect(a.estado.dy).toBeGreaterThan(2);
  expect(a.panel.dy).toMatch(/^\+\d+\.\d cm$/);
});

// ── 6 ───────────────────────────────────────────────────────────────────────
test('6 · al corregir la posición y soltar, el aviso desaparece', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  await arrastrarEje(page, 'y', 0, 450); // hacia abajo: el suelo (y = 0) detiene la pieza
  await hasta(page, a => !a.alerta.visible && a.panel.estado === 'apoyada');
  expect((await limites(page, 1)).min.y).toBeCloseTo(0, 3);
  expect((await aviso(page)).panel.colorBorde).toBe('rgb(46, 125, 50)');
});

// ── 7 ───────────────────────────────────────────────────────────────────────
test('7 · una pieza flotante se coloca igual y el aviso persiste hasta el siguiente cambio', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 4, 0, 0)]);
  await seleccionar(page, 1);
  await arrastrarEje(page, 'y', 0, -110);
  await hasta(page, a => a.alerta.visible);
  expect((await limites(page, 1)).min.y).toBeGreaterThan(0.02); // se colocó flotante: nada la bloqueó ni la corrigió
  await cuadros(page, 5);
  expect((await aviso(page)).alerta.visible).toBe(true); // el aviso sigue
  expect(estadosAlerta(await aviso(page))).toContain('flotante');
  await seleccionar(page, 2); // el siguiente cambio de selección lo reemplaza
  await hasta(page, a => !a.alerta.visible && a.panel.estado === 'apoyada');
});

// ── 8 ───────────────────────────────────────────────────────────────────────
test('8 · una pieza superpuesta se coloca igual y el aviso persiste hasta el siguiente cambio', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 0.3, 0, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => estadosAlerta(a).includes('superpuesta'));
  await arrastrarEje(page, 'y', 0, -20, 4); // la sube ~0,3 m: sigue metida en el otro bloque (0,7 m de alto)
  await expect.poll(async () => (await limites(page, 2)).min.y, { timeout: 120_000 }).toBeGreaterThan(0.05);
  await cuadros(page, 4);
  const a = await aviso(page);
  expect(a.alerta.visible).toBe(true);
  expect(estadosAlerta(a)).toContain('superpuesta');
  await seleccionar(page, 1); // al cambiar de pieza el aviso se reevalúa
  await hasta(page, a2 => a2.estado?.solapaCon === 2);
});

// ── 9 ───────────────────────────────────────────────────────────────────────
test('9 · Escape, clic en vacío o cambio de pieza limpian el aviso', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0.5, 0), bloque(2, 4, 0, 0)]);
  // Escape: el aviso se oculta y la pieza sigue seleccionada, sin moverse.
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  await page.keyboard.press('Escape');
  await hasta(page, a => !a.alerta.visible && !a.panel.visible && a.estado === null);
  expect(await seleccionado(page)).toBe(1);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0.5, 3);
  // Clic en vacío: deselecciona y no deja aviso.
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  await clicVacio(page);
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBeNull();
  await hasta(page, a => !a.alerta.visible && !a.panel.visible);
  // Cambio de pieza.
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  await seleccionar(page, 2);
  await hasta(page, a => !a.alerta.visible && a.panel.estado === 'apoyada');
});

// ── 10 ──────────────────────────────────────────────────────────────────────
test('10 · cámara, gizmo, zoom y desplazamiento siguen funcionando con el aviso visible', async ({ page }) => {
  test.setTimeout(600_000); // AUTORIZACIÓN B: sin GPU esta prueba tarda ≈ 4,7 min; 300 s era un límite al borde
  await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  const r = await page.locator('#c').boundingBox();
  const vacio = { x: r.x + r.width * 0.45, y: r.y + r.height * 0.14 };
  const c0 = await camara(page);
  // Orbitar con clic izquierdo y arrastre.
  await page.mouse.move(vacio.x, vacio.y);
  await page.mouse.down();
  for (let i = 1; i <= 4; i++) await page.mouse.move(vacio.x + 50 * i, vacio.y + 8 * i);
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await camara(page)).alpha - c0.alpha), { timeout: 150_000, intervals: [300] }).toBeGreaterThan(0.05);
  await page.waitForFunction(() => !window.__steamTest.camara().enMovimiento, null, { timeout: 150_000, polling: 300 });
  // Zoom con la rueda.
  const c1 = await camara(page);
  await page.mouse.move(vacio.x, vacio.y);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -400);
  await expect.poll(async () => Math.abs((await camara(page)).radius - c1.radius), { timeout: 150_000, intervals: [300] }).toBeGreaterThan(0.3);
  await page.waitForFunction(() => !window.__steamTest.camara().enMovimiento, null, { timeout: 150_000, polling: 300 });
  // Desplazar con el botón central.
  const c2 = await camara(page);
  await page.mouse.move(vacio.x, vacio.y);
  await page.mouse.down({ button: 'middle' });
  for (let i = 1; i <= 4; i++) await page.mouse.move(vacio.x + 40 * i, vacio.y);
  await page.mouse.up({ button: 'middle' });
  await expect.poll(async () => {
    const t = (await camara(page)).target;
    return Math.hypot(t.x - c2.target.x, t.y - c2.target.y, t.z - c2.target.z);
  }, { timeout: 150_000, intervals: [300] }).toBeGreaterThan(0.2);
  // Gizmo: sigue moviendo la pieza (hacia el suelo: el aviso desaparece). Se recoloca la cámara para que la flecha
  // vertical quede a la vista, como haría el alumno tras orbitar.
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  await cuadros(page, 3);
  await seleccionar(page, 1);
  await arrastrarEje(page, 'y', 0, 450);
  await hasta(page, a => !a.alerta.visible && a.panel.estado === 'apoyada');
  expect((await limites(page, 1)).min.y).toBeCloseTo(0, 3);
});

// ── 11 ──────────────────────────────────────────────────────────────────────
test('11 · el aviso no se serializa en el guardado v2', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible && a.estado !== null);
  const snap = await instantanea(page);
  const texto = JSON.stringify(snap);
  expect(texto).not.toMatch(/estadoColocacion|aviso|flotante|hundida|superpuesta|contacto|outline/i);
  const permitidas = ['id', 'type', 'p', 'r', 's', 'color', 'cutFactor', 'wallMode', 'embeddedInWall', 'roofShape', 'roofMat', 'roofH', 'area', 'w', 'd', 'h'];
  for (const o of snap.estado.objetos) expect(Object.keys(o).filter(k => !permitidas.includes(k))).toEqual([]);
  // También en lo que realmente se envía al servidor: girar la pieza marca «sucio» y el autoguardado hace el PUT.
  await page.keyboard.press('e');
  await expect.poll(() => reg.puts.length, { timeout: 120_000, intervals: [500] }).toBeGreaterThan(0);
  const enviado = JSON.stringify(reg.puts) + JSON.stringify(reg.beacons);
  expect(enviado).not.toMatch(/estadoColocacion|aviso|flotante|hundida|superpuesta|outline/i);
});

// ── 12 ──────────────────────────────────────────────────────────────────────
test('12 · Δy ≤ 2 cm pero contacto < 60 %: overlay ámbar (prevalece el más conservador)', async ({ page }) => {
  // El bloque 2 descansa justo sobre el 1 (a 0.7 m) pero solo 0.3 m de su largo de 1.0 m tocan el apoyo.
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 0.7, 0.7, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => a.alerta.visible);
  const a = await aviso(page);
  expect(Math.abs(a.estado.dy)).toBeLessThanOrEqual(2);
  expect(a.estado.contacto).toBe(30);
  expect(a.estado.estado).toBe('flotante');
  expect(a.alerta.filas).toEqual([{ estado: 'flotante', texto: 'Flotante', color: 'rgb(249, 168, 37)' }]);
  expect(a.panel.contacto).toBe('30 %');
});

// ── 13 ──────────────────────────────────────────────────────────────────────
test('13 · avisos múltiples simultáneos: flotante + superpuesta', async ({ page }) => {
  // El bloque flota a 1 m, dentro del volumen de un muro.
  await abrirCon(page, [muro(1, 0, 0), bloque(2, 0, 1.0, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => estadosAlerta(a).length === 2);
  const a = await aviso(page);
  expect(estadosAlerta(a)).toEqual(['superpuesta', 'flotante']);
  expect(a.alerta.filas.map(f => f.color)).toEqual(['rgb(198, 40, 40)', 'rgb(249, 168, 37)']);
  expect(a.estado.estado).toBe('superpuesta'); // el principal es el más grave
});

// ── 14 ──────────────────────────────────────────────────────────────────────
test('14 · el outline de selección (azul) y el de error (rojo) son distintos', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 4, 0, 0), bloque(3, 4.3, 0, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.panel.visible);
  const sel = await aviso(page);
  expect(sel.estado.outline).toBe('#1565C0');
  expect(sel.outlineActual).toBe('#1565C0');
  await seleccionar(page, 3); // se superpone con el 2
  await hasta(page, a => a.estado?.estado === 'superpuesta');
  const err = await aviso(page);
  expect(err.estado.outline).toBe('#C62828');
  expect(err.outlineActual).toBe('#C62828');
  expect(err.outlineActual).not.toBe(sel.outlineActual);
  await page.keyboard.press('Escape'); // sin aviso, la pieza vuelve al azul de selección
  await hasta(page, a => a.estado === null && a.outlineActual === '#1565C0');
});

// ── 15 ──────────────────────────────────────────────────────────────────────
test('15 · pasar el ratón sobre una pieza candidata a apoyo la resalta en ámbar sin mover la cámara', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 3, 0, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => a.panel.visible);
  await cuadros(page, 3);
  const antes = await camara(page);
  const p = await aPantalla(page, centro(await limites(page, 1)));
  await page.mouse.move(p.x - 6, p.y);
  await page.mouse.move(p.x, p.y);
  await hasta(page, a => a.hover === 1);
  const a = await aviso(page);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(a.hoverColor.slice(i, i + 2), 16));
  expect(r).toBeGreaterThan(g); // ámbar: R > G > B
  expect(g).toBeGreaterThan(b);
  expect(r - b).toBeGreaterThan(80);
  expect(a.hoverColor).not.toBe('#1565C0');
  await cuadros(page, 3);
  const despues = await camara(page);
  for (const k of ['alpha', 'beta', 'radius']) expect(despues[k]).toBeCloseTo(antes[k], 5);
  expect(despues.target).toEqual(antes.target);
  expect(await seleccionado(page)).toBe(2); // el hover no cambia la selección
  await page.mouse.move(p.x, p.y - 200); // fuera de la pieza (sobre el suelo, por debajo de la barra superior)
  await hasta(page, a2 => a2.hover === null);
});

// ── 16 ──────────────────────────────────────────────────────────────────────
test('16 · el historial guarda los últimos 5 avisos, es plegable y se envía a la telemetría', async ({ page }) => {
  const objetos = [1, 2, 3, 4, 5, 6].map(i => bloque(i, -5 + (i - 1) * 2, 0.1 * i + 0.1, 0));
  await abrirCon(page, objetos);
  const telemetria = page.waitForRequest(r => r.url().includes('/api/telemetria') && (r.postData() || '').includes('aviso_colocacion'), { timeout: 60_000 });
  for (let id = 1; id <= 6; id++) {
    await seleccionar(page, id);
    await hasta(page, a => a.historial.length > 0 && a.historial[0].id === id);
  }
  const a = await aviso(page);
  expect(a.historial.map(h => h.id)).toEqual([6, 5, 4, 3, 2]); // el 1 salió: solo 5, el más reciente primero
  expect(a.historial.every(h => h.avisos.includes('flotante'))).toBe(true);
  await expect(page.locator('#aviso-hist-n')).toHaveText('5');
  // Plegable: cerrado de inicio; el botón lo abre y lo cierra.
  await expect(page.locator('#aviso-hist')).toBeHidden();
  await page.locator('#aviso-hist-toggle').click();
  await expect(page.locator('#aviso-hist')).toBeVisible();
  await expect(page.locator('#aviso-hist li')).toHaveCount(5);
  await expect(page.locator('#aviso-hist-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#aviso-hist-toggle').click();
  await expect(page.locator('#aviso-hist')).toBeHidden();
  // Telemetría: el evento sale por el registrar() existente en el siguiente envío por lotes.
  const peticion = await telemetria;
  expect(peticion.postData()).toContain('aviso_colocacion');
});

// ── 17 ──────────────────────────────────────────────────────────────────────
test('17 · la animación de entrada dura 200 ms (≤ 300 ms) y el sonido está desactivado por defecto', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.panel.visible);
  await cuadros(page, 6); // deja asentarse la reevaluación posterior al fotograma: nada vuelve a tocar el overlay durante la medición
  const r = await page.evaluate(async () => {
    const el = document.getElementById('aviso-alerta');
    const esperar = ms => new Promise(res => setTimeout(res, ms));
    // Registra las transiciones CSS en el instante en que el overlay recibe la clase «visible» (sea quien sea que la ponga).
    const capturas = [];
    const obs = new MutationObserver(() => {
      if (el.classList.contains('visible')) {
        capturas.push(el.getAnimations().map(a => ({ prop: a.transitionProperty, dur: a.effect.getComputedTiming().duration })));
      }
    });
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    el.classList.remove('visible');
    await esperar(700); // deja terminar la salida (200 ms) antes de medir la entrada
    el.classList.remove('visible'); // por si la aplicación lo repintó durante la espera
    await esperar(700);
    void getComputedStyle(el).opacity; // fuerza el cálculo de estilos para que la clase dispare la transición
    capturas.length = 0;
    el.classList.add('visible');
    await esperar(0); // deja correr el observador
    const cs = getComputedStyle(el);
    const fn = cs.transitionTimingFunction;
    const anim = capturas.length ? capturas[capturas.length - 1] : el.getAnimations().map(a => ({ prop: a.transitionProperty, dur: a.effect.getComputedTiming().duration }));
    obs.disconnect();
    el.classList.remove('visible');
    return { anim, fn, sonido: document.getElementById('aviso-sonido').checked, capturas: capturas.length };
  });
  const op = r.anim.find(a => a.prop === 'opacity');
  expect(op).toBeTruthy();
  expect(op.dur).toBeLessThanOrEqual(300);
  expect(op.dur).toBeGreaterThanOrEqual(100);
  expect(r.anim.every(a => a.dur <= 300)).toBe(true);
  expect(r.fn).toContain('ease-out');
  expect(r.sonido).toBe(false);
  expect((await aviso(page)).sonido).toBe(false);
  await page.locator('#aviso-sonido').check(); // la casilla es interactiva aunque el contenedor no capture clics
  expect((await aviso(page)).sonido).toBe(true);
});

// ── 18 ──────────────────────────────────────────────────────────────────────
test('18 · las pruebas de manipulacion.test.js siguen verdes (sin contador fijo)', async () => {
  const raiz = fileURLToPath(new URL('..', import.meta.url));
  const salida = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/manipulacion.test.js'], { cwd: raiz, encoding: 'utf8' });
  // F2.3: el archivo crece con cada fase; se verifica el estado real (todas pasan y ninguna falla), no un número fijo.
  const n = clave => Number(new RegExp(`# ${clave} (\\d+)\\b`).exec(salida)?.[1]);
  expect(n('tests')).toBeGreaterThan(0);
  expect(n('fail')).toBe(0);
  expect(n('pass')).toBe(n('tests'));
});

// ── Extras: decisiones y especificación visual ─────────────────────────────
test('19 · una pieza apoyada sobre la losa (y = 0.2) no avisa; el área de contacto se resalta mientras está seleccionada', async ({ page }) => {
  await abrirCon(page, [losa(1), bloque(2, 1, 0.2, 1), bloque(3, -2, 0.5, 0)]);
  await seleccionar(page, 2);
  await hasta(page, a => a.panel.visible);
  let a = await aviso(page);
  expect(a.estado.estado).toBe('apoyada');
  expect(a.alerta.visible).toBe(false);
  expect(a.panel.contacto).toBe('100 %');
  // Resaltado de contacto: plano translúcido sobre la superficie de apoyo con el tamaño de la huella (1.0 × 0.5 m).
  expect(a.plano.visible).toBe(true);
  expect(a.plano.y).toBeCloseTo(0.2 + 0.006, 3);
  expect(a.plano.ancho).toBeCloseTo(1.0, 2);
  expect(a.plano.fondo).toBeCloseTo(0.5, 2);
  // Una flotante también lo muestra (sobre el suelo bajo ella: aquí no hay contacto, el plano se oculta)…
  await seleccionar(page, 3);
  await hasta(page, x => x.alerta.visible);
  a = await aviso(page);
  expect(a.plano.visible).toBe(false);
  // …y se oculta al deseleccionar.
  await seleccionar(page, 2);
  await hasta(page, x => x.plano?.visible === true);
  await clicVacio(page);
  await hasta(page, x => x.plano.visible === false);
});

test('20 · overlay: abajo a la derecha, por debajo de los modales y sin capturar clics', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await hasta(page, a => a.alerta.visible);
  const m = await page.evaluate(() => {
    const cont = document.getElementById('aviso-colocacion');
    const alerta = document.getElementById('aviso-alerta');
    const cs = getComputedStyle(cont);
    const r = alerta.getBoundingClientRect();
    const sobre = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const rc = cont.getBoundingClientRect();
    return {
      pos: cs.position, z: Number(cs.zIndex), eventos: cs.pointerEvents, fuente: getComputedStyle(alerta).fontFamily,
      margenInferior: window.innerHeight - rc.bottom, derechaDelCentro: rc.left > window.innerWidth / 2,
      capturaClic: !!sobre && !!sobre.closest('#aviso-colocacion'), fondo: getComputedStyle(alerta).backgroundColor,
      desenfoque: getComputedStyle(alerta).backdropFilter, radio: getComputedStyle(alerta).borderRadius,
      zModal: Number(getComputedStyle(document.getElementById('concreto-overlay')).zIndex),
    };
  });
  expect(m.pos).toBe('fixed');
  expect(m.margenInferior).toBeCloseTo(16, 0);
  expect(m.derechaDelCentro).toBe(true);
  expect(m.z).toBeLessThan(m.zModal);
  expect(m.eventos).toBe('none');
  expect(m.capturaClic).toBe(false);
  expect(m.fondo).toBe('rgba(20, 20, 20, 0.85)');
  expect(m.desenfoque).toContain('blur(6px)');
  expect(m.radio).toBe('8px');
  expect(m.fuente).toMatch(/Segoe UI/i); // tipografía del proyecto
});

// ── 21 · F2.3 ───────────────────────────────────────────────────────────────
// Un solo criterio: el contacto que muestra el panel (escena real, hitbox de casa.js) es el que calcula
// clasificarColocacion con las mismas piezas. 5 piezas alineadas (apoyo) + 5 giradas 45° encima, a distintos desplazamientos.
test('21 · F2.3: el panel muestra el mismo contacto que el clasificador (5 alineadas + 5 giradas 45°)', async ({ page }) => {
  const ANG = 0.7854; // 45° (el mismo valor en el guardado y en el cálculo de referencia)
  const xs = [-6, -3, 0, 3, 6];
  const dxs = [0, 0.1, 0.4, 0.6, 0.8];
  const piezas = [
    ...xs.map((x, i) => ({ id: i + 1, x, y: 0, rotY: 0 })),
    ...xs.map((x, i) => ({ id: i + 6, x: x + dxs[i], y: 0.7, rotY: ANG })),
  ];
  // Caja de un block (1,0 × 0,7 × 0,5; origen en el centro de su base) con el giro de Babylon: x → (cos, 0, −sin), z → (sin, 0, cos)
  const cajaDe = q => {
    const c = Math.cos(q.rotY), s = Math.sin(q.rotY);
    return { c: { x: q.x, y: q.y + 0.35, z: 0 }, u: [{ x: c, y: 0, z: -s }, { x: 0, y: 1, z: 0 }, { x: s, y: 0, z: c }], e: [0.5, 0.35, 0.25] };
  };
  const esperado = q => clasificarColocacion(cajaDe(q), piezas.filter(o => o.id !== q.id).map(o => ({ id: o.id, caja: cajaDe(o) })));
  const reg = await abrirCon(page, piezas.map(q => ({ id: q.id, type: 'block', p: [q.x, q.y, 0], r: [0, q.rotY, 0] })));
  const vistos = [];
  for (const q of piezas) {
    const ref = esperado(q);
    await seleccionar(page, q.id);
    await hasta(page, a => a.panel.visible && a.panel.contacto === `${Math.round(ref.contacto * 100)} %`);
    const a = await aviso(page);
    expect(a.estado.contacto).toBe(Math.round(ref.contacto * 100));
    expect(a.estado.estado).toBe(ref.estado);
    expect(a.estado.avisos).toEqual(ref.avisos);
    expect(a.panel.estado).toBe(ref.estado);
    vistos.push(ref.estado);
  }
  // El umbral actúa sobre piezas giradas: las de poco contacto avisan y las de contacto suficiente no.
  expect(vistos.slice(0, 5)).toEqual(Array(5).fill('apoyada'));
  expect(vistos.slice(5)).toContain('apoyada');
  expect(vistos.slice(5)).toContain('flotante');
  expect(reg.errores).toEqual([]);
});
