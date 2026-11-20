// F4d · Materialización del plano en 3D: el botón «Materializar plano» del editor genera paredes con huecos reales (sin CSG) a partir de las
// habitaciones y sus vanos; una pared compartida entre habitaciones adyacentes es una sola; «Desmaterializar» y «Rematerializar» piden
// confirmación; las paredes viven en UN objeto agregado «paredes_plano» regenerado desde progreso.plano.materializado (aditivo) y no
// cuentan para Programar, no colisionan con las piezas, no son apoyo, bloquean la cámara (Rayos X las atraviesa) y no se seleccionan.
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Se usan los clics, teclas y rueda reales del alumno.
// El estado interno se lee con window.__steamTest (solo lectura): plano(), materializacion() (mallas, resumen, diálogo, aviso, botones) y
// lineaVisual() (paredes generadas que corta un segmento: los huecos se comprueban con rayos reales contra las mallas fundidas).
// Los helpers se DUPLICAN de plano_vanos.spec.js (las pruebas de F4a/F4b/F4c no se tocan). En un equipo sin GPU el simulador corre a
// ~1,5 FPS: las esperas son por condición. El WebSocket de recarga en caliente de Vite es ruido del entorno y se filtra solo aquí.
//
// Habitación de prueba h1: x −3…1, z −2…1 (norte/sur 4 m, este/oeste 3 m). Paredes: p1 sur (z=−2), p2 norte (z=1), p3 oeste (x=−3), p4 este (x=1).
// Altura 2.8, grosor 0.15, alféizar 1.0. Norte = mayor z; el offset crece con +x en norte/sur y con +z en este/oeste (docs/F4c_cierre.md).
//
// Correspondencia con la autorización: M1–M24 (ver el título de cada prueba) y las condiciones C1, C2, C3 y C5 de la aprobación.
import { test, expect } from '@playwright/test';
import { abrirSimulador, leerCasa } from './helpers.js';

test.describe.configure({ timeout: 420_000 });

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
const puerta = (id, lado, offset, ancho = 0.8, alto = 2.1) => ({ id, tipo: 'puerta', lado, offset, ancho, alto });
const ventana = (id, lado, offset, ancho = 1, alto = 1.2) => ({ id, tipo: 'ventana', lado, offset, ancho, alto });
const H1 = hab('h1', -3, -2, 4, 3, 'Sala');

const plano = page => page.evaluate(() => window.__steamTest.plano());
const mat = page => page.evaluate(() => window.__steamTest.materializacion());
const snap = page => page.evaluate(() => window.__steamTest.snapshot());
const camara = page => page.evaluate(() => window.__steamTest.camara());
const limites = (page, id) => page.evaluate(i => window.__steamTest.limitesObjeto(i), id);
const seleccionado = page => page.evaluate(() => window.__steamTest.seleccionado());
const escena = page => page.evaluate(() => window.__steamTest.resumenEscena());
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const overlay = page => page.locator('#plano-overlay');
const pantalla = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.planoAPantalla(a, b), [x, z]);
const errores = reg => reg.errores.filter(e => !/WebSocket connection to 'ws:\/\/localhost/.test(e));
const sinCamara = c => ({ alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target });
const tecla = (page, code, init = {}) => page.evaluate(({ code, init }) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.replace('Key', '').toLowerCase(), bubbles: true, ...init })), { code, init });

async function abrir(page, opciones = {}) {
  const reg = await abrirSimulador(page, opciones);
  reg.telemetria = []; reg.tamanos = [];
  page.on('request', r => {
    if (r.url().includes('/api/telemetria')) {
      try { reg.telemetria.push(...(JSON.parse(r.postData() || '{}').eventos || [])); } catch (e) { /* no es JSON */ }
    }
    if (r.method() === 'PUT' && /\/api\/guardado$/.test(new URL(r.url()).pathname)) reg.tamanos.push(Buffer.byteLength(r.postData() || ''));
  });
  return reg;
}
/** Casa con piezas sueltas y, opcionalmente, un plano; espera a que se reconstruya toda la escena (piezas + paredes generadas). */
async function abrirCasa(page, objetos, extra, aguardadas) {
  const reg = await abrir(page, casa(objetos, extra));
  const esperadas = aguardadas ?? objetos.length + (extra?.plano?.materializado ? 1 : 0);
  await page.waitForFunction(n => window.__steamTest.resumenEscena().objetos.length === n, esperadas, { timeout: 120_000 });
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  await cuadros(page, 2);
  return reg;
}
async function abrirEditor(page) {
  await page.click('#btnPlano');
  await expect(overlay(page)).toHaveClass(/open/);
  await expect.poll(async () => (await plano(page)).abierto).toBe(true);
}
async function cerrarEditor(page) {
  await page.click('#plano-cerrar');
  await expect(overlay(page)).not.toHaveClass(/open/);
}
async function clic(page, x, z) {
  const p = await pantalla(page, x, z);
  await page.mouse.click(p.x, p.y);
}
async function fijar(page, selector, valor) {
  await page.fill(selector, valor);
  await page.press(selector, 'Enter');
}
async function ultimoPutConPlano(reg, conMaterializado) {
  const ok = p => p.progreso?.plano && (conMaterializado === undefined || ('materializado' in p.progreso.plano) === conMaterializado);
  await expect.poll(() => reg.puts.filter(ok).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  return reg.puts.filter(ok).at(-1);
}
/** Casa con un plano y el editor abierto. */
async function conPlano(page, habs, objetos = [], extraPlano = {}, extra = {}) {
  const reg = await abrirCasa(page, objetos, { plano: planoCon({ habitaciones: habs, ...extraPlano }), ...extra });
  await abrirEditor(page);
  return reg;
}
const materializar = page => page.click('#plano-materializar');
async function esperarMat(page, activo = true) {
  await expect.poll(async () => (await mat(page)).activo, { timeout: 60_000, intervals: [200] }).toBe(activo);
}
/** Materializa (sin confirmación previa: aún no hay paredes) y espera a que existan. */
async function materializarYEsperar(page) {
  await materializar(page);
  await esperarMat(page, true);
  return mat(page);
}
const nombres = m => m.mallas.map(x => x.name).sort();
/** Paredes generadas que corta el segmento desde → hasta. */
const rayo = (page, desde, hasta) => page.evaluate(([d, h]) =>
  window.__steamTest.lineaVisual(h[0], h[1], h[2], { x: d[0], y: d[1], z: d[2] }), [desde, hasta]);
const cajaTotal = m => ({
  minX: Math.min(...m.mallas.map(x => x.min.x)), maxX: Math.max(...m.mallas.map(x => x.max.x)),
  minY: Math.min(...m.mallas.map(x => x.min.y)), maxY: Math.max(...m.mallas.map(x => x.max.y)),
  minZ: Math.min(...m.mallas.map(x => x.min.z)), maxZ: Math.max(...m.mallas.map(x => x.max.z)),
});

// ── M1 · una habitación → 4 paredes ──────────────────────────────────────────
test('M1 · «Materializar plano» con 1 habitación genera 4 paredes de 2.8 m, grosor 0.15, color #B0B0B0, en un solo objeto «paredes_plano»', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  expect((await mat(page)).activo).toBe(false);
  await expect(page.locator('#plano-materializar')).toBeEnabled();
  await expect(page.locator('#plano-desmaterializar')).toBeDisabled();
  const m = await materializarYEsperar(page);
  expect(m.resumen).toMatchObject({ paredes: 4, vanos: 0, recortados: 0, sinHueco: 0 });
  expect(m.texto).toBe('4 paredes generadas, 0 vanos');
  expect(nombres(m)).toEqual(['pared_plano_1', 'pared_plano_2', 'pared_plano_3', 'pared_plano_4']);
  expect(m.objeto).toMatchObject({ type: 'paredes_plano', label: 'Paredes del plano' });
  expect(m.material).toBe('#B0B0B0');
  const c = cajaTotal(m);
  expect(c.minX).toBeCloseTo(-3.075, 3); expect(c.maxX).toBeCloseTo(1.075, 3);      // el grosor (0.15) está centrado en la arista
  expect(c.minZ).toBeCloseTo(-2.075, 3); expect(c.maxZ).toBeCloseTo(1.075, 3);
  expect(c.minY).toBeCloseTo(0, 3); expect(c.maxY).toBeCloseTo(2.8, 3);             // P6: base en y = 0
  expect(m.mallas.every(x => x.material === 'paredes_plano')).toBe(true);
  expect((await escena(page)).objetos.filter(o => o.type === 'paredes_plano')).toHaveLength(1);
  await expect(page.locator('#plano-mat-estado')).toHaveText('4 paredes generadas, 0 vanos');
  await expect(page.locator('#plano-desmaterializar')).toBeEnabled();
  expect(errores(reg)).toEqual([]);
});

