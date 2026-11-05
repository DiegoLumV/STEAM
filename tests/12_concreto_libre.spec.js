// Concreto en modo libre (?libre=1): la mezcla se valida con cantidades flexibles; el modo normal conserva 1000/2000/3000/600.
// La API se simula aquí (igual que tests/05_construccion_libre.spec.js); no hay base de datos ni backend.
// Nota: un <input type="number"> no admite escribir texto como "12abc" con Playwright; esas entradas se cubren
// en tests/concreto.test.js (función pura). Aquí se usan los valores que el navegador sí permite escribir.
import { test, expect } from '@playwright/test';
import { resumen, instantanea, contarPorTipo } from './helpers.js';

/** Abre sandbox.html con la API simulada y una query configurable (helpers.js fija la query). */
async function abrir(page, { query = '', estado = null, progreso = {} } = {}) {
  const reg = { puts: [], errores: [] };
  await page.addInitScript(() => {
    localStorage.setItem('token', 'token-de-prueba');
    localStorage.setItem('tutorial_completado_anon', 'true');
  });
  page.on('pageerror', e => reg.errores.push(String(e.message || e)));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) reg.errores.push(m.text());
  });
  page.on('dialog', d => d.accept());
  await page.route('**/api/**', async route => {
    const req = route.request();
    const ruta = new URL(req.url()).pathname;
    const json = (status, cuerpo) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });
    if (ruta === '/api/guardado' && req.method() === 'GET') {
      if (!estado) return json(404, { error: 'Sin guardado previo' });
      return json(200, { estado, progreso, schema_version: estado.v ?? 1, migrado: false, actualizado_en: '2026-01-01T00:00:00.000Z' });
    }
    if (ruta === '/api/guardado' && req.method() === 'PUT') {
      reg.puts.push(JSON.parse(req.postData() || '{}'));
      return json(200, { guardado_id: 1, actualizado_en: new Date().toISOString() });
    }
    if (ruta === '/api/guardado/beacon') return route.fulfill({ status: 204 });
    if (ruta === '/api/sesion' && req.method() === 'POST') return json(200, { sesion_id: 1 });
    return json(200, {});
  });
  await page.goto('/sandbox.html?proyecto=1&steamTest=1' + query);
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  return reg;
}

// Guardado "devuelto" por el servidor falso: Matemáticas ya validadas, sin concreto (permite abrir el modal en modo normal).
const ESTADO_SIN_LOSA = { v: 1, objetos: [], contador: 1, progreso: {} };
const PROGRESO_MATEMATICAS = { buildPhase: 1, concretoUnlocked: false, matematicasValidadas: true };

const abrirModal = page => page.evaluate(() => openConcretoModal());
const modalAbierto = page => page.evaluate(() => document.getElementById('concreto-overlay').classList.contains('open'));
const cerrarModal = page => page.evaluate(() => document.getElementById('concreto-overlay').classList.remove('open'));
const llenar = async (page, v) => { for (const [k, val] of Object.entries(v)) await page.locator('#inp-' + k).fill(String(val)); };
const mezclar = page => page.locator('#btn-mezclar').click();
const losas = async page => contarPorTipo((await resumen(page)).objetos).concreto_slab_20 || 0;
const ancho = (page, id) => page.evaluate(i => document.getElementById(i).style.width, id);
const textoModal = page => page.evaluate(() => document.getElementById('concreto-modal').innerText);
const botonLibre = page => page.locator('#btnLibre');

async function abrirLibre(page, opciones = {}) {
  const reg = await abrir(page, { query: '&libre=1', ...opciones });
  await botonLibre(page).click();
  await expect(botonLibre(page)).toContainText('ON');
  return reg;
}

test('C-A modo normal: la mezcla original crea la losa y los textos de referencia se conservan', async ({ page }) => {
  const reg = await abrir(page, { estado: ESTADO_SIN_LOSA, progreso: PROGRESO_MATEMATICAS });
  await abrirModal(page);
  expect(await modalAbierto(page)).toBe(true);
  // Textos y referencias del modo normal
  const t = await textoModal(page);
  expect(t.toLowerCase()).toContain('6,000 m³'); // comparaciones sin distinguir mayúsculas: el CSS muestra algunos títulos en mayúsculas (text-transform)
  expect(t.toLowerCase()).toContain('¿cómo se divide el volumen?');
  expect(t.toLowerCase()).toContain('divide 6000 ÷ 6');
  await expect(page.locator('#cmat-total-label')).toContainText('/ 6,600 m³');
  await expect(page.locator('#cmat-aviso')).toBeHidden();
  await llenar(page, { cemento: 1000, arena: 2000, grava: 3000, agua: 600 });
  expect(await ancho(page, 'cmat-bar-cemento')).not.toBe('0%'); // la barra del modo normal sigue usando la referencia 6600
  await mezclar(page);
  expect(await losas(page)).toBe(1);
  expect(await modalAbierto(page)).toBe(false);
  expect((await instantanea(page)).progreso).toMatchObject({ concretoUnlocked: true, buildPhase: 2 });
  expect(reg.errores).toEqual([]);
});

