# F6a — Zanjas de cimentación (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «Queda aprobada» F6a con las decisiones **D1 = A, D2 = A, D3 = A, D4 = A, D5 = A**, y la instrucción de no escribir código antes de confirmar hashes y estado de guardado (se confirmaron antes de empezar).
Alcance: solo F6a (zanjas bajo las paredes del plano). Fuera: acero (F6b), cimbra (F6c), concreto y cadena (F6d). No se inicia F6b.

## 1. Qué hace

En el editor del plano, **🕳️ Excavar zanjas** abre en el terreno una zanja bajo **cada pared** del plano **guardado**, interiores y exteriores (D1 = A). Una pared compartida por dos habitaciones es **una sola zanja** y en las
esquinas y cruces las zanjas se funden en un solo hueco: nada se cuenta dos veces. El terreno tiene **huecos reales** (no es una textura ni una malla encima): el piso de la zanja está a la profundidad elegida, y las caras
laterales miran hacia el hueco.

El panel **«Zanjas de cimentación»** (dentro del editor del plano — D4 = A) permite elegir. Está **oculto por defecto**: se abre con el botón **⚙ Zanjas** de la barra y también se abre solo al excavar:

| Campo | Valor | Fuente |
|---|---|---|
| Pisos | 1 piso → zanja de **250 mm**; 2 pisos → **300 mm** (D3 = A). El ancho **no es libre**: sale de los pisos. | NSR-10 Tabla E.2.2-1 (mampostería), p. E-8 |
| Profundidad | **0.54 m** por defecto, editable (0.10–3.00 m; admite coma decimal) (D2 = A) | NSR-10 E.2.2.4 + E.6.2.2 (interpretación, §2) |
| Suelo | los suelos con factor banco→suelto del Anexo A.1 de `referencia.js` | existente, no se toca |
| A retirar | 0–100 % del volumen suelto, para los viajes de volqueta | existente (`calcularViajesVolqueta`) |

Resultados del panel: zanjas, longitud, área, ancho, profundidad, **volumen en banco**, volumen **suelto** y viajes. Los **avisos nunca bloquean** (§4). **Rellenar zanjas** (botón que aparece solo con zanjas) devuelve el terreno
a su estado anterior.

Ejemplos (con 1 piso y 0.54 m; son pruebas obligatorias):

| Plano | Zanjas | Longitud | Área | Banco | Suelto (×1.10) |
|---|---|---|---|---|---|
| 1 habitación 4×3 | **4** | 14 m | 3.5 m² | **1.890 m³** | **2.079 m³** |
| 2 habitaciones contiguas 4×3 | **7** | 25 m | 6.1875 m² | **3.341 m³** (no 3.78) | 3.675 m³ |
| 2 habitaciones **separadas** 4×3 | 8 | 28 m | 7.0 m² | 3.780 m³ | — |

La diferencia 3.78 → 3.341 es la pared compartida (una zanja en vez de dos) y el solape de las esquinas, contados una sola vez.

## 2. Fuente (verificada en los PDF)

NSR-10, Título E «Casas de uno y dos pisos». Se indica la página **impresa** y la del **PDF** (en este documento no coinciden: PDF = impresa + 6).

| Dato | Valor | Dónde | Pág. impresa / PDF |
|---|---|---|---|
| Ancho de la viga de cimentación, mampostería | **250 mm** (un piso), **300 mm** (dos pisos) | Tabla E.2.2-1 | E-8 / 14 |
| Altura de la viga (mampostería) | 200 mm / 300 mm — documentada para F6b, **no se usa** | Tabla E.2.2-1 | E-8 / 14 |
| Profundidad mínima del nivel inferior de la viga | **500 mm** bajo el nivel de acabado del primer piso | E.2.2.4 | E-9 / 15 |
| Mortero pobre de limpieza en el fondo de las zanjas | unos **40 mm** | E.6.2.2 | E-21 / 27 |
| Anillo con largo/ancho > 2 o dimensiones interiores > 4,0 m | hace falta viga intermedia (se **avisa**) | E.2.1.5 | E-8 / 14 |
| Juntas de la cimentación | a distancias no mayores de **30 m** (se **avisa**) | E.2.4.1 | E-10 / 16 |
| Relleno de concreto ciclópeo (estrato > 700 mm) | documentado para F6b, **no se usa** | E.2.2.4.2 | E-9 / 15 |

