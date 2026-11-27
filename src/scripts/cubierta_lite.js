// cubierta_lite.js — Techo a dos aguas simple (Presentación 20-nov, Bloque B).
// Dos faldones inclinados + dos frontones triangulares que cierran los extremos. Pendiente 27 % (A.9, fibrocemento
// recomendada: Manual de Materiales de Construcción, Tabla A.9). La cumbrera corre a lo largo del lado MÁS LARGO de las
// habitaciones, de modo que la luz que salvan los faldones es el lado corto: altura de cumbrera = 0.27 × (luz / 2).
// No hace ninguna fuente de datos propia: recibe el rectángulo envolvente y devuelve un objeto agregado.

import { MeshBuilder, TransformNode, PBRMaterial, VertexData, Mesh, Color3 } from '@babylonjs/core';
import { aplicarTextura } from './material_render.js';

export const CUBIERTA_PENDIENTE = 0.27;     // A.9 · fibrocemento_recomendada (tangente: 27 %)
export const CUBIERTA_VOLADIZO = 0.5;       // m, en los 4 lados
export const CUBIERTA_ESPESOR = 0.06;       // m, grosor de cada faldón
export const CUBIERTA_ALTURA_PARED = 2.8;   // m, altura por defecto de las paredes del plano (F4d)
const GROSOR_PARED = 0.15;                  // m (F4d): los frontones cubren el grosor de la pared

const esNum = n => typeof n === 'number' && Number.isFinite(n);
const mil = n => Math.round(n * 1000) / 1000;

// Rectángulo que engloba todas las habitaciones { minX, maxX, minZ, maxZ } (m). null si no hay habitaciones válidas.
export function calcularBoundingBoxHabitaciones(habitaciones) {
  if (!Array.isArray(habitaciones)) return null;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, n = 0;
  for (const h of habitaciones) {
    if (!h || ![h.x, h.z, h.ancho, h.largo].every(esNum) || h.ancho <= 0 || h.largo <= 0) continue;
    minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x + h.ancho);
    minZ = Math.min(minZ, h.z); maxZ = Math.max(maxZ, h.z + h.largo);
    n++;
  }
  return n ? { minX: mil(minX), maxX: mil(maxX), minZ: mil(minZ), maxZ: mil(maxZ) } : null;
}

// Geometría (m) de la cubierta para un rectángulo: luz (lado corto), largo (lado largo), cumbrera y orientación. Función pura.
export function medidasCubierta(bbox, { alturaPared = CUBIERTA_ALTURA_PARED, pendiente = CUBIERTA_PENDIENTE, voladizo = CUBIERTA_VOLADIZO } = {}) {
  const dx = bbox.maxX - bbox.minX, dz = bbox.maxZ - bbox.minZ;
  const cumbreraEnZ = dx <= dz;                       // la cumbrera corre a lo largo del lado largo
  const luz = Math.min(dx, dz), largo = Math.max(dx, dz);
  const alturaCumbrera = alturaPared + pendiente * (luz / 2);
  return {
    luz, largo, cumbreraEnZ, alturaCumbrera, pendiente, voladizo, alturaPared,
    elevacion: pendiente * (luz / 2),                 // 0.27 × (luz / 2): lo que sube la cumbrera sobre la parte alta de las paredes
    cx: (bbox.minX + bbox.maxX) / 2, cz: (bbox.minZ + bbox.maxZ) / 2,
  };
}

// Fronton triangular (prisma de grosor `grosor`) con su base en y = 0 (local) y el vértice en y = alto. Normales planas.
function crearFronton(scene, nombre, semiLuz, alto, grosor) {
  const t = grosor / 2;
  const A = [-semiLuz, 0], B = [semiLuz, 0], C = [0, alto];
  const posiciones = [], indices = [];
  const cara = (puntos) => {                          // polígono convexo en el orden dado; cada cara con sus vértices
    const o = posiciones.length / 3;
    puntos.forEach(p => posiciones.push(...p));
    for (let i = 1; i < puntos.length - 1; i++) indices.push(o, o + i, o + i + 1);
  };
  cara([[A[0], A[1], -t], [C[0], C[1], -t], [B[0], B[1], -t]]);   // cara trasera
  cara([[A[0], A[1], t], [B[0], B[1], t], [C[0], C[1], t]]);      // cara delantera
  cara([[A[0], A[1], -t], [B[0], B[1], -t], [B[0], B[1], t], [A[0], A[1], t]]);   // base
  cara([[A[0], A[1], -t], [A[0], A[1], t], [C[0], C[1], t], [C[0], C[1], -t]]);   // lado izquierdo
  cara([[B[0], B[1], -t], [C[0], C[1], -t], [C[0], C[1], t], [B[0], B[1], t]]);   // lado derecho
  const normales = [];
  VertexData.ComputeNormals(posiciones, indices, normales);
  const vd = new VertexData();
  vd.positions = posiciones; vd.indices = indices; vd.normals = normales;
  const m = new Mesh(nombre, scene);
  vd.applyToMesh(m);
  return m;
}

