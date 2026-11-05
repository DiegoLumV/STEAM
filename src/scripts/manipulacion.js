// src/scripts/manipulacion.js
// F2.1 · Funciones PURAS de apoyo y clasificación de la colocación de una pieza.
// No usan el DOM, Babylon.js ni estado global: reciben números y devuelven números/objetos nuevos,
// así que se prueban en Node (tests/manipulacion.test.js). No modifican sus argumentos.
//
// Formato de una «caja» (el mismo que devuelve getBlockHitbox() en casa.js, líneas 443-479):
//   { c: {x,y,z},                 centro en el mundo
//     u: [{x,y,z}, {x,y,z}, {x,y,z}], ejes locales unitarios en el mundo (x, y, z de la pieza)
//     e: [ex, ey, ez] }           semimedidas a lo largo de cada eje local
// Se aceptan objetos Vector3 de Babylon tal cual (solo se leen sus propiedades x, y, z).
//
// La SUPERPOSICIÓN entre piezas no se recalcula aquí: la decide la colisión existente de casa.js
// (findBlockCollision / obbPenetration) y llega como dato (`solapaCon`). Así no hay un sistema paralelo.
//
// Los parámetros son del simulador (tolerancias de manipulación), no datos de la base documental.

export const PARAMETROS_MANIPULACION = Object.freeze({
  toleranciaApoyo: 0.02,    // m: separación o penetración vertical que todavía se considera «apoyada»
  solapeMinimoPlanta: 0.01, // m: solape mínimo en planta (X y Z) para que una caja pueda servir de apoyo
  alturaSuelo: 0,           // m: nivel del terreno (MIN_Y en casa.js)
});

export const ESTADOS_COLOCACION = Object.freeze(['apoyada', 'flotante', 'hundida', 'superpuesta']);

const finito = n => typeof n === 'number' && Number.isFinite(n);
const vecValido = v => !!v && finito(v.x) && finito(v.y) && finito(v.z);

/** true si `caja` tiene el formato esperado y solo números finitos (semimedidas ≥ 0). */
export function cajaValida(caja) {
  return !!caja && vecValido(caja.c) &&
    Array.isArray(caja.u) && caja.u.length === 3 && caja.u.every(vecValido) &&
    Array.isArray(caja.e) && caja.e.length === 3 && caja.e.every(n => finito(n) && n >= 0);
}

function exigirCaja(caja, nombre = 'caja') {
  if (!cajaValida(caja)) throw new TypeError(`${nombre}: se esperaba { c, u: [3 ejes], e: [3 semimedidas] } con números finitos`);
}

/** Semiextensión de la caja a lo largo de los ejes del mundo (proyección de la caja orientada). */
export function extensionMundo(caja) {
  exigirCaja(caja);
  const ext = eje => caja.u.reduce((s, u, i) => s + caja.e[i] * Math.abs(u[eje]), 0);
  return { x: ext('x'), y: ext('y'), z: ext('z') };
}

/** Caja alineada a los ejes del mundo que contiene a la caja orientada: { min, max }. */
export function limitesCaja(caja) {
  const h = extensionMundo(caja);
  const { x, y, z } = caja.c;
  return { min: { x: x - h.x, y: y - h.y, z: z - h.z }, max: { x: x + h.x, y: y + h.y, z: z + h.z } };
}

/** Solape en planta (m) entre dos cajas, por eje X y Z. 0 si no se solapan en ese eje. */
export function solapePlanta(a, b) {
  const la = limitesCaja(a), lb = limitesCaja(b);
  return {
    x: Math.max(0, Math.min(la.max.x, lb.max.x) - Math.max(la.min.x, lb.min.x)),
    z: Math.max(0, Math.min(la.max.z, lb.max.z) - Math.max(la.min.z, lb.min.z)),
  };
}

function parametros(opciones) {
  const p = { ...PARAMETROS_MANIPULACION, ...(opciones || {}) };
  for (const k of ['toleranciaApoyo', 'solapeMinimoPlanta', 'alturaSuelo']) {
    if (!finito(p[k])) throw new TypeError(`opción ${k} debe ser un número finito`);
  }
  if (p.toleranciaApoyo < 0 || p.solapeMinimoPlanta < 0) throw new RangeError('las tolerancias no pueden ser negativas');
  return p;
}

/**
 * Superficie de apoyo bajo una caja.
 * otras: [{ id, caja }] — piezas, muros, losa u otras superficies (sin la propia pieza).
 * Una caja cuenta como apoyo si se solapa en planta (≥ solapeMinimoPlanta en X y en Z) y su cara superior
 * no está por encima de la cara superior de la pieza (no puede ser algo que esté encima de ella).
 * Devuelve { altura, soporte, tipo }: la cara superior más alta entre el suelo y esas cajas.
 *   tipo: 'suelo' | 'pieza'; soporte: id de la caja de apoyo, o null si es el suelo.
 */
export function buscarApoyo(caja, otras = [], opciones) {
  exigirCaja(caja);
  const p = parametros(opciones);
  if (!Array.isArray(otras)) throw new TypeError('otras debe ser un arreglo de { id, caja }');
  const propia = limitesCaja(caja);
  let mejor = { altura: p.alturaSuelo, soporte: null, tipo: 'suelo' };
  otras.forEach((o, i) => {
    exigirCaja(o && o.caja, `otras[${i}].caja`);
    const s = solapePlanta(caja, o.caja);
    if (s.x < p.solapeMinimoPlanta || s.z < p.solapeMinimoPlanta) return;
    const tope = limitesCaja(o.caja).max.y;
    if (tope > propia.max.y + p.toleranciaApoyo) return; // está encima o la envuelve: no es apoyo
    if (tope > mejor.altura) mejor = { altura: tope, soporte: o.id ?? null, tipo: 'pieza' };
  });
  return mejor;
}

/**
 * Clasifica la colocación de una pieza.
 * opciones.solapaCon: id de la pieza con la que se superpone según la colisión de casa.js (o null).
 * Precedencia: superpuesta > hundida > flotante > apoyada.
 * Devuelve { estado, separacion, apoyo, solapaCon }:
 *   separacion = base de la pieza − altura de apoyo (m): > 0 hueco bajo la pieza; < 0 pieza metida en el apoyo.
 */
export function clasificarColocacion(caja, otras = [], opciones = {}) {
  const { solapaCon = null, ...resto } = opciones || {};
  const p = parametros(resto);
  const apoyo = buscarApoyo(caja, otras, p);
  const separacion = limitesCaja(caja).min.y - apoyo.altura;
  let estado = 'apoyada';
  if (solapaCon !== null && solapaCon !== undefined) estado = 'superpuesta';
  else if (separacion < -p.toleranciaApoyo) estado = 'hundida';
  else if (separacion > p.toleranciaApoyo) estado = 'flotante';
  return { estado, separacion, apoyo, solapaCon: solapaCon ?? null };
}

/** Desplazamiento vertical (m) que deja la base de la pieza exactamente sobre su apoyo (para F2.4). */
export function desplazamientoParaApoyar(caja, otras = [], opciones) {
  const apoyo = buscarApoyo(caja, otras, opciones);
  return apoyo.altura - limitesCaja(caja).min.y;
}
