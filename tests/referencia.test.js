// tests/referencia.test.js
// Fase F0: verifica la fuente de datos documental src/scripts/referencia.js.
//   node --test tests/referencia.test.js
// No usa base de datos, red, DOM ni Babylon.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../src/scripts/referencia.js';

const {
  PARAMETROS, A1_FACTORES_SUELO, A2_MORTEROS_PEGA, A3_MORTEROS_VOLUMEN, A4_CONCRETOS, CONCRETO_CICLOPEO,
  A5_MAMPOSTERIA, A6_BARRAS, A7_MALLAS, A8_PLACAS_FIBROCEMENTO, A9_PENDIENTES, A10_FARDO_PAJA,
  A11_COMPARACION_SISTEMAS, MODELO_CPE, TABLAS_POR_ETAPA, EJEMPLOS_FUENTE, ERRATAS_APLICADAS, DOCUMENTOS,
} = R;

const TABLAS = {
  PARAMETROS, A1_FACTORES_SUELO, A2_MORTEROS_PEGA, A3_MORTEROS_VOLUMEN, A4_CONCRETOS, CONCRETO_CICLOPEO,
  A5_MAMPOSTERIA, A6_BARRAS, A7_MALLAS, A8_PLACAS_FIBROCEMENTO, A9_PENDIENTES, A10_FARDO_PAJA, A11_COMPARACION_SISTEMAS,
};
const cerca = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const v = c => c.valor;

// Recorre un árbol y devuelve [ruta, nodo] de cada constante (objeto con 'valor' y 'fuente').
function constantes(nodo, ruta = '') {
  if (!nodo || typeof nodo !== 'object') return [];
  if ('valor' in nodo && 'fuente' in nodo) return [[ruta, nodo]];
  return Object.entries(nodo).flatMap(([k, h]) => (k === 'fuente' ? [] : constantes(h, ruta ? `${ruta}.${k}` : k)));
}
// Números sueltos fuera de una constante (prohibidos salvo identificadores y páginas).
function numerosSueltos(nodo, ruta = '') {
  if (typeof nodo === 'number') return [ruta];
  if (!nodo || typeof nodo !== 'object') return [];
  if ('valor' in nodo && 'fuente' in nodo) return [];
  return Object.entries(nodo).flatMap(([k, h]) =>
    ['fuente', 'numero', 'datos', 'resultado'].includes(k) ? [] : numerosSueltos(h, `${ruta}.${k}`));
}

// ── Esquema y trazabilidad ──────────────────────────────────────────────────
test('toda constante tiene valor, unidad, fuente completa, es_estimacion, derivado y nota', () => {
  let total = 0;
  for (const [nombre, tabla] of Object.entries(TABLAS)) {
    for (const [ruta, c] of constantes(tabla, nombre)) {
      total++;
      assert.ok('valor' in c, `${ruta}: falta valor`);
      assert.equal(typeof c.unidad, 'string', `${ruta}: unidad`);
      assert.ok(c.unidad.length > 0, `${ruta}: unidad vacía`);
      assert.ok(Object.values(DOCUMENTOS).includes(c.fuente.documento), `${ruta}: documento desconocido`);
      assert.equal(typeof c.fuente.tabla, 'string', `${ruta}: tabla`);
      assert.ok(Number.isInteger(c.fuente.pagina_impresa) && c.fuente.pagina_impresa > 0, `${ruta}: pagina_impresa`);
      assert.ok(Number.isInteger(c.fuente.pagina_pdf) && c.fuente.pagina_pdf > 0, `${ruta}: pagina_pdf`);
      assert.equal(typeof c.es_estimacion, 'boolean', `${ruta}: es_estimacion`);
      assert.equal(typeof c.derivado, 'boolean', `${ruta}: derivado`);
      assert.equal(typeof c.nota, 'string', `${ruta}: nota`);
      if (c.derivado) assert.ok(typeof c.formula === 'string' && c.formula.length > 0, `${ruta}: derivado sin fórmula`);
      if (c.valor === null) assert.ok(c.nota.length > 0, `${ruta}: valor nulo sin explicación`);
    }
  }
  assert.ok(total > 300, `se esperaban más de 300 constantes, hay ${total}`);
});

test('no hay números fuera del esquema de constantes', () => {
  for (const [nombre, tabla] of Object.entries(TABLAS)) {
    assert.deepEqual(numerosSueltos(tabla, nombre), [], `${nombre} tiene números sin fuente`);
  }
});

test('F0 no contiene estimaciones: todo proviene de la base documental', () => {
  for (const [nombre, tabla] of Object.entries(TABLAS)) {
    for (const [ruta, c] of constantes(tabla, nombre)) assert.equal(c.es_estimacion, false, ruta);
  }
});

