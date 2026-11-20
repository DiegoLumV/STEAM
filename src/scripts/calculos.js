// src/scripts/calculos.js
// Cálculos PUROS del simulador: reciben números y devuelven números.
// No usan el DOM, Babylon.js ni estado global, así que se pueden probar en Node.
//
// Fase 1: cada función es una copia literal de la fórmula que estaba dentro de casa.js.
// casa.js la usa mediante una delegación; la fórmula original queda comentada junto a
// cada delegación como respaldo. No se cambia ninguna regla ni resultado.
// F3: único import del archivo. referencia.js es la fuente de datos (A.1 y capacidad de la volqueta); solo se lee.
import { A1_FACTORES_SUELO, PARAMETROS } from './referencia.js';

// ── Techos ──────────────────────────────────────────────────────────────────
// Área de la cubierta según la forma (m²). w = ancho, d = largo, h = altura de la cumbrera.
export function calcularAreaTecho(forma, w, d, h) {
  let area = w * d;
  if (forma === 'dos_aguas') {
    area = 2 * Math.hypot(w / 2, h) * d;
  } else if (forma === 'cuatro_aguas') {
    area = 2 * (w / 2 * Math.hypot(d / 2, h)) + 2 * (d / 2 * Math.hypot(w / 2, h));
  } else if (forma === 'una_agua') {
    area = Math.hypot(d, h) * w;
  }
  return area;
}

// ── Excavación ──────────────────────────────────────────────────────────────
export const EXC_DECIMALES = 100; // precisión de 0.01 m

// Redondea a 0.01 (corrige errores como 0.1 + 0.2 = 0.30000000000000004)
export const redondearCentesimas = n => Math.round(n * EXC_DECIMALES) / EXC_DECIMALES;

// Área de desplante (m²) y volumen geométrico excavado (m³) de una fosa rectangular.
// El volumen se redondea a milésimas (m³) y el área a centésimas (m²), igual que antes.
export function calcularExcavacion(largo, ancho, profundidad) {
  return {
    area: redondearCentesimas(largo * ancho),
    volumen: Math.round(largo * ancho * profundidad * 1000) / 1000,
  };
}

// ── Excavación · suelo y volqueta (F3) ──────────────────────────────────────
// Datos de la fuente (referencia.js, solo lectura): A.1 (Manual de Materiales, Tabla 1.1, p. 4) y capacidad de la volqueta.
// Suelo por defecto para excavaciones nuevas y para guardados sin tipo_suelo.
export const SUELO_POR_DEFECTO = 'tierra_vegetal';
// Fracción del material suelto que se retira en volqueta por defecto (100 %).
export const PORCENTAJE_RETIRO_POR_DEFECTO = 1;

const redondearMilesimas = n => Math.round(n * 1000) / 1000;

// Factor banco→suelto (m³ suelto / m³ banco) del tipo de suelo, o null si el tipo no existe o la fuente no da factor
// («-----» en A.1: afirmado para bases de vías y material sucio de río). No lanza: el llamador decide qué mostrar.
export function factorBancoSuelto(tipoSuelo) {
  const filas = A1_FACTORES_SUELO.filas;
  if (typeof tipoSuelo !== 'string' || !Object.prototype.hasOwnProperty.call(filas, tipoSuelo)) return null;
  const f = filas[tipoSuelo].factor_banco_suelto.valor;
  return typeof f === 'number' && Number.isFinite(f) ? f : null;
}

// Volumen suelto (m³) = volumen en banco × factor banco→suelto de A.1, redondeado a milésimas (igual que calcularExcavacion).
// Devuelve null si el volumen no es un número finito ≥ 0 o si el tipo de suelo no tiene factor.
export function volumenSuelto(volumenBanco, tipoSuelo) {
  if (typeof volumenBanco !== 'number' || !Number.isFinite(volumenBanco) || volumenBanco < 0) return null;
  const factor = factorBancoSuelto(tipoSuelo);
  return factor === null ? null : redondearMilesimas(volumenBanco * factor);
}

// Viajes de volqueta para retirar `porcentajeRetiro` (0–1) del volumen suelto.
// Devuelve { aRetirar, viajesSinRedondear, viajes } o null si algún dato no es válido
// (volumen finito ≥ 0, capacidad finita > 0, porcentaje finito en 0–1).
//   aRetirar           m³ sueltos a retirar (suelto × porcentaje), a milésimas, para mostrar.
//   viajesSinRedondear aRetirar / capacidad con el ruido de punto flotante eliminado (1e-9): es el valor de la fuente (12,67).
//   viajes             Math.ceil(viajesSinRedondear). CRITERIO EDUCATIVO DE OPERACIÓN (referencia.js, PARAMETROS.redondeo_viajes,
//                      errata 8): la fuente da el decimal; solo los viajes a contratar se redondean hacia arriba.
// El ruido se quita ANTES del Math.ceil: 50 × 1.10 / 5 = 11.000000000000002 en coma flotante y daría 12 viajes en vez de 11.
export function viajesVolqueta(volumenSueltoM3, capacidad = PARAMETROS.volqueta_m3.valor, porcentajeRetiro = PORCENTAJE_RETIRO_POR_DEFECTO) {
  const finito = n => typeof n === 'number' && Number.isFinite(n);
  if (!finito(volumenSueltoM3) || volumenSueltoM3 < 0) return null;
  if (!finito(capacidad) || capacidad <= 0) return null;
  if (!finito(porcentajeRetiro) || porcentajeRetiro < 0 || porcentajeRetiro > 1) return null;
  const retirar = volumenSueltoM3 * porcentajeRetiro;
  const sinRedondear = Math.round((retirar / capacidad) * 1e9) / 1e9;
  return { aRetirar: redondearMilesimas(retirar), viajesSinRedondear: sinRedondear, viajes: Math.ceil(sinRedondear) };
}

// ── Muros ───────────────────────────────────────────────────────────────────
// Alto de una pieza (m) según el material: block 0.7, madera 0.2, lámina 0.5
export function altoPiezaMuro(material) {
  return material === 'block' ? 0.7 : (material === 'madera' ? 0.2 : 0.5);
}

// Piezas reales de un muro de w columnas × h filas descontando los huecos.
// modo: 'simple' | 'puerta' | 'ventana'. cantVentanas: 1 o 2.
export function calcularPiezasMuro(w, h, modo, cantVentanas) {
  let huecos = 0;
  if (modo === 'puerta') {
    // hueco central: 1 col × 4 filas (desde abajo)
    huecos = Math.min(4, h);
  } else if (modo === 'ventana') {
    // cada ventana ocupa 1 col × 2 filas (las 2 filas superiores)
    const ventRows = Math.min(2, h);
    huecos = cantVentanas * ventRows;
  }
  return Math.max(0, w * h - huecos);
}

// Dimensiones totales del muro en metros (las piezas miden 1.0 m de ancho)
export function calcularDimensionesMuro(w, h, material) {
  const bW = 1.0;
  const bH = altoPiezaMuro(material);
  return { ancho: w * bW, alto: h * bH };
}

// ── Pisos ───────────────────────────────────────────────────────────────────
// Suma el área (m²) de los pisos ya colocados. Recibe objetos { type, area }.
export function sumarAreaPisos(objetos) {
  return objetos
    .filter(o => o.type === 'floor_vitropiso')
    .reduce((sum, o) => sum + (o.area || 0), 0);
}

// Situación de la cobertura al agregar un piso de área nueva sobre un total disponible.
// estado: 'completo' (ya cubierto), 'excede' (no cabe) o 'parcial' (cabe).
export function calcularCoberturaPiso(cubierta, nueva, total) {
  if (cubierta >= total) {
    return { estado: 'completo' };
  }
  if (cubierta + nueva > total) {
    return { estado: 'excede', maxPermitido: total - cubierta };
  }
  const despues = cubierta + nueva;
  return { estado: 'parcial', despues, quedan: total - despues, exacto: despues === total };
}

// ── Concreto ────────────────────────────────────────────────────────────────
// Suma de materiales ingresados (m³) y porcentaje de cada tramo de la barra (tope 100 %).
export function calcularTotalConcreto(vals) {
  return vals.cemento + vals.arena + vals.grava + vals.agua;
}
export function porcentajeBarra(valor, totalReferencia) {
  return Math.min((valor / totalReferencia) * 100, 100);
}

