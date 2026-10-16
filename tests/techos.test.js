// tests/techos.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const casaJs = readFileSync('src/scripts/casa.js', 'utf-8');
const guardadoJs = readFileSync('src/scripts/guardado.js', 'utf-8');
const sandboxHtml = readFileSync('src/sandbox.html', 'utf-8');
const casaCss = readFileSync('src/Css/casa.css', 'utf-8');

test('La pestaña Techo está integrada dentro del modal de Construir', () => {
  assert.match(sandboxHtml, /<button class="wall-tab"[^>]*id="tab-techo"[^>]*onclick="switchWallTab\('techo'\)"[^>]*>🏠 Techo<\/button>/);
  assert.match(sandboxHtml, /id="tab-content-techo"/);
  assert.match(casaJs, /switchWallTab\(tab\)/);
  assert.match(casaJs, /\['pared',\s*'piso',\s*'techo'\]/);
});

test('Las 4 formas mínimas de techo están disponibles en la interfaz y en el código', () => {
  // plano, dos_aguas, cuatro_aguas, una_agua
  assert.match(sandboxHtml, /roofSelectShape\('plano'\)/);
  assert.match(sandboxHtml, /roofSelectShape\('dos_aguas'\)/);
  assert.match(sandboxHtml, /roofSelectShape\('cuatro_aguas'\)/);
  assert.match(sandboxHtml, /roofSelectShape\('una_agua'\)/);

  assert.match(casaJs, /plano:\s*{/);
  assert.match(casaJs, /dos_aguas:\s*{/);
  assert.match(casaJs, /cuatro_aguas:\s*{/);
  assert.match(casaJs, /una_agua:\s*{/);
});

test('Los materiales requeridos están configurados correctamente', () => {
  // Teja es exclusiva de techos (no en paredes ni catalog)
  assert.match(casaJs, /teja:\s*{[^}]*id:\s*'teja'/);
  assert.match(casaJs, /MAT\.teja\s*=/);
  assert.match(casaJs, /MAT\.lamina\s*=/);

  // Lámina está en paredes convencionales
  assert.match(sandboxHtml, /<div class="wb-opt"[^>]*data-mat="lamina"[^>]*onclick="wbSelectMat\(this\)"/);
  assert.match(sandboxHtml, /id="cat-lamina"/);

  // Teja no debe estar como opción de pared
  assert.doesNotMatch(sandboxHtml, /id="wb-mat-options"[^<]*<[^>]*data-mat="teja"/);
});

test('guardado.js serializa las propiedades de techos y altura', () => {
  assert.match(guardadoJs, /if \(ud\.roofShape\) e\.roofShape = ud\.roofShape;/);
  assert.match(guardadoJs, /if \(ud\.roofMat\) e\.roofMat = ud\.roofMat;/);
  assert.match(guardadoJs, /if \(ud\.roofH != null\) e\.roofH = ud\.roofH;/);
  assert.match(guardadoJs, /if \(o\.h != null\) e\.h = o\.h;/);
});

test('casa.js reconstruye techos al cargar la escena guardada', () => {
  assert.match(casaJs, /else if \(o\.type === 'roof'\)\s*{\s*reconstructRoof\(o\);/);
});

test('casa.js expone las funciones de techo al ámbito global', () => {
  assert.match(casaJs, /roofSelectShape,\s*roofSelectMat,\s*roofAutoFit,\s*roofUpdate,\s*buildRoof/);
});
