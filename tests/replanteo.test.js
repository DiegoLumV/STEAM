// F5 · Replanteo básico — pruebas de la lógica pura (replanteo.js y referencia_topografia.js). Sin navegador, sin base de datos.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPOGRAFIA, ER_PLANO, TEXTO_FORMULA_T, TEXTO_CRITERIO, DOCUMENTO_TOPOGRAFIA,
} from '../src/scripts/referencia_topografia.js';
import {
  REP_DESV_MAX_MM, REP_MAX_ESTACAS, TEXTOS_ESTADO, ESTADO_SIN, ESTADO_VIGENTE, ESTADO_DESACTUALIZADO,
  toleranciaMetros, letraFila, esquinasHabitacion, esquinasUnicas, ejesDe, crearEstacas, posicionEstaca, estadoReplanteo,
  validarDesviacion, escuadra345, medidasHabitacion, resumenMedidas, serializarReplanteo, sanearReplanteo, bytesReplanteo,
} from '../src/scripts/replanteo.js';

const hab = (id, x, z, ancho, largo) => ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre: id });
const H1 = hab('h1', -3, -2, 4, 3);                 // 4 m (este-oeste) × 3 m (norte-sur): la habitación de prueba de F4d
const H2 = hab('h2', 1, -2, 4, 3);                  // comparte con H1 el lado x = 1
const sinDesv = h => crearEstacas(Array.isArray(h) ? h : [h]);
const conDesv = (estacas, id, dx, dz) => estacas.map(e => (e.id === id ? { ...e, dx, dz } : e));

// ── Fuente (referencia_topografia.js) ──────────────────────────────────────────
test('T01 · ER del terreno plano = 1/5000, de Zamarripa (2012) p. 19 impresa y de PDF', () => {
  const c = TOPOGRAFIA.ER_TERRENO_PLANO;
  assert.equal(c.valor, 1 / 5000);
  assert.equal(ER_PLANO, 1 / 5000);
  assert.equal(c.fuente.pagina_impresa, 19);
  assert.equal(c.fuente.pagina_pdf, 19);
  assert.match(c.fuente.documento, /Zamarripa/);
  assert.equal(c.formula, 'T = D · ER');
  assert.equal(c.es_estimacion, false);
});
test('T02 · el método 3-4-5 viene de la p. 16 y la hipotenusa es derivada (3²+4²=5²)', () => {
  assert.equal(TOPOGRAFIA.ESCUADRA_CATETO_MENOR.valor, 3);
  assert.equal(TOPOGRAFIA.ESCUADRA_CATETO_MAYOR.valor, 4);
  assert.equal(TOPOGRAFIA.ESCUADRA_HIPOTENUSA.valor, 5);
  assert.equal(TOPOGRAFIA.ESCUADRA_HIPOTENUSA.derivado, true);
  assert.equal(TOPOGRAFIA.ESCUADRA_HIPOTENUSA.fuente.pagina_impresa, 16);
  assert.equal(Math.hypot(3, 4), 5);
});
test('T03 · el tope de ±1000 mm es una estimación propia (no viene de la fuente) y las constantes están congeladas', () => {
  assert.equal(TOPOGRAFIA.DESVIACION_MAX_MM.es_estimacion, true);
  assert.equal(REP_DESV_MAX_MM, 1000);
  assert.ok(Object.isFrozen(TOPOGRAFIA) && Object.isFrozen(TOPOGRAFIA.ER_TERRENO_PLANO.fuente));
  assert.equal(TOPOGRAFIA.ER_TERRENO_ACCIDENTADO.valor, 1 / 3000);
});
test('T04 · los textos muestran la fórmula T = D × ER con ER = 1/5000 y la fuente', () => {
  assert.equal(TEXTO_FORMULA_T, 'T = D × ER, con ER = 1/5000 (Zamarripa, 2012, p. 19)');
  assert.match(TEXTO_CRITERIO, /E > T/);
  assert.match(DOCUMENTO_TOPOGRAFIA, /2012/);
});

// ── Tolerancia ─────────────────────────────────────────────────────────────────
test('T05 · T = D·ER: diagonal de un cuarto de 4×4 (5,657 m) → 0,0011 m', () => {
  assert.equal(toleranciaMetros(Math.hypot(4, 4)).toFixed(4), '0.0011');
});
test('T06 · T para 5 m = 1 mm; para 10 m = 2 mm; para 3 m = 0,6 mm', () => {
  assert.ok(Math.abs(toleranciaMetros(5) - 0.001) < 1e-12);
  assert.ok(Math.abs(toleranciaMetros(10) - 0.002) < 1e-12);
  assert.ok(Math.abs(toleranciaMetros(3) - 0.0006) < 1e-12);
});
test('T07 · T admite otro ER (terreno accidentado) y no depende del signo de D', () => {
  assert.ok(Math.abs(toleranciaMetros(6, TOPOGRAFIA.ER_TERRENO_ACCIDENTADO.valor) - 0.002) < 1e-12);
  assert.equal(toleranciaMetros(-5), toleranciaMetros(5));
});

