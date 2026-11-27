// src/scripts/cimentacion.js
// F6a · Zanjas de cimentación — lógica PURA (sin DOM, sin Babylon.js, sin estado global; se prueba en Node).
// Una zanja corre bajo cada pared del plano (las mismas paredes que F4d: una pared compartida es UNA sola zanja, detectarParedesCompartidas).
// Cada pared da un rectángulo centrado en su eje, del ancho de la viga de cimentación (NSR-10, Tabla E.2.2-1) y alargado medio ancho en cada
// extremo para cubrir esquinas y encuentros en T. El volumen sale de la UNIÓN de esos rectángulos (compresión de coordenadas), así que las
// esquinas y los encuentros no se cuentan dos veces; si hay una fosa de F3 activa, solo cuenta lo que queda por debajo del fondo de la fosa.
// Convenciones (las del plano): x crece hacia el este, z hacia el norte; una habitación es {x, z} = esquina mínima, `ancho` a lo largo de x y
// `largo` a lo largo de z. Todo lo geométrico va en MILÍMETROS (los rectángulos pueden terminar en .5 mm cuando el ancho es impar).
import { CIMENTACION, PISOS_VALIDOS } from './referencia_cimentacion.js';
import {
  HAB_MAX, PLANO_MAX_COORDENADA, detectarParedesCompartidas, sanearHabitaciones, factorBancoSuelto, volumenSuelto, viajesVolqueta,
  SUELO_POR_DEFECTO, PORCENTAJE_RETIRO_POR_DEFECTO,
} from './calculos.js';
import { ESTADO_SIN, ESTADO_DESACTUALIZADO } from './replanteo.js';

export const CIM_VERSION = 1;
export const CIM_MAX_HAB = HAB_MAX;                                     // 50 habitaciones (F4b)
export const CIM_COORD_MAX_MM = PLANO_MAX_COORDENADA * 1000;            // lo mismo que acepta el plano al cargar (±1000 m)

const mm = v => Math.round(v * 1000);
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const esFinito = n => typeof n === 'number' && Number.isFinite(n);
const redondear3 = n => Math.round(n * 1000) / 1000;
const redondear4 = n => Math.round(n * 10000) / 10000;

export const CIM_PROF_DEFECTO_MM = mm(CIMENTACION.PROF_DEFECTO.valor);          // 540
export const CIM_PROF_MIN_MM = mm(CIMENTACION.PROF_MIN_TECNICA.valor);           // 100 (límite de la herramienta)
export const CIM_PROF_MAX_MM = mm(CIMENTACION.PROF_MAX_TECNICA.valor);           // 3000 (límite de la herramienta)
export const CIM_PROF_NSR_MM = mm(CIMENTACION.PROF_MIN_VIGA.valor);              // 500 (NSR-10 E.2.2.4)
export const CIM_TERRENO_MM = mm(CIMENTACION.TERRENO_MEDIO_LADO.valor);          // 13000
export const CIM_ZONA_MM = mm(CIMENTACION.ZONA_MEDIO_LADO.valor);                // 10000

export const ESTADO_SIN_ZANJAS = 'sin_zanjas';
export const ESTADO_VIGENTE = 'vigente';
export const ESTADO_DESACTUALIZADA = 'desactualizada';
export const TEXTOS_ESTADO_CIM = Object.freeze({
  [ESTADO_SIN_ZANJAS]: 'Sin zanjas',
  [ESTADO_VIGENTE]: 'Zanjas vigentes',
  [ESTADO_DESACTUALIZADA]: 'Zanjas desactualizadas. Vuelve a excavar.',
});

/** Ancho de la zanja = ancho de la viga de cimentación (mm): 250 un piso, 300 dos pisos (NSR-10, Tabla E.2.2-1, mampostería). */
export const anchoZanjaMm = pisos => mm(pisos === 2 ? CIMENTACION.ANCHO_VIGA_2P.valor : CIMENTACION.ANCHO_VIGA_1P.valor);

