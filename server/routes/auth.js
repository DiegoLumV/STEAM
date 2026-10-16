import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { registrarActividad } from '../actividad.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'casasteam_fallback_secret';
const SALT_ROUNDS = 10;

// Client ID público de Google (se expone en el frontend de todas formas)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'postmessage';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/* ───────────────────────────────────────────
   Helper: Intercambiar authorization code por tokens y datos de People API
   Usa el flujo de Authorization Code de Google Identity Services.
   Retorna: { googleId, email, name, picture, birthday, gender }
   ─────────────────────────────────────────── */
async function obtenerDatosGoogleDesdeCode(code) {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  // Intercambiar el authorization code por tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Datos básicos del ID token (siempre disponibles)
  const idToken = tokens.id_token;
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  const resultado = {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || '',
    picture: payload.picture || null,
    birthday: null,       // { year, month, day } o null
    gender: null,         // string o null
    fechaNacimiento: null, // Date o null
    edad: null,           // integer o null
  };

  // Intentar obtener datos extendidos de Google People API
  // (requiere scopes: user.birthday.read, user.gender.read)
  try {
    const people = google.people({ version: 'v1', auth: oauth2Client });
    const profileResponse = await people.people.get({
      resourceName: 'people/me',
      personFields: 'birthdays,genders,photos',
    });

    const profile = profileResponse.data;

    // Foto de perfil (People API puede dar mejor resolución que el ID token)
    if (profile.photos && profile.photos.length > 0) {
      const primaryPhoto = profile.photos.find(p => p.metadata?.primary) || profile.photos[0];
      if (primaryPhoto && primaryPhoto.url && !primaryPhoto.default) {
        resultado.picture = primaryPhoto.url;
      }
    }

    // Fecha de nacimiento
    if (profile.birthdays && profile.birthdays.length > 0) {
      const primaryBirthday = profile.birthdays.find(b => b.metadata?.primary) || profile.birthdays[0];
      if (primaryBirthday && primaryBirthday.date) {
        const { year, month, day } = primaryBirthday.date;
        resultado.birthday = primaryBirthday.date;
        if (year && month && day) {
          resultado.fechaNacimiento = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          resultado.edad = calcularEdad(year, month, day);
        } else if (month && day) {
          // Google a veces devuelve solo mes y día sin año si el usuario ocultó el año
          resultado.birthday = { month, day };
        }
      }
    }

    // Género
    if (profile.genders && profile.genders.length > 0) {
      const primaryGender = profile.genders.find(g => g.metadata?.primary) || profile.genders[0];
      if (primaryGender && primaryGender.value) {
        // Traducir valores de Google a español para consistencia con la plataforma
        const mapaGenero = {
          'male': 'Masculino',
          'female': 'Femenino',
          'other': 'Otro',
          'unspecified': 'Prefiero no decir',
        };
        resultado.gender = mapaGenero[primaryGender.value.toLowerCase()] || primaryGender.formattedValue || primaryGender.value;
      }
    }
  } catch (peopleErr) {
    // Si falla la People API (permisos no concedidos, API no habilitada, etc.)
    // los datos básicos del ID token siguen disponibles — no bloquear el flujo.
    console.warn('People API: no se pudieron obtener datos extendidos:', peopleErr.message);
  }

  return resultado;
}

/* Helper: calcular edad a partir de año, mes y día de nacimiento */
function calcularEdad(year, month, day) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - year;
  const mesActual = hoy.getMonth() + 1; // 1 - 12
  if (mesActual < month || (mesActual === month && hoy.getDate() < day)) {
    edad--;
  }
  return edad;
}

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

    // Verificar contraseña (previniendo fallo de bcrypt si password_hash es nulo por ser cuenta de Google)
    const validPassword = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
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
   POST /api/auth/google
   Body: { code }   ← Authorization Code de Google Identity Services
   Intercambia el código por tokens, obtiene datos del perfil vía People API:
     - Si existe el google_id → login directo
     - Si existe el email → vincula google_id y hace login
     - Si no existe → devuelve { status: 'needs_registration' }
       con todos los datos recuperados automáticamente de Google
       para que el usuario solo complete su carrera y consentimiento.
   ─────────────────────────────────────────── */
