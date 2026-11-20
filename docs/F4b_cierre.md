# F4b — Habitaciones libres con nombre (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «AUTORIZACIÓN F4b — Habitaciones libres con nombre», «APROBACIÓN DE LA PROPUESTA TÉCNICA F4b» y «DECISIÓN DE COLOR F4b — Opción A» (decisiones D1–D6 + condiciones C1–C5).
Alcance: solo F4b. No se inicia F4c (vanos: puertas y ventanas) ni F4d (integración con el 3D).

## 1. Problema

F4a dejó un editor 2D con punto, línea y rectángulo **sin semántica**. F4b añade el primer elemento con significado: la **habitación**, un
rectángulo con **nombre**, con **área y perímetro calculados**, que se dibuja con la herramienta **H** (dos clics), se selecciona, se mueve y se
redimensiona con handles, se edita en un **panel lateral**, avisa visualmente si **se solapa** con otra y puede generarse a partir de **plantillas**.
Las habitaciones se guardan en `progreso.plano.habitaciones`. La escena 3D no cambia.

## 2. Decisiones aprobadas

| # | Decisión |
|---|---|
| D1 | Herramienta **H**: dos clics (esquinas opuestas), sin arrastre. Misma mecánica que línea y rectángulo de F4a; `Esc` cancela el dibujo en curso. |
| D2 | **Área y perímetro se calculan, no se guardan.** Se muestran en la etiqueta del plano y en el panel; el JSON guardado solo lleva `id, tipo, x, z, ancho, largo, nombre`. |
| D3 | Panel flotante **solo visible con la herramienta H activa o con una habitación seleccionada**: así, con el editor de F4a en uso normal, el panel nunca aparece. |
| D4 | Plantilla «3 ambientes»: Sala 5×4 y Dormitorio 4×4 en fila (9×4) y Cocina 3×3 bajo la Sala (caja total 9×7). Además «Casa mínima» (6×4) y «Casa 2 ambientes» (9×4). |
| D5 | Color, **opción A**: habitación seleccionada = halo y handles **celestes**; solape = borde **ámbar** sólido + relleno ámbar tenue. Los elementos de F4a conservan su ámbar de selección sin cambios. |
| D6 | La habitación es un **tipo propio** (`tipo: 'habitacion'`) en una lista propia (`habitaciones`), separada de `elementos`. Los rectángulos de F4a no se convierten en habitaciones. |

## 3. Estructura de datos — `progreso.plano.habitaciones` (campo aditivo)

```
plano: {
  v: 1,                                           // no cambia: el campo nuevo es aditivo
  lote, rejilla, elementos, contador,             // sin cambios respecto a F4a
  habitaciones: [
    { id: 'h1', tipo: 'habitacion', x, z, ancho, largo, nombre }   // (x, z) = esquina mínima
  ]
}
```

- Ids `h` + (mayor número usado + 1). **No hay contador guardado**: si se borra la última habitación, su id puede reutilizarse.
- Máximo **50** habitaciones; lados entre **0.1 y 100 m**; nombre de hasta **30 caracteres** (vacío → «Habitación k»).
- Coordenadas en metros del mundo, redondeadas a milésimas (como F4a). `sanearPlano` ahora **siempre** devuelve `habitaciones` (`[]` por defecto).
- Los nombres son texto del alumno que se inserta en el SVG: **siempre se escapan** (`planoEscapar`); la prueba H7 verifica que `<b …>` se ve como texto y no crea elementos.

## 4. Funciones puras (`src/scripts/calculos.js`)

| Función | Contrato |
|---|---|
| `areaRectangulo(ancho, largo)` | `ancho × largo` a milésimas; entradas no numéricas o ≤ 0 → 0. |
| `perimetroRectangulo(ancho, largo)` | `2 × (ancho + largo)` a milésimas; mismas reglas. |
| `formatearArea(m2)` | Texto con un decimal y unidad («12.0 m²»); `null` si no es número finito. |
| `habitacionCreable(ancho, largo)` | Cada lado ≥ 0.1 y ≤ 100 **y** área **> 0.01 m²**. |
| `rectangulosSolapan(r1, r2)` | Intersección de **área positiva**; compartir solo borde o esquina **no** es solape. |
| `solapesHabitaciones(lista)` | `{ id: [ids con los que se solapa] }`; solo aparecen las que se solapan. |
| `nombreHabitacionDefecto(k)` / `siguienteIdHabitacion(lista)` | «Habitación k» / `h` + (máx + 1). |
| `sanearHabitaciones(entrada)` | Nunca lanza excepción. Entrada no lista → `[]`; descarta tipos distintos, campos faltantes o no finitos, fuera de ±1000 m y lados fuera de [0.1, 100]; reasigna ids repetidos o ausentes; nombre vacío → por defecto; trunca a 50; idempotente; no muta la entrada. |
| `habitacionEn(lista, x, z, tol)` | Primero la de **borde más cercano** dentro de la tolerancia; si no, la **última** cuyo interior contiene el punto. |
| `redimensionarDesdeEsquina(hab, esquina, x, z)` | Esquinas `no`, `ne`, `so`, `se`; la esquina **opuesta queda fija**; cada lado se limita a [0.1, 100] (el arrastre se detiene y nunca se invierte). |
| `PLANTILLAS_HABITACIONES` / `generarPlantilla(nombre, lote)` | Habitaciones (sin id) centradas en el origen; `null` si la plantilla no existe, el lote es inválido o **no cabe** en el lote. |

