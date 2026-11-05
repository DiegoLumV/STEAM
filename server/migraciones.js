// server/migraciones.js
// Fuente única de verdad del esquema incremental. Para agregar una migración
// nueva en el futuro: solo agrega un objeto {id, sql} al final del arreglo.
// Todo el SQL debe ser idempotente (IF NOT EXISTS) porque esto corre en
// CADA arranque del servidor, no solo la primera vez.

export const MIGRACIONES = [
  {
    // Estructuras base que 003 y las rutas necesitan y que el respaldo
    // proyectoUPV.sql (solo roles, usuarios y tablas académicas) no trae:
    // proyectos y las tablas de telemetría/evaluación. Definiciones tomadas de
    // database/DBProyectoSTEAM.sql (BD funcional). Todo con IF NOT EXISTS: en una
    // BD que ya las tiene no cambia nada y no borra ni reescribe datos.
    // Debe ir ANTES de 003_guardados (el arreglo se ejecuta en orden).
    id: '002_tablas_base_proyectos_telemetria',
    sql: [
      `CREATE TABLE IF NOT EXISTS proyectos (
        id             SERIAL PRIMARY KEY,
        nombre         VARCHAR(100) NOT NULL UNIQUE,
        descripcion    TEXT,
        url_simulador  VARCHAR(200)
      )`,
      // Proyecto #1: solo en una tabla vacía (instalación limpia). Si ya hay proyectos
      // no se toca nada; DO NOTHING sin objetivo cubre conflictos de id y de nombre.
      `INSERT INTO proyectos (id, nombre, descripcion, url_simulador)
        SELECT 1, 'Constructor de Casa',
               'Simulador 3D para diseñar, calcular y construir una vivienda sustentable.',
               '/sandbox.html'
        WHERE NOT EXISTS (SELECT 1 FROM proyectos)
        ON CONFLICT DO NOTHING`,
      // La secuencia solo se adelanta (nunca retrocede) si quedó por debajo del MAX(id).
      `SELECT setval(
        pg_get_serial_sequence('proyectos', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM proyectos), 1), 1),
        EXISTS (SELECT 1 FROM proyectos)
      )`,

      `CREATE TABLE IF NOT EXISTS dimensiones_steam (
        id           SERIAL PRIMARY KEY,
        nombre       VARCHAR(50) NOT NULL UNIQUE,
        descripcion  TEXT,
        color_hex    VARCHAR(7)
      )`,
      `CREATE TABLE IF NOT EXISTS habilidades (
        id            SERIAL PRIMARY KEY,
        dimension_id  INTEGER NOT NULL REFERENCES dimensiones_steam(id) ON DELETE CASCADE,
        nombre        VARCHAR(120) NOT NULL UNIQUE,
        descripcion   TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS actividades_criticas (
        id                SERIAL PRIMARY KEY,
        nombre            VARCHAR(120) NOT NULL UNIQUE,
        descripcion       TEXT,
        tipo_interaccion  VARCHAR(50),
        proyecto_id       INTEGER REFERENCES proyectos(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS actividades_habilidades (
        actividad_id  INTEGER NOT NULL REFERENCES actividades_criticas(id) ON DELETE CASCADE,
        habilidad_id  INTEGER NOT NULL REFERENCES habilidades(id) ON DELETE CASCADE,
        peso          NUMERIC(5,2) DEFAULT 1.0,
        PRIMARY KEY (actividad_id, habilidad_id)
      )`,
      `CREATE TABLE IF NOT EXISTS sesiones_simulacion (
        id            SERIAL PRIMARY KEY,
        usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        fecha_inicio  TIMESTAMP NOT NULL DEFAULT NOW(),
        fecha_fin     TIMESTAMP,
        metadata      JSONB DEFAULT '{}'::jsonb,
        proyecto_id   INTEGER REFERENCES proyectos(id) ON DELETE CASCADE
      )`,
      // BD armadas con steam_tables.sql (sin el parche): solo se agrega la columna
      // que falta; los datos existentes quedan como están (proyecto_id NULL).
      `ALTER TABLE sesiones_simulacion
         ADD COLUMN IF NOT EXISTS proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE`,
      `ALTER TABLE actividades_criticas
         ADD COLUMN IF NOT EXISTS proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE`,
      `CREATE TABLE IF NOT EXISTS telemetria_3d (
        id            BIGSERIAL PRIMARY KEY,
        sesion_id     INTEGER NOT NULL REFERENCES sesiones_simulacion(id) ON DELETE CASCADE,
        actividad_id  INTEGER REFERENCES actividades_criticas(id),
        marca_tiempo  TIMESTAMP NOT NULL DEFAULT NOW(),
        tipo_evento   VARCHAR(50) NOT NULL,
        pos_x         REAL,
        pos_y         REAL,
        pos_z         REAL,
        contexto      JSONB DEFAULT '{}'::jsonb
      )`,
      `CREATE TABLE IF NOT EXISTS evaluaciones_habilidad (
        id                 BIGSERIAL PRIMARY KEY,
        sesion_id          INTEGER NOT NULL REFERENCES sesiones_simulacion(id) ON DELETE CASCADE,
        habilidad_id       INTEGER NOT NULL REFERENCES habilidades(id) ON DELETE CASCADE,
        puntaje            NUMERIC(5,2) NOT NULL DEFAULT 0,
        intentos_fallidos  INTEGER DEFAULT 0,
        tiempo_segundos    INTEGER DEFAULT 0,
        creado_en          TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sesiones_simulacion_usuario_id ON sesiones_simulacion (usuario_id)`,
      `CREATE INDEX IF NOT EXISTS idx_telemetria_3d_sesion_id ON telemetria_3d (sesion_id)`,
      `CREATE INDEX IF NOT EXISTS idx_telemetria_3d_tipo_evento ON telemetria_3d (tipo_evento)`,
      `CREATE INDEX IF NOT EXISTS idx_evaluaciones_habilidad_sesion_id ON evaluaciones_habilidad (sesion_id)`,
      `CREATE INDEX IF NOT EXISTS idx_evaluaciones_habilidad_habilidad_id ON evaluaciones_habilidad (habilidad_id)`,
    ]
  },
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

  {
    // Dashboard del maestro: un alumno no puede inscribirse dos veces al
    // mismo curso (avance_rutas ya modela "inscripción/progreso", se
    // reutiliza tal cual — no se crea tabla nueva).
    id: '007_inscripcion_unica',
    sql: [
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'uq_avance_alumno_ruta'
         ) THEN
           ALTER TABLE avance_rutas
             ADD CONSTRAINT uq_avance_alumno_ruta UNIQUE (alumno_id, ruta_id);
         END IF;
       END $$`,
    ]
  },
  {
    // Soporte para "Continuar con Google": se agrega google_id a usuarios.
    // password_hash ya acepta NULL (no se cambió la tabla) — los usuarios que
    // se registren solo con Google simplemente no tendrán hash de contraseña.
    id: '008_google_auth',
    sql: [
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(128) UNIQUE`,
      `CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios (google_id)`,
    ]
  },
  {
    // Permitir que password_hash sea nulo para los usuarios creados exclusivamente
    // mediante Google Sign-In, resolviendo el error de restricción not-null.
    id: '009_password_hash_null',
    sql: [
      `ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL`
    ]
  },
  {
    // Agregar columna para habilitar/deshabilitar proyectos
    id: '010_proyectos_activo',
    sql: [
      `ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true`
    ]
  },
  {
    // Datos adicionales de perfil (edad, género, carrera) y consentimiento informado
    // para usuarios registrados con Google o en la plataforma.
    id: '011_google_registro_datos',
    sql: [
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS edad INTEGER`,
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS genero VARCHAR(50)`,
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera VARCHAR(150)`,
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS autoriza_compartir_datos BOOLEAN`,
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_consentimiento TIMESTAMPTZ`,
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS alcance_consentimiento TEXT`
    ]
  },
  {
    // Columnas adicionales para datos obtenidos automáticamente de Google People API:
    // - foto_perfil: URL de la fotografía de perfil del usuario en Google
    // - fecha_nacimiento: fecha exacta (DATE) obtenida de la API de Google, complementa
    //   la columna "edad" existente que se calculará automáticamente cuando haya fecha.
    id: '012_google_perfil_extendido',
    sql: [
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil TEXT`,
      `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE`
    ]
  },
  {
    // Fase 2 (estado v2): el historial también archiva la columna "progreso" del guardado
    // anterior, para conservarla exacta junto con "estado". Aditiva: columna nullable, sin datos.
    id: '013_guardados_hist_progreso',
    sql: [
      `ALTER TABLE proyecto_guardados_hist ADD COLUMN IF NOT EXISTS progreso JSONB`
    ]
  },
  {
    // A-03: alinea evaluaciones_habilidad con evaluacion.js, que usa alumno_id, actividad_id
    // y fecha (la 002 solo crea 7 columnas). Aditiva: columnas nuevas NULLABLE; no borra ni
    // reescribe filas. Idempotente: ADD COLUMN IF NOT EXISTS, UPDATE solo sobre NULL,
    // SET DEFAULT repetible. alumno_id se recupera desde sesiones_simulacion.usuario_id;
    // fecha desde creado_en; actividad_id queda NULL (no se puede deducir).
    // "fecha" se agrega SIN default, se rellena y solo después recibe DEFAULT NOW(), para que
    // las filas anteriores conserven su fecha original y no la de la migración.
    id: '014_evaluaciones_habilidad_columnas',
    sql: [
      `ALTER TABLE evaluaciones_habilidad
         ADD COLUMN IF NOT EXISTS alumno_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
      `ALTER TABLE evaluaciones_habilidad
         ADD COLUMN IF NOT EXISTS actividad_id INTEGER REFERENCES actividades_criticas(id) ON DELETE SET NULL`,
      `ALTER TABLE evaluaciones_habilidad ADD COLUMN IF NOT EXISTS fecha TIMESTAMP`,
      `UPDATE evaluaciones_habilidad eh
          SET alumno_id = s.usuario_id
         FROM sesiones_simulacion s
        WHERE s.id = eh.sesion_id AND eh.alumno_id IS NULL`,
      `UPDATE evaluaciones_habilidad SET fecha = creado_en WHERE fecha IS NULL AND creado_en IS NOT NULL`,
      `ALTER TABLE evaluaciones_habilidad ALTER COLUMN fecha SET DEFAULT NOW()`,
      `CREATE INDEX IF NOT EXISTS idx_evaluaciones_habilidad_alumno_id ON evaluaciones_habilidad (alumno_id)`
    ]
  }
];


export async function aplicarMigraciones(query, log = console.log) {
  for (const m of MIGRACIONES) {
    try {
      for (let i = 0; i < m.sql.length; i++) {
        try {
          await query(m.sql[i]);
        } catch (e) {
          log(`Instrucción ${i + 1}/${m.sql.length} de '${m.id}' falló.`);
          log(`SQL: ${m.sql[i]}`);
          throw e;
        }
      }
    } catch (e) {
      log(`Migración '${m.id}' falló: ${e.message}`);
      throw e;
    }
  }
  log(`Esquema al día (${MIGRACIONES.length} migraciones verificadas)`);
}
