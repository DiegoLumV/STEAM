// src/scripts/referencia_cimentacion.js
// F6a · Zanjas de cimentación — constantes con su fuente.
//
// Mismo esquema que referencia.js y referencia_topografia.js (que NO se tocan): datos puros, sin DOM, sin Babylon.js, sin estado global, todo congelado.
//   { valor, unidad, fuente: { documento, tabla, pagina_impresa, pagina_pdf }, es_estimacion, es_interpretacion, derivado, nota, formula?, criterio_educativo? }
//   · es_estimacion: true → dato que NO proviene de la fuente (límite propio del simulador). No se presenta como diseño estructural validado.
//   · es_interpretacion: true → dato que sale de combinar citas de la fuente; la lectura es nuestra (se declara en `nota`).
// Fuente principal: NSR-10, Título E «Casas de uno y dos pisos» (el PDF del proyecto; páginas del PDF y numeración impresa E-n).
// Apoyo (no fijan medidas): Yepes (2020), Calavera (INTEMAC, 4.ª ed.). Cuando discrepan con la NSR-10 manda la NSR-10 (normativa colombiana, D2 de la auditoría v7).

export const DOCUMENTO_NSR = 'NSR-10 — Título E: Casas de uno y dos pisos (Reglamento Colombiano de Construcción Sismo Resistente)';
export const DOCUMENTO_YEPES = 'Yepes Piqueras, V. (2020). Procedimientos de construcción de cimentaciones y estructuras de contención (2.ª ed.), Editorial UPV';
export const DOCUMENTO_CALAVERA = 'Calavera, J. Cálculo de estructuras de cimentación (4.ª ed.), INTEMAC';
const DOC_SIMULADOR = 'Simulador STEAM (F6a)';

const congelar = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(congelar); Object.freeze(o); }
  return o;
};
const fuente = (documento, tabla, impresa, pdf) => ({ documento, tabla, pagina_impresa: impresa, pagina_pdf: pdf });
const nsr = (tabla, impresa, pdf) => fuente(DOCUMENTO_NSR, tabla, impresa, pdf);
const c = (valor, unidad, f, extra = {}) => ({ valor, unidad, fuente: f, es_estimacion: false, es_interpretacion: false, derivado: false, nota: '', ...extra });

const T_TABLA = 'Tabla E.2.2-1 — Valores mínimos para dimensiones, resistencia de materiales y refuerzo de cimentaciones';

