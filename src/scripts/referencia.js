// src/scripts/referencia.js
// Fase F0 · Fuente ÚNICA de datos de la base documental del Constructor de Casa.
//
// Reglas (Resolución de auditoría v3, §3.6):
//   - Datos puros: sin DOM, sin Babylon.js, sin estado global. Todo está congelado (inmutable).
//   - calculos.js importará de aquí; casa.js no debe contener constantes de la base documental.
//   - Cada constante: { valor, unidad, fuente: { documento, tabla, pagina_impresa, pagina_pdf },
//                       es_estimacion, derivado, nota, fuente_original? }
//   - es_estimacion: true  → dato que NO proviene de la base documental (aquí no hay ninguno).
//   - derivado: true       → calculado a partir de datos de la fuente; lleva `formula`.
//   - fuente_original      → solo cuando el valor adoptado difiere del texto del PDF.
//   - Las discrepancias con los PDF se resuelven a favor de la Resolución v3.
//
// Tablas A.1–A.8: corregidas y listas para usar. Tablas A.9–A.11: documentadas para fases posteriores.

// ── Documentos ──────────────────────────────────────────────────────────────
export const DOCUMENTOS = Object.freeze({
  MM: 'Manual de Materiales de Construcción — Gustavo Jaramillo Botero',
  FV: 'Manual para Construcción de Viviendas en Fibra Vegetal — Betancourt y Montejo (Universidad La Gran Colombia, 2017)',
  CG: 'Un Enfoque Matemático para el Control de Proyectos de Ingeniería y Construcción — Fernando Chirinos Garate',
});

// En el Manual de Materiales y en el artículo de Chirinos la página impresa coincide con la del PDF.
// En el Manual de Fibra Vegetal la página del PDF es la impresa + 7 (portada, índices y tablas preliminares).
const DESFASE_PDF_FV = 7;

const fMM = (tabla, pagina) => ({ documento: DOCUMENTOS.MM, tabla, pagina_impresa: pagina, pagina_pdf: pagina });
const fFV = (tabla, paginaImpresa) => ({
  documento: DOCUMENTOS.FV, tabla, pagina_impresa: paginaImpresa, pagina_pdf: paginaImpresa + DESFASE_PDF_FV,
});
const fCG = (tabla, pagina) => ({ documento: DOCUMENTOS.CG, tabla, pagina_impresa: pagina, pagina_pdf: pagina });

const NOTA_PATRON = 'verificado por patrón, no por fuente directa';

// Construye una constante con el esquema obligatorio.
function d(valor, unidad, fuente, extra = {}) {
  const c = {
    valor,
    unidad,
    fuente,
    es_estimacion: extra.es_estimacion ?? false,
    derivado: extra.derivado ?? false,
    nota: extra.nota ?? '',
  };
  if (extra.formula !== undefined) c.formula = extra.formula;
  if (extra.criterio_educativo) c.criterio_educativo = true;
  if (extra.fuente_original !== undefined) c.fuente_original = extra.fuente_original;
  return c;
}

function congelar(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.values(o).forEach(congelar);
    Object.freeze(o);
  }
  return o;
}

// ── Parámetros generales ────────────────────────────────────────────────────
export const PARAMETROS = congelar({
  volqueta_m3: d(5, 'm³ por viaje', fMM('Ejemplo 1.1', 5), {
    nota: 'Capacidad de la volqueta usada en los ejemplos 1.1 a 1.3.',
  }),
  saco_cemento_kg: d(50, 'kg por saco', fMM('Ejemplo 3.1 / Ejemplo 3.2', 32), {
    nota: 'Los ejemplos expresan el cemento en sacos de 50 kg.',
  }),
  desperdicio_min: d(0.03, 'fracción', fMM('Texto (cantidades de obra)', 32), {
    nota: 'El desperdicio varía entre 3 % y 5 %; cada entidad puede manejar su propio porcentaje.',
  }),
  desperdicio_max: d(0.05, 'fracción', fMM('Texto (cantidades de obra)', 32), {
    nota: 'Límite superior del rango 3 %–5 %.',
  }),
  // Errata 8: la fuente deja 12,67 viajes sin redondear. El redondeo hacia arriba es un criterio educativo.
  redondeo_viajes: d('hacia_arriba', 'criterio', fMM('Ejemplo 1.1', 5), {
    criterio_educativo: true,
    nota: 'Redondeo educativo: el cálculo conserva el decimal (la fuente da 12,67 viajes); solo el número de viajes ' +
      'a contratar se redondea hacia arriba (Math.ceil). Criterio de operación, no regla de la fuente (errata 8).',
  }),
});

