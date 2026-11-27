// src/scripts/replanteo.js
// F5 · Replanteo básico — lógica PURA (sin DOM, sin Babylon.js, sin estado global; se prueba en Node).
//   5a · estacas en las esquinas únicas de las habitaciones del plano + ejes numerados (1, 2, 3… de oeste a este; A, B, C… de sur a norte).
//   5b · verificación: 4 lados y 2 diagonales por habitación (E contra T = D·ER) y escuadra 3-4-5 por esquina, en las dos orientaciones.
// Convenciones (las del plano, docs/F4c_cierre.md): x crece hacia el este, z hacia el norte; una habitación es {x, z} = esquina mínima
// (suroeste), `ancho` a lo largo de x y `largo` a lo largo de z. Las estacas se guardan en MILÍMETROS enteros.
// Cada estaca tiene una desviación (dx, dz) en mm respecto de su esquina teórica (P1 = A): las medidas se calculan con las posiciones
// desplazadas. D (en T = D·ER) es la distancia calculada de proyecto, no el promedio de una medición de ida y vuelta (no hay ida y vuelta aquí).
import { ER_PLANO, TOPOGRAFIA } from './referencia_topografia.js';

export const REP_VERSION = 1;
export const REP_DESV_MAX_MM = TOPOGRAFIA.DESVIACION_MAX_MM.valor;       // ±1000 mm (C1)
export const REP_MAX_ESTACAS = 200;                                        // 50 habitaciones × 4 esquinas (HAB_MAX de F4b)
export const REP_COORD_MAX_MM = 100000;                                    // 100 m, el máximo del lote (F4a)
export const REP_EPS = 1e-9;                                               // holgura numérica al comparar E con T (m)

export const ESTADO_SIN = 'sin_replanteo';
export const ESTADO_VIGENTE = 'vigente';
export const ESTADO_DESACTUALIZADO = 'desactualizado';
export const TEXTOS_ESTADO = Object.freeze({
  [ESTADO_SIN]: 'Sin replanteo',
  [ESTADO_VIGENTE]: 'Replanteo vigente',
  [ESTADO_DESACTUALIZADO]: 'Replanteo desactualizado. Vuelve a replantear.',
});

const mm = v => Math.round(v * 1000);
const clave = (x, z) => `${x},${z}`;
const esFinito = n => typeof n === 'number' && Number.isFinite(n);

/** Tolerancia T = D·ER (m) para una distancia D (m); terreno plano por defecto (ER = 1/5000, Zamarripa 2012, p. 19). */
export const toleranciaMetros = (D, er = ER_PLANO) => Math.abs(D) * er;