test('fuente_original solo aparece donde se corrigió un valor del PDF', () => {
  const conOriginal = Object.entries(TABLAS)
    .flatMap(([n, t]) => constantes(t, n))
    .filter(([, c]) => 'fuente_original' in c)
    .map(([r]) => r)
    .sort();
  assert.deepEqual(conOriginal, [
    "A10_FARDO_PAJA.estructura_madera.altura_m",
    "A10_FARDO_PAJA.fardo.procedencia",
    "A10_FARDO_PAJA.propiedades.conductividad_max_W_mK",
    "A10_FARDO_PAJA.propiedades.conductividad_min_W_mK",
    "A11_COMPARACION_SISTEMAS.filas.fibra_vegetal.distancia_transporte_km",
    "A4_CONCRETOS.filas.1:3:5.agua_L_agregados_humedos",
    "A4_CONCRETOS.filas.1:3:5.agua_L_agregados_secos",
    "A4_CONCRETOS.filas.1:3:6.agua_L_agregados_humedos",
    "A4_CONCRETOS.filas.1:3:6.agua_L_agregados_secos",
  ].sort());
});

test('páginas: Manual de Materiales y Chirinos coinciden; Fibra Vegetal es impresa + 7', () => {
  for (const [nombre, tabla] of Object.entries(TABLAS)) {
    for (const [ruta, c] of constantes(tabla, nombre)) {
      const { documento, pagina_impresa: pi, pagina_pdf: pp } = c.fuente;
      if (documento === DOCUMENTOS.FV) assert.equal(pp, pi + 7, ruta);
      else assert.equal(pp, pi, ruta);
    }
  }
});

test('el módulo está congelado en profundidad', () => {
  const todos = [...Object.values(TABLAS), MODELO_CPE, TABLAS_POR_ETAPA, EJEMPLOS_FUENTE, ERRATAS_APLICADAS];
  const revisar = o => {
    if (!o || typeof o !== 'object') return;
    assert.ok(Object.isFrozen(o));
    Object.values(o).forEach(revisar);
  };
  todos.forEach(revisar);
  assert.throws(() => { 'use strict'; A4_CONCRETOS.filas['1:2:3'].cemento_kg.valor = 1; }, TypeError);
});

