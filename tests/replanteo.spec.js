// F5 · Replanteo básico — pruebas con navegador: el botón «Replantear» del editor del plano coloca una estaca en cada esquina única de las habitaciones
// GUARDADAS y numera los ejes (1, 2, 3… oeste→este; A, B, C… sur→norte); el panel muestra, por habitación, 4 lados, 2 diagonales y la escuadra 3-4-5 con
// medido, calculado, E, T = D·ER y veredicto (E > T → repetir). La desviación de cada estaca es texto numérico validado (C1); ver/ocultar (C2); T con su
// fórmula (C3); «Sin replanteo» / «vigente» / «desactualizado» (C4). La superposición está fuera de objList y se guarda en progreso.replanteo (aditivo).
// La API se simula (tests/helpers.js). Los helpers se DUPLICAN de plano_3d.spec.js (las pruebas anteriores no se tocan). Sin GPU el simulador corre a
// ~1,5 FPS: las esperas son por condición. El WebSocket de recarga en caliente de Vite es ruido del entorno y se filtra solo aquí.
import { test, expect } from '@playwright/test';
import { abrirSimulador } from './helpers.js';

test.describe.configure({ timeout: 420_000 });

const PROGRESO = {
  buildPhase: 4, concretoUnlocked: true, matematicasValidadas: true,
  puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off',
};
const casa = (objetos, extra = {}) => {
  const progreso = { ...PROGRESO, ...extra };
  return { estado: { v: 2, objetos, contador: objetos.length + 1, progreso, terreno: { excavacion: extra.excavacion ?? null }, hitos: {} }, progreso };
};
const hab = (id, x, z, ancho, largo, nombre = `Habitación ${id.slice(1)}`) => ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre });
const planoCon = (extra = {}) => ({
  v: 1, lote: { ancho: 10, largo: 10 }, rejilla: { visible: false, paso: 0.5 }, elementos: [], contador: 1, ...extra,
});
const H1 = hab('h1', -3, -2, 4, 3, 'Sala');            // 4 m (este-oeste) × 3 m (norte-sur)
const H2 = hab('h2', 1, -2, 4, 3, 'Cocina');           // comparte con Sala el lado x = 1

const plano = page => page.evaluate(() => window.__steamTest.plano());
const mat = page => page.evaluate(() => window.__steamTest.materializacion());
const snap = page => page.evaluate(() => window.__steamTest.snapshot());
const escena = page => page.evaluate(() => window.__steamTest.resumenEscena());
const rep = page => page.evaluate(() => window.__steamTest.replanteo());
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const overlay = page => page.locator('#plano-overlay');
const pantalla = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.planoAPantalla(a, b), [x, z]);
const errores = reg => reg.errores.filter(e => !/WebSocket connection to 'ws:\/\/localhost/.test(e));
const dev = (id, eje) => `input.rep-dev[data-estaca="${id}"][data-eje="${eje}"]`;
const mallaPorNombre = (r, nombre) => r.mallas.find(m => m.name === nombre);

async function abrir(page, opciones = {}) {
  const reg = await abrirSimulador(page, opciones);
  reg.tamanos = [];
  page.on('request', r => {
    if (r.method() === 'PUT' && /\/api\/guardado$/.test(new URL(r.url()).pathname)) reg.tamanos.push(Buffer.byteLength(r.postData() || ''));
  });
  return reg;
}
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
async function fijar(page, selector, valor) {
  await page.fill(selector, valor);
  await page.press(selector, 'Enter');
}
/** Casa con un plano guardado y el editor abierto. */
async function conPlano(page, habs, extra = {}, extraPlano = {}) {
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: habs, ...extraPlano }), ...extra });
  await abrirEditor(page);
  return reg;
}
async function replantear(page) {
  await page.click('#plano-replantear');
  await expect.poll(async () => (await rep(page)).estacas.length, { timeout: 60_000 }).toBeGreaterThan(0);
}
/** Filas de la tabla de medidas: clase, celdas y tooltip. */
const filas = page => page.$$eval('#replanteo-medidas tbody tr', trs => trs.map(tr => ({
  cls: tr.className, celdas: [...tr.children].map(c => c.textContent.trim()), title: tr.title,
})));
const fila = async (page, nombre) => (await filas(page)).find(f => f.celdas[0] === nombre);

