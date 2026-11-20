# F4a — Editor 2D base del plano (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «AUTORIZACIÓN F4a — Editor 2D base del plano» y «APROBACIÓN DE LA PROPUESTA TÉCNICA F4a» (6 decisiones D1–D6 + condiciones C1–C5).
Alcance: solo F4a. No se inicia F4b (habitaciones), F4c (vanos) ni F4d (integración con 3D).

## 1. Objetivo

Un editor 2D del plano sobre el lote, como overlay modal: lote en metros, ejes con origen «0,0», cotas con un decimal, rejilla opcional, zoom y
pan, herramientas punto / línea / rectángulo **sin semántica** (todavía no son muros ni habitaciones), selección, movimiento y borrado, y guardado
aditivo en `progreso.plano`. La escena 3D, la cámara, el gizmo, la selección de piezas y los paneles de F2.x no se tocan.

## 2. Decisiones aprobadas

| # | Decisión |
|---|---|
| D1 | Tecnología **SVG**. No Canvas 2D (hit-test, rótulos y selección habría que rehacerlos a mano; pruebas frágiles por píxeles) ni Babylon ortográfico (mezcla el editor con la escena y la cámara 3D, y arriesga F1/F2). |
| D2 | Lote = opción **B**: `progreso.plano.lote`, 10×10 m por defecto. Migración a `terreno.lote` prevista en F4d (exige tocar `guardado.js` y `derivarTerreno` del servidor). |
| D3 | Contorno de la excavación activa como referencia de **solo lectura**: gris punteado, tooltip «Contorno de la excavación actual (solo lectura)», no seleccionable, no editable, no se guarda en `elementos`. Sin excavación activa no se dibuja. |
| D4 | Imán a la rejilla **solo con la rejilla visible**, sin casilla extra. |
| D5 | Rectángulo = **`B`**. `R` no hace nada en el editor (queda reservada a la rotación 3D) y muestra el aviso «R rota en 3D. Para rectángulo usa B». |
| D6 | `V` selecciona; `Esc` cancela el dibujo en curso o cierra; con cambios sin guardar pide confirmación (C5). |

## 3. Estructura de datos — `progreso.plano` (campo aditivo)

```
plano: {
  v: 1,
  lote: { ancho, largo },                       // m, centrado en el origen (ancho = X, largo = Z); 1–100 m
  rejilla: { visible, paso },                   // paso ∈ {0.1, 0.25, 0.5, 1}
  elementos: [
    { id, tipo: 'punto',      x, z },
    { id, tipo: 'linea',      x1, z1, x2, z2 },
    { id, tipo: 'rectangulo', x, z, ancho, largo }   // (x, z) = esquina mínima; ancho, largo > 0
  ],
  contador                                       // siguiente id
}
```

Coordenadas en metros del mundo (X este, Z norte, origen = centro del lote), redondeadas a milésimas. La clave **solo existe si el alumno guardó un
plano**: las casas antiguas siguen sin ella y abrir/cerrar el editor sin guardar no la crea. El zoom y el pan no se guardan.

## 4. Funciones puras (`src/scripts/calculos.js`)

`distancia`, `normalizarRectangulo`, `ajustarARejilla`, `formatearCota`, `limitarZoom`, `zoomEnPunto`, `escalaBasePlano`, `mundoAPantalla`,
`pantallaAMundo`, `distanciaPuntoSegmento`, `anclaElemento`, `moverElemento`, `cotasElemento`, `distanciaAElemento`, `elementoEn`, `planoVacio`,
`sanearPlano` y las constantes `PLANO_*`. Sin DOM ni Babylon; `casa.js` solo las importa. `sanearPlano` nunca lanza excepción (C3):
entrada no objeto → plano vacío; lote inválido (falta un lado, no numérico, fuera de 1–100) → 10×10; descarta elementos con campos faltantes, tipos
incorrectos, valores no finitos, fuera de ±1000 m, líneas de longitud 0 y rectángulos con ancho o largo ≤ 0; reasigna ids repetidos o ausentes;
trunca a 500 elementos válidos; elimina campos extra; es idempotente y no muta la entrada.

## 5. Interfaz (`sandbox.html`, `casa.css`, bloque «F4a · EDITOR 2D DEL PLANO» de `casa.js`)

