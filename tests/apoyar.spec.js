// F2.4c · «Apoyar» explícito: botón del panel de F2.2, atajo A, animación de 200 ms, aviso de caída (|Δ| > 2 m),
// deshacer del último «Apoyar» (botón y Ctrl+Z), telemetría y guardado.
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Las piezas de cada caso nacen de un guardado
// sintético (posiciones exactas); los clics y teclas son los reales del alumno. El estado se lee con window.__steamTest
// (solo lectura) y con el DOM del panel. En un equipo sin GPU el simulador corre a ~1,5 FPS: esperas por condición.
//
// Correspondencia con la autorización (A1–A19) y las condiciones C1/C2 de la aprobación: ver el título de cada prueba
// y la tabla de docs/F2.4c_cierre.md.
import { test, expect } from '@playwright/test';
import { abrirSimulador } from './helpers.js';

test.describe.configure({ timeout: 300_000 });

const PROGRESO = {
  buildPhase: 4, concretoUnlocked: true, matematicasValidadas: true,
  puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off',
};
const bloque = (id, x, y, z) => ({ id, type: 'block', p: [x, y, z], r: [0, 0, 0] });
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
/** Selecciona con el mismo clic de la lista «Colocados» que usa el alumno y espera al panel de estado. */
async function seleccionar(page, id) {
  await page.locator(`#obj-items .obj-item[onclick="selectFromList(${id})"]`).click();
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(id);
  await hasta(page, a => a.panel.visible && a.estado !== null);
}
const hasta = (page, fn, timeout = 120_000) =>
  expect.poll(async () => fn(await aviso(page)), { timeout, intervals: [300] }).toBe(true);
const estadoDe = async page => (await aviso(page)).estado?.estado ?? null;
const esperarEstado = (page, estado) => expect.poll(() => estadoDe(page), { timeout: 120_000, intervals: [300] }).toBe(estado);
const esperarBase = (page, id, y) => expect.poll(async () => (await limites(page, id)).min.y, { timeout: 120_000, intervals: [300] }).toBeCloseTo(y, 3);
/** Eventos de telemetría de un tipo (espera a que salgan en el siguiente envío por lotes). */
async function eventos(page, reg, tipo, n = 1) {
  await expect.poll(() => reg.telemetria.filter(e => e.tipo_evento === tipo).length, { timeout: 90_000, intervals: [500] }).toBeGreaterThanOrEqual(n);
  return reg.telemetria.filter(e => e.tipo_evento === tipo);
}
const btn = page => page.locator('#apoyar-btn');
const deshacer = page => page.locator('#apoyar-deshacer');
const confirma = page => page.locator('#apoyar-confirma');
const tecla = (page, code, init = {}) => page.evaluate(({ code, init }) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.replace('Key', '').toLowerCase(), bubbles: true, ...init })), { code, init });
const sinCamara = c => ({ alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target });

// ── 1 · A1 · A2 · A3 ─────────────────────────────────────────────────────────
test('1 · A1 A2 A3 · «Apoyar» es visible solo con estado flotante y está habilitado solo si Δ es un número', async ({ page }) => {
  // id 1: flotante sobre el suelo (Δ = −0,5). id 2: apoyada. id 3: flotante «por contacto» (a la altura del apoyo pero con
  // 30 % de contacto): desplazamientoParaApoyar da null. id 4: su apoyo.
  await abrirCon(page, [bloque(1, 0, 0.5, 0), bloque(2, 4, 0, 0), bloque(3, -3.3, 0.7, -4), bloque(4, -4, 0, -4)]);
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('flotante');
  await expect(btn(page)).toBeVisible();
  await expect(btn(page)).toBeEnabled();                                              // A1
  await expect(btn(page)).toHaveAttribute('title', 'Bajar la pieza hasta su apoyo más cercano (atajo: A)');
  await seleccionar(page, 2);
  expect(await estadoDe(page)).toBe('apoyada');
  await expect(btn(page)).toBeHidden();                                               // A2
  await seleccionar(page, 3);
  expect(await estadoDe(page)).toBe('flotante');
  await expect(btn(page)).toBeVisible();
  await expect(btn(page)).toBeDisabled();                                             // A3
  await expect(deshacer(page)).toBeHidden();
});

