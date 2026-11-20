# F4d — Materialización del plano en 3D (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «AUTORIZACIÓN F4d — Materialización del plano en 3D» y «APROBACIÓN DE LA PROPUESTA TÉCNICA F4d» (P1–P7 + condiciones C1–C5).
Alcance: solo F4d. No se inicia F5 (techos, suelos, instalaciones, mobiliario).

## 1. Problema

F4a–F4c dejaron un plano 2D con habitaciones y vanos que **no generaba nada en el 3D**. F4d añade el botón **«Materializar plano»** del editor: convierte las
habitaciones en **paredes 3D con huecos reales** para las puertas y ventanas del plano, sin CSG. El 3D se genera solo cuando el alumno lo pide; cargar una casa
no materializa nada por su cuenta.

## 2. Decisiones aprobadas

| # | Decisión |
|---|---|
| D1 | Botón explícito **«Materializar plano»** en el editor (no automático). |
| D2 | **Paredes compartidas**: dos habitaciones adyacentes tienen **una sola** pared física entre ellas. |
| D3 | **Huecos reales** en las paredes 3D, **sin CSG**: geometría paramétrica (cajas alrededor de cada hueco). |
| D4 | Los **vanos del plano son la fuente de verdad** (las puertas y ventanas 3D sueltas del catálogo no intervienen). |
| D5 | Se puede seguir editando el plano; avisa de que el 3D se recalcula al **rematerializar**. |
| D6 | Sin deshacer en F4d. |
| P1 | Objeto **agregado** `paredes_plano` en `objList` + snapshot `progreso.plano.materializado` (no un objeto por pared: `serializarObjeto` no guarda `userData`). |
| P2 | `paredes_plano` no cuenta para Programar, no colisiona con las piezas, no es apoyo. |
| P3 | Altura **2.8 m**, grosor **0.15 m**, alféizar **1.0 m**: parámetros de `opciones`, sin interfaz. |
| P4 | Material gris claro **`#B0B0B0`**. |
| P5 | Salvaguarda: no se materializa si el guardado superaría **90 KB** (el servidor rechaza más de 100 KB); aviso si hay más de **1000 rectángulos**. |
| P6 | Base de las paredes en **y = 0**. |
| P7 | Las paredes generadas **bloquean la cámara**; **Rayos X las atraviesa**. |

## 3. Detección de paredes compartidas — `detectarParedesCompartidas(habitaciones)`

Cada habitación aporta 4 aristas. Se agrupan por línea (`z` fija para las horizontales, `x` fija para las verticales; coordenadas redondeadas al milímetro). En cada línea se
parte el eje en **todos** los extremos de arista y, por tramo, se calcula el conjunto de habitaciones que lo tienen. Un tramo contiguo con **el mismo conjunto** se funde
con el anterior. Resultado: `{ orientacion: 'h'|'v', x1, z1, x2, z2, habitaciones: [ids] }`. Una pared compartida lleva dos ids; donde cambia el conjunto (lados desiguales) la
pared se parte.

| Caso | Paredes |
|---|---|
| 1 habitación | 4 |
| 2 adosadas de lados **iguales** (4×3 + 4×3) — C3 | **7** (4 + 4 − 1 compartida) |
| 2 adosadas de lados **desiguales** (4×3 + 4×2) — C3 | **8** (la pared de 3 m queda en 2 m compartidos + 1 m propio de la habitación grande) |
| 2 sin contacto | 8 |
| 3 en línea | 10 |
| cuadrícula 2×2 | 12 |

Propiedad comprobada (40 casos aleatorios sin solape): longitud total = suma de perímetros − 2 × longitud compartida. Habitaciones **solapadas** no rompen: las paredes de una misma
línea no se solapan entre sí (un tramo puede tener más de dos habitaciones).

## 4. Generación de las paredes — `generarParedes3D(habitaciones, opciones)`

Cada pared (`p1…pN`, ordenadas: horizontales por `z`, luego verticales por `x`) lleva `longitud`, `altura` (2.8), `grosor` (0.15), `alfeizar` (1.0) y `huecos`. El grosor va
**centrado en la arista**.