// ── A.1 · Factores de conversión de banco a suelto (MM, Tabla 1.1, p. 4) ────
const fA1 = fMM('Tabla 1.1', 4);
const NOTA_COMPACTADO = 'Columna «Al compactar 1 metro cúbico» de la fuente.';
const sueloA1 = (nombre, factor, compactado, notaFactor = '') => ({
  nombre,
  factor_banco_suelto: d(factor, 'm³ suelto / m³ banco', fA1, { nota: notaFactor }),
  al_compactar_1m3: d(compactado, 'm³', fA1, { nota: NOTA_COMPACTADO }),
});
export const A1_FACTORES_SUELO = congelar({
  id: 'A.1',
  titulo: 'Factores de conversión de banco a suelto',
  fuente: fA1,
  filas: {
    tierra_vegetal: sueloA1('Tierra vegetal', 1.10, 1.06),
    tierra_franca: sueloA1('Tierra franca', 1.20, 1.07),
    tierra_margosa_arcilla_medianamente_compacta: sueloA1('Tierra margosa y arcilla medianamente compacta', 1.50, 1.30),
    tierra_margosa_arcilla_compacta: sueloA1('Tierra margosa y arcilla compacta', 1.60, 1.40),
    terrenos_sueltos_sin_cohesion: sueloA1('Terrenos sueltos sin cohesión', 1.10, 1.05),
    terrenos_fijos_pequena_cohesion: sueloA1('Terrenos fijos con pequeña cohesión', 1.20, 1.10),
    terrenos_compactos_fuerte_cohesion: sueloA1('Terrenos compactos con fuerte cohesión', 1.30, 1.15),
    roca_desmontada_barrenos: sueloA1('Roca desmontada con barrenos y reducida a trozos', 1.60, 1.40),
    roca_blanda_arranque_maquina: sueloA1('Roca blanda con arranque a máquina', 1.40, 1.25),
    afirmado_bases_vias: sueloA1('Afirmado para bases de vías', null, 1.30,
      'La fuente no da factor banco→suelto («-----»).'),
    material_sucio_rio_subbases: sueloA1('Material sucio de río para sub-bases', null, 1.25,
      'La fuente no da factor banco→suelto («-----»).'),
  },
});

// ── A.2 · Clasificación de morteros de pega (MM, Tabla 3.1, p. 30; NSR-10 D.3) ─
const fA2 = fMM('Tabla 3.1 (morteros de pega; NSR-10, Cap. D.3)', 30);
const morteroA2 = (tipo, proporcion, mpa, permitidoPega) => ({
  tipo,
  proporcion_cemento_arena: d(proporcion, 'cemento:arena (volumen)', fA2),
  retencion_minima_agua: d(0.75, 'fracción', fA2),
  resistencia_minima_MPa: d(mpa, 'MPa', fA2),
  permitido_para_pega: d(permitidoPega, 'booleano', fA2, {
    nota: permitidoPega ? '' : 'Tipos O y K: solo revoques y aplicaciones no estructurales.',
  }),
});
export const A2_MORTEROS_PEGA = congelar({
  id: 'A.2',
  titulo: 'Clasificación de los morteros de pega',
  fuente: fA2,
  nota: 'La dosificación debe basarse en ensayos previos de laboratorio o experiencia de campo en obras similares.',
  filas: {
    H: morteroA2('H', '1:2', 22.5, true),
    M: morteroA2('M', '1:2.5', 17.5, true),
    S: morteroA2('S', '1:3', 12.5, true),
    N: morteroA2('N', '1:4', 7.5, true),
    O: morteroA2('O', '1:5', 6.0, false),
    K: morteroA2('K', '1:6', 4.5, false),
  },
});

// ── A.3 · Dosificación del mortero por volumen (MM, Tabla 3.2, p. 31) ───────
// Errata 1: la fuente tiene UNA columna de arena; los dos valores de agua son «con arena seca / con arena húmeda».
const fA3 = fMM('Tabla 3.2', 31);
const morteroA3 = (cemKg, sacos, arena, aguaSeca, aguaHumeda, kgcm2, psi) => ({
  cemento_kg: d(cemKg, 'kg por m³ de mortero', fA3),
  cemento_sacos: d(sacos, 'sacos de 50 kg por m³ de mortero', fA3),
  arena_m3: d(arena, 'm³ por m³ de mortero', fA3),
  agua_L_arena_seca: d(aguaSeca, 'L por m³ de mortero', fA3),
  agua_L_arena_humeda: d(aguaHumeda, 'L por m³ de mortero', fA3),
  resistencia_kg_cm2: d(kgcm2, 'kg/cm²', fA3),
  resistencia_psi: d(psi, 'psi', fA3),
});
export const A3_MORTEROS_VOLUMEN = congelar({
  id: 'A.3',
  titulo: 'Dosificación del mortero por volumen (por m³ de mortero)',
  fuente: fA3,
  correccion: {
    errata: '1',
    descripcion: 'Una sola columna arena_m3; el agua se separa en agua_L_arena_seca y agua_L_arena_humeda. ' +
      'El prompt v2 tenía una columna «arena húmeda (m³)» que la fuente no contiene.',
  },
  filas: {
    '1:2': morteroA3(626, 12.5, 0.97, 250, 220, 310, 4400),
    '1:3': morteroA3(454, 9.0, 1.09, 220, 185, 280, 3980),
    '1:4': morteroA3(364, 7.25, 1.16, 185, 170, 240, 3400),
    '1:5': morteroA3(302, 6.0, 1.18, 170, 150, 200, 2850),
    '1:6': morteroA3(260, 5.25, 1.20, 150, 140, 160, 2280),
    '1:7': morteroA3(228, 4.50, 1.25, 140, 130, 120, 1850),
  },
});