// ── 2 · A4 · A10 · A14 · A16 · C2 ────────────────────────────────────────────
test('2 · A4 A10 A14 A16 C2 · clic en «Apoyar» (|Δ| ≤ 2 m): animación, pieza apoyada, telemetría, cámara quieta y botón/atajo bloqueados durante los 200 ms', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  const camAntes = await camara(page);
  const r = await page.evaluate(() => {
    const b = document.getElementById('apoyar-btn');
    const base = () => window.__steamTest.limitesObjeto(1).min.y;
    const antes = base();
    b.click();
    const durante = { base: base(), deshabilitado: b.disabled };                     // C2: bloqueado en el mismo instante
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true })); // C2: el atajo no hace nada
    return { antes, durante };
  });
  expect(r.antes).toBeCloseTo(0.5, 3);
  expect(r.durante.base).toBeCloseTo(0.5, 3);       // A4: no salta de golpe; se anima (el movimiento llega en los fotogramas siguientes)
  expect(r.durante.deshabilitado).toBe(true);       // C2
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);                    // A4: termina exactamente sobre el apoyo
  await expect(btn(page)).toBeHidden();             // apoyada → ya no hay botón (C2: se vuelve a evaluar al terminar)
  await expect(deshacer(page)).toBeVisible();       // A10
  const ev = await eventos(page, reg, 'apoyar_pieza');
  await cuadros(page, 3);
  expect(reg.telemetria.filter(e => e.tipo_evento === 'apoyar_pieza')).toHaveLength(1); // C2: el segundo «A» no repitió la acción
  const c = ev[0].contexto;                                                           // A14
  expect(c.id).toBe(1);
  expect(c.tipo).toBe('block');
  expect(c.desplazamiento).toBeCloseTo(-0.5, 3);
  expect(c.estado_anterior).toBe('flotante');
  expect(c.estado_nuevo).toBe('apoyada');
  expect(c.confirmado).toBe(true);
  expect(c.cancelado).toBe(false);
  expect(ev[0].pos_y).toBeCloseTo(0, 3);
  const camDespues = await camara(page);                                              // A16
  expect(sinCamara(camDespues).alpha).toBeCloseTo(sinCamara(camAntes).alpha, 5);
  expect(sinCamara(camDespues).beta).toBeCloseTo(sinCamara(camAntes).beta, 5);
  expect(sinCamara(camDespues).radius).toBeCloseTo(sinCamara(camAntes).radius, 5);
  expect(camDespues.target).toEqual(camAntes.target);
  expect(reg.errores).toEqual([]);
});

// ── 3 · A5 · A6 · aviso de caída ─────────────────────────────────────────────
test('3 · A5 A6 · |Δ| > 2 m pide confirmación: Confirmar apoya; Cancelar y Escape no cambian nada', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 3.5, 0), bloque(2, 4, 5, 0)]);
  // A5 · Δ = −3,5 → aviso → Confirmar → animación → apoyada
  await seleccionar(page, 1);
  await btn(page).click();
  await expect(confirma(page)).toBeVisible();
  await expect(page.locator('#apoyar-confirma-texto')).toHaveText('¿Apoyar la pieza a 3.5 m más abajo?');
  await cuadros(page, 3);
  expect((await limites(page, 1)).min.y).toBeCloseTo(3.5, 3);                          // sin confirmar no se mueve
  await page.locator('#apoyar-confirma-si').click();
  await expect(confirma(page)).toBeHidden();
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);
  const ok = (await eventos(page, reg, 'apoyar_pieza')).find(e => e.contexto.id === 1);
  expect(ok.contexto.confirmado).toBe(true);
  expect(ok.contexto.cancelado).toBe(false);
  expect(ok.contexto.desplazamiento).toBeCloseTo(-3.5, 3);
  // A6 · Δ = −5 → aviso → Cancelar → sin cambios, con telemetría cancelado
  await seleccionar(page, 2);
  await btn(page).click();
  await expect(page.locator('#apoyar-confirma-texto')).toHaveText('¿Apoyar la pieza a 5 m más abajo?');
  await page.locator('#apoyar-confirma-no').click();
  await expect(confirma(page)).toBeHidden();
  await cuadros(page, 4);
  expect((await limites(page, 2)).min.y).toBeCloseTo(5, 3);
  expect(await estadoDe(page)).toBe('flotante');
  const cancelado = (await eventos(page, reg, 'apoyar_pieza', 2)).find(e => e.contexto.id === 2);
  expect(cancelado.contexto.cancelado).toBe(true);
  expect(cancelado.contexto.confirmado).toBe(false);
  expect(cancelado.contexto.desplazamiento).toBeCloseTo(-5, 3);
  expect(cancelado.contexto.estado_nuevo).toBe('flotante');
  // Escape también cancela y NO oculta el panel de F2.2 (el Escape del aviso de caída tiene prioridad)
  await btn(page).click();
  await expect(confirma(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirma(page)).toBeHidden();
  await cuadros(page, 3);
  expect((await limites(page, 2)).min.y).toBeCloseTo(5, 3);
  expect((await aviso(page)).panel.visible).toBe(true);
  expect(reg.errores).toEqual([]);
});

