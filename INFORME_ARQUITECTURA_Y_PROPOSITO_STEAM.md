# 🏛️ Informe Maestro: Arquitectura, Propósito y Escalabilidad del Framework Educativo **CasaSTEAM**

---

## 1. 🎯 Propósito General y Visión del Proyecto

El desarrollo de **CasaSTEAM** no tiene como fin último crear únicamente un simulador de construcción de viviendas; su verdadero propósito académico, tecnológico y doctoral es construir un **Framework Web 3D de Aprendizaje y Evaluación STEAM Basado en Telemetría**.

> **La Meta Central:** Transformar el aprendizaje teórico tradicional en **experiencias prácticas inmersivas en 3D** donde cada decisión del estudiante (cálculos matemáticos, experimentación científica, ensamblaje de ingeniería, programación lógica y diseño artístico) es **capturada silenciosamente en tiempo real (Telemetría)** para evaluar de forma objetiva sus competencias y perfil vocacional en las 5 dimensiones **STEAM** (*Science, Technology, Engineering, Arts, Mathematics*).

### ¿Por qué el proyecto "Constructor de Casa" fue el primer desarrollo?
**"Constructor de Casa"** cumple el rol de **Proyecto Semilla y Caso de Validación (*Reference Implementation*)**:
1. **Valida el ciclo pedagógico completo:** Demuestra que un alumno puede pasar de la teoría (`learn.html`) a la práctica 3D (`sandbox.html`) resolviendo problemas reales de las 5 áreas STEAM de forma secuencial.
2. **Valida la infraestructura tecnológica:** Puso a prueba el motor gráfico (Babylon.js v9), la persistencia en la nube (`JSONB` en PostgreSQL), la supervisión docente en vivo y el recolector de telemetría.
3. **Establece el molde (*Blueprint*) para el equipo de 20 programadores:** Todo lo resuelto en la casa sirve ahora como la **arquitectura base reutilizable** para alimentar un catálogo masivo de simuladores sin volver a programar el sistema de usuarios, aulas, autoguardado ni analítica.

---

## 2. 🏗️ Estructura Completa de lo que estás Construyendo (Las 5 Capas del Framework)

Tu plataforma actual ya cuenta con una arquitectura de 5 capas completamente integradas:

| Módulo / Capa | Archivos Clave | Qué hace dentro de tu Meta |
| :--- | :--- | :--- |
| **1. Gestión de Roles y Aulas** | `server/routes/auth.js`, `admin.js`, `maestro.js`, `alumno.js` | Permite registro (incluyendo Google OAuth + People API para datos demográficos de investigación como edad/género), creación de grupos/cursos, inscripción de alumnos y seguimiento por proyecto. |
| **2. Ruta Teórica Modular** | `src/learn.html`, `server/routes/progreso.js` | Presenta la teoría dividida en 6 módulos (Introducción + las 5 letras STEAM) con micro-evaluaciones y guarda el avance individual en `avance_rutas`. |
| **3. Simulador 3D por Etapas** | `src/sandbox.html`, `src/scripts/casa.js` | El "Examen Práctico". Obliga al alumno a desbloquear fases: no puede construir sin antes calcular (Matemáticas) y formular materiales (Ciencia). |
| **4. Persistencia y Espejo Docente** | `src/scripts/guardado.js`, `server/routes/guardado.js` | Serializa la escena 3D en JSON cada vez que hay cambios o al cerrar la pestaña (`sendBeacon`), y permite al maestro ver en vivo la construcción del alumno (`?alumno=ID`) en modo solo lectura. |
| **5. Telemetría y Evaluación** | `src/scripts/telemetria.js`, `server/routes/evaluacion.js`, `cuestionario.js` | Registra cada intento acertado o fallido, tiempos de inactividad, coordenadas `(X,Y,Z)` y movimientos de cámara para traducirlos automáticamente en puntajes de habilidad por dimensión STEAM. |

---

## 3. 🧩 El Modelo Pedagógico "CasaSTEAM": Cómo Funciona el Molde de las 5 Fases

El gran acierto de tu diseño en **Constructor de Casa** es que convierte el acrónimo **STEAM** en una **máquina de estados finitos (5 fases desbloqueables)**. Cualquier proyecto nuevo que hagan tus 20 programadores debe replicar exactamente esta misma estructura lógica:

| Fase del Framework | Cómo funciona hoy en **"Constructor de Casa"** | Cómo debe funcionar en **Cualquier Proyecto Nuevo** |
| :--- | :--- | :--- |
| **Fase 0: Matemáticas (M)** | Calcular el área del terreno (`Largo x Ancho`) con dimensiones aleatorias. | Resolver una ecuación o cálculo dimensional clave antes de tocar las piezas (ej. empuje de un cohete, caudal de agua, ángulo solar). |
| **Fase 1: Ciencia (S)** | Mezcladora de concreto: ajustar proporciones de cemento, agua, arena y grava. | Simulador de laboratorio donde se calibran variables físicas, químicas o biológicas (ej. pH de nutrientes, aleación, campo magnético). |
| **Fase 2: Ingeniería (E)** | Colocar pisos, paredes de bloque/madera, puertas, ventanas y techos en el espacio 3D. | Ensamblar en el lienzo 3D de Babylon.js los componentes estructurales del proyecto cumpliendo reglas espaciales y mecánicas. |
| **Fase 3: Tecnología (T)** | Programar por bloques el foco inteligente según sensores de luz o presencia. | Programar por bloques el comportamiento autónomo de los sensores y actuadores del modelo 3D (válvulas, motores, semáforos, rovers). |
| **Fase 4: Arte y Diseño (A)** | Pintar muros, elegir texturas de techo, decorar el entorno y entregar la casa. | Personalizar acabados visuales, ergonomía, integración paisajística/industrial, iluminación y enviar la entrega final. |

---

## 4. 👥 Cómo deben trabajar los 20 Programadores para Alimentar el Catálogo

Para que puedas escalar de **1 proyecto (La Casa)** a **11 o 21 proyectos** sin que tu plataforma se rompa, la regla arquitectónica es:

1. **Tú eres dueño del Core (Plataforma Central):** Autenticación, Base de Datos PostgreSQL, Dashboards de Alumno/Maestro/Admin, `guardado.js` y `telemetria.js`.
2. **Los 20 programadores son creadores de "Cartuchos/Módulos":** Ellos solo usan **Vanilla JS + HTML5 + CSS3 + Babylon.js v9 + Chart.js**.

### Lo que cada equipo debe entregar para que su proyecto sea 100% compatible:
1. **`lecciones.json`:** Los 6 módulos teóricos (Introducción, M, S, E, T, A) con sus preguntas de opción múltiple para que `learn.html` los cargue dinámicamente según `?proyecto=ID`.
2. **`manifest.json`:** Nombre del proyecto, descripción, imagen de portada para `proyectos.html`, lista de objetivos evaluables (ej. *"Colocar 4 paneles solares"*, *"Estabilizar plasma"*) y mapeo de actividades críticas STEAM.
3. **`simulador-[slug].html` y `scripts/[slug].js`:**
   - Implementa las **5 fases STEAM**.
   - Se conecta a `iniciarAutoguardado(obtenerSnapshot, { proyecto_id })` y `cargar()` de `guardado.js`.
   - Respeta el modo solo lectura del profesor (`?alumno=ID`).
   - Envía eventos estandarizados (`matematicas_intento`, `ciencia_intento`, `objeto_colocado`, `programa_ejecutado`) a `telemetria.js`.

---

## 5. 📚 Catálogo Maestro de los 30 Proyectos Propuestos (Organizados por Nivel)

### Nivel 1: Proyectos Aplicados y Sustentables (Educación Media / Bachillerato)
| # | Proyecto | M (Matemáticas) | S (Ciencia) | E (Ingeniería 3D) | T (Tecnología / Bloques) | A (Arte y Diseño) |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Invernadero Automatizado** | Área de cultivo y caudal de riego (L/m²) | Sustrato, pH y nutrientes N-P-K | Estructura tubular, camas y tuberías | Sensores de humedad/temp -> electroválvulas | Diseño bioclimático y distribución interior |
| **2** | **Puente Sismorresistente** | Trigonometría de tirantes y reparto de carga | Tensión, compresión y elasticidad | Pilares, vigas, armaduras y prueba con camión | Sensores de vibración y alerta estructural | Estética arquitectónica e iluminación |
| **3** | **Rover de Exploración Marciana** | Relación peso-potencia y autonomía (Wh) | Gravedad marciana (3.72 m/s²) y radiación | Chasis, suspensión rocker-bogie y brazo | Ruta autónoma para esquivar rocas y muestrear | Diseño industrial aeroespacial y emblemas |
| **4** | **Parque de Energías Renovables** | Demanda en kWh y ángulo óptimo solar | Conversión eólica y fotovoltaica | Aerogeneradores, paneles y subestación | Controlador inteligente de red y baterías | Integración paisajística de bajo impacto |
| **5** | **Montaña Rusa (Física)** | Alturas, pendientes y radios de loop | Energía potencial (mgh) vs. cinética y fuerzas G | Tramos de vía, soportes y frenos magnéticos | Sensores de paso de tren y lanzamiento | Tematización del parque y diseño de vagones |
| **6** | **Planta Potabilizadora Pluvial** | Volumen de cisternas y caudal (Q = A * v) | Filtración multicapa y cloración (ppm) | Captación, sedimentadores, filtros y bombas | Automatización de bombas por nivel y turbidez | Jardines infiltrantes y señalética educativa |
| **7** | **Brazo Robótico Clasificador** | Coordenadas (X,Y,Z) y ángulos articulares | Torque, centro de masa y neumática | Base, eslabones, servomotores y banda | Rutina Pick & Place por sensor de color | Diseño ergonómico de celda y seguridad |
| **8** | **Módulo Biomédico de Emergencia** | Capacidad por área y renovación de aire/h | Presión negativa, filtros HEPA y cadena de frío | Módulos clínicos, ductos HVAC y rampa | Alarmas térmicas de vacunas y puertas auto | Psicología del color hospitalario y wayfinding |
| **9** | **Cruce Vial y Movilidad Urbana** | Flujo vehicular (autos/min) y frenado | Emisiones CO2 en ralentí y decibeles | Carriles, ciclovías, camellones y semáforos | Máquina de estados de semáforos inteligentes | Urbanismo táctico, arborización y mobiliario |
| **10** | **Estudio Acústico Musical** | Proporciones armónicas y longitud vs. Hz | Ondas sonoras, reflexión y absorción | Cortar tubos acústicos y colocar paneles 3D | Secuenciador musical por bloques y luces | Composición de melodía y escenografía |

