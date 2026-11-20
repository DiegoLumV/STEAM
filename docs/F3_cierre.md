# F3 — Terreno y tipo de suelo (cierre)

Proyecto: `C:\Users\Pytho\OneDrive\Desktop\STEAM-main`
Autorización: «AUTORIZACIÓN F3 — Terreno y tipo de suelo» y «APROBACIÓN DE LA PROPUESTA TÉCNICA F3» (7 decisiones + condiciones C1–C5).
Alcance: solo F3. No se inicia ninguna fase posterior.

## 1. Problema original

La excavación calculaba únicamente el volumen **en banco** (L × A × P). No había tipo de suelo, ni volumen suelto, ni número de viajes de
volqueta. F3 amplía el modal existente para elegir el suelo (A.1), el porcentaje a retirar y ver banco → suelto → a retirar → viajes, con la
fuente de cada dato. No reescribe la excavación: la geometría, los límites y el montículo quedan como estaban.

## 2. Decisiones del usuario

| # | Decisión |
|---|---|
| F | Siguiente fase: **A — F3** (terreno y tipo de suelo). F2.4d cerrada con la limitación C2 documentada, sin patch. |
| 1 | `A1_FACTORES_SUELO` tiene **11 filas: 9 con factor + 2 sin factor** (la autorización original decía «11 + 2»). T1 verifica 11 / 9 / 2. |
| 2 | Suelo por defecto: **`tierra_vegetal`** (casas nuevas y casas viejas sin `tipo_suelo`). |
| 3 | Ejemplo 1.2: Node con los datos exactos (0,30 × 0,40 × 68) y Playwright con la geometría equivalente 17 × 0,60 × 0,80 = 8,16 m³ (el largo de 68 m supera el límite de 18 m). |
| 4 | Ejercicios 1.1–1.6: datos de prueba en `tests/calculos.test.js`, no en `referencia.js`. |
| 5 | Ejemplo 1.3 (lleno) y ejercicio 1.6: **no los cubre F3**; pendientes para F5/F6. |
| 6 | Guardado al confirmar «Iniciar / Actualizar Excavación»; cerrar sin confirmar descarta. |
| 7 | Telemetría: ampliar el contexto de `excavacion_realizada`; sin eventos nuevos. |

## 3. Ubicación del selector, el slider y el panel

Todo dentro del modal de excavación (`#excavacion-modal` → `#exc-panel`), en una tarjeta nueva `#exc-suelo-card` entre los campos de
dimensiones y la vista previa:

- **Selector** `#exc-suelo`: 11 opciones llenadas por JS desde `A1_FACTORES_SUELO` (única fuente). Las 9 con factor muestran «Nombre — ×1.10»;
  las 2 sin factor (`afirmado_bases_vias`, `material_sucio_rio_subbases`) salen deshabilitadas con el tooltip «Sin factor de conversión
  banco→suelto; no aplica a excavación». Tooltip del selector: «Factor de conversión banco→suelto: Manual de Materiales, Tabla 1.1».
- **Slider** `#exc-retiro-range`: 0–100 %, paso 1 %, por defecto 100 %; el valor se ve en `#exc-retiro-val`. Tooltip: «Porcentaje del material
  suelto que se retira en volqueta. Ejemplo 1.2 del Manual de Materiales usa 70%.»
- **Panel** `#exc-resultados`: cadena «X m³ (banco) → Y m³ (suelto) → Z viajes de 5 m³» y cuatro filas (banco, suelto con su factor, a retirar con
  su %, viajes «N viajes (D sin redondear)»). Nota de fuente («Manual de Materiales, Tabla 1.1 (p. 4): factores de conversión
  banco→suelto. Capacidad de la volqueta: Manual de Materiales, Ejemplo 1.1») también como tooltip, y la nota «El redondeo de viajes hacia arriba
  es criterio educativo de operación, no una regla matemática.» Con medidas inválidas el panel se oculta.
- Reactivo: cambiar suelo, % o medidas recalcula en vivo (`excActualizarVista`), sin reabrir el modal.
- Los ids y textos existentes (`#exc-stat-area`, `#exc-stat-vol`, `#exc-stat-dims`) no cambian (los usa el dorado de `03_calculos_ui`).

## 4. Funciones puras añadidas a `calculos.js`

`calculos.js` pasa a tener un único `import`: `A1_FACTORES_SUELO` y `PARAMETROS` de `referencia.js` (solo lectura).

