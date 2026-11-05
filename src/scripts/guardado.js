// src/scripts/guardado.js
// Snapshot del estado de la escena. NO reemplaza a telemetria.js:
// telemetría = historial de eventos (analítica), esto = foto para reanudar.


const API_BASE = '/api';
export const SCHEMA_VERSION = 2;

const AUTOSAVE_MS = 30000;      // guardado periódico
const DEBOUNCE_MS = 4000;       // guardado tras una acción del usuario
let autosaveTimer = null, debounceTimer = null;
let dirty = false, guardando = false;
let reiniciando = false;        // true durante un reinicio y hasta la recarga: bloquea todo PUT y beacon
const ESPERA_PUT_REINICIO_MS = 15000; // máximo que reiniciar() espera a un PUT en curso antes de abandonar
let revision = 0;
let ultimoErrorGuardado = null; // mensaje del último intento fallido (null si el último guardado fue correcto)
let getSnapshot = null;         // callback que provee casa.js
let proyectoId = parseInt(new URLSearchParams(window.location.search).get('proyecto') || 1, 10);
let vistaAlumnoId = new URLSearchParams(window.location.search).get('alumno'); // Si un maestro/admin está viendo
let slot = 1;

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

const r3 = n => Math.round(n * 1000) / 1000;

/* ── Serialización: solo lo que NO se puede recalcular ── */
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
  if (ud.cutFactor != null && ud.cutFactor < 1) e.cutFactor = ud.cutFactor;
  if (ud.wallMode) e.wallMode = ud.wallMode;
  if (ud.embeddedInWall) e.embeddedInWall = ud.embeddedInWall;
  if (ud.roofShape) e.roofShape = ud.roofShape;
  if (ud.roofMat) e.roofMat = ud.roofMat;
  if (ud.roofH != null) e.roofH = ud.roofH;
  if (o.area != null) e.area = o.area;
  if (o.w != null) e.w = o.w;
  if (o.d != null) e.d = o.d;
  if (o.h != null) e.h = o.h;
  return e;
}

export function serializarEscena({ objList, objIdCounter, progreso = {} }) {
  return {
    v: SCHEMA_VERSION,
    objetos: objList.map(serializarObjeto),
    contador: objIdCounter,
    progreso,
    // v2 (aditivo): el servidor vuelve a derivar terreno de la columna progreso y conserva los hitos existentes
    terreno: { excavacion: progreso.excavacion ?? null },
    hitos: {}
  };
}

/* ── API ── */
export async function guardar(force = false) {
  if (vistaAlumnoId) return; // Si es maestro viendo alumno, no se guarda!
  if (reiniciando) return;   // reinicio en curso: ningún PUT nuevo puede restaurar el estado anterior
  if (!getSnapshot || guardando || (!dirty && !force)) return;
  guardando = true;
  document.dispatchEvent(new CustomEvent('guardado:guardando'));
  const { estado, progreso } = getSnapshot();
  const savedRevision = revision;
  try {
    const res = await fetch(`${API_BASE}/guardado`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ proyecto_id: proyectoId, slot, estado, progreso })
    });
    if (!res.ok) throw new Error((await res.json()).error || res.status);
    ultimoErrorGuardado = null;
    dirty = revision !== savedRevision;
    document.dispatchEvent(new CustomEvent(dirty ? 'guardado:pendiente' : 'guardado:ok', { detail: new Date() }));
  } catch (err) {
    ultimoErrorGuardado = err.message;
    console.warn('No se pudo guardar:', err.message);
    document.dispatchEvent(new CustomEvent('guardado:error', { detail: err.message }));
  } finally {
    guardando = false;
  }
}

/* Antes de entregar: espera el guardado en curso y guarda lo pendiente.
   Reutiliza guardar() (un solo PUT a la vez); lanza error si no queda guardado. */
export async function asegurarGuardado() {
  if (vistaAlumnoId || !getSnapshot) return;
  clearTimeout(debounceTimer);
  for (let i = 0; i < 5; i++) {
    while (guardando) await new Promise(r => setTimeout(r, 50));
    if (!dirty) return;
    await guardar();
    if (ultimoErrorGuardado) throw new Error('no se pudo guardar tu casa (' + ultimoErrorGuardado + ')');
  }
  if (dirty) throw new Error('no se pudo guardar tu casa');
}