// ── A.4 · Dosificación de mezclas de concreto por volumen (MM, Tabla 3.3, p. 35) ─
// Errata 2: encabezado «agua con agregados húmedos / secos» (el ejemplo 3.2 confirma 160 L húmedo para 1:2:3)
// y balasto 1:2:4 = 0.95. Errata 2b: solo 1:3:5 y 1:3:6 se adoptan por patrón (húmedo < seco).
const fA4 = fMM('Tabla 3.3', 35);
const concretoA4 = (cemKg, sacos, arena, balasto, aguaHum, aguaSec, kgcm2, psi, extra = {}) => ({
  cemento_kg: d(cemKg, 'kg por m³ de concreto', fA4),
  cemento_sacos: d(sacos, 'sacos de 50 kg por m³ de concreto', fA4),
  arena_m3: d(arena, 'm³ por m³ de concreto', fA4),
  balasto_m3: d(balasto, 'm³ por m³ de concreto', fA4, extra.balasto || {}),
  agua_L_agregados_humedos: d(aguaHum, 'L por m³ de concreto', fA4, extra.aguaHum || {}),
  agua_L_agregados_secos: d(aguaSec, 'L por m³ de concreto', fA4, extra.aguaSec || {}),
  resistencia_kg_cm2: d(kgcm2, 'kg/cm²', fA4),
  resistencia_psi: d(psi, 'psi', fA4),
});
const patron = (original) => ({ nota: NOTA_PATRON + ' (errata 2b)', fuente_original: original });
export const A4_CONCRETOS = congelar({
  id: 'A.4',
  titulo: 'Dosificación de mezclas de concreto por volumen (por m³ de concreto)',
  fuente: fA4,
  encabezado_agua: 'agua con agregados húmedos / secos',
  correccion: {
    errata: '2 y 2b',
    descripcion: 'Encabezado del agua: húmedos / secos (no secos / húmedos). Balasto 1:2:4 = 0.95 (no 0.951). ' +
      'Filas 1:3:5 y 1:3:6 con agua adoptada por patrón (húmedo < seco); 1:3:4 se conserva tal como la fuente.',
  },
  filas: {
    '1:2:2': concretoA4(420, 8.5, 0.67, 0.67, 180, 200, 245, 3500),
    '1:2:3': concretoA4(350, 7.0, 0.555, 0.835, 160, 180, 210, 3000),
    '1:2:4': concretoA4(300, 6.0, 0.475, 0.95, 145, 170, 200, 2850, {
      balasto: { nota: 'Valor de la fuente: 0,95. El prompt v2 decía 0.951 (errata 2).' },
    }),
    '1:3:3': concretoA4(300, 6.0, 0.715, 0.715, 145, 170, 170, 2400),
    '1:3:4': concretoA4(260, 5.25, 0.625, 0.825, 140, 185, 160, 2280),
    '1:3:5': concretoA4(230, 4.50, 0.555, 0.920, 160, 185, 140, 2000, {
      aguaHum: patron({ humedo: 185, seco: 160 }), aguaSec: patron({ humedo: 185, seco: 160 }),
    }),
    '1:3:6': concretoA4(210, 4.0, 0.500, 1.000, 155, 180, 120, 1700, {
      aguaHum: patron({ humedo: 180, seco: 155 }), aguaSec: patron({ humedo: 180, seco: 155 }),
    }),
    '1:4:7': concretoA4(175, 3.5, 0.555, 0.975, 120, 145, 110, 1560),
    '1:4:8': concretoA4(160, 3.25, 0.655, 1.025, 110, 140, 100, 1420),
  },
});

// Concreto ciclópeo (MM, 3.2.1, p. 37)
const fCic = fMM('3.2.1 Concreto ciclópeo', 37);
export const CONCRETO_CICLOPEO = congelar({
  fraccion_concreto: d(0.60, 'fracción del volumen', fCic),
  fraccion_piedra: d(0.40, 'fracción del volumen', fCic),
  dosificacion_minima: d('1:2:3', 'cemento:arena:balasto', fCic),
  tamano_maximo_piedra_m: d(0.20, 'm', fCic, { nota: 'Inferior a 20 cm; forma redondeada, limpia y gris.' }),
  espesor_capa_concreto_m: d(0.20, 'm', fCic, { nota: 'Capa de concreto simple de aproximadamente 20 cm.' }),
  altura_maxima_muro_contencion_m: d(3, 'm', fCic),
  espesor_superior_muro_contencion_m: d(0.50, 'm', fCic),
  pisos_maximos: d(2, 'pisos', fCic, { nota: 'Construcciones no mayores de dos pisos.' }),
});

