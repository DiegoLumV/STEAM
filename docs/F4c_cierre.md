# F4c — Vanos: puertas y ventanas (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «AUTORIZACIÓN F4c — Vanos (puertas y ventanas)» y «APROBACIÓN DE LA PROPUESTA TÉCNICA F4c» (decisiones D1–D8 + condiciones C1–C4).
Alcance: solo F4c. No se inicia F4d (integración con el 3D, paredes compartidas, deshacer).

## 1. Problema

F4b dejó habitaciones rectangulares con nombre. F4c añade a cada habitación **vanos**: **puertas** y **ventanas** colocadas sobre sus paredes,
con tamaño y posición editables. Son datos del plano 2D: **no generan nada en el 3D** (eso es F4d). Se guardan en `habitacion.vanos`.

## 2. Decisiones aprobadas

| # | Decisión |
|---|---|
| D1 | Origen del `offset`: extremo **oeste** en las paredes norte y sur (crece con +x); extremo **sur** en las paredes este y oeste (crece con +z). Diagrama en §4. |
| D2 | `sanearVanos(vanos)` valida solo la estructura (sin longitud de pared); `vanoCabeEnPared(vano, hab)` es una función aparte. Cada vano usa la longitud de su lado: norte/sur = `hab.ancho`, este/oeste = `hab.largo`. |
| D3 | Límites: ancho **0.1–100 m**, alto **0.1–10 m**, offset **0–100 m**. |
| D4 | `Esc` con D o N vuelve a V **conservando la selección**; un segundo `Esc` cierra el editor. Con H/P/L/B/V `Esc` se comporta como en F4a/F4b. |
| D5 | Tras crear un vano la herramienta sigue activa y el vano nuevo queda seleccionado. |
| D6 | Máximo **20 vanos por habitación** y **200 por plano**; al intentar superarlos se avisa y no se crea. |
| D7 | La plantilla «Reemplazar» avisa de los vanos que se perderían: «Ya hay habitaciones en el plano. ¿Qué hago con «[plantilla]»? (se borrarán también N vanos)» (solo si los hay). |
| D8 | Los vanos de paredes compartidas **no se sincronizan** (limitación documentada, §11). |
| Autoriz. | Un vano pertenece a su habitación (`habitacion.vanos`); puerta por defecto **0.80 × 2.10 m**, ventana **1.00 × 1.20 m**; sin deshacer; solo puerta y ventana. Borrar un vano no pide confirmación; borrar una habitación con vanos sí. |

## 3. Estructura de datos — `progreso.plano.habitaciones[].vanos` (campo aditivo)

```
habitaciones: [
  { id: 'h1', tipo: 'habitacion', x, z, ancho, largo, nombre,
    vanos: [ { id: 'v1', tipo: 'puerta' | 'ventana', lado: 'norte'|'sur'|'este'|'oeste', offset, ancho, alto } ] }
]
```

- **`vanos` solo existe si la habitación tiene al menos un vano.** Sin vanos la clave no se escribe (casas de F4a/F4b, y `Object.keys` de una habitación sin vanos idéntico a F4b).
- `plano.v` sigue en 1 (campo aditivo). El resto del guardado v2 (`objetos`, `terreno`, `hitos`, `progreso`) no cambia.
- Ids `v` + (mayor número usado en esa habitación + 1); sin contador guardado (un id puede reutilizarse tras borrar el último).
- Los avisos (`fuera`, `solapa`) y los segmentos se **calculan**, no se guardan.
- Al cargar, `sanearVanos` descarta lo que no es un vano válido (tipo/lado desconocidos, números no finitos o fuera de rango), elimina campos extra, reasigna ids repetidos o ausentes y trunca a 20; `sanearHabitaciones` aplica además el tope global de 200 (se conservan los primeros). Un vano que **no cabe** en su pared **no se descarta**: se conserva con aviso.

## 4. Orientación (C3)

```
                 NORTE  (pared de mayor z — ARRIBA en el editor)
                 offset crece →  (desde el extremo OESTE)
        z+ ↑   ┌──────────────────────────────┐
               │  ▭ vano norte                │
               │                              │
   OESTE       │                              │       ESTE
   offset      │          HABITACIÓN          │       offset
   crece ↑     │      x, z = esquina mínima   │       crece ↑
   (desde el   │                              │       (desde el
    extremo    │                              │        extremo
    SUR)       │                              │        SUR)
               └──────────────────────────────┘
        (x, z)           SUR  (pared de menor z)
                 offset crece →  (desde el extremo OESTE)
                                                          x+ →
```