Apoyo (no fijan medidas; cuando discrepan **manda la NSR-10**): Yepes (2020), PDF p. 29: «la excavación deberá estar de 0,5 a 0,8 por debajo de la rasante»; PDF p. 30: «se hormigonará a sección de excavación completa […] si las
paredes son coherentes» (de ahí que la zanja tenga el ancho de la viga); Calavera (INTEMAC, 4.ª ed.), PDF p. 70: hormigón de limpieza de 100 mm (la NSR-10 pide ~40 mm de mortero; se usa la NSR-10).

**Interpretaciones declaradas (`es_interpretacion: true` en `referencia_cimentacion.js`):**

1. **Profundidad por defecto 0.54 m = 0.50 + 0.04.** La NSR-10 no dice si los 500 mm incluyen el mortero de limpieza; se toma el criterio conservador (viga a 0.50 m y 0.04 m de mortero debajo). Es **editable**; una profundidad
   menor que 0.50 m se acepta y avisa.
2. **«Dimensión interior» del anillo** (aviso de 4,0 m) = lado de la habitación − ancho de la viga.

**Límites propios del simulador (`es_estimacion: true`, no vienen de la fuente):** profundidad escrita entre 0.10 y 3.00 m; terreno visible de ±13 m y zona verde de ±10 m (geometría de la escena de F3). Los datos de referencia
son valores de la NSR-10 para casas de uno y dos pisos; **no es un diseño estructural validado** (el panel lo dice).

## 3. Modelo y geometría

`src/scripts/cimentacion.js` es **lógica pura** (sin DOM ni Babylon.js, sin estado global). Trabaja en **milímetros enteros** para que las uniones sean exactas.

1. **Una pared = un rectángulo** centrado en su eje, de ancho = ancho de zanja y **prolongado medio ancho en cada extremo** (así las esquinas quedan cubiertas). Las paredes salen de `detectarParedesCompartidas` (F4d, sin
   cambios): 1 habitación → 4 paredes; 2 contiguas → 7.
2. **Unión por compresión de coordenadas** (`unirRectangulos`): el resultado es un conjunto de rectángulos **disjuntos**; el área y el volumen son exactos y no hay doble conteo. Un oráculo independiente de malla de 25 mm
   (en `cimentacion.test.js`) confirma área y perímetro en 5 plantas (una habitación, dos contiguas, dos separadas, cuadrícula 2×2 y en T).
3. **Volumen = área de la unión × profundidad**, redondeado a milésimas de m³. Volumen suelto = banco × factor del suelo (A.1); viajes con `calcularViajesVolqueta` (existente).
4. **Con una fosa de F3** (D5): la fosa es un rectángulo centrado en el origen (ancho en x, largo en z). El terreno se modela como un mapa de alturas por celdas (tope = −D dentro de la fosa, 0 fuera) y de cada zanja
   solo cuenta el volumen **por debajo del tope**: una zanja más somera que la fosa y dentro de ella suma 0 m³ (ya es volumen de la fosa); una más honda suma solo lo que queda bajo el fondo de la fosa. **No hay doble
   conteo con F3** (prueba C23–C25, Z3).
5. **Terreno = complemento de (fosa ∪ zanjas)** dentro de ±13 m (suelo) y ±10 m (zona verde): rectángulos disjuntos fundidos en **una malla por capa** (`ground_seg_z`, `zone_seg_z`). Lo que sale de ±13 m se recorta en
   el 3D, pero **sí cuenta en el volumen** y se avisa.
6. **Zanja 3D** (`zanja_floor`, `zanja_wall`) bajo el nodo `zanjas_root`; reutiliza los materiales de la excavación de F3 (`MAT.excFloor`, `MAT.excWall`). Cada pared mira hacia el lado bajo (el hueco): las del borde
   exterior del anillo miran hacia el centro de la casa y las del borde interior, hacia afuera (prueba C31b). En Babylon.js (sistema zurdo) la cara frontal es la que cumple `cross(p1−p0, p2−p0)·n < 0`.

