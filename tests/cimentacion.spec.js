// F6a · Zanjas de cimentación — pruebas con navegador: el botón «Excavar zanjas» del editor del plano abre en el terreno una zanja REAL bajo cada pared del plano
// GUARDADO (250 mm con 1 piso, 300 mm con 2; 0.54 m de profundidad por defecto, editable). El terreno se recompone como el complemento de (fosa de F3 ∪ zanjas):
// no hay nada dibujado encima. El volumen sale de la unión de las zanjas (las esquinas y las paredes compartidas no se cuentan dos veces) y, si hay fosa de F3,
// solo cuenta lo que queda por debajo de su fondo. El panel (pisos, profundidad, suelo, % a retirar, resultados, avisos) vive dentro del editor. Todo se guarda en
// progreso.cimentacion (aditivo) y se regenera al cargar; la superposición está fuera de objList. La API se simula (tests/helpers.js). Los helpers se DUPLICAN de
// replanteo.spec.js (las pruebas anteriores no se tocan). Sin GPU el simulador corre a ~1,5 FPS: las esperas son por condición. El WebSocket de recarga en caliente
// de Vite es ruido del entorno y se filtra solo aquí.
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
const DENTRO = 3.28125;                                  // m² de zanja (ancho 250 mm, Sala + Cocina) que caen dentro de la fosa FOSA
const FOSA = { largo: 4, ancho: 6, profundidad: 0.3, volumen: 7.2, activa: true, tipo_suelo: 'tierra_vegetal', porcentaje_retiro: 1 };   // x −3…3, z −2…2

const plano = page => page.evaluate(() => window.__steamTest.plano());
const mat = page => page.evaluate(() => window.__steamTest.materializacion());
const snap = page => page.evaluate(() => window.__steamTest.snapshot());
const escena = page => page.evaluate(() => window.__steamTest.resumenEscena());
const rep = page => page.evaluate(() => window.__steamTest.replanteo());
const cim = page => page.evaluate(() => window.__steamTest.cimentacion());
const rayo = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.cimRayo(a, b), [x, z]);
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
const overlay = page => page.locator('#plano-overlay');
const pantalla = (page, x, z) => page.evaluate(([a, b]) => window.__steamTest.planoAPantalla(a, b), [x, z]);
const errores = reg => reg.errores.filter(e => !/WebSocket connection to 'ws:\/\/localhost/.test(e));
const redondear = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

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
async function conPlano(page, habs, extra = {}, extraPlano = {}, objetos = []) {
  const reg = await abrirCasa(page, objetos, { plano: planoCon({ habitaciones: habs, ...extraPlano }), ...extra });
  await abrirEditor(page);
  return reg;
}
async function excavar(page, activo = true) {
  await page.click('#plano-zanjas');
  await expect.poll(async () => (await cim(page)).activo, { timeout: 90_000, intervals: [300] }).toBe(activo);
  await expect.poll(async () => (await cim(page)).nodo, { timeout: 90_000, intervals: [300] }).toBe(activo);
  await cuadros(page, 2);
}
const abrirPanel = async page => {
  if (await page.locator('#cimentacion-panel').isHidden()) await page.locator('#plano-zanjas-panel').click();      // el panel está oculto por defecto: se abre con «⚙ Zanjas»
  if (!(await page.locator('#cimentacion-panel details').evaluate(d => d.open))) await page.locator('#cimentacion-panel summary').click();
};
const celda = (page, k) => page.locator(`#cim-resultados [data-k="${k}"]`);
const valor = async (page, k) => Number(await celda(page, k).getAttribute('data-valor'));
const avisosPanel = page => page.$$eval('#cim-avisos li', ls => ls.map(l => l.dataset.codigo));
const mallaPorNombre = (c, nombre) => c.mallas.find(m => m.name === nombre);
const terrenoPorNombre = (c, nombre) => c.terreno.find(m => m.name === nombre);
const area = (m, d = 4) => redondear(m.areaM2, d);
/** Último PUT de guardado que cumple la condición (se espera a que llegue). */
async function putCon(page, reg, cond, ms = 90_000) {
  await expect.poll(() => reg.puts.filter(cond).length, { timeout: ms, intervals: [500] }).toBeGreaterThan(0);
  return reg.puts.filter(cond).at(-1);
}
async function quitarFosa(page) {                                       // F3: «Rellenar» pide confirmación con confirm()
  page.once('dialog', d => d.accept());
  await page.evaluate(() => window.eliminarExcavacion());
}
async function abrirModalF3(page) {
  await page.evaluate(() => window.openExcavacionModal());
  await expect(page.locator('#excavacion-overlay')).toHaveClass(/open/);
}
async function crearFosa(page, largo, ancho, prof) {
  await abrirModalF3(page);
  await page.fill('#exc-largo', String(largo));
  await page.fill('#exc-ancho', String(ancho));
  await page.fill('#exc-profundidad', String(prof));
  await page.click('#btn-iniciar-excavacion');
  await expect.poll(async () => (await escena(page)).excavacion?.activa, { timeout: 60_000 }).toBe(true);
  await expect(page.locator('#excavacion-overlay')).not.toHaveClass(/open/);
}

// ── Z1 · sin zanjas: estado, vista previa, nada en 3D, el guardado no tiene la clave ──────────────────────
test('Z1 · sin zanjas: «Sin zanjas», botón «Excavar zanjas», «Rellenar» oculto, terreno original, vista previa 1,89 m³ y el guardado no tiene la clave progreso.cimentacion', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Sin zanjas');
  await expect(page.locator('#plano-zanjas-estado')).toHaveAttribute('data-estado', 'sin_zanjas');
  await expect(page.locator('#plano-zanjas')).toHaveText('🕳️ Excavar zanjas');
  await expect(page.locator('#plano-zanjas')).toBeEnabled();
  await expect(page.locator('#plano-zanjas-rellenar')).toBeHidden();
  const c = await cim(page);
  expect(c).toMatchObject({ activo: false, estado: 'sin_zanjas', nodo: false, enObjList: false, mallas: [], terreno: [], habiaGuardado: false, suspendido: false, excFloor: null, fosa: null });
  expect(c.originales).toEqual({ ground: true, zone: true });
  expect(c.vistaPrevia).toMatchObject({ zanjas: 4, longitudM: 14, areaM2: 3.5, volumen: 1.89, suelto: 2.079 });
  expect(Object.keys((await snap(page)).progreso)).not.toContain('cimentacion');
  await abrirPanel(page);                                                                          // el panel está en el editor, oculto por defecto (⚙ Zanjas)
  await expect(page.locator('#cim-estado-txt')).toHaveText('Sin zanjas');
  await expect(page.locator('#cim-modo')).toHaveText('Vista previa (aún sin excavar)');
  expect(await valor(page, 'volumen')).toBe(1.89);
  expect(await valor(page, 'suelto')).toBe(2.079);
  await expect(page.locator('#cim-pisos')).toHaveValue('1');
  await expect(page.locator('#cim-prof')).toHaveValue('0.54');
  await expect(page.locator('#cim-suelo')).toHaveValue('tierra_vegetal');
  await expect(page.locator('#cim-retiro')).toHaveValue('100');
  expect(await page.$$eval('#cim-suelo option', os => os.map(o => [o.value, o.disabled]).filter(x => x[1]))).toEqual([['afirmado_bases_vias', true], ['material_sucio_rio_subbases', true]]);
  expect(await page.locator('#cim-suelo option').count()).toBe(11);
  expect(errores(reg)).toEqual([]);
});