// ── A.5 · Ladrillos y mortero por m² de muro, sin desperdicio (MM, Tabla 3.1, p. 48) ─
// La fuente numera esta tabla también como 3.1 (numeración duplicada en el original).
const fA5 = fMM('Tabla 3.1 (cantidad de ladrillos y mortero por m², sin desperdicio)', 48);
const mampuesto = (nombre, dims, aparejos, nota = '') => ({
  nombre,
  dimensiones_m: d(dims, 'm', fA5, { nota: 'Orden de la fuente (p. ej. 0,07 × 0,12 × 0,25 m).' + (nota ? ' ' + nota : '') }),
  aparejos: Object.fromEntries(Object.entries(aparejos).map(([k, [ladrillos, mortero]]) => [k, {
    ladrillos_por_m2: d(ladrillos, 'piezas por m² de muro', fA5),
    mortero_m3_por_m2: d(mortero, 'm³ por m² de muro', fA5),
  }])),
});
export const A5_MAMPOSTERIA = congelar({
  id: 'A.5',
  titulo: 'Cantidad de ladrillos y mortero por m² de muro (sin desperdicio)',
  fuente: fA5,
  filas: {
    ladrillo_comun: mampuesto('Ladrillo común', [0.07, 0.12, 0.25],
      { pandereta: [30, 0.010], soga: [45, 0.030], tizon: [90, 0.063], tizon_y_soga: [90, 0.089] },
      'Es el ladrillo que el prompt llama «tolete».'),
    ladrillo_prensado: mampuesto('Ladrillo prensado', [0.06, 0.11, 0.24], { soga: [60, 0.019], tizon: [130, 0.051] }),
    farol_n4: mampuesto('Ladrillo farol (bloque Nº 4)', [0.10, 0.20, 0.30], { soga: [30, 0.036], canto: [15, 0.010] }),
    farol_n5: mampuesto('Ladrillo farol (bloque Nº 5)', [0.12, 0.20, 0.30], { soga: [23, 0.029], canto: [15, 0.012] }),
    cinva_ram: mampuesto('Ladrillo o bloque CINVA-RAM', [0.10, 0.14, 0.29], { soga: [57, 0.046], canto: [28, 0.029] }),
  },
});

// ── A.6 · Barras de refuerzo, diámetros en pulgadas (MM, Tabla 3.4, p. 71) ──
const fA6 = fMM('Tabla 3.4', 71);
const barra = (pulgadas, diam, area, perim, masa) => ({
  diametro_pulgadas: pulgadas,
  diametro_cm: d(diam, 'cm', fA6),
  area_cm2: d(area, 'cm²', fA6),
  perimetro_cm: d(perim, 'cm', fA6),
  masa_kg_m: d(masa, 'kg/m', fA6),
});
export const A6_BARRAS = congelar({
  id: 'A.6',
  titulo: 'Propiedades de las barras de refuerzo (diámetros en pulgadas)',
  fuente: fA6,
  filas: {
    'Nº 2': barra('1/4"', 0.64, 0.32, 2.00, 0.25),
    'Nº 3': barra('3/8"', 0.95, 0.71, 3.00, 0.56),
    'Nº 4': barra('1/2"', 1.27, 1.29, 4.00, 1.00),
    'Nº 5': barra('5/8"', 1.59, 2.00, 5.00, 1.55),
    'Nº 6': barra('3/4"', 1.91, 2.84, 6.00, 2.24),
    'Nº 7': barra('7/8"', 2.22, 3.87, 7.00, 3.04),
    'Nº 8': barra('1"', 2.54, 5.10, 8.00, 4.00),
    'Nº 9': barra('1 1/8"', 2.87, 6.45, 9.00, 5.06),
    'Nº 10': barra('1 1/4"', 3.23, 8.19, 10.13, 6.40),
  },
});

