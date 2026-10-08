// importamos todo lo que vamos a usar de Babylon.js v9
import { iniciarSesion, cerrarSesion, registrar, setCameraRef } from './telemetria.js';
import { iniciarAutoguardado, marcarSucio, cargar, serializarEscena, reiniciar, haySinGuardar } from './guardado.js';
import {
  Engine,
  Scene,
  Color3,
  Color4,
  Vector3,
  Matrix,
  ArcRotateCamera,
  ArcRotateCameraMouseWheelInput,
  DirectionalLight,
  HemisphericLight,
  PointLight,
  ShadowGenerator,
  GizmoManager,
  HighlightLayer,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  TransformNode,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  PointerEventTypes,
} from '@babylonjs/core';

// SSAO2 tiene su propio submódulo en v9, hay que importarlo por separado
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js';

// variables globales que se usan en todo el proyecto
const canvas = document.getElementById('c');
const engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true, stencil: true });

let scene, camera, sunLight, hemiLight, shadowGen, highlightLayer;
let selectedMesh = null;
let isNight = false;
let isStorm = false;
let gizmoMgr;
let objList = [];
let objIdCounter = 1;
let catOpen = true;
let MAT = {};

// variables del sistema de tormenta, ya no se usa pero se mantiene para compatibilidad
let rainCtx, rainCanvas, rainParticles = [], stormInterval = null, lightningTimer = null;
let windLevel = 0, windDir = 1, windTarget = 0;

// estado interno del módulo de programación por bloques
let pendingTrigger = null;
let progRules = [];

// variables del sistema de desbloqueo por fases
let concretoUnlocked = false;
// fase 0=solo matematicas, 1=concreto desbloqueado, 2=construir desbloqueado, 3=pared construida, 4=todo desbloqueado (programar)
let buildPhase = 0;

// estado del módulo de matemáticas
let matematicasValidadas = false;

// (estado del modal de concreto ahora se maneja por inputs numéricos)

// estado del constructor de pisos
let wpMat = 'block';

// tipos que se pueden colorear y referencia al objeto activo en el picker
const COLORABLE_TYPES = ['block', 'madera', 'puerta', 'vitropiso', 'ventana'];
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

const LABELS = { block: 'Block', madera: 'Madera', foco: 'Foco', puerta: 'Puerta', barillas: 'Barillas', ventana: 'Ventana', concreto: 'Concreto', vitropiso: 'Vitropiso', lampara: 'Lámpara' };
const EMOJIS = { block: '🧱', madera: '🪵', foco: '💡', puerta: '🚪', barillas: '⚙', ventana: '🪟', concreto: '🪨', vitropiso: '🔷', lampara: '🔦' };
const RESISTANCE = { block: 0.9, concreto: 0.95, barillas: 0.85, vitropiso: 0.7, madera: 0.25, puerta: 0.5, ventana: 0.4, foco: 0.3, lampara: 0.4 };

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
const COLLISION_TYPES = ['block', 'madera', 'wall_block', 'wall_madera'];
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
  ['cat-block', 'cat-madera', 'cat-foco', 'cat-puerta', 'cat-ventana', 'cat-vitropiso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('cat-disabled');
  });
  const btnProg = document.getElementById('btnProgramar');
  if (btnProg) { btnProg.disabled = false; btnProg.style.opacity = ''; btnProg.title = ''; }
  setTip('Programacion desbloqueada! Tienes 4 o mas paredes. Ya puedes programar tu casa.');
}
// Cuenta solo paredes reales (wall_block o wall_madera)
function countWalls() {
  return objList.filter(o => o.type === 'wall_block' || o.type === 'wall_madera').length;
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

// configura el gizmo de posición y los controles de teclado para cámara y objetos
function setupGizmos() {
  gizmoMgr = new GizmoManager(scene);
  gizmoMgr.usePointerToAttachGizmos = false;
  gizmoMgr.positionGizmoEnabled = true;
  gizmoMgr.rotationGizmoEnabled = false;
  gizmoMgr.scaleGizmoEnabled = false;

  gizmoMgr.gizmos.positionGizmo?.onDragEndObservable.add(() => marcarSucio());

  scene.registerBeforeRender(() => {
    if (selectedMesh) clampToZone(selectedMesh);
  });
  scene.registerBeforeRender(() => {
    if (selectedMesh) enforceBlockCollision(selectedMesh);
  });

  const CAM_SPEED = Math.PI / 3; // Radianes por segundo, independiente de los FPS.
  const BETA_MIN = 0.20;
  const BETA_MAX = Math.PI / 2.05;
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
  });
}