| Función | Firma | Fórmula / fuente |
|---|---|---|
| `factorBancoSuelto` | `(tipoSuelo) → number \| null` | `A1_FACTORES_SUELO.filas[tipo].factor_banco_suelto.valor`; `null` si el tipo no existe, no es propio del objeto (`__proto__`, `constructor`…) o la fuente no da factor. |
| `volumenSuelto` | `(volumenBanco, tipoSuelo) → number \| null` | `banco × factor`, redondeado a milésimas (como `calcularExcavacion`). `null` si el volumen no es finito ≥ 0 o el suelo no tiene factor. |
| `viajesVolqueta` | `(volumenSuelto, capacidad = PARAMETROS.volqueta_m3.valor, porcentajeRetiro = 1) → { aRetirar, viajesSinRedondear, viajes } \| null` | `aRetirar = suelto × %` (milésimas, para mostrar); `viajesSinRedondear = aRetirar / capacidad` sin ruido de coma flotante; `viajes = Math.ceil(viajesSinRedondear)`. `null` si algún dato es inválido (capacidad ≤ 0, % fuera de 0–1…). |
| `SUELO_POR_DEFECTO`, `PORCENTAJE_RETIRO_POR_DEFECTO` | constantes | `'tierra_vegetal'` y `1`. |

La capacidad (5 m³) no está escrita en el código: sale de `PARAMETROS.volqueta_m3`. El `Math.ceil` está marcado como «criterio educativo de
operación» en el código (comentario de `viajesVolqueta`) y en la interfaz (nota visible).

## 5. Persistencia

- `excavacionData` suma `tipo_suelo` (string con el id) y `porcentaje_retiro` (número 0–1). `snapshotActual` los copia a `progreso.excavacion` y
  `guardado.js` (sin cambios) los copia a `estado.terreno.excavacion`. JSON v2: **aditivo**, sin migración; solo se guardan datos, no resultados
  (`volumen_suelto` y `viajes` no se guardan).
- El servidor (`validarTerreno`) solo valida `largo`, `ancho`, `profundidad`, `volumen` y `activa`, y no rechaza claves extra: no se toca.
  Como tampoco valida los campos nuevos, **el cliente los sanea al cargar**: tipo desconocido, sin factor, no-texto, `__proto__` → `tierra_vegetal`;
  porcentaje ausente, texto, NaN o fuera de 0–1 → 100 %.
- Una casa guardada sin estos campos (p. ej. `excavacion_con_casa`) carga con `tierra_vegetal` y 100 % y calcula normalmente.
- Guardado al confirmar: el modal guarda lo elegido solo con «Iniciar / Actualizar Excavación». Al abrir el modal el selector y el slider parten
  de lo guardado (o de los valores por defecto), por lo que cerrar sin confirmar descarta lo cambiado. «Rellenar / Eliminar» borra la excavación
  completa (y con ella el tipo y el %).
- Telemetría: `excavacion_realizada` añade `tipo_suelo`, `porcentaje_retiro`, `volumen_suelto` y `viajes` a su contexto. No hay eventos nuevos
  (cambiar el selector o el slider no registra nada).

## 6. Reproducción de los ejemplos y ejercicios del Manual (Node, `tests/calculos.test.js`)

El «suelto» y los viajes del Manual se calculan sobre el volumen a retirar; en el sistema `viajes = Math.ceil(sin redondear)`.

| Caso | Datos | Banco | Suelto | A retirar | Sin redondear | Viajes |
|---|---|---|---|---|---|---|
| Ejemplo 1.1 | 6 × 12 × 0,80, tierra vegetal, 100 % | 57,60 | 63,36 | 63,36 | 12,672 | **13** |
| Ejemplo 1.2 | 0,30 × 0,40 × 68,0, arcilla compacta, 70 % | 8,16 | 13,056 → 13,06 | 9,139 → 9,14 | 1,828 | **2** |
| Ejercicio 1.1 | 7,0 × 14,0 × 0,40, tierra vegetal | 39,20 | 43,12 | 43,12 | 8,624 | **9** |
| Ejercicio 1.2 | 0,40 × 0,70 × 85,0, arcilla compacta, 100 % | 23,80 | 38,08 | 38,08 | 7,616 | **8** |
| Ejercicio 1.3 | 0,30 × 0,50 × 78,0, arcilla compacta, 75 % | 11,70 | 18,72 | 14,04 | 2,808 | **3** |
| Ejercicio 1.4 | 0,30 × 0,60 × 120,0, sueltos sin cohesión, 90 % | 21,60 | 23,76 | 21,384 | 4,2768 | **5** |
| Ejercicio 1.5 (C4) | 20 zapatas de 1,40 × 1,40 × 1,80, arcilla compacta, 40 % | 70,56 | 112,896 | 45,158 | 9,03168 | **10** |
| Ejercicio 1.6 | 8,60 × 14,50 × 1,50 (lleno) | — | — | — | — | no aplica a F3 |

