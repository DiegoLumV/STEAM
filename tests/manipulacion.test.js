// tests/manipulacion.test.js
// F2.1 · Funciones puras de apoyo y clasificación (src/scripts/manipulacion.js).
// F2.3 · Criterio unificado de contacto (área exacta, umbral contactoMinimo, `penetra`, avisos ordenados).
//   node --test tests/manipulacion.test.js
// Sin DOM, sin Babylon.js, sin servidor ni base de datos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as manipulacion from '../src/scripts/manipulacion.js';
import {
  PARAMETROS_MANIPULACION, ESTADOS_COLOCACION, ORDEN_AVISOS, cajaValida, extensionMundo, limitesCaja, solapePlanta,
  buscarApoyo, clasificarColocacion, desplazamientoParaApoyar, areaPoligono, interseccionPoligonos, caraHorizontal,
} from '../src/scripts/manipulacion.js';

const cerca = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

// Caja de prueba con el formato de getBlockHitbox(): centro, ejes unitarios y semimedidas.
// rotY / rotX en radianes (giro sobre el eje vertical / inclinación sobre X).
function caja({ x = 0, y = 0, z = 0, ancho = 1, alto = 1, fondo = 1, rotY = 0, rotX = 0 }) {
  const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
  // Rotación Y y luego X (suficiente para estas pruebas)
  const ux = { x: cy, y: 0, z: -sy };
  const uy = { x: sy * sx, y: cx, z: cy * sx };
  const uz = { x: sy * cx, y: -sx, z: cy * cx };
  return { c: { x, y, z }, u: [ux, uy, uz], e: [ancho / 2, alto / 2, fondo / 2] };
}
// Pieza apoyada por su base en `base` (como las de BUILDERS: el origen está en la base).
const pieza = (base, dims) => caja({ ...dims, y: base + (dims.alto ?? 1) / 2 });
const BLOCK = { ancho: 1.0, alto: 0.7, fondo: 0.5 };            // BUILDERS.block
const LOSA = { id: 'losa', caja: caja({ y: 0.1, ancho: 20, alto: 0.2, fondo: 20 }) }; // concretoFinalizar

test('cajaValida y errores de entrada', () => {
  assert.equal(cajaValida(pieza(0, BLOCK)), true);
  for (const mala of [null, {}, { c: { x: 0, y: 0, z: 0 }, u: [], e: [1, 1, 1] },
    { ...pieza(0, BLOCK), e: [1, -1, 1] }, { ...pieza(0, BLOCK), c: { x: NaN, y: 0, z: 0 } }]) {
    assert.equal(cajaValida(mala), false);
  }
  assert.throws(() => buscarApoyo(null), TypeError);
  assert.throws(() => buscarApoyo(pieza(0, BLOCK), [{ id: 1, caja: {} }]), TypeError);
  assert.throws(() => buscarApoyo(pieza(0, BLOCK), 'x'), TypeError);
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), [], { toleranciaApoyo: -1 }), RangeError);
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), [], { alturaSuelo: Infinity }), TypeError);
  // F2.3: contactoMinimo se valida (número finito entre 0 y 1) y otras se valida también en clasificarColocacion
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), [], { contactoMinimo: 1.5 }), RangeError);
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), [], { contactoMinimo: -0.1 }), RangeError);
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), [], { contactoMinimo: NaN }), TypeError);
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), 'x'), TypeError);
  assert.throws(() => clasificarColocacion(pieza(0, BLOCK), [{ id: 1, caja: {}, penetra: true }]), TypeError);
});

test('extensión y límites: caja alineada, girada 90° en Y e inclinada 90° en X', () => {
  const recta = pieza(0, BLOCK);
  assert.deepEqual(limitesCaja(recta), { min: { x: -0.5, y: 0, z: -0.25 }, max: { x: 0.5, y: 0.7, z: 0.25 } });
  const girada = extensionMundo(caja({ ...BLOCK, rotY: Math.PI / 2 }));
  assert.ok(cerca(girada.x, 0.25) && cerca(girada.z, 0.5) && cerca(girada.y, 0.35));
  const tumbada = extensionMundo(caja({ ...BLOCK, rotX: Math.PI / 2 }));
  assert.ok(cerca(tumbada.y, 0.25) && cerca(tumbada.z, 0.35), 'al inclinarla, su altura pasa a ser el fondo');
  const g45 = extensionMundo(caja({ ancho: 1, alto: 1, fondo: 1, rotY: Math.PI / 4 }));
  assert.ok(cerca(g45.x, Math.SQRT2 / 2) && cerca(g45.z, Math.SQRT2 / 2));
});

test('solape en planta: separadas, tocándose y solapadas', () => {
  const a = pieza(0, BLOCK);
  assert.deepEqual(solapePlanta(a, pieza(0, { ...BLOCK, x: 3 })), { x: 0, z: 0.5 });
  assert.equal(solapePlanta(a, pieza(0, { ...BLOCK, x: 1 })).x, 0, 'tocarse no es solaparse');
  const s = solapePlanta(a, pieza(0.7, { ...BLOCK, x: 0.4 }));
  assert.ok(cerca(s.x, 0.6) && cerca(s.z, 0.5));
});

test('apoyada en el suelo; flotante sobre el suelo', () => {
  const r = clasificarColocacion(pieza(0, BLOCK));
  assert.equal(r.estado, 'apoyada');
  assert.deepEqual(r.apoyo, { altura: 0, soporte: null, tipo: 'suelo' });
  const f = clasificarColocacion(pieza(1.0, BLOCK));
  assert.equal(f.estado, 'flotante');
  assert.ok(cerca(f.separacion, 1.0));
});

test('losa: la pieza en y = 0 queda hundida 20 cm; en y = 0,2 queda apoyada sobre la losa', () => {
  const hundida = clasificarColocacion(pieza(0, BLOCK), [LOSA]);
  assert.equal(hundida.estado, 'hundida');
  assert.ok(cerca(hundida.separacion, -0.2));
  assert.deepEqual(hundida.apoyo, { altura: 0.2, soporte: 'losa', tipo: 'pieza' });
  assert.ok(cerca(desplazamientoParaApoyar(pieza(0, BLOCK), [LOSA]), 0.2), 'F2.4: subir 0,2 m');
  assert.equal(clasificarColocacion(pieza(0.2, BLOCK), [LOSA]).estado, 'apoyada');
});

