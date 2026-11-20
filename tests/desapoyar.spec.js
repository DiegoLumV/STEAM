// F2.4d · «Desapoyar» explícito: botón del panel de F2.2, atajo Shift+A, subida de 50 cm en 200 ms, deshacer de una ranura
// propia (convive con la de «Apoyar» en LIFO de dos niveles), telemetría y guardado.
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Las piezas de cada caso nacen de un guardado
// sintético (posiciones exactas); los clics y teclas son los reales del alumno. El estado se lee con window.__steamTest
// (solo lectura) y con el DOM del panel. En un equipo sin GPU el simulador corre a ~1,5 FPS: esperas por condición.
// Los ayudantes están DUPLICADOS de tests/apoyar.spec.js a propósito (ese archivo es de F2.4c y no se toca).
//
// Correspondencia con la autorización (D1–D21) y las condiciones C1–C5: ver el título de cada prueba y la tabla de
// docs/F2.4d_cierre.md.
import { test, expect } from '@playwright/test';
import { abrirSimulador } from './helpers.js';

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
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);

/** Abre el simulador con las piezas dadas y recoge la telemetría que sale hacia /api/telemetria. */
async function abrirCon(page, objetos) {
  const reg = await abrirSimulador(page, casa(objetos));
  reg.telemetria = [];
  page.on('request', r => {
    if (!r.url().includes('/api/telemetria')) return;
    try { reg.telemetria.push(...(JSON.parse(r.postData() || '{}').eventos || [])); } catch (e) { /* no es JSON */ }
  });
  await page.waitForFunction(n => window.__steamTest.resumenEscena().objetos.length === n, objetos.length, { timeout: 120_000 });
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  await cuadros(page, 2);
  return reg;
}
const hasta = (page, fn, timeout = 120_000) =>
  expect.poll(async () => fn(await aviso(page)), { timeout, intervals: [300] }).toBe(true);
