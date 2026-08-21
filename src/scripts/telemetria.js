/**
 * CasaSTEAM Telemetry Module
 * Captures user interactions in the 3D simulator and sends them to the backend.
 * Uses a buffer system to batch-send events every 10 seconds.
 */

const API_BASE = '/api';  // Vite proxies this to localhost:3001
let sesionId = null;
let eventBuffer = [];
let flushInterval = null;
const FLUSH_INTERVAL_MS = 10000; // 10 seconds
const CAMERA_SAMPLE_MS = 10000; // 10 seconds
let cameraInterval = null;
let lastActivityTime = Date.now();
let inactivityTimeout = null;
const INACTIVITY_THRESHOLD_MS = 30000; // 30 seconds

// Activity IDs mapping (must match the database seed)
// These will be set after querying the API, but we can use names as fallback
const ACTIVIDAD_MAP = {
  'calcular_area': null,
  'crear_concreto': null,
  'construir_pared_simple': null,
  'construir_pared_puerta': null,
  'construir_pared_ventana': null,
  'construir_piso': null,
  'programar_foco': null,
  'disenar_casa': null,
};

function getToken() {
  return localStorage.getItem('token');
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Initialize: start a session when the simulator loads
export async function iniciarSesion() {
  try {
    const res = await fetch(`${API_BASE}/sesion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ proyecto_id: 1, metadata: { pagina: 'sandbox' } })
    });
    const data = await res.json();
    sesionId = data.sesion_id;
    console.log('📡 Telemetría iniciada. Sesión:', sesionId);
    startFlushInterval();
    startCameraSampling();
    startInactivityDetection();
    return sesionId;
  } catch (err) {
    console.warn('⚠️ No se pudo iniciar telemetría:', err.message);
    return null;
  }
}

// Close session when leaving
export async function cerrarSesion() {
  if (!sesionId) return;
  try {
    await flushBuffer(); // Send remaining events
    await fetch(`${API_BASE}/sesion/${sesionId}/fin`, {
      method: 'PUT',
      headers: getHeaders()
    });
    // Trigger evaluation calculation
    await fetch(`${API_BASE}/evaluacion/sesion/${sesionId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    console.log('📡 Sesión cerrada y evaluación calculada.');
  } catch (err) {
    console.warn('⚠️ Error cerrando sesión:', err.message);
  } finally {
    stopIntervals();
    sesionId = null;
  }
}

// Register a telemetry event
export function registrar(tipoEvento, datos = {}) {
  if (!sesionId) return;
  lastActivityTime = Date.now(); // Reset inactivity timer
  
  const evento = {
    tipo_evento: tipoEvento,
    pos_x: datos.pos_x ?? null,
    pos_y: datos.pos_y ?? null,
    pos_z: datos.pos_z ?? null,
    actividad_id: datos.actividad_id ?? null,
    marca_tiempo: new Date().toISOString(),
    contexto: datos.contexto ?? {}
  };
  eventBuffer.push(evento);
}

// Flush the buffer to the server
async function flushBuffer() {
  if (eventBuffer.length === 0 || !sesionId) return;
  const eventos = [...eventBuffer];
  eventBuffer = [];
  try {
    await fetch(`${API_BASE}/telemetria`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sesion_id: sesionId, eventos })
    });
  } catch (err) {
    // Put events back if send failed
    eventBuffer = [...eventos, ...eventBuffer];
    console.warn('⚠️ Error enviando telemetría, reintentando...', err.message);
  }
}

function startFlushInterval() {
  flushInterval = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
}

// Camera position sampling
let cameraRef = null;
export function setCameraRef(camera) { cameraRef = camera; }

function startCameraSampling() {
  cameraInterval = setInterval(() => {
    if (!cameraRef) return;
    registrar('camara_posicion', {
      pos_x: cameraRef.position.x,
      pos_y: cameraRef.position.y,
      pos_z: cameraRef.position.z,
      contexto: {
        alpha: cameraRef.alpha,
        beta: cameraRef.beta,
        radius: cameraRef.radius
      }
    });
  }, CAMERA_SAMPLE_MS);
}

// Inactivity detection
function startInactivityDetection() {
  inactivityTimeout = setInterval(() => {
    const idle = Date.now() - lastActivityTime;
    if (idle >= INACTIVITY_THRESHOLD_MS) {
      registrar('inactividad', {
        contexto: { duracion_ms: idle }
      });
      lastActivityTime = Date.now(); // Don't spam
    }
  }, INACTIVITY_THRESHOLD_MS);
}

function stopIntervals() {
  if (flushInterval) clearInterval(flushInterval);
  if (cameraInterval) clearInterval(cameraInterval);
  if (inactivityTimeout) clearInterval(inactivityTimeout);
}

// Handle page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cerrarSesion();
  });
}