**Esquinas sin solape de volumen** (para evitar z-fighting y paredes dobles): una pared **horizontal** se alarga `grosor/2` en los extremos de su cadena (donde no continúa otra
horizontal en la misma línea) y una **vertical** se acorta `grosor/2` en cada extremo donde toca una horizontal (`ini`/`fin`). En el borde de la unión de dos habitaciones
adosadas las horizontales colineales no se alargan. Propiedad comprobada (60 layouts aleatorios con vanos, sin solape de habitaciones): **ningún par de cajas se solapa en volumen**.

Material: un único `PBRMaterial` `paredes_plano`, `albedo #B0B0B0`, `roughness 0.85`, `metallic 0` (los materiales realistas son de F12). Las mallas reciben sombras y proyectan sombra.

## 5. Huecos — `generarParedConHuecos(pared)` (sin CSG)

Barrida por franjas: se corta la pared en todos los bordes de huecos; en cada franja lo **sólido** es el complemento de la unión de los huecos que la cubren; las franjas contiguas
con el mismo sólido se funden. Salida: rectángulos `{u0, u1, y0, y1}` (u = coordenada a lo largo de la pared desde su extremo mínimo). Una **puerta desde el suelo** da **3**
rectángulos (izquierda, derecha, dintel); una **ventana elevada**, **4** (izquierda, derecha, antepecho, dintel). Huecos solapados (aun a distinta altura) nunca generan rectángulos
inválidos (propiedad comprobada con 80 casos aleatorios: el área sólida coincide con pared − unión de huecos). Son **huecos puros**: sin marcos ni vidrios (F5/F12).

## 6. Conversión del vano 2D al 3D — `vanoA3D(vano, habitacion, pared)`

Usa `segmentoVano` de F4c (norte = mayor `z`; el offset crece con +x en norte/sur y con +z en este/oeste). La **puerta** va del suelo (`y0 = 0`) a su alto; la **ventana** va elevada
(`y0 = alféizar`, 1.0 m). El hueco se **recorta** a la pared y a su altura (`recortado = true`); si queda fuera de la pared devuelve `null` y el resumen lo cuenta como **«sin hueco»**.
En una **pared compartida** los vanos de las dos habitaciones se unen en la misma pared física (esto resuelve a nivel 3D la limitación D8 de F4c: no hay sincronización en 2D).

## 7. Ciclo materializar / desmaterializar / rematerializar

- **Materializar plano** (sin paredes previas): genera directamente. Resumen: «N paredes generadas, M vanos» (+ «· K vanos recortados por la pared» / «· K vanos fuera de las paredes (sin hueco)»).
  También **guarda el plano de trabajo** (`planoGuardarAhora`) para que el plano y su materialización queden coherentes en el guardado.
- **Rematerializar** (ya hay paredes): confirmación «Ya hay paredes materializadas. ¿Rematerializar? (se borrarán las generadas)» con la nota «Si rematerializas, las paredes generadas se regenerarán.
  Las piezas 3D manuales no se tocan, pero las que estén dentro de paredes generadas pueden quedar flotando.» Botones Rematerializar / Cancelar (Esc cancela sin cerrar el editor). Si la generación nueva falla, lo anterior queda como estaba.
- **Desmaterializar**: confirmación «Se borrarán N paredes generadas. Las piezas manuales no se tocan.» Borra el objeto agregado y `progreso.plano.materializado`.
- **Plano sin habitaciones o corrupto**: aviso («El plano no tiene habitaciones… No se generó ninguna pared») y no se genera nada. Un error al construir el 3D avisa y no deja nada a medias.
- **Aviso de edición**: al abrir el editor con paredes materializadas, una sola vez por sesión: «El plano tiene paredes materializadas en 3D. Si editas el plano, el 3D se recalculará al rematerializar.»
- **Objeto `paredes_plano`**: no se selecciona (ni en la lista ni con clic: las mallas no son «pickables», el clic atraviesa), no tiene botón de clonar, no se mueve/gira/borra pieza a pieza, no cuenta para Programar
  (`countWalls`/`validateHouse` intactos), no está en `COLLISION_TYPES`, `TIPOS_APOYO_AVISO` ni `TIPOS_SOPORTE_NACIMIENTO`, y no se encaja en la zona de construcción (el bucle por fotograma de `clampToZone` lo omite: de otro modo habría desplazado las paredes).
