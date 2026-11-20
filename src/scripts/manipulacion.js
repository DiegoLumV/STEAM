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
// F2.3: las piezas que penetran a la analizada llegan marcadas (`penetra: true`) y no cuentan como apoyo.
//
// Los parámetros son del simulador (tolerancias de manipulación), no datos de la base documental.

export const PARAMETROS_MANIPULACION = Object.freeze({
  toleranciaApoyo: 0.02,    // m: separación o penetración vertical que todavía se considera «apoyada»
  solapeMinimoPlanta: 0.01, // m: solape mínimo en planta (X y Z) para que una caja pueda servir de apoyo
  alturaSuelo: 0,           // m: nivel del terreno (MIN_Y en casa.js)
  // F2.3 · Fracción mínima de la cara de la pieza que debe apoyar para considerarla «apoyada» (0–1).
  // Es un UMBRAL DE DISEÑO del simulador (estimación): no procede de una norma técnica ni de la base documental.
  // Es el único lugar donde se define el 60 %; sustituye a UMBRALES_AVISO_COLOCACION (F2.2, §6bis).
  contactoMinimo: 0.60,
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
  for (const k of ['toleranciaApoyo', 'solapeMinimoPlanta', 'alturaSuelo', 'contactoMinimo']) {
    if (!finito(p[k])) throw new TypeError(`opción ${k} debe ser un número finito`);
  }
  if (p.toleranciaApoyo < 0 || p.solapeMinimoPlanta < 0) throw new RangeError('las tolerancias no pueden ser negativas');
  if (p.contactoMinimo < 0 || p.contactoMinimo > 1) throw new RangeError('contactoMinimo debe estar entre 0 y 1');
  return p;
}

// ── F2.3 · Geometría de contacto (funciones puras) ──────────────────────────────────────────────
// El contacto se mide como ÁREA: la que comparten, en el plano horizontal, la cara de apoyo de la pieza y la
// cara superior de cada apoyo. Ambas son polígonos convexos exactos (también con piezas giradas un ángulo
// cualquiera); no se aproximan con cajas alineadas a los ejes del mundo.
const EPS = 1e-9;

/** Los 8 vértices de una caja orientada, en el mundo. */
function verticesCaja(caja) {
  const v = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
    const ka = a * caja.e[0], kb = b * caja.e[1], kc = c * caja.e[2];
    v.push({
      x: caja.c.x + ka * caja.u[0].x + kb * caja.u[1].x + kc * caja.u[2].x,
      y: caja.c.y + ka * caja.u[0].y + kb * caja.u[1].y + kc * caja.u[2].y,
      z: caja.c.z + ka * caja.u[0].z + kb * caja.u[1].z + kc * caja.u[2].z,
    });
  }
  return v;
}