test('C-B modo normal: una mezcla distinta (10/20/30/6) se rechaza con los mensajes de siempre', async ({ page }) => {
  const reg = await abrir(page, { estado: ESTADO_SIN_LOSA, progreso: PROGRESO_MATEMATICAS });
  await abrirModal(page);
  await llenar(page, { cemento: 10, arena: 20, grava: 30, agua: 6 });
  await mezclar(page);
  const err = page.locator('#cmat-error');
  await expect(err).toBeVisible();
  await expect(err).toContainText('Cemento: debes ingresar 1000 m³ (1/6 de 6,000 m³)');
  await expect(err).toContainText('Arena: debes ingresar 2000 m³ (2/6 de 6,000 m³)');
  await expect(err).toContainText('Grava: debes ingresar 3000 m³ (3/6 de 6,000 m³)');
  await expect(err).toContainText('Agua: debes ingresar 600 m³ (10% de 6,000 m³)');
  expect(await losas(page)).toBe(0);
  // sin ?libre=1 tampoco acepta mezclas "flexibles" aunque sean válidas numéricamente (agua 0, decimales)
  await llenar(page, { cemento: 0.5, arena: 1, grava: 1.5, agua: 0 });
  await mezclar(page);
  expect(await losas(page)).toBe(0);
  await expect(page.locator('#cmat-aviso')).toBeHidden();
  expect(reg.errores).toEqual([]);
});

test('C-C modo libre: textos neutrales, sin 6000/6600 como objetivo, barra relativa y mezcla a otra escala crea la losa', async ({ page }) => {
  const reg = await abrirLibre(page);
  await abrirModal(page);
  expect(await modalAbierto(page)).toBe(true);
  const t = await textoModal(page);
  expect(t).not.toContain('6,000');
  expect(t).not.toContain('6,600');
  expect(t).not.toContain('6000');
  expect(t).not.toContain('1 : 2 : 3');
  expect(t).toContain('La eliges tú');
  await expect(page.locator('#cmat-total-ref')).toBeHidden(); // la referencia "/ 6,600 m³" se oculta (queda vacía)
  expect(await ancho(page, 'cmat-bar-cemento')).toBe('0%');

  // Barra: fracciones del total ingresado (sin sugerir una mezcla única)
  await llenar(page, { cemento: 1, arena: 1 });
  expect(await ancho(page, 'cmat-bar-cemento')).toBe('50%');
  expect(await ancho(page, 'cmat-bar-arena')).toBe('50%');
  expect(await ancho(page, 'cmat-bar-grava')).toBe('0%');
  await expect(page.locator('#cmat-total-val')).toHaveText('2');
  // Total no válido → tramos en cero, sin errores de consola
  await llenar(page, { cemento: -5, arena: -5 });
  expect(await ancho(page, 'cmat-bar-cemento')).toBe('0%');

  await llenar(page, { cemento: 10, arena: 20, grava: 30, agua: 6 });
  expect(await ancho(page, 'cmat-bar-grava')).not.toBe('0%');
  await mezclar(page);
  expect(await losas(page)).toBe(1);
  expect(await modalAbierto(page)).toBe(false);
  expect(reg.errores).toEqual([]);
});

test('C-D modo libre: decimales y proporciones distintas de 1:2:3 se aceptan sin avisos de proporción', async ({ page }) => {
  const reg = await abrirLibre(page);
  await abrirModal(page);
  await llenar(page, { cemento: 0.5, arena: 1, grava: 1.5, agua: 0.3 });
  await expect(page.locator('#cmat-aviso')).toBeHidden();
  await mezclar(page);
  expect(await losas(page)).toBe(1);
  expect(reg.errores).toEqual([]);

  const pag2 = await page.context().newPage();
  const reg2 = await abrirLibre(pag2);
  await abrirModal(pag2);
  await llenar(pag2, { cemento: 7, arena: 1, grava: 1, agua: 9 }); // proporciones muy alejadas de 1:2:3
  await expect(pag2.locator('#cmat-aviso')).toBeHidden();
  await expect(pag2.locator('#cmat-error')).toBeHidden();
  await mezclar(pag2);
  expect(await losas(pag2)).toBe(1);
  expect(reg2.errores).toEqual([]);
});

