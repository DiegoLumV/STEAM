import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ProyectoUPV',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      10,
  idleTimeoutMillis: 30000,
});

// Verificar conexión al arrancar
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL – ProyectoUPV');
});

pool.on('error', (err) => {
  console.error('❌ Error en pool de PostgreSQL:', err.message);
});

/**
 * Ejecuta una consulta SQL contra la BD.
 * @param {string} text  – SQL query
 * @param {any[]}  params – parámetros $1, $2 …
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
