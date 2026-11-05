// src/scripts/calculos.js
// Cálculos PUROS del simulador: reciben números y devuelven números.
// No usan el DOM, Babylon.js ni estado global, así que se pueden probar en Node.
//
// Fase 1: cada función es una copia literal de la fórmula que estaba dentro de casa.js.
// casa.js la usa mediante una delegación; la fórmula original queda comentada junto a
// cada delegación como respaldo. No se cambia ninguna regla ni resultado.

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
