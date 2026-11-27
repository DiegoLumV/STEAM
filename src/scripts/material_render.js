// material_render.js — Texturas procedurales sin imágenes externas (Presentación 20-nov, Bloque A).
// Todo se dibuja en un <canvas> de 256×256 px con Babylon.DynamicTexture; no se descarga ninguna imagen.
// Los dibujos son deterministas (mismo generador pseudoaleatorio con semilla fija): la misma casa se ve igual en cada carga.
// Los patrones son «tileables»: el borde derecho/inferior enlaza con el izquierdo/superior.

import { DynamicTexture, Texture, PBRMaterial, VertexBuffer } from '@babylonjs/core';

const TAM = 256;

// Generador pseudoaleatorio con semilla (mulberry32): evita Math.random para que las texturas sean reproducibles.
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const limitar = n => Math.max(0, Math.min(255, Math.round(n)));
const rgb = (r, g, b) => `rgb(${limitar(r)},${limitar(g)},${limitar(b)})`;
function hexARgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

// Crea la DynamicTexture, ejecuta `dibujar(ctx, TAM)` y la deja lista (repetición activada, filtrado trilineal).
function crearDinamica(scene, nombre, dibujar) {
  const tex = new DynamicTexture(nombre, { width: TAM, height: TAM }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  dibujar(tex.getContext(), TAM);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 4;
  return tex;
}

// Ladrillo común: fondo #8B4513, ladrillos de 32×16 px (proporción 2:1, como el ladrillo común de A.5: 0.25 × 0.12 m),
// juntas grises de 2 px y desfase de media pieza en las hileras impares. Variación de tono ±10 por ladrillo.
export function crearTexturaLadrillo(scene) {
  return crearDinamica(scene, 'tex_ladrillo', (ctx, n) => {
    const rnd = aleatorio(8);
    const [r, g, b] = hexARgb('#8B4513');
    ctx.fillStyle = '#9A9A9A';                                   // color de la junta (se ve en los huecos)
    ctx.fillRect(0, 0, n, n);
    const LADO = 32, ALTO = 16, JUNTA = 2;
    for (let fila = 0; fila < n / ALTO; fila++) {
      const desfase = (fila % 2) * (LADO / 2);
      for (let col = 0; col < n / LADO; col++) {
        const v = (rnd() - 0.5) * 20;                            // ±10 en cada canal
        ctx.fillStyle = rgb(r + v, g + v * 0.7, b + v * 0.5);
        const x = col * LADO + desfase, y = fila * ALTO + JUNTA / 2;
        ctx.fillRect(x + JUNTA / 2, y, LADO - JUNTA, ALTO - JUNTA);
        // la pieza que cruza el borde derecho continúa en el izquierdo, con el mismo tono: el patrón enlaza sin costura
        if (x + LADO > n) ctx.fillRect(x - n + JUNTA / 2, y, LADO - JUNTA, ALTO - JUNTA);
      }
    }
  });
}

// Tierra: fondo #6B4423 con variación aleatoria de ±15 en RGB, píxel a píxel.
export function crearTexturaTierra(scene) {
  return crearDinamica(scene, 'tex_tierra', (ctx, n) => {
    const rnd = aleatorio(15);
    const [r, g, b] = hexARgb('#6B4423');
    const img = ctx.getImageData(0, 0, n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = limitar(r + (rnd() * 30 - 15));
      img.data[i + 1] = limitar(g + (rnd() * 30 - 15));
      img.data[i + 2] = limitar(b + (rnd() * 30 - 15));
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
}

// Techo: fondo gris #808080 con líneas horizontales más oscuras cada 20 px (lámina).
export function crearTexturaTecho(scene) {
  return crearDinamica(scene, 'tex_techo', (ctx, n) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, n, n);
    ctx.fillStyle = '#5E5E5E';
    for (let y = 0; y < n; y += 20) ctx.fillRect(0, y, n, 2);
  });
}

// ── Bloque D · pisos ──

// Madera: fondo #A0522D con vetas verticales marrones (más claras y más oscuras) y una junta entre tablones cada 32 px.
export function crearTexturaMadera(scene) {
  return crearDinamica(scene, 'tex_madera', (ctx, n) => {
    const rnd = aleatorio(21);
    const [r, g, b] = hexARgb('#A0522D');
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(0, 0, n, n);
    const TABLON = 32;
    for (let k = 0; k < n / TABLON; k++) {                       // cada tablón con su propio tono (±8)
      const v = (rnd() - 0.5) * 16;
      ctx.fillStyle = rgb(r + v, g + v * 0.8, b + v * 0.6);
      ctx.fillRect(k * TABLON, 0, TABLON, n);
    }
    for (let i = 0; i < 260; i++) {                              // vetas verticales: líneas finas y casi verticales
      const x = rnd() * n, largo = 40 + rnd() * 160, y0 = rnd() * n, oscura = rnd() < 0.6;
      ctx.fillStyle = oscura ? `rgba(70,32,12,${0.10 + rnd() * 0.18})` : `rgba(200,130,80,${0.08 + rnd() * 0.14})`;
      for (const dy of [0, -n]) ctx.fillRect(x, y0 + dy, 1 + (rnd() < 0.25 ? 1 : 0), largo);   // dy = -n: la veta que sale por abajo entra por arriba
    }
    ctx.fillStyle = 'rgba(50,22,8,0.55)';                        // juntas entre tablones
    for (let k = 0; k < n / TABLON; k++) ctx.fillRect(k * TABLON, 0, 1, n);
  });
}

// Cerámica: fondo blanco #F5F5F5 con juntas grises cada 32 px (en los dos sentidos).
export function crearTexturaCeramica(scene) {
  return crearDinamica(scene, 'tex_ceramica', (ctx, n) => {
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, n, n);
    ctx.fillStyle = '#B4B4B4';
    for (let p = 0; p < n; p += 32) { ctx.fillRect(p, 0, 2, n); ctx.fillRect(0, p, n, 2); }
  });
}

// Concreto de piso (no es la textura de pared): gris #9A9A98 con grano fino y juntas de control cada 128 px.
export function crearTexturaConcreto(scene) {
  return crearDinamica(scene, 'tex_concreto_piso', (ctx, n) => {
    const rnd = aleatorio(33);
    const img = ctx.getImageData(0, 0, n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (rnd() - 0.5) * 18;
      img.data[i] = limitar(154 + v); img.data[i + 1] = limitar(154 + v); img.data[i + 2] = limitar(152 + v); img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = '#6E6E6C';
    for (let p = 0; p < n; p += 128) { ctx.fillRect(p, 0, 2, n); ctx.fillRect(0, p, n, 2); }
  });
}

// Textura de piso según el nombre de la habitación (sin mayúsculas ni tildes):
// baño / cocina → cerámica · sala (o salón) / comedor / dormitorio / habitación → madera · otro → concreto.
export function texturaPisoPorNombre(nombre) {
  const n = String(nombre ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('bano') || n.includes('cocina')) return 'ceramica';
  if (n.includes('sala') || n.includes('salon') || n.includes('comedor') || n.includes('dormitorio') || n.includes('habitacion')) return 'madera';
  return 'concreto';
}

// Aplica la textura al material PBR de la malla (si no tiene material, crea uno).
//  · Por defecto, uScale = vScale = 2 (la textura se repite 2 veces sobre las UV de la malla).
//  · Con `metrosPorTile`, las UV se recalculan desde las coordenadas del MUNDO (proyección por caras): el ladrillo mide
//    lo mismo en una pared de 3 m que en una de 8 m. En ese caso la textura queda con uScale = vScale = 1.
//  · Si el material tiene un albedo gris uniforme (p. ej. #B0B0B0 de las paredes del plano), la textura se compensa con
//    `level` para que el color final sea el de la textura y el color base del material no cambie.
export function aplicarTextura(mesh, textura, { metrosPorTile = null } = {}) {
  if (!mesh || !textura) return false;
  let mat = mesh.material;
  if (!mat) {
    mat = new PBRMaterial('mat_' + mesh.name, mesh.getScene());
    mat.roughness = 0.85; mat.metallic = 0;
    mesh.material = mat;
  }
  if (!('albedoTexture' in mat)) return false;                   // material sin canal de albedo (no debería ocurrir con PBR)
  const c = mat.albedoColor;
  if (c && Math.abs(c.r - c.g) < 1e-6 && Math.abs(c.g - c.b) < 1e-6 && c.r > 0 && c.r < 0.999) {
    textura.level = Math.min(4, 1 / aLineal(c.r));
  }
  mat.albedoTexture = textura;
  if (metrosPorTile) { textura.uScale = 1; textura.vScale = 1; proyectarUVMundo(mesh, metrosPorTile); }
  else { textura.uScale = 2; textura.vScale = 2; }
  return true;
}

const aLineal = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

// Reescribe las UV de la malla con proyección por caras en coordenadas del mundo: cada vértice usa los dos ejes
// perpendiculares a la normal dominante de su cara (pared este/oeste → (z, y); norte/sur → (x, y); horizontal → (x, z)).
// Funciona con cajas, suelos y mallas fundidas (cada cara tiene sus propios vértices). Devuelve false si no hay datos.
export function proyectarUVMundo(mesh, metrosPorTile = 2) {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
  const nor = mesh.getVerticesData(VertexBuffer.NormalKind);
  if (!pos || !nor || !(metrosPorTile > 0)) return false;
  mesh.computeWorldMatrix(true);
  const m = mesh.getWorldMatrix().m;
  const n = pos.length / 3;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
    const wx = x * m[0] + y * m[4] + z * m[8] + m[12];
    const wy = x * m[1] + y * m[5] + z * m[9] + m[13];
    const wz = x * m[2] + y * m[6] + z * m[10] + m[14];
    const nx = Math.abs(nor[3 * i] * m[0] + nor[3 * i + 1] * m[4] + nor[3 * i + 2] * m[8]);
    const ny = Math.abs(nor[3 * i] * m[1] + nor[3 * i + 1] * m[5] + nor[3 * i + 2] * m[9]);
    const nz = Math.abs(nor[3 * i] * m[2] + nor[3 * i + 1] * m[6] + nor[3 * i + 2] * m[10]);
    let u, v;
    if (nx >= ny && nx >= nz) { u = wz; v = wy; }
    else if (nz >= ny) { u = wx; v = wy; }
    else { u = wx; v = wz; }
    uv[2 * i] = u / metrosPorTile;
    uv[2 * i + 1] = v / metrosPorTile;
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uv, false);
  return true;
}
