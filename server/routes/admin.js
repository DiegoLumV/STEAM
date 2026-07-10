import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Todos los endpoints de admin requieren token + rol admin
router.use(verifyToken, requireAdmin);

/* ───────────────────────────────────────────
   GET /api/admin/users
   Lista todos los usuarios con su rol
   ─────────────────────────────────────────── */
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre_completo, u.email, r.nombre AS rol, u.creado_en
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       ORDER BY u.creado_en DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

/* ───────────────────────────────────────────
   GET /api/admin/stats
   Estadísticas generales del sistema
   ─────────────────────────────────────────── */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalAlumnos, totalRutas, avgCalif] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM usuarios'),
      query("SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'alumno'"),
      query('SELECT COUNT(*) AS total FROM rutas_aprendizaje'),
      query('SELECT COALESCE(AVG(calificacion_final), 0) AS promedio FROM calificaciones'),
    ]);

    res.json({
      total_usuarios:   parseInt(totalUsers.rows[0].total),
      total_alumnos:    parseInt(totalAlumnos.rows[0].total),
      total_rutas:      parseInt(totalRutas.rows[0].total),
      promedio_general: parseFloat(parseFloat(avgCalif.rows[0].promedio).toFixed(2)),
    });
  } catch (err) {
    console.error('Error en stats:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

/* ───────────────────────────────────────────
   DELETE /api/admin/users/:id
   Elimina un usuario (no puede eliminarse a sí mismo)
   ─────────────────────────────────────────── */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    // Eliminar registros relacionados primero
    await query('DELETE FROM calificaciones WHERE alumno_id = $1', [userId]);
    await query('DELETE FROM avance_rutas WHERE alumno_id = $1', [userId]);
    await query('DELETE FROM usuarios WHERE id = $1', [userId]);

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

/* ───────────────────────────────────────────
   PUT /api/admin/users/:id/role
   Cambia el rol de un usuario
   ─────────────────────────────────────────── */
router.put('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { rol_nombre } = req.body;

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    if (!['admin', 'alumno', 'maestro'].includes(rol_nombre)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Obtener el ID del nuevo rol
    const rolResult = await query('SELECT id FROM roles WHERE nombre = $1', [rol_nombre]);
    if (rolResult.rows.length === 0) {
      return res.status(400).json({ error: 'Rol no encontrado en la base de datos' });
    }
    const newRolId = rolResult.rows[0].id;

    await query('UPDATE usuarios SET rol_id = $1 WHERE id = $2', [newRolId, userId]);

    res.json({ message: 'Rol actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando rol:', err);
    res.status(500).json({ error: 'Error actualizando el rol' });
  }
});

export default router;
