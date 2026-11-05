// Genera las "casas de referencia" SINTÉTICAS usadas por las pruebas de regresión.
// No usa la base de datos ni datos de alumnos. Uso:  node tests/fixtures/generar_casas.mjs
// Formato = el que produce serializarEscena() en src/scripts/guardado.js (esquema v1).
import fs from 'node:fs';

const SALIDA = new URL('./casas/', import.meta.url);
fs.mkdirSync(SALIDA, { recursive: true });

const T = [0, 0, 0];
const casa = (descripcion, objetos, progreso = {}) => {
  const contador = objetos.reduce((m, o) => Math.max(m, o.id), 0) + 1;
  return { descripcion, estado: { v: 1, objetos, contador, progreso }, progreso };
};
const guardar = (nombre, c) =>
  fs.writeFileSync(new URL(`${nombre}.json`, SALIDA), JSON.stringify(c, null, 2) + '\n');

const progresoBase = {
  buildPhase: 4, concretoUnlocked: true, matematicasValidadas: true,
  puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off',
};

// 1. Vacía
guardar('vacia', casa('Sin objetos; estado mínimo', [], { buildPhase: 0, concretoUnlocked: false, matematicasValidadas: false, puertas_colocadas: 0, ventanas_colocadas: 0, progSequence: [], focoState: 'off', excavacion: null }));

// 2. Bloques con cortes
guardar('bloques_con_cortes', casa('Bloque, madera y lámina; con cortes y colores', [
  { id: 1, type: 'block', p: [-3, 0, -3], r: T },
  { id: 2, type: 'block', p: [-1.5, 0, -3], r: [0, 0.785, 0], cutFactor: 0.5 },
  { id: 3, type: 'block', p: [0, 0, -3], r: T, cutFactor: 0.25, color: '#cc3333' },
  { id: 4, type: 'madera', p: [2, 0, -3], r: T, cutFactor: 0.5 },
  { id: 5, type: 'madera', p: [4, 0, -3], r: T, color: '#336699' },
  { id: 6, type: 'lamina', p: [-3, 0, 2], r: [0, 1.57, 0] },
], progresoBase));

// 3. Muros con puerta y ventanas
guardar('muros_puerta_ventana', casa('Muros con puerta y ventanas incrustadas', [
  { id: 1, type: 'wall_block', p: [0, 0, -6], r: T, w: 5, d: 4, wallMode: 'puerta' },
  { id: 2, type: 'puerta', p: [0, 0, 0], r: T, embeddedInWall: 1 },
  { id: 3, type: 'wall_madera', p: [0, 0, 6], r: T, w: 6, d: 4, wallMode: 'ventana' },
  { id: 4, type: 'ventana', p: [-1.5, 1.5, 0], r: T, embeddedInWall: 3 },
  { id: 5, type: 'ventana', p: [1.5, 1.5, 0], r: T, embeddedInWall: 3 },
  { id: 6, type: 'wall_lamina', p: [-6, 0, 0], r: [0, 1.5708, 0], w: 4, d: 3, wallMode: 'simple', color: '#88aa66' },
  { id: 7, type: 'wall_block', p: [6, 0, 0], r: [0, 1.5708, 0], w: 5, d: 4, wallMode: 'simple' },
], { ...progresoBase, puertas_colocadas: 1, ventanas_colocadas: 2 }));

// 4. Pisos de vitropiso
guardar('pisos_vitropiso', casa('Pisos de distintos tamaños y colores', [
  { id: 1, type: 'floor_vitropiso', p: [-4, 0, -4], r: T, w: 4, d: 5, area: 20, color: '#38bdf8' },
  { id: 2, type: 'floor_vitropiso', p: [3, 0, 2], r: T, w: 6, d: 6, area: 36, color: '#f59e0b' },
  { id: 3, type: 'floor_vitropiso', p: [-5, 0, 5], r: T, w: 3, d: 3, area: 9 },
], progresoBase));

// 5. Cuatro techos
guardar('techos_cuatro_formas', casa('Techo plano, a dos aguas, a cuatro aguas y a una agua', [
  { id: 1, type: 'roof', p: [-6, 2.8, 0], r: T, roofShape: 'plano', roofMat: 'concreto', w: 4, d: 4, roofH: 0.3, area: 16 },
  { id: 2, type: 'roof', p: [-2, 2.8, 0], r: T, roofShape: 'dos_aguas', roofMat: 'teja', w: 4, d: 4, roofH: 1.6, area: 16 },
  { id: 3, type: 'roof', p: [2, 2.8, 0], r: T, roofShape: 'cuatro_aguas', roofMat: 'lamina', w: 4, d: 4, roofH: 1.4, area: 16 },
  { id: 4, type: 'roof', p: [6, 2.8, 0], r: T, roofShape: 'una_agua', roofMat: 'madera', w: 4, d: 4, roofH: 1.2, area: 16, color: '#775533' },
], progresoBase));

// 6. Excavación + casa
guardar('excavacion_con_casa', casa('Fosa guardada junto con muros, bloque y piso', [
  { id: 1, type: 'wall_block', p: [0, 0, -8], r: T, w: 5, d: 4, wallMode: 'simple' },
  { id: 2, type: 'block', p: [7, 0, 7], r: T },
  { id: 3, type: 'floor_vitropiso', p: [-7, 0, 6], r: T, w: 3, d: 3, area: 9, color: '#38bdf8' },
], { ...progresoBase, excavacion: { largo: 6, ancho: 4, profundidad: 1.2, volumen: 28.8, activa: true } }));

// 7. 500 objetos (límite del servidor)
{
  const objetos = [];
  let id = 1;
  for (let fila = 0; fila < 20 && objetos.length < 500; fila++) {
    for (let col = 0; col < 25 && objetos.length < 500; col++) {
      objetos.push({ id: id++, type: 'block', p: [-9 + col * 0.75, 0, -9 + fila * 0.9], r: T });
    }
  }
  guardar('casa_500_objetos', casa('500 bloques sintéticos (máximo permitido por el servidor)', objetos, progresoBase));
}

// 8. Guardado antiguo (sin excavación ni claves nuevas)
guardar('sin_excavacion_antigua', casa('Guardado de una versión anterior: sin excavacion, cutFactor ni techos', [
  { id: 1, type: 'concreto_slab_20', p: [0, 0, 0], r: T },
  { id: 2, type: 'block', p: [2, 0.2, 2], r: T },
  { id: 3, type: 'wall_block', p: [0, 0.2, -5], r: T, w: 4, d: 3, wallMode: 'simple' },
], { buildPhase: 2, concretoUnlocked: true, matematicasValidadas: true }));

// 9. Lámpara en la zona exterior
guardar('lampara_exterior', casa('Lámpara en el área exterior del terreno y un bloque dentro de la zona', [
  { id: 1, type: 'lampara', p: [12, 0, -11.5], r: T },
  { id: 2, type: 'block', p: [3, 0, 3], r: T },
], progresoBase));

console.log('Casas de referencia generadas en', SALIDA.pathname);