Constantes: `HAB_MAX`, `HAB_LADO_MIN`, `HAB_LADO_MAX`, `HAB_AREA_MIN`, `HAB_NOMBRE_MAX`. Sin DOM ni Babylon.

## 5. Interfaz

- **Barra del editor:** grupo «Habitaciones» con el botón **Habitación (H)** y el selector **«Plantillas…»** (`#plano-plantilla`, vuelve a «Plantillas…» tras elegir).
- **Panel flotante** (`#plano-panel`, a la derecha del lienzo): nombre (máx. 30), ancho y largo (0.1–100, paso 0.1), **área** y **perímetro** (calculados), aviso de solape («Se solapa con Habitación 2») y botón **Borrar**. Los cambios se aplican con `Enter` o al salir del campo; un valor inválido se **ignora, se restaura el anterior y se avisa**. Con el campo enfocado las letras no cambian de herramienta.
- **Dibujo:** dos clics con vista previa punteada y cota «a × l m». Si es demasiado pequeña, no se crea, se avisa («No se crea: cada lado debe medir entre 0.1 y 100 m y el área debe superar 0.01 m².») y el primer clic **sigue esperando** la esquina opuesta; `Esc` lo limpia.
- **Selección (V):** el clic en el cuerpo o el borde selecciona; aparecen **4 handles** en las esquinas; arrastrar el cuerpo **mueve** (con imán a la rejilla si está visible) y arrastrar un handle **redimensiona desde la esquina opuesta**. Habitación y elemento de F4a se excluyen mutuamente. `Supr`, `Retroceso` y los botones Borrar la eliminan.
- **Orden de selección bajo el puntero:** handles de la habitación seleccionada → elementos de F4a → habitaciones (borde más cercano; si no, la última creada).
- **Dibujo en capas:** las habitaciones se pintan **debajo** de los elementos de F4a.
- **Plantillas:** sin habitaciones se aplican directo; con habitaciones aparece un diálogo **Reemplazar / Añadir / Cancelar** (`Esc` cancela y las teclas quedan inertes); si la plantilla no cabe en el lote se avisa y **no se aplica nada**; si superaría las 50, «Añadir» se rechaza con aviso.
- **Atajo H** con el editor abierto; con el editor cerrado, escribiendo en un campo o con un diálogo abierto no hace nada. `R` sigue sin hacer nada en el editor.

## 6. Detección de solapes

`rectangulosSolapan` exige intersección de **área positiva** con tolerancia de coma flotante (1e-6): dos habitaciones adosadas que comparten un borde **no** avisan (las plantillas se generan sin solapes). El solape **no bloquea** ni la creación, ni el movimiento, ni el guardado: solo marca ambas habitaciones (borde ámbar, relleno ámbar tenue) y se explica en el panel. El aviso se recalcula al crear, mover, redimensionar, editar desde el panel, aplicar plantilla y borrar.

## 7. Guardado y compatibilidad

- `progreso.plano.habitaciones` viaja dentro de `progreso.plano`, que ya se guardaba en F4a: **`guardado.js` y el servidor no se tocan**. El JSON v2 conserva exactamente sus claves; el resto de `progreso` y `estado` sale idéntico (H19).
- `restaurarProgreso` pasa `progreso.plano` por `sanearPlano`, que ahora sanea también `habitaciones` (corruptas, no lista, más de 50: H17, H18).
- Casas sin plano o con un plano de F4a (sin la clave) cargan con `habitaciones: []` y sin errores; la clave solo aparece al guardar (H16).
- Huella de cambios (`planoHuella`) incluye las habitaciones: el indicador «Cambios sin guardar», la confirmación de cierre y «Guardar» funcionan igual que en F4a.

