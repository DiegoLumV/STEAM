// F6a · Zanjas de cimentación — pruebas de la lógica pura (cimentacion.js y referencia_cimentacion.js). Sin navegador, sin base de datos.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CIMENTACION, PISOS_VALIDOS, DOCUMENTO_NSR, TEXTO_FUENTE_ANCHO, TEXTO_FUENTE_PROF, TEXTO_NO_VALIDADO,
} from '../src/scripts/referencia_cimentacion.js';
import {
  CIM_VERSION, CIM_MAX_HAB, CIM_PROF_DEFECTO_MM, CIM_PROF_NSR_MM, ESTADO_SIN_ZANJAS, ESTADO_VIGENTE, ESTADO_DESACTUALIZADA, TEXTOS_ESTADO_CIM,
  anchoZanjaMm, validarProfundidad, opcionesZanjas, crearZanjas, paredesZanja, rectangulosZanja, unirRectangulos, recortarRectangulos,
  fosaDesde, complementoTerreno, geometriaZanjas, volumenZanjas, resumenZanjas, avisosZanjas, estadoCimentacion,
  serializarCimentacion, sanearCimentacion, bytesCimentacion,
} from '../src/scripts/cimentacion.js';
import { ESTADO_SIN, ESTADO_VIGENTE as REP_VIGENTE, ESTADO_DESACTUALIZADO } from '../src/scripts/replanteo.js';

const hab = (id, x, z, ancho, largo) => ({ id, tipo: 'habitacion', x, z, ancho, largo, nombre: id });
const H1 = hab('h1', -3, -2, 4, 3);                 // 4 m (este-oeste) × 3 m (norte-sur): la habitación de prueba de F4d
const H2 = hab('h2', 1, -2, 4, 3);                  // comparte con H1 el lado x = 1
const zanjas = (habs, op = {}) => crearZanjas(habs, op);
const codigos = av => av.map(a => a.codigo);

// ── Oráculo independiente: malla de 25 mm (todos los bordes de estas pruebas son múltiplos de 25 mm) ─────────────────────────
const PASO = 25;
function celdas(rects) {
  const xs = rects.flatMap(r => [r.x0, r.x1]), zs = rects.flatMap(r => [r.z0, r.z1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const nx = Math.round((x1 - x0) / PASO), nz = Math.round((z1 - z0) / PASO);
  const dentro = new Uint8Array(nx * nz);
  rects.forEach(r => {
    for (let i = Math.round((r.x0 - x0) / PASO); i < Math.round((r.x1 - x0) / PASO); i++)
      for (let j = Math.round((r.z0 - z0) / PASO); j < Math.round((r.z1 - z0) / PASO); j++) dentro[i * nz + j] = 1;
  });
  return { x0, z0, nx, nz, dentro };
}
const areaOraculo = rects => celdas(rects).dentro.reduce((s, v) => s + v, 0) * PASO * PASO;
function perimetroOraculo(rects) {
  const { nx, nz, dentro } = celdas(rects), en = (i, j) => (i >= 0 && j >= 0 && i < nx && j < nz ? dentro[i * nz + j] : 0);
  let n = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (en(i, j)) for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!en(i + a, j + b)) n++;
  return n * PASO;
}
function adicionalOraculo(rects, prof, fosa) {
  const { x0, z0, nx, nz, dentro } = celdas(rects);
  let v = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (!dentro[i * nz + j]) continue;
    const cx = x0 + (i + 0.5) * PASO, cz = z0 + (j + 0.5) * PASO;
    const enFosa = fosa && cx > fosa.x0 && cx < fosa.x1 && cz > fosa.z0 && cz < fosa.z1;
    v += PASO * PASO * Math.max(0, prof - (enFosa ? fosa.prof : 0));
  }
  return v;
}
const disjuntos = rects => rects.every((a, i) => rects.slice(i + 1).every(b => a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0));
const areaDe = rects => rects.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0);

const LAYOUTS = {
  'una habitación': [H1],
  'dos contiguas': [H1, H2],
  'dos separadas': [H1, hab('h2', 6, -2, 4, 3)],
  'cuadrícula 2×2': [hab('h1', 0, 0, 4, 3), hab('h2', 4, 0, 4, 3), hab('h3', 0, 3, 4, 3), hab('h4', 4, 3, 4, 3)],
  'en T': [hab('h1', 0, 0, 8, 3), hab('h2', 2, 3, 4, 3)],
};