// ── A.7 · Mallas electrosoldadas (MM, Tabla 3.8, p. 79) ─────────────────────
const fA7 = fMM('Tabla 3.8', 79);
const malla = (peso, diam, sep, cuantia) => ({
  peso_kg: d(peso, 'kg por malla', fA7),
  diametro_alambre_mm: d(diam, 'mm', fA7),
  separacion_alambre_cm: d(sep, 'cm', fA7),
  cuantia_cm2_ml: d(cuantia, 'cm²/ml', fA7),
});
export const A7_MALLAS = congelar({
  id: 'A.7',
  titulo: 'Propiedades de las mallas electrosoldadas',
  fuente: fA7,
  filas: {
    'E-050': malla(11.50, 4.0, 25, 0.50),
    'M-084': malla(18.80, 4.0, 15, 0.84),
    'M-106': malla(23.80, 4.5, 15, 1.06),
    'M-131': malla(29.30, 5.0, 15, 1.31),
    'M-188': malla(42.20, 6.0, 15, 1.88),
    'M-221': malla(49.60, 6.5, 15, 2.21),
    'M-257': malla(57.40, 7.0, 15, 2.57),
    'M-295': malla(65.90, 7.5, 15, 2.95),
    'M-335': malla(75.10, 8.0, 15, 3.35),
    'M-378': malla(84.70, 8.5, 15, 3.78),
  },
  malla_estandar: {
    ancho_total_m: d(2.35, 'm', fA7),
    largo_total_m: d(6.0, 'm', fA7),
    traslapo_minimo_m: d(0.20, 'm', fA7, { nota: 'Como mínimo, en cada sentido.' }),
  },
});

// ── A.8 · Placas onduladas de fibrocemento (MM, Tabla 3.7, p. 55) ───────────
// Errata 3: numeración 2, 3, 4, 5, 6, 8, 10; traslapo longitudinal 0.14 m y lateral 0.047 m.
const fA8 = fMM('Tabla 3.7', 55);
const placa = (numero, lt, lu, at, au, areaT, areaU, peso) => ({
  numero,
  longitud_total_m: d(lt, 'm', fA8),
  longitud_util_m: d(lu, 'm', fA8),
  ancho_total_m: d(at, 'm', fA8),
  ancho_util_m: d(au, 'm', fA8),
  area_total_m2: d(areaT, 'm²', fA8),
  area_util_m2: d(areaU, 'm²', fA8),
  traslapo_longitudinal_m: d(0.14, 'm', fA8, { nota: 'Coincide con longitud total − longitud útil (errata 3).' }),
  traslapo_lateral_m: d(0.047, 'm', fA8, { nota: 'Coincide con ancho total − ancho útil (errata 3).' }),
  peso_kgf: d(peso, 'kgf', fA8),
});
export const A8_PLACAS_FIBROCEMENTO = congelar({
  id: 'A.8',
  titulo: 'Características de las placas onduladas de fibrocemento',
  fuente: fA8,
  correccion: {
    errata: '3',
    descripcion: 'La fuente numera las placas 2, 3, 4, 5, 6, 8 y 10 (el prompt v2 decía 7 y 8 para las dos últimas). ' +
      'Traslapo longitudinal 0.14 m y lateral 0.047 m (el prompt v2 los tenía intercambiados).',
  },
  filas: {
    'Nº 2': placa(2, 0.61, 0.47, 0.92, 0.873, 0.561, 0.41, 7.5),
    'Nº 3': placa(3, 0.91, 0.77, 0.92, 0.873, 0.837, 0.67, 11.2),
    'Nº 4': placa(4, 1.22, 1.08, 0.92, 0.873, 1.122, 0.94, 15.0),
    'Nº 5': placa(5, 1.52, 1.38, 0.92, 0.873, 1.398, 1.21, 18.7),
    'Nº 6': placa(6, 1.83, 1.69, 0.92, 0.873, 1.683, 1.48, 22.5),
    'Nº 8': placa(8, 2.44, 2.30, 0.92, 0.873, 2.244, 2.00, 30.0),
    'Nº 10': placa(10, 3.05, 2.91, 0.92, 0.873, 2.806, 2.54, 37.4),
  },
  formula_numero_placas: {
    expresion: 'N = L / (C − S), con S = 0.14 m',
    variables: { L: 'longitud inclinada de la cubierta (m)', C: 'longitud total de la placa (m)', S: 'traslapo longitudinal (m)' },
    traslapo_S_m: d(0.14, 'm', fMM('Texto «Número de tejas» (fórmula y ejemplo con placa Nº 6)', 59)),
  },
});

// ── A.9 · Pendientes de cubierta (documentada para F6) ──────────────────────
const fPend = fMM('7.5 Pendientes usuales de las placas onduladas de fibrocemento', 56);
export const A9_PENDIENTES = congelar({
  id: 'A.9',
  titulo: 'Pendientes de cubierta',
  estado: 'documentada (uso en F6)',
  filas: {
    fibrocemento_recomendada: d(0.27, 'fracción (tangente)', fPend, {
      nota: 'Pendientes menores al 27 % no se recomiendan: el agua puede devolverse por los traslapos.',
    }),
    fibrocemento_angulo_grados: d(15, '°', fMM('Ejemplo 3.6', 57), {
      derivado: true,
      formula: 'arctan(0.27) = 15.11° ≈ 15°',
      nota: 'La fuente lo enuncia (p. 57); se marca derivado porque es la conversión de 27 %.',
    }),
    minima_por_sedimentos: d(0.15, 'fracción (tangente)', fPend, {
      nota: 'Por debajo del 15 % se adhieren sedimentos y partículas orgánicas a la placa.',
    }),
    teja_barro_minima: d(0.35, 'fracción (tangente)', fPend, { nota: 'Pendiente mayor del 35 % (7.5).' }),
    teja_barro_recomendada: d(0.45, 'fracción (tangente)', fMM('3.5.2 Tejas de barro', 61), {
      nota: 'Pendiente que pase del 45 % (3.5.2). La fuente da 35 % en 7.5 y 45 % en 3.5.2; se documentan ambas.',
    }),
    metalica_sin_traslapo_maxima: d(0.15, 'fracción (tangente)', fPend, {
      nota: 'Se puede colocar una pendiente menor al 15 % porque no hay traslapos que retengan agua.',
    }),
    shingle_minima_grados: d(10, '°', fMM('3.5.4 Teja shingle', 62)),
  },
});