// ── R1 · C4 · sin replanteo ──────────────────────────────────────────────────
test('R1 · sin replanteo: «Sin replanteo», «Ocultar» desactivado, panel oculto, nada en 3D y el guardado no tiene la clave progreso.replanteo', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Sin replanteo');
  await expect(page.locator('#plano-replantear')).toHaveText('📐 Replantear');
  await expect(page.locator('#plano-replantear')).toBeEnabled();
  await expect(page.locator('#plano-replanteo-ver')).toBeDisabled();
  await expect(page.locator('#replanteo-panel')).toBeHidden();
  const r = await rep(page);
  expect(r).toMatchObject({ estacas: [], activo: false, visible: false, estado: 'sin_replanteo', enObjList: false });
  expect(Object.keys((await snap(page)).progreso)).not.toContain('replanteo');
  expect(errores(reg)).toEqual([]);
});

// ── R2 · 5a · estacas en las esquinas, ejes numerados, fuera de objList ───────
test('R2 · 5a: dos habitaciones adyacentes → 6 estacas (la pared compartida cuenta una vez) A1…B3, ejes 1-3 y A-B, postes en su esquina, fuera de objList y sin colisión', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2]);
  await replantear(page);
  const r = await rep(page);
  expect(r.estacas.map(e => e.id)).toEqual(['A1', 'B1', 'A2', 'B2', 'A3', 'B3']);
  expect(r.estacas.map(e => [e.x, e.z])).toEqual([[-3000, -2000], [-3000, 1000], [1000, -2000], [1000, 1000], [5000, -2000], [5000, 1000]]);
  expect(r.estado).toBe('vigente');
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Replanteo vigente');
  await expect(page.locator('#plano-replantear')).toHaveText('📐 Volver a replantear');
  await expect(page.locator('#replanteo-panel')).toBeVisible();
  await expect(page.locator('#plano-replanteo-ver')).toBeEnabled();
  const nombres = r.mallas.map(m => m.name);
  for (const e of r.estacas) for (const s of ['poste', 'cabeza', 'etq']) expect(nombres).toContain(`estaca_${e.id}_${s}`);
  for (const n of ['eje_lineas', 'eje_col_1', 'eje_col_2', 'eje_col_3', 'eje_fila_A', 'eje_fila_B']) expect(nombres).toContain(n);
  expect(nombres.every(n => /^(estaca_|eje_)/.test(n))).toBe(true);
  expect(r.mallas.every(m => m.pickable === false && m.colision === false)).toBe(true);
  expect(r.enObjList).toBe(false);
  expect((await escena(page)).objetos).toEqual([]);                                         // ni una pieza nueva en el panel de piezas / Programar
  expect(mallaPorNombre(r, 'estaca_A1_poste')).toMatchObject({ x: -3, y: 0.3, z: -2 });
  expect(mallaPorNombre(r, 'estaca_B3_poste')).toMatchObject({ x: 5, z: 1 });
  expect(mallaPorNombre(r, 'estaca_A1_cabeza').y).toBeCloseTo(0.65, 5);
  await expect(page.locator('#plano-tip')).toContainText('6 estacas');
  expect(errores(reg)).toEqual([]);
});

// ── R3 · el replanteo se hace sobre el plano guardado ────────────────────────
test('R3 · con cambios sin guardar en el plano no se replantea: avisa «Guarda el plano antes de replantear» y no crea estacas', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await fijar(page, '#plano-lote-ancho', '12');
  await expect.poll(async () => (await plano(page)).cambios).toBe(true);
  await page.click('#plano-replantear');
  await expect(page.locator('#plano-tip')).toContainText('Guarda el plano antes de replantear');
  expect((await rep(page)).estacas).toEqual([]);
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Sin replanteo');
  expect(errores(reg)).toEqual([]);
});