// ── Fuente (referencia_cimentacion.js) ──────────────────────────────────────────
test('C01 · el ancho sale de la NSR-10 Tabla E.2.2-1 (mampostería): 250 mm un piso, 300 mm dos pisos; p. E-8 impresa, p. 14 del PDF', () => {
  for (const [k, v] of [['ANCHO_VIGA_1P', 0.25], ['ANCHO_VIGA_2P', 0.30]]) {
    assert.equal(CIMENTACION[k].valor, v);
    assert.equal(CIMENTACION[k].fuente.pagina_impresa, 'E-8');
    assert.equal(CIMENTACION[k].fuente.pagina_pdf, 14);
    assert.match(CIMENTACION[k].fuente.tabla, /E\.2\.2-1/);
    assert.equal(CIMENTACION[k].fuente.documento, DOCUMENTO_NSR);
    assert.equal(CIMENTACION[k].es_estimacion, false);
  }
  assert.match(TEXTO_FUENTE_ANCHO, /E\.2\.2-1/);
});
test('C02 · profundidad: 0.50 m (E.2.2.4, p. E-9) + 0.04 m de mortero (E.6.2.2, p. E-21) = 0.54 m, marcada como interpretación derivada', () => {
  assert.equal(CIMENTACION.PROF_MIN_VIGA.valor, 0.5);
  assert.equal(CIMENTACION.PROF_MIN_VIGA.fuente.pagina_pdf, 15);
  assert.equal(CIMENTACION.MORTERO_LIMPIEZA.valor, 0.04);
  assert.equal(CIMENTACION.MORTERO_LIMPIEZA.fuente.pagina_impresa, 'E-21');
  assert.equal(CIMENTACION.MORTERO_LIMPIEZA.fuente.pagina_pdf, 27);
  const d = CIMENTACION.PROF_DEFECTO;
  assert.equal(d.valor, 0.54);
  assert.equal(d.formula, '0.50 + 0.04');
  assert.equal(d.derivado, true);
  assert.equal(d.es_interpretacion, true);
  assert.equal(Math.round((CIMENTACION.PROF_MIN_VIGA.valor + CIMENTACION.MORTERO_LIMPIEZA.valor) * 1000) / 1000, d.valor);
  assert.match(TEXTO_FUENTE_PROF, /Interpretación/);
});
test('C03 · avisos: esbeltez 2 y dimensión interior 4,0 m (E.2.1.5, p. E-8), juntas 30 m (E.2.4.1, p. E-10)', () => {
  assert.equal(CIMENTACION.ESBELTEZ_ANILLO_MAX.valor, 2);
  assert.equal(CIMENTACION.ESBELTEZ_ANILLO_MAX.fuente.pagina_impresa, 'E-8');
  assert.equal(CIMENTACION.DIM_INTERIOR_MAX.valor, 4);
  assert.equal(CIMENTACION.DIM_INTERIOR_MAX.es_interpretacion, true);
  assert.equal(CIMENTACION.JUNTA_MAX.valor, 30);
  assert.equal(CIMENTACION.JUNTA_MAX.fuente.pagina_impresa, 'E-10');
  assert.equal(CIMENTACION.JUNTA_MAX.fuente.pagina_pdf, 16);
});
test('C04 · los límites de la herramienta son estimaciones propias (no vienen de la fuente) y todo está congelado', () => {
  for (const k of ['PROF_MIN_TECNICA', 'PROF_MAX_TECNICA', 'TERRENO_MEDIO_LADO', 'ZONA_MEDIO_LADO']) assert.equal(CIMENTACION[k].es_estimacion, true, k);
  assert.ok(Object.isFrozen(CIMENTACION) && Object.isFrozen(CIMENTACION.ANCHO_VIGA_1P) && Object.isFrozen(CIMENTACION.ANCHO_VIGA_1P.fuente));
  assert.ok(Object.isFrozen(PISOS_VALIDOS));
  assert.deepEqual([...PISOS_VALIDOS], [1, 2]);
  assert.match(TEXTO_NO_VALIDADO, /no es un dise/);
});

// ── Opciones: ancho por pisos y profundidad editable ──────────────────────────────
test('C05 · ancho 250 mm con 1 piso y 300 mm con 2 pisos; cualquier otra cosa se trata como 1 piso', () => {
  assert.equal(anchoZanjaMm(1), 250);
  assert.equal(anchoZanjaMm(2), 300);
  for (const v of [0, 3, '2', null, undefined, NaN]) assert.equal(anchoZanjaMm(v), 250, String(v));
});
test('C06 · opciones por defecto: 1 piso, 250 mm, 0.54 m, tierra vegetal, 100 % a retirar', () => {
  assert.deepEqual(opcionesZanjas(), { pisos: 1, ancho: 250, prof: 540, suelo: 'tierra_vegetal', retiro: 1 });
  assert.deepEqual(opcionesZanjas(null), opcionesZanjas({}));
  assert.equal(CIM_PROF_DEFECTO_MM, 540);
  assert.equal(CIM_PROF_NSR_MM, 500);
});
test('C07 · la profundidad es editable (100–3000 mm); fuera de rango o no numérica vuelve a 540 mm', () => {
  assert.equal(opcionesZanjas({ prof: 700 }).prof, 700);
  assert.equal(opcionesZanjas({ prof: 450 }).prof, 450);        // menor que 0.50: se acepta (solo avisa)
  assert.equal(opcionesZanjas({ prof: 100 }).prof, 100);
  assert.equal(opcionesZanjas({ prof: 3000 }).prof, 3000);
  for (const v of [99, 3001, -540, 0, NaN, Infinity, '700', null, undefined, {}]) assert.equal(opcionesZanjas({ prof: v }).prof, 540, String(v));
});
test('C08 · el ancho NO es libre: sale de los pisos aunque lo guardado diga otra cosa', () => {
  assert.equal(opcionesZanjas({ pisos: 2 }).ancho, 300);
  assert.equal(opcionesZanjas({ pisos: 2, ancho: 999 }).ancho, 300);
  assert.equal(opcionesZanjas({ pisos: 1, ancho: 300 }).ancho, 250);
  assert.equal(opcionesZanjas({ pisos: 3 }).pisos, 1);
});
test('C09 · suelo: solo con factor banco→suelto en A.1; los 2 sin factor (afirmado, material sucio de río) vuelven al valor por defecto; retiro 0–1', () => {
  assert.equal(opcionesZanjas({ suelo: 'tierra_franca' }).suelo, 'tierra_franca');
  for (const s of ['afirmado_bases_vias', 'material_sucio_rio_subbases', 'inexistente', 7, null]) assert.equal(opcionesZanjas({ suelo: s }).suelo, 'tierra_vegetal', String(s));
  assert.equal(opcionesZanjas({ retiro: 0 }).retiro, 0);
  assert.equal(opcionesZanjas({ retiro: 0.5 }).retiro, 0.5);
  for (const r of [-0.1, 1.1, NaN, '1']) assert.equal(opcionesZanjas({ retiro: r }).retiro, 1, String(r));
});
test('C10 · validarProfundidad: acepta coma decimal; rechaza vacío, texto y fuera de rango; 0.45 m es válido (el aviso lo da avisosZanjas)', () => {
  assert.deepEqual(validarProfundidad('0,54'), { valido: true, mm: 540, aviso: '' });
  assert.deepEqual(validarProfundidad(0.45), { valido: true, mm: 450, aviso: '' });
  assert.equal(validarProfundidad(1.2).mm, 1200);
  for (const v of ['', '   ', 'abc', NaN, null, undefined, 0.05, 3.5, -1, Infinity]) { const r = validarProfundidad(v); assert.equal(r.valido, false, String(v)); assert.equal(r.mm, null); assert.ok(r.aviso.length > 0); }
});