// ── Concreto: validación del modo libre (?libre=1) ──────────────────────────
// Límites del SIMULADOR (parámetros configurables, no normas técnicas ni límites universales para
// preparar concreto). Su única finalidad es evitar valores absurdos o desbordamientos numéricos que
// romperían la barra y los textos. Se ajustan aquí, en un único lugar; las unidades son las del modal (m³).
// No hay mínimo: cualquier cantidad pequeña o decimal mayor que cero es válida.
export const LIMITES_CONCRETO_LIBRE = Object.freeze({
  maxComponente: 1000000, // máximo por componente (cemento, arena, grava o agua)
  maxTotal: 4000000,      // máximo de la suma de los cuatro componentes
});

export const COMPONENTES_CONCRETO = ['cemento', 'arena', 'grava', 'agua'];
const NOMBRE_COMPONENTE = { cemento: 'Cemento', arena: 'Arena', grava: 'Grava', agua: 'Agua' };
// Decimal estricto: signo opcional, dígitos con punto opcional, exponente opcional. Rechaza "12abc", "0x10", "NaN", "Infinity".
const NUMERO_DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const fmtLimite = n => Number(n).toLocaleString('en-US');

// Convierte UNA entrada a número sin aceptar texto parcial. El vacío se descarta antes de convertir (Number("") es 0).
// Devuelve { valor, codigo }: valor es un número finito >= 0 solo si codigo es null.
// Códigos: 'vacio' | 'no_numerico' | 'no_finito' | 'negativo'
export function convertirCantidadConcreto(entrada) {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada)) return { valor: null, codigo: 'no_finito' };
    return entrada < 0 ? { valor: null, codigo: 'negativo' } : { valor: entrada, codigo: null };
  }
  if (entrada === null || entrada === undefined) return { valor: null, codigo: 'vacio' };
  const texto = String(entrada).trim();
  if (texto === '') return { valor: null, codigo: 'vacio' };
  if (!NUMERO_DECIMAL.test(texto)) return { valor: null, codigo: 'no_numerico' };
  const n = Number(texto);
  if (!Number.isFinite(n)) return { valor: null, codigo: 'no_finito' }; // p. ej. 1e999
  if (n < 0) return { valor: null, codigo: 'negativo' };
  return { valor: n === 0 ? 0 : n, codigo: null }; // normaliza -0
}

// Valida la mezcla del modo libre. entradas: { cemento, arena, grava, agua } con los valores ORIGINALES de los campos.
// limites (opcional): { maxComponente, maxTotal }; lo que no se indique usa LIMITES_CONCRETO_LIBRE.
// Resultado: { ok, valores, errores: [{ campo, codigo, mensaje }], avisos: [{ codigo, mensaje }] }
//   - errores BLOQUEAN la mezcla (ok = false). Códigos: vacio, no_numerico, no_finito, negativo, cero,
//     maximo_componente, maximo_total (campo 'total').
//   - avisos son educativos y NUNCA cambian ok. Único aviso: 'agua_cero'.
//   - valores: números de los cuatro componentes si ok; null si no.
// Sin proporciones fijas: no se exige 1:2:3 ni un porcentaje de agua.
export function validarMezclaConcretoLibre(entradas, limites = LIMITES_CONCRETO_LIBRE) {
  const lim = { ...LIMITES_CONCRETO_LIBRE, ...(limites || {}) };
  const origen = entradas || {};
  const errores = [];
  const avisos = [];
  const valores = {};
  const error = (campo, codigo, mensaje) => errores.push({ campo, codigo, mensaje });

  for (const campo of COMPONENTES_CONCRETO) {
    const nombre = NOMBRE_COMPONENTE[campo];
    const { valor, codigo } = convertirCantidadConcreto(origen[campo]);
    if (codigo === 'vacio') { error(campo, codigo, `${nombre}: el campo está vacío; escribe una cantidad.`); continue; }
    if (codigo === 'no_numerico') { error(campo, codigo, `${nombre}: escribe solo un número (por ejemplo 12, 0.5 o 1e3).`); continue; }
    if (codigo === 'no_finito') { error(campo, codigo, `${nombre}: el número es demasiado grande o no es válido.`); continue; }
    if (codigo === 'negativo') { error(campo, codigo, `${nombre}: la cantidad no puede ser negativa.`); continue; }
    if (valor === 0 && campo !== 'agua') { error(campo, 'cero', `${nombre}: la cantidad debe ser mayor que 0.`); continue; }
    if (valor > lim.maxComponente) {
      error(campo, 'maximo_componente', `${nombre}: supera el máximo del simulador (${fmtLimite(lim.maxComponente)} m³).`);
      continue;
    }
    valores[campo] = valor;
  }

  if (errores.length === 0) {
    const total = COMPONENTES_CONCRETO.reduce((s, c) => s + valores[c], 0);
    if (!(total <= lim.maxTotal)) {
      error('total', 'maximo_total', `La suma de los cuatro materiales (${fmtLimite(Math.round(total))} m³) supera el máximo del simulador (${fmtLimite(lim.maxTotal)} m³).`);
    }
  }

  // Aviso educativo: depende solo del agua escrita; nunca invalida la mezcla.
  if (valores.agua === 0) {
    avisos.push({ codigo: 'agua_cero', mensaje: '💧 Agua en 0: sin agua el cemento no se hidrata ni fragua. Puedes continuar, pero revisa esta cantidad.' });
  }

  const ok = errores.length === 0;
  return { ok, valores: ok ? valores : null, errores, avisos };
}

// ── Dimensiones de cubierta a partir de la casa ─────────────────────────────
// Ancho y largo sugeridos (m) para un techo, desde los límites de la casa.
export function calcularDimensionCubierta(minimo, maximo) {
  return Math.max(3, Math.min(24, Math.round(maximo - minimo + 0.6)));
}

// ── F4a · Editor 2D del plano (funciones puras: sin DOM ni Babylon) ──────────
// Coordenadas en METROS del mundo: X = ancho (este, a la derecha), Z = largo (norte, arriba), origen = centro del lote.
// Todo número que sale de aquí se redondea a milésimas para que guardar/cargar sea estable.
export const PLANO_VERSION = 1;
export const PLANO_LOTE_DEFECTO = Object.freeze({ ancho: 10, largo: 10 });
export const PLANO_LOTE_MIN = 1;
export const PLANO_LOTE_MAX = 100;
export const PLANO_MAX_ELEMENTOS = 500;
export const PLANO_MAX_COORDENADA = 1000;           // |coordenada| máxima aceptada al cargar
export const PLANO_ZOOM_MIN = 0.5;
export const PLANO_ZOOM_MAX = 10;
export const PLANO_PASOS_REJILLA = Object.freeze([0.1, 0.25, 0.5, 1]);
export const PLANO_PASO_DEFECTO = 0.5;
export const PLANO_TIPOS = Object.freeze(['punto', 'linea', 'rectangulo']);

const esNum = n => typeof n === 'number' && Number.isFinite(n);
const esObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const mil = n => { const r = Math.round(n * 1000) / 1000; return r === 0 ? 0 : r; }; // sin -0

// Distancia euclidiana entre dos puntos del plano (m).
export function distancia(x1, z1, x2, z2) {
  if (![x1, z1, x2, z2].every(esNum)) return null;
  return mil(Math.hypot(x2 - x1, z2 - z1));
}

// Rectángulo desde dos esquinas opuestas en cualquier orden → esquina mínima + dimensiones.
export function normalizarRectangulo(x1, z1, x2, z2) {
  if (![x1, z1, x2, z2].every(esNum)) return null;
  return { x: mil(Math.min(x1, x2)), z: mil(Math.min(z1, z2)), ancho: mil(Math.abs(x2 - x1)), largo: mil(Math.abs(z2 - z1)) };
}

// Ajusta un valor al múltiplo más cercano de "paso". Paso inválido → valor sin cambio (redondeado).
export function ajustarARejilla(valor, paso) {
  if (!esNum(valor)) return null;
  if (!esNum(paso) || paso <= 0) return mil(valor);
  return mil(Math.round(valor / paso + 1e-9 * Math.sign(valor)) * paso);
}

// Cota con un decimal y unidad. null si no es un número finito. 1e-9 evita errores de coma flotante (0.35 → 0.4).
export function formatearCota(metros) {
  if (!esNum(metros)) return null;
  const r = Math.round(Math.abs(metros) * 10 + 1e-9) / 10;
  return `${metros < 0 && r !== 0 ? '-' : ''}${r.toFixed(1)} m`;
}

export function limitarZoom(zoom) {
  if (!esNum(zoom)) return 1;
  return Math.min(PLANO_ZOOM_MAX, Math.max(PLANO_ZOOM_MIN, zoom));
}