/** Selecciona con el mismo clic de la lista «Colocados» y espera al panel de estado (piezas evaluables). */
async function seleccionar(page, id) {
  await seleccionarSinPanel(page, id);
  await hasta(page, a => a.panel.visible && a.estado !== null);
}
/** Selecciona una pieza que no tiene panel de F2.2 (muro, losa). */
async function seleccionarSinPanel(page, id) {
  await page.locator(`#obj-items .obj-item[onclick="selectFromList(${id})"]`).click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(id);
  await cuadros(page, 2);
}
const estadoDe = async page => (await aviso(page)).estado?.estado ?? null;
const esperarEstado = (page, estado) => expect.poll(() => estadoDe(page), { timeout: 120_000, intervals: [300] }).toBe(estado);
const esperarBase = (page, id, y) => expect.poll(async () => (await limites(page, id)).min.y, { timeout: 120_000, intervals: [300] }).toBeCloseTo(y, 3);
const baseDe = async (page, id) => (await limites(page, id)).min.y;
/** Eventos de telemetría de un tipo (espera a que salgan en el siguiente envío por lotes, cada 10 s). */
async function eventos(page, reg, tipo, n = 1) {
  await expect.poll(() => reg.telemetria.filter(e => e.tipo_evento === tipo).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThanOrEqual(n);
  return reg.telemetria.filter(e => e.tipo_evento === tipo);
}
const cuantos = (reg, tipo) => reg.telemetria.filter(e => e.tipo_evento === tipo).length;
/** Para comprobar que NO salió un evento: se deja pasar más de un envío por lotes (cada 10 s). */
const esperarEnvio = page => page.waitForTimeout(12_000);

const apoyar = page => page.locator('#apoyar-btn');
const deshacerA = page => page.locator('#apoyar-deshacer');
const desapoyar = page => page.locator('#desapoyar-btn');
const deshacerD = page => page.locator('#desapoyar-deshacer');
const sinCamara = c => ({ alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target });
/** Pulsa «Desapoyar» y espera a que la pieza `id` llegue a la base `y` con el panel ya refrescado. */
async function desapoyarHasta(page, id, y) {
  await desapoyar(page).click();
  await esperarBase(page, id, y);
  await expect(desapoyar(page)).toBeEnabled();
}

// ── 1 · D1 · D2 · alcance de la pieza seleccionada ───────────────────────────
test('1 · D1 D2 · «Desapoyar» está habilitado con una pieza seleccionada y deshabilitado sin ella (ni en muros ni en la losa)', async ({ page }) => {
  const reg = await abrirCon(page, [losa(3), bloque(1, 0, 0.2, 0), muro(2, -7, 0)]);
  await expect(desapoyar(page)).toBeDisabled();                                       // D2: nada seleccionado
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('apoyada');
  await expect(desapoyar(page)).toBeVisible();
  await expect(desapoyar(page)).toBeEnabled();                                        // D1 (pieza apoyada)
  await expect(desapoyar(page)).toHaveAttribute('title', 'Subir la pieza 50 cm desde su apoyo (atajo: Shift+A)');
  await expect(desapoyar(page)).toHaveText('↑ Desapoyar');
  await expect(apoyar(page)).toBeHidden();                                            // «Apoyar» sigue siendo solo para flotante
  await seleccionarSinPanel(page, 2);                                                 // muro: sin panel de F2.2
  const baseMuro = await baseDe(page, 2);                                             // (el muro tiene su propio desfase de base)
  await expect(desapoyar(page)).toBeDisabled();
  await page.keyboard.press('Shift+A');
  await cuadros(page, 4);
  expect(await baseDe(page, 2)).toBeCloseTo(baseMuro, 3);
  await seleccionarSinPanel(page, 3);                                                 // losa: estática
  await expect(desapoyar(page)).toBeDisabled();
  await page.keyboard.press('Shift+A');
  await cuadros(page, 4);
  expect((await limites(page, 3)).min.y).toBeCloseTo(0, 3);
  await esperarEnvio(page);
  expect(cuantos(reg, 'desapoyar_pieza')).toBe(0);
});

// ── 2 · D3 · D8 · D13 · D15 ──────────────────────────────────────────────────
test('2 · D3 D8 D13 D15 · clic en «Desapoyar»: animación, sube 50 cm, queda flotante, «Deshacer», telemetría y cámara quieta', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0, 0)]);
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('apoyada');
  const camAntes = await camara(page);
  const r = await page.evaluate(() => {
    const b = document.getElementById('desapoyar-btn');
    const base = () => window.__steamTest.limitesObjeto(1).min.y;
    const antes = base();
    b.click();
    return { antes, durante: { base: base(), deshabilitado: b.disabled } };
  });
  expect(r.antes).toBeCloseTo(0, 3);
  expect(r.durante.base).toBeCloseTo(0, 3);          // se anima: no salta de golpe
  expect(r.durante.deshabilitado).toBe(true);        // bloqueado durante los 200 ms
  await esperarBase(page, 1, 0.5);                   // D3: sube 50 cm
  await esperarEstado(page, 'flotante');             // D3: queda flotante
  await expect(deshacerD(page)).toBeVisible();       // D8
  await expect(deshacerA(page)).toBeHidden();
  await expect(apoyar(page)).toBeVisible();          // ahora sí es flotante y «Apoyar» está disponible
  await expect(desapoyar(page)).toBeEnabled();
  const ev = await eventos(page, reg, 'desapoyar_pieza');
  expect(ev).toHaveLength(1);                        // D13
  const c = ev[0].contexto;
  expect(Object.keys(c).sort()).toEqual(['estado_anterior', 'estado_nuevo', 'id', 'paso']);
  expect(c.id).toBe(1);
  expect(c.paso).toBeCloseTo(0.5, 3);
  expect(c.estado_anterior).toBe('apoyada');
  expect(c.estado_nuevo).toBe('flotante');
  expect(ev[0].pos_y).toBeCloseTo(0.5, 3);
  const camDespues = await camara(page);             // D15
  expect(sinCamara(camDespues).alpha).toBeCloseTo(sinCamara(camAntes).alpha, 5);
  expect(sinCamara(camDespues).beta).toBeCloseTo(sinCamara(camAntes).beta, 5);
  expect(sinCamara(camDespues).radius).toBeCloseTo(sinCamara(camAntes).radius, 5);
  expect(camDespues.target).toEqual(camAntes.target);
  expect(cuantos(reg, 'apoyar_pieza')).toBe(0);      // no toca la telemetría de «Apoyar»
  expect(reg.errores).toEqual([]);
});