// ── Modelo y geometría ─────────────────────────────────────────────────────────────
test('C11 · crearZanjas: null sin habitaciones válidas; conserva ids y geometría; descarta vanos y basura', () => {
  for (const v of [undefined, null, [], 'x', [{}], [{ tipo: 'habitacion', x: 0, z: 0, ancho: -1, largo: 3 }]]) assert.equal(zanjas(v), null);
  const z = zanjas([{ ...H1, vanos: [{ id: 'v1' }] }, 'basura', null]);
  assert.equal(z.habitaciones.length, 1);
  assert.deepEqual(Object.keys(z.habitaciones[0]).sort(), ['ancho', 'id', 'largo', 'nombre', 'tipo', 'x', 'z']);
  assert.equal(z.habitaciones[0].id, 'h1');
});
test('C12 · una habitación 4×3 → 4 zanjas; dos contiguas 4×3 → 7 zanjas (la pared compartida es una sola)', () => {
  assert.equal(paredesZanja([H1]).length, 4);
  assert.equal(paredesZanja([H1, H2]).length, 7);
  assert.equal(resumenZanjas(zanjas([H1])).zanjas, 4);
  assert.equal(resumenZanjas(zanjas([H1, H2])).zanjas, 7);
});
test('C13 · un rectángulo por pared, centrado en su eje y alargado medio ancho en cada extremo', () => {
  const [w] = paredesZanja([H1]);                              // pared horizontal sur: z = −2, x de −3 a 1
  assert.deepEqual(w, { o: 'h', c: -2000, a: -3000, b: 1000, habitaciones: ['h1'] });
  assert.deepEqual(rectangulosZanja([w], 250)[0], { x0: -3125, x1: 1125, z0: -2125, z1: -1875 });
  const v = paredesZanja([H1]).find(p => p.o === 'v');
  assert.deepEqual(rectangulosZanja([v], 300)[0], { x0: v.c - 150, x1: v.c + 150, z0: v.a - 150, z1: v.b + 150 });
});
test('C14 · OBLIGATORIO · 1 habitación 4×3: 4 zanjas, 3,5 m² de zanja, 1,89 m³ en banco, 2,079 m³ sueltos, 1 viaje', () => {
  const r = resumenZanjas(zanjas([H1]));
  assert.equal(r.zanjas, 4);
  assert.equal(r.longitudM, 14);
  assert.equal(r.areaM2, 3.5);                                 // perímetro 14 m × 0,25 m
  assert.equal(r.volumenBruto, 1.89);
  assert.equal(r.volumen, 1.89);                               // 3,5 × 0,54
  assert.equal(r.volumenEnFosa, 0);
  assert.equal(r.factor, 1.1);
  assert.equal(r.suelto, 2.079);                               // 1,89 × 1,10 (A.1, tierra vegetal)
  assert.equal(r.viajes.viajesSinRedondear, 0.4158);
  assert.equal(r.viajes.viajes, 1);
});
test('C15 · OBLIGATORIO · 2 habitaciones contiguas 4×3: 7 zanjas, 3,341 m³ en banco (NO 3,78: las esquinas y la pared compartida no se cuentan dos veces)', () => {
  const r = resumenZanjas(zanjas([H1, H2]));
  assert.equal(r.zanjas, 7);
  assert.equal(r.longitudM, 25);
  assert.equal(r.areaM2, 6.1875);
  assert.equal(r.volumen, 3.341);                              // 6,1875 × 0,54 = 3,34125
  assert.notEqual(r.volumen, 3.78);
  const separado = resumenZanjas(zanjas([H1])).volumen + resumenZanjas(zanjas([hab('h1', 1, -2, 4, 3)])).volumen;
  assert.equal(Math.round(separado * 100) / 100, 3.78);        // lo que daría sumarlas por separado
  assert.ok(r.volumen < separado);
  assert.equal(r.suelto, Math.round(3.341 * 1.1 * 1000) / 1000);
});
test('C16 · 2 pisos: zanja de 300 mm → 4,2 m² y 2,268 m³ para la habitación 4×3', () => {
  const r = resumenZanjas(zanjas([H1], { pisos: 2 }));
  assert.equal(r.anchoM, 0.3);
  assert.equal(r.areaM2, 4.2);
  assert.equal(r.volumen, 2.268);
});
test('C17 · profundidad editable: 0,80 m → 2,8 m³; la profundidad cambia el volumen proporcionalmente', () => {
  const r = resumenZanjas(zanjas([H1], { prof: 800 }));
  assert.equal(r.profM, 0.8);
  assert.equal(r.volumen, 2.8);
  assert.equal(resumenZanjas(zanjas([H1], { prof: 1080 })).volumen, 3.78);
});
test('C18 · el suelo cambia el volumen suelto (A.1) y el retiro cambia los viajes', () => {
  assert.equal(resumenZanjas(zanjas([H1], { suelo: 'tierra_margosa_arcilla_compacta' })).suelto, 3.024);   // 1,89 × 1,60
  const r0 = resumenZanjas(zanjas([H1], { retiro: 0 }));
  assert.equal(r0.viajes.aRetirar, 0);
  assert.equal(r0.viajes.viajes, 0);
});
test('C19 · la unión coincide con un oráculo de malla de 25 mm (área y perímetro) en 5 plantas distintas', () => {
  for (const [nombre, habs] of Object.entries(LAYOUTS)) {
    for (const ancho of [250, 300]) {
      const rects = rectangulosZanja(paredesZanja(habs), ancho), u = unirRectangulos(rects);
      assert.equal(u.area, areaOraculo(rects), `${nombre} ${ancho}`);
      assert.ok(disjuntos(u.rectangulos), `${nombre}: rectángulos de la unión disjuntos`);
      assert.equal(areaDe(u.rectangulos), u.area, nombre);
    }
  }
});
test('C20 · dos habitaciones separadas sí suman: 8 zanjas y 3,78 m³', () => {
  const r = resumenZanjas(zanjas(LAYOUTS['dos separadas']));
  assert.equal(r.zanjas, 8);
  assert.equal(r.volumen, 3.78);
});
test('C21 · unirRectangulos: vacío, inválidos ignorados, solapes y rectángulos idénticos', () => {
  assert.deepEqual(unirRectangulos([]), { area: 0, rectangulos: [] });
  assert.deepEqual(unirRectangulos(null), { area: 0, rectangulos: [] });
  assert.equal(unirRectangulos([null, { x0: 1, x1: 1, z0: 0, z1: 5 }, { x0: NaN, x1: 2, z0: 0, z1: 1 }, 'x']).area, 0);
  const a = { x0: 0, x1: 100, z0: 0, z1: 100 };
  assert.equal(unirRectangulos([a, a]).area, 10000);
  assert.equal(unirRectangulos([a, { x0: 50, x1: 150, z0: 50, z1: 150 }]).area, 17500);
  assert.equal(unirRectangulos([a, { x0: 100, x1: 200, z0: 0, z1: 100 }]).rectangulos.length, 1);    // contiguos: se funden
});

