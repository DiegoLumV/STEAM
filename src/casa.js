// importamos todo lo que vamos a usar de Babylon.js v9
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
let isNight  = false;
let isStorm  = false;
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
// fase 0=solo concreto, 1=solo piso, 2=solo pared, 3=todo desbloqueado
let buildPhase = 0;

// estado del modal de mezcla de concreto
let concretoStep = 'cemento';
const CONCRETO_ORDER = ['cemento','arena','grava','agua'];
const CONCRETO_DONE = { cemento:false, arena:false, grava:false, agua:false };

// estado del constructor de pisos
let wpMat = 'block';

// tipos que se pueden colorear y referencia al objeto activo en el picker
const COLORABLE_TYPES = ['block','madera','puerta'];
let colorPickerTarget = null;

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
  MAT.ground    = pbr('ground',   [0.12, 0.15, 0.22], 0.98, 0.0);
  MAT.block     = pbr('block',    [0.62, 0.60, 0.56], 0.82, 0.02);
  MAT.madera    = pbr('madera',   [0.38, 0.24, 0.10], 0.72, 0.0);
  MAT.concreto  = pbr('concreto', [0.70, 0.68, 0.65], 0.78, 0.02);
  MAT.barillas  = pbr('barillas', [0.55, 0.58, 0.62], 0.25, 0.85);
  MAT.metal     = pbr('metal',    [0.60, 0.65, 0.75], 0.18, 0.90);
  MAT.trim      = pbr('trim',     [0.88, 0.90, 0.96], 0.60, 0.0);
  MAT.winFrame  = pbr('winF',     [0.85, 0.88, 0.94], 0.55, 0.0);
  MAT.wallLight = pbr('wallL',    [0.32, 0.55, 0.92], 0.70, 0.0);
  MAT.doorMat   = pbr('door',     [0.08, 0.14, 0.32], 0.55, 0.08);
  MAT.lampBase  = pbr('lampB',    [0.65, 0.68, 0.75], 0.20, 0.88);

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
  MAT.lampShade.diffuseColor  = new Color3(0.90, 0.80, 0.45);
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
    lines.push([new Vector3(-HALF,Y,i), new Vector3(HALF,Y,i)]);
    lines.push([new Vector3(i,Y,-HALF), new Vector3(i,Y,HALF)]);
    lineColors.push([dimC,dimC]); lineColors.push([dimC,dimC]);
  }
  MeshBuilder.CreateLineSystem('grid',{lines,colors:lineColors},scene).isPickable=false;

  // líneas más marcadas cada 5 unidades
  const maj=[], majC=[];
  const mC = new Color4(0.25,0.55,1.0,0.65);
  for (let i = -HALF; i <= HALF; i += 5) {
    maj.push([new Vector3(-HALF,Y+.001,i),new Vector3(HALF,Y+.001,i)]);
    maj.push([new Vector3(i,Y+.001,-HALF),new Vector3(i,Y+.001,HALF)]);
    majC.push([mC,mC]); majC.push([mC,mC]);
  }
  MeshBuilder.CreateLineSystem('grid_major',{lines:maj,colors:majC},scene).isPickable=false;

  // relleno semitransparente verde oscuro de la zona de construcción
  const fill = MeshBuilder.CreateGround('zone_fill',{width:ZONE*2,height:ZONE*2,subdivisions:1},scene);
  const fm = new PBRMaterial('zfm',scene);
  fm.albedoColor=new Color3(0.10,0.22,0.18); fm.roughness=0.98; fm.metallic=0.0; fm.alpha=0.50;
  fill.material=fm; fill.position.y=0.001; fill.isPickable=false; fill.receiveShadows=true;

  // borde brillante que delimita dónde puedes colocar cosas
  const zY=0.008, zC=new Color4(0.15,0.95,0.55,1.0);
  const zL=[
    [new Vector3(-ZONE,zY,-ZONE),new Vector3(ZONE,zY,-ZONE)],
    [new Vector3(ZONE,zY,-ZONE), new Vector3(ZONE,zY,ZONE)],
    [new Vector3(ZONE,zY,ZONE),  new Vector3(-ZONE,zY,ZONE)],
    [new Vector3(-ZONE,zY,ZONE), new Vector3(-ZONE,zY,-ZONE)],
  ];
  MeshBuilder.CreateLineSystem('zone_border',{lines:zL,colors:zL.map(()=>[zC,zC])},scene).isPickable=false;
  const zL2=zL.map(s=>s.map(v=>new Vector3(v.x,zY+.003,v.z)));
  MeshBuilder.CreateLineSystem('zone_border2',{lines:zL2,colors:zL2.map(()=>[zC,zC])},scene).isPickable=false;

  // marcas en las esquinas para que se vea más claro el límite
  const tY=0.010,tL=0.8,tC=new Color4(0.15,0.95,0.55,1.0);
  const tLines=[],tCols=[];
  [[-ZONE,-ZONE],[ZONE,-ZONE],[ZONE,ZONE],[-ZONE,ZONE]].forEach(([cx,cz])=>{
    const sx=cx<0?1:-1,sz=cz<0?1:-1;
    tLines.push([new Vector3(cx,tY,cz),new Vector3(cx+sx*tL,tY,cz)]);
    tLines.push([new Vector3(cx,tY,cz),new Vector3(cx,tY,cz+sz*tL)]);
    tCols.push([tC,tC]);tCols.push([tC,tC]);
  });
  MeshBuilder.CreateLineSystem('zone_ticks',{lines:tLines,colors:tCols},scene).isPickable=false;

  // flechas de dimensión que muestran el ancho y largo de la zona
  const aY=0.010,arC=new Color4(0.15,0.95,0.55,0.9),aLen=0.35;
  const bL=[
    [new Vector3(-ZONE,aY,-ZONE-1.4),new Vector3(ZONE,aY,-ZONE-1.4)],
    [new Vector3(-ZONE,aY,-ZONE-1.1),new Vector3(-ZONE,aY,-ZONE-1.7)],
    [new Vector3(ZONE,aY,-ZONE-1.1), new Vector3(ZONE,aY,-ZONE-1.7)],
    [new Vector3(-ZONE,aY,-ZONE-1.4),new Vector3(-ZONE+aLen,aY,-ZONE-1.4+aLen*.5)],
    [new Vector3(-ZONE,aY,-ZONE-1.4),new Vector3(-ZONE+aLen,aY,-ZONE-1.4-aLen*.5)],
    [new Vector3(ZONE,aY,-ZONE-1.4), new Vector3(ZONE-aLen,aY,-ZONE-1.4+aLen*.5)],
    [new Vector3(ZONE,aY,-ZONE-1.4), new Vector3(ZONE-aLen,aY,-ZONE-1.4-aLen*.5)],
  ];
  MeshBuilder.CreateLineSystem('arrow_h',{lines:bL,colors:bL.map(()=>[arC,arC])},scene).isPickable=false;
  const rL=[
    [new Vector3(ZONE+1.4,aY,-ZONE),new Vector3(ZONE+1.4,aY,ZONE)],
    [new Vector3(ZONE+1.1,aY,-ZONE),new Vector3(ZONE+1.7,aY,-ZONE)],
    [new Vector3(ZONE+1.1,aY,ZONE), new Vector3(ZONE+1.7,aY,ZONE)],
    [new Vector3(ZONE+1.4,aY,-ZONE),new Vector3(ZONE+1.4+aLen*.5,aY,-ZONE+aLen)],
    [new Vector3(ZONE+1.4,aY,-ZONE),new Vector3(ZONE+1.4-aLen*.5,aY,-ZONE+aLen)],
    [new Vector3(ZONE+1.4,aY,ZONE), new Vector3(ZONE+1.4+aLen*.5,aY,ZONE-aLen)],
    [new Vector3(ZONE+1.4,aY,ZONE), new Vector3(ZONE+1.4-aLen*.5,aY,ZONE-aLen)],
  ];
  MeshBuilder.CreateLineSystem('arrow_v',{lines:rL,colors:rL.map(()=>[arC,arC])},scene).isPickable=false;

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
    { id: 'wlbl_right',  p: new Vector3(ZONE + 1.4, 0.05, 0),   text: '20 m' },
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
      el.style.top  = Math.round(proj.y) + 'px';
    });
  });
}