// Píxeles por metro con zoom 1: el lote cabe completo en la ventana con un margen en píxeles.
export function escalaBasePlano(lote, anchoPx, altoPx, margenPx = 70) {
  const l = lote && esNum(lote.ancho) && esNum(lote.largo) ? lote : PLANO_LOTE_DEFECTO;
  const s = Math.min((anchoPx - 2 * margenPx) / l.ancho, (altoPx - 2 * margenPx) / l.largo);
  return esNum(s) && s > 0 ? s : 10;
}

// Vista = { zoom, cx, cz }: (cx, cz) es el punto del mundo en el centro de la pantalla; s = base × zoom px/m; Z hacia arriba.
export function mundoAPantalla(vista, base, anchoPx, altoPx, x, z) {
  const s = base * vista.zoom;
  return { px: anchoPx / 2 + (x - vista.cx) * s, py: altoPx / 2 - (z - vista.cz) * s };
}
export function pantallaAMundo(vista, base, anchoPx, altoPx, px, py) {
  const s = base * vista.zoom;
  return { x: vista.cx + (px - anchoPx / 2) / s, z: vista.cz - (py - altoPx / 2) / s };
}

// Zoom centrado en el cursor: el punto del mundo bajo el cursor no se mueve. (dx, dy) = cursor respecto al centro, en px.
export function zoomEnPunto(vista, factor, dx, dy, base) {
  const zoom = limitarZoom(vista.zoom * (esNum(factor) && factor > 0 ? factor : 1));
  const s0 = base * vista.zoom, s1 = base * zoom;
  const wx = vista.cx + dx / s0, wz = vista.cz - dy / s0;
  return { zoom, cx: wx - dx / s1, cz: wz + dy / s1 };
}

// Distancia del punto (px, pz) al segmento (x1,z1)-(x2,z2). Segmento degenerado → distancia al punto.
export function distanciaPuntoSegmento(px, pz, x1, z1, x2, z2) {
  if (![px, pz, x1, z1, x2, z2].every(esNum)) return null;
  const vx = x2 - x1, vz = z2 - z1, len2 = vx * vx + vz * vz;
  if (len2 === 0) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (pz - z1) * vz) / len2));
  return Math.hypot(px - (x1 + t * vx), pz - (z1 + t * vz));
}

// Ancla de un elemento (la esquina o punto que se ajusta a la rejilla al moverlo).
export function anclaElemento(el) {
  return el.tipo === 'linea' ? { x: el.x1, z: el.z1 } : { x: el.x, z: el.z };
}

// Copia del elemento desplazada (dx, dz) metros.
export function moverElemento(el, dx, dz) {
  if (el.tipo === 'linea') return { ...el, x1: mil(el.x1 + dx), z1: mil(el.z1 + dz), x2: mil(el.x2 + dx), z2: mil(el.z2 + dz) };
  return { ...el, x: mil(el.x + dx), z: mil(el.z + dz) };
}

// Cotas a mostrar: [{ texto, x, z }] con la posición (m) donde se escribe cada una.
export function cotasElemento(el) {
  if (!el) return [];
  if (el.tipo === 'punto') return [{ texto: `${mil(el.x).toFixed(2)}, ${mil(el.z).toFixed(2)}`, x: el.x, z: el.z }];
  if (el.tipo === 'linea') {
    return [{ texto: formatearCota(distancia(el.x1, el.z1, el.x2, el.z2)), x: (el.x1 + el.x2) / 2, z: (el.z1 + el.z2) / 2 }];
  }
  if (el.tipo === 'rectangulo') {
    return [
      { texto: formatearCota(el.ancho), x: el.x + el.ancho / 2, z: el.z + el.largo },
      { texto: formatearCota(el.largo), x: el.x + el.ancho, z: el.z + el.largo / 2 },
    ];
  }
  return [];
}

// Distancia de selección (m) del punto (x, z) al elemento. Rectángulo: al borde; dentro cuenta como impacto
// de baja prioridad (0.99·tol) para que puntos y líneas dibujados encima ganen.
export function distanciaAElemento(el, x, z, tol = 0) {
  if (!el) return Infinity;
  if (el.tipo === 'punto') return Math.hypot(x - el.x, z - el.z);
  if (el.tipo === 'linea') return distanciaPuntoSegmento(x, z, el.x1, el.z1, el.x2, el.z2);
  if (el.tipo === 'rectangulo') {
    const x2 = el.x + el.ancho, z2 = el.z + el.largo;
    const borde = Math.min(
      distanciaPuntoSegmento(x, z, el.x, el.z, x2, el.z), distanciaPuntoSegmento(x, z, x2, el.z, x2, z2),
      distanciaPuntoSegmento(x, z, x2, z2, el.x, z2), distanciaPuntoSegmento(x, z, el.x, z2, el.x, el.z));
    const dentro = x >= el.x && x <= x2 && z >= el.z && z <= z2;
    return dentro ? Math.min(borde, tol * 0.99) : borde;
  }
  return Infinity;
}

// Elemento bajo (x, z) dentro de la tolerancia (m); el de menor distancia, y a igual distancia el dibujado después. null si ninguno.
export function elementoEn(elementos, x, z, tol) {
  let mejor = null, mejorD = Infinity;
  for (const el of Array.isArray(elementos) ? elementos : []) {
    const d = distanciaAElemento(el, x, z, tol);
    if (d <= tol && d <= mejorD) { mejor = el; mejorD = d; }
  }
  return mejor;
}

export function planoVacio() {
  return {
    v: PLANO_VERSION,
    lote: { ...PLANO_LOTE_DEFECTO },
    rejilla: { visible: false, paso: PLANO_PASO_DEFECTO },
    elementos: [],
    habitaciones: [],                                 // F4b (aditivo): array separado de "elementos"
    contador: 1,
  };
}

function sanearElemento(e) {
  if (!esObj(e) || !PLANO_TIPOS.includes(e.tipo)) return null;
  const c = n => esNum(n) && Math.abs(n) <= PLANO_MAX_COORDENADA;
  if (e.tipo === 'punto') {
    return c(e.x) && c(e.z) ? { tipo: 'punto', x: mil(e.x), z: mil(e.z) } : null;
  }
  if (e.tipo === 'linea') {
    if (![e.x1, e.z1, e.x2, e.z2].every(c)) return null;
    const r = { tipo: 'linea', x1: mil(e.x1), z1: mil(e.z1), x2: mil(e.x2), z2: mil(e.z2) };
    return r.x1 === r.x2 && r.z1 === r.z2 ? null : r;               // línea de longitud 0: se descarta
  }
  if (!c(e.x) || !c(e.z) || !esNum(e.ancho) || !esNum(e.largo)) return null;
  if (!(e.ancho > 0) || !(e.largo > 0) || e.ancho > 2 * PLANO_MAX_COORDENADA || e.largo > 2 * PLANO_MAX_COORDENADA) return null;
  const r = { tipo: 'rectangulo', x: mil(e.x), z: mil(e.z), ancho: mil(e.ancho), largo: mil(e.largo) };
  return r.ancho > 0 && r.largo > 0 ? r : null;
}

// Convierte CUALQUIER valor en un plano válido. Nunca lanza excepción: lo inválido se descarta, el lote inválido vuelve
// a 10×10, hay máximo 500 elementos (se conservan los primeros válidos) y los ids repetidos o ausentes se reasignan.
export function sanearPlano(entrada) {
  const plano = planoVacio();
  try {
    if (!esObj(entrada)) return plano;
    const l = entrada.lote;
    if (esObj(l) && [l.ancho, l.largo].every(n => esNum(n) && n >= PLANO_LOTE_MIN && n <= PLANO_LOTE_MAX)) {
      plano.lote = { ancho: mil(l.ancho), largo: mil(l.largo) };
    }
    const r = entrada.rejilla;
    if (esObj(r)) {
      plano.rejilla.visible = r.visible === true;
      plano.rejilla.paso = PLANO_PASOS_REJILLA.includes(r.paso) ? r.paso : PLANO_PASO_DEFECTO;
    }
    const usados = new Set();
    const pendientes = [];
    const lista = Array.isArray(entrada.elementos) ? entrada.elementos : [];
    for (let i = 0; i < lista.length && plano.elementos.length < PLANO_MAX_ELEMENTOS; i++) {
      const el = sanearElemento(lista[i]);
      if (!el) continue;
      const id = lista[i].id;
      if (Number.isInteger(id) && id >= 1 && !usados.has(id)) { el.id = id; usados.add(id); } else pendientes.push(el);
      plano.elementos.push(el);
    }
    let sig = Math.max(0, ...usados) + 1;
    if (Number.isInteger(entrada.contador) && entrada.contador > sig) sig = entrada.contador;
    for (const el of pendientes) el.id = sig++;
    plano.contador = sig;
    // orden de claves estable: id primero
    plano.elementos = plano.elementos.map(({ id, ...resto }) => ({ id, ...resto }));
    plano.habitaciones = sanearHabitaciones(entrada.habitaciones);   // F4b: ausente o corrupto → []
    const mat = sanearMaterializado(entrada.materializado);          // F4d (aditivo): solo existe si hay paredes materializadas
    if (mat) plano.materializado = mat;
  } catch (_) {
    return planoVacio();
  }
  return plano;
}