// ── Fosa de F3: sin doble conteo ───────────────────────────────────────────────────
test('C22 · fosaDesde: solo con una excavación F3 activa y válida; la fosa va centrada en el origen (ancho en x, largo en z)', () => {
  assert.equal(fosaDesde(null), null);
  assert.equal(fosaDesde({ activa: false, largo: 5, ancho: 4, profundidad: 1 }), null);
  assert.equal(fosaDesde({ activa: true, largo: 0, ancho: 4, profundidad: 1 }), null);
  assert.equal(fosaDesde({ activa: true, largo: 5, ancho: 4 }), null);
  assert.deepEqual(fosaDesde({ activa: true, largo: 5, ancho: 4, profundidad: 1.5 }), { x0: -2000, x1: 2000, z0: -2500, z1: 2500, prof: 1500 });
});
test('C23 · zanja más somera que la fosa y dentro de ella: 0 m³ adicionales (todo es volumen de la fosa, sin doble conteo)', () => {
  const fosa = fosaDesde({ activa: true, largo: 12, ancho: 12, profundidad: 1 });
  const r = resumenZanjas(zanjas([H1]), fosa);
  assert.equal(r.volumenBruto, 1.89);
  assert.equal(r.volumen, 0);
  assert.equal(r.volumenEnFosa, 1.89);
  assert.equal(r.suelto, 0);
});
test('C24 · zanja más honda que la fosa: solo cuenta lo que queda por debajo del fondo de la fosa', () => {
  const fosa = fosaDesde({ activa: true, largo: 12, ancho: 12, profundidad: 1 });
  const r = resumenZanjas(zanjas([H1], { prof: 1500 }), fosa);
  assert.equal(r.volumenBruto, 5.25);                          // 3,5 × 1,5
  assert.equal(r.volumen, 1.75);                               // 3,5 × (1,5 − 1,0)
  assert.equal(r.volumenEnFosa, 3.5);
});
test('C25 · traslape parcial con la fosa: coincide con el oráculo de malla; sin fosa el adicional es todo el bruto', () => {
  const fosa = fosaDesde({ activa: true, largo: 2, ancho: 2, profundidad: 0.3 });
  const rects = rectangulosZanja(paredesZanja([H1]), 250);
  const v = volumenZanjas(rects, 540, fosa);
  assert.equal(v.adicionalMm3, adicionalOraculo(rects, 540, fosa));
  assert.ok(v.adicionalMm3 < v.brutoMm3 && v.adicionalMm3 > 0);
  const sin = volumenZanjas(rects, 540, null);
  assert.equal(sin.adicionalMm3, sin.brutoMm3);
  assert.equal(sin.adicionalMm3, adicionalOraculo(rects, 540, null));
});
test('C26 · zanja fuera de la fosa: la fosa no cambia nada', () => {
  const fosa = fosaDesde({ activa: true, largo: 2, ancho: 2, profundidad: 3 });
  const lejos = zanjas([hab('h1', 8, 8, 4, 3)]);
  assert.deepEqual(resumenZanjas(lejos, fosa), resumenZanjas(lejos, null));
});

// ── Terreno: complemento de (fosa ∪ zanjas) ────────────────────────────────────────
test('C27 · sin huecos el terreno es el cuadrado entero (±13 m y ±10 m)', () => {
  assert.deepEqual(complementoTerreno([], 13000), [{ x0: -13000, x1: 13000, z0: -13000, z1: 13000 }]);
  assert.deepEqual(complementoTerreno(null, 10000), [{ x0: -10000, x1: 10000, z0: -10000, z1: 10000 }]);
});
test('C28 · terreno con el anillo de zanjas: rectángulos disjuntos que no tocan ningún hueco, y área = cuadrado − unión', () => {
  const rects = rectangulosZanja(paredesZanja([H1]), 250), u = unirRectangulos(rects);
  for (const lado of [13000, 10000]) {
    const t = complementoTerreno(rects, lado);
    assert.ok(disjuntos(t), `lado ${lado}`);
    assert.equal(areaDe(t), (2 * lado) ** 2 - u.area, `lado ${lado}`);
    for (const a of t) for (const h of u.rectangulos) assert.ok(a.x1 <= h.x0 || h.x1 <= a.x0 || a.z1 <= h.z0 || h.z1 <= a.z0, 'el terreno no cubre una zanja');
  }
});
test('C29 · terreno con fosa + zanjas (se solapan): el área descontada es la de la UNIÓN, no la suma', () => {
  const fosa = fosaDesde({ activa: true, largo: 2, ancho: 2, profundidad: 1 });
  const rects = rectangulosZanja(paredesZanja([H1]), 250);
  const huecos = [...rects, fosa], t = complementoTerreno(huecos, 13000);
  assert.ok(disjuntos(t));
  assert.equal(areaDe(t), 26000 ** 2 - unirRectangulos(huecos).area);
  assert.ok(unirRectangulos(huecos).area < unirRectangulos(rects).area + 2000 * 2000);
});
test('C30 · una zanja que sale del terreno se recorta; si queda del todo fuera, no descuenta nada', () => {
  const afuera = [{ x0: 14000, x1: 15000, z0: 0, z1: 1000 }];
  assert.equal(areaDe(complementoTerreno(afuera, 13000)), 26000 ** 2);
  const medio = [{ x0: 12000, x1: 15000, z0: 0, z1: 1000 }];
  assert.equal(areaDe(complementoTerreno(medio, 13000)), 26000 ** 2 - 1000 * 1000);
  assert.deepEqual(recortarRectangulos(medio, 13000), [{ x0: 12000, x1: 13000, z0: 0, z1: 1000 }]);
  assert.deepEqual(recortarRectangulos(afuera, 13000), []);
});

