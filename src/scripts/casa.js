// importamos todo lo que vamos a usar de Babylon.js v9
import { iniciarSesion, cerrarSesion, registrar, setCameraRef } from './telemetria.js';
import { checkTutorial, startTutorial } from './tutorial.js';
import { iniciarAutoguardado, marcarSucio, cargar, serializarEscena, reiniciar, haySinGuardar, iniciarSyncMaestro, asegurarGuardado } from './guardado.js';
import { MATERIALES } from './materiales.js';
// F2.1 / F2.2: clasificación pura de la colocación de una pieza (solo se importa; no se modifica).
import { clasificarColocacion, buscarApoyo, limitesCaja, desplazamientoParaApoyar } from './manipulacion.js';
// Cálculos puros extraídos (Fase 1). Las fórmulas originales quedan comentadas junto a cada uso.
import { calcularAreaTecho, calcularExcavacion, redondearCentesimas, calcularPiezasMuro, calcularDimensionesMuro, sumarAreaPisos, calcularCoberturaPiso, calcularTotalConcreto, porcentajeBarra, calcularDimensionCubierta, validarMezclaConcretoLibre, convertirCantidadConcreto, COMPONENTES_CONCRETO } from './calculos.js';
// F3: suelo y volqueta de la excavación. Funciones puras en calculos.js; los datos (A.1, volqueta) vienen de referencia.js (solo lectura).
import { volumenSuelto, viajesVolqueta, factorBancoSuelto, SUELO_POR_DEFECTO, PORCENTAJE_RETIRO_POR_DEFECTO } from './calculos.js';
import { A1_FACTORES_SUELO, PARAMETROS } from './referencia.js';
// F4a: editor 2D del plano. Funciones puras en calculos.js; la interfaz (SVG) vive en el bloque «F4a · EDITOR 2D DEL PLANO».
import {
  distancia, normalizarRectangulo, ajustarARejilla, formatearCota, zoomEnPunto, escalaBasePlano, mundoAPantalla, pantallaAMundo,
  moverElemento, anclaElemento, cotasElemento, elementoEn, planoVacio, sanearPlano,
  PLANO_MAX_ELEMENTOS, PLANO_MAX_COORDENADA, PLANO_LOTE_MIN, PLANO_LOTE_MAX, PLANO_PASOS_REJILLA, PLANO_PASO_DEFECTO,
} from './calculos.js';
// F4b: habitaciones libres con nombre en el editor del plano (funciones puras de calculos.js).
import {
  areaRectangulo, perimetroRectangulo, formatearArea, habitacionCreable, solapesHabitaciones, siguienteIdHabitacion,
  nombreHabitacionDefecto, habitacionEn, redimensionarDesdeEsquina, generarPlantilla, sanearHabitaciones,
  PLANTILLAS_HABITACIONES, HAB_MAX, HAB_LADO_MIN, HAB_LADO_MAX, HAB_NOMBRE_MAX,
} from './calculos.js';
// F4c: vanos (puertas y ventanas) dentro de las habitaciones del editor del plano (funciones puras de calculos.js).
import {
  VANO_MAX_POR_HAB, VANO_MAX_GLOBAL, VANO_ANCHO_MIN, VANO_ANCHO_MAX, VANO_ALTO_MIN, VANO_ALTO_MAX, VANO_OFFSET_MAX, VANO_TIPOS, VANO_LADOS,
  longitudPared, vanoCabeEnPared, segmentoVano, posicionEnPared, paredMasCercana, vanoNuevo, desplazarVano,
  vanoEnHabitaciones, estadoVanos, totalVanos, nombreVano, siguienteIdVano,
} from './calculos.js';
// F4d: materialización del plano en 3D (paredes con huecos, sin CSG). Funciones puras en calculos.js; la parte 3D vive en el bloque «F4d · MATERIALIZACIÓN».
import {
  PARED_ALTURA_DEFECTO, PARED_GROSOR_DEFECTO, PARED_ALFEIZAR_DEFECTO, PARED_RECT_AVISO,
  generarParedes3D, generarParedConHuecos, resumirMaterializacion, compactarMaterializado, expandirMaterializado, sanearMaterializado,
} from './calculos.js';
// Presentación 20-nov: texturas procedurales (DynamicTexture) para las paredes del plano y el suelo; el bloque vive en «PRESENTACIÓN 20-NOV».
import {
  crearTexturaLadrillo, crearTexturaTierra, crearTexturaTecho, crearTexturaMadera, crearTexturaCeramica, crearTexturaConcreto,
  texturaPisoPorNombre, aplicarTextura, proyectarUVMundo,
} from './material_render.js';
// Presentación 20-nov · Bloque B: cubierta a dos aguas sobre las habitaciones materializadas.
import { calcularBoundingBoxHabitaciones, crearCubierta } from './cubierta_lite.js';
// F5: replanteo básico (estacas en las esquinas del plano, ejes y verificación). Lógica pura en replanteo.js; fuente en referencia_topografia.js; el bloque vive en «F5 · REPLANTEO BÁSICO».
import {
  TEXTOS_ESTADO, ESTADO_VIGENTE, letraFila, ejesDe, crearEstacas, posicionEstaca, estadoReplanteo, validarDesviacion,
  medidasHabitacion, resumenMedidas, serializarReplanteo, sanearReplanteo,
} from './replanteo.js';
import { TEXTO_FORMULA_T, TEXTO_CRITERIO, TEXTO_345 } from './referencia_topografia.js';
// F6a: zanjas de cimentación bajo las paredes del plano. Lógica pura en cimentacion.js; fuente en referencia_cimentacion.js; el bloque vive en «F6a · ZANJAS DE CIMENTACIÓN».
import {
  CIM_TERRENO_MM, CIM_ZONA_MM, TEXTOS_ESTADO_CIM, validarProfundidad, crearZanjas, paredesZanja, rectangulosZanja, recortarRectangulos, fosaDesde,
  complementoTerreno, geometriaZanjas, resumenZanjas, avisosZanjas, estadoCimentacion, serializarCimentacion, sanearCimentacion,
} from './cimentacion.js';
import { TEXTO_FUENTE_ANCHO, TEXTO_FUENTE_PROF, TEXTO_NO_VALIDADO } from './referencia_cimentacion.js';
import { DynamicTexture } from '@babylonjs/core';
import {
  Engine,
  Scene,
  Color3,
  Color4,
  Vector3,
  Matrix,
  Ray,
  ArcRotateCamera,
  ArcRotateCameraMouseWheelInput,
  DirectionalLight,
  HemisphericLight,
  PointLight,
  ShadowGenerator,
  GizmoManager,
  HighlightLayer,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  TransformNode,
  VertexData,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  PointerEventTypes,
  Animation,
  CubicEase,
  EasingFunction,
} from '@babylonjs/core';

// SSAO2 tiene su propio submódulo en v9, hay que importarlo por separado
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js';

// variables globales que se usan en todo el proyecto
const canvas = document.getElementById('c');
const engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true, stencil: true });

let scene, camera, sunLight, hemiLight, shadowGen, highlightLayer;
let selectedMesh = null;
let isNight = false;
let gizmoMgr;
let objList = [];
let objIdCounter = 1;
let catOpen = true;
let MAT = {};

const vistaAlumnoId = new URLSearchParams(window.location.search).get('alumno');
window.startTutorial = startTutorial;

// estado interno del módulo de programación por bloques
let pendingTrigger = null;
let progRules = [];

// variables del sistema de desbloqueo por fases
let concretoUnlocked = false;
// fase 0=solo matematicas, 1=concreto desbloqueado, 2=construir desbloqueado, 3=pared construida, 4=todo desbloqueado (programar)
let buildPhase = 0;

// estado del módulo de matemáticas
let matematicasValidadas = false;

// Fase 3: modo de construcción libre. Solo de sesión (nunca se guarda ni se serializa).
// Solo existe el interruptor si la URL trae ?libre=1; sin eso queda siempre en false.
let modoLibreActivo = false;

// (estado del modal de concreto ahora se maneja por inputs numéricos)

// estado del constructor de pisos
let wpMat = 'block';

// tipos que se pueden colorear y referencia al objeto activo en el picker
const COLORABLE_TYPES = ['block', 'madera', 'puerta', 'vitropiso', 'ventana', 'roof', 'lamina'];
let colorPickerTarget = null;

// límites de puertas y ventanas
const MAX_PUERTAS = 2;
const MAX_VENTANAS = 3;
let puertas_colocadas = 0;
let ventanas_colocadas = 0;

// tipo de pared seleccionado en el modal: 'simple' | 'puerta' | 'ventana'
let wbWallMode = 'simple';
let wbVentanasCount = 1; // cuántas ventanas quiere (1 o 2)

// actualiza la barra de progreso y el mensaje durante la carga
const P = (p, msg) => {
  document.getElementById('lfill').style.width = p + '%';
  if (msg) document.getElementById('lmsg').textContent = msg;
};

// crea todos los materiales PBR que van a usar los objetos de la escena
function buildMaterials() {
  const pbr = (name, color, rough = 0.7, metal = 0.02) => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = new Color3(...color);
    m.roughness = rough; m.metallic = metal; return m;
  };
  MAT.ground = pbr('ground', [0.12, 0.15, 0.22], 0.98, 0.0);
  MAT.block = pbr('block', [0.62, 0.60, 0.56], 0.82, 0.02);
  MAT.madera = pbr('madera', [0.38, 0.24, 0.10], 0.72, 0.0);
  MAT.concreto = pbr('concreto', [0.70, 0.68, 0.65], 0.78, 0.02);
  MAT.barillas = pbr('barillas', [0.55, 0.58, 0.62], 0.25, 0.85);
  MAT.metal = pbr('metal', [0.60, 0.65, 0.75], 0.18, 0.90);
  MAT.trim = pbr('trim', [0.88, 0.90, 0.96], 0.60, 0.0);
  MAT.winFrame = pbr('winF', [0.85, 0.88, 0.94], 0.55, 0.0);
  MAT.wallLight = pbr('wallL', [0.32, 0.55, 0.92], 0.70, 0.0);
  MAT.doorMat = pbr('door', [0.08, 0.14, 0.32], 0.55, 0.08);
  MAT.lampBase = pbr('lampB', [0.65, 0.68, 0.75], 0.20, 0.88);
  MAT.lamina = pbr('lamina', [0.72, 0.76, 0.80], 0.35, 0.70);
  MAT.teja = pbr('teja', [0.82, 0.34, 0.16], 0.82, 0.02);

  // Materiales de excavación y preparación del terreno
  MAT.excFloor = pbr('exc_floor', [0.26, 0.17, 0.09], 0.95, 0.0);
  MAT.excWall = pbr('exc_wall', [0.36, 0.22, 0.12], 0.90, 0.0);
  MAT.excWallStratum = pbr('exc_wall_stratum', [0.20, 0.12, 0.06], 0.92, 0.0);
  MAT.excSoilPile = pbr('exc_pile', [0.32, 0.20, 0.10], 0.96, 0.0);
  MAT.excMarker = pbr('exc_marker', [0.92, 0.42, 0.08], 0.50, 0.0);
  MAT.excStake = pbr('exc_stake', [0.42, 0.28, 0.14], 0.75, 0.0);

  MAT.vitropiso = new PBRMaterial('vitropiso', scene);
  MAT.vitropiso.albedoColor = new Color3(0.45, 0.70, 0.98);
  MAT.vitropiso.alpha = 0.82;
  MAT.vitropiso.metallic = 0.15;
  MAT.vitropiso.roughness = 0.02;
  MAT.vitropiso.backFaceCulling = false;
  MAT.vitropiso.emissiveColor = new Color3(0.04, 0.10, 0.22);
  MAT.vitropiso.reflectionColor = new Color3(0.6, 0.8, 1.0);

  MAT.glass = new PBRMaterial('glass', scene);
  MAT.glass.albedoColor = new Color3(0.55, 0.72, 1.0);
  MAT.glass.alpha = 0.32; MAT.glass.metallic = 0.05; MAT.glass.roughness = 0.04;
  MAT.glass.emissiveColor = new Color3(0.02, 0.06, 0.20);
  MAT.glass.backFaceCulling = false;

  MAT.lampShade = new StandardMaterial('lampS', scene);
  MAT.lampShade.emissiveColor = new Color3(0.85, 0.70, 0.30);
  MAT.lampShade.diffuseColor = new Color3(0.90, 0.80, 0.45);
}

// helpers rápidos para crear caja, cilindro y esfera sin repetir tanto código
function box(name, w, h, d, px, py, pz, mat) {
  const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  m.position.set(px, py, pz);
  if (mat) m.material = mat;
  m.receiveShadows = true;
  return m;
}
function cyl(name, rt, rb, h, px, py, pz, mat, tess = 12) {
  const m = MeshBuilder.CreateCylinder(
    name, { diameterTop: rt * 2, diameterBottom: rb * 2, height: h, tessellation: tess }, scene);
  m.position.set(px, py, pz);
  if (mat) m.material = mat;
  m.receiveShadows = true;
  return m;
}
function sph(name, r, px, py, pz, mat) {
  const m = MeshBuilder.CreateSphere(name, { diameter: r * 2, segments: 10 }, scene);
  m.position.set(px, py, pz);
  if (mat) m.material = mat;
  m.receiveShadows = true;
  return m;
}

// construye el suelo, la cuadrícula y los bordes de la zona de construcción
function buildGround() {
  const HALF = 13, ZONE = 10, Y = 0.002;

  const ground = MeshBuilder.CreateGround(
    'ground', { width: HALF * 2, height: HALF * 2, subdivisions: 1 }, scene);
  ground.material = MAT.ground; ground.receiveShadows = true;

  // líneas delgadas de la cuadrícula menor
  const lines = [], lineColors = [];
  const dimC = new Color4(0.15, 0.35, 0.75, 0.40);
  for (let i = -HALF; i <= HALF; i++) {
    lines.push([new Vector3(-HALF, Y, i), new Vector3(HALF, Y, i)]);
    lines.push([new Vector3(i, Y, -HALF), new Vector3(i, Y, HALF)]);
    lineColors.push([dimC, dimC]); lineColors.push([dimC, dimC]);
  }
  MeshBuilder.CreateLineSystem('grid', { lines, colors: lineColors }, scene).isPickable = false;

  // líneas más marcadas cada 5 unidades
  const maj = [], majC = [];
  const mC = new Color4(0.25, 0.55, 1.0, 0.65);
  for (let i = -HALF; i <= HALF; i += 5) {
    maj.push([new Vector3(-HALF, Y + .001, i), new Vector3(HALF, Y + .001, i)]);
    maj.push([new Vector3(i, Y + .001, -HALF), new Vector3(i, Y + .001, HALF)]);
    majC.push([mC, mC]); majC.push([mC, mC]);
  }
  MeshBuilder.CreateLineSystem('grid_major', { lines: maj, colors: majC }, scene).isPickable = false;

  // relleno semitransparente verde oscuro de la zona de construcción
  const fill = MeshBuilder.CreateGround('zone_fill', { width: ZONE * 2, height: ZONE * 2, subdivisions: 1 }, scene);
  const fm = new PBRMaterial('zfm', scene);
  fm.albedoColor = new Color3(0.10, 0.22, 0.18); fm.roughness = 0.98; fm.metallic = 0.0; fm.alpha = 0.50;
  fill.material = fm; fill.position.y = 0.001; fill.isPickable = false; fill.receiveShadows = true;

  // borde brillante que delimita dónde puedes colocar cosas
  const zY = 0.008, zC = new Color4(0.15, 0.95, 0.55, 1.0);
  const zL = [
    [new Vector3(-ZONE, zY, -ZONE), new Vector3(ZONE, zY, -ZONE)],
    [new Vector3(ZONE, zY, -ZONE), new Vector3(ZONE, zY, ZONE)],
    [new Vector3(ZONE, zY, ZONE), new Vector3(-ZONE, zY, ZONE)],
    [new Vector3(-ZONE, zY, ZONE), new Vector3(-ZONE, zY, -ZONE)],
  ];
  MeshBuilder.CreateLineSystem('zone_border', { lines: zL, colors: zL.map(() => [zC, zC]) }, scene).isPickable = false;
  const zL2 = zL.map(s => s.map(v => new Vector3(v.x, zY + .003, v.z)));
  MeshBuilder.CreateLineSystem('zone_border2', { lines: zL2, colors: zL2.map(() => [zC, zC]) }, scene).isPickable = false;

  // marcas en las esquinas para que se vea más claro el límite
  const tY = 0.010, tL = 0.8, tC = new Color4(0.15, 0.95, 0.55, 1.0);
  const tLines = [], tCols = [];
  [[-ZONE, -ZONE], [ZONE, -ZONE], [ZONE, ZONE], [-ZONE, ZONE]].forEach(([cx, cz]) => {
    const sx = cx < 0 ? 1 : -1, sz = cz < 0 ? 1 : -1;
    tLines.push([new Vector3(cx, tY, cz), new Vector3(cx + sx * tL, tY, cz)]);
    tLines.push([new Vector3(cx, tY, cz), new Vector3(cx, tY, cz + sz * tL)]);
    tCols.push([tC, tC]); tCols.push([tC, tC]);
  });
  MeshBuilder.CreateLineSystem('zone_ticks', { lines: tLines, colors: tCols }, scene).isPickable = false;

  // flechas de dimensión que muestran el ancho y largo de la zona
  const aY = 0.010, arC = new Color4(0.15, 0.95, 0.55, 0.9), aLen = 0.35;
  const bL = [
    [new Vector3(-ZONE, aY, -ZONE - 1.4), new Vector3(ZONE, aY, -ZONE - 1.4)],
    [new Vector3(-ZONE, aY, -ZONE - 1.1), new Vector3(-ZONE, aY, -ZONE - 1.7)],
    [new Vector3(ZONE, aY, -ZONE - 1.1), new Vector3(ZONE, aY, -ZONE - 1.7)],
    [new Vector3(-ZONE, aY, -ZONE - 1.4), new Vector3(-ZONE + aLen, aY, -ZONE - 1.4 + aLen * .5)],
    [new Vector3(-ZONE, aY, -ZONE - 1.4), new Vector3(-ZONE + aLen, aY, -ZONE - 1.4 - aLen * .5)],
    [new Vector3(ZONE, aY, -ZONE - 1.4), new Vector3(ZONE - aLen, aY, -ZONE - 1.4 + aLen * .5)],
    [new Vector3(ZONE, aY, -ZONE - 1.4), new Vector3(ZONE - aLen, aY, -ZONE - 1.4 - aLen * .5)],
  ];
  MeshBuilder.CreateLineSystem('arrow_h', { lines: bL, colors: bL.map(() => [arC, arC]) }, scene).isPickable = false;
  const rL = [
    [new Vector3(ZONE + 1.4, aY, -ZONE), new Vector3(ZONE + 1.4, aY, ZONE)],
    [new Vector3(ZONE + 1.1, aY, -ZONE), new Vector3(ZONE + 1.7, aY, -ZONE)],
    [new Vector3(ZONE + 1.1, aY, ZONE), new Vector3(ZONE + 1.7, aY, ZONE)],
    [new Vector3(ZONE + 1.4, aY, -ZONE), new Vector3(ZONE + 1.4 + aLen * .5, aY, -ZONE + aLen)],
    [new Vector3(ZONE + 1.4, aY, -ZONE), new Vector3(ZONE + 1.4 - aLen * .5, aY, -ZONE + aLen)],
    [new Vector3(ZONE + 1.4, aY, ZONE), new Vector3(ZONE + 1.4 + aLen * .5, aY, ZONE - aLen)],
    [new Vector3(ZONE + 1.4, aY, ZONE), new Vector3(ZONE + 1.4 - aLen * .5, aY, ZONE - aLen)],
  ];
  MeshBuilder.CreateLineSystem('arrow_v', { lines: rL, colors: rL.map(() => [arC, arC]) }, scene).isPickable = false;

  buildMeasurementUI();
  aplicarTexturasExistentes();                                   // Presentación 20-nov · Bloque A: textura de tierra en el suelo
}

// crea el panel de medidas y las etiquetas 3D proyectadas en pantalla
function buildMeasurementUI() {
  const card = document.createElement('div');
  card.id = 'measure-panel';
  card.innerHTML = `
    <div class="mp-title">📐 Zona de Construcción</div>
    <div class="mp-grid">
      <div class="mp-side"><span class="mp-icon">↔</span><span class="mp-val">20 m</span><span class="mp-sub">Ancho</span></div>
      <div class="mp-divider"></div>
      <div class="mp-side"><span class="mp-icon">↕</span><span class="mp-val">20 m</span><span class="mp-sub">Largo</span></div>
    </div>
    <div class="mp-area"><span class="mp-area-label">Área total</span><span class="mp-area-val">400 m²</span></div>
    <div class="mp-scale">Escala 1:1 · 1 cuadro = 1 m</div>`;
  document.body.appendChild(card);

  const ZONE = 10;
  const labelDefs = [
    { id: 'wlbl_bottom', p: new Vector3(0, 0.05, -ZONE - 1.4), text: '20 m' },
    { id: 'wlbl_right', p: new Vector3(ZONE + 1.4, 0.05, 0), text: '20 m' },
  ];
  labelDefs.forEach(({ id, text }) => {
    const el = document.createElement('div');
    el.id = id; el.className = 'world-label'; el.textContent = text;
    document.body.appendChild(el);
  });
  scene.registerAfterRender(() => {
    labelDefs.forEach(({ id, p }) => {
      const el = document.getElementById(id);
      if (!el || !camera) return;
      const proj = Vector3.Project(p, Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
      if (proj.z < 0 || proj.z > 1) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.style.left = Math.round(proj.x) + 'px';
      el.style.top = Math.round(proj.y) + 'px';
    });
  });
}

// funciones que arman cada tipo de objeto con sus piezas y materiales
const BUILDERS = {
  block(root) {
    const b = box('blk_body', 1.0, 0.7, 0.5, 0, 0.35, 0, MAT.block);
    b.parent = root;
  },
  madera(root) {
    box('mad_body', 1.0, 0.2, 0.2, 0, 0.1, 0, MAT.madera).parent = root;
    for (let i = 0; i < 4; i++) {
      const gm = new PBRMaterial('grain' + i + objIdCounter, scene);
      gm.albedoColor = new Color3(0.28, 0.16, 0.06); gm.roughness = 0.9;
      box('mad_g' + i, 0.01, 0.2, 0.2, -0.38 + i * 0.25, 0.1, 0, gm).parent = root;
    }
  },
  lamina(root) {
    const b = box('lam_body', 1.0, 0.05, 1.0, 0, 0.025, 0, MAT.lamina);
    b.parent = root;
    for (let i = -0.4; i <= 0.4; i += 0.2) {
      box('lam_rib' + i, 0.03, 0.02, 1.0, i, 0.045, 0, MAT.metal).parent = root;
    }
  },
  foco(root) {
    cyl('foco_base', 0.14, 0.14, 0.05, 0, 0.025, 0, MAT.lampBase, 14).parent = root;
    cyl('foco_neck', 0.05, 0.05, 0.12, 0, 0.10, 0, MAT.lampBase, 8).parent = root;
    const bulb = sph('foco_bulb', 0.12, 0, 0.25, 0, null);
    const bm = new StandardMaterial('focoM' + objIdCounter, scene);
    bm.emissiveColor = new Color3(1.0, 0.95, 0.75);
    bulb.material = bm; bulb.parent = root;
    const lpt = new PointLight('focoL' + objIdCounter, new Vector3(0, 0.22, 0), scene);
    lpt.intensity = 0.9; lpt.range = 8; lpt.diffuse = new Color3(1, 0.92, 0.65); lpt.parent = root;
  },
  puerta(root) {
    box('pta_fr', 1.0, 2.5, 0.2, 0, 1.25, 0, MAT.trim).parent = root;
    box('pta_leaf', 0.9, 2.3, 0.08, 0, 1.25, 0.07, MAT.doorMat).parent = root;
    [[-0.22, 1.8], [0.22, 1.8], [-0.22, 1.1], [0.22, 1.1]].forEach(([ox, oy], i) => {
      box('pta_pan' + i, 0.32, 0.48, 0.05, ox, oy, 0.08, MAT.wallLight).parent = root;
    });
    const kn = cyl('pta_kn', 0.025, 0.025, 0.22, 0.28, 1.2, 0.12, MAT.metal, 8);
    kn.rotation.x = Math.PI / 2; kn.parent = root;
  },
  barillas(root) {
    [[-0.3, 0], [0, 0], [0.3, 0]].forEach(([px, pz], i) => {
      cyl('bar_rod' + i, 0.025, 0.025, 1.4, px, 0.7, pz, MAT.barillas, 8).parent = root;
    });
    [0.25, 0.65, 1.05].forEach((y, i) => {
      box('bar_wire' + i, 0.7, 0.018, 0.018, 0, y, 0, MAT.barillas).parent = root;
    });
  },
  ventana(root) {
    box('win_fr', 1.2, 1.4, 0.2, 0, 0.7, 0, MAT.winFrame).parent = root;
    box('win_gl', 1.0, 1.2, 0.08, 0, 0.7, 0.07, MAT.glass).parent = root;
    box('win_h', 1.0, 0.05, 0.11, 0, 0.7, 0.08, MAT.winFrame).parent = root;
    box('win_v', 0.05, 1.2, 0.11, 0, 0.7, 0.08, MAT.winFrame).parent = root;
    box('win_sl', 1.35, 0.09, 0.28, 0, -0.02, 0.09, MAT.trim).parent = root;
  },
  concreto(root) {
    box('con_body', 1.0, 0.2, 1.0, 0, 0.1, 0, MAT.concreto).parent = root;
    const lm = new PBRMaterial('conLines' + objIdCounter, scene);
    lm.albedoColor = new Color3(0.60, 0.58, 0.55); lm.roughness = 0.9;
    box('con_l1', 0.01, 0.2, 1.0, 0.33, 0.1, 0, lm).parent = root;
    box('con_l2', 0.01, 0.2, 1.0, -0.33, 0.1, 0, lm).parent = root;
  },
  vitropiso(root) {
    box('vit_body', 1.0, 0.04, 1.0, 0, 0.02, 0, MAT.vitropiso).parent = root;
    const gm = new PBRMaterial('grout' + objIdCounter, scene);
    gm.albedoColor = new Color3(0.82, 0.82, 0.85); gm.roughness = 0.88;
    box('vit_gx', 1.0, 0.04, 0.02, 0, 0.025, 0, gm).parent = root;
    box('vit_gz', 0.02, 0.04, 1.0, 0, 0.025, 0, gm).parent = root;
  },
  lampara(root) {
    // Base del poste
    cyl('lamp_post', 0.06, 0.08, 2.0, 0, 1.0, 0, MAT.lampBase, 10).parent = root;
    // Cabezal curvo
    cyl('lamp_head', 0.22, 0.22, 0.12, 0, 2.12, 0, MAT.lampBase, 18).parent = root;
    // Tapa
    cyl('lamp_cap', 0.26, 0.22, 0.06, 0, 2.21, 0, MAT.lampBase, 18).parent = root;
    // Foco emisor
    const bulb = sph('lamp_bulb', 0.14, 0, 2.0, 0, null);
    const bm = new StandardMaterial('lamparaM' + objIdCounter, scene);
    bm.emissiveColor = new Color3(0, 0, 0); // apagado por defecto
    bm.diffuseColor = new Color3(1.0, 0.95, 0.75);
    bulb.material = bm; bulb.parent = root;
    // Luz puntual
    const lpt = new PointLight('lamparaL' + objIdCounter, new Vector3(0, 2.0, 0), scene);
    lpt.intensity = 0; lpt.range = 14; lpt.diffuse = new Color3(1, 0.92, 0.65); lpt.parent = root;
    // Marcar como lampara para restriccion de esquina
    root.userData = root.userData || {};
    root.userData.isLampara = true;
  },
};

// Fase 4: los datos vienen de materiales.js; se conservan las mismas formas de acceso LABELS[tipo], EMOJIS[tipo] y RESISTANCE[tipo].
const LABELS = Object.fromEntries(Object.entries(MATERIALES).map(([k, m]) => [k, m.label]));
const EMOJIS = Object.fromEntries(Object.entries(MATERIALES).map(([k, m]) => [k, m.emoji]));
const RESISTANCE = Object.fromEntries(Object.entries(MATERIALES).filter(([, m]) => m.resistencia !== null).map(([k, m]) => [k, m.resistencia]));

// límites de la zona de construcción y mínimo en Y
const BUILD_ZONE = 10;
const GROUND_HALF_SIZE = 13;
const MIN_Y = 0;

function clampToZone(root) {
  // La lámpara puede recorrer todo el terreno, incluida la zona azul exterior.
  const zone = root.userData?.type === 'lampara' || root.userData?.isLampara
    ? GROUND_HALF_SIZE : BUILD_ZONE;
  const children = root.getChildMeshes();
  if (children.length === 0) {
    root.position.x = Math.max(-zone + 0.5, Math.min(zone - 0.5, root.position.x));
    root.position.z = Math.max(-zone + 0.5, Math.min(zone - 0.5, root.position.z));
    if (root.position.y < MIN_Y) root.position.y = MIN_Y;
    return;
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  children.forEach(m => {
    m.computeWorldMatrix(true);
    const bi = m.getBoundingInfo();
    if (!bi) return;
    const mn = bi.boundingBox.minimumWorld;
    const mx = bi.boundingBox.maximumWorld;
    if (mn.x < minX) minX = mn.x;
    if (mx.x > maxX) maxX = mx.x;
    if (mn.z < minZ) minZ = mn.z;
    if (mx.z > maxZ) maxZ = mx.z;
  });
  const halfW = (maxX - minX) / 2;
  const halfD = (maxZ - minZ) / 2;
  const limitX = zone - halfW;
  const limitZ = zone - halfD;
  root.position.x = Math.max(-limitX, Math.min(limitX, root.position.x));
  root.position.z = Math.max(-limitZ, Math.min(limitZ, root.position.z));
  if (root.position.y < MIN_Y) root.position.y = MIN_Y;
}

// ── Colisión entre bloques (Block y Madera) ─────────────────────────────────
// Se consideran "bloques" las piezas sueltas del catálogo (Block, Madera) y las paredes
// de Block/Madera que se crean con "Construir". Cada una tiene un hitbox ORIENTADO (OBB)
// calculado con las medidas reales de sus mallas (p. ej. Block 1.0×0.7×0.5; una pared 4×4
// = 4 de ancho × 2.8 de alto × 0.5 de grosor), de modo que respeta también las rotaciones
// de Q/E/R/F/T/G. Dos bloques se consideran superpuestos cuando sus hitbox se penetran más
// de COLLISION_TOLERANCE (tocarse o apoyarse uno sobre otro sí se permite).
const COLLISION_TYPES = ['block', 'madera', 'lamina', 'wall_block', 'wall_madera', 'wall_lamina'];
const COLLISION_TOLERANCE = 0.03; // margen permitido de penetración, en unidades de la escena

// Hitbox del bloque: centro, ejes locales (en mundo) y semi-medidas a lo largo de cada eje.
// Las medidas locales se calculan una vez por bloque (se recalculan si cambia su número de
// mallas); en cada comprobación solo se aplica la transformación actual del bloque.
// Las puertas/ventanas incrustadas en una pared no forman parte del hitbox de la pared.
const hitboxLocal = new WeakMap();
function getBlockHitbox(node) {
  node.computeWorldMatrix(true);
  const world = node.getWorldMatrix();
  const embebida = m => {
    for (let p = m.parent; p && p !== node; p = p.parent) if (p.userData?.embeddedInWall) return true;
    return false;
  };
  const todas = node.getChildMeshes();
  let loc = hitboxLocal.get(node);
  if (!loc || loc.n !== todas.length) {
    const propias = todas.filter(m => !embebida(m));
    const mallas = propias.length ? propias : todas;
    const inv = world.clone().invert();
    const mn = new Vector3(Infinity, Infinity, Infinity);
    const mx = new Vector3(-Infinity, -Infinity, -Infinity);
    mallas.forEach(m => {
      m.computeWorldMatrix(true);
      m.getBoundingInfo().boundingBox.vectorsWorld.forEach(corner => {
        const local = Vector3.TransformCoordinates(corner, inv); // al espacio local del bloque
        mn.minimizeInPlace(local);
        mx.maximizeInPlace(local);
      });
    });
    if (!isFinite(mn.x)) return null;
    loc = { n: todas.length, c: mn.add(mx).scale(0.5), h: [(mx.x - mn.x) / 2, (mx.y - mn.y) / 2, (mx.z - mn.z) / 2] };
    hitboxLocal.set(node, loc);
  }
  const axes = [Vector3.Right(), Vector3.Up(), Vector3.Forward()].map(v => Vector3.TransformNormal(v, world));
  const scale = axes.map(a => a.length());
  return {
    c: Vector3.TransformCoordinates(loc.c, world),
    u: axes.map((a, i) => a.scale(1 / scale[i])),
    e: [loc.h[0] * scale[0], loc.h[1] * scale[1], loc.h[2] * scale[2]],
  };
}

// Profundidad de penetración entre dos hitbox orientados (teorema de ejes separadores, 15 ejes).
// Devuelve 0 si existe algún eje que los separa (no se superponen).
function obbPenetration(a, b) {
  const t = b.c.subtract(a.c);
  let min = Infinity;
  const test = axis => {
    const len = axis.length();
    if (len < 1e-6) return true; // eje degenerado (aristas paralelas): no separa
    const n = axis.scale(1 / len);
    const ra = a.e[0] * Math.abs(Vector3.Dot(a.u[0], n)) + a.e[1] * Math.abs(Vector3.Dot(a.u[1], n)) + a.e[2] * Math.abs(Vector3.Dot(a.u[2], n));
    const rb = b.e[0] * Math.abs(Vector3.Dot(b.u[0], n)) + b.e[1] * Math.abs(Vector3.Dot(b.u[1], n)) + b.e[2] * Math.abs(Vector3.Dot(b.u[2], n));
    const overlap = ra + rb - Math.abs(Vector3.Dot(t, n));
    if (overlap <= 0) return false;
    if (overlap < min) min = overlap;
    return true;
  };
  for (const ax of [...a.u, ...b.u]) if (!test(ax)) return 0;
  for (const ua of a.u) for (const ub of b.u) if (!test(Vector3.Cross(ua, ub))) return 0;
  return min;
}

// Devuelve el bloque ya colocado con el que `node` se superpone, o null si está libre.
function findBlockCollision(node) {
  if (!COLLISION_TYPES.includes(node.userData?.type)) return null;
  const a = getBlockHitbox(node);
  if (!a) return null;
  for (const o of objList) {
    if (o.node === node || !COLLISION_TYPES.includes(o.type)) continue;
    const b = getBlockHitbox(o.node);
    if (b && obbPenetration(a, b) > COLLISION_TOLERANCE) return o;
  }
  return null;
}

// Para bloques nuevos (creados o clonados): conserva la posición si está libre; si no,
// prueba las alternativas dadas. Devuelve false si no hay ninguna libre (no se coloca).
function colocarSinSolapar(root, candidatos) {
  if (!findBlockCollision(root)) return true;
  for (const [x, z] of candidatos) {
    root.position.x = x;
    root.position.z = z;
    clampToZone(root);
    if (!findBlockCollision(root)) return true;
  }
  return false;
}

// Al mover o rotar un bloque ya colocado: nunca se acepta una posición/rotación que lo meta
// dentro de otro. El movimiento se recorre en pasos desde el último estado válido, así un
// arrastre rápido no puede "saltar" a través de otro bloque; se queda en el punto de contacto.
const blockEstado = new WeakMap(); // último estado válido de cada bloque
let blockAvisoTs = 0;
const blockSig = n => [n.position.x, n.position.y, n.position.z, n.rotation.x, n.rotation.y, n.rotation.z]
  .map(v => v.toFixed(4)).join('|');

function enforceBlockCollision(node) {
  if (!COLLISION_TYPES.includes(node.userData?.type)) return;
  const st = blockEstado.get(node);
  const sig = blockSig(node);
  if (st && st.sig === sig) return; // no se movió desde la última comprobación
  const guardarValido = () => blockEstado.set(node, { sig: blockSig(node), pos: node.position.clone(), rot: node.rotation.clone(), valido: true });

  if (!st || !st.valido) {
    // Sin estado válido previo (p. ej. un bloque que ya venía superpuesto en un guardado):
    // se deja moverlo libremente hasta que quede libre; desde ahí ya se aplica la regla.
    if (!findBlockCollision(node)) guardarValido(); else blockEstado.set(node, { sig, valido: false });
    return;
  }

  const destino = node.position.clone();
  const rotCambio = !node.rotation.equals(st.rot);
  let libre = !rotCambio ? destino : st.pos.clone();
  if (!rotCambio) {
    const pasos = Math.min(120, Math.max(1, Math.ceil(Vector3.Distance(st.pos, destino) / 0.1)));
    libre = st.pos.clone();
    let bloqueado = false;
    for (let i = 1; i <= pasos; i++) {
      node.position.copyFrom(Vector3.Lerp(st.pos, destino, i / pasos));
      if (findBlockCollision(node)) { bloqueado = true; break; }
      libre = node.position.clone();
    }
    if (!bloqueado) { node.position.copyFrom(destino); guardarValido(); return; }
  } else if (!findBlockCollision(node)) {
    guardarValido();
    return;
  }

  // Superpone: se vuelve al último punto libre (y a la rotación válida)
  node.position.copyFrom(libre);
  node.rotation.copyFrom(st.rot);
  guardarValido();
  if (Date.now() - blockAvisoTs > 1500) {
    blockAvisoTs = Date.now();
    setTip('🧱 No se puede colocar ahí: el bloque se superpondría con otro bloque');
  }
}

// desbloquea fases en orden: primero piso, luego paredes, luego todo
function unlockPhase1() {
  // Desbloquea Crear Concreto despues de Matematicas
  buildPhase = 1;
  const btnStorm = document.getElementById('btnStorm');
  if (btnStorm) { btnStorm.disabled = false; btnStorm.style.opacity = ''; btnStorm.title = ''; }
  setTip('Matematicas completadas! Ahora crea el concreto con el boton Crear Concreto');
}
function unlockPhase2() {
  // Desbloquea Construir despues de Concreto
  concretoUnlocked = true;
  buildPhase = 2;
  const btnWall = document.getElementById('btnWall');
  if (btnWall) { btnWall.disabled = false; btnWall.style.opacity = ''; btnWall.title = ''; }
  document.getElementById('cat-concreto').style.display = '';
  setTip('Concreto creado! Ahora construye con el boton Construir');
}
function unlockAll() {
  // Desbloquea Programar cuando hay al menos 4 paredes
  buildPhase = 4;
  document.getElementById('btnNight').disabled = false;
  ['cat-block', 'cat-madera', 'cat-lamina', 'cat-foco', 'cat-puerta', 'cat-ventana', 'cat-vitropiso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('cat-disabled');
  });
  const btnProg = document.getElementById('btnProgramar');
  if (btnProg) { btnProg.disabled = false; btnProg.style.opacity = ''; btnProg.title = ''; }
  setTip('Programacion desbloqueada! Tienes 4 o mas paredes. Ya puedes programar tu casa.');
}

// Fase 3: recalcula los botones de etapas según el modo y el progreso real, SIN modificar
// buildPhase, concretoUnlocked ni matematicasValidadas. Solo se llama al (des)activar el modo libre.
function aplicarEstadoBotonesEtapas() {
  const slab = objList.some(o => o.type === 'concreto_slab_20');
  const fijar = (id, habilitado, titulo) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.disabled = !habilitado;
    b.style.opacity = habilitado ? '' : '0.45';
    b.title = habilitado ? '' : titulo;
  };
  fijar('btnStorm', !slab && (modoLibreActivo || buildPhase >= 1),
    slab ? '🪨 Ya tienes el concreto creado. Elimínalo primero para poder crearlo de nuevo.' : 'Completa primero Calcular Área');
  fijar('btnWall', modoLibreActivo || concretoUnlocked, 'Crea el concreto primero');
  if (modoLibreActivo || buildPhase >= 4) {
    fijar('btnProgramar', true, '');
    checkAndUpdateProgramarBtn(); // mantiene validateHouse como validación real
  } else {
    fijar('btnProgramar', false, 'Construye al menos 4 paredes primero');
  }
}
function toggleModoLibre() {
  modoLibreActivo = !modoLibreActivo;
  const btn = document.getElementById('btnLibre');
  if (btn) {
    btn.textContent = modoLibreActivo ? '🔓 Construcción libre: ON' : '🔒 Construcción libre: OFF';
    btn.classList.toggle('active', modoLibreActivo);
  }
  aplicarEstadoBotonesEtapas();
}
window.toggleModoLibre = toggleModoLibre;
// Cuenta solo paredes reales (wall_block, wall_madera o wall_lamina)
function countWalls() {
  return objList.filter(o => o.type === 'wall_block' || o.type === 'wall_madera' || o.type === 'wall_lamina').length;
}

function addObjIfAllowed(type) {
  // Solo una lámpara; la existente se puede seleccionar y mover.
  if (type === 'lampara') {
    const existing = objList.find(o => o.type === 'lampara');
    if (existing) {
      selectObject(existing.node);
      setTip('🔦 Ya tienes una lámpara · Arrastra las flechas de colores para moverla');
      return;
    }
  }
  addObj(type);
}

// F2.4a · Nacimiento sobre la losa u otras piezas.
// Antes toda pieza nueva nacía con el origen de su raíz en y = 0, es decir, hundida 20 cm dentro de la losa.
// Convención de base: el `y` de la pieza es el ORIGEN de su raíz (no la base geométrica de su caja envolvente): una ventana
// cuyo alféizar baja 6,5 cm del origen sigue naciendo con el origen en la cota de apoyo.
// Tipos afectados (los que el catálogo envía a addObj): lista cerrada. barillas (sin botón), duplicar, floor_vitropiso (ya usa
// 0,21), muros, techos y cerchas no pasan por aquí.
const TIPOS_NACIMIENTO = ['block', 'madera', 'lamina', 'foco', 'puerta', 'ventana', 'lampara', 'vitropiso', 'concreto'];
// Soportes del nacimiento: la losa y las piezas sueltas. Los muros no cuentan (una puerta nacida dentro de un muro no debe
// subirse a su corona a 2,8 m); en esa posición solo vale la losa o el suelo, como antes.
const TIPOS_SOPORTE_NACIMIENTO = ['concreto_slab_20', 'concreto', 'block', 'madera', 'lamina'];

// Devuelve la `y` del origen de la raíz para que la pieza nazca apoyada, o null si no hay nada bajo ella (suelo desnudo: y = 0).
// Usa una CAJA DE SONDEO: las mismas dimensiones y orientación que la pieza real, con la `y` elevada por encima de cualquier
// tope. Hace falta porque buscarApoyo descarta los apoyos cuyo tope supera el de la propia pieza, y una lámina (5 cm) o un
// vitropiso (4 cm) nacidos en y = 0 no «verían» la losa (tope 0,2). La sonda es un objeto local: no se renderiza, no se
// añade a la escena ni a objList y no se serializa.
function alturaNacimiento(root, type) {
  if (!TIPOS_NACIMIENTO.includes(type)) return null;
  const caja = getBlockHitbox(root);
  if (!caja) return null;
  const soportes = objList
    .filter(o => TIPOS_SOPORTE_NACIMIENTO.includes(o.type))
    .map(o => ({ id: o.id, caja: getBlockHitbox(o.node) }))
    .filter(o => o.caja);
  if (!soportes.length) return null;
  const topeMaximo = Math.max(...soportes.map(o => limitesCaja(o.caja).max.y));
  const subir = (topeMaximo + 1) - limitesCaja(caja).min.y;
  const sonda = { c: { x: caja.c.x, y: caja.c.y + subir, z: caja.c.z }, u: caja.u, e: caja.e };
  const apoyo = buscarApoyo(sonda, soportes);
  return apoyo.tipo === 'pieza' ? apoyo.altura : null;
}

function addObj(type) {
  const id = objIdCounter++;
  const root = new TransformNode('obj_' + id + '_' + type, scene);
  root.position.x = (Math.random() - .5) * (BUILD_ZONE * 1.5);
  root.position.z = (Math.random() - .5) * (BUILD_ZONE * 1.5);
  root.position.y = 0;
  clampToZone(root);
  BUILDERS[type](root);
  root.getChildMeshes().forEach(m => {
    if (shadowGen) shadowGen.addShadowCaster(m, false);
  });
  root.userData = { id, type, label: LABELS[type], emoji: EMOJIS[type] };
  if (COLLISION_TYPES.includes(type)) {
    const otros = Array.from({ length: 80 }, () => [(Math.random() - .5) * (BUILD_ZONE * 1.5), (Math.random() - .5) * (BUILD_ZONE * 1.5)]);
    if (!colocarSinSolapar(root, otros)) {
      root.getChildMeshes().forEach(m => { if (shadowGen) shadowGen.removeShadowCaster(m); });
      root.dispose();
      showLockedMessage('🧱 No hay espacio libre para colocar otro bloque sin que se superponga con los existentes.');
      return;
    }
  }
  const yNacimiento = alturaNacimiento(root, type);
  if (yNacimiento !== null) root.position.y = yNacimiento;
  objList.push({ id, type, label: LABELS[type], emoji: EMOJIS[type], node: root });
  updateObjListUI(); selectObject(root);
  setTip(`<b>${EMOJIS[type]} ${LABELS[type]}</b> añadido · Arrastra las flechas de colores para moverlo · Q/E para rotar`);
  if (COLORABLE_TYPES.includes(type)) openColorPicker(root);
  try {
    registrar('objeto_colocado', {
      pos_x: root.position.x, pos_y: root.position.y, pos_z: root.position.z,
      contexto: { tipo: type, id: id }
    });
  } catch (e) { }
  marcarSucio();
}

// ── F1 · Cámara libre con colisión nativa de Babylon y «rayos X» ──────────────
// Parámetros de navegación del simulador (no son datos de la base documental).
const CAMARA_F1 = Object.freeze({
  radioMinimo: 1.2,               // m: permite acercarse hasta el interior de la vivienda (antes 5)
  betaMaximo: Math.PI / 2 - 0.02, // rad: vista casi a la altura del objetivo (antes Math.PI / 2.05)
  botonDesplazar: 1,              // botón central; el derecho queda para el menú contextual de cortar
  desplazamientoMaximo: 25,       // m que el objetivo puede alejarse del origen al desplazar
  radioColision: 0.35,            // m: «cuerpo» de la cámara para no rozar los muros
});
// Tipos que la cámara no atraviesa: muros y piezas sueltas de block, madera y lámina.
// Puertas y ventanas no bloquean (son vanos); techos, pisos y losa tampoco en F1.
// F4d (P7): las paredes generadas del plano (objeto agregado «paredes_plano») también bloquean la cámara; Rayos X las atraviesa como al resto.
const TIPOS_SOLIDOS_CAMARA = [...COLLISION_TYPES, 'paredes_plano'];
let rayosXActivo = false; // solo de sesión: nunca se guarda ni se serializa

function configurarCamaraLibre() {
  // Ratón: izquierdo orbita, central desplaza. El derecho no mueve la cámara.
  const punteros = camera.inputs.attached.pointers;
  if (punteros) punteros.buttons = [0, CAMARA_F1.botonDesplazar];
  camera.panningDistanceLimit = CAMARA_F1.desplazamientoMaximo;
  // Colisión nativa (sin motor de física): la cámara se detiene al tocar un mesh con checkCollisions.
  scene.collisionsEnabled = true;
  camera.checkCollisions = !rayosXActivo;
  camera.collisionRadius = new Vector3(CAMARA_F1.radioColision, CAMARA_F1.radioColision, CAMARA_F1.radioColision);
  // El objetivo no baja del nivel del terreno, así la cámara nunca queda bajo el suelo.
  scene.registerBeforeRender(() => {
    if (camera.target.y < 0) camera.target.y = 0;
  });
  crearBotonRayosX();
}

function sincronizarColisionesCamara() {
  objList.forEach(o => {
    const solido = TIPOS_SOLIDOS_CAMARA.includes(o.type);
    o.node?.getChildMeshes().forEach(m => { m.checkCollisions = solido; });
  });
}

function actualizarBotonRayosX() {
  const btn = document.getElementById('btnRayosX');
  if (!btn) return;
  btn.textContent = rayosXActivo ? '🩻 Rayos X: ON' : '🩻 Rayos X: OFF';
  btn.classList.toggle('active', rayosXActivo);
}

function toggleRayosX() {
  rayosXActivo = !rayosXActivo;
  if (camera) camera.checkCollisions = !rayosXActivo;
  actualizarBotonRayosX();
  setTip(rayosXActivo
    ? '🩻 <b>Rayos X activado:</b> la cámara puede atravesar muros para inspeccionar la vivienda.'
    : '🧱 <b>Rayos X desactivado:</b> la cámara vuelve a detenerse en los muros.');
}
window.toggleRayosX = toggleRayosX;

// El botón se crea desde aquí para no modificar sandbox.html; usa el mismo estilo que los demás.
function crearBotonRayosX() {
  if (document.getElementById('btnRayosX')) return;
  const ref = document.getElementById('btnNight');
  if (!ref) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.id = 'btnRayosX';
  btn.title = 'Permite que la cámara atraviese muros (solo para observar; no cambia la construcción)';
  btn.addEventListener('click', toggleRayosX);
  ref.insertAdjacentElement('afterend', btn);
  actualizarBotonRayosX();
}

// ── F2.2 · Avisos de colocación (solo informativos) ───────────────────────────
// Solo LEE: nunca mueve, bloquea ni corrige la pieza. F2.3: UN solo criterio. clasificarColocacion (manipulacion.js)
// decide apoyada/flotante/hundida/superpuesta Y el contacto (área exacta; umbral PARAMETROS_MANIPULACION.contactoMinimo);
// la superposición viene de findBlockCollision. El estado vive en node.userData.estadoColocacion,
// es transitorio de sesión y guardado.js no lo serializa (serializarObjeto copia solo campos explícitos).
// Se evalúa al seleccionar, al soltar el gizmo y tras girar con teclado; nunca por fotograma.
const OUTLINE_SELECCION = Color3.FromHexString('#1565C0');
const OUTLINE_ERROR = Color3.FromHexString('#C62828');
const OUTLINE_CANDIDATA = Color3.FromHexString('#F9A825').scale(0.55); // ámbar tenue: pieza candidata a apoyo
const AVISO_UI = Object.freeze({
  apoyada: { texto: 'Apoyada', color: '#2E7D32' },
  flotante: { texto: 'Flotante', color: '#F9A825' },
  hundida: { texto: 'Hundida', color: '#FBC02D' },
  superpuesta: { texto: 'Superpuesta', color: '#C62828' },
});
const AVISO_HISTORIAL_MAX = 5;
// Piezas a las que se les evalúa la colocación (las manipulables de F2) y piezas que pueden servir de apoyo.
const TIPOS_AVISO = ['block', 'madera', 'lamina', 'puerta', 'ventana', 'foco', 'lampara', 'floor_vitropiso'];
const TIPOS_APOYO_AVISO = [...COLLISION_TYPES, 'concreto_slab_20', 'concreto'];
const svgAviso = d => '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" ' +
  'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const AVISO_ICONOS = Object.freeze({
  apoyada: svgAviso('<circle cx="10" cy="10" r="7.5"/><path d="M6.5 10.5l2.5 2.5 4.5-5.5"/>'),
  flotante: svgAviso('<rect x="5" y="3.5" width="10" height="6" rx="1"/><path d="M3 16.5h14M10 11.5v3M8.5 13l1.5 1.5 1.5-1.5"/>'),
  hundida: svgAviso('<path d="M2.5 7h15"/><rect x="5.5" y="9" width="9" height="7.5" rx="1"/><path d="M10 2.5v3M8.5 4l1.5 1.5L11.5 4"/>'),
  superpuesta: svgAviso('<rect x="3" y="3" width="9.5" height="9.5" rx="1"/><rect x="7.5" y="7.5" width="9.5" height="9.5" rx="1"/>'),
});
let avisoHistorial = [];        // transitorio: últimos avisos mostrados, el más reciente primero
let avisoSonidoActivo = false;  // desactivado por defecto
let avisoPlano = null;          // plano translúcido (reutilizable) del área de contacto
let avisoHover = null;          // pieza candidata a apoyo resaltada en ámbar
let avisoAudio = null;

// Cajas {c,u,e} (formato de getBlockHitbox) de las piezas que pueden servir de apoyo a `node`.
// Una pieza sólida que PENETRA a `node` (misma regla que findBlockCollision) llega marcada con `penetra: true`:
// clasificarColocacion no la cuenta como apoyo (es una superposición, no un soporte), así no hay «hundida» respecto a ella.
// La losa y el concreto nunca se marcan como penetrantes (no son COLLISION_TYPES): siempre son apoyo.
function cajasApoyoAviso(node, caja) {
  return objList
    .filter(o => o.node !== node && TIPOS_APOYO_AVISO.includes(o.type))
    .map(o => ({ id: o.id, tipo: o.type, caja: getBlockHitbox(o.node) }))
    .filter(o => o.caja)
    .map(o => ({ ...o, penetra: COLLISION_TYPES.includes(o.tipo) && obbPenetration(caja, o.caja) > COLLISION_TOLERANCE }));
}

// Evalúa la colocación de `node`. Devuelve null si no se puede (sin geometría).
// Toda la decisión (estado, avisos simultáneos, contacto y zona) la toma clasificarColocacion; aquí solo se adapta
// al formato del panel: dy en cm (1 decimal) y contacto en % entero. No hay umbrales ni geometría de contacto en casa.js.
function evaluarColocacion(node) {
  const caja = getBlockHitbox(node);
  if (!caja) return null;
  const choque = findBlockCollision(node);
  const solapaCon = choque ? choque.id : null;
  const r = clasificarColocacion(caja, cajasApoyoAviso(node, caja), { solapaCon });
  return {
    estado: r.estado,
    avisos: r.avisos,
    dy: Math.round(r.separacion * 1000) / 10 + 0, // cm, 1 decimal (+ 0 evita -0)
    contacto: Math.round(r.contacto * 100),
    contactoBajo: r.contactoBajo,
    solapaCon: r.solapaCon,
    apoyo: r.apoyo,
    zona: r.zona,
  };
}

function aplicarOutlineAviso(node, color) {
  if (!node || !highlightLayer) return;
  node.getChildMeshes().forEach(c => { try { highlightLayer.removeMesh(c); highlightLayer.addMesh(c, color); } catch (e) { } });
}

function ocultarContactoAviso() { if (avisoPlano) avisoPlano.setEnabled(false); }

function mostrarContactoAviso(ev) {
  if (!ev.zona || !scene) { ocultarContactoAviso(); return; }
  if (!avisoPlano) {
    avisoPlano = MeshBuilder.CreateGround('aviso_contacto', { width: 1, height: 1 }, scene);
    const m = new StandardMaterial('aviso_contacto_mat', scene);
    m.disableLighting = true; m.backFaceCulling = false; m.alpha = 0.38;
    m.diffuseColor = Color3.Black(); m.specularColor = Color3.Black();
    avisoPlano.material = m;
    avisoPlano.isPickable = false; avisoPlano.receiveShadows = false; avisoPlano.checkCollisions = false;
  }
  const z = ev.zona;
  avisoPlano.scaling.set(Math.max(z.x1 - z.x0, 0.01), 1, Math.max(z.z1 - z.z0, 0.01));
  avisoPlano.position.set((z.x0 + z.x1) / 2, ev.apoyo.altura + 0.006, (z.z0 + z.z1) / 2);
  avisoPlano.material.emissiveColor = Color3.FromHexString(AVISO_UI[ev.estado].color);
  avisoPlano.setEnabled(true);
}

function quitarHoverAviso() {
  if (avisoHover && highlightLayer) {
    try { avisoHover.getChildMeshes().forEach(c => { try { highlightLayer.removeMesh(c); } catch (e) { } }); } catch (e) { }
  }
  avisoHover = null;
}

function borrarEstadosAviso() {
  objList.forEach(o => { if (o.node?.userData) delete o.node.userData.estadoColocacion; });
  if (selectedMesh?.userData) delete selectedMesh.userData.estadoColocacion;
}

// Oculta todo el aviso. conservarSeleccion: la pieza sigue seleccionada (p. ej. Escape) y recupera su outline azul.
function limpiarAvisoColocacion({ conservarSeleccion = false } = {}) {
  borrarEstadosAviso();
  quitarHoverAviso();
  ocultarContactoAviso();
  document.getElementById('aviso-alerta')?.classList.remove('visible');
  document.getElementById('aviso-panel')?.classList.remove('visible');
  if (conservarSeleccion && selectedMesh) aplicarOutlineAviso(selectedMesh, OUTLINE_SELECCION);
  actualizarBotonesApoyar(); // F2.4c (gancho 3/5): sin estado evaluado no hay botón «Apoyar»
}

function pintarAviso(node, ev) {
  const alerta = document.getElementById('aviso-alerta');
  const panel = document.getElementById('aviso-panel');
  if (!alerta || !panel) return;
  // Overlay de aviso: una fila por aviso (pueden ser varios); la apoyada no muestra overlay.
  alerta.replaceChildren();
  ev.avisos.forEach(k => {
    const fila = document.createElement('div');
    fila.className = 'aviso-chip';
    fila.dataset.estado = k;
    fila.style.setProperty('--aviso-color', AVISO_UI[k].color);
    fila.innerHTML = AVISO_ICONOS[k];
    const t = document.createElement('span');
    t.textContent = AVISO_UI[k].texto;
    fila.appendChild(t);
    alerta.appendChild(fila);
  });
  alerta.dataset.estado = ev.avisos.length ? ev.estado : '';
  alerta.classList.toggle('visible', ev.avisos.length > 0);
  // Panel de estado de la pieza (siempre visible mientras haya una pieza evaluable seleccionada).
  const col = AVISO_UI[ev.estado].color;
  panel.dataset.estado = ev.estado;
  panel.style.setProperty('--aviso-color', col);
  document.getElementById('aviso-icono').innerHTML = AVISO_ICONOS[ev.estado];
  document.getElementById('aviso-pieza').textContent = LABELS[node.userData.type] || node.userData.type;
  document.getElementById('aviso-estado').textContent = AVISO_UI[ev.estado].texto;
  const signo = ev.dy > 0 ? '+' : '';
  document.getElementById('aviso-dy').textContent = `${signo}${ev.dy.toFixed(1)} cm`;
  document.getElementById('aviso-contacto').textContent = `${ev.contacto} %`;
  panel.classList.add('visible');
}

function pintarHistorialAviso() {
  const lista = document.getElementById('aviso-hist');
  const n = document.getElementById('aviso-hist-n');
  if (n) n.textContent = String(avisoHistorial.length);
  if (!lista) return;
  lista.replaceChildren();
  avisoHistorial.forEach(h => {
    const li = document.createElement('li');
    const hora = new Date(h.t).toLocaleTimeString('es-MX', { hour12: false });
    li.textContent = `${hora} · ${h.label} · ${h.avisos.map(k => AVISO_UI[k].texto).join(' + ')} · Δy ${h.dy.toFixed(1)} cm`;
    lista.appendChild(li);
  });
}

function sonidoAviso() {
  try {
    avisoAudio = avisoAudio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = avisoAudio.createOscillator(), gain = avisoAudio.createGain(), t0 = avisoAudio.currentTime;
    osc.connect(gain); gain.connect(avisoAudio.destination);
    osc.type = 'sine'; osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.12, t0); gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    osc.start(t0); osc.stop(t0 + 0.2);
  } catch (e) { }
}

// Anota el aviso en el historial (solo si hay aviso y no repite al último) y lo envía a la telemetría existente.
function anotarAviso(node, ev) {
  if (!ev.avisos.length) return;
  const id = node.userData.id;
  const firma = `${id}|${ev.avisos.join('+')}|${ev.dy}`;
  if (avisoHistorial[0]?.firma === firma) return;
  avisoHistorial.unshift({ firma, t: Date.now(), id, tipo: node.userData.type, label: LABELS[node.userData.type] || node.userData.type, avisos: [...ev.avisos], dy: ev.dy });
  if (avisoHistorial.length > AVISO_HISTORIAL_MAX) avisoHistorial.length = AVISO_HISTORIAL_MAX;
  pintarHistorialAviso();
  try {
    registrar('aviso_colocacion', {
      pos_x: node.position.x, pos_y: node.position.y, pos_z: node.position.z,
      contexto: { tipo: node.userData.type, id, avisos: ev.avisos, dy_cm: ev.dy, contacto_pct: ev.contacto },
    });
  } catch (e) { }
  if (avisoSonidoActivo) sonidoAviso();
}

// Punto de entrada: recalcula y repinta el aviso de `node` (o lo limpia si no corresponde).
function actualizarAvisoColocacion(node) {
  if (vistaAlumnoId) return;
  if (!node || !TIPOS_AVISO.includes(node.userData?.type) || node.userData?.embeddedInWall) { limpiarAvisoColocacion(); return; }
  let ev = null;
  try { ev = evaluarColocacion(node); } catch (e) { ev = null; }
  if (!ev) { limpiarAvisoColocacion(); return; }
  borrarEstadosAviso();
  const error = ev.avisos.includes('superpuesta');
  node.userData.estadoColocacion = {
    estado: ev.estado, avisos: ev.avisos, dy: ev.dy, contacto: ev.contacto,
    solapaCon: ev.solapaCon, apoyoId: ev.apoyo.soporte, outline: error ? '#C62828' : '#1565C0', t: Date.now(),
  };
  aplicarOutlineAviso(node, error ? OUTLINE_ERROR : OUTLINE_SELECCION); // selección = azul; error = rojo
  mostrarContactoAviso(ev);
  pintarAviso(node, ev);
  anotarAviso(node, ev);
  actualizarBotonesApoyar(); // F2.4c (gancho 4/5): muestra o habilita «Apoyar» / «Deshacer» según el estado recién evaluado
}

// Evalúa en cuanto termina el siguiente fotograma, para ver la posición ya corregida por clampToZone/colisión.
function evaluarAvisoTrasFrame() {
  if (scene) scene.onAfterRenderObservable.addOnce(() => { if (selectedMesh) actualizarAvisoColocacion(selectedMesh); });
}

// Escape, sonido, historial plegable y resaltado ámbar de la pieza candidata a apoyo (hover).
function configurarAvisosColocacion() {
  if (vistaAlumnoId) return;
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && selectedMesh?.userData?.estadoColocacion) limpiarAvisoColocacion({ conservarSeleccion: true });
  });
  const chk = document.getElementById('aviso-sonido');
  if (chk) chk.addEventListener('change', () => { avisoSonidoActivo = chk.checked; });
  const btn = document.getElementById('aviso-hist-toggle');
  const lista = document.getElementById('aviso-hist');
  if (btn && lista) btn.addEventListener('click', () => { lista.hidden = !lista.hidden; btn.setAttribute('aria-expanded', String(!lista.hidden)); });
  let ultimo = 0, pendiente = null;
  // Resalta (ámbar) la pieza candidata a apoyo bajo el puntero. Solo lectura de la escena: no toca cámara ni selección.
  const resaltarCandidata = () => {
    if (!selectedMesh?.userData?.estadoColocacion) { quitarHoverAviso(); return; }
    const pick = scene.pick(scene.pointerX, scene.pointerY, m => m.isPickable && m.isVisible && m.isEnabled());
    let nodo = pick?.hit ? pick.pickedMesh : null;
    while (nodo && !nodo.userData?.type) nodo = nodo.parent;
    if (!nodo || nodo === selectedMesh || !COLLISION_TYPES.includes(nodo.userData.type)) { quitarHoverAviso(); return; }
    if (avisoHover === nodo) return;
    quitarHoverAviso();
    avisoHover = nodo;
    nodo.getChildMeshes().forEach(c => { try { highlightLayer.addMesh(c, OUTLINE_CANDIDATA); } catch (e) { } });
  };
  scene.onPointerObservable.add(info => {
    if (info.type !== PointerEventTypes.POINTERMOVE) return;
    // Solo con una pieza evaluada y sin botón pulsado: no interfiere con órbita, desplazamiento ni gizmo.
    if (!selectedMesh?.userData?.estadoColocacion || info.event?.buttons) {
      if (pendiente) { clearTimeout(pendiente); pendiente = null; }
      quitarHoverAviso(); return;
    }
    const ahora = performance.now();
    if (ahora - ultimo < 90) {
      // Limitado a ~11 evaluaciones/s; la última posición del puntero siempre se evalúa (evaluación diferida).
      if (!pendiente) pendiente = setTimeout(() => { pendiente = null; ultimo = performance.now(); resaltarCandidata(); }, 90);
      return;
    }
    ultimo = ahora;
    resaltarCandidata();
  });
  configurarApoyar(); // F2.4c (gancho 5/5): botón, atajos, aviso de caída y deshacer
}

// ── F2.4c · «Apoyar» explícito ────────────────────────────────────────────────
// Conecta desplazamientoParaApoyar (manipulacion.js, sin cambios) con un botón del panel de F2.2 y el atajo A.
// Solo BAJA piezas flotantes (estado `flotante`, Δ número): nunca se apoya sola; el alumno lo pide. Animación de 200 ms
// (ease-out). Si |Δ| > 2 m se pide confirmación. «Deshacer» revierte solo el último «Apoyar» (una ranura, transitoria).
// Nada de esto se guarda: la nueva `y` se persiste como cualquier movimiento (p[1], marcarSucio); el estado de la
// animación, de la confirmación y del deshacer vive en variables de módulo, no en userData ni en el estado v2.
const APOYAR_DURACION_MS = 200;
const APOYAR_FPS = 60;
const APOYAR_CAIDA_MAXIMA = 2; // m: |Δ| estrictamente mayor pide confirmación
let apoyarEnCurso = null;      // { nodo, y0, y1, estadoAnterior, anim, cancelada } mientras dura la animación (C2)
let apoyarConfirmando = null;  // { nodo, dy, estadoAnterior } mientras el aviso de caída está abierto
let apoyarUndo = null;         // { nodo, y0, dy, firma } del último «Apoyar»

// Δy (m) que propone manipulacion.js para el nodo, o null. Mismas cajas (con la marca `penetra`) que usa el aviso F2.2.
function desplazamientoApoyo(node) {
  try {
    const caja = getBlockHitbox(node);
    return caja ? desplazamientoParaApoyar(caja, cajasApoyoAviso(node, caja)) : null;
  } catch (e) { return null; }
}

const apoyarDatos = node => ({ pos_x: node.position.x, pos_y: node.position.y, pos_z: node.position.z });

// Visibilidad y estado de los dos botones. «Apoyar»: visible solo con estado `flotante`; habilitado solo si Δ es número y
// no hay animación en curso (C2). «Deshacer»: visible solo para la pieza del último «Apoyar», sin animación en curso.
function actualizarBotonesApoyar() {
  const cont = document.getElementById('apoyar-acciones');
  const btn = document.getElementById('apoyar-btn');
  const des = document.getElementById('apoyar-deshacer');
  if (!cont || !btn || !des) return;
  const node = selectedMesh;
  const flotante = !vistaAlumnoId && !!node && node.userData?.estadoColocacion?.estado === 'flotante';
  btn.hidden = !flotante;
  btn.disabled = !flotante || !!apoyarEnCurso || desplazamientoApoyo(node) === null;
  des.hidden = !(apoyarUndo && apoyarUndo.nodo === node && !node.isDisposed() && !apoyarEnCurso);
  cont.hidden = btn.hidden && des.hidden;
  actualizarBotonesDesapoyar(); // F2.4d (llamada 3/4): corre al final, así que su criterio de visibilidad del contenedor prevalece
}

// Aviso de caída (|Δ| > 2 m). No bloqueante: Escape, clic fuera o cambio de selección equivalen a Cancelar.
function cerrarConfirmacionApoyo({ cancelado }) {
  const c = apoyarConfirmando;
  if (!c) return;
  apoyarConfirmando = null;
  const el = document.getElementById('apoyar-confirma');
  if (el) el.hidden = true;
  if (!cancelado) return;
  try {
    registrar('apoyar_pieza', {
      ...apoyarDatos(c.nodo),
      contexto: {
        id: c.nodo.userData?.id, tipo: c.nodo.userData?.type, desplazamiento: c.dy,
        estado_anterior: c.estadoAnterior, estado_nuevo: c.estadoAnterior, confirmado: false, cancelado: true,
      },
    });
  } catch (e) { }
}

function pedirConfirmacionApoyo(node, dy, estadoAnterior) {
  const el = document.getElementById('apoyar-confirma');
  const txt = document.getElementById('apoyar-confirma-texto');
  if (!el || !txt) return;
  apoyarConfirmando = { nodo: node, dy, estadoAnterior };
  const metros = Math.abs(dy).toFixed(1).replace(/\.0$/, '');
  txt.textContent = `¿Apoyar la pieza a ${metros} m más abajo?`;
  el.hidden = false;
}

// Cancela la animación en curso (interacción del alumno): la pieza vuelve a su posición inicial y no queda nada que deshacer.
function cancelarApoyo() {
  const a = apoyarEnCurso;
  if (!a) return;
  a.cancelada = true;
  apoyarEnCurso = null;
  try { a.anim?.stop(); } catch (e) { }
  if (!a.nodo.isDisposed()) a.nodo.position.y = a.y0;
  apoyarUndo = null;
  actualizarBotonesApoyar();
}

// Anima position.y de y0 a y1 en 200 ms (ease-out). Un frame después de llegar (cuando clampToZone y la colisión ya
// han podido actuar) se mide la posición REAL, se refresca el panel y se registra todo (finalizarApoyo).
function ejecutarApoyo(node, dy, estadoAnterior) {
  if (!scene) return;
  const y0 = node.position.y;
  const a = { nodo: node, y0, y1: y0 + dy, estadoAnterior, anim: null, cancelada: false };
  apoyarEnCurso = a;
  actualizarBotonesApoyar(); // C2: «Apoyar» deshabilitado durante la animación
  const ease = new CubicEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  a.anim = Animation.CreateAndStartAnimation('apoyar_pieza', node, 'position.y', APOYAR_FPS,
    Math.round(APOYAR_DURACION_MS / 1000 * APOYAR_FPS), y0, a.y1, Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
      if (a.cancelada || apoyarEnCurso !== a) return; // stop() también dispara este callback: ya se canceló
      if (!node.isDisposed()) node.position.y = a.y1;
      scene.onAfterRenderObservable.addOnce(() => finalizarApoyo(a));
    });
}

function finalizarApoyo(a) {
  if (a.cancelada || apoyarEnCurso !== a) return;
  apoyarEnCurso = null;
  const node = a.nodo;
  if (node.isDisposed()) { actualizarBotonesApoyar(); return; }
  const dyReal = node.position.y - a.y0; // puede diferir de Δ si la colisión de casa.js detuvo la pieza (C1)
  const movio = Math.abs(dyReal) > 1e-6;
  marcarSucio();
  if (selectedMesh === node) actualizarAvisoColocacion(node);
  if (movio) apoyarUndo = { nodo: node, y0: a.y0, dy: dyReal, firma: blockSig(node) };
  else setTip('No se pudo apoyar: otra pieza lo impide');
  try {
    registrar('apoyar_pieza', {
      ...apoyarDatos(node),
      contexto: {
        id: node.userData?.id, tipo: node.userData?.type, desplazamiento: dyReal,
        estado_anterior: a.estadoAnterior, estado_nuevo: node.userData?.estadoColocacion?.estado ?? null,
        confirmado: true, cancelado: false,
      },
    });
  } catch (e) { }
  actualizarBotonesApoyar();
}

// Acción común del botón y del atajo A.
function accionApoyar() {
  const node = selectedMesh;
  if (!node || apoyarEnCurso || apoyarConfirmando) return;
  const estado = node.userData?.estadoColocacion?.estado;
  if (estado !== 'flotante') return;
  const dy = desplazamientoApoyo(node);
  if (dy === null) { setTip('No hay apoyo disponible para esta pieza'); actualizarBotonesApoyar(); return; }
  if (Math.abs(dy) > APOYAR_CAIDA_MAXIMA) { pedirConfirmacionApoyo(node, dy, estado); return; }
  ejecutarApoyo(node, dy, estado);
}

function confirmarApoyo() {
  const c = apoyarConfirmando;
  if (!c) return;
  cerrarConfirmacionApoyo({ cancelado: false });
  const dy = c.nodo === selectedMesh && !c.nodo.isDisposed() ? desplazamientoApoyo(c.nodo) : null; // se recalcula al confirmar
  if (dy === null) { actualizarBotonesApoyar(); return; }
  ejecutarApoyo(c.nodo, dy, c.estadoAnterior);
}

// Deshace solo el último «Apoyar», y solo si la pieza sigue seleccionada y no se ha tocado desde entonces.
function accionDeshacerApoyo() {
  const u = apoyarUndo;
  if (!u || apoyarEnCurso) return;
  const node = u.nodo;
  if (node.isDisposed() || node !== selectedMesh || blockSig(node) !== u.firma) { apoyarUndo = null; actualizarBotonesApoyar(); return; }
  apoyarUndo = null;
  node.position.y = u.y0;
  marcarSucio();
  try {
    registrar('deshacer_apoyar', {
      ...apoyarDatos(node),
      contexto: { id: node.userData?.id, tipo: node.userData?.type, desplazamiento_revertido: u.dy },
    });
  } catch (e) { }
  actualizarBotonesApoyar();
  evaluarAvisoTrasFrame(); // recalcula el estado (no se recupera el guardado) y refresca el panel
}

// Gancho de selectObject (C4, 1/5): cualquier cambio de selección cancela animación y aviso; el deshacer es de UNA pieza.
function apoyarAlCambiarSeleccion(nuevo) {
  cancelarApoyo();
  cerrarConfirmacionApoyo({ cancelado: true });
  if (apoyarUndo && apoyarUndo.nodo !== nuevo) apoyarUndo = null;
  desapoyarAlCambiarSeleccion(nuevo); // F2.4d (llamada 1/4)
}

// Gancho de deleteSelected (C4, 2/5).
function apoyarAlBorrar() {
  cancelarApoyo();
  cerrarConfirmacionApoyo({ cancelado: true });
  apoyarUndo = null;
  desapoyarAlBorrar(); // F2.4d (llamada 2/4)
}

function configurarApoyar() {
  if (vistaAlumnoId) return;
  const el = id => document.getElementById(id);
  el('apoyar-btn')?.addEventListener('click', accionApoyar);
  el('apoyar-deshacer')?.addEventListener('click', accionDeshacerApoyo);
  el('apoyar-confirma-si')?.addEventListener('click', confirmarApoyo);
  el('apoyar-confirma-no')?.addEventListener('click', () => cerrarConfirmacionApoyo({ cancelado: true }));
  // Gizmo: arrastrar la pieza durante los 200 ms cancela la animación (solo se añade un observador).
  gizmoMgr?.gizmos?.positionGizmo?.onDragStartObservable.add(() => { cancelarApoyo(); cerrarConfirmacionApoyo({ cancelado: true }); });
  // Clic fuera del aviso de caída = Cancelar (no bloquea: el clic sigue su curso, p. ej. seleccionar otra pieza).
  document.addEventListener('pointerdown', e => {
    if (!apoyarConfirmando) return;
    if (e.target?.closest?.('#apoyar-confirma, #apoyar-btn')) return;
    cerrarConfirmacionApoyo({ cancelado: true });
  }, true);
  // Escape cierra el aviso de caída. En fase de captura y solo con el aviso abierto, para que el Escape de F2.2 no oculte además el panel.
  window.addEventListener('keydown', e => {
    if (e.code !== 'Escape' || !apoyarConfirmando) return;
    cerrarConfirmacionApoyo({ cancelado: true });
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
  const enModal = () => {
    if (document.querySelector('[id$="-overlay"].open')) return true;
    const corte = el('cut-overlay');
    return !!corte && getComputedStyle(corte).display !== 'none';
  };
  const editando = t => !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
  window.addEventListener('keydown', e => {
    if (e.repeat || editando(e.target) || editando(document.activeElement) || enModal()) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.code === 'KeyA' && !ctrl && !e.altKey) {
      // C2: durante la animación el atajo no hace nada; solo actúa si el botón estaría visible y habilitado.
      const btn = el('apoyar-btn');
      if (!selectedMesh || apoyarEnCurso || !btn || btn.hidden || btn.disabled) return;
      e.preventDefault();
      accionApoyar();
    } else if (e.code === 'KeyZ' && ctrl && !e.shiftKey && !e.altKey) {
      if (!apoyarUndo || apoyarUndo.nodo !== selectedMesh || apoyarEnCurso) return;
      e.preventDefault();
      accionDeshacerApoyo();
    } else if (apoyarEnCurso && !ctrl && /^Key[QERFTGX]$/.test(e.code)) {
      cancelarApoyo(); // girar con el teclado durante la animación = interacción: se cancela
    }
  });
  configurarDesapoyar(); // F2.4d (llamada 4/4)
}

// ── F2.4d · «Desapoyar» explícito ─────────────────────────────────────────────
// Acción inversa de «Apoyar»: sube la pieza seleccionada 50 cm desde donde está (no consulta desplazamientoParaApoyar),
// con la misma animación de 200 ms, atajo Shift+A, deshacer de una ranura PROPIA y telemetría desapoyar_pieza.
// No reabre F2.4c: lee sus variables (apoyarEnCurso, apoyarConfirmando, apoyarUndo) pero no cambia su lógica; solo recibe
// 4 llamadas de una línea (apoyarAlCambiarSeleccion, apoyarAlBorrar, actualizarBotonesApoyar, configurarApoyar).
// La animación está DUPLICADA a propósito (F2.4c la tiene dentro de ejecutarApoyo; extraerla obligaría a editar F2.4c).
// Nada se guarda: la nueva `y` se persiste como cualquier movimiento (p[1], marcarSucio); animación y deshacer viven aquí.
const DESAPOYAR_PASO = 0.5; // m, fijo
let desapoyarEnCurso = null; // { nodo, y0, y1, estadoAnterior, anim, cancelada } mientras dura la animación
let desapoyarUndo = null;    // { nodo, y0, paso, firma } del último «Desapoyar» (ranura independiente de apoyarUndo)

// Piezas sobre las que actúa: las mismas que tienen panel de F2.2 (TIPOS_AVISO, sin las incrustadas en una pared).
// Quedan fuera la losa (estática), los muros y el resto.
function puedeDesapoyar(node) {
  return !vistaAlumnoId && !!node && !node.isDisposed() && TIPOS_AVISO.includes(node.userData?.type) && !node.userData?.embeddedInWall;
}

function estadoActualPieza(node) {
  const e = node.userData?.estadoColocacion?.estado;
  if (e) return e;
  try { return evaluarColocacion(node)?.estado ?? null; } catch (err) { return null; }
}

// «Desapoyar»: visible y habilitado con una pieza evaluable seleccionada (no depende de su estado), salvo mientras haya una
// animación (de «Apoyar» o de «Desapoyar»). Corre al final de actualizarBotonesApoyar: aquí se decide también el bloqueo mutuo
// (el botón «Apoyar» se deshabilita mientras «Desapoyar» anima), el único «Deshacer» visible (el de la ranura cuya firma coincide con
// la posición actual: LIFO de dos niveles) y la visibilidad del contenedor.
function actualizarBotonesDesapoyar() {
  const el = id => document.getElementById(id);
  const cont = el('apoyar-acciones'), btn = el('desapoyar-btn'), des = el('desapoyar-deshacer');
  const btnA = el('apoyar-btn'), desA = el('apoyar-deshacer');
  if (!cont || !btn || !des || !btnA || !desA) return;
  const node = selectedMesh;
  const evaluable = puedeDesapoyar(node);
  const firma = evaluable ? blockSig(node) : null;
  btn.hidden = !evaluable;
  btn.disabled = !evaluable || !!apoyarEnCurso || !!desapoyarEnCurso;
  if (desapoyarEnCurso) btnA.disabled = true; // bloqueo mutuo: no se apoya mientras se desapoya
  des.hidden = !(evaluable && desapoyarUndo && desapoyarUndo.nodo === node && !desapoyarEnCurso && !apoyarEnCurso &&
    desapoyarUndo.firma === firma);
  // El «Deshacer» de «Apoyar» solo se ofrece si su firma sigue coincidiendo (si después se desapoyó, el que vale es el otro).
  if (!desA.hidden && (!evaluable || desapoyarEnCurso || apoyarUndo?.firma !== firma)) desA.hidden = true;
  cont.hidden = btn.hidden && btnA.hidden && desA.hidden && des.hidden;
}

// Cancela la animación en curso (interacción del alumno): la pieza vuelve a su `y` inicial y no queda nada que deshacer.
function cancelarDesapoyo() {
  const a = desapoyarEnCurso;
  if (!a) return;
  a.cancelada = true;
  desapoyarEnCurso = null;
  try { a.anim?.stop(); } catch (e) { }
  if (!a.nodo.isDisposed()) a.nodo.position.y = a.y0;
  desapoyarUndo = null;
  actualizarBotonesApoyar();
}

function ejecutarDesapoyo(node, estadoAnterior) {
  if (!scene) return;
  const y0 = node.position.y;
  const a = { nodo: node, y0, y1: y0 + DESAPOYAR_PASO, estadoAnterior, anim: null, cancelada: false };
  desapoyarEnCurso = a;
  actualizarBotonesApoyar(); // deshabilita «Desapoyar» y «Apoyar» durante los 200 ms
  const ease = new CubicEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  a.anim = Animation.CreateAndStartAnimation('desapoyar_pieza', node, 'position.y', APOYAR_FPS,
    Math.round(APOYAR_DURACION_MS / 1000 * APOYAR_FPS), y0, a.y1, Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
      if (a.cancelada || desapoyarEnCurso !== a) return; // stop() también dispara este callback: ya se canceló
      if (!node.isDisposed()) node.position.y = a.y1;
      scene.onAfterRenderObservable.addOnce(() => finalizarDesapoyo(a));
    });
}

// Un fotograma después de llegar, cuando clampToZone y la colisión de casa.js ya han podido actuar, se mide la `y` REAL:
// al subir una pieza con otra encima la colisión la detiene, y entonces sube solo lo que cabe (o nada).
function finalizarDesapoyo(a) {
  if (a.cancelada || desapoyarEnCurso !== a) return;
  desapoyarEnCurso = null;
  const node = a.nodo;
  if (node.isDisposed()) { actualizarBotonesApoyar(); return; }
  const paso = node.position.y - a.y0;
  if (Math.abs(paso) <= 1e-6) { // no se movió: sin guardado, sin telemetría, sin deshacer
    setTip('No se pudo subir: otra pieza lo impide');
    actualizarBotonesApoyar();
    return;
  }
  marcarSucio();
  if (selectedMesh === node) actualizarAvisoColocacion(node);
  desapoyarUndo = { nodo: node, y0: a.y0, paso, firma: blockSig(node) };
  try {
    registrar('desapoyar_pieza', {
      ...apoyarDatos(node),
      contexto: { id: node.userData?.id, paso, estado_anterior: a.estadoAnterior, estado_nuevo: node.userData?.estadoColocacion?.estado ?? null },
    });
  } catch (e) { }
  actualizarBotonesApoyar();
}

function accionDesapoyar() {
  const node = selectedMesh;
  if (!puedeDesapoyar(node) || apoyarEnCurso || desapoyarEnCurso || apoyarConfirmando) return;
  ejecutarDesapoyo(node, estadoActualPieza(node));
}

// Deshace solo el último «Desapoyar», y solo si la pieza sigue seleccionada y no se ha tocado desde entonces.
function accionDeshacerDesapoyo() {
  const u = desapoyarUndo;
  if (!u || desapoyarEnCurso || apoyarEnCurso) return;
  const node = u.nodo;
  if (node.isDisposed() || node !== selectedMesh || blockSig(node) !== u.firma) { actualizarBotonesApoyar(); return; }
  desapoyarUndo = null;
  node.position.y = u.y0;
  marcarSucio();
  try {
    registrar('deshacer_desapoyar', {
      ...apoyarDatos(node),
      contexto: { id: node.userData?.id, paso_revertido: u.paso },
    });
  } catch (e) { }
  actualizarBotonesApoyar();
  evaluarAvisoTrasFrame(); // recalcula el estado (no se recupera el guardado) y refresca el panel
}

// Llamadas desde F2.4c (selectObject / deleteSelected pasan por apoyarAlCambiarSeleccion / apoyarAlBorrar).
function desapoyarAlCambiarSeleccion(nuevo) {
  cancelarDesapoyo();
  if (desapoyarUndo && desapoyarUndo.nodo !== nuevo) desapoyarUndo = null;
}
function desapoyarAlBorrar() {
  cancelarDesapoyo();
  desapoyarUndo = null;
}

function configurarDesapoyar() {
  if (vistaAlumnoId) return;
  const el = id => document.getElementById(id);
  el('desapoyar-btn')?.addEventListener('click', accionDesapoyar);
  el('desapoyar-deshacer')?.addEventListener('click', accionDeshacerDesapoyo);
  // Gizmo: arrastrar la pieza durante los 200 ms cancela la animación (solo se añade un observador).
  gizmoMgr?.gizmos?.positionGizmo?.onDragStartObservable.add(() => cancelarDesapoyo());
  const enModal = () => {
    if (document.querySelector('[id$="-overlay"].open')) return true;
    const corte = el('cut-overlay');
    return !!corte && getComputedStyle(corte).display !== 'none';
  };
  const editando = t => !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
  // FASE DE CAPTURA: corre antes que el oyente de «Apoyar» (F2.4c), que no distingue Shift. Shift+A es solo de «Desapoyar»:
  // se atiende aquí y se detiene la propagación, así que «Apoyar» nunca lo ve. A sin Shift sigue siendo de «Apoyar».
  window.addEventListener('keydown', e => {
    if (editando(e.target) || editando(document.activeElement) || enModal()) return; // no se traga ni una «A» escrita
    const ctrl = e.ctrlKey || e.metaKey;
    const tragar = () => { e.stopImmediatePropagation(); e.preventDefault(); };
    if (e.code === 'KeyA' && !ctrl && !e.altKey) {
      if (desapoyarEnCurso) { // durante la animación A, Shift+A = interacción: se cancela y no se ejecuta nada más
        if (!e.repeat) cancelarDesapoyo();
        tragar();
        return;
      }
      if (!e.shiftKey) return; // A sin Shift: de «Apoyar» (F2.4c)
      tragar();
      if (e.repeat || apoyarEnCurso || apoyarConfirmando) return;
      const btn = el('desapoyar-btn');
      if (!selectedMesh || !btn || btn.hidden || btn.disabled) return;
      accionDesapoyar();
    } else if (e.code === 'KeyZ' && ctrl && !e.shiftKey && !e.altKey) {
      if (desapoyarEnCurso) { if (!e.repeat) cancelarDesapoyo(); tragar(); return; }
      // Ctrl+Z lo atiende «Desapoyar» solo si su ranura es la que vale (firma = posición actual); si no, sigue a «Apoyar».
      const u = desapoyarUndo;
      if (e.repeat || !u || apoyarEnCurso || u.nodo !== selectedMesh || u.nodo.isDisposed() || blockSig(u.nodo) !== u.firma) return;
      tragar();
      accionDeshacerDesapoyo();
    } else if (desapoyarEnCurso && !ctrl && !e.repeat && /^Key[QERFTGX]$/.test(e.code)) {
      cancelarDesapoyo(); // girar con el teclado durante la animación = interacción: se cancela (la rotación sigue su curso)
    }
  }, true);
}

// configura el gizmo de posición y los controles de teclado para cámara y objetos
function setupGizmos() {
  if (vistaAlumnoId) return; // Deshabilitado en vista de maestro
  gizmoMgr = new GizmoManager(scene);
  gizmoMgr.usePointerToAttachGizmos = false;
  gizmoMgr.positionGizmoEnabled = true;
  gizmoMgr.rotationGizmoEnabled = false;
  gizmoMgr.scaleGizmoEnabled = false;

  gizmoMgr.gizmos.positionGizmo?.onDragEndObservable.add(() => marcarSucio());
  // F2.2: al soltar el gizmo se reevalúa el aviso de colocación (informativo; no mueve ni bloquea nada).
  gizmoMgr.gizmos.positionGizmo?.onDragEndObservable.add(() => { if (typeof evaluarAvisoTrasFrame === 'function') evaluarAvisoTrasFrame(); });

  scene.registerBeforeRender(() => {
    if (selectedMesh) clampToZone(selectedMesh);
  });
  scene.registerBeforeRender(() => {
    if (selectedMesh) enforceBlockCollision(selectedMesh);
  });

  const CAM_SPEED = Math.PI / 3; // Radianes por segundo, independiente de los FPS.
  const BETA_MIN = 0.20;
  // F1: el teclado usa el mismo límite que el ratón (camera.upperBetaLimit). Antes: Math.PI / 2.05.
  // Se lee de la cámara para que setupGizmos siga siendo autónoma (tests/integracion.test.js la ejecuta aislada).
  const BETA_MAX = camera.upperBetaLimit || Math.PI / 2.05;
  const cameraKeys = new Set();
  const arrowKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  let cameraFast = false;
  const isEditing = target => target?.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
  const resetCameraKeys = () => { cameraKeys.clear(); cameraFast = false; };

  scene.registerBeforeRender(() => {
    if (isEditing(document.activeElement)) { resetCameraKeys(); return; }
    const step = CAM_SPEED * (cameraFast ? 2.5 : 1) * Math.min(engine.getDeltaTime() / 1000, 0.05);
    camera.alpha += (Number(cameraKeys.has('ArrowRight')) - Number(cameraKeys.has('ArrowLeft'))) * step;
    const vertical = Number(cameraKeys.has('ArrowDown')) - Number(cameraKeys.has('ArrowUp'));
    if (vertical) camera.beta = Math.max(BETA_MIN, Math.min(BETA_MAX, camera.beta + vertical * step));
  });
  window.addEventListener('keyup', e => {
    cameraKeys.delete(e.code);
    cameraFast = e.shiftKey;
  });
  window.addEventListener('blur', resetCameraKeys);
  document.addEventListener('visibilitychange', resetCameraKeys);
  document.addEventListener('focusin', e => { if (isEditing(e.target)) resetCameraKeys(); });

  window.addEventListener('keydown', e => {
    if (isEditing(e.target)) return;
    cameraFast = e.shiftKey;
    if (e.ctrlKey || e.metaKey || e.altKey) { resetCameraKeys(); return; }
    if (arrowKeys.has(e.code)) {
      cameraKeys.add(e.code);
      e.preventDefault();
      return;
    }
    let handled = false;
    switch (e.code) {
      case 'KeyC':
        if (selectedMesh && !e.repeat) {
          const bounds = selectedMesh.getHierarchyBoundingVectors(true);
          camera.setTarget(bounds.min.add(bounds.max).scale(0.5));
          handled = true;
        }
        break;
      case 'KeyQ': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.y -= Math.PI / 12; handled = true; marcarSucio(); } break;
      case 'KeyE': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.y += Math.PI / 12; handled = true; marcarSucio(); } break;
      case 'KeyR': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.x -= Math.PI / 12; handled = true; marcarSucio(); } break;
      case 'KeyF': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.x += Math.PI / 12; handled = true; marcarSucio(); } break;
      case 'KeyT': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.z -= Math.PI / 12; handled = true; marcarSucio(); } break;
      case 'KeyG': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.z += Math.PI / 12; handled = true; marcarSucio(); } break;
      case 'KeyX': if (selectedMesh && selectedMesh.userData?.type !== 'concreto_slab_20') { selectedMesh.rotation.x = 0; selectedMesh.rotation.z = 0; handled = true; marcarSucio(); } break;
    }
    if (handled) e.preventDefault();
    // F2.2: tras girar con teclado. El typeof mantiene autónoma a setupGizmos (tests/integracion.test.js la ejecuta aislada).
    if (handled && /^Key[QERFTGX]$/.test(e.code) && typeof evaluarAvisoTrasFrame === 'function') evaluarAvisoTrasFrame();
  });
}

// selecciona o deselecciona un objeto, maneja el highlight y los gizmos
function selectObject(node) {
  // F4d: las paredes generadas del plano no se seleccionan (ni gizmo, ni teclas Q/E/R/F/T/G/X, ni borrado pieza a pieza): se gestionan desde el editor de plano.
  if (node?.userData?.type === 'paredes_plano') { setTip('🧱 <b>Paredes del plano</b> · Se gestionan desde el editor de plano (Materializar / Desmaterializar).'); return; }
  apoyarAlCambiarSeleccion(node); // F2.4c (gancho 1/5): cancela animación y aviso de caída; limpia el deshacer si cambia la pieza
  if (selectedMesh && highlightLayer) {
    try {
      selectedMesh.getChildMeshes().forEach(c => {
        try { highlightLayer.removeMesh(c); } catch (e) { }
      });
    } catch (e) { }
  }
  quitarHoverAviso(); // F2.2: el resaltado ámbar de candidata no debe sobrevivir al cambio de selección
  selectedMesh = node;
  if (!node) {
    limpiarAvisoColocacion(); // F2.2: clic en vacío / cambio de pieza limpian el aviso
    gizmoMgr.attachToMesh(null);
    document.getElementById('btnDel').style.display = 'none';
    document.getElementById('xinfo').style.display = 'none';
    closeColorPicker();
    updateObjListUI();
    setTip('Haz clic en un material del panel izquierdo para colocarlo · Scroll = zoom · Flechas ← → ↑ ↓ = rotar cámara');
    return;
  }
  if (highlightLayer) {
    node.getChildMeshes().forEach(c => {
      try { highlightLayer.addMesh(c, OUTLINE_SELECCION); } catch (e) { } // F2.2: azul de selección (#1565C0); el error es rojo
    });
  }
  if (node.userData?.type === 'concreto_slab_20') {
    gizmoMgr.attachToMesh(null);
    setTip('🪨 Concreto 20×20 · Estático — solo se puede eliminar desde la lista de objetos');
  } else {
    gizmoMgr.attachToNode(node);
    setTip('✦ Arrastra flechas para mover · <b>Q/E</b> rotar · <b>R/F</b> inclinar eje X · <b>T/G</b> inclinar eje Z · <b>X</b> enderezar');
  }
  document.getElementById('btnDel').style.display = 'inline-block';
  document.getElementById('xinfo').style.display = 'block';
  updateObjListUI();
  actualizarAvisoColocacion(node); // F2.2: aviso informativo de la pieza recién seleccionada
}

// detecta qué objeto tocó el usuario con el puntero
function setupPicking() {
  if (vistaAlumnoId) return; // Deshabilitado en vista de maestro
  scene.onPointerObservable.add(pointerInfo => {
    if (pointerInfo.type !== PointerEventTypes.POINTERPICK) return;
    const hit = pointerInfo.pickInfo;
    if (!hit.hit || !hit.pickedMesh) { selectObject(null); return; }
    const mesh = hit.pickedMesh;
    if (mesh.name === 'ground' || mesh.name.startsWith('ground_seg') || mesh.name.startsWith('grid') || mesh.name.startsWith('zone') || mesh.name.startsWith('arrow')) { selectObject(null); return; }
    let node = mesh;
    while (node && !node.userData?.type) node = node.parent;
    if (mesh.name.startsWith('exc_') || node?.userData?.type === 'excavacion') {
      selectObject(null);
      if (excavacionData && excavacionData.activa) {
        setTip(`⛏️ <b>Excavación:</b> ${excavacionData.largo.toFixed(1)}×${excavacionData.ancho.toFixed(1)}×${excavacionData.profundidad.toFixed(1)} m · Volumen: <b>${excavacionData.volumen.toFixed(1)} m³</b> · Clic en el botón ⛏️ Excavación para ver o ajustar.`);
      }
      return;
    }
    if (node && node.userData?.type) {
      selectObject(node);
      const baseType = (node.userData.type || '').replace('wall_', '').replace('floor_', '');
      if (COLORABLE_TYPES.includes(baseType)) openColorPicker(node);
      else closeColorPicker();
    } else { selectObject(null); }
  });
}

// elimina el objeto seleccionado de la escena y de la lista
function deleteSelected() {
  if (!selectedMesh) return;
  // El concreto 20x20 NO se puede eliminar con el botón ✕
  if (selectedMesh.userData?.type === 'concreto_slab_20') {
    showLockedMessage('🪨 El concreto no se puede eliminar directamente. Usa el botón "🗑 Eliminar concreto" en la lista de objetos si deseas rehacerlo.');
    return;
  }
  apoyarAlBorrar(); // F2.4c (gancho 2/5): la pieza desaparece; no queda animación, aviso ni deshacer
  const id = selectedMesh.userData?.id;
  const deletedType = selectedMesh.userData?.type;
  if (highlightLayer) {
    try { selectedMesh.getChildMeshes().forEach(m => { try { highlightLayer.removeMesh(m); } catch (e) { } }); } catch (e) { }
  }
  gizmoMgr.attachToMesh(null);
  selectedMesh.getChildMeshes().forEach(m => {
    if (shadowGen) try { shadowGen.removeShadowCaster(m); } catch (e) { }
    m.dispose();
  });
  selectedMesh.dispose();
  // Si lo eliminado era una pared, sus puertas/ventanas embebidas ya
  // perdieron su nodo 3D (eran hijos de esta malla) — hay que sacarlas
  // también de objList o quedarían fantasmas contando de más.
  objList = objList.filter(o => o.id !== id && o.embeddedInWall !== id);
  selectedMesh = null;
  limpiarAvisoColocacion(); // F2.2: la pieza ya no existe
  updateObjListUI();
  document.getElementById('btnDel').style.display = 'none';
  document.getElementById('xinfo').style.display = 'none';
  try { registrar('objeto_eliminado', { contexto: { tipo: deletedType, id: id } }); } catch (e) { }
  setTip('Objeto eliminado');
  recalcularObjetivos();
  marcarSucio();
}

// funciones auxiliares de la interfaz: lista de objetos, tooltip, etc.
function updateObjListUI() {
  sincronizarColisionesCamara(); // F1: los muros y piezas sólidas nuevas bloquean la cámara
  const panel = document.getElementById('objlist');
  const items = document.getElementById('obj-items');
  const count = document.getElementById('obj-count');
  panel.style.display = objList.length > 0 ? 'block' : 'none';
  count.textContent = objList.length;

  const labelCount = {};
  const labelIndex = [];
  objList.forEach(o => {
    const base = o.label;
    labelCount[base] = (labelCount[base] || 0) + 1;
    labelIndex.push(labelCount[base]);
  });
  const labelTotal = {};
  objList.forEach(o => { labelTotal[o.label] = (labelTotal[o.label] || 0) + 1; });

  items.innerHTML = objList.map((o, i) => {
    const num = labelTotal[o.label] > 1 ? ` (${labelIndex[i]})` : '';
    const isSel = selectedMesh?.userData?.id === o.id;
    const isSlab = o.type === 'concreto_slab_20';
    const isLamp = o.type === 'lampara';
    const isPared = o.type === 'paredes_plano';   // F4d: sin botón de clonar
    const isWallWithOpening = (o.type === 'wall_block' || o.type === 'wall_madera') &&
      (o.node?.userData?.wallMode === 'puerta' || o.node?.userData?.wallMode === 'ventana');
    // Concreto: botón especial para eliminar (re-habilita modal). Lámpara: sin clonar. Pared con puerta/ventana: sin clonar. Resto: botón clonar.
    const actionBtn = isSlab
      ? `<span class="obj-clone-hint" style="color:rgba(255,100,100,.8)" title="Eliminar concreto" onclick="event.stopPropagation();deleteConcreto(${o.id})">🗑</span>`
      : (isLamp || isWallWithOpening || isPared)
        ? ''
        : `<span class="obj-clone-hint" onclick="event.stopPropagation();cloneObj(${o.id})">⧉</span>`;
    return `<div class="obj-item ${isSel ? 'sel' : ''}" title="Clic para seleccionar" onclick="selectFromList(${o.id})">
      <span>${o.emoji}</span><span>${o.label}${num}</span>${actionBtn}
    </div>`;
  }).join('');

  if (buildPhase >= 4 || modoLibreActivo) checkAndUpdateProgramarBtn();

  // Actualizar contador de paredes en topbar
  const wallBadge = document.getElementById('wall-counter-badge');
  if (wallBadge) {
    const wc = countWalls();
    if (buildPhase >= 4) {
      wallBadge.style.display = 'none';
    } else if (buildPhase >= 2) {
      wallBadge.style.display = '';
      wallBadge.textContent = String.fromCodePoint(0x1F9F1) + ' ' + wc + '/4 paredes';
      wallBadge.style.color = wc >= 4 ? 'rgba(80,220,120,.9)' : 'rgba(150,200,255,.7)';
    } else {
      wallBadge.style.display = 'none';
    }
  }
}

function selectFromList(id) {
  const e = objList.find(o => o.id === id);
  if (e && e.type === 'paredes_plano') { selectObject(e.node); return; }   // F4d: informa y no selecciona
  if (e) {
    selectObject(e.node);
    const base = e.type.replace('wall_', '').replace('floor_', '');
    if (COLORABLE_TYPES.includes(base) || COLORABLE_TYPES.includes(e.type)) {
      openColorPicker(e.node);
    } else {
      closeColorPicker();
      setTip(`<b>${e.emoji} ${e.label}</b> seleccionado · Arrastra flechas de colores para mover · Q/E para rotar`);
    }
  }
}

function cloneObj(id) {
  const src = objList.find(o => o.id === id);
  if (!src) return;
  if (src.type === 'paredes_plano') return;   // F4d: las paredes generadas no se duplican
  // El concreto 20×20 no se puede duplicar
  if (src.type === 'concreto_slab_20') {
    showLockedMessage('🪨 El concreto 20×20 no se puede duplicar. Si quieres uno nuevo, elimina el actual primero.');
    return;
  }
  // Paredes con puerta o hueco de puerta NO se pueden duplicar
  if ((src.type === 'wall_block' || src.type === 'wall_madera') && src.node.userData?.wallMode === 'puerta') {
    showLockedMessage('🚪 Las paredes con puerta o hueco de puerta no se pueden duplicar.');
    return;
  }
  // Paredes con ventana o hueco de ventana NO se pueden duplicar
  if ((src.type === 'wall_block' || src.type === 'wall_madera') && src.node.userData?.wallMode === 'ventana') {
    showLockedMessage('🪟 Las paredes con ventana o hueco de ventana no se pueden duplicar.');
    return;
  }
  // Vitropiso: validar que no exceda los 400 m²
  if (src.type === 'floor_vitropiso') {
    const srcArea = src.area || 0;
    const coveredArea = getVitropisoArea();
    if (coveredArea + srcArea > 400) {
      showLockedMessage(`⚠ No se puede duplicar. Ya tienes ${coveredArea} m² cubiertos y este vitropiso añadiría ${srcArea} m² más, excediendo los 400 m².`);
      return;
    }
  }

  const newId = objIdCounter++;
  const root = new TransformNode('obj_' + newId + '_' + src.type, scene);
  // Clonar en la misma posición del original, con un pequeño offset para que sea visible
  root.position.x = src.node.position.x + 1.0;
  root.position.y = src.node.position.y;
  root.position.z = src.node.position.z + 1.0;
  root.rotation.copyFrom(src.node.rotation);

  const baseType = src.type;

  if (baseType.startsWith('wall_')) {
    const matType = baseType === 'wall_block' ? 'block' : 'madera';
    const bW = 1.0;
    const bH = matType === 'block' ? 0.7 : 0.2;
    const bD = matType === 'block' ? 0.5 : 0.2;
    const srcChildren = src.node.getChildMeshes();
    const yVals = [...new Set(srcChildren.map(m => Math.round(m.position.y * 100)))].sort((a, b) => a - b);
    const xVals = [...new Set(srcChildren.map(m => Math.round(m.position.x * 100)))].sort((a, b) => a - b);
    const rows = yVals.length;
    const cols = xVals.length;
    const startX = -(cols * bW / 2) + bW / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Buscar el mesh original en esa posición para copiar su color
        const srcMesh = srcChildren.find(m =>
          Math.round(m.position.x * 100) === xVals[col] &&
          Math.round(m.position.y * 100) === yVals[row]
        );
        const mesh = MeshBuilder.CreateBox(
          'wall_' + matType + '_' + newId + '_' + row + '_' + col,
          { width: bW - 0.04, height: bH - (matType === 'block' ? 0.04 : 0.02), depth: bD }, scene
        );
        // Copiar material (color) del mesh original si fue pintado
        if (srcMesh && srcMesh.material) {
          const clonedMat = srcMesh.material.clone(srcMesh.material.name + '_clone_' + newId + '_' + row + '_' + col);
          mesh.material = clonedMat;
        } else {
          mesh.material = matType === 'block' ? MAT.block : MAT.madera;
        }
        mesh.position.set(startX + col * bW, bH / 2 + row * bH, 0);
        mesh.receiveShadows = true;
        if (shadowGen) shadowGen.addShadowCaster(mesh, false);
        mesh.parent = root;
      }
    }
  } else if (baseType === 'concreto' || baseType === 'concreto_slab') {
    const srcChildren = src.node.getChildMeshes();
    srcChildren.forEach(srcMesh => {
      const clonedMesh = MeshBuilder.CreateBox(
        'con_clone_' + newId,
        { width: Math.abs(srcMesh.scaling.x) || 1, height: 0.2, depth: Math.abs(srcMesh.scaling.z) || 1 }, scene
      );
      clonedMesh.material = srcMesh.material ? srcMesh.material.clone('con_mat_' + newId) : MAT.concreto;
      clonedMesh.position.copyFrom(srcMesh.position);
      clonedMesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(clonedMesh, false);
      clonedMesh.parent = root;
    });
    if (srcChildren.length === 0) {
      BUILDERS['concreto'](root);
      root.getChildMeshes().forEach(m => { if (shadowGen) shadowGen.addShadowCaster(m, false); });
    }
  } else if (baseType.startsWith('floor_')) {
    const floorType = baseType.replace('floor_', '');
    // Para vitropiso clonado, conservar el material original (con su color)
    src.node.getChildMeshes().forEach(srcMesh => {
      const h = floorType === 'block' ? 0.12 : floorType === 'madera' ? 0.08 : 0.06;
      const mesh = MeshBuilder.CreateBox(
        'floor_clone_' + newId + '_' + Math.random().toString(36).slice(2),
        { width: 0.97, height: h, depth: 0.97 }, scene
      );
      mesh.position.copyFrom(srcMesh.position);
      mesh.material = srcMesh.material || (floorType === 'vitropiso' ? MAT.vitropiso : MAT.block);
      mesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(mesh, false);
      mesh.parent = root;
    });
  } else if (BUILDERS[baseType]) {
    BUILDERS[baseType](root);
    const srcChildrenSimple = src.node.getChildMeshes();
    root.getChildMeshes().forEach((m, i) => {
      if (shadowGen) shadowGen.addShadowCaster(m, false);
      const srcMesh = srcChildrenSimple[i];
      if (srcMesh && srcMesh.material) {
        const srcMatName = srcMesh.material.name || '';
        if (srcMatName.includes('_colored_') || srcMatName.includes('_clone_')) {
          m.material = srcMesh.material.clone(srcMatName + '_clone_' + newId);
        }
      }
    });
  }

  clampToZone(root);
  root.userData = { id: newId, type: src.type, label: src.label, emoji: src.emoji };
  // Si el bloque original estaba cortado, aplicar el mismo corte al clon
  if (CUT_TYPES.includes(src.type) && src.node.userData?.cutFactor != null && src.node.userData.cutFactor < 1) {
    root.userData.cutFactor = src.node.userData.cutFactor;
    cortarBloque(root, src.node.userData.cutFactor);
  }
  if (COLLISION_TYPES.includes(src.type)) {
    const cercanos = [];
    for (let r = 0.5; r <= 20; r += (r < 5 ? 0.5 : 1)) {
      for (let k = 0; k < 12; k++) {
        const ang = k * Math.PI / 6;
        cercanos.push([src.node.position.x + 1.0 + Math.cos(ang) * r, src.node.position.z + 1.0 + Math.sin(ang) * r]);
      }
    }
    if (!colocarSinSolapar(root, cercanos)) {
      root.getChildMeshes().forEach(m => { if (shadowGen) shadowGen.removeShadowCaster(m); });
      root.dispose();
      showLockedMessage('🧱 No hay espacio libre para clonar esto sin que se superponga con otro bloque o pared.');
      return;
    }
  }
  const cloneEntry = { id: newId, type: src.type, label: src.label, emoji: src.emoji, node: root };
  // Conservar metadatos de vitropiso para validación de cobertura
  if (src.type === 'floor_vitropiso') {
    cloneEntry.area = src.area || 0;
    cloneEntry.w = src.w || 0;
    cloneEntry.d = src.d || 0;
  } else if (src.type.startsWith('wall_')) {
    const mDim = (src.label || '').match(/(\d+)×(\d+)/);
    cloneEntry.w = src.w || (mDim ? parseInt(mDim[1]) : 5);
    cloneEntry.d = src.d || (mDim ? parseInt(mDim[2]) : 4);
  }
  objList.push(cloneEntry);
  updateObjListUI();
  selectObject(root);
  if (COLORABLE_TYPES.includes(src.type) || COLORABLE_TYPES.includes(src.type.replace('wall_', ''))) {
    openColorPicker(root);
  }
  setTip(`<b>${src.emoji} ${src.label}</b> clonado · Muévelo con las flechas o teclas`);
  recalcularObjetivos();
  marcarSucio();
}

// Elimina el concreto 20x20 y re-habilita el botón Crear Concreto
function deleteConcreto(id) {
  const entry = objList.find(o => o.id === id);
  if (!entry) return;
  const node = entry.node;
  if (selectedMesh && selectedMesh.userData?.id === id) {
    if (highlightLayer) {
      try { node.getChildMeshes().forEach(m => { try { highlightLayer.removeMesh(m); } catch (e) { } }); } catch (e) { }
    }
    gizmoMgr.attachToMesh(null);
    document.getElementById('btnDel').style.display = 'none';
    document.getElementById('xinfo').style.display = 'none';
    selectedMesh = null;
    limpiarAvisoColocacion(); // F2.2
  }
  node.getChildMeshes().forEach(m => {
    if (shadowGen) try { shadowGen.removeShadowCaster(m); } catch (e) { }
    m.dispose();
  });
  node.dispose();
  objList = objList.filter(o => o.id !== id);
  // Re-habilitar el botón Crear Concreto
  const btnStorm = document.getElementById('btnStorm');
  if (btnStorm) { btnStorm.disabled = false; btnStorm.style.opacity = ''; btnStorm.title = ''; }
  // Bloquear Construir y Programar de nuevo
  concretoUnlocked = false;
  buildPhase = 1; // matematicas ya validadas
  // Fase 3: en modo libre no se vuelven a bloquear los botones (el estado interno se actualiza igual)
  if (!modoLibreActivo) {
    const btnWall = document.getElementById('btnWall');
    if (btnWall) { btnWall.disabled = true; btnWall.style.opacity = '0.45'; btnWall.title = 'Crea el concreto primero'; }
    const btnProg = document.getElementById('btnProgramar');
    if (btnProg) { btnProg.disabled = true; btnProg.style.opacity = '0.45'; btnProg.title = 'Completa los pasos anteriores'; }
  }
  updateObjListUI();
  setTip('🪨 Concreto eliminado. Vuelve a crearlo con el botón 🪨 Crear Concreto.');
  marcarSucio();
}

function toggleCatalog() {
  catOpen = !catOpen;
  document.getElementById('cat-list').style.display = catOpen ? 'block' : 'none';
  document.getElementById('cat-arrow').textContent = catOpen ? '▲' : '▼';
}
function setTip(html) {
  document.getElementById('tip').innerHTML = html;
  document.getElementById('tip').style.opacity = '1';
}

// alterna entre modo día y noche cambiando luces y colores de escena
function toggleNight() {
  isNight = !isNight;
  const btn = document.getElementById('btnNight');
  if (btn) {
    btn.textContent = isNight ? '🌙 Noche' : '☀️ Día';
    btn.classList.toggle('active', isNight);
  }
  applyLighting();
  // Ejecutar reglas del programa
  if (isNight) {
    execRulesByTriggerNew('es_noche');
  } else {
    execRulesByTriggerNew('es_dia');
  }
  try { registrar('cambio_noche', { contexto: { es_noche: isNight } }); } catch (e) { }
}
function applyLighting() {
  if (isNight) {
    sunLight.intensity = 0.04; hemiLight.intensity = 0.06;
    scene.clearColor = new Color4(0.01, 0.01, 0.06, 1);
    scene.fogColor = new Color3(0.01, 0.02, 0.08);
    document.body.classList.add('night-mode');
    document.body.classList.remove('day-mode');
  } else {
    sunLight.intensity = 2.8; hemiLight.intensity = 0.65;
    scene.clearColor = new Color4(0.48, 0.62, 0.82, 1);
    scene.fogColor = new Color3(0.45, 0.58, 0.78);
    document.body.classList.remove('night-mode');
    document.body.classList.add('day-mode');
  }
}

// toda la lógica del modal de mezcla de concreto con inputs numéricos
function openConcretoModal() {
  try { registrar('modal_abierto', { contexto: { modal: 'concreto' } }); } catch (e) { }
  if (!matematicasValidadas && !modoLibreActivo) {
    showLockedMessage('⚠ Debes completar primero el módulo de Matemáticas. Haz clic en 📐 Calcular Área para desbloquear esta función.');
    return;
  }
  // Verificar si ya existe la losa 20×20
  const slabExists = objList.some(o => o.type === 'concreto_slab_20');
  if (slabExists) {
    showLockedMessage('🪨 ¡Ya tienes el concreto creado! Si quieres poner uno nuevo, elimínalo primero para poder volver a crearlo.');
    return;
  }
  // limpiar inputs
  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    const inp = document.getElementById('inp-' + m);
    if (inp) inp.value = '';
  });
  document.getElementById('concreto-body').style.display = '';
  document.getElementById('concreto-resultado').style.display = 'none';
  const errEl = document.getElementById('cmat-error');
  if (errEl) errEl.style.display = 'none';
  aplicarTextosModalConcreto(); // Fase 3: textos del modo vigente (en modo normal restaura los originales)
  concretoActualizarBarra();
  document.getElementById('concreto-overlay').classList.add('open');

  // escuchar cambios en los inputs para actualizar la barra en tiempo real
  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    const inp = document.getElementById('inp-' + m);
    if (inp) inp.oninput = concretoActualizarBarra;
  });
}

function closeConcretoModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  try { registrar('modal_cerrado', { contexto: { modal: 'concreto' } }); } catch (e) { }
  document.getElementById('concreto-overlay').classList.remove('open');
}

// Valores correctos basados en 6000 m³ total con proporciones 1:2:3 + 10% agua
const CONCRETO_CORRECTO = { cemento: 1000, arena: 2000, grava: 3000, agua: 600 };
const CONCRETO_TOTAL = 6600; // 1000+2000+3000+600

function concretoActualizarBarra() {
  if (modoLibreActivo) { concretoActualizarBarraLibre(); return; } // Fase 3: rama del modo libre (el modo normal sigue abajo, sin cambios)
  const vals = {};
  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    vals[m] = parseFloat(document.getElementById('inp-' + m)?.value) || 0;
  });
  // Delegado a calculos.js (Fase 1). Original: const total = vals.cemento + vals.arena + vals.grava + vals.agua;
  const total = calcularTotalConcreto(vals);
  const totalEl = document.getElementById('cmat-total-val');
  if (totalEl) totalEl.textContent = total.toLocaleString();

  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    const seg = document.getElementById('cmat-bar-' + m);
    // Original: Math.min((vals[m] / CONCRETO_TOTAL) * 100, 100) + '%'
    if (seg) seg.style.width = porcentajeBarra(vals[m], CONCRETO_TOTAL) + '%';
  });
}

function concretoMezclar() {
  if (modoLibreActivo) { concretoMezclarLibre(); return; } // Fase 3: rama del modo libre (el modo normal sigue abajo, sin cambios)
  const vals = {};
  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    vals[m] = parseFloat(document.getElementById('inp-' + m)?.value);
  });

  const errores = [];
  if (isNaN(vals.cemento) || vals.cemento !== CONCRETO_CORRECTO.cemento) {
    errores.push(`❌ Cemento: debes ingresar <b>${CONCRETO_CORRECTO.cemento} m³</b> (1/6 de 6,000 m³)`);
  }
  if (isNaN(vals.arena) || vals.arena !== CONCRETO_CORRECTO.arena) {
    errores.push(`❌ Arena: debes ingresar <b>${CONCRETO_CORRECTO.arena} m³</b> (2/6 de 6,000 m³)`);
  }
  if (isNaN(vals.grava) || vals.grava !== CONCRETO_CORRECTO.grava) {
    errores.push(`❌ Grava: debes ingresar <b>${CONCRETO_CORRECTO.grava} m³</b> (3/6 de 6,000 m³)`);
  }
  if (isNaN(vals.agua) || vals.agua !== CONCRETO_CORRECTO.agua) {
    errores.push(`❌ Agua: debes ingresar <b>${CONCRETO_CORRECTO.agua} m³</b> (10% de 6,000 m³)`);
  }

  const errEl = document.getElementById('cmat-error');
  if (errores.length > 0) {
    try {
      registrar('concreto_intento', {
        contexto: {
          cemento: vals.cemento, arena: vals.arena, grava: vals.grava, agua: vals.agua,
          correcto: false
        }
      });
    } catch (e) { }
    errEl.style.display = 'block';
    errEl.innerHTML = errores.join('<br>');
    return;
  }

  errEl.style.display = 'none';
  try {
    registrar('concreto_intento', {
      contexto: {
        cemento: vals.cemento, arena: vals.arena, grava: vals.grava, agua: vals.agua,
        correcto: true
      }
    });
  } catch (e) { }
  // validación exitosa → crear concreto 20×20 automáticamente
  concretoFinalizar();
}

// ── Fase 3 · Concreto en modo libre (?libre=1) ──────────────────────────────
// La validación vive en calculos.js (validarMezclaConcretoLibre). Aquí solo se conecta con el modal.
// El modo normal NO pasa por estas funciones: concretoMezclar/concretoActualizarBarra derivan aquí solo si modoLibreActivo.
function concretoLeerEntradasLibre() {
  const entradas = {};
  COMPONENTES_CONCRETO.forEach(m => {
    const inp = document.getElementById('inp-' + m);
    // Un <input type="number"> con texto no numérico (p. ej. "12abc") entrega value === '' y validity.badInput === true:
    // se marca con un texto que el validador reconoce como no numérico (y no como "vacío").
    entradas[m] = inp?.validity?.badInput ? '(no numérico)' : (inp?.value ?? '');
  });
  return entradas;
}

// Barra: cada tramo es la fracción de lo ingresado respecto al total ingresado (no hay "mezcla única correcta").
// Total en cero o no válido → tramos en 0 %. También actualiza el aviso educativo mientras se escribe.
function concretoActualizarBarraLibre() {
  const entradas = concretoLeerEntradasLibre();
  const vals = {};
  COMPONENTES_CONCRETO.forEach(m => {
    const c = convertirCantidadConcreto(entradas[m]);
    vals[m] = c.codigo === null ? c.valor : 0;
  });
  const total = calcularTotalConcreto(vals);
  const hayTotal = Number.isFinite(total) && total > 0;
  const totalEl = document.getElementById('cmat-total-val');
  if (totalEl) totalEl.textContent = Number.isFinite(total) ? total.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0';
  COMPONENTES_CONCRETO.forEach(m => {
    const seg = document.getElementById('cmat-bar-' + m);
    if (seg) seg.style.width = (hayTotal ? porcentajeBarra(vals[m], total) : 0) + '%';
  });
  const avisoEl = document.getElementById('cmat-aviso');
  if (avisoEl) {
    const { avisos } = validarMezclaConcretoLibre(entradas);
    avisoEl.textContent = avisos.map(a => a.mensaje).join(' ');
    avisoEl.style.display = avisos.length ? 'block' : 'none';
  }
}

function concretoMezclarLibre() {
  if (objList.some(o => o.type === 'concreto_slab_20')) {
    showLockedMessage('🪨 ¡Ya tienes el concreto creado! Si quieres poner uno nuevo, elimínalo primero para poder volver a crearlo.');
    return;
  }
  const entradas = concretoLeerEntradasLibre();
  const r = validarMezclaConcretoLibre(entradas);
  const errEl = document.getElementById('cmat-error');
  if (!r.ok) {
    // Telemetría del modo libre: campo "modo", entradas como TEXTO (nunca NaN/Infinity) y el motivo estructurado.
    try {
      registrar('concreto_intento', {
        contexto: {
          // Propiedad propia del modo libre: el evaluador del servidor puntúa la mezcla normal con otra propiedad y no debe verla aquí
          modo: 'libre', mezcla_valida: false,
          entradas: Object.fromEntries(COMPONENTES_CONCRETO.map(m => [m, String(entradas[m] ?? '').slice(0, 40)])),
          errores: r.errores.map(e => ({ campo: e.campo, codigo: e.codigo }))
        }
      });
    } catch (e) { }
    errEl.style.display = 'block';
    errEl.innerHTML = r.errores.map(e => '❌ ' + e.mensaje).join('<br>');
    return;
  }
  errEl.style.display = 'none';
  try {
    registrar('concreto_intento', {
      contexto: {
        modo: 'libre', mezcla_valida: true,
        cemento: r.valores.cemento, arena: r.valores.arena, grava: r.valores.grava, agua: r.valores.agua,
        avisos: r.avisos.map(a => a.codigo)
      }
    });
  } catch (e) { }
  concretoFinalizar(); // flujo actual de creación (losa fija 20×20)
}

// Textos del modal según el modo vigente. Los originales (modo normal) se guardan tal cual la primera vez y se restauran siempre.
let textosConcretoOriginales = null;
function aplicarTextosModalConcreto() {
  const ids = ['concreto-nota-volumen', 'concreto-sub-division', 'concreto-nota-division', 'cmat-total-ref'];
  const hints = COMPONENTES_CONCRETO.map(m => document.querySelector('#cmat-' + m + ' .cmat-hint'));
  if (!textosConcretoOriginales) {
    textosConcretoOriginales = {
      ids: ids.map(id => document.getElementById(id)?.innerHTML),
      hints: hints.map(h => h?.textContent)
    };
  }
  const libre = modoLibreActivo;
  const nuevos = [
    '📐 <b>Cantidad de material</b><br><span style="color:rgba(100,220,255,.9); font-size:16px; font-weight:700;">La eliges tú</span><br>' +
    '<span style="font-size:10px; opacity:.7;">En construcción libre no hay un volumen obligatorio</span>',
    'Tú decides las cantidades',
    'Escribe cuántos m³ de cemento, arena, grava y agua quieres mezclar.<br><br>' +
    '— Cemento, arena y grava deben ser mayores que 0<br>— El agua puede ser 0 (verás un aviso)<br>— No hay proporciones obligatorias',
    ''
  ];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = libre ? nuevos[i] : textosConcretoOriginales.ids[i];
  });
  hints.forEach((h, i) => {
    if (h) h.textContent = libre ? (COMPONENTES_CONCRETO[i] === 'agua' ? 'Cantidad libre (puede ser 0)' : 'Cantidad libre (mayor que 0)') : textosConcretoOriginales.hints[i];
  });
  const avisoEl = document.getElementById('cmat-aviso');
  if (avisoEl && !libre) { avisoEl.textContent = ''; avisoEl.style.display = 'none'; }
}

function concretoMedidaUpdate() {
  // ya no se usa - el concreto es automático 20×20
}

function concretoFinalizar() {
  // Crear losa 20×20 automáticamente
  const id = objIdCounter++;
  const root = new TransformNode('obj_' + id + '_concreto_slab', scene);
  root.position.set(0, 0, 0);
  const slab = MeshBuilder.CreateBox('con_slab_' + id, { width: 20, height: 0.2, depth: 20 }, scene);
  slab.material = MAT.concreto;
  slab.receiveShadows = true;
  slab.position.set(0, 0.1, 0);
  if (shadowGen) shadowGen.addShadowCaster(slab, false);
  slab.parent = root;
  clampToZone(root);
  root.userData = { id, type: 'concreto_slab_20', label: `${LABELS.concreto} 20×20`, emoji: EMOJIS.concreto, isMainSlab: true };
  objList.push({ id, type: 'concreto_slab_20', label: `${LABELS.concreto} 20×20`, emoji: EMOJIS.concreto, node: root });
  updateObjListUI();
  selectObject(root);
  // Deshabilitar el botón Crear Concreto hasta que se elimine la losa
  const btnStormCreate = document.getElementById('btnStorm');
  if (btnStormCreate) {
    btnStormCreate.disabled = true;
    btnStormCreate.style.opacity = '0.45';
    btnStormCreate.title = '🪨 Ya tienes el concreto creado. Elimínalo primero para poder crearlo de nuevo.';
  }
  unlockPhase2();
  closeConcretoModal();
  marcarSucio();
}

// valida que la casa tenga los elementos mínimos antes de habilitar programar
function validateHouse() {
  // Requiere concreto (losa principal o slab)
  const hasCemento = objList.some(o =>
    o.type === 'concreto' || o.type === 'concreto_slab' || o.type === 'concreto_slab_20'
  );
  if (!hasCemento) return { ok: false, msg: '⚠ La casa necesita el concreto base.' };

  // Requiere al menos una pared
  const hasParedes = objList.some(o => o.type === 'wall_block' || o.type === 'wall_madera');
  if (!hasParedes) return { ok: false, msg: '⚠ La casa necesita al menos una pared.' };

  // Requiere al menos un color aplicado — detecta cualquier material clonado/personalizado en paredes
  const hasColor = objList.some(o => {
    if (o.type !== 'wall_block' && o.type !== 'wall_madera') return false;
    const node = o.node;
    if (!node) return false;
    const defaultName = o.type === 'wall_block' ? 'block' : 'madera';
    return node.getChildMeshes().some(m => {
      const matName = m.material?.name || '';
      // El material fue clonado (colored, clone) o tiene nombre distinto al default
      return matName.includes('_colored_') || matName.includes('_clone_') ||
        (matName !== defaultName && matName !== '' && !matName.startsWith('wall'));
    });
  });
  if (!hasColor) return { ok: false, msg: '⚠ La casa necesita al menos un color aplicado. Selecciona una pared y usa el selector de color.' };

  return { ok: true };
}

function checkAndUpdateProgramarBtn() {
  if (buildPhase < 4 && !modoLibreActivo) return;
  const result = validateHouse();
  const btn = document.getElementById('btnProgramar');
  if (!btn) return;
  btn.disabled = !result.ok;
  btn.title = result.ok ? '' : result.msg;
}

// ─── NUEVO SISTEMA DE PROGRAMACIÓN POR BLOQUES ─────────────────────────────

// Estado del programa
let progBlocksUsed = new Set(); // IDs de bloques ya usados
let progSequence = []; // secuencia de bloques arrastrados al workspace

const BLOCK_META = {
  if: { type: 'structure', label: '🔀 Si (If)', color: '#f59e0b', desc: 'if' },
  else: { type: 'structure', label: '↩️ Sino (Else)', color: '#f59e0b', desc: 'else' },
  es_dia: { type: 'condition', label: '☀️ Es de día', color: '#3b82f6', desc: 'esDia()' },
  es_noche: { type: 'condition', label: '🌙 Es de noche', color: '#3b82f6', desc: 'esNoche()' },
  enciende_foco: { type: 'action', label: '💡 Enciende foco', color: '#22c55e', desc: 'encendeFoco()' },
  apaga_foco: { type: 'action', label: '🔆 Apaga foco', color: '#22c55e', desc: 'apagaFoco()' },
};

function openProgramar() {
  if (buildPhase < 4 && !modoLibreActivo) {
    const walls = countWalls();
    const remaining = 4 - walls;
    showLockedMessage('🔒 Necesitas construir al menos 4 paredes para desbloquear la programación. Te faltan ' + remaining + ' pared(es).');
    return;
  }
  document.getElementById('prog-overlay').classList.add('open');
  setupProgDragListeners();
  renderProgWorkspace();
  renderPseudocode();
}
function closeProgramar(e) {
  if (e && e.target !== document.getElementById('prog-overlay')) return;
  document.getElementById('prog-overlay').classList.remove('open');
}

function setupProgDragListeners() {
  document.querySelectorAll('.prog-block').forEach(el => {
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('prog-block-id', el.id.replace('pb-', ''));
    });
  });
}

function dropBlockNew(e) {
  e.preventDefault();
  const workspace = document.getElementById('prog-workspace');
  workspace.classList.remove('drag-over');
  const blockId = e.dataTransfer.getData('prog-block-id');
  if (!blockId || !BLOCK_META[blockId]) return;
  if (progBlocksUsed.has(blockId)) {
    showLockedMessage('⚠ Este bloque ya fue usado. Cada bloque solo puede usarse una vez.');
    return;
  }
  progBlocksUsed.add(blockId);
  progSequence.push(blockId);
  // Marcar bloque como usado visualmente
  const srcEl = document.getElementById('pb-' + blockId);
  if (srcEl) {
    srcEl.classList.add('used');
    srcEl.setAttribute('draggable', 'false');
  }
  renderProgWorkspace();
  renderPseudocode();
}

function renderProgWorkspace() {
  const ws = document.getElementById('prog-workspace');
  if (progSequence.length === 0) {
    ws.innerHTML = '<div id="prog-workspace-hint">Arrastra bloques aquí para construir tu programa</div>';
    return;
  }
  ws.innerHTML = progSequence.map((bid, i) => {
    const meta = BLOCK_META[bid];
    return `<div class="prog-ws-block ${meta.type}" style="--bcolor:${meta.color}">
      <span>${meta.label}</span>
      <button class="prog-ws-del" onclick="removeProgBlock(${i})" title="Quitar">✕</button>
    </div>`;
  }).join('');
}

function removeProgBlock(index) {
  const bid = progSequence[index];
  progSequence.splice(index, 1);
  progBlocksUsed.delete(bid);
  const srcEl = document.getElementById('pb-' + bid);
  if (srcEl) {
    srcEl.classList.remove('used');
    srcEl.setAttribute('draggable', 'true');
  }
  renderProgWorkspace();
  renderPseudocode();
}

function clearProgram() {
  progSequence = [];
  progBlocksUsed.clear();
  document.querySelectorAll('.prog-block').forEach(el => {
    el.classList.remove('used');
    el.setAttribute('draggable', 'true');
  });
  renderProgWorkspace();
  renderPseudocode();
  document.getElementById('prog-output-new').innerHTML = '';
}

// Genera el pseudocódigo a partir de la secuencia de bloques
function renderPseudocode() {
  const el = document.getElementById('prog-pseudocode');
  if (!el) return;
  if (progSequence.length === 0) {
    el.innerHTML = '<span class="pseudo-hint">El código aparecerá aquí cuando agregues bloques...</span>';
    return;
  }
  let indent = 0;
  let lines = [];
  progSequence.forEach(bid => {
    const meta = BLOCK_META[bid];
    const pad = '&nbsp;&nbsp;'.repeat(indent);
    if (bid === 'if') {
      lines.push(`<span class="pseudo-kw">${pad}si</span> (<span class="pseudo-ph">condición</span>) {`);
      indent++;
    } else if (bid === 'else') {
      if (indent > 0) indent--;
      lines.push(`<span class="pseudo-kw">${pad}} sino</span> {`);
      indent++;
    } else if (meta.type === 'condition') {
      // Reemplaza el placeholder de condición más reciente si hay un if abierto
      const lastIf = lines.findLastIndex(l => l.includes('pseudo-ph'));
      if (lastIf !== -1) {
        lines[lastIf] = lines[lastIf].replace(
          /<span class="pseudo-ph">.*?<\/span>/,
          `<span class="pseudo-cond">${meta.desc}</span>`
        );
      } else {
        lines.push(`${pad}<span class="pseudo-cond">${meta.desc}</span>`);
      }
    } else if (meta.type === 'action') {
      lines.push(`${pad}<span class="pseudo-act">${meta.desc}</span>;`);
    }
  });
  // cerrar bloques abiertos
  while (indent > 0) { indent--; lines.push('&nbsp;&nbsp;'.repeat(indent) + '}'); }
  el.innerHTML = lines.map(l => `<div class="pseudo-line">${l}</div>`).join('');
}

// Interpreta la secuencia y ejecuta acciones según estado actual
function runProgramNew() {
  const outEl = document.getElementById('prog-output-new');
  if (progSequence.length === 0) {
    outEl.innerHTML = '<div class="prog-out-warn">⚠ Agrega bloques al programa antes de ejecutar.</div>';
    return;
  }
  // Parsear la secuencia: buscar pares if/condicion/accion y else/accion
  let i = 0, msgs = [], executed = false;
  while (i < progSequence.length) {
    const b = progSequence[i];
    if (b === 'if') {
      // buscar condición
      const cond = progSequence[i + 1];
      if (cond === 'es_dia' || cond === 'es_noche') {
        const condTrue = (cond === 'es_dia' && !isNight) || (cond === 'es_noche' && isNight);
        const action = progSequence[i + 2];
        if (condTrue && action && BLOCK_META[action]?.type === 'action') {
          execActionNew(action);
          msgs.push(`<div class="prog-out-ok">✅ <b>${BLOCK_META[b].label}</b> ${BLOCK_META[cond].label} → <b>${BLOCK_META[action].label}</b> ejecutado</div>`);
          executed = true;
          i += 3;
          // check else
          if (progSequence[i] === 'else') {
            const elseAction = progSequence[i + 1];
            if (elseAction && BLOCK_META[elseAction]?.type === 'action') {
              msgs.push(`<div class="prog-out-skip">⏭ Sino → ${BLOCK_META[elseAction].label} (no ejecutado)</div>`);
              i += 2;
            } else { i++; }
          }
        } else if (!condTrue) {
          msgs.push(`<div class="prog-out-skip">⏭ <b>${BLOCK_META[b].label}</b> ${BLOCK_META[cond].label} → condición falsa</div>`);
          i += 3;
          // execute else
          if (progSequence[i] === 'else') {
            const elseAction = progSequence[i + 1];
            if (elseAction && BLOCK_META[elseAction]?.type === 'action') {
              execActionNew(elseAction);
              msgs.push(`<div class="prog-out-ok">✅ Sino → <b>${BLOCK_META[elseAction].label}</b> ejecutado</div>`);
              executed = true;
              i += 2;
            } else { i++; }
          }
        } else { i++; }
      } else { i++; }
    } else { i++; }
  }
  if (msgs.length === 0) {
    outEl.innerHTML = '<div class="prog-out-warn">⚠ El programa no tiene estructura válida. Usa: Si → Condición → Acción</div>';
  } else {
    outEl.innerHTML = msgs.join('') + (executed ? '<div class="prog-out-ok" style="margin-top:6px">🎉 ¡Programa ejecutado!</div>' : '');
  }
  try {
    registrar('programa_ejecutado', {
      contexto: { bloques: progSequence, resultado: msgs.length === 0 ? 'invalido' : (executed ? 'ejecutado' : 'no_ejecutado') }
    });
  } catch (e) { }
}

// Ejecutar acciones del nuevo sistema
function execActionNew(action) {
  if (action === 'enciende_foco') {
    // Encender focos y lámparas
    objList.filter(o => o.type === 'foco' || o.type === 'lampara').forEach(o => {
      o.node.getChildMeshes().forEach(m => {
        if (m.material && m.material.emissiveColor) m.material.emissiveColor = new Color3(1.0, 0.95, 0.6);
      });
      // Encender pointlights
      o.node.getChildTransformNodes?.()?.forEach(child => { });
      // Buscar PointLight hija
      scene.lights.forEach(light => {
        if (light.parent === o.node) { light.intensity = isNight ? 2.5 : 0.9; }
      });
    });
    focoState = 'on';
  }
  if (action === 'apaga_foco') {
    objList.filter(o => o.type === 'foco' || o.type === 'lampara').forEach(o => {
      o.node.getChildMeshes().forEach(m => {
        if (m.material && m.material.emissiveColor) m.material.emissiveColor = new Color3(0, 0, 0);
      });
      scene.lights.forEach(light => {
        if (light.parent === o.node) { light.intensity = 0; }
      });
    });
    focoState = 'off';
  }
}

// Estado actual del foco para que el botón de día/noche lo respete
let focoState = 'off';

// Ejecutar reglas automáticamente cuando cambia el estado día/noche
function execRulesByTriggerNew(trigger) {
  let i = 0;
  while (i < progSequence.length) {
    const b = progSequence[i];
    if (b === 'if') {
      const cond = progSequence[i + 1];
      const condTrue = (cond === 'es_dia' && trigger === 'es_dia') ||
        (cond === 'es_noche' && trigger === 'es_noche');
      const condFalse = (cond === 'es_dia' && trigger === 'es_noche') ||
        (cond === 'es_noche' && trigger === 'es_dia');
      const action = progSequence[i + 2];
      if (condTrue && action && BLOCK_META[action]?.type === 'action') {
        execActionNew(action);
        i += 3;
        if (progSequence[i] === 'else') {
          const elseAction = progSequence[i + 1];
          if (elseAction && BLOCK_META[elseAction]?.type === 'action') i += 2; else i++;
        }
      } else if (condFalse) {
        i += 3;
        if (progSequence[i] === 'else') {
          const elseAction = progSequence[i + 1];
          if (elseAction && BLOCK_META[elseAction]?.type === 'action') {
            execActionNew(elseAction);
            i += 2;
          } else i++;
        }
      } else { i++; }
    } else { i++; }
  }
}

// ─── SISTEMA ANTIGUO (compatibilidad) ────────────────────────────────────────
const TRIGGER_LABELS = {
  puerta_abre: '🚪 Puerta se abre', puerta_cierra: '🚪 Puerta se cierra', es_de_noche: '🌙 Es de noche'
};
const ACTION_LABELS = {
  encender_luz: '💡 Encender luz', apagar_luz: '🔆 Apagar luz', activar_alarma: '🚨 Activar alarma'
};

function dropBlock(e) {
  e.preventDefault();
}

function runProgram() { }

function deleteRule(i) {
  renderProgRules();
}

function renderProgRules() { }

function execRulesByTrigger(trigger) {
  execRulesByTriggerNew(trigger === 'es_de_noche' ? 'es_noche' : trigger);
}

function execAction(action) {
  execActionNew(action);
}

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const startTime = ctx.currentTime;
    const duration = 3, beepDuration = 0.15, beepInterval = 0.3;
    for (let t = 0; t < duration; t += beepInterval) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = t % (beepInterval * 2) < beepInterval ? 880 : 660;
      gain.gain.setValueAtTime(0.3, startTime + t);
      gain.gain.setValueAtTime(0, startTime + t + beepDuration);
      osc.start(startTime + t);
      osc.stop(startTime + t + beepDuration + 0.01);
    }
  } catch (e) { }
}

// cambia entre la pestaña de pared, piso y techo en el modal del constructor
function switchWallTab(tab) {
  ['pared', 'piso', 'techo'].forEach(t => {
    const tabEl = document.getElementById('tab-' + t);
    const contentEl = document.getElementById('tab-content-' + t);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
    if (contentEl) contentEl.style.display = t === tab ? '' : 'none';
  });
  if (tab === 'pared') wbUpdate();
  else if (tab === 'piso') { wpSelectedW = 20; wpSelectedD = 20; wpUpdate(); }
  else if (tab === 'techo') { roofAutoFit(false); roofUpdate(); }
}

// constructor de pisos con tamaños fijos y validación de cobertura 20×20
let wpMatSelected = 'vitropiso';
let wpVitropisoColor = '#5ba8ff';
let wpSelectedW = 20;
let wpSelectedD = 20;

// Registro de m² de vitropiso ya colocados (suma de todos los floor_vitropiso)
function getVitropisoArea() {
  // Delegado a calculos.js (Fase 1). Original:
  //   return objList.filter(o => o.type === 'floor_vitropiso').reduce((sum, o) => sum + (o.area || 0), 0);
  return sumarAreaPisos(objList);
}

function wpSelectMat(el) {
  document.querySelectorAll('#wp-mat-options .wb-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  wpMatSelected = el.dataset.mat;
  wpUpdate();
}

function wpSelectSize(el) {
  document.querySelectorAll('.wp-size-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  wpSelectedW = parseInt(el.dataset.w);
  wpSelectedD = parseInt(el.dataset.d);
  wpUpdate();
}

function wpTogglePalette() {
  const popup = document.getElementById('wp-palette-popup');
  if (popup) popup.style.display = popup.style.display === 'none' ? '' : 'none';
}

function wpSelectColor(el) {
  document.querySelectorAll('.wp-color-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  wpVitropisoColor = el.dataset.color;
  const name = el.dataset.name || el.title || '';
  // Actualizar preview del botón principal
  const circle = document.getElementById('wp-color-selected-circle');
  if (circle) circle.style.background = wpVitropisoColor;
  const nameEl = document.getElementById('wp-color-selected-name');
  if (nameEl) nameEl.textContent = name;
  const custom = document.getElementById('wp-color-custom');
  if (custom) custom.value = wpVitropisoColor;
  const preview = document.getElementById('wp-color-preview');
  if (preview) preview.style.background = wpVitropisoColor;
}

function wpSelectCustomColor(hex) {
  wpVitropisoColor = hex;
  document.querySelectorAll('.wp-color-btn').forEach(b => b.classList.remove('selected'));
  const circle = document.getElementById('wp-color-selected-circle');
  if (circle) circle.style.background = hex;
  const nameEl = document.getElementById('wp-color-selected-name');
  if (nameEl) nameEl.textContent = 'Personalizado';
  const preview = document.getElementById('wp-color-preview');
  if (preview) preview.style.background = hex;
}

function wpUpdate() {
  const w = wpSelectedW;
  const d = wpSelectedD;
  const newArea = w * d;
  const coveredArea = getVitropisoArea();
  const total = 400;
  const remaining = total - coveredArea;
  // Delegado a calculos.js (Fase 1): situación de la cobertura. Originales de cada rama:
  //   coveredArea >= total  |  coveredArea + newArea > total (maxAllowed = total - coveredArea)  |  after = coveredArea + newArea
  const cobertura = calcularCoberturaPiso(coveredArea, newArea, total);

  // Actualizar info de dimensión
  const dimEl = document.getElementById('wp-build-dim');
  if (dimEl) dimEl.textContent = `${w} × ${d} m`;
  const areaTagEl = document.getElementById('wp-build-area-tag');
  if (areaTagEl) areaTagEl.textContent = `${newArea} m²`;

  // Actualizar barra de cobertura
  const coveredEl = document.getElementById('wp-covered');
  if (coveredEl) coveredEl.textContent = coveredArea;

  const fillEl = document.getElementById('wp-coverage-fill');
  if (fillEl) fillEl.style.width = Math.min((coveredArea / total) * 100, 100) + '%';

  // Preview de lo que se agregaría
  const previewEl = document.getElementById('wp-coverage-preview-fill');
  const msgEl = document.getElementById('wp-coverage-msg');
  const btn = document.getElementById('wp-build-btn');

  if (cobertura.estado === 'completo') {
    if (previewEl) { previewEl.style.left = '100%'; previewEl.style.width = '0%'; }
    if (msgEl) { msgEl.textContent = '✅ ¡Piso completo! 400 / 400 m²'; msgEl.className = 'ok'; }
    if (btn) btn.disabled = true;
  } else if (cobertura.estado === 'excede') {
    const maxAllowed = cobertura.maxPermitido;
    if (previewEl) {
      previewEl.style.left = Math.min((coveredArea / total) * 100, 100) + '%';
      previewEl.style.width = Math.min((newArea / total) * 100, 100) + '%';
      previewEl.style.background = 'rgba(255,80,80,.3)';
    }
    if (msgEl) { msgEl.textContent = `⚠ Se excede el área. Solo quedan ${maxAllowed} m² libres.`; msgEl.className = 'over'; }
    if (btn) btn.disabled = true;
  } else {
    if (previewEl) {
      previewEl.style.left = Math.min((coveredArea / total) * 100, 100) + '%';
      previewEl.style.width = Math.min((newArea / total) * 100, 100) + '%';
      previewEl.style.background = 'rgba(255,255,255,.18)';
    }
    if (msgEl) {
      msgEl.textContent = cobertura.exacto
        ? `✅ ¡Perfecto! Completarás los 400 m²`
        : `Quedarán ${cobertura.quedan} m² por cubrir`;
      msgEl.className = cobertura.exacto ? 'ok' : '';
    }
    if (btn) btn.disabled = false;
  }
}

// Devuelve el bounding box 2D (xMin,xMax,zMin,zMax) de un vitropiso colocado
function getFloorBounds(o) {
  const pos = o.node.position;
  const w = o.w || 0;
  const d = o.d || 0;
  return {
    xMin: pos.x - w / 2,
    xMax: pos.x + w / 2,
    zMin: pos.z - d / 2,
    zMax: pos.z + d / 2,
  };
}

// Verifica si dos bounding boxes 2D se solapan
function boundsOverlap(a, b) {
  return a.xMin < b.xMax && a.xMax > b.xMin && a.zMin < b.zMax && a.zMax > b.zMin;
}

function buildFloor() {
  const w = wpSelectedW;
  const d = wpSelectedD;
  const newArea = w * d;
  const coveredArea = getVitropisoArea();

  if (coveredArea + newArea > 400) {
    showLockedMessage(`⚠ No cabe. Solo quedan ${400 - coveredArea} m² libres de los 400 m² totales.`);
    return;
  }

  // Verificar sobreposición visual con vitropisos ya colocados
  // El nuevo se colocaría en posición (0,0) centrado
  const newBounds = { xMin: -w / 2, xMax: w / 2, zMin: -d / 2, zMax: d / 2 };
  const existingFloors = objList.filter(o => o.type === 'floor_vitropiso');
  for (const existing of existingFloors) {
    const eb = getFloorBounds(existing);
    if (boundsOverlap(newBounds, eb)) {
      showLockedMessage('⚠ Se empalmaría con un vitropiso ya colocado. Mueve el anterior antes de colocar otro.');
      return;
    }
  }

  const type = 'vitropiso';
  const id = objIdCounter++;
  const root = new TransformNode('obj_' + id + '_floor_vitropiso', scene);
  root.position.set(0, 0, 0);

  const hex = wpVitropisoColor;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const floorMat = new PBRMaterial('vitropiso_custom_' + id, scene);
  floorMat.albedoColor = new Color3(r, g, b);
  floorMat.alpha = 0.82; floorMat.metallic = 0.15; floorMat.roughness = 0.02;
  floorMat.backFaceCulling = false;
  floorMat.emissiveColor = new Color3(r * 0.08, g * 0.08, b * 0.08);

  const h = 0.06;
  const yOffset = 0.21;
  const startX = -(w / 2) + 0.5;
  const startZ = -(d / 2) + 0.5;

  for (let col = 0; col < w; col++) {
    for (let row = 0; row < d; row++) {
      const mesh = MeshBuilder.CreateBox(
        'floor_' + id + '_' + col + '_' + row,
        { width: 0.97, height: h, depth: 0.97 }, scene
      );
      mesh.position.set(startX + col, (h / 2) + yOffset, startZ + row);
      mesh.material = floorMat;
      mesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(mesh, false);
      mesh.parent = root;
    }
  }

  const label = `${LABELS.vitropiso} ${w}×${d}`;
  root.userData = { id, type: 'floor_vitropiso', label, emoji: EMOJIS.vitropiso, color: hex };
  objList.push({ id, type: 'floor_vitropiso', label, emoji: EMOJIS.vitropiso, node: root, area: newArea, w, d });
  clampToZone(root);
  updateObjListUI();
  selectObject(root);
  wpUpdate();

  const totalCovered = getVitropisoArea();
  if (totalCovered >= 400) {
    setTip('✅ ¡Vitropiso completo! Toda la losa está cubierta. Ya puedes construir las paredes.');
    unlockPhase2();
  } else {
    setTip(`🔷 Vitropiso ${w}×${d} colocado · Faltan ${400 - totalCovered} m² por cubrir`);
  }
  closeWallBuilder();
  try {
    registrar('piso_construido', {
      contexto: { ancho: w, profundidad: d, color: hex }
    });
  } catch (e) { }
  marcarSucio();
}

// abre, cierra y aplica colores a los objetos que lo permiten
function openColorPicker(node) {
  if (!node) return;
  const type = node.userData?.type || '';
  const baseType = type.replace('wall_', '').replace('floor_', '');
  if (!COLORABLE_TYPES.includes(baseType)) return;
  colorPickerTarget = node;
  document.getElementById('color-picker-popup').style.display = 'block';
}
function closeColorPicker() {
  document.getElementById('color-picker-popup').style.display = 'none';
  colorPickerTarget = null;
}
function setSwatchColor(hex) {
  document.getElementById('color-picker-input').value = hex;
  applyColorPicker();
}
function applyColorPicker() {
  if (!colorPickerTarget) return;
  const hex = document.getElementById('color-picker-input').value;
  colorPickerTarget.userData = colorPickerTarget.userData || {};
  colorPickerTarget.userData.color = hex;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const col = new Color3(r, g, b);
  colorPickerTarget.getChildMeshes().forEach(m => {
    if (m.material && m.material.albedoColor !== undefined) {
      const name = m.name || '';
      const isDetail = name.includes('mad_g') || name.includes('con_l') || name.includes('vit_g') || name.includes('bar_wire') || name.includes('bar_rod');
      if (!isDetail) {
        const clone = m.material.clone(m.material.name + '_colored_' + colorPickerTarget.userData.id);
        clone.albedoColor = col;
        m.material = clone;
      }
    }
  });
  if (buildPhase >= 4 || modoLibreActivo) checkAndUpdateProgramarBtn();
  marcarSucio();
}
function confirmColorPicker() {
  applyColorPicker();
  closeColorPicker();
  setTip('🎨 Color aplicado · Selecciona otro elemento para cambiar su color');
  marcarSucio();
}

// construye una pared de bloques o madera con las dimensiones elegidas
let wbMat = 'block';

function openWallBuilder() {
  if (!concretoUnlocked && !modoLibreActivo) {
    showLockedMessage('Esta función aún no está disponible. Completa los pasos anteriores para desbloquear.');
    return;
  }
  document.getElementById('wall-overlay').classList.add('open');
  document.getElementById('tab-pared').style.display = '';
  document.getElementById('tab-piso').style.display = '';
  const tabTecho = document.getElementById('tab-techo');
  if (tabTecho) tabTecho.style.display = '';
  switchWallTab('pared');
  // Resetear modo y actualizar contadores al abrir
  wbWallMode = 'simple';
  wbVentanasCount = 1;
  document.querySelectorAll('.wb-mode-card').forEach(c => c.classList.remove('selected'));
  const sc = document.getElementById('wb-mode-simple');
  if (sc) sc.classList.add('selected');
  const vr = document.getElementById('wb-vent-count-row');
  if (vr) vr.style.display = 'none';
  const btn = document.getElementById('wb-build-btn');
  if (btn) btn.textContent = '⬆ Construir Pared';
  // Actualizar estado de tarjetas según disponibilidad
  updateModeCardStates();
  wbUpdate();
}
function closeWallBuilder(e) {
  if (e && e.target !== document.getElementById('wall-overlay')) return;
  document.getElementById('wall-overlay').classList.remove('open');
}
function wbSelectMat(el) {
  document.querySelectorAll('#wb-mat-options .wb-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  wbMat = el.dataset.mat;
  wbUpdate();
}
function wbUpdate() {
  const w = parseInt(document.getElementById('wb-width').value);
  const h = parseInt(document.getElementById('wb-height').value);
  document.getElementById('wb-width-val').textContent = w;
  document.getElementById('wb-height-val').textContent = h;
  // Delegado a calculos.js (Fase 1). Fórmulas originales, como respaldo:
  //   const bW = 1.0;
  //   const bH = wbMat === 'block' ? 0.7 : (wbMat === 'madera' ? 0.2 : 0.5);
  //   const totalW = w * bW;  const totalH = h * bH;
  //   let huecos = 0;
  //   if (wbWallMode === 'puerta') huecos = Math.min(4, h);                       // 1 col × 4 filas
  //   else if (wbWallMode === 'ventana') huecos = wbVentanasCount * Math.min(2, h); // 1 col × 2 filas por ventana
  //   const piezas = Math.max(0, w * h - huecos);
  const { ancho: totalW, alto: totalH } = calcularDimensionesMuro(w, h, wbMat);
  const piezas = calcularPiezasMuro(w, h, wbWallMode, wbVentanasCount);
  document.getElementById('wb-total').textContent = piezas + ' piezas';
  document.getElementById('wb-dims').textContent = `${totalW.toFixed(1)} m × ${totalH.toFixed(1)} m`;

  // Regenerar preview SVG
  renderWallPreview(w, h, wbMat, wbWallMode, wbVentanasCount);

  // Validar ancho mínimo para pared con puerta (necesita ≥ 3 cols)
  const btn = document.getElementById('wb-build-btn');
  if (wbWallMode === 'puerta' && w < 3) {
    btn.disabled = true;
    document.getElementById('wb-preview-warn').textContent = '⚠ Necesitas al menos 3 columnas para una pared con puerta.';
  } else if (wbWallMode === 'ventana' && w < (wbVentanasCount === 2 ? 5 : 3)) {
    btn.disabled = true;
    document.getElementById('wb-preview-warn').textContent = '⚠ Necesitas más columnas para ' + wbVentanasCount + ' ventana(s).';
  } else {
    btn.disabled = false;
    document.getElementById('wb-preview-warn').textContent = '';
  }
}

function renderWallPreview(w, h, mat, mode, ventCount) {
  const svg = document.getElementById('wb-wall-svg');
  if (!svg) return;
  const cellW = Math.min(22, Math.floor(300 / w));
  const cellH = Math.min(16, Math.floor(140 / h));
  const svgW = w * cellW;
  const svgH = h * cellH;
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.setAttribute('width', svgW);
  svg.setAttribute('height', svgH);

  const blockColor = mat === 'block' ? '#9ca3af' : (mat === 'madera' ? '#92400e' : '#64748b');
  const blockStroke = mat === 'block' ? '#6b7280' : (mat === 'madera' ? '#78350f' : '#475569');

  // Calcular qué celdas son hueco
  const huecos = new Set();
  if (mode === 'puerta') {
    const midCol = Math.floor(w / 2);
    const doorRows = Math.min(4, h);
    for (let r = 0; r < doorRows; r++) huecos.add(`${midCol},${r}`);
  } else if (mode === 'ventana') {
    const positions = ventCount === 1
      ? [Math.floor(w / 2)]
      : [Math.floor(w / 4), Math.floor(3 * w / 4)];
    // Ventanas en zona alta pero con 1 bloque de dintel arriba y 1 fila libre abajo
    const winTopRow = Math.max(1, h - 2); // deja fila (h-1) como dintel
    const winBotRow = Math.max(1, h - 3);
    positions.forEach(col => {
      for (let r = winBotRow; r <= winTopRow; r++) huecos.add(`${col},${r}`);
    });
  }

  let cells = '';
  for (let row = 0; row < h; row++) {
    const drawRow = h - 1 - row; // dibuja de arriba a abajo visualmente
    for (let col = 0; col < w; col++) {
      const isHueco = huecos.has(`${col},${row}`);
      const x = col * cellW;
      const y = drawRow * cellH;
      if (isHueco) {
        // Hueco: color especial según tipo
        const hColor = mode === 'puerta' ? '#fbbf24' : '#67e8f9';
        const hStroke = mode === 'puerta' ? '#f59e0b' : '#06b6d4';
        cells += `<rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" fill="${hColor}" fill-opacity="0.35" stroke="${hStroke}" stroke-width="1" rx="1"/>`;
        // Icono pequeño en el centro del hueco
        if (mode === 'puerta' && row === 0 && col === Math.floor(w / 2)) {
          cells += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 3}" font-size="${Math.min(10, cellH - 2)}" text-anchor="middle" fill="#fbbf24">🚪</text>`;
        } else if (mode === 'ventana' && row === Math.max(1, h - 2)) {
          cells += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 3}" font-size="${Math.min(9, cellH - 2)}" text-anchor="middle" fill="#67e8f9">🪟</text>`;
        }
      } else {
        cells += `<rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" fill="${blockColor}" stroke="${blockStroke}" stroke-width="0.8" rx="1"/>`;
      }
    }
  }
  svg.innerHTML = cells;
}

function wbSelectMode(mode) {
  // Verificar límites antes de seleccionar
  if (mode === 'puerta' && puertas_colocadas >= MAX_PUERTAS) {
    showLockedMessage('🚪 Ya usaste las ' + MAX_PUERTAS + ' puertas permitidas. No puedes agregar más.');
    return;
  }
  if (mode === 'ventana' && ventanas_colocadas >= MAX_VENTANAS) {
    showLockedMessage('🪟 Ya usaste las ' + MAX_VENTANAS + ' ventanas permitidas. No puedes agregar más.');
    return;
  }
  wbWallMode = mode;
  // Actualizar tarjetas
  document.querySelectorAll('.wb-mode-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('wb-mode-' + mode);
  if (card) card.classList.add('selected');

  // Mostrar/ocultar opciones de ventanas
  const ventOpts = document.getElementById('wb-vent-count-row');
  if (ventOpts) ventOpts.style.display = mode === 'ventana' ? 'flex' : 'none';

  // Ajustar altura mínima: puerta necesita >= 4 filas
  const hSlider = document.getElementById('wb-height');
  if (hSlider) {
    if (mode === 'puerta') { hSlider.min = 4; if (parseInt(hSlider.value) < 4) hSlider.value = 4; }
    else if (mode === 'ventana') { hSlider.min = 4; if (parseInt(hSlider.value) < 4) hSlider.value = 4; }
    else { hSlider.min = 2; }
  }

  // Actualizar etiqueta del botón
  const btn = document.getElementById('wb-build-btn');
  if (btn) {
    btn.textContent = mode === 'simple' ? '⬆ Construir Pared'
      : mode === 'puerta' ? '⬆ Construir Pared con Puerta'
        : '⬆ Construir Pared con Ventana(s)';
  }
  wbUpdate();
}

function wbSetVentCount(n) {
  wbVentanasCount = n;
  document.querySelectorAll('.wb-vent-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('wb-vent-btn-' + n);
  if (btn) btn.classList.add('selected');
  wbUpdate();
}

function buildWall() {
  const w = parseInt(document.getElementById('wb-width').value);
  const h = parseInt(document.getElementById('wb-height').value);
  const type = wbMat;
  const mode = wbWallMode;
  const bW = 1.0;
  const bH = type === 'block' ? 0.7 : (type === 'madera' ? 0.2 : 0.5);
  const bD = type === 'block' ? 0.5 : (type === 'madera' ? 0.2 : 0.25);

  // Validaciones de modo
  if (mode === 'puerta') {
    if (puertas_colocadas >= MAX_PUERTAS) {
      showLockedMessage('🚪 Ya alcanzaste el límite de ' + MAX_PUERTAS + ' puertas.'); return;
    }
    if (w < 3) { showLockedMessage('⚠ La pared con puerta necesita al menos 3 columnas de ancho.'); return; }
    if (h < 4) { showLockedMessage('⚠ La pared con puerta necesita al menos 4 filas de alto.'); return; }
  }
  if (mode === 'ventana') {
    if (ventanas_colocadas >= MAX_VENTANAS) {
      showLockedMessage('🪟 Ya alcanzaste el límite de ' + MAX_VENTANAS + ' ventanas.'); return;
    }
    const minW = wbVentanasCount === 2 ? 5 : 3;
    if (w < minW) { showLockedMessage('⚠ Necesitas al menos ' + minW + ' columnas para ' + wbVentanasCount + ' ventana(s).'); return; }
  }

  const id = objIdCounter++;
  const root = new TransformNode('obj_' + id + '_wall_' + type, scene);
  root.position.set(0, 0, 0);
  const totalW = w * bW;
  const startX = -(totalW / 2) + bW / 2;

  // Calcular qué celdas son huecos
  const huecos = new Set();
  if (mode === 'puerta') {
    const midCol = Math.floor(w / 2);
    const doorRows = Math.min(4, h);
    for (let r = 0; r < doorRows; r++) huecos.add(`${midCol},${r}`);
  } else if (mode === 'ventana') {
    const positions = wbVentanasCount === 1
      ? [Math.floor(w / 2)]
      : [Math.floor(w / 4), Math.floor(3 * w / 4)];
    // Ventanas en la zona alta pero dejando SIEMPRE 1 fila de bloque arriba y 1 abajo
    // hueco: filas (h-3) y (h-2), de modo que (h-1) queda como dintel encima
    const winTopRow = Math.max(1, h - 2); // fila superior del hueco (deja 1 bloque arriba)
    const winBotRow = Math.max(1, h - 3); // fila inferior del hueco
    positions.forEach(col => {
      for (let r = winBotRow; r <= winTopRow; r++) huecos.add(`${col},${r}`);
    });
  }

  // Construir bloques saltando huecos
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      if (huecos.has(`${col},${row}`)) continue; // hueco → no poner bloque
      const px = startX + col * bW;
      const py = (bH / 2) + row * bH;
      let mesh;
      if (type === 'block') {
        mesh = MeshBuilder.CreateBox('wall_blk_' + id + '_' + row + '_' + col, { width: bW - 0.04, height: bH - 0.04, depth: bD }, scene);
        mesh.material = MAT.block;
      } else if (type === 'madera') {
        mesh = MeshBuilder.CreateBox('wall_mad_' + id + '_' + row + '_' + col, { width: bW - 0.04, height: bH - 0.02, depth: bD }, scene);
        mesh.material = MAT.madera;
      } else {
        mesh = MeshBuilder.CreateBox('wall_lam_' + id + '_' + row + '_' + col, { width: bW - 0.04, height: bH - 0.02, depth: bD }, scene);
        mesh.material = MAT.lamina;
      }
      mesh.position.set(px, py, 0);
      mesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(mesh, false);
      mesh.parent = root;
    }
  }

  // Colisión: la pared nueva no puede quedar dentro de otra pared o bloque ya colocado.
  // Nace en el origen; si está ocupado se busca el hueco libre más cercano. Se hace antes de
  // registrar puertas/ventanas o contadores, así que si no hay espacio no queda nada a medias.
  root.userData = { type: 'wall_' + type };
  const huecosLibres = [];
  for (let r = 1; r <= 20; r++) {
    for (let k = 0; k < 16; k++) huecosLibres.push([Math.cos(k * Math.PI / 8) * r, Math.sin(k * Math.PI / 8) * r]);
  }
  if (!colocarSinSolapar(root, huecosLibres)) {
    root.getChildMeshes().forEach(m => { if (shadowGen) shadowGen.removeShadowCaster(m); });
    root.dispose();
    showLockedMessage('🧱 No hay espacio libre para construir otra pared sin que se superponga con las existentes.');
    return;
  }

  // Colocar puertas/ventanas en los huecos automáticamente
  if (mode === 'puerta') {
    const midCol = Math.floor(w / 2);
    const doorId = objIdCounter++;
    const doorRoot = new TransformNode('obj_' + doorId + '_puerta', scene);
    const px = startX + midCol * bW;
    doorRoot.position.set(px, 0, 0);
    doorRoot.parent = root;
    BUILDERS['puerta'](doorRoot);
    doorRoot.getChildMeshes().forEach(m => {
      m.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(m, false);
    });
    // Registrar la puerta en objList también
    doorRoot.userData = { id: doorId, type: 'puerta', label: LABELS.puerta, emoji: EMOJIS.puerta, embeddedInWall: id };
    objList.push({ id: doorId, type: 'puerta', label: LABELS.puerta, emoji: EMOJIS.puerta, node: doorRoot });
    puertas_colocadas++;
  } else if (mode === 'ventana') {
    const positions = wbVentanasCount === 1
      ? [Math.floor(w / 2)]
      : [Math.floor(w / 4), Math.floor(3 * w / 4)];
    positions.forEach((col, vi) => {
      const winId = objIdCounter++;
      const winRoot = new TransformNode('obj_' + winId + '_ventana', scene);
      const px = startX + col * bW;
      // Centrar la ventana en el hueco: filas (h-3) a (h-2)
      // El hueco ocupa desde la base de fila (h-3) hasta el tope de fila (h-2)
      // base del hueco = (h-3)*bH, tope = (h-3)*bH + 2*bH
      // centro del hueco = (h-3)*bH + bH = (h-2)*bH
      // El builder de ventana tiene su geometría centrada en y=0.7 (el marco win_fr está en y=0.7)
      // Necesitamos que el centro geométrico de la ventana quede en el centro del hueco
      // Centro del hueco en world Y = (h-3)*bH + bH = (h-2)*bH
      const winBotRow = Math.max(1, h - 3);
      const holeCenterY = winBotRow * bH + bH; // centro entre las 2 filas del hueco
      // win_fr está centrado en y=0.7 relativo al root, así que el root debe ir en holeCenterY - 0.7
      const py = holeCenterY - 0.7;
      winRoot.position.set(px, py, 0);
      winRoot.parent = root;
      BUILDERS['ventana'](winRoot);
      winRoot.getChildMeshes().forEach(m => {
        m.receiveShadows = true;
        if (shadowGen) shadowGen.addShadowCaster(m, false);
      });
      winRoot.userData = { id: winId, type: 'ventana', label: LABELS.ventana, emoji: EMOJIS.ventana, embeddedInWall: id };
      objList.push({ id: winId, type: 'ventana', label: LABELS.ventana, emoji: EMOJIS.ventana, node: winRoot });
    });
    ventanas_colocadas += wbVentanasCount;
  }

  updateOpeningCounters();

  const modeTag = mode === 'puerta' ? ' + 🚪 Puerta' : mode === 'ventana' ? ` + 🪟 ${wbVentanasCount} Ventana(s)` : '';
  const matName = LABELS[type];
  const label = `Pared ${matName} ${w}×${h}${modeTag}`;
  const emoji = EMOJIS[type];
  root.userData = { id, type: 'wall_' + type, label, emoji, wallMode: mode, w, h };
  objList.push({ id, type: 'wall_' + type, label, emoji, node: root, w, d: h });

  // Medidas educativas
  const doorH = (Math.min(4, h) * bH).toFixed(2);
  const winH = (Math.min(2, h - 1) * bH).toFixed(2);
  const dimMsg = mode === 'puerta'
    ? `📐 <b>Puerta:</b> 1.00 m ancho × ${doorH} m alto · <b>La pared:</b> ${(w * bW).toFixed(1)} m × ${(h * bH).toFixed(1)} m`
    : mode === 'ventana'
      ? `📐 <b>Ventana(s):</b> 1.00 m ancho × ${winH} m alto · <b>La pared:</b> ${(w * bW).toFixed(1)} m × ${(h * bH).toFixed(1)} m`
      : `📐 <b>Pared:</b> ${(w * bW).toFixed(1)} m ancho × ${(h * bH).toFixed(1)} m alto · ${w * h} bloques`;

  clampToZone(root);
  updateObjListUI();
  selectObject(root);
  closeWallBuilder();
  // Desbloquear Programar cuando haya al menos 4 paredes
  if (buildPhase < 4 && countWalls() >= 4) unlockAll();

  showSuccessMessage('✅ ¡Pared construida!<br>' + dimMsg);
  setTip(`<b>${emoji} ${label}</b> lista · Q/E rotar · R/F inclinar · Arrastra flechas para mover`);
  try {
    registrar('pared_construida', {
      pos_x: root.position.x, pos_y: root.position.y, pos_z: root.position.z,
      contexto: {
        modo: mode,
        material: type,
        ancho: w, alto: h
      }
    });
  } catch (e) { }
  marcarSucio();
}

// ─── CONSTRUCTOR DE TECHOS (MODULAR Y AMPLIABLE) ───────────────────────────
let roofShapeSelected = 'plano';
let roofMatSelected = 'teja';

const ROOF_SHAPES = {
  plano: {
    id: 'plano',
    label: 'Techo Plano',
    desc: 'Cubierta horizontal uniforme con alero perimetral',
    icon: '🟦',
    isFlat: true
  },
  dos_aguas: {
    id: 'dos_aguas',
    label: 'A Dos Aguas',
    desc: 'Dos vertientes inclinadas unidas en cumbrera central',
    icon: '⛺',
    isFlat: false
  },
  cuatro_aguas: {
    id: 'cuatro_aguas',
    label: 'A Cuatro Aguas',
    desc: 'Cubierta inclinada hacia los cuatro costados con limatesas',
    icon: '🏛️',
    isFlat: false
  },
  una_agua: {
    id: 'una_agua',
    label: 'A Una Agua',
    desc: 'Superficie única inclinada para rápido desagüe',
    icon: '📐',
    isFlat: false
  }
};

const ROOF_MATERIALS = {
  // Fase 4: label e icon salen de MATERIALES (mismos valores); id y colorHex son propios del techo.
  concreto: { id: 'concreto', label: MATERIALES.concreto.label, icon: MATERIALES.concreto.emoji, colorHex: '#9ca3af' },
  madera: { id: 'madera', label: MATERIALES.madera.label, icon: MATERIALES.madera.emoji, colorHex: '#92400e' },
  lamina: { id: 'lamina', label: MATERIALES.lamina.label, icon: MATERIALES.lamina.emoji, colorHex: '#64748b' },
  teja: { id: 'teja', label: MATERIALES.teja.label, icon: MATERIALES.teja.emoji, colorHex: '#ea580c' }
};

function getRoofMaterial(matKey) {
  if (matKey === 'concreto') return MAT.concreto;
  if (matKey === 'madera') return MAT.madera;
  if (matKey === 'lamina') return MAT.lamina;
  if (matKey === 'teja') return MAT.teja;
  return MAT.teja;
}

function getHouseBounds() {
  const walls = objList.filter(o => o.type.startsWith('wall_') || o.type === 'block' || o.type === 'madera' || o.type === 'lamina');
  if (walls.length === 0) {
    const slab = objList.find(o => o.type === 'concreto_slab_20');
    if (slab) {
      return { minX: -10, maxX: 10, minZ: -10, maxZ: 10, maxY: 0.2, centerX: 0, centerZ: 0, w: 20, d: 20, hasWalls: false };
    }
    return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, maxY: 0, centerX: 0, centerZ: 0, w: 10, d: 10, hasWalls: false };
  }

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let maxY = -Infinity;

  walls.forEach(o => {
    const meshes = o.node.getChildMeshes();
    meshes.forEach(m => {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      if (bb.minimumWorld.x < minX) minX = bb.minimumWorld.x;
      if (bb.maximumWorld.x > maxX) maxX = bb.maximumWorld.x;
      if (bb.minimumWorld.z < minZ) minZ = bb.minimumWorld.z;
      if (bb.maximumWorld.z > maxZ) maxZ = bb.maximumWorld.z;
      if (bb.maximumWorld.y > maxY) maxY = bb.maximumWorld.y;
    });
  });

  // Delegado a calculos.js (Fase 1). Originales:
  //   const w = Math.max(3, Math.min(24, Math.round(maxX - minX + 0.6)));
  //   const d = Math.max(3, Math.min(24, Math.round(maxZ - minZ + 0.6)));
  const w = calcularDimensionCubierta(minX, maxX);
  const d = calcularDimensionCubierta(minZ, maxZ);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return { minX, maxX, minZ, maxZ, maxY: Math.max(0.2, maxY), centerX, centerZ, w, d, hasWalls: true };
}

function roofSelectShape(shape) {
  if (!ROOF_SHAPES[shape]) return;
  roofShapeSelected = shape;
  document.querySelectorAll('.roof-shape-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('roof-shape-' + shape);
  if (card) card.classList.add('selected');

  const hRow = document.getElementById('roof-height-row');
  if (hRow) {
    hRow.style.display = shape === 'plano' ? 'none' : 'block';
  }

  roofUpdate();
}

function roofSelectMat(el) {
  document.querySelectorAll('#roof-mat-options .wb-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  roofMatSelected = el.dataset.mat;
  roofUpdate();
}

function roofAutoFit(force = false) {
  const bounds = getHouseBounds();
  const wSlider = document.getElementById('roof-width');
  const dSlider = document.getElementById('roof-depth');
  if (wSlider && (force || !wSlider.dataset.userEdited)) {
    wSlider.value = bounds.w;
  }
  if (dSlider && (force || !dSlider.dataset.userEdited)) {
    dSlider.value = bounds.d;
  }
  roofUpdate();
}

function roofUpdate() {
  const wEl = document.getElementById('roof-width');
  const dEl = document.getElementById('roof-depth');
  const hEl = document.getElementById('roof-height');
  if (!wEl || !dEl) return;

  const w = parseFloat(wEl.value);
  const d = parseFloat(dEl.value);
  const h = roofShapeSelected === 'plano' ? 0.25 : (hEl ? parseFloat(hEl.value) : 1.8);

  const wVal = document.getElementById('roof-width-val');
  if (wVal) wVal.textContent = w.toFixed(1) + ' m';
  const dVal = document.getElementById('roof-depth-val');
  if (dVal) dVal.textContent = d.toFixed(1) + ' m';
  const hVal = document.getElementById('roof-height-val');
  if (hVal) hVal.textContent = h.toFixed(1) + ' m';

  const shapeConfig = ROOF_SHAPES[roofShapeSelected] || ROOF_SHAPES.plano;
  const matConfig = ROOF_MATERIALS[roofMatSelected] || ROOF_MATERIALS.teja;

  // Delegado a calculos.js (Fase 1). Fórmula original, como respaldo:
  //   let calcArea = w * d;
  //   if (roofShapeSelected === 'dos_aguas') calcArea = 2 * Math.hypot(w / 2, h) * d;
  //   else if (roofShapeSelected === 'cuatro_aguas') calcArea = 2 * (w / 2 * Math.hypot(d / 2, h)) + 2 * (d / 2 * Math.hypot(w / 2, h));
  //   else if (roofShapeSelected === 'una_agua') calcArea = Math.hypot(d, h) * w;
  const calcArea = calcularAreaTecho(roofShapeSelected, w, d, h);

  const infoShape = document.getElementById('roof-info-shape');
  if (infoShape) infoShape.textContent = shapeConfig.label;
  const infoMat = document.getElementById('roof-info-mat');
  if (infoMat) infoMat.textContent = matConfig.label;
  const infoDims = document.getElementById('roof-info-dims');
  if (infoDims) infoDims.textContent = `${w.toFixed(1)} × ${d.toFixed(1)} m` + (roofShapeSelected !== 'plano' ? ` · Altura: ${h.toFixed(1)} m` : '');
  const infoArea = document.getElementById('roof-info-area');
  if (infoArea) infoArea.textContent = calcArea.toFixed(1) + ' m²';

  renderRoofPreview(w, d, h, roofShapeSelected, roofMatSelected);
}

function renderRoofPreview(w, d, h, shape, matKey) {
  const svg = document.getElementById('roof-svg');
  if (!svg) return;
  const matConfig = ROOF_MATERIALS[matKey] || ROOF_MATERIALS.teja;
  const baseColor = matConfig.colorHex;

  svg.setAttribute('viewBox', '0 0 200 110');
  let svgContent = '';

  if (shape === 'plano') {
    svgContent = `
      <defs>
        <linearGradient id="planoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseColor}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="${baseColor}" stop-opacity="0.65"/>
        </linearGradient>
      </defs>
      <polygon points="100,20 170,45 100,75 30,50" fill="url(#planoGrad)" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
      <polygon points="30,50 100,75 100,85 30,60" fill="${baseColor}" fill-opacity="0.8" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <polygon points="100,75 170,45 170,55 100,85" fill="${baseColor}" fill-opacity="0.55" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      ${matKey === 'lamina' ? `
        <line x1="50" y1="36" x2="120" y2="61" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
        <line x1="75" y1="28" x2="145" y2="53" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      ` : matKey === 'teja' ? `
        <line x1="65" y1="62" x2="135" y2="37" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" stroke-dasharray="4 3"/>
      ` : ''}
      <text x="100" y="102" fill="rgba(180,215,255,0.9)" font-size="10" text-anchor="middle" font-weight="bold">Plano: ${w.toFixed(1)} × ${d.toFixed(1)} m</text>
    `;
  } else if (shape === 'dos_aguas') {
    svgContent = `
      <defs>
        <linearGradient id="slopeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseColor}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="${baseColor}" stop-opacity="0.7"/>
        </linearGradient>
        <linearGradient id="slopeRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseColor}" stop-opacity="0.75"/>
          <stop offset="100%" stop-color="${baseColor}" stop-opacity="0.45"/>
        </linearGradient>
      </defs>
      <polygon points="30,70 100,78 100,28" fill="${baseColor}" fill-opacity="0.85" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <polygon points="30,70 100,28 160,20 90,62" fill="url(#slopeLeft)" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
      <polygon points="100,78 100,28 160,20 160,70" fill="url(#slopeRight)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <line x1="100" y1="28" x2="160" y2="20" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <text x="100" y="102" fill="rgba(180,215,255,0.9)" font-size="10" text-anchor="middle" font-weight="bold">Dos Aguas: ${w.toFixed(1)} × ${d.toFixed(1)} m · H: ${h.toFixed(1)} m</text>
    `;
  } else if (shape === 'cuatro_aguas') {
    svgContent = `
      <polygon points="100,26 135,24 165,65 100,75 35,65" fill="${baseColor}" fill-opacity="0.85" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
      <polygon points="100,26 135,24 100,75" fill="${baseColor}" fill-opacity="0.95" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <polygon points="35,65 100,75 100,26" fill="${baseColor}" fill-opacity="0.7" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <polygon points="100,75 165,65 135,24" fill="${baseColor}" fill-opacity="0.5" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <line x1="100" y1="26" x2="135" y2="24" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="100" y1="26" x2="35" y2="65" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="100" y1="26" x2="100" y2="75" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <line x1="135" y1="24" x2="165" y2="65" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
      <text x="100" y="102" fill="rgba(180,215,255,0.9)" font-size="10" text-anchor="middle" font-weight="bold">Cuatro Aguas: ${w.toFixed(1)} × ${d.toFixed(1)} m</text>
    `;
  } else if (shape === 'una_agua') {
    svgContent = `
      <polygon points="40,28 150,22 150,55 40,61" fill="${baseColor}" fill-opacity="0.5" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
      <polygon points="40,28 40,82 130,82" fill="${baseColor}" fill-opacity="0.75" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <polygon points="40,28 150,22 170,72 60,78" fill="${baseColor}" fill-opacity="0.9" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
      <polygon points="60,78 170,72 170,82 60,88" fill="${baseColor}" fill-opacity="0.6" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <text x="100" y="102" fill="rgba(180,215,255,0.9)" font-size="10" text-anchor="middle" font-weight="bold">Una Agua: ${w.toFixed(1)} × ${d.toFixed(1)} m · H: ${h.toFixed(1)} m</text>
    `;
  }

  svg.innerHTML = svgContent;
}

// ── Geometría 3D de Techos ────────────────────────────────────────────────
function buildRoofGeometry(root, id, shape, matKey, w, d, h) {
  const mat = getRoofMaterial(matKey);
  const meshes = [];

  if (shape === 'plano') {
    const slabT = 0.22;
    const slab = MeshBuilder.CreateBox('roof_slab_' + id, { width: w, height: slabT, depth: d }, scene);
    slab.position.set(0, slabT / 2, 0);
    slab.material = mat;
    slab.parent = root;
    meshes.push(slab);

    const fT = 0.12;
    const fH = slabT + 0.08;
    const fFront = MeshBuilder.CreateBox('roof_ff_' + id, { width: w + 0.16, height: fH, depth: fT }, scene);
    fFront.position.set(0, fH / 2 - 0.02, d / 2 + fT / 2);
    fFront.material = mat;
    fFront.parent = root;
    meshes.push(fFront);

    const fBack = MeshBuilder.CreateBox('roof_fb_' + id, { width: w + 0.16, height: fH, depth: fT }, scene);
    fBack.position.set(0, fH / 2 - 0.02, -d / 2 - fT / 2);
    fBack.material = mat;
    fBack.parent = root;
    meshes.push(fBack);

    const fLeft = MeshBuilder.CreateBox('roof_fl_' + id, { width: fT, height: fH, depth: d }, scene);
    fLeft.position.set(-w / 2 - fT / 2, fH / 2 - 0.02, 0);
    fLeft.material = mat;
    fLeft.parent = root;
    meshes.push(fLeft);

    const fRight = MeshBuilder.CreateBox('roof_fr_' + id, { width: fT, height: fH, depth: d }, scene);
    fRight.position.set(w / 2 + fT / 2, fH / 2 - 0.02, 0);
    fRight.material = mat;
    fRight.parent = root;
    meshes.push(fRight);

    if (matKey === 'lamina') {
      const step = 0.8;
      for (let x = -w / 2 + step; x < w / 2; x += step) {
        const rib = MeshBuilder.CreateBox('roof_rib_' + id + '_' + x.toFixed(1), { width: 0.04, height: 0.03, depth: d }, scene);
        rib.position.set(x, slabT + 0.015, 0);
        rib.material = MAT.metal;
        rib.parent = root;
        meshes.push(rib);
      }
    } else if (matKey === 'madera') {
      const step = 1.2;
      for (let x = -w / 2 + 0.6; x < w / 2; x += step) {
        const beam = MeshBuilder.CreateBox('roof_beam_' + id + '_' + x.toFixed(1), { width: 0.14, height: 0.14, depth: d - 0.1 }, scene);
        beam.position.set(x, -0.07, 0);
        beam.material = MAT.madera;
        beam.parent = root;
        meshes.push(beam);
      }
    } else if (matKey === 'teja') {
      const stepZ = 1.0;
      for (let z = -d / 2 + stepZ; z < d / 2; z += stepZ) {
        const tileLine = MeshBuilder.CreateBox('roof_tl_' + id + '_' + z.toFixed(1), { width: w - 0.1, height: 0.03, depth: 0.08 }, scene);
        tileLine.position.set(0, slabT + 0.015, z);
        tileLine.material = MAT.teja;
        tileLine.parent = root;
        meshes.push(tileLine);
      }
    }
  } else if (shape === 'dos_aguas') {
    const hw = w / 2;
    const slopeL = Math.hypot(hw, h);
    const theta = Math.atan2(h, hw);
    const slabT = 0.14;
    const overhang = 0.35;

    const slopeLMesh = MeshBuilder.CreateBox('roof_sl_l_' + id, { width: slopeL + overhang, height: slabT, depth: d + overhang * 2 }, scene);
    slopeLMesh.position.set(-hw / 2, h / 2, 0);
    slopeLMesh.rotation.z = -theta;
    slopeLMesh.material = mat;
    slopeLMesh.parent = root;
    meshes.push(slopeLMesh);

    const slopeRMesh = MeshBuilder.CreateBox('roof_sl_r_' + id, { width: slopeL + overhang, height: slabT, depth: d + overhang * 2 }, scene);
    slopeRMesh.position.set(hw / 2, h / 2, 0);
    slopeRMesh.rotation.z = theta;
    slopeRMesh.material = mat;
    slopeRMesh.parent = root;
    meshes.push(slopeRMesh);

    const ridgeMat = matKey === 'teja' ? MAT.teja : (matKey === 'lamina' ? MAT.metal : mat);
    const ridge = MeshBuilder.CreateBox('roof_rd_' + id, { width: 0.32, height: 0.12, depth: d + overhang * 2 + 0.06 }, scene);
    ridge.position.set(0, h + slabT / 2, 0);
    ridge.material = ridgeMat;
    ridge.parent = root;
    meshes.push(ridge);

    createGableWall(root, id, 'f', hw, h, d / 2, -0.12, mat, meshes);
    createGableWall(root, id, 'b', hw, h, -d / 2, 0.12, mat, meshes);

    if (matKey === 'lamina') {
      const step = 0.8;
      for (let z = -d / 2; z <= d / 2; z += step) {
        const ribL = MeshBuilder.CreateBox('roof_rbl_' + id + '_' + z.toFixed(1), { width: slopeL, height: 0.03, depth: 0.03 }, scene);
        ribL.position.set(-hw / 2, h / 2 + 0.08, z);
        ribL.rotation.z = -theta;
        ribL.material = MAT.metal;
        ribL.parent = root;
        meshes.push(ribL);

        const ribR = MeshBuilder.CreateBox('roof_rbr_' + id + '_' + z.toFixed(1), { width: slopeL, height: 0.03, depth: 0.03 }, scene);
        ribR.position.set(hw / 2, h / 2 + 0.08, z);
        ribR.rotation.z = theta;
        ribR.material = MAT.metal;
        ribR.parent = root;
        meshes.push(ribR);
      }
    } else if (matKey === 'teja') {
      const ridgeCyl = MeshBuilder.CreateCylinder('roof_rcyl_' + id, { diameter: 0.28, height: d + overhang * 2 + 0.08, tessellation: 12 }, scene);
      ridgeCyl.rotation.x = Math.PI / 2;
      ridgeCyl.position.set(0, h + slabT / 2 + 0.04, 0);
      ridgeCyl.material = MAT.teja;
      ridgeCyl.parent = root;
      meshes.push(ridgeCyl);
    }
  } else if (shape === 'cuatro_aguas') {
    const hw = w / 2;
    const hd = d / 2;
    const overhang = 0.3;

    createHipRoofMesh(root, id, hw + overhang, hd + overhang, h, mat, meshes);
    const baseFascia = createPerimeterFascia(root, id, (hw + overhang) * 2, (hd + overhang) * 2, 0.12, mat);
    meshes.push(...baseFascia);
  } else if (shape === 'una_agua') {
    const hd = d / 2;
    const hw = w / 2;
    const slopeL = Math.hypot(d, h);
    const phi = Math.atan2(h, d);
    const slabT = 0.14;
    const overhang = 0.35;

    const slab = MeshBuilder.CreateBox('roof_shed_' + id, { width: w + overhang * 2, height: slabT, depth: slopeL + overhang }, scene);
    slab.position.set(0, h / 2, 0);
    slab.rotation.x = phi;
    slab.material = mat;
    slab.parent = root;
    meshes.push(slab);

    const backWall = MeshBuilder.CreateBox('roof_sw_b_' + id, { width: w, height: h, depth: 0.12 }, scene);
    backWall.position.set(0, h / 2, -hd + 0.06);
    backWall.material = mat;
    backWall.parent = root;
    meshes.push(backWall);

    createShedSideWall(root, id, 'l', -hw + 0.06, hd, h, mat, meshes);
    createShedSideWall(root, id, 'r', hw - 0.06, hd, h, mat, meshes);

    const topCap = MeshBuilder.CreateBox('roof_sc_' + id, { width: w + overhang * 2 + 0.04, height: 0.08, depth: 0.2 }, scene);
    topCap.position.set(0, h + slabT / 2, -hd - overhang / 2);
    topCap.material = matKey === 'lamina' ? MAT.metal : mat;
    topCap.parent = root;
    meshes.push(topCap);

    if (matKey === 'lamina') {
      const step = 0.8;
      for (let x = -w / 2; x <= w / 2; x += step) {
        const rib = MeshBuilder.CreateBox('roof_srib_' + id + '_' + x.toFixed(1), { width: 0.03, height: 0.03, depth: slopeL }, scene);
        rib.position.set(x, h / 2 + 0.08, 0);
        rib.rotation.x = phi;
        rib.material = MAT.metal;
        rib.parent = root;
        meshes.push(rib);
      }
    }
  }

  meshes.forEach(m => {
    m.receiveShadows = true;
    if (shadowGen) shadowGen.addShadowCaster(m, false);
  });

  return meshes;
}

function createGableWall(root, id, side, hw, h, zPos, zThick, mat, meshes) {
  const mesh = new Mesh('roof_gw_' + side + '_' + id, scene);
  const z1 = zPos;
  const z2 = zPos + zThick;
  const positions = [
    -hw, 0, z1,   hw, 0, z1,   0, h, z1,
    -hw, 0, z2,   hw, 0, z2,   0, h, z2,
  ];
  const indices = [
    0, 1, 2,  0, 2, 1,
    3, 5, 4,  3, 4, 5,
    0, 3, 4,  0, 4, 1,
    0, 2, 5,  0, 5, 3,
    1, 4, 5,  1, 5, 2
  ];
  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.applyToMesh(mesh);
  mesh.material = mat;
  mesh.parent = root;
  meshes.push(mesh);
}

function createShedSideWall(root, id, side, xPos, hd, h, mat, meshes) {
  const mesh = new Mesh('roof_sw_' + side + '_' + id, scene);
  const x1 = xPos - 0.06;
  const x2 = xPos + 0.06;
  const positions = [
    x1, 0, hd,   x1, 0, -hd,   x1, h, -hd,
    x2, 0, hd,   x2, 0, -hd,   x2, h, -hd
  ];
  const indices = [
    0, 1, 2,  0, 2, 1,
    3, 5, 4,  3, 4, 5,
    0, 3, 4,  0, 4, 1,
    1, 4, 5,  1, 5, 2,
    0, 2, 5,  0, 5, 3
  ];
  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.applyToMesh(mesh);
  mesh.material = mat;
  mesh.parent = root;
  meshes.push(mesh);
}

function createHipRoofMesh(root, id, hw, hd, h, mat, meshes) {
  const mesh = new Mesh('roof_hip_' + id, scene);
  let positions = [];
  let indices = [];

  if (hd >= hw) {
    const rL = Math.max(0.2, (hd - hw) * 1.4);
    positions = [
      -hw, 0, -hd,
       hw, 0, -hd,
       hw, 0,  hd,
      -hw, 0,  hd,
        0, h, -rL / 2,
        0, h,  rL / 2
    ];
    indices = [
      0, 1, 4,   0, 4, 1,
      2, 3, 5,   2, 5, 3,
      3, 0, 4,   3, 4, 0,
      3, 4, 5,   3, 5, 4,
      1, 2, 5,   1, 5, 2,
      1, 5, 4,   1, 4, 5,
      0, 3, 2,   0, 2, 3,
      0, 2, 1,   0, 1, 2
    ];
  } else {
    const rL = Math.max(0.2, (hw - hd) * 1.4);
    positions = [
      -hw, 0, -hd,
       hw, 0, -hd,
       hw, 0,  hd,
      -hw, 0,  hd,
      -rL / 2, h, 0,
       rL / 2, h, 0
    ];
    indices = [
      3, 0, 4,   3, 4, 0,
      1, 2, 5,   1, 5, 2,
      0, 1, 5,   0, 5, 1,
      0, 5, 4,   0, 4, 5,
      2, 3, 4,   2, 4, 3,
      2, 4, 5,   2, 5, 4,
      0, 3, 2,   0, 2, 3,
      0, 2, 1,   0, 1, 2
    ];
  }

  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.applyToMesh(mesh);
  mesh.material = mat;
  mesh.parent = root;
  meshes.push(mesh);
}

function createPerimeterFascia(root, id, width, depth, height, mat) {
  const fT = 0.12;
  const fFront = MeshBuilder.CreateBox('roof_pf_f_' + id, { width: width + fT, height: height, depth: fT }, scene);
  fFront.position.set(0, height / 2 - 0.02, depth / 2 + fT / 2);
  fFront.material = mat;
  fFront.parent = root;

  const fBack = MeshBuilder.CreateBox('roof_pf_b_' + id, { width: width + fT, height: height, depth: fT }, scene);
  fBack.position.set(0, height / 2 - 0.02, -depth / 2 - fT / 2);
  fBack.material = mat;
  fBack.parent = root;

  const fLeft = MeshBuilder.CreateBox('roof_pf_l_' + id, { width: fT, height: height, depth: depth }, scene);
  fLeft.position.set(-width / 2 - fT / 2, height / 2 - 0.02, 0);
  fLeft.material = mat;
  fLeft.parent = root;

  const fRight = MeshBuilder.CreateBox('roof_pf_r_' + id, { width: fT, height: height, depth: depth }, scene);
  fRight.position.set(width / 2 + fT / 2, height / 2 - 0.02, 0);
  fRight.material = mat;
  fRight.parent = root;

  return [fFront, fBack, fLeft, fRight];
}

function buildRoof() {
  const wEl = document.getElementById('roof-width');
  const dEl = document.getElementById('roof-depth');
  const hEl = document.getElementById('roof-height');
  const w = wEl ? parseFloat(wEl.value) : 10;
  const d = dEl ? parseFloat(dEl.value) : 10;
  const h = roofShapeSelected === 'plano' ? 0.25 : (hEl ? parseFloat(hEl.value) : 1.8);
  const shape = roofShapeSelected;
  const matKey = roofMatSelected;

  const bounds = getHouseBounds();
  const posX = bounds.centerX;
  const posY = bounds.maxY;
  const posZ = bounds.centerZ;

  const id = objIdCounter++;
  const root = new TransformNode('obj_' + id + '_roof', scene);
  root.position.set(posX, posY, posZ);

  buildRoofGeometry(root, id, shape, matKey, w, d, h);

  const shapeConfig = ROOF_SHAPES[shape] || ROOF_SHAPES.plano;
  const matConfig = ROOF_MATERIALS[matKey] || ROOF_MATERIALS.teja;
  const label = `${shapeConfig.label} (${matConfig.label}) ${w.toFixed(1)}×${d.toFixed(1)}`;
  const emoji = '🏠';

  let calcArea = w * d;
  if (shape === 'dos_aguas') calcArea = 2 * Math.hypot(w / 2, h) * d;
  else if (shape === 'cuatro_aguas') calcArea = 2 * (w / 2 * Math.hypot(d / 2, h)) + 2 * (d / 2 * Math.hypot(w / 2, h));
  else if (shape === 'una_agua') calcArea = Math.hypot(d, h) * w;

  root.userData = {
    id,
    type: 'roof',
    roofShape: shape,
    roofMat: matKey,
    label,
    emoji,
    w,
    d,
    h,
    area: Math.round(calcArea * 10) / 10
  };

  objList.push({
    id,
    type: 'roof',
    roofShape: shape,
    roofMat: matKey,
    label,
    emoji,
    node: root,
    w,
    d,
    h,
    area: Math.round(calcArea * 10) / 10
  });

  clampToZone(root);
  updateObjListUI();
  selectObject(root);
  closeWallBuilder();

  showSuccessMessage(`✅ ¡Techo construido!<br>📐 <b>${label}</b> · Cubierta: ${calcArea.toFixed(1)} m²`);
  setTip(`<b>🏠 ${label}</b> colocada sobre la vivienda · Arrastra flechas para ajustar posición · Q/E rotar · ✕ Eliminar para rehacer`);

  try {
    registrar('techo_construido', {
      pos_x: root.position.x, pos_y: root.position.y, pos_z: root.position.z,
      contexto: { forma: shape, material: matKey, ancho: w, profundidad: d, alto: h, area: calcArea }
    });
  } catch (e) { }

  marcarSucio();
}

function reconstructRoof(o) {
  const p = o.p || [0, 2.5, 0];
  const r = o.r || [0, 0, 0];
  const s = o.s || [1, 1, 1];
  const shape = o.roofShape || 'plano';
  const matKey = o.roofMat || 'teja';
  const w = o.w || 10;
  const d = o.d || 10;
  const h = o.roofH != null ? o.roofH : (o.h != null ? o.h : 1.8);

  const root = new TransformNode('obj_' + o.id + '_roof', scene);
  root.position.set(p[0], p[1], p[2]);
  root.rotation.set(r[0], r[1], r[2]);
  root.scaling.set(s[0], s[1], s[2]);

  buildRoofGeometry(root, o.id, shape, matKey, w, d, h);

  if (o.color) {
    const cr = parseInt(o.color.slice(1, 3), 16) / 255;
    const cg = parseInt(o.color.slice(3, 5), 16) / 255;
    const cb = parseInt(o.color.slice(5, 7), 16) / 255;
    const col = new Color3(cr, cg, cb);
    root.getChildMeshes().forEach(m => {
      if (m.material && m.material.albedoColor !== undefined) {
        const clone = m.material.clone(m.material.name + '_colored_' + o.id);
        clone.albedoColor = col;
        m.material = clone;
      }
    });
  }

  const shapeConfig = ROOF_SHAPES[shape] || ROOF_SHAPES.plano;
  const matConfig = ROOF_MATERIALS[matKey] || ROOF_MATERIALS.teja;
  const label = `${shapeConfig.label} (${matConfig.label}) ${w}×${d}`;
  const emoji = '🏠';

  root.userData = {
    id: o.id,
    type: 'roof',
    roofShape: shape,
    roofMat: matKey,
    label,
    emoji,
    w,
    d,
    h,
    area: o.area
  };
  if (o.color) root.userData.color = o.color;

  objList.push({
    id: o.id,
    type: 'roof',
    roofShape: shape,
    roofMat: matKey,
    label,
    emoji,
    node: root,
    w,
    d,
    h,
    area: o.area
  });
}


// muestra un mensaje de función bloqueada como toast
// ── Reiniciar casa ──────────────────────────────────────────────
function abrirConfirmReset() {
  try { registrar('modal_abierto', { contexto: { modal: 'confirm_reset' } }); } catch (e) { }
  document.getElementById('reset-overlay').classList.add('open');
}
function cerrarConfirmReset(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  document.getElementById('reset-overlay').classList.remove('open');
}
async function confirmarReset() {
  const btn = document.getElementById('btnResetConfirm');
  btn.disabled = true;
  btn.textContent = 'Reiniciando…';
  try {
    await reiniciar();
    try { registrar('proyecto_reiniciado', {}); } catch (e) { }
    location.reload();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Sí, reiniciar';
    showLockedMessage('No se pudo reiniciar. Revisa tu conexión e intenta de nuevo.');
  }
}
window.abrirConfirmReset = abrirConfirmReset;
window.cerrarConfirmReset = cerrarConfirmReset;
window.confirmarReset = confirmarReset;

// ── Indicador de guardado ───────────────────────────────────────
function setSaveBadge(estado) {
  const el = document.getElementById('save-badge');
  if (!el) return;
  el.className = 'save-badge ' + estado;
  el.textContent = { guardando: '⏳ Guardando…', ok: '✓ Guardado', pendiente: '● Cambios sin guardar', error: '⚠ Error al guardar' }[estado] || '';
}
document.addEventListener('guardado:guardando', () => setSaveBadge('guardando'));
document.addEventListener('guardado:ok', () => setSaveBadge('ok'));
document.addEventListener('guardado:pendiente', () => setSaveBadge('pendiente'));
document.addEventListener('guardado:error', () => setSaveBadge('error'));

// ── Panel de color arrastrable ──────────────────────────────────
(function setupColorPickerDrag() {
  const popup = document.getElementById('color-picker-popup');
  const handle = document.getElementById('color-picker-header');
  if (!popup || !handle) return;
  let dragging = false, offX = 0, offY = 0;

  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    const rect = popup.getBoundingClientRect();
    offX = e.clientX - rect.left;
    offY = e.clientY - rect.top;
    popup.style.bottom = 'auto';
    popup.style.left = rect.left + 'px';
    popup.style.top = rect.top + 'px';
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const maxX = window.innerWidth - popup.offsetWidth;
    const maxY = window.innerHeight - popup.offsetHeight;
    popup.style.left = Math.min(Math.max(0, e.clientX - offX), maxX) + 'px';
    popup.style.top = Math.min(Math.max(0, e.clientY - offY), maxY) + 'px';
  });
  window.addEventListener('pointerup', () => { dragging = false; });
})();

// ── Entrega de la casa (desbloquea el Cuestionario en learn.html) ──
let entregando = false; // evita entregas simultáneas (doble clic)
async function entregarCasa() {
  const btn = document.getElementById('btnEntregar');
  if (btn.classList.contains('entregado')) {
    showLockedMessage('Ya entregaste tu casa. Puedes seguir editándola si quieres.');
    return;
  }
  if (entregando) return;
  if (!confirm('¿Entregar tu casa? Esto desbloqueará el Cuestionario del Proyecto en tu ruta de aprendizaje. Podrás seguir editando después si quieres.')) return;

  entregando = true;
  try {
    await asegurarGuardado(); // la entrega usa la versión más reciente; si falla, no se entrega
    const pid = parseInt(new URLSearchParams(location.search).get('proyecto') || 1, 10);
    const res = await fetch('/api/entrega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ proyecto_id: pid })
    });
    if (!res.ok) throw new Error((await res.json()).error || res.status);
    btn.classList.add('entregado');
    btn.title = 'Ya entregada';
    showSuccessMessage('🎉 ¡Casa entregada! Ya puedes ir al Cuestionario del Proyecto.');
  } catch (e) {
    showLockedMessage('No se pudo entregar: ' + e.message + '. Verifica que tu casa esté guardada.');
  } finally {
    entregando = false;
  }
}
window.entregarCasa = entregarCasa;

// Fase 4: sincroniza el catálogo visual del HTML con MATERIALES. El HTML conserva sus textos y emojis
// como valor de reserva (se ven antes de que cargue el módulo); aquí solo se reescriben con el mismo dato central.
function sincronizarCatalogoVisual(doc = document, datos = MATERIALES) {
  ['block', 'madera', 'lamina', 'foco', 'puerta', 'ventana', 'vitropiso', 'lampara', 'concreto'].forEach(clave => {
    const item = doc.getElementById('cat-' + clave);
    const m = datos[clave];
    if (!item || !m) return;
    const ico = item.querySelector('.ico');
    if (ico) ico.textContent = m.emoji;
    for (const n of item.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) { n.nodeValue = n.nodeValue.replace(/\S(?:[\s\S]*\S)?/, () => m.label); break; }
    }
  });
  ['#wb-mat-options', '#roof-mat-options'].forEach(sel => {
    doc.querySelectorAll(sel + ' .wb-opt[data-mat]').forEach(el => {
      const m = datos[el.dataset.mat];
      if (m) el.textContent = `${m.emoji} ${m.label}`;
    });
  });
  const info = doc.getElementById('roof-info-mat'); // la selección inicial del techo es 'teja'
  if (info && datos.teja) info.textContent = datos.teja.label;
}
sincronizarCatalogoVisual();

(async function chequearEntrega() {
  try {
    const pid = parseInt(new URLSearchParams(location.search).get('proyecto') || 1, 10);
    const res = await fetch('/api/entrega?proyecto_id=' + pid, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) return;
    const d = await res.json();
    if (d.entregado) {
      const btn = document.getElementById('btnEntregar');
      if (btn) { btn.classList.add('entregado'); btn.title = 'Ya entregada'; }
    }
  } catch (e) { /* silencioso: no bloquea el simulador */ }
})();

function showLockedMessage(msg) {
  let toast = document.getElementById('locked-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'locked-toast';
    toast.style.cssText = `
      position:fixed; top:70px; left:50%; transform:translateX(-50%);
      background:rgba(5,12,35,.97); border:1px solid rgba(255,160,60,.5);
      border-radius:12px; padding:14px 22px; color:rgba(255,200,100,.95);
      font-size:13px; letter-spacing:.04em; z-index:200;
      box-shadow:0 8px 40px rgba(0,0,0,.6); text-align:center;
      max-width:480px; line-height:1.6; transition:opacity .3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
  }, 3500);
}

// ── Cortar bloque: menú contextual + modal + lógica de corte ─────────────────
// Permite reducir el ancho (eje X local) de un Block o Madera suelto al
// porcentaje que elija el alumno. Reconstruye las mallas con las nuevas
// medidas, conserva material/color, posición, rotación y actualiza el hitbox.
const CUT_TYPES = ['block', 'madera'];

/**
 * Reconstruye las mallas hijas de `node` con un ancho = 1.0 × factor.
 * Conserva material, color personalizado, posición y rotación del nodo.
 */
function cortarBloque(node, factor) {
  const type = node.userData?.type;
  if (!type || !CUT_TYPES.includes(type)) return;
  factor = Math.max(0.05, Math.min(1, Math.round(factor * 100) / 100));

  // ── guardar material actual del cuerpo (puede estar pintado) ──
  const children = node.getChildMeshes();
  let savedMat = null;
  const bodyMesh = children.find(m => m.name.includes('blk_body') || m.name.includes('mad_body'));
  if (bodyMesh) savedMat = bodyMesh.material;

  // ── eliminar mallas viejas ──
  children.slice().forEach(m => {
    if (shadowGen) try { shadowGen.removeShadowCaster(m); } catch (_) { }
    m.dispose();
  });

  const newW = 1.0 * factor;

  if (type === 'block') {
    // Block original: width=1.0, height=0.7, depth=0.5, pos (0,0.35,0)
    const b = box('blk_body', newW, 0.7, 0.5, 0, 0.35, 0, savedMat || MAT.block);
    b.parent = node;
    if (shadowGen) shadowGen.addShadowCaster(b, false);
  } else {
    // Madera original: body width=1.0, height=0.2, depth=0.2, pos (0,0.1,0)
    const body = box('mad_body', newW, 0.2, 0.2, 0, 0.1, 0, savedMat || MAT.madera);
    body.parent = node;
    if (shadowGen) shadowGen.addShadowCaster(body, false);
    // vetas de madera: solo las que caben dentro del nuevo ancho
    const halfW = newW / 2;
    [-0.38, -0.13, 0.12, 0.37].filter(x => x > -halfW + 0.02 && x < halfW - 0.02).forEach((px, i) => {
      const gm = new PBRMaterial('grain_cut_' + i + '_' + (node.userData?.id || 0), scene);
      gm.albedoColor = new Color3(0.28, 0.16, 0.06); gm.roughness = 0.9;
      const g = box('mad_g' + i, 0.01, 0.2, 0.2, px, 0.1, 0, gm);
      g.parent = node;
      if (shadowGen) shadowGen.addShadowCaster(g, false);
    });
  }

  // actualizar estado
  node.userData.cutFactor = factor;
  hitboxLocal.delete(node);   // invalida caché para que el hitbox OBB se recalcule
  blockEstado.delete(node);   // resetea el estado válido de colisión
  marcarSucio();
}

/**
 * Crea el menú contextual de clic derecho y el modal de corte con slider visual.
 * Se llama una vez desde init().
 */
function setupBlockContextMenu() {
  // ── evitar menú nativo del navegador en el canvas ──
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ── Dimensiones originales de cada tipo de bloque (ancho en metros) ──
  const ORIG_WIDTH = { block: 1.0, madera: 1.0 };
  const MIN_FACTOR = 0.05;   // factor mínimo (5 cm para ambos)

  // ── menú contextual ──
  const menu = document.createElement('div');
  menu.id = 'block-ctx-menu';
  menu.style.cssText = `
    display:none; position:fixed; z-index:300;
    background:rgba(8,16,40,.97); border:1px solid rgba(100,160,255,.45);
    border-radius:10px; padding:4px 0; min-width:190px;
    box-shadow:0 8px 32px rgba(0,0,0,.6); backdrop-filter:blur(8px);
    font-family:inherit; font-size:13px; user-select:none;
  `;
  const cutBtn = document.createElement('div');
  cutBtn.id = 'ctx-cut-btn';
  cutBtn.style.cssText = `
    padding:10px 16px; color:rgba(220,230,255,.95); cursor:pointer;
    display:flex; align-items:center; gap:8px; transition:background .15s;
    border-radius:8px; margin:2px 4px;
  `;
  cutBtn.textContent = '✂️ Cortar bloque';
  cutBtn.addEventListener('mouseenter', () => { cutBtn.style.background = 'rgba(80,140,255,.25)'; });
  cutBtn.addEventListener('mouseleave', () => { cutBtn.style.background = 'transparent'; });
  menu.appendChild(cutBtn);
  document.body.appendChild(menu);

  // ── Inyectar estilos del slider y animaciones ──
  const cutStyle = document.createElement('style');
  cutStyle.textContent = `
    /* Slider track personalizado */
    #cut-range-slider { -webkit-appearance:none; appearance:none; width:100%; height:10px;
      border-radius:5px; outline:none; cursor:pointer;
      background:linear-gradient(90deg, rgba(90,140,255,.6) 0%, rgba(90,140,255,.6) var(--fill,100%), rgba(60,70,100,.4) var(--fill,100%), rgba(60,70,100,.4) 100%);
      transition:background .05s; }
    #cut-range-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none;
      width:22px; height:22px; border-radius:50%; cursor:grab;
      background:radial-gradient(circle at 35% 35%, #8cb4ff, #4a80e0); border:2px solid rgba(255,255,255,.7);
      box-shadow:0 2px 8px rgba(0,0,0,.4), 0 0 12px rgba(90,140,255,.5); transition:box-shadow .15s, transform .1s; }
    #cut-range-slider::-webkit-slider-thumb:hover { box-shadow:0 2px 12px rgba(0,0,0,.5), 0 0 20px rgba(90,140,255,.7); transform:scale(1.12); }
    #cut-range-slider::-webkit-slider-thumb:active { cursor:grabbing; transform:scale(1.05); }
    #cut-range-slider::-moz-range-thumb { width:22px; height:22px; border-radius:50%; cursor:grab;
      background:radial-gradient(circle at 35% 35%, #8cb4ff, #4a80e0); border:2px solid rgba(255,255,255,.7);
      box-shadow:0 2px 8px rgba(0,0,0,.4), 0 0 12px rgba(90,140,255,.5); }
    #cut-range-slider::-moz-range-track { height:10px; border-radius:5px; background:rgba(60,70,100,.4); }
    #cut-range-slider::-moz-range-progress { height:10px; border-radius:5px; background:rgba(90,140,255,.6); }

    /* Zona cortada con patrón de rayas */
    .cut-zone-discard {
      background:repeating-linear-gradient(
        -45deg, rgba(255,80,80,.18), rgba(255,80,80,.18) 4px,
        rgba(255,60,60,.06) 4px, rgba(255,60,60,.06) 8px);
      border-left:2px dashed rgba(255,100,100,.5);
    }

    /* Animación de pulso suave en la zona conservada */
    @keyframes cut-pulse { 0%,100%{box-shadow:inset 0 0 8px rgba(90,140,255,.15)} 50%{box-shadow:inset 0 0 14px rgba(90,140,255,.3)} }
    .cut-zone-keep { animation:cut-pulse 2s ease-in-out infinite; }

    /* Alerta de colisión */
    @keyframes cut-collision-pulse { 0%,100%{border-color:rgba(255,80,80,.5)} 50%{border-color:rgba(255,80,80,.9)} }
    .cut-collision-alert { animation:cut-collision-pulse .6s ease-in-out infinite; }
  `;
  document.head.appendChild(cutStyle);

  // ── modal de corte con slider visual ──
  const overlay = document.createElement('div');
  overlay.id = 'cut-overlay';
  overlay.style.cssText = `
    display:none; position:fixed; inset:0; z-index:310;
    background:rgba(0,0,0,.50); backdrop-filter:blur(3px);
    justify-content:center; align-items:center;
  `;
  overlay.innerHTML = `
    <div id="cut-modal" style="
      background:rgba(10,18,42,.97); border:1px solid rgba(100,160,255,.40);
      border-radius:16px; padding:24px 28px 20px; width:380px; max-width:92vw;
      box-shadow:0 12px 48px rgba(0,0,0,.65); color:rgba(220,230,255,.95);
      font-family:inherit; font-size:13px;
    ">
      <!-- Título -->
      <div style="font-size:15px; font-weight:600; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
        ✂️ Cortar bloque
      </div>
      <div style="margin-bottom:14px; color:rgba(180,195,225,.7); font-size:12px;">
        Desliza para elegir el tamaño del bloque resultante:
      </div>

      <!-- Vista previa animada -->
      <div id="cut-preview-container" style="
        height:72px; margin-bottom:12px; display:flex; align-items:center;
        justify-content:flex-start; position:relative; overflow:hidden;
        background:rgba(20,30,60,.45); border-radius:10px; border:1px solid rgba(100,160,255,.18);
        padding:0 12px;
      ">
        <!-- Bloque original (fantasma) -->
        <div id="cut-ghost" style="
          position:absolute; left:12px; height:40px; border-radius:5px;
          background:rgba(100,140,200,.10); border:1px dashed rgba(140,170,220,.25);
          transition:width .08s ease-out;
        "></div>
        <!-- Zona conservada -->
        <div id="cut-keep" class="cut-zone-keep" style="
          position:absolute; left:12px; height:40px; border-radius:5px 0 0 5px;
          background:rgba(90,140,255,.35); border:1px solid rgba(120,170,255,.45);
          transition:width .08s ease-out;
        "></div>
        <!-- Zona descartada -->
        <div id="cut-discard" class="cut-zone-discard" style="
          position:absolute; height:40px; border-radius:0 5px 5px 0;
          transition:left .08s ease-out, width .08s ease-out;
        "></div>
        <!-- Línea de corte -->
        <div id="cut-line" style="
          position:absolute; width:2px; height:50px;
          background:rgba(255,200,80,.8); box-shadow:0 0 6px rgba(255,200,80,.5);
          transition:left .08s ease-out; z-index:2;
        "></div>
        <!-- Etiquetas -->
        <span id="cut-label-keep" style="
          position:absolute; bottom:4px; left:14px; font-size:10px; font-weight:500;
          color:rgba(160,200,255,.7); transition:opacity .15s;
        ">Parte utilizada</span>
        <span id="cut-label-discard" style="
          position:absolute; bottom:4px; right:14px; font-size:10px; font-weight:500;
          color:rgba(255,140,140,.6); transition:opacity .15s;
        ">Se corta</span>
      </div>

      <!-- Dimensión resultante -->
      <div id="cut-dimension" style="
        text-align:center; margin-bottom:14px; font-size:14px; font-weight:600;
        color:rgba(200,225,255,.95); letter-spacing:.5px;
      ">
        Tamaño: <span id="cut-dim-value">1.00</span> m
      </div>

      <!-- Slider principal -->
      <div style="margin-bottom:6px; padding:0 2px;">
        <input type="range" id="cut-range-slider" min="5" max="100" value="100" step="1" style="--fill:100%;" />
      </div>

      <!-- Marcas del slider -->
      <div style="display:flex; justify-content:space-between; margin-bottom:14px; padding:0 2px;">
        <span style="font-size:10px; color:rgba(150,170,210,.5);">0.05 m</span>
        <span style="font-size:10px; color:rgba(150,170,210,.5);">0.25 m</span>
        <span style="font-size:10px; color:rgba(150,170,210,.5);">0.50 m</span>
        <span style="font-size:10px; color:rgba(150,170,210,.5);">0.75 m</span>
        <span style="font-size:10px; color:rgba(150,170,210,.5);">1.00 m</span>
      </div>

      <!-- Alerta de colisión -->
      <div id="cut-collision-msg" style="
        display:none; margin-bottom:10px; padding:8px 12px; border-radius:8px;
        background:rgba(255,60,60,.12); border:1px solid rgba(255,80,80,.35);
        color:rgba(255,170,170,.95); font-size:11px; text-align:center;
      ">
        ⚠️ Este tamaño causa colisión con otro bloque
      </div>

      <!-- Botones -->
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="cut-cancel" style="
          padding:8px 18px; border-radius:8px; border:1px solid rgba(140,160,200,.3);
          background:rgba(40,50,80,.6); color:rgba(200,210,235,.9); cursor:pointer;
          font-size:12px; transition:background .15s;
        ">Cancelar</button>
        <button id="cut-confirm" style="
          padding:8px 18px; border-radius:8px; border:1px solid rgba(90,140,255,.5);
          background:rgba(60,110,220,.5); color:rgba(230,240,255,.95); cursor:pointer;
          font-size:12px; font-weight:600; transition:background .15s;
        ">✂️ Cortar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── referencias a elementos del nuevo modal ──
  const slider      = document.getElementById('cut-range-slider');
  const dimValue    = document.getElementById('cut-dim-value');
  const ghostEl     = document.getElementById('cut-ghost');
  const keepEl      = document.getElementById('cut-keep');
  const discardEl   = document.getElementById('cut-discard');
  const cutLineEl   = document.getElementById('cut-line');
  const lblKeep     = document.getElementById('cut-label-keep');
  const lblDiscard  = document.getElementById('cut-label-discard');
  const collisionMsg = document.getElementById('cut-collision-msg');
  const confirmBtn  = document.getElementById('cut-confirm');
  const previewBox  = document.getElementById('cut-preview-container');

  // ── estado ──
  let ctxTarget = null;
  let currentOrigWidth = 1.0;   // ancho original del tipo de bloque
  let hasCollision = false;

  function closeCtxMenu() { menu.style.display = 'none'; }

  function closeCutModal() {
    overlay.style.display = 'none';
    collisionMsg.style.display = 'none';
    previewBox.classList.remove('cut-collision-alert');
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '';
    ctxTarget = null;
  }

  /**
   * Comprueba si el bloque cortado con el factor dado colisionaría.
   * Se hace un corte temporal, se comprueba la colisión y se restaura.
   */
  function checkCutCollision(node, factor) {
    const oldFactor = node.userData?.cutFactor ?? 1;
    // Aplicar el corte temporalmente
    cortarBloque(node, factor);
    const collision = findBlockCollision(node);
    // Restaurar el estado original
    cortarBloque(node, oldFactor);
    return !!collision;
  }

  /**
   * Actualiza la vista previa animada del corte.
   * `factor` es un valor entre MIN_FACTOR y 1.
   */
  function updatePreview(factor) {
    const pct = factor * 100;
    const fullBarW = 80; // porcentaje del contenedor que ocupa el bloque fantasma

    // Actualizar slider fill visual
    const fillPct = ((pct - 5) / 95) * 100;
    slider.style.setProperty('--fill', fillPct + '%');

    // Dimensiones en metros
    const realSize = (currentOrigWidth * factor).toFixed(2);
    dimValue.textContent = realSize;

    // Zona fantasma (bloque original completo)
    ghostEl.style.width = fullBarW + '%';

    // Zona conservada
    const keepW = fullBarW * factor;
    keepEl.style.width = keepW + '%';

    // Zona descartada
    const discardW = fullBarW * (1 - factor);
    discardEl.style.left = (12 / previewBox.offsetWidth * 100 + keepW) + '%';
    // Calcular left en px para mayor precisión
    const containerW = previewBox.clientWidth - 24; // restar padding
    const keepPx = containerW * factor;
    const discardPx = containerW * (1 - factor);
    discardEl.style.left = (12 + keepPx) + 'px';
    discardEl.style.width = discardPx + 'px';

    // Línea de corte
    cutLineEl.style.left = (12 + keepPx - 1) + 'px';

    // Ocultar etiqueta "Se corta" si el factor es 1
    lblDiscard.style.opacity = factor >= 0.98 ? '0' : '1';

    // Comprobar colisiones
    if (ctxTarget) {
      hasCollision = checkCutCollision(ctxTarget, factor);
      if (hasCollision) {
        collisionMsg.style.display = 'block';
        previewBox.classList.add('cut-collision-alert');
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.4';
        confirmBtn.style.cursor = 'not-allowed';
      } else {
        collisionMsg.style.display = 'none';
        previewBox.classList.remove('cut-collision-alert');
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '';
        confirmBtn.style.cursor = '';
      }
    }
  }

  function openCutModal(node) {
    ctxTarget = node;
    const type = node.userData?.type || 'block';
    currentOrigWidth = ORIG_WIDTH[type] || 1.0;
    const current = node.userData?.cutFactor ?? 1;
    const pct = Math.round(current * 100);
    slider.value = pct;
    // Forzar un repaint para que la transición se vea
    requestAnimationFrame(() => updatePreview(current));
    overlay.style.display = 'flex';
  }

  // ── eventos del slider ──
  slider.addEventListener('input', () => {
    const factor = Math.max(MIN_FACTOR, Math.min(1, Number(slider.value) / 100));
    updatePreview(factor);
  });

  // ── detectar clic derecho sobre un Block o Madera ──
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 2) return;
    closeCtxMenu();
    const pick = scene.pick(e.offsetX, e.offsetY);
    if (!pick.hit || !pick.pickedMesh) return;
    let node = pick.pickedMesh;
    while (node && !node.userData?.type) node = node.parent;
    if (!node || !CUT_TYPES.includes(node.userData?.type)) return;
    ctxTarget = node;
    // posicionar menú sin salir de la pantalla
    const mx = Math.min(e.clientX, window.innerWidth - 210);
    const my = Math.min(e.clientY, window.innerHeight - 60);
    menu.style.left = mx + 'px';
    menu.style.top = my + 'px';
    menu.style.display = 'block';
  });

  // cerrar menú contextual al hacer clic en otro lado
  window.addEventListener('pointerdown', e => {
    if (e.button === 2) return;
    if (!menu.contains(e.target) && !overlay.contains(e.target)) closeCtxMenu();
  });
  window.addEventListener('keydown', e => { if (e.code === 'Escape') { closeCtxMenu(); closeCutModal(); } });

  // botón "Cortar bloque" del menú contextual
  cutBtn.addEventListener('click', () => {
    if (!ctxTarget) return;
    const node = ctxTarget;
    closeCtxMenu();
    openCutModal(node);
  });

  // confirmar corte
  confirmBtn.addEventListener('click', () => {
    if (!ctxTarget || hasCollision) { return; }
    const factor = Math.max(MIN_FACTOR, Math.min(1, Number(slider.value) / 100));
    const pct = Math.round(factor * 100);
    cortarBloque(ctxTarget, factor);
    selectObject(ctxTarget);
    const realSize = (currentOrigWidth * factor).toFixed(2);
    const lbl = ctxTarget.userData?.type === 'block' ? 'Block' : 'Madera';
    setTip(`✂️ <b>${lbl}</b> cortado a ${realSize} m (${pct}% del ancho original)`);
    closeCutModal();
  });

  // cancelar
  document.getElementById('cut-cancel').addEventListener('click', closeCutModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCutModal(); });
}


function openMatematicasModal() {
  try { registrar('modal_abierto', { contexto: { modal: 'matematicas' } }); } catch (e) { }
  document.getElementById('matematicas-overlay').classList.add('open');
}
function closeMatematicasModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  try { registrar('modal_cerrado', { contexto: { modal: 'matematicas' } }); } catch (e) { }
  document.getElementById('matematicas-overlay').classList.remove('open');
}

// Valores correctos: zona 20x20, perímetro=80m (20+20+20+20), área=400m², volumen=6000m³ (altura 15m)
const MAT_CORRECT = { perimetro: 80, area: 400, volumen: 6000 };
const MAT_UNITS = { perimetro: 'm', area: 'm2', volumen: 'm3' };

function validarMatematicas() {
  const perVal = parseFloat(document.getElementById('mat-perimetro').value);
  const areaVal = parseFloat(document.getElementById('mat-area').value);
  const volVal = parseFloat(document.getElementById('mat-volumen').value);
  const perUnit = document.getElementById('mat-perimetro-unit').value;
  const areaUnit = document.getElementById('mat-area-unit').value;
  const volUnit = document.getElementById('mat-volumen-unit').value;

  const errores = [];
  if (isNaN(perVal) || perVal !== MAT_CORRECT.perimetro || perUnit !== MAT_UNITS.perimetro) {
    errores.push(' El Perímetro no es correcto. Recuerda: suma todos los lados del recuadro verde');
  }
  if (isNaN(areaVal) || areaVal !== MAT_CORRECT.area || areaUnit !== MAT_UNITS.area) {
    errores.push(' El Área no es correcta. Recuerda: Área = largo × ancho.');
  }
  if (isNaN(volVal) || volVal !== MAT_CORRECT.volumen || volUnit !== MAT_UNITS.volumen) {
    errores.push(' El Volumen no es correcto. Recuerda: Volumen = Área × altura (15 m).');
  }

  const errEl = document.getElementById('mat-error');
  if (errores.length > 0) {
    try {
      registrar('matematicas_intento', {
        contexto: {
          perimetro: perVal, area: areaVal, volumen: volVal,
          correcto: false,
          unidad_perimetro: perUnit, unidad_area: areaUnit, unidad_volumen: volUnit
        }
      });
    } catch (e) { }
    errEl.style.display = 'block';
    errEl.innerHTML = errores.join('<br>');
    return;
  }

  errEl.style.display = 'none';
  try {
    registrar('matematicas_intento', {
      contexto: {
        perimetro: perVal, area: areaVal, volumen: volVal,
        correcto: true,
        unidad_perimetro: perUnit, unidad_area: areaUnit, unidad_volumen: volUnit
      }
    });
  } catch (e) { }
  matematicasValidadas = true;
  document.getElementById('matematicas-overlay').classList.remove('open');

  // Deshabilitar el botón para que no lo vuelva a abrir
  const btnMat = document.getElementById('btnMatematicas');
  if (btnMat) {
    btnMat.style.opacity = '0.5';
    btnMat.title = ' Ya completaste este módulo';
  }

  // Desbloquear Crear Concreto
  unlockPhase1();

  showSuccessMessage(
    ' ¡Felicidades! Calculaste correctamente el Perímetro, Área y Volumen.<br>' +
    ' <b>¡Ya completaste este objetivo!</b> Ahora crea el concreto con  Crear Concreto :)'
  );
  setTip(' ¡Matemáticas completadas! Ahora haz clic en  Crear Concreto.');
}

function showSuccessMessage(msg) {
  let el = document.getElementById('success-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'success-toast';
    el.style.cssText = `
      position:fixed; top:70px; left:50%; transform:translateX(-50%);
      background:rgba(5,30,15,.97); border:1.5px solid rgba(50,220,100,.5);
      border-radius:14px; padding:16px 26px; color:rgba(100,255,160,.95);
      font-size:13px; letter-spacing:.04em; z-index:200;
      box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 20px rgba(30,200,80,.15);
      text-align:center; max-width:520px; line-height:1.7; transition:opacity .4s;
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = msg;
  el.style.opacity = '1';
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 400);
  }, 4500);
}

// Recalcula puertas_colocadas/ventanas_colocadas a partir del estado REAL
// de la construcción (objList), en vez de confiar en contadores que solo
// se incrementaban al agregar y nunca se corregían al eliminar. Se llama
// después de cualquier eliminación y al restaurar una casa guardada, para
// que el objetivo siempre refleje lo que de verdad existe en la escena.
function recalcularObjetivos() {
  puertas_colocadas = objList.filter(o => o.type === 'puerta').length;
  ventanas_colocadas = objList.filter(o => o.type === 'ventana').length;
  updateOpeningCounters();
}

function updateOpeningCounters() {
  const badge = document.getElementById('opening-counters');
  if (badge) {
    badge.innerHTML =
      `<span class="${puertas_colocadas >= MAX_PUERTAS ? 'oc-done' : ''}">🚪 ${puertas_colocadas}/${MAX_PUERTAS}</span>` +
      `<span class="${ventanas_colocadas >= MAX_VENTANAS ? 'oc-done' : ''}">🪟 ${ventanas_colocadas}/${MAX_VENTANAS}</span>`;
  }
  updateModeCardStates();
}

function updateModeCardStates() {
  const cp = document.getElementById('wb-counter-puerta');
  const cv = document.getElementById('wb-counter-ventana');
  const cardP = document.getElementById('wb-mode-puerta');
  const cardV = document.getElementById('wb-mode-ventana');
  if (cp) cp.textContent = puertas_colocadas + '/' + MAX_PUERTAS + ' usadas';
  if (cv) cv.textContent = ventanas_colocadas + '/' + MAX_VENTANAS + ' usadas';
  if (cardP) cardP.classList.toggle('disabled', puertas_colocadas >= MAX_PUERTAS);
  if (cardV) cardV.classList.toggle('disabled', ventanas_colocadas >= MAX_VENTANAS);
  // Si el modo actual quedó lleno, volver a simple
  if (wbWallMode === 'puerta' && puertas_colocadas >= MAX_PUERTAS) wbSelectMode('simple');
  if (wbWallMode === 'ventana' && ventanas_colocadas >= MAX_VENTANAS) wbSelectMode('simple');
}

// ─── BLOQUEO MÓDULO MATEMÁTICAS SI YA FUE COMPLETADO ────────────────────────

function openMatematicasModalGuarded() {
  if (matematicasValidadas) {
    showSuccessMessage(' ¡Ya completaste este objetivo! Las matemáticas están validadas. Continúa construyendo tu casa 😊');
    return;
  }
  openMatematicasModal();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MÓDULO ETAPA 1: EXCAVACIÓN INTERACTIVA DEL TERRENO ────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

let excavacionData = null; // { largo, ancho, profundidad, volumen, activa, tipo_suelo, porcentaje_retiro } (F3 añade los dos últimos)
let groundHoleSegments = [];
let excavacionRootNode = null;

// Límites técnicos de la herramienta (no son medidas objetivo: el alumno elige libremente)
const EXC_LIMITES = {
  largo: { max: 18, etiqueta: 'largo' },
  ancho: { max: 18, etiqueta: 'ancho' },
  profundidad: { max: 5, etiqueta: 'profundidad' }
};
const EXC_DECIMALES = 100; // precisión de 0.01 m para evitar ruido de punto flotante

// Redondea a 0.01 m (corrige errores como 0.1 + 0.2 = 0.30000000000000004)
// Delegado a calculos.js (Fase 1). Original: const excRedondear = n => Math.round(n * EXC_DECIMALES) / EXC_DECIMALES;
const excRedondear = redondearCentesimas;

// Valida dimensiones: solo datos inválidos o fuera de los límites técnicos
function validarDimensionesExcavacion(largo, ancho, profundidad) {
  const errores = [];
  const revisar = (valor, clave) => {
    const { max, etiqueta } = EXC_LIMITES[clave];
    if (typeof valor !== 'number' || !isFinite(valor) || valor <= 0)
      errores.push(`El <b>${etiqueta}</b> debe ser un número positivo mayor a 0 m.`);
    else if (valor > max)
      errores.push(`El <b>${etiqueta}</b> no puede exceder ${max} m (límite de la herramienta).`);
  };
  revisar(largo, 'largo');
  revisar(ancho, 'ancho');
  revisar(profundidad, 'profundidad');
  return errores;
}

// Lee los campos del modal como números (campo vacío o texto => NaN)
function leerDimensionesExcavacion() {
  const leer = id => {
    const v = document.getElementById(id)?.value;
    if (v === undefined || String(v).trim() === '') return NaN;
    const n = Number(v);
    return isFinite(n) ? excRedondear(n) : NaN;
  };
  return { largo: leer('exc-largo'), ancho: leer('exc-ancho'), profundidad: leer('exc-profundidad') };
}

function setGroundHole(xMin, xMax, zMin, zMax) {
  if (cimHayZanjas()) return cimRecomponerTerreno([xMin, xMax, zMin, zMax]);   // F6a: con zanjas el terreno se compone con fosa ∪ zanjas; sin zanjas esta función es la de F3, sin cambios
  clearGroundHole();
  const groundOriginal = scene.getMeshByName('ground');
  const zoneFillOriginal = scene.getMeshByName('zone_fill');
  if (groundOriginal) groundOriginal.isVisible = false;
  if (zoneFillOriginal) zoneFillOriginal.isVisible = false;

  const HALF = 13;
  const ZONE = 10;
  const Y_GROUND = 0;
  const Y_ZONE = 0.001;

  // Segmentos de terreno exterior ground (-13 a 13)
  const gNorth = MeshBuilder.CreateGround('ground_seg_n', { width: HALF * 2, height: HALF - zMax, subdivisions: 1 }, scene);
  gNorth.position.set(0, Y_GROUND, (zMax + HALF) / 2);
  gNorth.material = MAT.ground; gNorth.receiveShadows = true; gNorth.isPickable = false;

  const gSouth = MeshBuilder.CreateGround('ground_seg_s', { width: HALF * 2, height: zMin - (-HALF), subdivisions: 1 }, scene);
  gSouth.position.set(0, Y_GROUND, (-HALF + zMin) / 2);
  gSouth.material = MAT.ground; gSouth.receiveShadows = true; gSouth.isPickable = false;

  const gWest = MeshBuilder.CreateGround('ground_seg_w', { width: xMin - (-HALF), height: zMax - zMin, subdivisions: 1 }, scene);
  gWest.position.set((-HALF + xMin) / 2, Y_GROUND, (zMin + zMax) / 2);
  gWest.material = MAT.ground; gWest.receiveShadows = true; gWest.isPickable = false;

  const gEast = MeshBuilder.CreateGround('ground_seg_e', { width: HALF - xMax, height: zMax - zMin, subdivisions: 1 }, scene);
  gEast.position.set((xMax + HALF) / 2, Y_GROUND, (zMin + zMax) / 2);
  gEast.material = MAT.ground; gEast.receiveShadows = true; gEast.isPickable = false;

  // Segmentos de zona verde zone_fill (-10 a 10)
  const zxMin = Math.max(-ZONE, xMin);
  const zxMax = Math.min(ZONE, xMax);
  const zzMin = Math.max(-ZONE, zMin);
  const zzMax = Math.min(ZONE, zMax);
  const fm = zoneFillOriginal?.material || MAT.ground;

  const zNorth = MeshBuilder.CreateGround('zone_seg_n', { width: ZONE * 2, height: ZONE - zzMax, subdivisions: 1 }, scene);
  zNorth.position.set(0, Y_ZONE, (zzMax + ZONE) / 2);
  zNorth.material = fm; zNorth.receiveShadows = true; zNorth.isPickable = false;

  const zSouth = MeshBuilder.CreateGround('zone_seg_s', { width: ZONE * 2, height: zzMin - (-ZONE), subdivisions: 1 }, scene);
  zSouth.position.set(0, Y_ZONE, (-ZONE + zzMin) / 2);
  zSouth.material = fm; zSouth.receiveShadows = true; zSouth.isPickable = false;

  const zWest = MeshBuilder.CreateGround('zone_seg_w', { width: zxMin - (-ZONE), height: zzMax - zzMin, subdivisions: 1 }, scene);
  zWest.position.set((-ZONE + zxMin) / 2, Y_ZONE, (zzMin + zzMax) / 2);
  zWest.material = fm; zWest.receiveShadows = true; zWest.isPickable = false;

  const zEast = MeshBuilder.CreateGround('zone_seg_e', { width: ZONE - zxMax, height: zzMax - zzMin, subdivisions: 1 }, scene);
  zEast.position.set((zxMax + ZONE) / 2, Y_ZONE, (zzMin + zzMax) / 2);
  zEast.material = fm; zEast.receiveShadows = true; zEast.isPickable = false;

  groundHoleSegments = [gNorth, gSouth, gWest, gEast, zNorth, zSouth, zWest, zEast];
  aplicarTexturasExistentes();                                   // Presentación 20-nov · Bloque A: los segmentos del suelo también llevan tierra
}

function clearGroundHole() {
  if (cimHayZanjas()) return cimRecomponerTerreno(null);                        // F6a: ídem (sin fosa); sin zanjas esta función es la de F3, sin cambios
  groundHoleSegments.forEach(m => {
    try { m.dispose(); } catch (e) { }
  });
  groundHoleSegments = [];
  const groundOriginal = scene?.getMeshByName('ground');
  const zoneFillOriginal = scene?.getMeshByName('zone_fill');
  if (groundOriginal) groundOriginal.isVisible = true;
  if (zoneFillOriginal) zoneFillOriginal.isVisible = true;
}

function crearGeometriaExcavacion(largo, ancho, profundidad, conFeedback = true, tipoSuelo = SUELO_POR_DEFECTO, porcentajeRetiro = PORCENTAJE_RETIRO_POR_DEFECTO) {
  eliminarGeometriaExcavacion(false);

  const W = ancho;
  const L = largo;
  const D = profundidad;
  const Xc = 0;
  const Zc = 0;

  // 1. Abrir cavidad en el terreno
  setGroundHole(Xc - W / 2, Xc + W / 2, Zc - L / 2, Zc + L / 2);

  // 2. Nodo contenedor raíz
  excavacionRootNode = new TransformNode('excavacion_root', scene);
  excavacionRootNode.userData = { type: 'excavacion', largo: L, ancho: W, profundidad: D };

  // 3. Fondo de la excavación en Y = -D
  const floor = MeshBuilder.CreateGround('exc_floor', { width: W, height: L, subdivisions: 1 }, scene);
  floor.position.set(Xc, -D, Zc);
  floor.material = MAT.excFloor;
  floor.receiveShadows = true;
  floor.parent = excavacionRootNode;

  // Cuadrícula métrica en el fondo de la fosa (1 cuadro = 1m)
  const floorLines = [], floorColors = [];
  const lineCol = new Color4(0.85, 0.72, 0.50, 0.35);
  for (let x = -W / 2; x <= W / 2; x += 1) {
    floorLines.push([new Vector3(x, -D + 0.005, -L / 2), new Vector3(x, -D + 0.005, L / 2)]);
    floorColors.push([lineCol, lineCol]);
  }
  for (let z = -L / 2; z <= L / 2; z += 1) {
    floorLines.push([new Vector3(-W / 2, -D + 0.005, z), new Vector3(W / 2, -D + 0.005, z)]);
    floorColors.push([lineCol, lineCol]);
  }
  if (floorLines.length > 0) {
    const floorGrid = MeshBuilder.CreateLineSystem('exc_floor_grid', { lines: floorLines, colors: floorColors }, scene);
    floorGrid.isPickable = false;
    floorGrid.parent = excavacionRootNode;
  }

  // 4. Paredes interiores estratificadas
  const topH = Math.min(0.35, D * 0.3); // Capa vegetal superior
  const botH = D - topH;                // Estrato arcilloso/rocoso inferior
  const wallThick = 0.06;

  const addWallSegment = (name, w, h, d, px, py, pz, mat) => {
    const wall = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    wall.position.set(px, py, pz);
    wall.material = mat;
    wall.receiveShadows = true;
    wall.parent = excavacionRootNode;
    if (shadowGen) shadowGen.addShadowCaster(wall, false);
    return wall;
  };

  // Norte (Z = Zc + L/2)
  addWallSegment('exc_w_n_top', W, topH, wallThick, Xc, -topH / 2, Zc + L / 2, MAT.excWallStratum);
  addWallSegment('exc_w_n_bot', W, botH, wallThick, Xc, -topH - botH / 2, Zc + L / 2, MAT.excWall);

  // Sur (Z = Zc - L/2)
  addWallSegment('exc_w_s_top', W, topH, wallThick, Xc, -topH / 2, Zc - L / 2, MAT.excWallStratum);
  addWallSegment('exc_w_s_bot', W, botH, wallThick, Xc, -topH - botH / 2, Zc - L / 2, MAT.excWall);

  // Este (X = Xc + W/2)
  addWallSegment('exc_w_e_top', wallThick, topH, L, Xc + W / 2, -topH / 2, Zc, MAT.excWallStratum);
  addWallSegment('exc_w_e_bot', wallThick, botH, L, Xc + W / 2, -topH - botH / 2, Zc, MAT.excWall);

  // Oeste (X = Xc - W/2)
  addWallSegment('exc_w_w_top', wallThick, topH, L, Xc - W / 2, -topH / 2, Zc, MAT.excWallStratum);
  addWallSegment('exc_w_w_bot', wallThick, botH, L, Xc - W / 2, -topH - botH / 2, Zc, MAT.excWall);

  // 5. Estacas de replanteo y cinta de seguridad perimetral
  const corners = [
    [-W / 2, -L / 2],
    [W / 2, -L / 2],
    [W / 2, L / 2],
    [-W / 2, L / 2]
  ];
  corners.forEach(([cx, cz], idx) => {
    const stake = MeshBuilder.CreateCylinder('exc_stake_' + idx, { diameter: 0.08, height: 0.65 }, scene);
    stake.position.set(cx, 0.22, cz);
    stake.material = MAT.excStake;
    stake.parent = excavacionRootNode;
    if (shadowGen) shadowGen.addShadowCaster(stake, false);

    const cap = MeshBuilder.CreateCylinder('exc_cap_' + idx, { diameter: 0.10, height: 0.18 }, scene);
    cap.position.set(cx, 0.40, cz);
    cap.material = MAT.excMarker;
    cap.parent = excavacionRootNode;
  });

  const ribbonLines = [
    [new Vector3(-W / 2, 0.35, -L / 2), new Vector3(W / 2, 0.35, -L / 2)],
    [new Vector3(W / 2, 0.35, -L / 2), new Vector3(W / 2, 0.35, L / 2)],
    [new Vector3(W / 2, 0.35, L / 2), new Vector3(-W / 2, 0.35, L / 2)],
    [new Vector3(-W / 2, 0.35, L / 2), new Vector3(-W / 2, 0.35, -L / 2)],
  ];
  const ribbonCol = new Color4(0.95, 0.45, 0.08, 0.95);
  const ribbon = MeshBuilder.CreateLineSystem('exc_ribbon', { lines: ribbonLines, colors: ribbonLines.map(() => [ribbonCol, ribbonCol]) }, scene);
  ribbon.isPickable = false;
  ribbon.parent = excavacionRootNode;

  // 6. Mira de nivelación en una esquina
  const rodX = -W / 2 + 0.12;
  const rodZ = -L / 2 + 0.12;
  const rod = MeshBuilder.CreateBox('exc_depth_rod', { width: 0.08, height: D + 0.4, depth: 0.08 }, scene);
  rod.position.set(rodX, -D / 2 + 0.2, rodZ);
  rod.material = MAT.trim;
  rod.parent = excavacionRootNode;
  for (let y = -D + 0.25; y <= 0.2; y += 0.5) {
    const mark = MeshBuilder.CreateBox('exc_rod_mark_' + y.toFixed(1), { width: 0.09, height: 0.20, depth: 0.09 }, scene);
    mark.position.set(rodX, y, rodZ);
    mark.material = MAT.excMarker;
    mark.parent = excavacionRootNode;
  }

  // 7. Montículo de acopio de tierra extraída al costado
  // Delegado a calculos.js (Fase 1). Original: const vol = Math.round(L * W * D * 1000) / 1000;
  const vol = calcularExcavacion(L, W, D).volumen;
  const pileRadius = Math.min(2.8, Math.max(1.2, Math.cbrt(vol) * 0.42));
  const pileHeight = Math.min(1.9, Math.max(0.6, Math.cbrt(vol) * 0.28));
  const pileX = Math.min(9.5 - pileRadius, W / 2 + 1.2 + pileRadius);
  const pileZ = 0;

  const pile = MeshBuilder.CreateCylinder('exc_pile', {
    diameterTop: 0.3,
    diameterBottom: pileRadius * 2,
    height: pileHeight,
    tessellation: 18
  }, scene);
  pile.position.set(pileX, pileHeight / 2, pileZ);
  pile.material = MAT.excSoilPile;
  pile.receiveShadows = true;
  pile.parent = excavacionRootNode;
  pile.setEnabled(conFeedback); // solo se ve al excavar (conFeedback = excavación hecha por el usuario); al restaurar un progreso nace oculto
  if (shadowGen) shadowGen.addShadowCaster(pile, false);

  excavacionData = {
    largo: L,
    ancho: W,
    profundidad: D,
    volumen: vol,
    activa: true,
    tipo_suelo: sanearTipoSuelo(tipoSuelo),                      // F3
    porcentaje_retiro: sanearPorcentajeRetiro(porcentajeRetiro)  // F3
  };

  const btnExc = document.getElementById('btnExcavacion');
  if (btnExc) {
    btnExc.classList.add('completed');
    btnExc.innerHTML = '⛏️ Excavación ✓';
    btnExc.title = `Excavación activa: ${L.toFixed(1)}×${W.toFixed(1)}×${D.toFixed(1)} m (${vol.toFixed(1)} m³)`;
  }

  if (conFeedback) {
    showSuccessMessage(
      `⛏️ <b>¡Excavación realizada con éxito!</b><br>` +
      `Dimensiones: <b>${L.toFixed(2)} × ${W.toFixed(2)} × ${D.toFixed(2)} m</b> · Volumen retirado: <b>${vol.toFixed(2)} m³</b>`
    );
    setTip(`⛏️ Excavación completada · Volumen: <b>${vol.toFixed(1)} m³</b> · Tierra retirada apilada a un costado.`);
    try {
      registrar('excavacion_realizada', {
        contexto: { largo: L, ancho: W, profundidad: D, volumen: vol, ...contextoSueloExcavacion(excavacionData) } // F3: tipo_suelo, porcentaje_retiro, volumen_suelto, viajes
      });
    } catch (e) { }
  }

  marcarSucio();
}

function eliminarGeometriaExcavacion(notificar = true) {
  if (excavacionRootNode) {
    excavacionRootNode.getChildMeshes().forEach(m => {
      if (shadowGen) try { shadowGen.removeShadowCaster(m); } catch (e) { }
      m.dispose();
    });
    excavacionRootNode.dispose();
    excavacionRootNode = null;
  }
  clearGroundHole();
  excavacionData = null;

  const btnExc = document.getElementById('btnExcavacion');
  if (btnExc) {
    btnExc.classList.remove('completed');
    btnExc.innerHTML = '⛏️ Excavación';
    btnExc.title = 'Etapa 1: Excavación y preparación del terreno';
  }

  if (notificar) {
    showSuccessMessage('Terreno rellenado. La excavación ha sido eliminada.');
    setTip('Terreno restaurado a su estado original.');
    try { registrar('excavacion_eliminada', {}); } catch (e) { }
    marcarSucio();
  }
}

// ── Controladores de la interfaz modal de excavación ──

function openExcavacionModal() {
  try { registrar('modal_abierto', { contexto: { modal: 'excavacion' } }); } catch (e) { }
  const overlay = document.getElementById('excavacion-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  montonTierraMostrar(true); // regresar a la etapa de excavación

  const largo = excavacionData ? excavacionData.largo : 12.0;
  const ancho = excavacionData ? excavacionData.ancho : 10.0;
  const prof = excavacionData ? excavacionData.profundidad : 1.5;

  setExcavacionInputValues(largo, ancho, prof);
  excInicializarSuelo(); // F3: selector y slider parten de lo guardado (o del suelo por defecto); cerrar sin confirmar descarta los cambios
  excActualizarVista();

  const btnDel = document.getElementById('btn-eliminar-excavacion');
  const btnInit = document.getElementById('btn-iniciar-excavacion');
  if (btnDel) btnDel.style.display = excavacionData?.activa ? 'block' : 'none';
  if (btnInit) btnInit.textContent = excavacionData?.activa ? '🔄 Actualizar Excavación' : '⛏️ Iniciar Excavación';
}

function closeExcavacionModal(e) {
  if (e && e.target !== e.currentTarget && e.target.tagName !== 'BUTTON') return;
  try { registrar('modal_cerrado', { contexto: { modal: 'excavacion' } }); } catch (e) { }
  const overlay = document.getElementById('excavacion-overlay');
  const estabaAbierto = !!overlay && overlay.classList.contains('open'); // el clic en un botón también llega al fondo y vuelve a llamar aquí con el modal ya cerrado
  if (overlay) overlay.classList.remove('open');
  if (estabaAbierto) montonTierraMostrar(false); // cerrar sin confirmar = salir de la etapa (confirmarExcavacion lo vuelve a mostrar)
}

function setExcavacionInputValues(largo, ancho, prof) {
  const lInp = document.getElementById('exc-largo');
  const lRng = document.getElementById('exc-largo-range');
  const aInp = document.getElementById('exc-ancho');
  const aRng = document.getElementById('exc-ancho-range');
  const pInp = document.getElementById('exc-profundidad');
  const pRng = document.getElementById('exc-profundidad-range');

  if (lInp) lInp.value = largo;
  if (lRng) lRng.value = largo;
  if (aInp) aInp.value = ancho;
  if (aRng) aRng.value = ancho;
  if (pInp) pInp.value = prof;
  if (pRng) pRng.value = prof;
}

function excOnInputChange(dim) {
  const inp = document.getElementById('exc-' + dim);
  const rng = document.getElementById('exc-' + dim + '-range');
  if (inp && rng) rng.value = inp.value;
  excActualizarVista();
}

function excOnSliderChange(dim) {
  const inp = document.getElementById('exc-' + dim);
  const rng = document.getElementById('exc-' + dim + '-range');
  if (inp && rng) inp.value = rng.value;
  excActualizarVista();
}

function excActualizarVista() {
  const { largo: lVal, ancho: aVal, profundidad: pVal } = leerDimensionesExcavacion();

  const errEl = document.getElementById('exc-error');
  const evalBox = document.getElementById('exc-eval-box');

  // Validaciones técnicas (solo datos inválidos o fuera de límites)
  const errores = validarDimensionesExcavacion(lVal, aVal, pVal);
  const btnInit = document.getElementById('btn-iniciar-excavacion');
  if (btnInit) btnInit.disabled = errores.length > 0;

  if (errores.length > 0) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.innerHTML = errores.join('<br>');
    }
    if (evalBox) evalBox.style.display = 'none';
    excResultadosSuelo(null); // F3
    return;
  }

  if (errEl) errEl.style.display = 'none';
  if (evalBox) evalBox.style.display = 'none';

  // Delegado a calculos.js (Fase 1). Original:
  //   const area = excRedondear(lVal * aVal);
  //   const vol = Math.round(lVal * aVal * pVal * 1000) / 1000;
  const { area, volumen: vol } = calcularExcavacion(lVal, aVal, pVal);

  const statArea = document.getElementById('exc-stat-area');
  const statVol = document.getElementById('exc-stat-vol');
  const statDims = document.getElementById('exc-stat-dims');
  if (statArea) statArea.textContent = area.toFixed(2) + ' m²';
  if (statVol) statVol.textContent = vol.toFixed(2) + ' m³';
  if (statDims) statDims.textContent = `${lVal.toFixed(2)} × ${aVal.toFixed(2)} × ${pVal.toFixed(2)} m`;

  renderExcavacionSVG(lVal, aVal, pVal);
  excResultadosSuelo(vol); // F3
}

function renderExcavacionSVG(largo, ancho, profundidad) {
  const svg = document.getElementById('exc-svg');
  if (!svg) return;

  const maxD = Math.max(largo, ancho, 14);
  const scale = 58 / maxD;
  const w = ancho * scale;
  const l = largo * scale;
  const d = Math.max(10, Math.min(32, profundidad * 14));

  const cx = 95, cy = 40;
  // Puntos superiores del prisma (isométrico suave)
  const p0 = { x: cx, y: cy - l * 0.35 };                    // Trasero
  const p1 = { x: cx + w * 0.7, y: cy };                     // Derecho
  const p2 = { x: cx, y: cy + l * 0.35 };                    // Frontal
  const p3 = { x: cx - w * 0.7, y: cy };                     // Izquierdo

  // Puntos inferiores del fondo excavado
  const b0 = { x: p0.x, y: p0.y + d };
  const b1 = { x: p1.x, y: p1.y + d };
  const b2 = { x: p2.x, y: p2.y + d };
  const b3 = { x: p3.x, y: p3.y + d };

  svg.innerHTML = `
    <defs>
      <linearGradient id="soilFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a2e18" />
        <stop offset="35%" stop-color="#6b4423" />
        <stop offset="100%" stop-color="#3b2311" />
      </linearGradient>
      <linearGradient id="soilRight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3d2513" />
        <stop offset="35%" stop-color="#55361b" />
        <stop offset="100%" stop-color="#2c1a0c" />
      </linearGradient>
      <linearGradient id="soilBottom" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#241409" />
        <stop offset="100%" stop-color="#38210f" />
      </linearGradient>
    </defs>

    <!-- Terreno circundante -->
    <ellipse cx="95" cy="65" rx="88" ry="52" fill="rgba(15, 30, 24, 0.55)" stroke="rgba(40, 180, 110, 0.4)" stroke-dasharray="3,3" />

    <!-- Fondo de la excavación -->
    <polygon points="${b0.x},${b0.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y}" fill="url(#soilBottom)" stroke="rgba(180, 140, 90, 0.4)" stroke-width="0.7" />

    <!-- Pared interior norte/trasera -->
    <polygon points="${p0.x},${p0.y} ${p1.x},${p1.y} ${b1.x},${b1.y} ${b0.x},${b0.y}" fill="url(#soilRight)" opacity="0.9" />

    <!-- Pared interior oeste -->
    <polygon points="${p0.x},${p0.y} ${p3.x},${p3.y} ${b3.x},${b3.y} ${b0.x},${b0.y}" fill="url(#soilFront)" opacity="0.85" />

    <!-- Pared frontal -->
    <polygon points="${p3.x},${p3.y} ${p2.x},${p2.y} ${b2.x},${b2.y} ${b3.x},${b3.y}" fill="url(#soilFront)" />

    <!-- Pared derecha -->
    <polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}" fill="url(#soilRight)" />

    <!-- Borde superior de replanteo con cinta naranja -->
    <polygon points="${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="none" stroke="#ff7a18" stroke-width="1.8" />

    <!-- Estacas en las esquinas -->
    <circle cx="${p0.x}" cy="${p0.y}" r="2" fill="#ffaa44" />
    <circle cx="${p1.x}" cy="${p1.y}" r="2" fill="#ffaa44" />
    <circle cx="${p2.x}" cy="${p2.y}" r="2" fill="#ffaa44" />
    <circle cx="${p3.x}" cy="${p3.y}" r="2" fill="#ffaa44" />

    <!-- Acopio de tierra extraída adyacente -->
    <ellipse cx="162" cy="78" rx="18" ry="10" fill="#50321a" stroke="#8c582c" stroke-width="1" />
    <path d="M 146 78 Q 162 62 178 78 Z" fill="#6d4524" />
    <text x="162" y="94" font-size="7.5" fill="#e8c28e" text-anchor="middle" font-weight="bold">Acopio</text>

    <!-- Cotas y etiquetas de dimensiones -->
    <text x="${p1.x + 4}" y="${p1.y + d * 0.5 + 3}" font-size="8" fill="#6fe5ff" font-weight="bold">${profundidad.toFixed(1)} m</text>
    <text x="${(p2.x + p1.x) / 2 + 6}" y="${(p2.y + p1.y) / 2 + 10}" font-size="8" fill="#88bbff" font-weight="bold">A: ${ancho.toFixed(1)} m</text>
    <text x="${(p2.x + p3.x) / 2 - 12}" y="${(p2.y + p3.y) / 2 + 10}" font-size="8" fill="#88bbff" font-weight="bold">L: ${largo.toFixed(1)} m</text>
  `;
}

function confirmarExcavacion() {
  const { largo: lVal, ancho: aVal, profundidad: pVal } = leerDimensionesExcavacion();

  const errEl = document.getElementById('exc-error');
  const errores = validarDimensionesExcavacion(lVal, aVal, pVal);
  if (errores.length > 0) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.innerHTML = errores.join('<br>');
    }
    return;
  }

  crearGeometriaExcavacion(lVal, aVal, pVal, true, leerSueloExcavacion(), leerRetiroExcavacion()); // F3: tipo de suelo y % a retirar
  closeExcavacionModal();
  montonTierraMostrar(true); // recién excavado: el montón se ve hasta que se avance a otra etapa o función
}

function eliminarExcavacion() {
  if (!excavacionData) return;
  if (!confirm('¿Deseas rellenar la excavación y restaurar el terreno original?')) return;
  eliminarGeometriaExcavacion(true);
  closeExcavacionModal();
}

// Montón de tierra extraída (malla exc_pile): solo representa gráficamente la excavación recién hecha. Se muestra al excavar y
// mientras se está en la etapa de excavación, y se oculta (setEnabled(false)) al pasar a otra función. No borra ni cambia la
// excavación: fosa, terreno, datos, volumen y progreso guardado siguen igual; eliminarGeometriaExcavacion lo destruye con el resto.
function montonTierraMostrar(ver) {
  if (!excavacionRootNode) return;
  const pile = excavacionRootNode.getChildMeshes().find(m => m.name === 'exc_pile');
  if (pile) pile.setEnabled(ver);
}
// Avanzar de etapa = usar otra función (Calcular Área, Crear Concreto, Construir, Programar, Plano o una pieza del catálogo).
// Un botón bloqueado (disabled) no genera clic, así que un intento sobre una etapa bloqueada no cuenta como avanzar.
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#btnMatematicas, #btnStorm, #btnWall, #btnProgramar, #btnPlano, #cat-list .cat-item:not(#cat-excavacion)');
  if (b && !b.disabled && !b.classList.contains('cat-disabled')) montonTierraMostrar(false);
});

// ══════════════════════════════════════════════════════════════════════════════
// ── F3 · EXCAVACIÓN: TIPO DE SUELO, % A RETIRAR Y VIAJES DE VOLQUETA ──────────
// ══════════════════════════════════════════════════════════════════════════════
// Amplía el modal de excavación; no toca la geometría (fosa, taludes, estacas, cinta, mira, montículo).
// Fórmulas (calculos.js, datos de referencia.js A.1): suelto = banco × factor; a retirar = suelto × %;
// viajes = Math.ceil(a retirar / 5 m³), con el ruido de coma flotante eliminado antes (criterio educativo de operación).
// El tipo de suelo y el % se guardan en excavacionData (→ progreso.excavacion → terreno.excavacion) al confirmar
// «Iniciar / Actualizar Excavación»; el modal recalcula en vivo y, al cerrarlo sin confirmar, lo no confirmado se descarta.
const EXC_TEXTO_SIN_FACTOR = 'Sin factor de conversión banco→suelto; no aplica a excavación';

// (function, no const: se usan desde crearGeometriaExcavacion, que puede ejecutarse durante la restauración)
function sanearTipoSuelo(t) { return factorBancoSuelto(t) !== null ? t : SUELO_POR_DEFECTO; }
function sanearPorcentajeRetiro(p) { return typeof p === 'number' && isFinite(p) && p >= 0 && p <= 1 ? p : PORCENTAJE_RETIRO_POR_DEFECTO; }

function leerSueloExcavacion() {
  return sanearTipoSuelo(document.getElementById('exc-suelo')?.value);
}
function leerRetiroExcavacion() {
  const v = document.getElementById('exc-retiro-range')?.value;
  if (v === undefined || String(v).trim() === '') return PORCENTAJE_RETIRO_POR_DEFECTO;
  const n = Number(v);
  return sanearPorcentajeRetiro(isFinite(n) ? n / 100 : NaN);
}

// Banco → suelto → a retirar → viajes para un tipo de suelo y un porcentaje; null si algún dato no es válido.
function resultadosSueloExcavacion(volBanco, tipoSuelo, porcentajeRetiro) {
  const suelto = volumenSuelto(volBanco, tipoSuelo);
  if (suelto === null) return null;
  const v = viajesVolqueta(suelto, undefined, porcentajeRetiro);
  return v === null ? null : { banco: volBanco, suelto, factor: factorBancoSuelto(tipoSuelo), ...v };
}

// Campos que se añaden al contexto de la telemetría «excavacion_realizada».
function contextoSueloExcavacion(datos) {
  const r = resultadosSueloExcavacion(datos.volumen, datos.tipo_suelo, datos.porcentaje_retiro);
  return {
    tipo_suelo: datos.tipo_suelo,
    porcentaje_retiro: datos.porcentaje_retiro,
    volumen_suelto: r ? r.suelto : null,
    viajes: r ? r.viajes : null,
  };
}

// Llena el selector desde A.1 (una sola vez): 11 filas, 9 con factor y 2 deshabilitadas por no tenerlo.
function poblarSelectorSuelo() {
  const sel = document.getElementById('exc-suelo');
  if (!sel || sel.options.length > 0) return;
  for (const [id, fila] of Object.entries(A1_FACTORES_SUELO.filas)) {
    const f = fila.factor_banco_suelto.valor;
    const op = document.createElement('option');
    op.value = id;
    if (f === null) {
      op.textContent = `${fila.nombre} — sin factor`;
      op.disabled = true;
      op.title = EXC_TEXTO_SIN_FACTOR;
    } else {
      op.textContent = `${fila.nombre} — ×${f.toFixed(2)}`;
      op.title = `${fila.nombre}: 1 m³ en banco = ${f.toFixed(2)} m³ suelto`;
    }
    sel.appendChild(op);
  }
}

// Al abrir el modal: el selector y el slider parten de lo guardado en la excavación activa, o de los valores por defecto.
function excInicializarSuelo() {
  poblarSelectorSuelo();
  const sel = document.getElementById('exc-suelo');
  const rng = document.getElementById('exc-retiro-range');
  if (sel) sel.value = sanearTipoSuelo(excavacionData?.tipo_suelo);
  if (rng) rng.value = String(Math.round(sanearPorcentajeRetiro(excavacionData?.porcentaje_retiro) * 100));
}

// Pinta (o esconde, con volBanco = null) el panel de resultados. Solo lectura de datos: no cambia la excavación.
function excResultadosSuelo(volBanco) {
  const box = document.getElementById('exc-resultados');
  if (!box) return;
  const pct = leerRetiroExcavacion();
  const pctTxt = Math.round(pct * 100) + ' %';
  const valSlider = document.getElementById('exc-retiro-val');
  if (valSlider) valSlider.textContent = pctTxt;
  const r = volBanco === null ? null : resultadosSueloExcavacion(volBanco, leerSueloExcavacion(), pct);
  box.hidden = r === null;
  if (r === null) return;

  const cap = PARAMETROS.volqueta_m3.valor;
  const fuenteA1 = A1_FACTORES_SUELO.fuente;
  const fuente = `Manual de Materiales, ${fuenteA1.tabla} (p. ${fuenteA1.pagina_impresa}): factores de conversión banco→suelto`;
  const palabra = r.viajes === 1 ? 'viaje' : 'viajes';
  const poner = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  poner('exc-res-cadena', `${r.banco.toFixed(2)} m³ (banco) → ${r.suelto.toFixed(2)} m³ (suelto) → ${r.viajes} ${palabra} de ${cap} m³`);
  poner('exc-res-banco', `${r.banco.toFixed(2)} m³`);
  poner('exc-res-factor', r.factor.toFixed(2));
  poner('exc-res-suelto', `${r.suelto.toFixed(2)} m³`);
  poner('exc-res-pct', pctTxt);
  poner('exc-res-retirar', `${r.aRetirar.toFixed(2)} m³`);
  poner('exc-res-cap', `${cap} m³`);
  poner('exc-res-viajes', `${r.viajes} ${palabra} (${r.viajesSinRedondear.toFixed(2)} sin redondear)`);
  poner('exc-res-fuente', `Fuente: ${fuente}. Capacidad de la volqueta: Manual de Materiales, ${PARAMETROS.volqueta_m3.fuente.tabla}.`);
  for (const id of ['exc-res-cadena', 'exc-res-fuente']) { const el = document.getElementById(id); if (el) el.title = fuente; }
}

function excOnSueloChange() { excActualizarVista(); }
function excOnRetiroChange() { excActualizarVista(); }

// ── F4a · EDITOR 2D DEL PLANO (SVG) ──────────────────────────────────────────
// Overlay modal con un <svg>: lote en metros, ejes, cotas, rejilla opcional y herramientas punto / línea / rectángulo.
// Los datos viven en progreso.plano (campo aditivo; guardado.js no se toca). Las operaciones geométricas son funciones
// puras de calculos.js. La cámara 3D no se toca: el overlay opaco absorbe puntero y rueda, y la compuerta de teclado
// (capture, registrada al evaluar el módulo → antes que F2.2/F2.4c/F2.4d/setupGizmos) impide que el 3D reciba teclas.
let planoGuardado = null;                                   // plano persistido (ya saneado) o null si nunca se guardó
let prefRejilla = { visible: false, paso: PLANO_PASO_DEFECTO };
let planoTrab = null;                                       // copia de trabajo mientras el editor está abierto
let planoBase0 = '';                                        // huella de lo guardado al abrir / al pulsar Guardar
let planoVista = { zoom: 1, cx: 0, cz: 0 };                 // no se guarda
let planoHerr = 'select';
let planoSel = null;                                        // id del elemento seleccionado
let planoInicio = null;                                     // primer clic de una línea / rectángulo en curso
let planoCursor = null;                                     // última posición del cursor (m, ya ajustada a la rejilla)
let planoPan = null, planoArrastre = null;
let planoEspacio = false, planoConfirma = false, planoTipTimer = 0;
// F4b: habitaciones (array separado en planoTrab.habitaciones). planoSel sigue siendo SOLO el id numérico de un elemento de F4a.
let planoSelHab = null;                                     // id ('h1', …) de la habitación seleccionada
let planoArrastreHab = null;                                // { id, modo: 'mover' | 'esquina', esquina?, orig, w0 }
let planoPlantillaPend = null;                              // clave de plantilla a la espera de «Reemplazar / Añadir»
// F4c: vanos. Viven dentro de cada habitación (habitacion.vanos); planoSelVano = { hab:'h1', id:'v1' } es excluyente con planoSel y planoSelHab.
let planoSelVano = null;
let planoArrastreVano = null;                               // { hab, id, orig, pos0 } mientras se arrastra un vano a lo largo de su pared
let planoVanoPrev = null;                                   // vano fantasma bajo el cursor con la herramienta Puerta / Ventana
let planoBorrarPend = null;                                 // id de la habitación con vanos a la espera de «Borrar / Cancelar»
const PLANO_REJILLA_MIN_PX = 4;                            // separación mínima en pantalla para dibujar la rejilla
const PLANO_TOL_PX = 9;                                     // tolerancia de selección en píxeles
const PLANO_HANDLE_PX = 10;                                 // F4b: lado dibujado del handle de esquina; zona de impacto = ±PLANO_HANDLE_PX
const PLANO_AYUDA = {
  select: 'Seleccionar: clic sobre un elemento o una habitación para elegirlo y arrastra para moverlo. Supr lo borra.',
  punto: 'Punto: haz clic para colocarlo.',
  linea: 'Línea: clic en el punto inicial y otro clic en el final. Esc cancela.',
  rectangulo: 'Rectángulo: clic en una esquina y otro clic en la esquina opuesta. Esc cancela.',
  habitacion: 'Habitación: clic en una esquina y otro clic en la esquina opuesta. Esc cancela.',
  puerta: 'Puerta: con una habitación seleccionada, haz clic sobre una de sus paredes. Esc vuelve a Seleccionar.',
  ventana: 'Ventana: con una habitación seleccionada, haz clic sobre una de sus paredes. Esc vuelve a Seleccionar.',
};

const planoEl = id => document.getElementById(id);
const planoAbierto = () => planoEl('plano-overlay')?.classList.contains('open') === true;
const planoSoloLectura = () => !!vistaAlumnoId;
const planoHuella = p => JSON.stringify({ l: p.lote, e: p.elementos, h: p.habitaciones });
const planoHayCambios = () => !!planoTrab && planoHuella(planoTrab) !== planoBase0;
const planoSerial = () => sanearPlano({ ...planoTrab, rejilla: prefRejilla, materializado: matSnapshot });   // F4d: lo materializado es el de matSnapshot (aditivo)
const planoEscribiendo = t => !!t && (t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' ||
  (t.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(t.type)));

function planoDims() {
  const r = planoEl('plano-svg').getBoundingClientRect();
  return { w: r.width || 800, h: r.height || 600, left: r.left, top: r.top };
}
function planoEscala() { return escalaBasePlano(planoTrab.lote, planoDims().w, planoDims().h); }
function planoAPantalla(x, z) {
  const d = planoDims();
  return mundoAPantalla(planoVista, planoEscala(), d.w, d.h, x, z);
}
// Posición del puntero en el mundo (m). ajustar = aplicar la rejilla si está visible (D4: sin casilla extra).
function planoMundo(e, ajustar) {
  const d = planoDims();
  const w = pantallaAMundo(planoVista, planoEscala(), d.w, d.h, e.clientX - d.left, e.clientY - d.top);
  const lim = v => Math.max(-PLANO_MAX_COORDENADA, Math.min(PLANO_MAX_COORDENADA, v));
  const paso = ajustar && prefRejilla.visible ? prefRejilla.paso : 0.001;
  return { x: ajustarARejilla(lim(w.x), paso), z: ajustarARejilla(lim(w.z), paso) };
}

// ── F4b · habitaciones: dibujo ──
// El nombre lo escribe el alumno: se escapa SIEMPRE antes de entrar en el innerHTML del SVG.
const planoEscapar = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const planoHabSeleccionada = () => (planoTrab && planoSelHab ? planoTrab.habitaciones.find(h => h.id === planoSelHab) || null : null);
const planoEsquinas = h => [['no', h.x, h.z + h.largo], ['ne', h.x + h.ancho, h.z + h.largo], ['so', h.x, h.z], ['se', h.x + h.ancho, h.z]];

// Las habitaciones van DEBAJO de los elementos de F4a. Color (opción A): seleccionada = halo y handles celestes; solape = borde
// y relleno ámbar. Los elementos de F4a conservan su ámbar de selección sin cambios.
function planoRenderHabitaciones(P, s, f) {
  const habs = planoTrab.habitaciones;
  if (!habs.length) return '';
  const solapes = solapesHabitaciones(habs);
  const cotas = habs.length <= 12;                          // con muchas habitaciones solo se rotula la seleccionada
  const handles = planoHerr === 'select' && !planoSoloLectura();
  let g = '';
  for (const h of habs) {
    const sel = h.id === planoSelHab, sol = !!solapes[h.id];
    const p = P(h.x, h.z + h.largo), w = f(h.ancho * s), hh = f(h.largo * s);
    const c = P(h.x + h.ancho / 2, h.z + h.largo / 2);
    g += `<g class="plano-hab${sel ? ' sel' : ''}${sol ? ' solape' : ''}" data-hab-id="${h.id}" data-tipo="habitacion"${sel ? ' data-sel="1"' : ''}${sol ? ' data-solape="1"' : ''}>`;
    if (sel) g += `<rect class="hab-halo" x="${f(p.px - 4)}" y="${f(p.py - 4)}" width="${f(w + 8)}" height="${f(hh + 8)}"/>`;
    const mascara = h.vanos && h.vanos.length ? planoMascaraHab(h, P, f) : null;                 // F4c: hueco de los vanos en la pared
    if (mascara) g += mascara.defs;
    g += `<rect class="hab-forma"${mascara ? ` mask="url(#${mascara.id})"` : ''} x="${f(p.px)}" y="${f(p.py)}" width="${w}" height="${hh}"/>`;
    g += `<text class="plano-cota hab-nombre" data-hab-nombre="${h.id}" x="${f(c.px)}" y="${f(c.py - 2)}" text-anchor="middle">${planoEscapar(h.nombre)}</text>`;
    g += `<text class="plano-cota hab-area" data-hab-area="${h.id}" x="${f(c.px)}" y="${f(c.py + 13)}" text-anchor="middle">${formatearArea(areaRectangulo(h.ancho, h.largo))}</text>`;
    if (cotas || sel) {
      const ta = P(h.x + h.ancho / 2, h.z + h.largo), tl = P(h.x + h.ancho, h.z + h.largo / 2);
      g += `<text class="plano-cota" data-cota="${h.id}-ancho" x="${f(ta.px)}" y="${f(ta.py - 7)}" text-anchor="middle">${formatearCota(h.ancho)}</text>`;
      g += `<text class="plano-cota" data-cota="${h.id}-largo" x="${f(tl.px + 8)}" y="${f(tl.py + 4)}">${formatearCota(h.largo)}</text>`;
    }
    if (sel && handles) {
      for (const [k, x, z] of planoEsquinas(h)) {
        const q = P(x, z), activo = planoArrastreHab && planoArrastreHab.id === h.id && planoArrastreHab.esquina === k;
        g += `<rect class="plano-handle${activo ? ' activo' : ''}" data-handle="${k}" x="${f(q.px - PLANO_HANDLE_PX / 2)}" y="${f(q.py - PLANO_HANDLE_PX / 2)}" width="${PLANO_HANDLE_PX}" height="${PLANO_HANDLE_PX}"/>`;
      }
    }
    g += '</g>';
  }
  return g;
}

// ── F4c · vanos: dibujo ──
// Opción C: hueco real + color. El hueco recorta el borde de la habitación con una máscara SVG (el fondo del lienzo es un degradado,
// así que no vale «pintar» del color del fondo); encima va el segmento de color (marrón = puerta, azul claro = ventana).
const PLANO_VANO_HUECO_PX = 9;                                // grosor del recorte en la pared (más ancho que el borde)
const PLANO_VANO_AVISO_PAD = 7, PLANO_VANO_HALO_PAD = 11;     // margen (px) de los contornos de aviso y de selección

function planoMascaraHab(h, P, f) {
  const id = `hm-${h.id}`;
  let d = `<mask id="${id}" maskUnits="userSpaceOnUse" x="-20000" y="-20000" width="40000" height="40000">` +
    '<rect x="-20000" y="-20000" width="40000" height="40000" fill="#fff"/>';
  for (const v of h.vanos) {
    const sg = segmentoVano(h, v);
    if (!sg) continue;
    const a = P(sg.x1, sg.z1), b = P(sg.x2, sg.z2);
    d += `<line x1="${f(a.px)}" y1="${f(a.py)}" x2="${f(b.px)}" y2="${f(b.py)}" stroke="#000" stroke-width="${PLANO_VANO_HUECO_PX}"/>`;
  }
  return { id, defs: d + '</mask>' };
}

// Rectángulo (en píxeles) que rodea el segmento a-b con un margen: contorno de aviso o halo de selección.
function planoContornoVano(a, b, pad, clase, f) {
  const x = Math.min(a.px, b.px), y = Math.min(a.py, b.py), w = Math.abs(b.px - a.px), hh = Math.abs(b.py - a.py);
  return `<rect class="${clase}" x="${f(x - pad)}" y="${f(y - pad)}" width="${f(w + 2 * pad)}" height="${f(hh + 2 * pad)}"/>`;
}

function planoRenderVanos(P, f) {
  let g = '';
  for (const h of planoTrab.habitaciones) {
    if (!h.vanos || !h.vanos.length) continue;
    const est = estadoVanos(h);
    for (const v of h.vanos) {
      const sg = segmentoVano(h, v);
      if (!sg) continue;
      const a = P(sg.x1, sg.z1), b = P(sg.x2, sg.z2), e = est[v.id];
      const sel = !!planoSelVano && planoSelVano.hab === h.id && planoSelVano.id === v.id;
      const sol = e.solapa.length > 0;
      g += `<g class="plano-vano ${v.tipo}${sel ? ' sel' : ''}${e.fuera ? ' fuera' : ''}${sol ? ' solape' : ''}" data-vano-id="${v.id}" data-vano-hab="${h.id}" data-tipo="vano" data-vano-tipo="${v.tipo}"` +
        `${sel ? ' data-sel="1"' : ''}${e.fuera ? ' data-fuera="1"' : ''}${sol ? ' data-solape="1"' : ''}>`;
      g += `<line class="vano-color" x1="${f(a.px)}" y1="${f(a.py)}" x2="${f(b.px)}" y2="${f(b.py)}"/>`;
      if (e.fuera || sol) g += planoContornoVano(a, b, PLANO_VANO_AVISO_PAD, 'vano-aviso', f);   // rojo (fuera de pared) gana al ámbar (solape)
      if (sel) g += planoContornoVano(a, b, PLANO_VANO_HALO_PAD, 'vano-halo', f);
      g += '</g>';
    }
  }
  return g;
}

// Fantasma del vano que se colocaría con un clic (herramienta Puerta / Ventana con el cursor sobre una pared).
function planoRenderPreviaVano(P, f) {
  if ((planoHerr !== 'puerta' && planoHerr !== 'ventana') || !planoVanoPrev) return '';
  const sg = segmentoVano(planoVanoPrev.hab, planoVanoPrev.vano);
  if (!sg) return '';
  const a = P(sg.x1, sg.z1), b = P(sg.x2, sg.z2);
  return `<g class="plano-vano previa ${planoVanoPrev.vano.tipo}" data-vano-previa="1"><line class="vano-color" x1="${f(a.px)}" y1="${f(a.py)}" x2="${f(b.px)}" y2="${f(b.py)}"/></g>`;
}

// Fantasma de la habitación que se está dibujando (primer clic dado y cursor en movimiento), con «ancho × largo m».
function planoRenderPreviaHab(P, f) {
  if (planoHerr !== 'habitacion' || !planoInicio || !planoCursor) return '';
  const r = normalizarRectangulo(planoInicio.x, planoInicio.z, planoCursor.x, planoCursor.z);
  if (!r || !(r.ancho > 0) || !(r.largo > 0)) return '';
  const a = P(r.x, r.z + r.largo), b = P(r.x + r.ancho, r.z), c = P(r.x + r.ancho / 2, r.z + r.largo / 2);
  const ok = habitacionCreable(r.ancho, r.largo);
  return `<g class="plano-hab previa${ok ? '' : ' invalida'}" data-hab-previa="1">` +
    `<rect class="hab-forma" x="${f(a.px)}" y="${f(a.py)}" width="${f(b.px - a.px)}" height="${f(b.py - a.py)}"/>` +
    `<text class="plano-cota" data-cota="hab-previa" x="${f(c.px)}" y="${f(c.py + 4)}" text-anchor="middle">${formatearCota(r.ancho).replace(' m', '')} × ${formatearCota(r.largo)}</text></g>`;
}

function planoRender() {
  if (!planoAbierto() || !planoTrab) return;
  const svg = planoEl('plano-svg');
  const { w, h } = planoDims();
  const base = escalaBasePlano(planoTrab.lote, w, h);
  const s = base * planoVista.zoom;
  const P = (x, z) => mundoAPantalla(planoVista, base, w, h, x, z);
  const f = v => Math.round(v * 100) / 100;
  const { ancho: LA, largo: LL } = planoTrab.lote;
  const a = P(-LA / 2, LL / 2), b = P(LA / 2, -LL / 2);       // esquinas pantalla del lote (arriba-izq, abajo-der)
  let out = '';

  // rejilla: solo dentro del lote; se omite si quedaría demasiado densa (el imán sigue activo)
  const paso = prefRejilla.paso;
  const nota = planoEl('plano-rejilla-nota');
  if (prefRejilla.visible && paso * s >= PLANO_REJILLA_MIN_PX) {
    let d = '';
    for (let x = Math.ceil(-LA / 2 / paso - 1e-9) * paso; x <= LA / 2 + 1e-9; x += paso) { const px = f(P(x, 0).px); d += `M${px} ${f(a.py)}V${f(b.py)}`; }
    for (let z = Math.ceil(-LL / 2 / paso - 1e-9) * paso; z <= LL / 2 + 1e-9; z += paso) { const py = f(P(0, z).py); d += `M${f(a.px)} ${py}H${f(b.px)}`; }
    out += `<path class="plano-rejilla" data-rejilla="1" d="${d}"/>`;
  }
  planoEl('plano-svg').dataset.rejillaDibujada = prefRejilla.visible && paso * s >= PLANO_REJILLA_MIN_PX ? '1' : '0';

  // lote y sus cotas
  out += `<rect class="plano-lote" data-lote="1" x="${f(a.px)}" y="${f(a.py)}" width="${f(b.px - a.px)}" height="${f(b.py - a.py)}"/>`;
  out += `<text class="plano-cota lote" data-cota="lote-ancho" x="${f((a.px + b.px) / 2)}" y="${f(a.py - 8)}" text-anchor="middle">${formatearCota(LA)}</text>`;
  out += `<text class="plano-cota lote" data-cota="lote-largo" x="${f(b.px + 8)}" y="${f((a.py + b.py) / 2 + 4)}">${formatearCota(LL)}</text>`;

  // contorno de la excavación activa: referencia de SOLO LECTURA (no editable, no seleccionable, no se guarda)
  if (excavacionData && excavacionData.activa) {
    const c1 = P(-excavacionData.ancho / 2, excavacionData.largo / 2), c2 = P(excavacionData.ancho / 2, -excavacionData.largo / 2);
    const rr = `x="${f(c1.px)}" y="${f(c1.py)}" width="${f(c2.px - c1.px)}" height="${f(c2.py - c1.py)}"`;
    out += `<g data-contorno="excavacion"><title>Contorno de la excavación actual (solo lectura)</title>` +
      `<rect class="plano-contorno" ${rr}/><rect class="plano-contorno-hit" ${rr}/></g>`;
  }

  // ejes X (este) y Z (norte) con origen "0,0"
  const o = P(0, 0), xe = P(LA / 2 + 0.8, 0), xs = P(-LA / 2 - 0.4, 0), ze = P(0, LL / 2 + 0.8), zs = P(0, -LL / 2 - 0.4);
  out += `<g data-ejes="1"><path class="plano-eje" d="M${f(xs.px)} ${f(o.py)}H${f(xe.px)}M${f(o.px)} ${f(zs.py)}V${f(ze.py)}"/>` +
    `<path class="plano-flecha" d="M${f(xe.px)} ${f(o.py)}l-9 -4v8z"/><path class="plano-flecha" d="M${f(o.px)} ${f(ze.py)}l-4 9h8z"/>` +
    `<text class="plano-cota eje" data-eje="x" x="${f(xe.px + 6)}" y="${f(o.py + 4)}">X (este)</text>` +
    `<text class="plano-cota eje" data-eje="z" x="${f(o.px + 8)}" y="${f(ze.py + 4)}">Z (norte)</text>` +
    `<text class="plano-cota eje" data-eje="origen" x="${f(o.px + 6)}" y="${f(o.py + 15)}">0,0</text></g>`;

  // F4b: habitaciones (debajo de los elementos de F4a)
  out += planoRenderHabitaciones(P, s, f);
  out += planoRenderVanos(P, f);                             // F4c: vanos encima de las habitaciones y debajo de los elementos de F4a

  // elementos
  const cotas = planoTrab.elementos.length <= 120;           // con muchos elementos solo se rotula el seleccionado
  const dibuja = (el, extra) => {
    const t = el.tipo;
    let g = `<g class="plano-el ${t === 'rectangulo' ? 'rect' : t}${el.id === planoSel ? ' sel' : ''}${extra || ''}" data-el-id="${el.id ?? ''}" data-tipo="${t}"${el.id === planoSel ? ' data-sel="1"' : ''}>`;
    if (t === 'punto') { const p = P(el.x, el.z); g += `<circle class="forma" cx="${f(p.px)}" cy="${f(p.py)}" r="5"/>`; }
    else if (t === 'linea') { const p = P(el.x1, el.z1), q = P(el.x2, el.z2); g += `<line class="forma" x1="${f(p.px)}" y1="${f(p.py)}" x2="${f(q.px)}" y2="${f(q.py)}"/>`; }
    else { const p = P(el.x, el.z + el.largo); g += `<rect class="forma" data-rect="1" x="${f(p.px)}" y="${f(p.py)}" width="${f(el.ancho * s)}" height="${f(el.largo * s)}"/>`; }
    if (cotas || el.id === planoSel || !el.id) {
      cotasElemento(el).forEach((c, i) => {
        const p = P(c.x, c.z);
        const lado = t === 'punto' || (t === 'rectangulo' && i === 1);
        g += `<text class="plano-cota" data-cota="${el.id ?? 'previa'}-${i}" x="${f(p.px + (lado ? 8 : 0))}" y="${f(p.py + (lado ? 4 : -7))}"${lado ? '' : ' text-anchor="middle"'}>${c.texto}</text>`;
      });
    }
    return g + '</g>';
  };
  for (const el of planoTrab.elementos) out += dibuja(el, '');
  const previa = planoElementoPrevio();
  if (previa) out += dibuja(previa, ' fantasma');
  out += planoRenderPreviaHab(P, f);                         // F4b
  out += planoRenderPreviaVano(P, f);                        // F4c

  svg.innerHTML = out;
  svg.dataset.zoom = String(Math.round(planoVista.zoom * 1000) / 1000);
  planoEl('plano-zoom-val').textContent = `${planoVista.zoom.toFixed(2)}×`;
  if (nota) nota.hidden = !(prefRejilla.visible && paso * s < PLANO_REJILLA_MIN_PX);
}

// Elemento fantasma mientras se dibuja (primer clic dado y cursor en movimiento).
function planoElementoPrevio() {
  if (!planoInicio || !planoCursor) return null;
  if (planoHerr === 'linea') {
    return distancia(planoInicio.x, planoInicio.z, planoCursor.x, planoCursor.z) > 0
      ? { tipo: 'linea', x1: planoInicio.x, z1: planoInicio.z, x2: planoCursor.x, z2: planoCursor.z } : null;
  }
  if (planoHerr === 'rectangulo') {
    const r = normalizarRectangulo(planoInicio.x, planoInicio.z, planoCursor.x, planoCursor.z);
    return r && r.ancho > 0 && r.largo > 0 ? { tipo: 'rectangulo', ...r } : null;
  }
  return null;
}

function planoActualizarUI() {
  const lectura = planoSoloLectura();
  document.querySelectorAll('#plano-overlay [data-herr]').forEach(b => {
    const on = b.dataset.herr === planoHerr;
    b.classList.toggle('activa', on);
    b.setAttribute('aria-pressed', String(on));
    b.disabled = lectura && b.dataset.herr !== 'select';
  });
  const svg = planoEl('plano-svg');
  svg.classList.toggle('herr-dibujo', planoHerr !== 'select');
  svg.dataset.herramienta = planoHerr;
  planoEl('plano-borrar').disabled = lectura || (planoSel === null && planoSelHab === null && planoSelVano === null);
  planoEl('plano-plantilla').disabled = lectura;                           // F4b
  planoEl('plano-guardar').disabled = lectura;
  planoEl('plano-lote-ancho').disabled = lectura;
  planoEl('plano-lote-largo').disabled = lectura;
  const sucio = planoHayCambios();
  const d = planoEl('plano-dirty');
  d.textContent = lectura ? 'Solo lectura' : sucio ? '● Cambios sin guardar' : '✓ Guardado';
  d.classList.toggle('sucio', sucio && !lectura);
  planoEl('plano-ayuda').textContent = planoInicio
    ? (planoHerr === 'linea' ? 'Línea: haz clic en el punto final. Esc cancela.'
      : planoHerr === 'habitacion' ? 'Habitación: haz clic en la esquina opuesta. Esc cancela.'
        : 'Rectángulo: haz clic en la esquina opuesta. Esc cancela.')
    : (lectura ? 'Vista de solo lectura. Zoom con la rueda; mueve el plano con el botón central o Espacio + arrastrar.' : PLANO_AYUDA[planoHerr]);
  planoPanelActualizar();                                                  // F4b / F4c
  matActualizarUI();                                                       // F4d
}

function planoSincronizarControles() {
  planoEl('plano-lote-ancho').value = planoTrab.lote.ancho;
  planoEl('plano-lote-largo').value = planoTrab.lote.largo;
  planoEl('plano-rejilla-visible').checked = prefRejilla.visible;
  planoEl('plano-rejilla-paso').value = String(prefRejilla.paso);
  planoEl('plano-rejilla-paso').disabled = !prefRejilla.visible;
}

function planoRefrescar() { planoActualizarUI(); planoRender(); }

function planoElegirHerramienta(h) {
  if (planoSoloLectura() && h !== 'select') return;
  planoHerr = h;
  planoInicio = null;
  planoVanoPrev = null;                                                    // F4c: el fantasma del vano solo existe con Puerta / Ventana
  planoRefrescar();
}

function planoMostrarTip(texto) {
  const tip = planoEl('plano-tip');
  tip.textContent = texto;
  tip.hidden = false;
  clearTimeout(planoTipTimer);
  planoTipTimer = setTimeout(() => { tip.hidden = true; }, 3500);
}

function planoBorrarSeleccion() {
  if (planoSoloLectura()) return;
  const vs = planoVanoSeleccionado();
  if (vs) {                                                                // F4c: un vano se borra sin confirmación (y sin deshacer)
    planoTrab.habitaciones = planoTrab.habitaciones.map(h => {
      if (h.id !== vs.hab.id) return h;
      const { vanos, ...resto } = h;
      const quedan = vanos.filter(v => v.id !== vs.vano.id);
      return quedan.length ? { ...resto, vanos: quedan } : resto;          // sin vanos la clave desaparece (igual que al guardar)
    });
    planoSelVano = null;
    planoArrastreVano = null;
    planoRefrescar();
    return;
  }
  if (planoSel === null && planoSelHab !== null) {                         // F4b: habitación seleccionada
    const hb = planoHabSeleccionada();
    if (hb && hb.vanos && hb.vanos.length) { planoBorrarPedir(hb); return; }   // F4c: con vanos se pide confirmación
    planoBorrarHabitacion(planoSelHab);
    return;
  }
  if (planoSel === null) return;
  planoTrab.elementos = planoTrab.elementos.filter(e => e.id !== planoSel);
  planoSel = null;
  planoArrastre = null;
  planoRefrescar();
}

function planoBorrarHabitacion(id) {
  planoTrab.habitaciones = planoTrab.habitaciones.filter(h => h.id !== id);
  planoSelHab = null;
  planoArrastreHab = null;
  planoRefrescar();
}

// ── F4c · vanos: selección, alta, edición y borrado de la habitación con vanos ──
const planoHabDeVano = () => (planoTrab && planoSelVano ? planoTrab.habitaciones.find(h => h.id === planoSelVano.hab) || null : null);
function planoVanoSeleccionado() {
  const hab = planoHabDeVano();
  const vano = hab && hab.vanos ? hab.vanos.find(v => v.id === planoSelVano.id) : null;
  return hab && vano ? { hab, vano } : null;
}
// Habitación a la que se añadirán los vanos: la seleccionada o, si hay un vano seleccionado, la suya.
const planoHabObjetivo = () => planoHabSeleccionada() || planoHabDeVano();

// Vano que se crearía con un clic en `libre` (m): { hab, vano } o { error: 'sinhab' | 'lejos' | 'nocabe', hab?, lado? }.
function planoCalcularVano(tipo, libre) {
  const hab = planoHabObjetivo();
  if (!hab) return { error: 'sinhab' };
  const tol = PLANO_TOL_PX / (planoEscala() * planoVista.zoom);
  const pared = paredMasCercana(hab, libre.x, libre.z, tol);
  if (!pared) return { error: 'lejos', hab };
  const nuevo = vanoNuevo(hab, tipo, pared.lado, pared.pos, prefRejilla.visible ? prefRejilla.paso : 0);
  return nuevo ? { hab, vano: nuevo } : { error: 'nocabe', hab, lado: pared.lado };
}

function planoCrearVano(tipo, libre) {
  const r = planoCalcularVano(tipo, libre);
  if (r.error === 'sinhab') { planoMostrarTip('Selecciona una habitación y haz clic sobre una de sus paredes.'); return; }
  if (r.error === 'lejos') { planoMostrarTip('Haz clic sobre una de las paredes de la habitación seleccionada.'); return; }
  if (r.error === 'nocabe') { planoMostrarTip(`No cabe: la pared ${r.lado} mide ${formatearCota(longitudPared(r.hab, r.lado))}.`); return; }
  if ((r.hab.vanos || []).length >= VANO_MAX_POR_HAB) { planoMostrarTip(`Máximo ${VANO_MAX_POR_HAB} vanos por habitación.`); return; }
  if (totalVanos(planoTrab.habitaciones) >= VANO_MAX_GLOBAL) { planoMostrarTip(`Máximo ${VANO_MAX_GLOBAL} vanos en el plano.`); return; }
  const id = siguienteIdVano(r.hab.vanos || []);
  planoTrab.habitaciones = planoTrab.habitaciones.map(h => (h.id === r.hab.id ? { ...h, vanos: [...(h.vanos || []), { id, ...r.vano }] } : h));
  planoSelVano = { hab: r.hab.id, id };                    // el nuevo vano queda seleccionado y la herramienta sigue activa
  planoSelHab = null; planoSel = null;
  planoVanoPrev = null;
}

// Aplica un campo del panel del vano (al «change»). Un valor inválido, o que ya no cabe en la pared, se ignora y se restaura.
function planoVanoEditar(campo) {
  const vs = planoVanoSeleccionado();
  if (!vs || planoSoloLectura()) return;
  const { hab, vano } = vs;
  const el = planoEl(`plano-vano-${campo}`);
  let cambio = null;
  if (campo === 'tipo' || campo === 'lado') {
    if ((campo === 'tipo' ? VANO_TIPOS : VANO_LADOS).includes(el.value)) cambio = { [campo]: el.value };
  } else {
    const t = el.value.trim(), n = Number(t);
    const [min, max] = campo === 'ancho' ? [VANO_ANCHO_MIN, VANO_ANCHO_MAX] : campo === 'alto' ? [VANO_ALTO_MIN, VANO_ALTO_MAX] : [0, VANO_OFFSET_MAX];
    if (t !== '' && Number.isFinite(n) && n >= min && n <= max) cambio = { [campo]: Math.round(n * 1000) / 1000 };
    else planoMostrarTip(`El ${campo} debe estar entre ${min} y ${max} m.`);
  }
  let nuevo = cambio ? { ...vano, ...cambio } : null;
  if (nuevo && (campo === 'ancho' || campo === 'offset' || campo === 'lado') && !vanoCabeEnPared(nuevo, hab)) {
    planoMostrarTip(`No cabe en la pared ${nuevo.lado} (mide ${formatearCota(longitudPared(hab, nuevo.lado))}).`);
    nuevo = null;
  }
  if (nuevo) planoTrab.habitaciones = planoTrab.habitaciones.map(h => (h.id === hab.id ? { ...h, vanos: h.vanos.map(v => (v.id === vano.id ? nuevo : v)) } : h));
  planoRefrescar();
  planoPanelActualizar(true);
}

// Borrar una habitación que tiene vanos: diálogo «Borrar / Cancelar».
function planoBorrarPedir(h) {
  const n = h.vanos.length;
  planoBorrarPend = h.id;
  planoEl('plano-vano-conf-txt').textContent = `Esta habitación tiene ${n} ${n === 1 ? 'vano' : 'vanos'}. ¿Borrar también?`;
  planoEl('plano-vano-conf').hidden = false;
  planoEl('plano-vano-conf-cancelar').focus({ preventScroll: true });
}

function planoBorrarResolver(confirmar) {
  const id = planoBorrarPend;
  planoBorrarPend = null;
  planoEl('plano-vano-conf').hidden = true;
  planoEl('plano-overlay').focus({ preventScroll: true });
  if (confirmar && id && planoTrab) planoBorrarHabitacion(id);
}

function planoAnadir(el) {
  if (planoTrab.elementos.length >= PLANO_MAX_ELEMENTOS) { planoMostrarTip(`Máximo ${PLANO_MAX_ELEMENTOS} elementos en el plano.`); return false; }
  planoTrab.elementos.push({ id: planoTrab.contador++, ...el });
  return true;
}

// ── F4b · habitaciones: alta, panel, handles y plantillas ──
function planoAnadirHab(r) {
  if (planoTrab.habitaciones.length >= HAB_MAX) { planoMostrarTip(`Máximo ${HAB_MAX} habitaciones en el plano.`); return false; }
  const id = siguienteIdHabitacion(planoTrab.habitaciones);
  planoTrab.habitaciones.push({ id, tipo: 'habitacion', x: r.x, z: r.z, ancho: r.ancho, largo: r.largo, nombre: nombreHabitacionDefecto(Number(id.slice(1))) });
  planoSelHab = id;                                        // la nueva queda seleccionada: el panel muestra sus datos
  planoSel = null; planoSelVano = null;
  return true;
}

// Panel flotante: visible solo con la herramienta Habitación activa o con una habitación seleccionada (así F4a queda intacto).
// Los campos no se pisan mientras el alumno escribe en ellos, salvo con «forzar» (tras aplicar o restaurar un valor).
function planoPanelActualizar(forzar = false) {
  const panel = planoEl('plano-panel');
  if (!panel) return;
  const h = planoHabSeleccionada();
  const vs = planoAbierto() && planoTrab ? planoVanoSeleccionado() : null;           // F4c
  const visible = planoAbierto() && !!planoTrab && (planoHerr === 'habitacion' || !!h || !!vs);
  panel.hidden = !visible;
  if (!visible) return;
  const lectura = planoSoloLectura();
  planoEl('plano-panel-vacio').hidden = !!h || !!vs;
  planoEl('plano-panel-campos').hidden = !h;
  planoEl('plano-panel-vano').hidden = !vs;
  if (vs) planoPanelVano(vs, forzar, lectura);
  if (!h) return;
  for (const [k, v] of [['nombre', h.nombre], ['ancho', h.ancho], ['largo', h.largo]]) {
    const el = planoEl(`plano-hab-${k}`);
    if (forzar || document.activeElement !== el) el.value = v;
    el.disabled = lectura;
  }
  const area = areaRectangulo(h.ancho, h.largo), per = perimetroRectangulo(h.ancho, h.largo);
  const a = planoEl('plano-hab-area'), p = planoEl('plano-hab-perimetro');
  a.textContent = formatearArea(area); a.dataset.valor = String(area);
  p.textContent = formatearCota(per); p.dataset.valor = String(per);
  const sol = solapesHabitaciones(planoTrab.habitaciones)[h.id];
  const aviso = planoEl('plano-hab-solape');
  aviso.hidden = !sol;
  if (sol) aviso.textContent = `Se solapa con ${sol.map(id => planoTrab.habitaciones.find(x => x.id === id)?.nombre ?? id).join(', ')}`;
  const fuera = Object.entries(estadoVanos(h)).filter(([, e]) => e.fuera).map(([id]) => nombreVano(h.vanos.find(v => v.id === id)));   // F4c
  const avVanos = planoEl('plano-hab-vanos');
  avVanos.hidden = fuera.length === 0;
  if (fuera.length) avVanos.textContent = `${fuera.length === 1 ? 'Un vano no cabe' : `${fuera.length} vanos no caben`} en su pared: ${fuera.join(', ')}`;
  planoEl('plano-hab-borrar').disabled = lectura;
}

// F4c: sección del panel con los datos del vano seleccionado (tipo, ancho, alto, offset, lado) y sus avisos.
function planoPanelVano({ hab, vano }, forzar, lectura) {
  planoEl('plano-vano-titulo').textContent = `${nombreVano(vano)} · ${hab.nombre}`;
  for (const k of ['tipo', 'ancho', 'alto', 'offset', 'lado']) {
    const el = planoEl(`plano-vano-${k}`);
    if (forzar || document.activeElement !== el) el.value = vano[k];
    el.disabled = lectura;
  }
  const e = estadoVanos(hab)[vano.id];
  const av = planoEl('plano-vano-aviso');
  const msgs = [];
  if (e.fuera) msgs.push(`Fuera de pared: la pared ${vano.lado} mide ${formatearCota(longitudPared(hab, vano.lado))}`);
  if (e.solapa.length) msgs.push(`Se solapa con ${e.solapa.map(id => nombreVano(hab.vanos.find(v => v.id === id))).join(', ')}`);
  av.hidden = msgs.length === 0;
  av.textContent = msgs.join(' · ');
  planoEl('plano-vano-borrar').disabled = lectura;
}

// Aplica un campo del panel (se llama al «change»: Enter o al salir del campo). Un valor inválido se ignora y se restaura.
function planoHabEditar(campo) {
  const h = planoHabSeleccionada();
  if (!h || planoSoloLectura()) return;
  const el = planoEl(`plano-hab-${campo}`);
  let cambio = null;
  if (campo === 'nombre') {
    const v = el.value.trim().slice(0, HAB_NOMBRE_MAX).trim();
    if (v) cambio = { nombre: v }; else planoMostrarTip('El nombre no puede quedar vacío.');
  } else {
    const t = el.value.trim(), n = Number(t);
    if (t !== '' && Number.isFinite(n) && n >= HAB_LADO_MIN && n <= HAB_LADO_MAX) cambio = { [campo]: Math.round(n * 1000) / 1000 };
    else planoMostrarTip(`El ${campo} debe estar entre ${HAB_LADO_MIN} y ${HAB_LADO_MAX} m.`);
  }
  if (cambio) planoTrab.habitaciones = planoTrab.habitaciones.map(x => (x.id === h.id ? { ...x, ...cambio } : x));
  planoRefrescar();
  planoPanelActualizar(true);
}

// Esquina ('no' | 'ne' | 'so' | 'se') cuyo handle está bajo el puntero, solo para la habitación seleccionada con la herramienta V.
function planoHandleBajo(e) {
  const h = planoHabSeleccionada();
  if (!h || planoHerr !== 'select' || planoSoloLectura()) return null;
  const d = planoDims(), mx = e.clientX - d.left, my = e.clientY - d.top;
  for (const [k, x, z] of planoEsquinas(h)) {
    const q = planoAPantalla(x, z);
    if (Math.abs(mx - q.px) <= PLANO_HANDLE_PX && Math.abs(my - q.py) <= PLANO_HANDLE_PX) return k;
  }
  return null;
}

function planoInsertarPlantilla(nuevas, modo) {
  const lista = modo === 'anadir' ? planoTrab.habitaciones.slice() : [];
  if (lista.length + nuevas.length > HAB_MAX) { planoMostrarTip(`Máximo ${HAB_MAX} habitaciones en el plano.`); return false; }
  for (const n of nuevas) lista.push({ id: siguienteIdHabitacion(lista), ...n });
  planoTrab.habitaciones = lista;
  planoSelHab = null; planoArrastreHab = null; planoSelVano = null; planoArrastreVano = null;   // F4c
  planoRefrescar();
  return true;
}

// Se elige una plantilla: si no cabe en el lote se avisa y no se aplica; si ya hay habitaciones, se pregunta Reemplazar / Añadir.
function planoPlantillaElegida(clave) {
  planoEl('plano-plantilla').value = '';                   // vuelve al texto «Plantillas…»
  if (!clave || planoSoloLectura() || !planoTrab) return;
  const p = Object.prototype.hasOwnProperty.call(PLANTILLAS_HABITACIONES, clave) ? PLANTILLAS_HABITACIONES[clave] : null;
  if (!p) return;
  const nuevas = generarPlantilla(clave, planoTrab.lote);
  if (!nuevas) { planoMostrarTip(`«${p.etiqueta}» no cabe en el lote (necesita ${p.ancho} × ${p.largo} m). Agranda el lote para usarla.`); return; }
  if (planoTrab.habitaciones.length > 0) {
    planoPlantillaPend = clave;
    const nv = totalVanos(planoTrab.habitaciones);                         // F4c (D7): avisa de los vanos que se perderían al reemplazar
    planoEl('plano-plantilla-txt').textContent = `Ya hay habitaciones en el plano. ¿Qué hago con «${p.etiqueta}»?` + (nv > 0 ? ` (se borrarán también ${nv} ${nv === 1 ? 'vano' : 'vanos'})` : '');
    planoEl('plano-plantilla-conf').hidden = false;
    planoEl('plano-plantilla-reemplazar').focus({ preventScroll: true });
    return;
  }
  planoInsertarPlantilla(nuevas, 'reemplazar');
}

function planoPlantillaResolver(modo) {                    // modo: 'reemplazar' | 'anadir' | null (cancelar)
  const clave = planoPlantillaPend;
  planoPlantillaPend = null;
  planoEl('plano-plantilla-conf').hidden = true;
  planoEl('plano-overlay').focus({ preventScroll: true });
  if (!modo || !clave || !planoTrab) return;
  const nuevas = generarPlantilla(clave, planoTrab.lote);
  if (nuevas) planoInsertarPlantilla(nuevas, modo);
}

// ── puntero ──
function planoPointerDown(e) {
  const svg = planoEl('plano-svg');
  if (e.button === 1 || (e.button === 0 && planoEspacio)) {            // pan: botón central o Espacio + arrastrar
    e.preventDefault();
    planoPan = { x: e.clientX, y: e.clientY, cx: planoVista.cx, cz: planoVista.cz };
    svg.classList.add('panning');
    svg.setPointerCapture?.(e.pointerId);
    return;
  }
  if (e.button !== 0 || planoSoloLectura() && planoHerr !== 'select') return;
  const libre = planoMundo(e, false), p = planoMundo(e, true);
  if (planoHerr === 'select') {
    const esq = planoHandleBajo(e);                                      // F4b: primero los handles de la habitación seleccionada
    if (esq) {
      planoArrastre = null;
      planoArrastreHab = { id: planoSelHab, modo: 'esquina', esquina: esq, orig: planoHabSeleccionada(), w0: libre };
      svg.setPointerCapture?.(e.pointerId);
      planoCursor = p;
      planoRefrescar();
      return;
    }
    const tol = PLANO_TOL_PX / (planoEscala() * planoVista.zoom);
    const vh = vanoEnHabitaciones(planoTrab.habitaciones, libre.x, libre.z, tol);   // F4c: los vanos van antes que los elementos y las habitaciones
    if (vh) {
      planoSelVano = { hab: vh.hab.id, id: vh.vano.id };
      planoSel = null; planoSelHab = null; planoArrastre = null; planoArrastreHab = null;
      planoArrastreVano = planoSoloLectura() ? null : { hab: vh.hab.id, id: vh.vano.id, orig: vh.vano, pos0: posicionEnPared(vh.hab, vh.vano.lado, libre.x, libre.z) };
      if (planoArrastreVano) svg.setPointerCapture?.(e.pointerId);
      planoCursor = p;
      planoRefrescar();
      return;
    }
    planoSelVano = null; planoArrastreVano = null;
    const el = elementoEn(planoTrab.elementos, libre.x, libre.z, tol);
    planoSel = el ? el.id : null;
    planoArrastre = el && !planoSoloLectura() ? { id: el.id, orig: el, w0: libre } : null;
    if (planoArrastre) svg.setPointerCapture?.(e.pointerId);
    // F4b: sin elemento de F4a bajo el puntero se prueba con las habitaciones (se agarran por todo su cuerpo)
    const hb = el ? null : habitacionEn(planoTrab.habitaciones, libre.x, libre.z, tol);
    planoSelHab = hb ? hb.id : null;
    planoArrastreHab = hb && !planoSoloLectura() ? { id: hb.id, modo: 'mover', orig: hb, w0: libre } : null;
    if (planoArrastreHab) svg.setPointerCapture?.(e.pointerId);
  } else if (planoHerr === 'puerta' || planoHerr === 'ventana') {         // F4c: un clic sobre una pared de la habitación seleccionada
    planoCrearVano(planoHerr, libre);
  } else if (planoHerr === 'punto') {
    planoAnadir({ tipo: 'punto', x: p.x, z: p.z });
  } else if (!planoInicio) {
    planoInicio = p;
  } else if (planoHerr === 'linea') {
    if (distancia(planoInicio.x, planoInicio.z, p.x, p.z) > 0 &&
      planoAnadir({ tipo: 'linea', x1: planoInicio.x, z1: planoInicio.z, x2: p.x, z2: p.z })) planoInicio = null;
  } else if (planoHerr === 'habitacion') {                               // F4b: dos clics; si es muy pequeña no se crea
    const r = normalizarRectangulo(planoInicio.x, planoInicio.z, p.x, p.z);
    if (!habitacionCreable(r.ancho, r.largo)) {
      planoMostrarTip(`No se crea: cada lado debe medir entre ${HAB_LADO_MIN} y ${HAB_LADO_MAX} m y el área debe superar 0.01 m².`);
    } else if (planoAnadirHab(r)) planoInicio = null;
  } else {
    const r = normalizarRectangulo(planoInicio.x, planoInicio.z, p.x, p.z);
    if (r.ancho > 0 && r.largo > 0 && planoAnadir({ tipo: 'rectangulo', ...r })) planoInicio = null;
  }
  planoCursor = p;
  planoRefrescar();
}

function planoPointerMove(e) {
  if (!planoTrab) return;
  if (planoPan) {
    const s = planoEscala() * planoVista.zoom;
    const lim = v => Math.max(-PLANO_MAX_COORDENADA, Math.min(PLANO_MAX_COORDENADA, v));
    planoVista = { ...planoVista, cx: lim(planoPan.cx - (e.clientX - planoPan.x) / s), cz: lim(planoPan.cz + (e.clientY - planoPan.y) / s) };
    planoRender();
    return;
  }
  const p = planoMundo(e, true);
  planoCursor = p;
  planoEl('plano-cursor').textContent = `x: ${p.x.toFixed(2)} m · z: ${p.z.toFixed(2)} m`;
  if (planoArrastreVano) {                                               // F4c: arrastrar un vano a lo largo de su pared (cambia solo el offset)
    const a = planoArrastreVano, hab = planoTrab.habitaciones.find(h => h.id === a.hab);
    const libre = planoMundo(e, false);
    const pos = hab ? posicionEnPared(hab, a.orig.lado, libre.x, libre.z) : null;
    const off = pos === null || a.pos0 === null ? null : desplazarVano(hab, a.orig, pos - a.pos0, prefRejilla.visible ? prefRejilla.paso : 0);
    if (off !== null) {
      planoTrab.habitaciones = planoTrab.habitaciones.map(h => (h.id === a.hab ? { ...h, vanos: h.vanos.map(v => (v.id === a.id ? { ...v, offset: off } : v)) } : h));
    }
    planoRefrescar();
  } else if (planoArrastre) {
    const libre = planoMundo(e, false), orig = planoArrastre.orig, anc = anclaElemento(orig);
    let dx = libre.x - planoArrastre.w0.x, dz = libre.z - planoArrastre.w0.z;
    if (prefRejilla.visible) { dx = ajustarARejilla(anc.x + dx, prefRejilla.paso) - anc.x; dz = ajustarARejilla(anc.z + dz, prefRejilla.paso) - anc.z; }
    const movido = moverElemento(orig, dx, dz);
    if (sanearPlano({ elementos: [movido] }).elementos.length === 1) {             // nunca sacar un elemento del rango válido
      planoTrab.elementos = planoTrab.elementos.map(x => (x.id === planoArrastre.id ? movido : x));
    }
    planoRefrescar();
  } else if (planoArrastreHab) {                                         // F4b: mover el cuerpo o redimensionar desde una esquina
    const a = planoArrastreHab, orig = a.orig;
    let nueva = null;
    if (a.modo === 'mover') {
      const libre = planoMundo(e, false);
      let dx = libre.x - a.w0.x, dz = libre.z - a.w0.z;
      if (prefRejilla.visible) { dx = ajustarARejilla(orig.x + dx, prefRejilla.paso) - orig.x; dz = ajustarARejilla(orig.z + dz, prefRejilla.paso) - orig.z; }
      nueva = moverElemento(orig, dx, dz);
    } else {
      nueva = redimensionarDesdeEsquina(orig, a.esquina, p.x, p.z);    // p ya viene ajustada a la rejilla si está visible
    }
    if (nueva && sanearHabitaciones([nueva]).length === 1) {             // nunca sacarla del rango válido
      planoTrab.habitaciones = planoTrab.habitaciones.map(h => (h.id === a.id ? nueva : h));
    }
    planoRefrescar();
  } else if (planoInicio) {
    planoRender();
  } else if (planoHerr === 'puerta' || planoHerr === 'ventana') {        // F4c: fantasma del vano bajo el cursor
    const r = planoCalcularVano(planoHerr, planoMundo(e, false));
    planoVanoPrev = r.vano ? { hab: r.hab, vano: r.vano } : null;
    planoRender();
  }
}

function planoPointerUp(e) {
  if (planoPan) { planoPan = null; planoEl('plano-svg').classList.remove('panning'); }
  if (planoArrastre) { planoArrastre = null; planoRefrescar(); }
  if (planoArrastreHab) { planoArrastreHab = null; planoRefrescar(); }   // F4b
  if (planoArrastreVano) { planoArrastreVano = null; planoRefrescar(); } // F4c
  planoEl('plano-svg').releasePointerCapture?.(e.pointerId);
}

function planoWheel(e) {
  e.preventDefault();
  const d = planoDims();
  const factor = Math.max(0.5, Math.min(2, Math.exp(-e.deltaY * 0.0015)));
  const z = zoomEnPunto(planoVista, factor, e.clientX - d.left - d.w / 2, e.clientY - d.top - d.h / 2, planoEscala());
  const lim = v => Math.max(-PLANO_MAX_COORDENADA, Math.min(PLANO_MAX_COORDENADA, v));
  planoVista = { zoom: z.zoom, cx: lim(z.cx), cz: lim(z.cz) };
  planoRender();
}

function planoEncuadrar() { planoVista = { zoom: 1, cx: 0, cz: 0 }; planoRender(); }

// ── abrir / guardar / cerrar ──
function openPlanoEditor() {
  const ov = planoEl('plano-overlay');
  if (!ov || ov.classList.contains('open')) return;
  if (document.querySelector('[id$="-overlay"].open')) return;           // otro modal abierto: no se apila
  try { registrar('modal_abierto', { contexto: { modal: 'plano' } }); } catch (e) { }
  planoTrab = sanearPlano(planoGuardado || planoVacio());                // copia profunda; sin plano guardado → lote 10×10 vacío (C4)
  planoTrab.rejilla = { ...prefRejilla };
  planoBase0 = planoHuella(planoTrab);
  planoHerr = 'select'; planoSel = null; planoInicio = null; planoCursor = null;
  planoPan = null; planoArrastre = null; planoEspacio = false; planoConfirma = false;
  planoSelHab = null; planoArrastreHab = null; planoPlantillaPend = null;   // F4b
  planoSelVano = null; planoArrastreVano = null; planoVanoPrev = null; planoBorrarPend = null;   // F4c
  planoEl('plano-plantilla-conf').hidden = true;
  planoEl('plano-vano-conf').hidden = true;
  matAlAbrirEditor();                                                       // F4d: aviso (una vez por sesión) si hay paredes materializadas
  planoVista = { zoom: 1, cx: 0, cz: 0 };
  planoEl('plano-confirma').hidden = true;
  planoEl('plano-tip').hidden = true;
  planoEl('plano-cursor').textContent = '';
  ov.classList.add('open');
  planoSincronizarControles();
  planoRefrescar();
  ov.focus({ preventScroll: true });
}

function planoGuardarAhora() {
  if (planoSoloLectura() || !planoTrab) return;
  planoGuardado = planoSerial();
  planoBase0 = planoHuella(planoTrab);
  marcarSucio();
  planoActualizarUI();
}

function planoCerrarYa({ guardar = false } = {}) {
  if (guardar) planoGuardarAhora();
  // la rejilla es una preferencia de vista: se conserva en el plano ya guardado (si existe) aunque no haya cambios de dibujo
  if (!planoSoloLectura() && planoGuardado && JSON.stringify(planoGuardado.rejilla) !== JSON.stringify(prefRejilla)) {
    planoGuardado = { ...planoGuardado, rejilla: { ...prefRejilla } };
    marcarSucio();
  }
  try { registrar('modal_cerrado', { contexto: { modal: 'plano' } }); } catch (e) { }
  planoEl('plano-overlay').classList.remove('open');
  planoEl('plano-confirma').hidden = true;
  planoConfirma = false; planoInicio = null; planoPan = null; planoArrastre = null; planoEspacio = false; planoTrab = null;
  planoSelHab = null; planoArrastreHab = null; planoPlantillaPend = null;   // F4b
  planoSelVano = null; planoArrastreVano = null; planoVanoPrev = null; planoBorrarPend = null;   // F4c
  planoEl('plano-plantilla-conf').hidden = true;
  planoEl('plano-vano-conf').hidden = true;
  matAlCerrarEditor();                                                      // F4d
  planoPanelActualizar();                                                   // oculta el panel (planoTrab ya es null)
  planoEl('btnPlano')?.focus({ preventScroll: true });
}

function closePlanoEditor() {
  if (!planoAbierto()) return;
  if (planoHayCambios() && !planoSoloLectura()) {                        // C5: con cambios sin guardar se pide confirmación
    planoConfirma = true;
    planoEl('plano-confirma').hidden = false;
    planoEl('plano-conf-guardar').focus({ preventScroll: true });
    return;
  }
  planoCerrarYa();
}

function planoConfirmaSeguir() {
  planoConfirma = false;
  planoEl('plano-confirma').hidden = true;
  planoEl('plano-overlay').focus({ preventScroll: true });
}

function planoAlCambiarLote() {
  const a = Number(planoEl('plano-lote-ancho').value), l = Number(planoEl('plano-lote-largo').value);
  const ok = v => Number.isFinite(v) && v >= PLANO_LOTE_MIN && v <= PLANO_LOTE_MAX;
  if (ok(a) && ok(l) && planoEl('plano-lote-ancho').value.trim() !== '' && planoEl('plano-lote-largo').value.trim() !== '') {
    planoTrab.lote = sanearPlano({ lote: { ancho: a, largo: l } }).lote;
    planoVista = { zoom: 1, cx: 0, cz: 0 };
  } else {
    planoMostrarTip(`El lote debe medir entre ${PLANO_LOTE_MIN} y ${PLANO_LOTE_MAX} m por lado.`);
  }
  planoSincronizarControles();
  planoRefrescar();
}

// ── teclado ──
// COMPUERTA: se registra al evaluar el módulo (antes de init()), en captura y solo para keydown. Con el editor cerrado
// no hace nada (R sigue rotando en 3D). Con el editor abierto ninguna tecla llega al 3D ni a F2.2/F2.4c/F2.4d; keyup no se toca.
function planoCompuerta(e) {
  if (!planoAbierto()) return;
  e.stopImmediatePropagation();
  planoTecla(e);
}
function planoTecla(e) {
  if (matPend) { if (e.code === 'Escape' && !e.repeat) matResolver(false); return; }   // F4d: diálogo de materializar / desmaterializar
  if (planoBorrarPend) { if (e.code === 'Escape' && !e.repeat) planoBorrarResolver(false); return; }   // F4c: diálogo de borrar habitación con vanos
  if (planoPlantillaPend) { if (e.code === 'Escape' && !e.repeat) planoPlantillaResolver(null); return; }   // F4b: diálogo de plantilla
  if (planoConfirma) { if (e.code === 'Escape' && !e.repeat) planoConfirmaSeguir(); return; }
  if (planoEscribiendo(e.target)) {
    if (e.code === 'Enter' || e.code === 'Escape') { e.target.blur(); e.preventDefault(); }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.code) {
    case 'KeyV': e.preventDefault(); planoElegirHerramienta('select'); break;
    case 'KeyP': e.preventDefault(); planoElegirHerramienta('punto'); break;
    case 'KeyL': e.preventDefault(); planoElegirHerramienta('linea'); break;
    case 'KeyB': e.preventDefault(); planoElegirHerramienta('rectangulo'); break;
    case 'KeyH': e.preventDefault(); planoElegirHerramienta('habitacion'); break;     // F4b
    case 'KeyD': e.preventDefault(); planoElegirHerramienta('puerta'); break;         // F4c
    case 'KeyN': e.preventDefault(); planoElegirHerramienta('ventana'); break;        // F4c
    case 'KeyR': planoMostrarTip('R rota en 3D. Para rectángulo usa B'); break;   // R queda reservada a la rotación 3D
    case 'Delete': case 'Backspace': e.preventDefault(); planoBorrarSeleccion(); break;
    case 'Space': e.preventDefault(); planoEspacio = true; break;
    case 'Escape':
      if (e.repeat) break;
      if (planoInicio) { planoInicio = null; planoRefrescar(); }
      else if (planoHerr === 'puerta' || planoHerr === 'ventana') planoElegirHerramienta('select');   // F4c (D4): vuelve a V conservando la selección; el 2.º Esc cierra
      else closePlanoEditor();
      break;
    default: break;
  }
}
window.addEventListener('keydown', planoCompuerta, true);
window.addEventListener('keyup', e => { if (e.code === 'Space') planoEspacio = false; });
window.addEventListener('blur', () => { planoEspacio = false; });

function configurarPlano() {
  const svg = planoEl('plano-svg');
  if (!svg) return;
  svg.addEventListener('pointerdown', planoPointerDown);
  svg.addEventListener('pointermove', planoPointerMove);
  svg.addEventListener('pointerup', planoPointerUp);
  svg.addEventListener('pointercancel', planoPointerUp);
  svg.addEventListener('wheel', planoWheel, { passive: false });
  svg.addEventListener('contextmenu', e => e.preventDefault());
  svg.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
  document.querySelectorAll('#plano-overlay [data-herr]').forEach(b => b.addEventListener('click', () => planoElegirHerramienta(b.dataset.herr)));
  planoEl('plano-borrar').addEventListener('click', planoBorrarSeleccion);
  planoEl('plano-guardar').addEventListener('click', planoGuardarAhora);
  planoEl('plano-cerrar').addEventListener('click', closePlanoEditor);
  planoEl('plano-encuadrar').addEventListener('click', planoEncuadrar);
  planoEl('plano-conf-guardar').addEventListener('click', () => planoCerrarYa({ guardar: true }));
  planoEl('plano-conf-descartar').addEventListener('click', () => planoCerrarYa());
  planoEl('plano-conf-seguir').addEventListener('click', planoConfirmaSeguir);
  planoEl('plano-rejilla-visible').addEventListener('change', e => {
    prefRejilla = { ...prefRejilla, visible: e.target.checked };
    planoSincronizarControles(); planoRender();
  });
  planoEl('plano-rejilla-paso').addEventListener('change', e => {
    const paso = Number(e.target.value);
    prefRejilla = { ...prefRejilla, paso: PLANO_PASOS_REJILLA.includes(paso) ? paso : PLANO_PASO_DEFECTO };
    planoSincronizarControles(); planoRender();
  });
  planoEl('plano-lote-ancho').addEventListener('change', planoAlCambiarLote);
  planoEl('plano-lote-largo').addEventListener('change', planoAlCambiarLote);
  // F4b: panel de la habitación, plantillas y su diálogo (el botón «Habitación» ya queda enlazado por [data-herr])
  for (const k of ['nombre', 'ancho', 'largo']) planoEl(`plano-hab-${k}`).addEventListener('change', () => planoHabEditar(k));
  planoEl('plano-hab-borrar').addEventListener('click', planoBorrarSeleccion);
  planoEl('plano-plantilla').addEventListener('change', e => planoPlantillaElegida(e.target.value));
  planoEl('plano-plantilla-reemplazar').addEventListener('click', () => planoPlantillaResolver('reemplazar'));
  planoEl('plano-plantilla-anadir').addEventListener('click', () => planoPlantillaResolver('anadir'));
  planoEl('plano-plantilla-cancelar').addEventListener('click', () => planoPlantillaResolver(null));
  // F4c: panel del vano y diálogo de borrar una habitación con vanos (los botones Puerta / Ventana ya quedan enlazados por [data-herr])
  for (const k of ['tipo', 'ancho', 'alto', 'offset', 'lado']) planoEl(`plano-vano-${k}`).addEventListener('change', () => planoVanoEditar(k));
  planoEl('plano-vano-borrar').addEventListener('click', planoBorrarSeleccion);
  planoEl('plano-vano-conf-borrar').addEventListener('click', () => planoBorrarResolver(true));
  planoEl('plano-vano-conf-cancelar').addEventListener('click', () => planoBorrarResolver(false));
  if (window.ResizeObserver) new ResizeObserver(() => planoRender()).observe(planoEl('plano-lienzo'));
  const nota = document.createElement('span');
  nota.id = 'plano-rejilla-nota'; nota.hidden = true; nota.className = 'plano-etq';
  nota.textContent = 'Rejilla demasiado densa para dibujarla (el imán sigue activo): acerca el zoom.';
  planoEl('plano-pie').insertBefore(nota, planoEl('plano-cursor'));
  configurarMaterializacion();                                              // F4d
}

// ── F4d · MATERIALIZACIÓN DEL PLANO EN 3D ───────────────────────────────────
// El botón «Materializar plano» del editor convierte las habitaciones (y sus vanos) en paredes 3D con huecos reales, SIN CSG: cada pared
// es un conjunto de cajas sólidas alrededor de los huecos (generarParedConHuecos, calculos.js) fundidas en UNA malla por pared
// (Mesh.MergeMeshes). Todas cuelgan de UN objeto agregado «paredes_plano» en objList. Los datos viven solo en progreso.plano.materializado
// (snapshot compacto, aditivo; guardado.js no se toca: serializarObjeto no guarda userData, así que el objeto agregado NO va en
// estado.objetos y se regenera desde el snapshot al cargar). El objeto agregado:
//   · no cuenta para Programar (countWalls y validateHouse solo miran wall_*) y no es una pieza del catálogo;
//   · no colisiona con las piezas ni es apoyo (no está en COLLISION_TYPES / TIPOS_APOYO_AVISO / TIPOS_SOPORTE_NACIMIENTO);
//   · SÍ bloquea la cámara (TIPOS_SOLIDOS_CAMARA); Rayos X la deja pasar;
//   · no se selecciona, mueve, gira, clona ni borra pieza a pieza (selectObject lo ignora): se gestiona desde el editor (Materializar /
//     Desmaterializar). Sus mallas no son «pickables»: un clic sobre una pared generada atraviesa hasta lo que haya detrás.
const PARED_PLANO_TIPO = 'paredes_plano';
const PARED_PLANO_ETIQUETA = 'Paredes del plano';
const PARED_PLANO_EMOJI = '🧱';
const PARED_PLANO_COLOR = '#B0B0B0';                                  // P4: gris claro neutro (materiales realistas: F12)
const MAT_LIMITE_BYTES = 90 * 1024;                                    // P5: el servidor rechaza cuerpos de más de 100 KB (express.json()); se rechaza antes de llegar
const MAT_OPCIONES = Object.freeze({ altura: PARED_ALTURA_DEFECTO, grosor: PARED_GROSOR_DEFECTO, alfeizar: PARED_ALFEIZAR_DEFECTO });   // P3: sin interfaz en F4d
const MAT_TEXTO_REMAT = 'Ya hay paredes materializadas. ¿Rematerializar? (se borrarán las generadas)';
const MAT_NOTA_REMAT = 'Si rematerializas, las paredes generadas se regenerarán. Las piezas 3D manuales no se tocan, pero las que estén dentro de paredes generadas pueden quedar flotando.';
let matSnapshot = null;                                                // snapshot compacto de lo materializado (es lo que se guarda) o null
let matObjeto = null;                                                  // entrada de objList del objeto agregado, o null
let matResumen = null;                                                 // { paredes, rectangulos, vanos, recortados, sinHueco } de lo generado
let matPend = null;                                                    // 'remat' | 'desmat' mientras el diálogo de confirmación está abierto
let matAvisoVisto = false;                                             // el aviso de edición se muestra una sola vez por sesión (no se guarda)
let matUltimaMs = null;                                                // duración de la última construcción de mallas 3D (medida para las pruebas)
let matUltimaTotalMs = null;                                           // duración total del último «Materializar» (paredes + tamaño + mallas + guardado local), en ms

function matMaterial() {
  if (!MAT.paredesPlano) {
    const m = new PBRMaterial('paredes_plano', scene);
    m.albedoColor = Color3.FromHexString(PARED_PLANO_COLOR);
    m.roughness = 0.85; m.metallic = 0;
    MAT.paredesPlano = m;
  }
  return MAT.paredesPlano;
}

// Construye el objeto agregado (sin añadirlo a objList). Una malla fundida por pared; si algo falla se libera todo lo creado y se relanza.
function matConstruirObjeto(paredes) {
  const id = objIdCounter++;
  const root = new TransformNode('obj_' + id + '_' + PARED_PLANO_TIPO, scene);
  root.userData = { id, type: PARED_PLANO_TIPO, label: PARED_PLANO_ETIQUETA, emoji: PARED_PLANO_EMOJI };
  const material = matMaterial();
  try {
    for (const p of paredes) {
      const horizontal = p.orientacion === 'h';
      const cajas = generarParedConHuecos(p).map((r, j) => {
        const caja = MeshBuilder.CreateBox(`pared_plano_${p.id}_caja_${j}`, {
          width: horizontal ? r.u1 - r.u0 : p.grosor, height: r.y1 - r.y0, depth: horizontal ? p.grosor : r.u1 - r.u0,
        }, scene);
        caja.position.set(horizontal ? p.x1 + (r.u0 + r.u1) / 2 : p.x1, (r.y0 + r.y1) / 2, horizontal ? p.z1 : p.z1 + (r.u0 + r.u1) / 2);
        return caja;
      });
      if (!cajas.length) continue;
      const malla = cajas.length === 1 ? cajas[0] : Mesh.MergeMeshes(cajas, true, true);   // true, true: libera las cajas; índices de 32 bits
      if (!malla) throw new Error('MergeMeshes no devolvió ninguna malla');
      malla.name = `pared_plano_${p.id.slice(1)}`;                       // p3 → pared_plano_3
      malla.metadata = { paredPlano: p.id, habitaciones: p.habitaciones.slice() };
      malla.parent = root;
      malla.material = material;
      malla.isPickable = false;                                          // un clic sobre la pared atraviesa hasta lo que haya detrás
      malla.receiveShadows = true;
      malla.checkCollisions = true;                                      // cámara (sincronizarColisionesCamara lo mantiene)
      if (shadowGen) shadowGen.addShadowCaster(malla, false);
    }
  } catch (err) {
    root.getChildMeshes().forEach(m => { try { if (shadowGen) shadowGen.removeShadowCaster(m); } catch (_) { } m.dispose(); });
    root.dispose();
    throw err;
  }
  return { id, type: PARED_PLANO_TIPO, label: PARED_PLANO_ETIQUETA, emoji: PARED_PLANO_EMOJI, node: root };
}

function matBorrarObjeto() {
  if (!matObjeto) return;
  const o = matObjeto;
  o.node.getChildMeshes().forEach(m => { try { if (shadowGen) shadowGen.removeShadowCaster(m); } catch (_) { } m.dispose(); });
  o.node.dispose();
  objList = objList.filter(x => x !== o);
  matObjeto = null; matResumen = null;
}

// Mantiene planoGuardado alineado con matSnapshot (la copia que se guarda se construye siempre desde matSnapshot, pero así lo que ve el editor al abrir coincide).
function matSincronizarGuardado() {
  if (!planoGuardado) return;
  const { materializado, ...resto } = planoGuardado;
  planoGuardado = matSnapshot ? { ...resto, materializado: matSnapshot } : resto;
}

// Tamaño (bytes) del cuerpo del PUT que se enviaría con ese plano y ese snapshot: {proyecto_id, slot, estado, progreso}; el progreso viaja dos veces.
function matBytesGuardado(plano, mat) {
  const snap = snapshotActual({ plano, mat });
  return new TextEncoder().encode(JSON.stringify({ proyecto_id: 2147483647, slot: 1, estado: snap.estado, progreso: snap.progreso })).length;
}

// Carga: regenera las paredes desde el snapshot guardado. Una casa sin el campo no genera nada. Si el 3D falla se conserva el snapshot (no se pierde al guardar).
function matRestaurar(entrada) {
  const limpio = sanearMaterializado(entrada);
  if (!limpio) return;
  matSnapshot = limpio;
  try {
    const { habitaciones, opciones } = expandirMaterializado(limpio);
    const paredes = generarParedes3D(habitaciones, opciones);
    const t0 = performance.now();
    matObjeto = matConstruirObjeto(paredes);
    matUltimaMs = performance.now() - t0;
    matResumen = resumirMaterializacion(habitaciones, paredes);
    objList.push(matObjeto);
    updateObjListUI();
    aplicarTexturasExistentes();                                          // Presentación 20-nov · Bloque A
  } catch (err) {
    matObjeto = null; matResumen = null;
    console.warn('No se pudieron regenerar las paredes del plano:', err);
  }
}

const matTextoResumen = r => `${r.paredes} ${r.paredes === 1 ? 'pared generada' : 'paredes generadas'}, ${r.vanos} ${r.vanos === 1 ? 'vano' : 'vanos'}`;

function matActualizarUI() {
  const b = planoEl('plano-materializar');
  if (!b) return;
  const lectura = planoSoloLectura();
  b.disabled = lectura;
  planoEl('plano-desmaterializar').disabled = lectura || !matObjeto;
  const est = planoEl('plano-mat-estado');
  est.textContent = matObjeto && matResumen ? matTextoResumen(matResumen) + matExtras(matResumen) : '';
  cubiertaActualizarUI();                                                 // Presentación 20-nov · Bloque B
  replanteoActualizarUI();                                                // F5
  cimActualizarUI();                                                      // F6a
}

function matExtras(r) {
  const x = [];
  if (r.recortados) x.push(`${r.recortados} ${r.recortados === 1 ? 'vano recortado' : 'vanos recortados'} por la pared`);
  if (r.sinHueco) x.push(`${r.sinHueco} ${r.sinHueco === 1 ? 'vano fuera de las paredes (sin hueco)' : 'vanos fuera de las paredes (sin hueco)'}`);
  return x.length ? ' · ' + x.join(' · ') : '';
}

function matAlAbrirEditor() {
  matPend = null;
  planoEl('plano-mat-conf').hidden = true;
  const mostrar = !!matObjeto && !matAvisoVisto && !planoSoloLectura();
  planoEl('plano-mat-aviso').hidden = !mostrar;
  if (mostrar) matAvisoVisto = true;
}

function matAlCerrarEditor() {
  matPend = null;
  planoEl('plano-mat-conf').hidden = true;
  planoEl('plano-mat-aviso').hidden = true;
}

function matPedir(modo) {
  matPend = modo;
  const rem = modo === 'remat';
  planoEl('plano-mat-conf-txt').textContent = rem ? MAT_TEXTO_REMAT : `Se borrarán ${matResumen ? matResumen.paredes : 0} paredes generadas. Las piezas manuales no se tocan.`;
  const nota = planoEl('plano-mat-conf-nota');
  nota.textContent = rem ? MAT_NOTA_REMAT : '';
  nota.hidden = !rem;
  planoEl('plano-mat-conf-ok').textContent = rem ? 'Rematerializar' : 'Desmaterializar';
  planoEl('plano-mat-conf').hidden = false;
  planoEl('plano-mat-conf-cancelar').focus({ preventScroll: true });
}

function matResolver(confirmar) {
  const modo = matPend;
  matPend = null;
  planoEl('plano-mat-conf').hidden = true;
  planoEl('plano-overlay').focus({ preventScroll: true });
  if (!confirmar || !planoTrab) return;
  if (modo === 'remat') matEjecutar();
  else if (modo === 'desmat') matDesmaterializar();
}

function materializarPlano() {
  if (planoSoloLectura() || !planoTrab || matPend) return;
  let habs;
  try { habs = sanearHabitaciones(planoTrab.habitaciones); } catch (_) { habs = []; }
  if (!habs.length) { planoMostrarTip('El plano no tiene habitaciones: dibuja al menos una para materializarlo. No se generó ninguna pared.'); return; }
  if (matObjeto) { matPedir('remat'); return; }
  matEjecutar();
}

function matEjecutar() {
  let nuevo = null;
  const tIni = performance.now();
  try {
    const habs = sanearHabitaciones(planoTrab.habitaciones);
    if (!habs.length) { planoMostrarTip('El plano no tiene habitaciones: dibuja al menos una para materializarlo. No se generó ninguna pared.'); return; }
    const paredes = generarParedes3D(habs, MAT_OPCIONES);
    const resumen = resumirMaterializacion(habs, paredes);
    const mat = compactarMaterializado(habs, MAT_OPCIONES);
    const bytes = matBytesGuardado(sanearPlano({ ...planoTrab, rejilla: prefRejilla, materializado: mat }), mat);
    if (bytes > MAT_LIMITE_BYTES) {
      planoMostrarTip(`El plano con paredes ocuparía ${(bytes / 1024).toFixed(1)} KB al guardarse y el límite es ${MAT_LIMITE_BYTES / 1024} KB: no se materializó. Reduce habitaciones o vanos.`);
      return;
    }
    const t0 = performance.now();
    nuevo = matConstruirObjeto(paredes);                                // si falla, lo anterior queda como estaba
    matUltimaMs = performance.now() - t0;
    matBorrarObjeto();
    matObjeto = nuevo; nuevo = null;
    matSnapshot = mat; matResumen = resumen;
    objList.push(matObjeto);
    planoGuardarAhora();                                                // el plano y su materialización se guardan juntos (coherentes)
    updateObjListUI();
    matActualizarUI();
    matUltimaTotalMs = performance.now() - tIni;
    aplicarTexturasExistentes();                                        // Presentación 20-nov · Bloque A (fuera de la medición de F4d)
    extrasPlanoAlMaterializar(habs);                                    // Presentación 20-nov: cubierta (si había) y pisos se ajustan a las paredes nuevas
    const avisos = [];
    if (resumen.rectangulos > PARED_RECT_AVISO) avisos.push(`Hay ${resumen.rectangulos} rectángulos de pared: el 3D puede ir más lento.`);
    planoMostrarTip(matTextoResumen(resumen) + matExtras(resumen) + (avisos.length ? ' · ' + avisos.join(' ') : ''));
  } catch (err) {
    console.warn('No se pudo materializar el plano:', err);
    if (nuevo) { nuevo.node.getChildMeshes().forEach(m => { try { if (shadowGen) shadowGen.removeShadowCaster(m); } catch (_) { } m.dispose(); }); nuevo.node.dispose(); }
    planoMostrarTip('No se pudo materializar el plano. No se generó ninguna pared.');
  }
}

function desmaterializarPlano() {
  if (planoSoloLectura() || !planoTrab || matPend) return;
  if (!matObjeto) { planoMostrarTip('No hay paredes materializadas.'); return; }
  matPedir('desmat');
}

function matDesmaterializar() {
  matBorrarObjeto();
  matSnapshot = null;
  extrasPlanoAlDesmaterializar();                                          // Presentación 20-nov: sin paredes no hay cubierta ni pisos
  matSincronizarGuardado();
  marcarSucio();
  updateObjListUI();
  matActualizarUI();
  planoMostrarTip('Paredes generadas borradas. Las piezas manuales no se tocaron.');
}

function configurarMaterializacion() {
  planoEl('plano-materializar').addEventListener('click', materializarPlano);
  planoEl('plano-desmaterializar').addEventListener('click', desmaterializarPlano);
  planoEl('plano-cubierta').addEventListener('click', cubiertaPulsada);          // Presentación 20-nov · Bloque B
  planoEl('plano-mat-conf-ok').addEventListener('click', () => matResolver(true));
  planoEl('plano-mat-conf-cancelar').addEventListener('click', () => matResolver(false));
  planoEl('plano-mat-aviso-cerrar').addEventListener('click', () => { planoEl('plano-mat-aviso').hidden = true; });
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN 20-NOV · Bloque A · Texturas procedurales
// Ladrillo en las paredes materializadas (F4d) y tierra en el suelo (F3). Solo cambia el aspecto: las texturas no se guardan
// (se regeneran al cargar) y no se tocan geometría, colisiones ni datos. Si algo falla, queda el material liso de antes.
// ══════════════════════════════════════════════════════════════════════════════
const TEX_METROS_PARED = 2;                                            // el ladrillo mide lo mismo en cualquier pared (2 m por repetición de la textura)
const TEX_METROS_SUELO = 3;
let texLadrillo = null, texTierra = null;

function aplicarTexturasExistentes() {
  try {
    if (!scene) return;
    if (matObjeto) {                                                   // paredes del plano → ladrillo
      texLadrillo = texLadrillo || crearTexturaLadrillo(scene);
      matObjeto.node.getChildMeshes().forEach(m => aplicarTextura(m, texLadrillo, { metrosPorTile: TEX_METROS_PARED }));
    }
    if (MAT.ground) {                                                  // suelo (el original y los segmentos de la excavación F3) → tierra
      if (!texTierra) { texTierra = crearTexturaTierra(scene); MAT.ground.albedoColor = new Color3(1, 1, 1); }
      scene.meshes.filter(m => m.name === 'ground' || m.name.startsWith('ground_seg_'))
        .forEach(m => aplicarTextura(m, texTierra, { metrosPorTile: TEX_METROS_SUELO }));
    }
  } catch (err) {
    console.warn('No se pudieron aplicar las texturas:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN 20-NOV · Bloque B · Cubierta a dos aguas
// Botón «Añadir cubierta» del editor del plano: techo de dos faldones (pendiente 27 %, A.9) sobre las habitaciones materializadas.
// Es una superposición fuera de objList (no se selecciona, no colisiona, no entra en Programar ni en el panel de piezas); sus datos
// viven en progreso.plano.cubierta (aditivo: la clave solo existe si hay cubierta) y se regenera al cargar la casa.
// ══════════════════════════════════════════════════════════════════════════════
let cubiertaDatos = null;                                              // { bbox: {minX, maxX, minZ, maxZ} } (lo que se guarda) o null
let cubiertaObjeto = null;                                             // objeto agregado de cubierta_lite.js o null
let texTecho = null;

function cubiertaBorrar() {
  if (!cubiertaObjeto) return;
  const o = cubiertaObjeto;
  cubiertaObjeto = null;
  o.meshes.forEach(m => { try { if (shadowGen) shadowGen.removeShadowCaster(m); } catch (_) { } m.dispose(); });
  o.nodo.dispose();
}

// (Re)construye la cubierta desde cubiertaDatos. Si falla, no queda nada a medias.
function cubiertaConstruir() {
  cubiertaBorrar();
  if (!cubiertaDatos || !scene) return;
  texTecho = texTecho || crearTexturaTecho(scene);
  texLadrillo = texLadrillo || crearTexturaLadrillo(scene);
  const altura = matSnapshot && Number.isFinite(matSnapshot.altura) ? matSnapshot.altura : PARED_ALTURA_DEFECTO;
  cubiertaObjeto = crearCubierta(scene, cubiertaDatos.bbox, texTecho, { texturaFronton: texLadrillo, alturaPared: altura });
  cubiertaObjeto.meshes.forEach(m => { if (shadowGen) shadowGen.addShadowCaster(m, false); });
}

function cubiertaActualizarUI() {
  const b = planoEl('plano-cubierta');
  if (!b) return;
  b.disabled = planoSoloLectura();
  b.textContent = cubiertaObjeto ? '🏠 Quitar cubierta' : '🏠 Añadir cubierta';
}

function cubiertaPulsada() {
  if (planoSoloLectura() || !planoTrab || matPend) return;
  if (cubiertaObjeto) {                                                // segunda pulsación: la quita
    cubiertaBorrar(); cubiertaDatos = null;
    marcarSucio(); cubiertaActualizarUI();
    planoMostrarTip('Cubierta quitada.');
    return;
  }
  let bbox = null;
  try { if (matObjeto && matSnapshot) bbox = calcularBoundingBoxHabitaciones(expandirMaterializado(matSnapshot).habitaciones); } catch (_) { bbox = null; }
  if (!bbox) { planoMostrarTip('No hay habitaciones. Materializa primero.'); return; }
  cubiertaDatos = { bbox };
  try {
    cubiertaConstruir();
  } catch (err) {
    console.warn('No se pudo crear la cubierta:', err);
    cubiertaBorrar(); cubiertaDatos = null;
    planoMostrarTip('No se pudo crear la cubierta.');
    return;
  }
  marcarSucio(); cubiertaActualizarUI();
  planoMostrarTip(`Cubierta a dos aguas: pendiente ${Math.round(cubiertaObjeto.pendiente * 100)} % (A.9), cumbrera a ${cubiertaObjeto.alturaCumbrera.toFixed(2)} m.`);
}

// Valida lo guardado en progreso.plano.cubierta: devuelve { bbox } o null (nunca lanza).
function cubiertaSanear(entrada) {
  try {
    const b = entrada && entrada.bbox;
    if (!b || ![b.minX, b.maxX, b.minZ, b.maxZ].every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100)) return null;
    if (!(b.maxX > b.minX) || !(b.maxZ > b.minZ)) return null;
    return { bbox: { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ } };
  } catch (_) { return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN 20-NOV · Bloque D · Pisos por habitación
// Al materializar, cada habitación recibe un piso (plano a 1 cm sobre el suelo) con la textura que le toca por su nombre:
// baño/cocina → cerámica · sala/comedor/dormitorio/habitación → madera · otro → concreto. Superposición fuera de objList (sin
// selección, sin colisión). No se guarda aparte: se regenera de lo materializado + los nombres del plano (sanearPlano no conoce claves nuevas).
// ══════════════════════════════════════════════════════════════════════════════
const PISO_Y = 0.01;
const PISO_METROS = { madera: 2, ceramica: 3, concreto: 4 };            // metros del mundo por repetición de la textura (cerámica de 0.375 m, tablón de 0.25 m)
let pisosObjeto = null;                                                // { nodo, meshes, tipos } o null
let texPiso = {};                                                      // texturas creadas (se reutilizan)
let matPiso = {};                                                      // materiales por tipo de piso

function pisosBorrar() {
  if (!pisosObjeto) return;
  const o = pisosObjeto;
  pisosObjeto = null;
  o.meshes.forEach(m => m.dispose());
  o.nodo.dispose();
}

function pisoMaterial(tipo) {
  if (!matPiso[tipo]) {
    const fabrica = { madera: crearTexturaMadera, ceramica: crearTexturaCeramica, concreto: crearTexturaConcreto }[tipo];
    texPiso[tipo] = texPiso[tipo] || fabrica(scene);
    const m = new PBRMaterial('piso_' + tipo, scene);
    m.albedoColor = new Color3(1, 1, 1);
    m.roughness = tipo === 'ceramica' ? 0.3 : tipo === 'madera' ? 0.6 : 0.92; m.metallic = 0;
    m.albedoTexture = texPiso[tipo];
    matPiso[tipo] = m;
  }
  return matPiso[tipo];
}

// habitaciones: [{ id, x, z, ancho, largo, nombre }]. Reemplaza los pisos que hubiera. Si algo falla no queda nada a medias.
function pisosConstruir(habitaciones) {
  pisosBorrar();
  if (!scene || !Array.isArray(habitaciones) || !habitaciones.length) return;
  const nodo = new TransformNode('pisos_plano', scene);
  nodo.metadata = { generadoPorPlano: true, tipo: 'piso' };
  nodo.userData = { generadoPorPlano: true, tipo: 'piso' };
  const meshes = [], tipos = {};
  try {
    for (const h of habitaciones) {
      const tipo = texturaPisoPorNombre(h.nombre);
      const m = MeshBuilder.CreateGround(`piso_hab_${h.id}`, { width: h.ancho, height: h.largo, subdivisions: 1 }, scene);
      m.parent = nodo;
      m.position.set(h.x + h.ancho / 2, PISO_Y, h.z + h.largo / 2);
      m.material = pisoMaterial(tipo);
      m.isPickable = false; m.checkCollisions = false; m.receiveShadows = true;
      m.metadata = { generadoPorPlano: true, tipo: 'piso', habitacion: h.id, textura: tipo };
      m.computeWorldMatrix(true);
      proyectarUVMundo(m, PISO_METROS[tipo]);
      meshes.push(m);
      tipos[h.id] = tipo;
    }
  } catch (err) {
    meshes.forEach(m => m.dispose());
    nodo.dispose();
    throw err;
  }
  pisosObjeto = { nodo, meshes, tipos };
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN 20-NOV · Bloque C · Puertas y ventanas en 3D (opcional)
// Marco de 4 barras en cada hueco de F4d; la puerta lleva una hoja de 4 cm y la ventana un vidrio azul claro semitransparente.
// Se posicionan con los mismos huecos que ya cortaron las paredes (generarParedes3D: lado, offset, ancho y alto del vano). Superposición
// fuera de objList (sin selección, sin colisión), fundida en 3 mallas (marcos, hojas, vidrios); se regenera como los pisos.
// ══════════════════════════════════════════════════════════════════════════════
const VANO3D_BARRA = 0.06;                                             // m, ancho de cada barra del marco
const VANO3D_HOJA = 0.04;                                              // m, grosor de la hoja de la puerta
let vanos3DObjeto = null;                                              // { nodo, meshes, total } o null
let matVano3D = null;

function vanos3DBorrar() {
  if (!vanos3DObjeto) return;
  const o = vanos3DObjeto;
  vanos3DObjeto = null;
  o.meshes.forEach(m => m.dispose());
  o.nodo.dispose();
}

function vano3DMateriales() {
  if (!matVano3D) {
    const pbr = (nombre, color, rough, metal = 0) => {
      const m = new PBRMaterial(nombre, scene);
      m.albedoColor = new Color3(...color); m.roughness = rough; m.metallic = metal; return m;
    };
    const vidrio = pbr('vano_vidrio', [0.62, 0.82, 0.97], 0.08);
    vidrio.alpha = 0.3; vidrio.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND; vidrio.backFaceCulling = false;
    matVano3D = { marco: pbr('vano_marco', [0.42, 0.26, 0.12], 0.65), hoja: pbr('vano_hoja', [0.33, 0.19, 0.08], 0.6), vidrio };
  }
  return matVano3D;
}

// paredes: lo que devuelve generarParedes3D (cada pared con sus huecos). Reemplaza lo que hubiera.
function crearPuertasVentanas3D(paredes) {
  vanos3DBorrar();
  if (!scene || !Array.isArray(paredes)) return;
  const grupos = { marco: [], hoja: [], vidrio: [] };
  const vistos = new Set();
  let total = 0, n = 0;
  try {
    for (const p of paredes) {
      const horizontal = p.orientacion === 'h';
      const d = p.grosor + 0.02;                                       // el marco sobresale 1 cm por cada cara de la pared
      for (const h of p.huecos || []) {
        const clave = [p.id, h.tipo, h.u0, h.u1, h.y0, h.y1].join('|');
        if (vistos.has(clave)) continue;                               // la misma pared compartida puede traer el vano repetido
        vistos.add(clave);
        const ancho = h.u1 - h.u0, alto = h.y1 - h.y0;
        if (!(ancho > 2 * VANO3D_BARRA + 0.02) || !(alto > 2 * VANO3D_BARRA)) continue;   // hueco demasiado pequeño para llevar marco
        const uc = (h.u0 + h.u1) / 2, b = VANO3D_BARRA;
        const caja = (grupo, a, y, h2, u, prof) => {                   // a: largo a lo largo de la pared; prof: grosor atravesando la pared
          const m = MeshBuilder.CreateBox(`vano3d_${n++}`, { width: horizontal ? a : prof, height: h2, depth: horizontal ? prof : a }, scene);
          m.position.set(horizontal ? p.x1 + u : p.x1, y, horizontal ? p.z1 : p.z1 + u);
          grupos[grupo].push(m);
        };
        const umbral = h.tipo === 'puerta' ? 0.03 : b;                 // la puerta lleva un umbral bajo en vez de una barra inferior alta
        caja('marco', b, h.y0 + alto / 2, alto, uc - ancho / 2 + b / 2, d);        // jamba izquierda
        caja('marco', b, h.y0 + alto / 2, alto, uc + ancho / 2 - b / 2, d);        // jamba derecha
        caja('marco', ancho - 2 * b, h.y1 - b / 2, b, uc, d);                       // dintel
        caja('marco', ancho - 2 * b, h.y0 + umbral / 2, umbral, uc, d);             // umbral / antepecho
        if (h.tipo === 'puerta') caja('hoja', ancho - 2 * b, h.y0 + umbral + (alto - umbral - b) / 2, alto - umbral - b, uc, VANO3D_HOJA);
        else caja('vidrio', ancho - 2 * b, h.y0 + umbral + (alto - umbral - b) / 2, alto - umbral - b, uc, 0.01);
        total++;
      }
    }
    const nodo = new TransformNode('vanos_plano', scene);
    nodo.metadata = { generadoPorPlano: true, tipo: 'vanos' };
    nodo.userData = { generadoPorPlano: true, tipo: 'vanos' };
    const mats = vano3DMateriales(), meshes = [];
    try {
      for (const g of ['marco', 'hoja', 'vidrio']) {
        if (!grupos[g].length) continue;
        const caja0 = grupos[g];
        const m = caja0.length === 1 ? caja0[0] : Mesh.MergeMeshes(caja0, true, true);
        if (!m) throw new Error('MergeMeshes no devolvió ninguna malla');
        grupos[g] = [];
        m.name = 'vanos_3d_' + g;
        m.parent = nodo; m.material = mats[g];
        m.isPickable = false; m.checkCollisions = false; m.receiveShadows = true;
        m.metadata = { generadoPorPlano: true, tipo: 'vanos', grupo: g };
        meshes.push(m);
      }
    } catch (err) {
      meshes.forEach(m => m.dispose()); nodo.dispose(); throw err;
    }
    vanos3DObjeto = { nodo, meshes, total };
  } catch (err) {
    Object.values(grupos).flat().forEach(m => { try { m.dispose(); } catch (_) { } });
    throw err;
  }
}

function extrasPlanoLimpiar() {
  cubiertaBorrar(); cubiertaDatos = null;
  pisosBorrar();
  vanos3DBorrar();
}

// Carga: regenera lo que el alumno añadió encima de las paredes. Sin paredes materializadas no se genera nada.
function restaurarExtrasPlano(planoCrudo) {
  try {
    extrasPlanoLimpiar();
    if (!matObjeto || !matSnapshot || !planoCrudo) return;
    const c = cubiertaSanear(planoCrudo.cubierta);
    if (c) { cubiertaDatos = c; cubiertaConstruir(); }
  } catch (err) {
    cubiertaBorrar(); cubiertaDatos = null;
    console.warn('No se pudo regenerar la cubierta:', err);
  }
  try {                                                                // pisos: se derivan de lo materializado y de los nombres del plano (no se guardan aparte)
    if (!matObjeto || !matSnapshot) return;
    const nombres = new Map((planoGuardado ? planoGuardado.habitaciones : []).map(h => [h.id, h.nombre]));
    pisosConstruir(expandirMaterializado(matSnapshot).habitaciones.map(h => ({ ...h, nombre: nombres.get(h.id) ?? h.nombre })));
  } catch (err) {
    pisosBorrar();
    console.warn('No se pudieron regenerar los pisos:', err);
  }
  try {                                                                // puertas y ventanas 3D: mismos huecos que cortaron las paredes
    if (!matObjeto || !matSnapshot) return;
    const { habitaciones, opciones } = expandirMaterializado(matSnapshot);
    crearPuertasVentanas3D(generarParedes3D(habitaciones, opciones));
  } catch (err) {
    vanos3DBorrar();
    console.warn('No se pudieron regenerar las puertas y ventanas 3D:', err);
  }
}

// Tras (re)materializar: la cubierta que ya hubiera se ajusta a las habitaciones nuevas.
function extrasPlanoAlMaterializar(habs) {
  try {
    if (cubiertaDatos) {
      const bbox = calcularBoundingBoxHabitaciones(habs);
      if (bbox) { cubiertaDatos = { bbox }; cubiertaConstruir(); } else { cubiertaBorrar(); cubiertaDatos = null; }
    }
  } catch (err) {
    cubiertaBorrar(); cubiertaDatos = null;
    console.warn('No se pudo ajustar la cubierta:', err);
  }
  try { pisosConstruir(habs); } catch (err) { pisosBorrar(); console.warn('No se pudieron crear los pisos:', err); }
  try { crearPuertasVentanas3D(generarParedes3D(habs, MAT_OPCIONES)); } catch (err) { vanos3DBorrar(); console.warn('No se pudieron crear las puertas y ventanas 3D:', err); }
  if (cubiertaDatos) marcarSucio();                                    // el rectángulo de la cubierta pudo cambiar: se guarda con el siguiente autoguardado
  cubiertaActualizarUI();
}

function extrasPlanoAlDesmaterializar() {
  extrasPlanoLimpiar();
  cubiertaActualizarUI();
}

// ══════════════════════════════════════════════════════════════════════════════
// F5 · REPLANTEO BÁSICO
// 5a: estacas en las esquinas únicas de las habitaciones del plano GUARDADO y ejes numerados (1, 2, 3… oeste→este; A, B, C… sur→norte).
// 5b: tabla de medidas por habitación (4 lados, 2 diagonales, escuadra 3-4-5): medido, calculado, E, T = D·ER y veredicto (E > T → repetir).
// La lógica es pura (replanteo.js); aquí solo viven la superposición 3D y el panel. La superposición está FUERA de objList (no se selecciona,
// no colisiona, no entra en Programar ni en el panel de piezas) y sus mallas llevan los prefijos estaca_ / eje_. Los datos viven en
// progreso.replanteo (aditivo, nivel de progreso: la clave solo existe si el alumno replanteó) y se regeneran al cargar. No necesita materializar.
// ══════════════════════════════════════════════════════════════════════════════
const REP_ALTURA_POSTE = 0.6;
let repEstacas = [];                                                   // estacas {id, x, z, dx, dz} en mm; vacío = «Sin replanteo»
let repOculto = false;                                                 // C2: ver / ocultar (se guarda)
let repNodo = null;                                                    // TransformNode 'replanteo_plano' con las mallas estaca_* y eje_*
let repMallas = new Map();                                             // id de estaca → { poste, cabeza, etq }
let repHabSel = null;                                                  // habitación cuyas medidas muestra el panel (no se guarda)
let repAviso = '';                                                     // C1: último aviso al validar una desviación (no se guarda)
let repFirmaLista = '', repFirmaHabs = '';                             // evitan reconstruir el DOM (y perder el foco) en cada refresco
let repMatPoste = null, repMatCabeza = null;

const repHabitaciones = () => (planoGuardado && Array.isArray(planoGuardado.habitaciones) ? planoGuardado.habitaciones : []);
const repEstado = () => estadoReplanteo(repEstacas, repHabitaciones());
const repEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function repEtiqueta3D(nombre, texto, ancho, alto, fondo) {
  const dt = new DynamicTexture('rep_dt_' + nombre, { width: 128, height: 64 }, scene, false);
  const ctx = dt.getContext();
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = fondo; ctx.fillRect(2, 2, 124, 60);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(texto, 64, 34);
  dt.hasAlpha = true; dt.update();
  const mat = new StandardMaterial('rep_mat_' + nombre, scene);
  mat.diffuseTexture = dt; mat.emissiveColor = Color3.White(); mat.disableLighting = true; mat.backFaceCulling = false; mat.useAlphaFromDiffuseTexture = true;
  const m = MeshBuilder.CreatePlane(nombre, { width: ancho, height: alto }, scene);
  m.material = mat; m.billboardMode = Mesh.BILLBOARDMODE_ALL; m.isPickable = false; m.checkCollisions = false;
  m.parent = repNodo;
  return m;
}

function repPosicionar(e) {
  const m = repMallas.get(e.id);
  if (!m) return;
  const p = posicionEstaca(e);
  m.poste.position.set(p.x, REP_ALTURA_POSTE / 2, p.z);
  m.cabeza.position.set(p.x, REP_ALTURA_POSTE + 0.05, p.z);
  m.etq.position.set(p.x, REP_ALTURA_POSTE + 0.4, p.z);
}

function repBorrar3D() {
  if (!repNodo) return;
  repNodo.getChildMeshes(false).forEach(m => {
    const mat = m.material;
    m.dispose(false, false);
    if (mat && mat.name.startsWith('rep_mat_')) { try { mat.diffuseTexture?.dispose(); } catch (_) { } mat.dispose(); }
  });
  repNodo.dispose();
  repNodo = null; repMallas = new Map();
}

// (Re)construye la superposición desde repEstacas. Si falla no queda nada a medias.
function repConstruir3D() {
  repBorrar3D();
  if (!repEstacas.length || !scene) return;
  repMatPoste = repMatPoste || Object.assign(new StandardMaterial('rep_poste', scene), { diffuseColor: Color3.FromHexString('#C9A66B') });
  repMatCabeza = repMatCabeza || Object.assign(new StandardMaterial('rep_cabeza', scene), { diffuseColor: Color3.FromHexString('#E53935'), emissiveColor: Color3.FromHexString('#4A0D0B') });
  repNodo = new TransformNode('replanteo_plano', scene);
  try {
    for (const e of repEstacas) {
      const poste = MeshBuilder.CreateCylinder(`estaca_${e.id}_poste`, { diameter: 0.06, height: REP_ALTURA_POSTE, tessellation: 10 }, scene);
      const cabeza = MeshBuilder.CreateCylinder(`estaca_${e.id}_cabeza`, { diameter: 0.1, height: 0.1, tessellation: 10 }, scene);
      poste.material = repMatPoste; cabeza.material = repMatCabeza;
      const etq = repEtiqueta3D(`estaca_${e.id}_etq`, e.id, 0.55, 0.28, 'rgba(8,16,40,.85)');
      for (const m of [poste, cabeza, etq]) { m.parent = repNodo; m.isPickable = false; m.checkCollisions = false; m.renderingGroupId = 1; }   // grupo 1: las estacas se ven aunque las paredes materializadas las rodeen
      repMallas.set(e.id, { poste, cabeza, etq });
      repPosicionar(e);
    }
    const ejes = ejesDe(repEstacas), xs = ejes.columnas.map(v => v / 1000), zs = ejes.filas.map(v => v / 1000);
    const x0 = xs[0] - 1, x1 = xs[xs.length - 1] + 1, z0 = zs[0] - 1, z1 = zs[zs.length - 1] + 1;
    const lineas = [...xs.map(x => [new Vector3(x, 0.04, z0), new Vector3(x, 0.04, z1)]), ...zs.map(z => [new Vector3(x0, 0.04, z), new Vector3(x1, 0.04, z)])];
    const ls = MeshBuilder.CreateLineSystem('eje_lineas', { lines: lineas }, scene);
    ls.color = new Color3(0.3, 0.85, 1); ls.isPickable = false; ls.parent = repNodo;
    if (xs.length + zs.length <= 60) {
      xs.forEach((x, i) => { repEtiqueta3D(`eje_col_${i + 1}`, String(i + 1), 0.4, 0.2, 'rgba(14,90,130,.9)').position.set(x, 0.25, z0 - 0.25); });
      zs.forEach((z, i) => { repEtiqueta3D(`eje_fila_${letraFila(i)}`, letraFila(i), 0.4, 0.2, 'rgba(14,90,130,.9)').position.set(x0 - 0.25, 0.25, z); });
    }
  } catch (err) { repBorrar3D(); throw err; }
  repNodo.setEnabled(!repOculto);
}

const repNum = n => n.toFixed(4);
function repTablaMedidas(m) {
  const fila = x => `<tr class="${x.ok ? 'ok' : 'repetir'}" title="${repEsc(TEXTO_FORMULA_T)}"><th scope="row">${repEsc(x.nombre)}</th><td>${repNum(x.medido)}</td><td>${repNum(x.calculado)}</td>` +
    `<td>${repNum(x.E)}</td><td>${repNum(x.T)}</td><td>${x.ok ? '✓ Se acepta' : '✗ Repetir la medición'}</td></tr>`;
  const grupo = t => `<tr class="grupo"><th colspan="6" scope="colgroup">${t}</th></tr>`;
  const esc = m.escuadras.map(x => (x.aplicable ? fila(x) : `<tr class="na"><th scope="row">${repEsc(x.nombre)}</th><td colspan="5">No aplicable: no caben ${x.orientacion === 'a' ? '3 m en x y 4 m en z' : '4 m en x y 3 m en z'}</td></tr>`));
  return `<table><thead><tr><th>Medida</th><th>Medido (m)</th><th>Calculado (m)</th><th>E (m)</th><th>T (m)</th><th>Veredicto</th></tr></thead><tbody>` +
    grupo('Lados') + m.lados.map(fila).join('') + grupo('Diagonales') + m.diagonales.map(fila).join('') + grupo('Escuadra 3-4-5') + esc.join('') + '</tbody></table>';
}

function repRenderPanel(estado, lectura) {
  const est = planoEl('replanteo-estado-txt');
  est.textContent = TEXTOS_ESTADO[estado]; est.dataset.estado = estado;
  const av = planoEl('replanteo-aviso');
  av.textContent = repAviso; av.hidden = !repAviso;
  const firma = repEstacas.map(e => `${e.id}:${e.x},${e.z}`).join('|') + (lectura ? '#L' : '');
  if (firma !== repFirmaLista) {                                       // la lista de estacas (con sus campos de texto) solo se rehace si cambió el conjunto
    repFirmaLista = firma;
    planoEl('replanteo-estacas').innerHTML = repEstacas.map(e => `<div class="rep-fila"><b>${e.id}</b><span>${(e.x / 1000).toFixed(2)} ; ${(e.z / 1000).toFixed(2)} m</span>` +
      ['dx', 'dz'].map(k => `<label>${k} <input type="text" inputmode="numeric" class="rep-dev" data-estaca="${e.id}" data-eje="${k}" value="${e[k]}" autocomplete="off" ` +
        `aria-label="Desviación ${k} de la estaca ${e.id} (mm)" ${lectura ? 'disabled' : ''}> mm</label>`).join('') + '</div>').join('');
  }
  const habs = repHabitaciones(), sel = planoEl('replanteo-hab');
  const fh = habs.map(h => h.id + h.nombre).join('|');
  if (fh !== repFirmaHabs) { repFirmaHabs = fh; sel.innerHTML = habs.map(h => `<option value="${repEsc(h.id)}">${repEsc(h.nombre)}</option>`).join(''); }
  if (!habs.some(h => h.id === repHabSel)) repHabSel = habs.length ? habs[0].id : null;
  sel.value = repHabSel ?? '';
  const cont = planoEl('replanteo-medidas'), resumen = planoEl('replanteo-resumen');
  const h = habs.find(x => x.id === repHabSel), m = estado === ESTADO_VIGENTE && h ? medidasHabitacion(h, repEstacas) : null;
  if (!m) { cont.innerHTML = ''; resumen.textContent = estado === ESTADO_VIGENTE ? '' : TEXTOS_ESTADO[estado]; return; }
  const r = resumenMedidas(m);
  resumen.textContent = r.repetir ? `${r.repetir} de ${r.total} medidas superan la tolerancia: repite la medición.` : `Las ${r.total} medidas están dentro de la tolerancia.`;
  cont.innerHTML = repTablaMedidas(m);
}

function replanteoActualizarUI() {
  const b = planoEl('plano-replantear');
  if (!b) return;
  const lectura = planoSoloLectura(), hay = repEstacas.length > 0, estado = repEstado();
  b.disabled = lectura;
  b.textContent = hay ? '📐 Volver a replantear' : '📐 Replantear';
  const v = planoEl('plano-replanteo-ver');
  v.disabled = !hay; v.textContent = repOculto ? '👁 Ver replanteo' : '🙈 Ocultar replanteo';
  const e = planoEl('plano-replanteo-estado');
  e.textContent = TEXTOS_ESTADO[estado]; e.dataset.estado = estado;
  planoEl('replanteo-panel').hidden = !hay;
  if (hay) repRenderPanel(estado, lectura);
}

function replantear() {
  if (planoSoloLectura()) return;
  if (planoHayCambios()) { planoMostrarTip('Guarda el plano antes de replantear: hay cambios sin guardar.'); return; }
  const previas = repEstacas, oculto = repOculto;
  const nuevas = crearEstacas(repHabitaciones(), previas);
  if (!nuevas.length) { planoMostrarTip('El plano guardado no tiene habitaciones: dibuja y guarda al menos una para replantear.'); return; }
  try {
    repEstacas = nuevas; repOculto = false;
    if (matBytesGuardado(planoGuardado, matSnapshot) > MAT_LIMITE_BYTES) throw new Error('límite de tamaño');
    repConstruir3D();
  } catch (err) {
    repEstacas = previas; repOculto = oculto;
    try { repConstruir3D(); } catch (_) { repBorrar3D(); }
    planoMostrarTip('No se pudo replantear: el guardado superaría el límite de tamaño o falló el 3D.');
    return;
  }
  repFirmaLista = ''; repAviso = '';
  marcarSucio(); replanteoActualizarUI();
  const ej = ejesDe(nuevas);
  planoMostrarTip(`Replanteo: ${nuevas.length} ${nuevas.length === 1 ? 'estaca' : 'estacas'}, ejes 1–${ej.columnas.length} y A–${letraFila(ej.filas.length - 1)}. Cierra el editor para verlas en 3D.`);
}

function repAlternar() {                                               // C2
  if (!repEstacas.length) return;
  repOculto = !repOculto;
  if (repNodo) repNodo.setEnabled(!repOculto);
  if (!planoSoloLectura()) marcarSucio();
  replanteoActualizarUI();
}

function repAplicarDesviacion(input) {                                 // C1
  if (planoSoloLectura()) return;
  const e = repEstacas.find(s => s.id === input.dataset.estaca), k = input.dataset.eje === 'dz' ? 'dz' : 'dx';
  if (!e) return;
  const r = validarDesviacion(input.value);
  if (!r.valido) {
    repAviso = `Estaca ${e.id}: ${r.aviso}`; input.value = String(e[k]);                   // no se aplica: se restaura el valor anterior
  } else {
    repAviso = r.ajustado ? `Estaca ${e.id}: ${r.aviso}` : '';
    input.value = String(r.valor);
    if (r.valor !== e[k]) { e[k] = r.valor; repPosicionar(e); marcarSucio(); }
  }
  replanteoActualizarUI();
}

function replanteoLimpiar() {
  repBorrar3D();
  repEstacas = []; repOculto = false; repAviso = ''; repHabSel = null; repFirmaLista = ''; repFirmaHabs = '';
}

// Carga: valida lo guardado (nunca lanza) y regenera la superposición. Si el 3D falla se conservan los datos.
function restaurarReplanteo(entrada) {
  replanteoLimpiar();
  const s = sanearReplanteo(entrada);
  if (s) {
    repEstacas = s.estacas; repOculto = s.oculto;
    try { repConstruir3D(); } catch (err) { repBorrar3D(); console.warn('No se pudo regenerar el replanteo:', err); }
  }
  replanteoActualizarUI();
}

function configurarReplanteo() {
  if (!planoEl('plano-replantear')) return;
  planoEl('plano-replantear').addEventListener('click', replantear);
  planoEl('plano-replanteo-ver').addEventListener('click', repAlternar);
  planoEl('replanteo-estacas').addEventListener('change', ev => { if (ev.target.classList?.contains('rep-dev')) repAplicarDesviacion(ev.target); });
  planoEl('replanteo-hab').addEventListener('change', ev => { repHabSel = ev.target.value; replanteoActualizarUI(); });
  planoEl('replanteo-nota').textContent = `${TEXTO_FORMULA_T}. D = distancia calculada de proyecto. ${TEXTO_CRITERIO} ${TEXTO_345}`;
}
configurarReplanteo();

// ══════════════════════════════════════════════════════════════════════════════
// F6a · ZANJAS DE CIMENTACIÓN
// Una zanja bajo cada pared del plano GUARDADO (las mismas paredes que F4d: la pared compartida es una sola zanja), de 250 mm (1 piso) o 300 mm
// (2 pisos) de ancho (NSR-10, Tabla E.2.2-1) y 0.54 m de profundidad por defecto (editable). Los huecos son REALES: el terreno se recompone como el
// complemento de (fosa de F3 ∪ zanjas), no se dibuja nada encima. La lógica (unión de zanjas, volumen sin doble conteo, geometría, avisos, estado,
// guardado) es pura y vive en cimentacion.js; aquí solo viven el 3D y el panel.
// Convivencia con F3: setGroundHole / clearGroundHole llevan una guarda al principio. Sin zanjas no hacen nada distinto de F3; con zanjas, delegan
// en cimRecomponerTerreno. F3 no pasa la profundidad de la fosa a setGroundHole, así que la recomposición completa (terreno + paredes y fondo de
// las zanjas, que dependen de esa profundidad) se hace en un microtask, cuando F3 ya terminó de crear su fosa y excavacionData está al día.
// Los datos viven en progreso.cimentacion (aditivo: la clave solo existe si hay zanjas) y se regeneran al cargar. La superposición está FUERA de objList
// (no se selecciona, no colisiona, no entra en Programar ni en el panel de piezas); sus mallas son zanja_floor y zanja_wall bajo el nodo zanjas_root,
// y el terreno recompuesto son ground_seg_z y zone_seg_z. No necesita materializar. El 3D reutiliza los materiales de la excavación (MAT.excFloor / excWall).
// ══════════════════════════════════════════════════════════════════════════════
let cimZ = null;                                                       // modelo de las zanjas (cimentacion.js) o null = «Sin zanjas»
let cimHabiaGuardado = false;                                          // hubo zanjas guardadas o restauradas en esta sesión: al rellenarlas se envía null para borrarlas del servidor
let cimSuspendido = false;                                             // el 3D falló: se conservan los datos (y el guardado) pero F3 vuelve a mandar sobre el terreno
let cimNodo = null;                                                    // TransformNode 'zanjas_root' con zanja_floor y zanja_wall
let cimMallasTerreno = [];                                             // ground_seg_z y zone_seg_z (también están en groundHoleSegments: así clearGroundHole de F3 las elimina)
let cimPendiente = false;                                              // hay una recomposición completa programada (microtask)
let cimCache = { clave: '', z: null, excavado: false, resumen: null, avisos: [] };
let cimFirmaPanel = '';                                                // evita reconstruir el DOM del panel en cada refresco

const cimHayZanjas = () => cimZ !== null && !cimSuspendido;           // lo consultan las guardas de setGroundHole / clearGroundHole
const cimHabitaciones = () => (planoGuardado && Array.isArray(planoGuardado.habitaciones) ? planoGuardado.habitaciones : []);
const cimEstado = () => estadoCimentacion(cimZ, cimHabitaciones());
const cimFosa = () => fosaDesde(excavacionData);
const cimRects = z => rectangulosZanja(paredesZanja(z.habitaciones), z.ancho);
const cimN = (n, d = 2) => n.toFixed(d).replace('.', ',');

// Malla de cuadriláteros: quads = [{ p: [4 puntos [x, y, z] en m], n: [nx, ny, nz] }]. El orden de los índices se elige para que la cara frontal
// mire hacia n (Babylon, mano izquierda: cara frontal si cross(p1−p0, p2−p0)·n < 0). Las UV son planas por la normal dominante (el suelo las
// reescribe luego con proyectarUVMundo). Sin colisiones ni selección.
function cimMalla(nombre, quads, material) {
  if (!quads.length) return null;
  const pos = [], nor = [], uv = [], idx = [];
  for (const { p, n } of quads) {
    const o = pos.length / 3;
    for (const v of p) {
      pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]);
      if (Math.abs(n[1]) > 0.5) uv.push(v[0], v[2]); else if (Math.abs(n[0]) > 0.5) uv.push(v[2], v[1]); else uv.push(v[0], v[1]);
    }
    const a = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], b = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    if (c[0] * n[0] + c[1] * n[1] + c[2] * n[2] < 0) idx.push(o, o + 1, o + 2, o, o + 2, o + 3); else idx.push(o, o + 2, o + 1, o, o + 3, o + 2);
  }
  const m = new Mesh(nombre, scene);
  const vd = new VertexData();
  vd.positions = pos; vd.normals = nor; vd.uvs = uv; vd.indices = idx;
  vd.applyToMesh(m);
  m.material = material; m.isPickable = false; m.checkCollisions = false;
  return m;
}
const cimCuadro = (r, yM) => ({ p: [[r.x0 / 1000, yM, r.z0 / 1000], [r.x0 / 1000, yM, r.z1 / 1000], [r.x1 / 1000, yM, r.z1 / 1000], [r.x1 / 1000, yM, r.z0 / 1000]], n: [0, 1, 0] });
const cimMuro = m => {
  const c = m.c / 1000, a0 = m.a0 / 1000, a1 = m.a1 / 1000, y0 = m.y0 / 1000, y1 = m.y1 / 1000;
  return m.eje === 'x'
    ? { p: [[c, y0, a0], [c, y1, a0], [c, y1, a1], [c, y0, a1]], n: [m.n, 0, 0] }
    : { p: [[a0, y0, c], [a0, y1, c], [a1, y1, c], [a1, y0, c]], n: [0, 0, m.n] };
};

function cimBorrar3D() {
  if (!cimNodo) return;
  cimNodo.getChildMeshes(false).forEach(m => { try { m.dispose(); } catch (_) { } });
  cimNodo.dispose();
  cimNodo = null;
}

// Fondo y paredes de las zanjas (solo lo que baja respecto de la fosa de F3, si la hay). Si una zanja más honda que la fosa la cruza, el piso sólido
// de F3 (exc_floor) taparía la zanja: se oculta y el piso de la fosa lo dibuja cimentacion.js con las zanjas recortadas (pisoFosa).
function cimZanjas3D(fosa) {
  cimBorrar3D();
  const ef = scene ? scene.getMeshByName('exc_floor') : null;
  if (!cimZ || !scene) { if (ef) ef.isVisible = true; return; }
  const geo = geometriaZanjas(recortarRectangulos(cimRects(cimZ), CIM_TERRENO_MM), cimZ.prof, fosa);
  cimNodo = new TransformNode('zanjas_root', scene);
  try {
    const suelo = cimMalla('zanja_floor', [...geo.suelos, ...geo.pisoFosa].map(r => cimCuadro(r, r.y / 1000)), MAT.excFloor);
    if (suelo) { suelo.receiveShadows = true; suelo.parent = cimNodo; }
    const muros = cimMalla('zanja_wall', geo.muros.map(cimMuro), MAT.excWall);
    if (muros) muros.parent = cimNodo;
  } catch (err) { cimBorrar3D(); throw err; }
  if (ef) ef.isVisible = !geo.fosaPerforada;
}

// Terreno = cuadrado − (fosa ∪ zanjas), en ground (±13 m) y zone_fill (±10 m): una malla por capa. fosa: { x0, x1, z0, z1 } en mm o null.
// Hace lo mismo que clearGroundHole + setGroundHole de F3 (oculta los originales, sustituye los segmentos), sin pasar por sus guardas.
function cimTerreno(fosa) {
  if (!scene || !cimZ) return;
  const huecos = cimRects(cimZ);
  if (fosa) huecos.push({ x0: fosa.x0, x1: fosa.x1, z0: fosa.z0, z1: fosa.z1 });
  groundHoleSegments.forEach(m => { try { m.dispose(); } catch (_) { } });
  groundHoleSegments = []; cimMallasTerreno = [];
  const ground = scene.getMeshByName('ground'), zonaOriginal = scene.getMeshByName('zone_fill');
  if (ground) ground.isVisible = false;
  if (zonaOriginal) zonaOriginal.isVisible = false;
  const g = cimMalla('ground_seg_z', complementoTerreno(huecos, CIM_TERRENO_MM).map(r => cimCuadro(r, 0)), MAT.ground);
  const z = cimMalla('zone_seg_z', complementoTerreno(huecos, CIM_ZONA_MM).map(r => cimCuadro(r, 0.001)), zonaOriginal?.material || MAT.ground);
  for (const m of [g, z]) if (m) { m.receiveShadows = true; cimMallasTerreno.push(m); }
  groundHoleSegments = [...cimMallasTerreno];
  aplicarTexturasExistentes();                                         // los segmentos del suelo también llevan tierra (ground_seg_ …)
}

// Recomposición completa leyendo la fosa de F3 de excavacionData. El 3D va primero (puede fallar): el terreno no se abre si no hay fondo que ver.
function cimRecomponer() {
  const fosa = cimFosa();
  cimZanjas3D(fosa);
  cimTerreno(fosa);
}

function cimProgramarRecomposicion() {
  if (cimPendiente) return;
  cimPendiente = true;
  queueMicrotask(() => {
    cimPendiente = false;
    if (!cimHayZanjas()) return;
    try { cimRecomponer(); } catch (err) { cimSuspender(err); }
  });
}

// Destino de las dos guardas de F3. fosa = [xMin, xMax, zMin, zMax] en m (lo que recibe setGroundHole) o null (clearGroundHole).
function cimRecomponerTerreno(fosa) {
  if (!scene) return;
  try {
    cimTerreno(Array.isArray(fosa)
      ? { x0: Math.round(fosa[0] * 1000), x1: Math.round(fosa[1] * 1000), z0: Math.round(fosa[2] * 1000), z1: Math.round(fosa[3] * 1000) } : null);
  } catch (err) { cimSuspender(err); return; }
  cimProgramarRecomposicion();                                         // las paredes y el fondo dependen de la profundidad de la fosa, que F3 aún no ha fijado
}

// Devuelve el terreno y la fosa de F3 a su estado sin zanjas (con las guardas inactivas: cimZ null o suspendido).
function cimDesmontar() {
  cimBorrar3D();
  if (!scene) return;
  const ef = scene.getMeshByName('exc_floor');
  if (ef) ef.isVisible = true;
  clearGroundHole();                                                   // F3: elimina las mallas del terreno de las zanjas y vuelve a mostrar el original
  cimMallasTerreno = [];
  const e = excavacionData;
  if (fosaDesde(e)) setGroundHole(-e.ancho / 2, e.ancho / 2, -e.largo / 2, e.largo / 2);   // como lo hace crearGeometriaExcavacion (centrada en el origen)
}

// El 3D falló: se conservan los datos (el guardado no los pierde) y F3 recupera el terreno.
function cimSuspender(err) {
  console.warn('No se pudo dibujar las zanjas (los datos se conservan):', err);
  cimSuspendido = true;
  try { cimDesmontar(); } catch (_) { cimBorrar3D(); }
}

function cimQuitar() {                                                 // sin marcarSucio
  const hubo = cimZ !== null || cimNodo !== null || cimMallasTerreno.length > 0;
  cimZ = null; cimSuspendido = false;
  if (hubo) cimDesmontar();
}

function cimLimpiar() {                                                // al cargar: nada de lo anterior sobrevive
  cimQuitar();
  cimHabiaGuardado = false; cimFirmaPanel = ''; cimCache = { clave: '', z: null, excavado: false, resumen: null, avisos: [] };
}

// ── Panel y botones ───────────────────────────────────────────────────────────
function cimPoblarSuelo() {                                            // 11 filas de A.1: 9 con factor y 2 deshabilitadas por no tenerlo (igual que el modal de F3)
  const sel = planoEl('cim-suelo');
  if (!sel || sel.options.length > 0) return;
  for (const [id, fila] of Object.entries(A1_FACTORES_SUELO.filas)) {
    const f = fila.factor_banco_suelto.valor, op = document.createElement('option');
    op.value = id;
    if (f === null) { op.textContent = `${fila.nombre} — sin factor`; op.disabled = true; op.title = EXC_TEXTO_SIN_FACTOR; }
    else { op.textContent = `${fila.nombre} — ×${f.toFixed(2)}`; op.title = `${fila.nombre}: 1 m³ en banco = ${f.toFixed(2)} m³ suelto`; }
    sel.appendChild(op);
  }
  sel.value = SUELO_POR_DEFECTO;
}

function cimLeer() {                                                   // opciones escritas en el panel; prof = resultado de validarProfundidad
  const prof = validarProfundidad(planoEl('cim-prof').value), retiro = Number(planoEl('cim-retiro').value);
  return { prof, op: { pisos: Number(planoEl('cim-pisos').value), prof: prof.mm, suelo: planoEl('cim-suelo').value, retiro: Number.isFinite(retiro) ? retiro / 100 : undefined } };
}

function cimSincronizarForm(z) {                                       // tras cargar: el panel muestra lo que se excavó
  planoEl('cim-pisos').value = String(z.pisos);
  planoEl('cim-prof').value = String(z.prof / 1000);
  planoEl('cim-suelo').value = z.suelo;
  planoEl('cim-retiro').value = String(Math.round(z.retiro * 100));
  planoEl('cim-retiro-val').textContent = `${Math.round(z.retiro * 100)} %`;
}

// Resultados y avisos de lo excavado o, si aún no hay zanjas, de una vista previa con el plano guardado y las opciones del panel (memoizado).
function cimCalculos() {
  const excavado = cimZ !== null, fosa = cimFosa(), rep = repEstado();
  const z = excavado ? cimZ : crearZanjas(cimHabitaciones(), cimLeer().op);
  const clave = JSON.stringify([excavado, z ? serializarCimentacion(z) : null, fosa, rep]);
  if (clave !== cimCache.clave) {
    cimCache = { clave, z, excavado, resumen: z ? resumenZanjas(z, fosa) : null, avisos: z ? avisosZanjas(z, { estadoReplanteo: rep }) : [] };
  }
  return cimCache;
}

function cimRenderPanel(estado, lectura) {
  const est = planoEl('cim-estado-txt');
  est.textContent = TEXTOS_ESTADO_CIM[estado]; est.dataset.estado = estado;
  for (const id of ['cim-pisos', 'cim-prof', 'cim-suelo', 'cim-retiro']) planoEl(id).disabled = lectura;
  planoEl('cim-retiro-val').textContent = `${planoEl('cim-retiro').value} %`;
  const pv = validarProfundidad(planoEl('cim-prof').value), aviso = planoEl('cim-aviso-prof');
  aviso.textContent = pv.valido ? '' : pv.aviso; aviso.hidden = pv.valido;
  const c = cimCalculos(), r = c.resumen;
  let modo = r === null ? 'Guarda un plano con habitaciones para calcular las zanjas.' : c.excavado ? 'Zanjas excavadas' : 'Vista previa (aún sin excavar)';
  if (c.excavado && !lectura) {
    const f = cimLeer().op, z = c.z;
    if (f.pisos !== z.pisos || f.prof !== z.prof || f.suelo !== z.suelo || Math.abs((f.retiro ?? z.retiro) - z.retiro) > 1e-9) modo += ' · los cambios del panel se aplican con «Volver a excavar»';
  }
  const fila = (k, etq, txt, valor = '') => `<dt>${etq}</dt><dd data-k="${k}"${valor === '' ? '' : ` data-valor="${valor}"`}>${txt}</dd>`;
  const filas = r === null ? '' : [
    fila('zanjas', 'Zanjas (una por pared)', String(r.zanjas), r.zanjas),
    fila('longitud', 'Longitud de los ejes', `${cimN(r.longitudM, 2)} m`, r.longitudM),
    fila('seccion', 'Sección (ancho × profundidad)', `${cimN(r.anchoM)} × ${cimN(r.profM)} m`),
    fila('area', 'Área en planta', `${cimN(r.areaM2)} m²`, r.areaM2),
    fila('volumen', 'Volumen en banco', `${cimN(r.volumen)} m³`, r.volumen),
    r.volumenEnFosa > 0 ? fila('enfosa', 'Ya excavado por la fosa de F3', `${cimN(r.volumenEnFosa)} m³`, r.volumenEnFosa) : '',
    fila('factor', 'Factor banco→suelto (A.1)', cimN(r.factor), r.factor),
    fila('suelto', 'Volumen suelto', `${cimN(r.suelto)} m³`, r.suelto),
    fila('aretirar', `A retirar (${Math.round(c.z.retiro * 100)} %)`, `${cimN(r.viajes.aRetirar)} m³`, r.viajes.aRetirar),
    fila('viajes', `Viajes de volqueta (${PARAMETROS.volqueta_m3.valor} m³)`, `${r.viajes.viajes} (${cimN(r.viajes.viajesSinRedondear)} sin redondear)`, r.viajes.viajes),
  ].join('');
  const avisos = c.avisos.map(a => `<li data-codigo="${a.codigo}">${repEsc(a.texto)}</li>`).join('');
  const firma = `${modo}|${filas}|${avisos}`;
  if (firma === cimFirmaPanel) return;
  cimFirmaPanel = firma;
  planoEl('cim-modo').textContent = modo;
  planoEl('cim-resultados').innerHTML = filas;
  planoEl('cim-avisos').innerHTML = avisos;
}

function cimActualizarUI() {
  const b = planoEl('plano-zanjas');
  if (!b) return;
  const lectura = planoSoloLectura(), hay = cimZ !== null, estado = cimEstado();
  b.disabled = lectura;
  b.textContent = hay ? '🕳️ Volver a excavar' : '🕳️ Excavar zanjas';
  const rell = planoEl('plano-zanjas-rellenar');
  rell.hidden = !hay; rell.disabled = lectura || !hay;
  const e = planoEl('plano-zanjas-estado');
  e.textContent = TEXTOS_ESTADO_CIM[estado]; e.dataset.estado = estado;
  cimRenderPanel(estado, lectura);
}

function cimExcavar() {
  if (planoSoloLectura()) return;
  if (planoHayCambios()) { planoMostrarTip('Guarda el plano antes de excavar las zanjas: hay cambios sin guardar.'); return; }
  const { prof, op } = cimLeer();
  if (!prof.valido) { planoMostrarTip(prof.aviso); cimActualizarUI(); return; }
  const z = crearZanjas(cimHabitaciones(), op);
  if (!z) { planoMostrarTip('El plano guardado no tiene habitaciones: dibuja y guarda al menos una para excavar zanjas.'); return; }
  const previa = cimZ, suspendida = cimSuspendido;
  try {
    cimZ = z; cimSuspendido = false;
    if (matBytesGuardado(planoGuardado, matSnapshot) > MAT_LIMITE_BYTES) throw new Error('límite de tamaño');
    cimRecomponer();
  } catch (err) {
    cimZ = previa; cimSuspendido = suspendida;
    try { if (cimHayZanjas()) cimRecomponer(); else cimDesmontar(); } catch (_) { cimBorrar3D(); }
    planoMostrarTip('No se pudieron excavar las zanjas: el guardado superaría el límite de tamaño o falló el 3D.');
    cimActualizarUI();
    return;
  }
  cimHabiaGuardado = true;
  marcarSucio(); cimMostrarPanel(true); cimActualizarUI();
  const r = resumenZanjas(z, cimFosa());
  planoMostrarTip(`Zanjas: ${r.zanjas} ${r.zanjas === 1 ? 'zanja' : 'zanjas'}, ${cimN(r.volumen)} m³ en banco. Cierra el editor para verlas en 3D.`);
}

// El panel está oculto por defecto (cerrado no debe cubrir ni un píxel del lienzo): se abre con «⚙ Zanjas» y al excavar.
function cimMostrarPanel(ver) {
  const panel = planoEl('cimentacion-panel'), btn = planoEl('plano-zanjas-panel');
  if (!panel) return;
  panel.hidden = !ver;
  if (btn) btn.setAttribute('aria-expanded', String(ver));
  if (ver) cimActualizarUI();
}

function cimRellenar() {
  if (planoSoloLectura() || cimZ === null) return;
  cimQuitar();
  marcarSucio(); cimActualizarUI();
  planoMostrarTip('Zanjas rellenadas: el terreno volvió a su estado anterior.');
}

// Carga: valida lo guardado (nunca lanza) y regenera las zanjas. Si el 3D falla se conservan los datos. Lo inválido se descarta entero.
function restaurarCimentacion(entrada) {
  const z = sanearCimentacion(entrada);
  if (z) {
    cimZ = z; cimHabiaGuardado = true;
    try { cimRecomponer(); } catch (err) { cimSuspender(err); }
    try { cimSincronizarForm(z); } catch (_) { }
  } else if (entrada !== undefined && entrada !== null) {
    console.warn('progreso.cimentacion no es válido: se ignora.');
  }
  cimActualizarUI();
}

function configurarCimentacion() {
  if (!planoEl('plano-zanjas')) return;
  cimPoblarSuelo();
  planoEl('plano-zanjas').addEventListener('click', cimExcavar);
  planoEl('plano-zanjas-rellenar').addEventListener('click', cimRellenar);
  planoEl('plano-zanjas-panel').addEventListener('click', () => cimMostrarPanel(planoEl('cimentacion-panel').hidden));
  const alCambiar = () => cimActualizarUI();
  planoEl('cim-pisos').addEventListener('change', alCambiar);
  planoEl('cim-suelo').addEventListener('change', alCambiar);
  planoEl('cim-prof').addEventListener('input', alCambiar);
  planoEl('cim-retiro').addEventListener('input', alCambiar);
  const panel = planoEl('cimentacion-panel');                          // los avisos dependen también del replanteo (F5): el panel se refresca al abrirlo, al pasar el ratón o al enfocarlo
  panel.addEventListener('pointerenter', alCambiar);
  panel.addEventListener('focusin', alCambiar);
  panel.querySelector('details').addEventListener('toggle', alCambiar);
  const fa1 = A1_FACTORES_SUELO.fuente;
  planoEl('cim-nota').textContent = `${TEXTO_FUENTE_ANCHO} ${TEXTO_FUENTE_PROF} Suelo: Manual de Materiales, ${fa1.tabla} (p. ${fa1.pagina_impresa}). ` +
    'El volumen sale de la unión de las zanjas: las esquinas y las paredes compartidas no se cuentan dos veces, y si hay fosa de F3 solo cuenta lo que queda por debajo de su fondo. ' +
    `${TEXTO_NO_VALIDADO}`;
}
configurarCimentacion();

// expone las funciones al scope global para que el HTML pueda llamarlas
window.deleteConcreto = deleteConcreto;
Object.assign(window, {
  deleteSelected, toggleNight, openConcretoModal, closeConcretoModal,
  openMatematicasModal, openMatematicasModalGuarded, closeMatematicasModal, validarMatematicas,
  openWallBuilder, closeWallBuilder, openProgramar, closeProgramar,
  toggleCatalog, addObjIfAllowed, selectFromList, cloneObj,
  wbSelectMat, wbUpdate, buildWall,
  wpSelectMat, wpSelectSize, wpSelectColor, wpSelectCustomColor, wpTogglePalette, wpUpdate, buildFloor,
  switchWallTab,
  concretoActualizarBarra, concretoMezclar, concretoMedidaUpdate, concretoFinalizar,
  dropBlock, dropBlockNew, runProgram, runProgramNew, clearProgram, removeProgBlock, deleteRule,
  openColorPicker, closeColorPicker, setSwatchColor, applyColorPicker, confirmColorPicker,
  wbSelectMode, wbSetVentCount, renderWallPreview, updateModeCardStates,
  updateOpeningCounters,
  roofSelectShape, roofSelectMat, roofAutoFit, roofUpdate, buildRoof,
  openExcavacionModal, closeExcavacionModal, excActualizarVista,
  excOnInputChange, excOnSliderChange, excOnSueloChange, excOnRetiroChange,
  confirmarExcavacion, eliminarExcavacion,
  openPlanoEditor, closePlanoEditor,
});

function snapshotActual(simulado = null) {   // F4d: `simulado` ({ plano, mat }) solo lo usa la salvaguarda de tamaño al materializar
  const progreso = {
    buildPhase,
    concretoUnlocked,
    matematicasValidadas,
    puertas_colocadas,
    ventanas_colocadas,
    progSequence,
    focoState,
    excavacion: excavacionData ? {
      largo: excavacionData.largo,
      ancho: excavacionData.ancho,
      profundidad: excavacionData.profundidad,
      volumen: excavacionData.volumen,
      activa: excavacionData.activa,
      tipo_suelo: excavacionData.tipo_suelo,                 // F3 (aditivo)
      porcentaje_retiro: excavacionData.porcentaje_retiro    // F3 (aditivo)
    } : null
  };
  // F4a (aditivo): solo existe si el alumno guardó un plano; las casas antiguas siguen sin la clave
  const planoBase = simulado ? simulado.plano : planoGuardado;
  const matBase = simulado ? simulado.mat : matSnapshot;
  if (planoBase) {
    progreso.plano = { ...planoBase, rejilla: { ...prefRejilla } };
    delete progreso.plano.materializado;                                   // F4d (aditivo): la clave solo existe si hay paredes materializadas
    if (matBase) progreso.plano.materializado = matBase;
    if (cubiertaDatos) progreso.plano.cubierta = { bbox: { ...cubiertaDatos.bbox } };   // Presentación 20-nov (aditivo): solo existe si el alumno añadió cubierta
  }
  if (repEstacas.length) progreso.replanteo = serializarReplanteo(repEstacas, repOculto);   // F5 (aditivo): solo existe si el alumno replanteó
  // F6a (aditivo): solo existe si hay zanjas. Si las había guardadas (o restauradas) y se rellenaron, se envía null: el servidor fusiona el
  // progreso por claves de primer nivel y nunca borra una clave por omisión (igual que `excavacion`).
  if (cimZ) progreso.cimentacion = serializarCimentacion(cimZ);
  else if (cimHabiaGuardado) progreso.cimentacion = null;
  // F4d: el objeto agregado «paredes_plano» no va en estado.objetos (serializarObjeto no guarda userData): se regenera desde progreso.plano.materializado
  const estado = serializarEscena({ objList: objList.filter(o => o.type !== 'paredes_plano'), objIdCounter, progreso });
  return { estado, progreso };
}

// Gancho de SOLO LECTURA para las pruebas automatizadas (Playwright).
// Solo existe si la URL incluye ?steamTest=1; sin ese parámetro no se crea y no altera nada.
if (new URLSearchParams(location.search).get('steamTest') === '1') {
  window.__steamTest = {
    snapshot: () => snapshotActual(),
    resumenEscena: () => ({
      objetos: objList.map(o => ({ id: o.id, type: o.type })),
      mallas: scene ? scene.meshes.map(m => ({ name: m.name, visible: m.isVisible, enabled: m.isEnabled() })) : [],
      excavacion: excavacionData ? { ...excavacionData } : null,
      puertas: puertas_colocadas,
      ventanas: ventanas_colocadas,
      paredes: countWalls()
    }),
    // F1 · cámara (solo pruebas). Lectura del estado de la cámara y utilidades de proyección.
    camara: () => ({
      alpha: camera.alpha, beta: camera.beta, radius: camera.radius,
      target: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
      posicion: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      colision: camera.checkCollisions, rayosX: rayosXActivo,
      radioMinimo: camera.lowerRadiusLimit, betaMaximo: camera.upperBetaLimit,
      enMovimiento: Math.abs(camera.inertialAlphaOffset) + Math.abs(camera.inertialBetaOffset) +
        Math.abs(camera.inertialRadiusOffset) + Math.abs(camera.inertialPanningX) + Math.abs(camera.inertialPanningY) > 1e-4,
    }),
    // ÚNICA escritura del gancho: coloca la cámara para preparar un caso de prueba (solo con ?steamTest=1).
    fijarCamara: ({ alpha, beta, radius, target }) => {
      camera.inertialAlphaOffset = 0; camera.inertialBetaOffset = 0; camera.inertialRadiusOffset = 0;
      camera.inertialPanningX = 0; camera.inertialPanningY = 0;
      if (target) camera.setTarget(new Vector3(target.x, target.y, target.z));
      if (alpha !== undefined) camera.alpha = alpha;
      if (beta !== undefined) camera.beta = beta;
      if (radius !== undefined) camera.radius = radius;
    },
    seleccionado: () => selectedMesh?.userData?.id ?? null,
    // F2.2 · aviso de colocación (solo lectura): estado transitorio de la pieza seleccionada y lo que muestra la interfaz.
    avisoColocacion: () => {
      const el = id => document.getElementById(id);
      const hex = m => { const e = m && (highlightLayer?._thinEffectLayer?._meshes ?? highlightLayer?._meshes)?.[m.uniqueId]; return e?.color ? e.color.toHexString().toUpperCase() : null; };
      const panel = el('aviso-panel'), alerta = el('aviso-alerta');
      return {
        estado: selectedMesh?.userData?.estadoColocacion ?? null,
        panel: panel ? {
          visible: panel.classList.contains('visible'), estado: panel.dataset.estado || '',
          pieza: el('aviso-pieza')?.textContent, dy: el('aviso-dy')?.textContent, contacto: el('aviso-contacto')?.textContent,
          colorBorde: getComputedStyle(panel).borderLeftColor,
        } : null,
        alerta: alerta ? {
          visible: alerta.classList.contains('visible'),
          filas: Array.from(alerta.querySelectorAll('.aviso-chip')).map(c => ({ estado: c.dataset.estado, texto: c.textContent, color: getComputedStyle(c).borderLeftColor })),
        } : null,
        outlineActual: hex(selectedMesh?.getChildMeshes()[0]),
        plano: avisoPlano ? { visible: avisoPlano.isEnabled(), y: avisoPlano.position.y, ancho: avisoPlano.scaling.x, fondo: avisoPlano.scaling.z } : null,
        hover: avisoHover?.userData?.id ?? null,
        hoverColor: hex(avisoHover?.getChildMeshes()[0]),
        historial: avisoHistorial.map(h => ({ id: h.id, avisos: h.avisos, dy: h.dy })),
        sonido: avisoSonidoActivo,
      };
    },
    limitesObjeto: id => {
      const o = objList.find(x => x.id === id);
      if (!o) return null;
      const b = o.node.getHierarchyBoundingVectors(true);
      return { min: { x: b.min.x, y: b.min.y, z: b.min.z }, max: { x: b.max.x, y: b.max.y, z: b.max.z } };
    },
    // F4a · editor de plano (solo lectura): estado del editor y conversión mundo→pantalla para dirigir el ratón en las pruebas.
    plano: () => ({
      abierto: planoAbierto(), herramienta: planoHerr, seleccion: planoSel, inicio: planoInicio, confirma: planoConfirma,
      vista: { ...planoVista }, cambios: planoHayCambios(), rejilla: { ...prefRejilla },
      trabajo: planoTrab ? JSON.parse(JSON.stringify({ lote: planoTrab.lote, elementos: planoTrab.elementos, contador: planoTrab.contador })) : null,
      guardado: planoGuardado ? JSON.parse(JSON.stringify(planoGuardado)) : null,
      // F4b (aditivo): habitaciones con área y perímetro calculados, selección, solapes y diálogo de plantilla
      habitaciones: planoTrab ? JSON.parse(JSON.stringify(planoTrab.habitaciones.map(h =>
        ({ ...h, area: areaRectangulo(h.ancho, h.largo), perimetro: perimetroRectangulo(h.ancho, h.largo) })))) : null,
      seleccionHab: planoSelHab,
      solapes: planoTrab ? solapesHabitaciones(planoTrab.habitaciones) : null,
      plantillaPendiente: planoPlantillaPend,
      // F4c (aditivo): vano seleccionado, lista plana de vanos con su segmento y avisos calculados, y diálogo de borrado pendiente
      seleccionVano: planoSelVano ? { ...planoSelVano } : null,
      vanos: planoTrab ? planoTrab.habitaciones.flatMap(h => {
        const est = estadoVanos(h);
        return (h.vanos || []).map(v => ({ hab: h.id, ...v, ...segmentoVano(h, v), fuera: est[v.id].fuera, solapa: est[v.id].solapa.slice() }));
      }) : null,
      borrarPendiente: planoBorrarPend,
    }),
    // F4d (solo lectura): estado de la materialización, mallas generadas y línea de visión desde la cámara.
    materializacion: () => ({
      activo: !!matObjeto, pendiente: matPend, resumen: matResumen ? { ...matResumen } : null, ms: matUltimaMs, msTotal: matUltimaTotalMs,
      snapshot: matSnapshot ? JSON.parse(JSON.stringify(matSnapshot)) : null,
      objeto: matObjeto ? { id: matObjeto.id, type: matObjeto.type, label: matObjeto.label, nombre: matObjeto.node.name } : null,
      texto: planoEl('plano-mat-estado')?.textContent ?? '',
      aviso: { visible: !!planoEl('plano-mat-aviso') && !planoEl('plano-mat-aviso').hidden, texto: planoEl('plano-mat-aviso-txt')?.textContent ?? '' },
      dialogo: { visible: !!planoEl('plano-mat-conf') && !planoEl('plano-mat-conf').hidden, texto: planoEl('plano-mat-conf-txt')?.textContent ?? '', nota: planoEl('plano-mat-conf-nota')?.hidden ? '' : planoEl('plano-mat-conf-nota')?.textContent ?? '', boton: planoEl('plano-mat-conf-ok')?.textContent ?? '' },
      botones: { materializar: !planoEl('plano-materializar')?.disabled, desmaterializar: !planoEl('plano-desmaterializar')?.disabled },
      material: MAT.paredesPlano ? MAT.paredesPlano.albedoColor.toHexString().toUpperCase() : null,
      mallas: matObjeto ? matObjeto.node.getChildMeshes().map(m => {
        m.computeWorldMatrix(true);
        const bb = m.getBoundingInfo().boundingBox;
        return {
          name: m.name, pared: m.metadata?.paredPlano ?? null, habitaciones: m.metadata?.habitaciones ?? null, vertices: m.getTotalVertices(), indices: m.getTotalIndices(),
          pickable: m.isPickable, colision: m.checkCollisions, material: m.material?.name ?? null,
          min: { x: bb.minimumWorld.x, y: bb.minimumWorld.y, z: bb.minimumWorld.z }, max: { x: bb.maximumWorld.x, y: bb.maximumWorld.y, z: bb.maximumWorld.z },
        };
      }) : [],
      solidosCamara: TIPOS_SOLIDOS_CAMARA.slice(),
    }),
    // Paredes generadas que cortan el segmento (desde → punto (x, y, z)); sin `desde`, desde la cámara: permite comprobar que desde arriba se ve el interior.
    lineaVisual: (x, y, z, desde) => {
      if (!matObjeto) return [];
      const o = desde ? new Vector3(desde.x, desde.y, desde.z) : camera.position.clone(), d = new Vector3(x, y, z).subtract(o), dist = d.length();
      const rayo = new Ray(o, d.normalize(), dist);
      return matObjeto.node.getChildMeshes().filter(m => { m.computeWorldMatrix(true); return rayo.intersectsMesh(m, false).hit; }).map(m => m.name);
    },
    planoAPantalla: (x, z) => {
      const p = planoAPantalla(x, z), d = planoDims();
      return { x: d.left + p.px, y: d.top + p.py };
    },
    // Coordenadas CSS en pantalla de un punto 3D (para dirigir el ratón en las pruebas).
    aPantalla: (x, y, z) => {
      const w = engine.getRenderWidth(), h = engine.getRenderHeight();
      const p = Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), scene.getTransformMatrix(),
        camera.viewport.toGlobal(w, h));
      const r = canvas.getBoundingClientRect();
      return { x: r.left + p.x * r.width / w, y: r.top + p.y * r.height / h };
    },
    // Centro en pantalla de la flecha del gizmo de posición para el eje dado ('x' | 'y' | 'z').
    gizmoEnPantalla: eje => {
      const g = gizmoMgr?.gizmos?.positionGizmo?.[eje + 'Gizmo'];
      const malla = g?._rootMesh;
      if (!malla) return null;
      const b = malla.getHierarchyBoundingVectors(true);
      const c = b.min.add(b.max).scale(0.5);
      return window.__steamTest.aPantalla(c.x, c.y, c.z);
    },
  };
}


// F5 (solo lectura, solo con ?steamTest=1): estado del replanteo y de su superposición 3D, para las pruebas automatizadas.
if (window.__steamTest) {
  window.__steamTest.replanteo = () => ({
    estacas: repEstacas.map(e => ({ ...e })), oculto: repOculto, estado: repEstado(), aviso: repAviso, activo: !!repNodo, visible: !!repNodo && repNodo.isEnabled(),
    mallas: repNodo ? repNodo.getChildMeshes(false).map(m => ({ name: m.name, pickable: m.isPickable, colision: m.checkCollisions, x: m.position.x, y: m.position.y, z: m.position.z })) : [],
    enObjList: objList.some(o => /replanteo|estaca_|eje_/.test(o.type + ' ' + (o.node?.name ?? ''))),
  });
}

// F6a (solo lectura, solo con ?steamTest=1): estado de las zanjas y de su geometría REAL (áreas medidas sobre los vértices), para las pruebas automatizadas.
if (window.__steamTest) {
  const areaMalla = m => {
    if (!m || m.isDisposed()) return 0;
    const p = m.getVerticesData('position'), ix = m.getIndices();
    if (!p || !ix) return 0;
    let a = 0;
    for (let i = 0; i < ix.length; i += 3) {
      const [i0, i1, i2] = [ix[i] * 3, ix[i + 1] * 3, ix[i + 2] * 3];
      const u = [p[i1] - p[i0], p[i1 + 1] - p[i0 + 1], p[i1 + 2] - p[i0 + 2]], v = [p[i2] - p[i0], p[i2 + 1] - p[i0 + 1], p[i2 + 2] - p[i0 + 2]];
      a += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    }
    return a;
  };
  window.__steamTest.cimentacion = () => {
    const fosa = cimFosa(), ef = scene ? scene.getMeshByName('exc_floor') : null, calc = cimCalculos();
    return {
      activo: cimZ !== null, suspendido: cimSuspendido, habiaGuardado: cimHabiaGuardado, estado: cimEstado(),
      opciones: cimZ ? { pisos: cimZ.pisos, ancho: cimZ.ancho, prof: cimZ.prof, suelo: cimZ.suelo, retiro: cimZ.retiro } : null,
      habitaciones: cimZ ? cimZ.habitaciones.length : 0,
      resumen: cimZ ? resumenZanjas(cimZ, fosa) : null,
      vistaPrevia: !cimZ && calc.resumen ? calc.resumen : null,
      avisos: calc.avisos.map(a => a.codigo),
      nodo: !!cimNodo, enObjList: objList.some(o => /zanja|cimentacion/.test(o.type + ' ' + (o.node?.name ?? ''))),
      mallas: cimNodo ? cimNodo.getChildMeshes(false).map(m => ({ name: m.name, pickable: m.isPickable, colision: m.checkCollisions, visible: m.isVisible, areaM2: areaMalla(m) })) : [],
      terreno: groundHoleSegments.map(m => ({ name: m.name, areaM2: areaMalla(m), colision: m.checkCollisions, pickable: m.isPickable })),
      originales: { ground: scene.getMeshByName('ground')?.isVisible ?? null, zone: scene.getMeshByName('zone_fill')?.isVisible ?? null },
      excFloor: ef ? { visible: ef.isVisible } : null,
      fosa: fosa ? { ...fosa } : null,
    };
  };
  // Primer punto del terreno / de las zanjas que encuentra un rayo vertical hacia abajo en (x, z) metros: { nombre, y } o null.
  window.__steamTest.cimRayo = (x, z) => {
    const hit = scene.pickWithRay(new Ray(new Vector3(x, 8, z), new Vector3(0, -1, 0), 40), m => m.isVisible && m.isEnabled() && /^(ground|zone_|zanja_|exc_floor$|exc_w_)/.test(m.name));   // solo geometría sólida (no las líneas decorativas de F3)
    return hit && hit.hit ? { nombre: hit.pickedMesh.name, y: hit.pickedPoint.y } : null;
  };
}

async function restaurarProgreso() {
  const data = await cargar();
  if (!data || !data.estado) return data;

  const { estado, progreso } = data;
  matSnapshot = null; matObjeto = null; matResumen = null;                 // F4d: se recalculan desde progreso.plano.materializado (si existe)
  extrasPlanoLimpiar();                                                    // Presentación 20-nov: cubierta (y pisos) se regeneran desde lo guardado
  replanteoLimpiar();                                                      // F5: las estacas se regeneran desde progreso.replanteo (si existe)
  cimLimpiar();                                                            // F6a: las zanjas se regeneran desde progreso.cimentacion (si existe)

  if (progreso) {
    if (typeof progreso.buildPhase === 'number') buildPhase = progreso.buildPhase;
    if (typeof progreso.concretoUnlocked === 'boolean') concretoUnlocked = progreso.concretoUnlocked;
    if (typeof progreso.matematicasValidadas === 'boolean') matematicasValidadas = progreso.matematicasValidadas;
    if (typeof progreso.puertas_colocadas === 'number') puertas_colocadas = progreso.puertas_colocadas;
    if (typeof progreso.ventanas_colocadas === 'number') ventanas_colocadas = progreso.ventanas_colocadas;
    if (Array.isArray(progreso.progSequence)) {
      progSequence = progreso.progSequence;
      try { renderProgWorkspace(); renderPseudocode(); } catch (e) { }
    }
    if (progreso.focoState) focoState = progreso.focoState;
    if (progreso.plano && typeof progreso.plano === 'object' && !Array.isArray(progreso.plano)) { // F4a: tolerante a JSON corrupto
      planoGuardado = sanearPlano(progreso.plano);
      prefRejilla = { ...planoGuardado.rejilla };
      if (planoGuardado.materializado) matRestaurar(planoGuardado.materializado);   // F4d: regenera las paredes (una casa sin ese campo no genera nada)
      restaurarExtrasPlano(progreso.plano);                                       // Presentación 20-nov: se lee del progreso sin sanear (sanearPlano descarta lo que no conoce)
    }
    restaurarReplanteo(progreso.replanteo);                                   // F5: se lee del progreso (nivel superior)

    const faseGuardada = buildPhase;
    if (faseGuardada >= 1 || matematicasValidadas) unlockPhase1();
    if (faseGuardada >= 2 || concretoUnlocked) unlockPhase2();
    if (faseGuardada >= 4) unlockAll();
    updateOpeningCounters();

    if (progreso.excavacion && progreso.excavacion.activa &&
      validarDimensionesExcavacion(progreso.excavacion.largo, progreso.excavacion.ancho, progreso.excavacion.profundidad).length === 0) {
      crearGeometriaExcavacion(
        progreso.excavacion.largo,
        progreso.excavacion.ancho,
        progreso.excavacion.profundidad,
        false,
        progreso.excavacion.tipo_suelo,       // F3: si falta o no es válido, crearGeometriaExcavacion aplica el suelo por defecto
        progreso.excavacion.porcentaje_retiro // F3: si falta o no es válido, 100 %
      );
    }
    restaurarCimentacion(progreso.cimentacion);                               // F6a: después de la excavación de F3 (la fosa y las zanjas se componen juntas)
  }

  if (estado.contador) {
    objIdCounter = Math.max(objIdCounter, estado.contador);
  }

  const objetos = estado.objetos || [];
  if (!objetos.length) return;

  objetos.forEach(o => {
    if (o.id >= objIdCounter) objIdCounter = o.id + 1;
  });

  const embeddedMap = new Map();
  const topObjects = [];
  objetos.forEach(o => {
    if (o.embeddedInWall) {
      if (!embeddedMap.has(o.embeddedInWall)) embeddedMap.set(o.embeddedInWall, []);
      embeddedMap.get(o.embeddedInWall).push(o);
    } else {
      topObjects.push(o);
    }
  });

  for (const o of topObjects) {
    const p = o.p || [0, 0, 0];
    const r = o.r || [0, 0, 0];
    const s = o.s || [1, 1, 1];

    if (o.type === 'concreto_slab_20') {
      const root = new TransformNode('obj_' + o.id + '_concreto_slab', scene);
      root.position.set(p[0], p[1], p[2]);
      root.rotation.set(r[0], r[1], r[2]);
      root.scaling.set(s[0], s[1], s[2]);
      const slab = MeshBuilder.CreateBox('con_slab_' + o.id, { width: 20, height: 0.2, depth: 20 }, scene);
      slab.material = MAT.concreto;
      slab.receiveShadows = true;
      slab.position.set(0, 0.1, 0);
      if (shadowGen) shadowGen.addShadowCaster(slab, false);
      slab.parent = root;
      clampToZone(root);
      root.userData = { id: o.id, type: 'concreto_slab_20', label: `${LABELS.concreto} 20×20`, emoji: EMOJIS.concreto, isMainSlab: true };
      objList.push({ id: o.id, type: 'concreto_slab_20', label: `${LABELS.concreto} 20×20`, emoji: EMOJIS.concreto, node: root });

      const btnStormCreate = document.getElementById('btnStorm');
      if (btnStormCreate) {
        btnStormCreate.disabled = true;
        btnStormCreate.style.opacity = '0.45';
        btnStormCreate.title = '🪨 Ya tienes el concreto creado. Elimínalo primero para poder crearlo de nuevo.';
      }
    } else if (o.type === 'floor_vitropiso') {
      const w = o.w || 5;
      const d = o.d || 5;
      const newArea = o.area || (w * d);
      const root = new TransformNode('obj_' + o.id + '_floor_vitropiso', scene);
      root.position.set(p[0], p[1], p[2]);
      root.rotation.set(r[0], r[1], r[2]);
      root.scaling.set(s[0], s[1], s[2]);

      const hex = o.color || '#38bdf8';
      const cr = parseInt(hex.slice(1, 3), 16) / 255;
      const cg = parseInt(hex.slice(3, 5), 16) / 255;
      const cb = parseInt(hex.slice(5, 7), 16) / 255;
      const floorMat = new PBRMaterial('vitropiso_custom_' + o.id, scene);
      floorMat.albedoColor = new Color3(cr, cg, cb);
      floorMat.alpha = 0.82; floorMat.metallic = 0.15; floorMat.roughness = 0.02;
      floorMat.backFaceCulling = false;
      floorMat.emissiveColor = new Color3(cr * 0.08, cg * 0.08, cb * 0.08);

      const fh = 0.06;
      const yOffset = 0.21;
      const startX = -(w / 2) + 0.5;
      const startZ = -(d / 2) + 0.5;

      for (let col = 0; col < w; col++) {
        for (let row = 0; row < d; row++) {
          const mesh = MeshBuilder.CreateBox(
            'floor_' + o.id + '_' + col + '_' + row,
            { width: 0.97, height: fh, depth: 0.97 }, scene
          );
          mesh.position.set(startX + col, (fh / 2) + yOffset, startZ + row);
          mesh.material = floorMat;
          mesh.receiveShadows = true;
          if (shadowGen) shadowGen.addShadowCaster(mesh, false);
          mesh.parent = root;
        }
      }

      const label = `${LABELS.vitropiso} ${w}×${d}`;
      root.userData = { id: o.id, type: 'floor_vitropiso', label, emoji: EMOJIS.vitropiso, color: hex };
      objList.push({ id: o.id, type: 'floor_vitropiso', label, emoji: EMOJIS.vitropiso, node: root, area: newArea, w, d });
    } else if (o.type === 'wall_block' || o.type === 'wall_madera' || o.type === 'wall_lamina') {
      const matType = o.type === 'wall_block' ? 'block' : (o.type === 'wall_madera' ? 'madera' : 'lamina');
      const mode = o.wallMode || 'simple';
      const w = o.w || 5;
      const h = o.d || 4;
      const bW = 1.0;
      const bH = matType === 'block' ? 0.7 : (matType === 'madera' ? 0.2 : 0.5);
      const bD = matType === 'block' ? 0.5 : (matType === 'madera' ? 0.2 : 0.25);

      const root = new TransformNode('obj_' + o.id + '_' + o.type, scene);
      root.position.set(p[0], p[1], p[2]);
      root.rotation.set(r[0], r[1], r[2]);
      root.scaling.set(s[0], s[1], s[2]);

      const totalW = w * bW;
      const startX = -(totalW / 2) + bW / 2;

      const huecos = new Set();
      const embeddedChildren = embeddedMap.get(o.id) || [];
      const ventCount = embeddedChildren.filter(c => c.type === 'ventana').length || 1;

      if (mode === 'puerta') {
        const midCol = Math.floor(w / 2);
        const doorRows = Math.min(4, h);
        for (let rIdx = 0; rIdx < doorRows; rIdx++) huecos.add(`${midCol},${rIdx}`);
      } else if (mode === 'ventana') {
        const positions = ventCount === 1
          ? [Math.floor(w / 2)]
          : [Math.floor(w / 4), Math.floor(3 * w / 4)];
        const winTopRow = Math.max(1, h - 2);
        const winBotRow = Math.max(1, h - 3);
        positions.forEach(col => {
          for (let rIdx = winBotRow; rIdx <= winTopRow; rIdx++) huecos.add(`${col},${rIdx}`);
        });
      }

      let customMat = null;
      if (o.color) {
        const cr = parseInt(o.color.slice(1, 3), 16) / 255;
        const cg = parseInt(o.color.slice(3, 5), 16) / 255;
        const cb = parseInt(o.color.slice(5, 7), 16) / 255;
        const baseM = matType === 'block' ? MAT.block : (matType === 'madera' ? MAT.madera : MAT.lamina);
        customMat = baseM.clone('wall_colored_' + o.id);
        customMat.albedoColor = new Color3(cr, cg, cb);
      }

      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          if (huecos.has(`${col},${row}`)) continue;
          const px = startX + col * bW;
          const py = (bH / 2) + row * bH;
          const defaultM = matType === 'block' ? MAT.block : (matType === 'madera' ? MAT.madera : MAT.lamina);
          const mesh = MeshBuilder.CreateBox(
            'wall_' + matType + '_' + o.id + '_' + row + '_' + col,
            { width: bW - 0.04, height: bH - (matType === 'block' ? 0.04 : 0.02), depth: bD }, scene
          );
          mesh.material = customMat || defaultM;
          mesh.position.set(px, py, 0);
          mesh.receiveShadows = true;
          if (shadowGen) shadowGen.addShadowCaster(mesh, false);
          mesh.parent = root;
        }
      }

      const modeTag = mode === 'puerta' ? ' + 🚪 Puerta' : mode === 'ventana' ? ` + 🪟 ${ventCount} Ventana(s)` : '';
      const matName = LABELS[matType];
      const label = `Pared ${matName} ${w}×${h}${modeTag}`;
      const emoji = EMOJIS[matType];
      root.userData = { id: o.id, type: o.type, label, emoji, wallMode: mode, w, h };
      if (o.color) root.userData.color = o.color;
      objList.push({ id: o.id, type: o.type, label, emoji, node: root, w, d: h });

      for (const emb of embeddedChildren) {
        const embRoot = new TransformNode('obj_' + emb.id + '_' + emb.type, scene);
        embRoot.position.set(emb.p[0], emb.p[1], emb.p[2]);
        if (emb.r) embRoot.rotation.set(emb.r[0], emb.r[1], emb.r[2]);
        if (emb.s) embRoot.scaling.set(emb.s[0], emb.s[1], emb.s[2]);
        embRoot.parent = root;
        if (BUILDERS[emb.type]) BUILDERS[emb.type](embRoot);
        embRoot.getChildMeshes().forEach(m => {
          m.receiveShadows = true;
          if (shadowGen) shadowGen.addShadowCaster(m, false);
        });
        if (emb.color) {
          const cr = parseInt(emb.color.slice(1, 3), 16) / 255;
          const cg = parseInt(emb.color.slice(3, 5), 16) / 255;
          const cb = parseInt(emb.color.slice(5, 7), 16) / 255;
          const col = new Color3(cr, cg, cb);
          embRoot.getChildMeshes().forEach(m => {
            if (m.material && m.material.albedoColor !== undefined) {
              const name = m.name || '';
              const isDetail = name.includes('mad_g') || name.includes('con_l') || name.includes('vit_g') || name.includes('bar_wire') || name.includes('bar_rod');
              if (!isDetail) {
                const clone = m.material.clone(m.material.name + '_colored_' + emb.id);
                clone.albedoColor = col;
                m.material = clone;
              }
            }
          });
        }
        const embLabel = LABELS[emb.type] || emb.type;
        const embEmoji = EMOJIS[emb.type] || '📦';
        embRoot.userData = { id: emb.id, type: emb.type, label: embLabel, emoji: embEmoji, embeddedInWall: o.id };
        if (emb.color) embRoot.userData.color = emb.color;
        objList.push({ id: emb.id, type: emb.type, label: embLabel, emoji: embEmoji, node: embRoot });
      }
    } else if (o.type === 'roof') {
      reconstructRoof(o);
    } else if (BUILDERS[o.type]) {
      const root = new TransformNode('obj_' + o.id + '_' + o.type, scene);
      root.position.set(p[0], p[1], p[2]);
      root.rotation.set(r[0], r[1], r[2]);
      root.scaling.set(s[0], s[1], s[2]);
      BUILDERS[o.type](root);
      root.getChildMeshes().forEach(m => {
        if (shadowGen) shadowGen.addShadowCaster(m, false);
      });
      if (o.color) {
        const cr = parseInt(o.color.slice(1, 3), 16) / 255;
        const cg = parseInt(o.color.slice(3, 5), 16) / 255;
        const cb = parseInt(o.color.slice(5, 7), 16) / 255;
        const col = new Color3(cr, cg, cb);
        root.getChildMeshes().forEach(m => {
          if (m.material && m.material.albedoColor !== undefined) {
            const name = m.name || '';
            const isDetail = name.includes('mad_g') || name.includes('con_l') || name.includes('vit_g') || name.includes('bar_wire') || name.includes('bar_rod');
            if (!isDetail) {
              const clone = m.material.clone(m.material.name + '_colored_' + o.id);
              clone.albedoColor = col;
              m.material = clone;
            }
          }
        });
      }
      const label = LABELS[o.type] || o.type;
      const emoji = EMOJIS[o.type] || '📦';
      root.userData = { id: o.id, type: o.type, label, emoji };
      if (o.type === 'lampara') root.userData.isLampara = true;
      if (o.color) root.userData.color = o.color;
      // Restaurar bloque cortado: reconstruir con las dimensiones reducidas
      if (o.cutFactor != null && o.cutFactor < 1 && CUT_TYPES.includes(o.type)) {
        root.userData.cutFactor = o.cutFactor;
        cortarBloque(root, o.cutFactor);
        // Re-aplicar color personalizado tras el corte (cortarBloque conserva
        // el material del cuerpo, pero si venía del guardado el color se aplicó
        // a las mallas antiguas que ya fueron eliminadas por cortarBloque).
        if (o.color) {
          const cr2 = parseInt(o.color.slice(1, 3), 16) / 255;
          const cg2 = parseInt(o.color.slice(3, 5), 16) / 255;
          const cb2 = parseInt(o.color.slice(5, 7), 16) / 255;
          const col2 = new Color3(cr2, cg2, cb2);
          root.getChildMeshes().forEach(m => {
            if (m.material && m.material.albedoColor !== undefined) {
              const nm = m.name || '';
              const isD = nm.includes('mad_g') || nm.includes('con_l');
              if (!isD) {
                const cl = m.material.clone(m.material.name + '_colored_' + o.id);
                cl.albedoColor = col2;
                m.material = cl;
              }
            }
          });
        }
      }
      objList.push({ id: o.id, type: o.type, label, emoji, node: root });
    }
  }

  updateObjListUI();
  // Recalcular desde los objetos ya reconstruidos, no desde el número que
  // se guardó (pudo quedar desactualizado si venía de antes de este fix).
  recalcularObjetivos();
  return data;
}

// función principal que arranca la escena, cámara, luces y todo lo demás
const init = () => {
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.48, 0.62, 0.82, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new Color3(0.45, 0.58, 0.78);

  P(8, 'Cámara…');
  camera = new ArcRotateCamera('cam', -Math.PI / 2, 0.95, 30, new Vector3(0, 0, 0), scene);
  setCameraRef(camera);
  iniciarSesion();
  // F1 · cámara libre. Respaldo de la configuración anterior:
  //   camera.lowerRadiusLimit = 5; camera.upperBetaLimit = Math.PI / 2.05;
  //   camera.attachControl(canvas, true);
  //   camera.inputs.remove(camera.inputs.attached.pointers);   // sin ratón: solo flechas y rueda
  camera.lowerRadiusLimit = CAMARA_F1.radioMinimo; camera.upperRadiusLimit = 60;
  camera.upperBetaLimit = CAMARA_F1.betaMaximo; camera.lowerBetaLimit = 0.18;
  camera.wheelDeltaPercentage = 0.008;
  // noPreventDefault, Ctrl + clic izquierdo también desplaza, botón central desplaza
  camera.attachControl(true, true, CAMARA_F1.botonDesplazar);

  camera.inputs.remove(camera.inputs.attached.keyboard);
  camera.inputs.remove(camera.inputs.attached.mousewheel);
  camera.inputs.add(new ArcRotateCameraMouseWheelInput());
  camera.wheelDeltaPercentage = 0.008;
  configurarCamaraLibre();

  P(18, 'Luces…');
  sunLight = new DirectionalLight('sun', new Vector3(-1, -2.2, -0.8), scene);
  sunLight.intensity = 2.8; sunLight.diffuse = new Color3(1.0, 0.96, 0.88);
  sunLight.specular = new Color3(0.9, 0.88, 0.80); sunLight.position = new Vector3(30, 55, 20);
  hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.65; hemiLight.diffuse = new Color3(0.55, 0.72, 0.98);
  hemiLight.groundColor = new Color3(0.12, 0.20, 0.38);

  P(28, 'Sombras…');
  shadowGen = new ShadowGenerator(2048, sunLight);
  // sombras suaves con contact hardening, mejor que PCF en v9
  shadowGen.useContactHardeningShadows = true;
  shadowGen.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGen.bias = 0.0008;
  shadowGen.normalBias = 0.06;

  P(38, 'Materiales…'); buildMaterials();
  P(52, 'Plano…'); buildGround();

  restaurarProgreso().then((data) => {
    const pid = parseInt(new URLSearchParams(location.search).get('proyecto') || 1, 10);
    iniciarAutoguardado(snapshotActual, { proyecto_id: pid });
    
    if (vistaAlumnoId) {
      // Activar modo solo lectura y sincronización
      document.getElementById('topbar').style.pointerEvents = 'none';
      document.getElementById('topbar').style.opacity = '0.5';
      document.getElementById('btnBack').style.pointerEvents = 'auto'; // Permitir volver
      document.getElementById('btnBack').style.opacity = '1';
      document.getElementById('catalog').style.display = 'none';
      document.getElementById('reset-fab-group').style.display = 'none';
      if (!data) {
        document.getElementById('tip').innerHTML = "<b>Modo solo lectura:</b> El alumno todavía no ha guardado ningún progreso.";
      } else {
        document.getElementById('tip').innerHTML = "<b>Modo solo lectura:</b> Viendo el progreso del alumno.<br>Esta vista se actualizará automáticamente cuando el alumno guarde cambios.";
      }
      
      iniciarSyncMaestro(data ? data.actualizado_en : null);
      
      document.addEventListener('guardado:actualizado_externo', async () => {
         if (gizmoMgr) {
             gizmoMgr.attachToMesh(null);
         }
         selectedMesh = null;
         limpiarAvisoColocacion(); // F2.2
         objList.forEach(o => { if(o.node) o.node.dispose(); });
         objList = [];
         objIdCounter = 1;
         const res = await restaurarProgreso();
         
         if (!res) {
           document.getElementById('tip').innerHTML = "<b>Modo solo lectura:</b> El alumno todavía no ha guardado ningún progreso.";
         } else {
           document.getElementById('tip').innerHTML = "<b>Modo solo lectura:</b> Viendo el progreso del alumno.<br>Esta vista se actualizará automáticamente cuando el alumno guarde cambios.";
         }
         
         if (res) iniciarSyncMaestro(res.actualizado_en); // actualizar timestamp
      });
    }
  });

  P(68, 'Gizmos…');
  setupGizmos();

  P(78, 'Highlight…');
  highlightLayer = new HighlightLayer('hl', scene);
  highlightLayer.outerGlow = true;
  highlightLayer.blurHorizontalSize = 0.5; highlightLayer.blurVerticalSize = 0.5;

  P(86, 'Picking…'); setupPicking(); setupBlockContextMenu(); configurarAvisosColocacion(); configurarPlano();

  P(94, 'Post-proceso…');
  const pp = new DefaultRenderingPipeline('pp', true, scene, [camera]);
  pp.fxaaEnabled = true;
  pp.bloomEnabled = true; pp.bloomThreshold = 0.7; pp.bloomWeight = 0.18; pp.bloomKernel = 64; pp.bloomScale = 0.5;
  pp.imageProcessingEnabled = true;
  pp.imageProcessing.contrast = 1.12; pp.imageProcessing.exposure = 1.05;
  pp.imageProcessing.toneMappingEnabled = true;
  pp.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;

  // SSAO2 importado arriba, si no está disponible simplemente lo ignoramos
  try {
    const ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera]);
    ssao.radius = 2.0; ssao.totalStrength = 1.0; ssao.base = 0.12;
  } catch (e) { console.warn('SSAO no disponible:', e.message); }

  P(100, '¡Listo!');
  setTimeout(() => {
    const l = document.getElementById('loading');
    l.style.opacity = '0'; setTimeout(() => l.style.display = 'none', 900);
  }, 500);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => { engine.resize(); });

  scene.registerAfterRender(() => {
    objList.forEach(o => { if (o.type !== 'paredes_plano') clampToZone(o.node); });   // F4d: las paredes del plano no se encajan en la zona de construcción
    if (selectedMesh) {
      document.getElementById('xinfo').textContent =
        `${selectedMesh.userData?.emoji || ''} ${selectedMesh.userData?.label || ''}` +
        `  ·  X:${selectedMesh.position.x.toFixed(1)}` +
        `  Z:${selectedMesh.position.z.toFixed(1)}` +
        `  Y:${selectedMesh.position.y.toFixed(1)}` +
        `  ·  Rot:${(selectedMesh.rotation.y * 180 / Math.PI).toFixed(0)}°`;
    }
  });

  setInterval(() => { if (buildPhase >= 4 || modoLibreActivo) checkAndUpdateProgramarBtn(); }, 500);

  // Fase 3: el interruptor de construcción libre solo se muestra con ?libre=1 (y arranca en OFF)
  if (new URLSearchParams(location.search).get('libre') === '1') {
    const btnLibre = document.getElementById('btnLibre');
    if (btnLibre) btnLibre.style.display = '';
  }
  
  // Mostrar tutorial guiado al entrar (solo si es alumno y no lo ha completado)
  setTimeout(checkTutorial, 1000); // 1s delay to let UI render properly
};

init();