/** Profundidad escrita en metros → { valido, mm, aviso }. Rechaza lo que no es número o sale de los límites de la herramienta; NO rechaza lo menor que 0.50 m (eso solo avisa). */
export function validarProfundidad(valorM) {
  const lo = CIM_PROF_MIN_MM / 1000, hi = CIM_PROF_MAX_MM / 1000;
  if (typeof valorM === 'string' && valorM.trim() === '') return { valido: false, mm: null, aviso: 'La profundidad debe ser un número.' };
  const n = typeof valorM === 'string' ? Number(valorM.replace(',', '.')) : valorM;
  if (!esFinito(n)) return { valido: false, mm: null, aviso: 'La profundidad debe ser un número.' };
  if (n < lo || n > hi) return { valido: false, mm: null, aviso: `La profundidad debe estar entre ${lo.toFixed(2).replace('.', ',')} y ${hi.toFixed(2).replace('.', ',')} m (límite de la herramienta).` };
  return { valido: true, mm: Math.round(n * 1000), aviso: '' };
}

/** Opciones válidas (las inválidas vuelven a su valor por defecto). pisos ∈ {1, 2}; prof en mm; suelo con factor en A.1; retiro 0–1.
 *  El ancho NO es una opción libre: siempre sale de los pisos (250 / 300 mm, NSR-10 Tabla E.2.2-1), aunque el JSON guardado diga otra cosa. */
export function opcionesZanjas(op) {
  const o = esObj(op) ? op : {};
  const pisos = PISOS_VALIDOS.includes(o.pisos) ? o.pisos : 1;
  const prof = esFinito(o.prof) && o.prof >= CIM_PROF_MIN_MM && o.prof <= CIM_PROF_MAX_MM ? Math.round(o.prof) : CIM_PROF_DEFECTO_MM;
  const ancho = anchoZanjaMm(pisos);
  const suelo = typeof o.suelo === 'string' && factorBancoSuelto(o.suelo) !== null ? o.suelo : SUELO_POR_DEFECTO;
  const retiro = esFinito(o.retiro) && o.retiro >= 0 && o.retiro <= 1 ? o.retiro : PORCENTAJE_RETIRO_POR_DEFECTO;
  return { pisos, ancho, prof, suelo, retiro };
}

/** Modelo de las zanjas a partir de las habitaciones del plano y las opciones, o null si no hay ninguna habitación válida. */
export function crearZanjas(habitaciones, opciones) {
  const habs = sanearHabitaciones(habitaciones).map(({ id, tipo, x, z, ancho, largo, nombre }) => ({ id, tipo, x, z, ancho, largo, nombre }));
  return habs.length ? { habitaciones: habs, ...opcionesZanjas(opciones) } : null;
}

// ── Geometría ───────────────────────────────────────────────────────────────────
/** Paredes del plano en mm: [{ o: 'h'|'v', c, a, b, habitaciones }] (c = z fija en las horizontales, x fija en las verticales; a–b = tramo). */
export function paredesZanja(habitaciones) {
  return detectarParedesCompartidas(habitaciones).map(w => (w.orientacion === 'h'
    ? { o: 'h', c: mm(w.z1), a: mm(w.x1), b: mm(w.x2), habitaciones: w.habitaciones }
    : { o: 'v', c: mm(w.x1), a: mm(w.z1), b: mm(w.z2), habitaciones: w.habitaciones }));
}

/** Un rectángulo por pared: centrado en su eje, de `anchoMm` de ancho y alargado anchoMm/2 en cada extremo. { x0, x1, z0, z1 } en mm. */
export function rectangulosZanja(paredes, anchoMm) {
  const h = anchoMm / 2;
  return paredes.map(w => (w.o === 'h'
    ? { x0: w.a - h, x1: w.b + h, z0: w.c - h, z1: w.c + h }
    : { x0: w.c - h, x1: w.c + h, z0: w.a - h, z1: w.b + h }));
}

const rectValido = r => !!r && [r.x0, r.x1, r.z0, r.z1].every(esFinito) && r.x1 > r.x0 && r.z1 > r.z0;