// ── F4b · Habitaciones libres con nombre (funciones puras: sin DOM ni Babylon) ──
// Una habitación es un rectángulo del plano: { id:'h<k>', tipo:'habitacion', x, z, ancho, largo, nombre }.
// (x, z) es la esquina mínima (oeste-sur). Área y perímetro NO se guardan: se calculan al mostrar.
export const HAB_MAX = 50;                       // habitaciones por plano (se trunca al cargar)
export const HAB_LADO_MIN = 0.1;                 // m
export const HAB_LADO_MAX = 100;                 // m
export const HAB_AREA_MIN = 0.01;                // m²: un área menor o igual NO se crea
export const HAB_NOMBRE_MAX = 30;                // caracteres
const HAB_EPS = 1e-6;                            // tolerancia de coma flotante en solapes y lados mínimos

// Área (m²) y perímetro (m). Entradas no numéricas o ≤ 0 → 0. Redondeo a milésimas.
export function areaRectangulo(ancho, largo) {
  return esNum(ancho) && esNum(largo) && ancho > 0 && largo > 0 ? mil(ancho * largo) : 0;
}
export function perimetroRectangulo(ancho, largo) {
  return esNum(ancho) && esNum(largo) && ancho > 0 && largo > 0 ? mil(2 * (ancho + largo)) : 0;
}

// Área con un decimal y unidad (p. ej. «12.0 m²»). null si no es un número finito.
export function formatearArea(m2) {
  if (!esNum(m2)) return null;
  return `${(Math.round(Math.abs(m2) * 10 + 1e-9) / 10).toFixed(1)} m²`;
}

// ¿Se puede crear una habitación con estas dimensiones? Cada lado ≥ 0.1 m y área > 0.01 m².
// (0.1 × 0.1 da exactamente 0.01 y NO se crea; sí se puede llegar a él redimensionando: ver redimensionarDesdeEsquina.)
export function habitacionCreable(ancho, largo) {
  return esNum(ancho) && esNum(largo) && ancho >= HAB_LADO_MIN - 1e-9 && largo >= HAB_LADO_MIN - 1e-9 &&
    ancho <= HAB_LADO_MAX && largo <= HAB_LADO_MAX && ancho * largo > HAB_AREA_MIN + 1e-9;
}

// ¿Se solapan en planta? Intersección de ÁREA positiva: dos rectángulos que solo comparten borde o esquina NO se solapan.
export function rectangulosSolapan(r1, r2) {
  const ok = r => esObj(r) && [r.x, r.z, r.ancho, r.largo].every(esNum) && r.ancho > 0 && r.largo > 0;
  if (!ok(r1) || !ok(r2)) return false;
  return r1.x < r2.x + r2.ancho - HAB_EPS && r2.x < r1.x + r1.ancho - HAB_EPS &&
    r1.z < r2.z + r2.largo - HAB_EPS && r2.z < r1.z + r1.largo - HAB_EPS;
}

// Solapes de una lista: { [id]: [ids de las demás con las que se solapa] }. Solo aparecen las que se solapan.
export function solapesHabitaciones(habitaciones) {
  const lista = Array.isArray(habitaciones) ? habitaciones : [];
  const r = {};
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      if (!rectangulosSolapan(lista[i], lista[j])) continue;
      (r[lista[i].id] = r[lista[i].id] || []).push(lista[j].id);
      (r[lista[j].id] = r[lista[j].id] || []).push(lista[i].id);
    }
  }
  return r;
}

const idHabNum = id => (typeof id === 'string' && /^h[1-9]\d{0,5}$/.test(id) ? Number(id.slice(1)) : null);
export const nombreHabitacionDefecto = k => `Habitación ${k}`;

// Id libre: 'h' + (mayor número usado + 1). Sin contador guardado: al borrar la última su id puede reutilizarse.
export function siguienteIdHabitacion(habitaciones) {
  let max = 0;
  for (const h of Array.isArray(habitaciones) ? habitaciones : []) { const n = idHabNum(h && h.id); if (n !== null && n > max) max = n; }
  return `h${max + 1}`;
}

function sanearHabitacion(h) {
  if (!esObj(h) || h.tipo !== 'habitacion') return null;
  const c = n => esNum(n) && Math.abs(n) <= PLANO_MAX_COORDENADA;
  if (!c(h.x) || !c(h.z) || !esNum(h.ancho) || !esNum(h.largo)) return null;
  const ancho = mil(h.ancho), largo = mil(h.largo);
  if (!(ancho >= HAB_LADO_MIN) || !(largo >= HAB_LADO_MIN) || ancho > HAB_LADO_MAX || largo > HAB_LADO_MAX) return null;
  const nombre = typeof h.nombre === 'string' ? h.nombre.trim().slice(0, HAB_NOMBRE_MAX).trim() : '';
  return { tipo: 'habitacion', x: mil(h.x), z: mil(h.z), ancho, largo, nombre, vanos: sanearVanos(h.vanos) };   // F4c: vanos (se emiten solo si hay)
}

// Convierte CUALQUIER valor en una lista válida de habitaciones. Nunca lanza excepción: lo inválido se descarta, los ids
// repetidos o ausentes se reasignan, el nombre vacío vuelve al valor por defecto y hay máximo 50 (se conservan las primeras
// válidas). No muta la entrada; es idempotente.
export function sanearHabitaciones(entrada) {
  try {
    if (!Array.isArray(entrada)) return [];
    const salida = [], usados = new Set(), pendientes = [];
    for (let i = 0; i < entrada.length && salida.length < HAB_MAX; i++) {
      const h = sanearHabitacion(entrada[i]);
      if (!h) continue;
      const id = entrada[i].id;
      if (idHabNum(id) !== null && !usados.has(id)) { h.id = id; usados.add(id); } else pendientes.push(h);
      salida.push(h);
    }
    let sig = Math.max(0, ...[...usados].map(idHabNum)) + 1;
    for (const h of pendientes) h.id = `h${sig++}`;
    // F4c: la clave «vanos» solo existe si la habitación tiene alguno (así lo guardado en F4b no cambia ni una clave); además hay
    // un tope global de VANO_MAX_GLOBAL vanos por plano (se conservan los primeros, en el orden de las habitaciones).
    let restantes = VANO_MAX_GLOBAL;
    return salida.map(({ id, tipo, x, z, ancho, largo, nombre, vanos }) => {
      const r = { id, tipo, x, z, ancho, largo, nombre: nombre || nombreHabitacionDefecto(idHabNum(id)) };
      const vs = Array.isArray(vanos) ? vanos.slice(0, Math.max(0, restantes)) : [];
      restantes -= vs.length;
      if (vs.length) r.vanos = vs;
      return r;
    });
  } catch (_) {
    return [];
  }
}

// Habitación bajo (x, z): primero la de borde más cercano dentro de la tolerancia (m); si no, la última cuyo interior contiene
// el punto (la dibujada después queda encima). null si ninguna.
export function habitacionEn(habitaciones, x, z, tol) {
  const lista = Array.isArray(habitaciones) ? habitaciones : [];
  let mejor = null, mejorD = Infinity;
  for (const h of lista) {
    const x2 = h.x + h.ancho, z2 = h.z + h.largo;
    const d = Math.min(
      distanciaPuntoSegmento(x, z, h.x, h.z, x2, h.z), distanciaPuntoSegmento(x, z, x2, h.z, x2, z2),
      distanciaPuntoSegmento(x, z, x2, z2, h.x, z2), distanciaPuntoSegmento(x, z, h.x, z2, h.x, h.z));
    if (d <= tol && d <= mejorD) { mejor = h; mejorD = d; }
  }
  if (mejor) return mejor;
  for (let i = lista.length - 1; i >= 0; i--) {
    const h = lista[i];
    if (x >= h.x && x <= h.x + h.ancho && z >= h.z && z <= h.z + h.largo) return h;
  }
  return null;
}

