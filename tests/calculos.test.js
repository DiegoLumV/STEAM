// Fase 1 (R8): cada cálculo extraído da EXACTAMENTE lo mismo que la fórmula original de casa.js.
// Las funciones "ORIGINAL_*" son copias literales del código que había en casa.js antes de extraer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularAreaTecho, calcularExcavacion, redondearCentesimas, altoPiezaMuro, calcularPiezasMuro,
  calcularDimensionesMuro, sumarAreaPisos, calcularCoberturaPiso, calcularTotalConcreto,
  porcentajeBarra, calcularDimensionCubierta,
  volumenSuelto, viajesVolqueta, factorBancoSuelto, SUELO_POR_DEFECTO, PORCENTAJE_RETIRO_POR_DEFECTO,
  distancia, normalizarRectangulo, ajustarARejilla, formatearCota, limitarZoom, zoomEnPunto, escalaBasePlano,
  mundoAPantalla, pantallaAMundo, distanciaPuntoSegmento, moverElemento, anclaElemento, cotasElemento,
  distanciaAElemento, elementoEn, planoVacio, sanearPlano,
  PLANO_MAX_ELEMENTOS, PLANO_LOTE_DEFECTO, PLANO_ZOOM_MIN, PLANO_ZOOM_MAX,
  areaRectangulo, perimetroRectangulo, formatearArea, habitacionCreable, rectangulosSolapan, solapesHabitaciones,
  siguienteIdHabitacion, sanearHabitaciones, habitacionEn, redimensionarDesdeEsquina, generarPlantilla,
  PLANTILLAS_HABITACIONES, HAB_MAX, HAB_LADO_MIN, HAB_LADO_MAX, HAB_NOMBRE_MAX,
  VANO_MAX_POR_HAB, VANO_MAX_GLOBAL, VANO_DEFECTO, longitudPared, vanoCabeEnPared, vanosSeSolapan, siguienteIdVano, sanearVanos,
  segmentoVano, posicionEnPared, paredMasCercana, offsetParaVano, vanoNuevo, desplazarVano, vanoEn, vanoEnHabitaciones,
  estadoVanos, totalVanos, nombreVano,
  PARED_ALTURA_DEFECTO, PARED_GROSOR_DEFECTO, PARED_ALFEIZAR_DEFECTO, PARED_RECT_AVISO, MATERIALIZADO_VERSION,
  opcionesParedes, detectarParedesCompartidas, vanoA3D, generarParedes3D, generarParedConHuecos, contarRectangulos,
  resumirMaterializacion, sanearParedes, compactarMaterializado, expandirMaterializado, sanearMaterializado,
} from '../src/scripts/calculos.js';
import { A1_FACTORES_SUELO, PARAMETROS, EJEMPLOS_FUENTE } from '../src/scripts/referencia.js';

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

// ══ F3 · suelo y volqueta ═══════════════════════════════════════════════════
// Los ejercicios del Manual de Materiales son DATOS DE PRUEBA de este archivo (no van a referencia.js).
// El «suelto» y los viajes de la fuente se calculan sobre el volumen a retirar (suelto × % de retiro); los viajes de la fuente
// vienen sin redondear y en el sistema viajes = Math.ceil(sin redondear).
const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
function cadena(largo, ancho, prof, suelo, retiro = 1, volumenBanco = null) {
  const banco = volumenBanco ?? calcularExcavacion(largo, ancho, prof).volumen;
  const suelto = volumenSuelto(banco, suelo);
  return { banco, suelto, ...viajesVolqueta(suelto, undefined, retiro) };
}

test('F3 constantes: suelo por defecto, % por defecto y capacidad de la volqueta salen de la fuente', () => {
  assert.equal(SUELO_POR_DEFECTO, 'tierra_vegetal');
  assert.equal(PORCENTAJE_RETIRO_POR_DEFECTO, 1);
  assert.equal(PARAMETROS.volqueta_m3.valor, 5);
  assert.equal(PARAMETROS.redondeo_viajes.criterio_educativo, true);
  assert.ok(Object.prototype.hasOwnProperty.call(A1_FACTORES_SUELO.filas, SUELO_POR_DEFECTO));
});

test('F3 A.1: 11 filas = 9 con factor + 2 sin factor; volumenSuelto usa exactamente el factor de la fuente', () => {
  const filas = Object.entries(A1_FACTORES_SUELO.filas);
  assert.equal(filas.length, 11);
  const con = filas.filter(([, f]) => f.factor_banco_suelto.valor !== null);
  const sin = filas.filter(([, f]) => f.factor_banco_suelto.valor === null).map(([k]) => k);
  assert.equal(con.length, 9);
  assert.deepEqual(sin.sort(), ['afirmado_bases_vias', 'material_sucio_rio_subbases']);
  for (const [id, f] of con) {
    const k = f.factor_banco_suelto.valor;
    assert.equal(factorBancoSuelto(id), k, id);
    assert.equal(volumenSuelto(100, id), Math.round(100 * k * 1000) / 1000, id);
    assert.equal(volumenSuelto(1, id), k, id);
    assert.equal(volumenSuelto(0, id), 0, id);
  }
  const esperado = { tierra_vegetal: 1.10, tierra_franca: 1.20, tierra_margosa_arcilla_medianamente_compacta: 1.50,
    tierra_margosa_arcilla_compacta: 1.60, terrenos_sueltos_sin_cohesion: 1.10, terrenos_fijos_pequena_cohesion: 1.20,
    terrenos_compactos_fuerte_cohesion: 1.30, roca_desmontada_barrenos: 1.60, roca_blanda_arranque_maquina: 1.40 };
  for (const [id, k] of Object.entries(esperado)) assert.equal(factorBancoSuelto(id), k, id);
});

test('F3 null: suelo sin factor, tipo desconocido o dato inválido nunca producen NaN', () => {
  for (const id of ['afirmado_bases_vias', 'material_sucio_rio_subbases', 'no_existe', '', 'constructor', '__proto__', 'toString', null, undefined, 5, {}]) {
    assert.equal(factorBancoSuelto(id), null, String(id));
    assert.equal(volumenSuelto(10, id), null, String(id));
  }
  for (const v of [NaN, Infinity, -Infinity, -1, '10', null, undefined]) assert.equal(volumenSuelto(v, 'tierra_vegetal'), null, String(v));
  assert.equal(viajesVolqueta(null), null);
  for (const v of [NaN, Infinity, -1, '5', undefined]) assert.equal(viajesVolqueta(v), null, String(v));
  for (const c of [0, -5, NaN, Infinity, '5']) assert.equal(viajesVolqueta(10, c, 1), null, String(c));
  for (const p of [-0.01, 1.01, 2, NaN, Infinity, '1']) assert.equal(viajesVolqueta(10, 5, p), null, String(p));
});

test('F3 Ejemplo 1.1 del Manual: lote 6×12, 0.80 m, tierra vegetal → 57.60 / 63.36 / 12.672 → 13 viajes', () => {
  const ej = EJEMPLOS_FUENTE.ejemplo_1_1_descapote;
  assert.deepEqual([ej.datos.largo_m, ej.datos.ancho_m, ej.datos.alto_m, ej.datos.suelo], [6, 12, 0.80, 'tierra_vegetal']);
  const r = cadena(12, 6, 0.8, 'tierra_vegetal');
  assert.equal(r.banco, ej.resultado.volumen_banco_m3);
  assert.equal(r.suelto, ej.resultado.volumen_suelto_m3);
  assert.equal(r.aRetirar, 63.36);
  assert.equal(r.viajesSinRedondear, 12.672);
  assert.equal(Math.round(r.viajesSinRedondear * 100) / 100, ej.resultado.viajes_fuente);
  assert.equal(r.viajes, 13);
});

test('F3 Ejemplo 1.2 del Manual: 0.30×0.40×68.0, arcilla compacta, 70 % → 8.16 / 13.06 / 9.14 / 2 viajes', () => {
  const r = cadena(68, 0.3, 0.4, 'tierra_margosa_arcilla_compacta', 0.7);
  assert.equal(r.banco, 8.16);
  assert.equal(r.suelto, 13.056);
  assert.equal(r.suelto.toFixed(2), '13.06');
  assert.equal(r.aRetirar, 9.139);
  assert.equal(r.aRetirar.toFixed(2), '9.14');
  cerca(r.viajesSinRedondear, 1.82784);
  assert.equal(r.viajes, 2);
  // La geometría equivalente de la interfaz (17 × 0.60 × 0.80, dentro del límite de 18 m) da el mismo banco y el mismo resultado
  const eq = cadena(17, 0.6, 0.8, 'tierra_margosa_arcilla_compacta', 0.7);
  assert.deepEqual(eq, r);
});

test('F3 Ejercicios 1.1–1.5 del Manual (datos de prueba) y 1.6 fuera de alcance', () => {
  // [largo, ancho, prof, suelo, retiro, banco, a retirar (m³ suelto), viajes sin redondear (cálculo exacto), viajes]
  const ARCILLA = 'tierra_margosa_arcilla_compacta';
  const casos = [
    ['1.1', [7.0, 14.0, 0.40, 'tierra_vegetal', 1.0], 39.20, 43.12, 8.624, 9],
    ['1.2', [0.40, 0.70, 85.0, ARCILLA, 1.0], 23.80, 38.08, 7.616, 8],
    ['1.3', [0.30, 0.50, 78.0, ARCILLA, 0.75], 11.70, 14.04, 2.808, 3],
    // La fuente da 4,276 (truncado); el cálculo exacto es 4,2768. Ambos dan 5 viajes.
    ['1.4', [0.30, 0.60, 120.0, 'terrenos_sueltos_sin_cohesion', 0.90], 21.60, 21.384, 4.2768, 5],
    // 20 zapatas de 1.40 × 1.40 × 1.80 m: banco = 20 × 3.528 = 70.56 (no cabe en una sola fosa de la interfaz, por eso se pasa el banco)
    ['1.5', [1.40, 1.40, 1.80, ARCILLA, 0.40, 20 * calcularExcavacion(1.4, 1.4, 1.8).volumen], 70.56, 45.158, 9.03168, 10],
  ];
  for (const [n, [l, a, p, suelo, retiro, banco], bancoEsp, retirarEsp, sinRedEsp, viajesEsp] of casos) {
    const r = cadena(l, a, p, suelo, retiro, banco);
    cerca(r.banco, bancoEsp, 1e-9);
    cerca(r.aRetirar, retirarEsp, 1e-3);
    cerca(r.viajesSinRedondear, sinRedEsp, 1e-9);
    assert.equal(r.viajes, viajesEsp, `ejercicio ${n}`);
    assert.equal(r.viajes, Math.ceil(sinRedEsp), `ejercicio ${n}`);
  }
  // 1.5 (C4): 9.03 sin redondear → 10 viajes
  const r15 = cadena(1.4, 1.4, 1.8, ARCILLA, 0.4, 20 * 3.528);
  assert.equal(r15.viajesSinRedondear.toFixed(2), '9.03');
  assert.equal(r15.viajes, 10);
  // 1.6 (8.60 × 14.50 × 1.50, lleno) NO aplica a F3: no hay función de lleno; pendiente para F5/F6.
  assert.equal(typeof globalThis.volumenLleno, 'undefined');
});

test('F3 C1 punto flotante: 50 × 1.10 / 5 = 11.000000000000002 en coma flotante pero son 11 viajes, no 12', () => {
  assert.equal(50 * 1.1 / 5, 11.000000000000002);            // la trampa existe
  assert.equal(Math.ceil(50 * 1.1 / 5), 12);                 // y el cálculo ingenuo falla
  const suelto = volumenSuelto(50, 'tierra_vegetal');
  assert.equal(suelto, 55);
  const r = viajesVolqueta(suelto);
  assert.equal(r.viajesSinRedondear, 11);
  assert.equal(r.viajes, 11);
  // Sin pasar por volumenSuelto (entrada con ruido) también se corrige
  assert.equal(viajesVolqueta(50 * 1.1).viajes, 11);
  assert.equal(viajesVolqueta(55.00000000000001).viajes, 11);
  // Un viaje de más en cuanto el volumen supera de verdad la capacidad
  assert.equal(viajesVolqueta(55.001).viajes, 12);
  assert.equal(viajesVolqueta(5).viajes, 1);
  assert.equal(viajesVolqueta(5.001).viajes, 2);
  // Barrido: múltiplos exactos de la volqueta con ruido nunca suben un viaje
  for (let n = 1; n <= 200; n++) for (const k of [1.1, 1.2, 1.3, 1.4, 1.5, 1.6]) {
    const banco = (5 * n) / k;                             // banco tal que banco × k = 5·n (con ruido)
    assert.equal(viajesVolqueta(banco * k).viajes, n, `n=${n} k=${k}`);
  }
});

