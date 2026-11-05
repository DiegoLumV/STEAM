// Validación flexible de concreto del modo libre (?libre=1): pruebas de la función pura (Node, sin navegador,
// sin servidor ni base de datos). Los límites 1 000 000 / 4 000 000 son parámetros del SIMULADOR, no normas técnicas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  validarMezclaConcretoLibre, convertirCantidadConcreto, LIMITES_CONCRETO_LIBRE, COMPONENTES_CONCRETO,
} from '../src/scripts/calculos.js';

const mezcla = (cemento, arena, grava, agua) => ({ cemento, arena, grava, agua });
const codigos = r => r.errores.map(e => `${e.campo}:${e.codigo}`);

test('1. la mezcla original (1000/2000/3000/600) también es válida en el validador libre', () => {
  const r = validarMezclaConcretoLibre(mezcla('1000', '2000', '3000', '600'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.valores, { cemento: 1000, arena: 2000, grava: 3000, agua: 600 });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
});

test('2. otra escala (10/20/30/6) aceptada', () => {
  const r = validarMezclaConcretoLibre(mezcla('10', '20', '30', '6'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.valores, { cemento: 10, arena: 20, grava: 30, agua: 6 });
});

test('3. cantidades decimales aceptadas (0.5/1/1.5/0.3)', () => {
  const r = validarMezclaConcretoLibre(mezcla('0.5', '1', '1.5', '0.3'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.valores, { cemento: 0.5, arena: 1, grava: 1.5, agua: 0.3 });
  assert.equal(validarMezclaConcretoLibre(mezcla('.5', '2.', '3', '1')).ok, true); // ".5" y "2." son decimales válidos
});

test('4. proporciones distintas de 1:2:3 se aceptan y no generan ningún aviso de proporción', () => {
  for (const m of [mezcla('5', '1', '1', '9'), mezcla('3000', '2', '1', '100'), mezcla('1', '1', '1', '1')]) {
    const r = validarMezclaConcretoLibre(m);
    assert.equal(r.ok, true);
    assert.deepEqual(r.avisos, []);
  }
});

test('5. agua igual a cero: aceptada con aviso educativo "agua_cero"', () => {
  for (const agua of ['0', '0.0', '-0', 0]) {
    const r = validarMezclaConcretoLibre(mezcla('1', '2', '3', agua));
    assert.equal(r.ok, true, `agua=${agua}`);
    assert.equal(r.valores.agua, 0);
    assert.deepEqual(r.avisos.map(a => a.codigo), ['agua_cero']);
    assert.match(r.avisos[0].mensaje, /agua/i);
  }
});

test('6. cemento, arena o grava iguales a cero: rechazo con el campo indicado', () => {
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('0', '2', '3', '1'))), ['cemento:cero']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '0', '3', '1'))), ['arena:cero']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '2', '0.0', '1'))), ['grava:cero']);
  const r = validarMezclaConcretoLibre(mezcla('0', '0', '0', '0'));
  assert.deepEqual(codigos(r), ['cemento:cero', 'arena:cero', 'grava:cero']);
  assert.equal(r.valores, null);
  assert.match(r.errores[0].mensaje, /^Cemento:/);
});

test('7. campos vacíos, solo espacios y texto no numérico: rechazo (el vacío no se convierte en 0)', () => {
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('', '2', '3', '1'))), ['cemento:vacio']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '   ', '3', '1'))), ['arena:vacio']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '2', '3', ''))), ['agua:vacio']); // el agua puede ser 0, pero no estar vacía
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla(undefined, null, '3', '1'))), ['cemento:vacio', 'arena:vacio']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre({})), COMPONENTES_CONCRETO.map(c => `${c}:vacio`));
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('abc', '2', '3', '1'))), ['cemento:no_numerico']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '2', '3', 'mucha'))), ['agua:no_numerico']);
});

test('8. entradas parcialmente numéricas ("12abc", "0x10", "1,5", "1 2") rechazadas', () => {
  for (const malo of ['12abc', '0x10', '0b11', '1,5', '1 2', '1..5', '--3', 'e3', '1e', '12.5.1', '١٢']) {
    const r = validarMezclaConcretoLibre(mezcla(malo, '2', '3', '1'));
    assert.equal(r.ok, false, `"${malo}" debería rechazarse`);
    assert.deepEqual(codigos(r), ['cemento:no_numerico'], `"${malo}"`);
  }
});

test('9. negativos, NaN, Infinity y desbordamientos rechazados', () => {
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('-1', '2', '3', '1'))), ['cemento:negativo']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '2', '3', '-0.5'))), ['agua:negativo']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('NaN', '2', '3', '1'))), ['cemento:no_numerico']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('Infinity', '2', '3', '1'))), ['cemento:no_numerico']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('-Infinity', '2', '3', '1'))), ['cemento:no_numerico']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1e999', '2', '3', '1'))), ['cemento:no_finito']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '2', '9'.repeat(400), '1'))), ['grava:no_finito']);
  // valores numéricos (no texto) no finitos
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla(NaN, 2, 3, 1))), ['cemento:no_finito']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla(1, Infinity, 3, 1))), ['arena:no_finito']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla(1, 2, -Infinity, 1))), ['grava:no_finito']);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla(1, 2, 3, -4))), ['agua:negativo']);
});

