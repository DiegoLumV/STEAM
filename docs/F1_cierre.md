# F1 · Documento de cierre — Cámara libre con colisión nativa y «rayos X»

**Fecha:** 2026-11-05 · **Base:** Prompt v3.2 §4.3 (F1 ampliada, sin Havok ni dependencias nuevas).

## Antes / después

| Aspecto | Antes | Después |
|---|---|---|
| Orbitar | Solo flechas del teclado | Clic izquierdo y arrastre, además de las flechas |
| Desplazar | No existía | Botón central del ratón, o Ctrl + clic izquierdo; límite de 25 m desde el origen |
| Acercamiento | Radio mínimo 5 m | Radio mínimo 1,2 m (se puede entrar a la vivienda) |
| Ángulo vertical | Máximo π/2,05 (≈ 87,8°) | Máximo π/2 − 0,02 (≈ 88,9°): vista casi a la altura del objetivo; el teclado usa el mismo límite |
| Muros | La cámara los atravesaba | No los atraviesa (colisión nativa de Babylon, `collisionRadius` 0,35 m) |
| «Rayos X» | No existía | Botón `🩻 Rayos X` en la barra superior; desactiva la colisión mientras está encendido. Solo de sesión, no se guarda |
| Suelo | — | El objetivo de la cámara no baja de y = 0, así la cámara nunca queda bajo el terreno |
| Clic derecho | Menú contextual de cortar bloques | Igual; no mueve la cámara |
| Rueda, gizmos, selección, `?libre=1` | — | Sin cambios de comportamiento |

Sólidos para la cámara: muros (`wall_block`, `wall_madera`, `wall_lamina`) y piezas sueltas de block, madera y lámina. Puertas y ventanas no bloquean (son vanos); techos, pisos y losa tampoco en F1.

## Archivos

| Archivo | Cambio |
|---|---|
| `src/scripts/casa.js` | Bloque nuevo «F1 · Cámara libre» (`CAMARA_F1`, `configurarCamaraLibre`, `sincronizarColisionesCamara`, `toggleRayosX`, `crearBotonRayosX`); inicialización de la cámara con la configuración anterior comentada como respaldo; una línea en `updateObjListUI` y el límite vertical del teclado en `setupGizmos`. Funciones de lectura de cámara en el gancho de pruebas `window.__steamTest` (solo con `?steamTest=1`). |
| `package.json` | Solo `test:referencia` incluye ahora `tests/referencia.test.js`. |
| `tests/camara.spec.js` | Spec nueva (10 pruebas). |
| `docs/F0_cierre.md` | Nota de alcance al final. |
| `docs/F1_cierre.md` | Este documento. |

No se instaló ninguna dependencia. No se tocaron `calculos.js`, `referencia.js`, `materiales.js`, `guardado.js`, `sandbox.html`, `server/`, los golden files ni las specs 00–12.

## Pruebas

En la nube (Chromium sin GPU, ~1,5 FPS medidos):

- `node --test` de 9 archivos (incluye `referencia.test.js` e `integracion.test.js`): 125/125. `npm run test:referencia`: 54/54.
- `camara.spec.js`: 10/10.
- Specs 00–12: los mismos resultados que en una copia sin cambios. C-D y C-F de `12_concreto_libre.spec.js` agotan el tiempo en ambas copias por la lentitud del entorno. C-H pasó en la línea base (3,3 min) y agotó su límite de 4 min en la ejecución completa modificada; ejecutada sola en la copia modificada pasa (3,9 min). Conviene confirmarlo en un equipo con GPU.

## Riesgos observados

- La prueba de `integracion.test.js` ejecuta `setupGizmos` de forma aislada: la primera versión usaba una constante externa y fallaba. Se corrigió el código (el teclado lee `camera.upperBetaLimit`), no la prueba.
- Con colisión activa solo se entra a la vivienda por arriba o por vanos (puerta, ventana). Es el comportamiento pedido; «rayos X» es la vía explícita para atravesar muros.
- La colisión de la cámara orbital empuja la cámara hacia el objetivo al tocar un muro; acercarse mucho a una esquina puede sentirse brusco.
- Las pruebas de cámara en un entorno lento tardan ~15 min; en un equipo con GPU deben ser mucho más rápidas.
- FPS en equipo real: no aplica en F1 (no hay física ni CSG); se medirá desde F1.bis / F5.

## Pendientes

- F1.bis (Havok), CSG2 y Manifold siguen sin autorizar.
- Ejecutar `npm run test:e2e` en un equipo con GPU para confirmar C-D, C-F y C-H.