// Redimensiona desde una esquina: la esquina OPUESTA queda fija. esquina: 'no' (oeste-norte), 'ne', 'so', 'se'. (x, z) = nueva
// posición de la esquina arrastrada. Cada lado se limita a [0.1, 100] m: el arrastre se detiene en el mínimo y nunca se invierte.
export function redimensionarDesdeEsquina(hab, esquina, x, z) {
  if (!esObj(hab) || !['no', 'ne', 'so', 'se'].includes(esquina) || ![hab.x, hab.z, hab.ancho, hab.largo, x, z].every(esNum)) return null;
  const lim = v => Math.min(HAB_LADO_MAX, Math.max(HAB_LADO_MIN, v));
  const oeste = esquina === 'no' || esquina === 'so', norte = esquina === 'no' || esquina === 'ne';
  let nx = hab.x, nz = hab.z, ancho, largo;
  if (oeste) { const este = hab.x + hab.ancho; ancho = lim(este - x); nx = este - ancho; } else ancho = lim(x - hab.x);
  if (norte) largo = lim(z - hab.z); else { const norteZ = hab.z + hab.largo; largo = lim(norteZ - z); nz = norteZ - largo; }
  return { ...hab, x: mil(nx), z: mil(nz), ancho: mil(ancho), largo: mil(largo) };
}

// Plantillas de casa. Cada pieza va con su desplazamiento (dx, dz) desde la esquina mínima de la caja total; la caja se
// centra en el origen (centro del lote).
export const PLANTILLAS_HABITACIONES = Object.freeze({
  minima: Object.freeze({ etiqueta: 'Casa mínima', ancho: 6, largo: 4, piezas: Object.freeze([
    { nombre: 'Habitación 1', dx: 0, dz: 0, ancho: 6, largo: 4 }]) }),
  dos: Object.freeze({ etiqueta: 'Casa 2 ambientes', ancho: 9, largo: 4, piezas: Object.freeze([
    { nombre: 'Sala', dx: 0, dz: 0, ancho: 5, largo: 4 },
    { nombre: 'Dormitorio', dx: 5, dz: 0, ancho: 4, largo: 4 }]) }),
  tres: Object.freeze({ etiqueta: 'Casa 3 ambientes', ancho: 9, largo: 7, piezas: Object.freeze([
    { nombre: 'Sala', dx: 0, dz: 3, ancho: 5, largo: 4 },
    { nombre: 'Cocina', dx: 0, dz: 0, ancho: 3, largo: 3 },
    { nombre: 'Dormitorio', dx: 5, dz: 3, ancho: 4, largo: 4 }]) }),
});

// Habitaciones (sin id) de la plantilla, centradas en el lote. null si la plantilla no existe, el lote es inválido o la caja
// total no cabe en el lote (en ese caso no se aplica nada).
export function generarPlantilla(nombre, lote) {
  const p = Object.prototype.hasOwnProperty.call(PLANTILLAS_HABITACIONES, nombre) ? PLANTILLAS_HABITACIONES[nombre] : null;
  if (!p || !esObj(lote) || !esNum(lote.ancho) || !esNum(lote.largo)) return null;
  if (p.ancho > lote.ancho + HAB_EPS || p.largo > lote.largo + HAB_EPS) return null;
  const x0 = -p.ancho / 2, z0 = -p.largo / 2;
  return p.piezas.map(q => ({ tipo: 'habitacion', x: mil(x0 + q.dx), z: mil(z0 + q.dz), ancho: q.ancho, largo: q.largo, nombre: q.nombre }));
}

// ── F4c · Vanos (puertas y ventanas) de una habitación (funciones puras: sin DOM ni Babylon) ──
// Un vano vive DENTRO de su habitación: habitacion.vanos = [{ id:'v<k>', tipo, lado, offset, ancho, alto }].
//   · lado: 'norte' (pared de mayor z, arriba en el editor), 'sur' (menor z), 'este' (mayor x), 'oeste' (menor x).
//   · offset: distancia (m) desde el ORIGEN de la pared hasta el inicio del vano. El origen es el extremo OESTE en las paredes
//     norte y sur (offset crece con +x) y el extremo SUR en las paredes este y oeste (offset crece con +z).
//   · longitud de pared: norte y sur = habitacion.ancho; este y oeste = habitacion.largo.
// Las coordenadas son relativas a la habitación: al moverla, sus vanos van con ella. «Cabe en la pared» es un AVISO calculado
// (un vano que ya no cabe tras redimensionar la habitación se conserva); el saneado solo valida la estructura.
export const VANO_MAX_POR_HAB = 20;              // vanos por habitación (se trunca al cargar)
export const VANO_MAX_GLOBAL = 200;              // vanos por plano (se trunca al cargar)
export const VANO_ANCHO_MIN = 0.1;               // m
export const VANO_ANCHO_MAX = 100;               // m
export const VANO_ALTO_MIN = 0.1;                // m
export const VANO_ALTO_MAX = 10;                 // m
export const VANO_OFFSET_MAX = 100;              // m
export const VANO_TIPOS = Object.freeze(['puerta', 'ventana']);
export const VANO_LADOS = Object.freeze(['norte', 'sur', 'este', 'oeste']);
export const VANO_DEFECTO = Object.freeze({
  puerta: Object.freeze({ ancho: 0.8, alto: 2.1 }),
  ventana: Object.freeze({ ancho: 1, alto: 1.2 }),
});

// Longitud (m) de la pared de un lado. Entradas inválidas → 0.
export function longitudPared(hab, lado) {
  if (!esObj(hab) || !esNum(hab.ancho) || !esNum(hab.largo)) return 0;
  return lado === 'norte' || lado === 'sur' ? hab.ancho : lado === 'este' || lado === 'oeste' ? hab.largo : 0;
}

// ¿Cabe el vano en la pared de SU lado de la habitación? offset ≥ 0 y offset + ancho ≤ longitud de esa pared.
export function vanoCabeEnPared(vano, hab) {
  if (!esObj(vano) || ![vano.offset, vano.ancho].every(esNum)) return false;
  const largo = longitudPared(hab, vano.lado);
  return largo > 0 && vano.ancho > 0 && vano.offset >= -HAB_EPS && vano.offset + vano.ancho <= largo + HAB_EPS;
}

// ¿Se solapan dos vanos? Solo en la MISMA pared y con intersección de longitud positiva (compartir un extremo no cuenta).
export function vanosSeSolapan(v1, v2) {
  if (!esObj(v1) || !esObj(v2) || v1.lado !== v2.lado || !VANO_LADOS.includes(v1.lado)) return false;
  if (![v1.offset, v1.ancho, v2.offset, v2.ancho].every(esNum) || v1.ancho <= 0 || v2.ancho <= 0) return false;
  return v1.offset < v2.offset + v2.ancho - HAB_EPS && v2.offset < v1.offset + v1.ancho - HAB_EPS;
}

const idVanoNum = id => (typeof id === 'string' && /^v[1-9]\d{0,5}$/.test(id) ? Number(id.slice(1)) : null);

// Id libre dentro de la habitación: 'v' + (mayor número usado + 1).
export function siguienteIdVano(vanos) {
  let max = 0;
  for (const v of Array.isArray(vanos) ? vanos : []) { const n = idVanoNum(v && v.id); if (n !== null && n > max) max = n; }
  return `v${max + 1}`;
}

function sanearVano(v) {
  if (!esObj(v) || !VANO_TIPOS.includes(v.tipo) || !VANO_LADOS.includes(v.lado)) return null;
  if (![v.offset, v.ancho, v.alto].every(esNum)) return null;
  const offset = mil(v.offset), ancho = mil(v.ancho), alto = mil(v.alto);
  if (offset < 0 || offset > VANO_OFFSET_MAX) return null;
  if (!(ancho >= VANO_ANCHO_MIN) || ancho > VANO_ANCHO_MAX || !(alto >= VANO_ALTO_MIN) || alto > VANO_ALTO_MAX) return null;
  return { tipo: v.tipo, lado: v.lado, offset, ancho, alto };
}

