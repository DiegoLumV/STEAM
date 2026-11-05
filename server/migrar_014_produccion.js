// server/migrar_014_produccion.js
// Aplica ÚNICAMENTE la migración 014_evaluaciones_habilidad_columnas en la base original ProyectoUPV.
// No usa server/db.js ni DB_NAME: el destino está escrito aquí. Las sentencias SQL NO se copian: se toman
// de server/migraciones.js (MIGRACIONES) y se comprueba su huella antes de ejecutarlas.
//
//   node server/migrar_014_produccion.js            → PRUEBA: transacción que termina SIEMPRE con ROLLBACK.
//   node server/migrar_014_produccion.js --aplicar  → pide confirmación escrita y termina con COMMIT.
//
// Recomendado antes de --aplicar: detener el servidor y tener un respaldo reciente (pg_dump).
// Nunca imprime contraseñas ni el contenido de .env.
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import pg from 'pg';
import dotenv from 'dotenv';
import { MIGRACIONES } from './migraciones.js';

dotenv.config();   // solo host, puerto, usuario y contraseña; el nombre de la base NO se toma del entorno

const ID_MIGRACION = '014_evaluaciones_habilidad_columnas';
const BD_DESTINO = 'ProyectoUPV';
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1'];
const TABLAS_REQUERIDAS = ['usuarios', 'sesiones_simulacion', 'actividades_criticas', 'evaluaciones_habilidad'];
const ARGUMENTOS_PERMITIDOS = ['--aplicar'];
const FRASE_CONFIRMACION = `APLICAR EN ${BD_DESTINO}`;
// SHA-256 de JSON.stringify(sql) de la migración 014 tal como está hoy. Si alguien cambia esas sentencias,
// el programa se detiene en lugar de ejecutar algo que no fue revisado.
const HUELLA_014 = 'd16375c60644e6a6c3f9a6393a0707da6e2ef2d194b266f22b09838c452533d4';

const REGLA_FK = { a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' };

async function estado(client) {
  const { rows: cols } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'evaluaciones_habilidad'
      ORDER BY ordinal_position`);
  const { rows: [{ n }] } = await client.query('SELECT count(*)::int AS n FROM evaluaciones_habilidad');
  // Huella de las 7 columnas originales: debe ser idéntica antes y después.
  const { rows: [{ huella }] } = await client.query(
    `SELECT COALESCE(md5(string_agg(t::text, '|' ORDER BY t.id)), 'vacia') AS huella
       FROM (SELECT id, sesion_id, habilidad_id, puntaje, intentos_fallidos, tiempo_segundos, creado_en
               FROM evaluaciones_habilidad) t`);
  const { rows: indices } = await client.query(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = current_schema() AND tablename = 'evaluaciones_habilidad' ORDER BY indexname`);
  const { rows: fks } = await client.query(
    `SELECT a.attname AS columna, cf.relname AS destino, k.confdeltype AS regla
       FROM pg_constraint k
       JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
       JOIN pg_class cf ON cf.oid = k.confrelid
      WHERE k.contype = 'f' AND k.conrelid = 'evaluaciones_habilidad'::regclass
      ORDER BY a.attnum`);
  const nombres = cols.map(c => c.column_name);
  let nulos = null;
  if (['alumno_id', 'actividad_id', 'fecha'].every(c => nombres.includes(c))) {
    nulos = (await client.query(
      `SELECT count(*) FILTER (WHERE alumno_id    IS NULL)::int AS alumno_id,
              count(*) FILTER (WHERE actividad_id IS NULL)::int AS actividad_id,
              count(*) FILTER (WHERE fecha        IS NULL)::int AS fecha
         FROM evaluaciones_habilidad`)).rows[0];
  }
  return { cols, n, huella, indices, fks, nulos };
}

