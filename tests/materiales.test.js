// Fase 4 (parte 1): MATERIALES conserva EXACTAMENTE los valores de LABELS, EMOJIS y RESISTANCE de casa.js.
// Los valores esperados están escritos a mano aquí (copiados de la auditoría), no leídos del módulo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MATERIALES } from '../src/scripts/materiales.js';

const ESPERADO = {
  block:     { label: 'Block',    emoji: '🧱',  resistencia: 0.9 },
  madera:    { label: 'Madera',   emoji: '🪵',  resistencia: 0.25 },
  lamina:    { label: 'Lámina',   emoji: '🛡️', resistencia: 0.75 },
  teja:      { label: 'Teja',     emoji: '🧱',  resistencia: 0.85 },
  roof:      { label: 'Techo',    emoji: '🏠',  resistencia: null },   // RESISTANCE nunca tuvo 'roof'
  foco:      { label: 'Foco',     emoji: '💡',  resistencia: 0.3 },
  puerta:    { label: 'Puerta',   emoji: '🚪',  resistencia: 0.5 },
  barillas:  { label: 'Barillas', emoji: '⚙',   resistencia: 0.85 },
  ventana:   { label: 'Ventana',  emoji: '🪟',  resistencia: 0.4 },
  concreto:  { label: 'Concreto', emoji: '🪨',  resistencia: 0.95 },
  vitropiso: { label: 'Vitropiso', emoji: '🔷', resistencia: 0.7 },
  lampara:   { label: 'Lámpara',  emoji: '🔦',  resistencia: 0.4 },
};
const CLAVES = ['barillas', 'block', 'concreto', 'foco', 'lamina', 'lampara', 'madera', 'puerta', 'roof', 'teja', 'ventana', 'vitropiso'];

test('el módulo se importa y exporta MATERIALES como objeto', () => {
  assert.equal(typeof MATERIALES, 'object');
  assert.ok(MATERIALES && !Array.isArray(MATERIALES));
});

test('tiene exactamente las 12 claves esperadas (ninguna agregada ni eliminada)', () => {
  assert.equal(Object.keys(MATERIALES).length, 12);
  assert.deepEqual(Object.keys(MATERIALES).sort(), CLAVES);
});

for (const [clave, esperado] of Object.entries(ESPERADO)) {
  test(`valores exactos de ${clave}`, () => {
    const m = MATERIALES[clave];
    assert.ok(m, `falta ${clave}`);
    assert.deepEqual(Object.keys(m).sort(), ['emoji', 'label', 'resistencia'], 'sin propiedades nuevas');
    assert.strictEqual(m.label, esperado.label);
    assert.strictEqual(m.emoji, esperado.emoji);
    assert.strictEqual(m.resistencia, esperado.resistencia);
  });
}