### Nivel 2: Proyectos de Ingeniería Especializada y Robótica
| # | Proyecto | M (Matemáticas) | S (Ciencia) | E (Ingeniería 3D) | T (Tecnología / Bloques) | A (Arte y Diseño) |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **11** | **Dron de Rescate Forestal** | Relación empuje-peso (>= 2:1) y autonomía | Sustentación aerodinámica y retardantes | Chasis, 4 motores brushless, hélices y tanque | Vuelo autónomo y descarga sobre foco térmico | Carcasa aerodinámica de alta visibilidad |
| **12** | **Submarino ROV de Arrecifes** | Presión hidrostática (P = rho*g*h) y lastre | Principio de Arquímedes (flotabilidad) | Casco presurizado, propulsores y pinza | Control automático de profundidad por presión | Biomimética marina e iluminación submarina |
| **13** | **Satélite CubeSat en Órbita** | Velocidad orbital y presupuesto de enlace | Termodinámica en vacío y espectro RF | Estructura 3U, rueda de reacción y paneles | Despliegue solar y transmisión sobre antena | Aislamiento térmico dorado/plata y órbita 3D |
| **14** | **Auto Solar de Carreras** | Relación de engranes y cinemática | Arrastre aerodinámico (Cd) y ley de Ohm | Chasis tubular, motor trasero y cubierta solar | Gestor BMS y freno regenerativo en pendientes | Carrocería concept car y pintura de carreras |
| **15** | **Alerta Sísmica y Volcánica** | Triangulación de epicentro con 3 círculos | Ondas sísmicas P vs. S y gases SO2 | Sismógrafos en laderas, antenas y sirenas | Algoritmo de disparo temprano antes de onda S | Centro de monitoreo y mapa de riesgo visual |
| **16** | **Biorreactor de Microalgas CO2** | Crecimiento exponencial y absorción g/L | Fotosíntesis, ciclo de carbono y pH | Columnas transparentes, inyector y cosecha | Control de fotoperiodo LED y nutrientes | Arquitectura biofílica con tubos iluminados |
| **17** | **Almacén con Robots AGV** | Rutas en cuadrícula (distancia Manhattan) | Fricción, centro de masa y láser LiDAR | Racks industriales, cargadores y flota AGV | Evasión de obstáculos y despacho de paquetes | Señalética industrial y layout logístico |
| **18** | **Mano Prostética Mioeléctrica** | Palancas mecánicas y proporción de falanges | Biomecánica de tendones y señales EMG | Palma, dedos articulados, tensores y servos | Control de agarre con límite de presión táctil | Acabado biónico personalizado y ergonómico |
| **19** | **Observatorio Astronómico** | Distancia focal de espejos y aumento óptico | Óptica reflectora y distorsión atmosférica | Montura ecuatorial, espejos y cúpula móvil | Seguimiento estelar y cierre por sensor lluvia | Astrofotografía en color falso y cúpula |
| **20** | **Planta de Reciclaje Automatizada** | Flujo másico (ton/h) y % de recuperación | Magnetismo, corrientes de Foucault y densidad | Trituradora, bandas, electroimán y sopladores | Sincronización de sensores ópticos y pistones | Diseño de planta circular y código de colores |

