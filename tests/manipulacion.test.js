// tests/manipulacion.test.js
// F2.1 · Funciones puras de apoyo y clasificación (src/scripts/manipulacion.js).
//   node --test tests/manipulacion.test.js
// Sin DOM, sin Babylon.js, sin servidor ni base de datos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PARAMETROS_MANIPULACION, ESTADOS_COLOCACION, cajaValida, extensionMundo, limitesCaja, solapePlanta,
  buscarApoyo, clasificarColocacion, desplazamientoParaApoyar,
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
  // Girada 90° en Y sobre el block: sigue apoyada (base 0,7)
  assert.equal(clasificarColocacion(caja({ ...BLOCK, y: 0.7 + 0.35, rotY: Math.PI / 2 }), [abajo]).estado, 'apoyada');
  // Tumbada (inclinada 90° en X): su altura es 0,5; con el centro en 0,95 la base queda en 0,7
  const tumbada = caja({ ...BLOCK, y: 0.7 + 0.25, rotX: Math.PI / 2 });
  const r = clasificarColocacion(tumbada, [abajo]);
  assert.equal(r.estado, 'apoyada');
  assert.ok(cerca(limitesCaja(tumbada).min.y, 0.7));
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