| Lado | Extremo del vano (mundo) | Origen del offset | Crece con | Longitud de la pared |
|---|---|---|---|---|
| norte | z = `hab.z + largo`, x de `hab.x + offset` a `+ ancho` | oeste (`hab.x`) | +x | `hab.ancho` |
| sur | z = `hab.z`, x de `hab.x + offset` a `+ ancho` | oeste (`hab.x`) | +x | `hab.ancho` |
| este | x = `hab.x + ancho`, z de `hab.z + offset` a `+ ancho` | sur (`hab.z`) | +z | `hab.largo` |
| oeste | x = `hab.x`, z de `hab.z + offset` a `+ ancho` | sur (`hab.z`) | +z | `hab.largo` |

«Cabe en la pared» ⇔ `offset ≥ 0` y `offset + ancho ≤ longitud de su pared` (con tolerancia de 1 mm). Dos vanos **se solapan** si están en la misma pared y el tramo común tiene **longitud positiva** (tocarse en un punto no es solape).

## 5. Funciones puras (`src/scripts/calculos.js`)

Constantes: `VANO_MAX_POR_HAB`, `VANO_MAX_GLOBAL`, `VANO_ANCHO_MIN/MAX`, `VANO_ALTO_MIN/MAX`, `VANO_OFFSET_MAX`, `VANO_TIPOS`, `VANO_LADOS`, `VANO_DEFECTO`.

| Función | Contrato |
|---|---|
| `longitudPared(hab, lado)` | Longitud de la pared de ese lado (norte/sur = ancho, este/oeste = largo); 0 si no es válido. |
| `vanoCabeEnPared(vano, hab)` | `true` si el vano cabe entera en su pared (D2). |
| `vanosSeSolapan(v1, v2)` | Misma pared y tramo común de longitud positiva. |
| `siguienteIdVano(vanos)` | `v` + (máx + 1). |
| `sanearVanos(entrada)` | Nunca lanza excepción; solo estructura; reasigna ids; trunca a 20; idempotente; no muta la entrada. |
| `segmentoVano(hab, vano)` | `{x1, z1, x2, z2}` en metros del mundo (§4). |
| `posicionEnPared(hab, lado, x, z)` | Posición de un punto a lo largo de esa pared, medida desde su origen. |
| `paredMasCercana(hab, x, z, tol)` | `{lado, pos, distancia}` de la pared más cercana dentro de la tolerancia, o `null`. |
| `offsetParaVano(hab, lado, ancho, centro, paso)` / `vanoNuevo(hab, tipo, lado, centro, paso)` | Offset de un vano centrado en `centro`, con imán de rejilla al inicio y limitado a la pared; `null` si no cabe en ninguna posición. |
| `desplazarVano(hab, vano, delta, paso)` | Offset tras arrastrar `delta` m, limitado a [0, largo − ancho]. |
| `vanoEn(hab, x, z, tol)` / `vanoEnHabitaciones(habs, x, z, tol)` | Vano bajo el puntero (el más cercano). |
| `estadoVanos(hab)` | `{ [id]: { fuera, solapa: [ids] } }`. |
| `totalVanos(habs)` / `nombreVano(v)` | Recuento y nombre visible («Puerta v1», «Ventana v2»). |

## 6. Interfaz

- **Herramientas** (grupo «Vanos»): **Puerta `D`** y **Ventana `N`**. Con una habitación (o un vano de ella) seleccionada, un clic sobre una de sus paredes crea el vano centrado en ese punto (con imán de rejilla si está visible). Un fantasma discontinuo sigue al cursor sobre la pared. Sin habitación seleccionada, o con el clic lejos de las paredes, o si el vano no cabe, se avisa y no se crea nada.
- **Seleccionar** con `V`: los vanos tienen prioridad sobre los elementos de F4a y sobre las habitaciones al hacer clic; son excluyentes con la selección de habitación y de elemento. Selección = halo **celeste**.
- **Panel** (mismo panel flotante): tipo, ancho, alto, offset y lado; aviso rojo «Fuera de pared…» y ámbar «Se solapa con…»; botón «Borrar vano». Un valor inválido o que no cabe se ignora, se restaura el campo y se avisa.
- **Arrastrar** un vano con `V` cambia solo su offset a lo largo de la pared (con imán a la rejilla) y se detiene en los extremos.
- **Dibujo** (opción C: hueco + color): la pared de la habitación se recorta con una máscara SVG bajo cada vano y encima va el tramo de color: **puerta marrón**, **ventana azul claro**. Fuera de pared = contorno **rojo**; solape = contorno **ámbar** (el rojo gana al ámbar). Ninguno bloquea.
- **Borrar**: `Supr` sobre un vano lo borra sin confirmar (la habitación pierde la clave `vanos` si queda vacía). Borrar una **habitación con vanos** abre el diálogo «Esta habitación tiene N vano(s). ¿Borrar también?» con **Borrar / Cancelar** (`Esc` cancela; las demás teclas quedan inertes).
- **Mover / redimensionar la habitación**: los vanos se mueven con ella (mismo lado y offset). Al redimensionar, si algún vano ya no cabe **no se borra**: se marca en rojo y el panel de la habitación avisa («Un vano no cabe en su pared: …»).
- **Plantilla «Reemplazar»**: el texto añade «(se borrarán también N vanos)» solo si hay vanos (D7); «Añadir» los conserva.
- **Teclado**: `D` y `N` solo actúan con el editor abierto y fuera de los campos de texto; el resto de atajos 3D siguen sin llegar a la escena.
- `window.__steamTest.plano()` (solo lectura, solo con `?steamTest=1`) añade `seleccionVano`, la lista plana `vanos` (con segmento y avisos calculados) y `borrarPendiente`.