// ── A.10 · Fardo de paja y sistema en fibra vegetal (documentada para F10) ──
// Errata 5: fardo estructural ≥ 90 kg/m³ (~22 kg); 12 kg es el fardo comercial, no apto para muros portantes.
const fFardo = fFV('Tabla 2 · Características de extracción de un fardo de paja', 29);
const VOLUMEN_FARDO = 1.20 * 0.45 * 0.45; // 0.243 m³
export const A10_FARDO_PAJA = congelar({
  id: 'A.10',
  titulo: 'Fardo de paja y sistema constructivo en fibra vegetal',
  estado: 'documentada (uso en F10)',
  correccion: {
    errata: '5',
    descripcion: 'Densidad estructural ≥ 90 kg/m³ → ~22 kg por fardo de 0.243 m³. El fardo de 12 kg (≈49 kg/m³) es ' +
      'comercial y no apto para muros portantes. Altura de la estructura 2,70 m. Conductividad en W/(m·K). ' +
      'El rango «110–130 kg/m³» del prompt v2 no está en la fuente y no se incluye.',
  },
  fardo: {
    largo_m: d(1.20, 'm', fFardo),
    ancho_m: d(0.45, 'm', fFardo),
    alto_m: d(0.45, 'm', fFardo),
    volumen_m3: d(Math.round(VOLUMEN_FARDO * 1000) / 1000, 'm³', fFardo, {
      derivado: true, formula: '1.20 × 0.45 × 0.45 = 0.243 m³',
    }),
    densidad_minima_estructural_kg_m3: d(90, 'kg/m³', fFV('Texto (densidad mínima de las balas)', 19), {
      nota: 'Se consideran adecuadas las balas con densidad igual o mayor a 90 kg/m³.',
    }),
    peso_estructural_kg: d(Math.round(90 * VOLUMEN_FARDO * 100) / 100, 'kg', fFardo, {
      derivado: true,
      formula: '90 kg/m³ × 0.243 m³ = 21.87 kg ≈ 22 kg',
      nota: 'Fardo estructural adoptado por la Resolución v3 para el modo portante.',
    }),
    peso_comercial_kg: d(12, 'kg', fFardo, {
      nota: 'Fardo comercial NO apto para muros portantes: 12 kg / 0.243 m³ ≈ 49 kg/m³, por debajo de 90 kg/m³.',
    }),
    densidad_fardo_comercial_kg_m3: d(Math.round(12 / VOLUMEN_FARDO * 10) / 10, 'kg/m³', fFardo, {
      derivado: true, formula: '12 kg / 0.243 m³ = 49.4 kg/m³',
      nota: 'Contradicción interna de la fuente (Tabla 2 frente al mínimo de 90 kg/m³).',
    }),
    costo_referencia: d(4000, 'COP por fardo', fFardo, {
      nota: 'La fuente indica «$»; se interpreta como pesos colombianos (obra en Colombia).',
    }),
    produccion_min_por_dia: d(1000, 'fardos por día por empresa', fFardo),
    produccion_max_por_dia: d(1200, 'fardos por día por empresa', fFardo),
    procedencia: d('Mariquita (Tolima)', 'texto', fFardo, { fuente_original: 'Marquita Tolima' }),
    densidad_ensayo_kg_m3: d(130, 'kg/m³', fFV('Texto (ensayo de compresión)', 25), {
      nota: 'Densidad aproximada del fardo ensayado; referencia, no rango de diseño.',
    }),
  },
  propiedades: {
    conductividad_min_W_mK: d(0.0337, 'W/(m·K)', fFV('Texto (conductividad térmica)', 27), { fuente_original: { unidad: 'W/mk' } }),
    conductividad_max_W_mK: d(0.086, 'W/(m·K)', fFV('Texto (conductividad térmica)', 27), { fuente_original: { unidad: 'W/mk' } }),
    resistencia_fuego_h: d(2, 'h', fFV('Texto (resistencia al fuego)', 28)),
    resistencia_fuego_marco_madera_min: d(30, 'min', fFV('Texto (resistencia al fuego)', 28)),
    carga_vertical_min_kg_m: d(500, 'kg por m lineal de muro', fFV('Texto (comportamiento a compresión)', 24), {
      nota: 'Equivalente a 1000 kg/m² según la fuente.',
    }),
    carga_vertical_max_kg_m2: d(1953, 'kg/m²', fFV('Texto (comportamiento a compresión)', 25), {
      nota: '400 lb/ft² = 1953 kg/m² (King 1996), en la parte superior del muro.',
    }),
    deformacion_2000_kg_m2: d(0.0125, 'fracción', fFV('Texto (ensayo de compresión)', 26)),
    deformacion_7100_kg_m2: d(0.05, 'fracción', fFV('Texto (ensayo de compresión)', 26)),
  },
  estructura_madera: {
    altura_m: d(2.70, 'm', fFV('Texto (estructura de madera)', 30), {
      fuente_original: { valor: 2.70, unidad: 'cm' }, nota: 'La fuente escribe «2,70 cm»; errata evidente de 2,70 m (errata 5).',
    }),
    ancho_panel_m: d(0.53, 'm', fFV('Texto (estructura de madera)', 30)),
    paral_seccion_cm: d([4, 8], 'cm', fFV('Texto (estructura de madera)', 30)),
    vigueta_seccion_cm: d([4, 10], 'cm', fFV('Texto (estructura de madera)', 30)),
    lamina_inferior_cm: d([53, 2], 'cm (ancho × espesor)', fFV('Texto (estructura de madera)', 30)),
  },
  bloque_hormigon_cm: d([39, 14, 19], 'cm (largo × ancho × alto)', fFV('Tabla 3 · Dimensiones bloque de hormigón', 32)),
  revoque: {
    espesor_maximo_clima_humedo_m: d(0.05, 'm', fFV('Texto (revoque)', 9), { nota: 'Capas de menos de 5 cm en climas húmedos.' }),
    secado_min_dias: d(3, 'días', fFV('Texto (revoque)', 9)),
    secado_max_meses: d(3, 'meses', fFV('Texto (revoque)', 9)),
  },
});