- Botón **«🗺️ Plano»** (`#btnPlano`), siempre visible y habilitado (C4). Es **flotante, arriba a la derecha bajo la barra superior** (zona libre), no parte de la barra: a 1280 px la barra ya desborda (corta «Noche») y un botón más empujaba «Rayos X» fuera de la pantalla (lo detectó `camara.spec.js`).
- `#plano-overlay`, `z-index: 60` (cubre la interfaz normal y queda bajo los modales de 100). Barra: herramientas, borrar, rejilla (casilla + paso),
  lote (ancho × largo), zoom y «Encuadrar», estado «Guardado / Cambios sin guardar», **Guardar** y **Cerrar**. Pie con ayuda de la herramienta y
  coordenadas del cursor.
- Lienzo `<svg>`: se redibuja completo (≤ 500 elementos). Ejes con flechas «X (este)», «Z (norte)» y «0,0»; **norte arriba**, este a la derecha.
  Cotas del lote en el borde; cota de cada elemento (línea: longitud; rectángulo: ancho y largo; punto: coordenadas); con más de 120 elementos solo
  se rotula el seleccionado. Vista previa punteada con su cota mientras se dibuja.
- Rejilla dentro del lote; se omite (con aviso) si la separación en pantalla es < 4 px (el imán sigue activo).
- Zoom con la rueda 0.5×–10× centrado en el cursor (`zoomEnPunto`); pan con el botón central o **Espacio + arrastrar**. Selección con tolerancia
  de 9 px; el rectángulo se elige por el borde o, con menor prioridad, por el interior.
- Confirmación de cierre **dentro del overlay** (no `confirm()` del navegador): Guardar y cerrar / Descartar y cerrar / Seguir editando.

## 6. Aislamiento del 3D

- **Puntero y rueda:** el overlay es opaco y cubre el canvas; ningún evento de puntero ni de rueda llega a Babylon. La cámara no se toca.
- **Teclado — compuerta:** `window.addEventListener('keydown', …, true)` registrada **al evaluar el módulo**, antes de `init()`, por lo que corre antes que
  los oyentes de F2.2, F2.4c, F2.4d y `setupGizmos`. Solo actúa si `#plano-overlay.open`; entonces `stopImmediatePropagation()` y atiende sus teclas
  (V, P, L, B, R-aviso, Supr/Retroceso, Espacio, Esc). **Solo `keydown`**: `keyup` no se intercepta (no se atascan las flechas en `cameraKeys`). Con el
  editor cerrado no hace nada: `A`, `Shift+A`, `Ctrl+Z` y `R` siguen como antes (C1).
- `#plano-overlay.open` ya cuenta como modal para `enModal()` de F2.4c/F2.4d (`[id$="-overlay"].open`).
- En un campo de texto/número/lista solo se atienden `Enter` y `Esc` (quitan el foco); las letras no cambian de herramienta.
- El motor 3D sigue renderizando detrás del overlay (no se detiene); la escena no cambia.

## 7. Persistencia

`snapshotActual()` añade `progreso.plano` solo si hay plano guardado; `serializarEscena` ya recibe `progreso` completo, así que **`guardado.js` no se toca**
y el JSON v2 conserva exactamente sus claves (`v, objetos, contador, progreso, terreno, hitos`). El servidor no valida `progreso` y `combinarProgreso`
acepta claves nuevas, conserva las omitidas y reemplaza las enviadas. `restaurarProgreso` pasa `progreso.plano` por `sanearPlano` (tolerante a JSON
corrupto). «Guardar» (o «Guardar y cerrar») llama a `marcarSucio()`; el autoguardado hace el resto. La rejilla (visible, paso) es preferencia de vista: se
guarda junto con el plano si existe.

## 8. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/scripts/calculos.js` | Funciones puras y constantes de F4a (al final). |
| `src/scripts/casa.js` | Import, bloque del editor, compuerta de teclado, `configurarPlano()` en `init`, `snapshotActual`, `restaurarProgreso`, `Object.assign(window, …)` y gancho de solo lectura `__steamTest.plano` / `planoAPantalla`. |
| `src/sandbox.html` | Botón `#btnPlano` y `#plano-overlay`. |
| `src/Css/casa.css` | Bloque «F4a · Editor 2D del plano» al final. |
| `tests/calculos.test.js` | 16 pruebas nuevas (solo se añadieron; se amplió la lista de importaciones). |
| `tests/plano_editor.spec.js` | Nuevo (P1–P23). |
| `docs/F4a_cierre.md` | Este documento. |

Sin cambios (verificado byte a byte): `manipulacion.js`, `guardado.js`, `referencia.js`, `materiales.js`, `server/`, `database/`, `package.json`, golden files,
specs de fases anteriores y `docs/F0…F3_cierre.md`.

## 9. Diferencias técnicas respecto a F3