// ── Z2 · Materializar → Excavar zanjas → huecos reales ─────────────────────────────────────────────
test('Z2 · materializar y excavar zanjas: 7 zanjas, 3,341 m³ en banco; el terreno tiene HUECOS reales (676 − 6,1875 m²), el fondo está a −0,54 m y un rayo cae dentro de la zanja', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2]);
  await page.click('#plano-materializar');
  await expect.poll(async () => (await mat(page)).activo, { timeout: 90_000, intervals: [300] }).toBe(true);
  await excavar(page);
  const c = await cim(page);
  expect(c).toMatchObject({ activo: true, estado: 'vigente', habitaciones: 2, nodo: true, enObjList: false, suspendido: false });
  expect(c.resumen).toMatchObject({ zanjas: 7, longitudM: 25, areaM2: 6.1875, anchoM: 0.25, profM: 0.54, volumenBruto: 3.341, volumen: 3.341, volumenEnFosa: 0, suelto: 3.675 });
  expect(c.resumen.viajes).toMatchObject({ aRetirar: 3.675, viajes: 1 });
  expect(c.opciones).toEqual({ pisos: 1, ancho: 250, prof: 540, suelo: 'tierra_vegetal', retiro: 1 });
  // la geometría real: el fondo es la unión de las zanjas; el terreno es el cuadrado menos esa unión
  expect(area(mallaPorNombre(c, 'zanja_floor'))).toBe(6.1875);
  expect(area(mallaPorNombre(c, 'zanja_wall'), 2)).toBe(26.46);                                    // perímetro de la unión (49 m) × 0,54 m
  expect(area(terrenoPorNombre(c, 'ground_seg_z'))).toBe(redondear(26 * 26 - 6.1875));
  expect(area(terrenoPorNombre(c, 'zone_seg_z'))).toBe(redondear(20 * 20 - 6.1875));
  expect(c.originales).toEqual({ ground: false, zone: false });
  expect(c.terreno.every(t => !t.pickable && !t.colision)).toBe(true);
  expect(c.mallas.every(m => !m.pickable && !m.colision && m.visible)).toBe(true);
  // rayos verticales: dentro de la zanja hay fondo a −0,54 m; fuera, terreno
  expect(await rayo(page, -1, -2)).toMatchObject({ nombre: 'zanja_floor' });                        // zanja sur de la Sala
  expect((await rayo(page, -1, -2)).y).toBeCloseTo(-0.54, 6);
  expect((await rayo(page, 1, -0.5)).y).toBeCloseTo(-0.54, 6);                                      // zanja compartida (una sola)
  expect((await rayo(page, 5, -0.5)).y).toBeCloseTo(-0.54, 6);                                      // zanja este de la Cocina
  expect(await rayo(page, -1, -0.5)).toMatchObject({ nombre: 'zone_seg_z' });                       // interior de la Sala: terreno, no zanja
  expect(await rayo(page, 8, 8)).toMatchObject({ nombre: 'zone_seg_z' });
  expect(await rayo(page, 12, 12)).toMatchObject({ nombre: 'ground_seg_z' });
  expect((await rayo(page, 12, 12)).y).toBe(0);
  // UI
  await expect(page.locator('#plano-zanjas')).toHaveText('🕳️ Volver a excavar');
  await expect(page.locator('#plano-zanjas-rellenar')).toBeVisible();
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Zanjas vigentes');
  await abrirPanel(page);
  await expect(page.locator('#cim-modo')).toHaveText('Zanjas excavadas');
  expect(await valor(page, 'zanjas')).toBe(7);
  expect(await valor(page, 'volumen')).toBe(3.341);
  expect(await valor(page, 'suelto')).toBe(3.675);
  await expect(celda(page, 'seccion')).toHaveText('0,25 × 0,54 m');
  expect((await mat(page)).activo).toBe(true);                                                    // las paredes materializadas siguen ahí
  expect(errores(reg)).toEqual([]);
});