// ── Geometría 3D ─────────────────────────────────────────────────────────────────
const areaMuros = ms => ms.reduce((s, m) => s + (m.a1 - m.a0) * (m.y1 - m.y0), 0);
test('C31 · sin fosa: el piso es la unión a −prof y las paredes suman perímetro × prof (28 m × 0,54 m para una habitación 4×3)', () => {
  const rects = rectangulosZanja(paredesZanja([H1]), 250), g = geometriaZanjas(rects, 540, null);
  assert.equal(areaDe(g.suelos), unirRectangulos(rects).area);
  assert.ok(g.suelos.every(s => s.y === -540));
  assert.equal(perimetroOraculo(rects), 28000);
  assert.equal(areaMuros(g.muros), 28000 * 540);
  assert.ok(g.muros.every(m => m.y0 === -540 && m.y1 === 0 && m.a1 > m.a0 && (m.eje === 'x' || m.eje === 'z') && (m.n === 1 || m.n === -1)));
  assert.deepEqual(g.pisoFosa, []);
  assert.equal(g.fosaPerforada, false);
});
test('C31b · cada pared mira hacia el lado bajo (la zanja): las del borde exterior del anillo miran hacia el centro de la casa y las del borde interior miran hacia fuera', () => {
  const rects = rectangulosZanja(paredesZanja([H1]), 250), g = geometriaZanjas(rects, 540, null);
  const cx = -1000, cz = -500;                                     // centro de la habitación (x −3…1, z −2…1)
  for (const m of g.muros) {
    const interior = m.eje === 'x' ? Math.abs(m.c - cx) < 2000 : Math.abs(m.c - cz) < 1500;           // el muro está en el borde interior del anillo
    const haciaCentro = m.eje === 'x' ? Math.sign(cx - m.c) : Math.sign(cz - m.c);
    assert.equal(m.n, interior ? -haciaCentro : haciaCentro, JSON.stringify(m));
  }
  assert.equal(g.muros.length, 8);                                 // 4 lados exteriores + 4 interiores: las esquinas no parten las paredes
  assert.equal(g.muros.filter(m => m.eje === 'x' && m.n === 1).length, 2);   // x = −3,125 (exterior oeste) y x = 0,875 (interior este)
});
test('C32 · perímetro y paredes cuadran con el oráculo en las 5 plantas (las paredes compartidas no se dibujan dos veces)', () => {
  for (const [nombre, habs] of Object.entries(LAYOUTS)) {
    const rects = rectangulosZanja(paredesZanja(habs), 250), g = geometriaZanjas(rects, 540, null);
    assert.equal(areaMuros(g.muros), perimetroOraculo(rects) * 540, nombre);
    assert.equal(areaDe(g.suelos), areaOraculo(rects), nombre);
  }
});
test('C33 · zanja dentro de la fosa y más honda: piso a −prof y paredes solo de −prof a −D (la fosa ya dibuja de −D a 0)', () => {
  const fosa = fosaDesde({ activa: true, largo: 12, ancho: 12, profundidad: 0.3 });
  const rects = rectangulosZanja(paredesZanja([H1]), 250), g = geometriaZanjas(rects, 540, fosa);
  assert.equal(areaDe(g.suelos), unirRectangulos(rects).area);
  assert.ok(g.muros.every(m => m.y0 === -540 && m.y1 === -300));
  assert.equal(areaMuros(g.muros), 28000 * 240);
});
test('C33b · zanja más honda que la fosa: el piso sólido de la fosa se sustituye por uno con las zanjas recortadas (pit − unión), a −D, y se avisa con fosaPerforada', () => {
  const fosa = fosaDesde({ activa: true, largo: 12, ancho: 12, profundidad: 0.3 });
  const rects = rectangulosZanja(paredesZanja([H1]), 250), u = unirRectangulos(rects), g = geometriaZanjas(rects, 540, fosa);
  assert.equal(g.fosaPerforada, true);
  assert.equal(areaDe(g.pisoFosa), 12000 * 12000 - u.area);
  assert.ok(g.pisoFosa.every(r => r.y === -300));
  assert.ok(disjuntos(g.pisoFosa) && disjuntos([...g.pisoFosa, ...g.suelos]));
  assert.equal(areaDe(g.pisoFosa) + areaDe(g.suelos), 12000 * 12000);      // piso de la fosa + fondo de las zanjas cubren toda la fosa, sin huecos ni solapes
});
test('C34 · zanja más somera que la fosa y dentro de ella: no se dibuja nada (la fosa ya lo cubre)', () => {
  const fosa = fosaDesde({ activa: true, largo: 12, ancho: 12, profundidad: 1 });
  const g = geometriaZanjas(rectangulosZanja(paredesZanja([H1]), 250), 540, fosa);
  assert.deepEqual(g, { suelos: [], muros: [], pisoFosa: [], fosaPerforada: false });
});
test('C35 · zanja que cruza el borde de la fosa: ninguna pared sube por encima de 0 ni baja de −prof, y el borde de la fosa solo añade lo que queda debajo de −D', () => {
  const fosa = fosaDesde({ activa: true, largo: 2, ancho: 2, profundidad: 0.3 });
  const g = geometriaZanjas(rectangulosZanja(paredesZanja([H1]), 250), 540, fosa);
  assert.ok(g.suelos.length > 0 && g.muros.length > 0);
  assert.ok(g.muros.every(m => m.y0 >= -540 && m.y1 <= 0 && m.y1 > m.y0));
  assert.ok(g.muros.some(m => m.y1 === -300), 'hay paredes que arrancan en el fondo de la fosa (−D)');
  assert.ok(g.muros.some(m => m.y1 === 0), 'y paredes de la zanja fuera de la fosa que llegan al terreno');
  assert.ok(g.suelos.every(s => s.y === -540));
  assert.equal(g.fosaPerforada, true);                                      // la zanja honda entra en la fosa
});
test('C36 · geometriaZanjas con datos vacíos o profundidad inválida devuelve listas vacías', () => {
  for (const [r, p] of [[[], 540], [null, 540], [[{ x0: 0, x1: 1, z0: 0, z1: 1 }], 0], [[{ x0: 0, x1: 1, z0: 0, z1: 1 }], -5], [[{ x0: 0, x1: 1, z0: 0, z1: 1 }], NaN]]) {
    assert.deepEqual(geometriaZanjas(r, p), { suelos: [], muros: [], pisoFosa: [], fosaPerforada: false });
  }
});

