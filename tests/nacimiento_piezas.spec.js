// F2.4a · Nacimiento de piezas nuevas sobre la losa y otras piezas (addObj).
// La API se simula (tests/helpers.js); no hay base de datos ni backend.
// Las piezas se crean con la misma función que usa el catálogo (window.addObjIfAllowed); para que la posición sea
// determinista se fija Math.random durante la llamada (addObj coloca la pieza al azar dentro de la zona de construcción).
// La `y` que se comprueba es la del ORIGEN de la raíz, la que guarda el estado v2 (snapshot, 3 decimales).
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

async function abrirCon(page, objetos) {
  await abrirSimulador(page, casa(objetos));
  await page.waitForFunction(n => !!window.__steamTest && typeof window.addObjIfAllowed === 'function' &&
    window.__steamTest.resumenEscena().objetos.length === n, objetos.length, { timeout: 120_000 });
}

/**
 * Crea una pieza del catálogo con Math.random fijo `v` (x = z = (v − 0,5)·15). Devuelve { id, y, minY, snapshot }:
 *   y     = origen de la raíz (estado v2); minY = base geométrica de la caja envolvente (puede diferir del origen).
 */
async function crear(page, tipo, v) {
  return page.evaluate(({ tipo, v }) => {
    const antes = new Set(window.__steamTest.resumenEscena().objetos.map(o => o.id));
    const original = Math.random;
    Math.random = () => v;
    try { window.addObjIfAllowed(tipo); } finally { Math.random = original; }
    const nuevo = window.__steamTest.resumenEscena().objetos.find(o => !antes.has(o.id));
    if (!nuevo) return null;
    const snap = window.__steamTest.snapshot();
    const o = snap.estado.objetos.find(x => x.id === nuevo.id);
    return { id: nuevo.id, tipo: nuevo.type, x: o.p[0], y: o.p[1], z: o.p[2], minY: window.__steamTest.limitesObjeto(nuevo.id).min.y, claves: Object.keys(o).sort(), v: snap.estado.v };
  }, { tipo, v });
}

// Un valor de Math.random por pieza: posiciones en diagonal separadas 1,5 m (ninguna pieza queda sobre otra).
const TIPOS = ['block', 'madera', 'lamina', 'foco', 'puerta', 'ventana', 'vitropiso', 'lampara', 'concreto'];
const aparte = i => 0.05 + 0.1 * i;

test('N1·N3·N4·N7·N8·N9·N10 · cada tipo del catálogo nace con el origen en y = 0,2 sobre la losa', async ({ page }) => {
  await abrirCon(page, [losa(1)]);
  for (const [i, tipo] of TIPOS.entries()) {
    const r = await crear(page, tipo, aparte(i));
    expect(r, `${tipo}: no se creó`).not.toBeNull();
    expect(r.y, `${tipo} (N: ${['N1', 'N3 · N10', 'N4', 'N9', '—', '—', 'N7', '—', 'N8'][i]})`).toBeCloseTo(0.2, 3);
    expect(r.v).toBe(2);
    expect(r.claves.join(',')).not.toMatch(/sonda/i);
  }
});

test('N2·N6 · suelo desnudo: y = 0 en todos los tipos; la ventana no se sube 6,5 cm (origen de la raíz, no su caja)', async ({ page }) => {
  await abrirCon(page, []);
  const resultados = {};
  for (const [i, tipo] of TIPOS.entries()) {
    const r = await crear(page, tipo, aparte(i));
    expect(r, `${tipo}: no se creó`).not.toBeNull();
    expect(r.y, tipo).toBeCloseTo(0, 3);
    resultados[tipo] = r;
  }
  // N6 · el alféizar de la ventana baja 6,5 cm del origen: la caja envolvente empieza bajo el suelo, pero el origen sigue en 0
  expect(resultados.ventana.minY).toBeLessThan(-0.05);
  expect(resultados.ventana.y).toBeCloseTo(0, 3);
});

test('N5 · sobre otra pieza: nace con el origen en el tope de la pieza de debajo (block 0,9; concreto 0,4)', async ({ page }) => {
  await abrirCon(page, [losa(1), bloque(2, 0, 0.2, 0), { id: 3, type: 'concreto', p: [3, 0.2, 3], r: [0, 0, 0] }]);
  // Tipos que no pasan por colocarSinSolapar (foco, puerta, ventana, vitropiso, lámpara) sobre el block (tope 0,2 + 0,7 = 0,9)
  for (const tipo of ['foco', 'puerta', 'ventana', 'vitropiso', 'lampara']) {
    const r = await crear(page, tipo, 0.5);               // x = z = 0
    expect(r, `${tipo}: no se creó`).not.toBeNull();
    expect(r.y, `${tipo} sobre block`).toBeCloseTo(0.9, 3);
  }
  // Concreto como soporte (tope 0,2 + 0,2 = 0,4), en x = z = 3
  const f = await crear(page, 'foco', 0.7);
  expect(f.x).toBeCloseTo(3, 2);
  expect(f.y, 'foco sobre concreto').toBeCloseTo(0.4, 3);
});

test('N11 · un muro no es soporte de nacimiento: una puerta nacida dentro de un muro nace sobre la losa, no en su corona', async ({ page }) => {
  await abrirCon(page, [losa(1), muro(2, 0, 0)]);
  for (const tipo of ['puerta', 'foco']) {
    const r = await crear(page, tipo, 0.5);
    expect(r, `${tipo}: no se creó`).not.toBeNull();
    expect(r.y, tipo).toBeCloseTo(0.2, 3);
  }
});