// funciones que arman cada tipo de objeto con sus piezas y materiales
const BUILDERS = {
  block(root) {
    const b = box('blk_body',1.0,0.7,0.5,0,0.35,0,MAT.block);
    b.parent = root;
  },
  madera(root) {
    box('mad_body',1.0,0.2,0.2,0,0.1,0,MAT.madera).parent=root;
    for(let i=0;i<4;i++){
      const gm=new PBRMaterial('grain'+i+objIdCounter,scene);
      gm.albedoColor=new Color3(0.28,0.16,0.06);gm.roughness=0.9;
      box('mad_g'+i,0.01,0.2,0.2,-0.38+i*0.25,0.1,0,gm).parent=root;
    }
  },
  foco(root) {
    cyl('foco_base',0.14,0.14,0.05,0,0.025,0,MAT.lampBase,14).parent=root;
    cyl('foco_neck',0.05,0.05,0.12,0,0.10,0,MAT.lampBase,8).parent=root;
    const bulb=sph('foco_bulb',0.12,0,0.25,0,null);
    const bm=new StandardMaterial('focoM'+objIdCounter,scene);
    bm.emissiveColor=new Color3(1.0,0.95,0.75);
    bulb.material=bm;bulb.parent=root;
    const lpt=new PointLight('focoL'+objIdCounter,new Vector3(0,0.22,0),scene);
    lpt.intensity=0.9;lpt.range=8;lpt.diffuse=new Color3(1,0.92,0.65);lpt.parent=root;
  },
  puerta(root) {
    box('pta_fr',1.0,2.5,0.2,0,1.25,0,MAT.trim).parent=root;
    box('pta_leaf',0.9,2.3,0.08,0,1.25,0.07,MAT.doorMat).parent=root;
    [[-0.22,1.8],[0.22,1.8],[-0.22,1.1],[0.22,1.1]].forEach(([ox,oy],i)=>{
      box('pta_pan'+i,0.32,0.48,0.05,ox,oy,0.08,MAT.wallLight).parent=root;
    });
    const kn=cyl('pta_kn',0.025,0.025,0.22,0.28,1.2,0.12,MAT.metal,8);
    kn.rotation.x=Math.PI/2;kn.parent=root;
  },
  barillas(root) {
    [[-0.3,0],[0,0],[0.3,0]].forEach(([px,pz],i)=>{
      cyl('bar_rod'+i,0.025,0.025,1.4,px,0.7,pz,MAT.barillas,8).parent=root;
    });
    [0.25,0.65,1.05].forEach((y,i)=>{
      box('bar_wire'+i,0.7,0.018,0.018,0,y,0,MAT.barillas).parent=root;
    });
  },
  ventana(root) {
    box('win_fr',1.2,1.4,0.2,0,0.7,0,MAT.winFrame).parent=root;
    box('win_gl',1.0,1.2,0.08,0,0.7,0.07,MAT.glass).parent=root;
    box('win_h',1.0,0.05,0.11,0,0.7,0.08,MAT.winFrame).parent=root;
    box('win_v',0.05,1.2,0.11,0,0.7,0.08,MAT.winFrame).parent=root;
    box('win_sl',1.35,0.09,0.28,0,-0.02,0.09,MAT.trim).parent=root;
  },
  concreto(root) {
    box('con_body',1.0,0.2,1.0,0,0.1,0,MAT.concreto).parent=root;
    const lm=new PBRMaterial('conLines'+objIdCounter,scene);
    lm.albedoColor=new Color3(0.60,0.58,0.55);lm.roughness=0.9;
    box('con_l1',0.01,0.2,1.0,0.33,0.1,0,lm).parent=root;
    box('con_l2',0.01,0.2,1.0,-0.33,0.1,0,lm).parent=root;
  },
  vitropiso(root) {
    box('vit_body',1.0,0.04,1.0,0,0.02,0,MAT.vitropiso).parent=root;
    const gm=new PBRMaterial('grout'+objIdCounter,scene);
    gm.albedoColor=new Color3(0.82,0.82,0.85);gm.roughness=0.88;
    box('vit_gx',1.0,0.04,0.02,0,0.025,0,gm).parent=root;
    box('vit_gz',0.02,0.04,1.0,0,0.025,0,gm).parent=root;
  },
};