Observaciones sobre los datos recibidos (no cambian ningún resultado):
- En los ejercicios 1.3 y 1.4 el valor que la tabla de la aprobación llama «suelto» (14,04 y 21,38) es en realidad el volumen **a retirar**
  (suelto × %): 18,72 × 0,75 y 23,76 × 0,90. La prueba compara «a retirar».
- En el ejercicio 1.4 la fuente da 4,276 sin redondear; el cálculo exacto es 4,2768 (4,276 es truncado). Ambos dan 5 viajes.
- Los ejercicios 1.2, 1.3 y 1.4 (largo > 18 m) y el 1.5 (20 fosas) solo se prueban en Node.

En Playwright (interfaz): ejemplo 1.1 con 12 × 6 × 0,80 (57,60 / 63,36 / 13 viajes con «12.67 sin redondear») y ejemplo 1.2 con la geometría
equivalente 17 × 0,60 × 0,80 = 8,16 m³ (8,16 / 13,06 / 9,14 / 2 viajes). **Por qué no se usan 68 m en la interfaz:** el largo máximo de la fosa
es 18 m y ese límite no se cambia; con 68 m la herramienta muestra el error de límite y esconde el panel (T6 lo comprueba).

## 7. Resolución de las condiciones de la aprobación

- **C1 — redondeo a 1e-9 antes de `Math.ceil`.** En coma flotante `50 × 1.10 / 5 = 11.000000000000002`, y `Math.ceil` daría 12 viajes en vez de
  11. `viajesVolqueta` calcula `Math.round((aRetirar / capacidad) × 1e9) / 1e9` antes del `Math.ceil`. Prueba específica en `calculos.test.js`
  («F3 C1 punto flotante»): muestra la trampa (`Math.ceil(50 * 1.1 / 5) === 12`), el resultado correcto (11) y un barrido de 200 múltiplos
  exactos × 6 factores. Comprobado por mutación: sin el redondeo, la prueba falla.
- **C2 — los ejercicios son datos de prueba**, solo en `tests/calculos.test.js`; `referencia.js` no se modificó (comparado byte a byte).
- **C3 — T1:** 11 opciones, 9 habilitadas, 2 deshabilitadas (con tooltip).
- **C4 — ejercicio 1.5:** 9,03168 sin redondear → **10 viajes** (verificado en Node).
- **C5 — geometría intacta:** fosa, taludes, estacas, cinta, mira y montículo no cambian. El montículo sigue dimensionado con el volumen en banco.
  T16 comprueba que las mallas de la excavación son idénticas con cualquier suelo y %, y que el límite 18 × 18 × 5 m sigue igual.

### Correspondencia T1–T13 → prueba (`tests/terreno.spec.js`)

| Caso | Prueba |
|---|---|
| T1 selector visible con 11 opciones (9 + 2 deshabilitadas) | T1 |
| T2 cambiar el tipo recalcula suelto y viajes · T3 slider al 100 % · T4 slider al 70 % | T2 T3 T4 |
| T5 tierra vegetal 6 × 12 × 0,80 → 57,60 / 63,36 / 13 | T5 |
| T6 arcilla compacta + 70 % (geometría equivalente) → 8,16 / 13,06 / 9,14 / 2 | T6 |
| T7 guardar → recargar conserva tipo, % y cálculos · T13 JSON v2 con los campos nuevos, aditivo | T7 T13 |
| T8 casa sin `tipo_suelo` (y con valores inválidos) → valor por defecto, no rompe | T8 |
| T9 tooltip de fuente · T10 nota de redondeo educativo | T9 T10 |
| T11 la cámara no se mueve · T12 el gizmo sigue funcionando | T11 T12 |
| Extra: cerrar sin confirmar descarta (decisión 6) | T14 |
| Extra: telemetría ampliada, sin eventos nuevos (decisión 7) | T15 |
| Extra: geometría independiente del suelo (C5) y límites | T16 |

## 8. Resultados literales de pruebas

Ejecuciones secuenciales, un worker, Chromium sin GPU (~1,5 FPS).

```
node --test tests/manipulacion.test.js     → # tests 45 / # pass 45 / # fail 0
node --test tests/calculos.test.js         → # tests 17 / # pass 17 / # fail 0   (9 previas + 8 de F3)
node --test tests/*.test.js                → # tests 235 / # pass 184 / # fail 5   (227 + 8 nuevas; los 5 de google_registro: ECONNREFUSED, sin PostgreSQL; preexistentes)
tests/terreno.spec.js                      → 11 passed (18.5m)
tests/desapoyar.spec.js                    → 13 passed (24.4m)
tests/apoyar.spec.js                       → 9 passed (16.0m)
tests/nacimiento_piezas.spec.js            → 4 passed (1.3m)
tests/camara.spec.js                       → 10 passed (15.0m)
tests/avisos_colocacion.spec.js            → 21 passed (26.7m)
specs 00–12                                → 46 passed, 2 failed (42.7m) — los 2 fallos son C-D y C-F de 12_concreto_libre (timeouts de 120 s, preexistentes)
```