// ── Avisos: ninguno bloquea ──────────────────────────────────────────────────────
test('C37 · 4×3 con 0,54 m: sin avisos', () => {
  assert.deepEqual(avisosZanjas(zanjas([H1])), []);
  assert.deepEqual(avisosZanjas(zanjas([H1]), { estadoReplanteo: REP_VIGENTE }), []);
});
test('C38 · profundidad menor que 0,50 m → aviso (NSR-10 E.2.2.4); con 0,50 m exactos no avisa; el volumen se calcula igual', () => {
  const z = zanjas([H1], { prof: 450 });
  assert.deepEqual(codigos(avisosZanjas(z)), ['prof_menor_min']);
  assert.match(avisosZanjas(z)[0].texto, /E\.2\.2\.4/);
  assert.deepEqual(avisosZanjas(zanjas([H1], { prof: 500 })), []);
  assert.equal(resumenZanjas(z).volumen, 1.575);              // sigue calculando: 3,5 × 0,45
});
test('C39 · largo/ancho > 2 → aviso de esbeltez (E.2.1.5); exactamente 2 no avisa', () => {
  const av = avisosZanjas(zanjas([hab('h1', 0, 0, 3, 7)]));  // 7/3 = 2,33
  assert.ok(codigos(av).includes('esbeltez'));
  assert.match(av.find(a => a.codigo === 'esbeltez').texto, /h1: largo\/ancho = 2,33 > 2/);
  assert.ok(!codigos(avisosZanjas(zanjas([hab('h1', 0, 0, 3, 6)]))).includes('esbeltez'));
  assert.ok(codigos(avisosZanjas(zanjas([hab('h1', 0, 0, 7, 3)]))).includes('esbeltez'));    // vale en ambos sentidos
});
test('C40 · dimensión interior > 4,0 m (lado − ancho de la viga) → aviso; 4,25 m con 250 mm da 4,0 y no avisa; con 2 pisos el umbral cambia a 4,30 m', () => {
  assert.ok(codigos(avisosZanjas(zanjas([hab('h1', 0, 0, 4.5, 3)]))).includes('interior_mayor_4m'));
  assert.ok(!codigos(avisosZanjas(zanjas([hab('h1', 0, 0, 4.25, 3)]))).includes('interior_mayor_4m'));
  assert.ok(!codigos(avisosZanjas(zanjas([hab('h1', 0, 0, 4.3, 3)], { pisos: 2 }))).includes('interior_mayor_4m'));
  assert.ok(codigos(avisosZanjas(zanjas([hab('h1', 0, 0, 4.35, 3)], { pisos: 2 }))).includes('interior_mayor_4m'));
});
test('C41 · tramo continuo > 30 m → aviso de juntas (E.2.4.1), también cuando son dos paredes colineales contiguas; 29 m no avisa', () => {
  const largo = [hab('h1', 0, 0, 16, 8), hab('h2', 16, 0, 16, 8)];       // eje z = 0 de 0 a 32 m
  const av = avisosZanjas(zanjas(largo));
  assert.ok(codigos(av).includes('tramo_mayor_30'));
  assert.match(av.find(a => a.codigo === 'tramo_mayor_30').texto, /32,0 m/);
  const corto = [hab('h1', 0, 0, 14.5, 8), hab('h2', 14.5, 0, 14.5, 8)];  // 29 m
  assert.ok(!codigos(avisosZanjas(zanjas(corto))).includes('tramo_mayor_30'));
  assert.ok(!codigos(avisosZanjas(zanjas([H1, H2]))).includes('tramo_mayor_30'));
});
test('C42 · zanjas fuera de ±13 m → aviso; dentro no', () => {
  const av = avisosZanjas(zanjas([hab('h1', 12, 0, 4, 3)]));
  assert.ok(codigos(av).includes('fuera_terreno'));
  assert.ok(!codigos(avisosZanjas(zanjas([hab('h1', 8, 0, 4, 3)]))).includes('fuera_terreno'));
  assert.ok(!codigos(avisosZanjas(zanjas([hab('h1', 8.7, 0, 4, 3)]))).includes('fuera_terreno'));   // el borde exterior de la zanja queda en 12,825 m
  assert.ok(codigos(avisosZanjas(zanjas([hab('h1', 9, 0, 4, 3)]))).includes('fuera_terreno'));      // pared en 13,0 m + medio ancho de zanja = 13,125 m > 13
  assert.ok(codigos(avisosZanjas(zanjas([hab('h1', -17, 0, 4, 3)]))).includes('fuera_terreno'));    // también por el oeste
});
test('C43 · sin replanteo / replanteo desactualizado → sugerencia; replanteo vigente o dato ausente no avisa', () => {
  assert.deepEqual(codigos(avisosZanjas(zanjas([H1]), { estadoReplanteo: ESTADO_SIN })), ['sin_replanteo']);
  assert.deepEqual(codigos(avisosZanjas(zanjas([H1]), { estadoReplanteo: ESTADO_DESACTUALIZADO })), ['replanteo_desactualizado']);
  assert.deepEqual(avisosZanjas(zanjas([H1]), { estadoReplanteo: REP_VIGENTE }), []);
  assert.deepEqual(avisosZanjas(zanjas([H1]), {}), []);
  assert.deepEqual(avisosZanjas(zanjas([H1])), []);
});
test('C44 · los avisos se acumulan, son {codigo, texto} y nunca impiden calcular', () => {
  const z = zanjas([hab('h1', 12, 0, 3, 8)], { prof: 400 });
  const av = avisosZanjas(z, { estadoReplanteo: ESTADO_SIN });
  // 3 × 8 m en x = 12: esbeltez (8/3 > 2), interior 8,0 − 0,25 = 7,75 m > 4,0 m, sale del terreno, 0,40 m < 0,50 m y sin replanteo
  assert.deepEqual(codigos(av).sort(), ['esbeltez', 'fuera_terreno', 'interior_mayor_4m', 'prof_menor_min', 'sin_replanteo'].sort());
  assert.ok(av.every(a => typeof a.codigo === 'string' && typeof a.texto === 'string' && a.texto.length > 10));
  assert.ok(resumenZanjas(z).volumen > 0);
});