test('pieza sobre otra pieza: apoyada; con hueco: flotante; el apoyo es la cara superior más alta', () => {
  const abajo = { id: 7, caja: pieza(0.2, BLOCK) };                      // tope en 0,9
  const encima = pieza(0.9, { ...BLOCK, x: 0.3 });
  const r = clasificarColocacion(encima, [LOSA, abajo]);
  assert.equal(r.estado, 'apoyada');
  assert.equal(r.apoyo.soporte, 7);
  assert.ok(cerca(r.apoyo.altura, 0.9));
  const conHueco = clasificarColocacion(pieza(1.2, { ...BLOCK, x: 0.3 }), [LOSA, abajo]);
  assert.equal(conHueco.estado, 'flotante');
  assert.ok(cerca(conHueco.separacion, 0.3));
  assert.ok(cerca(desplazamientoParaApoyar(pieza(1.2, { ...BLOCK, x: 0.3 }), [LOSA, abajo]), -0.3), 'F2.4: bajar 0,3 m');
});

test('una pieza vecina que solo se toca de lado, o una que está encima, no sirve de apoyo', () => {
  const vecinaAlta = { id: 'muro', caja: pieza(0, { ancho: 1, alto: 2.8, fondo: 0.5, x: 1.0 }) }; // se toca en x = 0,5
  assert.deepEqual(buscarApoyo(pieza(0, BLOCK), [vecinaAlta]), { altura: 0, soporte: null, tipo: 'suelo' });
  const techo = { id: 'arriba', caja: pieza(2, BLOCK) };
  assert.equal(buscarApoyo(pieza(0, BLOCK), [techo]).tipo, 'suelo');
  // Solape en planta por debajo del mínimo (5 mm < 1 cm): no cuenta como apoyo
  const casi = { id: 'casi', caja: pieza(0, { ...BLOCK, x: 0.995 }) };
  assert.equal(buscarApoyo(pieza(0.7, BLOCK), [casi]).tipo, 'suelo');
});

test('piezas giradas e inclinadas usan su extensión real', () => {
  const abajo = { id: 1, caja: pieza(0, BLOCK) }; // tope en 0,7
  // F2.3 · ANTES (F2.1): girada 90° en Y sobre el block → 'apoyada' (solo se miraba la altura de la base).
  //        AHORA: la cara de la pieza girada (0,5 × 1,0) toca 0,5 × 0,5 de un apoyo de 1,0 × 0,5 → contacto 0,50 < 0,60 → 'flotante'.
  const girada = clasificarColocacion(caja({ ...BLOCK, y: 0.7 + 0.35, rotY: Math.PI / 2 }), [abajo]);
  assert.equal(girada.estado, 'flotante');
  assert.deepEqual(girada.avisos, ['flotante']);
  assert.equal(girada.contactoBajo, true);
  assert.ok(cerca(girada.contacto, 0.5, 1e-9), `contacto ${girada.contacto}`);
  assert.ok(cerca(girada.separacion, 0, 1e-9), 'la altura de la base sí es correcta');
  // Variante F2.3: girada 90° sobre un apoyo que la cubre (1,0 × 1,0) → contacto 100 % → 'apoyada'
  const ancho = { id: 2, caja: pieza(0, { ancho: 1, alto: 0.7, fondo: 1 }) };
  const giradaApoyada = clasificarColocacion(caja({ ...BLOCK, y: 0.7 + 0.35, rotY: Math.PI / 2 }), [ancho]);
  assert.equal(giradaApoyada.estado, 'apoyada');
  assert.ok(cerca(giradaApoyada.contacto, 1, 1e-9));
  // Variante F2.3: girada 90° sobre DOS bloques contiguos → suma de contactos 0,5·0,75 = 75 % → 'apoyada'
  const vecino = { id: 3, caja: pieza(0, { ...BLOCK, z: 0.5 }) };
  const sobreDos = clasificarColocacion(caja({ ...BLOCK, y: 0.7 + 0.35, rotY: Math.PI / 2 }), [abajo, vecino]);
  assert.equal(sobreDos.estado, 'apoyada');
  assert.ok(cerca(sobreDos.contacto, 0.75, 1e-9), `contacto ${sobreDos.contacto}`);
  // Tumbada (inclinada 90° en X): su altura es 0,5; con el centro en 0,95 la base queda en 0,7
  const tumbada = caja({ ...BLOCK, y: 0.7 + 0.25, rotX: Math.PI / 2 });
  const r = clasificarColocacion(tumbada, [abajo]);
  assert.equal(r.estado, 'apoyada');
  assert.ok(cerca(limitesCaja(tumbada).min.y, 0.7));
  assert.ok(cerca(r.contacto, 0.5 / 0.7, 1e-9), `tumbada: 1,0 × 0,5 sobre 1,0 × 0,5 con cara de 1,0 × 0,7 → ${r.contacto}`);
});

test('límites de la tolerancia (2 cm): 1,9 cm sigue apoyada y 2,1 cm ya no', () => {
  assert.equal(clasificarColocacion(pieza(0.019, BLOCK)).estado, 'apoyada');
  assert.equal(clasificarColocacion(pieza(0.021, BLOCK)).estado, 'flotante');
  assert.equal(clasificarColocacion(pieza(0.2 - 0.019, BLOCK), [LOSA]).estado, 'apoyada');
  assert.equal(clasificarColocacion(pieza(0.2 - 0.021, BLOCK), [LOSA]).estado, 'hundida');
  assert.equal(clasificarColocacion(pieza(0.05, BLOCK), [], { toleranciaApoyo: 0.1 }).estado, 'apoyada', 'tolerancia configurable');
});

test('superpuesta tiene prioridad y la decide la colisión existente (solapaCon)', () => {
  const r = clasificarColocacion(pieza(1.0, BLOCK), [], { solapaCon: 12 });
  assert.equal(r.estado, 'superpuesta');
  assert.equal(r.solapaCon, 12);
  assert.ok(cerca(r.separacion, 1.0), 'conserva el dato de apoyo para el aviso');
  assert.equal(clasificarColocacion(pieza(0, BLOCK), [], { solapaCon: null }).estado, 'apoyada');
  assert.equal(clasificarColocacion(pieza(0, BLOCK), [], { solapaCon: 0 }).estado, 'superpuesta', 'id 0 es un id válido');
});

test('alturaSuelo configurable (por ejemplo, otra cota del terreno)', () => {
  const r = clasificarColocacion(pieza(-1, BLOCK), [], { alturaSuelo: -1 });
  assert.equal(r.estado, 'apoyada');
  assert.equal(r.apoyo.altura, -1);
});

test('acepta objetos tipo Vector3 de Babylon y no modifica los argumentos', () => {
  class V3 { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } length() { return Math.hypot(this.x, this.y, this.z); } }
  const b = { c: new V3(0, 0.55, 0), u: [new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1)], e: [0.5, 0.35, 0.25] };
  const otras = [LOSA];
  const copia = JSON.stringify({ b, otras });
  assert.equal(clasificarColocacion(b, otras).estado, 'apoyada');
  desplazamientoParaApoyar(b, otras);
  assert.equal(JSON.stringify({ b, otras }), copia);
});