- F3 amplió un modal existente con cálculos; F4a añade una **superficie de interacción nueva** (overlay SVG con puntero, rueda y teclado propios).
- Primer uso de una **compuerta de teclado en captura registrada al cargar el módulo** (F3 no tocaba el teclado).
- Dato nuevo en `progreso` (`plano`) en lugar de ampliar `progreso.excavacion`; el servidor lo acepta sin cambios.
- Más lógica pura (17 funciones) y un saneador de entrada no confiable.

## 10. Pruebas

**Node** (`tests/calculos.test.js`, 16 nuevas): `distancia`, `normalizarRectangulo`, `ajustarARejilla` (incluye barrido de 2 404 valores sin ruido de coma
flotante ni −0), `formatearCota`, `limitarZoom`, `zoomEnPunto` (punto bajo el cursor invariante, límites, factor inválido), conversiones mundo↔pantalla,
`distanciaPuntoSegmento`, mover/cotas/selección, `sanearPlano` (basura, lote, rejilla, **JSON corrupto**, ids, **> 500 elementos**, idempotencia).

**Playwright** (`tests/plano_editor.spec.js`):

| Prueba | Cubre |
|---|---|
| P1 | Botón siempre visible; abrir/cerrar; z-index 60; modal para F2.4c/d (C4, C5 sin cambios) |
| P2 | Lote 10×10 con cotas «10.0 m»; editor vacío; lote editable y validación (C4) |
| P3 | Ejes X/Z con flechas, «0,0», norte arriba |
| P4 | Rejilla opcional, pasos 0.10/0.25/0.50/1.00, número de líneas, aviso si es demasiado densa |
| P5 | Zoom 0.5×–10× centrado en el cursor |
| P6 | Pan con botón central y Espacio + arrastrar; zoom/pan no se guardan |
| P7–P9 | Punto, línea (Esc cancela) y rectángulo (`B`, esquinas en cualquier orden) con cotas visibles |
| P10 | Imán solo con la rejilla visible (D4) |
| P11–P13 | Seleccionar y resaltar; mover (libre / imán); borrar con Supr, Retroceso y botón |
| P14 | Guardar → `progreso.plano` en el JSON v2 (claves intactas) y restauración al recargar |
| P15 | Casa sin `progreso.plano`: editor vacío y la clave no aparece hasta guardar (C4) |
| P16 | Cámara 3D quieta con flechas, `C`, rueda y arrastres izquierdo/central; vuelve a responder al cerrar |
| P17 | Con el editor abierto, `A`, `Shift+A`, `Ctrl+Z`, `Q/E/R/F/T/G/X` no actúan; sin telemetría |
| P18 | **C1**: con el editor cerrado `Shift+A` desapoya, `A` apoya, `Ctrl+Z` deshace y `R` rota en X |
| P19 | Atajos P/L/B/V; `R` no hace nada y muestra el aviso (D5); sin atajos al escribir en un campo |
| P20 | **C5**: `Esc` con cambios pide confirmación (guardar / descartar / seguir); sin cambios cierra directo |
| P21 | **C2**: contorno gris punteado, tooltip, no seleccionable/editable, no se guarda |
| P22 | **C3**: `progreso.plano` corrupto no rompe la carga; lote malo → 10×10; trunca a 500 |
| P23 | El elemento 501 se rechaza con aviso |

Durante la implementación P11 detectó un defecto real (el resaltado de la selección no se aplicaba por usar un atributo en lugar de la clase CSS); corregido.

## 11. Resultados (literales)

**Node** — `node --test tests/*.test.js`:

```
# tests 251
# pass 200
# fail 5          ← los 5 preexistentes de google_registro (ECONNREFUSED, sin base de datos)
# cancelled 0
# skipped 46      ← pruebas de PostgreSQL, se omiten sin base de datos
```
235 previas + 16 nuevas = 251. `tests/calculos.test.js`: 33/33 (17 previas + 16 de F4a). `tests/manipulacion.test.js`: 45/45.

**Playwright** (Chromium sin GPU, un worker):

| Suite | Resultado |
|---|---|
| `plano_editor.spec.js` (nuevo, P1–P23) | **23 passed** |
| `camara.spec.js` | **10 passed** |
| `terreno.spec.js` | **11 passed** |
| `apoyar.spec.js` | **9 passed** |
| `desapoyar.spec.js` | **13 passed** |
| `avisos_colocacion.spec.js` | **21 passed** |
| `nacimiento_piezas.spec.js` | **4 passed** |
| specs `00`–`12` | **46 passed, 2 failed** — `C-D` y `C-F` de `12_concreto_libre` (los dos preexistentes; sin regresiones nuevas) |