test('F3 porcentaje de retiro: 0 % = 0 viajes, 100 % = todo, 70 % del ejemplo 1.2; capacidad configurable', () => {
  assert.deepEqual(viajesVolqueta(63.36, 5, 0), { aRetirar: 0, viajesSinRedondear: 0, viajes: 0 });
  assert.deepEqual(viajesVolqueta(63.36, 5, 1), { aRetirar: 63.36, viajesSinRedondear: 12.672, viajes: 13 });
  assert.deepEqual(viajesVolqueta(63.36), viajesVolqueta(63.36, 5, 1));       // valores por defecto = volqueta de 5 m³ y 100 %
  assert.equal(viajesVolqueta(63.36, 5, 0.5).viajes, 7);
  assert.equal(viajesVolqueta(63.36, 8, 1).viajes, 8);                        // otra capacidad
  assert.equal(viajesVolqueta(0).viajes, 0);
  let previo = 0;
  for (let pct = 0; pct <= 100; pct++) {                                      // monótono: más % nunca da menos viajes
    const v = viajesVolqueta(112.896, 5, pct / 100).viajes;
    assert.ok(v >= previo, `pct=${pct}`);
    previo = v;
  }
  assert.equal(previo, 23);                                                   // 112.896 / 5 = 22.58 → 23
});

// ── F4a · Editor 2D del plano ───────────────────────────────────────────────
test('F4a distancia: 3-4-5, simétrica, cero y entradas inválidas', () => {
  assert.equal(distancia(0, 0, 3, 4), 5);
  assert.equal(distancia(3, 4, 0, 0), 5);
  assert.equal(distancia(-1, -1, -1, -1), 0);
  assert.equal(distancia(1.5, 2, 4.5, 6), 5);
  assert.equal(distancia(0, 0, 1, 1), 1.414);                 // milésimas
  assert.equal(distancia(NaN, 0, 1, 1), null);
  assert.equal(distancia('1', 0, 1, 1), null);
  assert.equal(distancia(0, 0, Infinity, 1), null);
});

test('F4a normalizarRectangulo: cualquier orden de esquinas da la misma esquina mínima y dimensiones positivas', () => {
  const esperado = { x: -1, z: 2, ancho: 4, largo: 3 };
  assert.deepEqual(normalizarRectangulo(-1, 2, 3, 5), esperado);
  assert.deepEqual(normalizarRectangulo(3, 5, -1, 2), esperado);
  assert.deepEqual(normalizarRectangulo(-1, 5, 3, 2), esperado);
  assert.deepEqual(normalizarRectangulo(3, 2, -1, 5), esperado);
  assert.deepEqual(normalizarRectangulo(1, 1, 1, 1), { x: 1, z: 1, ancho: 0, largo: 0 });
  assert.equal(normalizarRectangulo(0, 0, NaN, 1), null);
  assert.equal(Object.is(normalizarRectangulo(-0, -0, 0, 0).x, -0), false);
});

test('F4a ajustarARejilla: múltiplos del paso, simétrico en negativos, sin -0 ni ruido de coma flotante', () => {
  assert.equal(ajustarARejilla(0.37, 0.25), 0.25);
  assert.equal(ajustarARejilla(0.38, 0.25), 0.5);
  assert.equal(ajustarARejilla(-0.37, 0.25), -0.25);
  assert.equal(ajustarARejilla(1.26, 0.1), 1.3);
  assert.equal(ajustarARejilla(0.04, 0.1), 0);
  assert.equal(Object.is(ajustarARejilla(-0.04, 0.1), -0), false);
  assert.equal(ajustarARejilla(2.3, 1), 2);
  assert.equal(ajustarARejilla(0.75, 0.5), 1);                 // empate hacia arriba
  assert.equal(ajustarARejilla(0.3, 0), 0.3);                  // paso inválido: sin ajuste
  assert.equal(ajustarARejilla(0.3, -1), 0.3);
  assert.equal(ajustarARejilla(NaN, 0.5), null);
  for (const paso of [0.1, 0.25, 0.5, 1]) for (let i = -300; i <= 300; i++) {
    const v = ajustarARejilla(i * 0.0371, paso);
    const k = Math.round(v / paso);
    assert.ok(Math.abs(v - k * paso) < 1e-9, `paso=${paso} v=${v}`);
  }
});

test('F4a formatearCota: un decimal con unidad, redondeo estable, null si no es número', () => {
  assert.equal(formatearCota(3), '3.0 m');
  assert.equal(formatearCota(3.14159), '3.1 m');
  assert.equal(formatearCota(0.35), '0.4 m');                  // sin el 0.3 por coma flotante
  assert.equal(formatearCota(2.25), '2.3 m');
  assert.equal(formatearCota(0), '0.0 m');
  assert.equal(formatearCota(12.04), '12.0 m');
  assert.equal(formatearCota(-1.26), '-1.3 m');
  assert.equal(formatearCota(-0.01), '0.0 m');                 // nunca "-0.0"
  assert.equal(formatearCota(NaN), null);
  assert.equal(formatearCota('3'), null);
});

test('F4a limitarZoom: 0.5× a 10×; inválido → 1', () => {
  assert.equal(PLANO_ZOOM_MIN, 0.5);
  assert.equal(PLANO_ZOOM_MAX, 10);
  assert.equal(limitarZoom(0.1), 0.5);
  assert.equal(limitarZoom(0.5), 0.5);
  assert.equal(limitarZoom(3), 3);
  assert.equal(limitarZoom(10), 10);
  assert.equal(limitarZoom(99), 10);
  assert.equal(limitarZoom(NaN), 1);
  assert.equal(limitarZoom(undefined), 1);
});

test('F4a zoomEnPunto: el punto bajo el cursor no se mueve; respeta límites; factor inválido no cambia el zoom', () => {
  const base = 40, ancho = 1000, alto = 700;
  let v = { zoom: 1, cx: 0, cz: 0 };
  for (const [factor, dx, dy] of [[1.25, 200, -100], [1.25, -300, 150], [0.8, 50, 50], [2, 0, 0], [1.1, 330, 240]]) {
    const antes = pantallaAMundo(v, base, ancho, alto, ancho / 2 + dx, alto / 2 + dy);
    v = zoomEnPunto(v, factor, dx, dy, base);
    const despues = pantallaAMundo(v, base, ancho, alto, ancho / 2 + dx, alto / 2 + dy);
    assert.ok(Math.abs(antes.x - despues.x) < 1e-9 && Math.abs(antes.z - despues.z) < 1e-9);
  }
  let w = { zoom: 1, cx: 1, cz: 2 };
  for (let i = 0; i < 60; i++) w = zoomEnPunto(w, 1.3, 100, 100, base);
  assert.equal(w.zoom, 10);
  for (let i = 0; i < 80; i++) w = zoomEnPunto(w, 0.7, -100, 50, base);
  assert.equal(w.zoom, 0.5);
  assert.equal(zoomEnPunto({ zoom: 2, cx: 1, cz: 1 }, NaN, 10, 10, base).zoom, 2);
  assert.equal(zoomEnPunto({ zoom: 2, cx: 1, cz: 1 }, -3, 10, 10, base).zoom, 2);
  // cursor en el centro: el centro no cambia
  assert.deepEqual(zoomEnPunto({ zoom: 1, cx: 3, cz: -2 }, 2, 0, 0, base), { zoom: 2, cx: 3, cz: -2 });
});

test('F4a mundoAPantalla / pantallaAMundo son inversas; Z hacia arriba; escalaBasePlano ajusta el lote', () => {
  const v = { zoom: 2.5, cx: 1.2, cz: -0.7 };
  const p = mundoAPantalla(v, 30, 900, 600, 4, 3);
  const w = pantallaAMundo(v, 30, 900, 600, p.px, p.py);
  assert.ok(Math.abs(w.x - 4) < 1e-9 && Math.abs(w.z - 3) < 1e-9);
  const arriba = mundoAPantalla({ zoom: 1, cx: 0, cz: 0 }, 10, 100, 100, 0, 1);
  assert.equal(arriba.py, 40);                                  // +Z sube en pantalla
  const base = escalaBasePlano({ ancho: 10, largo: 10 }, 1000, 700, 70);
  assert.equal(base, 56);                                       // (700-140)/10
  assert.equal(escalaBasePlano(null, 1000, 700, 70), 56);       // lote ausente → 10×10
  assert.equal(escalaBasePlano({ ancho: 10, largo: 10 }, 100, 100, 70), 10); // ventana diminuta → mínimo seguro
});

test('F4a distanciaPuntoSegmento: perpendicular, extremos, segmento degenerado, inválidos', () => {
  assert.equal(distanciaPuntoSegmento(5, 3, 0, 0, 10, 0), 3);
  assert.equal(distanciaPuntoSegmento(-4, 3, 0, 0, 10, 0), 5);            // más allá del extremo A
  assert.equal(distanciaPuntoSegmento(13, 4, 0, 0, 10, 0), 5);            // más allá del extremo B
  assert.equal(distanciaPuntoSegmento(5, 0, 0, 0, 10, 0), 0);             // sobre el segmento
  assert.equal(distanciaPuntoSegmento(3, 4, 0, 0, 0, 0), 5);              // degenerado
  assert.ok(Math.abs(distanciaPuntoSegmento(0, 1, 0, 0, 1, 1) - Math.SQRT1_2) < 1e-12);
  assert.equal(distanciaPuntoSegmento(NaN, 0, 0, 0, 1, 1), null);
});

test('F4a elementos: mover, ancla, cotas y selección', () => {
  const p = { id: 1, tipo: 'punto', x: 1, z: 2 };
  const l = { id: 2, tipo: 'linea', x1: 0, z1: 0, x2: 3, z2: 4 };
  const r = { id: 3, tipo: 'rectangulo', x: 1, z: 1, ancho: 4, largo: 2 };
  assert.deepEqual(moverElemento(p, 0.5, -1), { id: 1, tipo: 'punto', x: 1.5, z: 1 });
  assert.deepEqual(moverElemento(l, 1, 1), { id: 2, tipo: 'linea', x1: 1, z1: 1, x2: 4, z2: 5 });
  assert.deepEqual(moverElemento(r, -1, 0), { id: 3, tipo: 'rectangulo', x: 0, z: 1, ancho: 4, largo: 2 });
  assert.equal(distancia(l.x1, l.z1, l.x2, l.z2), 5);
  assert.deepEqual(anclaElemento(l), { x: 0, z: 0 });
  assert.deepEqual(anclaElemento(r), { x: 1, z: 1 });
  assert.deepEqual(cotasElemento(l), [{ texto: '5.0 m', x: 1.5, z: 2 }]);
  assert.deepEqual(cotasElemento(r).map(c => c.texto), ['4.0 m', '2.0 m']);
  assert.deepEqual(cotasElemento(p)[0].texto, '1.00, 2.00');
  assert.deepEqual(cotasElemento(null), []);
  // selección: línea y punto ganan a un rectángulo que los contiene
  const lista = [r, { id: 4, tipo: 'punto', x: 3, z: 2 }];
  assert.equal(elementoEn(lista, 3.02, 2.01, 0.2).id, 4);
  assert.equal(elementoEn(lista, 3, 1.5, 0.2).id, 3);          // dentro del rectángulo, lejos del punto
  assert.equal(elementoEn(lista, 1.02, 1.5, 0.2).id, 3);       // sobre el borde
  assert.equal(elementoEn(lista, 9, 9, 0.2), null);
  assert.equal(elementoEn([], 0, 0, 1), null);
  assert.equal(elementoEn(null, 0, 0, 1), null);
  assert.equal(distanciaAElemento(null, 0, 0), Infinity);
});

test('F4a sanearPlano: entradas no válidas dan el plano vacío por defecto (sin excepción)', () => {
  const vacio = planoVacio();
  assert.deepEqual(vacio.lote, PLANO_LOTE_DEFECTO);
  assert.deepEqual(vacio.elementos, []);
  for (const basura of [undefined, null, 0, 1, 'texto', [], [1, 2], true, () => 1, Symbol('x'), NaN]) {
    assert.deepEqual(sanearPlano(basura), vacio, String(typeof basura));
  }
  assert.deepEqual(sanearPlano({}), vacio);
  assert.notEqual(sanearPlano({}).lote, sanearPlano({}).lote);   // objetos nuevos, sin compartir estado
});