// ── Z3 · coexistencia con la fosa de F3: sin doble conteo ─────────────────────────────────────────────
test('Z3 · con una fosa de F3 (0,30 m): el volumen de la zanja solo cuenta lo que queda por debajo de su fondo (3,341 = 2,357 + 0,984), la fosa no cambia y el terreno se abre en la UNIÓN', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2], { excavacion: FOSA });
  const f0 = (await escena(page)).excavacion;
  expect(f0).toMatchObject({ largo: 4, ancho: 6, profundidad: 0.3, volumen: 7.2, activa: true });
  await excavar(page);
  const c = await cim(page);
  expect(c.fosa).toEqual({ x0: -3000, x1: 3000, z0: -2000, z1: 2000, prof: 300 });
  expect(c.resumen).toMatchObject({ zanjas: 7, volumenBruto: 3.341, volumen: 2.357, volumenEnFosa: 0.984 });
  expect(redondear(c.resumen.volumen + c.resumen.volumenEnFosa, 3)).toBe(c.resumen.volumenBruto);        // sin doble conteo
  expect(c.resumen.suelto).toBe(2.593);                                                                    // 2,357 × 1,10
  expect((await escena(page)).excavacion).toEqual(f0);                                                    // los datos de F3 no cambian
  // el terreno se abre en la unión fosa ∪ zanjas: 24 m² de fosa + 6,1875 m² de zanja − 3,28125 m² de zanja dentro de la fosa
  const union = 24 + 6.1875 - DENTRO;
  expect(area(terrenoPorNombre(c, 'ground_seg_z'), 3)).toBe(redondear(676 - union, 3));
  expect(area(terrenoPorNombre(c, 'zone_seg_z'), 3)).toBe(redondear(400 - union, 3));
  expect(c.terreno.map(t => t.name).sort()).toEqual(['ground_seg_z', 'zone_seg_z']);                      // F3 no dejó sus ocho segmentos
  // la zanja es más honda que la fosa y la cruza: el piso sólido de F3 se sustituye por uno con las zanjas recortadas
  expect(c.excFloor).toEqual({ visible: false });
  expect(area(mallaPorNombre(c, 'zanja_floor'), 3)).toBe(redondear(24 - DENTRO + 6.1875, 3));            // piso de la fosa sin zanjas + fondo de las zanjas
  expect((await rayo(page, 1, -0.5)).y).toBeCloseTo(-0.54, 6);                                           // zanja compartida dentro de la fosa: hay hueco hasta −0,54
  expect((await rayo(page, -1, -0.5)).y).toBeCloseTo(-0.3, 2);                                           // interior de la Sala dentro de la fosa: el piso de la fosa (−0,30)
  expect((await rayo(page, 5, -0.5)).y).toBeCloseTo(-0.54, 6);                                           // zanja este de la Cocina, fuera de la fosa
  expect(errores(reg)).toEqual([]);
  // «Volver a excavar» más somera que la fosa (0,20 m): todo lo que cabe dentro de la fosa ya está excavado
  await abrirPanel(page);
  await fijar(page, '#cim-prof', '0.2');
  await page.click('#plano-zanjas');
  await expect.poll(async () => (await cim(page)).opciones.prof, { timeout: 90_000, intervals: [300] }).toBe(200);
  const s = await cim(page);
  expect(s.resumen).toMatchObject({ volumenBruto: 1.238, volumen: 0.581, volumenEnFosa: 0.657 });         // fuera de la fosa: 2,9075 m² de zanja × 0,2 m
  expect(s.excFloor).toEqual({ visible: true });                                                          // ya no hay zanja más honda que la fosa: vuelve el piso de F3
  expect((await escena(page)).excavacion).toEqual(f0);
  expect(errores(reg)).toEqual([]);
});

// ── Z3b · el flujo real de F3 con zanjas ya excavadas (las guardas) ────────────────────────────────────────
test('Z3b · con zanjas ya excavadas, crear y quitar la fosa de F3 desde su modal recompone el terreno (las guardas de setGroundHole / clearGroundHole) y las zanjas siguen donde estaban', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2]);
  await excavar(page);
  await cerrarEditor(page);
  const sin = await cim(page);
  expect(area(terrenoPorNombre(sin, 'ground_seg_z'))).toBe(redondear(676 - 6.1875));
  await crearFosa(page, 4, 6, 0.3);                                                                      // F3: modal → «Iniciar excavación»
  await expect.poll(async () => (await cim(page)).fosa?.prof, { timeout: 60_000, intervals: [300] }).toBe(300);
  const con = await cim(page);
  expect(con).toMatchObject({ activo: true, suspendido: false });
  expect(con.resumen).toMatchObject({ volumenBruto: 3.341, volumen: 2.357, volumenEnFosa: 0.984 });
  expect(con.terreno.map(t => t.name).sort()).toEqual(['ground_seg_z', 'zone_seg_z']);
  expect(area(terrenoPorNombre(con, 'ground_seg_z'), 3)).toBe(redondear(676 - (24 + 6.1875 - DENTRO), 3));
  expect(con.excFloor).toEqual({ visible: false });
  expect((await escena(page)).mallas.filter(m => /^ground_seg_[nsew]$/.test(m.name))).toEqual([]);      // F3 no creó sus cuatro segmentos
  expect((await rayo(page, 1, -0.5)).y).toBeCloseTo(-0.54, 6);
  // quitar la fosa (F3 «Rellenar»): las zanjas se quedan y el terreno vuelve a ser cuadrado − zanjas
  await quitarFosa(page);
  await expect.poll(async () => (await cim(page)).fosa, { timeout: 60_000, intervals: [300] }).toBeNull();
  const fin = await cim(page);
  expect(fin).toMatchObject({ activo: true, estado: 'vigente' });
  expect(fin.resumen).toMatchObject({ volumenBruto: 3.341, volumen: 3.341, volumenEnFosa: 0 });
  expect(area(terrenoPorNombre(fin, 'ground_seg_z'))).toBe(redondear(676 - 6.1875));
  expect(area(mallaPorNombre(fin, 'zanja_floor'))).toBe(6.1875);
  expect((await rayo(page, 1, -0.5)).y).toBeCloseTo(-0.54, 6);
  expect((await escena(page)).excavacion).toBeNull();
  expect(errores(reg)).toEqual([]);
});