## 8. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/scripts/calculos.js` | `planoVacio` y `sanearPlano` con `habitaciones`; bloque F4b con las funciones y constantes del §4. |
| `src/scripts/casa.js` | Import F4b; estado, render, previa, handles, panel, plantillas, atajo `H`, ampliación del gancho de pruebas `__steamTest.plano()` (solo aditiva) y ajustes en las funciones de F4a (render, actualizar UI, borrar selección, puntero, abrir/cerrar, teclado, `configurarPlano`). |
| `src/sandbox.html` | Botón y selector de habitaciones, `#plano-panel` y diálogo `#plano-plantilla-conf`. |
| `src/Css/casa.css` | Bloque «F4b · Habitaciones» al final (colores de la opción A, panel, diálogo). |
| `tests/calculos.test.js` | 15 pruebas nuevas (solo se añadieron; se amplió la lista de importaciones). |
| `tests/plano_habitaciones.spec.js` | Nuevo (H1–H22). |
| `docs/F4b_cierre.md` | Este documento. |

Sin cambios: `manipulacion.js`, `guardado.js`, `referencia.js`, `materiales.js`, `server/`, `database/`, `package.json`, `tests/plano_editor.spec.js` (**sin modificar**, C1), `tests/helpers.js`, golden files, specs de fases anteriores y `docs/F0…F4a_cierre.md`.

## 9. Diferencias técnicas respecto a F4a

- F4a no tenía semántica; F4b introduce un **tipo de elemento con identidad** (id propio, nombre editable) que vive en **su propia lista**, con su propio modelo de selección (`planoSelHab`, ids `h<k>`, separado de `planoSel`, que sigue siendo el id numérico de F4a).
- Primer uso de **handles de redimensionado** y de un **panel de edición numérica** en el editor (F4a solo movía y borraba).
- Primer **diálogo de decisión** dentro del overlay además de la confirmación de cierre.
- Primer cálculo derivado (área y perímetro) y primera **validación visual no bloqueante** (solape).
- El gancho de lectura `__steamTest.plano()` crece de forma aditiva (`habitaciones` con área y perímetro, `seleccionHab`, `solapes`, `plantillaPendiente`); lo que ya devolvía no cambia.

## 10. Pruebas

**Node** (`tests/calculos.test.js`, 15 nuevas): área y perímetro, `habitacionCreable`, `rectangulosSolapan` (borde compartido ≠ solape), `solapesHabitaciones`, `sanearHabitaciones` (seis casos: basura, ids, nombres, límites, 50, idempotencia), `sanearPlano` con habitaciones, `siguienteIdHabitacion` / `habitacionEn`, `redimensionarDesdeEsquina`, `generarPlantilla` (dos pruebas).

**Playwright** (`tests/plano_habitaciones.spec.js`):

| Prueba | Cubre |
|---|---|
| H1 | Herramienta H (botón y atajo): dos clics, nombre por defecto, ids, área y perímetro |
| H2 | `Esc` cancela el dibujo; el editor sigue abierto |
| H3 | Área ≤ 0.01 m² no se crea y se avisa; el primer clic sigue esperando |
| H4 | Selección con V, 4 handles y panel; exclusión mutua con F4a; Supr, Borrar de la barra y del panel |
| H5 | Handles: redimensiona desde la esquina opuesta; se detiene en 0.1 m |
| H6 | Mover el cuerpo conserva medidas; imán con rejilla, libre sin ella |
| H7 | Panel: nombre (Enter o blur), máx. 30, vacío se restaura, texto escapado |
| H8 | Panel: ancho y largo; área y perímetro recalculados |
| H9 | Valores inválidos ignorados y restaurados con aviso |
| H10 | Solape: borde ámbar y mensaje; selección celeste; F4a sigue ámbar; adosadas sin aviso |
| H11 | El aviso desaparece al mover, redimensionar (panel y handle) y borrar |
| H12 | Las tres plantillas: posiciones, nombres editables, sin solapes |
| H13 | Plantilla con habitaciones: Reemplazar / Añadir / Cancelar; `Esc` cancela |
| H14 | Plantilla que no cabe: aviso y no se aplica; cabe justo → se aplica |
| H15 | Guardar escribe `progreso.plano.habitaciones` y al recargar se conserva |
| H16 | Casas sin habitaciones (sin plano y plano de F4a) cargan con `[]` |
| H17 | `habitaciones` corruptas no rompen la carga |
| H18 | Más de 50 se trunca; la 51.ª no se crea |
| H19 | Guardado v2 intacto: claves y resto del progreso idénticos; área y perímetro **no** se guardan |
| H20 | La cámara 3D no se mueve |
| H21 | `A`, `Shift+A`, `Ctrl+Z`, `Q/E/R/F/T/G/X` no actúan con el editor abierto; sin telemetría |
| H22 | Atajo `H` sin chocar con V/P/L/B; inerte con el editor cerrado, en campos o con diálogo |

