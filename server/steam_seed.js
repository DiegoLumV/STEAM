import dotenv from 'dotenv';
dotenv.config();

import { query } from './db.js';
import pool from './db.js';

const dimensiones = [
  { nombre: 'Ciencia', descripcion: 'Exploración y comprensión de las ciencias naturales.', color_hex: '#2e915f' },
  { nombre: 'Tecnología', descripcion: 'Aplicación de la tecnología y programación.', color_hex: '#3a70db' },
  { nombre: 'Ingeniería', descripcion: 'Principios de ingeniería y construcción.', color_hex: '#63637a' },
  { nombre: 'Arte', descripcion: 'Diseño, estética y composición espacial.', color_hex: '#814eb8' },
  { nombre: 'Matemáticas', descripcion: 'Cálculo, proporciones y lógica matemática.', color_hex: '#d45945' }
];

const habilidades = [
  // Ciencia
  { dimension: 'Ciencia', nombre: 'Propiedades del concreto' },
  { dimension: 'Ciencia', nombre: 'Tipos de suelo' },
  { dimension: 'Ciencia', nombre: 'Física de materiales' },
  { dimension: 'Ciencia', nombre: 'Fraguado y curado' },
  // Tecnología
  { dimension: 'Tecnología', nombre: 'Programación por bloques' },
  { dimension: 'Tecnología', nombre: 'Lógica condicional' },
  { dimension: 'Tecnología', nombre: 'Domótica básica' },
  { dimension: 'Tecnología', nombre: 'Automatización' },
  // Ingeniería
  { dimension: 'Ingeniería', nombre: 'Cálculo estructural' },
  { dimension: 'Ingeniería', nombre: 'Construcción de muros' },
  { dimension: 'Ingeniería', nombre: 'Cimentación' },
  { dimension: 'Ingeniería', nombre: 'Resistencia de materiales' },
  // Arte
  { dimension: 'Arte', nombre: 'Diseño cromático' },
  { dimension: 'Arte', nombre: 'Psicología del color' },
  { dimension: 'Arte', nombre: 'Composición espacial' },
  { dimension: 'Arte', nombre: 'Acabados y texturas' },
  // Matemáticas
  { dimension: 'Matemáticas', nombre: 'Cálculo de perímetro' },
  { dimension: 'Matemáticas', nombre: 'Cálculo de área' },
  { dimension: 'Matemáticas', nombre: 'Cálculo de volumen' },
  { dimension: 'Matemáticas', nombre: 'Proporciones y mezclas' }
];

const actividades = [
  { nombre: 'Calcular área del terreno', tipo: 'calculo' },
  { nombre: 'Crear mezcla de concreto', tipo: 'calculo' },
  { nombre: 'Construir pared simple', tipo: 'construccion' },
  { nombre: 'Construir pared con puerta', tipo: 'construccion' },
  { nombre: 'Construir pared con ventana', tipo: 'construccion' },
  { nombre: 'Construir piso', tipo: 'diseno' },
  { nombre: 'Programar foco inteligente', tipo: 'programacion' },
  { nombre: 'Diseñar casa completa', tipo: 'diseno' }
];

const actividades_habilidades = [
  { actividad: 'Calcular área del terreno', habilidades: [ { nombre: 'Cálculo de perímetro', peso: 0.3 }, { nombre: 'Cálculo de área', peso: 0.4 }, { nombre: 'Cálculo de volumen', peso: 0.3 } ] },
  { actividad: 'Crear mezcla de concreto', habilidades: [ { nombre: 'Proporciones y mezclas', peso: 0.5 }, { nombre: 'Propiedades del concreto', peso: 0.3 }, { nombre: 'Física de materiales', peso: 0.2 } ] },
  { actividad: 'Construir pared simple', habilidades: [ { nombre: 'Construcción de muros', peso: 0.5 }, { nombre: 'Cálculo estructural', peso: 0.3 }, { nombre: 'Resistencia de materiales', peso: 0.2 } ] },
  { actividad: 'Programar foco inteligente', habilidades: [ { nombre: 'Programación por bloques', peso: 0.4 }, { nombre: 'Lógica condicional', peso: 0.4 }, { nombre: 'Automatización', peso: 0.2 } ] },
  { actividad: 'Construir piso', habilidades: [ { nombre: 'Diseño cromático', peso: 0.4 }, { nombre: 'Composición espacial', peso: 0.3 }, { nombre: 'Cálculo de área', peso: 0.3 } ] }
];

async function seedSteam() {
  console.log('🌱 Iniciando seed de la base de datos STEAM...\n');

  try {
    // 1. Insertar dimensiones STEAM
    for (const dim of dimensiones) {
      await query(
        `INSERT INTO dimensiones_steam (nombre, descripcion, color_hex) 
         VALUES ($1, $2, $3) ON CONFLICT (nombre) DO NOTHING`,
        [dim.nombre, dim.descripcion, dim.color_hex]
      );
      console.log(`   ✅ Dimensión "${dim.nombre}" procesada`);
    }

    // Obtener IDs de las dimensiones
    const dimensiones_db = await query('SELECT id, nombre FROM dimensiones_steam');
    const dim_map = {};
    dimensiones_db.rows.forEach(d => dim_map[d.nombre] = d.id);

    // 2. Insertar habilidades
    for (const hab of habilidades) {
      const dim_id = dim_map[hab.dimension];
      if (dim_id) {
        await query(
          `INSERT INTO habilidades (dimension_id, nombre, descripcion) 
           VALUES ($1, $2, $3) ON CONFLICT (nombre) DO NOTHING`,
          [dim_id, hab.nombre, '']
        );
        console.log(`   ✅ Habilidad "${hab.nombre}" procesada`);
      }
    }

    // Obtener IDs de las habilidades
    const habilidades_db = await query('SELECT id, nombre FROM habilidades');
    const hab_map = {};
    habilidades_db.rows.forEach(h => hab_map[h.nombre] = h.id);

    // 3. Insertar actividades
    for (const act of actividades) {
      await query(
        `INSERT INTO actividades_criticas (nombre, descripcion, tipo_interaccion) 
         VALUES ($1, $2, $3) ON CONFLICT (nombre) DO NOTHING`,
        [act.nombre, '', act.tipo]
      );
      console.log(`   ✅ Actividad "${act.nombre}" procesada`);
    }

    // Obtener IDs de las actividades
    const actividades_db = await query('SELECT id, nombre FROM actividades_criticas');
    const act_map = {};
    actividades_db.rows.forEach(a => act_map[a.nombre] = a.id);

    // 4. Insertar actividades_habilidades
    for (const ah of actividades_habilidades) {
      const act_id = act_map[ah.actividad];
      if (act_id) {
        for (const hab of ah.habilidades) {
          const hab_id = hab_map[hab.nombre];
          if (hab_id) {
            await query(
              `INSERT INTO actividades_habilidades (actividad_id, habilidad_id, peso) 
               VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT actividades_habilidades_pkey DO NOTHING`,
              [act_id, hab_id, hab.peso]
            );
          }
        }
        console.log(`   ✅ Mapeos para actividad "${ah.actividad}" procesados`);
      }
    }

    console.log('\n🎉 Seed STEAM completado exitosamente!\n');
  } catch (err) {
    console.error('\n❌ Error en seed STEAM:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

seedSteam();