const LABELS = {block:'Block',madera:'Madera',foco:'Foco',puerta:'Puerta',barillas:'Barillas',ventana:'Ventana',concreto:'Concreto',vitropiso:'Vitropiso'};
const EMOJIS = {block:'🧱',madera:'🪵',foco:'💡',puerta:'🚪',barillas:'⚙',ventana:'🪟',concreto:'🪨',vitropiso:'🔷'};
const RESISTANCE = {block:0.9,concreto:0.95,barillas:0.85,vitropiso:0.7,madera:0.25,puerta:0.5,ventana:0.4,foco:0.3};

// límites de la zona de construcción y mínimo en Y
const BUILD_ZONE = 10;
const MIN_Y = 0;

function clampToZone(root) {
  const children = root.getChildMeshes();
  if (children.length === 0) {
    root.position.x = Math.max(-BUILD_ZONE + 0.5, Math.min(BUILD_ZONE - 0.5, root.position.x));
    root.position.z = Math.max(-BUILD_ZONE + 0.5, Math.min(BUILD_ZONE - 0.5, root.position.z));
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
  const limitX = BUILD_ZONE - halfW;
  const limitZ = BUILD_ZONE - halfD;
  root.position.x = Math.max(-limitX, Math.min(limitX, root.position.x));
  root.position.z = Math.max(-limitZ, Math.min(limitZ, root.position.z));
  if (root.position.y < MIN_Y) root.position.y = MIN_Y;
}

// desbloquea fases en orden: primero piso, luego paredes, luego todo
function unlockPhase1() {
  concretoUnlocked = true;
  buildPhase = 1;
  const btnWall = document.getElementById('btnWall');
  if (btnWall) btnWall.disabled = false;
  document.getElementById('cat-concreto').style.display = '';
  setTip('🎉 ¡Concreto creado! Ahora construye el piso con el botón 🧱 Construir');
}
function unlockPhase2() {
  buildPhase = 2;
  setTip('✅ ¡Piso construido! Ahora construye las paredes con el botón 🧱 Construir');
}
function unlockAll() {
  buildPhase = 3;
  document.getElementById('btnNight').disabled = false;
  ['cat-block','cat-madera','cat-foco','cat-puerta','cat-ventana','cat-vitropiso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('cat-disabled');
  });
  setTip('🏠 ¡Todo desbloqueado! Agrega elementos desde el panel izquierdo');
}

function addObjIfAllowed(type) {
  if (!concretoUnlocked || buildPhase < 3) {
    if (!concretoUnlocked) setTip('⚠ Primero debes crear el Concreto usando el botón 🪨 Crear Concreto');
    else setTip('⚠ Debes construir el piso y las paredes primero antes de agregar elementos');
    return;
  }
  addObj(type);
}

// coloca un nuevo objeto en la escena y lo registra en la lista
function addObj(type) {
  const id = objIdCounter++;
  const root = new TransformNode('obj_'+id+'_'+type, scene);
  root.position.x = (Math.random()-.5) * (BUILD_ZONE * 1.5);
  root.position.z = (Math.random()-.5) * (BUILD_ZONE * 1.5);
  root.position.y = 0;
  clampToZone(root);
  BUILDERS[type](root);
  root.getChildMeshes().forEach(m => {
    if (shadowGen) shadowGen.addShadowCaster(m, false);
  });
  root.userData = {id, type, label:LABELS[type], emoji:EMOJIS[type]};
  objList.push({id, type, label:LABELS[type], emoji:EMOJIS[type], node:root});
  updateObjListUI(); selectObject(root);
  setTip(`<b>${EMOJIS[type]} ${LABELS[type]}</b> añadido · Arrastra las flechas de colores para moverlo · Q/E para rotar`);
  if (COLORABLE_TYPES.includes(type)) openColorPicker(root);
}

// configura el gizmo de posición y los controles de teclado para cámara y objetos
function setupGizmos() {
  gizmoMgr = new GizmoManager(scene);
  gizmoMgr.usePointerToAttachGizmos = false;
  gizmoMgr.positionGizmoEnabled = true;
  gizmoMgr.rotationGizmoEnabled = false;
  gizmoMgr.scaleGizmoEnabled    = false;

  scene.registerBeforeRender(() => {
    if (selectedMesh) clampToZone(selectedMesh);
  });

  const CAM_STEP = Math.PI / 6;
  const BETA_MIN = 0.20;
  const BETA_MAX = Math.PI / 2.05;

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    let handled = false;
    switch (e.code) {
      case 'ArrowLeft':  camera.alpha -= CAM_STEP; handled = true; break;
      case 'ArrowRight': camera.alpha += CAM_STEP; handled = true; break;
      case 'ArrowUp':    camera.beta = Math.max(BETA_MIN, camera.beta - CAM_STEP); handled = true; break;
      case 'ArrowDown':  camera.beta = Math.min(BETA_MAX, camera.beta + CAM_STEP); handled = true; break;
      case 'KeyQ': if (selectedMesh) { selectedMesh.rotation.y -= Math.PI/12; handled=true; } break;
      case 'KeyE': if (selectedMesh) { selectedMesh.rotation.y += Math.PI/12; handled=true; } break;
      case 'KeyR': if (selectedMesh) { selectedMesh.rotation.x -= Math.PI/12; handled=true; } break;
      case 'KeyF': if (selectedMesh) { selectedMesh.rotation.x += Math.PI/12; handled=true; } break;
      case 'KeyT': if (selectedMesh) { selectedMesh.rotation.z -= Math.PI/12; handled=true; } break;
      case 'KeyG': if (selectedMesh) { selectedMesh.rotation.z += Math.PI/12; handled=true; } break;
      case 'KeyX': if (selectedMesh) { selectedMesh.rotation.x=0; selectedMesh.rotation.z=0; handled=true; } break;
    }
    if (handled) e.preventDefault();
  });
}