function mallaDe(rects) {
  const ordenar = s => [...new Set(s)].sort((m, n) => m - n);
  const xs = ordenar(rects.flatMap(r => [r.x0, r.x1])), zs = ordenar(rects.flatMap(r => [r.z0, r.z1]));
  return { xs, zs, nx: xs.length - 1, nz: zs.length - 1, ix: new Map(xs.map((v, i) => [v, i])), iz: new Map(zs.map((v, i) => [v, i])) };
}
function marcar(g, rects, destino) {
  for (const r of rects) {
    const i0 = g.ix.get(r.x0), i1 = g.ix.get(r.x1), j0 = g.iz.get(r.z0), j1 = g.iz.get(r.z1);
    for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) destino[i * g.nz + j] = 1;
  }
}
// Rectángulos DISJUNTOS que cubren las celdas llenas: corridas en z por columna, fundidas con la columna siguiente si son idénticas.
function rectsDeCeldas(g, lleno) {
  const salida = [];
  let abiertas = new Map();
  for (let i = 0; i < g.nx; i++) {
    const nuevas = new Map();
    for (let j = 0; j < g.nz; j++) {
      if (!lleno(i, j)) continue;
      let k = j;
      while (k + 1 < g.nz && lleno(i, k + 1)) k++;
      const clave = `${j},${k}`, previa = abiertas.get(clave);
      if (previa) { previa.x1 = g.xs[i + 1]; nuevas.set(clave, previa); abiertas.delete(clave); }
      else nuevas.set(clave, { x0: g.xs[i], x1: g.xs[i + 1], z0: g.zs[j], z1: g.zs[k + 1] });
      j = k;
    }
    for (const r of abiertas.values()) salida.push(r);
    abiertas = nuevas;
  }
  for (const r of abiertas.values()) salida.push(r);
  return salida;
}

/** Unión de rectángulos: { area (mm²), rectangulos } con rectángulos disjuntos. Lo que no es un rectángulo válido se ignora. */
export function unirRectangulos(rects) {
  const lista = (Array.isArray(rects) ? rects : []).filter(rectValido);
  if (!lista.length) return { area: 0, rectangulos: [] };
  const g = mallaDe(lista), m = new Uint8Array(g.nx * g.nz);
  marcar(g, lista, m);
  const rectangulos = rectsDeCeldas(g, (i, j) => m[i * g.nz + j] === 1);
  return { area: rectangulos.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0), rectangulos };
}

/** Recorta rectángulos al cuadrado [−lado, lado]² (mm) y descarta los que quedan vacíos: el 3D solo abre el terreno donde hay terreno. */
export function recortarRectangulos(rects, ladoMm) {
  return (Array.isArray(rects) ? rects : []).filter(rectValido).map(r => ({
    x0: Math.max(r.x0, -ladoMm), x1: Math.min(r.x1, ladoMm), z0: Math.max(r.z0, -ladoMm), z1: Math.min(r.z1, ladoMm),
  })).filter(rectValido);
}

/** La fosa de F3 (centrada en el origen, ancho a lo largo de x y largo a lo largo de z, en m) como rectángulo en mm con su profundidad, o null si no está activa. */
export function fosaDesde(exc) {
  if (!esObj(exc) || exc.activa !== true || ![exc.largo, exc.ancho, exc.profundidad].every(n => esFinito(n) && n > 0)) return null;
  const hx = mm(exc.ancho) / 2, hz = mm(exc.largo) / 2;
  return { x0: -hx, x1: hx, z0: -hz, z1: hz, prof: mm(exc.profundidad) };
}

/**
 * Huecos del terreno: rectángulos DISJUNTOS que cubren el cuadrado [−lado, lado]² MENOS la unión de los huecos (mm). Sirve para el terreno
 * (lado = 13000) y la zona verde (lado = 10000). Sin huecos devuelve el cuadrado entero.
 */
export function complementoTerreno(huecos, ladoMm) {
  const caja = { x0: -ladoMm, x1: ladoMm, z0: -ladoMm, z1: ladoMm };
  const rec = recortarRectangulos(huecos, ladoMm);
  const g = mallaDe([caja, ...rec]), hueco = new Uint8Array(g.nx * g.nz);
  marcar(g, rec, hueco);
  return rectsDeCeldas(g, (i, j) => hueco[i * g.nz + j] === 0);
}

/**
 * Geometría 3D de las zanjas como campo de alturas, consciente de la fosa de F3 (fosa = { x0, x1, z0, z1, prof } o null; mm).
 * Cada celda tiene un fondo: 0 (terreno), −D (dentro de la fosa) o −prof (zanja). Solo se dibuja lo que la zanja BAJA respecto de lo que ya
 * hay (la fosa ya dibuja su borde, de −D a 0). Devuelve, en mm:
 *   suelos:   [{x0,x1,z0,z1,y}]  fondo de las zanjas (y = −prof), rectángulos disjuntos.
 *   muros:    [{eje:'x'|'z', n:±1, c, a0, a1, y0, y1}]  un muro 'x' está en x = c y va de z = a0 a a1; uno 'z' está en z = c y va de x = a0 a a1;
 *             todos de y0 a y1 (y0 < y1 ≤ 0); n es el sentido de la normal sobre su eje (hacia el lado más bajo, el que se ve desde la zanja).
 *   pisoFosa: [{x0,x1,z0,z1,y}]  SOLO si alguna zanja es más honda que la fosa y la cruza (fosaPerforada): el piso de la fosa (y = −D) con las
 *             zanjas recortadas. El llamador debe ocultar entonces el piso sólido de F3 (exc_floor), que taparía esas zanjas.
 */