// ── 3 · D4 · D5 · D6 · D7 · Shift+A ──────────────────────────────────────────
test('3 · D4 D5 D6 D7 · Shift+A = clic en «Desapoyar»; sin pieza, en un campo o con un modal no hace nada; A sin Shift sigue siendo «Apoyar»', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0), bloque(2, 4, 0, 0)]);
  // D5 · sin pieza seleccionada
  expect(await seleccionado(page)).toBeNull();
  await page.keyboard.press('Shift+A');
  await cuadros(page, 4);
  expect(await baseDe(page, 1)).toBeCloseTo(0.5, 3);
  expect(await baseDe(page, 2)).toBeCloseTo(0, 3);
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('flotante');
  // D6 · foco en un campo (la casilla de sonido es un <input>) y modal abierto
  await page.locator('#aviso-sonido').focus();
  await page.keyboard.press('Shift+A');
  await cuadros(page, 4);
  expect(await baseDe(page, 1)).toBeCloseTo(0.5, 3);
  await page.evaluate(() => document.activeElement.blur());
  await page.evaluate(() => document.getElementById('reset-overlay').classList.add('open'));
  await page.keyboard.press('Shift+A');
  await cuadros(page, 4);
  expect(await baseDe(page, 1)).toBeCloseTo(0.5, 3);
  await page.evaluate(() => document.getElementById('reset-overlay').classList.remove('open'));
  // D4 · Shift+A hace lo mismo que el clic: sube 50 cm, y NO apoya
  await page.keyboard.press('Shift+A');
  await esperarBase(page, 1, 1.0);
  await esperarEstado(page, 'flotante');
  expect(await baseDe(page, 2)).toBeCloseTo(0, 3);                                      // la otra pieza no se toca
  const d = await eventos(page, reg, 'desapoyar_pieza');
  expect(d).toHaveLength(1);
  expect(d[0].contexto.id).toBe(1);
  expect(cuantos(reg, 'apoyar_pieza')).toBe(0);                                        // Shift+A nunca llegó a «Apoyar»
  // D7 · A sin Shift sigue siendo «Apoyar»: baja 1 m hasta el suelo
  await page.keyboard.press('a');
  await esperarBase(page, 1, 0);
  await esperarEstado(page, 'apoyada');
  const a = await eventos(page, reg, 'apoyar_pieza');
  expect(a).toHaveLength(1);
  expect(a[0].contexto.desplazamiento).toBeCloseTo(-1, 3);
  expect(cuantos(reg, 'desapoyar_pieza')).toBe(1);
  expect(reg.errores).toEqual([]);
});

// ── 4 · D9 · D10 · D14 · deshacer ────────────────────────────────────────────
test('4 · D9 D10 D14 · «Deshacer» (botón y Ctrl+Z) devuelve la pieza a su posición previa y registra deshacer_desapoyar', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0, 0)]);
  await seleccionar(page, 1);
  await desapoyarHasta(page, 1, 0.5);
  await esperarEstado(page, 'flotante');
  await expect(deshacerD(page)).toBeVisible();
  await deshacerD(page).click();                                                       // D9
  await esperarBase(page, 1, 0);
  await esperarEstado(page, 'apoyada');
  await expect(deshacerD(page)).toBeHidden();
  const des = await eventos(page, reg, 'deshacer_desapoyar');                          // D14
  expect(des).toHaveLength(1);
  expect(Object.keys(des[0].contexto).sort()).toEqual(['id', 'paso_revertido']);
  expect(des[0].contexto.id).toBe(1);
  expect(des[0].contexto.paso_revertido).toBeCloseTo(0.5, 3);
  await desapoyarHasta(page, 1, 0.5);                                                  // D10 · Ctrl+Z
  await page.keyboard.press('Control+z');
  await esperarBase(page, 1, 0);
  await esperarEstado(page, 'apoyada');
  await expect(deshacerD(page)).toBeHidden();
  await eventos(page, reg, 'deshacer_desapoyar', 2);
  expect(cuantos(reg, 'deshacer_apoyar')).toBe(0);                                     // no toca la telemetría de «Apoyar»
  expect(reg.errores).toEqual([]);
});