// ── A.11 · Comparación de sistemas constructivos (documentada para F10) ─────
// Errata 4: «En seco» 48.000 (no 448.000); dos filas de superficie; unidad de costo no especificada.
const fA11 = fFV('Tabla 4 · Comparación de sistemas constructivos frente a la fibra vegetal', 35);
const NOTA_COSTO = 'unidad_no_especificada: la fuente no indica la unidad del costo. Referencia comparativa educativa.';
const sistema = (trans, tiempo, costo, area, muros, util, dist, extra = {}) => ({
  transmitancia_termica: d(trans, 'no especificada en la tabla', fA11),
  tiempo_ejecucion: d(tiempo, 'texto', fA11),
  costo_m2: d(costo, 'no especificada', fA11, { nota: NOTA_COSTO, ...(extra.costo || {}) }),
  unidad_no_especificada: true,
  area_total_m2: d(area, 'm²', fA11),
  'muros_%': d(muros, '%', fA11, { nota: 'Superficie ocupada por muros.' }),
  'util_%': d(util, '%', fA11, { nota: 'Superficie útil.' }),
  distancia_transporte_km: d(dist, 'km', fA11, extra.dist || {}),
});
export const A11_COMPARACION_SISTEMAS = congelar({
  id: 'A.11',
  titulo: 'Comparación de sistemas constructivos frente a la fibra vegetal',
  estado: 'documentada (uso en F10)',
  correccion: { errata: '4', descripcion: 'En seco = 48.000 (el prompt v2 decía 448.000). Filas separadas muros_% y util_%.' },
  filas: {
    tradicional: sistema(0.54, '6 meses', 20654, 75, 88, 12, [100, 200]),
    en_seco: sistema(0.53, '65 días', 48000, 75, 78, 22, [100, 200]),
    fibra_vegetal: sistema(0.30, '64 días', 23366, 132, 58, 42, [0, 10], {
      dist: { fuente_original: 'o - 10 km', nota: 'La fuente escribe «o - 10»; se lee 0–10 km.' },
    }),
  },
});