export function geometriaZanjas(rects, profMm, fosa = null) {
  const vacio = { suelos: [], muros: [], pisoFosa: [], fosaPerforada: false };
  const lista = (Array.isArray(rects) ? rects : []).filter(rectValido);
  if (!lista.length || !(profMm > 0)) return vacio;
  const g = mallaDe(fosa ? [...lista, fosa] : lista);
  const zanja = new Uint8Array(g.nx * g.nz), enFosa = new Uint8Array(g.nx * g.nz);
  marcar(g, lista, zanja);
  if (fosa) marcar(g, [fosa], enFosa);
  const D = fosa ? fosa.prof : 0;
  const base = k => (enFosa[k] ? -D : 0);
  const fondo = k => (zanja[k] ? Math.min(base(k), -profMm) : base(k));
  const baja = k => zanja[k] === 1 && -profMm < base(k);
  const suelos = rectsDeCeldas(g, (i, j) => baja(i * g.nz + j)).map(r => ({ ...r, y: -profMm }));
  const crudos = [];
  let fosaPerforada = false;
  for (let i = 0; i < g.nx; i++) {
    for (let j = 0; j < g.nz; j++) {
      const k = i * g.nz + j;
      if (!baja(k)) continue;
      const lo = -profMm, dentro = enFosa[k] === 1;
      if (dentro) fosaPerforada = true;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const a = i + di, b = j + dj, fuera = a < 0 || b < 0 || a >= g.nx || b >= g.nz;
        const vecinoFondo = fuera ? 0 : fondo(a * g.nz + b), vecinoFosa = fuera ? false : enFosa[a * g.nz + b] === 1;
        if (!(vecinoFondo > lo)) continue;
        let hi = vecinoFondo;
        if (vecinoFosa !== dentro) hi = Math.min(hi, -D);              // el borde de la fosa ya tiene su muro (F3) de −D a 0
        if (!(hi - lo > 1)) continue;
        crudos.push(di !== 0
          ? { eje: 'x', n: -di, c: di < 0 ? g.xs[i] : g.xs[i + 1], a0: g.zs[j], a1: g.zs[j + 1], y0: lo, y1: hi }
          : { eje: 'z', n: -dj, c: dj < 0 ? g.zs[j] : g.zs[j + 1], a0: g.xs[i], a1: g.xs[i + 1], y0: lo, y1: hi });
      }
    }
  }
  crudos.sort((p, q) => (p.eje < q.eje ? -1 : p.eje > q.eje ? 1 : p.n - q.n || p.c - q.c || p.y0 - q.y0 || p.y1 - q.y1 || p.a0 - q.a0));
  const muros = [];
  for (const m of crudos) {
    const u = muros[muros.length - 1];
    if (u && u.eje === m.eje && u.n === m.n && u.c === m.c && u.y0 === m.y0 && u.y1 === m.y1 && m.a0 <= u.a1) u.a1 = Math.max(u.a1, m.a1);
    else muros.push({ ...m });
  }
  const pisoFosa = fosaPerforada ? rectsDeCeldas(g, (i, j) => enFosa[i * g.nz + j] === 1 && !baja(i * g.nz + j)).map(r => ({ ...r, y: -D })) : [];
  return { suelos, muros, pisoFosa, fosaPerforada };
}