test('F4a sanearPlano: lote inválido → 10×10; válido se conserva', () => {
  for (const lote of [null, 5, 'x', [], {}, { ancho: 5 }, { ancho: '5', largo: 5 }, { ancho: 0, largo: 5 }, { ancho: -3, largo: 5 },
    { ancho: 5, largo: 101 }, { ancho: NaN, largo: 5 }, { ancho: Infinity, largo: 5 }, { ancho: 0.5, largo: 5 }]) {
    assert.deepEqual(sanearPlano({ lote }).lote, { ancho: 10, largo: 10 }, JSON.stringify(lote));
  }
  assert.deepEqual(sanearPlano({ lote: { ancho: 12.3456, largo: 8 } }).lote, { ancho: 12.346, largo: 8 });
  assert.deepEqual(sanearPlano({ lote: { ancho: 1, largo: 100 } }).lote, { ancho: 1, largo: 100 });
});

test('F4a sanearPlano: rejilla — paso fuera de la lista y visible no booleano vuelven al valor por defecto', () => {
  assert.deepEqual(sanearPlano({ rejilla: { visible: true, paso: 0.25 } }).rejilla, { visible: true, paso: 0.25 });
  assert.deepEqual(sanearPlano({ rejilla: { visible: 'si', paso: 0.3 } }).rejilla, { visible: false, paso: 0.5 });
  assert.deepEqual(sanearPlano({ rejilla: 'x' }).rejilla, { visible: false, paso: 0.5 });
  for (const paso of [0.1, 0.25, 0.5, 1]) assert.equal(sanearPlano({ rejilla: { visible: true, paso } }).rejilla.paso, paso);
});

test('F4a sanearPlano: JSON corrupto — descarta lo inválido y conserva lo válido', () => {
  const corrupto = {
    lote: { ancho: 12, largo: 9 },
    contador: 'x',
    elementos: [
      { id: 1, tipo: 'punto', x: 1, z: 2 },                                   // válido
      { id: 2, tipo: 'punto', x: 1 },                                          // falta z
      { id: 3, tipo: 'punto', x: '1', z: 2 },                                  // tipo incorrecto
      { id: 4, tipo: 'punto', x: NaN, z: 0 },
      { id: 5, tipo: 'punto', x: Infinity, z: 0 },
      { id: 6, tipo: 'punto', x: 1e9, z: 0 },                                  // fuera de rango
      { id: 7, tipo: 'linea', x1: 0, z1: 0, x2: 3, z2: 4 },                    // válido
      { id: 8, tipo: 'linea', x1: 0, z1: 0, x2: 0, z2: 0 },                    // longitud 0
      { id: 9, tipo: 'linea', x1: 0, z1: 0, x2: 3 },                           // falta z2
      { id: 10, tipo: 'rectangulo', x: 0, z: 0, ancho: 2, largo: 3 },          // válido
      { id: 11, tipo: 'rectangulo', x: 0, z: 0, ancho: -2, largo: 3 },         // negativo
      { id: 12, tipo: 'rectangulo', x: 0, z: 0, ancho: 0, largo: 3 },          // cero
      { id: 13, tipo: 'rectangulo', x: 0, z: 0, ancho: 2 },                    // falta largo
      { id: 14, tipo: 'circulo', x: 0, z: 0 },                                 // tipo desconocido
      { id: 15 }, null, undefined, 7, 'x', [], [1, 2, 3], { tipo: 'punto' },
    ],
  };
  const p = sanearPlano(corrupto);
  assert.deepEqual(p.lote, { ancho: 12, largo: 9 });
  assert.deepEqual(p.elementos.map(e => e.id), [1, 7, 10]);
  assert.deepEqual(p.elementos.map(e => e.tipo), ['punto', 'linea', 'rectangulo']);
  assert.equal(p.contador, 11);
});

test('F4a sanearPlano: ids repetidos o ausentes se reasignan sin colisiones; campos extra se eliminan', () => {
  const p = sanearPlano({
    contador: 3,
    elementos: [
      { id: 5, tipo: 'punto', x: 0, z: 0, basura: 'x', __proto__x: 1 },
      { id: 5, tipo: 'punto', x: 1, z: 0 },
      { tipo: 'punto', x: 2, z: 0 },
      { id: -2, tipo: 'punto', x: 3, z: 0 },
      { id: 1.5, tipo: 'punto', x: 4, z: 0 },
    ],
  });
  const ids = p.elementos.map(e => e.id);
  assert.equal(new Set(ids).size, 5);
  assert.ok(ids.every(i => Number.isInteger(i) && i >= 1));
  assert.equal(p.elementos[0].id, 5);
  assert.ok(p.contador > Math.max(...ids));
  assert.deepEqual(Object.keys(p.elementos[0]), ['id', 'tipo', 'x', 'z']);
});

test('F4a sanearPlano: más de 500 elementos se trunca a 500 (los primeros válidos)', () => {
  assert.equal(PLANO_MAX_ELEMENTOS, 500);
  const muchos = Array.from({ length: 800 }, (_, i) => ({ id: i + 1, tipo: 'punto', x: i % 50, z: Math.floor(i / 50) }));
  const p = sanearPlano({ elementos: muchos });
  assert.equal(p.elementos.length, 500);
  assert.equal(p.elementos[0].id, 1);
  assert.equal(p.elementos[499].id, 500);
  assert.equal(p.contador, 501);
  // los inválidos no cuentan para el límite
  const mezcla = [];
  for (let i = 0; i < 700; i++) mezcla.push(i % 2 ? { tipo: 'x' } : { id: i + 1, tipo: 'punto', x: 0, z: i % 100 });
  assert.equal(sanearPlano({ elementos: mezcla }).elementos.length, 350);
});

test('F4a sanearPlano: idempotente, no muta la entrada y sobrevive a ciclo JSON', () => {
  const entrada = {
    lote: { ancho: 14, largo: 11.5 }, rejilla: { visible: true, paso: 0.1 }, contador: 9,
    elementos: [
      { id: 1, tipo: 'punto', x: 1.2345, z: -2 },
      { id: 2, tipo: 'linea', x1: 0, z1: 0, x2: 3, z2: 4 },
      { id: 3, tipo: 'rectangulo', x: -1, z: -1, ancho: 2.5, largo: 3 },
    ],
  };
  const copia = JSON.parse(JSON.stringify(entrada));
  const una = sanearPlano(entrada);
  assert.deepEqual(entrada, copia);                                  // no muta
  assert.deepEqual(sanearPlano(una), una);                           // idempotente
  assert.deepEqual(sanearPlano(JSON.parse(JSON.stringify(una))), una);
  assert.equal(una.elementos[0].x, 1.235);
  assert.equal(una.contador, 9);
  assert.equal(una.v, 1);
});

// ── F4b · Habitaciones libres con nombre ─────────────────────────────────────────────────────────────────────────────
const hab = (id, x, z, ancho, largo, nombre = `Habitación ${id.slice(1)}`) => ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre });

test('F4b areaRectangulo y perimetroRectangulo: fórmula, redondeo a milésimas y 0 si la entrada es inválida', () => {
  assert.equal(areaRectangulo(6, 4), 24);
  assert.equal(perimetroRectangulo(6, 4), 20);
  assert.equal(areaRectangulo(2.5, 1.2), 3);
  assert.equal(areaRectangulo(0.1, 0.1), 0.01);
  assert.equal(perimetroRectangulo(0.1, 0.2), 0.6);                   // sin ruido de coma flotante (0.6000000000000001)
  assert.equal(areaRectangulo(3.3333, 3), 10);
  for (const malo of [0, -1, NaN, Infinity, '3', null, undefined, {}]) {
    assert.equal(areaRectangulo(malo, 4), 0, String(malo));
    assert.equal(areaRectangulo(4, malo), 0, String(malo));
    assert.equal(perimetroRectangulo(malo, 4), 0, String(malo));
    assert.equal(perimetroRectangulo(4, malo), 0, String(malo));
  }
  assert.equal(formatearArea(12), '12.0 m²');
  assert.equal(formatearArea(3.25), '3.3 m²');
  assert.equal(formatearArea('x'), null);
});

test('F4b habitacionCreable: lados ≥ 0.1 y área > 0.01 (0.1 × 0.1 no se crea)', () => {
  assert.equal(habitacionCreable(4, 3), true);
  assert.equal(habitacionCreable(0.1, 0.2), true);
  assert.equal(habitacionCreable(0.1, 0.1), false);                   // área exactamente 0.01
  assert.equal(habitacionCreable(0.05, 5), false);                    // lado menor que 0.1
  assert.equal(habitacionCreable(0, 3), false);
  assert.equal(habitacionCreable(-2, 3), false);
  assert.equal(habitacionCreable(101, 3), false);
  assert.equal(habitacionCreable(NaN, 3), false);
  assert.equal(habitacionCreable('4', 3), false);
});

test('F4b rectangulosSolapan: true si se intersectan, false si no, false si solo comparten borde o esquina', () => {
  const a = { x: 0, z: 0, ancho: 4, largo: 3 };
  assert.equal(rectangulosSolapan(a, { x: 2, z: 1, ancho: 4, largo: 3 }), true);
  assert.equal(rectangulosSolapan(a, { x: 1, z: 1, ancho: 1, largo: 1 }), true);        // contenido
  assert.equal(rectangulosSolapan(a, a), true);
  assert.equal(rectangulosSolapan(a, { x: 10, z: 10, ancho: 1, largo: 1 }), false);
  assert.equal(rectangulosSolapan(a, { x: 4, z: 0, ancho: 2, largo: 3 }), false);        // borde común (adosadas)
  assert.equal(rectangulosSolapan(a, { x: 0, z: 3, ancho: 4, largo: 2 }), false);
  assert.equal(rectangulosSolapan(a, { x: 4, z: 3, ancho: 1, largo: 1 }), false);        // solo esquina
  assert.equal(rectangulosSolapan({ x: 0.1, z: 0, ancho: 0.2, largo: 1 }, { x: 0.3, z: 0, ancho: 1, largo: 1 }), false); // 0.1 + 0.2 ≠ 0.3 en coma flotante
  assert.equal(rectangulosSolapan(a, null), false);
  assert.equal(rectangulosSolapan(a, { x: 0, z: 0, ancho: 0, largo: 1 }), false);
  assert.equal(rectangulosSolapan(a, { x: 'x', z: 0, ancho: 1, largo: 1 }), false);
  assert.equal(rectangulosSolapan(a, { x: 2, z: 1, ancho: 4, largo: 3 }), rectangulosSolapan({ x: 2, z: 1, ancho: 4, largo: 3 }, a)); // simétrica
});

test('F4b solapesHabitaciones: mapa id → ids con los que se solapa; vacío si ninguna', () => {
  const lista = [hab('h1', 0, 0, 4, 4), hab('h2', 3, 3, 4, 4), hab('h3', 4, 0, 2, 2), hab('h4', 20, 20, 1, 1)];
  assert.deepEqual(solapesHabitaciones(lista), { h1: ['h2'], h2: ['h1'] });                // h3 solo toca el borde de h1
  assert.deepEqual(solapesHabitaciones([hab('h1', 0, 0, 1, 1), hab('h2', 5, 5, 1, 1)]), {});
  assert.deepEqual(solapesHabitaciones([]), {});
  assert.deepEqual(solapesHabitaciones(null), {});
});

test('F4b sanearHabitaciones: entradas no válidas dan [] y nunca lanzan', () => {
  for (const basura of [undefined, null, 0, 1, 'texto', {}, true, () => 1, Symbol('x'), NaN]) {
    assert.deepEqual(sanearHabitaciones(basura), [], String(typeof basura));
  }
  assert.deepEqual(sanearHabitaciones([]), []);
});