test('constantes congeladas, estados documentados y módulo puro', () => {
  assert.ok(Object.isFrozen(PARAMETROS_MANIPULACION));
  assert.ok(Object.isFrozen(ESTADOS_COLOCACION));
  assert.deepEqual([...ESTADOS_COLOCACION], ['apoyada', 'flotante', 'hundida', 'superpuesta']);
  const src = fs.readFileSync(new URL('../src/scripts/manipulacion.js', import.meta.url), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(src, /^\s*import\s/m);
  assert.doesNotMatch(src, /\b(document|window|fetch|localStorage|require|scene)\b/);
  assert.doesNotMatch(src, /babylon/i);
});

test('compatibilidad con el hitbox real de casa.js: la forma { c, u, e } es la de getBlockHitbox()', () => {
  const casa = fs.readFileSync(new URL('../src/scripts/casa.js', import.meta.url), 'utf8');
  assert.match(casa, /function getBlockHitbox\(node\)/);
  assert.match(casa, /c: Vector3\.TransformCoordinates\(loc\.c, world\),\s*\n\s*u: axes\.map/);
  assert.match(casa, /e: \[loc\.h\[0\] \* scale\[0\], loc\.h\[1\] \* scale\[1\], loc\.h\[2\] \* scale\[2\]\]/);
});

// ─────────────────────────────── F2.3 · Criterio unificado de contacto ───────────────────────────────
const sobre = (dims, apoyoDims = BLOCK, apoyoBase = 0) => {
  const abajo = { id: 'abajo', caja: pieza(apoyoBase, apoyoDims) };
  const top = apoyoBase + (apoyoDims.alto ?? 1);
  return { abajo, pieza: pieza(top, dims) };
};
// Integración numérica INDEPENDIENTE (rejilla de puntos) del área común entre dos cuadrados unitarios (uno girado `ang`)
function areaSolapeNumerica(ang, n = 1500) {
  const c = Math.cos(ang), s = Math.sin(ang);
  let dentro = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = -0.5 + (i + 0.5) / n, z = -0.5 + (j + 0.5) / n;       // punto del cuadrado alineado
    const a = x * c + z * s, b = -x * s + z * c;                      // en ejes del cuadrado girado
    if (Math.abs(a) <= 0.5 && Math.abs(b) <= 0.5) dentro++;
  }
  return dentro / (n * n);
}

test('F2.3 · umbral de contacto: 59 % flotante, 60 % y 61 % apoyada', () => {
  const caso = dx => { const { abajo, pieza: p } = sobre({ ...BLOCK, x: 0 }); return clasificarColocacion(p, [{ ...abajo, caja: pieza(0, { ...BLOCK, x: dx }) }]); };
  const r59 = caso(0.41), r60 = caso(0.40), r61 = caso(0.39);
  assert.ok(cerca(r59.contacto, 0.59, 1e-9) && cerca(r60.contacto, 0.60, 1e-9) && cerca(r61.contacto, 0.61, 1e-9));
  assert.equal(r59.estado, 'flotante'); assert.equal(r59.contactoBajo, true);
  assert.equal(r60.estado, 'apoyada'); assert.equal(r60.contactoBajo, false);
  assert.equal(r61.estado, 'apoyada'); assert.deepEqual(r61.avisos, []);
  assert.equal(PARAMETROS_MANIPULACION.contactoMinimo, 0.60);
});

test('F2.3 · contactoMinimo es configurable por llamada y no altera PARAMETROS_MANIPULACION', () => {
  const { abajo, pieza: p } = sobre({ ...BLOCK, x: 0.3 });      // contacto 70 %
  assert.equal(clasificarColocacion(p, [abajo]).estado, 'apoyada');
  assert.equal(clasificarColocacion(p, [abajo], { contactoMinimo: 0.8 }).estado, 'flotante');
  assert.equal(clasificarColocacion(p, [abajo], { contactoMinimo: 0 }).estado, 'apoyada');
  assert.equal(PARAMETROS_MANIPULACION.contactoMinimo, 0.60);
});

test('F2.3 · suelo y losa dan contacto 100 %; sin apoyo y con hueco el contacto es 0 y no hay zona', () => {
  const suelo = clasificarColocacion(pieza(0, BLOCK));
  assert.equal(suelo.contacto, 1); assert.equal(suelo.estado, 'apoyada');
  assert.deepEqual(suelo.zona, { x0: -0.5, x1: 0.5, z0: -0.25, z1: 0.25 });
  const losa = clasificarColocacion(pieza(0.2, BLOCK), [LOSA]);
  assert.ok(cerca(losa.contacto, 1)); assert.equal(losa.estado, 'apoyada');
  const aire = clasificarColocacion(pieza(1.0, BLOCK));
  assert.deepEqual(aire.avisos, ['flotante']);
  assert.equal(aire.contacto, 0); assert.equal(aire.zona, null); assert.equal(aire.contactoBajo, false);
});

test('F2.3 · pieza sobre pieza: 70 % apoyada y 30 % flotante, con el apoyo y la zona correctos', () => {
  const a = sobre({ ...BLOCK, x: 0.3 });
  const r70 = clasificarColocacion(a.pieza, [a.abajo]);
  assert.ok(cerca(r70.contacto, 0.7, 1e-9)); assert.equal(r70.estado, 'apoyada');
  assert.equal(r70.apoyo.soporte, 'abajo');
  assert.ok(cerca(r70.zona.x0, -0.2) && cerca(r70.zona.x1, 0.5) && cerca(r70.zona.z0, -0.25) && cerca(r70.zona.z1, 0.25));
  const b = sobre({ ...BLOCK, x: 0.7 });
  const r30 = clasificarColocacion(b.pieza, [b.abajo]);
  assert.ok(cerca(r30.contacto, 0.3, 1e-9)); assert.equal(r30.estado, 'flotante');
  assert.equal(r30.contactoBajo, true); assert.deepEqual(r30.avisos, ['flotante']);
  assert.ok(cerca(r30.separacion, 0, 1e-9));
});

test('F2.3 · dos apoyos a la misma altura suman su contacto (30 % + 40 % = 70 %), acotado a 100 %', () => {
  const pz = pieza(0.7, BLOCK);
  const A = { id: 'A', caja: pieza(0, { ...BLOCK, x: -0.7 }) };   // cubre x ∈ [-1,2 ; -0,2] → 0,3
  const B = { id: 'B', caja: pieza(0, { ...BLOCK, x: 0.6 }) };    // cubre x ∈ [0,1 ; 1,1]   → 0,4
  assert.ok(cerca(clasificarColocacion(pz, [A]).contacto, 0.3, 1e-9));
  assert.equal(clasificarColocacion(pz, [A]).estado, 'flotante');
  const ambos = clasificarColocacion(pz, [A, B]);
  assert.ok(cerca(ambos.contacto, 0.7, 1e-9)); assert.equal(ambos.estado, 'apoyada');
  // Dos apoyos que se solapan entre sí: la suma se acota a 1
  const C = { id: 'C', caja: pieza(0, BLOCK) }, D = { id: 'D', caja: pieza(0, BLOCK) };
  assert.equal(clasificarColocacion(pz, [C, D]).contacto, 1);
});

