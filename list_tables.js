import pool from './server/db.js';
async function listTables() {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  console.log(result.rows.map(r => r.table_name));
  process.exit(0);
}
listTables();