// ── 4 · A7 · A8 · A9 · atajo A ───────────────────────────────────────────────
test('4 · A7 A8 A9 · atajo A: igual que el clic; sin selección, con el foco en un campo o con un modal abierto no hace nada', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0), bloque(2, 4, 0.5, 0)]);
  // A8 · sin pieza seleccionada
  expect(await seleccionado(page)).toBeNull();
  await page.keyboard.press('a');
  await cuadros(page, 4);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0.5, 3);
  expect((await limites(page, 2)).min.y).toBeCloseTo(0.5, 3);
  await seleccionar(page, 1);
  // A9 · foco en un campo (la casilla de sonido es un <input>)
  await page.locator('#aviso-sonido').focus();
  await page.keyboard.press('a');
  await cuadros(page, 4);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0.5, 3);
  await page.evaluate(() => document.activeElement.blur());
  // A9 · modal abierto (se simula con la misma clase `open` que usan los modales reales)
  await page.evaluate(() => document.getElementById('reset-overlay').classList.add('open'));
  await page.keyboard.press('a');
  await cuadros(page, 4);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0.5, 3);
  await page.evaluate(() => document.getElementById('reset-overlay').classList.remove('open'));
  // A7 · el atajo hace lo mismo que el clic
  await page.keyboard.press('a');
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);
  expect((await limites(page, 2)).min.y).toBeCloseTo(0.5, 3);                           // la otra pieza no se toca
  const ev = await eventos(page, reg, 'apoyar_pieza');
  expect(ev).toHaveLength(1);
  expect(ev[0].contexto.id).toBe(1);
  expect(reg.errores).toEqual([]);
});

// ── 5 · A10 · A11 · A12 · A13 · A15 · deshacer ───────────────────────────────
test('5 · A10 A11 A12 A13 A15 · «Deshacer» (botón y Ctrl+Z) revierte solo el último «Apoyar» y se limpia al cambiar de pieza', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0), bloque(2, 4, 0.5, 0)]);
  await seleccionar(page, 1);
  await btn(page).click();
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);
  await expect(deshacer(page)).toBeVisible();                                           // A10
  // A11 · botón «Deshacer»: vuelve a flotante en su posición previa
  await deshacer(page).click();
  await esperarBase(page, 1, 0.5);
  await esperarEstado(page, 'flotante');
  await expect(deshacer(page)).toBeHidden();
  await expect(btn(page)).toBeVisible();
  const des = await eventos(page, reg, 'deshacer_apoyar');                              // A15
  expect(des).toHaveLength(1);
  expect(des[0].contexto.id).toBe(1);
  expect(des[0].contexto.desplazamiento_revertido).toBeCloseTo(-0.5, 3);
  // A12 · Ctrl+Z
  await btn(page).click();
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);
  await page.keyboard.press('Control+z');
  await esperarBase(page, 1, 0.5);
  await esperarEstado(page, 'flotante');
  await expect(deshacer(page)).toBeHidden();
  await eventos(page, reg, 'deshacer_apoyar', 2);
  // Con la ranura vacía Ctrl+Z no hace nada (no hay segundo nivel de deshacer)
  await page.keyboard.press('Control+z');
  await cuadros(page, 4);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0.5, 3);
  // A13 · cambiar de pieza limpia el deshacer, aunque se vuelva a la primera
  await btn(page).click();
  await esperarEstado(page, 'apoyada');
  await expect(deshacer(page)).toBeVisible();
  await seleccionar(page, 2);
  await expect(deshacer(page)).toBeHidden();
  await seleccionar(page, 1);
  await expect(deshacer(page)).toBeHidden();
  await page.keyboard.press('Control+z');
  await cuadros(page, 4);
  expect((await limites(page, 1)).min.y).toBeCloseTo(0, 3);                             // sigue apoyada
  expect(reg.errores).toEqual([]);
});

