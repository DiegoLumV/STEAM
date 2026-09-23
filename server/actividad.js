// server/actividad.js
// Registro de acciones del sistema, para el dashboard del admin.
// Diseñado para crecer: agregar un tipo_accion nuevo no requiere migrar nada,
// solo llamar registrarActividad() desde el endpoint correspondiente.
import { query } from './db.js';

/**
 * @param {number|null} usuarioId
 * @param {string} tipoAccion   ej. 'login', 'entrega_casa', 'reinicio_casa', 'pregunta_creada', 'calificacion_asignada'
 * @param {object} detalle      cualquier contexto extra, se guarda como JSONB
 */
export async function registrarActividad(usuarioId, tipoAccion, detalle = {}) {
  try {
    await query(
      `INSERT INTO registro_actividad (usuario_id, tipo_accion, detalle) VALUES ($1, $2, $3)`,
      [usuarioId || null, tipoAccion, detalle]
    );
  } catch (e) {
    // Nunca tronar la acción principal por un fallo de logging.
    console.error('No se pudo registrar actividad:', e.message);
  }
}