// ── Estado ──────────────────────────────────────────────────────────────────────
test('C45 · estado: sin zanjas / vigente / desactualizada según la geometría del plano actual (nombres, ids y orden no cuentan)', () => {
  const z = zanjas([H1, H2]);
  assert.equal(estadoCimentacion(null, [H1]), ESTADO_SIN_ZANJAS);
  assert.equal(estadoCimentacion(z, [H1, H2]), ESTADO_VIGENTE);
  assert.equal(estadoCimentacion(z, [H2, H1]), ESTADO_VIGENTE);
  assert.equal(estadoCimentacion(z, [{ ...H1, nombre: 'Sala' }, { ...H2, id: 'h9' }]), ESTADO_VIGENTE);
  assert.equal(estadoCimentacion(z, [{ ...H1, vanos: [] }, H2]), ESTADO_VIGENTE);
  assert.equal(estadoCimentacion(z, [{ ...H1, x: -2.5 }, H2]), ESTADO_DESACTUALIZADA);
  assert.equal(estadoCimentacion(z, [{ ...H1, ancho: 4.001 }, H2]), ESTADO_DESACTUALIZADA);
  assert.equal(estadoCimentacion(z, [H1]), ESTADO_DESACTUALIZADA);
  assert.equal(estadoCimentacion(z, [H1, H2, hab('h3', 5, -2, 2, 2)]), ESTADO_DESACTUALIZADA);
  assert.equal(estadoCimentacion(z, []), ESTADO_DESACTUALIZADA);
  assert.equal(estadoCimentacion(z, undefined), ESTADO_DESACTUALIZADA);
  assert.deepEqual(Object.keys(TEXTOS_ESTADO_CIM).sort(), [ESTADO_DESACTUALIZADA, ESTADO_SIN_ZANJAS, ESTADO_VIGENTE].sort());
});