test('F4b sanearHabitaciones: descarta lo inválido y conserva lo válido', () => {
  const corrupta = [
    hab('h1', 1, 2, 4, 3, 'Sala'),                                              // válida
    { id: 'h2', tipo: 'punto', x: 0, z: 0, ancho: 1, largo: 1 },                // tipo incorrecto
    { id: 'h3', tipo: 'habitacion', x: 0, z: 0, ancho: 0, largo: 3 },           // ancho 0
    { id: 'h4', tipo: 'habitacion', x: 0, z: 0, ancho: -2, largo: 3 },          // negativo
    { id: 'h5', tipo: 'habitacion', x: 0, z: 0, ancho: 2 },                     // falta largo
    { id: 'h6', tipo: 'habitacion', x: NaN, z: 0, ancho: 2, largo: 2 },
    { id: 'h7', tipo: 'habitacion', x: 1e9, z: 0, ancho: 2, largo: 2 },         // fuera de rango
    { id: 'h8', tipo: 'habitacion', x: 0, z: 0, ancho: '2', largo: 2 },         // tipo de dato incorrecto
    { id: 'h9', tipo: 'habitacion', x: 0, z: 0, ancho: 0.05, largo: 2 },        // lado < 0.1
    { id: 'h10', tipo: 'habitacion', x: 0, z: 0, ancho: 101, largo: 2 },        // lado > 100
    hab('h11', -3, 0, 2, 2, 'Cocina'),                                          // válida
    null, undefined, 7, 'x', [], [1, 2], { tipo: 'habitacion' },
  ];
  const r = sanearHabitaciones(corrupta);
  assert.deepEqual(r.map(h => h.id), ['h1', 'h11']);
  assert.deepEqual(r.map(h => h.nombre), ['Sala', 'Cocina']);
  assert.deepEqual(Object.keys(r[0]), ['id', 'tipo', 'x', 'z', 'ancho', 'largo', 'nombre']);
});

test('F4b sanearHabitaciones: ids repetidos, ausentes o mal formados se reasignan sin colisiones; nombre vacío → por defecto', () => {
  const r = sanearHabitaciones([
    { id: 'h5', tipo: 'habitacion', x: 0, z: 0, ancho: 1, largo: 1, nombre: 'A', basura: 'x' },
    { id: 'h5', tipo: 'habitacion', x: 1, z: 0, ancho: 1, largo: 1, nombre: '   ' },
    { tipo: 'habitacion', x: 2, z: 0, ancho: 1, largo: 1 },
    { id: 7, tipo: 'habitacion', x: 3, z: 0, ancho: 1, largo: 1, nombre: 42 },
    { id: 'zz', tipo: 'habitacion', x: 4, z: 0, ancho: 1, largo: 1, nombre: 'Z' },
  ]);
  const ids = r.map(h => h.id);
  assert.equal(new Set(ids).size, 5);
  assert.ok(ids.every(i => /^h[1-9]\d*$/.test(i)));
  assert.equal(r[0].id, 'h5');
  assert.equal(r[0].nombre, 'A');
  assert.equal(r[1].nombre, `Habitación ${r[1].id.slice(1)}`);              // nombre en blanco → «Habitación N»
  assert.equal(r[3].nombre, `Habitación ${r[3].id.slice(1)}`);              // nombre no texto → «Habitación N»
  assert.equal(r[4].nombre, 'Z');
  assert.ok(!('basura' in r[0]));
  assert.equal(r.find(h => h.x === 4).id, ids[4]);
});

test('F4b sanearHabitaciones: nombre recortado a 30 caracteres; coordenadas a milésimas', () => {
  const r = sanearHabitaciones([hab('h1', 1.23456, -2.00049, 4.0004, 3, ' ' + 'x'.repeat(50))]);
  assert.equal(HAB_NOMBRE_MAX, 30);
  assert.equal(r[0].nombre.length, 30);
  assert.equal(r[0].x, 1.235);
  assert.equal(r[0].z, -2);
  assert.equal(r[0].ancho, 4);
});

test('F4b sanearHabitaciones: más de 50 se trunca a 50 (las primeras válidas); los inválidos no cuentan', () => {
  assert.equal(HAB_MAX, 50);
  const muchas = Array.from({ length: 80 }, (_, i) => hab(`h${i + 1}`, i, 0, 1, 1));
  const r = sanearHabitaciones(muchas);
  assert.equal(r.length, 50);
  assert.equal(r[0].id, 'h1');
  assert.equal(r[49].id, 'h50');
  const mezcla = [];
  for (let i = 0; i < 120; i++) mezcla.push(i % 2 ? { tipo: 'x' } : hab(`h${i + 1}`, i, 0, 1, 1));
  assert.equal(sanearHabitaciones(mezcla).length, 50);
});

test('F4b sanearHabitaciones: idempotente, no muta la entrada y sobrevive a ciclo JSON', () => {
  const entrada = [hab('h1', 1.2345, -2, 4, 3, 'Sala'), { tipo: 'habitacion', x: 0, z: 0, ancho: 2, largo: 2, nombre: '' }, hab('h1', 9, 9, 1, 1)];
  const copia = JSON.parse(JSON.stringify(entrada));
  const una = sanearHabitaciones(entrada);
  assert.deepEqual(entrada, copia);
  assert.deepEqual(sanearHabitaciones(una), una);
  assert.deepEqual(sanearHabitaciones(JSON.parse(JSON.stringify(una))), una);
});

test('F4b sanearPlano: habitaciones ausentes → []; corruptas se descartan; el resto del plano no cambia', () => {
  assert.deepEqual(planoVacio().habitaciones, []);
  assert.deepEqual(sanearPlano({}).habitaciones, []);
  assert.deepEqual(sanearPlano({ habitaciones: 'x' }).habitaciones, []);
  const p = sanearPlano({
    lote: { ancho: 12, largo: 9 }, elementos: [{ id: 1, tipo: 'punto', x: 1, z: 2 }],
    habitaciones: [hab('h1', 0, 0, 4, 3, 'Sala'), { tipo: 'habitacion', x: 0, z: 0, ancho: -1, largo: 3 }],
  });
  assert.equal(p.v, 1);                                                      // aditivo: la versión del plano no cambia
  assert.deepEqual(p.lote, { ancho: 12, largo: 9 });
  assert.equal(p.elementos.length, 1);
  assert.deepEqual(p.habitaciones.map(h => h.nombre), ['Sala']);
  assert.deepEqual(sanearPlano(p), p);                                       // idempotente con habitaciones
  assert.deepEqual(sanearPlano(JSON.parse(JSON.stringify(p))), p);
  assert.ok(!('habitaciones' in sanearPlano({ elementos: [{ tipo: 'punto', x: 0, z: 0 }] }).elementos[0]));
});

test('F4b siguienteIdHabitacion y habitacionEn', () => {
  assert.equal(siguienteIdHabitacion([]), 'h1');
  assert.equal(siguienteIdHabitacion(null), 'h1');
  assert.equal(siguienteIdHabitacion([hab('h1', 0, 0, 1, 1), hab('h4', 0, 0, 1, 1)]), 'h5');
  assert.equal(siguienteIdHabitacion([{ id: 'zz' }, { id: 3 }]), 'h1');
  const a = hab('h1', 0, 0, 6, 6), b = hab('h2', 2, 2, 2, 2);
  assert.equal(habitacionEn([a, b], 3, 3, 0.1).id, 'h2');                    // interior de ambas: gana la última (encima)
  assert.equal(habitacionEn([a, b], 0.05, 3, 0.1).id, 'h1');                 // borde de a
  assert.equal(habitacionEn([a, b], 2.02, 3, 0.1).id, 'h2');                 // borde de b gana al interior de a
  assert.equal(habitacionEn([a, b], 50, 50, 0.1), null);
  assert.equal(habitacionEn([], 0, 0, 1), null);
  assert.equal(habitacionEn(null, 0, 0, 1), null);
});

test('F4b redimensionarDesdeEsquina: la esquina opuesta queda fija; mínimo 0.1, máximo 100; nunca se invierte', () => {
  const h = hab('h1', 0, 0, 4, 3);                                           // x 0..4, z 0..3
  const se = redimensionarDesdeEsquina(h, 'se', 6, -1);                       // esquina sureste: fija la noroeste (0, 3)
  assert.deepEqual([se.x, se.z, se.ancho, se.largo], [0, -1, 6, 4]);
  const no = redimensionarDesdeEsquina(h, 'no', -2, 5);                       // fija la sureste (4, 0)
  assert.deepEqual([no.x, no.z, no.ancho, no.largo], [-2, 0, 6, 5]);
  const ne = redimensionarDesdeEsquina(h, 'ne', 5, 4);                        // fija la suroeste (0, 0)
  assert.deepEqual([ne.x, ne.z, ne.ancho, ne.largo], [0, 0, 5, 4]);
  const so = redimensionarDesdeEsquina(h, 'so', 1, 1);                        // fija la noreste (4, 3)
  assert.deepEqual([so.x, so.z, so.ancho, so.largo], [1, 1, 3, 2]);
  const cruzada = redimensionarDesdeEsquina(h, 'se', -10, 10);                // pasa al otro lado: se detiene en 0.1
  assert.equal(cruzada.ancho, HAB_LADO_MIN);
  assert.equal(cruzada.largo, HAB_LADO_MIN);
  assert.equal(cruzada.x, 0);                                                 // la esquina fija noroeste sigue en (0, 3)
  assert.equal(cruzada.z + cruzada.largo, 3);
  const grande = redimensionarDesdeEsquina(h, 'se', 500, -500);
  assert.equal(grande.ancho, HAB_LADO_MAX);
  assert.equal(grande.largo, HAB_LADO_MAX);
  const copia = JSON.stringify(h);
  redimensionarDesdeEsquina(h, 'se', 9, 9);
  assert.equal(JSON.stringify(h), copia);                                     // no muta
  assert.equal(redimensionarDesdeEsquina(h, 'xx', 1, 1), null);
  assert.equal(redimensionarDesdeEsquina(h, 'se', NaN, 1), null);
  assert.equal(redimensionarDesdeEsquina(null, 'se', 1, 1), null);
  assert.equal(sanearHabitaciones([cruzada]).length, 1);                      // 0.1 × 0.1 sí es válido al cargar (no se puede crear, sí alcanzar)
});

test('F4b generarPlantilla: Casa mínima, 2 y 3 ambientes, centradas en el lote y sin solapes', () => {
  const lote = { ancho: 10, largo: 10 };
  const min = generarPlantilla('minima', lote);
  assert.equal(min.length, 1);
  assert.deepEqual(min[0], { tipo: 'habitacion', x: -3, z: -2, ancho: 6, largo: 4, nombre: 'Habitación 1' });
  const dos = generarPlantilla('dos', lote);
  assert.deepEqual(dos.map(h => [h.nombre, h.x, h.z, h.ancho, h.largo]), [['Sala', -4.5, -2, 5, 4], ['Dormitorio', 0.5, -2, 4, 4]]);
  const tres = generarPlantilla('tres', lote);
  assert.deepEqual(tres.map(h => [h.nombre, h.x, h.z, h.ancho, h.largo]),
    [['Sala', -4.5, -0.5, 5, 4], ['Cocina', -4.5, -3.5, 3, 3], ['Dormitorio', 0.5, -0.5, 4, 4]]);
  for (const clave of Object.keys(PLANTILLAS_HABITACIONES)) {
    const lista = sanearHabitaciones(generarPlantilla(clave, lote).map((h, i) => ({ ...h, id: `h${i + 1}` })));
    assert.equal(lista.length, PLANTILLAS_HABITACIONES[clave].piezas.length, clave);
    assert.deepEqual(solapesHabitaciones(lista), {}, `${clave}: las piezas adosadas no se solapan`);
    const xs = lista.flatMap(h => [h.x, h.x + h.ancho]), zs = lista.flatMap(h => [h.z, h.z + h.largo]);
    assert.equal(Math.min(...xs), -PLANTILLAS_HABITACIONES[clave].ancho / 2, clave);
    assert.equal(Math.max(...zs), PLANTILLAS_HABITACIONES[clave].largo / 2, clave);
    assert.ok(Math.min(...zs) >= -5 && Math.max(...zs) <= 5, clave);
  }
});

test('F4b generarPlantilla: lote más pequeño que la plantilla → null (no se aplica); nombre o lote inválidos → null', () => {
  assert.equal(generarPlantilla('minima', { ancho: 5.9, largo: 10 }), null);
  assert.equal(generarPlantilla('minima', { ancho: 6, largo: 4 }) !== null, true);          // cabe justo
  assert.equal(generarPlantilla('dos', { ancho: 8, largo: 10 }), null);
  assert.equal(generarPlantilla('tres', { ancho: 10, largo: 6 }), null);                    // largo 7 > 6
  assert.equal(generarPlantilla('tres', { ancho: 9, largo: 7 }).length, 3);
  assert.equal(generarPlantilla('nada', { ancho: 10, largo: 10 }), null);
  assert.equal(generarPlantilla('__proto__', { ancho: 10, largo: 10 }), null);
  assert.equal(generarPlantilla('minima', null), null);
  assert.equal(generarPlantilla('minima', { ancho: 'x', largo: 10 }), null);
  assert.equal(generarPlantilla('minima', { ancho: 10, largo: NaN }), null);
});