// ── M2 · dos habitaciones adosadas (lados iguales) → 7 paredes (C3) ──────────
test('M2 · C3 · dos habitaciones adosadas de lados iguales (4×3 y 4×3) → 7 paredes, una sola compartida', async ({ page }) => {
  await conPlano(page, [hab('h1', 0, 0, 4, 3), hab('h2', 4, 0, 4, 3)]);
  const m = await materializarYEsperar(page);
  expect(m.resumen.paredes).toBe(7);                                                 // 4 + 4 − 1
  const compartidas = m.mallas.filter(x => x.habitaciones.length === 2);
  expect(compartidas).toHaveLength(1);
  expect(compartidas[0].habitaciones.sort()).toEqual(['h1', 'h2']);
  expect(compartidas[0].min.x).toBeCloseTo(3.925, 3); expect(compartidas[0].max.x).toBeCloseTo(4.075, 3);
});

test('C3 · dos habitaciones adosadas de lados DESIGUALES (4×3 y 4×2) → 8 paredes: la pared de 3 m se parte en 2 m compartidos + 1 m propio', async ({ page }) => {
  await conPlano(page, [hab('h1', 0, 0, 4, 3), hab('h2', 4, 0, 4, 2)]);
  const m = await materializarYEsperar(page);
  expect(m.resumen.paredes).toBe(8);                                                 // 4 + 4 − 1 compartida + 1 trozo propio de h1
  const enX4 = m.mallas.filter(x => x.min.x > 3.9 && x.max.x < 4.1);
  expect(enX4).toHaveLength(2);
  expect(enX4.filter(x => x.habitaciones.length === 2)).toHaveLength(1);
  expect(enX4.filter(x => x.habitaciones.length === 1 && x.habitaciones[0] === 'h1')).toHaveLength(1);
});

// ── M3 · hueco de puerta ─────────────────────────────────────────────────────
test('M3 · una puerta abre un hueco real desde el suelo hasta 2.1 m en la pared norte (los rayos pasan por el hueco y chocan con el dintel y el macizo)', async ({ page }) => {
  await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5)])]);   // hueco: x −1.5…−0.7 en z = 1
  const m = await materializarYEsperar(page);
  expect(m.resumen).toMatchObject({ paredes: 4, vanos: 1 });
  expect(m.texto).toBe('4 paredes generadas, 1 vano');
  expect(await rayo(page, [-1.1, 1.0, 3], [-1.1, 1.0, -1])).toEqual([]);                    // por el hueco a 1 m de altura
  expect(await rayo(page, [-1.1, 0.1, 3], [-1.1, 0.1, -1])).toEqual([]);                    // el hueco llega al suelo
  expect(await rayo(page, [-1.1, 2.5, 3], [-1.1, 2.5, -1])).toEqual(['pared_plano_2']);     // dintel sobre la puerta
  expect(await rayo(page, [-2.5, 1.0, 3], [-2.5, 1.0, -1])).toEqual(['pared_plano_2']);     // macizo a la izquierda
  expect(await rayo(page, [0.5, 1.0, 3], [0.5, 1.0, -1])).toEqual(['pared_plano_2']);       // macizo a la derecha
  const norte = m.mallas.find(x => x.name === 'pared_plano_2');
  expect(norte.vertices).toBe(3 * 24);                                                       // izquierda + derecha + dintel
});

// ── M4 · hueco de ventana elevada ────────────────────────────────────────────
test('M4 · una ventana abre un hueco elevado (alféizar 1.0 m, alto 1.2) en la pared este: hay antepecho debajo y dintel encima', async ({ page }) => {
  await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [ventana('v1', 'este', 1)])]);       // hueco: z −1…0 en x = 1, y 1…2.2
  const m = await materializarYEsperar(page);
  expect(m.resumen).toMatchObject({ paredes: 4, vanos: 1 });
  expect(await rayo(page, [3, 1.5, -0.5], [-0.5, 1.5, -0.5])).toEqual([]);                    // por el hueco
  expect(await rayo(page, [3, 0.5, -0.5], [-0.5, 0.5, -0.5])).toEqual(['pared_plano_4']);     // antepecho
  expect(await rayo(page, [3, 2.5, -0.5], [-0.5, 2.5, -0.5])).toEqual(['pared_plano_4']);     // dintel
  expect(await rayo(page, [3, 1.5, -1.5], [-0.5, 1.5, -1.5])).toEqual(['pared_plano_4']);     // macizo fuera del hueco
  expect(m.mallas.find(x => x.name === 'pared_plano_4').vertices).toBe(4 * 24);               // izquierda + derecha + antepecho + dintel
});

// ── M5 · dos vanos en la misma pared ─────────────────────────────────────────
test('M5 · dos vanos en la misma pared (puerta y ventana) abren dos huecos independientes con macizo entre ambos', async ({ page }) => {
  await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5), ventana('v2', 'norte', 2.5, 0.8)])]);   // puerta −1.5…−0.7; ventana −0.5…0.3
  const m = await materializarYEsperar(page);
  expect(m.resumen).toMatchObject({ paredes: 4, vanos: 2, sinHueco: 0 });
  expect(await rayo(page, [-1.1, 1.0, 3], [-1.1, 1.0, -1])).toEqual([]);
  expect(await rayo(page, [-0.1, 1.5, 3], [-0.1, 1.5, -1])).toEqual([]);
  expect(await rayo(page, [-0.1, 0.5, 3], [-0.1, 0.5, -1])).toEqual(['pared_plano_2']);       // antepecho de la ventana
  expect(await rayo(page, [-0.6, 1.0, 3], [-0.6, 1.0, -1])).toEqual(['pared_plano_2']);       // macizo entre puerta y ventana
});

