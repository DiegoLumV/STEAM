// server/migrar.js
// Opcional: node server/migrar.js aplica el esquema sin levantar el servidor.
// Ya NO es necesario correrlo a mano en desarrollo — index.js lo hace solo
// al arrancar. Esto sirve para un paso de "build/deploy" separado si algún
// día despliegan en un servidor real y quieren migrar antes de reiniciar.
import pool, { query } from './db.js';
import { aplicarMigraciones } from './migraciones.js';

(async () => {
  console.log('Aplicando migraciones...\n');
  try {
    await aplicarMigraciones(query);
  } catch (e) {
    console.error('\n❌ Migración fallida:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