test('10. notación científica válida aceptada cuando respeta los límites', () => {
  const r = validarMezclaConcretoLibre(mezcla('1e3', '2E3', '3e+3', '6e2'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.valores, { cemento: 1000, arena: 2000, grava: 3000, agua: 600 });
  assert.equal(validarMezclaConcretoLibre(mezcla('5e-3', '1e-2', '2.5e-1', '0')).ok, true);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1e7', '2', '3', '1'))), ['cemento:maximo_componente']); // finito pero fuera del límite
});

test('11. límites por defecto: máximo por componente y máximo del total', () => {
  assert.deepEqual({ ...LIMITES_CONCRETO_LIBRE }, { maxComponente: 1000000, maxTotal: 4000000 });
  assert.equal(Object.isFrozen(LIMITES_CONCRETO_LIBRE), true);
  // exactamente en el límite: válido
  assert.equal(validarMezclaConcretoLibre(mezcla('1000000', '1000000', '1000000', '1000000')).ok, true);
  // un poco por encima: rechazo con mensaje que nombra el campo y el límite
  const r = validarMezclaConcretoLibre(mezcla('1', '1000000.001', '3', '1'));
  assert.deepEqual(codigos(r), ['arena:maximo_componente']);
  assert.match(r.errores[0].mensaje, /^Arena:/);
  assert.match(r.errores[0].mensaje, /1,000,000/);
  assert.match(r.errores[0].mensaje, /simulador/);
  // el agua también tiene tope por componente
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('1', '2', '3', '2000000'))), ['agua:maximo_componente']);
});

test('12. límites alternativos suministrados a la función (por componente y total)', () => {
  const lim = { maxComponente: 100, maxTotal: 250 };
  assert.equal(validarMezclaConcretoLibre(mezcla('100', '50', '50', '50'), lim).ok, true);
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('101', '1', '1', '1'), lim)), ['cemento:maximo_componente']);
  const total = validarMezclaConcretoLibre(mezcla('100', '100', '51', '0'), lim); // cada una ≤ 100 pero suman 251
  assert.deepEqual(codigos(total), ['total:maximo_total']);
  assert.match(total.errores[0].mensaje, /suma/i);
  assert.match(total.errores[0].mensaje, /250/);
  // un límite parcial conserva el otro por defecto
  assert.deepEqual(codigos(validarMezclaConcretoLibre(mezcla('11', '1', '1', '1'), { maxComponente: 10 })), ['cemento:maximo_componente']);
  assert.equal(validarMezclaConcretoLibre(mezcla('1000000', '1', '1', '1'), { maxTotal: 5000000 }).ok, true);
  // con los límites por defecto la suma de 4 componentes válidos nunca supera maxTotal (4 × 1 000 000)
  assert.equal(validarMezclaConcretoLibre(mezcla('1000000', '1000000', '1000000', '1000000')).ok, true);
});