// ── M6 · desmaterializar no toca las piezas manuales ─────────────────────────
test('M6 · «Desmaterializar» pide confirmación, borra solo las paredes generadas y no toca las piezas manuales', async ({ page }) => {
  const reg = await conPlano(page, [H1], [bloque(1, 5, 0, 5), bloque(2, -5, 0, 5)]);
  const antes = [await limites(page, 1), await limites(page, 2)];
  await materializarYEsperar(page);
  expect((await escena(page)).objetos.map(o => o.type).sort()).toEqual(['block', 'block', 'paredes_plano']);
  await page.click('#plano-desmaterializar');
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(true);
  const d = (await mat(page)).dialogo;
  expect(d.texto).toBe('Se borrarán 4 paredes generadas. Las piezas manuales no se tocan.');
  expect(d.boton).toBe('Desmaterializar');
  expect((await mat(page)).activo).toBe(true);                                               // nada se borra hasta responder
  await page.click('#plano-mat-conf-ok');
  await esperarMat(page, false);
  expect((await escena(page)).objetos.map(o => o.type).sort()).toEqual(['block', 'block']);
  expect([await limites(page, 1), await limites(page, 2)]).toEqual(antes);
  expect((await mat(page)).mallas).toEqual([]);
  expect((await escena(page)).mallas.filter(x => x.name.startsWith('pared_plano_'))).toEqual([]);
  expect((await mat(page)).texto).toBe('');
  await expect(page.locator('#plano-desmaterializar')).toBeDisabled();
  expect((await plano(page)).guardado.materializado).toBeUndefined();
  const put = await ultimoPutConPlano(reg, false);
  expect(put.progreso.plano).not.toHaveProperty('materializado');
  expect(errores(reg)).toEqual([]);
});

// ── M7 · rematerializar tras editar el plano ─────────────────────────────────
test('M7 · tras editar el plano el 3D no cambia hasta rematerializar; «Rematerializar» regenera las paredes con el plano nuevo', async ({ page }) => {
  await conPlano(page, [H1]);
  const m0 = await materializarYEsperar(page);
  expect(cajaTotal(m0).maxX).toBeCloseTo(1.075, 3);
  await page.keyboard.press('v');
  await clic(page, -1, -0.5);
  expect((await plano(page)).seleccionHab).toBe('h1');
  await fijar(page, '#plano-hab-ancho', '6');                                                // la sala pasa de 4 a 6 m de ancho (x −3…3)
  await expect.poll(async () => (await plano(page)).habitaciones[0].ancho).toBe(6);
  expect(cajaTotal(await mat(page)).maxX).toBeCloseTo(1.075, 3);                             // el 3D sigue igual
  await materializar(page);
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(true);
  const d = (await mat(page)).dialogo;
  expect(d.texto).toBe('Ya hay paredes materializadas. ¿Rematerializar? (se borrarán las generadas)');
  expect(d.nota).toBe('Si rematerializas, las paredes generadas se regenerarán. Las piezas 3D manuales no se tocan, pero las que estén dentro de paredes generadas pueden quedar flotando.');
  expect(d.boton).toBe('Rematerializar');
  await page.click('#plano-mat-conf-ok');
  await expect.poll(async () => cajaTotal(await mat(page)).maxX).toBeCloseTo(3.075, 3);
  const m1 = await mat(page);
  expect(m1.resumen.paredes).toBe(4);
  expect(m1.objeto.id).not.toBe(m0.objeto.id);
  expect((await escena(page)).objetos.filter(o => o.type === 'paredes_plano')).toHaveLength(1);   // las anteriores se borraron
  expect(m1.snapshot.habitaciones[0][3]).toBe(6);
});

// ── M8 · aviso al editar con paredes materializadas ──────────────────────────
test('M8 · al abrir el editor con paredes materializadas aparece el aviso, una sola vez por sesión', async ({ page }) => {
  const m = [['h1', -3, -2, 4, 3, []]];
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1], materializado: { v: 1, altura: 2.8, grosor: 0.15, alfeizar: 1, habitaciones: m } }) });
  expect((await mat(page)).activo).toBe(true);
  await abrirEditor(page);
  await expect(page.locator('#plano-mat-aviso')).toBeVisible();
  expect((await mat(page)).aviso.texto).toBe('El plano tiene paredes materializadas en 3D. Si editas el plano, el 3D se recalculará al rematerializar.');
  await cerrarEditor(page);
  await abrirEditor(page);
  await expect(page.locator('#plano-mat-aviso')).toBeHidden();                              // ya se mostró en esta sesión
  await cerrarEditor(page);
  expect(errores(reg)).toEqual([]);
});

test('M8b · sin paredes materializadas no hay aviso; materializar durante la sesión no lo dispara al reabrir en la misma sesión (solo con paredes cargadas)', async ({ page }) => {
  await conPlano(page, [H1]);
  await expect(page.locator('#plano-mat-aviso')).toBeHidden();
  await materializarYEsperar(page);
  await cerrarEditor(page);
  await abrirEditor(page);
  await expect(page.locator('#plano-mat-aviso')).toBeVisible();                             // hay paredes y aún no se había avisado en esta sesión
  await page.click('#plano-mat-aviso-cerrar');
  await expect(page.locator('#plano-mat-aviso')).toBeHidden();
});

// ── M9 · guardar y recargar ──────────────────────────────────────────────────
test('M9 · guardar → recargar conserva las paredes (mismo snapshot, mismas mallas) y las piezas manuales', async ({ page, context }) => {
  const reg = await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5), ventana('v2', 'este', 1)]), hab('h2', 1, -2, 3, 3)], [bloque(1, 5, 0, 5)]);
  const m0 = await materializarYEsperar(page);
  const put = await ultimoPutConPlano(reg, true);
  expect(put.progreso.plano.materializado).toEqual(m0.snapshot);
  expect(put.estado.progreso.plano.materializado).toEqual(m0.snapshot);
  expect(put.estado.objetos.map(o => o.type)).toEqual(['block']);                           // el objeto agregado NO se serializa como pieza
  const page2 = await context.newPage();
  const reg2 = await abrirSimulador(page2, { estado: put.estado, progreso: put.progreso });
  await page2.waitForFunction(() => window.__steamTest.resumenEscena().objetos.length === 2, null, { timeout: 120_000 });
  const m1 = await page2.evaluate(() => window.__steamTest.materializacion());
  expect(m1.activo).toBe(true);
  expect(m1.snapshot).toEqual(m0.snapshot);
  expect(m1.resumen).toEqual(m0.resumen);
  expect(nombres(m1)).toEqual(nombres(m0));
  expect(m1.mallas.map(x => [x.name, x.vertices, +x.min.x.toFixed(3), +x.max.z.toFixed(3)]))
    .toEqual(m0.mallas.map(x => [x.name, x.vertices, +x.min.x.toFixed(3), +x.max.z.toFixed(3)]));
  expect((await page2.evaluate(() => window.__steamTest.resumenEscena())).objetos.map(o => o.type).sort()).toEqual(['block', 'paredes_plano']);
  expect(errores(reg2)).toEqual([]);
  await page2.close();
});