// ── Esquinas, ejes y estacas ───────────────────────────────────────────────────
test('T08 · letraFila: A…Z, AA, AB', () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map(letraFila), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
});
test('T09 · una habitación tiene 4 esquinas en mm (SO, SE, NO, NE) con las convenciones del plano', () => {
  assert.deepEqual(esquinasHabitacion(H1), { so: { x: -3000, z: -2000 }, se: { x: 1000, z: -2000 }, no: { x: -3000, z: 1000 }, ne: { x: 1000, z: 1000 } });
});
test('T10 · una habitación → 4 esquinas únicas; dos habitaciones que comparten una pared → 6 (las compartidas cuentan una vez)', () => {
  assert.equal(esquinasUnicas([H1]).length, 4);
  assert.equal(esquinasUnicas([H1, H2]).length, 6);
});
test('T11 · cuadrícula 2×2 de habitaciones → 9 esquinas; dos habitaciones sin contacto → 8', () => {
  assert.equal(esquinasUnicas([hab('a', 0, 0, 2, 2), hab('b', 2, 0, 2, 2), hab('c', 0, 2, 2, 2), hab('d', 2, 2, 2, 2)]).length, 9);
  assert.equal(esquinasUnicas([hab('a', 0, 0, 2, 2), hab('b', 5, 5, 2, 2)]).length, 8);
});
test('T12 · las esquinas salen ordenadas de oeste a este y, dentro de cada x, de sur a norte', () => {
  const e = esquinasUnicas([H2, H1]);
  assert.deepEqual(e.map(p => [p.x, p.z]), [[-3000, -2000], [-3000, 1000], [1000, -2000], [1000, 1000], [5000, -2000], [5000, 1000]]);
});
test('T13 · se ignoran habitaciones inválidas y entradas que no son lista', () => {
  assert.deepEqual(esquinasUnicas(null), []);
  assert.deepEqual(esquinasUnicas([null, { x: 0, z: 0, ancho: 0, largo: 2 }, { x: NaN, z: 0, ancho: 1, largo: 1 }]), []);
});
test('T14 · ejes: columnas 1, 2, 3… de oeste a este; filas A, B, C… de sur a norte', () => {
  const ej = ejesDe(esquinasUnicas([H1, H2]));
  assert.deepEqual(ej.columnas, [-3000, 1000, 5000]);
  assert.deepEqual(ej.filas, [-2000, 1000]);
  assert.equal(ej.etiquetaColumna(0), '1');
  assert.equal(ej.etiquetaFila(1), 'B');
});
test('T15 · las estacas se nombran fila + columna: A1, B1 (oeste) … A3, B3 (este)', () => {
  assert.deepEqual(sinDesv([H1, H2]).map(e => e.id), ['A1', 'B1', 'A2', 'B2', 'A3', 'B3']);
});
test('T16 · estacas nuevas: desviación 0 y posición = esquina teórica en metros', () => {
  const e = sinDesv(H1);
  assert.ok(e.every(s => s.dx === 0 && s.dz === 0));
  assert.deepEqual(posicionEstaca(e[0]), { x: -3, z: -2 });
});
test('T17 · posición real = esquina + desviación (mm → m)', () => {
  assert.deepEqual(posicionEstaca({ x: 1000, z: 1000, dx: 25, dz: -40 }), { x: 1.025, z: 0.96 });
});
test('T18 · volver a replantear conserva la desviación de las esquinas que siguen y pone 0 a las nuevas', () => {
  const antes = conDesv(sinDesv(H1), 'B1', 7, -3);
  const despues = crearEstacas([H1, H2], antes);
  assert.equal(despues.find(s => s.x === -3000 && s.z === 1000).dx, 7);
  assert.equal(despues.find(s => s.x === -3000 && s.z === 1000).dz, -3);
  assert.ok(despues.filter(s => s.x === 5000).every(s => s.dx === 0 && s.dz === 0));
});
test('T19 · sin habitaciones no hay estacas; más de 200 esquinas se rechazan', () => {
  assert.deepEqual(crearEstacas([]), []);
  const muchas = Array.from({ length: 60 }, (_, i) => hab('m' + i, i * 3, 0, 2, 2));          // 240 esquinas
  assert.equal(esquinasUnicas(muchas).length, 240);
  assert.deepEqual(crearEstacas(muchas), []);
  assert.equal(REP_MAX_ESTACAS, 200);
});

