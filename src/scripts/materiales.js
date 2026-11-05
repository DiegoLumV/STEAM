// Fase 4 (parte 1): datos actuales de materiales, centralizados.
// Son exactamente los valores que había en LABELS, EMOJIS y RESISTANCE de casa.js (sin correcciones ni materiales nuevos).
// resistencia: null donde RESISTANCE no tenía valor (roof).
export const MATERIALES = {
  block: { label: 'Block', emoji: '🧱', resistencia: 0.9 },
  madera: { label: 'Madera', emoji: '🪵', resistencia: 0.25 },
  lamina: { label: 'Lámina', emoji: '🛡️', resistencia: 0.75 },
  teja: { label: 'Teja', emoji: '🧱', resistencia: 0.85 },
  roof: { label: 'Techo', emoji: '🏠', resistencia: null },
  foco: { label: 'Foco', emoji: '💡', resistencia: 0.3 },
  puerta: { label: 'Puerta', emoji: '🚪', resistencia: 0.5 },
  barillas: { label: 'Barillas', emoji: '⚙', resistencia: 0.85 },
  ventana: { label: 'Ventana', emoji: '🪟', resistencia: 0.4 },
  concreto: { label: 'Concreto', emoji: '🪨', resistencia: 0.95 },
  vitropiso: { label: 'Vitropiso', emoji: '🔷', resistencia: 0.7 },
  lampara: { label: 'Lámpara', emoji: '🔦', resistencia: 0.4 },
};