// selecciona o deselecciona un objeto, maneja el highlight y los gizmos
function selectObject(node) {
  if (selectedMesh && highlightLayer) {
    try {
      selectedMesh.getChildMeshes().forEach(c => {
        try { highlightLayer.removeMesh(c); } catch(e) {}
      });
    } catch(e) {}
  }
  selectedMesh = node;
  if (!node) {
    gizmoMgr.attachToMesh(null);
    document.getElementById('btnDel').style.display='none';
    document.getElementById('xinfo').style.display='none';
    closeColorPicker();
    updateObjListUI();
    setTip('Haz clic en un material del panel izquierdo para colocarlo · Scroll = zoom · Flechas ← → ↑ ↓ = rotar cámara');
    return;
  }
  if (highlightLayer) {
    node.getChildMeshes().forEach(c => {
      try { highlightLayer.addMesh(c, new Color3(0.3, 0.6, 1.0)); } catch(e) {}
    });
  }
  gizmoMgr.attachToNode(node);
  document.getElementById('btnDel').style.display='inline-block';
  document.getElementById('xinfo').style.display='block';
  updateObjListUI();
  setTip('✦ Arrastra flechas para mover · <b>Q/E</b> rotar · <b>R/F</b> inclinar eje X · <b>T/G</b> inclinar eje Z · <b>X</b> enderezar');
}

// detecta qué objeto tocó el usuario con el puntero
function setupPicking() {
  scene.onPointerObservable.add(pointerInfo => {
    if(pointerInfo.type!==PointerEventTypes.POINTERPICK)return;
    const hit=pointerInfo.pickInfo;
    if(!hit.hit||!hit.pickedMesh){selectObject(null);return;}
    const mesh=hit.pickedMesh;
    if(mesh.name==='ground'||mesh.name.startsWith('grid')||mesh.name.startsWith('zone')||mesh.name.startsWith('arrow')){selectObject(null);return;}
    let node=mesh;
    while(node&&!node.userData?.type)node=node.parent;
    if(node&&node.userData?.type){
      selectObject(node);
      const baseType = (node.userData.type||'').replace('wall_','').replace('floor_','');
      if(COLORABLE_TYPES.includes(baseType)) openColorPicker(node);
      else closeColorPicker();
    } else { selectObject(null); }
  });
}

// elimina el objeto seleccionado de la escena y de la lista
function deleteSelected() {
  if(!selectedMesh)return;
  const id=selectedMesh.userData?.id;
  if (highlightLayer) {
    try { selectedMesh.getChildMeshes().forEach(m=>{ try{highlightLayer.removeMesh(m);}catch(e){} }); } catch(e){}
  }
  gizmoMgr.attachToMesh(null);
  selectedMesh.getChildMeshes().forEach(m=>{
    if(shadowGen) try { shadowGen.removeShadowCaster(m); } catch(e){}
    m.dispose();
  });
  selectedMesh.dispose();
  objList=objList.filter(o=>o.id!==id);
  selectedMesh=null;
  updateObjListUI();
  document.getElementById('btnDel').style.display='none';
  document.getElementById('xinfo').style.display='none';
  setTip('Objeto eliminado');
}

// funciones auxiliares de la interfaz: lista de objetos, tooltip, etc.
function updateObjListUI() {
  const panel=document.getElementById('objlist');
  const items=document.getElementById('obj-items');
  const count=document.getElementById('obj-count');
  panel.style.display=objList.length>0?'block':'none';
  count.textContent=objList.length;

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
    return `<div class="obj-item ${isSel ? 'sel' : ''}" title="Clic para seleccionar · Doble clic para clonar" onclick="selectFromList(${o.id})" ondblclick="cloneObj(${o.id})">
      <span>${o.emoji}</span><span>${o.label}${num}</span><span class="obj-clone-hint" onclick="event.stopPropagation();cloneObj(${o.id})">⧉</span>
    </div>`;
  }).join('');

  if (buildPhase >= 3) checkAndUpdateProgramarBtn();
}