test('C-E modo libre: agua = 0 muestra el aviso debajo de la barra mientras se escribe y no bloquea la creación', async ({ page }) => {
  const reg = await abrirLibre(page);
  await abrirModal(page);
  await llenar(page, { cemento: 1, arena: 2, grava: 3 });
  await expect(page.locator('#cmat-aviso')).toBeHidden(); // agua todavía vacía: sin aviso
  await llenar(page, { agua: 0 });
  const aviso = page.locator('#cmat-aviso');
  await expect(aviso).toBeVisible(); // aparece al escribir, sin pulsar el botón
  await expect(aviso).toContainText('Agua en 0');
  const cajaBarra = await page.locator('#cmat-bar-track').boundingBox();
  const cajaAviso = await aviso.boundingBox();
  expect(cajaAviso.y).toBeGreaterThan(cajaBarra.y + cajaBarra.height - 1); // debajo de la barra
  await llenar(page, { agua: 0.2 });
  await expect(aviso).toBeHidden(); // desaparece al corregir
  await llenar(page, { agua: 0 });
  await expect(aviso).toBeVisible();
  await mezclar(page);
  expect(await losas(page)).toBe(1); // el aviso no bloquea
  expect(reg.errores).toEqual([]);
});

test('C-F modo libre: errores numéricos impiden la creación y nombran el campo', async ({ page }) => {
  const reg = await abrirLibre(page);
  await abrirModal(page);
  const err = page.locator('#cmat-error');
  const base = { cemento: 1, arena: 2, grava: 3, agua: 1 };

  const casos = [
    [{ cemento: '' }, 'Cemento:'],        // vacío
    [{ arena: '-1' }, 'Arena:'],          // negativo
    [{ grava: '0' }, 'Grava:'],           // cero en cemento/arena/grava
    [{ cemento: '1e999' }, 'Cemento:'],   // desborda: el navegador lo trata como texto no numérico
    [{ agua: '' }, 'Agua:'],              // el agua puede ser 0, pero no estar vacía
    [{ agua: '-0.5' }, 'Agua:'],
  ];
  for (const [cambio, campo] of casos) {
    await llenar(page, { ...base, ...cambio });
    await mezclar(page);
    await expect(err).toBeVisible();
    await expect(err).toContainText(campo);
    expect(await losas(page)).toBe(0);
    expect(await modalAbierto(page)).toBe(true);
  }
  // Varios campos mal a la vez: un mensaje por campo
  await llenar(page, { cemento: '', arena: '0', grava: '-2', agua: 1 });
  await mezclar(page);
  const texto = await err.innerText();
  expect(texto).toContain('Cemento:');
  expect(texto).toContain('Arena:');
  expect(texto).toContain('Grava:');
  expect(texto).not.toContain('Agua:');
  // Corregir los campos y volver a intentar crea la losa y oculta el error
  await llenar(page, base);
  await mezclar(page);
  expect(await losas(page)).toBe(1);
  expect(reg.errores).toEqual([]);
});

test('C-G modo libre: los límites máximos se aplican por componente (1 000 000) y se aceptan exactamente en el límite', async ({ page }) => {
  const reg = await abrirLibre(page);
  await abrirModal(page);
  const err = page.locator('#cmat-error');
  await llenar(page, { cemento: 1, arena: 1000001, grava: 3, agua: 1 });
  await mezclar(page);
  await expect(err).toBeVisible();
  await expect(err).toContainText('Arena:');
  await expect(err).toContainText('máximo del simulador');
  await expect(err).toContainText('1,000,000');
  expect(await losas(page)).toBe(0);
  await llenar(page, { cemento: 1000000, arena: 1000000, grava: 1000000, agua: 1000000 });
  await mezclar(page);
  expect(await losas(page)).toBe(1);
  expect(reg.errores).toEqual([]);
});

// Nota: esta prueba compara el ESTADO GUARDADO de la losa (tipo, posición, rotación y ausencia de escalado) entre mezclas
// distintas; no mide directamente las dimensiones de la malla. El tamaño 20×20×0.2 se verifica de forma estática en tests/concreto.test.js.
test('C-H no se crean dos losas y el estado guardado de la losa es idéntico con mezclas distintas', async ({ page, context }) => {
  test.setTimeout(240_000);
  const reg = await abrirLibre(page);
  await abrirModal(page);
  await llenar(page, { cemento: 10, arena: 20, grava: 30, agua: 6 });
  await mezclar(page);
  expect(await losas(page)).toBe(1);
  // Segundo intento: el modal se rechaza y, aunque se invoque la validación directamente, no se crea otra losa
  await abrirModal(page);
  expect(await modalAbierto(page)).toBe(false);
  await page.evaluate(() => concretoMezclar()); // los campos conservan 10/20/30/6; la rama libre rechaza una segunda losa
  expect(await losas(page)).toBe(1);
  const snap1 = (await instantanea(page)).estado.objetos.find(o => o.type === 'concreto_slab_20');

  // Otra sesión con una mezcla de escala y proporciones muy distintas: la losa guardada es idéntica (sin escalado ni cambios)
  const pag2 = await context.newPage();
  const reg2 = await abrirLibre(pag2);
  await abrirModal(pag2);
  await llenar(pag2, { cemento: 900000, arena: 3, grava: 0.01, agua: 0 });
  await mezclar(pag2);
  expect(await losas(pag2)).toBe(1);
  const snap2 = (await instantanea(pag2)).estado.objetos.find(o => o.type === 'concreto_slab_20');
  const sinId = ({ id, ...resto }) => resto;
  expect(sinId(snap2)).toEqual(sinId(snap1));
  expect(snap1.s).toBeUndefined(); // sin escalado: la losa conserva su tamaño fijo 20×20×0.2 definido en concretoFinalizar
  expect(reg.errores).toEqual([]);
  expect(reg2.errores).toEqual([]);
});

