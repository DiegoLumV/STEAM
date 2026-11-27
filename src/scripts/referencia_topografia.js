// src/scripts/referencia_topografia.js
// F5 · Replanteo básico — constantes de topografía con su fuente.
//
// Mismo esquema que referencia.js (que NO se toca): datos puros, sin DOM, sin Babylon.js, sin estado global, todo congelado.
//   { valor, unidad, fuente: { documento, tabla, pagina_impresa, pagina_pdf }, es_estimacion, derivado, nota, formula?, criterio_educativo? }
//   · es_estimacion: true → dato que NO proviene de la fuente (límite propio del simulador).
// Fuente única de F5: Zamarripa Medina (2012), «Apuntes de Topografía». La página impresa coincide con la del PDF (p. 16 y p. 19 verificadas).

export const DOCUMENTO_TOPOGRAFIA = 'Apuntes de Topografía — Ing. Manuel Zamarripa Medina (2012)';

const congelar = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(congelar); Object.freeze(o); }
  return o;
};
const fuente = (tabla, pagina) => ({ documento: DOCUMENTO_TOPOGRAFIA, tabla, pagina_impresa: pagina, pagina_pdf: pagina });
const c = (valor, unidad, f, extra = {}) => ({ valor, unidad, fuente: f, es_estimacion: false, derivado: false, nota: '', ...extra });

const T_TOLERANCIAS = 'Tolerancias en la medición de distancias con cinta';
const T_345 = 'Trazado de líneas perpendiculares con cinta · Método 3-4-5';

export const TOPOGRAFIA = congelar({
  // p. 19: terreno PLANO → error relativo (precisión) 1/5000 y tolerancia T = D·ER, con D el valor más probable de la distancia medida.
  ER_TERRENO_PLANO: c(1 / 5000, 'adimensional (error relativo)', fuente(T_TOLERANCIAS, 19), {
    nota: 'Terreno plano. El simulador trabaja siempre en terreno plano (P3 de F5).',
    formula: 'T = D · ER',
    criterio_educativo: 'Si E < T se acepta la medición; si E > T debe repetirse la medición (misma página).',
  }),
  // p. 19: documentada para fases posteriores; F5 no la usa.
  ER_TERRENO_ACCIDENTADO: c(1 / 3000, 'adimensional (error relativo)', fuente(T_TOLERANCIAS, 19), {
    nota: 'Terreno accidentado. Documentada, no se usa en F5.',
  }),
  // p. 16: «lados de 3, 4 y 5 m o múltiplos de ellos»; todo triángulo con lados en proporción 3-4-5 es rectángulo.
  ESCUADRA_CATETO_MENOR: c(3, 'm (o múltiplo entero)', fuente(T_345, 16)),
  ESCUADRA_CATETO_MAYOR: c(4, 'm (o múltiplo entero)', fuente(T_345, 16)),
  ESCUADRA_HIPOTENUSA: c(5, 'm (o múltiplo entero)', fuente(T_345, 16), {
    derivado: true, formula: '√(3² + 4²) = 5',
    criterio_educativo: 'Con lados en proporción 3-4-5 el ángulo entre los catetos es recto; si la hipotenusa medida difiere de 5·k, el ángulo no es de 90°.',
  }),
  // Límite propio del simulador (no de la fuente): una estaca se coloca con un error máximo de ±1000 mm respecto de su esquina teórica.
  DESVIACION_MAX_MM: c(1000, 'mm', { documento: 'Simulador STEAM (F5)', tabla: '—', pagina_impresa: null, pagina_pdf: null }, {
    es_estimacion: true, nota: 'Tope didáctico para evitar valores sin sentido al escribir la desviación de una estaca (condición C1).',
  }),
});

export const ER_PLANO = TOPOGRAFIA.ER_TERRENO_PLANO.valor;
export const TEXTO_FORMULA_T = 'T = D × ER, con ER = 1/5000 (Zamarripa, 2012, p. 19)';
export const TEXTO_CRITERIO = 'Si E ≤ T se acepta la medición; si E > T debe repetirse (Zamarripa, 2012, p. 19).';
export const TEXTO_345 = 'Escuadra 3-4-5: lados de 3, 4 y 5 m o múltiplos enteros (Zamarripa, 2012, p. 16).';