// ── Guardado y saneo ─────────────────────────────────────────────────────────────
test('C46 · serializar: formato v1, geometría en mm enteros, sin nombres ni vanos', () => {
  const s = serializarCimentacion(zanjas([H1], { pisos: 2, prof: 600, suelo: 'tierra_franca', retiro: 0.5 }));
  assert.deepEqual(s, { v: 1, zanjas: { h: [['h1', -3000, -2000, 4000, 3000]], pisos: 2, ancho: 300, prof: 600, suelo: 'tierra_franca', retiro: 0.5 } });
  assert.equal(CIM_VERSION, 1);
  JSON.stringify(s);
});
test('C47 · ida y vuelta: sanear(serializar(z)) devuelve la misma geometría y las mismas opciones, incluso con milímetros', () => {
  const z = zanjas([hab('h1', -3.123, -2.007, 4.5, 3.25), hab('h2', 1.377, -2.007, 4.001, 3.25)], { pisos: 2, prof: 777, suelo: 'terrenos_fijos_pequena_cohesion', retiro: 0.25 });
  const r = sanearCimentacion(JSON.parse(JSON.stringify(serializarCimentacion(z))));
  const geo = q => q.habitaciones.map(({ id, x, z: zz, ancho, largo }) => ({ id, x, z: zz, ancho, largo }));
  assert.deepEqual(geo(r), geo(z));
  for (const k of ['pisos', 'ancho', 'prof', 'suelo', 'retiro']) assert.equal(r[k], z[k], k);
  assert.deepEqual(resumenZanjas(r), resumenZanjas(z));
  assert.equal(estadoCimentacion(r, z.habitaciones), ESTADO_VIGENTE);
});
test('C48 · sanearCimentacion descarta lo inválido y devuelve null (nunca lanza)', () => {
  const ok = () => serializarCimentacion(zanjas([H1]));
  const malos = [
    undefined, null, 0, 'x', true, [], {}, { v: 1 }, { zanjas: {} }, { v: 2, zanjas: ok().zanjas }, { v: '1', zanjas: ok().zanjas },
    { v: 1, zanjas: null }, { v: 1, zanjas: [] }, { v: 1, zanjas: { h: 'x' } }, { v: 1, zanjas: { h: [] } }, { v: 1, zanjas: { h: {} } },
    { v: 1, zanjas: { h: [['h1', 0, 0, 4000]] } },                                  // fila corta
    { v: 1, zanjas: { h: [['h1', 0, 0, 4000, 3000, 9]] } },                         // fila larga
    { v: 1, zanjas: { h: [[1, 0, 0, 4000, 3000]] } },                               // id no es texto
    { v: 1, zanjas: { h: [['h1', 'a', 0, 4000, 3000]] } },
    { v: 1, zanjas: { h: [['h1', 0, 0, NaN, 3000]] } },
    { v: 1, zanjas: { h: [['h1', 0, 0, Infinity, 3000]] } },
    { v: 1, zanjas: { h: [['h1', 0, 0, null, 3000]] } },
    { v: 1, zanjas: { h: [['h1', 0, 0, -4000, 3000]] } },                           // ancho negativo
    { v: 1, zanjas: { h: [['h1', 0, 0, 0, 3000]] } },                               // ancho 0
    { v: 1, zanjas: { h: [['h1', 0, 0, 50, 3000]] } },                              // menor que el lado mínimo (0,1 m)
    { v: 1, zanjas: { h: [['h1', 0, 0, 100001, 3000]] } },                          // mayor que el lado máximo (100 m)
    { v: 1, zanjas: { h: [['h1', 2000000, 0, 4000, 3000]] } },                      // fuera de ±1000 m
    { v: 1, zanjas: { h: [['h1', 0, 0, 4000, 3000], 'basura'] } },                  // una fila mala invalida TODO
    { v: 1, zanjas: { h: [['h1', 0, 0, 4000, 3000], null] } },
  ];
  malos.forEach((m, i) => assert.equal(sanearCimentacion(m), null, `caso ${i}: ${JSON.stringify(m)}`));
  const hostil = { get v() { throw new Error('getter hostil'); } };
  assert.equal(sanearCimentacion(hostil), null);
  assert.equal(sanearCimentacion(new Proxy({}, { get() { throw new Error('proxy hostil'); } })), null);
  const circular = { v: 1 }; circular.zanjas = circular;
  assert.equal(sanearCimentacion(circular), null);
});
test('C49 · más de 50 habitaciones → se descarta todo (no se restaura media excavación); exactamente 50 sí', () => {
  const fila = k => [`h${k}`, (k % 10) * 5000, Math.floor(k / 10) * 4000, 4000, 3000];
  const con = n => ({ v: 1, zanjas: { h: Array.from({ length: n }, (_, k) => fila(k + 1)), pisos: 1, ancho: 250, prof: 540, suelo: 'tierra_vegetal', retiro: 1 } });
  assert.equal(CIM_MAX_HAB, 50);
  assert.equal(sanearCimentacion(con(51)), null);
  assert.equal(sanearCimentacion(con(50)).habitaciones.length, 50);
});
test('C50 · opciones inválidas dentro de un guardado válido → valores por defecto (el JSON de la geometría se conserva)', () => {
  const base = serializarCimentacion(zanjas([H1]));
  const r = sanearCimentacion({ v: 1, zanjas: { ...base.zanjas, pisos: 7, ancho: 9999, prof: 'abc', suelo: 'unobtainium', retiro: 5 } });
  assert.deepEqual({ pisos: r.pisos, ancho: r.ancho, prof: r.prof, suelo: r.suelo, retiro: r.retiro }, opcionesZanjas());
  assert.equal(r.habitaciones.length, 1);
  const r2 = sanearCimentacion({ v: 1, zanjas: { ...base.zanjas, pisos: 2, ancho: 250 } });
  assert.equal(r2.ancho, 300);
});
test('C51 · ids repetidos o mal formados en lo guardado se reasignan sin perder habitaciones; no muta la entrada', () => {
  const entrada = { v: 1, zanjas: { h: [['h1', 0, 0, 4000, 3000], ['h1', 5000, 0, 4000, 3000], ['loquesea', 10000, 0, 4000, 3000]], pisos: 1, ancho: 250, prof: 540, suelo: 'tierra_vegetal', retiro: 1 } };
  const copia = JSON.stringify(entrada), r = sanearCimentacion(entrada);
  assert.equal(JSON.stringify(entrada), copia);
  assert.equal(r.habitaciones.length, 3);
  assert.equal(new Set(r.habitaciones.map(h => h.id)).size, 3);
});

// ── Tamaño del guardado ──────────────────────────────────────────────────────────
const cincuenta = () => Array.from({ length: 50 }, (_, k) => hab(`h${k + 1}`, -45.678 + (k % 10) * 9.123, -17.891 + Math.floor(k / 10) * 7.456, 4.321, 3.987));
test('C52 · OBLIGATORIO · el snapshot de 50 habitaciones pesa menos de 2 KB (se mide, no se supone)', () => {
  const z = zanjas(cincuenta());
  assert.equal(z.habitaciones.length, 50);
  const bytes = bytesCimentacion(z), enPut = bytes * 2;       // el progreso viaja dos veces en el PUT de guardado
  console.log(`# bytes(progreso.cimentacion, 50 habitaciones) = ${bytes} B (×2 en el PUT = ${enPut} B)`);
  assert.ok(bytes < 2048, `${bytes} B ≥ 2 KB`);
  assert.equal(bytes, new TextEncoder().encode(JSON.stringify(serializarCimentacion(z))).length);
  assert.equal(sanearCimentacion(JSON.parse(JSON.stringify(serializarCimentacion(z)))).habitaciones.length, 50);
});
test('C53 · una casa típica (4 habitaciones) ocupa menos de 300 B', () => {
  const z = zanjas([hab('h1', 0, 0, 4, 3), hab('h2', 4, 0, 4, 3), hab('h3', 0, 3, 4, 3), hab('h4', 4, 3, 4, 3)]);
  assert.ok(bytesCimentacion(z) < 300, `${bytesCimentacion(z)} B`);
});
test('C54 · 50 habitaciones se calculan en un tiempo razonable (el panel recalcula al abrir y al cambiar un campo)', () => {
  const z = zanjas(cincuenta()), t0 = performance.now();
  const r = resumenZanjas(z), g = geometriaZanjas(rectangulosZanja(paredesZanja(z.habitaciones), z.ancho), z.prof, null);
  const ms = performance.now() - t0;
  assert.ok(r.volumen > 0 && g.suelos.length > 0);
  assert.ok(ms < 1500, `${ms.toFixed(0)} ms`);
});
test('C55 · el volumen redondea a milésimas de m³ y es determinista (mismo plano, mismo resultado)', () => {
  const z = zanjas([hab('h1', -3.123, -2.007, 4.517, 3.253), hab('h2', 1.394, -2.007, 3.333, 3.253)], { prof: 613 });
  const a = resumenZanjas(z), b = resumenZanjas(zanjas(z.habitaciones, { prof: 613 }));
  assert.deepEqual(a, b);
  assert.equal(a.volumen, Math.round(a.volumen * 1000) / 1000);
  assert.equal(a.suelto, Math.round(a.suelto * 1000) / 1000);
});
