// Fase 4 (parte 2): el catálogo visual de sandbox.html. Textos de reserva en el HTML y sincronización con MATERIALES.
// Valores esperados escritos a mano (no leídos de MATERIALES).
import { test, expect } from '@playwright/test';
import { leerCasa, abrirSimulador } from './helpers.js';

const IDS = ['cat-excavacion', 'cat-block', 'cat-madera', 'cat-lamina', 'cat-foco', 'cat-puerta', 'cat-ventana', 'cat-vitropiso', 'cat-lampara', 'cat-concreto'];
const CAT = { block: ['🧱', 'Block'], madera: ['🪵', 'Madera'], lamina: ['🛡️', 'Lámina'], foco: ['💡', 'Foco'], puerta: ['🚪', 'Puerta'],
  ventana: ['🪟', 'Ventana'], vitropiso: ['🔷', 'Vitropiso'], lampara: ['🔦', 'Lámpara'], concreto: ['🪨', 'Concreto'] };
const PAREDES = [['block', '🧱 Block'], ['madera', '🪵 Madera'], ['lamina', '🛡️ Lámina']];
const TECHOS = [['concreto', '🪨 Concreto'], ['madera', '🪵 Madera'], ['lamina', '🛡️ Lámina'], ['teja', '🧱 Teja']];

/** Lee el catálogo visual tal como está en el DOM. */
const leer = page => page.evaluate(() => {
  const cat = [...document.querySelectorAll('#cat-list > .cat-item')].map(e => {
    const ico = e.querySelector('.ico');
    return { id: e.id, ico: ico ? ico.textContent : null, texto: [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('').trim(), oculto: getComputedStyle(e).display === 'none' };
  });
  const opts = sel => [...document.querySelectorAll(sel + ' .wb-opt')].map(e => ({ mat: e.dataset.mat, texto: e.textContent.trim(), sel: e.classList.contains('selected') }));
  return { cat, paredes: opts('#wb-mat-options'), techos: opts('#roof-mat-options'), info: document.getElementById('roof-info-mat').textContent };
});

function comprobar(d, { concretoOculto }) {
  expect(d.cat.map(c => c.id)).toEqual(IDS);                       // identificadores y orden
  for (const c of d.cat) {
    if (c.id === 'cat-excavacion') { expect([c.ico, c.texto]).toEqual(['⛏️', 'Excavación']); continue; } // no es un material
    const [emoji, etiqueta] = CAT[c.id.replace('cat-', '')];
    expect([c.ico, c.texto], c.id).toEqual([emoji, etiqueta]);
  }
  expect(d.cat.find(c => c.id === 'cat-concreto').oculto).toBe(concretoOculto);
  expect(d.paredes.map(o => [o.mat, o.texto])).toEqual(PAREDES);   // claves data-mat, orden y texto
  expect(d.techos.map(o => [o.mat, o.texto])).toEqual(TECHOS);
  expect(d.paredes.filter(o => o.sel).map(o => o.mat)).toEqual(['block']);   // selección inicial
  expect(d.techos.filter(o => o.sel).map(o => o.mat)).toEqual(['teja']);
  expect(d.info).toBe('Teja');
}

test('F4-HTML valores de reserva: el HTML ya trae los textos y emojis sin ejecutar JavaScript', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await ctx.newPage();
  await page.goto('/sandbox.html?proyecto=1');
  comprobar(await leer(page), { concretoOculto: true });
  await expect(page.locator('#cat-block')).toBeVisible();
  await expect(page.locator('#cat-block')).toContainText('Block');
  await expect(page.locator('#roof-mat-options .wb-opt[data-mat="teja"]')).toHaveText('🧱 Teja'); // el modal está cerrado: se comprueba el contenido
  await ctx.close();
});

test('F4-HTML con JavaScript: mismo catálogo tras la sincronización; #cat-concreto oculto al arrancar', async ({ page }) => {
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  comprobar(await leer(page), { concretoOculto: true });
  expect(reg.errores).toEqual([]);
});

test('F4-HTML #cat-concreto se muestra al desbloquear el concreto, con su emoji y etiqueta', async ({ page }) => {
  const c = leerCasa('vacia');
  const reg = await abrirSimulador(page, {
    estado: c.estado,
    progreso: { ...c.progreso, buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true },
  });
  comprobar(await leer(page), { concretoOculto: false });
  expect(reg.errores).toEqual([]);
});
