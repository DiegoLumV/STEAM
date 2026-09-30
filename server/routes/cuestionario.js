// server/routes/cuestionario.js
import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const router = Router();
router.use(verifyToken);

/* ── POST /api/entrega  · marca la casa como entregada y genera la calificación pendiente ── */
router.post('/entrega', async (req, res) => {
  const { proyecto_id = 1, slot = 1 } = req.body;
  try {
    const { rows } = await query(
      `UPDATE proyecto_guardados
          SET entregado_en = NOW()
        WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = $3
        RETURNING entregado_en, estado`,
      [req.user.id, proyecto_id, slot]
    );
    if (!rows.length) return res.status(400).json({ error: 'Guarda tu casa antes de entregarla' });

    // Práctica "ancla" sembrada en la migración 006. Si por alguna razón no
    // existe (BD muy vieja sin migrar), la entrega igual se marca; la
    // calificación pendiente simplemente no se crea y se registra el motivo.
    const practica = await query(
      `SELECT id FROM practicas WHERE titulo = 'Examen Final: Construcción de Casa' LIMIT 1`
    );
    if (practica.rows.length) {
      const totalObjetos = Array.isArray(rows[0].estado?.objetos) ? rows[0].estado.objetos.length : 0;
      await query(
        `INSERT INTO calificaciones (alumno_id, practica_id, calificacion_final, respuestas_alumno)
         VALUES ($1, $2, NULL, $3)
         ON CONFLICT (alumno_id, practica_id) DO UPDATE
           SET respuestas_alumno = EXCLUDED.respuestas_alumno,
               fecha_realizacion = NOW()`,
        [req.user.id, practica.rows[0].id, { total_objetos: totalObjetos }]
      );
    } else {
      console.warn('No existe la práctica "Examen Final: Construcción de Casa" — corre las migraciones.');
    }

    res.json({ entregado_en: rows[0].entregado_en });
    registrarActividad(req.user.id, 'entrega_casa', { proyecto_id, total_objetos: rows[0].estado?.objetos?.length || 0 });
  } catch (e) {
    console.error('Error marcando entrega:', e);
    res.status(500).json({ error: 'No se pudo registrar la entrega' });
  }
});

/* ── GET /api/entrega?proyecto_id=1 ── */
router.get('/entrega', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  try {
    const { rows } = await query(
      `SELECT entregado_en FROM proyecto_guardados
        WHERE usuario_id = $1 AND proyecto_id = $2 AND slot = 1`,
      [req.user.id, proyectoId]
    );
    res.json({ entregado: !!rows[0]?.entregado_en, entregado_en: rows[0]?.entregado_en || null });
  } catch (e) {
    console.error('Error consultando entrega:', e);
    res.status(500).json({ error: 'No se pudo consultar la entrega' });
  }
});

/* ── GET /api/preguntas?proyecto_id=1  · tablero tipo Classroom ── */
router.get('/preguntas', async (req, res) => {
  const proyectoId = parseInt(req.query.proyecto_id || '1');
  try {
    const { rows } = await query(
      `SELECT p.id, p.titulo, p.cuerpo, p.creado_en,
              u.nombre_completo AS autor,
              (SELECT COUNT(*) FROM casa_respuestas r WHERE r.pregunta_id = p.id) AS total_respuestas
         FROM casa_preguntas p
         JOIN usuarios u ON u.id = p.autor_id
        WHERE p.proyecto_id = $1
        ORDER BY p.creado_en DESC`,
      [proyectoId]
    );
    res.json({ preguntas: rows });
  } catch (e) {
    console.error('Error listando preguntas:', e);
    res.status(500).json({ error: 'No se pudieron cargar las preguntas' });
  }
});

/* ── POST /api/preguntas  · cualquier usuario puede publicar una ── */
router.post('/preguntas', async (req, res) => {
  const { proyecto_id = 1, titulo, cuerpo = '' } = req.body;
  if (!titulo || !titulo.trim()) return res.status(400).json({ error: 'El título es obligatorio' });
  if (titulo.length > 200) return res.status(400).json({ error: 'Título demasiado largo' });
  try {
    const { rows } = await query(
      `INSERT INTO casa_preguntas (proyecto_id, autor_id, titulo, cuerpo)
       VALUES ($1, $2, $3, $4) RETURNING id, creado_en`,
      [proyecto_id, req.user.id, titulo.trim(), cuerpo.trim()]
    );
    res.status(201).json({ id: rows[0].id, creado_en: rows[0].creado_en });
    registrarActividad(req.user.id, 'pregunta_creada', { pregunta_id: rows[0].id, titulo: titulo.trim() });
  } catch (e) {
    console.error('Error creando pregunta:', e);
    res.status(500).json({ error: 'No se pudo publicar la pregunta' });
  }
});

/* ── GET /api/preguntas/:id  · detalle + respuestas ── */
router.get('/preguntas/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const pregunta = await query(
      `SELECT p.id, p.titulo, p.cuerpo, p.creado_en, u.nombre_completo AS autor
         FROM casa_preguntas p JOIN usuarios u ON u.id = p.autor_id
        WHERE p.id = $1`,
      [id]
    );
    if (!pregunta.rows.length) return res.status(404).json({ error: 'Pregunta no encontrada' });

    const respuestas = await query(
      `SELECT r.id, r.cuerpo, r.creado_en, u.nombre_completo AS autor
         FROM casa_respuestas r JOIN usuarios u ON u.id = r.autor_id
        WHERE r.pregunta_id = $1
        ORDER BY r.creado_en ASC`,
      [id]
    );
    res.json({ pregunta: pregunta.rows[0], respuestas: respuestas.rows });
  } catch (e) {
    console.error('Error obteniendo pregunta:', e);
    res.status(500).json({ error: 'No se pudo cargar la pregunta' });
  }
});

/* ── POST /api/preguntas/:id/respuestas ── */
router.post('/preguntas/:id/respuestas', async (req, res) => {
  const id = parseInt(req.params.id);
  const { cuerpo } = req.body;
  if (!cuerpo || !cuerpo.trim()) return res.status(400).json({ error: 'La respuesta no puede estar vacía' });
  try {
    const existe = await query(`SELECT id FROM casa_preguntas WHERE id = $1`, [id]);
    if (!existe.rows.length) return res.status(404).json({ error: 'Pregunta no encontrada' });

    const { rows } = await query(
      `INSERT INTO casa_respuestas (pregunta_id, autor_id, cuerpo)
       VALUES ($1, $2, $3) RETURNING id, creado_en`,
      [id, req.user.id, cuerpo.trim()]
    );
    res.status(201).json({ id: rows[0].id, creado_en: rows[0].creado_en });
  } catch (e) {
    console.error('Error respondiendo pregunta:', e);
    res.status(500).json({ error: 'No se pudo enviar la respuesta' });
  }
});

/* ── DELETE /api/preguntas/:id  · solo el autor o un admin ── */
router.delete('/preguntas/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const existe = await query(`SELECT autor_id FROM casa_preguntas WHERE id = $1`, [id]);
    if (!existe.rows.length) return res.status(404).json({ error: 'Pregunta no encontrada' });
    if (existe.rows[0].autor_id !== req.user.id && req.user.rol_nombre !== 'admin') {
      return res.status(403).json({ error: 'Solo el autor o un admin puede borrarla' });
    }
    await query(`DELETE FROM casa_preguntas WHERE id = $1`, [id]);
    res.json({ message: 'Pregunta eliminada' });
  } catch (e) {
    console.error('Error borrando pregunta:', e);
    res.status(500).json({ error: 'No se pudo borrar la pregunta' });
  }
});

export default router;