// ── Z4 · guardado y recarga ──────────────────────────────────────────────────────────────────────────
test('Z4 · se guarda como progreso.cimentacion {v, zanjas:{h, pisos, ancho, prof, suelo, retiro}} (también dentro de estado.progreso) y al recargar la casa vuelven las zanjas, vigentes y con sus opciones en el panel', async ({ page, context }) => {
  const reg = await conPlano(page, [H1, H2]);
  await abrirPanel(page);
  await page.selectOption('#cim-pisos', '2');
  await fijar(page, '#cim-prof', '0,6');
  await page.selectOption('#cim-suelo', 'tierra_franca');
  await page.locator('#cim-retiro').fill('50');
  await excavar(page);
  const esperado = {
    v: 1,
    zanjas: { h: [['h1', -3000, -2000, 4000, 3000], ['h2', 1000, -2000, 4000, 3000]], pisos: 2, ancho: 300, prof: 600, suelo: 'tierra_franca', retiro: 0.5 },
  };
  const put = await putCon(page, reg, x => x.progreso?.cimentacion?.zanjas?.pisos === 2);
  expect(put.progreso.cimentacion).toEqual(esperado);
  expect(put.estado.progreso.cimentacion).toEqual(esperado);
  expect(Object.keys(put.progreso.plano)).not.toContain('cimentacion');                         // al nivel de progreso, no dentro del plano
  // recarga en otra página con ese guardado
  const page2 = await context.newPage();
  const reg2 = await abrirCasa(page2, [], put.progreso);
  const c = await cim(page2);
  expect(c).toMatchObject({ activo: true, estado: 'vigente', habitaciones: 2, nodo: true, habiaGuardado: true, enObjList: false });
  expect(c.opciones).toEqual({ pisos: 2, ancho: 300, prof: 600, suelo: 'tierra_franca', retiro: 0.5 });
  expect(c.resumen).toMatchObject({ zanjas: 7, anchoM: 0.3, profM: 0.6, areaM2: 7.41, volumenBruto: 4.446, volumen: 4.446, factor: 1.2, suelto: 5.335 });
  expect(c.resumen.viajes).toMatchObject({ aRetirar: 2.668, viajes: 1 });                          // 50 % del suelto
  expect(area(terrenoPorNombre(c, 'ground_seg_z'))).toBe(redondear(676 - 7.41));
  expect((await rayo(page2, 1, -0.5)).y).toBeCloseTo(-0.6, 6);
  await abrirEditor(page2);
  await expect(page2.locator('#cim-pisos')).toHaveValue('2');
  await expect(page2.locator('#cim-prof')).toHaveValue('0.6');
  await expect(page2.locator('#cim-suelo')).toHaveValue('tierra_franca');
  await expect(page2.locator('#cim-retiro')).toHaveValue('50');
  await expect(page2.locator('#plano-zanjas-estado')).toHaveText('Zanjas vigentes');
  await expect(page2.locator('#plano-zanjas')).toHaveText('🕳️ Volver a excavar');
  expect((await escena(page2)).objetos).toEqual([]);
  // al guardar de nuevo la casa recargada, la clave se conserva igual
  expect((await snap(page2)).progreso.cimentacion).toEqual(esperado);
  expect(errores(reg)).toEqual([]);
  expect(errores(reg2)).toEqual([]);
});

// ── Z5 · JSON corrupto ───────────────────────────────────────────────────────────────────────────────
test('Z5 · un progreso.cimentacion corrupto se descarta sin romper la casa: sin zanjas, terreno original, F3 intacta y nada de errores', async ({ page }) => {
  test.setTimeout(600_000);
  // cuatro clases de daño (la lista completa de casos se prueba en cimentacion.test.js): no es un objeto, versión desconocida, una fila mala entre filas buenas, demasiadas habitaciones
  const corruptos = [
    'basura', { v: 2, zanjas: {} }, { v: 1, zanjas: { h: [['h1', -3000, -2000, 4000, 3000], ['h2', 'x', 0, 4000, 3000]], pisos: 1, ancho: 250, prof: 540 } },
    { v: 1, zanjas: { h: Array.from({ length: 51 }, (_, i) => [`h${i + 1}`, i * 5000, 0, 4000, 3000]) } },
  ];
  for (const [i, malo] of corruptos.entries()) {
    const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1] }), excavacion: FOSA, cimentacion: malo });
    const c = await cim(page);
    expect(c, `caso ${i}: ${JSON.stringify(malo).slice(0, 60)}`).toMatchObject({ activo: false, estado: 'sin_zanjas', nodo: false, mallas: [], habiaGuardado: false });
    expect((await escena(page)).excavacion).toMatchObject({ largo: 4, ancho: 6, profundidad: 0.3, activa: true });              // la fosa de F3 se restauró normal
    expect((await escena(page)).mallas.filter(m => /^ground_seg_[nsew]$/.test(m.name)).length).toBe(4);
    expect(Object.keys((await snap(page)).progreso)).not.toContain('cimentacion');
    expect(errores(reg), `caso ${i}`).toEqual([]);
    if (i < corruptos.length - 1) await page.goto('about:blank');
  }
});

// ── Z6 · estado «desactualizada» ─────────────────────────────────────────────────────────────────────
test('Z6 · al cambiar y guardar el plano el estado pasa a «Zanjas desactualizadas. Vuelve a excavar.» (las zanjas viejas siguen a la vista); al volver a excavar queda vigente con el plano nuevo', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2]);
  await excavar(page);
  expect((await cim(page)).estado).toBe('vigente');
  const p = await pantalla(page, 3, -0.5);                                                         // centro de la Cocina
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#plano-hab-ancho')).toHaveValue('4');
  await fijar(page, '#plano-hab-ancho', '5');
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Zanjas vigentes');             // sin guardar, el plano guardado no cambió
  await page.click('#plano-guardar');
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Zanjas desactualizadas. Vuelve a excavar.');
  await expect(page.locator('#plano-zanjas-estado')).toHaveAttribute('data-estado', 'desactualizada');
  await abrirPanel(page);
  await expect(page.locator('#cim-estado-txt')).toHaveText('Zanjas desactualizadas. Vuelve a excavar.');
  const viejo = await cim(page);
  expect(viejo).toMatchObject({ estado: 'desactualizada', activo: true });
  expect(viejo.resumen.volumen).toBe(3.341);                                                      // las zanjas viejas siguen ahí, con su resumen
  await page.click('#plano-zanjas');
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Zanjas vigentes');
  const nuevo = await cim(page);
  expect(nuevo.estado).toBe('vigente');
  expect(nuevo.resumen).toMatchObject({ zanjas: 7, longitudM: 27, areaM2: 6.6875, volumenBruto: 3.611, volumen: 3.611 });          // la Cocina ahora mide 5 m
  expect(errores(reg)).toEqual([]);
});

