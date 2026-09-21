import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'casasteam_fallback_secret';

/**
 * Verifica que el request tenga un JWT válido.
 * Agrega req.user con { id, nombre_completo, email, rol_id, rol_nombre }
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware que requiere rol "admin".
 * Debe usarse DESPUÉS de verifyToken.
 */
export async function requireAdmin(req, res, next) {
  try {
    const result = await query(
      'SELECT r.nombre FROM roles r WHERE r.id = $1',
      [req.user.rol_id]
    );
    if (result.rows.length === 0 || result.rows[0].nombre !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error verificando permisos' });
  }
}