// ── 5 · D11 · LIFO de dos niveles ────────────────────────────────────────────
test('5 · D11 · las ranuras de deshacer de «Apoyar» y «Desapoyar» son independientes: Ctrl+Z deshace primero la más reciente (LIFO de 2 niveles)', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  // (a) Apoyar y luego Desapoyar: el primer Ctrl+Z deshace el Desapoyar (no el Apoyar), el segundo el Apoyar
  await apoyar(page).click();
  await esperarBase(page, 1, 0);
  await esperarEstado(page, 'apoyada');
  await expect(deshacerA(page)).toBeVisible();
  await desapoyarHasta(page, 1, 0.5);
  await esperarEstado(page, 'flotante');
  await expect(deshacerD(page)).toBeVisible();
  await expect(deshacerA(page)).toBeHidden();                                          // solo vale el de la ranura vigente
  await page.keyboard.press('Control+z');
  await esperarBase(page, 1, 0);                                                       // deshizo el Desapoyar
  await expect(deshacerA(page)).toBeVisible();                                         // y ahora vale el de «Apoyar»
  await expect(deshacerD(page)).toBeHidden();
  await page.keyboard.press('Control+z');
  await esperarBase(page, 1, 0.5);                                                     // deshizo el Apoyar
  await esperarEstado(page, 'flotante');
  await expect(deshacerA(page)).toBeHidden();
  await expect(deshacerD(page)).toBeHidden();
  // (b) Desapoyar y luego Apoyar: el orden inverso
  await desapoyarHasta(page, 1, 1.0);
  await esperarEstado(page, 'flotante');
  await apoyar(page).click();
  await esperarBase(page, 1, 0);
  await esperarEstado(page, 'apoyada');
  await expect(deshacerA(page)).toBeVisible();
  await expect(deshacerD(page)).toBeHidden();
  await page.keyboard.press('Control+z');
  await esperarBase(page, 1, 1.0);                                                     // deshizo el Apoyar
  await expect(deshacerD(page)).toBeVisible();
  await expect(deshacerA(page)).toBeHidden();
  await page.keyboard.press('Control+z');
  await esperarBase(page, 1, 0.5);                                                     // deshizo el Desapoyar
  await expect(deshacerA(page)).toBeHidden();
  await expect(deshacerD(page)).toBeHidden();
  await page.keyboard.press('Control+z');                                              // sin ranuras: no hace nada
  await cuadros(page, 4);
  expect(await baseDe(page, 1)).toBeCloseTo(0.5, 3);
  await eventos(page, reg, 'deshacer_desapoyar', 2);
  await eventos(page, reg, 'deshacer_apoyar', 2);
  expect(reg.errores).toEqual([]);
});

// ── 6 · D12 ──────────────────────────────────────────────────────────────────
test('6 · D12 · cambiar de pieza limpia el «Deshacer» de «Desapoyar», aunque se vuelva a la primera', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 4, 0, 0)]);
  await seleccionar(page, 1);
  await desapoyarHasta(page, 1, 0.5);
  await esperarEstado(page, 'flotante');
  await expect(deshacerD(page)).toBeVisible();
  await seleccionar(page, 2);
  await expect(deshacerD(page)).toBeHidden();
  await seleccionar(page, 1);
  await expect(deshacerD(page)).toBeHidden();
  await page.keyboard.press('Control+z');
  await cuadros(page, 4);
  expect(await baseDe(page, 1)).toBeCloseTo(0.5, 3);                                   // sigue desapoyada
});

