// scripts/guardado.js
// Snapshot del estado de la escena. NO reemplaza a telemetria.js:
// telemetría = historial de eventos (analítica), esto = foto para reanudar.

const API_BASE = '/api';
export const SCHEMA_VERSION = 1;

const AUTOSAVE_MS = 30000;
const DEBOUNCE_MS = 4000;
let getSnapshot = null;
let proyectoId = 1, slot = 1;

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

const r3 = n => Math.round(n * 1000) / 1000;

export function serializarObjeto(o) {
  const n = o.node;
  const ud = n.userData || {};
  const e = {
    id: o.id,
    type: o.type,
    p: [r3(n.position.x), r3(n.position.y), r3(n.position.z)],
    r: [r3(n.rotation.x), r3(n.rotation.y), r3(n.rotation.z)]
  };
  if (n.scaling && (n.scaling.x !== 1 || n.scaling.y !== 1 || n.scaling.z !== 1))
    e.s = [r3(n.scaling.x), r3(n.scaling.y), r3(n.scaling.z)];
  if (ud.color) e.color = ud.color;
  if (ud.wallMode) e.wallMode = ud.wallMode;
  if (ud.embeddedInWall) e.embeddedInWall = ud.embeddedInWall;
  if (o.area != null) e.area = o.area;
  if (o.w != null) e.w = o.w;
  if (o.d != null) e.d = o.d;
  return e;
}

export function serializarEscena({ objList, objIdCounter, progreso = {} }) {
  return {
    v: SCHEMA_VERSION,
    objetos: objList.map(serializarObjeto),
    contador: objIdCounter,
    progreso
  };
}

export async function guardar(force = false) {
  if (!getSnapshot || guardando || (!dirty && !force)) return;
  guardando = true;
  const { estado, progreso } = getSnapshot();
  try {
    const res = await fetch(`${API_BASE}/guardado`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ proyecto_id: proyectoId, slot, estado, progreso })
    });
    if (!res.ok) throw new Error((await res.json()).error || res.status);
    dirty = false;
    document.dispatchEvent(new CustomEvent('guardado:ok', { detail: new Date() }));
  } catch (err) {
    console.warn('No se pudo guardar:', err.message);
    document.dispatchEvent(new CustomEvent('guardado:error', { detail: err.message }));
  } finally {
    guardando = false;
  }
}

export async function cargar() {
  try {
    const res = await fetch(`${API_BASE}/guardado?proyecto_id=${proyectoId}&slot=${slot}`, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn('No se pudo cargar el progreso:', err.message);
    return null;
  }
}

export async function reiniciar() {
  await fetch(`${API_BASE}/guardado?proyecto_id=${proyectoId}&slot=${slot}`, {
    method: 'DELETE', headers: headers()
  });
  dirty = false;
}


export function marcarSucio() {
  dirty = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => guardar(), DEBOUNCE_MS);
}


export function iniciarAutoguardado(snapshotFn, opts = {}) {
  getSnapshot = snapshotFn;
  proyectoId = opts.proyecto_id ?? 1;
  slot = opts.slot ?? 1;
  autosaveTimer = setInterval(() => guardar(), AUTOSAVE_MS);


  window.addEventListener('pagehide', flushBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeacon();
  });
}

function flushBeacon() {
  if (!dirty || !getSnapshot) return;
  const { estado, progreso } = getSnapshot();
  const blob = new Blob([JSON.stringify({
    proyecto_id: proyectoId, slot, estado, progreso,
    token: localStorage.getItem('token')
  })], { type: 'application/json' });
  navigator.sendBeacon(`${API_BASE}/guardado/beacon`, blob);
  dirty = false;
}

export function detenerAutoguardado() {
  clearInterval(autosaveTimer);
  clearTimeout(debounceTimer);
}