test('C-I compatibilidad: Programar (validateHouse), guardado y restauración tras crear concreto en modo libre', async ({ page, context }) => {
  test.setTimeout(240_000);
  const reg = await abrirLibre(page);
  await abrirModal(page);
  await llenar(page, { cemento: 10, arena: 20, grava: 30, agua: 0 });
  await mezclar(page);
  expect(await losas(page)).toBe(1);

  // validateHouse ya ve el concreto: el siguiente requisito pendiente es la pared (Programar sigue validando la casa)
  await expect.poll(() => page.evaluate(() => document.getElementById('btnProgramar').title), { timeout: 5000 }).toContain('al menos una pared');

  // El modo libre y la mezcla no se guardan: el estado es el de siempre
  const { estado, progreso } = await instantanea(page);
  expect(JSON.stringify({ estado, progreso })).not.toMatch(/libre/i);
  expect(progreso).toMatchObject({ concretoUnlocked: true, buildPhase: 2, matematicasValidadas: false });
  expect(estado.objetos.filter(o => o.type === 'concreto_slab_20')).toHaveLength(1);
  expect(estado.v).toBe(2);

  // Restauración en modo normal (sin ?libre=1): la losa vuelve una sola vez y el concreto sigue bloqueado para duplicarse
  const pag2 = await context.newPage();
  const reg2 = await abrir(pag2, { estado, progreso });
  expect(await losas(pag2)).toBe(1);
  await abrirModal(pag2);
  expect(await modalAbierto(pag2)).toBe(false);
  const btn = await pag2.evaluate(() => { const b = document.getElementById('btnStorm'); return { disabled: b.disabled, title: b.title }; });
  expect(btn.disabled).toBe(true);
  expect(btn.title).toContain('Ya tienes el concreto');
  expect((await instantanea(pag2)).estado.objetos.filter(o => o.type === 'concreto_slab_20')).toHaveLength(1);
  expect(reg.errores).toEqual([]);
  expect(reg2.errores).toEqual([]);
});

test('C-J al cambiar de modo se muestran siempre los textos del modo vigente', async ({ page }) => {
  const reg = await abrir(page, { query: '&libre=1', estado: ESTADO_SIN_LOSA, progreso: PROGRESO_MATEMATICAS });
  // 1) modo libre ON → textos neutrales
  await botonLibre(page).click();
  await abrirModal(page);
  expect(await textoModal(page)).not.toContain('6,600');
  await cerrarModal(page);
  // 2) modo libre OFF → vuelven exactamente los textos del modo normal y la referencia visual
  await botonLibre(page).click();
  await expect(botonLibre(page)).toContainText('OFF');
  await abrirModal(page);
  expect(await modalAbierto(page)).toBe(true);
  let t = await textoModal(page);
  expect(t.toLowerCase()).toContain('6,000 m³'); // sin distinguir mayúsculas (text-transform en el CSS)
  expect(t.toLowerCase()).toContain('¿cómo se divide el volumen?');
  await expect(page.locator('#cmat-total-label')).toContainText('/ 6,600 m³');
  await expect(page.locator('#cmat-aviso')).toBeHidden();
  await expect(page.locator('#cmat-cemento .cmat-hint')).toHaveText('1 parte del total');
  await expect(page.locator('#cmat-agua .cmat-hint')).toHaveText('10% del volumen total');
  // y en modo normal vuelve a exigirse la mezcla exacta
  await llenar(page, { cemento: 10, arena: 20, grava: 30, agua: 6 });
  await mezclar(page);
  expect(await losas(page)).toBe(0);
  await cerrarModal(page);
  // 3) otra vez libre ON → textos neutrales de nuevo
  await botonLibre(page).click();
  await abrirModal(page);
  t = await textoModal(page);
  expect(t).not.toContain('6,000');
  expect(t.toLowerCase()).toContain('la eliges tú');
  expect(reg.errores).toEqual([]);
});