## 7. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/scripts/calculos.js` | Funciones y constantes de vanos (§5); `sanearHabitacion(es)` sanea `vanos` y aplica el tope global; solo se emite `vanos` si hay. |
| `src/scripts/casa.js` | Estado, render (máscara, segmentos, avisos, fantasma), herramientas D/N, selección, arrastre, panel, edición, borrado con confirmación, texto de la plantilla, teclas, gancho de pruebas. |
| `src/sandbox.html` | Grupo de herramientas «Vanos», sección de vano del panel, aviso de vanos de la habitación, diálogo de borrado. |
| `src/Css/casa.css` | Estilos de vanos, halo, avisos, fantasma, panel (con `max-height` y desplazamiento). |
| `tests/calculos.test.js` | +18 pruebas de las funciones de vanos (66 en total; las 48 anteriores no se tocaron). |
| `tests/plano_vanos.spec.js` | **Nuevo**: V1–V29 + C2 (30 pruebas). |
| `docs/F4c_cierre.md` | **Nuevo**: este documento. |

No se tocaron `manipulacion.js`, `guardado.js`, `referencia.js`, `materiales.js`, `server/`, `database/`, `package.json`, golden files, `tests/plano_editor.spec.js`, `tests/plano_habitaciones.spec.js` ni los cierres F0…F4b.

## 8. Límite de 100 KB del servidor

El cuerpo del `PUT` es `{proyecto_id, slot, estado, progreso}` y `estado.progreso` contiene también el progreso, así que **el plano viaja dos veces**. `express.json()` usa su límite por defecto (100 KB), que **no se modificó**.

Medidas (JSON compacto): un vano ≈ **80 B**; una habitación (sin vanos) ≈ **105 B**.

- Tope por habitación solo (20 × 50 habitaciones = 1000 vanos) ≈ 80 KB una vez, ≈ 160 KB duplicado → **superaría** el límite. Por eso existe el **tope global de 200 vanos**.
- Con los topes: 200 vanos ≈ **16 KB** (≈ 32 KB duplicado) + 50 habitaciones ≈ 5 KB (≈ 10 KB duplicado) → **≈ 42 KB** en el peor caso de F4c, más los elementos de F4a y el resto del progreso, que quedaron documentados en F4a/F4b. El margen sobre 100 KB se mantiene.
- Los topes se hacen cumplir al **crear** (aviso) y al **cargar** (`sanearHabitaciones`), de modo que un guardado manipulado tampoco los supera.

## 9. Pruebas

Entorno: sin GPU (≈1,5 FPS), 1 worker, API simulada. El ruido del WebSocket de recarga en caliente de Vite se filtra solo en el spec nuevo.

**Bloque rápido (Node)**

```
node --test tests/calculos.test.js          → tests 66 · pass 66 · fail 0   (48 anteriores sin cambios + 18 nuevas)
node --test tests/manipulacion.test.js      → tests 45 · pass 45 · fail 0
node --test tests/*.test.js                 → tests 284 · pass 233 · fail 5 · skipped 46
```

Antes de F4c: 266 pruebas, 215 ok, 5 fallos, 46 omitidas. Ahora +18 pruebas y +18 ok; los **5 fallos son los mismos preexistentes** de `google_registro` (necesitan PostgreSQL).

**Bloque nuevo**

```
tests/plano_vanos.spec.js   → V1–V29 + C2: 30 pruebas, 30 pasan
  (primera pasada: 29 ok y V2 con un error de cálculo en el propio test —clic en z = −1.5 da offset 0, no 0.5—; corregido el test y repetido: ok)
```

**Regresión (specs sin modificar)**

