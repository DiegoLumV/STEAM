// server/migrar_una.js
// Ejecuta ÚNICAMENTE la migración 014_evaluaciones_habilidad_columnas, y SOLO en la base local
// ProyectoUPV_verif_tmp. No usa server/db.js (su nombre de base sale de DB_NAME y cae en 'ProyectoUPV').
//
//   node server/migrar_una.js            → PRUEBA: ejecuta dentro de una transacción y termina con ROLLBACK.
//   node server/migrar_una.js --aplicar  → igual, pero termina con COMMIT.
//
// Cualquier otro argumento se rechaza. Nunca imprime contraseñas ni el contenido de .env.
import pg from 'pg';
import dotenv from 'dotenv';
import { MIGRACIONES } from './migraciones.js';

dotenv.config();   // solo para host, puerto, usuario y contraseña; el nombre de la base NO se toma del entorno

const ID_MIGRACION = '014_evaluaciones_habilidad_columnas';
const BD_DESTINO = 'ProyectoUPV_verif_tmp';
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1'];
const TABLAS_REQUERIDAS = ['usuarios', 'sesiones_simulacion', 'actividades_criticas', 'evaluaciones_habilidad'];
const ARGUMENTOS_PERMITIDOS = ['--aplicar'];

async function estado(client) {
  const { rows: cols } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'evaluaciones_habilidad'
      ORDER BY ordinal_position`);
  const { rows: [{ n }] } = await client.query('SELECT count(*)::int AS n FROM evaluaciones_habilidad');
  const nombres = cols.map(c => c.column_name);
  let nulos = null;
  if (['alumno_id', 'actividad_id', 'fecha'].every(c => nombres.includes(c))) {
    nulos = (await client.query(
      `SELECT count(*) FILTER (WHERE alumno_id    IS NULL)::int AS alumno_id,
              count(*) FILTER (WHERE actividad_id IS NULL)::int AS actividad_id,
              count(*) FILTER (WHERE fecha        IS NULL)::int AS fecha
         FROM evaluaciones_habilidad`)).rows[0];
  }
  return { cols, n, nulos };
}

function mostrar(titulo, e) {
  console.log(`\n${titulo}: ${e.n} filas, ${e.cols.length} columnas`);
  for (const c of e.cols) {
    console.log(`  - ${c.column_name}  ${c.data_type}  ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}` +
      (c.column_default ? `  default=${c.column_default}` : ''));
  }
  if (e.nulos) console.log(`  filas con NULL → alumno_id: ${e.nulos.alumno_id}, actividad_id: ${e.nulos.actividad_id}, fecha: ${e.nulos.fecha}`);
}

async function main() {
  // 1) Argumentos: solo se admite ningún argumento (prueba) o exactamente --aplicar.
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(a => !ARGUMENTOS_PERMITIDOS.includes(a))) {
    console.error(`ERROR: argumento no permitido: ${JSON.stringify(args)}`);
    console.error('Uso: node server/migrar_una.js            (prueba, termina con ROLLBACK)');
    console.error('     node server/migrar_una.js --aplicar  (confirma con COMMIT)');
    return 2;
  }
  const aplicar = args[0] === '--aplicar';

  // 2) Solo conexiones locales.
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  if (!HOSTS_LOCALES.includes(host)) {
    console.error(`ERROR: DB_HOST debe ser localhost, 127.0.0.1 o ::1 (recibido: ${JSON.stringify(host)}). No se hizo nada.`);
    return 1;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('ERROR: DB_PORT no es un puerto válido. No se hizo nada.');
    return 1;
  }

  // 3) Solo la migración 014, tomada de server/migraciones.js.
  const defs = MIGRACIONES.filter(m => m.id === ID_MIGRACION);
  if (defs.length !== 1 || !Array.isArray(defs[0].sql) || defs[0].sql.length === 0) {
    console.error(`ERROR: no se encontró exactamente una migración '${ID_MIGRACION}' en server/migraciones.js.`);
    return 1;
  }
  const sentencias = defs[0].sql;

  console.log(`Migración: ${ID_MIGRACION} (${sentencias.length} instrucciones)`);
  console.log(`Destino:   ${BD_DESTINO} en ${host}:${port}`);
  console.log(aplicar ? 'Modo:      APLICAR (terminará con COMMIT)' : 'Modo:      PRUEBA (terminará con ROLLBACK; no se guarda nada)');

  // 4) Cliente independiente; la base está escrita en el código, no viene de DB_NAME.
  const client = new pg.Client({
    host, port,
    database: BD_DESTINO,
    user: process.env.DB_USER || 'postgres',
    ...(process.env.DB_PASSWORD ? { password: process.env.DB_PASSWORD } : {}),
    connectionTimeoutMillis: 10000,
  });
  client.on('notice', n => console.log(`  aviso: ${n.message}`));

  let enTransaccion = false;
  let confirmado = false;
  try {
    await client.connect();

    // 5) La conexión debe estar realmente en la base esperada, antes de cualquier escritura.
    const { rows: [{ db }] } = await client.query('SELECT current_database() AS db');
    if (db !== BD_DESTINO) {
      throw new Error(`la conexión está en la base '${db}' y no en '${BD_DESTINO}'. Se aborta sin escribir.`);
    }

    // 6) Tablas requeridas.
    const faltan = [];
    for (const t of TABLAS_REQUERIDAS) {
      const { rows: [r] } = await client.query('SELECT to_regclass($1) AS oid', [t]);
      if (!r.oid) faltan.push(t);
    }
    if (faltan.length) throw new Error(`faltan tablas requeridas: ${faltan.join(', ')}. Se aborta sin escribir.`);

    const antes = await estado(client);
    mostrar('ANTES', antes);

    // 7) Todo dentro de una transacción.
    console.log('\nEjecutando instrucciones...');
    await client.query('BEGIN');
    enTransaccion = true;
    await client.query(`SET LOCAL lock_timeout = '15s'`);   // no esperar indefinidamente si hay otra sesión usando la tabla
    for (let i = 0; i < sentencias.length; i++) {
      let r;
      try {
        r = await client.query(sentencias[i]);
      } catch (e) {
        e.instruccion = i + 1;
        throw e;
      }
      const resumen = sentencias[i].replace(/\s+/g, ' ').trim().slice(0, 95);
      const extra = r.command === 'UPDATE' ? `  → ${r.rowCount} filas modificadas` : '';
      console.log(`  ${i + 1}/${sentencias.length} [${r.command}] ${resumen}${extra}`);
    }

    const despues = await estado(client);
    mostrar('DESPUÉS (dentro de la transacción)', despues);
    if (despues.n !== antes.n) throw new Error(`el número de filas cambió (${antes.n} → ${despues.n}); no se confirma.`);

    // 8) Cierre de la transacción según el modo.
    if (aplicar) {
      await client.query('COMMIT');
      confirmado = true;
    } else {
      await client.query('ROLLBACK');
    }
    enTransaccion = false;

    // 9) Verificación posterior, ya fuera de la transacción.
    const final = await estado(client);
    if (aplicar) {
      mostrar('FINAL (confirmado con COMMIT)', final);
      console.log('\nOK: migración 014 aplicada en ' + BD_DESTINO + '.');
    } else if (JSON.stringify(final.cols) === JSON.stringify(antes.cols) && final.n === antes.n) {
      console.log('\nOK (prueba): ROLLBACK realizado; la base quedó exactamente como estaba. Nada se guardó.');
    } else {
      throw new Error('tras el ROLLBACK el esquema no coincide con el inicial; revisa la base manualmente.');
    }
    return 0;
  } catch (e) {
    if (enTransaccion) {
      try { await client.query('ROLLBACK'); console.error('\nSe hizo ROLLBACK: no se guardó ningún cambio.'); }
      catch { console.error('\nNo se pudo confirmar el ROLLBACK; la conexión se cerrará y PostgreSQL descartará la transacción.'); }
    }
    const donde = e.instruccion ? ` en la instrucción ${e.instruccion}/${sentencias.length}` : '';
    console.error(`\nERROR${donde}: ${e.message}`);
    if (confirmado) console.error('El COMMIT ya se había realizado antes de este error.');
    return 1;
  } finally {
    try { await client.end(); } catch { /* conexión ya cerrada */ }
  }
}

main().then(codigo => { process.exitCode = codigo; })
  .catch(e => { console.error(`ERROR inesperado: ${e.message}`); process.exitCode = 1; });