test('R3b · un plano guardado sin habitaciones no se replantea', async ({ page }) => {
  const reg = await conPlano(page, []);
  await page.click('#plano-replantear');
  await expect(page.locator('#plano-tip')).toContainText('no tiene habitaciones');
  expect((await rep(page)).estacas).toEqual([]);
  expect(errores(reg)).toEqual([]);
});

// ── R4 · C1 · desviación válida ──────────────────────────────────────────────
test('R4 · C1: una desviación válida (3 mm) mueve la estaca en 3D, se guarda y la tabla marca el lado sur como «Repetir la medición» (E = 3 mm > T = 0,8 mm)', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await replantear(page);
  await fijar(page, dev('A2', 'dx'), '3');
  await expect.poll(async () => (await rep(page)).estacas.find(e => e.id === 'A2').dx).toBe(3);
  const r = await rep(page);
  expect(r.aviso).toBe('');
  expect(mallaPorNombre(r, 'estaca_A2_poste').x).toBeCloseTo(1.003, 6);
  expect(mallaPorNombre(r, 'estaca_A2_poste').z).toBeCloseTo(-2, 6);
  const sur = await fila(page, 'Lado sur');
  expect(sur.celdas.slice(1)).toEqual(['4.0030', '4.0000', '0.0030', '0.0008', '✗ Repetir la medición']);
  expect(sur.cls).toBe('repetir');
  const p = (await snap(page)).progreso.replanteo;
  expect(p.e).toContainEqual([1000, -2000, 3, 0]);
  expect(errores(reg)).toEqual([]);
});

// ── R5 · C1 · desviación inválida o fuera de rango ───────────────────────────
test('R5 · C1: «abc» no se aplica (se restaura el valor y avisa), «5000» se recorta a 1000, «-5000» a −1000 y «2,5» se redondea a 3', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await replantear(page);
  const campo = page.locator(dev('A2', 'dx'));
  await fijar(page, dev('A2', 'dx'), '12');
  await expect.poll(async () => (await rep(page)).estacas.find(e => e.id === 'A2').dx).toBe(12);
  await fijar(page, dev('A2', 'dx'), 'abc');
  await expect(campo).toHaveValue('12');
  await expect(page.locator('#replanteo-aviso')).toBeVisible();
  await expect(page.locator('#replanteo-aviso')).toContainText('solo números');
  expect((await rep(page)).estacas.find(e => e.id === 'A2').dx).toBe(12);
  expect((await snap(page)).progreso.replanteo.e).toContainEqual([1000, -2000, 12, 0]);
  await fijar(page, dev('A2', 'dx'), '5000');
  await expect(campo).toHaveValue('1000');
  await expect(page.locator('#replanteo-aviso')).toContainText('Máximo ±1000 mm');
  expect((await rep(page)).estacas.find(e => e.id === 'A2').dx).toBe(1000);
  await fijar(page, dev('A2', 'dx'), '-5000');
  await expect(campo).toHaveValue('-1000');
  await fijar(page, dev('A2', 'dx'), '2,5');
  await expect(campo).toHaveValue('3');
  await expect(page.locator('#replanteo-aviso')).toBeHidden();
  await fijar(page, dev('A2', 'dx'), '');
  await expect(campo).toHaveValue('0');
  expect(errores(reg)).toEqual([]);
});

