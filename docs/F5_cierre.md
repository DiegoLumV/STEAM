# F5 — Replanteo básico (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «INICIAR F5 — REPLANTEO BÁSICO» (23-nov-2026), propuesta técnica v2 aprobada, «APROBACIÓN F5 — Con condición de adjunto» (P1 = A, P2 = A, P3 = A + condiciones C1–C4) y «HASHES CONFIRMADOS — INICIAR F5» (24-nov-2026: los 5 archivos base coinciden byte a byte).
Alcance: solo F5 (5a ejes y estacas en las esquinas; 5b escuadra 3-4-5 y diagonales). Fuera: nivelación, ángulos ≠ 90°, techos, pisos, instalaciones. No se inicia F6.

## 1. Qué hace

En el editor del plano, **📐 Replantear** coloca una estaca en cada **esquina única** de las habitaciones **guardadas** (las esquinas compartidas por dos habitaciones cuentan una vez) y numera los
ejes: **1, 2, 3…** de oeste a este y **A, B, C…** de sur a norte. Cada estaca se llama fila + columna (A1, B3…). En el 3D aparecen como postes de 0.6 m con cabeza roja y etiqueta, más una línea por
cada eje con su número o letra. El panel **«Estacas y medidas»** permite escribir la **desviación** de cada estaca (dx, dz, en mm: cuánto se aleja de su esquina teórica) y muestra, por
habitación, la verificación de 5b.

No hace falta materializar el plano: el replanteo trabaja sobre las habitaciones del plano guardado.

## 2. Fuente (verificada en el PDF)

Zamarripa Medina (2012), *Apuntes de Topografía*. En este PDF la página impresa coincide con la del PDF.

| Dato | Valor | Página |
|---|---|---|
| Tolerancia en la medición de distancias con cinta, terreno **plano** | ER = **1/5000**; **T = D·ER** (D = valor más probable de la distancia medida) | 19 |
| Criterio | «E < T se acepta la medición; E > T debe repetirse la medición» | 19 |
| Escuadra con cinta, método **3-4-5** | lados de 3, 4 y 5 m o múltiplos; todo triángulo 3-4-5 es rectángulo | 16 |
| Terreno accidentado (1/3000) | documentada, no se usa | 19 |

Las constantes viven en `src/scripts/referencia_topografia.js` con el mismo esquema que `referencia.js` (`valor`, `unidad`, `fuente`, `es_estimacion`, `derivado`, `formula`). El único dato
que **no** viene de la fuente es el tope de ±1000 mm de la desviación (`es_estimacion: true`, tope didáctico de C1).

## 3. 5b — Qué se verifica

Por habitación, con las posiciones **reales** de las estacas (esquina teórica + desviación):

| Medida | Calculado | Tolerancia |
|---|---|---|
| 4 lados (sur, norte, oeste, este) | ancho o largo de la habitación | T = D·ER |
| 2 diagonales (SO–NE, SE–NO) | √(ancho² + largo²) | T = D·ER |
| Escuadra 3-4-5, **4 esquinas × 2 orientaciones** | 5·k | T = 5k·ER |

Escuadra 3-4-5: desde cada esquina, sobre las dos paredes que parten de ella (siguiendo la dirección hacia las estacas vecinas), se marcan 3k y 4k metros (orientación «a»: 3k en x y 4k en z;
orientación «b»: 4k en x y 3k en z) y se mide la hipotenusa entre las dos marcas. **k es el mayor entero** que cabe en las dos paredes; si k < 1 la fila dice «No aplicable» y no cuenta en el
resumen. Si el ángulo de la esquina no es de 90° (porque las estacas están desplazadas) la hipotenusa difiere de 5k.

Veredicto: **E ≤ T → «✓ Se acepta»**; **E > T → «✗ Repetir la medición»**. El panel resume «N de M medidas superan la tolerancia: repite la medición.» o «Las M medidas están dentro de la tolerancia.»

## 4. Resolución de las condiciones

