# F0 · Documento de cierre — Fuente de datos documental

**Fecha:** 2026-11-05 · **Base:** Prompt maestro v2 + Resolución de auditoría v3 + Confirmación para F0 (errata 2b corregida).

## Objetivo

Crear la fuente única de datos numéricos de la base documental del Constructor de Casa y sus pruebas, sin tocar código existente. `calculos.js` importará de aquí en fases posteriores; `casa.js` no debe contener constantes de la base documental.

## Archivos creados

| Archivo | Función |
|---|---|
| `src/scripts/referencia.js` | Datos puros y congelados: A.1–A.8 corregidas; A.9–A.11 documentadas; parámetros generales, concreto ciclópeo, modelo C/P/E, tablas por etapa, ejemplos resueltos de la fuente y registro de erratas. 403 constantes. |
| `tests/referencia.test.js` | 22 pruebas Node: esquema y trazabilidad, inmutabilidad, pureza, una prueba por errata y valores de control. |
| `docs/F0_cierre.md` | Este documento. |

Esquema de cada constante: `{ valor, unidad, fuente: { documento, tabla, pagina_impresa, pagina_pdf }, es_estimacion, derivado, nota, fuente_original? }`. Las constantes derivadas llevan además `formula`, y el redondeo de viajes lleva `criterio_educativo: true`.

Páginas: en el Manual de Materiales y en el artículo de Chirinos la página impresa coincide con la del PDF. En el Manual de Fibra Vegetal la del PDF es la impresa + 7.

## Erratas aplicadas

| Errata | Corrección | Dónde |
|---|---|---|
| 1 | A.3: una sola columna `arena_m3`; agua en `agua_L_arena_seca` y `agua_L_arena_humeda`. | `A3_MORTEROS_VOLUMEN` |
| 2 | A.4: encabezado «agua con agregados húmedos / secos»; balasto 1:2:4 = 0.95. | `A4_CONCRETOS` |
| 2b | 1:3:5 = 160/185 y 1:3:6 = 155/180 adoptados por patrón, con `fuente_original` y la nota «verificado por patrón, no por fuente directa». 1:3:4 = 140/185 directo de la fuente, sin `fuente_original`. | `A4_CONCRETOS` |
| 3 | A.8: placas 2, 3, 4, 5, 6, 8, 10; traslapo longitudinal 0.14 m, lateral 0.047 m; N = L / (C − 0.14). | `A8_PLACAS_FIBROCEMENTO` |
| 4 | A.11: en seco 48.000; filas `muros_%` y `util_%`; `unidad_no_especificada: true` en el costo. | `A11_COMPARACION_SISTEMAS` |
| 5 | A.10: fardo estructural ≥ 90 kg/m³ (~22 kg); 12 kg comercial no apto para muros portantes; altura 2,70 m; W/(m·K); el rango 110–130 kg/m³ no se incluye. | `A10_FARDO_PAJA` |
| 6 | C/P/E: invariante C = P_pendiente + E_acumulado; ΔC como consistencia; ΔE como desviación real; tiempos elemento a elemento. | `MODELO_CPE` |
| 7 | Etapa 3 → A.6; Etapa 5 → A.6 + A.7; Etapa 7 → A.8 + A.9. | `TABLAS_POR_ETAPA` |
| 8 | Se conservan 12.67 viajes; `Math.ceil` es redondeo educativo. | `PARAMETROS.redondeo_viajes` |

Valores con `fuente_original` (solo donde el valor adoptado difiere del PDF): agua de 1:3:5 y 1:3:6 (errata 2b); altura de la estructura «2,70 cm»; unidad «W/mk» de la conductividad; «Marquita» → Mariquita; «o - 10 km» → 0–10 km.

## Decisiones adoptadas

- Resolución v3 §1 (erratas) y §2: D1 aplicada; D2 modo heredado intacto; D3 validaciones como avisos por defecto (se aplicará desde F2); D4 F0 como primera fase.
- `es_estimacion: true` queda reservado para datos ajenos a la base documental. F0 no contiene ninguno (la prueba 3 lo verifica).

## Valores derivados

| Valor | Fórmula |
|---|---|
| Volumen del fardo | 1.20 × 0.45 × 0.45 = 0.243 m³ |
| Fardo estructural | 90 kg/m³ × 0.243 m³ = 21.87 kg ≈ 22 kg |
| Densidad del fardo comercial | 12 kg / 0.243 m³ = 49.4 kg/m³ |
| Ángulo de la pendiente 27 % | arctan(0.27) = 15.11° ≈ 15° |

## Resultado de las pruebas

`node --test tests/referencia.test.js` → 22 pruebas, 22 aprobadas, 0 fallidas (Node 22, en una copia aislada). Una mutación por errata (1:3:5, 1:2:4, traslapo lateral y 448.000) fue detectada por las pruebas.

Dos ajustes durante la implementación, ambos en la prueba y no en los datos:
- La regla de pureza ahora ignora los comentarios (mencionan «Babylon.js»).
- La fuente trunca el número de placas: 6,20 / 1,69 = 3,668… → 3,66. Queda documentado en `EJEMPLOS_FUENTE.numero_placas_n6.nota`.

Excepción explícita (Confirmación §5): F0 no tiene interfaz, por lo que no genera spec de Playwright. No se ejecutaron las specs existentes porque no se modificó ningún archivo; deben seguir pasando.

## Archivos existentes

No se modificó ningún archivo existente. `calculos.js`, `casa.js`, `materiales.js`, `guardado.js`, `server/routes/alumno.js`, `package.json`, el modo heredado (concreto 1000/2000/3000/600 y ejercicio de matemáticas) y los golden files quedan intactos.

## Pendientes para F1 en adelante

- A.9, A.10 y A.11 están documentadas; se usarán en F6 y F10.
- Agregar `tests/referencia.test.js` a `npm run test:referencia` la primera vez que se modifique `package.json`.
- Validación cruzada de tablas no revisadas: 3.5, 3.6, ejemplos 3.11–3.20, tanque séptico, tuberías, acabados y anexos 17–18 del manual de fibra vegetal.
- Verificar los ejemplos 3.4 (F5) y 3.6–3.9 (F6) antes de usarlos en pruebas.
- `server/routes/alumno.js:44` sigue sin contar `wall_lamina` (se tratará en F5 con autorización).

## Nota de alcance (F1)

La profundización v3.1 se revisó contra `@babylonjs/core` 9.1.0. Havok no está instalado; CSG2 requiere Manifold WASM servido localmente; CSG y thinInstances no se combinan en muros. La v3.2 (enmienda) redefine F1 sin dependencias nuevas y pospone Havok, CSG2 y física a fases posteriores con autorización explícita.
