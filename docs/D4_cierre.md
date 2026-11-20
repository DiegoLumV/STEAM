# D4 · Limpieza de código muerto de la tormenta — cierre

Alcance: solo el sistema de tormenta (decisión D4 = B). Nada más de §11 se tocó.

## Qué se quitó

| Archivo | Cambio | Líneas |
|---|---|---|
| `src/scripts/casa.js` | `isStorm`; `rainCtx`, `rainCanvas`, `rainParticles`, `stormInterval`, `lightningTimer`; `windLevel`, `windDir`, `windTarget`; funciones `toggleStorm`, `startStorm`, `stopStorm`, `newRaindrop`, `stormTick`, `applyWindPhysics`, `restoreWindPhysics` | −24 netas |
| `src/scripts/casa.js` | `applyLighting()`: `if (isNight || isStorm)` pasa a `if (isNight)` y las intensidades quedan fijas en 0.04 / 0.06 (con `isStorm` siempre `false`, es el mismo comportamiento de antes) | incluido arriba |
| `src/sandbox.html` | `#rain-canvas`, `#lightning-flash`, `#storm-wind-bar` y sus hijos | −10 |
| `src/Css/casa.css` | `.btn.storm-on` y las reglas `#rain-canvas`, `#lightning-flash`, `#storm-wind-*`, `#storm-resist-msg` | −73 |

Ninguna de estas piezas se llamaba desde otro lugar (comprobado con búsqueda en `src/`, `tests/` y `server/`).

## Qué NO se quitó, y por qué

`btnStorm` **no es de la tormenta**: es el botón «🪨 Crear Concreto» (`onclick="openConcretoModal()"`, `sandbox.html`). El nombre del id es un resto histórico. Quitarlo eliminaría la creación de concreto, que choca con D5 (conservar concreto hasta F6) y rompería los specs 05 y 12, que prueban justo eso. Por eso el botón y sus referencias (15 líneas en `casa.js`, 8 en `05_construccion_libre.spec.js`, 1 en `12_concreto_libre.spec.js`) quedan igual y los specs 05 y 12 **no se modificaron**.

Opción pendiente de tu decisión: renombrar el id `btnStorm` a `btnConcreto` (cambia `sandbox.html`, `casa.js` y los dos specs). Es solo un cambio de nombre, sin efecto funcional.

## Pruebas

| Prueba | Resultado |
|---|---|
| Sintaxis de `casa.js` | correcta |
| Node (`node --test tests/*.test.js`) | 320 pruebas · 269 pasan · 5 fallan · 46 omitidas (igual que antes; las 5 son `google_registro` y necesitan PostgreSQL) |
| `00_humo` | 1/1 |
| `05_construccion_libre` | 6/6 |
| `12_concreto_libre` | 8 de 10; fallan `C-D` y `C-F`, que ya fallaban desde F3 |
| Comprobación puntual (fuera del repositorio): ciclo noche/día, sin errores de página, sin restos de tormenta y con `btnStorm` presente | pasa |

No se corrió la regresión completa de Playwright (≈334 min): solo se tocaron la iluminación nocturna, 3 elementos de `sandbox.html` y CSS sin uso.

## Nota

Ningún spec cubría el modo noche; la comprobación puntual no quedó añadida al repositorio.