test('referencia.js es puro: sin imports, DOM, Babylon ni red', () => {
  // Se analiza solo el código: se quitan los comentarios de línea (que sí mencionan Babylon.js).
  const src = fs.readFileSync(new URL('../src/scripts/referencia.js', import.meta.url), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(src, /^\s*import\s/m);
  assert.doesNotMatch(src, /\b(document|window|fetch|localStorage|require)\b/);
  assert.doesNotMatch(src, /babylon/i);
});

// ── Una prueba por errata (Resolución v3, §1, con 2b corregida) ─────────────
test('errata 1 · A.3: una sola columna arena_m3 y dos columnas de agua', () => {
  for (const [mezcla, f] of Object.entries(A3_MORTEROS_VOLUMEN.filas)) {
    assert.deepEqual(Object.keys(f).sort(), ['agua_L_arena_humeda', 'agua_L_arena_seca', 'arena_m3', 'cemento_kg',
      'cemento_sacos', 'resistencia_kg_cm2', 'resistencia_psi'], mezcla);
    assert.ok(v(f.agua_L_arena_humeda) < v(f.agua_L_arena_seca), `${mezcla}: con arena húmeda se usa menos agua`);
  }
  assert.equal(v(A3_MORTEROS_VOLUMEN.filas['1:4'].cemento_sacos), 7.25);
  assert.equal(v(A3_MORTEROS_VOLUMEN.filas['1:4'].arena_m3), 1.16);
  assert.equal(v(A3_MORTEROS_VOLUMEN.filas['1:4'].agua_L_arena_seca), 185);
  assert.equal(A3_MORTEROS_VOLUMEN.correccion.errata, '1');
});

test('errata 2 · A.4: encabezado húmedos / secos, balasto 1:2:4 = 0.95 y ejemplo 3.2 (160 L húmedo)', () => {
  assert.equal(A4_CONCRETOS.encabezado_agua, 'agua con agregados húmedos / secos');
  assert.equal(v(A4_CONCRETOS.filas['1:2:4'].balasto_m3), 0.95);
  const c = A4_CONCRETOS.filas['1:2:3'];
  assert.equal(v(c.agua_L_agregados_humedos), 160);
  assert.equal(v(c.agua_L_agregados_secos), 180);
  const ej = EJEMPLOS_FUENTE.ejemplo_3_2_zapatas;
  assert.equal(v(c.cemento_sacos) * ej.datos.volumen_m3, ej.resultado.cemento_sacos);
  assert.ok(cerca(v(c.arena_m3) * ej.datos.volumen_m3, ej.resultado.arena_m3, 1e-9));
  assert.ok(cerca(v(c.balasto_m3) * ej.datos.volumen_m3, ej.resultado.balasto_m3, 1e-9));
  assert.equal(v(c.agua_L_agregados_humedos) * ej.datos.volumen_m3, ej.resultado.agua_L);
});

test('errata 2b · A.4: solo 1:3:5 y 1:3:6 se adoptan por patrón; 1:3:4 es directo de la fuente', () => {
  const f = A4_CONCRETOS.filas;
  assert.deepEqual([v(f['1:3:4'].agua_L_agregados_humedos), v(f['1:3:4'].agua_L_agregados_secos)], [140, 185]);
  assert.ok(!('fuente_original' in f['1:3:4'].agua_L_agregados_humedos));
  assert.ok(!('fuente_original' in f['1:3:4'].agua_L_agregados_secos));
  assert.deepEqual([v(f['1:3:5'].agua_L_agregados_humedos), v(f['1:3:5'].agua_L_agregados_secos)], [160, 185]);
  assert.deepEqual([v(f['1:3:6'].agua_L_agregados_humedos), v(f['1:3:6'].agua_L_agregados_secos)], [155, 180]);
  for (const [m, orig] of [['1:3:5', { humedo: 185, seco: 160 }], ['1:3:6', { humedo: 180, seco: 155 }]]) {
    for (const k of ['agua_L_agregados_humedos', 'agua_L_agregados_secos']) {
      assert.deepEqual(f[m][k].fuente_original, orig, `${m}.${k}`);
      assert.match(f[m][k].nota, /verificado por patrón, no por fuente directa/);
    }
    // El valor adoptado es exactamente el par de la fuente intercambiado.
    assert.equal(v(f[m].agua_L_agregados_humedos), orig.seco);
    assert.equal(v(f[m].agua_L_agregados_secos), orig.humedo);
  }
  // Consistencia del patrón en las 9 mezclas: con agregados húmedos siempre menos agua.
  for (const [m, fila] of Object.entries(f)) {
    assert.ok(v(fila.agua_L_agregados_humedos) < v(fila.agua_L_agregados_secos), m);
  }
  // Ninguna otra fila de A.4 lleva fuente_original.
  const otras = Object.entries(f).filter(([m]) => !['1:3:5', '1:3:6'].includes(m));
  for (const [m, fila] of otras) for (const c of Object.values(fila)) assert.ok(!('fuente_original' in c), m);
});

test('errata 3 · A.8: numeración 2–10, traslapos 0.14 / 0.047 y N = L / (C − 0.14)', () => {
  const filas = Object.values(A8_PLACAS_FIBROCEMENTO.filas);
  assert.deepEqual(filas.map(p => p.numero), [2, 3, 4, 5, 6, 8, 10]);
  for (const p of filas) {
    assert.equal(v(p.traslapo_longitudinal_m), 0.14);
    assert.equal(v(p.traslapo_lateral_m), 0.047);
    assert.ok(cerca(v(p.longitud_total_m) - v(p.longitud_util_m), v(p.traslapo_longitudinal_m), 1e-9), `Nº ${p.numero} longitud`);
    assert.ok(cerca(v(p.ancho_total_m) - v(p.ancho_util_m), v(p.traslapo_lateral_m), 1e-9), `Nº ${p.numero} ancho`);
  }
  const S = v(A8_PLACAS_FIBROCEMENTO.formula_numero_placas.traslapo_S_m);
  assert.equal(S, 0.14);
  const ej = EJEMPLOS_FUENTE.numero_placas_n6;
  const C = v(A8_PLACAS_FIBROCEMENTO.filas[ej.datos.placa].longitud_total_m);
  // La fuente TRUNCA a dos decimales: 6.20 / 1.69 = 3.668… → 3,66.
  assert.equal(Math.floor(ej.datos.L_m / (C - S) * 100) / 100, ej.resultado.N_fuente);
  assert.match(ej.nota, /trunca/);
});

test('errata 4 · A.11: en seco 48.000, filas muros_% y util_% separadas, costo sin unidad', () => {
  const f = A11_COMPARACION_SISTEMAS.filas;
  assert.equal(v(f.en_seco.costo_m2), 48000);
  for (const [s, fila] of Object.entries(f)) {
    assert.equal(v(fila['muros_%']) + v(fila['util_%']), 100, s);
    assert.equal(fila.unidad_no_especificada, true, s);
    assert.match(fila.costo_m2.nota, /unidad_no_especificada/);
  }
  assert.deepEqual([v(f.tradicional['muros_%']), v(f.en_seco['muros_%']), v(f.fibra_vegetal['muros_%'])], [88, 78, 58]);
  assert.deepEqual([v(f.tradicional['util_%']), v(f.en_seco['util_%']), v(f.fibra_vegetal['util_%'])], [12, 22, 42]);
});

test('errata 5 · A.10: fardo estructural ≥ 90 kg/m³ (~22 kg), 12 kg no portante, 2,70 m, W/(m·K)', () => {
  const fa = A10_FARDO_PAJA.fardo;
  const vol = v(fa.largo_m) * v(fa.ancho_m) * v(fa.alto_m);
  assert.ok(cerca(vol, 0.243, 1e-9));
  assert.equal(v(fa.volumen_m3), 0.243);
  assert.equal(v(fa.densidad_minima_estructural_kg_m3), 90);
  assert.ok(cerca(v(fa.peso_estructural_kg), 21.87, 1e-9));
  assert.equal(Math.round(v(fa.peso_estructural_kg)), 22);
  assert.equal(fa.peso_estructural_kg.derivado, true);
  assert.equal(v(fa.peso_comercial_kg), 12);
  assert.match(fa.peso_comercial_kg.nota, /NO apto para muros portantes/);
  assert.ok(v(fa.densidad_fardo_comercial_kg_m3) < v(fa.densidad_minima_estructural_kg_m3));
  const alt = A10_FARDO_PAJA.estructura_madera.altura_m;
  assert.equal(v(alt), 2.70); assert.equal(alt.unidad, 'm');
  assert.deepEqual(alt.fuente_original, { valor: 2.70, unidad: 'cm' });
  for (const k of ['conductividad_min_W_mK', 'conductividad_max_W_mK']) {
    assert.equal(A10_FARDO_PAJA.propiedades[k].unidad, 'W/(m·K)');
  }
  assert.ok(!JSON.stringify(A10_FARDO_PAJA.fardo).includes('110'), 'el rango 110–130 no está en la fuente');
});

test('errata 6 · C/P/E: invariante, consistencia y desviación real (cálculo de ejemplo)', () => {
  const def = MODELO_CPE.definiciones;
  assert.match(def.invariante.expresion, /C = P_pendiente \+ E_acumulado/);
  assert.match(def.consistencia.expresion, /= 0$/);
  assert.match(def.desviacion_real.expresion, /ΔE = E_acumulado − E_planificado_acumulado/);
  assert.match(def.tiempos.nota, /no es división matricial/);
  // Ejemplo numérico neutro (no son datos de la fuente): 2 actividades.
  const C = [100, 40], E = [30, 10], P = C.map((c, i) => c - E[i]);
  const dC = C.map((c, i) => c - (P[i] + E[i]));
  assert.deepEqual(dC, [0, 0], 'la identidad se cumple por construcción');
  const Eplan = [40, 10];
  assert.deepEqual(E.map((e, i) => e - Eplan[i]), [-10, 0], 'ΔE mide atraso o adelanto');
});

test('errata 7 · referencias cruzadas de tablas por etapa', () => {
  assert.deepEqual(TABLAS_POR_ETAPA['Etapa 3 (vigas de cimentación)'], ['A.6']);
  assert.deepEqual(TABLAS_POR_ETAPA['Etapa 5 (losas)'], ['A.6', 'A.7']);
  assert.deepEqual(TABLAS_POR_ETAPA['Etapa 7 (cubierta)'], ['A.8', 'A.9']);
  assert.equal(A6_BARRAS.id, 'A.6'); assert.equal(A7_MALLAS.id, 'A.7');
  assert.equal(A8_PLACAS_FIBROCEMENTO.id, 'A.8'); assert.equal(A9_PENDIENTES.id, 'A.9');
});

test('errata 8 · viajes: se conserva 12.67 y el redondeo hacia arriba es criterio educativo', () => {
  const ej = EJEMPLOS_FUENTE.ejemplo_1_1_descapote;
  const banco = ej.datos.largo_m * ej.datos.ancho_m * ej.datos.alto_m;
  const suelto = banco * v(A1_FACTORES_SUELO.filas[ej.datos.suelo].factor_banco_suelto);
  const viajes = suelto / v(PARAMETROS.volqueta_m3);
  assert.ok(cerca(banco, ej.resultado.volumen_banco_m3, 1e-9));
  assert.ok(cerca(suelto, ej.resultado.volumen_suelto_m3, 1e-9));
  assert.equal(Math.round(viajes * 100) / 100, ej.resultado.viajes_fuente);
  assert.equal(Math.ceil(viajes), 13);
  assert.equal(PARAMETROS.redondeo_viajes.criterio_educativo, true);
  assert.equal(PARAMETROS.redondeo_viajes.es_estimacion, false);
});

test('el registro de erratas cubre 1, 2, 2b, 3, 4, 5, 6, 7 y 8', () => {
  assert.deepEqual(ERRATAS_APLICADAS.map(e => e.errata), ['1', '2', '2b', '3', '4', '5', '6', '7', '8']);
  for (const e of ERRATAS_APLICADAS) {
    const raiz = e.ubicacion.split('.')[0];
    assert.ok(raiz in R, `${e.errata}: ${raiz} no existe`);
  }
});

// ── Valores conservados de la fuente (A.1, A.2, A.5, A.6, A.7, derivados) ────
test('A.1: 11 suelos y factores de la Tabla 1.1', () => {
  const f = A1_FACTORES_SUELO.filas;
  assert.equal(Object.keys(f).length, 11);
  assert.equal(v(f.tierra_vegetal.factor_banco_suelto), 1.10);
  assert.equal(v(f.roca_desmontada_barrenos.factor_banco_suelto), 1.60);
  assert.equal(v(f.afirmado_bases_vias.factor_banco_suelto), null);
  assert.equal(v(f.afirmado_bases_vias.al_compactar_1m3), 1.30);
  for (const s of Object.values(f)) {
    const fac = v(s.factor_banco_suelto);
    if (fac !== null) assert.ok(fac >= 1, s.nombre);
  }
});

test('A.2: tipos H–K, resistencias decrecientes y O/K no permitidos para pega', () => {
  const f = A2_MORTEROS_PEGA.filas;
  assert.deepEqual(Object.keys(f), ['H', 'M', 'S', 'N', 'O', 'K']);
  const mpa = Object.values(f).map(m => v(m.resistencia_minima_MPa));
  assert.deepEqual(mpa, [22.5, 17.5, 12.5, 7.5, 6.0, 4.5]);
  assert.deepEqual(Object.values(f).map(m => v(m.permitido_para_pega)), [true, true, true, true, false, false]);
});

test('A.5, A.6 y A.7: valores de control de la fuente', () => {
  assert.equal(v(A5_MAMPOSTERIA.filas.ladrillo_comun.aparejos.soga.ladrillos_por_m2), 45);
  assert.equal(v(A5_MAMPOSTERIA.filas.cinva_ram.aparejos.canto.mortero_m3_por_m2), 0.029);
  assert.equal(v(A6_BARRAS.filas['Nº 3'].masa_kg_m), 0.56);
  assert.equal(v(A6_BARRAS.filas['Nº 10'].perimetro_cm), 10.13);
  assert.equal(Object.keys(A7_MALLAS.filas).length, 10);
  assert.equal(v(A7_MALLAS.filas['M-378'].cuantia_cm2_ml), 3.78);
  assert.equal(v(A7_MALLAS.malla_estandar.traslapo_minimo_m), 0.20);
  // Masas crecientes con el número de barra; cuantías crecientes en las mallas.
  const masas = Object.values(A6_BARRAS.filas).map(b => v(b.masa_kg_m));
  assert.deepEqual([...masas].sort((a, b) => a - b), masas);
  const cuantias = Object.values(A7_MALLAS.filas).map(m => v(m.cuantia_cm2_ml));
  assert.deepEqual([...cuantias].sort((a, b) => a - b), cuantias);
});

test('valores derivados: ángulo 27 % ≈ 15° y fórmula declarada', () => {
  const ang = A9_PENDIENTES.filas.fibrocemento_angulo_grados;
  assert.equal(ang.derivado, true);
  assert.equal(Math.round(Math.atan(v(A9_PENDIENTES.filas.fibrocemento_recomendada)) * 180 / Math.PI), v(ang));
  assert.match(ang.formula, /arctan\(0\.27\)/);
});

test('ciclópeo: 60 % + 40 % = 100 % y dosificación mínima 1:2:3', () => {
  assert.ok(cerca(v(CONCRETO_CICLOPEO.fraccion_concreto) + v(CONCRETO_CICLOPEO.fraccion_piedra), 1));
  assert.equal(v(CONCRETO_CICLOPEO.dosificacion_minima), '1:2:3');
  assert.ok(v(CONCRETO_CICLOPEO.dosificacion_minima) in A4_CONCRETOS.filas);
});