// ── M10 · casa sin paredes materializadas → no se genera nada ────────────────
test('M10 · una casa con plano y habitaciones pero sin «materializado» carga sin generar paredes (ni al abrir el editor)', async ({ page }) => {
  const reg = await abrirCasa(page, [bloque(1, 5, 0, 5)], { plano: planoCon({ habitaciones: [H1] }) });
  await cuadros(page, 3);
  expect((await mat(page)).activo).toBe(false);
  expect((await escena(page)).objetos.map(o => o.type)).toEqual(['block']);
  expect((await escena(page)).mallas.filter(x => x.name.startsWith('pared_plano_'))).toEqual([]);
  await abrirEditor(page);
  await cuadros(page, 3);
  expect((await mat(page)).activo).toBe(false);
  expect((await mat(page)).aviso.visible).toBe(false);
  expect((await snap(page)).progreso.plano).not.toHaveProperty('materializado');
  expect(errores(reg)).toEqual([]);
});

// ── M11 · la cámara sigue funcionando ────────────────────────────────────────
test('M11 · con paredes generadas la cámara sigue orbitando con el ratón y con la rueda, y sigue con colisión activa', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await materializarYEsperar(page);
  await cerrarEditor(page);
  const c0 = await camara(page);
  expect(c0.colision).toBe(true);
  const box = await page.locator('canvas#c').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height * 0.8;                           // zona despejada del lienzo (lejos del panel y la barra)
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await camara(page)).alpha - c0.alpha), { timeout: 60_000 }).toBeGreaterThan(0.05);
  const r0 = (await camara(page)).radius;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, 400);
  await expect.poll(async () => (await camara(page)).radius, { timeout: 60_000 }).not.toBeCloseTo(r0, 1);
  expect(errores(reg)).toEqual([]);
});

// ── M12 · selección y gizmo de las piezas manuales ───────────────────────────
test('M12 · las paredes generadas no se seleccionan (ni en la lista ni con clic) y la selección, el gizmo y las teclas de las piezas manuales siguen funcionando', async ({ page }) => {
  const reg = await conPlano(page, [H1], [bloque(1, 4, 0, 4)]);
  await materializarYEsperar(page);
  await cerrarEditor(page);
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  const entrada = page.locator('#obj-items .obj-item', { hasText: 'Paredes del plano' });
  await expect(entrada).toHaveCount(1);
  await expect(entrada.locator('.obj-clone-hint')).toHaveCount(0);                           // sin botón de clonar
  await entrada.click();
  await cuadros(page, 3);
  expect(await seleccionado(page)).toBeNull();                                               // el clic en la lista no las selecciona
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(1);
  await expect.poll(async () => page.evaluate(() => document.getElementById('btnDel').style.display)).toBe('inline-block');
  const r0 = await page.evaluate(() => window.__steamTest.snapshot().estado.objetos[0].r[1]);
  await tecla(page, 'KeyE');                                                                 // E gira la pieza seleccionada
  await expect.poll(async () => page.evaluate(() => window.__steamTest.snapshot().estado.objetos[0].r[1]), { timeout: 60_000 }).toBeGreaterThan(r0);
  await entrada.click();                                                                     // tocar las paredes no cambia la selección
  await cuadros(page, 2);
  expect(await seleccionado(page)).toBe(1);
  // un clic sobre una pared generada atraviesa hasta lo que haya detrás (suelo → deselecciona), no selecciona nada
  const p = await page.evaluate(() => window.__steamTest.aPantalla(-1, 1.4, -2));          // pared sur (la que mira a la cámara), a media altura
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBeNull();
  expect(errores(reg)).toEqual([]);
});

// ── M13 · Apoyar sigue funcionando y las paredes no son apoyo (C4) ───────────
test('M13 · C4 · «Apoyar» sigue funcionando con paredes generadas; una pieza sobre una pared generada se clasifica por el suelo (no por la pared) y «Apoyar» la baja al suelo', async ({ page }) => {
  const reg = await conPlano(page, [H1], [bloque(1, 5, 0.5, 5), bloque(2, 1, 2.9, -0.5)]);   // 1: flotante sobre el suelo; 2: sobre la corona de la pared este (2.8)
  await materializarYEsperar(page);
  await cerrarEditor(page);
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(1);
  await expect(page.locator('#apoyar-btn')).toBeVisible({ timeout: 60_000 });
  await page.locator('#apoyar-btn').click();
  await expect.poll(async () => (await limites(page, 1)).min.y, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0, 3);
  // C4: la pieza 2 está a 2.9 m de altura sobre una pared generada: se clasifica como flotante respecto al suelo
  await page.locator('#obj-items .obj-item[onclick="selectFromList(2)"]').click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(2);
  await expect.poll(async () => page.evaluate(() => window.__steamTest.avisoColocacion().estado?.estado), { timeout: 120_000, intervals: [300] }).toBe('flotante');
  await expect(page.locator('#apoyar-btn')).toBeVisible();
  await page.locator('#apoyar-btn').click();
  await expect(page.locator('#apoyar-confirma-texto')).toHaveText('¿Apoyar la pieza a 2.9 m más abajo?');                     // Δ medido hasta el SUELO, no hasta la corona de la pared (0.1 m)
  await page.locator('#apoyar-confirma-si').click();
  await expect.poll(async () => (await limites(page, 2)).min.y, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0, 3);   // cae al suelo, no se queda sobre la pared
  expect(errores(reg)).toEqual([]);
});

// ── M14 · Desapoyar sigue funcionando ────────────────────────────────────────
test('M14 · «Desapoyar» (Shift+A) y su deshacer siguen funcionando con paredes generadas', async ({ page }) => {
  const reg = await conPlano(page, [H1], [bloque(1, 5, 0, 5)]);
  await materializarYEsperar(page);
  await cerrarEditor(page);
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(1);
  await expect(page.locator('#desapoyar-btn')).toBeEnabled({ timeout: 60_000 });
  await page.locator('#desapoyar-btn').click();
  await expect.poll(async () => (await limites(page, 1)).min.y, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0.5, 3);
  await expect(page.locator('#desapoyar-deshacer')).toBeVisible({ timeout: 60_000 });
  await page.locator('#desapoyar-deshacer').click();
  await expect.poll(async () => (await limites(page, 1)).min.y, { timeout: 120_000, intervals: [300] }).toBeCloseTo(0, 3);
  expect(errores(reg)).toEqual([]);
});