- **Vista de solo lectura del maestro (`?alumno=`)**: las paredes se regeneran, los botones están desactivados y no hay aviso de edición.

## 8. Guardado y compatibilidad (guardado v2 intacto, `guardado.js` sin tocar)

Único campo nuevo, **aditivo**: `progreso.plano.materializado`, snapshot compacto (solo existe si hay paredes):

```json
{ "v": 1, "altura": 2.8, "grosor": 0.15, "alfeizar": 1,
  "habitaciones": [["h1", -3, -2, 4, 3, [["puerta", "norte", 1.5, 0.8, 2.1]]], ["h2", 1, -2, 3, 3, []]] }
```

Cada habitación es `[id, x, z, ancho, largo, vanos]` y cada vano `[tipo, lado, offset, ancho, alto]` (sin nombres ni ids de vano). Las paredes y sus huecos **se regeneran** desde este snapshot al cargar.
El objeto agregado **no** va en `estado.objetos` (se excluye al serializar; el tipo desconocido se ignoraría al cargar). `sanearPlano` conserva un `materializado` válido (C1), no lo inventa si falta y lo descarta
si está corrupto. Una casa sin ese campo carga sin generar paredes. `snapshotActual` toma lo materializado de la variable de sesión `matSnapshot` (fuente de verdad).

## 9. Límite de 100 KB del servidor (medido)

El PUT es `{proyecto_id, slot, estado, progreso}` y `progreso` viaja **dos veces** (también dentro de `estado`), así que `materializado` se envía dos veces. Medido con el cuerpo real de la petición:

| Caso | PUT sin paredes | PUT con paredes | Incremento | Rectángulos | Mallas 3D | Materializar completo |
|---|---|---|---|---|---|---|
| 10 habitaciones, 30 vanos (31 paredes) | 7 294 B (7.1 KB) | 9 498 B (9.3 KB) | +2 204 B | 111 | 61 ms | 68 ms |
| 50 habitaciones, 150 vanos (115 paredes) | 33 574 B (32.8 KB) | 43 898 B (42.9 KB) | +10 324 B | 515 | 134 ms | 145 ms |

(`materializado` ocupa 5 145 B en el caso de 50 habitaciones.) Salvaguarda P5: antes de generar se simula el cuerpo del PUT; por encima de **90 KB** (92 160 B) no se materializa y se avisa
(«El plano con paredes ocuparía X KB al guardarse y el límite es 90 KB: no se materializó. Reduce habitaciones o vanos.»; lo guardado y el 3D quedan como estaban). Prueba P5: casa de 500 piezas + 600 elementos + 50 habitaciones/150 vanos → 111.7 KB estimados → rechazado.
Con más de 1000 rectángulos se avisa de que el 3D puede ir más lento (no bloquea). Los tiempos son de JavaScript en un navegador sin GPU; el simulador corre a ~1,5 FPS en este entorno.

## 10. Resolución de las condiciones C1–C5

| Cond. | Resolución |
|---|---|
| **C1** | `sanearPlano` conserva `materializado` válido, no lo crea si falta, lo descarta si es corrupto. Node (`sanearPlano` conserva / no inventa / descarta; idempotente; el resto del plano no cambia) y navegador (C1: el plano editado conserva lo materializado; C1b: sin campo no se genera nada ni se crea; M10; M23b). |
| **C2** | `Mesh.MergeMeshes` funciona con `checkCollisions`: cada pared sin huecos es 1 malla de 24 vértices (una con puerta, 72). Medido: una cámara a x = 4 «teletransportada» al interior cruzando la pared este (x = 1, cara exterior 1.075) queda en **x = 1.428** (= 1.075 + radio de colisión 0.35); con Rayos X atraviesa. **No hizo falta** la alternativa de `CreateBox` bajo un `TransformNode`. |
| **C3** | 2 adosadas de lados iguales → **7**; de lados desiguales (4×3 + 4×2) → **8** (§3). Probado en Node y en navegador (M2, C3). |
| **C4** | «Las paredes generadas no son apoyo para las piezas manuales. Una pieza colocada sobre una pared generada se clasifica según el suelo o la losa. Se resuelve en F5 si es necesario.» (M13: un bloque a 2.9 m sobre la corona de una pared generada se clasifica «flotante» y «Apoyar» propone bajarlo 2.9 m, hasta el suelo, no 0.1 m hasta la pared.) |
| **C5** | La cámara ve el interior desde arriba: con la beta mínima (0.18 rad) a 15 m, ninguna pared generada tapa el suelo del centro ni de las cuatro esquinas interiores de la sala; a ras de suelo desde fuera sí la tapan (medido: `pared_plano_1`). No hizo falta un modo transparente: la cámara orbita hasta casi cenital y existe Rayos X (§7). |

