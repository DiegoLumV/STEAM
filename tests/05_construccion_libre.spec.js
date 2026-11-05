// Fase 3: modo de construcción libre (?libre=1). Solo sesión; no toca el guardado ni el progreso.
// La API se simula aquí (igual que tests/helpers.js); no hay base de datos ni backend.
import { test, expect } from '@playwright/test';
import { resumen, instantanea } from './helpers.js';

/** Abre sandbox.html con la API simulada y una query configurable (helpers.js fija la query). */
async function abrir(page, { query = '', estado = null, progreso = {} } = {}) {
  const reg = { puts: [], entregas: [], errores: [] };
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
    if (ruta === '/api/entrega' && req.method() === 'POST') { reg.entregas.push(JSON.parse(req.postData() || '{}')); return json(200, { ok: true }); }
    return json(200, {});
  });
  await page.goto('/sandbox.html?proyecto=1&steamTest=1' + query);
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  return reg;
}

const botones = page => page.evaluate(() => Object.fromEntries(['btnStorm', 'btnWall', 'btnProgramar'].map(id => {
  const b = document.getElementById(id);
  return [id, { disabled: b.disabled, opacity: b.style.opacity, title: b.title }];
})));
const overlayAbierto = (page, id) => page.evaluate(i => document.getElementById(i).classList.contains('open'), id);
const cerrar = (page, id) => page.evaluate(i => document.getElementById(i).classList.remove('open'), id);
const SIN_PASOS = { buildPhase: 0, concretoUnlocked: false, matematicasValidadas: false };

test('F3-A modo normal: sin ?libre=1 no hay interruptor y los bloqueos siguen igual', async ({ page }) => {
  const reg = await abrir(page);
  await expect(page.locator('#btnLibre')).toBeHidden();
  const b = await botones(page);
  expect(b.btnStorm.disabled && b.btnWall.disabled && b.btnProgramar.disabled).toBe(true);
  // Los modales siguen bloqueados aunque se invoquen directamente
  await page.evaluate(() => { openConcretoModal(); openWallBuilder(); openProgramar(); });
  expect(await overlayAbierto(page, 'concreto-overlay')).toBe(false);
  expect(await overlayAbierto(page, 'wall-overlay')).toBe(false);
  expect(await overlayAbierto(page, 'prog-overlay')).toBe(false);
  // Esperar al temporizador de 500 ms: nada cambia
  await page.waitForTimeout(1200);
  expect(await botones(page)).toEqual(b);
  expect(reg.errores).toEqual([]);
});

test('F3-A2 con ?libre=1 el interruptor aparece, arranca en OFF y no cambia nada hasta pulsarlo', async ({ page }) => {
  const reg = await abrir(page, { query: '&libre=1' });
  const sw = page.locator('#btnLibre');
  await expect(sw).toBeVisible();
  await expect(sw).toContainText('OFF');
  const b = await botones(page);
  expect(b.btnStorm.disabled && b.btnWall.disabled && b.btnProgramar.disabled).toBe(true);
  expect(reg.errores).toEqual([]);
});

test('F3-B modo libre: habilita herramientas, el temporizador no las vuelve a bloquear, es reversible', async ({ page }) => {
  const reg = await abrir(page, { query: '&libre=1' });
  const sw = page.locator('#btnLibre');
  const inicial = await botones(page);

  await sw.click();
  await expect(sw).toContainText('ON');
  let b = await botones(page);
  expect(b.btnStorm.disabled).toBe(false);
  expect(b.btnWall.disabled).toBe(false);
  // Programar conserva la validación real de la casa (sin concreto/pared/color sigue deshabilitado)
  expect(b.btnProgramar.disabled).toBe(true);
  expect(b.btnProgramar.title).toContain('concreto base');

  await page.waitForTimeout(1500); // varios ciclos del setInterval de 500 ms
  expect(await botones(page)).toEqual(b);

  // Los modales abren sin Matemáticas ni concreto previos
  await page.evaluate(() => { openConcretoModal(); });
  expect(await overlayAbierto(page, 'concreto-overlay')).toBe(true);
  await cerrar(page, 'concreto-overlay');
  await page.evaluate(() => { openWallBuilder(); });
  expect(await overlayAbierto(page, 'wall-overlay')).toBe(true);
  await cerrar(page, 'wall-overlay');
  // Programar no abre mientras la casa no sea válida (botón deshabilitado)
  // (openProgramar no valida la casa por sí misma: lo hace el botón; aquí solo se comprueba el botón)

  // Progreso intacto: el modo libre no simula etapas completadas
  const { progreso } = await instantanea(page);
  expect(progreso).toMatchObject(SIN_PASOS);

  // Desactivar: vuelve exactamente al estado inicial; reactivar: vuelve a habilitar
  await sw.click();
  await expect(sw).toContainText('OFF');
  expect(await botones(page)).toEqual(inicial);
  await page.evaluate(() => { openWallBuilder(); openConcretoModal(); });
  expect(await overlayAbierto(page, 'wall-overlay')).toBe(false);
  expect(await overlayAbierto(page, 'concreto-overlay')).toBe(false);
  await sw.click();
  b = await botones(page);
  expect(b.btnStorm.disabled || b.btnWall.disabled).toBe(false);
  expect((await instantanea(page)).progreso).toMatchObject(SIN_PASOS);
  expect(reg.errores).toEqual([]);
});