/** Volumen de las zanjas (mm³): bruto = área × prof; adicional = lo que queda por debajo del fondo de la fosa (sin doble conteo). */
export function volumenZanjas(rects, profMm, fosa = null) {
  const lista = (Array.isArray(rects) ? rects : []).filter(rectValido);
  if (!lista.length || !(profMm > 0)) return { areaMm2: 0, brutoMm3: 0, adicionalMm3: 0 };
  const g = mallaDe(fosa ? [...lista, fosa] : lista);
  const zanja = new Uint8Array(g.nx * g.nz), enFosa = new Uint8Array(g.nx * g.nz);
  marcar(g, lista, zanja);
  if (fosa) marcar(g, [fosa], enFosa);
  let areaMm2 = 0, brutoMm3 = 0, adicionalMm3 = 0;
  for (let i = 0; i < g.nx; i++) {
    for (let j = 0; j < g.nz; j++) {
      const k = i * g.nz + j;
      if (!zanja[k]) continue;
      const a = (g.xs[i + 1] - g.xs[i]) * (g.zs[j + 1] - g.zs[j]);
      areaMm2 += a; brutoMm3 += a * profMm;
      adicionalMm3 += a * Math.max(0, profMm - (enFosa[k] ? fosa.prof : 0));
    }
  }
  return { areaMm2, brutoMm3, adicionalMm3 };
}

/**
 * Resultados de las zanjas: nº de zanjas (paredes), longitud de ejes, área, volumen en banco (adicional a la fosa de F3), volumen suelto (A.1)
 * y viajes de volqueta (los mismos cálculos que la excavación de F3). El volumen se redondea a milésimas de m³.
 */
export function resumenZanjas(z, fosa = null) {
  const paredes = paredesZanja(z.habitaciones);
  const v = volumenZanjas(rectangulosZanja(paredes, z.ancho), z.prof, fosa);
  const bruto = redondear3(v.brutoMm3 / 1e9), volumen = redondear3(v.adicionalMm3 / 1e9);
  const suelto = volumenSuelto(volumen, z.suelo);
  return {
    zanjas: paredes.length,
    longitudM: redondear3(paredes.reduce((s, w) => s + (w.b - w.a), 0) / 1000),
    areaM2: redondear4(v.areaMm2 / 1e6),
    anchoM: z.ancho / 1000, profM: z.prof / 1000,
    volumenBruto: bruto, volumen, volumenEnFosa: redondear3(bruto - volumen),
    factor: factorBancoSuelto(z.suelo), suelto,
    viajes: suelto === null ? null : viajesVolqueta(suelto, undefined, z.retiro),
  };
}

// ── Avisos (educativos: NINGUNO bloquea) ─────────────────────────────────────────
const fmt = (n, d = 2) => n.toFixed(d).replace('.', ',');

/** Avisos de las zanjas: profundidad, esbeltez y dimensión interior de los anillos (E.2.1.5), tramos largos (E.2.4.1), terreno y replanteo. */
export function avisosZanjas(z, { estadoReplanteo = null } = {}) {
  const av = [], nombre = h => h.nombre || h.id;
  if (z.prof < CIM_PROF_NSR_MM) {
    av.push({ codigo: 'prof_menor_min', texto: `La profundidad (${fmt(z.prof / 1000)} m) es menor que el mínimo de la NSR-10 (E.2.2.4, p. E-9): el nivel inferior de la viga va a 0,50 m o más bajo el piso terminado.` });
  }
  const max = CIMENTACION.ESBELTEZ_ANILLO_MAX.valor, limInterior = mm(CIMENTACION.DIM_INTERIOR_MAX.valor);
  for (const h of z.habitaciones) {
    const ratio = Math.max(h.ancho, h.largo) / Math.min(h.ancho, h.largo);
    if (ratio > max) av.push({ codigo: 'esbeltez', texto: `${nombre(h)}: largo/ancho = ${fmt(ratio)} > ${max} (NSR-10 E.2.1.5, p. E-8): hace falta una viga intermedia de cimentación.` });
    const interior = mm(Math.max(h.ancho, h.largo)) - z.ancho;
    if (interior > limInterior) av.push({ codigo: 'interior_mayor_4m', texto: `${nombre(h)}: dimensión interior ${fmt(interior / 1000)} m > 4,0 m (NSR-10 E.2.1.5, p. E-8): hace falta una viga intermedia de cimentación.` });
  }
  const paredes = paredesZanja(z.habitaciones), lineas = new Map();
  for (const w of paredes) {
    const k = `${w.o}|${w.c}`;
    if (!lineas.has(k)) lineas.set(k, []);
    lineas.get(k).push([w.a, w.b]);
  }
  const juntaMm = mm(CIMENTACION.JUNTA_MAX.valor);
  for (const [k, tramos] of lineas) {
    tramos.sort((p, q) => p[0] - q[0]);
    let [a, b] = tramos[0];
    const cerrar = () => { if (b - a > juntaMm) av.push({ codigo: 'tramo_mayor_30', texto: `Tramo continuo de ${fmt((b - a) / 1000, 1)} m en el eje ${k.startsWith('h') ? 'z' : 'x'} = ${fmt(Number(k.split('|')[1]) / 1000)} m > 30 m (NSR-10 E.2.4.1, p. E-10): hacen falta juntas.` }); };
    for (const [p, q] of tramos.slice(1)) { if (p <= b) b = Math.max(b, q); else { cerrar(); a = p; b = q; } }
    cerrar();
  }
  const fuera = rectangulosZanja(paredes, z.ancho).filter(r => r.x0 < -CIM_TERRENO_MM || r.x1 > CIM_TERRENO_MM || r.z0 < -CIM_TERRENO_MM || r.z1 > CIM_TERRENO_MM).length;
  if (fuera) av.push({ codigo: 'fuera_terreno', texto: `${fuera} ${fuera === 1 ? 'zanja sale' : 'zanjas salen'} del terreno visible (±13 m): el 3D solo abre el terreno dentro de ese rango.` });
  if (estadoReplanteo === ESTADO_SIN) av.push({ codigo: 'sin_replanteo', texto: 'Aún no hay replanteo (etapa 3): las zanjas se trazan sin estacas. Es una sugerencia, no un bloqueo.' });
  else if (estadoReplanteo === ESTADO_DESACTUALIZADO) av.push({ codigo: 'replanteo_desactualizado', texto: 'El replanteo está desactualizado respecto del plano: conviene volver a replantear antes de excavar.' });
  return av;
}

