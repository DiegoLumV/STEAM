import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'casasteam_fallback_secret';
const SALT_ROUNDS = 10;

/* ───────────────────────────────────────────
   POST /api/auth/register
   Body: { nombre_completo, email, password }
   ─────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  try {
    const { nombre_completo, email, password } = req.body;

    // Validaciones básicas
    if (!nombre_completo || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si ya existe
    const exists = await query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    // Obtener rol "alumno" por defecto
    const rolResult = await query("SELECT id FROM roles WHERE nombre = 'alumno'");
    if (rolResult.rows.length === 0) {
      return res.status(500).json({ error: 'Rol alumno no encontrado. Ejecuta seed primero.' });
    }
    const rolId = rolResult.rows[0].id;

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insertar usuario
    const insertResult = await query(
      `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, creado_en)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, nombre_completo, email, rol_id`,
      [nombre_completo, email.toLowerCase(), passwordHash, rolId]
    );

    const user = insertResult.rows[0];

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, nombre_completo: user.nombre_completo, email: user.email, rol_id: user.rol_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      token,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol_id: user.rol_id,
      },
    });
  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* ───────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
   ─────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    // Buscar usuario con su rol
    const result = await query(
      `SELECT u.id, u.nombre_completo, u.email, u.password_hash, u.rol_id, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id: user.id,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol_id: user.rol_id,
        rol_nombre: user.rol_nombre,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    registrarActividad(user.id, 'login', { rol: user.rol_nombre });

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol_nombre: user.rol_nombre,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* ───────────────────────────────────────────
   GET /api/auth/me
   Header: Authorization: Bearer <token>
   ─────────────────────────────────────────── */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre_completo, u.email, u.rol_id, r.nombre AS rol_nombre, u.creado_en
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