export async function cargar() {
  try {
    let url = `${API_BASE}/guardado?proyecto_id=${proyectoId}&slot=${slot}`;
    if (vistaAlumnoId) url += `&alumno_id=${vistaAlumnoId}`;
    const res = await fetch(url, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn('No se pudo cargar el progreso:', err.message);
    return null;
  }
}

/* Reinicio seguro: ningún PUT ni beacon puede volver a crear el guardado después del DELETE.
   1) bloquea guardados nuevos, 2) detiene los temporizadores, 3) espera el PUT en curso,
   4) borra. Si el borrado tiene éxito el bloqueo se mantiene hasta que la página se recargue;
   si falla (o el PUT no termina), se restaura el funcionamiento normal del autoguardado. */
export async function reiniciar() {
  if (reiniciando) throw new Error('Ya hay un reinicio en curso');
  reiniciando = true;
  const teniaAutoguardado = autosaveTimer !== null;
  clearInterval(autosaveTimer); autosaveTimer = null;
  clearTimeout(debounceTimer);
  const restaurar = () => {
    reiniciando = false;
    if (teniaAutoguardado && !vistaAlumnoId) autosaveTimer = setInterval(() => guardar(), AUTOSAVE_MS);
    if (dirty) { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => guardar(), DEBOUNCE_MS); }
  };
  try {
    const limite = Date.now() + ESPERA_PUT_REINICIO_MS;
    while (guardando) {
      if (Date.now() > limite) throw new Error('No se pudo reiniciar: hay un guardado sin terminar');
      await new Promise(r => setTimeout(r, 50));
    }
    const res = await fetch(`${API_BASE}/guardado?proyecto_id=${proyectoId}&slot=${slot}`, {
      method: 'DELETE', headers: headers()
    });
    if (!res.ok) throw new Error('No se pudo reiniciar el proyecto');
  } catch (e) {
    restaurar();
    throw e;
  }
  clearTimeout(debounceTimer);
  dirty = false; // reiniciando sigue en true: no se vuelve a guardar hasta la recarga
}

/* ── Marcar cambios: llamar desde addObj, deleteSelected, gizmo drag-end, etc. ── */
export function marcarSucio() {
  revision++;
  dirty = true;
  document.dispatchEvent(new CustomEvent('guardado:pendiente'));
  clearTimeout(debounceTimer);
  if (reiniciando) return; // si el reinicio falla, restaurar() reprograma el guardado diferido
  debounceTimer = setTimeout(() => guardar(), DEBOUNCE_MS);
}

export function haySinGuardar() {
  return dirty;
}

/* ── Arranque ── */
export function iniciarAutoguardado(snapshotFn, opts = {}) {
  getSnapshot = snapshotFn;
  proyectoId = opts.proyecto_id ?? parseInt(new URLSearchParams(window.location.search).get('proyecto') || 1, 10);
  slot = opts.slot ?? 1;
  if (vistaAlumnoId) return; // Sin autoguardado para maestros viendo a alumnos
  autosaveTimer = setInterval(() => guardar(), AUTOSAVE_MS);

  // beforeunload + fetch async NO es confiable; sendBeacon sí.
  // (mismo problema existe hoy en telemetria.js con cerrarSesion)
  window.addEventListener('pagehide', flushBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeacon();
  });
  window.addEventListener('beforeunload', (e) => {
    if (dirty && !reiniciando) { e.preventDefault(); e.returnValue = ''; }
  });
}

function flushBeacon() {
  if (reiniciando || !dirty || !getSnapshot) return;
  const { estado, progreso } = getSnapshot();
  const blob = new Blob([JSON.stringify({
    proyecto_id: proyectoId, slot, estado, progreso,
    token: localStorage.getItem('token')   // sendBeacon no manda headers
  })], { type: 'application/json' });
  // Beacon no confirma persistencia; conservar pendiente para reintentar al volver.
  navigator.sendBeacon(`${API_BASE}/guardado/beacon`, blob);
}

export function detenerAutoguardado() {
  clearInterval(autosaveTimer);
  clearTimeout(debounceTimer);
  if (syncTimer) clearInterval(syncTimer);
}

/* ── Sincronización para vista de Maestro (Solo lectura) ── */
let syncTimer = null;
let ultimaActualizacion = null;

export async function checkActualizacion() {
  if (!vistaAlumnoId) return;
  try {
    let url = `${API_BASE}/guardado/meta?proyecto_id=${proyectoId}&slot=${slot}&alumno_id=${vistaAlumnoId}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return;
    const { actualizado_en } = await res.json();
    
    if (ultimaActualizacion && actualizado_en !== ultimaActualizacion) {
      document.dispatchEvent(new CustomEvent('guardado:actualizado_externo'));
    }
    ultimaActualizacion = actualizado_en;
  } catch (err) {
    // Ignorar errores de red
  }
}

export function iniciarSyncMaestro(fechaInicial) {
  if (!vistaAlumnoId) return;
  ultimaActualizacion = fechaInicial;
  syncTimer = setInterval(checkActualizacion, 5000); // Revisar cada 5 segundos
}