router.post('/google', async (req, res) => {
  try {
    const { code, credential } = req.body;

    // Soportar tanto authorization code (nuevo) como ID token (legacy/fallback)
    if (!code && !credential) {
      return res.status(400).json({ error: 'Se requiere el código de autorización de Google' });
    }
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google no está configurado en el servidor (falta GOOGLE_CLIENT_ID)' });
    }

    let googleData;

    if (code) {
      // Flujo nuevo: Authorization Code → tokens → People API
      if (!GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google no está configurado en el servidor (falta GOOGLE_CLIENT_SECRET para el flujo de código)' });
      }
      try {
        googleData = await obtenerDatosGoogleDesdeCode(code);
      } catch (codeErr) {
        console.error('Error al intercambiar código de Google:', codeErr.message);
        return res.status(401).json({ error: 'Código de Google inválido o expirado' });
      }
    } else {
      // Fallback legacy: ID Token (por compatibilidad — no obtiene datos extendidos)
      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.error('Token de Google inválido:', verifyErr.message);
        return res.status(401).json({ error: 'Token de Google inválido o expirado' });
      }
      googleData = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture || null,
        birthday: null,
        gender: null,
        fechaNacimiento: null,
        edad: null,
      };
    }

    const { googleId, email } = googleData;
    if (!email) {
      return res.status(400).json({ error: 'Google no proporcionó un correo electrónico' });
    }

    // 1. Buscar por google_id (sesiones posteriores)
    let userResult = await query(
      `SELECT u.id, u.nombre_completo, u.email, u.rol_id, r.nombre AS rol_nombre,
              u.edad, u.genero, u.carrera, u.autoriza_compartir_datos,
              u.foto_perfil, u.fecha_nacimiento
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE u.google_id = $1`,
      [googleId]
    );

    if (userResult.rows.length === 0) {
      // 2. Buscar por email (cuenta tradicional que nunca usó Google antes)
      userResult = await query(
        `SELECT u.id, u.nombre_completo, u.email, u.rol_id, r.nombre AS rol_nombre,
                u.edad, u.genero, u.carrera, u.autoriza_compartir_datos,
                u.foto_perfil, u.fecha_nacimiento
           FROM usuarios u
           JOIN roles r ON r.id = u.rol_id
          WHERE u.email = $1`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length > 0) {
        // Vincular google_id a la cuenta existente y actualizar foto si la hay
        const updateFields = ['google_id = $1'];
        const updateValues = [googleId];
        let paramIdx = 2;

        if (googleData.picture) {
          updateFields.push(`foto_perfil = COALESCE(foto_perfil, $${paramIdx})`);
          updateValues.push(googleData.picture);
          paramIdx++;
        }

        updateValues.push(userResult.rows[0].id);
        await query(
          `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
          updateValues
        );
      } else {
        // 3. Usuario nuevo: generar token temporal firmado con los datos recuperados
        // automáticamente de Google para que el frontend solo pida carrera y consentimiento.
        const registroToken = jwt.sign(
          {
            type: 'google_registration',
            googleId,
            email: email.toLowerCase(),
            name: googleData.name || '',
            picture: googleData.picture || null,
            gender: googleData.gender || null,
            edad: googleData.edad ?? null,
            fechaNacimiento: googleData.fechaNacimiento || null,
          },
          JWT_SECRET,
          { expiresIn: '15m' }
        );

        return res.json({
          status: 'needs_registration',
          isNewUser: true,
          registroToken,
          // Datos obtenidos automáticamente de Google
          google: {
            googleId,
            email: email.toLowerCase(),
            name: googleData.name,
            picture: googleData.picture,
            gender: googleData.gender,
            edad: googleData.edad,
            fechaNacimiento: googleData.fechaNacimiento,
          },
        });
      }
    }

    // Login con cuenta existente (por google_id o por email vinculado)
    const user = userResult.rows[0];

    // Actualizar foto de perfil si cambió en Google
    if (googleData.picture && googleData.picture !== user.foto_perfil) {
      await query('UPDATE usuarios SET foto_perfil = $1 WHERE id = $2', [googleData.picture, user.id]);
      user.foto_perfil = googleData.picture;
    }

    const token = jwt.sign(
      { id: user.id, nombre_completo: user.nombre_completo, email: user.email, rol_id: user.rol_id, rol_nombre: user.rol_nombre },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    registrarActividad(user.id, 'login_google', { rol: user.rol_nombre });

    res.json({
      status: 'login',
      message: 'Login con Google exitoso',
      token,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol_nombre: user.rol_nombre,
        edad: user.edad,
        genero: user.genero,
        carrera: user.carrera,
        foto_perfil: user.foto_perfil,
        fecha_nacimiento: user.fecha_nacimiento,
        autoriza_compartir_datos: user.autoriza_compartir_datos,
      },
    });
  } catch (err) {
    console.error('Error en /auth/google:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* ───────────────────────────────────────────
   POST /api/auth/google/completar-registro
   Body: { registroToken | code | credential, carrera, autoriza_compartir_datos }
   Crea el usuario en PostgreSQL asociando los datos automáticos de Google
   y los datos del formulario (carrera y consentimiento).
   ─────────────────────────────────────────── */
router.post('/google/completar-registro', async (req, res) => {
  try {
    const {
      registroToken,
      code,
      credential,
      carrera,
      autoriza_compartir_datos,
    } = req.body;

    if (!registroToken && !code && !credential) {
      return res.status(400).json({ error: 'Se requiere el token de registro o credencial de Google' });
    }

    // Validar carrera (único campo manual)
    if (!carrera || typeof carrera !== 'string' || !carrera.trim()) {
      return res.status(400).json({ error: 'Debes indicar tu carrera o programa académico' });
    }

    // Validar consentimiento explícito (debe ser estrictamente boolean, no undefined ni null)
    if (typeof autoriza_compartir_datos !== 'boolean') {
      return res.status(400).json({
        error: 'Debes seleccionar explícitamente si autorizas o no la compartición de información'
      });
    }

    // Obtener datos de Google
    let googleData;
    if (registroToken) {
      try {
        const decoded = jwt.verify(registroToken, JWT_SECRET);
        if (decoded.type !== 'google_registration') {
          return res.status(400).json({ error: 'Token de registro inválido' });
        }
        googleData = decoded;
      } catch (tErr) {
        return res.status(401).json({ error: 'La sesión de registro expiró. Por favor inicia sesión con Google nuevamente.' });
      }
    } else if (code) {
      if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'Google no está configurado en el servidor' });
      }
      if (!GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google no está configurado en el servidor (falta GOOGLE_CLIENT_SECRET)' });
      }
      try {
        googleData = await obtenerDatosGoogleDesdeCode(code);
      } catch (codeErr) {
        console.error('Error al intercambiar código de Google:', codeErr.message);
        return res.status(401).json({ error: 'Código de Google inválido o expirado' });
      }
    } else {
      // Fallback legacy: ID Token
      if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'Google no está configurado en el servidor' });
      }
      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.error('Token de Google inválido:', verifyErr.message);
        return res.status(401).json({ error: 'Token de Google inválido o expirado' });
      }
      googleData = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture || null,
        birthday: null,
        gender: null,
        fechaNacimiento: null,
        edad: null,
      };
    }

    const { googleId, email } = googleData;
    if (!email) {
      return res.status(400).json({ error: 'Google no proporcionó un correo electrónico' });
    }

    // Nombre: obtenido de Google automáticamente
    const nombreCompleto = googleData.name || email.split('@')[0];

    // Verificar si ya existe por google_id o email
    const existing = await query(
      'SELECT id, rol_id FROM usuarios WHERE google_id = $1 OR email = $2',
      [googleId, email.toLowerCase()]
    );

    // Alcance descriptivo del consentimiento según la decisión tomada
    const alcanceConsentimiento = autoriza_compartir_datos
      ? 'Consentimiento explícito otorgado: Uso interno en plataforma STEAM y compartición con docentes/institución para seguimiento y analíticas académicas.'
      : 'Consentimiento denegado: Solo uso operativo esencial en plataforma STEAM. Prohibida la compartición con terceros o analíticas externas.';

    if (existing.rows.length > 0) {
      // Si ya existía, actualizar los datos (incluidos los automáticos de Google)
      const existingId = existing.rows[0].id;

      await query(
        `UPDATE usuarios
            SET google_id = COALESCE(google_id, $1),
                nombre_completo = $2,
                carrera = $3,
                autoriza_compartir_datos = $4,
                fecha_consentimiento = NOW(),
                alcance_consentimiento = $5,
                foto_perfil = COALESCE($6, foto_perfil),
                edad = COALESCE($7, edad),
                genero = COALESCE($8, genero),
                fecha_nacimiento = COALESCE($9, fecha_nacimiento)
          WHERE id = $10`,
        [
          googleId,
          nombreCompleto.trim(),
          carrera.trim(),
          autoriza_compartir_datos,
          alcanceConsentimiento,
          googleData.picture ?? null,
          googleData.edad ?? null,
          googleData.gender ?? null,
          googleData.fechaNacimiento ?? null,
          existingId,
        ]
      );

      const userFull = await query(
        `SELECT u.id, u.nombre_completo, u.email, u.rol_id, r.nombre AS rol_nombre,
                u.edad, u.genero, u.carrera, u.autoriza_compartir_datos,
                u.foto_perfil, u.fecha_nacimiento
           FROM usuarios u
           JOIN roles r ON r.id = u.rol_id
          WHERE u.id = $1`,
        [existingId]
      );
      const user = userFull.rows[0];

      const token = jwt.sign(
        { id: user.id, nombre_completo: user.nombre_completo, email: user.email, rol_id: user.rol_id, rol_nombre: user.rol_nombre },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        message: 'Registro completado exitosamente',
        token,
        user,
      });
    }

    // Obtener rol 'alumno' para nuevos registros
    const rolResult = await query("SELECT id, nombre FROM roles WHERE nombre = 'alumno'");
    if (rolResult.rows.length === 0) {
      return res.status(500).json({ error: 'Rol alumno no encontrado. Ejecuta seed primero.' });
    }
    const rolId = rolResult.rows[0].id;
    const rolNombre = rolResult.rows[0].nombre;

    // Insertar nuevo usuario con datos automáticos + carrera manual
    const insertResult = await query(
      `INSERT INTO usuarios (
         nombre_completo,
         email,
         password_hash,
         rol_id,
         google_id,
         edad,
         genero,
         carrera,
         foto_perfil,
         fecha_nacimiento,
         autoriza_compartir_datos,
         fecha_consentimiento,
         alcance_consentimiento,
         creado_en
       )
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, NOW())
       RETURNING id, nombre_completo, email, rol_id, edad, genero, carrera,
                 foto_perfil, fecha_nacimiento,
                 autoriza_compartir_datos, fecha_consentimiento, alcance_consentimiento`,
      [
        nombreCompleto.trim(),
        email.toLowerCase(),
        rolId,
        googleId,
        googleData.edad ?? null,          // null si Google no lo proporcionó
        googleData.gender ?? null,        // null si Google no lo proporcionó
        carrera.trim(),
        googleData.picture ?? null,       // null si no hay foto
        googleData.fechaNacimiento ?? null, // null si Google no lo proporcionó
        autoriza_compartir_datos,
        alcanceConsentimiento,
      ]
    );

    const nuevoUser = {
      ...insertResult.rows[0],
      rol_nombre: rolNombre,
    };

    const token = jwt.sign(
      {
        id: nuevoUser.id,
        nombre_completo: nuevoUser.nombre_completo,
        email: nuevoUser.email,
        rol_id: nuevoUser.rol_id,
        rol_nombre: nuevoUser.rol_nombre,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    registrarActividad(nuevoUser.id, 'registro_google', {
      email: nuevoUser.email,
      edad: nuevoUser.edad,
      genero: nuevoUser.genero,
      carrera: nuevoUser.carrera,
      foto_perfil: nuevoUser.foto_perfil ? '(presente)' : null,
      fecha_nacimiento: nuevoUser.fecha_nacimiento,
      autoriza_compartir_datos: nuevoUser.autoriza_compartir_datos,
      datos_auto: 'People API',
    });

    return res.status(201).json({
      message: 'Cuenta creada con Google exitosamente',
      token,
      user: {
        id: nuevoUser.id,
        nombre_completo: nuevoUser.nombre_completo,
        email: nuevoUser.email,
        rol_nombre: nuevoUser.rol_nombre,
        edad: nuevoUser.edad,
        genero: nuevoUser.genero,
        carrera: nuevoUser.carrera,
        foto_perfil: nuevoUser.foto_perfil,
        fecha_nacimiento: nuevoUser.fecha_nacimiento,
        autoriza_compartir_datos: nuevoUser.autoriza_compartir_datos,
      },
    });
  } catch (err) {
    console.error('Error en /auth/google/completar-registro:', err);
    res.status(500).json({ error: 'Error interno del servidor al completar registro' });
  }
});

/* ───────────────────────────────────────────
   GET /api/auth/me
   Header: Authorization: Bearer <token>
   ─────────────────────────────────────────── */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre_completo, u.email, u.rol_id, r.nombre AS rol_nombre,
              u.edad, u.genero, u.carrera, u.autoriza_compartir_datos,
              u.fecha_consentimiento, u.alcance_consentimiento,
              u.foto_perfil, u.fecha_nacimiento, u.creado_en
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