test('F3-C construir sin etapas previas, guardar, recargar y abrir en modo normal', async ({ page, context }) => {
  test.setTimeout(480_000);
  const reg = await abrir(page, { query: '&libre=1' });
  await page.locator('#btnLibre').click();

  const referencia = await instantanea(page); // estado vacío: claves de referencia
  await page.evaluate(() => openWallBuilder());
  await page.locator('#wb-build-btn').click();
  await page.waitForFunction(() => window.__steamTest.resumenEscena().paredes >= 1, null, { timeout: 30_000 });
  await cerrar(page, 'wall-overlay');

  const { estado, progreso } = await instantanea(page);
  expect(estado.objetos.some(o => o.type.startsWith('wall_'))).toBe(true);
  // El modo libre no agrega ni cambia campos del guardado v2
  expect(Object.keys(estado).sort()).toEqual(Object.keys(referencia.estado).sort());
  expect(Object.keys(progreso).sort()).toEqual(Object.keys(referencia.progreso).sort());
  expect(JSON.stringify({ estado, progreso })).not.toMatch(/libre/i);
  expect(progreso).toMatchObject(SIN_PASOS);

  // Recarga en modo normal (sin ?libre=1) con ese guardado
  const pag2 = await context.newPage();
  const reg2 = await abrir(pag2, { estado, progreso });
  const r2 = await resumen(pag2);
  expect(r2.paredes).toBe(1);
  const i2 = await instantanea(pag2);
  expect(i2.progreso).toMatchObject(SIN_PASOS);
  // Resultado documentado: en modo normal esta construcción NO desbloquea Construir (no se altera el progreso)
  const b2 = await botones(pag2);
  expect(b2.btnWall.disabled).toBe(true);
  expect(reg.errores).toEqual([]);
  expect(reg2.errores).toEqual([]);

  // Abrirla con ?libre=1 permite seguir construyendo tras activar el interruptor
  // (se cierran las páginas anteriores: tres escenas WebGL a la vez saturan el entorno sin GPU)
  await pag2.close();
  await page.close();
  const pag3 = await context.newPage();
  await abrir(pag3, { query: '&libre=1', estado, progreso });
  await pag3.locator('#btnLibre').click();
  expect((await botones(pag3)).btnWall.disabled).toBe(false);
});

test('F3-D eliminar la losa en modo libre no vuelve a bloquear; al desactivar sí (sin tocar datos extra)', async ({ page }) => {
  const estado = { v: 1, objetos: [{ id: 1, type: 'concreto_slab_20', p: [0, 0, 0], r: [0, 0, 0] }], contador: 2, progreso: {} };
  const progreso = { buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true, puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off' };
  const reg = await abrir(page, { query: '&libre=1', estado, progreso });
  const sw = page.locator('#btnLibre');
  await sw.click();
  expect((await botones(page)).btnWall.disabled).toBe(false);

  await page.evaluate(() => deleteConcreto(1));
  await page.waitForTimeout(1200);
  let b = await botones(page);
  expect(b.btnWall.disabled).toBe(false);       // sigue habilitado en modo libre
  expect(b.btnStorm.disabled).toBe(false);      // se puede volver a crear
  // La lógica interna existente de la eliminación se conserva igual que en modo normal
  expect((await instantanea(page)).progreso).toMatchObject({ buildPhase: 1, concretoUnlocked: false, matematicasValidadas: true });

  await sw.click(); // desactivar: se recuperan los bloqueos normales
  b = await botones(page);
  expect(b.btnWall.disabled).toBe(true);
  expect(b.btnWall.title).toBe('Crea el concreto primero');
  expect(b.btnProgramar.disabled).toBe(true);
  expect(b.btnStorm.disabled).toBe(false);      // matemáticas validadas y sin losa: como en modo normal
  expect((await instantanea(page)).progreso).toMatchObject({ buildPhase: 1, concretoUnlocked: false, matematicasValidadas: true });
  expect(reg.errores).toEqual([]);
});

test('F3-E validaciones técnicas se mantienen: losa duplicada y entrega en modo libre', async ({ page }) => {
  const estado = { v: 1, objetos: [{ id: 1, type: 'concreto_slab_20', p: [0, 0, 0], r: [0, 0, 0] }], contador: 2, progreso: {} };
  const progreso = { buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true };
  const reg = await abrir(page, { query: '&libre=1', estado, progreso });
  await page.locator('#btnLibre').click();
  // Ya existe la losa: el botón y el modal siguen rechazando un segundo concreto
  expect((await botones(page)).btnStorm.disabled).toBe(true);
  await page.evaluate(() => openConcretoModal());
  expect(await overlayAbierto(page, 'concreto-overlay')).toBe(false);

  // Entrega: guarda y llama a /api/entrega igual que en modo normal
  await page.evaluate(() => entregarCasa());
  await expect(page.locator('#btnEntregar')).toHaveClass(/entregado/);
  expect(reg.entregas).toEqual([{ proyecto_id: 1 }]);
  expect(reg.errores).toEqual([]);
});