| Cond. | Qué se hizo | Pruebas |
|---|---|---|
| **C1** validar la entrada | Campo de **texto numérico** por estaca y eje (`.rep-dev`). Solo enteros o decimales con punto o coma y signo opcional. «abc» (y «1e3», «12abc», «--5»…) **no se aplica**: se restaura el valor anterior y el panel avisa «solo números». «5000» se **recorta a 1000** (y «-5000» a −1000) con aviso «Máximo ±1000 mm». Los decimales se redondean al milímetro de forma simétrica (2,5 → 3; −2,5 → −3); vacío = 0. | T24–T29 (Node), R4, R5 |
| **C2** ver / ocultar | **🙈 Ocultar replanteo / 👁 Ver replanteo**: apaga la superposición sin borrar datos; la marca `oculto` se guarda. «Volver a replantear» la muestra. | R9, R11 |
| **C3** mostrar T con su fórmula | Cada fila: medido, calculado, E, **T** y veredicto; tooltip y nota del panel: «T = D × ER, con ER = 1/5000 (Zamarripa, 2012, p. 19)». Diagonal de un cuarto de 4×4: T = **0.0011 m**. | T05–T07 (Node), R6, R7 |
| **C4** «sin replanteo» vs «desactualizado» | Tres estados: «Sin replanteo», «Replanteo vigente» y «Replanteo desactualizado. Vuelve a replantear.». Se calcula **comparando las esquinas únicas del plano guardado con las estacas** (sin campo nuevo). Cambiar solo nombre o vanos no desactualiza. Desactualizado oculta la tabla (faltan estacas) pero deja las estacas viejas a la vista. «Volver a replantear» conserva la desviación de las esquinas que siguen. | T20–T23 (Node), R1, R10 |

## 5. Superposición 3D (P2 = A) — fuera de `objList`

- No se selecciona, no colisiona, no es apoyo, no entra en Programar ni en el panel de piezas (`resumenEscena().objetos` no cambia; `enObjList` = false; `isPickable` y `checkCollisions` = false).
- Mallas con prefijos propios: `estaca_<id>_poste|cabeza|etq`, `eje_lineas`, `eje_col_<n>`, `eje_fila_<L>`; nodo `replanteo_plano`. (La excavación usa `exc_stake_*`: no choca.)
- **Se dibujan en el grupo de render 1** para que las estacas y sus etiquetas se vean aunque las paredes materializadas las rodeen (las esquinas coinciden con las de las paredes). El interruptor C2 las oculta.
- Hasta 200 estacas (50 habitaciones × 4 esquinas): cada una es 2 cilindros y una etiqueta (DynamicTexture 128×64). Medido en el entorno de pruebas (sin GPU, ~1,5 FPS): 200 estacas visibles ≈ 6 s desde el clic.

## 6. Guardado y compatibilidad

`progreso.replanteo = { v: 1, e: [[x, z, dx, dz], …], oculto: bool }` — **mm enteros**, al **nivel de `progreso`** (no dentro de `progreso.plano`, donde `sanearPlano` descartaría la clave desconocida). **La clave solo
existe si el alumno replanteó**: las casas sin replanteo guardan exactamente las mismas claves que antes (comprobado en R1 y R12; `plano_3d` M19 sigue exigiendo el conjunto exacto de claves).
El servidor (`combinarProgreso`) conserva las claves desconocidas del nivel superior; `guardado.js` y `server/` no se tocan.

| Caso | Tamaño |
|---|---|
| 50 habitaciones separadas = 200 estacas, **todas** con desviación de 3 cifras (peor caso, Node) | 4648 B por copia → **9296 B ×2** (el progreso viaja dos veces en el PUT) ≈ **9.1 KB** |
| Mismo caso en el navegador, desviación en 1 de cada 7 estacas (R12) | 3718 B por copia; PUT completo 17.0 KB |
| Límite de parada acordado | 15 KB (no se alcanza) |

La salvaguarda de 90 KB de F4d (`matBytesGuardado`) ya cuenta el replanteo (usa `snapshotActual`); «Replantear» se deshace si la superara.
Al cargar, `sanearReplanteo` valida lo guardado sin lanzar nunca: versión, forma, rango (±100 m), duplicados y desviaciones (recortadas a ±1000 mm). Un `progreso.replanteo` corrupto se ignora.

## 7. Ganchos en código existente (F0–F4d)

Todo lo añadido a archivos existentes son **inserciones** (0 líneas borradas o cambiadas; `diff` contra la entrega anterior: casa.js +229 −0, sandbox.html +18 −0, casa.css +110 −0).

| # | Dónde | Línea añadida |
|---|---|---|
| 1 | `restaurarProgreso` | `replanteoLimpiar();` junto a `extrasPlanoLimpiar();` (reinicio) |
| 2 | `restaurarProgreso` | `restaurarReplanteo(progreso.replanteo);` tras la restauración del plano (restauración) |
| 3 | `snapshotActual` | `if (repEstacas.length) progreso.replanteo = serializarReplanteo(...)` (clave condicional) |
| 4 | `matActualizarUI` | `replanteoActualizarUI();` (refresco del estado y del panel cuando cambia el plano guardado) |
| — | sandbox.html | botón «Replantear», botón «Ocultar replanteo», etiqueta de estado y el `<aside id="replanteo-panel">` (el «botón del editor») |
| — | pruebas | `window.__steamTest.replanteo()` (solo lectura, solo con `?steamTest=1`), añadido después del literal de `__steamTest`, sin tocarlo |