Durante la verificación todos los fallos de la primera corrida resultaron ser errores de las propias pruebas, no del código (H2: el segundo clic ya creaba la habitación; H3: un `Esc` sin dibujo en curso cerraba el editor; H7: el texto de prueba excedía los 30 caracteres; H11: un ancho de 0.5 no sacaba la habitación del solape; H20: coordenada equivocada del handle; H17: carga intermitente por abrir tres escenas a la vez). El código de F4b no se modificó durante esas correcciones.

## 11. Resultados (literales)

**Node** — `node --test tests/*.test.js`:

```
# tests 266
# pass 215
# fail 5          <- los 5 preexistentes de google_registro (ECONNREFUSED, sin base de datos)
# cancelled 0
# skipped 46      <- pruebas de PostgreSQL, se omiten sin base de datos
```
251 de F4a + 15 nuevas = 266 (200 + 15 = 215 correctas). `tests/calculos.test.js`: **48/48** (33 previas + 15 de F4b, las 33 sin cambios). `tests/manipulacion.test.js`: **45/45**.

**Playwright** (Chromium sin GPU, un worker, sin editar el código durante las corridas):

| Suite | Resultado |
|---|---|
| `plano_editor.spec.js` (P1-P23, **spec sin modificar**, C1) | **23 passed** |
| `plano_habitaciones.spec.js` (nuevo, H1-H22) | **22 passed** (21 en la corrida completa final + H17 repetido, ver nota) |
| `camara.spec.js` | **10 passed** |
| `terreno.spec.js` | **11 passed** |
| `apoyar.spec.js` | **9 passed** |
| `desapoyar.spec.js` | **13 passed** |
| `avisos_colocacion.spec.js` | **21 passed** |
| `nacimiento_piezas.spec.js` | **4 passed** |
| specs `00`-`12` | **46 passed, 2 failed** - `C-D` y `C-F` de `12_concreto_libre` (los dos preexistentes; sin regresiones nuevas) |

`plano_editor.spec.js` se ejecutó completo con el código de F4b y **sin tocar el spec**: P16 pasó también en la corrida completa (el ruido de WebSocket de Vite no apareció esta vez).

Incidencias durante la verificacion (no son defectos del codigo de F4b):

- La primera corrida de `plano_habitaciones.spec.js` se cortó por el límite de tiempo del entorno en H17 y mostró cuatro fallos (H2, H3, H7, H11); los cuatro eran errores de las propias pruebas (ver §10). H20 falló una vez por una coordenada equivocada del handle en la prueba. Se corrigieron las pruebas; el código de F4b no cambió.
- En la corrida completa final, H17 agotó los 60 s de carga del simulador al abrir su tercera página a la vez (varias escenas 3D simultáneas sin GPU). La prueba pasó en otras dos corridas; para eliminar la intermitencia ahora cierra cada página al terminar con ella, y se repitió en solitario: **1 passed**.
- Una corrida de regresión se interrumpió por un reinicio del contenedor del entorno (las specs `00`-`12` se repitieron completas); el resto de las suites se ejecutó sin interrupciones.

## 12. Resolución de C1–C5

