// R8 (línea base): lo que muestra la interfaz para áreas, volúmenes y cantidades.
// Los valores "dorados" se generaron con el código ORIGINAL (antes de extraer cálculos).
// Cualquier cambio posterior debe producir exactamente los mismos textos.
//   Regenerar (solo si el cambio de comportamiento es intencional):  UPDATE_GOLDEN=1 npx playwright test 03_calculos
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { leerCasa, abrirSimulador } from './helpers.js';

const RUTA = new URL('./dorados/calculos_ui.json', import.meta.url);
const ACTUALIZAR = process.env.UPDATE_GOLDEN === '1';
const texto = (page, sel) => page.evaluate(s => (document.querySelector(s)?.textContent ?? null), sel);

async function medir(page) {
  const out = {};

  // ── Techos: área y dimensiones por forma ──
  out.techo = {};
  for (const forma of ['plano', 'dos_aguas', 'cuatro_aguas', 'una_agua']) {
    for (const [w, d, h] of [[3, 3, 0.5], [10, 10, 1.8], [24, 3, 4], [7, 13, 2.3], [24, 24, 0.5], [5, 9, 1.1]]) {
      const r = await page.evaluate(({ forma, w, d, h }) => {
        document.getElementById('roof-width').value = w;
        document.getElementById('roof-depth').value = d;
        document.getElementById('roof-height').value = h;
        window.roofSelectShape(forma);
        const t = id => document.getElementById(id)?.textContent;
        return { area: t('roof-info-area'), dims: t('roof-info-dims') };
      }, { forma, w, d, h });
      out.techo[`${forma}|${w}x${d}x${h}`] = r;
    }
  }

  // ── Muros: piezas y dimensiones ──
  out.muro = {};
  for (const mat of ['block', 'madera', 'lamina']) {
    for (const [modo, vent] of [['simple', 1], ['puerta', 1], ['ventana', 1], ['ventana', 2]]) {
      for (const [w, h] of [[3, 4], [5, 5], [7, 6], [20, 15], [4, 8], [5, 4]]) {
        const r = await page.evaluate(({ mat, modo, vent, w, h }) => {
          document.querySelector(`#wb-mat-options .wb-opt[data-mat="${mat}"]`).click();
          window.wbSelectMode(modo);
          window.wbSetVentCount(vent);
          document.getElementById('wb-width').value = w;
          document.getElementById('wb-height').value = h;
          window.wbUpdate();
          const t = id => document.getElementById(id)?.textContent;
          return {
            total: t('wb-total'), dims: t('wb-dims'),
            deshabilitado: document.getElementById('wb-build-btn').disabled, aviso: t('wb-preview-warn'),
            w: t('wb-width-val'), h: t('wb-height-val'),
          };
        }, { mat, modo, vent, w, h });
        out.muro[`${mat}|${modo}|${vent}|${w}x${h}`] = r;
      }
    }
  }

  // ── Piso: cobertura de área ──
  out.piso = {};
  for (const [w, d] of [[20, 20], [10, 20], [10, 10], [5, 20], [5, 10], [5, 5], [4, 5], [4, 10]]) {
    out.piso[`${w}x${d}`] = await page.evaluate(({ w, d }) => {
      const op = document.querySelector(`.wp-size-opt[data-w="${w}"][data-d="${d}"]`);
      window.wpSelectSize(op);
      const t = id => document.getElementById(id)?.textContent;
      return {
        cubierta: t('wp-covered'), mensaje: t('wp-coverage-msg'),
        etiquetaArea: t('wp-build-area-tag'), dim: t('wp-build-dim'),
        barra: document.getElementById('wp-coverage-fill').style.width,
        previa: document.getElementById('wp-coverage-preview-fill').style.width,
        previaIzq: document.getElementById('wp-coverage-preview-fill').style.left,
        deshabilitado: document.getElementById('wp-build-btn').disabled,
      };
    }, { w, d });
  }

  // ── Concreto: total y barras ──
  out.concreto = {};
  for (const v of [[0, 0, 0, 0], [1000, 2000, 3000, 600], [500, 0, 0, 0], [7000, 0, 0, 0], [123.5, 77.25, 10, 0.5], [1000, 2000, 3000, 601]]) {
    out.concreto[v.join('|')] = await page.evaluate(vals => {
      ['cemento', 'arena', 'grava', 'agua'].forEach((m, i) => { document.getElementById('inp-' + m).value = vals[i]; });
      window.concretoActualizarBarra();
      const o = { total: document.getElementById('cmat-total-val').textContent };
      ['cemento', 'arena', 'grava', 'agua'].forEach(m => { o[m] = document.getElementById('cmat-bar-' + m).style.width; });
      return o;
    }, v);
  }

  // ── Excavación: área, volumen y dimensiones mostradas ──
  out.excavacion = {};
  for (const [l, a, p] of [[6, 4, 1.2], [12, 10, 1.5], [12, 10, 1.6], [18, 18, 5], [0.1, 3, 1.1], [0.1, 0.2, 0.3], [7.5, 2.5, 0.4], [1, 1, 0.2], [13.37, 4.21, 2.89]]) {
    await page.fill('#exc-largo', String(l));
    await page.fill('#exc-ancho', String(a));
    await page.fill('#exc-profundidad', String(p));
    out.excavacion[`${l}x${a}x${p}`] = {
      area: await texto(page, '#exc-stat-area'), vol: await texto(page, '#exc-stat-vol'), dims: await texto(page, '#exc-stat-dims'),
    };
  }
  return out;
}

test('R8 los cálculos que muestra la interfaz coinciden con la línea base', async ({ page }) => {
  test.setTimeout(600_000); // antes 240_000: en entornos sin GPU la prueba tarda ~4.3 min
  // Se parte de la casa con pisos para que la cobertura de área no sea cero
  const c = leerCasa('pisos_vitropiso');
  await abrirSimulador(page, { estado: c.estado, progreso: c.progreso });
  await page.evaluate(() => window.openExcavacionModal());
  const obtenido = await medir(page);

  if (ACTUALIZAR) {
    fs.writeFileSync(RUTA, JSON.stringify(obtenido, null, 2) + '\n');
    console.log('Valores dorados actualizados en', RUTA.pathname);
    return;
  }
  const dorado = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
  for (const grupo of Object.keys(dorado)) {
    expect(obtenido[grupo], `grupo ${grupo}`).toEqual(dorado[grupo]);
  }
  expect(Object.keys(obtenido).sort()).toEqual(Object.keys(dorado).sort());
});
