// R1, R2, R4: cada casa de referencia (esquema v1) se restaura y vuelve a serializarse sin perder nada.
import { test, expect } from '@playwright/test';
import { CASAS, leerCasa, abrirSimulador, resumen, instantanea, contarPorTipo } from './helpers.js';

const TOL = 0.001;
const cerca = (a, b) => Math.abs(a - b) <= TOL;
const vec = (a, b) => (a || [0, 0, 0]).every((v, i) => cerca(v, (b || [0, 0, 0])[i]));

// Campos que describen la casa; se comparan fixture -> serialización tras restaurar
function comparar(esperado, obtenido) {
  expect(obtenido.type).toBe(esperado.type);
  expect(vec(obtenido.p, esperado.p), `posición id ${esperado.id}: ${obtenido.p} vs ${esperado.p}`).toBe(true);
  expect(vec(obtenido.r, esperado.r), `rotación id ${esperado.id}`).toBe(true);
  for (const k of ['color', 'cutFactor', 'wallMode', 'embeddedInWall', 'roofShape', 'roofMat', 'w', 'd', 'area']) {
    if (esperado[k] !== undefined) expect(obtenido[k], `${k} id ${esperado.id}`).toEqual(esperado[k]);
  }
  // La altura del techo se guarda como roofH en la fixture y como h tras restaurar (mismo valor)
  if (esperado.roofH !== undefined) expect(obtenido.h ?? obtenido.roofH).toBeCloseTo(esperado.roofH, 3);
}

for (const nombre of CASAS) {
  test(`R1/R2 restaurar y volver a serializar: ${nombre}`, async ({ page }) => {
    const casa = leerCasa(nombre);
    const reg = await abrirSimulador(page, { estado: casa.estado, progreso: casa.progreso });

    // R1: mismos objetos por tipo
    const r = await resumen(page);
    expect(contarPorTipo(r.objetos)).toEqual(contarPorTipo(casa.estado.objetos));

    // R2: la serialización conserva cada objeto
    const { estado, progreso } = await instantanea(page);
    expect(estado.objetos).toHaveLength(casa.estado.objetos.length);
    const porId = new Map(estado.objetos.map(o => [o.id, o]));
    for (const esperado of casa.estado.objetos) {
      expect(porId.has(esperado.id), `falta el objeto ${esperado.id}`).toBe(true);
      comparar(esperado, porId.get(esperado.id));
    }
    expect(estado.contador).toBeGreaterThanOrEqual(casa.estado.contador);

    // El progreso guardado se conserva
    for (const k of ['buildPhase', 'concretoUnlocked', 'matematicasValidadas', 'puertas_colocadas', 'ventanas_colocadas']) {
      if (casa.progreso[k] !== undefined) expect(progreso[k], k).toEqual(casa.progreso[k]);
    }

    // Tamaño razonable (el servidor rechaza 2 MB)
    expect(JSON.stringify(estado).length).toBeLessThan(2 * 1024 * 1024);

    expect(reg.errores).toEqual([]);
  });
}

test('R4 idempotencia: abrir la serialización resultante produce la misma serialización', async ({ page }) => {
  test.setTimeout(180_000);
  const casa = leerCasa('muros_puerta_ventana');
  await abrirSimulador(page, { estado: casa.estado, progreso: casa.progreso });
  const primera = await instantanea(page);

  const pagina2 = await page.context().newPage();
  await abrirSimulador(pagina2, { estado: primera.estado, progreso: primera.progreso });
  const segunda = await instantanea(pagina2);
  await pagina2.close();

  expect(segunda.estado.objetos).toEqual(primera.estado.objetos);
  expect(segunda.progreso).toEqual(primera.progreso);
});