// ── Z7 · vista del maestro ───────────────────────────────────────────────────────────────────────────
test('Z7 · vista de solo lectura (?alumno=): se ven las zanjas y el panel, pero «Volver a excavar», «Rellenar» y los campos están bloqueados y nada se modifica', async ({ page }) => {
  const cimentacion = { v: 1, zanjas: { h: [['h1', -3000, -2000, 4000, 3000]], pisos: 1, ancho: 250, prof: 540, suelo: 'tierra_vegetal', retiro: 1 } };
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1] }), cimentacion });
  await page.goto('/sandbox.html?proyecto=1&steamTest=1&alumno=7');
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  await expect.poll(async () => (await cim(page)).activo, { timeout: 120_000 }).toBe(true);
  await page.evaluate(() => window.openPlanoEditor());
  await expect.poll(async () => (await plano(page)).abierto).toBe(true);
  await expect(page.locator('#plano-zanjas')).toBeDisabled();
  await expect(page.locator('#plano-zanjas-rellenar')).toBeVisible();
  await expect(page.locator('#plano-zanjas-rellenar')).toBeDisabled();
  for (const id of ['cim-pisos', 'cim-prof', 'cim-suelo', 'cim-retiro']) await expect(page.locator(`#${id}`)).toBeDisabled();
  await abrirPanel(page);
  await expect(page.locator('#cim-estado-txt')).toHaveText('Zanjas vigentes');
  expect(await valor(page, 'volumen')).toBe(1.89);
  const antes = await cim(page);
  await page.evaluate(() => {                                                                       // aunque se fuerce, no cambia nada
    document.getElementById('plano-zanjas').click();
    document.getElementById('plano-zanjas-rellenar').click();
    const p = document.getElementById('cim-prof'); p.disabled = false; p.value = '1.5'; p.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('plano-zanjas').click();
  });
  await cuadros(page, 2);
  const despues = await cim(page);
  expect(despues.activo).toBe(true);
  expect(despues.opciones).toEqual(antes.opciones);
  expect(despues.resumen).toEqual(antes.resumen);
  expect(despues.mallas.map(m => [m.name, m.areaM2])).toEqual(antes.mallas.map(m => [m.name, m.areaM2]));
  expect(errores(reg).filter(x => !/alumno|meta|sync|Failed to fetch/i.test(x))).toEqual([]);
});

// ── Z8 · fuera de objList, sin selección ─────────────────────────────────────────────────────────────
test('Z8 · las zanjas no son piezas: no entran en objList, no se seleccionan con un clic en 3D, no colisionan y no tocan las paredes materializadas', async ({ page }) => {
  const mat0 = { v: 1, altura: 2.8, grosor: 0.15, alfeizar: 1, habitaciones: [['h1', -3, -2, 4, 3, []]] };
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1], materializado: mat0 }) });
  await abrirEditor(page);
  const antes = await mat(page);
  expect(antes.activo).toBe(true);
  await excavar(page);
  await cerrarEditor(page);
  const despues = await mat(page);
  expect(despues.objeto.id).toBe(antes.objeto.id);
  expect(despues.mallas.map(m => m.name)).toEqual(antes.mallas.map(m => m.name));
  expect(despues.mallas.some(m => /zanja|ground_seg/.test(m.name))).toBe(false);
  expect((await escena(page)).objetos.length).toBe(1);                                            // solo «paredes_plano»
  const c = await cim(page);
  expect(c.enObjList).toBe(false);
  expect(c.mallas.every(m => !m.pickable && !m.colision)).toBe(true);
  expect((await escena(page)).mallas.filter(m => /^zanja_/.test(m.name)).map(m => m.name).sort()).toEqual(['zanja_floor', 'zanja_wall']);
  const px = await page.evaluate(() => window.__steamTest.aPantalla(-1, -0.1, -2));               // sobre la zanja sur
  await page.mouse.click(px.x, px.y);
  await cuadros(page, 3);
  expect(await page.evaluate(() => window.__steamTest.seleccionado())).toBeNull();
  expect(errores(reg)).toEqual([]);
});

// ── Z9 · cámara, gizmo y selección ───────────────────────────────────────────────────────────────────
test('Z9 · la cámara no se mueve al excavar zanjas y la selección de piezas y el gizmo siguen funcionando', async ({ page }) => {
  const reg = await conPlano(page, [H1], {}, {}, [{ id: 1, type: 'block', p: [0, 0, 8], r: [0, 0, 0] }]);
  const antes = await page.evaluate(() => window.__steamTest.camara());
  await excavar(page);
  await cerrarEditor(page);
  const despues = await page.evaluate(() => window.__steamTest.camara());
  for (const k of ['alpha', 'beta', 'radius']) expect(despues[k], k).toBeCloseTo(antes[k], 5);
  expect(despues.target).toEqual(antes.target);
  expect(despues.colision).toBe(antes.colision);
  await page.locator('#obj-items .obj-item[onclick="selectFromList(1)"]').click();
  await expect.poll(() => page.evaluate(() => window.__steamTest.seleccionado()), { timeout: 60_000 }).toBe(1);
  const centroX = async () => { const b = await page.evaluate(() => window.__steamTest.limitesObjeto(1)); return (b.min.x + b.max.x) / 2; };
  const x0 = await centroX();
  let g = null;
  await expect.poll(async () => { g = await page.evaluate(() => window.__steamTest.gizmoEnPantalla('x')); return g !== null; }, { timeout: 60_000 }).toBe(true);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(g.x + 60 * i / 6, g.y);
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await centroX()) - x0), { timeout: 60_000, intervals: [300] }).toBeGreaterThan(0.1);
  expect(await rayo(page, -1, -2)).toMatchObject({ nombre: 'zanja_floor' });                        // y las zanjas siguen donde estaban
  expect(errores(reg)).toEqual([]);
});