// ── 7 · D16 · gizmo ──────────────────────────────────────────────────────────
test('7 · D16 · el gizmo sigue funcionando después de «Desapoyar»', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0, 0)]);
  await seleccionar(page, 1);
  await desapoyarHasta(page, 1, 0.5);
  const centroX = async () => { const b = await limites(page, 1); return (b.min.x + b.max.x) / 2; };
  const x0 = await centroX();
  let g = null;
  await expect.poll(async () => { g = await page.evaluate(() => window.__steamTest.gizmoEnPantalla('x')); return g !== null; }, { timeout: 60_000 }).toBe(true);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(g.x + 60 * i / 6, g.y);
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await centroX()) - x0), { timeout: 60_000, intervals: [300] }).toBeGreaterThan(0.1);
});

// ── 8 · D17 · D18 · guardado ─────────────────────────────────────────────────
test('8 · D17 D18 · la nueva posición se guarda como cualquier movimiento (p[1]) y el JSON v2 no incluye nada de «Desapoyar»', async ({ page, context }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 4, 0, 0)]);
  await seleccionar(page, 1);
  await desapoyarHasta(page, 1, 0.5);
  await expect.poll(() => {
    const o = reg.puts.at(-1)?.estado?.objetos?.find(x => x.id === 1);
    return o ? o.p[1] : null;
  }, { timeout: 120_000, intervals: [500] }).toBeCloseTo(0.5, 3);
  const put = reg.puts.at(-1);
  expect(put.estado.v).toBe(2);                                                         // D18
  expect(Object.keys(put.estado.objetos[0]).sort()).toEqual(['id', 'p', 'r', 'type']);
  expect(JSON.stringify(put)).not.toMatch(/apoyar|apoyo|desapoy|deshacer|undo|paso|estadoColocacion|anim/i);
  expect(put.estado.objetos.find(o => o.id === 2).p).toEqual([4, 0, 0]);
  const page2 = await context.newPage();                                                // D17 · recargar
  await abrirCon(page2, put.estado.objetos);
  await esperarBase(page2, 1, 0.5);
  await seleccionar(page2, 1);
  expect(await estadoDe(page2)).toBe('flotante');
  await expect(deshacerD(page2)).toBeHidden();                                          // el deshacer es de sesión
});

// ── 9 · D19 · hundida ────────────────────────────────────────────────────────
test('9 · D19 · una pieza hundida sube 50 cm con «Desapoyar» aunque «Apoyar» no esté disponible', async ({ page }) => {
  const reg = await abrirCon(page, [losa(1), bloque(2, 0, 0, 0)]);   // la losa llega a y = 0,2: el bloque queda hundido 20 cm
  await seleccionar(page, 2);
  expect(await estadoDe(page)).toBe('hundida');
  await expect(apoyar(page)).toBeHidden();                           // «Apoyar» solo para flotante (F2.4c intacta)
  await expect(desapoyar(page)).toBeEnabled();
  await desapoyarHasta(page, 2, 0.5);
  await esperarEstado(page, 'flotante');                             // 0,5 − 0,2 de losa = 30 cm de hueco
  const ev = (await eventos(page, reg, 'desapoyar_pieza'))[0];
  expect(ev.contexto.estado_anterior).toBe('hundida');
  expect(ev.contexto.estado_nuevo).toBe('flotante');
  expect(ev.contexto.paso).toBeCloseTo(0.5, 3);
});