// Convierte CUALQUIER valor en una lista válida de vanos. Nunca lanza excepción. Solo valida la ESTRUCTURA (tipo, lado, números
// finitos y dentro de rango): un vano que no cabe en la pared NO se descarta. Los ids repetidos o ausentes se reasignan, se
// eliminan los campos extra y hay máximo VANO_MAX_POR_HAB (se conservan los primeros válidos). No muta la entrada; es idempotente.
export function sanearVanos(entrada) {
  try {
    if (!Array.isArray(entrada)) return [];
    const salida = [], usados = new Set(), pendientes = [];
    for (let i = 0; i < entrada.length && salida.length < VANO_MAX_POR_HAB; i++) {
      const v = sanearVano(entrada[i]);
      if (!v) continue;
      const id = entrada[i].id;
      if (idVanoNum(id) !== null && !usados.has(id)) { v.id = id; usados.add(id); } else pendientes.push(v);
      salida.push(v);
    }
    let sig = Math.max(0, ...[...usados].map(idVanoNum)) + 1;
    for (const v of pendientes) v.id = `v${sig++}`;
    return salida.map(({ id, tipo, lado, offset, ancho, alto }) => ({ id, tipo, lado, offset, ancho, alto }));
  } catch (_) {
    return [];
  }
}

// Extremos (m, mundo) del vano sobre la pared de su habitación. null si los datos no son válidos.
export function segmentoVano(hab, vano) {
  if (!esObj(hab) || !esObj(vano) || ![hab.x, hab.z, hab.ancho, hab.largo, vano.offset, vano.ancho].every(esNum)) return null;
  const { x, z, ancho: A, largo: L } = hab, o = vano.offset, a = vano.ancho;
  switch (vano.lado) {
    case 'norte': return { x1: mil(x + o), z1: mil(z + L), x2: mil(x + o + a), z2: mil(z + L) };
    case 'sur': return { x1: mil(x + o), z1: mil(z), x2: mil(x + o + a), z2: mil(z) };
    case 'este': return { x1: mil(x + A), z1: mil(z + o), x2: mil(x + A), z2: mil(z + o + a) };
    case 'oeste': return { x1: mil(x), z1: mil(z + o), x2: mil(x), z2: mil(z + o + a) };
    default: return null;
  }
}

// Posición (m) de (x, z) a lo largo de la pared de un lado, medida desde el origen de esa pared.
export function posicionEnPared(hab, lado, x, z) {
  if (!esObj(hab) || ![hab.x, hab.z, x, z].every(esNum)) return null;
  return lado === 'norte' || lado === 'sur' ? mil(x - hab.x) : mil(z - hab.z);
}

// Pared de la habitación más cercana a (x, z) dentro de la tolerancia (m): { lado, pos, distancia } (pos = posicionEnPared). null si ninguna.
export function paredMasCercana(hab, x, z, tol) {
  if (!esObj(hab) || ![hab.x, hab.z, hab.ancho, hab.largo, x, z, tol].every(esNum)) return null;
  const x2 = hab.x + hab.ancho, z2 = hab.z + hab.largo;
  const paredes = { norte: [hab.x, z2, x2, z2], sur: [hab.x, hab.z, x2, hab.z], este: [x2, hab.z, x2, z2], oeste: [hab.x, hab.z, hab.x, z2] };
  let lado = null, mejor = Infinity;
  for (const k of VANO_LADOS) {
    const d = distanciaPuntoSegmento(x, z, ...paredes[k]);
    if (d !== null && d <= tol && d < mejor - 1e-9) { lado = k; mejor = d; }
  }
  return lado ? { lado, pos: posicionEnPared(hab, lado, x, z), distancia: mil(mejor) } : null;
}

// Offset de un vano de 'ancho' centrado en 'centro' (m desde el origen de la pared). Con paso > 0 el INICIO del vano se ajusta
// a la rejilla (en coordenadas del mundo) y siempre se limita a [0, longitud − ancho]. null si el vano no cabe ni en toda la pared.
export function offsetParaVano(hab, lado, ancho, centro, paso = 0) {
  const largo = longitudPared(hab, lado);
  if (!(largo > 0) || !esNum(ancho) || !(ancho > 0) || ancho > largo + HAB_EPS || !esNum(centro)) return null;
  const o0 = lado === 'norte' || lado === 'sur' ? hab.x : hab.z;
  let inicio = centro - ancho / 2;
  if (esNum(paso) && paso > 0) inicio = ajustarARejilla(o0 + inicio, paso) - o0;
  return mil(Math.max(0, Math.min(largo - ancho, inicio)));
}

// Vano nuevo (sin id) con las medidas por defecto de su tipo, o null si no cabe en esa pared.
export function vanoNuevo(hab, tipo, lado, centro, paso = 0) {
  const d = VANO_DEFECTO[tipo];
  if (!d) return null;
  const offset = offsetParaVano(hab, lado, d.ancho, centro, paso);
  return offset === null ? null : { tipo, lado, offset, ancho: d.ancho, alto: d.alto };
}

// Offset de un vano al arrastrarlo 'delta' metros a lo largo de su pared (con imán si paso > 0), limitado a [0, longitud − ancho].
export function desplazarVano(hab, vano, delta, paso = 0) {
  const largo = longitudPared(hab, vano && vano.lado);
  if (!(largo > 0) || !esNum(delta) || !esNum(vano.offset) || !esNum(vano.ancho)) return null;
  const o0 = vano.lado === 'norte' || vano.lado === 'sur' ? hab.x : hab.z;
  let o = vano.offset + delta;
  if (esNum(paso) && paso > 0) o = ajustarARejilla(o0 + o, paso) - o0;
  return mil(Math.max(0, Math.min(Math.max(0, largo - vano.ancho), o)));
}

function distanciaAVano(hab, vano, x, z) {
  const s = segmentoVano(hab, vano);
  return s ? distanciaPuntoSegmento(x, z, s.x1, s.z1, s.x2, s.z2) : null;
}

// Vano de UNA habitación bajo (x, z) dentro de la tolerancia (m): el más cercano; a igual distancia, el último. null si ninguno.
export function vanoEn(hab, x, z, tol) {
  let mejor = null, mejorD = Infinity;
  for (const v of esObj(hab) && Array.isArray(hab.vanos) ? hab.vanos : []) {
    const d = distanciaAVano(hab, v, x, z);
    if (d !== null && d <= tol && d <= mejorD) { mejor = v; mejorD = d; }
  }
  return mejor;
}

// Vano bajo (x, z) entre TODAS las habitaciones: { hab, vano } o null (el más cercano; a igual distancia, el de la última habitación).
export function vanoEnHabitaciones(habitaciones, x, z, tol) {
  let mejor = null, mejorD = Infinity;
  for (const h of Array.isArray(habitaciones) ? habitaciones : []) {
    for (const v of esObj(h) && Array.isArray(h.vanos) ? h.vanos : []) {
      const d = distanciaAVano(h, v, x, z);
      if (d !== null && d <= tol && d <= mejorD) { mejor = { hab: h, vano: v }; mejorD = d; }
    }
  }
  return mejor;
}

// Avisos de los vanos de una habitación: { [id]: { fuera, solapa: [ids] } } (fuera = no cabe en su pared).
export function estadoVanos(hab) {
  const lista = esObj(hab) && Array.isArray(hab.vanos) ? hab.vanos : [];
  const r = {};
  for (const v of lista) {
    r[v.id] = { fuera: !vanoCabeEnPared(v, hab), solapa: lista.filter(o => o !== v && vanosSeSolapan(v, o)).map(o => o.id) };
  }
  return r;
}

// Número total de vanos de una lista de habitaciones.
export function totalVanos(habitaciones) {
  let n = 0;
  for (const h of Array.isArray(habitaciones) ? habitaciones : []) if (esObj(h) && Array.isArray(h.vanos)) n += h.vanos.length;
  return n;
}

export const nombreVano = v => `${v && v.tipo === 'ventana' ? 'Ventana' : 'Puerta'} ${v ? v.id : ''}`.trim();

// ── F4d · Materialización del plano en 3D (funciones puras: sin DOM ni Babylon) ──
// Convierte las habitaciones (y sus vanos) en paredes con huecos, SIN CSG: cada pared es un conjunto de rectángulos sólidos
// alrededor de los huecos. Coordenadas del mundo en metros (X = este, Z = norte; origen = centro del lote). Cada pared es un
// segmento alineado a un eje: orientacion 'h' (corre a lo largo de X, z fija) o 'v' (corre a lo largo de Z, x fija). Dentro de una
// pared se usa la coordenada local u (m) medida desde su extremo mínimo (x1 o z1) y la altura y (m) desde el suelo.
export const PARED_ALTURA_DEFECTO = 2.8;       // m
export const PARED_GROSOR_DEFECTO = 0.15;      // m (mismo grosor en paredes exteriores e interiores)
export const PARED_ALFEIZAR_DEFECTO = 1.0;     // m: altura del borde inferior de una ventana
export const PARED_ALTURA_MIN = 0.5, PARED_ALTURA_MAX = 10;
export const PARED_GROSOR_MIN = 0.02, PARED_GROSOR_MAX = 1;
export const PARED_RECT_AVISO = 1000;          // rectángulos sólidos a partir de los cuales se avisa de que puede ser lento
export const MATERIALIZADO_VERSION = 1;
const PARED_EPS = 1e-6;