Se propusieron 3 ganchos; son **4** porque el estado «desactualizado» debe refrescarse cuando se guarda el plano y la única forma de enterarse sin cambiar F4a–F4d es colgarse de `matActualizarUI`
(que ya cuelga de `planoActualizarUI`, el punto por el que pasa todo refresco del editor). El bloque «F5 · REPLANTEO BÁSICO» es nuevo y está antes de «expone las funciones al scope global».

## 8. Archivos

| Ruta | Estado | Líneas |
|---|---|---|
| `src\scripts\referencia_topografia.js` | nuevo | 48 |
| `src\scripts\replanteo.js` | nuevo (lógica pura, sin DOM ni Babylon) | 202 |
| `tests\replanteo.test.js` | nuevo | 282 · **46 pruebas** |
| `tests\replanteo.spec.js` | nuevo | 410 · **15 pruebas** |
| `docs\F5_cierre.md` | nuevo | este archivo |
| `src\scripts\casa.js` | modificado (solo adiciones) | +229 (bloque F5 208, imports 7, 4 líneas de ganchos, getter de pruebas 10) |
| `src\sandbox.html` | modificado (solo adiciones) | +18 |
| `src\Css\casa.css` | modificado (solo adiciones) | +110 (el archivo escribe una declaración por línea) |

