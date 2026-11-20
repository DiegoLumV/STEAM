// F3 · Terreno y tipo de suelo: selector de A.1, % a retirar, panel banco → suelto → viajes, persistencia aditiva.
// La API se simula (tests/helpers.js); no hay base de datos ni backend. Se usa el modal real (clics, selects y sliders).
// Las cifras de referencia vienen del Manual de Materiales (ejemplos 1.1 y 1.2). El ejemplo 1.2 tiene 68 m de largo y la
// herramienta limita la fosa a 18 m, así que en la interfaz se usa su geometría equivalente 17 × 0,60 × 0,80 m (= 8,16 m³);
// los datos exactos del Manual están en tests/calculos.test.js. Los ejercicios 1.2–1.4 (largo > 18 m) solo van en Node.
//
// Correspondencia con la autorización (T1–T13 y condiciones C1–C5): ver el título de cada prueba y docs/F3_cierre.md.
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador, resumen, instantanea } from './helpers.js';

test.describe.configure({ timeout: 300_000 });

const ARCILLA = 'tierra_margosa_arcilla_compacta';
const SIN_FACTOR = ['afirmado_bases_vias', 'material_sucio_rio_subbases'];

async function abrir(page, opciones = {}) {
  const reg = await abrirSimulador(page, opciones);
  reg.telemetria = [];
  page.on('request', r => {
    if (!r.url().includes('/api/telemetria')) return;
    try { reg.telemetria.push(...(JSON.parse(r.postData() || '{}').eventos || [])); } catch (e) { /* no es JSON */ }
  });
  return reg;
}
async function abrirModal(page) {
  await page.evaluate(() => window.openExcavacionModal());
  await expect(page.locator('#excavacion-overlay')).toHaveClass(/open/);
}
async function dims(page, largo, ancho, prof) {
  await page.fill('#exc-largo', String(largo));
  await page.fill('#exc-ancho', String(ancho));
  await page.fill('#exc-profundidad', String(prof));
}
const retiro = (page, pct) => page.locator('#exc-retiro-range').fill(String(pct));
const texto = (page, sel) => page.locator(sel).textContent().then(t => t.trim());
/** Lo que muestra el panel de resultados. */
const panel = async page => ({
  cadena: await texto(page, '#exc-res-cadena'),
  banco: await texto(page, '#exc-res-banco'),
  suelto: await texto(page, '#exc-res-suelto'),
  retirar: await texto(page, '#exc-res-retirar'),
  viajes: await texto(page, '#exc-res-viajes'),
});
const camara = page => page.evaluate(() => window.__steamTest.camara());
const cuadros = (page, n = 3) => page.evaluate(k => new Promise(r => {
  let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);
/** Espera a que el autoguardado envíe una excavación con tipo_suelo. */
async function ultimoPut(page, reg) {
  await expect.poll(() => reg.puts.filter(p => p.progreso?.excavacion?.tipo_suelo).length, { timeout: 60_000, intervals: [500] }).toBeGreaterThan(0);
  return reg.puts.filter(p => p.progreso?.excavacion?.tipo_suelo).at(-1);
}

/** Estado v2 sin objetos: carga rápido y basta para probar la restauración de progreso.excavacion. */
const estadoMinimo = excavacion => ({ v: 2, objetos: [], contador: 1, progreso: { excavacion }, terreno: { excavacion }, hitos: {} });

// ── T1 · C3 · selector con 11 opciones ───────────────────────────────────────
test('T1 C3 · el modal muestra el selector de suelo con 11 opciones: 9 habilitadas y 2 deshabilitadas con tooltip', async ({ page }) => {
  await abrir(page);
  await abrirModal(page);
  const sel = page.locator('#exc-suelo');
  await expect(sel).toBeVisible();
  await expect(sel.locator('option')).toHaveCount(11);
  await expect(sel.locator('option:not([disabled])')).toHaveCount(9);
  await expect(sel.locator('option[disabled]')).toHaveCount(2);
  const info = await sel.locator('option').evaluateAll(ops => ops.map(o => ({ v: o.value, d: o.disabled, t: o.title, x: o.textContent })));
  expect(info.filter(o => o.d).map(o => o.v).sort()).toEqual(SIN_FACTOR);
  for (const o of info.filter(o => o.d)) expect(o.t).toBe('Sin factor de conversión banco→suelto; no aplica a excavación');
  expect(info[0].v).toBe('tierra_vegetal');
  expect(info.find(o => o.v === 'tierra_vegetal').x).toContain('×1.10');
  expect(info.find(o => o.v === ARCILLA).x).toContain('×1.60');
  await expect(sel).toHaveValue('tierra_vegetal');                       // suelo por defecto
  await expect(page.locator('#exc-retiro-range')).toHaveValue('100');    // 100 % por defecto
  await expect(page.locator('#exc-resultados')).toBeVisible();
  // un suelo sin factor no se puede elegir con la interfaz
  await expect(sel.selectOption('afirmado_bases_vias', { timeout: 2000 })).rejects.toThrow();
});

// ── T2 · T3 · T4 · recálculo en vivo ─────────────────────────────────────────
test('T2 T3 T4 · cambiar el tipo de suelo o el % recalcula suelto y viajes sin reabrir el modal', async ({ page }) => {
  await abrir(page);
  await abrirModal(page);
  await dims(page, 12, 6, 0.8);                                           // banco 57.60
  let p = await panel(page);
  expect([p.banco, p.suelto, p.retirar]).toEqual(['57.60 m³', '63.36 m³', '63.36 m³']);   // T3: 100 % → todo
  expect(p.viajes).toBe('13 viajes (12.67 sin redondear)');
  await page.selectOption('#exc-suelo', ARCILLA);                         // T2: 57.60 × 1.60 = 92.16 → 18.43 → 19
  p = await panel(page);
  expect([p.banco, p.suelto, p.retirar]).toEqual(['57.60 m³', '92.16 m³', '92.16 m³']);
  expect(p.viajes).toBe('19 viajes (18.43 sin redondear)');
  await retiro(page, 70);                                                 // T4: 70 % de 92.16 = 64.512 → 12.90 → 13
  p = await panel(page);
  expect([p.banco, p.suelto, p.retirar]).toEqual(['57.60 m³', '92.16 m³', '64.51 m³']);
  expect(p.viajes).toBe('13 viajes (12.90 sin redondear)');
  expect(await texto(page, '#exc-retiro-val')).toBe('70 %');
  await retiro(page, 0);
  p = await panel(page);
  expect([p.retirar, p.viajes]).toEqual(['0.00 m³', '0 viajes (0.00 sin redondear)']);
  await retiro(page, 100);
  await page.selectOption('#exc-suelo', 'tierra_vegetal');
  expect((await panel(page)).viajes).toBe('13 viajes (12.67 sin redondear)');
  // cambiar las medidas también recalcula; con medidas inválidas el panel se oculta y vuelve al corregirlas
  await page.fill('#exc-largo', '19');
  await expect(page.locator('#exc-resultados')).toBeHidden();
  await page.fill('#exc-largo', '12');
  await expect(page.locator('#exc-resultados')).toBeVisible();
  // el modal sigue abierto todo el tiempo
  await expect(page.locator('#excavacion-overlay')).toHaveClass(/open/);
});

// ── T5 · ejemplo 1.1 ─────────────────────────────────────────────────────────
test('T5 · ejemplo 1.1 del Manual: tierra vegetal, lote 6 × 12, 0,80 m → 57,60 banco, 63,36 suelto, 13 viajes (12,67)', async ({ page }) => {
  await abrir(page);
  await abrirModal(page);
  await dims(page, 12, 6, 0.8);
  await page.selectOption('#exc-suelo', 'tierra_vegetal');
  await retiro(page, 100);
  expect(await panel(page)).toEqual({
    cadena: '57.60 m³ (banco) → 63.36 m³ (suelto) → 13 viajes de 5 m³',
    banco: '57.60 m³', suelto: '63.36 m³', retirar: '63.36 m³', viajes: '13 viajes (12.67 sin redondear)',
  });
  expect(await texto(page, '#exc-stat-vol')).toBe('57.60 m³');           // el volumen en banco de siempre no cambia
});

// ── T6 · ejemplo 1.2 (geometría equivalente) ─────────────────────────────────
test('T6 · ejemplo 1.2 del Manual (17 × 0,60 × 0,80 = 8,16 m³ en lugar de 0,30 × 0,40 × 68): arcilla compacta, 70 % → 8,16 / 13,06 / 9,14 / 2 viajes', async ({ page }) => {
  await abrir(page);
  await abrirModal(page);
  await dims(page, 17, 0.6, 0.8);
  await page.selectOption('#exc-suelo', ARCILLA);
  await retiro(page, 70);
  expect(await panel(page)).toEqual({
    cadena: '8.16 m³ (banco) → 13.06 m³ (suelto) → 2 viajes de 5 m³',
    banco: '8.16 m³', suelto: '13.06 m³', retirar: '9.14 m³', viajes: '2 viajes (1.83 sin redondear)',
  });
  // Con las medidas exactas del Manual (68 m) la herramienta lo rechaza: el límite de 18 m no se cambia.
  await page.fill('#exc-largo', '68'); await page.fill('#exc-ancho', '0.3'); await page.fill('#exc-profundidad', '0.4');
  await expect(page.locator('#exc-error')).toContainText('no puede exceder 18 m');
  await expect(page.locator('#btn-iniciar-excavacion')).toBeDisabled();
  await expect(page.locator('#exc-resultados')).toBeHidden();
});

// ── T7 · T13 · guardado y recarga ────────────────────────────────────────────
test('T7 T13 · guardar con tipo de suelo y % → el JSON v2 los incluye (aditivo) y al recargar se conservan', async ({ page, context }) => {
  const reg = await abrir(page, { estado: null });
  await abrirModal(page);
  await dims(page, 12, 6, 0.8);
  await page.selectOption('#exc-suelo', ARCILLA);
  await retiro(page, 70);
  await page.click('#btn-iniciar-excavacion');
  await expect(page.locator('#excavacion-overlay')).not.toHaveClass(/open/);
  const put = await ultimoPut(page, reg);
  // T13 · formato: las claves de siempre más las dos nuevas, y nada más
  const ex = put.progreso.excavacion;
  expect(Object.keys(ex).sort()).toEqual(['activa', 'ancho', 'largo', 'porcentaje_retiro', 'profundidad', 'tipo_suelo', 'volumen']);
  expect(ex).toMatchObject({ largo: 12, ancho: 6, profundidad: 0.8, volumen: 57.6, activa: true, tipo_suelo: ARCILLA, porcentaje_retiro: 0.7 });
  expect(put.estado.v).toBe(2);
  expect(put.estado.terreno.excavacion).toEqual(ex);                       // guardado.js lo copia sin cambios
  expect(Object.keys(put.estado).sort()).toEqual(['contador', 'hitos', 'objetos', 'progreso', 'terreno', 'v']);
  expect(JSON.stringify(put)).not.toMatch(/viajes|volumen_suelto|retirar|NaN|null.*tipo_suelo/);   // solo se guardan datos, no resultados
  // T7 · recargar con ese guardado
  const page2 = await context.newPage();
  await abrir(page2, { estado: put.estado, progreso: put.progreso });
  const r = await resumen(page2);
  expect(r.excavacion).toMatchObject({ largo: 12, ancho: 6, profundidad: 0.8, volumen: 57.6, activa: true, tipo_suelo: ARCILLA, porcentaje_retiro: 0.7 });
  await abrirModal(page2);
  await expect(page2.locator('#exc-suelo')).toHaveValue(ARCILLA);
  await expect(page2.locator('#exc-retiro-range')).toHaveValue('70');
  expect(await panel(page2)).toEqual({
    cadena: '57.60 m³ (banco) → 92.16 m³ (suelto) → 13 viajes de 5 m³',
    banco: '57.60 m³', suelto: '92.16 m³', retirar: '64.51 m³', viajes: '13 viajes (12.90 sin redondear)',
  });
  // y vuelve a serializarse igual (idempotencia)
  const { progreso } = await instantanea(page2);
  expect(progreso.excavacion).toEqual(ex);
  expect(reg.errores).toEqual([]);
});

// ── T8 · compatibilidad con guardados sin tipo_suelo ─────────────────────────
test('T8 · una casa guardada sin tipo_suelo (o con valores inválidos) carga con el suelo por defecto y 100 %, sin romper', async ({ page, context }) => {
  test.setTimeout(600_000); // varias páginas; en equipos sin GPU (~1,5 FPS) puede pasar de 5 min
  const c = leerCasa('excavacion_con_casa');                               // fosa 6 × 4 × 1,2 sin los campos nuevos
  expect(c.progreso.excavacion).not.toHaveProperty('tipo_suelo');
  const reg = await abrir(page, { estado: c.estado, progreso: c.progreso });
  let r = await resumen(page);
  expect(r.excavacion).toMatchObject({ largo: 6, ancho: 4, profundidad: 1.2, volumen: 28.8, activa: true, tipo_suelo: 'tierra_vegetal', porcentaje_retiro: 1 });
  await abrirModal(page);
  await expect(page.locator('#exc-suelo')).toHaveValue('tierra_vegetal');
  await expect(page.locator('#exc-retiro-range')).toHaveValue('100');
  expect(await panel(page)).toEqual({
    cadena: '28.80 m³ (banco) → 31.68 m³ (suelto) → 7 viajes de 5 m³',
    banco: '28.80 m³', suelto: '31.68 m³', retirar: '31.68 m³', viajes: '7 viajes (6.34 sin redondear)',
  });
  expect(reg.errores).toEqual([]);
  // valores inválidos guardados a mano: suelo sin factor, tipo desconocido, % fuera de 0–1 o texto
  for (const malo of [
    { tipo_suelo: 'afirmado_bases_vias', porcentaje_retiro: 5 },
    { tipo_suelo: 'no_existe', porcentaje_retiro: -1 },
    { tipo_suelo: 42, porcentaje_retiro: 'mucho' },
    { tipo_suelo: null, porcentaje_retiro: null },
    { tipo_suelo: '__proto__', porcentaje_retiro: NaN },
  ]) {
    const p2 = await context.newPage();
    const excavacion = { ...c.progreso.excavacion, ...malo };
    const reg2 = await abrir(p2, { estado: estadoMinimo(excavacion), progreso: { ...c.progreso, excavacion } });   // estado mínimo: la prueba solo mira progreso.excavacion
    r = await resumen(p2);
    expect(r.excavacion, JSON.stringify(malo)).toMatchObject({ activa: true, tipo_suelo: 'tierra_vegetal', porcentaje_retiro: 1 });
    expect(reg2.errores).toEqual([]);
    await p2.close();
  }
});

// ── T9 · T10 · fuente y nota educativa ───────────────────────────────────────
test('T9 T10 · el panel muestra la fuente (tooltip y nota) y la nota del redondeo educativo', async ({ page }) => {
  await abrir(page);
  await abrirModal(page);
  const fuente = page.locator('#exc-res-fuente');                          // T9
  await expect(fuente).toBeVisible();
  await expect(fuente).toContainText('Manual de Materiales, Tabla 1.1');
  await expect(fuente).toContainText('factores de conversión banco→suelto');
  await expect(page.locator('#exc-res-cadena')).toHaveAttribute('title', /Manual de Materiales, Tabla 1\.1/);
  await expect(page.locator('#exc-suelo')).toHaveAttribute('title', /Manual de Materiales, Tabla 1\.1/);
  await expect(page.locator('#exc-retiro-range')).toHaveAttribute('title',
    'Porcentaje del material suelto que se retira en volqueta. Ejemplo 1.2 del Manual de Materiales usa 70%.');
  const nota = page.locator('#exc-res-redondeo');                          // T10
  await expect(nota).toBeVisible();
  await expect(nota).toHaveText('El redondeo de viajes hacia arriba es criterio educativo de operación, no una regla matemática.');
  await expect(page.locator('#exc-res-sinfactor')).toBeVisible();
  // R9 de F2.1/02: el modal no habla de objetivos ni de «cumple»
  await expect(page.locator('#excavacion-modal')).not.toContainText(/Objetivo|objetivo|Cumple|cumple|Esperado/);
});

// ── T11 · T12 · cámara y gizmo ───────────────────────────────────────────────
test('T11 T12 · la cámara no se mueve al usar el selector y el gizmo sigue funcionando', async ({ page }) => {
  const objetos = [{ id: 1, type: 'block', p: [0, 0, 8], r: [0, 0, 0] }];
  const progreso = { buildPhase: 4, concretoUnlocked: true, matematicasValidadas: true, puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off' };
  await abrir(page, { estado: { v: 2, objetos, contador: 2, progreso, terreno: { excavacion: null }, hitos: {} }, progreso });
  await page.waitForFunction(() => window.__steamTest.resumenEscena().objetos.length === 1, null, { timeout: 120_000 });
  await page.evaluate(() => window.__steamTest.fijarCamara({ target: { x: 0, y: 0.5, z: 0 }, alpha: -Math.PI / 2, beta: 1.15, radius: 11 }));
  await cuadros(page, 2);
  const antes = await camara(page);
  await abrirModal(page);
  await page.selectOption('#exc-suelo', 'roca_blanda_arranque_maquina');
  await retiro(page, 35);
  await page.selectOption('#exc-suelo', ARCILLA);
  await page.click('#btn-iniciar-excavacion');
  await cuadros(page, 3);
  const despues = await camara(page);
  for (const k of ['alpha', 'beta', 'radius']) expect(despues[k], k).toBeCloseTo(antes[k], 5);
  expect(despues.target).toEqual(antes.target);
  // T12 · gizmo: seleccionar el bloque y arrastrarlo
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
});

// ── T14 · cerrar sin confirmar descarta (decisión 6) ─────────────────────────
test('T14 · cerrar el modal sin confirmar descarta el tipo de suelo y el % no confirmados', async ({ page }) => {
  const reg = await abrir(page, { estado: null });
  await abrirModal(page);
  await dims(page, 12, 6, 0.8);
  await page.selectOption('#exc-suelo', 'terrenos_fijos_pequena_cohesion');
  await retiro(page, 40);
  await page.click('#btn-iniciar-excavacion');
  await ultimoPut(page, reg);
  expect((await resumen(page)).excavacion).toMatchObject({ tipo_suelo: 'terrenos_fijos_pequena_cohesion', porcentaje_retiro: 0.4 });
  const putsAntes = reg.puts.length;
  // abrir, cambiar sin confirmar y cerrar con la ✕
  await abrirModal(page);
  await page.selectOption('#exc-suelo', 'roca_desmontada_barrenos');
  await retiro(page, 90);
  await page.click('#excavacion-header button');
  await expect(page.locator('#excavacion-overlay')).not.toHaveClass(/open/);
  expect((await resumen(page)).excavacion).toMatchObject({ tipo_suelo: 'terrenos_fijos_pequena_cohesion', porcentaje_retiro: 0.4 });
  await abrirModal(page);                                                   // al reabrir vuelven los valores confirmados
  await expect(page.locator('#exc-suelo')).toHaveValue('terrenos_fijos_pequena_cohesion');
  await expect(page.locator('#exc-retiro-range')).toHaveValue('40');
  await page.waitForTimeout(4000);
  expect(reg.puts.length).toBe(putsAntes);                                  // no se guardó nada nuevo
  // «Actualizar Excavación» sí confirma
  await page.selectOption('#exc-suelo', 'roca_desmontada_barrenos');
  await retiro(page, 90);
  await page.click('#btn-iniciar-excavacion');
  expect((await resumen(page)).excavacion).toMatchObject({ tipo_suelo: 'roca_desmontada_barrenos', porcentaje_retiro: 0.9 });
});

// ── T15 · telemetría ─────────────────────────────────────────────────────────
test('T15 · la telemetría de excavacion_realizada incluye tipo_suelo, porcentaje_retiro, volumen_suelto y viajes (sin eventos nuevos)', async ({ page }) => {
  const reg = await abrir(page, { estado: null });
  await abrirModal(page);
  await dims(page, 12, 6, 0.8);
  await page.selectOption('#exc-suelo', ARCILLA);
  await retiro(page, 70);
  await page.click('#btn-iniciar-excavacion');
  await expect.poll(() => reg.telemetria.filter(e => e.tipo_evento === 'excavacion_realizada').length, { timeout: 60_000, intervals: [500] }).toBe(1);
  const ev = reg.telemetria.find(e => e.tipo_evento === 'excavacion_realizada');
  expect(ev.contexto).toEqual({
    largo: 12, ancho: 6, profundidad: 0.8, volumen: 57.6,
    tipo_suelo: ARCILLA, porcentaje_retiro: 0.7, volumen_suelto: 92.16, viajes: 13,
  });
  // cambiar el selector o el slider no genera eventos propios
  await abrirModal(page);
  await page.selectOption('#exc-suelo', 'tierra_franca');
  await retiro(page, 10);
  await page.waitForTimeout(12_000);
  const tipos = new Set(reg.telemetria.map(e => e.tipo_evento));
  expect([...tipos].filter(t => /suelo|retiro|viaje|volqueta/i.test(t))).toEqual([]);
  expect(reg.telemetria.filter(e => e.tipo_evento === 'excavacion_realizada')).toHaveLength(1);
});

// ── T16 · C5 · la geometría no depende del suelo ni del % ────────────────────
test('T16 C5 · la geometría de la excavación (fosa, estacas, cinta, mira, montículo) es la misma con cualquier suelo y %', async ({ page, context }) => {
  test.setTimeout(600_000); // dos páginas con excavación; en equipos sin GPU (~1,5 FPS) puede pasar de 5 min
  const mallas = async p => (await resumen(p)).mallas.filter(m => /^exc_|^ground_seg_|^zone_seg_/.test(m.name)).map(m => `${m.name}:${m.visible}:${m.enabled}`).sort();
  const crear = async (p, suelo, pct) => {
    await abrir(p, { estado: null });
    await abrirModal(p);
    await dims(p, 12, 6, 0.8);
    await p.selectOption('#exc-suelo', suelo);
    await retiro(p, pct);
    await p.click('#btn-iniciar-excavacion');
    return mallas(p);
  };
  const a = await crear(page, 'tierra_vegetal', 100);
  const page2 = await context.newPage();
  const b = await crear(page2, 'roca_desmontada_barrenos', 10);
  expect(a.length).toBeGreaterThan(20);
  expect(a).toContain('exc_pile:true:true');
  expect(a).toContain('exc_floor:true:true');
  expect(b).toEqual(a);
  // el volumen en banco y el límite de 18 × 18 × 5 m siguen igual
  await abrirModal(page2);
  for (const [l, an, pr] of [[18.01, 6, 1], [12, 18.01, 1], [12, 6, 5.01], [18, 18, 5]]) {
    await dims(page2, l, an, pr);
    if (l === 18 && an === 18) {
      await expect(page2.locator('#btn-iniciar-excavacion')).toBeEnabled();
      expect(await texto(page2, '#exc-stat-vol')).toBe('1620.00 m³');
      expect((await panel(page2)).suelto).toBe('2592.00 m³');                            // 1620 × 1.60 (roca desmontada con barrenos)
    } else {
      await expect(page2.locator('#btn-iniciar-excavacion')).toBeDisabled();
    }
  }
});