function mostrar(titulo, e) {
  console.log(`\n${titulo}: ${e.n} filas, ${e.cols.length} columnas`);
  for (const c of e.cols) {
    console.log(`  - ${c.column_name}  ${c.data_type}  ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}` +
      (c.column_default ? `  default=${c.column_default}` : ''));
  }
  console.log('  índices: ' + (e.indices.map(i => i.indexname).join(', ') || '(ninguno)'));
  console.log('  claves foráneas: ' + (e.fks.map(f => `${f.columna} → ${f.destino} (ON DELETE ${REGLA_FK[f.regla] || f.regla})`).join('; ') || '(ninguna)'));
  if (e.nulos) console.log(`  filas con NULL → alumno_id: ${e.nulos.alumno_id}, actividad_id: ${e.nulos.actividad_id}, fecha: ${e.nulos.fecha}`);
}

// Comprobaciones del resultado. Devuelve la lista de problemas (vacía = todo bien).
async function verificar(client, antes, despues) {
  const p = [];
  const col = n => despues.cols.find(c => c.column_name === n);
  const a = col('alumno_id'), ac = col('actividad_id'), f = col('fecha');
  if (!a || a.data_type !== 'integer' || a.is_nullable !== 'YES') p.push('alumno_id debe ser integer y nullable');
  if (!ac || ac.data_type !== 'integer' || ac.is_nullable !== 'YES') p.push('actividad_id debe ser integer y nullable');
  if (!f || f.data_type !== 'timestamp without time zone' || f.is_nullable !== 'YES') p.push('fecha debe ser timestamp y nullable');
  else if (!/now\(\)/i.test(f.column_default || '')) p.push('fecha debe tener DEFAULT now()');
  const fk = Object.fromEntries(despues.fks.map(x => [x.columna, x]));
  if (!fk.alumno_id || fk.alumno_id.destino !== 'usuarios' || fk.alumno_id.regla !== 'c') p.push('falta FK alumno_id → usuarios ON DELETE CASCADE');
  if (!fk.actividad_id || fk.actividad_id.destino !== 'actividades_criticas' || fk.actividad_id.regla !== 'n') p.push('falta FK actividad_id → actividades_criticas ON DELETE SET NULL');
  if (!despues.indices.some(i => i.indexname === 'idx_evaluaciones_habilidad_alumno_id')) p.push('falta el índice idx_evaluaciones_habilidad_alumno_id');
  if (despues.n !== antes.n) p.push(`el número de filas cambió (${antes.n} → ${despues.n})`);
  if (despues.huella !== antes.huella) p.push('las 7 columnas originales cambiaron');
  if (p.length === 0) {
    const { rows: [r] } = await client.query(
      `SELECT (SELECT count(*) FROM evaluaciones_habilidad eh JOIN sesiones_simulacion s ON s.id = eh.sesion_id
                WHERE eh.alumno_id IS NULL)::int AS sin_alumno,
              (SELECT count(*) FROM evaluaciones_habilidad WHERE fecha IS NULL AND creado_en IS NOT NULL)::int AS sin_fecha`);
    if (r.sin_alumno > 0) p.push(`${r.sin_alumno} filas con sesión siguen sin alumno_id`);
    if (r.sin_fecha > 0) p.push(`${r.sin_fecha} filas con creado_en siguen sin fecha`);
  }
  return p;
}

async function confirmar() {
  if (!process.stdin.isTTY) {
    throw new Error('--aplicar necesita una terminal interactiva para la confirmación escrita. No se hizo nada.');
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`\n!!! Vas a modificar la base ORIGINAL ${BD_DESTINO}. Se recomienda tener el servidor detenido y un respaldo reciente.`);
    const r = await rl.question(`Escribe exactamente  ${FRASE_CONFIRMACION}  para continuar (cualquier otra cosa cancela): `);
    if (r.trim() !== FRASE_CONFIRMACION) throw new Error('Confirmación incorrecta o vacía. No se hizo nada.');
  } finally {
    rl.close();
  }
}