// ── M15 · los vanos del plano son la fuente de verdad ────────────────────────
test('M15 · los vanos del plano son la fuente de verdad: al ensanchar la puerta en el plano y rematerializar, el hueco cambia; las piezas puerta/ventana 3D del catálogo no intervienen', async ({ page }) => {
  await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5)])], [{ id: 1, type: 'puerta', p: [4, 0, 4], r: [0, 0, 0] }]);
  await materializarYEsperar(page);
  expect(await rayo(page, [-0.5, 1.0, 3], [-0.5, 1.0, -1])).toEqual(['pared_plano_2']);     // x = −0.5: fuera del hueco (−1.5…−0.7)
  await page.keyboard.press('v');
  const p = await pantalla(page, -1.1, 1);                                                    // clic sobre el vano para seleccionarlo
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await plano(page)).seleccionVano?.id).toBe('v1');
  await fijar(page, '#plano-vano-ancho', '1.2');                                              // el hueco pasa a −1.5…−0.3
  await expect.poll(async () => (await plano(page)).vanos[0].ancho).toBe(1.2);
  expect(await rayo(page, [-0.5, 1.0, 3], [-0.5, 1.0, -1])).toEqual(['pared_plano_2']);     // el 3D no cambia hasta rematerializar
  await materializar(page);
  await page.click('#plano-mat-conf-ok');
  await expect.poll(async () => (await mat(page)).snapshot.habitaciones[0][5][0][3]).toBe(1.2);
  expect(await rayo(page, [-0.5, 1.0, 3], [-0.5, 1.0, -1])).toEqual([]);                    // ahora sí es hueco
  expect(await rayo(page, [-0.2, 1.0, 3], [-0.2, 1.0, -1])).toEqual(['pared_plano_2']);     // y más allá de −0.3 sigue macizo
  expect((await escena(page)).objetos.filter(o => o.type === 'puerta')).toHaveLength(1);       // la puerta 3D manual no se tocó
});

// ── M16 · pared compartida = una sola ────────────────────────────────────────
test('M16 · dos habitaciones adyacentes comparten UNA pared física (sin paredes dobles) y los vanos de ambos lados abren hueco en ella', async ({ page }) => {
  await conPlano(page, [
    hab('h1', 0, 0, 4, 3, 'A', [puerta('v1', 'este', 1)]),
    hab('h2', 4, 0, 4, 3, 'B', [ventana('v1', 'oeste', 2, 0.6)]),
  ]);
  const m = await materializarYEsperar(page);
  const enX4 = m.mallas.filter(x => x.min.x > 3.9 && x.max.x < 4.1);
  expect(enX4).toHaveLength(1);                                                               // una sola malla entre ambas habitaciones
  expect(m.resumen).toMatchObject({ paredes: 7, vanos: 2 });
  expect(await rayo(page, [2, 1.0, 1.4], [6, 1.0, 1.4])).toEqual([]);                          // puerta de h1: z 1…1.8 → por el hueco a 1 m
  expect(await rayo(page, [2, 1.5, 2.3], [6, 1.5, 2.3])).toEqual([]);                          // ventana de h2: z 2…2.6, y 1…2.2
  expect(await rayo(page, [2, 0.5, 2.3], [6, 0.5, 2.3])).toHaveLength(1);                      // antepecho de la ventana
  expect(await rayo(page, [2, 1.0, 0.4], [6, 1.0, 0.4])).toHaveLength(1);                      // macizo
});

// ── M17 · 4N paredes menos las compartidas ───────────────────────────────────
test('M17 · N habitaciones → 4N paredes menos las compartidas: 3 en línea → 10', async ({ page }) => {
  await conPlano(page, [hab('h1', -6, -2, 3, 3), hab('h2', -3, -2, 3, 3), hab('h3', 0, -2, 3, 3)]);
  const m = await materializarYEsperar(page);
  expect(m.resumen.paredes).toBe(10);                                                         // 4·3 − 2 compartidas
  expect(m.mallas.filter(x => x.habitaciones.length === 2)).toHaveLength(2);
});

test('M17b · cuadrícula 2×2 → 12 paredes (4·4 − 4 compartidas)', async ({ page }) => {
  await conPlano(page, [hab('h1', -4, -3, 3, 3), hab('h2', -1, -3, 3, 3), hab('h3', -4, 0, 3, 3), hab('h4', -1, 0, 3, 3)]);
  const m = await materializarYEsperar(page);
  expect(m.resumen.paredes).toBe(12);
  expect(m.mallas.filter(x => x.habitaciones.length === 2)).toHaveLength(4);
});

test('M17c · dos habitaciones sin contacto → 8 paredes y ninguna compartida', async ({ page }) => {
  await conPlano(page, [hab('h1', -4, -2, 3, 3), hab('h2', 1, -2, 3, 3)]);
  const m = await materializarYEsperar(page);
  expect(m.resumen.paredes).toBe(8);
  expect(m.mallas.filter(x => x.habitaciones.length === 2)).toHaveLength(0);
});