```
tests/plano_editor.spec.js          23 passed
tests/plano_habitaciones.spec.js    22 passed
tests/apoyar.spec.js                 9 passed
tests/desapoyar.spec.js             13 passed
tests/avisos_colocacion.spec.js     21 passed
tests/nacimiento_piezas.spec.js      4 passed
tests/camara.spec.js                10 passed
tests/terreno.spec.js               11 passed
tests/00…11 (specs 00–11)           41 passed
tests/12_concreto_libre.spec.js      7 passed · 2 failed (C-D y C-F, preexistentes desde antes de F4c) · C-J pasa aislado
```

Notas honestas sobre la ejecución: (1) una pasada con los specs 00–12 en conjunto falló además C-E, C-G, C-H, C-I y C-J con `ERR_CONNECTION_REFUSED` (el servidor de desarrollo local se cayó a mitad de ejecución, nada que ver con el código); repetido el spec 12 aislado, solo fallan C-D y C-F, igual que en F3/F4b; en otra repetición C-J volvió a fallar por el mismo motivo y pasó al ejecutarlo solo. (2) Una cadena de regresión mía se cortó por un `timeout` demasiado corto durante `desapoyar`; se repitieron `desapoyar`, `avisos`, `nacimiento`, `cámara` y `terreno` completos y pasan todos.

**C1 — verificada.** `plano_editor` 23/23 y `plano_habitaciones` 22/22 sin modificar los specs; las 48 pruebas anteriores de `calculos.test.js` siguen pasando sin cambios, incluidos el `toEqual` exacto de H15 y la comprobación de `Object.keys` (solo se emite `vanos` si hay).
**C2 — verificada** por la prueba `C2` (Esc con D, N, H, P, L, B, V).

## 10. Diferencias técnicas respecto a F4b

- `sanearHabitacion(es)` ahora trata `vanos`; la clave solo se emite si hay (el contrato de claves y el `toEqual` exacto de H15 no cambian).
- Nuevos estados del editor: `planoSelVano`, `planoArrastreVano`, `planoVanoPrev`, `planoBorrarPend`; la selección de vano es excluyente con las de habitación y elemento.
- Orden de impactos con `V`: handles de la habitación seleccionada → vanos → elementos de F4a → habitaciones.
- Dos herramientas nuevas (`puerta`, `ventana`) con atajos `D` y `N`; `Esc` con ellas vuelve a `V` (D4).
- El panel flotante ahora también se muestra con un vano seleccionado.
- `planoBorrarSeleccion` ramifica: vano (sin confirmar) / habitación con vanos (diálogo) / habitación sin vanos (como F4b) / elemento.
- Dibujo con máscara SVG por habitación con vanos (`mask="url(#hm-<id>)"`) y capa de vanos entre habitaciones y elementos.

## 11. Limitaciones y desviaciones

- **Paredes compartidas (C4/D8).** Dos habitaciones adosadas comparten un tramo de pared, pero cada una guarda sus propios vanos: una puerta puesta en la pared este de A **no** aparece en la pared oeste de B, y mover uno no mueve el otro. Es deliberado en F4c (los datos son independientes y sencillos). **En F4d**, al integrar el 3D, se resolverá detectando los tramos coincidentes entre habitaciones adosadas (misma línea y tramo común de longitud positiva): el vano se materializará **una sola vez** en la pared física y la interfaz podrá ofrecer crear/mover el vano en ambos lados a la vez. Hasta entonces el alumno debe colocar el vano en una sola de las dos habitaciones.
- **`vanoEn` recibe la habitación** (`vanoEn(hab, x, z, tol)`) en lugar de una lista de vanos suelta, porque necesita la geometría de la habitación para calcular el segmento; se añadió además `vanoEnHabitaciones` para buscar entre todas. Es la única desviación de la firma listada en la autorización.
- Sin deshacer; sin pasillos ni escaleras; ningún vano se refleja en el 3D.
- Los ids de vano se reutilizan si se borra el último de una habitación.
- Si un guardado trae más de 200 vanos, el exceso (por orden de habitación) se descarta al cargar.
- Los vanos que no caben se conservan con aviso en lugar de descartarse (así redimensionar una habitación no destruye datos).

## 12. Fases anteriores y guardado v2

F0, F1, F2.1, F2.2, F2.3, F2.4a–d, F3, F4a y F4b **no se modificaron**; sus pruebas se ejecutaron sin cambios (§9). El guardado v2 conserva la misma forma: la única novedad es `habitacion.vanos`, dentro de `progreso.plano.habitaciones`.

## 13. Nota sobre F4d (integración con el 3D)

F4d tendrá que: (1) convertir habitaciones + vanos en paredes con huecos en el 3D usando el origen/orientación de §4 (norte = mayor z); (2) resolver las **paredes compartidas** (§11); (3) decidir cómo se relacionan los vanos del plano con las puertas y ventanas ya colocadas a mano (`puertas_colocadas` / `ventanas_colocadas`); (4) valorar un deshacer. **No se inicia sin autorización explícita.**