async function main() {
  // 1) Argumentos: ninguno (prueba) o exactamente --aplicar.
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(a => !ARGUMENTOS_PERMITIDOS.includes(a))) {
    console.error(`ERROR: argumento no permitido: ${JSON.stringify(args)}`);
    console.error('Uso: node server/migrar_014_produccion.js            (prueba, termina con ROLLBACK)');
    console.error('     node server/migrar_014_produccion.js --aplicar  (pide confirmación y termina con COMMIT)');
    return 2;
  }
  const aplicar = args[0] === '--aplicar';

  // 2) Solo servidor local.
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

  // 3) Solo la migración 014, tomada de server/migraciones.js, y con las sentencias revisadas.
  const defs = MIGRACIONES.filter(m => m.id === ID_MIGRACION);
  if (defs.length !== 1 || !Array.isArray(defs[0].sql) || defs[0].sql.length === 0) {
    console.error(`ERROR: no se encontró exactamente una migración '${ID_MIGRACION}' en server/migraciones.js.`);
    return 1;
  }
  const sentencias = defs[0].sql;
  const huella = crypto.createHash('sha256').update(JSON.stringify(sentencias)).digest('hex');
  if (huella !== HUELLA_014) {
    console.error('ERROR: las sentencias de la migración 014 ya no coinciden con las revisadas para este programa.');
    console.error('       Se detiene sin conectar. Revisa los cambios y actualiza HUELLA_014 solo después de revisarlos.');
    return 1;
  }
  // Instrucciones destructivas reales. Las cláusulas "ON DELETE CASCADE / SET NULL" de las FK NO cuentan.
  if (sentencias.some(s => /\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i.test(s))) {
    console.error('ERROR: la migración contiene DROP, TRUNCATE o DELETE FROM. Se detiene sin conectar.');
    return 1;
  }

  console.log(`Migración: ${ID_MIGRACION} (${sentencias.length} instrucciones)`);
  console.log(`Destino:   ${BD_DESTINO} en ${host}:${port}`);
  console.log(aplicar ? 'Modo:      APLICAR (pedirá confirmación y terminará con COMMIT)'
                      : 'Modo:      PRUEBA (terminará con ROLLBACK; no se guarda nada)');

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

    // 7) Confirmación escrita adicional, solo en modo --aplicar y antes de ejecutar nada.
    if (aplicar) await confirmar();

    // 8) Todo dentro de una transacción.
    console.log('\nEjecutando instrucciones...');
    await client.query('BEGIN');
    enTransaccion = true;
    await client.query(`SET LOCAL lock_timeout = '15s'`);   // no esperar indefinidamente si otra sesión usa la tabla
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
    const problemas = await verificar(client, antes, despues);
    if (problemas.length) throw new Error('verificación fallida: ' + problemas.join('; '));
    console.log('\nVerificaciones internas: OK (columnas, FK, índice, filas y datos originales).');

    // 9) Cierre de la transacción según el modo.
    if (aplicar) {
      await client.query('COMMIT');
      confirmado = true;
    } else {
      await client.query('ROLLBACK');
    }
    enTransaccion = false;

    // 10) Verificación posterior, ya fuera de la transacción.
    const final = await estado(client);
    if (aplicar) {
      mostrar('FINAL (confirmado con COMMIT)', final);
      const post = await verificar(client, antes, final);
      if (post.length) throw new Error('el COMMIT se realizó pero la verificación final falló: ' + post.join('; '));
      console.log(`\nOK: migración 014 aplicada en ${BD_DESTINO}.`);
    } else if (JSON.stringify(final.cols) === JSON.stringify(antes.cols) && final.n === antes.n && final.huella === antes.huella) {
      console.log(`\nOK (PRUEBA): se hizo ROLLBACK. No se guardaron cambios en ${BD_DESTINO}; quedó exactamente como estaba.`);
      console.log('Para aplicarla de verdad: node server/migrar_014_produccion.js --aplicar');
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
    if (confirmado) console.error('El COMMIT ya se había realizado antes de este error: revisa el estado de la base.');
    return 1;
  } finally {
    try { await client.end(); } catch { /* conexión ya cerrada */ }
  }
}

main().then(codigo => { process.exitCode = codigo; })
  .catch(e => { console.error(`ERROR inesperado: ${e.message}`); process.exitCode = 1; });