test('F2.3 · pieza girada: el contacto es el área EXACTA, no la de las cajas envolventes', () => {
  const unidad = { ancho: 1, alto: 1, fondo: 1 };
  for (const grados of [45, 30, 10]) {
    const ang = grados * Math.PI / 180;
    const abajo = { id: 'u', caja: pieza(0, unidad) };
    const r = clasificarColocacion(caja({ ...unidad, y: 1.5, rotY: ang }), [abajo]);
    const esperado = areaSolapeNumerica(ang);
    assert.ok(Math.abs(r.contacto - esperado) < 2e-3, `${grados}°: ${r.contacto} vs ${esperado}`);
  }
  // 45°: octógono regular de área 2(√2 − 1) ≈ 0,8284 (con cajas envolventes se obtendría 1 sobre la pieza girada)
  const r45 = clasificarColocacion(caja({ ...unidad, y: 1.5, rotY: Math.PI / 4 }), [{ id: 'u', caja: pieza(0, unidad) }]);
  assert.ok(cerca(r45.contacto, 2 * (Math.SQRT2 - 1), 1e-9));
  assert.equal(r45.estado, 'apoyada');
  // C-2: `zona` es el RECTÁNGULO que envuelve el contacto (solo para dibujar); su área supera al contacto exacto
  const areaZona = (r45.zona.x1 - r45.zona.x0) * (r45.zona.z1 - r45.zona.z0);
  assert.ok(areaZona > r45.contacto + 1e-6, 'zona es una aproximación rectangular, no el área de clasificación');
});

test('F2.3 · pieza inclinada: con una cara dentro de la tolerancia hay contacto; apoyada solo por una arista, 0 % → flotante', () => {
  const casiPlana = caja({ ...BLOCK, rotX: 1 * Math.PI / 180 });             // 1°: la elevación del fondo (0,5 m) es < 2 cm
  const yMin = c => limitesCaja(c).min.y;
  const baja = { ...casiPlana, c: { ...casiPlana.c, y: casiPlana.c.y - yMin(casiPlana) } };
  const rPlana = clasificarColocacion(baja, []);
  assert.equal(rPlana.estado, 'apoyada'); assert.equal(rPlana.contacto, 1);
  const inclinada = caja({ ...BLOCK, rotX: Math.PI / 6 });                    // 30°: solo una arista toca el suelo
  const apoyadaArista = { ...inclinada, c: { ...inclinada.c, y: inclinada.c.y - yMin(inclinada) } };
  const rArista = clasificarColocacion(apoyadaArista, []);
  assert.ok(cerca(rArista.separacion, 0, 1e-9));
  assert.equal(rArista.contacto, 0); assert.equal(rArista.contactoBajo, true);
  assert.equal(rArista.estado, 'flotante'); assert.deepEqual(rArista.avisos, ['flotante']);
});

test('F2.3 · `penetra: true` excluye la pieza como apoyo (superpuesta, no hundida); sin la marca se comporta como en F2.1', () => {
  const abajo = { id: 9, caja: pieza(0, BLOCK) };                              // tope 0,7
  const metida = pieza(0.6, BLOCK);                                            // base 0,6: 10 cm dentro
  const sinMarca = clasificarColocacion(metida, [abajo], { solapaCon: 9 });
  assert.deepEqual(sinMarca.avisos, ['superpuesta', 'hundida']);
  assert.equal(sinMarca.apoyo.soporte, 9);
  const conMarca = clasificarColocacion(metida, [{ ...abajo, penetra: true }], { solapaCon: 9 });
  assert.equal(conMarca.estado, 'superpuesta');
  assert.deepEqual(conMarca.avisos, ['superpuesta', 'flotante'], 'sin la pieza que penetra, su apoyo es el suelo y la base está a 0,6 m');
  assert.equal(conMarca.apoyo.tipo, 'suelo'); assert.equal(conMarca.solapaCon, 9);
  // Una pieza que penetra NO se clasifica como apoyada sobre ella
  const sobrePenetrante = clasificarColocacion(pieza(0.7, BLOCK), [{ ...abajo, penetra: true }]);
  assert.equal(sobrePenetrante.apoyo.tipo, 'suelo');
  assert.notEqual(sobrePenetrante.estado, 'apoyada');
  // buscarApoyo conserva su contrato de F2.1: no mira `penetra`
  assert.equal(buscarApoyo(pieza(0.7, BLOCK), [{ ...abajo, penetra: true }]).soporte, 9);
});

test('F2.3 · avisos simultáneos en orden fijo superpuesta → hundida → flotante; estado = primer aviso (C-1)', () => {
  assert.deepEqual([...ORDEN_AVISOS], ['superpuesta', 'hundida', 'flotante']);
  assert.ok(Object.isFrozen(ORDEN_AVISOS));
  const rSF = clasificarColocacion(pieza(1.0, BLOCK), [], { solapaCon: 5 });
  assert.deepEqual(rSF.avisos, ['superpuesta', 'flotante']); assert.equal(rSF.estado, 'superpuesta');
  const rSH = clasificarColocacion(pieza(0, BLOCK), [LOSA], { solapaCon: 5 });
  assert.deepEqual(rSH.avisos, ['superpuesta', 'hundida']);
  // C-1: con UN solo aviso, estado coincide con el de F2.1; sin avisos, 'apoyada'
  const unico = {
    superpuesta: clasificarColocacion(pieza(0, BLOCK), [], { solapaCon: 5 }),
    hundida: clasificarColocacion(pieza(0, BLOCK), [LOSA]),
    flotante: clasificarColocacion(pieza(1.0, BLOCK)),
  };
  for (const [estado, r] of Object.entries(unico)) { assert.deepEqual(r.avisos, [estado]); assert.equal(r.estado, estado); }
  const ok = clasificarColocacion(pieza(0, BLOCK));
  assert.deepEqual(ok.avisos, []); assert.equal(ok.estado, 'apoyada');
  for (const r of [...Object.values(unico), ok]) assert.ok(ESTADOS_COLOCACION.includes(r.estado));
});

