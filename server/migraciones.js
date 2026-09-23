// server/migraciones.js
// Fuente única de verdad del esquema incremental. Para agregar una migración
// nueva en el futuro: solo agrega un objeto {id, sql} al final del arreglo.
// Todo el SQL debe ser idempotente (IF NOT EXISTS) porque esto corre en
// CADA arranque del servidor, no solo la primera vez.

export const MIGRACIONES = [
  {
    id: '003_guardados',
    sql: [
      `CREATE TABLE IF NOT EXISTS proyecto_guardados (
        id                 BIGSERIAL PRIMARY KEY,
        usuario_id         INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        proyecto_id        INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
        slot               SMALLINT NOT NULL DEFAULT 1,
        schema_version     INTEGER NOT NULL DEFAULT 1,
        estado             JSONB   NOT NULL,
        progreso           JSONB   NOT NULL DEFAULT '{}',
        bytes              INTEGER GENERATED ALWAYS AS (octet_length(estado::text)) STORED,
        creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_guardado UNIQUE (usuario_id, proyecto_id, slot),
        CONSTRAINT chk_estado_obj CHECK (jsonb_typeof(estado) = 'object'),
        CONSTRAINT chk_tamano CHECK (octet_length(estado::text) < 2 * 1024 * 1024)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_guardados_usuario ON proyecto_guardados (usuario_id, proyecto_id)`,
      `CREATE INDEX IF NOT EXISTS idx_guardados_version ON proyecto_guardados (schema_version)`,
      `CREATE INDEX IF NOT EXISTS idx_guardados_estado_gin ON proyecto_guardados USING GIN (estado jsonb_path_ops)`,
      `CREATE OR REPLACE FUNCTION touch_actualizado_en() RETURNS TRIGGER AS $$
        BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`,
      `DROP TRIGGER IF EXISTS trg_guardados_touch ON proyecto_guardados`,
      `CREATE TRIGGER trg_guardados_touch BEFORE UPDATE ON proyecto_guardados
        FOR EACH ROW EXECUTE FUNCTION touch_actualizado_en()`,
      `CREATE TABLE IF NOT EXISTS proyecto_guardados_hist (
        id              BIGSERIAL PRIMARY KEY,
        guardado_id     BIGINT,
        schema_version  INTEGER NOT NULL,
        estado          JSONB   NOT NULL,
        archivado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_guardados_hist ON proyecto_guardados_hist (guardado_id, archivado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_telemetria_sesion_tiempo ON telemetria_3d (sesion_id, marca_tiempo)`,
      `CREATE INDEX IF NOT EXISTS idx_telemetria_contexto_gin ON telemetria_3d USING GIN (contexto jsonb_path_ops)`,
    ]
  },
  {
    id: '004_guardados_hist_fix',
    sql: [
      `ALTER TABLE proyecto_guardados_hist DROP CONSTRAINT IF EXISTS proyecto_guardados_hist_guardado_id_fkey`,
      `ALTER TABLE proyecto_guardados_hist ALTER COLUMN guardado_id DROP NOT NULL`,
      `ALTER TABLE proyecto_guardados_hist ADD COLUMN IF NOT EXISTS usuario_id  INTEGER`,
      `ALTER TABLE proyecto_guardados_hist ADD COLUMN IF NOT EXISTS proyecto_id INTEGER`,
      `ALTER TABLE proyecto_guardados_hist ADD COLUMN IF NOT EXISTS slot        SMALLINT`,
      `ALTER TABLE proyecto_guardados_hist ADD COLUMN IF NOT EXISTS motivo      VARCHAR(30) DEFAULT 'reinicio'`,
      `CREATE INDEX IF NOT EXISTS idx_guardados_hist_usuario ON proyecto_guardados_hist (usuario_id, proyecto_id, slot)`,
    ]
  },
  {
    id: '005_cuestionario',
    sql: [
      `ALTER TABLE proyecto_guardados ADD COLUMN IF NOT EXISTS entregado_en TIMESTAMPTZ`,
      `CREATE TABLE IF NOT EXISTS casa_preguntas (
        id          BIGSERIAL PRIMARY KEY,
        proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
        autor_id    INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
        titulo      VARCHAR(200) NOT NULL,
        cuerpo      TEXT,
        creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_preguntas_proyecto ON casa_preguntas (proyecto_id, creado_en DESC)`,
      `CREATE TABLE IF NOT EXISTS casa_respuestas (
        id          BIGSERIAL PRIMARY KEY,
        pregunta_id BIGINT  NOT NULL REFERENCES casa_preguntas(id) ON DELETE CASCADE,
        autor_id    INTEGER NOT NULL REFERENCES usuarios(id)       ON DELETE CASCADE,
        cuerpo      TEXT NOT NULL,
        creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON casa_respuestas (pregunta_id, creado_en ASC)`,
    ]
  },
  {
    // Estas tablas ya venían definidas en proyectoUPV.sql, pero varias
    // instalaciones se armaron desde steam_tables.sql en su lugar, que NUNCA
    // las incluyó. Sin ellas, la migración 006 (que las usa) tronaba y el
    // servidor no arrancaba. Se crean aquí, idempotentes, para que cualquier
    // instalación quede completa sin importar cómo se sembró la BD original.
    id: '005b_tablas_academicas_base',
    sql: [
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_estado') THEN
           CREATE TYPE tipo_estado AS ENUM ('en_progreso', 'completado');
         END IF;
       END $$`,
      `CREATE TABLE IF NOT EXISTS rutas_aprendizaje (
        id               SERIAL PRIMARY KEY,
        profesor_id      INTEGER NOT NULL REFERENCES usuarios(id),
        titulo           VARCHAR(255) NOT NULL,
        descripcion      TEXT,
        orden_secuencia  INTEGER NOT NULL,
        creado_en        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS practicas (
        id                       SERIAL PRIMARY KEY,
        ruta_id                  INTEGER NOT NULL REFERENCES rutas_aprendizaje(id),
        titulo                   VARCHAR(255) NOT NULL,
        intentos_permitidos      INTEGER DEFAULT 0,
        configuracion_preguntas  JSONB DEFAULT '[]'::jsonb NOT NULL,
        creado_en                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS avance_rutas (
        id               SERIAL PRIMARY KEY,
        alumno_id        INTEGER NOT NULL REFERENCES usuarios(id),
        ruta_id          INTEGER NOT NULL REFERENCES rutas_aprendizaje(id),
        estado_general   tipo_estado DEFAULT 'en_progreso',
        detalle_avance   JSONB DEFAULT '{}'::jsonb NOT NULL,
        actualizado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS calificaciones (
        id                  SERIAL PRIMARY KEY,
        alumno_id           INTEGER NOT NULL REFERENCES usuarios(id),
        practica_id         INTEGER NOT NULL REFERENCES practicas(id),
        calificacion_final  NUMERIC(5,2),
        respuestas_alumno   JSONB DEFAULT '{}'::jsonb NOT NULL,
        fecha_realizacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT calificaciones_calificacion_final_check
          CHECK (calificacion_final >= 0 AND calificacion_final <= 100)
      )`,
    ]
  },
  {
    id: '006_roles_academico',
    sql: [
      // BUG existente: el rol se sembraba como 'profesor' pero todo el frontend
      // (PanelAdministrativo, administracion.js, badge-maestro) espera 'maestro'.
      // Renombramos el dato, no la estructura — es un fix de datos, no de esquema.
      `UPDATE roles SET nombre = 'maestro',
              descripcion = COALESCE(NULLIF(descripcion,''), 'Maestro que gestiona alumnos, revisa progreso y calificaciones')
        WHERE nombre = 'profesor' AND NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'maestro')`,
      `INSERT INTO roles (nombre, descripcion)
        SELECT 'maestro', 'Maestro que gestiona alumnos, revisa progreso y calificaciones'
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre IN ('maestro','profesor'))`,
      `INSERT INTO roles (nombre, descripcion)
        SELECT 'admin', 'Administrador del sistema'
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'admin')`,
      `INSERT INTO roles (nombre, descripcion)
        SELECT 'alumno', 'Estudiante que sigue las rutas'
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'alumno')`,

      // Registro de actividad general (dashboard del admin). Genérico a propósito
      // para poder loguear cualquier tipo de acción futura sin migrar de nuevo.
      `CREATE TABLE IF NOT EXISTS registro_actividad (
        id           BIGSERIAL PRIMARY KEY,
        usuario_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        tipo_accion  VARCHAR(60) NOT NULL,
        detalle      JSONB NOT NULL DEFAULT '{}',
        creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_actividad_fecha ON registro_actividad (creado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_actividad_usuario ON registro_actividad (usuario_id, creado_en DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_actividad_tipo ON registro_actividad (tipo_accion)`,

      // El examen final (construir la casa) ahora genera una calificación al
      // entregar — pendiente (NULL) hasta que un maestro la revise y la asigne.
      `ALTER TABLE calificaciones ALTER COLUMN calificacion_final DROP NOT NULL`,
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'uq_calificacion_alumno_practica'
         ) THEN
           ALTER TABLE calificaciones
             ADD CONSTRAINT uq_calificacion_alumno_practica UNIQUE (alumno_id, practica_id);
         END IF;
       END $$`,

      // Ruta + práctica "ancla" para el examen final, usando al primer admin
      // como profesor_id de arranque (un maestro real puede tomarla después).
      `INSERT INTO rutas_aprendizaje (profesor_id, titulo, descripcion, orden_secuencia)
        SELECT (SELECT id FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE nombre='admin') ORDER BY id LIMIT 1),
               'Constructor de Casa', 'Ruta principal del simulador STEAM', 1
        WHERE NOT EXISTS (SELECT 1 FROM rutas_aprendizaje WHERE titulo = 'Constructor de Casa')
          AND EXISTS (SELECT 1 FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE nombre='admin'))`,
      `INSERT INTO practicas (ruta_id, titulo, intentos_permitidos, configuracion_preguntas)
        SELECT id, 'Examen Final: Construcción de Casa', 0, '[]'::jsonb
        FROM rutas_aprendizaje WHERE titulo = 'Constructor de Casa'
        AND NOT EXISTS (SELECT 1 FROM practicas WHERE titulo = 'Examen Final: Construcción de Casa')`,
    ]
  },
  // ── La próxima migración se agrega aquí, como un objeto nuevo ──
];

export async function aplicarMigraciones(query, log = console.log) {
  for (const m of MIGRACIONES) {
    try {
      for (const sql of m.sql) await query(sql);
    } catch (e) {
      log(`Migración '${m.id}' falló: ${e.message}`);
      throw e; // no arrancar el servidor con un esquema a medias
    }
  }
  log(`Esquema al día (${MIGRACIONES.length} migraciones verificadas)`);
}