## 11. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/scripts/calculos.js` | +250 líneas: constantes `PARED_*`, `opcionesParedes`, `detectarParedesCompartidas`, `vanoA3D`, `generarParedes3D`, `generarParedConHuecos`, `contarRectangulos`, `resumirMaterializacion`, `sanearParedes`, `compactarMaterializado`, `expandirMaterializado`, `sanearMaterializado`; `sanearPlano` conserva `materializado`. |
| `src/scripts/casa.js` | Bloque «F4d · MATERIALIZACIÓN» (botones, diálogo, aviso, objeto agregado, restauración, límite de tamaño) y 7 líneas existentes ajustadas (§12). |
| `src/sandbox.html` | Botones `#plano-materializar` / `#plano-desmaterializar`, estado `#plano-mat-estado`, aviso `#plano-mat-aviso`, diálogo `#plano-mat-conf`. |
| `src/Css/casa.css` | Estilos del aviso, del estado y de la nota del diálogo. |
| `tests/calculos.test.js` | +36 pruebas Node de F4d (las 66 existentes, sin cambios). |
| `tests/plano_3d.spec.js` (nuevo) | 37 pruebas de navegador. |
| `docs/F4d_cierre.md` (nuevo) | Este documento. |

Sin tocar: `guardado.js`, `manipulacion.js`, `referencia.js`, `materiales.js`, specs y tests de F0–F4c, `server/`, `database/`, `package.json`, dorados, `docs/F0…F4c_cierre.md`.

## 12. Diferencias técnicas respecto a F4c

Las 7 líneas existentes de `casa.js` que cambian: `TIPOS_SOLIDOS_CAMARA` (ahora `[...COLLISION_TYPES, 'paredes_plano']`); el botón de clonar de la lista (sin él para `paredes_plano`); `planoSerial` (toma `matSnapshot`);
`snapshotActual` (parámetro opcional `simulado` para la salvaguarda; añade `materializado` y excluye el objeto agregado de `estado.objetos`); el bucle de `clampToZone` por fotograma (omite `paredes_plano`).
Además, ganchos de una línea en `selectObject`, `selectFromList`, `cloneObj`, `openPlanoEditor`, `planoCerrarYa`, `planoTecla`, `planoActualizarUI`, `configurarPlano`, `restaurarProgreso` y dos ganchos de solo lectura en `window.__steamTest`
(`materializacion()` y `lineaVisual()`, solo con `?steamTest=1`).

## 13. Pruebas

| Suite | Resultado |
|---|---|
| Node (`node --test tests/`) | **320 pruebas · 269 pasan · 5 fallan · 46 omitidas** (línea base F4c: 284 / 233 / 5 / 46; +36 nuevas, todas pasan). Los 5 fallos son los de `google_registro` (requieren PostgreSQL), preexistentes. |
| `tests/calculos.test.js` | 102/102 (66 existentes sin cambios + 36 de F4d) |
| `tests/manipulacion.test.js` | 45/45 |
| `tests/plano_3d.spec.js` (nuevo) | **37 passed** (M1–M24, C1, C1b, C2, C3, C5, P5, X1, X2 y las variantes M8b, M17b/c, M18b, M23b) |
| `tests/plano_editor.spec.js` | 23 passed |
| `tests/plano_habitaciones.spec.js` | 22 passed |
| `tests/plano_vanos.spec.js` | 30 passed |
| `tests/apoyar.spec.js` | 9 passed |
| `tests/desapoyar.spec.js` | 13 passed |
| `tests/avisos_colocacion.spec.js` | 21 passed |
| `tests/nacimiento_piezas.spec.js` | 4 passed |
| `tests/camara.spec.js` | 10 passed |
| `tests/terreno.spec.js` | 11 passed |
| specs `00`–`12` | **46 passed, 2 failed**: `C-D` y `C-F` de `12_concreto_libre` (los dos preexistentes desde F3; sin regresiones nuevas) |

