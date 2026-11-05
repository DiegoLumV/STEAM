\# STEAM · Constructor de Casa



Simulador 3D educativo de construcción de viviendas. Vite + Babylon.js v9 en el front; Express + PostgreSQL + JWT en el back. Se arranca con `npm run dev:full`.



\## Reglas de trabajo (obligatorias)

\- Responde en español. Por defecto, entrega solo código o comandos, sin explicaciones largas.

\- Indica siempre la ruta exacta de cada archivo que crees o cambies.

\- Haz un cambio a la vez y valida antes de seguir.

\- No modifiques lo que ya funciona (Babylon.js, objetivos, guardado, entrega, dashboards, login, roles) salvo que lo pida explícitamente.

\- No hagas commit ni push a menos que yo lo pida.

\- No ejecutes migraciones ni agregues tablas o columnas sin aprobación.

\- No instales dependencias nuevas sin avisar; Playwright ya está aprobado como dependencia de desarrollo.

\- Nunca pongas secretos (Google Client Secret, JWT) en el código; usa variables de entorno.

\- Los permisos se validan en el backend, no solo ocultando botones.

\- Si subo el proyecto "como contexto", no hagas cambios ni análisis: espera mi instrucción.

\- Si una prueba falla o un cambio puede alterar algo existente, detente e infórmame.



\## Orientación del proyecto: construcción libre

\- El alumno construye libremente; las herramientas y los cálculos responden a sus decisiones.

\- No se imponen dimensiones, materiales ni una única solución.

\- Las validaciones se limitan a datos inválidos o errores técnicos.

\- Los criterios educativos son opcionales y solo bloquean la entrega si el docente lo activa.

\- Matemáticas y concreto se convertirán en actividades opcionales, sin bloquear nada.



\## Estado actual

\- Hecho: excavación libre (sin objetivo fijo); fase 0 (pruebas de regresión con Playwright y casas de referencia sintéticas); fase 1 (cálculos puros extraídos a `src/scripts/calculos.js`).

\- Pendiente: fase 2 (estado v2 aditivo con migrador de lectura) y siguientes. NO avanzar sin mi aprobación.

\- `casa.js` no se reescribe: se adelgaza extrayendo un módulo a la vez, dejando la fórmula original comentada como respaldo.



\## Pruebas

\- `npm run test:referencia` (Node, rápidas)

\- `node --test tests/calculos/\*.test.js` (paridad de cálculos)

\- `npx playwright install chromium` (una sola vez), luego `npm run test:e2e` (unos 10 min)

\- Fallan desde antes y no son de mis cambios: `tests/google\_registro.test.js` (necesita PostgreSQL) y 2 pruebas de `tests/integracion.test.js`.



\## Archivos clave

\- `src/scripts/casa.js`: escena, objetos, modales, excavación, guardado

\- `src/scripts/calculos.js`: cálculos puros

\- `src/scripts/guardado.js`: serialización y autoguardado

\- `src/sandbox.html`, `src/Css/casa.css`: interfaz del simulador

\- `server/routes/\*.js`, `server/migraciones.js`: API y migraciones al arrancar

\- `tests/fixtures/casas/`: casas de referencia (no usar datos de alumnos reales)