// ── F4c · vanos ──
const vano = (id, lado, offset, ancho = 0.8, alto = 2.1, tipo = 'puerta') => ({ id, tipo, lado, offset, ancho, alto });
const sala = (vanos) => ({ ...hab('h1', -3, -2, 4, 3, 'Sala'), ...(vanos ? { vanos } : {}) });   // x −3…1, z −2…1: norte/sur 4 m, este/oeste 3 m

test('F4c longitudPared: norte y sur = ancho; este y oeste = largo; lo demás = 0', () => {
  const h = sala();
  assert.equal(longitudPared(h, 'norte'), 4);
  assert.equal(longitudPared(h, 'sur'), 4);
  assert.equal(longitudPared(h, 'este'), 3);
  assert.equal(longitudPared(h, 'oeste'), 3);
  assert.equal(longitudPared(h, 'arriba'), 0);
  assert.equal(longitudPared(null, 'norte'), 0);
  assert.equal(longitudPared({ ancho: 'x', largo: 3 }, 'norte'), 0);
});

test('F4c vanoCabeEnPared: usa la longitud de SU lado; borde exacto cabe; offset negativo o datos inválidos no', () => {
  const h = sala();
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', 3.2), h), true);          // 3.2 + 0.8 = 4: justo
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', 3.21), h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'este', 2.2), h), true);           // este: largo 3 → 2.2 + 0.8 = 3
  assert.equal(vanoCabeEnPared(vano('v1', 'este', 2.3), h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', 0), h), true);
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', -0.5), h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', 0, 4.5), h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', 0, 0), h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'techo', 0), h), false);
  assert.equal(vanoCabeEnPared(null, h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', NaN), h), false);
  assert.equal(vanoCabeEnPared(vano('v1', 'norte', 0.1), null), false);
});

test('F4c vanosSeSolapan: misma pared e intersección positiva; extremo compartido o paredes distintas no', () => {
  assert.equal(vanosSeSolapan(vano('v1', 'norte', 0, 1), vano('v2', 'norte', 0.5, 1)), true);
  assert.equal(vanosSeSolapan(vano('v1', 'norte', 0, 1), vano('v2', 'norte', 1, 1)), false);        // solo comparten el extremo
  assert.equal(vanosSeSolapan(vano('v1', 'norte', 0, 1), vano('v2', 'norte', 1.001, 1)), false);
  assert.equal(vanosSeSolapan(vano('v1', 'norte', 0, 1), vano('v2', 'sur', 0, 1)), false);          // otra pared
  assert.equal(vanosSeSolapan(vano('v1', 'este', 0, 2), vano('v2', 'este', 1, 0.5)), true);         // uno dentro del otro
  assert.equal(vanosSeSolapan(vano('v1', 'norte', 0, 1), null), false);
  assert.equal(vanosSeSolapan(vano('v1', 'norte', 0, 1), vano('v1', 'norte', 0, 1)), true);
});

test('F4c siguienteIdVano: máximo + 1; sin vanos v1; ignora ids mal formados', () => {
  assert.equal(siguienteIdVano([]), 'v1');
  assert.equal(siguienteIdVano(null), 'v1');
  assert.equal(siguienteIdVano([{ id: 'v1' }, { id: 'v7' }, { id: 'v3' }]), 'v8');
  assert.equal(siguienteIdVano([{ id: 'x9' }, { id: 'v0' }, { id: 5 }, null, {}]), 'v1');
});

test('F4c sanearVanos: entradas no válidas dan [] y nunca lanzan', () => {
  for (const basura of [undefined, null, 0, 'x', true, {}, { a: 1 }, () => 1, NaN]) assert.deepEqual(sanearVanos(basura), [], String(typeof basura));
  assert.deepEqual(sanearVanos([]), []);
});

test('F4c sanearVanos: descarta lo estructuralmente inválido y conserva lo válido, aunque no quepa en la pared', () => {
  const r = sanearVanos([
    vano('v1', 'norte', 1),                                                   // válido
    { id: 'v2', tipo: 'pasillo', lado: 'norte', offset: 0, ancho: 1, alto: 2 },   // tipo desconocido
    { id: 'v3', tipo: 'puerta', lado: 'arriba', offset: 0, ancho: 1, alto: 2 },   // lado desconocido
    vano('v4', 'sur', -1),                                                    // offset negativo
    vano('v5', 'sur', 0, 0),                                                  // ancho 0
    vano('v6', 'sur', 0, 0.8, 0),                                             // alto 0
    vano('v7', 'sur', 0, 101),                                                // ancho > 100
    vano('v8', 'sur', 0, 0.8, 10.5),                                          // alto > 10
    vano('v9', 'sur', 101),                                                   // offset > 100
    vano('v10', 'sur', NaN), vano('v11', 'sur', 0, Infinity), null, 7, 'x', [], {},
    vano('v12', 'este', 50, 0.8, 2.1, 'ventana'),                             // no cabría en ninguna habitación normal, pero es estructuralmente válido
  ]);
  assert.deepEqual(r.map(v => v.id), ['v1', 'v12']);
  assert.deepEqual(Object.keys(r[0]), ['id', 'tipo', 'lado', 'offset', 'ancho', 'alto']);
});

test('F4c sanearVanos: ids repetidos o ausentes se reasignan sin colisiones; campos extra se eliminan; milésimas', () => {
  const r = sanearVanos([
    vano('v1', 'norte', 0.12345), { ...vano('v1', 'sur', 1), extra: 'x' }, { tipo: 'ventana', lado: 'este', offset: 0, ancho: 1, alto: 1.2 },
    { ...vano('zz', 'oeste', 0), nombre: 'no' }, vano('v5', 'norte', 2),
  ]);
  const ids = r.map(v => v.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(r[0].id, 'v1');
  assert.equal(r[0].offset, 0.123);
  assert.ok(r.every(v => /^v[1-9]\d*$/.test(v.id)));
  assert.ok(r.every(v => !('extra' in v) && !('nombre' in v)));
  assert.ok(ids.includes('v5'));
});

test('F4c sanearVanos: más de 20 se trunca a 20 (los primeros válidos); los inválidos no cuentan', () => {
  const muchos = Array.from({ length: 30 }, (_, i) => vano(`v${i + 1}`, 'norte', (i % 3) * 0.1));
  const r = sanearVanos(muchos);
  assert.equal(VANO_MAX_POR_HAB, 20);
  assert.equal(r.length, 20);
  assert.equal(r.at(-1).id, 'v20');
  const mezcla = [...Array.from({ length: 10 }, () => ({ basura: true })), ...muchos];
  assert.equal(sanearVanos(mezcla).length, 20);
});

test('F4c sanearVanos: idempotente, no muta la entrada y sobrevive a ciclo JSON', () => {
  const entrada = [vano('v1', 'norte', 1.2345), { tipo: 'ventana', lado: 'sur', offset: 0, ancho: 1, alto: 1.2 }, vano('v1', 'este', 0)];
  const copia = JSON.parse(JSON.stringify(entrada));
  const una = sanearVanos(entrada);
  assert.deepEqual(entrada, copia);
  assert.deepEqual(sanearVanos(una), una);
  assert.deepEqual(sanearVanos(JSON.parse(JSON.stringify(una))), una);
});

test('F4c sanearHabitaciones: la clave «vanos» solo se emite si hay vanos (lo guardado en F4b no cambia ni una clave)', () => {
  const sin = sanearHabitaciones([hab('h1', 0, 0, 3, 2)]);
  assert.deepEqual(Object.keys(sin[0]), ['id', 'tipo', 'x', 'z', 'ancho', 'largo', 'nombre']);
  assert.equal('vanos' in sin[0], false);
  assert.equal('vanos' in sanearHabitaciones([{ ...hab('h1', 0, 0, 3, 2), vanos: [] }])[0], false);
  assert.equal('vanos' in sanearHabitaciones([{ ...hab('h1', 0, 0, 3, 2), vanos: 'x' }])[0], false);
  assert.equal('vanos' in sanearHabitaciones([{ ...hab('h1', 0, 0, 3, 2), vanos: [{ basura: 1 }] }])[0], false);
  const con = sanearHabitaciones([sala([vano('v1', 'norte', 1)])]);
  assert.deepEqual(Object.keys(con[0]), ['id', 'tipo', 'x', 'z', 'ancho', 'largo', 'nombre', 'vanos']);
  assert.deepEqual(con[0].vanos, [vano('v1', 'norte', 1)]);
  assert.deepEqual(sanearHabitaciones(con), con);                                   // idempotente con vanos
});

test('F4c sanearHabitaciones: un vano que no cabe se CONSERVA (se avisa, no se borra)', () => {
  const r = sanearHabitaciones([sala([vano('v1', 'norte', 3.5)])]);
  assert.equal(r[0].vanos.length, 1);
  assert.equal(vanoCabeEnPared(r[0].vanos[0], r[0]), false);
});

test('F4c sanearPlano: los vanos viajan dentro de las habitaciones; tope global de 200 por plano', () => {
  const p = sanearPlano({ habitaciones: [sala([vano('v1', 'norte', 1)])] });
  assert.deepEqual(p.habitaciones[0].vanos, [vano('v1', 'norte', 1)]);
  assert.deepEqual(sanearPlano(p), p);
  const veinte = () => Array.from({ length: 20 }, (_, i) => vano(`v${i + 1}`, 'norte', 0));
  const once = Array.from({ length: 11 }, (_, i) => ({ ...hab(`h${i + 1}`, i * 3, 0, 2, 2), vanos: veinte() }));
  const r = sanearPlano({ habitaciones: once });
  assert.equal(VANO_MAX_GLOBAL, 200);
  assert.equal(totalVanos(r.habitaciones), 200);
  assert.equal(r.habitaciones.length, 11);
  assert.equal('vanos' in r.habitaciones[10], false);                 // la última se queda sin vanos
  assert.equal(r.habitaciones[9].vanos.length, 20);
  assert.deepEqual(sanearPlano(r), r);
  const parcial = [...once.slice(0, 9), { ...once[9], vanos: veinte().slice(0, 15) }, { ...once[10] }];
  assert.equal(sanearPlano({ habitaciones: parcial }).habitaciones[10].vanos.length, 5);   // 180 + 15 = 195 → quedan 5
});

test('F4c segmentoVano: extremos en el mundo según el lado y el origen de cada pared', () => {
  const h = sala();                                                           // x −3…1, z −2…1
  assert.deepEqual(segmentoVano(h, vano('v1', 'norte', 1.5)), { x1: -1.5, z1: 1, x2: -0.7, z2: 1 });
  assert.deepEqual(segmentoVano(h, vano('v1', 'sur', 0)), { x1: -3, z1: -2, x2: -2.2, z2: -2 });
  assert.deepEqual(segmentoVano(h, vano('v1', 'este', 1, 1)), { x1: 1, z1: -1, x2: 1, z2: 0 });
  assert.deepEqual(segmentoVano(h, vano('v1', 'oeste', 2, 1)), { x1: -3, z1: 0, x2: -3, z2: 1 });
  assert.equal(segmentoVano(h, vano('v1', 'techo', 0)), null);
  assert.equal(segmentoVano(null, vano('v1', 'norte', 0)), null);
  const movida = { ...h, x: h.x + 2, z: h.z + 5 };                            // al mover la habitación el vano va con ella
  assert.deepEqual(segmentoVano(movida, vano('v1', 'norte', 1.5)), { x1: 0.5, z1: 6, x2: 1.3, z2: 6 });
});

test('F4c posicionEnPared y paredMasCercana: la pared más cercana dentro de la tolerancia, con la posición a lo largo de ella', () => {
  const h = sala();
  assert.equal(posicionEnPared(h, 'norte', -1, 1), 2);
  assert.equal(posicionEnPared(h, 'este', 1, -0.5), 1.5);
  assert.deepEqual(paredMasCercana(h, -1, 1.05, 0.2), { lado: 'norte', pos: 2, distancia: 0.05 });
  assert.equal(paredMasCercana(h, 1.1, -0.5, 0.2).lado, 'este');
  assert.equal(paredMasCercana(h, -3.05, 0, 0.2).lado, 'oeste');
  assert.equal(paredMasCercana(h, -1, -2.1, 0.2).lado, 'sur');
  assert.equal(paredMasCercana(h, -1, -0.5, 0.2), null);                      // centro de la habitación: lejos de toda pared
  assert.equal(paredMasCercana(h, 9, 9, 0.2), null);
  assert.equal(paredMasCercana(null, 0, 0, 0.2), null);
});

test('F4c offsetParaVano y vanoNuevo: centrado, con imán opcional, limitado a la pared; null si no cabe en toda la pared', () => {
  const h = sala();
  assert.equal(offsetParaVano(h, 'norte', 0.8, 2), 1.6);                      // centro 2 → inicio 1.6
  assert.equal(offsetParaVano(h, 'norte', 0.8, 0.1), 0);                      // se pega al origen
  assert.equal(offsetParaVano(h, 'norte', 0.8, 3.9), 3.2);                    // se pega al final (4 − 0.8)
  assert.equal(offsetParaVano(h, 'norte', 0.8, 2, 0.5), 1.5);                 // imán: inicio mundo −1.4 → −1.5 → offset 1.5
  assert.equal(offsetParaVano(h, 'este', 1, 1.5, 0.5), 1);                    // inicio z −1.0 − (−2)... = 1
  assert.equal(offsetParaVano(h, 'norte', 5, 2), null);                       // más ancho que la pared
  assert.equal(offsetParaVano(h, 'norte', 0.8, NaN), null);
  assert.deepEqual(vanoNuevo(h, 'puerta', 'norte', 2, 0.5), { tipo: 'puerta', lado: 'norte', offset: 1.5, ancho: 0.8, alto: 2.1 });
  assert.deepEqual(vanoNuevo(h, 'ventana', 'este', 1.5, 0.5), { tipo: 'ventana', lado: 'este', offset: 1, ancho: 1, alto: 1.2 });
  assert.equal(vanoNuevo({ ...h, ancho: 0.5 }, 'puerta', 'norte', 0.25), null);   // pared de 0.5 m: la puerta de 0.8 no cabe
  assert.equal(vanoNuevo(h, 'pasillo', 'norte', 2), null);
  assert.deepEqual(VANO_DEFECTO.puerta, { ancho: 0.8, alto: 2.1 });
  assert.deepEqual(VANO_DEFECTO.ventana, { ancho: 1, alto: 1.2 });
});

test('F4c desplazarVano: mueve a lo largo de su pared, se detiene en [0, longitud − ancho] y no cambia de pared', () => {
  const h = sala([vano('v1', 'norte', 1.5)]);
  const v = h.vanos[0];
  assert.equal(desplazarVano(h, v, 1), 2.5);
  assert.equal(desplazarVano(h, v, -9), 0);
  assert.equal(desplazarVano(h, v, 9), 3.2);
  assert.equal(desplazarVano(h, v, 0.3, 0.5), 2);                             // imán: inicio mundo −1.2 → −1 → offset 2
  assert.equal(desplazarVano(h, { ...v, lado: 'este' }, 9), 2.2);             // este: largo 3 − 0.8
  assert.equal(desplazarVano(h, { ...v, ancho: 6 }, 1), 0);                   // no cabe: queda en el origen
  assert.equal(desplazarVano(h, v, NaN), null);
});

test('F4c vanoEn / vanoEnHabitaciones: el vano más cercano bajo el cursor; ninguno lejos de su segmento', () => {
  const h = sala([vano('v1', 'norte', 1.5), vano('v2', 'sur', 0, 1, 1.2, 'ventana')]);
  assert.equal(vanoEn(h, -1.1, 1.05, 0.2).id, 'v1');
  assert.equal(vanoEn(h, -2.5, -2, 0.2).id, 'v2');
  assert.equal(vanoEn(h, -1.1, 0.5, 0.2), null);                              // lejos de la pared
  assert.equal(vanoEn(h, 0.5, 1, 0.2), null);                                 // en la pared pero fuera del vano
  assert.equal(vanoEn(sala(), -1.1, 1, 0.2), null);                           // sin vanos
  assert.equal(vanoEn(null, 0, 0, 1), null);
  const otra = { ...hab('h2', 5, 5, 2, 2), vanos: [vano('v1', 'oeste', 0.5, 1)] };
  const r = vanoEnHabitaciones([h, otra], 5, 6, 0.2);
  assert.equal(r.hab.id, 'h2');
  assert.equal(r.vano.id, 'v1');
  assert.equal(vanoEnHabitaciones([h, otra], -1.1, 1, 0.2).hab.id, 'h1');
  assert.equal(vanoEnHabitaciones([h, otra], 20, 20, 0.2), null);
  assert.equal(vanoEnHabitaciones(null, 0, 0, 1), null);
});

test('F4c estadoVanos y totalVanos: fuera de pared y solapes por vano; recuento total', () => {
  const h = sala([vano('v1', 'norte', 0, 1), vano('v2', 'norte', 0.5, 1), vano('v3', 'norte', 3.5), vano('v4', 'sur', 0.5, 1)]);
  const e = estadoVanos(h);
  assert.deepEqual(e.v1, { fuera: false, solapa: ['v2'] });
  assert.deepEqual(e.v2, { fuera: false, solapa: ['v1'] });
  assert.deepEqual(e.v3, { fuera: true, solapa: [] });                        // 3.5 + 0.8 = 4.3 > 4
  assert.deepEqual(e.v4, { fuera: false, solapa: [] });                       // otra pared: no se solapa
  assert.deepEqual(estadoVanos(sala()), {});
  assert.deepEqual(estadoVanos(null), {});
  assert.equal(totalVanos([h, sala(), { ...hab('h2', 0, 0, 1, 1), vanos: [vano('v1', 'sur', 0)] }]), 5);
  assert.equal(totalVanos(null), 0);
  assert.equal(nombreVano(vano('v2', 'norte', 0)), 'Puerta v2');
  assert.equal(nombreVano(vano('v3', 'norte', 0, 1, 1.2, 'ventana')), 'Ventana v3');
});


// ── F4d · Materialización del plano en 3D ──
const hab3 = (id, x, z, ancho, largo, vanos) => ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre: id, ...(vanos ? { vanos } : {}) });
const puerta3 = (id, lado, offset, ancho = 0.8, alto = 2.1) => ({ id, tipo: 'puerta', lado, offset, ancho, alto });
const ventana3 = (id, lado, offset, ancho = 1, alto = 1.2) => ({ id, tipo: 'ventana', lado, offset, ancho, alto });
const casi = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// Cajas del mundo (m) de los rectángulos sólidos de una pared (grosor centrado en la arista).
function cajas3D(pared) {
  const t = pared.grosor / 2;
  return generarParedConHuecos(pared).map(r => (pared.orientacion === 'h'
    ? { x0: pared.x1 + r.u0, x1: pared.x1 + r.u1, z0: pared.z1 - t, z1: pared.z1 + t, y0: r.y0, y1: r.y1 }
    : { x0: pared.x1 - t, x1: pared.x1 + t, z0: pared.z1 + r.u0, z1: pared.z1 + r.u1, y0: r.y0, y1: r.y1 }));
}
const volCaja = c => (c.x1 - c.x0) * (c.z1 - c.z0) * (c.y1 - c.y0);
function volSolape(a, b) {
  const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), dz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0), dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return dx > 1e-9 && dz > 1e-9 && dy > 1e-9 ? dx * dz * dy : 0;
}
function sinSolapes(paredes) {
  const todas = paredes.flatMap(p => cajas3D(p).map(c => ({ c, id: p.id })));
  let max = 0;
  for (let i = 0; i < todas.length; i++) for (let j = i + 1; j < todas.length; j++) max = Math.max(max, volSolape(todas[i].c, todas[j].c));
  return max;
}
// PRNG determinista (mulberry32)
function prng(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('F4d · opcionesParedes: valores por defecto (2.8 / 0.15 / 1.0) y los inválidos vuelven al defecto', () => {
  assert.deepEqual(opcionesParedes(), { altura: PARED_ALTURA_DEFECTO, grosor: PARED_GROSOR_DEFECTO, alfeizar: PARED_ALFEIZAR_DEFECTO });
  assert.equal(PARED_ALTURA_DEFECTO, 2.8); assert.equal(PARED_GROSOR_DEFECTO, 0.15); assert.equal(PARED_ALFEIZAR_DEFECTO, 1.0);
  assert.deepEqual(opcionesParedes({ altura: 3, grosor: 0.2, alfeizar: 0.9 }), { altura: 3, grosor: 0.2, alfeizar: 0.9 });
  assert.deepEqual(opcionesParedes({ altura: -1, grosor: 'x', alfeizar: NaN }), { altura: 2.8, grosor: 0.15, alfeizar: 1 });
  assert.equal(opcionesParedes({ altura: 0.8, alfeizar: 5 }).alfeizar < 0.8, true, 'el alféizar nunca supera la altura');
  assert.deepEqual(opcionesParedes(null), opcionesParedes({}));
});

test('F4d · detectarParedesCompartidas: una habitación → 4 paredes (2 h + 2 v)', () => {
  const r = detectarParedesCompartidas([hab3('h1', 0, 0, 4, 3)]);
  assert.equal(r.length, 4);
  assert.equal(r.filter(p => p.orientacion === 'h').length, 2);
  assert.equal(r.filter(p => p.orientacion === 'v').length, 2);
  assert.ok(r.every(p => p.habitaciones.length === 1 && p.habitaciones[0] === 'h1'));
});

test('F4d · detectarParedesCompartidas: sin habitaciones o con basura → []', () => {
  assert.deepEqual(detectarParedesCompartidas([]), []);
  assert.deepEqual(detectarParedesCompartidas(undefined), []);
  assert.deepEqual(detectarParedesCompartidas([null, 3, { id: 'x' }, hab3('h1', 0, 0, 0, 3)]), []);
});

test('F4d · detectarParedesCompartidas: 2 habitaciones adosadas de lados iguales → 7 paredes y una compartida', () => {
  const r = detectarParedesCompartidas([hab3('h1', 0, 0, 4, 3), hab3('h2', 4, 0, 4, 3)]);
  assert.equal(r.length, 7);
  const comp = r.filter(p => p.habitaciones.length === 2);
  assert.equal(comp.length, 1);
  assert.deepEqual(comp[0], { orientacion: 'v', x1: 4, z1: 0, x2: 4, z2: 3, habitaciones: ['h1', 'h2'] });
});

test('F4d · detectarParedesCompartidas: 2 habitaciones adosadas de lados DESIGUALES → 8 paredes (la pared de 3 m se parte en 2 + 1)', () => {
  const r = detectarParedesCompartidas([hab3('h1', 0, 0, 4, 3), hab3('h2', 4, 0, 4, 2)]);
  assert.equal(r.length, 8);
  const comp = r.filter(p => p.habitaciones.length === 2);
  assert.equal(comp.length, 1);
  assert.deepEqual(comp[0], { orientacion: 'v', x1: 4, z1: 0, x2: 4, z2: 2, habitaciones: ['h1', 'h2'] });
  const resto = r.find(p => p.orientacion === 'v' && p.x1 === 4 && p.z1 === 2);
  assert.deepEqual(resto.habitaciones, ['h1']);
  assert.equal(resto.z2, 3);
});

test('F4d · detectarParedesCompartidas: 2 habitaciones sin contacto → 8 paredes y ninguna compartida', () => {
  const r = detectarParedesCompartidas([hab3('h1', 0, 0, 3, 3), hab3('h2', 5, 0, 3, 3)]);
  assert.equal(r.length, 8);
  assert.ok(r.every(p => p.habitaciones.length === 1));
});

test('F4d · detectarParedesCompartidas: 2 habitaciones que solo se tocan en una esquina → 8 paredes (no comparten pared)', () => {
  const r = detectarParedesCompartidas([hab3('h1', 0, 0, 3, 3), hab3('h2', 3, 3, 3, 3)]);
  assert.equal(r.length, 8);
  assert.ok(r.every(p => p.habitaciones.length === 1));
});

test('F4d · detectarParedesCompartidas: 3 habitaciones en línea → 10 paredes (2 compartidas); 3 en L → 10 paredes (2 compartidas)', () => {
  const linea = detectarParedesCompartidas([hab3('a', 0, 0, 3, 3), hab3('b', 3, 0, 3, 3), hab3('c', 6, 0, 3, 3)]);
  assert.equal(linea.length, 10);
  assert.equal(linea.filter(p => p.habitaciones.length === 2).length, 2);
  const ele = detectarParedesCompartidas([hab3('a', 0, 0, 3, 3), hab3('b', 3, 0, 3, 3), hab3('c', 0, 3, 3, 3)]);
  assert.equal(ele.length, 10);
  assert.equal(ele.filter(p => p.habitaciones.length === 2).length, 2);
});

test('F4d · detectarParedesCompartidas: 4 habitaciones en cuadrícula 2×2 → 12 paredes', () => {
  const r = detectarParedesCompartidas([hab3('a', 0, 0, 3, 3), hab3('b', 3, 0, 3, 3), hab3('c', 0, 3, 3, 3), hab3('d', 3, 3, 3, 3)]);
  assert.equal(r.length, 12);
  assert.equal(r.filter(p => p.habitaciones.length === 2).length, 4);
});

test('F4d · detectarParedesCompartidas: habitaciones solapadas no rompen y las paredes de una misma línea no se solapan entre sí', () => {
  const r = detectarParedesCompartidas([hab3('a', 0, 0, 4, 4), hab3('b', 2, 2, 4, 4), hab3('c', 1, 1, 2, 2)]);
  assert.ok(r.length > 0);
  for (const o of ['h', 'v']) {
    const porLinea = new Map();
    for (const p of r.filter(q => q.orientacion === o)) {
      const k = o === 'h' ? p.z1 : p.x1;
      const [a, b] = o === 'h' ? [p.x1, p.x2] : [p.z1, p.z2];
      if (!porLinea.has(k)) porLinea.set(k, []);
      porLinea.get(k).push([a, b]);
    }
    for (const trozos of porLinea.values()) {
      trozos.sort((m, n) => m[0] - n[0]);
      for (let i = 0; i + 1 < trozos.length; i++) assert.ok(trozos[i][1] <= trozos[i + 1][0] + 1e-9, 'trozos de pared solapados');
    }
  }
});

test('F4d · detectarParedesCompartidas: longitud total = suma de perímetros − 2 × longitud compartida (propiedad, 40 casos aleatorios sin solape)', () => {
  const rnd = prng(7);
  for (let caso = 0; caso < 40; caso++) {
    const ocup = new Set(), habs = [];
    for (let k = 0; k < 6; k++) {
      const w = 1 + Math.floor(rnd() * 3), l = 1 + Math.floor(rnd() * 3), x = Math.floor(rnd() * 6), z = Math.floor(rnd() * 6);
      const celdas = [];
      for (let i = 0; i < w; i++) for (let j = 0; j < l; j++) celdas.push(`${x + i},${z + j}`);
      if (celdas.some(c => ocup.has(c))) continue;
      celdas.forEach(c => ocup.add(c));
      habs.push(hab3(`h${habs.length + 1}`, x, z, w, l));
    }
    const r = detectarParedesCompartidas(habs);
    const long = p => (p.orientacion === 'h' ? p.x2 - p.x1 : p.z2 - p.z1);
    const perimetros = habs.reduce((n, h) => n + 2 * (h.ancho + h.largo), 0);
    const compartida = r.filter(p => p.habitaciones.length === 2).reduce((n, p) => n + long(p), 0);
    const total = r.reduce((n, p) => n + long(p), 0);
    assert.ok(casi(total, perimetros - compartida), `caso ${caso}: ${total} vs ${perimetros - compartida}`);
    assert.ok(r.every(p => p.habitaciones.length <= 2));
  }
});

test('F4d · generarParedes3D: ids p1…pN, medidas por defecto y huecos vacíos sin vanos', () => {
  const ps = generarParedes3D([hab3('h1', 0, 0, 4, 3)]);
  assert.equal(ps.length, 4);
  assert.deepEqual(ps.map(p => p.id), ['p1', 'p2', 'p3', 'p4']);
  for (const p of ps) {
    assert.equal(p.altura, 2.8); assert.equal(p.grosor, 0.15); assert.equal(p.alfeizar, 1);
    assert.deepEqual(p.huecos, []);
    assert.equal(p.longitud, p.orientacion === 'h' ? 4 : 3);
  }
  assert.deepEqual(generarParedes3D([]), []);
  assert.deepEqual(generarParedes3D(null), []);
});

test('F4d · generarParedes3D: las opciones cambian altura, grosor y alféizar', () => {
  const ps = generarParedes3D([hab3('h1', 0, 0, 4, 3)], { altura: 3, grosor: 0.3, alfeizar: 0.8 });
  assert.ok(ps.every(p => p.altura === 3 && p.grosor === 0.3 && p.alfeizar === 0.8));
  const [h] = ps;
  assert.equal(casi(h.ini, 0.15), true);
});

test('F4d · generarParedes3D: esquinas — horizontales se alargan t/2 en los extremos de su cadena y verticales se acortan t/2 donde toca una horizontal', () => {
  const ps = generarParedes3D([hab3('h1', 0, 0, 4, 3)]);
  const h = ps.filter(p => p.orientacion === 'h'), v = ps.filter(p => p.orientacion === 'v');
  assert.ok(h.every(p => casi(p.ini, 0.075) && casi(p.fin, 0.075)));
  assert.ok(v.every(p => casi(p.ini, -0.075) && casi(p.fin, -0.075)));
});

test('F4d · generarParedes3D: dos habitaciones adosadas → las horizontales colineales no se alargan en su unión', () => {
  const ps = generarParedes3D([hab3('h1', 0, 0, 4, 3), hab3('h2', 4, 0, 4, 3)]);
  assert.equal(ps.length, 7);
  const sur = ps.filter(p => p.orientacion === 'h' && p.z1 === 0).sort((m, n) => m.x1 - n.x1);
  assert.equal(sur.length, 2);
  assert.ok(casi(sur[0].ini, 0.075) && sur[0].fin === 0);
  assert.ok(sur[1].ini === 0 && casi(sur[1].fin, 0.075));
});

test('F4d · generarParedes3D: sin volúmenes que se solapen en layouts sin solape de habitaciones (propiedad, 60 casos aleatorios con vanos)', () => {
  const rnd = prng(11);
  for (let caso = 0; caso < 60; caso++) {
    const ocup = new Set(), habs = [];
    for (let k = 0; k < 7; k++) {
      const w = 2 + Math.floor(rnd() * 3), l = 2 + Math.floor(rnd() * 3), x = Math.floor(rnd() * 8), z = Math.floor(rnd() * 8);
      const celdas = [];
      for (let i = 0; i < w; i++) for (let j = 0; j < l; j++) celdas.push(`${x + i},${z + j}`);
      if (celdas.some(c => ocup.has(c))) continue;
      celdas.forEach(c => ocup.add(c));
      const vanos = [];
      const lados = ['norte', 'sur', 'este', 'oeste'];
      for (let q = 0; q < 3; q++) {
        const lado = lados[Math.floor(rnd() * 4)];
        const L = lado === 'norte' || lado === 'sur' ? w : l;
        vanos.push(rnd() < 0.5 ? puerta3(`v${q + 1}`, lado, Math.round(rnd() * (L - 1) * 10) / 10) : ventana3(`v${q + 1}`, lado, Math.round(rnd() * (L - 1) * 10) / 10));
      }
      habs.push(hab3(`h${habs.length + 1}`, x, z, w, l, vanos));
    }
    const ps = generarParedes3D(habs);
    assert.ok(sinSolapes(ps) < 1e-9, `caso ${caso}: solape de volumen ${sinSolapes(ps)}`);
  }
});

test('F4d · vanoA3D: puerta desde el suelo; ventana elevada (alféizar 1.0)', () => {
  const h = hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1), ventana3('v2', 'norte', 2.5)]);
  const pared = generarParedes3D([h]).find(p => p.orientacion === 'h' && p.z1 === 3);
  assert.deepEqual(vanoA3D(h.vanos[0], h, pared), { vano: 'v1', hab: 'h1', tipo: 'puerta', u0: 1, u1: 1.8, y0: 0, y1: 2.1, recortado: false });
  assert.deepEqual(vanoA3D(h.vanos[1], h, pared), { vano: 'v2', hab: 'h1', tipo: 'ventana', u0: 2.5, u1: 3.5, y0: 1, y1: 2.2, recortado: false });
});