// selecciona o deselecciona un objeto, maneja el highlight y los gizmos
function selectObject(node) {
  if (selectedMesh && highlightLayer) {
    try {
      selectedMesh.getChildMeshes().forEach(c => {
        try { highlightLayer.removeMesh(c); } catch (e) { }
      });
    } catch (e) { }
  }
  selectedMesh = node;
  if (!node) {
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
      try { highlightLayer.addMesh(c, new Color3(0.3, 0.6, 1.0)); } catch (e) { }
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
}

// detecta qué objeto tocó el usuario con el puntero
function setupPicking() {
  scene.onPointerObservable.add(pointerInfo => {
    if (pointerInfo.type !== PointerEventTypes.POINTERPICK) return;
    const hit = pointerInfo.pickInfo;
    if (!hit.hit || !hit.pickedMesh) { selectObject(null); return; }
    const mesh = hit.pickedMesh;
    if (mesh.name === 'ground' || mesh.name.startsWith('grid') || mesh.name.startsWith('zone') || mesh.name.startsWith('arrow')) { selectObject(null); return; }
    let node = mesh;
    while (node && !node.userData?.type) node = node.parent;
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
    const isWallWithOpening = (o.type === 'wall_block' || o.type === 'wall_madera') &&
      (o.node?.userData?.wallMode === 'puerta' || o.node?.userData?.wallMode === 'ventana');
    // Concreto: botón especial para eliminar (re-habilita modal). Lámpara: sin clonar. Pared con puerta/ventana: sin clonar. Resto: botón clonar.
    const actionBtn = isSlab
      ? `<span class="obj-clone-hint" style="color:rgba(255,100,100,.8)" title="Eliminar concreto" onclick="event.stopPropagation();deleteConcreto(${o.id})">🗑</span>`
      : (isLamp || isWallWithOpening)
        ? ''
        : `<span class="obj-clone-hint" onclick="event.stopPropagation();cloneObj(${o.id})">⧉</span>`;
    return `<div class="obj-item ${isSel ? 'sel' : ''}" title="Clic para seleccionar" onclick="selectFromList(${o.id})">
      <span>${o.emoji}</span><span>${o.label}${num}</span>${actionBtn}
    </div>`;
  }).join('');

  if (buildPhase >= 4) checkAndUpdateProgramarBtn();

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
  const btnWall = document.getElementById('btnWall');
  if (btnWall) { btnWall.disabled = true; btnWall.style.opacity = '0.45'; btnWall.title = 'Crea el concreto primero'; }
  const btnProg = document.getElementById('btnProgramar');
  if (btnProg) { btnProg.disabled = true; btnProg.style.opacity = '0.45'; btnProg.title = 'Completa los pasos anteriores'; }
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
  if (isNight || isStorm) {
    sunLight.intensity = isStorm ? 0.02 : 0.04; hemiLight.intensity = isStorm ? 0.03 : 0.06;
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
  if (!matematicasValidadas) {
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
  const vals = {};
  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    vals[m] = parseFloat(document.getElementById('inp-' + m)?.value) || 0;
  });
  const total = vals.cemento + vals.arena + vals.grava + vals.agua;
  const totalEl = document.getElementById('cmat-total-val');
  if (totalEl) totalEl.textContent = total.toLocaleString();

  ['cemento', 'arena', 'grava', 'agua'].forEach(m => {
    const seg = document.getElementById('cmat-bar-' + m);
    if (seg) seg.style.width = Math.min((vals[m] / CONCRETO_TOTAL) * 100, 100) + '%';
  });
}

function concretoMezclar() {
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
  root.userData = { id, type: 'concreto_slab_20', label: 'Concreto 20×20', emoji: '🪨', isMainSlab: true };
  objList.push({ id, type: 'concreto_slab_20', label: 'Concreto 20×20', emoji: '🪨', node: root });
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

// sistema de tormenta desactivado, se mantiene para no romper compatibilidad
function toggleStorm() { }
function startStorm() { }
function stopStorm() { }
function newRaindrop() {
  return {
    x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
    len: 10 + Math.random() * 20, speed: 8 + Math.random() * 10, opacity: 0.3 + Math.random() * 0.5
  };
}
function stormTick() {
  if (!rainCtx) return;
  rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  windLevel += (windTarget - windLevel) * 0.02;
  if (Math.random() < 0.005) { windDir *= -1; windTarget = 0.3 + Math.random() * 0.7; }
}
function applyWindPhysics() { }
function restoreWindPhysics() { }

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
  if (buildPhase < 4) return;
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
  if (buildPhase < 4) {
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

// cambia entre la pestaña de pared y piso en el modal del constructor
function switchWallTab(tab) {
  ['pared', 'piso'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('tab-content-' + t).style.display = t === tab ? '' : 'none';
  });
  if (tab === 'pared') wbUpdate();
  else { wpSelectedW = 20; wpSelectedD = 20; wpUpdate(); }
}

// constructor de pisos con tamaños fijos y validación de cobertura 20×20
let wpMatSelected = 'vitropiso';
let wpVitropisoColor = '#5ba8ff';
let wpSelectedW = 20;
let wpSelectedD = 20;

// Registro de m² de vitropiso ya colocados (suma de todos los floor_vitropiso)
function getVitropisoArea() {
  return objList
    .filter(o => o.type === 'floor_vitropiso')
    .reduce((sum, o) => sum + (o.area || 0), 0);
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

  if (coveredArea >= total) {
    if (previewEl) { previewEl.style.left = '100%'; previewEl.style.width = '0%'; }
    if (msgEl) { msgEl.textContent = '✅ ¡Piso completo! 400 / 400 m²'; msgEl.className = 'ok'; }
    if (btn) btn.disabled = true;
  } else if (coveredArea + newArea > total) {
    const maxAllowed = total - coveredArea;
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
    const after = coveredArea + newArea;
    if (msgEl) {
      msgEl.textContent = after === total
        ? `✅ ¡Perfecto! Completarás los 400 m²`
        : `Quedarán ${total - after} m² por cubrir`;
      msgEl.className = after === total ? 'ok' : '';
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

  const label = `Vitropiso ${w}×${d}`;
  root.userData = { id, type: 'floor_vitropiso', label, emoji: '🔷', color: hex };
  objList.push({ id, type: 'floor_vitropiso', label, emoji: '🔷', node: root, area: newArea, w, d });
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
  if (buildPhase >= 4) checkAndUpdateProgramarBtn();
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
  if (!concretoUnlocked) {
    showLockedMessage('Esta función aún no está disponible. Completa los pasos anteriores para desbloquear.');
    return;
  }
  document.getElementById('wall-overlay').classList.add('open');
  document.getElementById('tab-pared').style.display = '';
  document.getElementById('tab-piso').style.display = '';
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
  const bW = 1.0;
  const bH = wbMat === 'block' ? 0.7 : 0.2;
  const totalW = w * bW;
  const totalH = h * bH;

  // Calcular piezas reales (descontando huecos)
  let huecos = 0;
  if (wbWallMode === 'puerta') {
    // hueco central: 1 col × 4 filas (desde abajo)
    huecos = Math.min(4, h);
  } else if (wbWallMode === 'ventana') {
    // cada ventana ocupa 1 col × 2 filas (las 2 filas superiores)
    const ventRows = Math.min(2, h);
    huecos = wbVentanasCount * ventRows;
  }
  const piezas = Math.max(0, w * h - huecos);
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

  const blockColor = mat === 'block' ? '#9ca3af' : '#92400e';
  const blockStroke = mat === 'block' ? '#6b7280' : '#78350f';

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
  const bH = type === 'block' ? 0.7 : 0.2;
  const bD = type === 'block' ? 0.5 : 0.2;

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
      } else {
        mesh = MeshBuilder.CreateBox('wall_mad_' + id + '_' + row + '_' + col, { width: bW - 0.04, height: bH - 0.02, depth: bD }, scene);
        mesh.material = MAT.madera;
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
    doorRoot.userData = { id: doorId, type: 'puerta', label: 'Puerta', emoji: '🚪', embeddedInWall: id };
    objList.push({ id: doorId, type: 'puerta', label: 'Puerta', emoji: '🚪', node: doorRoot });
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
      winRoot.userData = { id: winId, type: 'ventana', label: 'Ventana', emoji: '🪟', embeddedInWall: id };
      objList.push({ id: winId, type: 'ventana', label: 'Ventana', emoji: '🪟', node: winRoot });
    });
    ventanas_colocadas += wbVentanasCount;
  }

  updateOpeningCounters();

  const modeTag = mode === 'puerta' ? ' + 🚪 Puerta' : mode === 'ventana' ? ` + 🪟 ${wbVentanasCount} Ventana(s)` : '';
  const label = `Pared ${type === 'block' ? 'Block' : 'Madera'} ${w}×${h}${modeTag}`;
  const emoji = type === 'block' ? '🧱' : '🪵';
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
async function entregarCasa() {
  const btn = document.getElementById('btnEntregar');
  if (btn.classList.contains('entregado')) {
    showLockedMessage('Ya entregaste tu casa. Puedes seguir editándola si quieres.');
    return;
  }
  if (!confirm('¿Entregar tu casa? Esto desbloqueará el Cuestionario del Proyecto en tu ruta de aprendizaje. Podrás seguir editando después si quieres.')) return;

  try {
    const res = await fetch('/api/entrega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ proyecto_id: 1 })
    });
    if (!res.ok) throw new Error((await res.json()).error || res.status);
    btn.classList.add('entregado');
    btn.title = 'Ya entregada';
    showSuccessMessage('🎉 ¡Casa entregada! Ya puedes ir al Cuestionario del Proyecto.');
  } catch (e) {
    showLockedMessage('No se pudo entregar: ' + e.message + '. Verifica que tu casa esté guardada.');
  }
}
window.entregarCasa = entregarCasa;

(async function chequearEntrega() {
  try {
    const res = await fetch('/api/entrega?proyecto_id=1', {
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
});

function snapshotActual() {
  const progreso = {
    buildPhase,
    concretoUnlocked,
    matematicasValidadas,
    puertas_colocadas,
    ventanas_colocadas,
    progSequence,
    focoState,
  };
  const estado = serializarEscena({ objList, objIdCounter, progreso });
  return { estado, progreso };
}

async function restaurarProgreso() {
  const data = await cargar();
  if (!data || !data.estado) return;

  const { estado, progreso } = data;

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

    const faseGuardada = buildPhase;
    if (faseGuardada >= 1 || matematicasValidadas) unlockPhase1();
    if (faseGuardada >= 2 || concretoUnlocked) unlockPhase2();
    if (faseGuardada >= 4) unlockAll();
    updateOpeningCounters();
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
      root.userData = { id: o.id, type: 'concreto_slab_20', label: 'Concreto 20×20', emoji: '🪨', isMainSlab: true };
      objList.push({ id: o.id, type: 'concreto_slab_20', label: 'Concreto 20×20', emoji: '🪨', node: root });

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

      const label = `Vitropiso ${w}×${d}`;
      root.userData = { id: o.id, type: 'floor_vitropiso', label, emoji: '🔷', color: hex };
      objList.push({ id: o.id, type: 'floor_vitropiso', label, emoji: '🔷', node: root, area: newArea, w, d });
    } else if (o.type === 'wall_block' || o.type === 'wall_madera') {
      const matType = o.type === 'wall_block' ? 'block' : 'madera';
      const mode = o.wallMode || 'simple';
      const w = o.w || 5;
      const h = o.d || 4;
      const bW = 1.0;
      const bH = matType === 'block' ? 0.7 : 0.2;
      const bD = matType === 'block' ? 0.5 : 0.2;

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
        customMat = (matType === 'block' ? MAT.block : MAT.madera).clone('wall_colored_' + o.id);
        customMat.albedoColor = new Color3(cr, cg, cb);
      }

      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          if (huecos.has(`${col},${row}`)) continue;
          const px = startX + col * bW;
          const py = (bH / 2) + row * bH;
          const mesh = MeshBuilder.CreateBox(
            'wall_' + matType + '_' + o.id + '_' + row + '_' + col,
            { width: bW - 0.04, height: bH - (matType === 'block' ? 0.04 : 0.02), depth: bD }, scene
          );
          mesh.material = customMat || (matType === 'block' ? MAT.block : MAT.madera);
          mesh.position.set(px, py, 0);
          mesh.receiveShadows = true;
          if (shadowGen) shadowGen.addShadowCaster(mesh, false);
          mesh.parent = root;
        }
      }

      const modeTag = mode === 'puerta' ? ' + 🚪 Puerta' : mode === 'ventana' ? ` + 🪟 ${ventCount} Ventana(s)` : '';
      const label = `Pared ${matType === 'block' ? 'Block' : 'Madera'} ${w}×${h}${modeTag}`;
      const emoji = matType === 'block' ? '🧱' : '🪵';
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
  camera.lowerRadiusLimit = 5; camera.upperRadiusLimit = 60;
  camera.upperBetaLimit = Math.PI / 2.05; camera.lowerBetaLimit = 0.18;
  camera.wheelDeltaPercentage = 0.008;
  camera.attachControl(canvas, true);

  camera.inputs.remove(camera.inputs.attached.keyboard);
  camera.inputs.remove(camera.inputs.attached.mousewheel);
  camera.inputs.remove(camera.inputs.attached.pointers);
  camera.inputs.add(new ArcRotateCameraMouseWheelInput());
  camera.wheelDeltaPercentage = 0.008;

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

  restaurarProgreso().then(() => {
    iniciarAutoguardado(snapshotActual);
  });

  P(68, 'Gizmos…');
  setupGizmos();

  P(78, 'Highlight…');
  highlightLayer = new HighlightLayer('hl', scene);
  highlightLayer.outerGlow = true;
  highlightLayer.blurHorizontalSize = 0.5; highlightLayer.blurVerticalSize = 0.5;

  P(86, 'Picking…'); setupPicking(); setupBlockContextMenu();

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
    objList.forEach(o => clampToZone(o.node));
    if (selectedMesh) {
      document.getElementById('xinfo').textContent =
        `${selectedMesh.userData?.emoji || ''} ${selectedMesh.userData?.label || ''}` +
        `  ·  X:${selectedMesh.position.x.toFixed(1)}` +
        `  Z:${selectedMesh.position.z.toFixed(1)}` +
        `  Y:${selectedMesh.position.y.toFixed(1)}` +
        `  ·  Rot:${(selectedMesh.rotation.y * 180 / Math.PI).toFixed(0)}°`;
    }
  });

  setInterval(() => { if (buildPhase >= 4) checkAndUpdateProgramarBtn(); }, 500);
};

init();