test('F2.3 · «hundida» informa el contacto geométrico sin cambiar el estado', () => {
  const r = clasificarColocacion(pieza(0, BLOCK), [LOSA]);
  assert.equal(r.estado, 'hundida'); assert.equal(r.contactoBajo, false);
  assert.ok(cerca(r.contacto, 1));
});

test('F2.3 · D-2: una pieza girada no se apoya en otra que solo toca su caja envolvente (esquina)', () => {
  const unidad = { ancho: 1, alto: 1, fondo: 1 };
  const girada = caja({ ...unidad, y: 0.7 + 0.5, rotY: Math.PI / 4 });         // rombo de semidiagonal 0,707
  const lejos = { id: 'lejos', caja: pieza(0, { ancho: 0.4, alto: 0.7, fondo: 0.4, x: 0.62, z: 0.62 }) };
  const cerca1 = { id: 'cerca', caja: pieza(0, { ancho: 0.4, alto: 0.7, fondo: 0.4, x: 0.4, z: 0.4 }) };
  assert.ok(solapePlanta(girada, lejos.caja).x > PARAMETROS_MANIPULACION.solapeMinimoPlanta, 'las cajas envolventes sí se solapan');
  assert.equal(buscarApoyo(girada, [lejos]).tipo, 'suelo', 'pero las piezas no se tocan');
  assert.equal(buscarApoyo(girada, [cerca1]).soporte, 'cerca');
  // Piezas alineadas con los ejes: el resultado es el de F2.1
  assert.equal(buscarApoyo(pieza(0.7, BLOCK), [{ id: 'a', caja: pieza(0, BLOCK) }]).soporte, 'a');
});

test('F2.3 · geometría: área, intersección de polígonos convexos y cara horizontal', () => {
  const cuadro = (x, z, l) => [{ x: x - l / 2, z: z - l / 2 }, { x: x + l / 2, z: z - l / 2 }, { x: x + l / 2, z: z + l / 2 }, { x: x - l / 2, z: z + l / 2 }];
  assert.ok(cerca(areaPoligono(cuadro(0, 0, 2)), 4));
  assert.ok(cerca(areaPoligono(interseccionPoligonos(cuadro(0, 0, 2), cuadro(1, 1, 2))), 1));
  assert.deepEqual(interseccionPoligonos(cuadro(0, 0, 1), cuadro(3, 0, 1)), []);
  assert.deepEqual(interseccionPoligonos([], cuadro(0, 0, 1)), []);
  const cara = caraHorizontal(pieza(0, BLOCK), 'inferior');
  assert.ok(cerca(areaPoligono(cara), 0.5));
  assert.throws(() => caraHorizontal(pieza(0, BLOCK), 'lateral'), TypeError);
  assert.throws(() => caraHorizontal(null, 'inferior'), TypeError);
});

test('F2.3 · el 60 % se define en un solo lugar y UMBRALES_AVISO_COLOCACION ya no existe', () => {
  assert.equal('UMBRALES_AVISO_COLOCACION' in manipulacion, false);
  const lee = f => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
  const casa = lee('../src/scripts/casa.js');
  assert.doesNotMatch(casa, /UMBRALES_AVISO_COLOCACION/);
  assert.doesNotMatch(casa, /contacto\w*\s*[<>]=?\s*0?\.6\b/i, 'casa.js no repite el umbral');
  assert.match(lee('../src/scripts/manipulacion.js'), /contactoMinimo:\s*0\.60/);
});