// ── Estado, guardado y saneo ─────────────────────────────────────────────────────
const firma = habs => habs.map(h => `${mm(h.x)},${mm(h.z)},${mm(h.ancho)},${mm(h.largo)}`).sort().join('|');

/** sin_zanjas / vigente / desactualizada: se compara la geometría de las habitaciones excavadas con la del plano actual (nombres, ids y vanos no cuentan). */
export function estadoCimentacion(z, habitacionesActuales) {
  if (!z) return ESTADO_SIN_ZANJAS;
  return firma(z.habitaciones) === firma(sanearHabitaciones(habitacionesActuales)) ? ESTADO_VIGENTE : ESTADO_DESACTUALIZADA;
}

/** Lo que se guarda en progreso.cimentacion (aditivo: la clave solo existe si hay zanjas; para quitarlas se envía null). Geometría en mm enteros. */
export function serializarCimentacion(z) {
  return {
    v: CIM_VERSION,
    zanjas: {
      h: z.habitaciones.map(h => [h.id, mm(h.x), mm(h.z), mm(h.ancho), mm(h.largo)]),
      pisos: z.pisos, ancho: z.ancho, prof: z.prof, suelo: z.suelo, retiro: z.retiro,
    },
  };
}

/** Valida lo guardado: devuelve el modelo de zanjas o null (nunca lanza). Si algo del snapshot es inválido se descarta TODO (no se restaura media excavación). */
export function sanearCimentacion(entrada) {
  try {
    if (!esObj(entrada) || entrada.v !== CIM_VERSION || !esObj(entrada.zanjas)) return null;
    const z = entrada.zanjas;
    if (!Array.isArray(z.h) || z.h.length === 0 || z.h.length > CIM_MAX_HAB) return null;
    const brutas = [];
    for (const f of z.h) {
      if (!Array.isArray(f) || f.length !== 5 || typeof f[0] !== 'string' || !f.slice(1).every(esFinito)) return null;
      const [x, zz, ancho, largo] = f.slice(1).map(Math.round);
      if (Math.abs(x) > CIM_COORD_MAX_MM || Math.abs(zz) > CIM_COORD_MAX_MM) return null;
      brutas.push({ id: f[0], tipo: 'habitacion', x: x / 1000, z: zz / 1000, ancho: ancho / 1000, largo: largo / 1000, nombre: '' });
    }
    const habs = sanearHabitaciones(brutas);
    if (habs.length !== brutas.length) return null;
    return { habitaciones: habs.map(({ id, tipo, x, z: zz, ancho, largo, nombre }) => ({ id, tipo, x, z: zz, ancho, largo, nombre })), ...opcionesZanjas(z) };
  } catch (_) { return null; }
}

/** Bytes que ocupa lo guardado (JSON), para vigilar el límite de F4d (el progreso viaja dos veces en el PUT). */
export const bytesCimentacion = z => new TextEncoder().encode(JSON.stringify(serializarCimentacion(z))).length;