## 4. Estados y avisos

**Tres estados**, calculados **comparando la geometría** (x, z, ancho, largo) de las habitaciones del plano guardado con las del plano excavado (sin campo nuevo; ids, nombres, orden y vanos no cuentan):

| Estado | Texto | Qué pasa |
|---|---|---|
| `sin_zanjas` | «Sin zanjas» | no hay zanjas; terreno de F3 sin cambios |
| `vigente` | «Zanjas vigentes» | las zanjas coinciden con el plano guardado |
| `desactualizada` | «Zanjas desactualizadas. Vuelve a excavar.» | el plano cambió; las zanjas viejas siguen a la vista hasta volver a excavar |

**Avisos** (cada uno `{codigo, texto}`, con su cita; **no bloquean**; el volumen se calcula igual):

| Código | Cuándo | Cita |
|---|---|---|
| `prof_menor_min` | profundidad < 0.50 m | NSR-10 E.2.2.4, p. E-9 |
| `esbeltez` | largo/ancho de una habitación > 2 (exactamente 2 no avisa) | E.2.1.5, p. E-8 |
| `interior_mayor_4m` | lado − ancho de viga > 4,0 m | E.2.1.5, p. E-8 |
| `tramo_mayor_30` | tramo continuo de zanja > 30 m (incluye paredes colineales contiguas) | E.2.4.1, p. E-10 |
| `fuera_terreno` | alguna zanja sale de ±13 m | límite de la escena |
| `sin_replanteo` / `replanteo_desactualizado` | sugerencia respecto de F5 | — |

Una profundidad no numérica («abc») **no se aplica**: se restaura el valor anterior y el panel lo avisa. «Excavar» con cambios sin guardar en el plano **no hace nada** y avisa «Guarda el plano antes de excavar»; un plano
guardado sin habitaciones tampoco.

## 5. Superposición 3D — fuera de `objList`

- Las zanjas **no son piezas**: no entran en `objList`, no se seleccionan, no colisionan, no son apoyo, no entran en Programar ni en el panel de piezas (`resumenEscena().objetos` no cambia). `isPickable` y
  `checkCollisions` = false.
- **El panel no cubre el lienzo.** Oculto por defecto, ningún punto del lienzo del editor cae sobre él (Z17). Al abrirlo se superpone en la esquina inferior derecha, como el panel de replanteo (F5) lo hace en la superior izquierda.
- **Cámara, gizmo y selección 3D** siguen igual (Z8, Z9): excavar no mueve la cámara.
- **Vista del docente (`?alumno=`)**: se ven las zanjas y el panel; «Volver a excavar», «Rellenar» y los campos quedan **bloqueados** (Z7).
- Si algo falla al construir el 3D, `cimSuspender` desmonta lo dibujado, deja que F3 vuelva a mandar sobre el terreno, **conserva los datos y el guardado** y avisa en la consola («No se pudo dibujar las zanjas»). La casa sigue
  funcionando. (No hay un aviso visible en el panel para este caso: solo la consola.)

## 6. Guardado y compatibilidad

`progreso.cimentacion = { v: 1, zanjas: { h: [[id, x, z, ancho, largo], …], pisos, ancho, prof, suelo, retiro } }` — **mm enteros**, al **nivel de `progreso`**, igual que `progreso.replanteo`. Se guardan solo las
habitaciones y las opciones; **la geometría de las zanjas se regenera al cargar** (no se guardan vértices).

- **Aditivo.** La clave solo existe si hay zanjas. Las casas sin zanjas guardan exactamente las mismas claves que antes (Z1, Z16; `plano_3d` M19 exige el conjunto exacto de claves y sigue pasando).
- **Quitar zanjas.** El servidor (`combinarProgreso = {...existente, ...nuevo}`) **nunca borra claves**: si se rellenan las zanjas y la casa ya las tenía guardadas, el siguiente guardado envía `progreso.cimentacion = null`
  (borra la clave en el servidor); si nunca se guardaron, no se envía nada (Z14). `guardado.js` y `server/` no se tocan.