Incidencias durante la verificación (ya resueltas):

- La primera corrida completa de `camara.spec.js` falló en «rayos X»: el botón «Plano» en la barra superior ensanchó una barra que ya desbordaba a 1280 px y empujó «Rayos X» fuera de la pantalla. Se movió «Plano» a un botón flotante (§5) y `camara` pasó 10/10.
- P11 detectó que la selección no se resaltaba (atributo en lugar de clase); corregido.
- Una corrida de `plano_editor` se interrumpió porque el servidor de desarrollo de Vite se cayó (conexión rechazada) y T2 de `terreno` falló porque Vite recargó la página al guardar yo un archivo durante la prueba; ambas se repitieron completas y limpias con el código definitivo.
- Las suites `apoyar`, `desapoyar`, `avisos_colocacion` y `nacimiento_piezas` se ejecutaron dos veces (antes y después de mover el botón) con el mismo resultado.


## 12. Resolución de C1–C5

| Condición | Resolución |
|---|---|
| C1 | La compuerta solo actúa con el editor abierto. P18 verifica con el editor cerrado: `Shift+A` desapoya, `A` apoya, `Ctrl+Z` deshace y `R` rota; P17 verifica que con el editor abierto nada de eso ocurre. Regresión `apoyar` 9/9 y `desapoyar` 13/13. |
| C2 | P21: el contorno no es seleccionable (ni borde ni interior), no se arrastra, no se borra, no aparece en `elementos` ni en el JSON guardado; sin excavación activa no se dibuja (P2). |
| C3 | `sanearPlano` + pruebas Node de JSON corrupto y > 500; P22 lo comprueba cargando en el navegador sin errores de página. |
| C4 | P1/P2/P15: botón siempre habilitado y editor vacío con lote 10×10 sin `progreso.plano`. |
| C5 | P20: confirmación con cambios (Guardar y cerrar / Descartar y cerrar / Seguir editando; `Esc` dentro = seguir); sin cambios cierra directo; el botón Cerrar sigue la misma regla. |

## 13. Limitaciones y desviaciones

- **Coordenadas del punto con 2 decimales** («2.00, -3.00»), no 1: con rejilla de 0.25 m un decimal mostraría una coordenada falsa. Las cotas de longitud, ancho, largo y lote sí usan un decimal.
- **Botón «Plano» flotante** y no en la barra superior (ver §5): la barra tiene un desborde preexistente a 1280 px que no se corrige aquí.
- **Botón «Guardar» y confirmación propia en el overlay:** D6/C5 implican un guardado explícito; la confirmación no usa `confirm()` del navegador (bloquea la automatización y la extensión).
- **Lote editable en el editor** (1–100 m por lado; fuera de rango se rechaza con aviso), como se propuso en §3.3.
- **Los elementos pueden dibujarse fuera del lote** (no se recortan); el límite duro es ±1000 m.
- **La rejilla se guarda solo si ya existe un plano guardado** (si no, la preferencia dura la sesión).
- **Sin deshacer/rehacer** en el editor (`Ctrl+Z` queda inerte con el editor abierto). Sin multiselección ni edición numérica de elementos.
- **Gestos táctiles:** el dibujo funciona con punteros, pero no hay zoom ni pan con dos dedos.
- **Vista de maestro (`?alumno=`):** el editor abre en solo lectura (herramientas, guardar y lote deshabilitados). Esta ruta está implementada pero **no tiene prueba automatizada** (el ayudante `abrirSimulador` abre una URL fija y `helpers.js` no se podía modificar).
- Las pruebas añaden dos ganchos de solo lectura a `window.__steamTest` (`plano`, `planoAPantalla`), solo con `?steamTest=1`.
- La cámara 3D no se pausa: el motor sigue renderizando detrás del overlay.
- Pruebas P21–P23 van más allá de las P1–P20 pedidas (contorno, JSON corrupto en el navegador, límite de 500).

## 14. Nota sobre F4b (habitaciones)

F4b parte de los tres tipos de elemento ya persistidos. Puntos a decidir antes de implementarla: (1) qué es una habitación (rectángulo etiquetado, polígono cerrado de líneas, o ambos) y si se añade `tipo: 'habitacion'` o un campo `semantica` en `elementos`; (2) si se exige que quede dentro del lote (hoy no se recorta); (3) cálculo de área/perímetro con funciones puras en `calculos.js`; (4) deshacer/rehacer, que F4a no tiene; (5) la migración de `lote` a `terreno.lote` queda para F4d y requiere autorizar `guardado.js` y `server/routes/guardado.js`. **F4b no se inicia sin autorización explícita.**