// ── R6 · 5b + C3 · tabla de medidas con T y su fórmula ───────────────────────
test('R6 · 5b y C3: por habitación 4 lados, 2 diagonales y 8 escuadras; la diagonal de 4×4 da T = 0,0011 m y cada fila lleva la fórmula T = D × ER, ER = 1/5000 (Zamarripa, p. 19)', async ({ page }) => {
  const reg = await conPlano(page, [hab('h1', -2, -2, 4, 4, 'Cuarto'), hab('h2', 3, -2, 2, 3, 'Baño')]);
  await replantear(page);
  const todas = await filas(page);
  expect(todas.filter(f => /^(ok|repetir|na)$/.test(f.cls)).length).toBe(14);                // 4 + 2 + 8
  const lados = todas.filter(f => /^Lado /.test(f.celdas[0]));
  expect(lados.map(f => f.celdas.slice(1, 3))).toEqual([['4.0000', '4.0000'], ['4.0000', '4.0000'], ['4.0000', '4.0000'], ['4.0000', '4.0000']]);
  const diag = await fila(page, 'Diagonal SO–NE');
  expect(diag.celdas.slice(1)).toEqual(['5.6569', '5.6569', '0.0000', '0.0011', '✓ Se acepta']);
  expect(diag.title).toBe('T = D × ER, con ER = 1/5000 (Zamarripa, 2012, p. 19)');
  const e1 = await fila(page, 'Esquina SO · 3-4-5 (3 en x, 4 en z) ×1');
  expect(e1.celdas.slice(1, 3)).toEqual(['5.0000', '5.0000']);
  await expect(page.locator('#replanteo-resumen')).toHaveText('Las 14 medidas están dentro de la tolerancia.');
  await expect(page.locator('#replanteo-nota')).toContainText('T = D × ER, con ER = 1/5000 (Zamarripa, 2012, p. 19)');
  await expect(page.locator('#replanteo-nota')).toContainText('E > T');
  await expect(page.locator('#replanteo-nota')).toContainText('3-4-5');
  // el baño (2×3) no admite escuadra 3-4-5: sus 8 filas son «No aplicable» y el resumen cuenta 6 medidas
  await page.selectOption('#replanteo-hab', 'h2');
  await expect(page.locator('#replanteo-resumen')).toHaveText('Las 6 medidas están dentro de la tolerancia.');
  const bano = await filas(page);
  expect(bano.filter(f => f.cls === 'na').length).toBe(8);
  expect(errores(reg)).toEqual([]);
});

// ── R7 · veredicto E ≤ T / E > T ─────────────────────────────────────────────
test('R7 · veredicto: 1 mm en un lado de 10 m (T = 2 mm) se acepta; 3 mm se rechaza y el resumen cuenta cuántas medidas hay que repetir', async ({ page }) => {
  const reg = await conPlano(page, [hab('h1', -5, -3, 10, 6, 'Salón')]);
  await replantear(page);
  await fijar(page, dev('A2', 'dx'), '1');
  await expect.poll(async () => (await fila(page, 'Lado sur'))?.celdas[3]).toBe('0.0010');
  const aceptado = await fila(page, 'Lado sur');
  expect(aceptado.celdas.slice(4)).toEqual(['0.0020', '✓ Se acepta']);
  await fijar(page, dev('A2', 'dx'), '3');
  await expect.poll(async () => (await fila(page, 'Lado sur'))?.celdas[3]).toBe('0.0030');
  const rechazado = await fila(page, 'Lado sur');
  expect(rechazado.celdas.slice(4)).toEqual(['0.0020', '✗ Repetir la medición']);
  expect(rechazado.cls).toBe('repetir');
  const n = (await filas(page)).filter(f => f.cls === 'repetir').length;
  expect(n).toBeGreaterThanOrEqual(1);
  const total = (await filas(page)).filter(f => f.cls === 'ok' || f.cls === 'repetir').length;
  await expect(page.locator('#replanteo-resumen')).toHaveText(`${n} de ${total} medidas superan la tolerancia: repite la medición.`);
  await fijar(page, dev('A2', 'dx'), '0');
  await expect(page.locator('#replanteo-resumen')).toContainText('dentro de la tolerancia');
  expect(errores(reg)).toEqual([]);
});