export const CIMENTACION = congelar({
  // ── Tabla E.2.2-1 (mampostería): anchura y altura mínimas de la viga de cimentación ──
  ANCHO_VIGA_1P: c(0.25, 'm', nsr(T_TABLA, 'E-8', 14), { nota: 'Mampostería, un piso: 250 mm. La zanja se excava con el ancho de la viga (Yepes 2020, PDF p. 30: «se hormigonará a sección de excavación completa» si las paredes son coherentes).' }),
  ANCHO_VIGA_2P: c(0.30, 'm', nsr(T_TABLA, 'E-8', 14), { nota: 'Mampostería, dos pisos: 300 mm.' }),
  ALTURA_VIGA_1P: c(0.20, 'm', nsr(T_TABLA, 'E-8', 14), { nota: 'Mampostería, un piso: 200 mm. Documentada para F6b; F6a no la usa.' }),
  ALTURA_VIGA_2P: c(0.30, 'm', nsr(T_TABLA, 'E-8', 14), { nota: 'Mampostería, dos pisos: 300 mm. Documentada para F6b; F6a no la usa.' }),
  // ── Profundidad ──
  PROF_MIN_VIGA: c(0.50, 'm', nsr('E.2.2.4 — Sobrecimientos', 'E-9', 15), {
    nota: 'El nivel inferior de las vigas de cimentación debe estar a una profundidad mínima de 500 mm por debajo del nivel de acabado del primer piso. Apoyo: Yepes (2020, PDF p. 29): «la excavación deberá estar de 0,5 a 0,8 por debajo de la rasante».',
  }),
  MORTERO_LIMPIEZA: c(0.04, 'm', nsr('E.6.2.2 — Zanjas', 'E-21', 27), {
    nota: 'Del fondo de las zanjas se retira el material suelto y se coloca un mortero pobre de limpieza de unos 40 mm de espesor. (Yepes y Calavera piden 100 mm de hormigón de limpieza; aquí manda la NSR-10.)',
  }),
  PROF_DEFECTO: c(0.54, 'm', nsr('E.2.2.4 + E.6.2.2', 'E-9 y E-21', 15), {
    derivado: true, es_interpretacion: true, formula: '0.50 + 0.04',
    nota: 'INTERPRETACIÓN: la NSR-10 no dice si los 500 mm incluyen el mortero de limpieza; se toma el criterio conservador (viga a 0.50 m más 0.04 m de mortero debajo). La profundidad es editable y los avisos no bloquean.',
  }),
  // ── Avisos de configuración en planta (E.2.1.5) y juntas (E.2.4.1) ──
  ESBELTEZ_ANILLO_MAX: c(2, 'adimensional (largo/ancho)', nsr('E.2.1.5 — Configuración en planta', 'E-8', 14), {
    criterio_educativo: 'Si un anillo del sistema de cimentación tiene largo/ancho mayor que 2, debe construirse una viga intermedia de cimentación.',
  }),
  DIM_INTERIOR_MAX: c(4.0, 'm', nsr('E.2.1.5 — Configuración en planta', 'E-8', 14), {
    nota: 'Si las dimensiones interiores del anillo son mayores de 4,0 m, debe construirse una viga intermedia. «Interior» se toma como el lado de la habitación menos el ancho de la viga (interpretación).',
    es_interpretacion: true,
  }),
  VIGA_INTERMEDIA_MIN: c(0.20, 'm', nsr('E.2.1.5 — Configuración en planta', 'E-8', 14), { nota: 'La viga intermedia puede reducirse a 200 mm × 200 mm. Documentada para F6b; F6a no la dibuja.' }),
  JUNTA_MAX: c(30, 'm', nsr('E.2.4.1 — Juntas', 'E-10', 16), {
    criterio_educativo: 'La cimentación debe contener juntas a distancias no mayores de 30 m, salvo estudio geotécnico completo (Título H).',
  }),
  // ── Concreto ciclópeo bajo la viga (E.2.2.4.2): documentado para F6b ──
  CICLOPEO_PROF_ESTRATO: c(0.70, 'm', nsr('E.2.2.4.2', 'E-9', 15), { nota: 'Si el estrato competente está a más de 700 mm la viga puede apoyarse en un relleno ciclópeo (≥ 300 mm de ancho, ≥ 200 mm de alto, ≤ 40 % de piedra). Documentada para F6b; F6a no la usa.' }),
  // ── Límites propios del simulador (NO de la fuente) ──
  PROF_MIN_TECNICA: c(0.10, 'm', fuente(DOC_SIMULADOR, '—', null, null), { es_estimacion: true, nota: 'Límite de la herramienta: por debajo no se acepta la profundidad escrita (un valor menor que 0.50 m sí se acepta y avisa).' }),
  PROF_MAX_TECNICA: c(3.0, 'm', fuente(DOC_SIMULADOR, '—', null, null), { es_estimacion: true, nota: 'Límite de la herramienta (la fosa de F3 admite hasta 5 m).' }),
  TERRENO_MEDIO_LADO: c(13, 'm', fuente(DOC_SIMULADOR, 'Geometría de la escena (F3)', null, null), { es_estimacion: true, nota: 'El terreno visible va de −13 a 13 m; la zona verde, de −10 a 10 m. Lo que quede fuera de ±13 m no tiene terreno que abrir.' }),
  ZONA_MEDIO_LADO: c(10, 'm', fuente(DOC_SIMULADOR, 'Geometría de la escena (F3)', null, null), { es_estimacion: true }),
});

export const PISOS_VALIDOS = Object.freeze([1, 2]);
export const TEXTO_FUENTE_ANCHO = 'Ancho de la zanja = ancho de la viga de cimentación (NSR-10, Tabla E.2.2-1, p. E-8): 250 mm un piso, 300 mm dos pisos.';
export const TEXTO_FUENTE_PROF = 'Profundidad 0.54 m = 0.50 m (NSR-10 E.2.2.4, p. E-9) + 0.04 m de mortero de limpieza (E.6.2.2, p. E-21). Interpretación; editable.';
export const TEXTO_NO_VALIDADO = 'Valores de referencia de la NSR-10 para casas de uno y dos pisos; no es un diseño estructural validado.';