function selectFromList(id){
  const e=objList.find(o=>o.id===id);
  if(e){
    selectObject(e.node);
    const base = e.type.replace('wall_','').replace('floor_','');
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

  const newId = objIdCounter++;
  const root = new TransformNode('obj_' + newId + '_' + src.type, scene);
  root.position.x = src.node.position.x + 1.2;
  root.position.y = src.node.position.y;
  root.position.z = src.node.position.z + 1.2;
  root.rotation.y = src.node.rotation.y;

  const baseType = src.type;

  if (baseType.startsWith('wall_')) {
    const matType = baseType === 'wall_block' ? 'block' : 'madera';
    const bW = 1.0;
    const bH = matType === 'block' ? 0.7 : 0.2;
    const bD = matType === 'block' ? 0.5 : 0.2;
    const srcChildren = src.node.getChildMeshes();
    const yVals = [...new Set(srcChildren.map(m => Math.round(m.position.y * 100)))].sort((a,b)=>a-b);
    const xVals = [...new Set(srcChildren.map(m => Math.round(m.position.x * 100)))].sort((a,b)=>a-b);
    const rows = yVals.length;
    const cols = xVals.length;
    const startX = -(cols * bW / 2) + bW / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const mesh = MeshBuilder.CreateBox(
          'wall_' + matType + '_' + newId + '_' + row + '_' + col,
          { width: bW - 0.04, height: bH - (matType==='block'?0.04:0.02), depth: bD }, scene
        );
        mesh.material = matType === 'block' ? MAT.block : MAT.madera;
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
    const mat = floorType === 'vitropiso' ? MAT.vitropiso : floorType === 'madera' ? MAT.madera : MAT.block;
    const h = floorType === 'block' ? 0.12 : floorType === 'madera' ? 0.08 : 0.04;
    src.node.getChildMeshes().forEach(srcMesh => {
      const mesh = MeshBuilder.CreateBox(
        'floor_clone_' + newId + '_' + Math.random().toString(36).slice(2),
        { width: 0.97, height: h, depth: 0.97 }, scene
      );
      mesh.position.copyFrom(srcMesh.position);
      mesh.material = mat;
      mesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(mesh, false);
      mesh.parent = root;
    });
  } else if (BUILDERS[baseType]) {
    BUILDERS[baseType](root);
    root.getChildMeshes().forEach(m => { if (shadowGen) shadowGen.addShadowCaster(m, false); });
  }

  clampToZone(root);
  root.userData = { id: newId, type: src.type, label: src.label, emoji: src.emoji };
  objList.push({ id: newId, type: src.type, label: src.label, emoji: src.emoji, node: root });
  updateObjListUI();
  selectObject(root);
  if (COLORABLE_TYPES.includes(src.type) || COLORABLE_TYPES.includes(src.type.replace('wall_',''))) {
    openColorPicker(root);
  }
  setTip(`<b>${src.emoji} ${src.label}</b> clonado · Muévelo con las flechas o teclas`);
}

function toggleCatalog(){
  catOpen=!catOpen;
  document.getElementById('cat-list').style.display=catOpen?'block':'none';
  document.getElementById('cat-arrow').textContent=catOpen?'▲':'▼';
}
function setTip(html){
  document.getElementById('tip').innerHTML=html;
  document.getElementById('tip').style.opacity='1';
}

// alterna entre modo día y noche cambiando luces y colores de escena
function toggleNight() {
  isNight=!isNight;
  document.getElementById('btnNight').textContent=isNight?'☀ Día':'🌙 Noche';
  document.getElementById('btnNight').classList.toggle('active',isNight);
  applyLighting();
  if(isNight) execRulesByTrigger('es_de_noche');
}
function applyLighting() {
  if(isNight||isStorm){
    sunLight.intensity=isStorm?0.02:0.04; hemiLight.intensity=isStorm?0.03:0.06;
    scene.clearColor=new Color4(0.01,0.01,0.06,1);
    scene.fogColor=new Color3(0.01,0.02,0.08);
  } else {
    sunLight.intensity=2.8; hemiLight.intensity=0.65;
    scene.clearColor=new Color4(0.48,0.62,0.82,1);
    scene.fogColor=new Color3(0.45,0.58,0.78);
  }
}

// toda la lógica del modal de mezcla de concreto paso a paso
function openConcretoModal() {
  Object.keys(CONCRETO_DONE).forEach(k => CONCRETO_DONE[k] = false);
  concretoStep = 'cemento';
  document.getElementById('concreto-body').style.display = '';
  document.getElementById('concreto-resultado').style.display = 'none';
  CONCRETO_ORDER.forEach(mat => {
    document.getElementById('sl-'+mat).value = 1;
    document.getElementById('val-'+mat).textContent = '1';
    const row = document.getElementById('cmat-'+mat);
    row.classList.remove('cmat-locked');
    document.getElementById('sl-'+mat).disabled = false;
    document.getElementById('btn-'+mat).disabled = false;
  });
  document.getElementById('btn-mezclar').disabled = true;
  ['cemento','arena','grava','agua'].forEach(m => {
    document.getElementById('csim-fill-'+m).style.height = '0%';
  });
  document.getElementById('csim-status').textContent = 'Agrega los materiales en orden →';
  document.getElementById('concreto-overlay').classList.add('open');
}

function closeConcretoModal(e) {
  if (e && e.target !== document.getElementById('concreto-overlay')) return;
  document.getElementById('concreto-overlay').classList.remove('open');
}

function concretoSliderUpdate(mat) {
  document.getElementById('val-'+mat).textContent = document.getElementById('sl-'+mat).value;
}

function concretoAgregar(mat) {
  if (CONCRETO_DONE[mat]) return;
  CONCRETO_DONE[mat] = true;
  const val = parseInt(document.getElementById('sl-'+mat).value);
  const heights = { cemento: val*4, arena: val*6, grava: val*7, agua: val*5 };
  document.getElementById('csim-fill-'+mat).style.height = Math.min(heights[mat], 22) + '%';
  const matNames = { cemento:'Cemento ✅', arena:'Arena ✅', grava:'Grava ✅', agua:'Agua ✅' };
  const done = CONCRETO_ORDER.filter(m => CONCRETO_DONE[m]).map(m => matNames[m]);
  document.getElementById('csim-status').textContent = done.join(' · ');
  document.getElementById('btn-'+mat).disabled = true;
  document.getElementById('sl-'+mat).disabled = true;
  const allDone = CONCRETO_ORDER.every(m => CONCRETO_DONE[m]);
  if (allDone) {
    document.getElementById('btn-mezclar').disabled = false;
    document.getElementById('csim-status').textContent = '✅ ¡Todo listo! Presiona Mezclar';
  }
}

function concretoMezclar() {
  ['cemento','arena','grava','agua'].forEach(m => {
    document.getElementById('csim-fill-'+m).style.height = '0%';
  });
  setTimeout(() => { document.getElementById('csim-status').textContent = '🔀 Mezclando…'; }, 100);
  setTimeout(() => {
    document.getElementById('concreto-body').style.display = 'none';
    document.getElementById('concreto-resultado').style.display = '';
    concretoMedidaUpdate();
  }, 800);
}

function concretoMedidaUpdate() {
  const l = parseInt(document.getElementById('con-largo').value);
  const a = parseInt(document.getElementById('con-ancho').value);
  document.getElementById('val-con-largo').textContent = l;
  document.getElementById('val-con-ancho').textContent = a;
  document.getElementById('concreto-medida-info').textContent = `Área: ${l * a} m²`;
}

function concretoFinalizar(withMedidas) {
  if (withMedidas) {
    const l = parseInt(document.getElementById('con-largo').value);
    const a = parseInt(document.getElementById('con-ancho').value);
    const id = objIdCounter++;
    const root = new TransformNode('obj_'+id+'_concreto_slab', scene);
    root.position.set(0, 0, 0);
    const slab = MeshBuilder.CreateBox('con_slab_'+id, {width:a, height:0.2, depth:l}, scene);
    slab.material = MAT.concreto; slab.receiveShadows = true;
    slab.position.set(0, 0.1, 0);
    if (shadowGen) shadowGen.addShadowCaster(slab, false);
    slab.parent = root;
    clampToZone(root);
    root.userData = {id, type:'concreto', label:'Concreto', emoji:'🪨'};
    objList.push({id, type:'concreto', label:'Concreto', emoji:'🪨', node:root});
    updateObjListUI(); selectObject(root);
  }
  unlockPhase1();
  closeConcretoModal();
}

// sistema de tormenta desactivado, se mantiene para no romper compatibilidad
function toggleStorm() {}
function startStorm() {}
function stopStorm() {}
function newRaindrop() {
  return { x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
    len: 10+Math.random()*20, speed: 8+Math.random()*10, opacity: 0.3+Math.random()*0.5 };
}
function stormTick() {
  if(!rainCtx)return;
  rainCtx.clearRect(0,0,rainCanvas.width,rainCanvas.height);
  windLevel+=(windTarget-windLevel)*0.02;
  if(Math.random()<0.005){windDir*=-1;windTarget=0.3+Math.random()*0.7;}
}
function applyWindPhysics() {}
function restoreWindPhysics() {}

// valida que la casa tenga los elementos mínimos antes de habilitar programar
function validateHouse() {
  const hasCemento = objList.some(o => o.type === 'concreto' || o.type === 'concreto_slab');
  if (!hasCemento) return { ok: false, msg: '⚠ La casa necesita cemento (concreto).' };
  const hasParedes = objList.some(o => o.type === 'wall_block' || o.type === 'wall_madera');
  if (!hasParedes) return { ok: false, msg: '⚠ La casa necesita paredes.' };
  const hasColor = objList.some(o => {
    const node = o.node;
    return node && node.getChildMeshes().some(m => (m.material?.name || '').includes('_colored_'));
  });
  if (!hasColor) return { ok: false, msg: '⚠ La casa necesita al menos un color o estilo aplicado.' };
  const walls = objList.filter(o => o.type === 'wall_block' || o.type === 'wall_madera');
  const hasRoof = walls.some(o => Math.abs(o.node.rotation.x) > 0.1) ||
    objList.some(o => (o.type.startsWith('floor_') || o.type === 'concreto') && o.node.position.y > 1.5);
  if (!hasRoof) return { ok: false, msg: '⚠ La casa necesita un techo. Inclina una pared con R/F para formar el techo.' };
  return { ok: true };
}

function checkAndUpdateProgramarBtn() {
  if (buildPhase < 3) return;
  const result = validateHouse();
  const btn = document.getElementById('btnProgramar');
  if (!btn) return;
  btn.disabled = !result.ok;
  btn.title = result.ok ? '' : result.msg;
}

// lógica del sistema de programación por bloques de arrastrar y soltar
const TRIGGER_LABELS = {
  puerta_abre:'🚪 Puerta se abre', puerta_cierra:'🚪 Puerta se cierra', es_de_noche:'🌙 Es de noche'
};
const ACTION_LABELS = {
  encender_luz:'💡 Encender luz', apagar_luz:'🔆 Apagar luz', activar_alarma:'🚨 Activar alarma'
};

function openProgramar() {
  document.getElementById('prog-overlay').classList.add('open');
  renderProgRules();
}
function closeProgramar(e) {
  if(e&&e.target!==document.getElementById('prog-overlay'))return;
  document.getElementById('prog-overlay').classList.remove('open');
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.prog-block').forEach(el=>{
    el.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('prog-type',el.dataset.type);
      e.dataTransfer.setData('prog-val',el.dataset.val);
    });
  });
  const dropArea=document.getElementById('prog-drop-area');
  dropArea.addEventListener('dragover',e=>{e.preventDefault();dropArea.classList.add('drag-over');});
  dropArea.addEventListener('dragleave',()=>dropArea.classList.remove('drag-over'));
});