// ── C4: estados ────────────────────────────────────────────────────────────────
test('T20 · C4 · sin estacas → «Sin replanteo»', () => {
  assert.equal(estadoReplanteo([], [H1]), ESTADO_SIN);
  assert.equal(estadoReplanteo(null, [H1]), ESTADO_SIN);
  assert.equal(TEXTOS_ESTADO[ESTADO_SIN], 'Sin replanteo');
});
test('T21 · C4 · estacas que coinciden con las esquinas del plano → «Replanteo vigente» (aunque tengan desviación)', () => {
  assert.equal(estadoReplanteo(conDesv(sinDesv(H1), 'A1', 12, 5), [H1]), ESTADO_VIGENTE);
  assert.equal(TEXTOS_ESTADO[ESTADO_VIGENTE], 'Replanteo vigente');
});
test('T22 · C4 · mover, redimensionar, añadir o borrar una habitación → «desactualizado»', () => {
  const e = sinDesv([H1, H2]);
  assert.equal(estadoReplanteo(e, [H1, { ...H2, x: 1.5 }]), ESTADO_DESACTUALIZADO);
  assert.equal(estadoReplanteo(e, [H1, { ...H2, ancho: 5 }]), ESTADO_DESACTUALIZADO);
  assert.equal(estadoReplanteo(e, [H1, H2, hab('h3', 9, 9, 1, 1)]), ESTADO_DESACTUALIZADO);
  assert.equal(estadoReplanteo(e, [H1]), ESTADO_DESACTUALIZADO);
  assert.equal(estadoReplanteo(e, []), ESTADO_DESACTUALIZADO);
  assert.equal(TEXTOS_ESTADO[ESTADO_DESACTUALIZADO], 'Replanteo desactualizado. Vuelve a replantear.');
});
test('T23 · C4 · cambiar solo el nombre o los vanos NO desactualiza el replanteo', () => {
  assert.equal(estadoReplanteo(sinDesv(H1), [{ ...H1, nombre: 'Sala', vanos: [{ id: 'v1' }] }]), ESTADO_VIGENTE);
});

// ── C1: validar lo que escribe el alumno ───────────────────────────────────────
test('T24 · C1 · «abc» no se aplica y avisa', () => {
  const r = validarDesviacion('abc');
  assert.equal(r.valido, false);
  assert.match(r.aviso, /solo números/);
});
test('T25 · C1 · «5000» se recorta a 1000 con aviso; «-5000» a −1000', () => {
  const a = validarDesviacion('5000'), b = validarDesviacion('-5000');
  assert.deepEqual([a.valido, a.valor, a.ajustado], [true, 1000, true]);
  assert.deepEqual([b.valido, b.valor, b.ajustado], [true, -1000, true]);
  assert.match(a.aviso, /1000/);
});
test('T26 · C1 · enteros con signo y espacios se aplican tal cual; ±1000 exactos no avisan', () => {
  assert.equal(validarDesviacion(' 12 ').valor, 12);
  assert.equal(validarDesviacion('-7').valor, -7);
  assert.equal(validarDesviacion('+3').valor, 3);
  const t = validarDesviacion('1000');
  assert.deepEqual([t.valor, t.ajustado, t.aviso], [1000, false, '']);
});
test('T27 · C1 · decimales (punto o coma) se redondean al milímetro, simétrico: 2,5 → 3 y −2,5 → −3', () => {
  assert.equal(validarDesviacion('2,5').valor, 3);
  assert.equal(validarDesviacion('-2,5').valor, -3);
  assert.equal(validarDesviacion('4.2').valor, 4);
  assert.equal(validarDesviacion('1000.6').valor, 1000);
  assert.equal(validarDesviacion('1000.6').ajustado, true);
});
test('T28 · C1 · vacío = 0; notación científica, letras mezcladas, dobles signos y «Infinity» se rechazan', () => {
  assert.deepEqual([validarDesviacion('').valido, validarDesviacion('').valor], [true, 0]);
  for (const malo of ['1e3', '12abc', '--5', '5-', 'Infinity', 'NaN', '1,2,3', '0x10', '1 2']) assert.equal(validarDesviacion(malo).valido, false, malo);
});
test('T29 · C1 · el signo menos tipográfico (−) se acepta y −0 se normaliza a 0', () => {
  assert.equal(validarDesviacion('−5').valor, -5);
  assert.ok(Object.is(validarDesviacion('-0').valor, 0));
});

