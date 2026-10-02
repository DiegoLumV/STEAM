// server/routes/alumno.js
import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

/* ───────────────────────────────────────────
   GET /api/alumno/calificaciones
   El alumno consulta sus propias calificaciones (solo las suyas: el filtro
   por req.user.id lo hace imposible ver las de otro alumno).
   ─────────────────────────────────────────── */
router.get('/calificaciones', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.calificacion_final, c.fecha_realizacion,
              p.titulo AS practica, ra.titulo AS ruta
         FROM calificaciones c
         JOIN practicas p ON p.id = c.practica_id
         JOIN rutas_aprendizaje ra ON ra.id = p.ruta_id
        WHERE c.alumno_id = $1
        ORDER BY c.fecha_realizacion DESC`,
      [req.user.id]
    );
    res.json({ calificaciones: rows });
  } catch (err) {
    console.error('Error obteniendo calificaciones:', err);
    res.status(500).json({ error: 'Error obteniendo calificaciones' });
  }
});

/* ───────────────────────────────────────────
   DASHBOARD DEL ALUMNO (solo lectura, solo datos propios)
   Todas las consultas filtran por req.user.id (del token); ninguna recibe
   un alumno_id por parámetro, así que no hay forma de pedir datos de otro.
   ─────────────────────────────────────────── */

function calcularObjetivos(estado) {
  const objetos = Array.isArray(estado?.objetos) ? estado.objetos : [];
  const cuenta = f => objetos.filter(f).length;
  // Estos son los mismos requerimientos mostrados en el frontend.
  return [
    { clave: 'paredes',  label: 'Paredes',  actual: cuenta(o => o.type === 'wall_block' || o.type === 'wall_madera'), requerido: 5 },
    { clave: 'puertas',  label: 'Puertas',  actual: cuenta(o => o.type === 'puerta'),  requerido: 2 },
    { clave: 'ventanas', label: 'Ventanas', actual: cuenta(o => o.type === 'ventana'), requerido: 3 },
  ].map(o => ({ ...o, completo: o.actual >= o.requerido }));
}

const ETAPAS = {
  0: 'Matemáticas',
  1: 'Concreto desbloqueado',
  2: 'Construcción desbloqueada',
  3: 'Primera pared construida',
  4: 'Todo desbloqueado',
};

function estadoExamen(g) {
  if (!g) return 'no_iniciado';
  return g.entregado_en ? 'entregado' : 'en_progreso';
}

const SQL_PROYECTO = `
  SELECT p.id, p.nombre, p.descripcion,
         EXISTS (SELECT 1 FROM avance_rutas ar
                   JOIN rutas_aprendizaje ra ON ra.id = ar.ruta_id
                  WHERE ar.alumno_id = $1 AND ra.titulo = p.nombre) AS inscrito,
         g.estado, g.progreso, g.actualizado_en, g.entregado_en,
         (g.id IS NOT NULL) AS tiene_guardado
    FROM proyectos p
    LEFT JOIN proyecto_guardados g
           ON g.usuario_id = $1 AND g.proyecto_id = p.id AND g.slot = 1`;

/* GET /api/alumno/dashboard — dashboard general */
router.get('/dashboard', async (req, res) => {
  if (req.user.rol_nombre !== 'alumno') return res.status(403).json({ error: 'No autorizado' });
  try {
    const { rows } = await query(`${SQL_PROYECTO} ORDER BY p.id`, [req.user.id]);
    const proyectos = rows
      .filter(r => r.inscrito || r.tiene_guardado)
      .map(r => {
        const objetivos = calcularObjetivos(r.estado);
        return {
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion,
          inscrito: r.inscrito,
          examen: estadoExamen(r.tiene_guardado ? r : null),
          ultimo_guardado: r.actualizado_en,
          entregado_en: r.entregado_en,
          objetivos_completos: objetivos.filter(o => o.completo).length,
          objetivos_total: objetivos.length,
        };
      });

    const actividad = await query(
      `SELECT tipo_accion, creado_en FROM registro_actividad
        WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 8`,
      [req.user.id]
    );

    res.json({
      alumno: { nombre: req.user.nombre_completo },
      proyectos,
      resumen: {
        total: proyectos.length,
        completados: proyectos.filter(p => p.examen === 'entregado').length,
        pendientes: proyectos.filter(p => p.examen !== 'entregado').length,
      },
      actividad: actividad.rows,
    });
  } catch (err) {
    console.error('Error en dashboard del alumno:', err);
    res.status(500).json({ error: 'Error obteniendo el dashboard' });
  }
});

/* GET /api/alumno/proyectos/:id/dashboard — dashboard de un proyecto específico */
router.get('/proyectos/:id/dashboard', async (req, res) => {
  if (req.user.rol_nombre !== 'alumno') return res.status(403).json({ error: 'No autorizado' });
  const proyectoId = parseInt(req.params.id, 10);
  if (!Number.isInteger(proyectoId)) return res.status(400).json({ error: 'Proyecto inválido' });
  try {
    const { rows } = await query(`${SQL_PROYECTO} WHERE p.id = $2`, [req.user.id, proyectoId]);
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const r = rows[0];

    const objetivos = calcularObjetivos(r.estado);
    const fase = Number.isInteger(r.progreso?.buildPhase) ? r.progreso.buildPhase : null;

    const eventos = await query(
      `SELECT tipo_accion, creado_en FROM registro_actividad
        WHERE usuario_id = $1 AND detalle->>'proyecto_id' = $2
        ORDER BY creado_en DESC LIMIT 8`,
      [req.user.id, String(proyectoId)]
    );

    res.json({
      proyecto: { id: r.id, nombre: r.nombre, descripcion: r.descripcion, inscrito: r.inscrito },
      examen: { estado: estadoExamen(r.tiene_guardado ? r : null), entregado_en: r.entregado_en },
      progreso: {
        etapa: fase !== null ? (ETAPAS[fase] || null) : null,
        objetivos_completos: objetivos.filter(o => o.completo).length,
        objetivos_total: objetivos.length,
      },
      objetivos,
      actividad: {
        ultimo_guardado: r.actualizado_en,
        ultima_entrega: r.entregado_en,
        eventos: eventos.rows,
      },
    });
  } catch (err) {
    console.error('Error en dashboard del proyecto:', err);
    res.status(500).json({ error: 'Error obteniendo el dashboard del proyecto' });
  }
});

export default router;
