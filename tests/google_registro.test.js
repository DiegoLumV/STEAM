import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import pool, { query } from '../server/db.js';
import { aplicarMigraciones } from '../server/migraciones.js';

test('1. Migraciones: Verificar que las columnas requeridas existen en usuarios', async () => {
  // Ejecutar migraciones para verificar idempotencia
  await aplicarMigraciones(query, () => {});

  const res = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
      AND column_name IN (
        'nombre_completo',
        'google_id',
        'edad',
        'genero',
        'carrera',
        'autoriza_compartir_datos',
        'fecha_consentimiento',
        'alcance_consentimiento',
        'foto_perfil',
        'fecha_nacimiento'
      )
  `);

  const cols = res.rows.reduce((acc, row) => {
    acc[row.column_name] = row.data_type;
    return acc;
  }, {});

  assert.ok(cols.nombre_completo, 'Columna nombre_completo debe existir');
  assert.ok(cols.google_id, 'Columna google_id debe existir');
  assert.equal(cols.edad, 'integer', 'Columna edad debe ser integer');
  assert.equal(cols.genero, 'character varying', 'Columna genero debe ser varchar');
  assert.equal(cols.carrera, 'character varying', 'Columna carrera debe ser varchar');
  assert.equal(cols.autoriza_compartir_datos, 'boolean', 'Columna autoriza_compartir_datos debe ser boolean');
  assert.ok(cols.fecha_consentimiento.includes('time'), 'Columna fecha_consentimiento debe ser timestamptz');
  assert.equal(cols.alcance_consentimiento, 'text', 'Columna alcance_consentimiento debe ser text');
  assert.equal(cols.foto_perfil, 'text', 'Columna foto_perfil debe ser text');
  assert.equal(cols.fecha_nacimiento, 'date', 'Columna fecha_nacimiento debe ser date');
});

test('2. Registro con Google - Opción Autorizar: almacena todos los campos y consentimiento explícito en PostgreSQL', async () => {
  const testGoogleId = 'test_google_auth_user_' + Date.now();
  const testEmail = `test_google_autorizado_${Date.now()}@gmail.com`;

  // Limpiar si existiera
  await query('DELETE FROM usuarios WHERE email = $1 OR google_id = $2', [testEmail, testGoogleId]);

  const rolRes = await query("SELECT id FROM roles WHERE nombre = 'alumno'");
  const rolId = rolRes.rows[0].id;

  const alcanceConsentimiento = 'Consentimiento explícito otorgado: Uso interno en plataforma STEAM y compartición con docentes/institución para seguimiento y analíticas académicas.';

  const insertRes = await query(
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
      'María González Test',
      testEmail,
      rolId,
      testGoogleId,
      21,
      'Femenino',
      'Ingeniería en Tecnologías de la Información',
      'https://lh3.googleusercontent.com/a/foto_maria.jpg',
      '2005-01-15',
      true, // AUTORIZAR
      alcanceConsentimiento
    ]
  );

  const user = insertRes.rows[0];
  assert.ok(user.id > 0);
  assert.equal(user.nombre_completo, 'María González Test');
  assert.equal(user.email, testEmail);
  assert.equal(user.edad, 21);
  assert.equal(user.genero, 'Femenino');
  assert.equal(user.carrera, 'Ingeniería en Tecnologías de la Información');
  assert.equal(user.foto_perfil, 'https://lh3.googleusercontent.com/a/foto_maria.jpg');
  assert.ok(user.fecha_nacimiento);
  assert.equal(user.autoriza_compartir_datos, true);
  assert.ok(user.fecha_consentimiento instanceof Date);
  assert.equal(user.alcance_consentimiento, alcanceConsentimiento);

  // Consulta equivalente a pgAdmin 4
  const pgAdminQuery = await query(`
    SELECT id, nombre_completo, email, google_id, edad, genero, carrera,
           foto_perfil, fecha_nacimiento,
           autoriza_compartir_datos, fecha_consentimiento, alcance_consentimiento
    FROM usuarios
    WHERE id = $1
  `, [user.id]);

  assert.equal(pgAdminQuery.rows.length, 1);
  assert.equal(pgAdminQuery.rows[0].autoriza_compartir_datos, true);
  assert.equal(pgAdminQuery.rows[0].foto_perfil, 'https://lh3.googleusercontent.com/a/foto_maria.jpg');

  // Limpieza
  await query('DELETE FROM usuarios WHERE id = $1', [user.id]);
});

test('3. Registro con Google - Opción No Autorizar: almacena rechazo y restringe compartición', async () => {
  const testGoogleId = 'test_google_noauth_user_' + Date.now();
  const testEmail = `test_google_noautorizado_${Date.now()}@gmail.com`;

  const rolRes = await query("SELECT id FROM roles WHERE nombre = 'alumno'");
  const rolId = rolRes.rows[0].id;

  const alcanceConsentimiento = 'Consentimiento denegado: Solo uso operativo esencial en plataforma STEAM. Prohibida la compartición con terceros o analíticas externas.';

  const insertRes = await query(
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
      'Carlos Méndez Test',
      testEmail,
      rolId,
      testGoogleId,
      24,
      'Masculino',
      'Ingeniería Mecatrónica',
      null, // sin foto
      null, // sin fecha de nacimiento
      false, // NO AUTORIZAR
      alcanceConsentimiento
    ]
  );

  const user = insertRes.rows[0];
  assert.ok(user.id > 0);
  assert.equal(user.nombre_completo, 'Carlos Méndez Test');
  assert.equal(user.email, testEmail);
  assert.equal(user.edad, 24);
  assert.equal(user.genero, 'Masculino');
  assert.equal(user.carrera, 'Ingeniería Mecatrónica');
  assert.equal(user.foto_perfil, null);
  assert.equal(user.fecha_nacimiento, null);
  assert.equal(user.autoriza_compartir_datos, false);
  assert.ok(user.fecha_consentimiento instanceof Date);
  assert.equal(user.alcance_consentimiento, alcanceConsentimiento);

  // Consulta SQL verificadora en PostgreSQL
  const pgAdminQuery = await query(`
    SELECT id, nombre_completo, email, google_id, edad, genero, carrera,
           autoriza_compartir_datos, fecha_consentimiento, alcance_consentimiento
    FROM usuarios
    WHERE id = $1
  `, [user.id]);

  assert.equal(pgAdminQuery.rows.length, 1);
  assert.equal(pgAdminQuery.rows[0].autoriza_compartir_datos, false);

  // Limpieza
  await query('DELETE FROM usuarios WHERE id = $1', [user.id]);
});

test('4. Compatibilidad con cuentas existentes: los usuarios antiguos tienen campos null sin fallar', async () => {
  const adminRes = await query("SELECT id, nombre_completo, email, edad, genero, carrera, autoriza_compartir_datos FROM usuarios WHERE email = 'admin@casasteam.com'");
  assert.equal(adminRes.rows.length, 1);
  const admin = adminRes.rows[0];
  assert.equal(admin.nombre_completo, 'Administrador');
  // Deben ser null para cuentas creadas antes de la migración
  assert.equal(admin.edad, null);
  assert.equal(admin.genero, null);
  assert.equal(admin.carrera, null);
  assert.equal(admin.autoriza_compartir_datos, null);
});

test('5. Validaciones de servidor en completar-registro: valida campos manuales y autenticidad del token', async () => {
  const authRouter = (await import('../server/routes/auth.js')).default;
  const JWT_SECRET = process.env.JWT_SECRET || 'casasteam_fallback_secret';

  // Helper para simular petición req/res a Express Router
  const runRoute = (method, url, body) => {
    return new Promise((resolve) => {
      const req = { method, url, body };
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { resolve({ statusCode: this.statusCode, body: data }); }
      };
      authRouter.handle(req, res, () => resolve({ statusCode: 404, body: {} }));
    });
  };

  // Sin token / código / credencial
  let r = await runRoute('POST', '/google/completar-registro', {
    carrera: 'Ing. Sistemas',
    autoriza_compartir_datos: true
  });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /token|código|credencial/i);

  // Sin carrera
  r = await runRoute('POST', '/google/completar-registro', {
    registroToken: 'token_prueba',
    carrera: '   ',
    autoriza_compartir_datos: true
  });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /carrera/i);

  // Sin selección de consentimiento (undefined o no boolean)
  r = await runRoute('POST', '/google/completar-registro', {
    registroToken: 'token_prueba',
    carrera: 'Ing. Mecatrónica',
    autoriza_compartir_datos: undefined
  });
  assert.equal(r.statusCode, 400);
  assert.match(r.body.error, /consentimiento|autorizas o no/i);

  // Token de registro inválido o expirado
  r = await runRoute('POST', '/google/completar-registro', {
    registroToken: 'jwt_invalido_expirado',
    carrera: 'Ing. Mecatrónica',
    autoriza_compartir_datos: true
  });
  assert.equal(r.statusCode, 401);
  assert.match(r.body.error, /expiró|inválido/i);

  // Flujo completo exitoso con registroToken válido (datos automáticos de Google)
  const testGoogleId = 'test_token_sub_' + Date.now();
  const testEmail = `test_token_auto_${Date.now()}@gmail.com`;

  const validToken = jwt.sign(
    {
      type: 'google_registration',
      googleId: testGoogleId,
      email: testEmail,
      name: 'Valeria Mendoza Automática',
      picture: 'https://lh3.googleusercontent.com/a/avatar_valeria.jpg',
      gender: 'Femenino',
      edad: 21,
      fechaNacimiento: '2005-03-20',
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  r = await runRoute('POST', '/google/completar-registro', {
    registroToken: validToken,
    carrera: 'Ingeniería en Tecnologías de la Información',
    autoriza_compartir_datos: true,
  });

  assert.equal(r.statusCode, 201);
  assert.ok(r.body.token, 'Debe devolver un JWT de sesión');
  assert.equal(r.body.user.email, testEmail);
  assert.equal(r.body.user.nombre_completo, 'Valeria Mendoza Automática');
  assert.equal(r.body.user.foto_perfil, 'https://lh3.googleusercontent.com/a/avatar_valeria.jpg');
  assert.equal(r.body.user.edad, 21);
  assert.equal(r.body.user.genero, 'Femenino');
  assert.equal(r.body.user.carrera, 'Ingeniería en Tecnologías de la Información');
  assert.equal(r.body.user.autoriza_compartir_datos, true);

  // Verificar directamente en PostgreSQL
  const checkDb = await query('SELECT * FROM usuarios WHERE email = $1', [testEmail]);
  assert.equal(checkDb.rows.length, 1);
  assert.equal(checkDb.rows[0].google_id, testGoogleId);
  assert.equal(checkDb.rows[0].foto_perfil, 'https://lh3.googleusercontent.com/a/avatar_valeria.jpg');

  // Limpieza
  await query('DELETE FROM usuarios WHERE email = $1', [testEmail]);
});

test.after(async () => {
  await pool.end();
});
