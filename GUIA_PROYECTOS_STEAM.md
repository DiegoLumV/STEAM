# 🚀 Guía Oficial para Desarrolladores de Proyectos — Plataforma CasaSTEAM

Este documento define las **reglas técnicas obligatorias**, el **contrato de integración** y el **catálogo de proyectos** para los equipos de desarrollo que construirán nuevos simuladores 3D dentro de la plataforma educativa **CasaSTEAM**.

> **IMPORTANTE:** Todos los proyectos deben funcionar bajo un estándar único ("plug & play"). **No está permitido modificar la base de datos ni agregar librerías externas** sin autorización previa.

---

## 1. 🛠️ Stack Tecnológico Permitido (Lista Blanca)

Para evitar conflictos de dependencias al unir los 20 desarrollos en el repositorio principal, **SOLO** se permite el uso de:

| Categoría | Tecnología Permitida | Prohibido (Sin excepciones) |
| :--- | :--- | :--- |
| **Estructura** | **HTML5** semántico | Pug, EJS, Handlebars, JSX |
| **Estilos** | **CSS3 Puro (Vanilla CSS)** importando `src/Css/steam-theme.css` y `src/Css/styles.css` | TailwindCSS, Bootstrap, Sass/SCSS, Less, librerías UI |
| **Lógica Frontend** | **Vanilla JavaScript (ES6+ Modules)** (`import` / `export`) | React, Vue, Angular, Svelte, jQuery, TypeScript sin compilar |
| **Motor 3D** | **Babylon.js v9.x** (`@babylonjs/core` `^9.1.0` y `@babylonjs/loaders` `^9.1.0`) | Three.js, Unity WebGL, PlayCanvas, A-Frame, CDN global de Babylon |
| **Gráficas 2D** | **Chart.js** (`^4.5.1`), Canvas 2D nativo o SVG | D3.js, Highcharts, ApexCharts |
| **Modelos 3D** | Archivos **`.glb`** / **`.gltf`** (peso total por proyecto <= 15 MB) | `.obj`, `.fbx`, `.stl`, `.dae` |
| **Texturas / Img** | `.webp`, `.png`, `.jpg` (máx. `1024x1024 px`), `.svg` | Texturas 4K/8K sin comprimir |
| **Bundler** | **Vite** (`^5.4.0`) sobre Node.js LTS | Webpack, Parcel, Rollup manual |

---

## 2. 📁 Estructura de Entregables por Equipo

Cada equipo debe entregar su proyecto encapsulado con un identificador único (`slug`, por ejemplo: `invernadero`, `puente-sismico`, `rover-marte`):

```text
entregable-[slug]/
├── manifest.json           # Metadatos del proyecto, objetivos y actividades críticas STEAM
├── lecciones.json          # Contenido de los 6 módulos teóricos + preguntas de quiz
├── simulador-[slug].html   # Página del simulador 3D (basada en el layout de sandbox.html)
├── scripts/
│   └── [slug].js           # Lógica Babylon.js + conexión con guardado.js y telemetria.js
├── Css/
│   └── [slug].css          # Estilos propios (usando prefijo único para no pisar clases globales)
└── models/
    └── [slug]/             # Modelos .glb optimizados (máx. 15 MB en total)
```

---

## 3. 🔌 Contrato de Integración con CasaSTEAM

Ningún equipo debe programar su propio login, ni su propio backend, ni guardar avances en `localStorage`. Todos deben conectarse a los módulos oficiales de la plataforma:

### 3.1 Lectura Dinámica del ID de Proyecto
Nunca escriban `proyecto_id = 1` fijo en el código. Siempre debe obtenerse de la URL:
```javascript
const params = new URLSearchParams(window.location.search);
const proyectoId = parseInt(params.get('proyecto') || 1, 10);
const vistaAlumnoId = params.get('alumno'); // Presente cuando el Maestro revisa el trabajo del alumno
```

### 3.2 Conexión con el Sistema de Autoguardado (`src/scripts/guardado.js`)
La base de datos guarda automáticamente dos columnas JSONB (`estado` y `progreso`). El archivo `[slug].js` debe implementar:

```javascript
import { iniciarAutoguardado, marcarSucio, cargar, reiniciar, iniciarSyncMaestro } from './guardado.js';

// 1. Función que devuelve la foto actual de la escena 3D y el avance de fases
function obtenerSnapshot() {
  return {
    estado: {
      v: 1,
      objetos: listaObjetosEscena.map(obj => ({
        id: obj.id,
        type: obj.type,
        p: [obj.position.x, obj.position.y, obj.position.z],
        r: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        props: obj.metadata || {}
      })),
      contador: contadorIds
    },
    progreso: {
      buildPhase: faseActual, // 0: Matemáticas, 1: Ciencia, 2: Ingeniería, 3: Tecnología, 4: Arte/Completo
      objetivos: [
        { clave: 'reto_matematico', label: 'Cálculo inicial resuelto', actual: 1, requerido: 1, completo: true },
        { clave: 'piezas_clave', label: 'Estructura principal armada', actual: 3, requerido: 5, completo: false }
      ]
    }
  };
}

// 2. Al iniciar el simulador: cargar partida previa e iniciar el autoguardado
const datosGuardados = await cargar();
if (datosGuardados) {
  restaurarEscenaDesdeJSON(datosGuardados.estado, datosGuardados.progreso);
  if (vistaAlumnoId) iniciarSyncMaestro(datosGuardados.actualizado_en);
}
iniciarAutoguardado(obtenerSnapshot, { proyecto_id: proyectoId });

// 3. Cada vez que el alumno agregue, mueva, configure o borre un objeto:
marcarSucio();
```

### 3.3 Modo "Vista del Maestro" (Solo Lectura)
Cuando un profesor entra a revisar la entrega de un alumno, la URL incluye `?alumno=ID`. El simulador **debe**:
1. Bloquear las herramientas de construcción/edición si `vistaAlumnoId` existe.
2. Escuchar actualizaciones en tiempo real:
```javascript
document.addEventListener('guardado:actualizado_externo', async () => {
  const nuevo = await cargar();
  if (nuevo) restaurarEscenaDesdeJSON(nuevo.estado, nuevo.progreso);
});
```

### 3.4 Conexión con Telemetría (`src/scripts/telemetria.js`)
Para que el motor de evaluación doctoral calcule el desempeño STEAM del alumno, el simulador debe emitir eventos en cada actividad crítica:

```javascript
import { iniciarSesion, registrar, setCameraRef, cerrarSesion } from './telemetria.js';

// Al arrancar la escena de Babylon.js:
await iniciarSesion();
setCameraRef(camera);

// Al realizar acciones clave en cada dimensión STEAM:
registrar('matematicas_intento', {
  contexto: { exito: true, valor_ingresado: 45.5, valor_esperado: 45.5, intento_num: 1 }
});

registrar('ciencia_intento', {
  contexto: { exito: false, proporcion_usada: '2:1:3', motivo_fallo: 'Exceso de agua' }
});

registrar('objeto_colocado', {
  pos_x: mesh.position.x, pos_y: mesh.position.y, pos_z: mesh.position.z,
  contexto: { tipo: 'panel_solar', fase: 2 }
});

registrar('programa_ejecutado', {
  contexto: { exito: true, bloques_usados: 5 }
});
```

---

## 4. 📚 Estructura Pedagógica Obligatoria (Las 5 Etapas del Simulador)

Todo simulador debe guiar al alumno por **5 fases desbloqueables** (igual que *Constructor de Casa*), acompañadas de su archivo `lecciones.json` con los 6 módulos teóricos:

1. **Fase 0 — Reto Matemático (M):** Antes de construir, el alumno debe resolver un cálculo aplicado (área, volumen, caudal, energía, ángulos) usando datos generados dinámicamente para evitar copias.
2. **Fase 1 — Laboratorio de Ciencia (S):** Un simulador/mezclador interactivo donde el alumno ajusta variables físicas o químicas (mezcla de materiales, pH, resistencia, voltaje) y comprueba su validez.
3. **Fase 2 — Construcción e Ingeniería 3D (E):** Ensamblaje espacial en Babylon.js colocando las piezas requeridas con *gizmos* de posición/rotación y validación de reglas estructurales.
4. **Fase 3 — Automatización y Tecnología (T):** Panel de programación lógica por bloques (`SI sensor_X < valor ENTONCES activar_actuador_Y`) que cobra vida dentro de la escena 3D.
5. **Fase 4 — Diseño, Arte y Entrega (A):** Personalización de materiales, colores, iluminación, estética del entorno y botón de **"Entregar Proyecto"** (`POST /api/entrega`).

---

## 5. 🎯 Catálogo de 10 Proyectos para Asignar (Parejas de 2 Programadores)

Sugerencia de organización para los **20 programadores**: formar **10 parejas** (10 proyectos).
- **Programador A:** Escena 3D en Babylon.js, carga de modelos `.glb`, *gizmos*, colisiones, serialización de guardado y modo maestro.
- **Programador B:** Minijuegos de las fases STEAM (Matemáticas, Ciencia, Programación por bloques), UI lateral, telemetría y `lecciones.json`.