// ── 5b: medidas ────────────────────────────────────────────────────────────────
test('T30 · sin desviación: 4 lados, 2 diagonales y 8 escuadras (4 esquinas × 2 orientaciones), todo dentro de tolerancia', () => {
  const m = medidasHabitacion(H1, sinDesv(H1));
  assert.equal(m.lados.length, 4);
  assert.equal(m.diagonales.length, 2);
  assert.equal(m.escuadras.length, 8);
  assert.ok([...m.lados, ...m.diagonales].every(x => x.ok && x.E === 0));
  assert.deepEqual(resumenMedidas(m), { total: 10, repetir: 0 });
});
test('T31 · lados: sur y norte miden el ancho (4 m); oeste y este, el largo (3 m)', () => {
  const m = medidasHabitacion(H1, sinDesv(H1));
  assert.deepEqual(m.lados.map(x => [x.id, x.calculado]), [['sur', 4], ['norte', 4], ['oeste', 3], ['este', 3]]);
});
test('T32 · diagonal calculada = √(a²+b²) (4×3 → 5 m) y T = 1 mm', () => {
  const d = medidasHabitacion(H1, sinDesv(H1)).diagonales[0];
  assert.equal(d.calculado, 5);
  assert.ok(Math.abs(d.T - 0.001) < 1e-12);
});
test('T33 · 5b · 1 mm de desviación en un lado de 4 m (T = 0,8 mm) → E > T → hay que repetir la medición', () => {
  const e = conDesv(sinDesv(H1), 'A2', 1, 0);                                      // esquina SE: el lado sur mide 4,001
  const m = medidasHabitacion(H1, e);
  const sur = m.lados.find(x => x.id === 'sur');
  assert.ok(Math.abs(sur.E - 0.001) < 1e-9);
  assert.equal(sur.ok, false);
  assert.ok(resumenMedidas(m).repetir >= 1);
});
test('T34 · 5b · 1 mm de desviación en un lado de 10 m (T = 2 mm) → dentro de tolerancia', () => {
  const grande = hab('g', 0, 0, 10, 6);
  const m = medidasHabitacion(grande, conDesv(sinDesv(grande), 'A2', 1, 0));
  assert.equal(m.lados.find(x => x.id === 'sur').ok, true);
});
test('T35 · la regla es E ≤ T acepta y E > T repite; en el límite exacto se acepta', () => {
  const grande = hab('g', 0, 0, 10, 6);
  const dentro = medidasHabitacion(grande, conDesv(sinDesv(grande), 'A2', 2, 0)).lados.find(x => x.id === 'sur');   // E = 2 mm = T
  const fuera = medidasHabitacion(grande, conDesv(sinDesv(grande), 'A2', 3, 0)).lados.find(x => x.id === 'sur');
  assert.equal(dentro.ok, true);
  assert.equal(fuera.ok, false);
});
test('T36 · escuadra 3-4-5: k es el mayor entero que cabe; 4×3 → solo (4 en x, 3 en z) con k = 1', () => {
  const m = medidasHabitacion(H1, sinDesv(H1));
  assert.deepEqual(m.escuadras.filter(x => x.esquina === 'so').map(x => [x.orientacion, x.k, x.aplicable]), [['a', 0, false], ['b', 1, true]]);
});
test('T37 · escuadra 3-4-5: 8×6 → orientación a (3,4) k = 1 y orientación b (4,3) k = 2', () => {
  const g = hab('g', 0, 0, 8, 6);
  const m = medidasHabitacion(g, sinDesv(g));
  const so = m.escuadras.filter(x => x.esquina === 'so');
  assert.deepEqual(so.map(x => [x.orientacion, x.k, x.calculado]), [['a', 1, 5], ['b', 2, 10]]);
  assert.ok(so.every(x => x.ok));
});
test('T38 · escuadra 3-4-5: un cuarto de 2×2 no admite ni 3 ni 4 m: no aplicable y no cuenta en el resumen', () => {
  const p = hab('p', 0, 0, 2, 2);
  const m = medidasHabitacion(p, sinDesv(p));
  assert.ok(m.escuadras.every(x => x.aplicable === false));
  assert.deepEqual(resumenMedidas(m), { total: 6, repetir: 0 });
});
test('T39 · escuadra 3-4-5: con una esquina desplazada 20 mm en una dirección, la hipotenusa medida difiere de 5·k y se pide repetir', () => {
  const g = hab('g', 0, 0, 8, 6);
  const e = conDesv(sinDesv(g), 'B1', 20, 0);                                      // esquina NO desplazada hacia el este: el ángulo en la SO ya no es recto
  const so = medidasHabitacion(g, e).escuadras.filter(x => x.esquina === 'so' && x.aplicable);
  assert.ok(so.every(x => x.E > x.T && x.ok === false));
});
test('T40 · la desviación de una estaca compartida afecta a las dos habitaciones', () => {
  const e = conDesv(sinDesv([H1, H2]), 'A2', 0, 4);                                // SE de H1 = SO de H2
  const a = medidasHabitacion(H1, e).lados.find(x => x.id === 'este'), b = medidasHabitacion(H2, e).lados.find(x => x.id === 'oeste');
  assert.equal(a.ok, false);
  assert.equal(b.ok, false);
  assert.ok(Math.abs(a.medido - b.medido) < 1e-12);
});
test('T41 · si falta alguna estaca de la habitación (replanteo desactualizado) o la habitación no es válida → null', () => {
  assert.equal(medidasHabitacion({ ...H1, ancho: 5 }, sinDesv(H1)), null);
  assert.equal(medidasHabitacion(null, sinDesv(H1)), null);
  assert.deepEqual(resumenMedidas(null), { total: 0, repetir: 0 });
});
test('T42 · escuadra345 suelta: esquina con dos estacas coincidentes (lado de longitud 0) → no aplicable, sin dividir entre cero', () => {
  const c = { x: 0, z: 0, dx: 0, dz: 0 }, vx = { x: 8000, z: 0, dx: -8000, dz: 0 }, vz = { x: 0, z: 6000, dx: 0, dz: 0 };
  const r = escuadra345(c, vx, vz, 'b');
  assert.equal(r.aplicable, false);
});