- **Compatible con casas sin cimentación** y con las de F0–F5 (la restauración ignora la ausencia de la clave).
- **`sanearCimentacion` nunca lanza.** Valida versión, forma, rango (±1000 m), ≤ 50 habitaciones, ids (`^h[1-9]\d{0,5}$`), opciones (inválidas → valores por defecto). **Si cualquier fila es inválida se descarta todo**
  (no se restaura media excavación) y la consola avisa «progreso.cimentacion no es válido: se ignora.» (Z5, C48–C51).

**Tamaño medido** (no supuesto):

| Caso | Por copia | En el PUT (×2: el progreso viaja dos veces) |
|---|---|---|
| Casa típica, 4 habitaciones | **189 B** | 378 B |
| **50 habitaciones** (caso obligatorio, Node C52) | **1599 B** (< 2 KB) | 3198 B |
| 50 habitaciones en el navegador (Z16) | 1589 B | PUT completo **12.8 KB** (límite del servidor ≈ 100 KB; salvaguarda de F4d 90 KB) |

Excavar 50 habitaciones tardó ≈ 7.5 s en mi entorno **sin GPU** (≈ 1.5 FPS); con GPU es mucho menos.

## 7. Ganchos en código existente (F0–F5)

Todo lo añadido a archivos existentes son **inserciones** (0 líneas borradas o cambiadas; `diff` contra los archivos de partida: `casa.js` **+374 −0**, `sandbox.html` **+31 −0**, `casa.css` **+126 −0**).

| # | Dónde (`casa.js`) | Qué |
|---|---|---|
| G1 | primera línea de `setGroundHole` (F3, **D5**) | `if (cimHayZanjas()) return cimRecomponerTerreno([xMin, xMax, zMin, zMax]);` |
| G2 | primera línea de `clearGroundHole` (F3, **D5**) | `if (cimHayZanjas()) return cimRecomponerTerreno(null);` |
| 3 | `matActualizarUI` | `cimActualizarUI();` (refresca estado y panel cuando cambia el plano guardado) |
| 4 | `snapshotActual` | `if (cimZ) progreso.cimentacion = serializarCimentacion(cimZ); else if (cimHabiaGuardado) progreso.cimentacion = null;` |
| 5 | `restaurarProgreso` | `cimLimpiar();` (reinicio, junto a `replanteoLimpiar()`) |
| 6 | `restaurarProgreso` | `restaurarCimentacion(progreso.cimentacion);` **después** de la restauración de la excavación de F3 |
| — | imports | 6 líneas (`cimentacion.js`, `referencia_cimentacion.js`) |

**Las dos guardas de F3 (D5).** Sin zanjas, `cimHayZanjas()` es falso y `setGroundHole` / `clearGroundHole` ejecutan **exactamente el código de F3** (la guarda es la primera línea y retorna solo si hay zanjas). Con zanjas,
las dos funciones delegan en `cimRecomponerTerreno`. Detalles de diseño:

- **Varios huecos por recomposición, no por llamadas acumuladas.** F3 solo sabe de **un** hueco rectangular. Con zanjas, el terreno se **recompone entero** como complemento de (fosa ∪ zanjas) (§3.5) y se registra en
  `groundHoleSegments`, para que `clearGroundHole` de F3 también lo elimine.
- **F3 no pasa la profundidad a `setGroundHole`.** La guarda sincroniza el terreno con el rectángulo recibido y, en un `queueMicrotask`, lee `excavacionData` (que F3 asigna al final) para completar la recomposición con la
  profundidad real.
- **`crearGeometriaExcavacion` llama primero a `eliminarGeometriaExcavacion(false)` → `clearGroundHole()`**; con zanjas eso dispara la recomposición sin fosa y luego la de la fosa nueva (Z3b lo verifica creando y quitando la
  fosa con zanjas ya excavadas).
