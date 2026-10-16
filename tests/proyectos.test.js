import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/scripts/proyectos.js', import.meta.url), 'utf8');
async function render({ examen, completed = null, fail = false, role = 'alumno' } = {}) {
  const elements = new Map();
  const element = () => ({ hidden: true, children: [], addEventListener() {}, replaceChildren() { this.children = []; }, append(child) { this.children.push(child); } });
  const el = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const context = vm.createContext({ document: { getElementById: el, createElement: element }, localStorage: { getItem: () => null }, location: { href: 'http://localhost:3000/proyectos.html', origin: 'http://localhost:3000', replace() {} }, URL, AbortSignal, fetch: async url => {
    if (url.includes('dashboard') && fail) throw new Error('offline');
    const data = url.includes('/auth/me') ? {user:{nombre_completo:'Ana',rol_nombre:role}} : url === '/api/proyectos' ? {proyectos:[{id:1,nombre:'Constructor de Casa'}]} : url.includes('dashboard') ? {proyectos:examen ? [{id:1,examen,objetivos_completos:1,objetivos_total:3}] : []} : {completed};
    return {ok:true,status:200,json:async()=>data};
  }});
  vm.runInContext(source, context);
  await vm.runInContext('load()', context);
  return { card: el('projects').children[0].innerHTML, resume: el('resume'), link: el('resume-link'), retry: el('retry') };
}
test('Alumno nuevo comienza con las lecciones', async () => { const r = await render(); assert.match(r.card,/Sin iniciar/); assert.match(r.card,/Comenzar proyecto/); assert.match(r.card,/learn.html\?proyecto=1/); assert.equal(r.resume.hidden,true); });
test('Lecciones guardadas permiten continuar aprendizaje', async () => { const r = await render({completed:{intro:[1,2]}}); assert.match(r.card,/2 lecciones completadas/); assert.equal(r.link.href,'learn.html?proyecto=1'); assert.equal(r.resume.hidden,false); });
test('Construcción guardada retoma simulador', async () => { const r = await render({examen:'en_progreso'}); assert.equal(r.link.href,'sandbox.html?proyecto=1'); });
test('Entrega lleva al resultado y no invita a continuar', async () => { const r = await render({examen:'entregado'}); assert.match(r.card,/Ver mi entrega/); assert.equal(r.resume.hidden,true); });
test('Error de progreso no se presenta como sin iniciar', async () => { const r = await render({fail:true}); assert.match(r.card,/Progreso no disponible/); assert.doesNotMatch(r.card,/Sin iniciar|Comenzar proyecto/); assert.equal(r.retry.hidden,false); });
test('Administrador explora sin indicadores personales de alumno', async () => { const r = await render({role:'admin'}); assert.match(r.card,/Explorar proyecto/); assert.doesNotMatch(r.card,/lecciones completadas/); });