// Parámetros válidos (los inválidos vuelven a su valor por defecto; el alféizar nunca supera la altura).
export function opcionesParedes(op) {
  const o = esObj(op) ? op : {};
  const altura = esNum(o.altura) && o.altura >= PARED_ALTURA_MIN && o.altura <= PARED_ALTURA_MAX ? mil(o.altura) : PARED_ALTURA_DEFECTO;
  const grosor = esNum(o.grosor) && o.grosor >= PARED_GROSOR_MIN && o.grosor <= PARED_GROSOR_MAX ? mil(o.grosor) : PARED_GROSOR_DEFECTO;
  const alf = esNum(o.alfeizar) && o.alfeizar >= 0 && o.alfeizar < altura ? mil(o.alfeizar) : Math.min(PARED_ALFEIZAR_DEFECTO, mil(altura / 2));
  return { altura, grosor, alfeizar: alf };
}

const habValida = h => esObj(h) && typeof h.id === 'string' && [h.x, h.z, h.ancho, h.largo].every(esNum) && h.ancho > 0 && h.largo > 0;

// Paredes (aristas de las habitaciones) con las habitaciones que las comparten. Una arista se parte donde cambia el conjunto de
// habitaciones que la tienen, así que una pared compartida es UNA sola pared física con habitaciones: [id1, id2] (o más si las
// habitaciones se solapan). Devuelve [{ orientacion, x1, z1, x2, z2, habitaciones: [ids] }] ordenadas (h antes que v).
export function detectarParedesCompartidas(habitaciones) {
  const habs = (Array.isArray(habitaciones) ? habitaciones : []).filter(habValida);
  const lineas = new Map();                         // 'h|z' o 'v|x' → aristas { a, b, idx }
  const poner = (o, c, a, b, idx) => {
    const k = `${o}|${mil(c)}`;
    if (!lineas.has(k)) lineas.set(k, { o, c: mil(c), aristas: [] });
    lineas.get(k).aristas.push({ a: mil(a), b: mil(b), idx });
  };
  habs.forEach((h, idx) => {
    poner('h', h.z, h.x, h.x + h.ancho, idx);
    poner('h', h.z + h.largo, h.x, h.x + h.ancho, idx);
    poner('v', h.x, h.z, h.z + h.largo, idx);
    poner('v', h.x + h.ancho, h.z, h.z + h.largo, idx);
  });
  const salida = [];
  for (const { o, c, aristas } of lineas.values()) {
    const cortes = [...new Set(aristas.flatMap(e => [e.a, e.b]))].sort((p, q) => p - q);
    let abierta = null;
    const cerrar = () => { if (abierta) { salida.push(abierta); abierta = null; } };
    for (let i = 0; i + 1 < cortes.length; i++) {
      const p = cortes[i], q = cortes[i + 1];
      const dueños = [...new Set(aristas.filter(e => e.a <= p + PARED_EPS && e.b >= q - PARED_EPS).map(e => e.idx))].sort((m, n) => m - n);
      if (!dueños.length) { cerrar(); continue; }
      const ids = dueños.map(k => habs[k].id);
      if (abierta && abierta.fin === p && abierta.ids.join() === ids.join()) { abierta.fin = q; continue; }
      cerrar();
      abierta = { o, c, ini: p, fin: q, ids };
    }
    cerrar();
  }
  salida.sort((m, n) => (m.o === n.o ? (m.c - n.c) || (m.ini - n.ini) : (m.o === 'h' ? -1 : 1)));
  return salida.map(w => (w.o === 'h'
    ? { orientacion: 'h', x1: w.ini, z1: w.c, x2: w.fin, z2: w.c, habitaciones: w.ids }
    : { orientacion: 'v', x1: w.c, z1: w.ini, x2: w.c, z2: w.fin, habitaciones: w.ids }));
}

// Hueco (m) que un vano abre en una pared: { vano, hab, tipo, u0, u1, y0, y1, recortado } o null si no la cruza.
// Orientación de F4c: norte = mayor z; offset crece con +x en norte/sur y con +z en este/oeste (segmentoVano). La puerta va desde el
// suelo (y = 0) hasta su alto; la ventana va elevada (desde el alféizar). Todo se recorta a la pared y a su altura.
export function vanoA3D(vano, habitacion, pared) {
  if (!esObj(vano) || !esObj(habitacion) || !esObj(pared) || !Array.isArray(pared.habitaciones)) return null;
  if (!pared.habitaciones.includes(habitacion.id) || !esNum(vano.alto)) return null;
  const sg = segmentoVano(habitacion, vano);
  if (!sg) return null;
  const horizontal = sg.z1 === sg.z2;
  let u0, u1;
  if (horizontal) {
    if (pared.orientacion !== 'h' || Math.abs(sg.z1 - pared.z1) > PARED_EPS) return null;
    u0 = sg.x1 - pared.x1; u1 = sg.x2 - pared.x1;
  } else {
    if (pared.orientacion !== 'v' || Math.abs(sg.x1 - pared.x1) > PARED_EPS) return null;
    u0 = sg.z1 - pared.z1; u1 = sg.z2 - pared.z1;
  }
  const L = horizontal ? pared.x2 - pared.x1 : pared.z2 - pared.z1;
  const a0 = Math.max(0, u0), a1 = Math.min(L, u1);
  if (!(a1 - a0 > PARED_EPS)) return null;
  const H = pared.altura, alf = esNum(pared.alfeizar) ? pared.alfeizar : PARED_ALFEIZAR_DEFECTO;
  const y0 = vano.tipo === 'ventana' ? alf : 0;
  const y1 = Math.min(H, y0 + vano.alto);
  if (!(y1 - y0 > PARED_EPS)) return null;
  const recortado = a0 !== u0 || a1 !== u1 || y1 !== y0 + vano.alto;
  return { vano: vano.id, hab: habitacion.id, tipo: vano.tipo, u0: mil(a0), u1: mil(a1), y0: mil(y0), y1: mil(y1), recortado };
}

// Paredes 3D de un conjunto de habitaciones: [{ id, orientacion, x1, z1, x2, z2, longitud, altura, grosor, alfeizar, ini, fin,
// habitaciones, huecos }]. La pared va centrada en la arista. Esquinas sin solape de volumen: una pared horizontal se alarga
// grosor/2 en los extremos de su cadena (esquinas) y una vertical se acorta grosor/2 donde toca una horizontal; (ini, fin) son esos
// ajustes (m) respecto a [0, longitud]. Los huecos de las dos habitaciones de una pared compartida se unen en la misma pared.
export function generarParedes3D(habitaciones, opciones) {
  const op = opcionesParedes(opciones);
  const habs = (Array.isArray(habitaciones) ? habitaciones : []).filter(habValida);
  const base = detectarParedesCompartidas(habs);
  const mitad = mil(op.grosor / 2);
  const hor = base.filter(w => w.orientacion === 'h');
  const igual = (m, n) => Math.abs(m - n) <= PARED_EPS;
  const hayH = (x, z) => hor.some(w => igual(w.z1, z) && x >= w.x1 - PARED_EPS && x <= w.x2 + PARED_EPS);
  const continua = (w, extremo) => hor.some(o => o !== w && igual(o.z1, w.z1) && (extremo === 'ini' ? igual(o.x2, w.x1) : igual(o.x1, w.x2)));
  return base.map((w, i) => {
    const longitud = mil(w.orientacion === 'h' ? w.x2 - w.x1 : w.z2 - w.z1);
    let ini, fin;
    if (w.orientacion === 'h') {
      ini = continua(w, 'ini') ? 0 : mitad;
      fin = continua(w, 'fin') ? 0 : mitad;
    } else {
      ini = hayH(w.x1, w.z1) ? -mitad : 0;
      fin = hayH(w.x2, w.z2) ? -mitad : 0;
    }
    const pared = { id: `p${i + 1}`, ...w, longitud, altura: op.altura, grosor: op.grosor, alfeizar: op.alfeizar, ini, fin, huecos: [] };
    for (const hid of w.habitaciones) {
      const h = habs.find(x => x.id === hid);
      for (const v of Array.isArray(h.vanos) ? h.vanos : []) {
        const hueco = vanoA3D(v, h, pared);
        if (hueco) pared.huecos.push(hueco);
      }
    }
    return pared;
  });
}