test('F2.3 · los argumentos de clasificarColocacion no se modifican (incluida la marca penetra)', () => {
  const a = sobre({ ...BLOCK, x: 0.3 });
  const otras = [a.abajo, { ...LOSA, penetra: true }];
  const copia = JSON.stringify({ p: a.pieza, otras });
  clasificarColocacion(a.pieza, otras, { solapaCon: 'x' });
  assert.equal(JSON.stringify({ p: a.pieza, otras }), copia);
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// F2.4a · desplazamientoParaApoyar con guardas (contrato: número | null; nunca 0, -0 ni undefined)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const CUBO = { ancho: 0.2, alto: 0.2, fondo: 0.2 };             // convención de las pruebas V: cubos de 20 × 20 × 20 cm
const esNumeroValido = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) > 1e-6 && !Object.is(v, -0);

// Vecino de un block en y = 0 con solape lateral `s` (m) en X: ocupa [1 − s − 0,5 … 1 − s + 0,5] y el block [−0,5 … 0,5].
const vecinoLateral = (s, extra = {}) => ({ id: 'vecino', caja: pieza(0, { ...BLOCK, x: 1 - s }), ...extra });

test('F2.4a · L1–L5: contacto lateral nunca produce un desplazamiento (null)', () => {
  const pz = pieza(0, BLOCK);
  // L1 · 0,5 cm < solapeMinimoPlanta: ni siquiera es apoyo → suelo, apoyada
  const l1 = clasificarColocacion(pz, [vecinoLateral(0.005)]);
  assert.equal(l1.estado, 'apoyada');
  assert.equal(l1.apoyo.tipo, 'suelo');
  assert.equal(desplazamientoParaApoyar(pz, [vecinoLateral(0.005)]), null);
  // L2–L4 · 1,5 / 2,0 / 2,9 cm.
  //   ANTES (F2.3 y F2.4a): buscarApoyo aceptaba como apoyo cualquier vecino con solape en planta ≥ 1 cm, sin comprobar
  //     contacto → clasificarColocacion daba 'hundida' (falso, −0,7 m) con apoyo = el vecino.
  //   AHORA (F2.4b): un vecino cuya cara superior queda por encima de base + tolerancia solo es apoyo con contacto ≥ 60 %;
  //     el contacto lateral (1,5–2,9 %) no lo es → apoyo = suelo → 'apoyada' (contacto 100 % con el suelo).
  //   desplazamientoParaApoyar: null antes y después (primero por las guardas de F2.4a, ahora además porque no hay nada que mover).
  for (const s of [0.015, 0.02, 0.029]) {
    const r = clasificarColocacion(pz, [vecinoLateral(s)]);
    assert.equal(r.estado, 'apoyada', `solape ${s}: F2.4b corrige la limitación de F2.3`);
    assert.deepEqual(r.avisos, []);
    assert.deepEqual(r.apoyo, { altura: 0, soporte: null, tipo: 'suelo' });
    assert.equal(desplazamientoParaApoyar(pz, [vecinoLateral(s)]), null, `solape ${s}`);
  }
  // L5 · 4,0 cm: la colisión de casa.js lo marca penetrante y solapaCon; clasificarColocacion no lo toma como apoyo
  const vecino4 = vecinoLateral(0.04, { penetra: true });
  const l5 = clasificarColocacion(pz, [vecino4], { solapaCon: 'vecino' });
  assert.equal(l5.estado, 'superpuesta');
  assert.deepEqual(l5.avisos, ['superpuesta']);
  assert.equal(desplazamientoParaApoyar(pz, [vecino4]), null);
  assert.equal(desplazamientoParaApoyar(pz, [vecinoLateral(0.04)]), null, 'también sin la marca penetra (contacto 4 %)');
});

// Cubo de 20 cm 1,5 cm por encima de un apoyo de 20 cm con solape `s` en X (contacto = s / 0,2). Construcción de V y G4:
// con la pieza en reposo exacto Δ = 0 y la normalización |Δ| ≤ 1e-6 devolvería null; a 1,5 cm sigue 'apoyada' (≤ 2 cm de
// tolerancia) y hay un desplazamiento real de −1,5 cm.
function cuboSobreApoyo(s, hueco = 0.015) {
  const apoyo = { id: 'apoyo', caja: pieza(0, { ...CUBO, x: 0.2 - s }) };   // tope en 0,2
  return { pz: pieza(0.2 + hueco, CUBO), otras: [apoyo] };
}

test('F2.4a · V1–V6: el apoyo vertical cruza el 60 % de contacto', () => {
  const filas = [
    // [solape cm, contacto, estado, ¿número?]
    [10, 0.50, 'flotante', false], [11, 0.55, 'flotante', false],
    [12, 0.60, 'apoyada', true], [13, 0.65, 'apoyada', true], [16, 0.80, 'apoyada', true], [20, 1.00, 'apoyada', true],
  ];
  for (const [cm, contacto, estado, numero] of filas) {
    const { pz, otras } = cuboSobreApoyo(cm / 100);
    const r = clasificarColocacion(pz, otras);
    assert.ok(cerca(r.contacto, contacto, 1e-9), `${cm} cm: contacto ${r.contacto}`);
    assert.equal(r.estado, estado, `${cm} cm`);
    const d = desplazamientoParaApoyar(pz, otras);
    if (numero) { assert.ok(esNumeroValido(d), `${cm} cm: ${d}`); assert.ok(cerca(d, -0.015, 1e-9), `${cm} cm: Δ ${d}`); }
    else assert.equal(d, null, `${cm} cm`);
  }
});

test('F2.4a · P1, P2a, P2b: penetración (la marca la pone la colisión de casa.js; aquí es un dato de entrada)', () => {
  const pz = pieza(0, BLOCK);
  // P1 · block penetrando 4 cm
  const p1 = clasificarColocacion(pz, [vecinoLateral(0.04, { penetra: true })], { solapaCon: 'vecino' });
  assert.equal(p1.estado, 'superpuesta');
  assert.equal(desplazamientoParaApoyar(pz, [vecinoLateral(0.04, { penetra: true })]), null);
  // P2a · penetra:true en la entrada → null, aunque el contacto geométrico sea del 100 %
  assert.ok(cerca(desplazamientoParaApoyar(pz, [LOSA]), 0.2), 'sin la marca: sube a la losa');
  assert.equal(desplazamientoParaApoyar(pz, [{ ...LOSA, penetra: true }]), null);
  // P2b · penetra:false con 4 cm e intersección: el estado lo decide solapaCon
  const p2b = clasificarColocacion(pz, [vecinoLateral(0.04, { penetra: false })], { solapaCon: 'vecino' });
  assert.equal(p2b.estado, 'superpuesta');
  // P2c (3 cm exactos) no tiene prueba automatizada: ver docs/F2.4a_cierre.md §9 (es una regla de casa.js, `>` estricto).
});

test('F2.4a · G1–G6: guardas', () => {
  // G1 · penetra:true en el apoyo elegido
  assert.equal(desplazamientoParaApoyar(pieza(0.5, BLOCK), [{ ...LOSA, penetra: true }]), null);
  // G2 · solape < 1 cm: el vecino no es apoyo; la pieza en reposo sobre el suelo no tiene nada que mover
  assert.equal(desplazamientoParaApoyar(pieza(0, BLOCK), [vecinoLateral(0.005)]), null);
  // G3 · base a la misma altura que el tope del vecino (solo se tocan de lado, 2 cm de solape en planta)
  const vecino = { id: 'v', caja: pieza(0, { ...BLOCK, x: 1 - 0.02 }) };         // tope en 0,7
  assert.equal(desplazamientoParaApoyar(pieza(0.7, BLOCK), [vecino]), null);
  // G4 · el desplazamiento dejaría contacto < 60 % (cubo 5 cm en el aire sobre un apoyo con 50 %)
  const g4 = cuboSobreApoyo(0.10, 0.05);
  assert.equal(clasificarColocacion(g4.pz, g4.otras).estado, 'flotante');
  assert.equal(desplazamientoParaApoyar(g4.pz, g4.otras), null);
  // G5 · sin candidatos y en reposo → null (nada que mover)
  assert.equal(desplazamientoParaApoyar(pieza(0, BLOCK), []), null);
  assert.equal(desplazamientoParaApoyar(pieza(0, BLOCK)), null);
  // G6 · en el aire a 5 cm, suelo debajo → número (baja 5 cm)
  const g6 = desplazamientoParaApoyar(pieza(0.05, BLOCK), []);
  assert.ok(esNumeroValido(g6)); assert.ok(cerca(g6, -0.05, 1e-9));
});

test('F2.4a · C1b: subir solo con contacto suficiente; bajar y suelo no necesitan contacto', () => {
  // Hundida 0,2 en la losa (contacto 100 %) → sube 0,2 (prueba 5 original)
  assert.ok(cerca(desplazamientoParaApoyar(pieza(0, BLOCK), [LOSA]), 0.2));
  // Hundida sobre un bloque que solo la cubre al 40 % → no sube (null)
  const parcial = { id: 'p', caja: pieza(0, { ...BLOCK, x: 0.6 }) };            // solape 0,4 de 1,0 → 40 %
  assert.equal(desplazamientoParaApoyar(pieza(0, BLOCK), [parcial]), null);
  // Con el 70 % sí sube (hasta el tope del bloque)
  const casi = { id: 'c', caja: pieza(0, { ...BLOCK, x: 0.3 }) };               // solape 0,7 → 70 %
  assert.ok(cerca(desplazamientoParaApoyar(pieza(0, BLOCK), [casi]), 0.7));
  // Suelo a otra cota: pieza por debajo del terreno sube a él (contacto del suelo = 100 %)
  assert.ok(cerca(desplazamientoParaApoyar(pieza(-0.5, BLOCK), []), 0.5));
});

test('F2.4a · contrato: número válido o null; nunca 0, -0, NaN ni undefined; argumentos intactos', () => {
  const casos = [];
  for (const base of [-0.3, -0.02, 0, 0.0000005, 0.005, 0.019, 0.021, 0.2, 0.215, 0.7, 0.9, 1.5]) {
    for (const x of [0, 0.3, 0.6, 0.95, 1.2]) {
      casos.push([pieza(base, BLOCK), [LOSA, { id: 1, caja: pieza(0.2, { ...BLOCK, x }) }, { id: 2, caja: pieza(0, { ...BLOCK, x: -x }), penetra: x > 0.9 }]]);
    }
  }
  for (const [pz, otras] of casos) {
    const copia = JSON.stringify({ pz, otras });
    const d = desplazamientoParaApoyar(pz, otras);
    assert.ok(d === null || esNumeroValido(d), `devolvió ${String(d)}`);
    assert.equal(JSON.stringify({ pz, otras }), copia, 'no muta los argumentos');
  }
  assert.equal(desplazamientoParaApoyar(pieza(0, BLOCK), [LOSA, { id: 3, caja: pieza(0.2, BLOCK) }].slice(0, 1).map(o => ({ ...o, caja: caja({ y: -0.1, ancho: 20, alto: 0.2, fondo: 20 }) }))), null, 'apoyo justo bajo la base (tope 0): en reposo → null, no -0');
});

test('F2.4a · X1: PARAMETROS_MANIPULACION sin cambios', () => {
  assert.deepEqual({ ...PARAMETROS_MANIPULACION }, { toleranciaApoyo: 0.02, solapeMinimoPlanta: 0.01, alturaSuelo: 0, contactoMinimo: 0.60 });
  assert.ok(Object.isFrozen(PARAMETROS_MANIPULACION));
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// F2.4b · buscarApoyo acepta un candidato solo con tope dentro de tolerancia o con contacto suficiente
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ARR = { ancho: 1, alto: 0.5, fondo: 0.5 };
const estrecho = (id, x) => ({ id, caja: pieza(0, { ancho: 0.35, alto: 0.3, fondo: 0.5, x }) });   // tope en 0,3; 35 % de la cara

test('F2.4b · dos apoyos reales que suman ≥ 60 % cuentan; los que suman menos no', () => {
  // 35 % + 35 % = 70 %: la pieza está hundida en ellos (base 0, tope 0,3) y el apoyo es uno de los dos
  const dos = clasificarColocacion(pieza(0, ARR), [estrecho('p1', -0.325), estrecho('p2', 0.325)]);
  assert.equal(dos.estado, 'hundida');
  assert.equal(dos.apoyo.tipo, 'pieza');
  assert.ok(cerca(dos.contacto, 0.7, 1e-9), `contacto ${dos.contacto}`);
  // 25 % + 25 % = 50 %: no llegan al 60 % → no son apoyo → suelo (antes: 'hundida' sobre p1)
  const estrecho25 = (id, x) => ({ id, caja: pieza(0, { ancho: 0.25, alto: 0.3, fondo: 0.5, x }) });
  const pocos = clasificarColocacion(pieza(0, ARR), [estrecho25('p1', -0.375), estrecho25('p2', 0.375)]);
  assert.equal(pocos.estado, 'apoyada');
  assert.deepEqual(pocos.apoyo, { altura: 0, soporte: null, tipo: 'suelo' });
});

test('F2.4b · hundida con contacto suficiente sigue siendo hundida (losa 100 %, apoyo parcial 70 %)', () => {
  const r = clasificarColocacion(pieza(0.12, BLOCK), [LOSA]);
  assert.equal(r.estado, 'hundida');
  assert.deepEqual(r.apoyo, { altura: 0.2, soporte: 'losa', tipo: 'pieza' });
  assert.ok(cerca(r.contacto, 1, 1e-9));
  const parcial70 = { id: 'b', caja: pieza(0, { ...BLOCK, x: 0.3 }) };            // solape 0,7 de 1,0
  const p = clasificarColocacion(pieza(0, BLOCK), [parcial70]);
  assert.equal(p.estado, 'hundida');
  assert.equal(p.apoyo.soporte, 'b');
  assert.ok(cerca(desplazamientoParaApoyar(pieza(0, BLOCK), [parcial70]), 0.7));
  // y con el 40 % ya no es apoyo: queda en el suelo, apoyada
  const parcial40 = { id: 'c', caja: pieza(0, { ...BLOCK, x: 0.6 }) };
  const q = clasificarColocacion(pieza(0, BLOCK), [parcial40]);
  assert.equal(q.estado, 'apoyada');
  assert.equal(q.apoyo.tipo, 'suelo');
});

test('F2.4b · un candidato con penetra:true no cuenta como apoyo en clasificarColocacion', () => {
  // La losa penetrante no es soporte: la pieza queda apoyada en el suelo, sin «hundida» respecto a ella
  const r = clasificarColocacion(pieza(0, BLOCK), [{ ...LOSA, penetra: true }]);
  assert.equal(r.estado, 'apoyada');
  assert.deepEqual(r.apoyo, { altura: 0, soporte: null, tipo: 'suelo' });
  // buscarApoyo no mira penetra (contrato de F2.3, sin cambios): con contacto suficiente sigue eligiendo la losa
  assert.equal(buscarApoyo(pieza(0, BLOCK), [{ ...LOSA, penetra: true }]).soporte, 'losa');
});

test('F2.4b · a igual tope gana el primero de `otras`, y el más alto aceptado gana al más bajo', () => {
  const a = { id: 'a', caja: pieza(0, { ...BLOCK, x: 0 }) };       // tope 0,7
  const b = { id: 'b', caja: pieza(0, { ...BLOCK, x: 0.1 }) };     // tope 0,7 (mismo)
  assert.equal(buscarApoyo(pieza(0.7, BLOCK), [a, b]).soporte, 'a');
  assert.equal(buscarApoyo(pieza(0.7, BLOCK), [b, a]).soporte, 'b');
  // El más alto aceptado: la losa (0,2) y un block encima de ella (tope 0,9) bajo una pieza de base 0,9
  const arriba = { id: 'arriba', caja: pieza(0.2, BLOCK) };
  assert.equal(buscarApoyo(pieza(0.9, BLOCK), [LOSA, arriba]).soporte, 'arriba');
  // Si el más alto no se acepta por contacto bajo, se cae al siguiente aceptable (aquí la losa, a 100 %)
  const estrechoAlto = { id: 'poste', caja: pieza(0, { ancho: 0.1, alto: 1.0, fondo: 0.1, x: 0.45 }) };  // tope 1,0, 10 % de la cara
  const r = clasificarColocacion(pieza(0.2, BLOCK), [LOSA, estrechoAlto]);
  assert.equal(r.apoyo.soporte, 'losa');
  assert.equal(r.estado, 'apoyada');
});

test('F2.4b · pieza inclinada: la cara inferior sin área no exige contacto (se conserva el comportamiento de F2.3)', () => {
  const rot = 0.35, mitad = 0.35 * Math.cos(rot) + 0.25 * Math.sin(rot);        // medio alto de la caja inclinada 20° en X
  // Inclinada hundida en la losa (la cara inferior es una arista: área 0). F2.3: 'hundida'. F2.4b con la regla literal habría
  // dado 'flotante' sobre el suelo; la excepción para caras sin área conserva 'hundida' (D2 opción B).
  for (const hundimiento of [0.08, 0.15]) {
    const r = clasificarColocacion(caja({ ...BLOCK, y: 0.2 - hundimiento + mitad, rotX: rot }), [LOSA]);
    assert.equal(r.estado, 'hundida', `hundida ${hundimiento} m`);
    assert.equal(r.apoyo.soporte, 'losa');
  }
  // Limitación que SE MANTIENE (F2.3 y F2.4b): inclinada con una arista justo en el tope del apoyo → contacto 0 → 'flotante'
  const abajo = { id: 1, caja: pieza(0, BLOCK) };
  const arista = clasificarColocacion(caja({ ...BLOCK, y: 0.7 + mitad, rotX: rot }), [abajo]);
  assert.equal(arista.estado, 'flotante');
  assert.equal(arista.apoyo.soporte, 1);
  assert.equal(arista.contacto, 0);
});

test('F2.4b · rendimiento: buscarApoyo con 100 piezas (50 alineadas + 50 giradas 45°) tarda < 5 ms por llamada', () => {
  let semilla = 777; const rnd = () => (semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const piezas = Array.from({ length: 100 }, (_, i) => ({
    id: i, caja: caja({ ...BLOCK, x: (rnd() - 0.5) * 8, z: (rnd() - 0.5) * 8, y: [0, 0.7, 1.4][Math.floor(rnd() * 3)] + 0.35, rotY: i < 50 ? 0 : 0.7854 }),
  }));
  const ronda = () => { for (const q of piezas) buscarApoyo(q.caja, piezas.filter(o => o.id !== q.id)); };
  ronda(); ronda();                                                  // calentamiento
  const medias = [];
  for (let k = 0; k < 5; k++) { const t0 = process.hrtime.bigint(); for (let r = 0; r < 5; r++) ronda(); medias.push(Number(process.hrtime.bigint() - t0) / 1e6 / (5 * 100)); }
  medias.sort((a, b) => a - b);
  assert.ok(medias[2] < 5, `mediana ${medias[2].toFixed(4)} ms por llamada (límite 5 ms)`);
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// F2.4b · Regresión «pieza a 5 m»: buscarApoyo no tiene límite inferior; las guardas de F2.4a filtran los desplazamientos
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// POR QUÉ: la condición 1 de buscarApoyo acepta cualquier candidato con tope ≤ base + toleranciaApoyo, esté a 1 cm o a 50 m por
// debajo: buscarApoyo responde «¿qué hay debajo de mí?» y clasificarColocacion decide apoyada/flotante por la separación.
// Con un límite inferior, una pieza a 5 m sobre una pieza con tope a 2 m perdería esa pieza como apoyo y desplazamientoParaApoyar
// la bajaría 5 m hasta el suelo ATRAVESÁNDOLA. Sin límite inferior el apoyo es la pieza (−3 m) y, si el contacto con ella es
// insuficiente (1 cm o 50 % de solape), la guarda C4 de F2.4a devuelve null: no se propone ningún desplazamiento.
// Limitar la distancia máxima de caída (si se quiere) es decisión de la interfaz del «Apoyar» (F2.4c), no de buscarApoyo.
// La pieza de apoyo es una caja de 1,0 × 2,0 × 0,5 m (tope a 2 m); la pieza que cae es un block (1,0 × 0,7 × 0,5) con la base a 5 m.
const POSTE_2M = { ancho: 1, alto: 2, fondo: 0.5 };
const apoyoA2m = (x = 0, id = 'a2m') => ({ id, caja: pieza(0, { ...POSTE_2M, x }) });

test('F2.4b · pieza a 5 m sobre suelo desnudo: flotante y desplazamientoParaApoyar = −5', () => {
  const pz = pieza(5, BLOCK);
  const r = clasificarColocacion(pz, []);
  assert.equal(r.estado, 'flotante');
  assert.deepEqual(r.apoyo, { altura: 0, soporte: null, tipo: 'suelo' });
  assert.ok(cerca(r.separacion, 5, 1e-9));
  const d = desplazamientoParaApoyar(pz, []);
  assert.ok(esNumeroValido(d)); assert.ok(cerca(d, -5, 1e-9), `Δ ${d}`);
});

test('F2.4b · pieza a 5 m sobre una pieza con tope a 2 m (solape 100 %): flotante y desplazamientoParaApoyar = −3', () => {
  const pz = pieza(5, BLOCK);
  const r = clasificarColocacion(pz, [apoyoA2m()]);
  assert.equal(r.estado, 'flotante');
  assert.deepEqual(r.apoyo, { altura: 2, soporte: 'a2m', tipo: 'pieza' }, 'el apoyo es la pieza, no el suelo');
  assert.ok(cerca(r.separacion, 3, 1e-9));
  const d = desplazamientoParaApoyar(pz, [apoyoA2m()]);
  assert.ok(esNumeroValido(d)); assert.ok(cerca(d, -3, 1e-9), `Δ ${d} (no −5: no atraviesa la pieza)`);
});

test('F2.4b · pieza a 5 m sobre una pieza con tope a 2 m (solape 1 cm): flotante y desplazamientoParaApoyar = null (guarda C4)', () => {
  const pz = pieza(5, BLOCK);
  const otras = [apoyoA2m(1 - 0.01, 'borde')];                       // solape de 1 cm en X
  const r = clasificarColocacion(pz, otras);
  assert.equal(r.estado, 'flotante');
  assert.equal(r.apoyo.soporte, 'borde', 'sigue siendo el apoyo: la condición 1 no tiene límite inferior');
  assert.equal(desplazamientoParaApoyar(pz, otras), null, 'contacto resultante < 60 %');
});

test('F2.4b · pieza a 5 m sobre una pieza con tope a 2 m (solape 50 %): flotante y desplazamientoParaApoyar = null (guarda C4)', () => {
  const pz = pieza(5, BLOCK);
  const otras = [apoyoA2m(0.5, 'mitad')];                            // solape de 0,5 m de 1,0 m
  const r = clasificarColocacion(pz, otras);
  assert.equal(r.estado, 'flotante');
  assert.equal(r.apoyo.soporte, 'mitad');
  assert.equal(desplazamientoParaApoyar(pz, otras), null, 'contacto resultante 50 % < 60 %');
});