- **Resultado:** con **fosa + zanjas** el terreno se abre en la unión; sin zanjas, F3 se comporta como siempre (Z15: cuatro `ground_seg_[nsew]`, ocho segmentos, piso visible, al quitarla vuelve el terreno original).
- **Prueba de seguridad de las guardas:** `02_techos_excavacion` (6/6) y `terreno` (11/11) pasan. Si cualquiera de las dos hubiera fallado, las guardas se revertían.

`window.__steamTest.cimentacion()` y `cimRayo(x, z)` (solo lectura, solo con `?steamTest=1`) se añaden **dentro** de `if (window.__steamTest)`, sin tocar el literal.

## 8. Archivos

| Ruta | Estado | Líneas |
|---|---|---|
| `src\scripts\referencia_cimentacion.js` | nuevo (constantes con su fuente) | 67 |
| `src\scripts\cimentacion.js` | nuevo (lógica pura, sin DOM ni Babylon) | 333 |
| `tests\cimentacion.test.js` | nuevo | 540 · **57 pruebas** |
| `tests\cimentacion.spec.js` | nuevo | 652 · **18 pruebas** (Z1–Z17 y Z3b) |
| `docs\F6a_cierre.md` | nuevo | este archivo |
| `src\scripts\casa.js` | modificado (solo adiciones) | **+374** (bloque F6a 321, getters de prueba 38, imports 6, 9 líneas de ganchos) |
| `src\sandbox.html` | modificado (solo adiciones) | +31 |
| `src\Css\casa.css` | modificado (solo adiciones) | +126 |