/** Letra de una fila (0 → A, 25 → Z, 26 → AA…). */
export function letraFila(i) {
  let n = i, s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

/** Las cuatro esquinas de una habitación en mm, con su nombre. */
export function esquinasHabitacion(h) {
  const x0 = mm(h.x), z0 = mm(h.z), x1 = mm(h.x + h.ancho), z1 = mm(h.z + h.largo);
  return { so: { x: x0, z: z0 }, se: { x: x1, z: z0 }, no: { x: x0, z: z1 }, ne: { x: x1, z: z1 } };
}

const habitacionValida = h => !!h && [h.x, h.z, h.ancho, h.largo].every(esFinito) && h.ancho > 0 && h.largo > 0;

/** Esquinas ÚNICAS (las compartidas cuentan una vez), en mm, ordenadas de oeste a este y de sur a norte. */
export function esquinasUnicas(habitaciones) {
  const vistas = new Map();
  for (const h of Array.isArray(habitaciones) ? habitaciones : []) {
    if (!habitacionValida(h)) continue;
    for (const e of Object.values(esquinasHabitacion(h))) vistas.set(clave(e.x, e.z), e);
  }
  return [...vistas.values()].sort((a, b) => a.x - b.x || a.z - b.z);
}

/** Ejes de un conjunto de puntos {x, z} (mm): columnas = x distintas (1, 2, 3…), filas = z distintas (A, B, C…). */
export function ejesDe(puntos) {
  const columnas = [...new Set(puntos.map(p => p.x))].sort((a, b) => a - b);
  const filas = [...new Set(puntos.map(p => p.z))].sort((a, b) => a - b);
  return { columnas, filas, etiquetaColumna: i => String(i + 1), etiquetaFila: letraFila };
}

/** Identificador de una estaca = fila + columna (A1, B3…). */
export const etiquetaPunto = (p, ejes) => letraFila(ejes.filas.indexOf(p.z)) + (ejes.columnas.indexOf(p.x) + 1);

/**
 * Crea las estacas de las esquinas únicas. Si ya había un replanteo, las esquinas que siguen existiendo conservan su desviación.
 * @returns {{id:string,x:number,z:number,dx:number,dz:number}[]}  (x, z, dx, dz en mm enteros)
 */
export function crearEstacas(habitaciones, previas = []) {
  const esquinas = esquinasUnicas(habitaciones);
  if (!esquinas.length || esquinas.length > REP_MAX_ESTACAS) return [];
  const antes = new Map((Array.isArray(previas) ? previas : []).map(e => [clave(e.x, e.z), e]));
  const ejes = ejesDe(esquinas);
  return esquinas.map(p => {
    const a = antes.get(clave(p.x, p.z));
    return { id: etiquetaPunto(p, ejes), x: p.x, z: p.z, dx: a ? a.dx : 0, dz: a ? a.dz : 0 };
  });
}

/** Posición real de una estaca en metros (esquina teórica + desviación). */
export const posicionEstaca = e => ({ x: (e.x + e.dx) / 1000, z: (e.z + e.dz) / 1000 });

/** C4 · compara las esquinas actuales del plano con las estacas guardadas (sin campo extra). */
export function estadoReplanteo(estacas, habitaciones) {
  if (!Array.isArray(estacas) || !estacas.length) return ESTADO_SIN;
  const actuales = esquinasUnicas(habitaciones);
  if (actuales.length !== estacas.length) return ESTADO_DESACTUALIZADO;
  const claves = new Set(estacas.map(e => clave(e.x, e.z)));
  return actuales.every(p => claves.has(clave(p.x, p.z))) ? ESTADO_VIGENTE : ESTADO_DESACTUALIZADO;
}

/**
 * C1 · valida el texto de una desviación (mm). Solo números: entero o decimal con punto o coma, con signo opcional.
 * @returns {{valido:boolean, valor:number, ajustado:boolean, aviso:string}}  `valor` solo se aplica si `valido`.
 */
export function validarDesviacion(texto) {
  const t = String(texto ?? '').trim().replace(/−/g, '-');
  if (t === '') return { valido: true, valor: 0, ajustado: false, aviso: '' };
  if (!/^[+-]?\d+([.,]\d+)?$/.test(t)) return { valido: false, valor: 0, ajustado: false, aviso: 'Escribe solo números (mm); no se aplicó el valor.' };
  const bruto = Number(t.replace(',', '.')), n = Math.sign(bruto) * Math.round(Math.abs(bruto));   // redondeo simétrico al mm: −2,5 → −3
  if (Math.abs(n) > REP_DESV_MAX_MM) {
    return { valido: true, valor: Math.sign(n) * REP_DESV_MAX_MM, ajustado: true, aviso: `Máximo ±${REP_DESV_MAX_MM} mm: se aplicó ${Math.sign(n) * REP_DESV_MAX_MM}.` };
  }
  return { valido: true, valor: n === 0 ? 0 : n, ajustado: false, aviso: '' };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function medida(id, nombre, medido, calculado) {
  const E = Math.abs(medido - calculado), T = toleranciaMetros(calculado);
  return { id, nombre, medido, calculado, E, T, ok: E <= T + REP_EPS };
}

/** Las estacas de una habitación (o null si falta alguna: replanteo desactualizado). */
function estacasDe(h, estacas) {
  const por = new Map(estacas.map(e => [clave(e.x, e.z), e]));
  const q = esquinasHabitacion(h), out = {};
  for (const [k, p] of Object.entries(q)) {
    const e = por.get(clave(p.x, p.z));
    if (!e) return null;
    out[k] = e;
  }
  return out;
}

/** Escuadra 3-4-5 desde la esquina `c` hacia los vecinos `vx` (a lo largo de x) y `vz` (a lo largo de z), en una orientación ('a' = 3k en x, 4k en z; 'b' = 4k en x, 3k en z). */
export function escuadra345(c, vx, vz, orientacion) {
  const [kx, kz] = orientacion === 'a' ? [TOPOGRAFIA.ESCUADRA_CATETO_MENOR.valor, TOPOGRAFIA.ESCUADRA_CATETO_MAYOR.valor]
    : [TOPOGRAFIA.ESCUADRA_CATETO_MAYOR.valor, TOPOGRAFIA.ESCUADRA_CATETO_MENOR.valor];
  const lx = dist({ x: c.x / 1000, z: c.z / 1000 }, { x: vx.x / 1000, z: vx.z / 1000 });
  const lz = dist({ x: c.x / 1000, z: c.z / 1000 }, { x: vz.x / 1000, z: vz.z / 1000 });
  const k = Math.floor(Math.min(lx / kx, lz / kz) + REP_EPS);                     // mayor múltiplo entero que cabe en las dos paredes
  if (k < 1) return { orientacion, k: 0, aplicable: false };
  const pc = posicionEstaca(c), px = posicionEstaca(vx), pz = posicionEstaca(vz);
  const ux = { x: px.x - pc.x, z: px.z - pc.z }, uz = { x: pz.x - pc.x, z: pz.z - pc.z };
  const nx = Math.hypot(ux.x, ux.z), nz = Math.hypot(uz.x, uz.z);
  if (nx < REP_EPS || nz < REP_EPS) return { orientacion, k, aplicable: false };
  const P = { x: pc.x + (ux.x / nx) * kx * k, z: pc.z + (ux.z / nx) * kx * k };
  const Q = { x: pc.x + (uz.x / nz) * kz * k, z: pc.z + (uz.z / nz) * kz * k };
  return { orientacion, k, aplicable: true, ...medida(`${orientacion}`, `3-4-5 ×${k}`, dist(P, Q), TOPOGRAFIA.ESCUADRA_HIPOTENUSA.valor * k) };
}

/**
 * 5b · medidas de una habitación con las estacas dadas: 4 lados, 2 diagonales y, por esquina, la escuadra 3-4-5 en las dos orientaciones.
 * @returns {null | {lados, diagonales, escuadras}}  null si faltan estacas.
 */
export function medidasHabitacion(h, estacas) {
  if (!habitacionValida(h)) return null;
  const s = estacasDe(h, estacas);
  if (!s) return null;
  const pos = Object.fromEntries(Object.entries(s).map(([k, e]) => [k, posicionEstaca(e)]));
  const nom = Object.fromEntries(Object.entries(s).map(([k, e]) => [k, { x: e.x / 1000, z: e.z / 1000 }]));
  const par = (id, nombre, a, b) => medida(id, nombre, dist(pos[a], pos[b]), dist(nom[a], nom[b]));
  const lados = [par('sur', 'Lado sur', 'so', 'se'), par('norte', 'Lado norte', 'no', 'ne'), par('oeste', 'Lado oeste', 'so', 'no'), par('este', 'Lado este', 'se', 'ne')];
  const diagonales = [par('diag_so_ne', 'Diagonal SO–NE', 'so', 'ne'), par('diag_se_no', 'Diagonal SE–NO', 'se', 'no')];
  const esq = { so: ['se', 'no'], se: ['so', 'ne'], no: ['ne', 'so'], ne: ['no', 'se'] };   // [vecino en x, vecino en z]
  const NOMBRE = { so: 'Esquina SO', se: 'Esquina SE', no: 'Esquina NO', ne: 'Esquina NE' };
  const escuadras = Object.entries(esq).flatMap(([c, [vx, vz]]) => ['a', 'b'].map(o => {
    const r = escuadra345(s[c], s[vx], s[vz], o);
    return { ...r, id: `${c}_${o}`, esquina: c, nombre: `${NOMBRE[c]} · 3-4-5 ${o === 'a' ? '(3 en x, 4 en z)' : '(4 en x, 3 en z)'}${r.k ? ` ×${r.k}` : ''}` };
  }));
  return { lados, diagonales, escuadras };
}

/** Cuántas medidas aplicables hay y cuántas superan la tolerancia (E > T → repetir). */
export function resumenMedidas(m) {
  if (!m) return { total: 0, repetir: 0 };
  const todas = [...m.lados, ...m.diagonales, ...m.escuadras.filter(e => e.aplicable)];
  return { total: todas.length, repetir: todas.filter(x => !x.ok).length };
}

/** Lo que se guarda en progreso.replanteo (aditivo: la clave solo existe si hay replanteo). */
export function serializarReplanteo(estacas, oculto = false) {
  return { v: REP_VERSION, e: estacas.map(s => [s.x, s.z, s.dx, s.dz]), oculto: !!oculto };
}

/** Valida lo guardado: devuelve { estacas, oculto } o null (nunca lanza). Recorta las desviaciones a ±REP_DESV_MAX_MM y descarta duplicados. */
export function sanearReplanteo(entrada) {
  try {
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada) || entrada.v !== REP_VERSION || !Array.isArray(entrada.e)) return null;
    if (entrada.e.length === 0 || entrada.e.length > REP_MAX_ESTACAS) return null;
    const vistas = new Set(), brutas = [];
    for (const f of entrada.e) {
      if (!Array.isArray(f) || f.length !== 4 || !f.every(esFinito)) return null;
      const [x, z, dx, dz] = f.map(Math.round);
      if (Math.abs(x) > REP_COORD_MAX_MM || Math.abs(z) > REP_COORD_MAX_MM) return null;
      if (vistas.has(clave(x, z))) continue;
      vistas.add(clave(x, z));
      const cl = n => Math.max(-REP_DESV_MAX_MM, Math.min(REP_DESV_MAX_MM, n)) || 0;
      brutas.push({ x, z, dx: cl(dx), dz: cl(dz) });
    }
    brutas.sort((a, b) => a.x - b.x || a.z - b.z);
    const ejes = ejesDe(brutas);
    return { estacas: brutas.map(p => ({ id: etiquetaPunto(p, ejes), ...p })), oculto: entrada.oculto === true };
  } catch (_) { return null; }
}

/** Bytes que ocupa lo guardado (JSON), para vigilar el límite de F4d (el progreso viaja dos veces en el PUT). */
export const bytesReplanteo = estacas => new TextEncoder().encode(JSON.stringify(serializarReplanteo(estacas, false))).length;