// ── 10 · D20 · C4 · flotante y sin techo ─────────────────────────────────────
test('10 · D20 C4 · una pieza flotante sube 50 cm más; cada pulsación vuelve a subir 50 cm, sin techo', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('flotante');
  await desapoyarHasta(page, 1, 1.0);                                // D20
  await esperarEstado(page, 'flotante');
  await desapoyarHasta(page, 1, 1.5);                                // C4: sin límite superior
  await desapoyarHasta(page, 1, 2.0);
  const ev = await eventos(page, reg, 'desapoyar_pieza', 3);
  expect(ev.map(e => Math.round(e.contexto.paso * 1000) / 1000)).toEqual([0.5, 0.5, 0.5]);
  expect(ev.map(e => e.contexto.estado_anterior)).toEqual(['flotante', 'flotante', 'flotante']);
});

// ── 11 · D21 · cancelación durante la animación ──────────────────────────────
test('11 · D21 · cambiar de selección, borrar o usar teclas durante la animación la cancela: la pieza vuelve a su y inicial, sin telemetría ni deshacer', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 4, 0, 0), bloque(3, -4, 0, 0)]);
  // (a) cambiar de selección en el mismo instante en que se pulsa «Desapoyar»
  await seleccionar(page, 1);
  await page.evaluate(() => { document.getElementById('desapoyar-btn').click(); window.selectFromList(2); });
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(2);
  await cuadros(page, 6);
  expect(await baseDe(page, 1)).toBeCloseTo(0, 3);
  await seleccionar(page, 1);
  await expect(deshacerD(page)).toBeHidden();
  await expect(desapoyar(page)).toBeEnabled();
  // (b) A, Shift+A, Ctrl+Z y girar (Q/E/R/F/T/G/X) en el mismo instante: cancelan (A y Ctrl+Z no ejecutan «Apoyar» ni deshacer)
  for (const init of [{ code: 'KeyA', shiftKey: true }, { code: 'KeyA' }, { code: 'KeyZ', ctrlKey: true }, { code: 'KeyE' }]) {
    await page.evaluate(({ code, ...resto }) => {
      document.getElementById('desapoyar-btn').click();
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.replace('Key', '').toLowerCase(), bubbles: true, ...resto }));
    }, init);
    await cuadros(page, 6);
    expect(await baseDe(page, 1), JSON.stringify(init)).toBeCloseTo(0, 3);
    await expect(desapoyar(page), JSON.stringify(init)).toBeEnabled();                 // se vuelve a habilitar al cancelar
    await expect(deshacerD(page)).toBeHidden();
  }
  // (c) borrar la pieza durante la animación
  await page.evaluate(() => { document.getElementById('desapoyar-btn').click(); document.getElementById('btnDel').click(); });
  await expect.poll(async () => (await page.evaluate(() => window.__steamTest.resumenEscena())).objetos.map(o => o.id), { timeout: 60_000 }).toEqual([2, 3]);
  await cuadros(page, 4);
  // (d) empezar a arrastrar el gizmo durante la animación
  await seleccionar(page, 2);
  let g = null;                                                                          // la posición del gizmo se mide ANTES de pulsar: la animación dura solo 200 ms
  await expect.poll(async () => { g = await page.evaluate(() => window.__steamTest.gizmoEnPantalla('x')); return g !== null; }, { timeout: 60_000 }).toBe(true);
  await page.mouse.move(g.x, g.y);
  await page.evaluate(() => document.getElementById('desapoyar-btn').click());
  await page.mouse.down();
  await page.mouse.up();
  await cuadros(page, 6);
  expect(await baseDe(page, 2)).toBeCloseTo(0, 3);
  await expect(deshacerD(page)).toBeHidden();
  await esperarEnvio(page);
  expect(cuantos(reg, 'desapoyar_pieza')).toBe(0);                                       // las interrupciones no registran nada
  expect(cuantos(reg, 'apoyar_pieza')).toBe(0);
  expect(cuantos(reg, 'deshacer_desapoyar')).toBe(0);
  expect(reg.errores).toEqual([]);
});

