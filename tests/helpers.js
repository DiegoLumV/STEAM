// Utilidades para las pruebas con navegador (Playwright).
// La API del servidor se SIMULA aquí: no hay base de datos, ni usuarios, ni proyectos reales.
import fs from 'node:fs';

export const CASAS = [
  'vacia',
  'bloques_con_cortes',
  'muros_puerta_ventana',
  'pisos_vitropiso',
  'techos_cuatro_formas',
  'excavacion_con_casa',
  'casa_500_objetos',
  'sin_excavacion_antigua',
  'lampara_exterior',
];

/** Devuelve { descripcion, estado, progreso } de una casa de referencia sintética. */
export function leerCasa(nombre) {
  const url = new URL(`./casas/${nombre}.json`, import.meta.url);
  return JSON.parse(fs.readFileSync(url, 'utf8'));
}

/**
 * Abre sandbox.html con la API simulada.
 * @param {import('@playwright/test').Page} page
 * @param {{estado?: object|null, progreso?: object}} opciones  Guardado que "devuelve" el servidor falso
 * @returns {Promise<{puts: object[], beacons: object[], errores: string[]}>}
 */
export async function abrirSimulador(page, { estado = null, progreso = {} } = {}) {
  const registro = { puts: [], beacons: [], errores: [] };

  await page.addInitScript(() => {
    localStorage.setItem('token', 'token-de-prueba');
    localStorage.setItem('tutorial_completado_anon', 'true'); // evita el tutorial guiado
  });

  page.on('pageerror', e => registro.errores.push(String(e.message || e)));
  page.on('console', m => {
    // "Failed to load resource" es el 404 esperado de GET /api/guardado cuando no hay guardado previo
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) registro.errores.push(m.text());
  });

  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const ruta = url.pathname;
    const json = (status, cuerpo) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

    if (ruta === '/api/guardado' && req.method() === 'GET') {
      if (!estado) return json(404, { error: 'Sin guardado previo' });
      return json(200, {
        estado,
        progreso,
        schema_version: estado.v ?? 1,
        migrado: false,
        actualizado_en: '2026-01-01T00:00:00.000Z',
      });
    }
    if (ruta === '/api/guardado' && req.method() === 'PUT') {
      registro.puts.push(JSON.parse(req.postData() || '{}'));
      return json(200, { guardado_id: 1, actualizado_en: new Date().toISOString() });
    }
    if (ruta === '/api/guardado/beacon') {
      registro.beacons.push(JSON.parse(req.postData() || '{}'));
      return route.fulfill({ status: 204 });
    }
    if (ruta === '/api/sesion' && req.method() === 'POST') return json(200, { sesion_id: 1 });
    return json(200, {});
  });

  await page.goto('/sandbox.html?proyecto=1&steamTest=1');
  await page.waitForFunction(() => {
    const l = document.getElementById('loading');
    return !!window.__steamTest && l && getComputedStyle(l).display === 'none';
  }, null, { timeout: 60_000 });
  return registro;
}

/** Resumen de la escena (solo lectura). */
export const resumen = page => page.evaluate(() => window.__steamTest.resumenEscena());

/** Estado que se guardaría ahora mismo (solo lectura). */
export const instantanea = page => page.evaluate(() => window.__steamTest.snapshot());

/** Conteo de objetos por tipo. */
export function contarPorTipo(objetos) {
  const c = {};
  for (const o of objetos) c[o.type] = (c[o.type] || 0) + 1;
  return c;
}