| # | Proyecto | 📐 Matemáticas (M) | 🧪 Ciencia (S) | ⚙️ Ingeniería (E) | 💻 Tecnología (T) | 🎨 Arte (A) |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Invernadero Automatizado** | Área de cultivo y volumen de agua diario (L/m²) | Mezcla de sustrato, control de pH y nutrientes N-P-K | Armar estructura tubular, camas de cultivo y red de riego | Programar sensores de humedad/temperatura y válvulas | Diseño bioclimático, distribución interior y colores |
| **2** | **Puente Sismorresistente** | Trigonometría de tirantes y distribución de carga | Tensión, compresión y elasticidad (acero vs. concreto) | Colocar pilares, vigas y armaduras; prueba de paso de camión | Sensores de vibración, semáforos y alerta estructural | Diseño arquitectónico del puente e iluminación nocturna |
| **3** | **Rover de Exploración Marciana** | Relación peso-potencia, autonomía de batería (Wh) y distancia | Gravedad marciana (3.72 m/s²), radiación y minerales | Ensamblar chasis, suspensión, paneles solares y brazo | Programar por bloques la ruta autónoma y toma de muestras | Diseño industrial del rover, recubrimiento y emblemas |
| **4** | **Parque de Energías Renovables** | Cálculo de demanda en kWh y ángulo óptimo solar | Conversión eólica y fotovoltaica; almacenamiento en baterías | Emplazar aerogeneradores, paneles solares y subestación | Programar el controlador de la micro-red inteligente | Integración paisajística y diseño del centro comunitario |
| **5** | **Montaña Rusa (Física Aplicada)** | Cálculo de pendientes, alturas y radios de giro (loops) | Energía potencial (mgh) vs. cinética (1/2 mv²) y fuerzas G | Conectar tramos de vía, columnas de soporte y frenos | Automatizar sensores de paso de vagón y lanzamiento | Tematización del parque, colores del tren y escenografía |
| **6** | **Planta Potabilizadora Pluvial** | Volumen de cisternas cilíndricas y caudal (Q = A * v) | Capas de filtración (grava, arena, carbón) y cloración (ppm) | Conectar captación, tanques de sedimentación, filtros y bombas | Programar sensores de nivel y turbidez para abrir válvulas | Arquitectura del paisaje (jardines filtrantes) y señalética |
| **7** | **Brazo Robótico Clasificador** | Coordenadas (X, Y, Z) y ángulos de rotación articular | Torque, centro de masa (evitar vuelco) y agarre neumático | Ensamblar base, eslabones, servomotores, pinza y banda | Programar rutina Pick & Place con sensor óptico de color | Diseño ergonómico de celda industrial y código de colores |
| **8** | **Módulo Biomédico de Emergencia** | Capacidad por m², tasa de renovación de aire por hora | Presión negativa de aislamiento, filtros HEPA y cadena de frío | Levantar módulos, ductos HVAC, rampas y planta de emergencia | Programar alarmas de refrigeración de vacunas y puertas | Psicología del color hospitalario e iconografía (wayfinding) |
| **9** | **Cruce Vial y Movilidad Urbana** | Flujo vehicular (autos/min), tiempos de espera y frenado | Reducción de emisiones CO2 y contaminación acústica (dB) | Trazar carriles, ciclovías, camellones, rampas y semáforos | Programar máquina de estados de semáforos y paso peatonal | Urbanismo táctico, arborización y mobiliario urbano |
| **10** | **Estudio Acústico Musical** | Proporciones armónicas y longitud de tubo vs. frecuencia (Hz) | Ondas sonoras, reflexión y coeficiente de absorción acústica | Cortar tubos del instrumento y colocar paneles acústicos 3D | Programar secuenciador por bloques y luces audiorrítmicas | Composición musical y diseño escenográfico del estudio |

---

## 6. ✅ Checklist de Entrega (Criterios de Aceptación)

Antes de hacer *merge* de cualquier proyecto a la rama principal, se verificará que cumpla con:
- [ ] **Cero librerías extra:** `package.json` no fue modificado.
- [ ] **Rendimiento fluido:** Mantiene >= 50 FPS y todos los `.glb` suman menos de 15 MB.
- [ ] **Persistencia completa:** Al recargar la página (`F5`), el proyecto recupera exactamente los objetos 3D colocados y la fase en la que iba el alumno.
- [ ] **Modo Maestro funcional:** Si se abre con `?alumno=ID`, entra en modo solo lectura sin sobrescribir datos.
- [ ] **Telemetría verificada:** Envía eventos reales a `/api/telemetria` en las 5 dimensiones STEAM.
- [ ] **Lecciones completas:** Incluye su archivo `lecciones.json` con los 6 módulos teóricos y sus preguntas de evaluación.