// ── Modelo C/P/E (Chirinos, reinterpretado por la Resolución v3 §4.7; para F8) ─
export const MODELO_CPE = congelar({
  estado: 'documentado (uso en F8)',
  correccion: {
    errata: '6',
    descripcion: 'P = planificado pendiente, E = ejecutado acumulado, C = contractual total. C = P + E se cumple por ' +
      'construcción; ΔC es verificación de consistencia y la desviación real es ΔE = E − E_planificado.',
  },
  definiciones: {
    invariante: { expresion: 'C = P_pendiente + E_acumulado', fuente: fCG('Ecuación C = P + E', 7) },
    consistencia: { expresion: 'ΔC = C − (P_pendiente + E_acumulado) = 0', fuente: fCG('Desviaciones', 12),
      nota: 'Si no es 0 hay un error de datos que se reporta; no es una desviación del proyecto.' },
    desviacion_real: { expresion: 'ΔE = E_acumulado − E_planificado_acumulado', fuente: fCG('Desviaciones', 12),
      nota: 'Definición de la Resolución v3; no aparece así en la fuente.' },
    valorizaciones: { expresion: 'V_C = C·PU_C, V_P = P_pendiente·PU_P, V_E = E_acumulado·PU_R', fuente: fCG('Valorizaciones', 10),
      nota: 'Magnitudes distintas; no se suman.' },
    tiempos: { expresion: 'T_C = C / R_C, T_P = P_pendiente / R_P, T_E = E_acumulado / R_R', fuente: fCG('Análisis de rendimientos', 12),
      nota: 'Elemento a elemento por actividad; no es división matricial.' },
    rendimiento_necesario: { expresion: 'R_necesario,i = (C_i − E_acumulado,i) / T_objetivo', fuente: fCG('Rendimiento necesario', 14) },
  },
});

// ── Errata 7: tablas que usa cada etapa (referencias cruzadas corregidas) ───
export const TABLAS_POR_ETAPA = congelar({
  'Etapa 0/1 (terreno y excavación)': ['A.1'],
  'Etapa 2 (cimentación)': ['A.4'],
  'Etapa 3 (vigas de cimentación)': ['A.6'],
  'Etapa 4 (muros)': ['A.2', 'A.3', 'A.5'],
  'Etapa 5 (losas)': ['A.6', 'A.7'],
  'Etapa 7 (cubierta)': ['A.8', 'A.9'],
  'Etapa 8 (fibra vegetal)': ['A.10', 'A.11'],
});

// ── Ejemplos resueltos de la fuente (para pruebas de las fases F2, F3 y F6) ─
export const EJEMPLOS_FUENTE = congelar({
  ejemplo_1_1_descapote: {
    fuente: fMM('Ejemplo 1.1', 5),
    datos: { largo_m: 6, ancho_m: 12, alto_m: 0.80, suelo: 'tierra_vegetal' },
    resultado: { volumen_banco_m3: 57.60, volumen_suelto_m3: 63.36, viajes_fuente: 12.67 },
  },
  ejemplo_3_2_zapatas: {
    fuente: fMM('Ejemplo 3.2', 36),
    datos: { volumen_m3: 12.0, mezcla: '1:2:3' },
    resultado: { cemento_sacos: 84, arena_m3: 6.66, balasto_m3: 10.02, agua_L: 1920 },
  },
  numero_placas_n6: {
    fuente: fMM('Texto «Número de tejas»', 59),
    datos: { L_m: 6.20, placa: 'Nº 6' },
    resultado: { N_fuente: 3.66 },
    nota: 'La fuente trunca a dos decimales: 6,20 / (1,83 − 0,14) = 3,668… → 3,66 (3 placas Nº 6 y faltan 0,66).',
  },
});

// ── Registro de erratas aplicadas (Resolución v3, §1) ───────────────────────
export const ERRATAS_APLICADAS = congelar([
  { errata: '1', ubicacion: 'A3_MORTEROS_VOLUMEN', resumen: 'Una columna arena_m3; agua con arena seca / húmeda.' },
  { errata: '2', ubicacion: 'A4_CONCRETOS', resumen: 'Encabezado agua húmedos / secos; balasto 1:2:4 = 0.95.' },
  { errata: '2b', ubicacion: 'A4_CONCRETOS', resumen: '1:3:5 = 160/185 y 1:3:6 = 155/180 por patrón; 1:3:4 directo de la fuente.' },
  { errata: '3', ubicacion: 'A8_PLACAS_FIBROCEMENTO', resumen: 'Numeración 2–10; traslapo longitudinal 0.14 m, lateral 0.047 m.' },
  { errata: '4', ubicacion: 'A11_COMPARACION_SISTEMAS', resumen: '48.000; muros_% y util_%; costo sin unidad.' },
  { errata: '5', ubicacion: 'A10_FARDO_PAJA', resumen: 'Fardo estructural ≥ 90 kg/m³ (~22 kg); 12 kg comercial; 2,70 m; W/(m·K).' },
  { errata: '6', ubicacion: 'MODELO_CPE', resumen: 'Invariante C = P + E; ΔC consistencia; ΔE desviación real.' },
  { errata: '7', ubicacion: 'TABLAS_POR_ETAPA', resumen: 'Etapa 3 → A.6; Etapa 5 → A.6 + A.7; Etapa 7 → A.8 + A.9.' },
  { errata: '8', ubicacion: 'PARAMETROS.redondeo_viajes', resumen: 'Se conserva 12.67; Math.ceil es redondeo educativo.' },
]);
