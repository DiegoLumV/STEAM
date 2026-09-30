-- Drop old tables if they exist
DROP TABLE IF EXISTS calificaciones CASCADE;
DROP TABLE IF EXISTS avance_rutas CASCADE;
DROP TABLE IF EXISTS rutas_aprendizaje CASCADE;

-- 1. dimensiones_steam
CREATE TABLE dimensiones_steam (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,  -- 'Ciencia', 'Tecnología', 'Ingeniería', 'Arte', 'Matemáticas'
  descripcion TEXT,
  color_hex VARCHAR(7)  -- for UI display
);

-- 2. habilidades
CREATE TABLE habilidades (
  id SERIAL PRIMARY KEY,
  dimension_id INTEGER NOT NULL REFERENCES dimensiones_steam(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT
);

-- 3. actividades_criticas (evaluable actions in the simulator)
CREATE TABLE actividades_criticas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT,
  tipo_interaccion VARCHAR(50)  -- 'calculo', 'construccion', 'programacion', 'diseno'
);

-- 4. actividades_habilidades (bridge table: which skills does each activity evaluate)
CREATE TABLE actividades_habilidades (
  actividad_id INTEGER NOT NULL REFERENCES actividades_criticas(id) ON DELETE CASCADE,
  habilidad_id INTEGER NOT NULL REFERENCES habilidades(id) ON DELETE CASCADE,
  peso DECIMAL(5,2) DEFAULT 1.0,  -- weight of this skill in the activity
  PRIMARY KEY (actividad_id, habilidad_id)
);

-- 5. sesiones_simulacion
CREATE TABLE sesiones_simulacion (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- 6. telemetria_3d (the big events table)
CREATE TABLE telemetria_3d (
  id BIGSERIAL PRIMARY KEY,
  sesion_id INTEGER NOT NULL REFERENCES sesiones_simulacion(id) ON DELETE CASCADE,
  actividad_id INTEGER REFERENCES actividades_criticas(id),
  marca_tiempo TIMESTAMP NOT NULL DEFAULT NOW(),
  tipo_evento VARCHAR(50) NOT NULL,  -- 'objeto_colocado', 'matematicas_intento', etc.
  pos_x REAL,
  pos_y REAL,
  pos_z REAL,
  contexto JSONB DEFAULT '{}'
);

-- 7. evaluaciones_habilidad
CREATE TABLE evaluaciones_habilidad (
  id BIGSERIAL PRIMARY KEY,
  sesion_id INTEGER NOT NULL REFERENCES sesiones_simulacion(id) ON DELETE CASCADE,
  habilidad_id INTEGER NOT NULL REFERENCES habilidades(id) ON DELETE CASCADE,
  puntaje DECIMAL(5,2) NOT NULL DEFAULT 0,
  intentos_fallidos INTEGER DEFAULT 0,
  tiempo_segundos INTEGER DEFAULT 0,
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_telemetria_3d_sesion_id ON telemetria_3d(sesion_id);
CREATE INDEX idx_telemetria_3d_tipo_evento ON telemetria_3d(tipo_evento);
CREATE INDEX idx_evaluaciones_habilidad_sesion_id ON evaluaciones_habilidad(sesion_id);
CREATE INDEX idx_evaluaciones_habilidad_habilidad_id ON evaluaciones_habilidad(habilidad_id);
CREATE INDEX idx_sesiones_simulacion_usuario_id ON sesiones_simulacion(usuario_id);