### Nivel 3: Proyectos "Hardcore" (Nivel Universitario / Alta Complejidad Científica)
| # | Proyecto | M (Matemáticas) | S (Ciencia) | E (Ingeniería 3D) | T (Tecnología / Bloques) | A (Arte y Diseño) |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **21** | **Reactor de Fusión Tokamak** | Campos vectoriales y criterio de Lawson (Q>1) | Física de plasmas (150 M °C) y superconductores | Cámara toroidal, 18 bobinas TF y divertor | Control magnético activo para centrar plasma | Shaders volumétricos de plasma incandescente |
| **22** | **Cohete Reutilizable (Suicide Burn)** | Ecuación de Tsiolkovsky (Delta-v) y frenado | Termodinámica de toberas, Max-Q y criogenia | Motores vectoriales, grid fins y patas | Guiado GNC de aterrizaje vertical a 0.0 m/s | Plumas de fuego por partículas y telemetría |
| **23** | **Acelerador de Partículas (LHC)** | Fuerza de Lorentz y factor relativista gamma | Dipolos/cuadrupolos magnéticos y colisiones | Cavidades RF, tubo de vacío y detector gigante | Sincronización de pulsos RF y trigger | Trazas 3D de partículas subatómicas en espiral |
| **24** | **Túnel de Viento y F1 (CFD)** | Ecuación de Bernoulli, Downforce vs. Drag | Efecto Venturi (efecto suelo) y vórtices | Alerones regulables, fondo plano y DRS | Activación automática de DRS y suspensión | Líneas de flujo de aire coloreadas por velocidad |
| **25** | **Litografía EUV de Microchips** | Álgebra booleana y resolución de Rayleigh | Semiconductores (dopaje P/N) y óptica EUV | Ruta lógica de ALU 4-bits y espejos Bragg | Secuencia de grabado y test binario del chip | Arquitectura microscópica multicapa en oro/cobre |
| **26** | **Exoesqueleto Biónico (Cinemática)** | Cinemática inversa (ley de cosenos) y torque | Punto de Momento Cero (ZMP) y equilibrio | Estructura de titanio, actuadores y sensores pie | Controlador de marcha e inclinación con IMU | Diseño industrial mecha/médico y vectores |
| **27** | **Control de Tráfico Aéreo (TCAS)** | Vectores 3D polares y senda de planeo ILS 3° | Radar Doppler, windshear y vórtices de estela | Pistas según viento, antenas ILS y radar | Prevención automática de colisiones en vuelo | Radar holográfico 3D con conos de aproximación |
| **28** | **Plataforma Offshore Profunda** | Empuje hidrostático, metacentro y catenaria | Presión de poro, blowouts y gradiente térmico | Pontones, torre, válvula BOP submarina y hélices | Posicionamiento Dinámico (DP) contra olas | Océano dinámico con shaders y clima marino |
| **29** | **Tren Maglev / Hyperloop al Vacío** | Curvas clotoides y curvas de frenado en g | Inducción de Lenz, imanes Halbach y vacío | Cápsula, estator lineal, bombas y esclusas | Control de onda magnética y despresurización | Tubo transparente futurista con pulsos de neón |
| **30** | **Nanorobots Médicos en Sangre** | Número de Reynolds microscópico y cinética | Receptores tumorales, pH ácido y viscosidad | Cápsula lipídica, cola helicoidal y biosensores | Reconocimiento de marcador tumoral y disparo | Escenario inmersivo dentro de una arteria 3D |

---

## 6. 🗺️ Hoja de Ruta Recomendada para Lograr tu Meta

1. **Etapa 1 — Generalización del Core (1–2 días en tu repositorio):**
   - Ajustar `server/routes/progreso.js` y `src/scripts/telemetria.js` para que reciban `proyecto_id` dinámicamente por parámetro en vez de asumir el proyecto 1 ("Constructor de Casa").
   - Ajustar `calcularObjetivos(estado, progreso)` en `server/routes/alumno.js` para que lea la lista de objetivos directamente de `progreso.objetivos` si el proyecto no es la casa.
2. **Etapa 2 — Entrega de la Plantilla Base a los 20 Programadores:**
   - Entregarles el documento `GUIA_PROYECTOS_STEAM.md` junto con un archivo esqueleto (`plantilla-simulador.js`) que ya tenga los `import` de `guardado.js` y `telemetria.js` configurados.
3. **Etapa 3 — Desarrollo en Paralelo (Asignación por Parejas o Individual):**
   - Cada equipo trabaja únicamente dentro de su propia carpeta/archivos sin tocar el servidor ni los dashboards.
4. **Etapa 4 — Integración en el Catálogo (`proyectos.html` y Base de Datos):**
   - Registrar los nuevos proyectos en la tabla `proyectos` y `rutas_aprendizaje` mediante una migración en `server/migraciones.js` y activar sus tarjetas en el catálogo principal.
