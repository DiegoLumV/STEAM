// Fase 1 (R8): cada cálculo extraído da EXACTAMENTE lo mismo que la fórmula original de casa.js.
// Las funciones "ORIGINAL_*" son copias literales del código que había en casa.js antes de extraer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularAreaTecho, calcularExcavacion, redondearCentesimas, altoPiezaMuro, calcularPiezasMuro,
  calcularDimensionesMuro, sumarAreaPisos, calcularCoberturaPiso, calcularTotalConcreto,
  porcentajeBarra, calcularDimensionCubierta,
} from '../src/scripts/calculos.js';

// ── Referencias originales (copiadas de casa.js antes de la extracción) ──
function ORIGINAL_areaTecho(roofShapeSelected, w, d, h) {
  let calcArea = w * d;
  if (roofShapeSelected === 'dos_aguas') {
    calcArea = 2 * Math.hypot(w / 2, h) * d;
  } else if (roofShapeSelected === 'cuatro_aguas') {
    calcArea = 2 * (w / 2 * Math.hypot(d / 2, h)) + 2 * (d / 2 * Math.hypot(w / 2, h));
  } else if (roofShapeSelected === 'una_agua') {
    calcArea = Math.hypot(d, h) * w;
  }
  return calcArea;
}
const ORIGINAL_excRedondear = n => Math.round(n * 100) / 100;
function ORIGINAL_piezas(w, h, wbWallMode, wbVentanasCount) {
  let huecos = 0;
  if (wbWallMode === 'puerta') {
    huecos = Math.min(4, h);
  } else if (wbWallMode === 'ventana') {
    const ventRows = Math.min(2, h);
    huecos = wbVentanasCount * ventRows;
  }
  return Math.max(0, w * h - huecos);
}
function ORIGINAL_dims(w, h, wbMat) {
  const bW = 1.0;
  const bH = wbMat === 'block' ? 0.7 : (wbMat === 'madera' ? 0.2 : 0.5);
  return { totalW: w * bW, totalH: h * bH };
}
const ORIGINAL_getVitropisoArea = objList => objList
  .filter(o => o.type === 'floor_vitropiso')
  .reduce((sum, o) => sum + (o.area || 0), 0);
const ORIGINAL_vals = v => v.cemento + v.arena + v.grava + v.agua;
const ORIGINAL_barra = (v, t) => Math.min((v / t) * 100, 100);
const ORIGINAL_cubierta = (min, max) => Math.max(3, Math.min(24, Math.round(max - min + 0.6)));

const FORMAS = ['plano', 'dos_aguas', 'cuatro_aguas', 'una_agua', 'otra'];

test('techos: área idéntica a la fórmula original (360 casos)', () => {
  let n = 0;
  for (const f of FORMAS) for (const w of [3, 3.5, 7, 10, 13.7, 24]) for (const d of [3, 4.2, 9, 12, 24])
    for (const h of [0.25, 0.5, 1.1, 1.8, 2.3, 4]) {
      assert.equal(calcularAreaTecho(f, w, d, h), ORIGINAL_areaTecho(f, w, d, h), `${f} ${w}x${d}x${h}`);
      n++;
    }
  assert.equal(n, 5 * 6 * 5 * 6);
});

test('techos: valores conocidos', () => {
  assert.equal(calcularAreaTecho('plano', 10, 10, 0.25), 100);
  assert.equal(calcularAreaTecho('dos_aguas', 10, 10, 1.8).toFixed(1), '106.3');
});

test('excavación: área y volumen correctos y estables con decimales', () => {
  const casos = [[6, 4, 1.2, 24, 28.8], [12, 10, 1.5, 120, 180], [12, 10, 1.6, 120, 192], [18, 18, 5, 324, 1620],
    [0.1, 3, 1.1, 0.3, 0.33], [0.1, 0.2, 0.3, 0.02, 0.006], [7.5, 2.5, 0.4, 18.75, 7.5], [1, 1, 0.2, 1, 0.2]];
  for (const [l, a, p, area, vol] of casos) {
    const r = calcularExcavacion(l, a, p);
    assert.equal(r.area, ORIGINAL_excRedondear(l * a));
    assert.equal(r.volumen, Math.round(l * a * p * 1000) / 1000);
    assert.ok(Math.abs(r.area - area) < 0.0051, `área ${l}x${a}`);
    assert.ok(Math.abs(r.volumen - vol) < 0.0006, `volumen ${l}x${a}x${p}`);
  }
  assert.equal(redondearCentesimas(0.1 + 0.2), 0.3);
  assert.equal(redondearCentesimas(1.6) - redondearCentesimas(1.5), redondearCentesimas(1.6) - redondearCentesimas(1.5));
});