// Crea la cubierta y la devuelve como objeto agregado { tipo: 'cubierta', nodo, meshes, bbox, ...medidas }.
// `texturaTecho`: textura de los faldones (si es null, gris liso). `opciones.texturaFronton`: textura de los frontones (ladrillo).
// Todo cuelga de UN TransformNode; no es seleccionable ni colisionable. Si algo falla, libera lo creado y relanza el error.
export function crearCubierta(scene, bbox, texturaTecho, opciones = {}) {
  if (!bbox || ![bbox.minX, bbox.maxX, bbox.minZ, bbox.maxZ].every(esNum)) throw new Error('crearCubierta: rectángulo no válido');
  const med = medidasCubierta(bbox, opciones);
  const { luz, largo, alturaPared, pendiente, voladizo, elevacion } = med;
  const nodo = new TransformNode('cubierta_plano', scene);
  nodo.position.set(med.cx, 0, med.cz);
  nodo.rotation.y = med.cumbreraEnZ ? 0 : Math.PI / 2;           // en local la cumbrera siempre corre a lo largo de z
  nodo.metadata = { generadoPorPlano: true, tipo: 'cubierta' };
  nodo.userData = { generadoPorPlano: true, tipo: 'cubierta' };
  const meshes = [];
  try {
    const mat = new PBRMaterial('cubierta_plano', scene);
    mat.albedoColor = texturaTecho ? new Color3(1, 1, 1) : new Color3(0.5, 0.5, 0.5);
    mat.roughness = 0.7; mat.metallic = 0.1;
    const matFronton = new PBRMaterial('cubierta_fronton', scene);
    matFronton.albedoColor = opciones.texturaFronton ? new Color3(1, 1, 1) : new Color3(0.69, 0.69, 0.69);
    matFronton.roughness = 0.85; matFronton.metallic = 0;
    matFronton.backFaceCulling = false; matFronton.twoSidedLighting = true;   // el fronton es un prisma sencillo: se ve bien desde ambos lados

    const theta = Math.atan(pendiente);
    const recorrido = luz / 2 + voladizo;                          // desde el borde del alero hasta la cumbrera (horizontal)
    const yCumbrera = alturaPared + elevacion;                     // cumbrera = 0.27 × (luz / 2) sobre la parte alta de las paredes
    const largoFaldon = recorrido / Math.cos(theta);
    const profundidad = largo + 2 * voladizo;
    const dEsp = CUBIERTA_ESPESOR / (2 * Math.cos(theta)) + 0.01;  // la cara inferior del faldón apoya sobre la parte alta de las paredes (+1 cm: sin parpadeo entre superficies)
    for (const lado of [-1, 1]) {                                  // -1 faldón de menor x (local), +1 el de mayor x
      const f = MeshBuilder.CreateBox(`cubierta_faldon_${lado < 0 ? 1 : 2}`, { width: largoFaldon, height: CUBIERTA_ESPESOR, depth: profundidad }, scene);
      f.parent = nodo;
      f.position.set(lado * recorrido / 2, yCumbrera - pendiente * recorrido / 2 + dEsp, 0);
      f.rotation.z = -lado * theta;                                // sube hacia la cumbrera (x = 0)
      f.material = mat;
      meshes.push(f);
    }
    for (const lado of [-1, 1]) {                                  // frontones: cierran el hueco triangular bajo los faldones en los extremos
      const alto = Math.max(0.01, elevacion);                      // el vértice del fronton llega justo a la cara inferior de los faldones
      const fr = crearFronton(scene, `cubierta_fronton_${lado < 0 ? 1 : 2}`, luz / 2 + GROSOR_PARED / 2, alto, GROSOR_PARED);
      fr.parent = nodo;
      fr.position.set(0, alturaPared, lado * largo / 2);
      fr.material = matFronton;
      meshes.push(fr);
    }
    for (const m of meshes) {
      m.isPickable = false; m.checkCollisions = false; m.receiveShadows = true;
      m.metadata = { generadoPorPlano: true, tipo: 'cubierta' };
    }
    nodo.computeWorldMatrix(true);
    meshes.forEach(m => m.computeWorldMatrix(true));
    if (texturaTecho) meshes.filter(m => m.name.startsWith('cubierta_faldon')).forEach(m => aplicarTextura(m, texturaTecho, { metrosPorTile: 2 }));
    if (opciones.texturaFronton) meshes.filter(m => m.name.startsWith('cubierta_fronton')).forEach(m => aplicarTextura(m, opciones.texturaFronton, { metrosPorTile: 2 }));
  } catch (err) {
    meshes.forEach(m => m.dispose());
    nodo.dispose();
    throw err;
  }
  return { tipo: 'cubierta', nodo, meshes, bbox: { ...bbox }, ...med };
}