No se tocaron: `calculos.js`, `referencia.js`, `manipulacion.js`, `guardado.js`, `server\`, `database\`, `package.json`, `helpers.js`, ninguna prueba anterior, ni los dorados.

## 9. Pruebas

Corrida única, una suite tras otra, sobre el código final (SHA-256 de `casa.js`, `sandbox.html`, `casa.css`, `replanteo.js`, `referencia_topografia.js` y de las dos pruebas nuevas idénticos al inicio y al final de la corrida).

| Suite | Resultado | Línea base | Duración |
|---|---|---|---|
| `node --test tests/calculos.test.js` | **102 / 102** | 102 | — |
| `node --test tests/manipulacion.test.js` | **45 / 45** | 45 | — |
| `node --test tests/replanteo.test.js` | **46 / 46** (nuevo) | — | — |
| `tests/replanteo.spec.js` | **15 / 15** (nuevo) | — | 9.4 min |
| `tests/plano_editor.spec.js` | **23 / 23** | 23 | 17.6 min |
| `tests/plano_3d.spec.js` | **37 / 37** (incluye M19, claves exactas de `progreso`) | 37 | 21.2 min |
| `tests/plano_habitaciones.spec.js` | **22 / 22** | 22 | 21.1 min |
| `tests/plano_vanos.spec.js` | **30 / 30** | 30 | 22.2 min |
| specs 00–12 (`00`, `01`, `02`, `03`, `04`, `12`) | **29 / 29**, con `--timeout=180000` en mi entorno sin GPU (ver §10); **29 / 29** también en tu equipo el 24-nov con el timeout por defecto (9.8 min) | 29 | 18.0 min |

**Nota sobre `plano_3d` en tu equipo (24-nov, 14:xx).** En la corrida completa `C1b` agotó el tiempo al cargar la página (11.9 min; falló `abrirSimulador` tras 60 s) y la suite dio 36 / 37. Repetida en tu equipo (`-g "C1b" --repeat-each=3`) pasó 3 / 3 en ≈ 19 s cada una, y en mi entorno pasó 5 / 5 y la suite completa dio 37 / 37. `C1b` carga una casa sin replanteo, donde el código de F5 no hace nada, así que se trata como un atasco puntual del equipo y no como un fallo de F5.

Medido en R12 (50 habitaciones separadas = 200 estacas): replanteo 3718 B por copia (×2 = 7436 B); PUT completo 17.0 KB. Peor caso en Node (todas las estacas con desviación de 3 cifras): 4648 B por copia (×2 = 9296 B). Límite de parada: 15 KB; no se alcanza.

Comandos (desde la raíz del proyecto, una suite a la vez):

```
node --test tests/calculos.test.js
node --test tests/manipulacion.test.js
node --test tests/replanteo.test.js
npx playwright test tests/replanteo.spec.js
npx playwright test tests/plano_editor.spec.js
npx playwright test tests/plano_3d.spec.js
npx playwright test tests/plano_habitaciones.spec.js
npx playwright test tests/plano_vanos.spec.js
npx playwright test tests/00_humo.spec.js tests/01_restauracion.spec.js tests/02_techos_excavacion.spec.js tests/03_calculos_ui.spec.js tests/04_dimension_cubierta.spec.js tests/12_concreto_libre.spec.js
```

No hay ningún cambio de comportamiento en F0–F4d: `casa.js` +229 −0, `sandbox.html` +18 −0, `casa.css` +110 −0 (diff contra tus archivos de la presentación) y las pruebas existentes no se modificaron.

## 10. Limitaciones y desviaciones

### Desviaciones respecto de la propuesta técnica v2

1. **4 ganchos en `casa.js`, no 3.** Los tres acordados (reinicio y restauración en `restaurarProgreso`, clave condicional en `snapshotActual`, botón del editor) más `replanteoActualizarUI()` dentro de `matActualizarUI` (§7). Sin ese cuarto no se puede refrescar el estado «desactualizado» al guardar el plano sin tocar F4a–F4d. Es una sola línea añadida; si prefieres exactamente 3, el estado se refrescaría solo al abrir y cerrar el editor.
2. **Tamaños distintos de los estimados.** `casa.js` +229 (estimado +170), `casa.css` +110 (+40; el archivo escribe una declaración por línea), `sandbox.html` +18 (+25), `replanteo.js` 202 (250), `referencia_topografia.js` 48 (90). Pruebas: **46** de Node (previstas 45) y **15** de Playwright (previstas 14).
3. **Superposición en el grupo de render 1.** Las estacas y sus etiquetas se dibujan por encima de las paredes materializadas (no las tapan), porque las esquinas del replanteo coinciden con las esquinas de las paredes. Con C2 se ocultan.

### Limitaciones

- **D en T = D·ER es la distancia calculada de proyecto**, no el promedio de una medición de ida y vuelta: en el simulador no hay ida y vuelta. Con las desviaciones de P1 = A, «medido» sale de las posiciones desplazadas de las estacas.
- **Caso E = T.** La fuente dice «E < T se acepta; E > T se repite» y no define la igualdad; aquí E = T **se acepta** (E ≤ T).
- **Solo terreno plano** (ER = 1/5000). La tolerancia del terreno accidentado (1/3000) está documentada y no se usa.
- **Solo habitaciones rectangulares alineadas con los ejes** (las del editor): sin ángulos distintos de 90°, sin nivelación, techos, pisos ni instalaciones (fuera de alcance de F5).
- **Hay que guardar el plano antes de replantear** (el replanteo trabaja sobre el plano guardado). Con cambios sin guardar avisa y no hace nada.
- **Etiquetas de ejes:** se omiten si hay más de 60 ejes entre columnas y filas (las estacas y las líneas se siguen dibujando).
- **Máximo 200 estacas** (50 habitaciones × 4 esquinas); más no se replantea.
- **Rendimiento medido sin GPU:** con 200 estacas, «Replantear» tarda ≈ 6 s hasta ver las estacas (R12). En un equipo con GPU es mucho menos.
- **Entorno de pruebas de Claude (no del proyecto).** Mi entorno no tiene GPU y el `fill` de Playwright se atasca en algunas pruebas de specs 00–12; con el timeout por defecto de 30 s fallan 9 pruebas (02 R9, 02 R6/R9 libre, 12 C-B, C-C, C-D, C-E, C-F, C-G, C-J), **y fallan igual sin F5** (comprobado con tu `casa.js`, `sandbox.html` y `casa.css` de la presentación, sin ninguno de los archivos de F5). Con `--timeout=180000` pasan todas. En tu equipo, con GPU, el timeout por defecto basta (confirmado en tu corrida del 24-nov: 29 / 29).
- **Conteo de specs 00–12:** son **29** pruebas (00: 1, 01: 10, 02: 6, 03: 1, 04: 1, 12: 10), en mi copia y en tu corrida del 24-nov. La cifra de 28 que se manejaba antes era un conteo de menos.

## 11. Nota sobre D3

D3 (guardado local con `localStorage`, retirar OAuth, etc.) **no se toca** en F5. El replanteo se guarda por el mismo camino que el resto del progreso (`/api/guardado`), así que cuando D3 cambie el almacenamiento, `progreso.replanteo` viajará con él sin cambios: es un campo JSON de unos pocos KB al nivel de `progreso`.