Desglose de las specs `00`–`12`: `00` 1, `01` 10, `02` 6, `03` 1, `04` 1, `05` 6, `06` 2, `07` 2, `08` 2, `09` 3, `10` 2, `11` 2, `12` 8 pasan y 2 fallan (C-D, C-F: tiempo de espera de 120 s agotado en un `page.evaluate`, igual que en F3/F4a/F4b/F4c).

Notas sobre la ejecución: (1) el navegador de pruebas corre sin GPU a ~1,5 FPS, por lo que las suites con el simulador son lentas (`plano_3d` 51 min, `plano_vanos` 48 min). (2) Una cadena de regresión se cortó por un `timeout` mío demasiado corto durante `plano_vanos` (20/30 sin fallos); se repitió el spec entero y pasa 30/30. (3) El contenedor se reinició durante las specs `00`–`12`; las `00`–`07` ya habían terminado y las `08`–`12` se repitieron completas. En ningún caso se tocó código durante una ejecución.

## 14. Limitaciones y desviaciones

- **Techos, suelos, instalaciones y mobiliario**: F5 o posterior. **Marcos y vidrios** de puertas y ventanas: F5/F12 (los huecos son puros). **Materiales realistas**: F12.
- **Sin deshacer** (D6). Las paredes generadas **no se pueden editar a mano** (no se seleccionan): cualquier cambio se hace en el plano y se **rematerializa**; lo que se hiciera a mano sobre ellas no existe (no es posible) y la rematerialización las regenera enteras.
- **Piezas manuales dentro de las paredes**: no se tocan al materializar, rematerializar ni desmaterializar; pueden quedar flotando o atravesando una pared (el aviso del diálogo lo dice). C4: las paredes generadas no son apoyo.
- **Habitaciones solapadas**: las paredes de las dos pueden **solaparse en volumen** (z-fighting) donde se cruzan; el editor ya las marca en ámbar (F4b). Las esquinas sin solape se garantizan solo para layouts sin habitaciones solapadas.
- **Vanos de paredes compartidas**: se unen en una sola pared física, pero el editor 2D **no los sincroniza** (D8 de F4c); lo que se ve en 3D es la unión de los de ambas habitaciones.
- **Zona de construcción**: las paredes se generan donde dice el plano (el lote admite hasta 100 m); fuera de ±10 m quedan fuera de la zona de construcción editable y del terreno visible.
- **Parámetros** (altura, grosor, alféizar): fijos a 2.8 / 0.15 / 1.0 m, sin interfaz (P3). El snapshot ya los guarda, listos para una interfaz futura.
- **Materializar guarda el plano de trabajo** (el plano y las paredes se guardan juntos para que sean coherentes): no estaba escrito en la autorización; es la forma de que lo guardado nunca tenga paredes de un plano que no se guardó.
- Un `paredes_plano` consume un identificador de objeto por materialización (los ids no se reutilizan).
- Sin telemetría específica de materializar/desmaterializar.

## 15. Fases anteriores y guardado v2

F0–F4c no se tocaron. Ninguna prueba de F0–F4c se modificó. El formato del guardado v2 no cambia: solo el campo aditivo `progreso.plano.materializado` (M19: mismas claves en `estado` y `progreso`; el resto idéntico).

## 16. Nota sobre F5 (techos, suelos, instalaciones)

F5 puede apoyarse en `generarParedes3D` (cada pared conoce su orientación, medidas, habitaciones y huecos) y en el snapshot `materializado` para **suelos y techos por habitación**. Dos puntos a decidir entonces:
si las paredes generadas pasan a ser **apoyo** (C4), y si el grosor/altura se exponen en la interfaz. Esperar autorización explícita antes de F5.