test('13. cantidades decimales muy pequeñas mayores que cero aceptadas (sin mínimos arbitrarios)', () => {
  const r = validarMezclaConcretoLibre(mezcla('0.001', '0.0001', '1e-9', '0.00001'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.valores, { cemento: 0.001, arena: 0.0001, grava: 1e-9, agua: 0.00001 });
  assert.deepEqual(r.avisos, []);
});

test('14. las advertencias nunca cambian la validez ni aparecen junto a errores como bloqueo', () => {
  const conAviso = validarMezclaConcretoLibre(mezcla('1', '2', '3', '0'));
  assert.equal(conAviso.ok, true);
  assert.equal(conAviso.avisos.length, 1);
  const sinAviso = validarMezclaConcretoLibre(mezcla('1', '2', '3', '0.1'));
  assert.equal(sinAviso.ok, true);
  assert.deepEqual(sinAviso.avisos, []);
  // con otro campo inválido, el aviso de agua 0 sigue visible pero la mezcla se rechaza por el error real
  const mixto = validarMezclaConcretoLibre(mezcla('', '2', '3', '0'));
  assert.equal(mixto.ok, false);
  assert.deepEqual(codigos(mixto), ['cemento:vacio']);
  assert.deepEqual(mixto.avisos.map(a => a.codigo), ['agua_cero']);
  // agua vacía o inválida no produce el aviso
  assert.deepEqual(validarMezclaConcretoLibre(mezcla('1', '2', '3', '')).avisos, []);
  assert.deepEqual(validarMezclaConcretoLibre(mezcla('1', '2', '3', 'x')).avisos, []);
});

test('la función no modifica sus entradas ni los límites por defecto, y es determinista', () => {
  const entradas = mezcla('1', '2', '3', '0');
  const copia = JSON.stringify(entradas);
  const a = validarMezclaConcretoLibre(entradas);
  const b = validarMezclaConcretoLibre(entradas);
  assert.equal(JSON.stringify(entradas), copia);
  assert.deepEqual(a, b);
  validarMezclaConcretoLibre(mezcla('1', '2', '3', '1'), { maxComponente: 1 });
  assert.deepEqual({ ...LIMITES_CONCRETO_LIBRE }, { maxComponente: 1000000, maxTotal: 4000000 });
  assert.equal(validarMezclaConcretoLibre(undefined).ok, false);
  assert.equal(validarMezclaConcretoLibre(null).ok, false);
});

test('convertirCantidadConcreto: solo acepta números completos', () => {
  assert.deepEqual(convertirCantidadConcreto(' 12 '), { valor: 12, codigo: null });
  assert.deepEqual(convertirCantidadConcreto('+3.5'), { valor: 3.5, codigo: null });
  assert.deepEqual(convertirCantidadConcreto('0'), { valor: 0, codigo: null });
  assert.equal(Object.is(convertirCantidadConcreto('-0').valor, 0), true); // sin -0
  assert.equal(convertirCantidadConcreto('').codigo, 'vacio');
  assert.equal(convertirCantidadConcreto('12abc').codigo, 'no_numerico');
  assert.equal(convertirCantidadConcreto('1e999').codigo, 'no_finito');
  assert.equal(convertirCantidadConcreto('-5').codigo, 'negativo');
});

/* ── Comprobaciones estáticas acotadas: el flujo del modo normal y las funciones protegidas no cambian ── */
const src = fs.readFileSync(new URL('../src/scripts/casa.js', import.meta.url), 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const funcion = nombre => {
  const i = src.indexOf(`function ${nombre}(`);
  assert.ok(i >= 0, `${nombre} presente`);
  return src.slice(i, src.indexOf('\n}\n', i) + 3);
};
const sinDerivacion = f => f.split('\n').filter(l => !l.startsWith('  if (modoLibreActivo) {')).join('\n'); // la única línea añadida a la función normal

test('estático: concretoMezclar y concretoActualizarBarra del modo normal conservan su cuerpo; solo se añadió la derivación al modo libre', () => {
  for (const [nombre, esperado] of [['concretoMezclar', 'be51410e376b45bb'], ['concretoActualizarBarra', 'a8782eb6d01e8316']]) {
    const f = funcion(nombre);
    const derivaciones = f.split('\n').filter(l => l.startsWith('  if (modoLibreActivo) {'));
    assert.equal(derivaciones.length, 1, `${nombre}: una sola derivación`);
    assert.equal(f.split('\n')[1], derivaciones[0], `${nombre}: la derivación es la primera instrucción`);
    assert.equal(hash(sinDerivacion(f)), esperado, `${nombre}: cuerpo del modo normal sin cambios`);
  }
  assert.match(src, /const CONCRETO_CORRECTO = \{ cemento: 1000, arena: 2000, grava: 3000, agua: 600 \};/);
  assert.match(src, /const CONCRETO_TOTAL = 6600;/);
});

test('estático: concretoFinalizar, unlockPhase2, validateHouse y openProgramar no se alteraron', () => {
  assert.equal(hash(funcion('concretoFinalizar')), '1fdc6bddac91817c');
  assert.equal(hash(funcion('unlockPhase2')), '3cfe8ff768ab6590');
  assert.equal(hash(funcion('validateHouse')), 'b92b0beff7ca380d');
  assert.equal(hash(funcion('openProgramar')), '918f9d0a7b580625');
  // la losa conserva sus dimensiones 20×20×0.2 y no depende de las cantidades
  assert.match(funcion('concretoFinalizar'), /CreateBox\('con_slab_' \+ id, \{ width: 20, height: 0\.2, depth: 20 \}, scene\)/);
  assert.doesNotMatch(funcion('concretoFinalizar'), /inp-|cemento|arena|grava|agua/);
});

test('estático: el modo libre se conecta solo con modoLibreActivo y con la función pura (sin parseFloat parcial)', () => {
  const libre = funcion('concretoMezclarLibre');
  assert.match(libre, /validarMezclaConcretoLibre\(/);
  assert.match(libre, /modo: 'libre'/);
  assert.doesNotMatch(libre, /parseFloat/);
  // Aislamiento de la evaluación: el servidor puntúa 'concreto_intento' con contexto.correcto, así que el modo libre
  // registra "mezcla_valida" y NUNCA "correcto" (ni en la rama de rechazo ni en la de éxito).
  assert.match(libre, /mezcla_valida: false/);
  assert.match(libre, /mezcla_valida: true/);
  assert.doesNotMatch(libre, /correcto/);
  assert.equal((libre.match(/registrar\('concreto_intento'/g) || []).length, 2, 'mismo evento en rechazo y éxito');
  assert.doesNotMatch(funcion('concretoActualizarBarraLibre'), /parseFloat/);
  assert.match(src, /concreto_slab_20'\)\) \{\s*\n\s*showLockedMessage/); // no se crea una segunda losa en la rama libre
});