// ── Z10 · convivencia con F5 ─────────────────────────────────────────────────────────────────────────
test('Z10 · el replanteo (F5) sigue funcionando con zanjas; el aviso «sin replanteo» desaparece al replantear y vuelve como «replanteo desactualizado» al cambiar el plano', async ({ page }) => {
  const reg = await conPlano(page, [H1, H2]);
  await abrirPanel(page);
  expect(await avisosPanel(page)).toEqual(['sin_replanteo']);                                      // sugerencia, no bloqueo
  await excavar(page);
  await page.click('#plano-replantear');
  await expect.poll(async () => (await rep(page)).estacas.length, { timeout: 60_000 }).toBe(6);
  expect((await rep(page)).estado).toBe('vigente');
  await page.hover('#cimentacion-panel');                                                          // el panel se refresca al pasar el ratón por encima (F5 no lo avisa)
  await expect.poll(() => avisosPanel(page), { timeout: 30_000 }).toEqual([]);
  expect((await cim(page)).activo).toBe(true);                                                     // el replanteo no tocó las zanjas
  expect((await rep(page)).enObjList).toBe(false);
  // cambiar y guardar el plano: replanteo y zanjas quedan desactualizados
  const p = await pantalla(page, 3, -0.5);
  await page.mouse.click(p.x, p.y);
  await fijar(page, '#plano-hab-ancho', '5');
  await page.click('#plano-guardar');
  await expect(page.locator('#plano-replanteo-estado')).toHaveText('Replanteo desactualizado. Vuelve a replantear.');
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Zanjas desactualizadas. Vuelve a excavar.');
  await expect.poll(() => avisosPanel(page), { timeout: 30_000 }).toEqual(['replanteo_desactualizado']);
  // los dos guardados conviven en el mismo progreso
  const s = (await snap(page)).progreso;
  expect(Object.keys(s)).toEqual(expect.arrayContaining(['replanteo', 'cimentacion']));
  expect(errores(reg)).toEqual([]);
});

// ── Z11 · el panel: opciones, validación y avisos que no bloquean ──────────────────────────────────────────
test('Z11 · panel: 2 pisos → zanja de 300 mm; profundidad «abc» no se aplica y avisa; 0,45 m < 0,50 m avisa pero excava; suelo y % a retirar cambian el suelto y los viajes', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await abrirPanel(page);
  // vista previa en vivo con los valores del panel (sin excavar)
  await page.selectOption('#cim-pisos', '2');
  await expect.poll(() => valor(page, 'area')).toBe(4.2);                                          // 14 m × 0,30 m
  expect(await valor(page, 'volumen')).toBe(2.268);
  await page.selectOption('#cim-pisos', '1');
  await expect.poll(() => valor(page, 'area')).toBe(3.5);
  // profundidad inválida: se avisa y no se excava
  await page.fill('#cim-prof', 'abc');
  await expect(page.locator('#cim-aviso-prof')).toBeVisible();
  await expect(page.locator('#cim-aviso-prof')).toHaveText('La profundidad debe ser un número.');
  await page.click('#plano-zanjas');
  await cuadros(page, 2);
  expect((await cim(page)).activo).toBe(false);
  await page.fill('#cim-prof', '5');
  await expect(page.locator('#cim-aviso-prof')).toContainText('entre 0,10 y 3,00 m');
  await page.click('#plano-zanjas');
  await cuadros(page, 2);
  expect((await cim(page)).activo).toBe(false);
  // 0,45 m: avisa de la NSR-10 pero excava (ningún aviso bloquea)
  await page.fill('#cim-prof', '0,45');
  await expect(page.locator('#cim-aviso-prof')).toBeHidden();
  await expect.poll(() => avisosPanel(page)).toContain('prof_menor_min');
  await expect(page.locator('#cim-avisos li[data-codigo="prof_menor_min"]')).toContainText('E.2.2.4');
  await excavar(page);
  const c = await cim(page);
  expect(c.opciones.prof).toBe(450);
  expect(c.resumen).toMatchObject({ profM: 0.45, volumen: 1.575, suelto: 1.733 });                 // 3,5 × 0,45 · 1,10 = 1,7325
  expect((await rayo(page, -1, -2)).y).toBeCloseTo(-0.45, 6);
  // el suelo y el % a retirar se aplican con «Volver a excavar»; hasta entonces el panel avisa
  await page.selectOption('#cim-suelo', 'tierra_margosa_arcilla_compacta');
  await page.locator('#cim-retiro').fill('50');
  await expect(page.locator('#cim-retiro-val')).toHaveText('50 %');
  await expect(page.locator('#cim-modo')).toContainText('se aplican con «Volver a excavar»');
  expect(await valor(page, 'suelto')).toBe(1.733);
  await page.click('#plano-zanjas');
  await expect.poll(async () => (await cim(page)).opciones.suelo, { timeout: 90_000, intervals: [300] }).toBe('tierra_margosa_arcilla_compacta');
  const d = await cim(page);
  expect(d.resumen).toMatchObject({ volumen: 1.575, factor: 1.6, suelto: 2.52 });                  // 1,575 × 1,60
  expect(d.resumen.viajes).toMatchObject({ aRetirar: 1.26, viajes: 1 });                           // 50 % de 2,52
  expect(await valor(page, 'aretirar')).toBe(1.26);
  expect(errores(reg)).toEqual([]);
});