/** Envolvente convexa (cadena monótona) de puntos {x, z}, en sentido antihorario. [] si no llegan a 3 vértices no alineados. */
function envolventeConvexa(puntos) {
  const pts = puntos.map(p => ({ x: p.x, z: p.z })).sort((a, b) => a.x - b.x || a.z - b.z);
  const cruz = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const cadena = lista => {
    const h = [];
    for (const p of lista) {
      while (h.length >= 2 && cruz(h[h.length - 2], h[h.length - 1], p) <= EPS) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  if (pts.length < 3) return [];
  const hull = cadena(pts).concat(cadena([...pts].reverse()));
  return hull.length >= 3 ? hull : [];
}

/** Área (m²) de un polígono {x, z}[]. */
export function areaPoligono(poli) {
  let s = 0;
  for (let i = 0; i < poli.length; i++) {
    const a = poli[i], b = poli[(i + 1) % poli.length];
    s += a.x * b.z - b.x * a.z;
  }
  return Math.abs(s) / 2;
}

/** Intersección de dos polígonos CONVEXOS en sentido antihorario (recorte de Sutherland–Hodgman). [] si no se tocan. */
export function interseccionPoligonos(sujeto, recorte) {
  if (sujeto.length < 3 || recorte.length < 3) return [];
  let salida = sujeto;
  for (let i = 0; i < recorte.length && salida.length; i++) {
    const a = recorte[i], b = recorte[(i + 1) % recorte.length];
    const lado = p => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x); // > 0: a la izquierda de a→b (dentro)
    const entrada = salida;
    salida = [];
    for (let j = 0; j < entrada.length; j++) {
      const p = entrada[j], q = entrada[(j + 1) % entrada.length];
      const dp = lado(p), dq = lado(q);
      if (dp >= -EPS) salida.push(p);
      if ((dp >= -EPS) !== (dq >= -EPS)) {
        const t = dp / (dp - dq);
        salida.push({ x: p.x + t * (q.x - p.x), z: p.z + t * (q.z - p.z) });
      }
    }
  }
  return salida.length >= 3 ? salida : [];
}

/**
 * Cara horizontal de una caja, como polígono convexo en planta: los vértices de su cara inferior (`lado: 'inferior'`)
 * o superior (`'superior'`), es decir los que quedan a menos de `tolerancia` del punto más bajo o más alto.
 * En una pieza apoyada «de plano» es su huella real (un rectángulo, girado si la pieza está girada).
 * Si la pieza está inclinada y solo una arista o un vértice entra en la tolerancia, no hay cara: devuelve [] (área 0).
 */
export function caraHorizontal(caja, lado, tolerancia = PARAMETROS_MANIPULACION.toleranciaApoyo) {
  exigirCaja(caja);
  if (lado !== 'inferior' && lado !== 'superior') throw new TypeError("lado debe ser 'inferior' o 'superior'");
  const v = verticesCaja(caja);
  const ys = v.map(q => q.y);
  const abajo = lado === 'inferior';
  const ref = abajo ? Math.min(...ys) : Math.max(...ys);
  return envolventeConvexa(v.filter(q => (abajo ? q.y <= ref + tolerancia + EPS : q.y >= ref - tolerancia - EPS)));
}

/** Huella de la caja entera proyectada al plano horizontal (polígono convexo). */
function huellaPlanta(caja) {
  return envolventeConvexa(verticesCaja(caja));
}

/** true si los tres ejes de la caja coinciden con ejes del mundo (sin giros intermedios ni inclinaciones). */
function esOrtogonal(caja) {
  return caja.u.every(u => Math.max(Math.abs(u.x), Math.abs(u.y), Math.abs(u.z)) >= 1 - 1e-6);
}

function rectanguloPlanta(poli) {
  return {
    x0: Math.min(...poli.map(q => q.x)), x1: Math.max(...poli.map(q => q.x)),
    z0: Math.min(...poli.map(q => q.z)), z1: Math.max(...poli.map(q => q.z)),
  };
}

/**
 * Contacto de la cara inferior de `caja` con los apoyos que están a la altura del apoyo principal.
 * Devuelve { contacto: 0–1, zona } donde `zona` es el rectángulo {x0, x1, z0, z1} (alineado a los ejes) del contacto con
 * el apoyo principal: solo sirve para dibujar el plano del overlay; la clasificación usa el área exacta.
 * Suelo = 100 % (el terreno se trata como un plano infinito).
 */
function calcularContacto(caja, apoyos, apoyo, p) {
  const cara = caraHorizontal(caja, 'inferior', p.toleranciaApoyo);
  const areaCara = areaPoligono(cara);
  if (areaCara <= EPS) return { contacto: 0, zona: null };
  if (apoyo.tipo === 'suelo') return { contacto: 1, zona: rectanguloPlanta(cara) };
  let suma = 0, zona = null, primera = null;
  for (const o of apoyos) {
    if (Math.abs(limitesCaja(o.caja).max.y - apoyo.altura) > p.toleranciaApoyo) continue;
    const inter = interseccionPoligonos(cara, caraHorizontal(o.caja, 'superior', p.toleranciaApoyo));
    const a = areaPoligono(inter);
    if (a <= EPS) continue;
    suma += a;
    primera = primera ?? inter;
    if ((o.id ?? null) === apoyo.soporte) zona = rectanguloPlanta(inter);
  }
  if (!zona && primera) zona = rectanguloPlanta(primera);
  return { contacto: Math.min(1, suma / areaCara), zona };
}

/** Orden FIJO de los avisos cuando hay varios a la vez (el primero es el más grave y es el `estado` principal). */
export const ORDEN_AVISOS = Object.freeze(['superpuesta', 'hundida', 'flotante']);

/**
 * Superficie de apoyo bajo una caja.
 * otras: [{ id, caja }] — piezas, muros, losa u otras superficies (sin la propia pieza).
 * Candidato = caja que se solapa en planta (≥ solapeMinimoPlanta en X y en Z) y cuya cara superior no está por encima de la
 * cara superior de la pieza (no puede ser algo que esté encima de ella).
 * F2.3: si alguna de las dos cajas está girada/inclinada, el solape en planta se comprueba además con la huella exacta
 * (área ≥ solapeMinimoPlanta²), no solo con las cajas envolventes. `buscarApoyo` NO mira `penetra` (lo hace clasificarColocacion).
 *
 * F2.4b · Un candidato solo se ACEPTA como apoyo si cumple una de estas condiciones:
 *   1. Tolerancia: su tope está a `base + toleranciaApoyo` o por debajo de la base de la pieza (con el solape en planta de
 *      arriba). Es el caso normal («apoyada», «flotante» por hueco).
 *   2. Contacto: su tope está POR ENCIMA de `base + toleranciaApoyo` (la pieza estaría hundida en él) y el contacto con ese
 *      nivel es ≥ contactoMinimo. El contacto es el MISMO de clasificarColocacion (`calcularContacto`: suma las caras
 *      superiores de todos los apoyos a esa altura, así que varios apoyos pueden sumar).
 *      Un vecino que solo se toca de lado (solape 1–3 cm, contacto bajo) deja de ser apoyo: antes daba una falsa «hundida».
 *   Excepción (pieza inclinada): si la cara inferior de la pieza no tiene área (solo una arista o un vértice dentro de la
 *   tolerancia) no hay contacto que medir y la condición 2 no se exige: se conserva el comportamiento de F2.3.
 * Entre los aceptados gana la cara superior más alta (a igual tope, el primero de `otras`). Si no hay ninguno: el suelo.
 * Devuelve { altura, soporte, tipo }: tipo: 'suelo' | 'pieza'; soporte: id de la caja de apoyo, o null si es el suelo.
 */
export function buscarApoyo(caja, otras = [], opciones) {
  exigirCaja(caja);
  const p = parametros(opciones);
  if (!Array.isArray(otras)) throw new TypeError('otras debe ser un arreglo de { id, caja }');
  const propia = limitesCaja(caja);
  const propiaOrtogonal = esOrtogonal(caja);
  const areaMinima = p.solapeMinimoPlanta * p.solapeMinimoPlanta;
  let huellaPropia = null;
  const suelo = { altura: p.alturaSuelo, soporte: null, tipo: 'suelo' };
  const candidatos = [];
  otras.forEach((o, i) => {
    exigirCaja(o && o.caja, `otras[${i}].caja`);
    const s = solapePlanta(caja, o.caja);
    if (s.x < p.solapeMinimoPlanta || s.z < p.solapeMinimoPlanta) return;
    // F2.3 (D-2): si alguna de las dos cajas no está alineada con los ejes del mundo, sus cajas envolventes
    // pueden solaparse sin que las piezas se toquen (esquinas): se exige además solape real en planta.
    if (!propiaOrtogonal || !esOrtogonal(o.caja)) {
      huellaPropia = huellaPropia ?? huellaPlanta(caja);
      if (areaPoligono(interseccionPoligonos(huellaPropia, huellaPlanta(o.caja))) < areaMinima - EPS) return;
    }
    const tope = limitesCaja(o.caja).max.y;
    if (tope > propia.max.y + p.toleranciaApoyo) return; // está encima o la envuelve: no es apoyo
    if (tope > suelo.altura) candidatos.push({ tope, soporte: o.id ?? null });
  });
  // De la cara superior más alta a la más baja; el orden es estable (a igual tope, el primero de `otras`, como en F2.3).
  candidatos.sort((a, b) => b.tope - a.tope);
  let caraConArea = null; // se calcula una sola vez, y solo si algún candidato queda por encima de la banda de tolerancia
  for (const c of candidatos) {
    if (c.tope > propia.min.y + p.toleranciaApoyo + EPS) {
      caraConArea = caraConArea ?? (areaPoligono(caraHorizontal(caja, 'inferior', p.toleranciaApoyo)) > EPS);
      if (caraConArea) {
        const contacto = calcularContacto(caja, otras, { altura: c.tope, soporte: c.soporte, tipo: 'pieza' }, p).contacto;
        if (contacto + EPS < p.contactoMinimo) continue; // contacto lateral o insuficiente: no es un apoyo
      }
    }
    return { altura: c.tope, soporte: c.soporte, tipo: 'pieza' };
  }
  return suelo;
}

/**
 * Clasifica la colocación de una pieza (criterio ÚNICO de apoyo y contacto, F2.3).
 * otras: [{ id, caja, penetra? }]. `penetra: true` marca una pieza que penetra a la analizada (la colisión de casa.js):
 *   no cuenta como apoyo (es una superposición, no un soporte).
 * opciones.solapaCon: id de la pieza con la que se superpone según la colisión de casa.js (o null).
 * opciones.contactoMinimo: sobreescribe PARAMETROS_MANIPULACION.contactoMinimo (0–1).
 *
 * Avisos (pueden coexistir), en el orden FIJO ORDEN_AVISOS = superpuesta → hundida → flotante:
 *   superpuesta: hay `solapaCon`.
 *   hundida:     la base está más de `toleranciaApoyo` por debajo de la altura de apoyo.
 *   flotante:    la base está más de `toleranciaApoyo` por encima del apoyo (hueco), o está a la altura del apoyo pero
 *                la fracción de la cara de apoyo que se toca (`contacto`) es menor que `contactoMinimo`.
 * `estado` = avisos[0], o 'apoyada' si no hay ninguno. Con un solo aviso coincide con el `estado` de F2.1/F2.2.
 *
 * Contacto (0–1) = área común, en planta, entre la cara inferior de la pieza y las caras superiores de los apoyos que están
 * a la altura de apoyo, dividida por el área de esa cara inferior (suma acotada a 1). Suelo = 1 (plano infinito).
 * Con hueco (flotante por altura) el contacto es 0. En «hundida» se informa el contacto geométrico, sin consecuencia en el estado.
 *
 * Devuelve { estado, avisos, separacion, apoyo, solapaCon, contacto, contactoBajo, zona }:
 *   separacion = base de la pieza − altura de apoyo (m): > 0 hueco bajo la pieza; < 0 pieza metida en el apoyo.
 *   contactoBajo = true si la altura es correcta pero el contacto no llega a `contactoMinimo`.
 *   zona = rectángulo {x0,x1,z0,z1} alineado a los ejes (APROXIMACIÓN para dibujar el plano del overlay; la clasificación usa
 *          el área exacta) del contacto con el apoyo principal, o null si no hay contacto.
 */
export function clasificarColocacion(caja, otras = [], opciones = {}) {
  const { solapaCon = null, ...resto } = opciones || {};
  const p = parametros(resto);
  if (!Array.isArray(otras)) throw new TypeError('otras debe ser un arreglo de { id, caja }');
  otras.forEach((o, i) => exigirCaja(o && o.caja, `otras[${i}].caja`));
  const apoyos = otras.filter(o => !o.penetra);
  const apoyo = buscarApoyo(caja, apoyos, p);
  const separacion = limitesCaja(caja).min.y - apoyo.altura;
  const hundida = separacion < -p.toleranciaApoyo;
  const hueco = separacion > p.toleranciaApoyo;
  const { contacto, zona } = hueco ? { contacto: 0, zona: null } : calcularContacto(caja, apoyos, apoyo, p);
  const contactoBajo = !hundida && !hueco && contacto + EPS < p.contactoMinimo;
  const hay = { superpuesta: solapaCon !== null && solapaCon !== undefined, hundida, flotante: hueco || contactoBajo };
  const avisos = ORDEN_AVISOS.filter(k => hay[k]);
  return {
    estado: avisos[0] ?? 'apoyada', avisos, separacion, apoyo, solapaCon: solapaCon ?? null,
    contacto, contactoBajo, zona,
  };
}

/** |Δ| (m) por debajo del cual no hay nada que mover: se devuelve null (nunca 0 ni -0). */
const DESPLAZAMIENTO_NULO = 1e-6;

/**
 * Desplazamiento vertical Δy (m) que deja la base de la pieza exactamente sobre su apoyo (+ sube, − baja). F2.4a.
 *
 * CONTRATO DE RETORNO
 *   número   → caso válido: la pieza debe moverse Δy para quedar apoyada (|Δy| > 1e-6 m).
 *   null     → no hay un desplazamiento seguro que proponer (guardas) o no hay nada que mover (|Δy| ≤ 1e-6).
 *   Nunca devuelve 0, -0, NaN ni undefined.
 * `otras`: [{ id, caja, penetra? }] igual que clasificarColocacion.
 *
 * Guardas, en este orden (la primera que falla devuelve null):
 *   1. Altura: el apoyo elegido es válido si su cara superior queda a la base + toleranciaApoyo o por debajo (hay que bajar,
 *      o ya está apoyada), o si queda por encima de eso (hay que subir) con contacto en planta ≥ contactoMinimo. Un vecino
 *      que solo se toca de lado tiene contacto bajo y no vale: antes la pieza «subía» hasta su tope.
 *   2. Penetración: si el apoyo elegido es una pieza marcada `penetra: true` (superposición, no soporte) → null.
 *   3. Solape mínimo: si el solape en planta con el apoyo (pieza) es menor que solapeMinimoPlanta → null.
 *   4. Contacto resultante: con la pieza ya desplazada, el contacto sería menor que contactoMinimo → null.
 *   5. Normalización: |Δy| ≤ 1e-6 → null.
 * COLLISION_TOLERANCE (casa.js) no interviene: aquí solo cuentan toleranciaApoyo, solapeMinimoPlanta y contactoMinimo.
 * No modifica sus argumentos ni cambia buscarApoyo/clasificarColocacion.
 */
export function desplazamientoParaApoyar(caja, otras = [], opciones) {
  const p = parametros(opciones);
  const apoyo = buscarApoyo(caja, otras, p);
  const base = limitesCaja(caja).min.y;
  const dy = apoyo.altura - base;
  const apoyos = otras.filter(o => !o.penetra);
  const contactoBajo = c => c + EPS < p.contactoMinimo; // misma comparación que clasificarColocacion
  // 1 · altura
  if (apoyo.altura > base + p.toleranciaApoyo + EPS) {
    if (contactoBajo(calcularContacto(caja, apoyos, apoyo, p).contacto)) return null;
  }
  if (apoyo.tipo === 'pieza') {
    const elegido = otras.find(o => (o.id ?? null) === apoyo.soporte && Math.abs(limitesCaja(o.caja).max.y - apoyo.altura) <= EPS);
    // 2 · penetración
    if (elegido && elegido.penetra) return null;
    // 3 · solape mínimo en planta
    if (elegido) {
      const s = solapePlanta(caja, elegido.caja);
      if (s.x < p.solapeMinimoPlanta || s.z < p.solapeMinimoPlanta) return null;
    }
  }
  // 4 · contacto con la pieza ya desplazada (se construye un objeto nuevo: no se toca la caja recibida)
  const desplazada = { c: { x: caja.c.x, y: caja.c.y + dy, z: caja.c.z }, u: caja.u, e: caja.e };
  if (contactoBajo(calcularContacto(desplazada, apoyos, apoyo, p).contacto)) return null;
  // 5 · normalización (sin 0, sin -0)
  if (!Number.isFinite(dy) || Math.abs(dy) <= DESPLAZAMIENTO_NULO) return null;
  return dy;
}