test('casa.js deriva LABELS, EMOJIS y RESISTANCE de MATERIALES con las mismas formas de acceso', () => {
  const src = fs.readFileSync(new URL('../src/scripts/casa.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ MATERIALES \} from '\.\/materiales\.js';/);
  // Reproduce las tres derivaciones de casa.js y compara con los valores originales
  const l = src.split('\n');
  const get = n => l.find(x => x.startsWith(`const ${n} = `)).replace(/^const \w+ = /, '').replace(/;\s*$/, '');
  const derivar = n => new Function('MATERIALES', `return ${get(n)};`)(MATERIALES);
  const LABELS = derivar('LABELS'), EMOJIS = derivar('EMOJIS'), RESISTANCE = derivar('RESISTANCE');
  for (const [k, e] of Object.entries(ESPERADO)) {
    assert.strictEqual(LABELS[k], e.label, `LABELS.${k}`);
    assert.strictEqual(EMOJIS[k], e.emoji, `EMOJIS.${k}`);
    if (e.resistencia === null) assert.ok(!(k in RESISTANCE), `RESISTANCE no debe tener ${k}`);
    else assert.strictEqual(RESISTANCE[k], e.resistencia, `RESISTANCE.${k}`);
  }
  assert.equal(Object.keys(LABELS).length, 12);
  assert.equal(Object.keys(EMOJIS).length, 12);
  assert.equal(Object.keys(RESISTANCE).length, 11);
});

test('ROOF_MATERIALS: 4 materiales estables, label/icon desde MATERIALES, colorHex propio sin cambios', () => {
  const src = fs.readFileSync(new URL('../src/scripts/casa.js', import.meta.url), 'utf8');
  const ini = src.indexOf('const ROOF_MATERIALS = {');
  assert.ok(ini >= 0, 'definición presente');
  const bloque = src.slice(ini, src.indexOf('};', ini) + 2).replace(/^const ROOF_MATERIALS = /, '').replace(/;$/, '');
  const ROOF = new Function('MATERIALES', `return ${bloque};`)(MATERIALES);
  const ESPERADO_ROOF = {
    concreto: { id: 'concreto', label: 'Concreto', icon: '🪨', colorHex: '#9ca3af' },
    madera:   { id: 'madera',   label: 'Madera',   icon: '🪵', colorHex: '#92400e' },
    lamina:   { id: 'lamina',   label: 'Lámina',   icon: '🛡️', colorHex: '#64748b' },
    teja:     { id: 'teja',     label: 'Teja',     icon: '🧱', colorHex: '#ea580c' },
  };
  assert.deepEqual(Object.keys(ROOF), ['concreto', 'madera', 'lamina', 'teja'], 'mismo orden y mismas 4 opciones');
  for (const [k, e] of Object.entries(ESPERADO_ROOF)) {
    assert.deepEqual(Object.keys(ROOF[k]), ['id', 'label', 'icon', 'colorHex'], `campos de ${k}`);
    assert.deepEqual({ ...ROOF[k] }, e, `valores de ${k}`);
    assert.strictEqual(ROOF[k].label, MATERIALES[k].label, `label de ${k} = MATERIALES`);
    assert.strictEqual(ROOF[k].icon, MATERIALES[k].emoji, `icon de ${k} = MATERIALES`);
  }
  // Las opciones del HTML usan las mismas claves (data-mat) que se guardan en roofMat
  const html = fs.readFileSync(new URL('../src/sandbox.html', import.meta.url), 'utf8');
  const bloqueHtml = html.slice(html.indexOf('id="roof-mat-options"'), html.indexOf('id="roof-mat-options"') + 900);
  assert.deepEqual([...bloqueHtml.matchAll(/data-mat="(\w+)"/g)].map(m => m[1]).slice(0, 4), ['concreto', 'madera', 'lamina', 'teja']);
});

test('sincronizarCatalogoVisual: reescribe emoji y etiqueta desde los datos (DOM simulado), sin tocar el resto', () => {
  const src = fs.readFileSync(new URL('../src/scripts/casa.js', import.meta.url), 'utf8');
  const ini = src.indexOf('function sincronizarCatalogoVisual(');
  assert.ok(ini >= 0, 'función presente');
  const cuerpo = src.slice(ini, src.indexOf('\n}\n', ini) + 3);
  const sincronizar = new Function(`${cuerpo}; return sincronizarCatalogoVisual;`)();

  const txt = v => ({ nodeType: 3, nodeValue: v });
  const claves = ['block', 'madera', 'lamina', 'foco', 'puerta', 'ventana', 'vitropiso', 'lampara', 'concreto'];
  const crearDoc = () => {
    const items = {}, icos = {};
    for (const k of claves) {
      icos[k] = { textContent: 'X' };
      items[k] = { childNodes: [txt(' '), { nodeType: 1 }, txt('viejo \n      ')], querySelector: () => icos[k] };
    }
    const opt = (mat) => ({ dataset: { mat }, textContent: 'viejo' });
    const walls = ['block', 'madera', 'lamina'].map(opt), roofs = ['concreto', 'madera', 'lamina', 'teja'].map(opt);
    const info = { textContent: 'viejo' };
    const doc = {
      getElementById: id => id === 'roof-info-mat' ? info : items[id.replace('cat-', '')] ?? null,
      querySelectorAll: s => s.startsWith('#wb-mat-options') ? walls : s.startsWith('#roof-mat-options') ? roofs : [],
    };
    return { doc, items, icos, walls, roofs, info };
  };

  // Con el catálogo real
  const a = crearDoc();
  sincronizar(a.doc, MATERIALES);
  for (const k of claves) {
    assert.strictEqual(a.icos[k].textContent, ESPERADO[k].emoji, `emoji ${k}`);
    assert.strictEqual(a.items[k].childNodes[2].nodeValue, ESPERADO[k].label + ' \n      ', `etiqueta ${k} (con el espaciado original)`);
    assert.strictEqual(a.items[k].childNodes[0].nodeValue, ' ', 'el espacio inicial se conserva');
  }
  for (const o of [...a.walls, ...a.roofs]) assert.strictEqual(o.textContent, `${ESPERADO[o.dataset.mat].emoji} ${ESPERADO[o.dataset.mat].label}`);
  assert.strictEqual(a.info.textContent, 'Teja');

  // El texto sale de los datos: con un catálogo distinto cambia (prueba de que no son literales)
  const b = crearDoc();
  sincronizar(b.doc, { ...MATERIALES, block: { label: 'B-prueba', emoji: '🅱️', resistencia: 0 }, teja: { label: 'T-prueba', emoji: 'T', resistencia: 0 } });
  assert.strictEqual(b.items.block.childNodes[2].nodeValue, 'B-prueba \n      ');
  assert.strictEqual(b.icos.block.textContent, '🅱️');
  assert.strictEqual(b.walls[0].textContent, '🅱️ B-prueba');
  assert.strictEqual(b.roofs[3].textContent, 'T T-prueba');
  assert.strictEqual(b.info.textContent, 'T-prueba');

  // Elementos que faltan o claves sin dato no rompen nada
  assert.doesNotThrow(() => sincronizar({ getElementById: () => null, querySelectorAll: () => [] }, MATERIALES));
});