function dropBlock(e) {
  e.preventDefault();
  document.getElementById('prog-drop-area').classList.remove('drag-over');
  const type=e.dataTransfer.getData('prog-type');
  const val =e.dataTransfer.getData('prog-val');
  if(!type||!val)return;
  if(type==='trigger') {
    pendingTrigger=val;
    renderDropArea();
    document.getElementById('prog-output').textContent='⏳ Ahora arrastra un bloque de acción para completar la regla.';
  } else if(type==='action') {
    if(!pendingTrigger){ document.getElementById('prog-output').textContent='⚠ Primero arrastra un bloque de condición (Si).'; return; }
    progRules.push({trigger:pendingTrigger, action:val});
    pendingTrigger=null;
    renderDropArea();
    renderProgRules();
    document.getElementById('prog-output').textContent=`✅ Regla creada: ${TRIGGER_LABELS[progRules.at(-1).trigger]} → ${ACTION_LABELS[progRules.at(-1).action]}`;
  }
}

function renderDropArea() {
  const area=document.getElementById('prog-drop-area');
  area.innerHTML='';
  if(pendingTrigger) {
    const el=document.createElement('div');
    el.className='prog-pending-block trigger';
    el.textContent=TRIGGER_LABELS[pendingTrigger];
    area.appendChild(el);
    const hint=document.createElement('div');
    hint.className='prog-pending-hint';
    hint.textContent='+ Arrastra un bloque de acción aquí';
    area.appendChild(hint);
  } else {
    const hint=document.createElement('div');
    hint.id='prog-drop-hint';
    hint.textContent='Arrastra bloques aquí para crear reglas';
    area.appendChild(hint);
  }
}

function renderProgRules() {
  const list=document.getElementById('prog-rules-list');
  list.innerHTML=progRules.map((r,i)=>`
    <div class="prog-rule">
      <span class="rule-trigger">${TRIGGER_LABELS[r.trigger]}</span>
      <span class="rule-arrow">→</span>
      <span class="rule-action">${ACTION_LABELS[r.action]}</span>
      <span class="rule-del" onclick="deleteRule(${i})">✕</span>
    </div>`).join('');
}

function deleteRule(i) {
  progRules.splice(i,1);
  renderProgRules();
  document.getElementById('prog-output').textContent='🗑 Regla eliminada.';
}

function runProgram() {
  if(progRules.length===0){document.getElementById('prog-output').textContent='⚠ No hay reglas. Crea reglas arrastrando bloques.';return;}
  const VALID_COMBOS = [
    {trigger:'puerta_abre',  action:'encender_luz'},
    {trigger:'puerta_abre',  action:'activar_alarma'},
    {trigger:'puerta_cierra',action:'apagar_luz'},
    {trigger:'puerta_cierra',action:'activar_alarma'},
    {trigger:'es_de_noche',  action:'encender_luz'},
  ];
  const results=[];
  progRules.forEach(r=>{
    const isValidCombo = VALID_COMBOS.some(c => c.trigger===r.trigger && c.action===r.action);
    if (!isValidCombo) {
      results.push(`⚠ La regla "${TRIGGER_LABELS[r.trigger]} → ${ACTION_LABELS[r.action]}" no es una combinación válida.`);
    } else {
      execAction(r.action);
      results.push(`✅ ${TRIGGER_LABELS[r.trigger]} → ${ACTION_LABELS[r.action]}`);
    }
  });
  document.getElementById('prog-output').innerHTML = results.map(r=>`<div>${r}</div>`).join('');
}

