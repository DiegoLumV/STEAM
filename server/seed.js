/**
 * Seed script – Inserta roles iniciales y un usuario admin por defecto.
 * Ejecutar con: npm run seed
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { query } from './db.js';
import pool from './db.js';

const ROLES = [
  { nombre: 'admin', descripcion: 'Administrador del sistema' },
  { nombre: 'profesor', descripcion: 'Profesor que crea rutas de aprendizaje' },
  { nombre: 'alumno', descripcion: 'Estudiante que sigue las rutas' },
];

const ADMIN_USER = {
  nombre_completo: 'Administrador',
  email: 'admin@casasteam.com',
  password: 'Admin123!',
};

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  try {
    // 1. Insertar roles
    for (const rol of ROLES) {
      const exists = await query('SELECT id FROM roles WHERE nombre = $1', [rol.nombre]);
      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO roles (nombre, descripcion) VALUES ($1, $2)',
          [rol.nombre, rol.descripcion]
        );
        console.log(`   ✅ Rol "${rol.nombre}" creado`);
      } else {
        console.log(`   ⏭️  Rol "${rol.nombre}" ya existe`);
      }
    }

    // 2. Crear usuario admin
    const adminExists = await query('SELECT id FROM usuarios WHERE email = $1', [ADMIN_USER.email]);
    if (adminExists.rows.length === 0) {
      const rolAdmin = await query("SELECT id FROM roles WHERE nombre = 'admin'");
      const passwordHash = await bcrypt.hash(ADMIN_USER.password, 10);

      await query(
        `INSERT INTO usuarios (nombre_completo, email, password_hash, rol_id, creado_en)
         VALUES ($1, $2, $3, $4, NOW())`,
        [ADMIN_USER.nombre_completo, ADMIN_USER.email, passwordHash, rolAdmin.rows[0].id]
      );
      console.log(`\n   ✅ Usuario admin creado:`);
      console.log(`      Email:    ${ADMIN_USER.email}`);
      console.log(`      Password: ${ADMIN_USER.password}`);
    } else {
      console.log(`\n   ⏭️  Usuario admin ya existe`);
    }

    console.log('\n🎉 Seed completado exitosamente!\n');
  } catch (err) {
    console.error('\n❌ Error en seed:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

seed();