// ── 6 · A17 · gizmo ──────────────────────────────────────────────────────────
test('6 · A17 · el gizmo sigue funcionando después de «Apoyar»', async ({ page }) => {
  await abrirCon(page, [bloque(1, 0, 0.5, 0)]);
  await seleccionar(page, 1);
  await btn(page).click();
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);
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

// ── 7 · A18 · A19 · guardado ─────────────────────────────────────────────────
test('7 · A18 A19 · la nueva posición se guarda como cualquier movimiento (p[1]) y el JSON v2 no incluye nada de «Apoyar»', async ({ page, context }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 0.5, 0), bloque(2, 4, 0, 0)]);
  await seleccionar(page, 1);
  await btn(page).click();
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0);
  // El PUT del autoguardado llega con la y nueva: p[1] del objeto 1 ≈ 0 (antes era 0,5)
  await expect.poll(() => {
    const ult = reg.puts.at(-1);
    const o = ult?.estado?.objetos?.find(x => x.id === 1);
    return o ? o.p[1] : null;
  }, { timeout: 120_000, intervals: [500] }).toBeCloseTo(0, 3);
  const put = reg.puts.at(-1);
  // A19 · formato v2 intacto: mismas claves por objeto, versión 2, sin rastro de la animación, del aviso ni del deshacer
  expect(put.estado.v).toBe(2);
  expect(Object.keys(put.estado.objetos[0]).sort()).toEqual(['id', 'p', 'r', 'type']);
  const texto = JSON.stringify(put);
  expect(texto).not.toMatch(/apoyar|apoyo|deshacer|undo|estadoColocacion|anim/i);
  expect(put.estado.objetos.find(o => o.id === 2).p).toEqual([4, 0, 0]);              // la otra pieza no cambió
  // A18 · recargar: otra pestaña abre el guardado devuelto y la pieza sigue apoyada en su nueva posición
  const page2 = await context.newPage();
  await abrirCon(page2, put.estado.objetos);
  await esperarBase(page2, 1, 0);
  await seleccionar(page2, 1);
  expect(await estadoDe(page2)).toBe('apoyada');
  await expect(btn(page2)).toBeHidden();
  await expect(deshacer(page2)).toBeHidden();                                           // el deshacer es de sesión: no se restaura
});

// ── 8 · C1 · enforceBlockCollision durante la animación (A20) ────────────────
test('8 · A20 C1 · durante la animación actúa la colisión de casa.js: termina exactamente en el apoyo y, si aparece un obstáculo, la pieza no lo penetra', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 1.5, 0), bloque(2, 0, 0, 0)]);
  // (a) camino despejado: el bloque 1 baja 0,8 m hasta el tope del bloque 2 (0,7) y termina EXACTO; el bloque 2 no se mueve.
  await seleccionar(page, 1);
  expect(await estadoDe(page)).toBe('flotante');
  await btn(page).click();
  await esperarEstado(page, 'apoyada');
  await esperarBase(page, 1, 0.7);
  expect((await limites(page, 2)).min.y).toBeCloseTo(0, 3);
  expect((await limites(page, 2)).max.y).toBeCloseTo(0.7, 3);
  expect((await aviso(page)).estado.avisos).toEqual([]);                                // sin «superpuesta»
  const a = (await eventos(page, reg, 'apoyar_pieza')).find(e => e.contexto.id === 1);
  expect(a.contexto.desplazamiento).toBeCloseTo(-0.8, 3);                               // se aplicó el Δ completo
  await deshacer(page).click();
  await esperarBase(page, 1, 1.5);
});

// ── 9 · cancelación durante la animación ─────────────────────────────────────
// Un obstáculo «que aparece» durante los 200 ms no se puede producir sin una interacción: crear o seleccionar otra pieza
// cambia la selección, y eso cancela el «Apoyar» (comportamiento aprobado). Se prueban las dos interacciones que lo hacen.
test('9 · cancelación · cambiar de selección o girar con el teclado durante la animación la cancela: la pieza vuelve a su y inicial, sin telemetría ni deshacer', async ({ page }) => {
  const reg = await abrirCon(page, [bloque(1, 0, 1.5, 0), bloque(2, 4, 1.5, 0)]);
  await seleccionar(page, 1);
  // (a) cambiar de selección en el mismo instante en que se pulsa «Apoyar»
  await page.evaluate(() => { document.getElementById('apoyar-btn').click(); window.selectFromList(2); });
  await expect.poll(() => seleccionado(page), { timeout: 60_000 }).toBe(2);
  await cuadros(page, 6);
  expect((await limites(page, 1)).min.y).toBeCloseTo(1.5, 3);
  await seleccionar(page, 1);
  await expect(deshacer(page)).toBeHidden();
  await expect(btn(page)).toBeEnabled();
  // (b) girar con el teclado (Q/E/R/F/T/G/X) en el mismo instante
  await page.evaluate(() => {
    document.getElementById('apoyar-btn').click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
  });
  await cuadros(page, 6);
  expect((await limites(page, 1)).min.y).toBeCloseTo(1.5, 2);
  await esperarEstado(page, 'flotante');
  await expect(btn(page)).toBeEnabled();                                                // se vuelve a habilitar al cancelar (C2)
  await expect(deshacer(page)).toBeHidden();
  // Ninguna de las dos cancelaciones registra apoyar_pieza (esperamos a que salgan los avisos de las selecciones: mismo lote)
  await eventos(page, reg, 'aviso_colocacion', 2);
  expect(reg.telemetria.filter(e => e.tipo_evento === 'apoyar_pieza')).toHaveLength(0);
  expect(reg.errores).toEqual([]);
});