function execAction(action) {
  if(action==='encender_luz') {
    objList.filter(o=>o.type==='foco').forEach(o=>{
      o.node.getChildMeshes().forEach(m=>{
        if(m.material&&m.material.emissiveColor) m.material.emissiveColor=new Color3(1.0,0.95,0.6);
      });
    });
  }
  if(action==='apagar_luz') {
    objList.filter(o=>o.type==='foco').forEach(o=>{
      o.node.getChildMeshes().forEach(m=>{
        if(m.material&&m.material.emissiveColor) m.material.emissiveColor=new Color3(0,0,0);
      });
    });
  }
  if(action==='activar_alarma') playAlarm();
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
  } catch(e) {}
}

function execRulesByTrigger(trigger) {
  const VALID_COMBOS = [
    {trigger:'puerta_abre',  action:'encender_luz'},
    {trigger:'puerta_abre',  action:'activar_alarma'},
    {trigger:'puerta_cierra',action:'apagar_luz'},
    {trigger:'puerta_cierra',action:'activar_alarma'},
    {trigger:'es_de_noche',  action:'encender_luz'},
  ];
  progRules.forEach(r=>{
    if(r.trigger===trigger) {
      const valid = VALID_COMBOS.some(c=>c.trigger===r.trigger&&c.action===r.action);
      if(valid) execAction(r.action);
    }
  });
}

// cambia entre la pestaña de pared y piso en el modal del constructor
function switchWallTab(tab) {
  ['pared','piso'].forEach(t => {
    document.getElementById('tab-'+t).classList.toggle('active', t === tab);
    document.getElementById('tab-content-'+t).style.display = t === tab ? '' : 'none';
  });
  if (tab === 'pared') wbUpdate();
  else wpUpdate();
}

// constructor de pisos, genera una cuadrícula de piezas según las dimensiones
let wpMatSelected = 'vitropiso';

function wpSelectMat(el) {
  document.querySelectorAll('#wp-mat-options .wb-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  wpMatSelected = el.dataset.mat;
  wpUpdate();
}

function wpUpdate() {
  const w = parseInt(document.getElementById('wp-width').value);
  const d = parseInt(document.getElementById('wp-depth').value);
  document.getElementById('wp-width-val').textContent = w;
  document.getElementById('wp-depth-val').textContent = d;
  document.getElementById('wp-total').textContent = (w * d) + ' piezas';
  document.getElementById('wp-dims').textContent = `${w.toFixed(0)} m × ${d.toFixed(0)} m`;
}

function buildFloor() {
  const w = parseInt(document.getElementById('wp-width').value);
  const d = parseInt(document.getElementById('wp-depth').value);
  const type = wpMatSelected;
  const id = objIdCounter++;
  const root = new TransformNode('obj_'+id+'_floor_'+type, scene);
  root.position.set(0, 0, 0);

  const mat = type === 'vitropiso' ? MAT.vitropiso : type === 'madera' ? MAT.madera : MAT.block;
  const h = type === 'block' ? 0.12 : type === 'madera' ? 0.08 : 0.06;
  const yOffset = type === 'vitropiso' ? 0.21 : 0;

  const startX = -(w / 2) + 0.5;
  const startZ = -(d / 2) + 0.5;
  for (let col = 0; col < w; col++) {
    for (let row = 0; row < d; row++) {
      const mesh = MeshBuilder.CreateBox(
        'floor_'+id+'_'+col+'_'+row,
        { width: 0.97, height: h, depth: 0.97 }, scene
      );
      mesh.position.set(startX + col, (h / 2) + yOffset, startZ + row);
      mesh.material = mat;
      mesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(mesh, false);
      mesh.parent = root;
    }
  }

  const emoji = type === 'vitropiso' ? '🔷' : type === 'madera' ? '🪵' : '🧱';
  const label = `Piso ${type==='vitropiso'?'Vitropiso':type==='madera'?'Madera':'Block'} ${w}×${d}`;
  root.userData = {id, type:'floor_'+type, label, emoji};
  objList.push({id, type:'floor_'+type, label, emoji, node:root});
  clampToZone(root);
  updateObjListUI();
  selectObject(root);
  closeWallBuilder();
  if (buildPhase === 1) unlockPhase2();
  setTip(`<b>${emoji} ${label}</b> creado · Arrastra flechas para mover · Q/E para rotar`);
}

// abre, cierra y aplica colores a los objetos que lo permiten
function openColorPicker(node) {
  if (!node) return;
  const type = node.userData?.type || '';
  const baseType = type.replace('wall_','').replace('floor_','');
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
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const col = new Color3(r,g,b);
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
  if (buildPhase >= 3) checkAndUpdateProgramarBtn();
}
function confirmColorPicker() {
  applyColorPicker();
  closeColorPicker();
  setTip('🎨 Color aplicado · Selecciona otro elemento para cambiar su color');
}

// construye una pared de bloques o madera con las dimensiones elegidas
let wbMat = 'block';

function openWallBuilder() {
  document.getElementById('wall-overlay').classList.add('open');
  document.getElementById('tab-pared').style.display = '';
  document.getElementById('tab-piso').style.display = '';
  if (buildPhase === 1) switchWallTab('piso');
  else switchWallTab('pared');
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
  document.getElementById('wb-width-val').textContent  = w;
  document.getElementById('wb-height-val').textContent = h;
  const bW = 1.0;
  const bH = wbMat === 'block' ? 0.7 : 0.2;
  const totalW = w * bW;
  const totalH = h * bH;
  document.getElementById('wb-total').textContent = w * h + ' piezas';
  document.getElementById('wb-dims').textContent  = `${totalW.toFixed(1)} m × ${totalH.toFixed(1)} m`;
  document.getElementById('wb-build-btn').disabled = false;
}

function buildWall() {
  const w = parseInt(document.getElementById('wb-width').value);
  const h = parseInt(document.getElementById('wb-height').value);
  const type = wbMat;
  const bW = 1.0;
  const bH = type === 'block' ? 0.7  : 0.2;
  const bD = type === 'block' ? 0.5  : 0.2;
  const id   = objIdCounter++;
  const root = new TransformNode('obj_'+id+'_wall_'+type, scene);
  root.position.set(0, 0, 0);
  const totalW = w * bW;
  const startX = -(totalW / 2) + bW / 2;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const px = startX + col * bW;
      const py = (bH / 2) + row * bH;
      let mesh;
      if (type === 'block') {
        mesh = MeshBuilder.CreateBox('wall_blk_'+id+'_'+row+'_'+col, { width: bW-0.04, height: bH-0.04, depth: bD }, scene);
        mesh.material = MAT.block;
      } else {
        mesh = MeshBuilder.CreateBox('wall_mad_'+id+'_'+row+'_'+col, { width: bW-0.04, height: bH-0.02, depth: bD }, scene);
        mesh.material = MAT.madera;
      }
      mesh.position.set(px, py, 0);
      mesh.receiveShadows = true;
      if (shadowGen) shadowGen.addShadowCaster(mesh, false);
      mesh.parent = root;
    }
  }

  const label = `Pared ${type === 'block' ? 'Block' : 'Madera'} ${w}×${h}`;
  const emoji = type === 'block' ? '🧱' : '🪵';
  root.userData = { id, type: 'wall_'+type, label, emoji };
  objList.push({ id, type: 'wall_'+type, label, emoji, node: root });

  clampToZone(root);
  updateObjListUI();
  selectObject(root);
  closeWallBuilder();
  if (buildPhase === 2) unlockAll();
  setTip(`<b>${emoji} ${label}</b> creada · Arrastra las flechas de colores para moverla · Flechas del teclado giran la cámara`);
}