| Condición | Resolución |
|---|---|
| C1 | Los **23 tests** de `tests/plano_editor.spec.js` pasan **sin modificar el spec** con el código de F4b (23 passed). El cambio de color de la opción A no afectó a ninguno: los elementos de F4a conservan su ámbar y el panel solo aparece con la herramienta H o con una habitación seleccionada. |
| C2 | Opción A verificada en H10: halo y handles de la habitación seleccionada `rgb(127, 224, 255)` (celeste); borde de solape `rgb(255, 194, 71)` (ámbar) con relleno tenue; selección de elemento de F4a `rgb(255, 183, 77)` (ámbar, sin cambios). |
| C3 | **Una versión antigua (F4a) que abra y guarde una casa con habitaciones las perdería**: `sanearPlano` de F4a descarta las claves que no conoce, así que al guardar el plano ya no incluiría `habitaciones`. No hay forma de evitarlo sin tocar F4a; basta con no mezclar versiones. |
| C4 | **Incoherencia 0.1 × 0.1:** `habitacionCreable` exige área **> 0.01 m²**, y 0.1 × 0.1 vale exactamente 0.01, por lo que **no se puede crear** (H3). Sí se **puede llegar a ese tamaño** redimensionando con un handle (H5 se detiene en 0.1 × 0.1) o desde el panel (H8), y `sanearHabitaciones` lo acepta al cargar (cada lado ≥ 0.1). Es deliberado: el mínimo de creación evita puntos accidentales y el mínimo de edición permite cualquier lado válido; queda documentado y no se corrige en F4b. |
| C5 | **Límite del servidor:** `express.json()` usa su límite por defecto de **100 KB** por petición. Medido con `sanearPlano`: una habitación ocupa unos **104 bytes** (hasta unos 124 con un nombre de 30 caracteres); **50 habitaciones ≈ 5.3 KB** (≈ 6.2 KB con nombres de 30 caracteres). El plano viaja **dos veces** en cada guardado (en `progreso` y en `estado.progreso`), de modo que 50 habitaciones aportan ≈ 12 KB al cuerpo de la petición: muy por debajo del límite. **Advertencia:** el peor caso extremo (los 500 elementos de F4a **más** 50 habitaciones) mide ≈ 46 KB de plano, es decir ≈ 92 KB duplicado, y junto con las piezas 3D y el resto del progreso **podría rebasar los 100 KB**. Es un límite que ya existía con F4a (500 rectángulos con coordenadas largas ≈ 40 KB, ≈ 80 KB duplicados) y no se modifica aquí (el servidor no se toca); si en F4d se necesitaran planos así de grandes habría que subir el límite o guardar el plano una sola vez. |

## 13. Limitaciones y desviaciones

- **Sin vanos todavía:** puertas y ventanas llegan en F4c; las habitaciones no tienen huecos ni muros.
- **Sin integración con el 3D (F4d):** el plano no genera piezas ni se refleja en la escena; la cámara no se toca.
- **Un rectángulo de F4a no se convierte en habitación** (ni al revés): son tipos distintos. Si se superponen, el interior de un **rectángulo de F4a gana el clic** frente a una habitación.
- **Las habitaciones pueden extenderse fuera del lote** (no se recortan); el límite duro es ±1000 m, como en F4a. Las plantillas sí exigen caber en el lote.
- **Reutilización de ids:** al borrar la última habitación, su id puede reutilizarse (no hay contador guardado).
- **`Esc` dentro de un campo del panel** se comporta como `Enter` (aplica el valor y quita el foco); no revierte.
- **Sin deshacer/rehacer** en el editor (como en F4a); sin multiselección.
- **Tope de 50 habitaciones**; las que sobran al cargar se descartan.
- **Vista de maestro (`?alumno=`):** el editor abre en solo lectura (herramientas, panel y plantillas deshabilitados); sigue **sin prueba automatizada**, igual que en F4a.
- **Nombres duplicados permitidos** (por ejemplo, dos «Habitación 1» al añadir una plantilla); los ids sí son únicos.
- En un equipo sin GPU el simulador corre a ~1,5 FPS y la suite de habitaciones tarda unos 25 minutos; el ruido de WebSocket de Vite (HMR) se filtra solo en esa spec.

## 14. Fases intactas

F0–F4a y el guardado v2 quedan intactos: las suites de regresión (§11) pasan con los mismos resultados que antes de F4b, incluidos los dos fallos preexistentes de `12_concreto_libre` (C-D, C-F) y los cinco de `google_registro` (sin base de datos).

## 15. Nota sobre F4c (vanos)

F4c añadiría **puertas y ventanas** sobre los bordes de las habitaciones. Puntos a decidir antes de implementarla: (1) si un vano pertenece a una habitación (`habitacionId` + lado + posición) o es un elemento libre del plano; (2) cómo se comporta un vano cuando la habitación se mueve, se redimensiona o se borra; (3) medidas por defecto y límites (ancho y alto dentro del lado); (4) si hay deshacer/rehacer, que ni F4a ni F4b tienen; (5) qué hacer con los **solapes** y con los lados compartidos por habitaciones adosadas (un vano en un muro común); (6) la persistencia: lista nueva `progreso.plano.vanos` aditiva, con la misma advertencia de compatibilidad (C3). **F4c no se inicia sin autorización explícita.**
