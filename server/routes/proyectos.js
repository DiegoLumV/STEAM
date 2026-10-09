import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Endpoint para que cualquier usuario autenticado vea los proyectos activos
router.get('/proyectos', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, descripcion, url_simulador 
       FROM proyectos 
       WHERE activo = true
       ORDER BY id ASC`
    );
    res.json({ proyectos: result.rows });
  } catch (err) {
    console.error('Error listando proyectos activos:', err);
    res.status(500).json({ error: 'Error obteniendo proyectos' });
  }
});

export default router;
