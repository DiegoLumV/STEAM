-- 004_guardados_hist_fix.sql
-- El historial debía sobrevivir al borrado del guardado activo (para poder
-- archivar antes de un "reiniciar casa"), pero el CASCADE de 003 lo borraba
-- junto con su padre. Se guardan usuario/proyecto/slot directamente en vez
-- de depender de que la fila padre siga existiendo.

ALTER TABLE proyecto_guardados_hist
  DROP CONSTRAINT IF EXISTS proyecto_guardados_hist_guardado_id_fkey;

ALTER TABLE proyecto_guardados_hist
  ALTER COLUMN guardado_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS usuario_id  INTEGER,
  ADD COLUMN IF NOT EXISTS proyecto_id INTEGER,
  ADD COLUMN IF NOT EXISTS slot        SMALLINT,
  ADD COLUMN IF NOT EXISTS motivo      VARCHAR(30) DEFAULT 'reinicio';

CREATE INDEX IF NOT EXISTS idx_guardados_hist_usuario
  ON proyecto_guardados_hist (usuario_id, proyecto_id, slot);