test('excavación: 200 combinaciones iguales a la fórmula original', () => {
  for (let i = 1; i <= 200; i++) {
    const l = ((i * 37) % 180) / 10 + 0.1, a = ((i * 53) % 180) / 10 + 0.1, p = ((i * 11) % 50) / 10 + 0.1;
    const r = calcularExcavacion(l, a, p);
    assert.equal(r.area, ORIGINAL_excRedondear(l * a));
    assert.equal(r.volumen, Math.round(l * a * p * 1000) / 1000);
  }
});

test('muros: piezas y dimensiones idénticas a las originales (840 casos)', () => {
  let n = 0;
  for (const modo of ['simple', 'puerta', 'ventana']) for (const vent of [1, 2]) for (let w = 3; w <= 20; w++) for (let h = 2; h <= 15; h++) {
    assert.equal(calcularPiezasMuro(w, h, modo, vent), ORIGINAL_piezas(w, h, modo, vent), `${modo} ${vent} ${w}x${h}`);
    n++;
  }
  for (const mat of ['block', 'madera', 'lamina']) for (const [w, h] of [[3, 2], [5, 5], [20, 15], [7, 6]]) {
    const o = ORIGINAL_dims(w, h, mat), r = calcularDimensionesMuro(w, h, mat);
    assert.equal(r.ancho, o.totalW);
    assert.equal(r.alto, o.totalH);
  }
  assert.equal(n, 3 * 2 * 18 * 14);
  assert.equal(altoPiezaMuro('block'), 0.7);
  assert.equal(altoPiezaMuro('madera'), 0.2);
  assert.equal(altoPiezaMuro('lamina'), 0.5);
});

test('pisos: suma de áreas igual a getVitropisoArea original', () => {
  const lista = [
    { type: 'floor_vitropiso', area: 20 }, { type: 'floor_vitropiso', area: 36 }, { type: 'block' },
    { type: 'floor_vitropiso' }, { type: 'roof', area: 99 },
  ];
  assert.equal(sumarAreaPisos(lista), ORIGINAL_getVitropisoArea(lista));
  assert.equal(sumarAreaPisos(lista), 56);
  assert.equal(sumarAreaPisos([]), 0);
});

test('pisos: situación de cobertura (completo / excede / parcial)', () => {
  assert.deepEqual(calcularCoberturaPiso(400, 20, 400), { estado: 'completo' });
  assert.deepEqual(calcularCoberturaPiso(450, 20, 400), { estado: 'completo' });
  assert.deepEqual(calcularCoberturaPiso(390, 20, 400), { estado: 'excede', maxPermitido: 10 });
  assert.deepEqual(calcularCoberturaPiso(65, 100, 400), { estado: 'parcial', despues: 165, quedan: 235, exacto: false });
  assert.deepEqual(calcularCoberturaPiso(380, 20, 400), { estado: 'parcial', despues: 400, quedan: 0, exacto: true });
  // Equivalencia con las ramas originales para una malla de valores
  for (let cub = 0; cub <= 420; cub += 20) for (const nueva of [9, 16, 20, 25, 36, 50, 100, 200, 400]) {
    const r = calcularCoberturaPiso(cub, nueva, 400);
    if (cub >= 400) assert.equal(r.estado, 'completo');
    else if (cub + nueva > 400) { assert.equal(r.estado, 'excede'); assert.equal(r.maxPermitido, 400 - cub); }
    else { assert.equal(r.estado, 'parcial'); assert.equal(r.despues, cub + nueva); assert.equal(r.quedan, 400 - (cub + nueva)); assert.equal(r.exacto, cub + nueva === 400); }
  }
});

test('concreto: total y porcentajes iguales a los originales', () => {
  const casos = [[0, 0, 0, 0], [1000, 2000, 3000, 600], [500, 0, 0, 0], [7000, 0, 0, 0], [123.5, 77.25, 10, 0.5], [1000, 2000, 3000, 601]];
  for (const [cemento, arena, grava, agua] of casos) {
    const v = { cemento, arena, grava, agua };
    assert.equal(calcularTotalConcreto(v), ORIGINAL_vals(v));
    for (const k of Object.keys(v)) assert.equal(porcentajeBarra(v[k], 6600), ORIGINAL_barra(v[k], 6600));
  }
  assert.equal(calcularTotalConcreto({ cemento: 1000, arena: 2000, grava: 3000, agua: 600 }), 6600);
  assert.equal(porcentajeBarra(7000, 6600), 100);
});

test('cubierta: dimensión sugerida igual a la original', () => {
  for (const min of [-10, -5.3, -2, 0, 1.2]) for (const max of [-1, 0, 2, 3.7, 8, 12.4, 25, 40]) {
    if (max < min) continue;
    assert.equal(calcularDimensionCubierta(min, max), ORIGINAL_cubierta(min, max), `${min}..${max}`);
  }
  assert.equal(calcularDimensionCubierta(0, 0), 3);
  assert.equal(calcularDimensionCubierta(-20, 20), 24);
});
