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
/**
 * Middleware genérico: requiere que el usuario tenga uno de los roles dados.
 * Uso: router.use(verifyToken, requireRole('maestro', 'admin'))
 */
export function requireRole(...rolesPermitidos) {
  return async (req, res, next) => {
    try {
      const result = await query('SELECT r.nombre FROM roles r WHERE r.id = $1', [req.user.rol_id]);
      const rol = result.rows[0]?.nombre;
      if (!rol || !rolesPermitidos.includes(rol)) {
        return res.status(403).json({ error: `Acceso denegado: se requiere rol ${rolesPermitidos.join(' o ')}` });
      }
      req.rolActual = rol;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Error verificando permisos' });
    }
  };
}

/** Alias por compatibilidad: código existente (evaluacion.js) sigue usando este nombre. */
export const requireAdmin = requireRole('admin');