// ── M18 · 50 habitaciones: tiempo y tamaño ───────────────────────────────────
function casaGrande(n, vanosPorHab) {
  const habs = [];
  for (let i = 0; i < n; i++) {
    const vs = [puerta('v1', 'norte', 1), ventana('v2', 'este', 1), ventana('v3', 'sur', 2)].slice(0, vanosPorHab);
    habs.push(hab(`h${i + 1}`, -20 + (i % 10) * 4, -12 + Math.floor(i / 10) * 4, 4, 4, `Habitación ${i + 1}`, vs));
  }
  return habs;
}
test('M18 · 50 habitaciones con 3 vanos cada una (150 vanos) se materializan en un tiempo razonable, se guardan por debajo de 100 KB y se recargan', async ({ page }) => {
  test.setTimeout(900_000);
  const reg = await conPlano(page, casaGrande(50, 3), [], { lote: { ancho: 50, largo: 30 } });
  await page.click('#plano-guardar');
  await expect.poll(() => reg.tamanos.length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  const bytesSin = reg.tamanos.at(-1);                                                       // PUT del mismo plano sin paredes materializadas
  const t0 = Date.now();
  await materializar(page);
  await esperarMat(page, true);
  const total = Date.now() - t0;
  const m = await mat(page);
  expect(m.resumen.paredes).toBeGreaterThan(100);
  expect(m.resumen.vanos).toBe(150);
  expect(m.ms).toBeLessThan(30_000);
  expect(m.msTotal).toBeLessThan(30_000);
  const put = await ultimoPutConPlano(reg, true);
  const bytes = reg.tamanos.at(-1);
  console.log(`MEDIDO M18: 50 habitaciones, 150 vanos → ${m.resumen.paredes} paredes, ${m.resumen.rectangulos} rectángulos, mallas 3D ${Math.round(m.ms)} ms, Materializar completo ${Math.round(m.msTotal)} ms (clic→objeto visto desde el navegador ${total} ms, con renderizado a ~1,5 FPS); PUT sin paredes = ${bytesSin} bytes (${(bytesSin / 1024).toFixed(1)} KB), con paredes = ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB, +${bytes - bytesSin} B); materializado = ${JSON.stringify(put.progreso.plano.materializado).length} bytes`);
  test.info().annotations.push({ type: 'medido', description: `50 hab/150 vanos: ${m.resumen.paredes} paredes, ${m.resumen.rectangulos} rectángulos, ${Math.round(m.ms)} ms, PUT ${bytes} B` });
  expect(bytes).toBeLessThan(100 * 1024);
  expect(m.ms).toBeLessThan(30_000);
  expect(errores(reg)).toEqual([]);
});

test('M18b · caso real: 10 habitaciones con 30 vanos — tiempo de generación y tamaño del PUT con y sin paredes (medido)', async ({ page }) => {
  const habs = casaGrande(10, 3);
  const reg = await conPlano(page, habs, [], { lote: { ancho: 50, largo: 30 } });
  await page.click('#plano-guardar');
  await expect.poll(() => reg.tamanos.length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  const bytesSin = reg.tamanos.at(-1);
  const n0 = reg.tamanos.length;
  await materializar(page);
  await esperarMat(page, true);
  await expect.poll(() => reg.tamanos.length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(n0);
  const bytesCon = reg.tamanos.at(-1);
  const m = await mat(page);
  console.log(`MEDIDO M18b: 10 habitaciones, 30 vanos → ${m.resumen.paredes} paredes, ${m.resumen.rectangulos} rectángulos, mallas 3D ${Math.round(m.ms)} ms, Materializar completo ${Math.round(m.msTotal)} ms; PUT sin paredes ${bytesSin} B (${(bytesSin / 1024).toFixed(1)} KB), con paredes ${bytesCon} B (${(bytesCon / 1024).toFixed(1)} KB), incremento ${bytesCon - bytesSin} B`);
  test.info().annotations.push({ type: 'medido', description: `10 hab/30 vanos: ${m.resumen.paredes} paredes, ${m.resumen.rectangulos} rect, ${Math.round(m.ms)} ms, PUT ${bytesSin} → ${bytesCon} B` });
  expect(m.resumen.vanos).toBe(30);
  expect(bytesCon).toBeGreaterThan(bytesSin);
  expect(bytesCon).toBeLessThan(100 * 1024);
});

// ── P5 · salvaguarda de tamaño ───────────────────────────────────────────────
test('P5 · si el guardado con paredes superaría 90 KB no se materializa: aviso y nada se genera (el 3D y lo guardado quedan como estaban)', async ({ page }) => {
  test.setTimeout(900_000);
  const grande = leerCasa('casa_500_objetos');
  const elementos = Array.from({ length: 600 }, (_, i) => ({ id: i + 1, tipo: 'punto', x: (i % 40) / 4 - 5, z: Math.floor(i / 40) / 4 - 3 }));
  const progreso = { ...grande.progreso, plano: planoCon({ habitaciones: casaGrande(50, 3), elementos, contador: 601, lote: { ancho: 50, largo: 30 } }) };
  const estado = { ...grande.estado, progreso };
  const reg = await abrir(page, { estado, progreso });
  await page.waitForFunction(() => window.__steamTest.resumenEscena().objetos.length > 100, null, { timeout: 180_000 });
  await abrirEditor(page);
  const guardadoAntes = JSON.stringify((await plano(page)).guardado);
  await materializar(page);
  await expect.poll(() => page.locator('#plano-tip').isVisible(), { timeout: 60_000 }).toBe(true);
  const tip = await page.locator('#plano-tip').textContent();
  console.log(`MEDIDO P5: aviso = «${tip}»`);
  expect(tip).toMatch(/límite es 90 KB: no se materializó/);
  expect((await mat(page)).activo).toBe(false);
  expect((await escena(page)).objetos.filter(o => o.type === 'paredes_plano')).toEqual([]);
  expect(JSON.stringify((await plano(page)).guardado)).toBe(guardadoAntes);
  expect((await snap(page)).progreso.plano).not.toHaveProperty('materializado');
  expect(errores(reg)).toEqual([]);
});

// ── M19 · formato del guardado v2 intacto ────────────────────────────────────
test('M19 · guardado v2 intacto: mismas claves en estado y progreso; lo único nuevo es plano.materializado (aditivo) y el objeto agregado no se serializa como pieza', async ({ page }) => {
  const reg = await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5)])], [bloque(1, 5, 0, 5)]);
  await page.click('#plano-guardar');
  const sin = await ultimoPutConPlano(reg, false);
  await materializarYEsperar(page);
  const con = await ultimoPutConPlano(reg, true);
  expect(Object.keys(con).sort()).toEqual(Object.keys(sin).sort());                         // {proyecto_id, slot, estado, progreso}
  expect(Object.keys(con.estado).sort()).toEqual(Object.keys(sin.estado).sort());          // v, objetos, contador, progreso, terreno, hitos
  expect(con.estado.v).toBe(2);
  expect(Object.keys(con.progreso).sort()).toEqual(Object.keys(sin.progreso).sort());
  expect(Object.keys(con.progreso.plano).sort()).toEqual([...Object.keys(sin.progreso.plano), 'materializado'].sort());
  expect(con.progreso.plano.habitaciones).toEqual(sin.progreso.plano.habitaciones);
  expect(con.estado.objetos).toEqual(sin.estado.objetos);                                   // ni una pieza más ni distinta
  expect(con.estado.terreno).toEqual(sin.estado.terreno);
  expect(con.progreso.plano.materializado).toEqual({
    v: 1, altura: 2.8, grosor: 0.15, alfeizar: 1,
    habitaciones: [['h1', -3, -2, 4, 3, [['puerta', 'norte', 1.5, 0.8, 2.1]]]],
  });
  for (const k of Object.keys(con.progreso)) if (k !== 'plano') expect(con.progreso[k]).toEqual(sin.progreso[k]);
  expect(JSON.stringify(con.progreso).match(/materializado/g)).toHaveLength(1);              // solo dentro de progreso.plano
  expect(errores(reg)).toEqual([]);
});

// ── M20 · identificar las paredes generadas ──────────────────────────────────
test('M20 · las paredes generadas se identifican: objeto «paredes_plano», mallas pared_plano_N con su id y sus habitaciones, y una sola entrada en la lista', async ({ page }) => {
  await conPlano(page, [hab('h1', 0, 0, 4, 3), hab('h2', 4, 0, 4, 3)], [bloque(1, 5, 0, 5)]);
  const m = await materializarYEsperar(page);
  expect(m.objeto).toMatchObject({ type: 'paredes_plano', label: 'Paredes del plano' });
  expect(m.objeto.nombre).toMatch(/^obj_\d+_paredes_plano$/);
  expect(nombres(m)).toEqual([1, 2, 3, 4, 5, 6, 7].map(i => `pared_plano_${i}`));
  expect(m.mallas.every(x => /^p\d+$/.test(x.pared) && x.habitaciones.length >= 1)).toBe(true);
  expect(m.mallas.every(x => x.pickable === false && x.colision === true)).toBe(true);
  await cerrarEditor(page);
  await expect(page.locator('#obj-items .obj-item', { hasText: 'Paredes del plano' })).toHaveCount(1);
  expect(m.solidosCamara).toContain('paredes_plano');
  const s = await escena(page);
  expect(s.paredes).toBe(0);                                                                  // countWalls: no cuentan como paredes del alumno
});