// ── R8 · escuadra 3-4-5 ──────────────────────────────────────────────────────
test('R8 · 5b: escuadra 3-4-5 con múltiplo entero (8×6: 3-4 con k=1 → 5 m y 4-3 con k=2 → 10 m) y una esquina fuera de escuadra se marca para repetir', async ({ page }) => {
  const reg = await conPlano(page, [hab('h1', -4, -3, 8, 6, 'Salón')]);
  await replantear(page);
  const a = await fila(page, 'Esquina SO · 3-4-5 (3 en x, 4 en z) ×1');
  const b = await fila(page, 'Esquina SO · 3-4-5 (4 en x, 3 en z) ×2');
  expect(a.celdas.slice(2, 3)).toEqual(['5.0000']);
  expect(b.celdas.slice(2, 3)).toEqual(['10.0000']);
  expect([a.cls, b.cls]).toEqual(['ok', 'ok']);
  await fijar(page, dev('B1', 'dx'), '20');                                   // la esquina NO se corre 20 mm hacia el este: el ángulo en la SO ya no es recto
  await expect.poll(async () => (await fila(page, 'Esquina SO · 3-4-5 (4 en x, 3 en z) ×2'))?.cls).toBe('repetir');
  const b2 = await fila(page, 'Esquina SO · 3-4-5 (4 en x, 3 en z) ×2');
  expect(Number(b2.celdas[3])).toBeGreaterThan(Number(b2.celdas[4]));        // E > T
  expect(b2.celdas[5]).toBe('✗ Repetir la medición');
  expect(errores(reg)).toEqual([]);
});

// ── R9 · C2 · ver / ocultar ──────────────────────────────────────────────────
test('R9 · C2: «Ocultar replanteo» esconde estacas y ejes sin borrarlos, el texto cambia a «Ver replanteo», la marca se guarda y volver a replantear los muestra', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await replantear(page);
  expect((await rep(page)).visible).toBe(true);
  await page.click('#plano-replanteo-ver');
  await expect(page.locator('#plano-replanteo-ver')).toHaveText('👁 Ver replanteo');
  let r = await rep(page);
  expect(r).toMatchObject({ oculto: true, visible: false, activo: true });
  expect(r.estacas.length).toBe(4);
  expect((await snap(page)).progreso.replanteo.oculto).toBe(true);
  await page.click('#plano-replanteo-ver');
  await expect(page.locator('#plano-replanteo-ver')).toHaveText('🙈 Ocultar replanteo');
  expect(await rep(page)).toMatchObject({ oculto: false, visible: true });
  await page.click('#plano-replanteo-ver');
  await page.click('#plano-replantear');                                      // volver a replantear lo muestra
  await expect.poll(async () => (await rep(page)).visible).toBe(true);
  expect((await snap(page)).progreso.replanteo.oculto).toBe(false);
  expect(errores(reg)).toEqual([]);
});

// ── R10 · C4 · desactualizado y volver a replantear ──────────────────────────
test('R10 · C4: al cambiar y guardar el plano el estado pasa a «Replanteo desactualizado. Vuelve a replantear.» (sin tabla); al volver a replantear se conserva la desviación de las esquinas que siguen', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2]);
  await replantear(page);
  await fijar(page, dev('A2', 'dx'), '7');
  await expect.poll(async () => (await rep(page)).estacas.find(e => e.id === 'A2').dx).toBe(7);
  const p = await pantalla(page, 3, -0.5);                                    // centro de la Cocina
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#plano-hab-ancho')).toHaveValue('4');
  await fijar(page, '#plano-hab-ancho', '5');
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Replanteo vigente');           // sin guardar, el plano guardado no cambió
  await page.click('#plano-guardar');
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Replanteo desactualizado. Vuelve a replantear.');
  await expect(page.locator('#replanteo-estado-txt')).toHaveText('Replanteo desactualizado. Vuelve a replantear.');
  expect((await rep(page)).estado).toBe('desactualizado');
  expect((await filas(page)).length).toBe(0);
  expect((await rep(page)).estacas.length).toBe(6);                                                // las estacas viejas siguen a la vista
  await page.click('#plano-replantear');
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Replanteo vigente');
  const r = await rep(page);
  expect(r.estacas.map(e => [e.id, e.x])).toEqual([['A1', -3000], ['B1', -3000], ['A2', 1000], ['B2', 1000], ['A3', 6000], ['B3', 6000]]);
  expect(r.estacas.find(e => e.id === 'A2').dx).toBe(7);                                           // la esquina que sigue conserva su desviación
  expect(r.estacas.filter(e => e.id !== 'A2').every(e => e.dx === 0 && e.dz === 0)).toBe(true);
  expect(errores(reg)).toEqual([]);
});

