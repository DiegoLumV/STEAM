import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Todos los endpoints de evaluación requieren token
router.use(verifyToken);

/* ───────────────────────────────────────────
   GET /evaluacion/:alumno_id
   Devuelve el desglose de habilidades de un alumno
   ─────────────────────────────────────────── */
router.get('/evaluacion/:alumno_id', async (req, res) => {
  try {
    const alumnoId = parseInt(req.params.alumno_id);
    const usuarioId = req.user.id;
    const rolNombre = req.user.rol_nombre;

    // Solo el propio alumno o un admin pueden acceder
    if (rolNombre !== 'admin' && usuarioId !== alumnoId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await query(
      `SELECT 
         ds.nombre AS dimension_nombre, 
         ds.color_hex, 
         h.nombre AS habilidad_nombre, 
         AVG(eh.puntaje) AS puntaje_promedio,
         SUM(eh.intentos_fallidos) AS intentos_fallidos_total
       FROM evaluaciones_habilidad eh
       JOIN habilidades h ON h.id = eh.habilidad_id
       JOIN dimensiones_steam ds ON ds.id = h.dimension_id
       WHERE eh.alumno_id = $1
       GROUP BY ds.nombre, ds.color_hex, h.nombre
       ORDER BY ds.nombre, h.nombre`,
      [alumnoId]
    );

    // Formatear el resultado agrupado por dimensión
    const dimensionesMap = new Map();

    result.rows.forEach(row => {
      if (!dimensionesMap.has(row.dimension_nombre)) {
        dimensionesMap.set(row.dimension_nombre, {
          nombre: row.dimension_nombre,
          color_hex: row.color_hex,
          habilidades: []
        });
      }
      
      dimensionesMap.get(row.dimension_nombre).habilidades.push({
        nombre: row.habilidad_nombre,
        puntaje_promedio: parseFloat(row.puntaje_promedio).toFixed(2),
        intentos_fallidos_total: parseInt(row.intentos_fallidos_total)
      });
    });

    res.json({ dimensiones: Array.from(dimensionesMap.values()) });
  } catch (err) {
    console.error('Error obteniendo desglose de habilidades:', err);
    res.status(500).json({ error: 'Error obteniendo evaluaciones' });
  }
});

/* ───────────────────────────────────────────
   POST /evaluacion/sesion/:sesion_id
   Calcula y guarda la evaluación al cerrar sesión
   ─────────────────────────────────────────── */
router.post('/evaluacion/sesion/:sesion_id', async (req, res) => {
  try {
    const sesionId = parseInt(req.params.sesion_id);
    const usuarioId = req.user.id;

    // Verificar que la sesión pertenece al usuario
    const sesionQuery = await query(
      `SELECT id FROM sesiones_simulacion WHERE id = $1 AND usuario_id = $2`,
      [sesionId, usuarioId]
    );

    if (sesionQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o no autorizada' });
    }

    // Obtener los eventos de la sesión (ordenados cronológicamente)
    const eventosQuery = await query(
      `SELECT * FROM telemetria_3d WHERE sesion_id = $1 ORDER BY marca_tiempo ASC`,
      [sesionId]
    );
    const eventos = eventosQuery.rows;

    // Agrupar eventos por actividad_id
    const eventosPorActividad = {};
    eventos.forEach(evt => {
      if (evt.actividad_id) {
        if (!eventosPorActividad[evt.actividad_id]) {
          eventosPorActividad[evt.actividad_id] = [];
        }
        eventosPorActividad[evt.actividad_id].push(evt);
      }
    });

    const evaluacionesGeneradas = [];

    // Procesar cada actividad
    for (const [actividadId, evts] of Object.entries(eventosPorActividad)) {
      let intentoCorrecto = false;
      let intentosFallidos = 0;
      let esPrimerIntento = true;

      // Calcular resultados
      for (const evt of evts) {
        if (evt.contexto && evt.contexto.correcto === 'false') {
          intentosFallidos++;
          esPrimerIntento = false;
        } else if (evt.contexto && evt.contexto.correcto === 'true') {
          intentoCorrecto = true;
          break; // Nos detenemos en el primer éxito
        }
      }

      // Solo evaluamos si hubo al menos un intento (correcto o incorrecto)
      const tuvoInteraccion = evts.some(e => e.contexto && e.contexto.correcto !== undefined);
      if (!tuvoInteraccion) continue;

      let puntaje = 0;
      if (intentoCorrecto && esPrimerIntento) {
        puntaje = 100;
      } else if (intentoCorrecto && !esPrimerIntento) {
        puntaje = 70;
      } else {
        puntaje = 0;
      }

      // Calcular tiempo en segundos (desde el primer evento de la actividad hasta el último analizado)
      const primerEvento = evts[0];
      const ultimoEvento = evts[evts.length - 1];
      const tiempoSegundos = Math.round(
        (new Date(ultimoEvento.marca_tiempo).getTime() - new Date(primerEvento.marca_tiempo).getTime()) / 1000
      );

      // Buscar las habilidades que evalúa esta actividad
      const habilidadesQuery = await query(
        `SELECT habilidad_id FROM actividades_habilidades WHERE actividad_id = $1`,
        [actividadId]
      );

      // Insertar una evaluación por cada habilidad
      for (const row of habilidadesQuery.rows) {
        const insertResult = await query(
          `INSERT INTO evaluaciones_habilidad (
             alumno_id, sesion_id, actividad_id, habilidad_id, 
             puntaje, intentos_fallidos, tiempo_segundos, fecha
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id`,
          [usuarioId, sesionId, actividadId, row.habilidad_id, puntaje, intentosFallidos, tiempoSegundos]
        );
        
        evaluacionesGeneradas.push({
          evaluacion_id: insertResult.rows[0].id,
          habilidad_id: row.habilidad_id,
          puntaje,
          intentos_fallidos: intentosFallidos,
          tiempo_segundos: tiempoSegundos
        });
      }
    }

    res.status(201).json({ evaluaciones: evaluacionesGeneradas });
  } catch (err) {
    console.error('Error procesando evaluaciones:', err);
    res.status(500).json({ error: 'Error procesando evaluaciones de la sesión' });
  }
});

/* ───────────────────────────────────────────
   GET /dashboard/steam-stats
   Estadísticas agregadas para el dashboard
   ─────────────────────────────────────────── */
router.get('/dashboard/steam-stats', requireAdmin, async (req, res) => {
  try {
    const [promedios, fallos, sesiones, eventos, actividades] = await Promise.all([
      // promedio_por_dimension
      query(
        `SELECT ds.nombre AS dimension, AVG(eh.puntaje) AS promedio
         FROM evaluaciones_habilidad eh
         JOIN habilidades h ON h.id = eh.habilidad_id
         JOIN dimensiones_steam ds ON ds.id = h.dimension_id
         GROUP BY ds.nombre
         ORDER BY ds.nombre`
      ),
      // habilidades_con_mas_fallos (top 5)
      query(
        `SELECT h.nombre AS habilidad, SUM(eh.intentos_fallidos) AS total_fallos
         FROM evaluaciones_habilidad eh
         JOIN habilidades h ON h.id = eh.habilidad_id
         GROUP BY h.nombre
         ORDER BY total_fallos DESC
         LIMIT 5`
      ),
      // total_sesiones y duracion_promedio_sesion
      query(
        `SELECT 
           COUNT(*) AS total, 
           AVG(EXTRACT(EPOCH FROM (fecha_fin - fecha_inicio))) AS duracion_promedio
         FROM sesiones_simulacion
         WHERE fecha_fin IS NOT NULL`
      ),
      // total_eventos
      query(`SELECT COUNT(*) AS total FROM telemetria_3d`),
      // actividades_mas_dificiles (bottom 5 promedio de puntaje)
      query(
        `SELECT actividad_id AS actividad, AVG(puntaje) AS promedio_puntaje
         FROM evaluaciones_habilidad
         GROUP BY actividad_id
         ORDER BY promedio_puntaje ASC
         LIMIT 5`
      )
    ]);

    res.json({
      promedio_por_dimension: promedios.rows.map(row => ({
        dimension: row.dimension,
        promedio: parseFloat(row.promedio).toFixed(2)
      })),
      habilidades_con_mas_fallos: fallos.rows.map(row => ({
        habilidad: row.habilidad,
        total_fallos: parseInt(row.total_fallos)
      })),
      total_sesiones: parseInt(sesiones.rows[0].total || 0),
      total_eventos: parseInt(eventos.rows[0].total || 0),
      duracion_promedio_sesion: Math.round(parseFloat(sesiones.rows[0].duracion_promedio || 0)),
      actividades_mas_dificiles: actividades.rows.map(row => ({
        actividad: row.actividad,
        promedio_puntaje: parseFloat(row.promedio_puntaje).toFixed(2)
      }))
    });
  } catch (err) {
    console.error('Error obteniendo stats de dashboard:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

export default router;
