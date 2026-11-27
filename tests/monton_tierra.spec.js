// Montón de tierra de la excavación (mesh `exc_pile`): es solo una representación visual temporal.
// Se ve al excavar y mientras se está en la etapa de excavación; se oculta (setEnabled(false)) al avanzar a otra etapa o
// función, al cerrar el modal de excavación sin confirmar y al restaurar un progreso. La excavación (fosa, terreno, datos,
// volumen, progreso guardado) no se toca. La API se simula (tests/helpers.js).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador, resumen, instantanea } from './helpers.js';

test.describe.configure({ timeout: 300_000 });

const errores = reg => reg.errores.filter(e => !/WebSocket connection to 'ws:\/\/localhost/.test(e));
const abrirModal = async page => {
  await page.evaluate(() => window.openExcavacionModal());
  await expect(page.locator('#excavacion-overlay')).toHaveClass(/open/);
};
const dims = async (page, l, a, p) => {
  await page.fill('#exc-largo', String(l));
  await page.fill('#exc-ancho', String(a));
  await page.fill('#exc-profundidad', String(p));
};
const excavar = async (page, l = 8, a = 6, p = 1.2) => {
  await abrirModal(page);
  await dims(page, l, a, p);
  await page.click('#btn-iniciar-excavacion');
  await expect(page.locator('#excavacion-overlay')).not.toHaveClass(/open/);
};
/** Estado del montón: cuántas mallas `exc_pile` hay y si la(s) está(n) habilitada(s) y visibles. */
const monton = async page => {
  const r = await resumen(page);
  const m = r.mallas.filter(x => x.name === 'exc_pile');
  return { n: m.length, habilitado: m.map(x => x.enabled), visible: m.map(x => x.visible) };
};
/** Lo que NO debe cambiar al ocultar el montón: datos, fosa, terreno y progreso guardable. */
const excavacionIntacta = async page => {
  const r = await resumen(page);
  const snap = await instantanea(page);
  return {
    datos: r.excavacion,
    fosa: r.mallas.filter(m => /^exc_(?!pile$)|^ground_seg_|^zone_seg_/.test(m.name)).map(m => `${m.name}:${m.visible}:${m.enabled}`).sort(),
    terrenoVisible: r.mallas.find(m => m.name === 'ground').visible,
    progresoExcavacion: snap.progreso?.excavacion ?? null,
  };
};
const hayMontonEnPantalla = async page => (await monton(page)).habilitado.some(Boolean);

// ── M1 · aparece al excavar ──────────────────────────────────────────────────
test('M1 · al excavar el montón de tierra aparece (una sola malla, visible y habilitada)', async ({ page }) => {
  const reg = await abrirSimulador(page);
  expect(await monton(page)).toEqual({ n: 0, habilitado: [], visible: [] });
  await excavar(page);
  expect(await monton(page)).toEqual({ n: 1, habilitado: [true], visible: [true] });
  const r = await resumen(page);
  expect(r.excavacion).toMatchObject({ largo: 8, ancho: 6, profundidad: 1.2, volumen: 57.6, activa: true });
  expect(errores(reg)).toEqual([]);
});

// ── M2 · desaparece al avanzar y la excavación se conserva ───────────────────
test('M2 · al avanzar a otra función (Calcular Área) el montón desaparece y la excavación, sus datos y el progreso se conservan', async ({ page }) => {
  const reg = await abrirSimulador(page);
  await excavar(page);
  const antes = await excavacionIntacta(page);
  expect(await hayMontonEnPantalla(page)).toBe(true);
  await page.click('#btnMatematicas');                                 // siguiente función
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  const despues = await excavacionIntacta(page);
  expect(despues).toEqual(antes);                                      // fosa, terreno, datos y progreso idénticos
  expect(despues.datos).toMatchObject({ largo: 8, ancho: 6, profundidad: 1.2, volumen: 57.6, activa: true });
  expect((await monton(page)).n).toBe(1);                              // oculto, no borrado: sin duplicados ni pérdidas
  expect(errores(reg)).toEqual([]);
});

// ── M3 · no reaparece en las etapas posteriores ──────────────────────────────
test('M3 · tras avanzar, el montón no reaparece al seguir usando otras funciones ni al cerrar sus modales', async ({ page }) => {
  const reg = await abrirSimulador(page);
  await excavar(page);
  await page.click('#btnMatematicas');
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  await page.evaluate(() => window.closeMatematicasModal?.());
  await page.click('#btnPlano');                                       // otra función
  await page.waitForTimeout(500);
  expect(await hayMontonEnPantalla(page)).toBe(false);
  expect((await monton(page)).n).toBe(1);
  expect(errores(reg)).toEqual([]);
});

// ── M4 · un intento sobre una función bloqueada no es avanzar; usar una pieza del catálogo sí ─────────────────────
test('M4 · pulsar una función todavía bloqueada (Construir) no oculta el montón; colocar una pieza del catálogo sí', async ({ page }) => {
  const reg = await abrirSimulador(page);
  await excavar(page);
  await expect(page.locator('#btnWall')).toBeDisabled();               // Construir sigue bloqueado: aún no se avanzó
  await page.locator('#btnWall').click({ force: true });
  await page.waitForTimeout(400);
  expect(await hayMontonEnPantalla(page)).toBe(true);
  await page.evaluate(() => { document.getElementById('cat-list').style.display = 'block'; });
  await page.locator('#cat-block').click();                            // otra función: coloca una pieza
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  expect((await monton(page)).n).toBe(1);
  expect(errores(reg)).toEqual([]);
});

// ── M5 · regresar a la etapa de excavación ───────────────────────────────────
test('M5 · al regresar a la excavación el montón se ve solo en esa etapa; sin duplicados y se oculta de nuevo al salir', async ({ page }) => {
  const reg = await abrirSimulador(page);
  await excavar(page);
  await page.click('#btnMatematicas');
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  await page.evaluate(() => window.closeMatematicasModal?.());
  const guardada = await excavacionIntacta(page);

  await abrirModal(page);                                              // regresa a la etapa: se ve
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(true);
  await page.click('#excavacion-overlay button:has-text("✕")');        // cierra sin confirmar: sale de la etapa
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  expect(await excavacionIntacta(page)).toEqual(guardada);             // cerrar sin confirmar no cambia nada

  await abrirModal(page);
  await dims(page, 10, 6, 1.5);                                        // «Actualizar Excavación»
  await page.click('#btn-iniciar-excavacion');
  await expect(page.locator('#excavacion-overlay')).not.toHaveClass(/open/);
  expect(await monton(page)).toEqual({ n: 1, habilitado: [true], visible: [true] });   // una sola malla, visible
  expect((await resumen(page)).excavacion).toMatchObject({ largo: 10, ancho: 6, profundidad: 1.5, volumen: 90, activa: true });

  await page.click('#btnMatematicas');                                 // vuelve a avanzar
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  expect((await monton(page)).n).toBe(1);
  expect(errores(reg)).toEqual([]);
});

// ── M6 · restauración: casa en etapas posteriores ────────────────────────────
test('M6 · al abrir una casa guardada (excavación + etapas posteriores) el montón no se muestra; la fosa y el terreno sí se reconstruyen', async ({ page }) => {
  const c = leerCasa('excavacion_con_casa');
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  const r = await resumen(page);
  expect(r.excavacion).toMatchObject({ largo: 6, ancho: 4, profundidad: 1.2, volumen: 28.8, activa: true });
  expect(r.mallas.find(m => m.name === 'ground').visible).toBe(false);
  expect(r.mallas.filter(m => /^ground_seg_[nsew]$/.test(m.name))).toHaveLength(4);
  expect(r.mallas.filter(m => /^exc_floor$/.test(m.name))).toHaveLength(1);
  expect(await monton(page)).toEqual({ n: 1, habilitado: [false], visible: [true] });  // existe, pero oculto
  const guardada = await excavacionIntacta(page);

  await abrirModal(page);                                              // regresar a la etapa lo muestra...
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(true);
  await page.click('#excavacion-overlay button:has-text("✕")');       // ...y al salir se oculta
  await expect.poll(() => hayMontonEnPantalla(page)).toBe(false);
  expect(await excavacionIntacta(page)).toEqual(guardada);
  expect(errores(reg)).toEqual([]);
});

// ── M7 · restauración: solo excavación ───────────────────────────────────────
test('M7 · al abrir un progreso con solo la excavación el montón tampoco se muestra solo; el estado guardado no cambia', async ({ page }) => {
  const excavacion = { largo: 8, ancho: 6, profundidad: 1.2, volumen: 57.6, activa: true, tipo_suelo: 'tierra_vegetal', porcentaje_retiro: 1 };
  const estado = { v: 2, objetos: [], contador: 1, progreso: { excavacion }, terreno: { excavacion }, hitos: {} };
  const reg = await abrirSimulador(page, { estado, progreso: { excavacion } });
  expect((await resumen(page)).excavacion).toMatchObject({ largo: 8, ancho: 6, profundidad: 1.2, volumen: 57.6, activa: true });
  expect(await monton(page)).toEqual({ n: 1, habilitado: [false], visible: [true] });
  expect((await instantanea(page)).progreso.excavacion).toMatchObject({ largo: 8, ancho: 6, profundidad: 1.2, volumen: 57.6, activa: true });
  expect(errores(reg)).toEqual([]);
});

// ── M8 · rellenar la excavación sigue funcionando ────────────────────────────
test('M8 · rellenar la excavación elimina todo (montón incluido) y se puede volver a excavar con un solo montón', async ({ page }) => {
  const reg = await abrirSimulador(page);
  page.on('dialog', d => d.accept());
  await excavar(page);
  await abrirModal(page);
  await page.click('#btn-eliminar-excavacion');
  await expect.poll(async () => (await monton(page)).n).toBe(0);
  expect((await resumen(page)).excavacion).toBeNull();
  await excavar(page, 5, 4, 1);
  expect(await monton(page)).toEqual({ n: 1, habilitado: [true], visible: [true] });
  expect(errores(reg)).toEqual([]);
});