// exponemos las funciones al scope global para que el HTML pueda llamarlas
Object.assign(window, {
  deleteSelected, toggleNight, openConcretoModal, closeConcretoModal,
  openWallBuilder, closeWallBuilder, openProgramar, closeProgramar,
  toggleCatalog, addObjIfAllowed, selectFromList, cloneObj,
  wbSelectMat, wbUpdate, buildWall,
  wpSelectMat, wpUpdate, buildFloor,
  switchWallTab,
  concretoSliderUpdate, concretoAgregar, concretoMezclar, concretoMedidaUpdate, concretoFinalizar,
  dropBlock, runProgram, deleteRule,
  openColorPicker, closeColorPicker, setSwatchColor, applyColorPicker, confirmColorPicker,
});

// función principal que arranca la escena, cámara, luces y todo lo demás
const init = () => {
  scene = new Scene(engine);
  scene.clearColor = new Color4(0.48,0.62,0.82,1);
  scene.fogMode    = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor   = new Color3(0.45,0.58,0.78);

  P(8,'Cámara…');
  camera = new ArcRotateCamera('cam',-Math.PI/2,0.95,30,new Vector3(0,0,0),scene);
  camera.lowerRadiusLimit=5; camera.upperRadiusLimit=60;
  camera.upperBetaLimit=Math.PI/2.05; camera.lowerBetaLimit=0.18;
  camera.wheelDeltaPercentage=0.008;
  camera.attachControl(canvas,true);

  camera.inputs.remove(camera.inputs.attached.keyboard);
  camera.inputs.remove(camera.inputs.attached.mousewheel);
  camera.inputs.remove(camera.inputs.attached.pointers);
  camera.inputs.add(new ArcRotateCameraMouseWheelInput());
  camera.wheelDeltaPercentage = 0.008;

  P(18,'Luces…');
  sunLight=new DirectionalLight('sun',new Vector3(-1,-2.2,-0.8),scene);
  sunLight.intensity=2.8; sunLight.diffuse=new Color3(1.0,0.96,0.88);
  sunLight.specular=new Color3(0.9,0.88,0.80); sunLight.position=new Vector3(30,55,20);
  hemiLight=new HemisphericLight('hemi',new Vector3(0,1,0),scene);
  hemiLight.intensity=0.65; hemiLight.diffuse=new Color3(0.55,0.72,0.98);
  hemiLight.groundColor=new Color3(0.12,0.20,0.38);

  P(28,'Sombras…');
  shadowGen=new ShadowGenerator(2048,sunLight);
  // sombras suaves con contact hardening, mejor que PCF en v9
  shadowGen.useContactHardeningShadows = true;
  shadowGen.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGen.bias=0.0008;
  shadowGen.normalBias=0.06;

  P(38,'Materiales…');  buildMaterials();
  P(52,'Plano…');       buildGround();

  P(68,'Gizmos…');
  setupGizmos();

  P(78,'Highlight…');
  highlightLayer=new HighlightLayer('hl',scene);
  highlightLayer.outerGlow=true;
  highlightLayer.blurHorizontalSize=0.5; highlightLayer.blurVerticalSize=0.5;

  P(86,'Picking…'); setupPicking();

  P(94,'Post-proceso…');
  const pp=new DefaultRenderingPipeline('pp',true,scene,[camera]);
  pp.fxaaEnabled=true;
  pp.bloomEnabled=true; pp.bloomThreshold=0.7; pp.bloomWeight=0.18; pp.bloomKernel=64; pp.bloomScale=0.5;
  pp.imageProcessingEnabled=true;
  pp.imageProcessing.contrast=1.12; pp.imageProcessing.exposure=1.05;
  pp.imageProcessing.toneMappingEnabled=true;
  pp.imageProcessing.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;

  // SSAO2 importado arriba, si no está disponible simplemente lo ignoramos
  try {
    const ssao=new SSAO2RenderingPipeline('ssao',scene,{ssaoRatio:0.5,blurRatio:1},[camera]);
    ssao.radius=2.0; ssao.totalStrength=1.0; ssao.base=0.12;
  } catch(e) { console.warn('SSAO no disponible:', e.message); }

  P(100,'¡Listo!');
  setTimeout(()=>{
    const l=document.getElementById('loading');
    l.style.opacity='0'; setTimeout(()=>l.style.display='none',900);
  },500);

  engine.runRenderLoop(()=>scene.render());
  window.addEventListener('resize',()=>{ engine.resize(); });

  scene.registerAfterRender(()=>{
    objList.forEach(o => clampToZone(o.node));
    if(selectedMesh){
      document.getElementById('xinfo').textContent=
        `${selectedMesh.userData?.emoji||''} ${selectedMesh.userData?.label||''}`+
        `  ·  X:${selectedMesh.position.x.toFixed(1)}`+
        `  Z:${selectedMesh.position.z.toFixed(1)}`+
        `  Y:${selectedMesh.position.y.toFixed(1)}`+
        `  ·  Rot:${(selectedMesh.rotation.y*180/Math.PI).toFixed(0)}°`;
    }
  });

  setInterval(()=>{ if(buildPhase>=3) checkAndUpdateProgramarBtn(); }, 500);
};

init();