Notas sobre `terreno.spec.js`: en la primera ejecución fallaron T7 y T11/T12 por defectos de la propia prueba (el estado v2 incluye la clave `hitos`; el bloque
de la prueba de gizmo quedó fuera del encuadre de la cámara). En la pasada de regresión T8 y T16 superaron el tiempo máximo de 5 min (cargan varias páginas
a ~1,5 FPS): se aligeró T8 (estado mínimo para las variantes inválidas) y se subió a 10 min el tiempo de T8 y T16. Se corrigieron las pruebas, no el código; la
ejecución completa final dio 11/11.

## 9. Diferencias técnicas respecto a F2.4d

- `calculos.js` (+46 líneas, 0 eliminadas): primer `import` (de `referencia.js`) y las funciones de §4.
- `casa.js` (+124 líneas, 8 modificadas): bloque nuevo «F3» (selector, lectura y saneo, panel, ayudas de telemetría; sin tocar F2.x) y la integración puntual:
  `import` de las funciones y de `referencia.js`; `excavacionData` con 2 campos; `crearGeometriaExcavacion` con 2 parámetros opcionales al final (la
  geometría no cambia) y contexto de telemetría ampliado; `openExcavacionModal` (inicializa el selector); `excActualizarVista` (2 llamadas);
  `confirmarExcavacion` (pasa los 2 valores); `snapshotActual` (2 campos); `restaurarProgreso` (pasa los 2 valores); lista `window` (2 manejadores).
  Las 8 líneas modificadas son solo ampliaciones de esas líneas existentes.
- `sandbox.html`: tarjeta `#exc-suelo-card` (selector, slider, panel) en el modal. `casa.css`: bloque F3 al final (solo reglas nuevas).
- `tests/calculos.test.js`: 8 pruebas nuevas (de 9 a 17). `tests/terreno.spec.js`: nuevo, 11 pruebas.
- Sin cambios en `guardado.js`, `referencia.js`, `manipulacion.js`, el servidor, la BD ni `package.json`.

## 10. Limitaciones y desviaciones

- **Ejemplo 1.3 (lleno) y ejercicio 1.6:** no los cubre F3. Necesitan el factor «al compactar» (`al_compactar_1m3`) y una función de lleno, fuera de las
  firmas autorizadas. Pendientes para F5/F6.
- **Ejemplo 1.2 y ejercicios 1.2–1.4 en la interfaz:** su largo supera 18 m; solo en Node (el ejemplo 1.2 con geometría equivalente también en Playwright).
- **Montículo:** sigue dimensionado con el volumen en banco (C5); no refleja el volumen suelto ni el % a retirar.
- **El servidor no valida `tipo_suelo` ni `porcentaje_retiro`** (no se toca `server/`); el cliente los sanea al cargar.
- **Singular:** con exactamente 1 viaje la interfaz dice «1 viaje de 5 m³» (en lugar de «1 viajes»).
- **Tooltips de las opciones:** la opción deshabilitada lleva el tooltip como atributo `title`; su visualización depende del navegador. La nota visible bajo el
  panel («Los suelos sin factor… aparecen deshabilitados») cubre ese caso.
- **Un solo tipo de suelo por fosa** (la autorización no pedía estratos): la fosa usa un único factor.
- **Pruebas:** T11/T12 miden el gizmo con el ratón real; en un equipo sin GPU (~1,5 FPS) la prueba espera por condición.

## 11. Fases intactas

F0 (`referencia.js` byte a byte igual y solo leído), F1 (`camara.spec.js` 10/10), F2.1 (`manipulacion.js` igual), F2.2 (`avisos_colocacion.spec.js`),
F2.3, F2.4a (`nacimiento_piezas.spec.js`), F2.4b (`manipulacion.test.js` 45/45), F2.4c (`apoyar.spec.js`), F2.4d (`desapoyar.spec.js`) y guardado v2
(`guardado.js` igual; campos aditivos en `terreno.excavacion`).

## 12. Nota sobre la siguiente fase

No se inicia ninguna. Opciones previstas: **F4** (plano y diseño arquitectónico) o **F5** (excavación ampliada, donde encajarían el lleno —ejemplo 1.3 y
ejercicio 1.6— y, si se decide, estratos o un montículo ligado al volumen suelto). Se espera autorización explícita.
