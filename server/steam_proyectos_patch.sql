-- 1. Crear tabla proyectos
CREATE TABLE IF NOT EXISTS proyectos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  url_simulador VARCHAR(200)
);

-- 2. Insertar el proyecto original como el Proyecto #1
INSERT INTO proyectos (id, nombre, descripcion, url_simulador) 
VALUES (1, 'Constructor de Casa', 'Simulador 3D para diseñar, calcular y construir una vivienda sustentable.', '/sandbox.html')
ON CONFLICT (nombre) DO NOTHING;

-- Si por alguna razón el ID 1 ya estaba tomado por otra cosa, ajustamos la secuencia (seguridad extra)
SELECT setval('proyectos_id_seq', (SELECT MAX(id) FROM proyectos));

-- 3. Modificar actividades_criticas para pertenecer a un proyecto
ALTER TABLE actividades_criticas 
ADD COLUMN IF NOT EXISTS proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE;

-- Asignar las actividades existentes al proyecto 1
UPDATE actividades_criticas SET proyecto_id = 1 WHERE proyecto_id IS NULL;

-- 4. Modificar sesiones_simulacion para pertenecer a un proyecto
ALTER TABLE sesiones_simulacion 
ADD COLUMN IF NOT EXISTS proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE;

-- Asignar las sesiones existentes al proyecto 1
UPDATE sesiones_simulacion SET proyecto_id = 1 WHERE proyecto_id IS NULL;