// ── M21 · piezas manuales dentro de las paredes ──────────────────────────────
test('M21 · las piezas manuales colocadas dentro o sobre las paredes generadas no se borran ni se mueven al desmaterializar o rematerializar', async ({ page }) => {
  const reg = await conPlano(page, [H1], [bloque(1, 1, 0, -0.5), bloque(2, -3, 0, 0)]);       // 1 y 2 coinciden con las paredes este y oeste
  const antes = [await limites(page, 1), await limites(page, 2)];
  await materializarYEsperar(page);
  expect([await limites(page, 1), await limites(page, 2)]).toEqual(antes);                    // no colisionan: no se apartan al generar
  await materializar(page);
  await page.click('#plano-mat-conf-ok');                                                     // rematerializar
  await cuadros(page, 3);
  expect([await limites(page, 1), await limites(page, 2)]).toEqual(antes);
  await page.click('#plano-desmaterializar');
  await page.click('#plano-mat-conf-ok');
  await esperarMat(page, false);
  expect((await escena(page)).objetos.map(o => o.type)).toEqual(['block', 'block']);
  expect([await limites(page, 1), await limites(page, 2)]).toEqual(antes);
  expect(errores(reg)).toEqual([]);
});

// ── M22 · el aviso de rematerializar solo existe si hay paredes ──────────────
test('M22 · el aviso de rematerializar solo aparece si ya hay paredes; «Cancelar» y Esc no cambian nada', async ({ page }) => {
  await conPlano(page, [H1]);
  await materializar(page);
  await esperarMat(page, true);
  expect((await mat(page)).dialogo.visible).toBe(false);                                      // primera vez: sin diálogo
  const id0 = (await mat(page)).objeto.id;
  await materializar(page);
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(true);
  expect((await mat(page)).dialogo.nota).toMatch(/Las piezas 3D manuales no se tocan/);
  await page.click('#plano-mat-conf-cancelar');
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(false);
  expect((await mat(page)).objeto.id).toBe(id0);
  await materializar(page);
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(true);
  await page.keyboard.press('Escape');                                                        // Esc cancela el diálogo sin cerrar el editor
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(false);
  expect((await plano(page)).abierto).toBe(true);
  expect((await mat(page)).objeto.id).toBe(id0);
  await page.click('#plano-desmaterializar');
  await expect.poll(async () => (await mat(page)).dialogo.visible).toBe(true);
  expect((await mat(page)).dialogo.nota).toBe('');                                            // desmaterializar no lleva la nota de flotantes
  await page.click('#plano-mat-conf-cancelar');
  expect((await mat(page)).activo).toBe(true);
});

// ── M23 · plano sin habitaciones o corrupto ──────────────────────────────────
test('M23 · un plano sin habitaciones o con habitaciones corruptas avisa y no genera nada', async ({ page }) => {
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: 'basura', elementos: [{ id: 1, tipo: 'punto', x: 0, z: 0 }], contador: 2 }) });
  await abrirEditor(page);
  await materializar(page);
  await expect(page.locator('#plano-tip')).toBeVisible();
  await expect(page.locator('#plano-tip')).toContainText('El plano no tiene habitaciones');
  await expect(page.locator('#plano-tip')).toContainText('No se generó ninguna pared');
  expect((await mat(page)).activo).toBe(false);
  expect((await escena(page)).objetos).toEqual([]);
  expect((await mat(page)).dialogo.visible).toBe(false);
  expect((await snap(page)).progreso.plano).not.toHaveProperty('materializado');
  expect(errores(reg)).toEqual([]);
});

test('M23b · un «materializado» corrupto guardado se descarta al cargar (no rompe, no genera, no se conserva); sin plano tampoco genera', async ({ page }) => {
  const reg = await abrirCasa(page, [bloque(1, 5, 0, 5)], { plano: planoCon({ habitaciones: [H1], materializado: { v: 1, habitaciones: 'x' } }) }, 1);   // el corrupto no genera objeto agregado
  await cuadros(page, 3);
  expect((await mat(page)).activo).toBe(false);
  expect((await snap(page)).progreso.plano).not.toHaveProperty('materializado');
  expect((await escena(page)).objetos.map(o => o.type)).toEqual(['block']);
  expect(errores(reg)).toEqual([]);
});

// ── M24 · vanos fuera de la pared ────────────────────────────────────────────
test('M24 · un vano que sobresale de la pared se recorta y uno totalmente fuera no abre hueco: la materialización avisa y no falla', async ({ page }) => {
  const reg = await conPlano(page, [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 3.5), puerta('v2', 'sur', 9), ventana('v3', 'oeste', 0.2)])]);
  const m = await materializarYEsperar(page);
  expect(m.resumen).toMatchObject({ paredes: 4, vanos: 2, recortados: 1, sinHueco: 1 });
  expect(m.texto).toContain('4 paredes generadas, 2 vanos');
  expect(m.texto).toContain('1 vano recortado por la pared');
  expect(m.texto).toContain('1 vano fuera de las paredes (sin hueco)');
  expect(await rayo(page, [0.8, 1.0, 3], [0.8, 1.0, -1])).toEqual([]);                       // la puerta que sobresale abre hueco hasta el final de la pared (x 0.5…1)
  expect(await rayo(page, [0.2, 1.0, 3], [0.2, 1.0, -1])).toEqual(['pared_plano_2']);         // el resto de la pared sigue maciza
  expect(errores(reg)).toEqual([]);
});

// ── C1 · sanearPlano conserva «materializado» ────────────────────────────────
test('C1 · el plano guardado conserva «materializado» (con campo), no lo inventa (sin campo) y el editor no lo pierde al guardar cambios del plano', async ({ page }) => {
  const mat0 = { v: 1, altura: 2.8, grosor: 0.15, alfeizar: 1, habitaciones: [['h1', -3, -2, 4, 3, [['puerta', 'norte', 1.5, 0.8, 2.1]]]] };
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5)])], materializado: mat0 }) });
  expect((await plano(page)).guardado.materializado).toEqual(mat0);                          // conservar con campo
  expect((await mat(page)).activo).toBe(true);
  expect((await snap(page)).progreso.plano.materializado).toEqual(mat0);
  await abrirEditor(page);
  await page.keyboard.press('v');
  await clic(page, -1, -0.5);
  await fijar(page, '#plano-hab-nombre', 'Salón');                                           // edición del plano (el 3D no se recalcula solo)
  await page.click('#plano-guardar');
  const put = await ultimoPutConPlano(reg, true);
  expect(put.progreso.plano.materializado).toEqual(mat0);                                    // el plano editado conserva lo materializado
  expect(put.progreso.plano.habitaciones[0].nombre).toBe('Salón');
  expect((await mat(page)).snapshot).toEqual(mat0);
});

test('C1b · sin campo «materializado» no se genera nada ni se crea el campo al guardar', async ({ page }) => {
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1] }) });
  expect((await plano(page)).guardado).not.toHaveProperty('materializado');
  expect((await mat(page)).activo).toBe(false);
  await abrirEditor(page);
  await page.keyboard.press('v');
  await clic(page, -1, -0.5);
  await fijar(page, '#plano-hab-nombre', 'Sala 2');
  await page.click('#plano-guardar');
  const put = await ultimoPutConPlano(reg, false);
  expect(put.progreso.plano).not.toHaveProperty('materializado');
  expect((await mat(page)).activo).toBe(false);
});