// ── 12 · C1 · C5 · pieza apilada ─────────────────────────────────────────────
test('12 · C1 C5 · con otra pieza encima la colisión de casa.js detiene la subida: sube lo que cabe y, si no cabe nada, no se mueve (sin telemetría ni deshacer)', async ({ page }) => {
  // Pila A: el bloque 2 descansa sobre el 1 (sin hueco). Pila B: el 4 está 30 cm por encima del tope del 3.
  const reg = await abrirCon(page, [bloque(1, 0, 0, 0), bloque(2, 0, 0.7, 0), bloque(3, 4, 0, 0), bloque(4, 4, 1.0, 0)]);
  // (a) no cabe nada → no se mueve
  await seleccionar(page, 1);
  await desapoyar(page).click();
  await expect(page.locator('#tip')).toContainText('No se pudo subir: otra pieza lo impide', { timeout: 120_000 });
  await cuadros(page, 4);
  expect(await baseDe(page, 1)).toBeCloseTo(0, 3);
  expect(await baseDe(page, 2)).toBeCloseTo(0.7, 3);
  await expect(deshacerD(page)).toBeHidden();                                           // C5: sin deshacer
  await expect(desapoyar(page)).toBeEnabled();
  // (b) cabe parte: sube hasta el contacto (≈ 30 cm; la colisión tolera 3 cm de penetración)
  await seleccionar(page, 3);
  await desapoyar(page).click();
  const ev = (await eventos(page, reg, 'desapoyar_pieza'))[0];
  const real = await baseDe(page, 3);
  expect(real).toBeGreaterThan(0.15);
  expect(real).toBeLessThan(0.36);                                                      // no llega a 0,5 ni atraviesa al bloque 4
  expect(ev.contexto.id).toBe(3);
  expect(ev.contexto.paso).toBeCloseTo(real, 2);                                        // lo REAL, no el 0,5 pedido
  expect(await baseDe(page, 4)).toBeCloseTo(1.0, 3);                                    // la pieza de encima no se mueve
  expect((await aviso(page)).estado.avisos).not.toContain('superpuesta');
  await expect(deshacerD(page)).toBeVisible();
  await deshacerD(page).click();
  await esperarBase(page, 3, 0);
  // (a) no registró nada: el único evento es el de la pila B
  expect(cuantos(reg, 'desapoyar_pieza')).toBe(1);
  expect(reg.errores).toEqual([]);
});

// ── 13 · C2 · bloqueo mutuo ──────────────────────────────────────────────────
test('13 · C2 · «Apoyar» y «Desapoyar» se bloquean mutuamente durante sus animaciones', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('flotante');
  await expect(apoyar(page)).toBeEnabled();
  // (a) durante «Desapoyar»: ambos botones deshabilitados y A (de «Apoyar») no apoya: cancela la animación
  const a = await page.evaluate(() => {
    document.getElementById('desapoyar-btn').click();
    const r = { apoyar: document.getElementById('apoyar-btn').disabled, desapoyar: document.getElementById('desapoyar-btn').disabled };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true }));
    return r;
  });
  expect(a).toEqual({ apoyar: true, desapoyar: true });
  await cuadros(page, 6);
  expect(await baseDe(page, 1)).toBeCloseTo(0.5, 3);                                    // cancelada y NO apoyada (habría bajado a 0)
  await expect(apoyar(page)).toBeEnabled();
  await expect(desapoyar(page)).toBeEnabled();
  // (b) durante «Apoyar»: «Desapoyar» deshabilitado y Shift+A no hace nada (ni cancela «Apoyar»)
  const b = await page.evaluate(() => {
    document.getElementById('apoyar-btn').click();
    const r = { desapoyar: document.getElementById('desapoyar-btn').disabled };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', shiftKey: true, bubbles: true }));
    return r;
  });
  expect(b).toEqual({ desapoyar: true });
  await esperarBase(page, 1, 0);                                                        // «Apoyar» terminó con normalidad
  await esperarEstado(page, 'apoyada');
  await esperarEnvio(page);
  expect(cuantos(reg, 'apoyar_pieza')).toBe(1);
  expect(cuantos(reg, 'desapoyar_pieza')).toBe(0);
  expect(reg.errores).toEqual([]);
});