// ── R11 · persistencia ───────────────────────────────────────────────────────
test('R11 · se guarda como progreso.replanteo {v, e:[[x,z,dx,dz]], oculto} y al recargar la casa vuelven las estacas con sus desviaciones, ocultas y vigentes', async ({ page, context }) => {
  const reg = await conPlano(page, [H1, H2]);
  await replantear(page);
  await fijar(page, dev('A2', 'dx'), '3');
  await fijar(page, dev('B3', 'dz'), '-5');
  await page.click('#plano-replanteo-ver');
  const esperado = {
    v: 1, oculto: true,
    e: [[-3000, -2000, 0, 0], [-3000, 1000, 0, 0], [1000, -2000, 3, 0], [1000, 1000, 0, 0], [5000, -2000, 0, 0], [5000, 1000, 0, -5]],
  };
  await expect.poll(() => reg.puts.filter(x => x.progreso?.replanteo?.oculto === true && x.progreso.replanteo.e.some(f => f[2] === 3 && f[3] === 0)).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  const put = reg.puts.filter(x => x.progreso?.replanteo?.oculto === true).at(-1);
  expect(put.progreso.replanteo).toEqual(esperado);
  expect(put.estado.progreso.replanteo).toEqual(esperado);
  expect(Object.keys(put.progreso.plano)).not.toContain('replanteo');         // al nivel de progreso, no dentro del plano
  // recarga en otra página con ese guardado
  const page2 = await context.newPage();
  const reg2 = await abrirCasa(page2, [], put.progreso);
  const r = await rep(page2);
  expect(r.estacas.map(e => [e.x, e.z, e.dx, e.dz])).toEqual(esperado.e);
  expect(r).toMatchObject({ oculto: true, visible: false, activo: true, estado: 'vigente' });
  expect(mallaPorNombre(r, 'estaca_B3_poste').z).toBeCloseTo(0.995, 6);
  await abrirEditor(page2);
  await expect(page2.locator(dev('A2', 'dx'))).toHaveValue('3');
  await expect(page2.locator('#plano-replanteo-ver')).toHaveText('👁 Ver replanteo');
  await expect(page2.locator('#plano-replanteo-estado')).toHaveText('Replanteo vigente');
  expect((await escena(page2)).objetos).toEqual([]);
  expect(errores(reg)).toEqual([]);
  expect(errores(reg2)).toEqual([]);
});

// ── R12 · aditivo y tamaños ──────────────────────────────────────────────────
test('R12 · aditivo: sin replanteo el progreso no cambia de claves; con 50 habitaciones (200 estacas) lo guardado cabe: replanteo × 2 < 15 KB y el PUT completo < 90 KB', async ({ page }) => {
  const habs = Array.from({ length: 50 }, (_, i) => hab(`h${i + 1}`, (i % 10) * 9 - 45, Math.floor(i / 10) * 9 - 22, 4.5, 3.5, `Cuarto ${i + 1}`));
  const reg = await abrirCasa(page, [], { plano: planoCon({ lote: { ancho: 100, largo: 100 }, habitaciones: habs }) });
  const antes = Object.keys((await snap(page)).progreso).sort();
  expect(antes).not.toContain('replanteo');
  await abrirEditor(page);
  const t0 = Date.now();
  await replantear(page);
  const msTotal = Date.now() - t0;
  const r = await rep(page);
  expect(r.estacas.length).toBe(200);
  const despues = Object.keys((await snap(page)).progreso).sort();
  expect(despues).toEqual([...antes, 'replanteo'].sort());                    // lo único nuevo es la clave replanteo
  for (let i = 0; i < r.estacas.length; i += 7) await page.evaluate(([id, k, v]) => { const c = document.querySelector(`input.rep-dev[data-estaca="${id}"][data-eje="${k}"]`); c.value = v; c.dispatchEvent(new Event('change', { bubbles: true })); }, [r.estacas[i].id, 'dx', String((i * 37) % 1999 - 999)]);
  const s = await snap(page);
  const bytesRep = Buffer.byteLength(JSON.stringify(s.progreso.replanteo));
  const bytesTodo = Buffer.byteLength(JSON.stringify({ proyecto_id: 1, slot: 1, estado: s.estado, progreso: s.progreso }));
  console.log(`MEDIDO R12: 200 estacas → replanteo ${bytesRep} B (×2 = ${2 * bytesRep} B), PUT completo ${bytesTodo} B (${(bytesTodo / 1024).toFixed(1)} KB); Replantear (clic → estacas visibles) ${msTotal} ms`);
  expect(2 * bytesRep).toBeLessThan(15 * 1024);
  expect(bytesTodo).toBeLessThan(90 * 1024);
  await expect.poll(() => reg.tamanos.length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  expect(Math.max(...reg.tamanos)).toBeLessThan(100 * 1024);                 // el servidor rechaza cuerpos de más de 100 KB
  expect(errores(reg)).toEqual([]);
});

// ── R13 · vista de solo lectura (maestro) ────────────────────────────────────
test('R13 · vista de solo lectura (?alumno=): se ve el replanteo y la tabla, pero «Replantear» y los campos de desviación están bloqueados y nada se modifica', async ({ page }) => {
  const e = [[-3000, -2000, 0, 0], [-3000, 1000, 0, 0], [1000, -2000, 4, 0], [1000, 1000, 0, 0]];
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1] }), replanteo: { v: 1, e, oculto: false } });
  await page.goto('/sandbox.html?proyecto=1&steamTest=1&alumno=7');
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  await expect.poll(async () => (await rep(page)).estacas.length, { timeout: 120_000 }).toBe(4);
  await page.evaluate(() => window.openPlanoEditor());
  await expect.poll(async () => (await plano(page)).abierto).toBe(true);
  await expect(page.locator('#plano-replantear')).toBeDisabled();
  await expect(page.locator('#replanteo-panel')).toBeVisible();
  await expect(page.locator('input.rep-dev')).toHaveCount(8);
  for (const c of await page.locator('input.rep-dev').all()) await expect(c).toBeDisabled();
  expect((await fila(page, 'Lado sur')).celdas.slice(1, 4)).toEqual(['4.0040', '4.0000', '0.0040']);          // la tabla se calcula con lo guardado
  await page.evaluate(() => {                                                                                // aunque se fuerce, no cambia nada
    document.getElementById('plano-replantear').click();
    const c = document.querySelector('input.rep-dev[data-estaca="A1"][data-eje="dx"]');
    c.disabled = false; c.value = '50'; c.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await cuadros(page, 2);
  const r = await rep(page);
  expect(r.estacas.map(x => [x.x, x.z, x.dx, x.dz])).toEqual(e);
  expect(errores(reg).filter(x => !/alumno|meta|sync|Failed to fetch/i.test(x))).toEqual([]);
});