// ── Z12 · avisos de la NSR-10 (no bloquean) ───────────────────────────────────────────────────────────
test('Z12 · esbeltez > 2, tramo continuo > 30 m y zanjas fuera del terreno: se avisa de cada uno con su cita de la NSR-10 y aun así se excava', async ({ page }) => {
  const habs = [hab('h1', 0, 0, 16, 8, 'Nave A'), hab('h2', 16, 0, 16, 8, 'Nave B'), hab('h3', 3, 12, 3, 7, 'Pasillo')];     // 32 m seguidos; Pasillo 7/3 > 2
  const reg = await conPlano(page, habs, {}, { lote: { ancho: 100, largo: 100 } });
  await abrirPanel(page);
  await expect.poll(async () => (await avisosPanel(page)).sort()).toEqual(expect.arrayContaining(['esbeltez', 'tramo_mayor_30', 'fuera_terreno', 'sin_replanteo']));
  await expect(page.locator('#cim-avisos li[data-codigo="esbeltez"]')).toContainText('Pasillo: largo/ancho = 2,33 > 2 (NSR-10 E.2.1.5');
  const tramos = page.locator('#cim-avisos li[data-codigo="tramo_mayor_30"]');
  await expect(tramos).toHaveCount(2);                                                               // una por cada eje de 32 m: z = 0 y z = 8 m
  await expect(tramos.nth(0)).toContainText('32,0 m en el eje z = 0,00 m');
  await expect(tramos.nth(1)).toContainText('32,0 m en el eje z = 8,00 m');
  await expect(tramos.nth(0)).toContainText('E.2.4.1');
  await expect(page.locator('#cim-avisos li[data-codigo="fuera_terreno"]')).toContainText('±13 m');
  await excavar(page);                                                                              // ningún aviso bloquea
  const c = await cim(page);
  expect(c.activo).toBe(true);
  expect(c.avisos).toEqual(expect.arrayContaining(['esbeltez', 'tramo_mayor_30', 'fuera_terreno']));
  expect(c.resumen.zanjas).toBeGreaterThan(8);
  // la zanja que sale del terreno se recorta en 3D (no hay terreno que abrir), pero el volumen la cuenta completa
  const piso = area(mallaPorNombre(c, 'zanja_floor'), 3);
  expect(piso).toBeLessThan(c.resumen.areaM2);
  expect(errores(reg)).toEqual([]);
});

// ── Z13 · guardado sin cambios y límites ─────────────────────────────────────────────────────────────
test('Z13 · con cambios sin guardar en el plano no se excava (avisa «Guarda el plano antes de excavar»); un plano guardado sin habitaciones tampoco', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  const p = await pantalla(page, -1, -0.5);
  await page.mouse.click(p.x, p.y);
  await fijar(page, '#plano-hab-ancho', '6');
  await expect(page.locator('#plano-dirty')).toContainText('Cambios sin guardar');
  await page.click('#plano-zanjas');
  await expect(page.locator('#plano-tip')).toHaveText('Guarda el plano antes de excavar las zanjas: hay cambios sin guardar.');
  await cuadros(page, 2);
  expect(await cim(page)).toMatchObject({ activo: false, nodo: false, mallas: [] });
  expect(Object.keys((await snap(page)).progreso)).not.toContain('cimentacion');
  const reg2 = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [] }) });
  await abrirEditor(page);
  await page.click('#plano-zanjas');
  await expect(page.locator('#plano-tip')).toHaveText('El plano guardado no tiene habitaciones: dibuja y guarda al menos una para excavar zanjas.');
  expect((await cim(page)).activo).toBe(false);
  await abrirPanel(page);
  await expect(page.locator('#cim-modo')).toHaveText('Guarda un plano con habitaciones para calcular las zanjas.');
  expect(errores(reg)).toEqual([]);
  expect(errores(reg2)).toEqual([]);
});

// ── Z14 · rellenar ────────────────────────────────────────────────────────────────────────────────────
test('Z14 · «Rellenar zanjas»: el terreno vuelve a su estado anterior (con o sin fosa de F3), el siguiente guardado manda progreso.cimentacion = null y al recargar no hay zanjas', async ({ page, context }) => {
  const reg = await conPlano(page, [H1, H2], { excavacion: FOSA });
  await excavar(page);
  expect((await cim(page)).excFloor).toEqual({ visible: false });
  await page.click('#plano-zanjas-rellenar');
  await expect.poll(async () => (await cim(page)).activo, { timeout: 60_000 }).toBe(false);
  const c = await cim(page);
  expect(c).toMatchObject({ activo: false, nodo: false, mallas: [], estado: 'sin_zanjas', habiaGuardado: true });
  expect(c.excFloor).toEqual({ visible: true });                                                    // el piso de F3 vuelve
  expect(c.terreno.map(t => t.name).sort()).toEqual(['ground_seg_e', 'ground_seg_n', 'ground_seg_s', 'ground_seg_w', 'zone_seg_e', 'zone_seg_n', 'zone_seg_s', 'zone_seg_w']);   // los 8 segmentos de F3
  expect(c.originales).toEqual({ ground: false, zone: false });                                     // el original sigue oculto por la fosa de F3
  expect((await escena(page)).excavacion).toMatchObject({ largo: 4, ancho: 6, profundidad: 0.3, activa: true });
  expect(await rayo(page, 1, -0.5)).toMatchObject({ nombre: 'exc_floor' });
  await expect(page.locator('#plano-zanjas')).toHaveText('🕳️ Excavar zanjas');
  await expect(page.locator('#plano-zanjas-rellenar')).toBeHidden();
  await expect(page.locator('#plano-zanjas-estado')).toHaveText('Sin zanjas');
  const put = await putCon(page, reg, x => x.progreso && 'cimentacion' in x.progreso && x.progreso.cimentacion === null);
  expect(put.estado.progreso.cimentacion).toBeNull();
  const page2 = await context.newPage();
  const reg2 = await abrirCasa(page2, [], put.progreso);
  expect(await cim(page2)).toMatchObject({ activo: false, nodo: false, habiaGuardado: false });
  expect((await escena(page2)).excavacion).toMatchObject({ activa: true });
  expect(Object.keys((await snap(page2)).progreso)).not.toContain('cimentacion');
  expect(errores(reg)).toEqual([]);
  expect(errores(reg2)).toEqual([]);
});

