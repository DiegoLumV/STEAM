# Simulador STEAM — Presentación 20 nov 2026

## Qué es
Simulador 3D educativo para diseñar y construir viviendas: el alumno dibuja un plano en 2D, lo materializa en 3D y lo revisa con cantidades y medidas reales.

## Demo funcional (orden sugerido)
1. **Editor de plano 2D**: lote, habitaciones con nombre, puertas y ventanas con medidas.
2. **Materializar plano**: paredes en 3D con huecos reales para cada puerta y ventana, con textura de ladrillo (la pared compartida entre dos habitaciones es una sola).
3. **Pisos** por habitación, según su nombre: baño y cocina en cerámica; sala, comedor, dormitorio y habitación en madera; el resto en concreto.
4. **Añadir cubierta**: techo a dos aguas, pendiente 27 % (Manual de Materiales, Tabla A.9, fibrocemento recomendada), con alero de 0.5 m y frontones cerrados.
5. **Puertas y ventanas 3D**: marcos, hoja de la puerta y vidrio de la ventana en cada hueco.
6. Cámara libre con colisión y Rayos X; manipulación de piezas (apoyar, desapoyar).
7. Excavación (F3) con suelo de tierra texturado.

## Bloques implementados hoy
| Bloque | Qué se hizo | Estado |
|---|---|---|
| A | Texturas procedurales (sin imágenes): ladrillo en las paredes del plano, tierra en el suelo | implementado |
| B | Cubierta a dos aguas, botón «Añadir cubierta» / «Quitar cubierta» en el editor | implementado |
| D | Pisos por habitación (madera, cerámica, concreto) | implementado |
| C | Marcos, hojas y vidrios en los huecos | implementado |

Ningún bloque se revirtió. Las pruebas se corrieron con los cuatro bloques puestos a la vez.

## Archivos
- Nuevos: `src/scripts/material_render.js`, `src/scripts/cubierta_lite.js`, `docs/PRESENTACION_20NOV.md`.
- Modificados: `src/scripts/casa.js` (ganchos y bloque «PRESENTACIÓN 20-NOV»), `src/sandbox.html` (un botón).
- No se tocaron: `calculos.js`, `referencia.js`, `manipulacion.js`, `guardado.js`, `server/`, `package.json`, ni las pruebas existentes.

## Cómo se guarda
- La cubierta se guarda en `progreso.plano.cubierta` (aditivo: solo existe si el alumno la añadió) y se regenera al cargar.
- Texturas, pisos y puertas/ventanas 3D no se guardan aparte: se regeneran de lo materializado y de los nombres de las habitaciones.

## Base técnica
- Base documental: Manual de Materiales de Construcción (Jaramillo), Manual para Construcción de Viviendas en Fibra Vegetal (Betancourt y Montejo, 2017) y el enfoque matemático para control de proyectos (Chirinos Garate), con fuente y página por cada constante en `referencia.js`.
- Pruebas (última línea base medida antes de esta jornada): Node 320 (269 pasan, 46 omitidas, 5 necesitan PostgreSQL); Playwright 228 (226 pasan; 2 fallas preexistentes en `12_concreto_libre`: C-D y C-F, desde F3).

### Regresión de esta jornada (A + B + D + C puestos)
| Prueba | Resultado |
|---|---|
| `node --test tests/calculos.test.js` | 102/102 |
| `node --test tests/manipulacion.test.js` | 45/45 |
| `plano_editor.spec.js` | 23/23 |
| `plano_3d.spec.js` | 37/37 |
| `plano_habitaciones.spec.js` | 22/22 |
| `plano_vanos.spec.js` | 30/30 |

No se corrieron los specs 00–12 con los bloques nuevos (≈39 min): la textura del suelo se aplica en todas las escenas, así que conviene correrlos después de la presentación. No se añadieron pruebas nuevas para estos bloques.

## Limitaciones conocidas (decirlas antes de que las pregunten)
- La cubierta cubre el rectángulo que engloba a todas las habitaciones (casas en L o en T quedan con alero de más).
- Los pisos, la cubierta y las puertas/ventanas 3D no son seleccionables y no bloquean la cámara (la cámara los atraviesa aunque Rayos X esté apagado; las paredes sí la bloquean).
- La hoja de la puerta se dibuja cerrada; no se abre.
- Los pisos no siguen a una excavación posterior (quedan a 1 cm sobre el nivel original).
- Todavía no hay cimentación, replanteo, muros por hiladas, instalaciones ni losa: son las fases siguientes.

## Roadmap pendiente
- F5: Replanteo con estacas (propuesta técnica aprobada; sin implementar)
- F6: Cimentación
- F7: Muros reales con ladrillos
- F8: Instalaciones embebidas
- F9: Losa
- F11: Acabados avanzados
- F12: Carpintería detallada
- F14: Fibra vegetal

El Prompt Maestro v7 (con las decisiones D1–D11) es un documento aparte; no está dentro del repositorio.
