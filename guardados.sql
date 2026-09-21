CREATE TABLE IF NOT EXISTS proyecto_guardados (
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
);

CREATE INDEX IF NOT EXISTS idx_guardados_usuario   ON proyecto_guardados (usuario_id, proyecto_id);
CREATE INDEX IF NOT EXISTS idx_guardados_version   ON proyecto_guardados (schema_version);


CREATE INDEX IF NOT EXISTS idx_guardados_estado_gin ON proyecto_guardados USING GIN (estado jsonb_path_ops);

CREATE OR REPLACE FUNCTION touch_actualizado_en() RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guardados_touch ON proyecto_guardados;
CREATE TRIGGER trg_guardados_touch
  BEFORE UPDATE ON proyecto_guardados
  FOR EACH ROW EXECUTE FUNCTION touch_actualizado_en();


CREATE TABLE IF NOT EXISTS proyecto_guardados_hist (
  id              BIGSERIAL PRIMARY KEY,
  guardado_id     BIGINT NOT NULL REFERENCES proyecto_guardados(id) ON DELETE CASCADE,
  schema_version  INTEGER NOT NULL,
  estado          JSONB   NOT NULL,
  archivado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guardados_hist ON proyecto_guardados_hist (guardado_id, archivado_en DESC);

CREATE INDEX IF NOT EXISTS idx_telemetria_sesion_tiempo
  ON telemetria_3d (sesion_id, marca_tiempo);
CREATE INDEX IF NOT EXISTS idx_telemetria_contexto_gin
  ON telemetria_3d USING GIN (contexto jsonb_path_ops);