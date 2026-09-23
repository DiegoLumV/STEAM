import pool from './server/db.js';

async function restoreTables() {
  try {
    await pool.query(`
      CREATE TYPE public.tipo_estado AS ENUM ('en_progreso', 'completado');
    `);
  } catch (e) {
    console.log('tipo_estado already exists or error:', e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.rutas_aprendizaje (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          profesor_id integer NOT NULL,
          titulo character varying(150) NOT NULL,
          descripcion text,
          orden_secuencia integer NOT NULL,
          creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('rutas_aprendizaje created.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.avance_rutas (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          alumno_id integer NOT NULL,
          ruta_id integer NOT NULL REFERENCES public.rutas_aprendizaje(id) ON DELETE CASCADE,
          estado_general public.tipo_estado DEFAULT 'en_progreso'::public.tipo_estado,
          detalle_avance jsonb DEFAULT '{}'::jsonb NOT NULL,
          actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('avance_rutas created.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.calificaciones (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          alumno_id integer NOT NULL,
          practica_id integer NOT NULL REFERENCES public.practicas(id) ON DELETE CASCADE,
          calificacion_final numeric(5,2),
          respuestas_alumno jsonb DEFAULT '{}'::jsonb NOT NULL,
          fecha_realizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT calificaciones_calificacion_final_check CHECK (((calificacion_final >= (0)::numeric) AND (calificacion_final <= (100)::numeric)))
      );
    `);
    console.log('calificaciones created.');
  } catch (e) {
    console.error('Error creating tables:', e);
  } finally {
    process.exit(0);
  }
}

restoreTables();