// ── C2 · MergeMeshes + checkCollisions ───────────────────────────────────────
test('C2 · las mallas fundidas (MergeMeshes) tienen checkCollisions y la cámara no atraviesa las paredes; con Rayos X sí las atraviesa', async ({ page }) => {
  test.setTimeout(600_000);
  const reg = await conPlano(page, [H1]);
  const m = await materializarYEsperar(page);
  expect(m.mallas.every(x => x.colision === true)).toBe(true);
  expect(m.mallas.every(x => x.vertices === 24 && x.indices === 36)).toBe(true);              // cada pared sin huecos es 1 caja fundida (24 vértices)
  await cerrarEditor(page);
  // la cámara está fuera de la sala, al este de la pared x = 1 (grosor 0.15 → cara exterior en 1.075)
  const colocar = (x) => page.evaluate(px => {
    const alpha = 0, beta = Math.PI / 2 - 0.02, radius = 2;
    window.__steamTest.fijarCamara({ target: { x: px - radius * Math.sin(beta), y: 1.0 - radius * Math.cos(beta), z: -0.5 }, alpha, beta, radius });
  }, x);
  await colocar(4);
  await cuadros(page, 4);
  const fuera = await camara(page);
  expect(fuera.posicion.x).toBeGreaterThan(3.5);
  await colocar(-1);                                                                          // la «teletransportamos» al interior, cruzando la pared este
  await expect.poll(async () => (await camara(page)).posicion.x, { timeout: 60_000 }).toBeGreaterThan(1.0);
  await cuadros(page, 6);
  const tras = await camara(page);
  console.log(`MEDIDO C2: cámara teletransportada de x=${fuera.posicion.x.toFixed(2)} a x=-1 queda en x=${tras.posicion.x.toFixed(3)} (pared este en x=1, cara exterior 1.075, radio de colisión 0.35)`);
  expect(tras.posicion.x).toBeGreaterThan(1.075);                                             // se detiene al otro lado de la pared
  // Rayos X: la cámara atraviesa
  await page.click('#btnRayosX');
  await expect.poll(async () => (await camara(page)).colision).toBe(false);
  await colocar(4); await cuadros(page, 4);
  await colocar(-1);
  await expect.poll(async () => (await camara(page)).posicion.x, { timeout: 60_000 }).toBeLessThan(0);
  expect((await camara(page)).rayosX).toBe(true);
  expect(errores(reg)).toEqual([]);
});

// ── C5 · la cámara puede ver el interior desde arriba ────────────────────────
test('C5 · desde arriba (beta mínima de la cámara) se ve el interior de la sala sin que ninguna pared generada tape la vista; a ras de suelo sí la tapan', async ({ page }) => {
  await conPlano(page, [H1]);
  await materializarYEsperar(page);
  await cerrarEditor(page);
  const centro = { x: -1, y: 0.05, z: -0.5 };                                                  // suelo en el centro de la sala
  // vista cenital: beta mínima (0.18 rad) desde 15 m
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: -1, y: 0, z: -0.5 }, alpha: -Math.PI / 2, beta: 0.18, radius: 15 }));
  await cuadros(page, 4);
  const alta = await camara(page);
  expect(alta.beta).toBeCloseTo(0.18, 2);
  expect(await page.evaluate(([x, y, z]) => window.__steamTest.lineaVisual(x, y, z), [centro.x, centro.y, centro.z])).toEqual([]);
  for (const [x, z] of [[-2.5, -1.5], [0.5, -1.5], [-2.5, 0.5], [0.5, 0.5]]) {                // y las cuatro esquinas interiores
    expect(await page.evaluate(([a, b]) => window.__steamTest.lineaVisual(a, 0.05, b), [x, z])).toEqual([]);
  }
  // vista casi horizontal desde fuera y cerca: las paredes sí la tapan (por eso Rayos X existe)
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: -1, y: 0.5, z: -0.5 }, alpha: -Math.PI / 2, beta: Math.PI / 2 - 0.02, radius: 6 }));
  await cuadros(page, 4);
  const baja = await camara(page);
  expect(baja.posicion.z).toBeLessThan(-2.075);
  const tapan = await page.evaluate(([x, y, z]) => window.__steamTest.lineaVisual(x, y, z), [centro.x, 0.5, centro.z]);
  console.log(`MEDIDO C5: vista cenital (beta 0.18, 15 m) → paredes que tapan el suelo de la sala: ${alta ? 0 : '?'}; vista a ras (beta 1.55, 6 m, fuera de la sala) → ${JSON.stringify(tapan)}`);
  expect(tapan).toEqual(['pared_plano_1']);
});

// ── Prueba extra: borrar piezas / lámpara / excavación no interfieren ────────
test('X1 · el botón «Programar», el contador de paredes y los avisos de colocación no cambian por las paredes generadas', async ({ page }) => {
  const reg = await conPlano(page, [H1], [bloque(1, 5, 0, 5)]);
  const antes = await escena(page);
  await materializarYEsperar(page);
  const despues = await escena(page);
  expect(despues.paredes).toBe(antes.paredes);
  expect(despues.puertas).toBe(antes.puertas);
  expect(despues.ventanas).toBe(antes.ventanas);
  await cerrarEditor(page);
  await expect(page.locator('#wall-counter-badge')).toBeHidden();                              // fase ≥ 4: oculto, como antes
  expect(errores(reg)).toEqual([]);
});

// ── X2 · vista de solo lectura (maestro viendo a un alumno) ──────────────────
test('X2 · en la vista de solo lectura (?alumno=) las paredes materializadas se generan, pero los botones de materializar y desmaterializar están desactivados y no hay aviso de edición', async ({ page }) => {
  const mat0 = { v: 1, altura: 2.8, grosor: 0.15, alfeizar: 1, habitaciones: [['h1', -3, -2, 4, 3, [['puerta', 'norte', 1.5, 0.8, 2.1]]]] };
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [hab('h1', -3, -2, 4, 3, 'Sala', [puerta('v1', 'norte', 1.5)])], materializado: mat0 }) });
  await page.goto('/sandbox.html?proyecto=1&steamTest=1&alumno=7');                          // las rutas simuladas de la página siguen activas
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  await page.waitForFunction(() => window.__steamTest.resumenEscena().objetos.length === 1, null, { timeout: 120_000 });
  const m = await mat(page);
  expect(m.activo).toBe(true);
  expect(m.resumen).toMatchObject({ paredes: 4, vanos: 1 });
  await page.evaluate(() => window.openPlanoEditor());
  await expect.poll(async () => (await plano(page)).abierto).toBe(true);
  await expect(page.locator('#plano-materializar')).toBeDisabled();
  await expect(page.locator('#plano-desmaterializar')).toBeDisabled();
  await expect(page.locator('#plano-mat-aviso')).toBeHidden();
  await page.evaluate(() => document.getElementById('plano-materializar').click());          // aunque se fuerce el clic, no hace nada
  await cuadros(page, 2);
  expect((await mat(page)).dialogo.visible).toBe(false);
  expect((await mat(page)).objeto.id).toBe(m.objeto.id);
  expect(errores(reg).filter(e => !/alumno|meta|sync|Failed to fetch/i.test(e))).toEqual([]);
});