test('F4d · vanoA3D: orientación de F4c — offset crece con +x en norte/sur y con +z en este/oeste', () => {
  const h = hab3('h1', 2, -1, 4, 3, [puerta3('s', 'sur', 0.5), puerta3('e', 'este', 0.5), puerta3('o', 'oeste', 1)]);
  const ps = generarParedes3D([h]);
  const sur = ps.find(p => p.orientacion === 'h' && p.z1 === -1), este = ps.find(p => p.orientacion === 'v' && p.x1 === 6), oeste = ps.find(p => p.orientacion === 'v' && p.x1 === 2);
  assert.ok(casi(vanoA3D(h.vanos[0], h, sur).u0, 0.5));
  assert.ok(casi(vanoA3D(h.vanos[1], h, este).u0, 0.5));
  assert.ok(casi(vanoA3D(h.vanos[2], h, oeste).u0, 1));
  // segmento mundial: el vano este está en z ∈ [-0.5, 0.3] (desde el extremo sur z=-1)
  const sg = segmentoVano(h, h.vanos[1]);
  assert.ok(casi(sg.z1, -0.5) && casi(sg.z2, 0.3));
});

test('F4d · vanoA3D: null si el vano no pertenece a la pared (otro lado, otra habitación, otra orientación)', () => {
  const h = hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1)]);
  const ps = generarParedes3D([h]);
  const sur = ps.find(p => p.orientacion === 'h' && p.z1 === 0), este = ps.find(p => p.orientacion === 'v' && p.x1 === 4);
  assert.equal(vanoA3D(h.vanos[0], h, sur), null);
  assert.equal(vanoA3D(h.vanos[0], h, este), null);
  assert.equal(vanoA3D(h.vanos[0], hab3('otra', 0, 0, 4, 3), ps[0]), null);
  assert.equal(vanoA3D(null, h, ps[0]), null);
  assert.equal(vanoA3D(h.vanos[0], null, ps[0]), null);
  assert.equal(vanoA3D(h.vanos[0], h, null), null);
});