No se tocaron: `calculos.js`, `referencia.js`, `manipulacion.js`, `guardado.js`, `replanteo.js`, `server\`, `database\`, `package.json`, `helpers.js`, ninguna prueba existente, ni los docs F0–F5. **No se instaló ninguna
dependencia.**

## 9. Pruebas

Corrida completa, una suite tras otra, sobre el código final. **SHA-256 de `casa.js`, `sandbox.html`, `casa.css`, `cimentacion.js`, `referencia_cimentacion.js`, de las dos pruebas nuevas y de `calculos.js`, `referencia.js`,
`replanteo.js` y `manipulacion.js` idénticos al inicio y al final de la corrida** (los de `calculos.js`, `referencia.js`, `replanteo.js` y `manipulacion.js` son además los mismos de partida: no se tocaron).

| Suite | Resultado | Línea base | Duración |
|---|---|---|---|
| `node --test tests/calculos.test.js` | **102 / 102** | 102 | — |
| `node --test tests/manipulacion.test.js` | **45 / 45** | 45 | — |
| `node --test tests/replanteo.test.js` | **46 / 46** | 46 | — |
| `node --test tests/cimentacion.test.js` | **57 / 57** (nuevo) | — | — |
| `tests/terreno.spec.js` (**crítica**: guardas de F3) | **11 / 11** | 11 | 7.6 min |
| `tests/02_techos_excavacion.spec.js` (**crítica**: guardas de F3) | **6 / 6** | 6 | 3.6 min |
| specs 00, 01, 03, 04, 12 | **23 / 23** (con `02`: **29 / 29** = «specs 00–12») | 29 | 13.1 min |
| `tests/plano_editor.spec.js` | **23 / 23** | 23 | 16.4 min |
| `tests/plano_3d.spec.js` (incluye M19, claves exactas de `progreso`) | **37 / 37** | 37 | 19.3 min |
| `tests/plano_habitaciones.spec.js` | **22 / 22** | 22 | 19.0 min |
| `tests/plano_vanos.spec.js` | **30 / 30** | 30 | 20.0 min |
| `tests/replanteo.spec.js` (F5) | **15 / 15** | 15 | 8.6 min |
| `tests/cimentacion.spec.js` | **18 / 18** (nuevo) | — | 12.7 min |

Suites de navegador con `--timeout=180000` (mi entorno no tiene GPU, ver §10). También pasan `techos.test.js` (6 / 6) y `proyectos.test.js` (6 / 6) de mi copia.

**Historial de la corrida (para que se vea qué pasó).** La **primera** corrida completa dio `plano_editor` **22 / 23**: falló **P6**, y era una regresión real de F6a (el panel cerrado cubría el lienzo; §10, desviación 4). Se corrigió, se
añadió Z17 y se **repitió toda la regresión desde cero** (la corrida de la tabla). Los fallos de esa primera corrida no están en la tabla.

### Pruebas obligatorias → dónde están

| Obligatoria | Prueba |
|---|---|
| 1 habitación 4×3 → 4 zanjas, 1.89 m³ banco, 2.079 m³ suelto | C14 (Node), Z1 / Z2 |
| 2 contiguas → 7 zanjas, 3.341 m³ (no 3.78) | C15 (Node), Z2 |
| Profundidad 0.54 por defecto y editable | C06, C07, C10, C17, Z11 |
| Ancho 250 / 300 mm | C01, C05, C08, C16, Z11 |
| Avisos (no bloquean) | C37–C44, Z11, Z12 |
| `sanearCimentacion` descarta lo inválido | C48–C51 |
| Snapshot de 50 habitaciones < 2 KB | C52 (1599 B), Z16 (1589 B) |
| Materializar → excavar → huecos reales | Z2 |
| Coexistencia con la fosa de F3, sin doble conteo | C23–C25, Z3, Z3b, Z15 |
| Guardar → recargar | Z4 |
| JSON corrupto descartado | Z5 |
| Estado «desactualizada» | Z6 |
| Vista del docente `?alumno=` bloqueada | Z7 |
| `objList` sin cambios | Z8 |
| Cámara, gizmo y selección 3D | Z9 |
| F5 sigue funcionando | Z10, `replanteo.spec` 15 / 15 |
| El panel no cubre el lienzo | Z17 |

Comandos (desde la raíz del proyecto, una suite a la vez):

```
node --test tests/calculos.test.js
node --test tests/manipulacion.test.js
node --test tests/replanteo.test.js
node --test tests/cimentacion.test.js
npx playwright test tests/terreno.spec.js
npx playwright test tests/02_techos_excavacion.spec.js
npx playwright test tests/00_humo.spec.js tests/01_restauracion.spec.js tests/03_calculos_ui.spec.js tests/04_dimension_cubierta.spec.js tests/12_concreto_libre.spec.js
npx playwright test tests/plano_editor.spec.js
npx playwright test tests/plano_3d.spec.js
npx playwright test tests/plano_habitaciones.spec.js
npx playwright test tests/plano_vanos.spec.js
npx playwright test tests/replanteo.spec.js
npx playwright test tests/cimentacion.spec.js
```

**Lo que NO corrí.** Las 11 suites de tu repo que no están en mi copia (`05_construccion_libre`, `06_etiquetas_paredes`, `07_etiquetas_puertas_ventanas`, `08_materiales_techo`, `09_catalogo_html`, `10_etiqueta_losa`,
`11_etiqueta_vitropiso`, `apoyar`, `avisos_colocacion`, `camara`, `desapoyar`: 72 de las 83 pruebas de tu línea base; `terreno`, las otras 11, sí la corrí). **Corre esas 11 suites en tu equipo antes de dar F6a por cerrada.**
Tampoco corren en mi copia (por faltar `server/routes/cuestionario.js`, `server/routes/guardado.js` y el paquete `jsonwebtoken`, no por F6a): `casas_referencia` (1/12), `entrega` (0/6), `integracion` (3/5) y
`google_registro` (0/1). `integracion` da **idéntico** (3 pasan, las mismas 2 fallan) con el `casa.js` anterior a F6a.

## 10. Limitaciones y desviaciones

### Desviaciones respecto de lo aprobado

1. **`casa.js` +374, no ≈ +270.** El exceso es comentario explicativo y el getter de pruebas (38 líneas); el bloque F6a es de 321 líneas.
2. **Botón extra «Rellenar zanjas»** (no estaba en la lista de entregables): sin él no hay forma de deshacer la excavación. Como el servidor nunca borra claves, rellenar implica el `null` explicado en §6.
3. **El panel se actualiza al pasar el puntero / enfocar / abrir** (`pointerenter`, `focusin`, `toggle`) además de al guardar el plano. F5 no llama a `cimActualizarUI` cuando cambia el replanteo; en vez de tocar F5, el panel
   se refresca al interactuar con él (así los avisos `sin_replanteo` / `replanteo_desactualizado` no quedan viejos).
4. **Panel oculto por defecto con botón «⚙ Zanjas» en la barra** (D4 = A: el panel sigue dentro del editor). Primera versión: panel siempre presente, cerrado, en la esquina inferior derecha del lienzo. Al correr la regresión
   `plano_editor` **P6** (pan con Espacio + arrastrar) falló 1/23 porque ese panel, aun cerrado (330 × 32 px), cubría el punto (984, 658) donde la prueba empieza el arrastre: era una **regresión real de F6a**, no un atasco del
   entorno. Se corrigió ocultando el panel hasta que se pide (o se excava) y se añadió **Z17** para que no vuelva a taparse el lienzo. Se repitió toda la regresión sobre el código final.
5. **Cita corregida durante el cierre.** La nota de `ANCHO_VIGA_1P` atribuía a la p. 29 de Yepes la frase «se hormigonará a sección de excavación completa»; está en la **p. 30**. Corregido solo en el texto de la nota
   (sin cambio de lógica).

### Limitaciones

- **Con una fosa de F3 más somera que alguna zanja, el piso sólido de F3 (`exc_floor`) se oculta** y se dibuja uno propio con las zanjas recortadas, para que el fondo de la zanja se vea bajo el de la fosa. Cuando se quitan las zanjas, `exc_floor` vuelve.
- **Las líneas de la rejilla de F3 (`exc_floor_grid`, `exc_ribbon`) siguen cruzando la abertura de las zanjas más hondas que la fosa** (son decorativas y de F3, que no se toca). Es solo estético.
- **Zanjas fuera de ±13 m:** en el 3D se recortan al terreno visible, pero **sí cuentan en el volumen** y se avisa.
- **Solo habitaciones rectangulares alineadas con los ejes** (las del editor). Una zanja por pared; sin viga intermedia (se avisa), sin acero, cimbra, concreto ni cadena (F6b–F6d).
- **Hay que guardar el plano antes de excavar** (las zanjas trabajan sobre el plano guardado).
- **Máximo 50 habitaciones** (el límite de F4d); más se descartan al cargar.
- **Los avisos de la NSR-10 son informativos**, no un diseño estructural validado. El terreno y la profundidad son los del simulador.
- **Sin telemetría.** F6a no envía nada nuevo al servidor salvo `progreso.cimentacion` por el guardado existente.
- **Rendimiento medido sin GPU:** excavar 50 habitaciones ≈ 7.5 s hasta ver el terreno (Z16). Con GPU es mucho menos.
- **Entorno de pruebas de Claude (no del proyecto).** Mi entorno no tiene GPU, por eso las suites de navegador se corrieron con `--timeout=180000` y una a la vez (2 CPU). Además, en mi copia faltan `server/routes/cuestionario.js`,
  `server/routes/guardado.js` y el paquete `jsonwebtoken`, por lo que fallan allí `casas_referencia` (1/12), `entrega` (0/6), `integracion` (3/5: `URLSearchParams is not defined`, `vistaAlumnoId is not defined`) y `google_registro` (0/1). **Fallan igual con el `casa.js` anterior a F6a**
  (comprobado en `integracion`: mismas 3 pasan y mismas 2 fallan), así que no son regresión de F6a; no estaban en la lista de regresión aprobada.
- **11 de las «12 suites adicionales (83 pruebas)» de tu línea base no están en mi copia** y **no las corrí** (72 pruebas; `terreno`, 11, sí). Conviene correrlas en tu equipo antes de dar F6a por cerrada (§9).

## 11. Nota sobre D3

`progreso.cimentacion` viaja por `/api/guardado`, igual que el resto del progreso. No hay guardado local; D3 (localStorage) fue cancelado. La cimentación se persiste con el formato v2 actual, sin cambios en `guardado.js` ni en `server\`.