// ── Guardado: progreso.replanteo ───────────────────────────────────────────────
test('T43 · serializar → sanear devuelve las mismas estacas (con sus ids) y la marca «oculto»', () => {
  const e = conDesv(sinDesv([H1, H2]), 'B2', -12, 30);
  const s = serializarReplanteo(e, true);
  assert.deepEqual(s, { v: 1, e: e.map(x => [x.x, x.z, x.dx, x.dz]), oculto: true });
  const r = sanearReplanteo(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(r.estacas, e);
  assert.equal(r.oculto, true);
});
test('T44 · sanear rechaza basura sin lanzar: null, texto, lista, versión distinta, e vacío o con filas mal formadas', () => {
  for (const mal of [null, undefined, 'x', 7, [], {}, { v: 2, e: [[0, 0, 0, 0]] }, { v: 1, e: [] }, { v: 1, e: 'a' }, { v: 1, e: [[0, 0, 0]] },
    { v: 1, e: [[0, 0, 0, 'a']] }, { v: 1, e: [[0, 0, NaN, 0]] }, { v: 1, e: [[1e9, 0, 0, 0]] }]) assert.equal(sanearReplanteo(mal), null);
});
test('T45 · sanear recorta desviaciones a ±1000, redondea, descarta duplicados, ordena y trata «oculto» solo si es true', () => {
  const r = sanearReplanteo({ v: 1, e: [[5000, 0, 5000, -5000], [0, 0, 2.6, 0], [0, 0, 9, 9]], oculto: 'si' });
  assert.deepEqual(r.estacas.map(x => [x.id, x.x, x.dx, x.dz]), [['A1', 0, 3, 0], ['A2', 5000, 1000, -1000]]);
  assert.equal(r.oculto, false);
});
test('T46 · tamaño: 50 habitaciones sin contacto (200 estacas) ≈ 5 KB; el progreso viaja dos veces en el PUT → < 15 KB (límite de parada)', () => {
  const habs = Array.from({ length: 50 }, (_, i) => hab('h' + i, (i % 10) * 9 - 45, Math.floor(i / 10) * 9 - 22, 4.5, 3.5));
  const e = crearEstacas(habs).map((s, i) => ({ ...s, dx: ((i * 37) % 1999) - 999, dz: ((i * 53) % 1999) - 999 }));
  assert.equal(e.length, 200);
  const b = bytesReplanteo(e);
  assert.ok(b < 7500, `una copia ocupa ${b} B`);
  assert.ok(2 * b < 15 * 1024, `dos copias ocupan ${2 * b} B`);
});