test('F4d · vanoA3D: un vano que sobresale de la pared se recorta (recortado = true) y uno totalmente fuera da null', () => {
  const h = hab3('h1', 0, 0, 2, 3, [puerta3('v1', 'norte', 1.5, 1.0), puerta3('v2', 'norte', 5, 0.8), ventana3('v3', 'norte', 0.2, 1.0, 5)]);
  const pared = generarParedes3D([h]).find(p => p.orientacion === 'h' && p.z1 === 3);
  const v1 = vanoA3D(h.vanos[0], h, pared);
  assert.ok(v1.recortado && casi(v1.u0, 1.5) && casi(v1.u1, 2));
  assert.equal(vanoA3D(h.vanos[1], h, pared), null);
  const v3 = vanoA3D(h.vanos[2], h, pared);
  assert.ok(v3.recortado && casi(v3.y1, pared.altura), 'el alto se recorta a la altura de la pared');
});

test('F4d · vanoA3D: en una pared compartida el vano de cada habitación cae en la misma pared física', () => {
  const a = hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'este', 1)]);
  const b = hab3('h2', 4, 0, 4, 3, [ventana3('v1', 'oeste', 1.5)]);
  const ps = generarParedes3D([a, b]);
  const comp = ps.find(p => p.habitaciones.length === 2);
  assert.equal(comp.huecos.length, 2);
  assert.deepEqual(comp.huecos.map(k => k.hab).sort(), ['h1', 'h2']);
  assert.ok(casi(comp.huecos.find(k => k.hab === 'h1').u0, 1));
  assert.ok(casi(comp.huecos.find(k => k.hab === 'h2').u0, 1.5));
});

test('F4d · vanoA3D: en una pared partida (lados desiguales) un vano solo abre hueco en el trozo que lo contiene', () => {
  const a = hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'este', 0.3), puerta3('v2', 'este', 2.2, 0.6)]);
  const b = hab3('h2', 4, 0, 4, 2);
  const ps = generarParedes3D([a, b]);
  const compartida = ps.find(p => p.orientacion === 'v' && p.x1 === 4 && p.z1 === 0), resto = ps.find(p => p.orientacion === 'v' && p.x1 === 4 && p.z1 === 2);
  assert.deepEqual(compartida.huecos.map(k => k.vano), ['v1']);
  assert.deepEqual(resto.huecos.map(k => k.vano), ['v2']);
  assert.ok(casi(resto.huecos[0].u0, 0.2) && casi(resto.huecos[0].u1, 0.8));
});

test('F4d · generarParedConHuecos: pared sin huecos → 1 rectángulo que cubre longitud × altura (con las esquinas)', () => {
  const [p] = generarParedes3D([hab3('h1', 0, 0, 4, 3)]);
  const r = generarParedConHuecos(p);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { u0: -0.075, u1: 4.075, y0: 0, y1: 2.8 });
});