// Rectángulos sólidos de una pared alrededor de sus huecos (sin CSG): [{ u0, u1, y0, y1 }]. Barrida por franjas: se parte la
// pared en todos los bordes de huecos; en cada franja lo sólido es el complemento de la unión de los huecos que la cubren; las
// franjas contiguas con el mismo sólido se funden. Así los huecos solapados (aun a distinta altura) nunca dan rectángulos inválidos.
// Una puerta desde el suelo da 3 rectángulos (izquierda, derecha, dintel); una ventana elevada, 4.
export function generarParedConHuecos(pared) {
  if (!esObj(pared) || ![pared.longitud, pared.altura].every(esNum) || !(pared.longitud > 0) || !(pared.altura > 0)) return [];
  const H = pared.altura;
  const a0 = -(esNum(pared.ini) ? pared.ini : 0), a1 = pared.longitud + (esNum(pared.fin) ? pared.fin : 0);
  if (!(a1 - a0 > PARED_EPS)) return [];
  const huecos = (Array.isArray(pared.huecos) ? pared.huecos : []).map(h => ({
    u0: Math.max(h.u0, a0), u1: Math.min(h.u1, a1), y0: Math.max(h.y0, 0), y1: Math.min(h.y1, H),
  })).filter(h => [h.u0, h.u1, h.y0, h.y1].every(esNum) && h.u1 - h.u0 > PARED_EPS && h.y1 - h.y0 > PARED_EPS);
  const cortes = [...new Set([a0, a1, ...huecos.flatMap(h => [h.u0, h.u1])].map(mil))].sort((p, q) => p - q);
  const salida = [];
  let abiertas = new Map();
  for (let i = 0; i + 1 < cortes.length; i++) {
    const p = cortes[i], q = cortes[i + 1];
    const cubren = huecos.filter(h => h.u0 <= p + PARED_EPS && h.u1 >= q - PARED_EPS).sort((m, n) => m.y0 - n.y0);
    const solidos = [];
    let y = 0;
    for (const h of cubren) {
      if (h.y0 > y + PARED_EPS) solidos.push([y, h.y0]);
      y = Math.max(y, h.y1);
    }
    if (H > y + PARED_EPS) solidos.push([y, H]);
    const nuevas = new Map();
    for (const [y0, y1] of solidos) {
      const k = `${mil(y0)}|${mil(y1)}`;
      const previa = abiertas.get(k);
      if (previa && previa.u1 === p) { previa.u1 = q; nuevas.set(k, previa); continue; }
      const r = { u0: p, u1: q, y0: mil(y0), y1: mil(y1) };
      salida.push(r);
      nuevas.set(k, r);
    }
    abiertas = nuevas;
  }
  return salida;
}

// Total de rectángulos sólidos de un conjunto de paredes.
export const contarRectangulos = paredes => (Array.isArray(paredes) ? paredes : []).reduce((n, p) => n + generarParedConHuecos(p).length, 0);

// Resumen de una materialización: paredes, rectángulos, vanos con hueco, vanos recortados y vanos sin ningún hueco (totalmente fuera).
export function resumirMaterializacion(habitaciones, paredes) {
  const lista = Array.isArray(paredes) ? paredes : [];
  const conHueco = new Set(), recortados = new Set();
  for (const p of lista) for (const h of p.huecos || []) {
    conHueco.add(`${h.hab}/${h.vano}`);
    if (h.recortado) recortados.add(`${h.hab}/${h.vano}`);
  }
  const total = totalVanos((Array.isArray(habitaciones) ? habitaciones : []).filter(esObj));
  return { paredes: lista.length, rectangulos: contarRectangulos(lista), vanos: conHueco.size, recortados: recortados.size, sinHueco: Math.max(0, total - conHueco.size) };
}

// Descarta las paredes inválidas (orientación, extremos, medidas, habitaciones, huecos) y reasigna los ids p1…pN.
export function sanearParedes(paredes) {
  try {
    if (!Array.isArray(paredes)) return [];
    const salida = [];
    for (const p of paredes) {
      if (!esObj(p) || (p.orientacion !== 'h' && p.orientacion !== 'v')) continue;
      if (![p.x1, p.z1, p.x2, p.z2, p.altura, p.grosor].every(esNum) || !(p.altura > 0) || !(p.grosor > 0)) continue;
      const h = p.orientacion === 'h';
      if (h ? !(p.z1 === p.z2 && p.x2 > p.x1) : !(p.x1 === p.x2 && p.z2 > p.z1)) continue;
      if (!Array.isArray(p.habitaciones) || !p.habitaciones.length || !p.habitaciones.every(x => typeof x === 'string')) continue;
      const huecos = (Array.isArray(p.huecos) ? p.huecos : []).filter(k => esObj(k) && [k.u0, k.u1, k.y0, k.y1].every(esNum) && k.u1 > k.u0 && k.y1 > k.y0);
      salida.push({
        id: `p${salida.length + 1}`, orientacion: p.orientacion, x1: p.x1, z1: p.z1, x2: p.x2, z2: p.z2,
        longitud: mil(h ? p.x2 - p.x1 : p.z2 - p.z1), altura: p.altura, grosor: p.grosor,
        alfeizar: esNum(p.alfeizar) ? p.alfeizar : PARED_ALFEIZAR_DEFECTO, ini: esNum(p.ini) ? p.ini : 0, fin: esNum(p.fin) ? p.fin : 0,
        habitaciones: p.habitaciones.slice(), huecos,
      });
    }
    return salida;
  } catch (_) {
    return [];
  }
}

// Snapshot compacto de lo materializado (progreso.plano.materializado): solo lo necesario para regenerar las paredes. Cada habitación
// es [id, x, z, ancho, largo, vanos] y cada vano [tipo, lado, offset, ancho, alto]. Los nombres y los ids de vano no se guardan.
export function compactarMaterializado(habitaciones, opciones) {
  const op = opcionesParedes(opciones);
  const habs = sanearHabitaciones((Array.isArray(habitaciones) ? habitaciones : []).map(h => (esObj(h) ? { ...h, tipo: 'habitacion' } : h)));
  return {
    v: MATERIALIZADO_VERSION, altura: op.altura, grosor: op.grosor, alfeizar: op.alfeizar,
    habitaciones: habs.map(h => [h.id, h.x, h.z, h.ancho, h.largo, (h.vanos || []).map(v => [v.tipo, v.lado, v.offset, v.ancho, v.alto])]),
  };
}

// Inversa: { habitaciones (con vanos), opciones } a partir de un snapshot YA saneado.
export function expandirMaterializado(mat) {
  const habitaciones = (mat.habitaciones || []).map(([id, x, z, ancho, largo, vanos]) => {
    const h = { id, tipo: 'habitacion', x, z, ancho, largo, nombre: id };
    if (vanos.length) h.vanos = vanos.map(([tipo, lado, offset, anc, alto], i) => ({ id: `v${i + 1}`, tipo, lado, offset, ancho: anc, alto }));
    return h;
  });
  return { habitaciones, opciones: { altura: mat.altura, grosor: mat.grosor, alfeizar: mat.alfeizar } };
}

// Convierte CUALQUIER valor en un snapshot válido o null (sin habitaciones válidas, versión desconocida o no es un objeto). Nunca lanza.
// Los parámetros inválidos vuelven a su valor por defecto; las habitaciones y vanos inválidos se descartan (mismos topes que el plano).
export function sanearMaterializado(entrada) {
  try {
    if (!esObj(entrada) || entrada.v !== MATERIALIZADO_VERSION || !Array.isArray(entrada.habitaciones)) return null;
    const habs = entrada.habitaciones.map(f => {
      if (!Array.isArray(f) || f.length < 5) return null;
      const [id, x, z, ancho, largo, vanos] = f;
      return {
        id, tipo: 'habitacion', x, z, ancho, largo,
        vanos: (Array.isArray(vanos) ? vanos : []).map(a => (Array.isArray(a) ? { tipo: a[0], lado: a[1], offset: a[2], ancho: a[3], alto: a[4] } : null)),
      };
    });
    const limpias = sanearHabitaciones(habs);
    if (!limpias.length) return null;
    return compactarMaterializado(limpias, { altura: entrada.altura, grosor: entrada.grosor, alfeizar: entrada.alfeizar });
  } catch (_) {
    return null;
  }
}