// ── Z15 · las guardas de F3 no cambian nada sin zanjas ───────────────────────────────────────────────────
test('Z15 · sin zanjas, la fosa de F3 se comporta como siempre: cuatro ground_seg_[nsew], ocho segmentos, piso visible, y al quitarla vuelve el terreno original', async ({ page }) => {
  const reg = await abrirCasa(page, [], { plano: planoCon({ habitaciones: [H1] }) });
  await crearFosa(page, 6, 8, 1);
  const e = await escena(page);
  expect(e.mallas.filter(m => /^ground_seg_[nsew]$/.test(m.name)).length).toBe(4);
  expect(e.mallas.filter(m => /^zone_seg_[nsew]$/.test(m.name)).length).toBe(4);
  expect(e.mallas.some(m => /ground_seg_z|zone_seg_z|^zanja_/.test(m.name))).toBe(false);
  expect(e.mallas.find(m => m.name === 'ground').visible).toBe(false);
  expect(e.mallas.find(m => m.name === 'exc_floor').visible).toBe(true);
  expect(await cim(page)).toMatchObject({ activo: false, nodo: false, mallas: [], terreno: expect.any(Array), vistaPrevia: expect.anything() });
  await quitarFosa(page);
  await expect.poll(async () => (await escena(page)).excavacion, { timeout: 60_000 }).toBeNull();
  const f = await escena(page);
  expect(f.mallas.filter(m => /^(ground|zone)_seg_/.test(m.name)).length).toBe(0);
  expect(f.mallas.find(m => m.name === 'ground').visible).toBe(true);
  expect(errores(reg)).toEqual([]);
});

// ── Z16 · tamaños: 50 habitaciones ────────────────────────────────────────────────────────────────────
test('Z16 · aditivo y tamaños: sin zanjas el progreso no cambia de claves; con 50 habitaciones lo guardado cabe (cimentación × 2 < 4 KB y PUT completo < 90 KB) y excavar tarda un tiempo razonable', async ({ page }) => {
  const habs = Array.from({ length: 50 }, (_, i) => hab(`h${i + 1}`, (i % 10) * 9 - 45, Math.floor(i / 10) * 9 - 22, 4.5, 3.5, `Cuarto ${i + 1}`));
  const reg = await abrirCasa(page, [], { plano: planoCon({ lote: { ancho: 100, largo: 100 }, habitaciones: habs }) });
  const antes = Object.keys((await snap(page)).progreso).sort();
  expect(antes).not.toContain('cimentacion');
  await abrirEditor(page);
  const t0 = Date.now();
  await excavar(page);
  const ms = Date.now() - t0;
  const c = await cim(page);
  expect(c.habitaciones).toBe(50);
  expect(c.resumen.zanjas).toBe(200);                                                               // 4 paredes por cuarto, ninguna compartida
  expect(c.avisos).toContain('fuera_terreno');                                                      // el lote de 100 m sale del terreno visible de ±13 m
  const despues = Object.keys((await snap(page)).progreso).sort();
  expect(despues).toEqual([...antes, 'cimentacion'].sort());                                        // lo único nuevo es la clave cimentacion
  const s = await snap(page);
  const bytesCim = Buffer.byteLength(JSON.stringify(s.progreso.cimentacion));
  const bytesTodo = Buffer.byteLength(JSON.stringify({ proyecto_id: 1, slot: 1, estado: s.estado, progreso: s.progreso }));
  console.log(`MEDIDO Z16: 50 habitaciones → cimentación ${bytesCim} B (×2 = ${2 * bytesCim} B), PUT completo ${bytesTodo} B (${(bytesTodo / 1024).toFixed(1)} KB); Excavar (clic → zanjas visibles) ${ms} ms`);
  expect(bytesCim).toBeLessThan(2048);
  expect(2 * bytesCim).toBeLessThan(4 * 1024);
  expect(bytesTodo).toBeLessThan(90 * 1024);
  await expect.poll(() => reg.tamanos.length, { timeout: 90_000, intervals: [500] }).toBeGreaterThan(0);
  expect(Math.max(...reg.tamanos)).toBeLessThan(100 * 1024);                                       // el servidor rechaza cuerpos de más de 100 KB
  expect(errores(reg)).toEqual([]);
});

// ── Z17 · El panel no cubre el lienzo (regresión hallada con plano_editor P6: el panel cerrado tapaba el píxel donde esa prueba empieza el arrastre con Espacio) ──
test('Z17 · el panel está oculto por defecto y ningún punto del lienzo cae sobre él; «⚙ Zanjas» lo abre y lo cierra y «Excavar zanjas» lo abre', async ({ page }) => {
  const reg = await conPlano(page, [H1]);
  await expect(page.locator('#cimentacion-panel')).toBeHidden();
  await expect(page.locator('#plano-zanjas-panel')).toHaveText('⚙ Zanjas');
  await expect(page.locator('#plano-zanjas-panel')).toHaveAttribute('aria-expanded', 'false');
  const sobreElLienzo = () => page.evaluate(() => {                                                // puntos del lienzo cuyo elemento superior pertenece al panel
    const l = document.getElementById('plano-lienzo').getBoundingClientRect(), malos = [];
    for (let x = l.left + 4; x < l.right; x += 24) for (let y = l.top + 4; y < l.bottom; y += 24) {
      const e = document.elementFromPoint(x, y);
      if (e && e.closest('#cimentacion-panel')) malos.push([Math.round(x), Math.round(y)]);
    }
    return { malos, esquina: (() => { const e = document.elementFromPoint(l.right - 100, l.bottom - 60); return e ? e.id || e.tagName : null; })() };
  });
  const antes = await sobreElLienzo();
  expect(antes.malos).toEqual([]);
  expect(antes.esquina).not.toMatch(/cim|SUMMARY|ASIDE/i);                                         // la esquina inferior derecha es lienzo (el punto de P6 estaba ahí)
  await page.locator('#plano-zanjas-panel').click();
  await expect(page.locator('#cimentacion-panel')).toBeVisible();
  await expect(page.locator('#plano-zanjas-panel')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#cim-estado-txt')).toHaveText('Sin zanjas');
  await page.locator('#plano-zanjas-panel').click();
  await expect(page.locator('#cimentacion-panel')).toBeHidden();
  await expect(page.locator('#plano-zanjas-panel')).toHaveAttribute('aria-expanded', 'false');
  expect((await sobreElLienzo()).malos).toEqual([]);
  await excavar(page);                                                                             // al excavar el panel se abre con los resultados
  await expect(page.locator('#cimentacion-panel')).toBeVisible();
  await expect(page.locator('#cim-estado-txt')).toHaveText('Zanjas vigentes');
  expect(await valor(page, 'volumen')).toBe(1.89);
  expect(errores(reg)).toEqual([]);
});