test('F4d · generarParedConHuecos: puerta desde el suelo → 3 rectángulos (izquierda, derecha, dintel)', () => {
  const h = hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1)]);
  const p = generarParedes3D([h]).find(q => q.orientacion === 'h' && q.z1 === 3);
  const r = generarParedConHuecos(p);
  assert.equal(r.length, 3);
  assert.ok(r.some(x => casi(x.u0, -0.075) && casi(x.u1, 1) && x.y0 === 0 && casi(x.y1, 2.8)));
  assert.ok(r.some(x => casi(x.u0, 1.8) && casi(x.u1, 4.075) && x.y0 === 0 && casi(x.y1, 2.8)));
  assert.ok(r.some(x => casi(x.u0, 1) && casi(x.u1, 1.8) && casi(x.y0, 2.1) && casi(x.y1, 2.8)));
});

test('F4d · generarParedConHuecos: ventana elevada → 4 rectángulos (izquierda, derecha, antepecho, dintel)', () => {
  const h = hab3('h1', 0, 0, 4, 3, [ventana3('v1', 'norte', 1)]);
  const p = generarParedes3D([h]).find(q => q.orientacion === 'h' && q.z1 === 3);
  const r = generarParedConHuecos(p);
  assert.equal(r.length, 4);
  assert.ok(r.some(x => casi(x.u0, 1) && casi(x.u1, 2) && x.y0 === 0 && casi(x.y1, 1)), 'antepecho');
  assert.ok(r.some(x => casi(x.u0, 1) && casi(x.u1, 2) && casi(x.y0, 2.2) && casi(x.y1, 2.8)), 'dintel');
});

test('F4d · generarParedConHuecos: N huecos separados → 2N+1 rectángulos de puerta (3 puertas → 4 macizos + 3 dinteles = 7)', () => {
  const h = hab3('h1', 0, 0, 8, 3, [puerta3('a', 'norte', 0.5), puerta3('b', 'norte', 3), puerta3('c', 'norte', 6)]);
  const p = generarParedes3D([h]).find(q => q.orientacion === 'h' && q.z1 === 3);
  assert.equal(generarParedConHuecos(p).length, 7);
});

test('F4d · generarParedConHuecos: huecos solapados (puerta y ventana en el mismo sitio) no dan rectángulos inválidos ni sólido dentro del hueco', () => {
  const h = hab3('h1', 0, 0, 4, 3, [puerta3('a', 'norte', 1), ventana3('b', 'norte', 1.4)]);
  const p = generarParedes3D([h]).find(q => q.orientacion === 'h' && q.z1 === 3);
  const r = generarParedConHuecos(p);
  assert.ok(r.every(x => x.u1 > x.u0 && x.y1 > x.y0));
  // lo que cae dentro de [1, 1.8] × [0, 2.1] (puerta) o [1.4, 2.4] × [1, 2.2] (ventana) no puede ser sólido
  const solidoEn = (u, y) => r.some(x => u > x.u0 + 1e-9 && u < x.u1 - 1e-9 && y > x.y0 + 1e-9 && y < x.y1 - 1e-9);
  assert.equal(solidoEn(1.5, 1), false);
  assert.equal(solidoEn(2.2, 1.5), false);
  assert.equal(solidoEn(2.2, 0.5), true, 'debajo de la ventana (fuera de la puerta) es macizo');
  assert.equal(solidoEn(1.5, 2.5), true, 'sobre la puerta es macizo');
});

test('F4d · generarParedConHuecos: el área sólida = área de la pared − área de la unión de huecos (propiedad, 80 casos aleatorios con huecos solapados)', () => {
  const rnd = prng(23);
  for (let caso = 0; caso < 80; caso++) {
    const L = Math.round((2 + rnd() * 6) * 1000) / 1000, H = 2.8;   // longitud en mm, como la de las paredes reales
    const huecos = [];
    for (let k = 0; k < 1 + Math.floor(rnd() * 5); k++) {
      const u0 = Math.round(rnd() * (L - 0.5) * 10) / 10, an = Math.round((0.3 + rnd() * 1.5) * 10) / 10;
      const y0 = rnd() < 0.5 ? 0 : 1, y1 = Math.min(H, y0 + Math.round((0.5 + rnd() * 1.5) * 10) / 10);
      huecos.push({ u0, u1: Math.min(L, u0 + an), y0, y1 });
    }
    const pared = { longitud: L, altura: H, ini: 0, fin: 0, huecos };
    const r = generarParedConHuecos(pared);
    // unión de huecos por muestreo fino
    const N = 400, M = 140;
    let sol = 0, esperado = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const u = (i + 0.5) * L / N, y = (j + 0.5) * H / M;
      const enHueco = huecos.some(k => u > k.u0 && u < k.u1 && y > k.y0 && y < k.y1);
      const enSolido = r.some(x => u > x.u0 && u < x.u1 && y > x.y0 && y < x.y1);
      assert.equal(enSolido, !enHueco, `caso ${caso}: (${u.toFixed(3)}, ${y.toFixed(3)})`);
      if (enSolido) sol++;
      if (!enHueco) esperado++;
    }
    assert.equal(sol, esperado);
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const du = Math.min(r[i].u1, r[j].u1) - Math.max(r[i].u0, r[j].u0), dy = Math.min(r[i].y1, r[j].y1) - Math.max(r[i].y0, r[j].y0);
      assert.ok(!(du > 1e-9 && dy > 1e-9), `caso ${caso}: rectángulos solapados`);
    }
  }
});

test('F4d · generarParedConHuecos: un hueco que sobresale se recorta; uno que cubre toda la pared deja 0 rectángulos', () => {
  const rec = generarParedConHuecos({ longitud: 2, altura: 2.8, ini: 0, fin: 0, huecos: [{ u0: 1.5, u1: 5, y0: 0, y1: 2.1 }] });
  assert.ok(rec.every(x => x.u1 <= 2 + 1e-9));
  assert.equal(generarParedConHuecos({ longitud: 2, altura: 2.8, ini: 0, fin: 0, huecos: [{ u0: -1, u1: 3, y0: -1, y1: 5 }] }).length, 0);
});

test('F4d · generarParedConHuecos: entradas inválidas → []', () => {
  assert.deepEqual(generarParedConHuecos(null), []);
  assert.deepEqual(generarParedConHuecos({}), []);
  assert.deepEqual(generarParedConHuecos({ longitud: 0, altura: 2.8 }), []);
  assert.deepEqual(generarParedConHuecos({ longitud: 2, altura: -1 }), []);
});

test('F4d · contarRectangulos y resumirMaterializacion: cuentan paredes, rectángulos, vanos con hueco, recortados y sin hueco', () => {
  const a = hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1), ventana3('v2', 'este', 0.5), puerta3('v3', 'norte', 9)]);
  const b = hab3('h2', 4, 0, 4, 3);
  const ps = generarParedes3D([a, b]);
  assert.equal(contarRectangulos(ps), 12);
  assert.deepEqual(resumirMaterializacion([a, b], ps), { paredes: 7, rectangulos: 12, vanos: 2, recortados: 0, sinHueco: 1 });
  assert.equal(contarRectangulos(null), 0);
  assert.equal(PARED_RECT_AVISO, 1000);
});

test('F4d · sanearParedes: descarta las inválidas y reasigna ids; conserva las válidas', () => {
  const ps = generarParedes3D([hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1)])]);
  assert.deepEqual(sanearParedes(ps), ps);
  const sucias = [
    null, 7, { orientacion: 'x' },
    { ...ps[0], altura: -1 }, { ...ps[0], x2: ps[0].x1 }, { ...ps[0], habitaciones: [] }, { ...ps[0], habitaciones: [3] },
    { ...ps[1], huecos: [{ u0: 1, u1: 0.5, y0: 0, y1: 1 }, ...ps[1].huecos, 'x'] },
    ps[0],
  ];
  const r = sanearParedes(sucias);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(p => p.id), ['p1', 'p2']);
  assert.equal(r[0].huecos.length, 1);
  assert.deepEqual(sanearParedes('no'), []);
  assert.deepEqual(sanearParedes(undefined), []);
});

test('F4d · compactarMaterializado ↔ expandirMaterializado: ida y vuelta conserva habitaciones, vanos y parámetros; no guarda nombres ni ids de vano', () => {
  const habs = [hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1), ventana3('v2', 'este', 0.5)]), hab3('h2', 4, 0, 4, 3)];
  const mat = compactarMaterializado(habs, { altura: 3 });
  assert.equal(mat.v, MATERIALIZADO_VERSION);
  assert.deepEqual(mat, {
    v: 1, altura: 3, grosor: 0.15, alfeizar: 1,
    habitaciones: [['h1', 0, 0, 4, 3, [['puerta', 'norte', 1, 0.8, 2.1], ['ventana', 'este', 0.5, 1, 1.2]]], ['h2', 4, 0, 4, 3, []]],
  });
  assert.equal(JSON.stringify(mat).includes('nombre'), false);
  const { habitaciones, opciones } = expandirMaterializado(mat);
  assert.deepEqual(opciones, { altura: 3, grosor: 0.15, alfeizar: 1 });
  assert.deepEqual(generarParedes3D(habitaciones, opciones).map(p => [p.x1, p.z1, p.x2, p.z2, p.huecos.length]),
    generarParedes3D(habs, opciones).map(p => [p.x1, p.z1, p.x2, p.z2, p.huecos.length]));
});

test('F4d · sanearMaterializado: válido se conserva idéntico; corrupto o sin habitaciones → null; nunca lanza', () => {
  const mat = compactarMaterializado([hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1)])]);
  assert.deepEqual(sanearMaterializado(mat), mat);
  assert.deepEqual(sanearMaterializado(JSON.parse(JSON.stringify(mat))), mat);
  for (const mala of [null, undefined, 5, 'x', [], {}, { v: 2, habitaciones: mat.habitaciones }, { v: 1 }, { v: 1, habitaciones: 'x' }, { v: 1, habitaciones: [] }, { v: 1, habitaciones: [null, 3, 'x', []] }, { v: 1, habitaciones: [['h1', 'a', 0, 4, 3, []]] }]) {
    assert.equal(sanearMaterializado(mala), null, JSON.stringify(mala));
  }
  const sucio = { v: 1, altura: -5, grosor: 'x', alfeizar: 99, habitaciones: [['h1', 0, 0, 4, 3, [['puerta', 'norte', 1, 0.8, 2.1], ['basura'], null]], null] };
  const r = sanearMaterializado(sucio);
  assert.deepEqual(r.habitaciones, [['h1', 0, 0, 4, 3, [['puerta', 'norte', 1, 0.8, 2.1]]]]);
  assert.equal(r.altura, 2.8); assert.equal(r.grosor, 0.15); assert.ok(r.alfeizar < r.altura);
});

test('F4d · sanearPlano (C1): conserva un «materializado» válido, no lo inventa si falta y lo descarta si está corrupto', () => {
  const habs = [hab3('h1', 0, 0, 4, 3, [puerta3('v1', 'norte', 1)])];
  const mat = compactarMaterializado(habs);
  const con = sanearPlano({ ...planoVacio(), habitaciones: habs, materializado: mat });
  assert.deepEqual(con.materializado, mat);
  assert.deepEqual(sanearPlano(JSON.parse(JSON.stringify(con))).materializado, mat, 'idempotente');
  const sin = sanearPlano({ ...planoVacio(), habitaciones: habs });
  assert.equal('materializado' in sin, false, 'sin campo no se genera');
  const corrupto = sanearPlano({ ...planoVacio(), habitaciones: habs, materializado: { v: 1, habitaciones: 'x' } });
  assert.equal('materializado' in corrupto, false);
  assert.equal('materializado' in sanearPlano(null), false);
  assert.equal('materializado' in planoVacio(), false);
  // conservar el plano con materializado no altera el resto de campos de F4a/F4b/F4c
  const base = sanearPlano({ ...planoVacio(), habitaciones: habs });
  const { materializado, ...resto } = con;
  assert.deepEqual(resto, base);
});

test('F4d · rendimiento: 50 habitaciones con 3 vanos cada una se generan en menos de 1 s (puro, sin Babylon)', () => {
  const habs = [];
  for (let i = 0; i < 50; i++) habs.push(hab3(`h${i + 1}`, (i % 10) * 4, Math.floor(i / 10) * 4, 4, 4, [puerta3('v1', 'norte', 1), ventana3('v2', 'este', 1), ventana3('v3', 'sur', 2)]));
  const t0 = Date.now();
  const ps = generarParedes3D(habs);
  const n = contarRectangulos(ps);
  const ms = Date.now() - t0;
  assert.ok(ms < 1000, `${ms} ms`);
  assert.ok(ps.length > 100 && n > ps.length);
});
