-- 005_cuestionario.sql
-- Punto de "entrega" del examen final + módulo de preguntas/respuestas
-- estilo Classroom (cualquier usuario puede publicar una pregunta).

ALTER TABLE proyecto_guardados
  ADD COLUMN IF NOT EXISTS entregado_en TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS casa_preguntas (
  id          BIGSERIAL PRIMARY KEY,
  proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  autor_id    INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  titulo      VARCHAR(200) NOT NULL,
  cuerpo      TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_preguntas_proyecto ON casa_preguntas (proyecto_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS casa_respuestas (
  id          BIGSERIAL PRIMARY KEY,
  pregunta_id BIGINT  NOT NULL REFERENCES casa_preguntas(id) ON DELETE CASCADE,
  autor_id    INTEGER NOT NULL REFERENCES usuarios(id)       ON DELETE CASCADE,
  cuerpo      TEXT NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON casa_respuestas (pregunta_id, creado_en ASC);