// ── R14 · coexistencia con lo materializado ──────────────────────────────────
test('R14 · con paredes materializadas: las estacas no son piezas (siguen siendo 1 objeto), no se seleccionan con un clic en 3D y no tocan las mallas de las paredes', async ({ page }) => {
  const mat0 = { v: 1, altura: 2.8, grosor: 0.15, alfeizar: 1, habitaciones: [['h1', -3, -2, 4, 3, []]] };
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1], materializado: mat0 }) });
  await abrirEditor(page);
  const antes = await mat(page);
  expect(antes.activo).toBe(true);
  await replantear(page);
  await cerrarEditor(page);
  const despues = await mat(page);
  expect(despues.activo).toBe(true);
  expect(despues.objeto.id).toBe(antes.objeto.id);
  expect(despues.mallas.map(m => m.name)).toEqual(antes.mallas.map(m => m.name));
  expect(despues.mallas.some(m => /^(estaca_|eje_)/.test(m.name))).toBe(false);
  expect((await escena(page)).objetos.length).toBe(1);                         // solo «paredes_plano»
  const r = await rep(page);
  expect(r.enObjList).toBe(false);
  const px = await page.evaluate(() => window.__steamTest.aPantalla(-3, 0.65, -2));      // sobre la cabeza de la estaca A1
  await page.mouse.click(px.x, px.y);
  await cuadros(page, 3);
  expect(await page.evaluate(() => window.__steamTest.seleccionado())).toBeNull();
  expect(errores(reg)).toEqual([]);
});
