const $ = id => document.getElementById(id);
const token = localStorage.getItem('token');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const illustration = `<svg viewBox="0 0 440 300" role="img" aria-label="Ilustración de una casa sobre un plano de construcción"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#bdcbb0" stroke-width=".7"/></pattern></defs><rect width="440" height="300" fill="url(#grid)"/><ellipse cx="224" cy="245" rx="156" ry="28" fill="#cad4bd"/><path d="M100 142L241 98L345 155L205 203Z" fill="#e9ddc1"/><path d="M100 142V221L205 274V203Z" fill="#e9ddc1"/><path d="M205 203V274L345 224V155Z" fill="#c7bea3"/><path d="M79 145L144 57L259 106L206 210Z" fill="#bd6d46"/><path d="M144 57L287 23L365 151L259 106Z" fill="#d68a5e"/><path d="M206 210L259 106L365 151Z" fill="#f6edd6"/><path d="M233 264V216L264 205V253" fill="#416552"/><path d="M289 201L319 191V221L289 232Z" fill="#87a9a2" stroke="#f9f3e3" stroke-width="5"/><path d="M124 174L155 190V217L124 201Z" fill="#87a9a2" stroke="#f9f3e3" stroke-width="5"/><path d="M65 255L144 294M354 253L395 238" stroke="#7c9071" stroke-width="2" stroke-dasharray="4 4"/></svg>`;
async function get(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (response.status === 401) { location.replace('index.html'); throw new Error('Sesión vencida'); }
  if (!response.ok) throw new Error('No disponible');
  return response.json();
}
function safeEntry(project) {
  // Simulator links must remain on this site.
  try {
    const url = new URL(project.url_simulador || 'learn.html', location.href);
    if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return null;
    url.searchParams.set('proyecto', project.id);
    return url.pathname + url.search;
  } catch { return null; }
}
const lessonCount = completed => ['intro','math','science','engineering','tech','arts'].reduce((n, key) => n + new Set((Array.isArray(completed?.[key]) ? completed[key] : []).filter(v => Number.isInteger(v) && v >= 1 && v <= 6)).size, 0);
async function load() {
  $('retry').hidden = true;
  $('message').hidden = false;
  $('message').textContent = 'Cargando tus proyectos…';
  $('projects').replaceChildren();
  $('resume').hidden = true;
  try {
    const [{ user }, { proyectos }] = await Promise.all([get('/api/auth/me'), get('/api/proyectos')]);
    const student = user.rol_nombre === 'alumno';
    const first = user.nombre_completo?.trim().split(/\s+/)[0];
    $('greeting').textContent = first ? `Hola, ${first}. ¿Qué vamos a construir hoy?` : '¿Qué vamos a construir hoy?';
    const panels = { alumno: ['alumno.html','Mi progreso'], maestro: ['maestro.html','Panel del maestro'], admin: ['PanelAdministrativo.html','Administración'] };
    if (panels[user.rol_nombre]) { const [href, title] = panels[user.rol_nombre]; $('panel').href = href; $('panel').textContent = title; $('panel').hidden = false; }
    $('logout').hidden = false;
    const [dashboard, modules] = student ? await Promise.allSettled([get('/api/alumno/dashboard'), get('/api/progreso-modulos')]) : [];
    const progressOK = dashboard?.status === 'fulfilled';
    const progress = progressOK ? dashboard.value.proyectos : [];
    const lessons = modules?.status === 'fulfilled' ? lessonCount(modules.value.completed) : null;
    const resumable = [];
    for (const project of proyectos) {
      const house = project.nombre === 'Constructor de Casa';
      const saved = progress.find(p => String(p.id) === String(project.id));
      const delivered = saved?.examen === 'entregado';
      const building = saved?.examen === 'en_progreso';
      const started = building || (house && lessons > 0);
      const known = progressOK && (!house || lessons !== null);
      const status = !student ? 'Disponible' : delivered ? 'Entregado' : started ? 'En curso' : known ? 'Sin iniciar' : 'Progreso no disponible';
      const href = delivered ? `alumno.html?proyecto=${encodeURIComponent(project.id)}` : house ? `${building ? 'sandbox' : 'learn'}.html?proyecto=${encodeURIComponent(project.id)}` : safeEntry(project);
      const action = !student ? 'Explorar proyecto' : delivered ? 'Ver mi entrega' : started ? 'Continuar proyecto' : known ? 'Comenzar proyecto' : 'Abrir proyecto';
      const details = [];
      if (student && house && lessons !== null) details.push(`${lessons} lecciones completadas`);
      if (saved) details.push(`${saved.objetivos_completos} de ${saved.objetivos_total} objetivos de construcción`);
      if (saved?.ultimo_guardado) details.push(`Último guardado: ${new Date(saved.ultimo_guardado).toLocaleDateString('es-MX', {day:'numeric', month:'short', year:'numeric'})}`);
      if (student && !known) details.push('No pudimos recuperar todo tu avance. Puedes entrar al proyecto o volver a intentar.');
      const card = document.createElement('article');
      card.className = 'project-card';
      card.innerHTML = `<div class="art">${house ? illustration : '<span style="font-size:72px" aria-hidden="true">✦</span>'}<span class="art-label">${house ? 'DISEÑA · CONSTRUYE · EXPERIMENTA' : 'UN NUEVO RETO STEAM'}</span></div><div class="card-body"><span class="badge ${started || delivered ? 'active' : ''}">${status}</span><h3>${esc(project.nombre)}</h3><p class="description">${esc(house ? 'Diseña una vivienda y da vida a tus ideas en un entorno 3D. Conecta la geometría, los materiales y la programación mientras construyes.' : project.descripcion || 'Explora este proyecto y descubre su reto.')}</p>${house ? '<div class="tags"><span class="tag">Geometría</span><span class="tag">Materiales</span><span class="tag">Diseño 3D</span><span class="tag">Programación</span></div>' : ''}<p class="progress-copy">${details.map(esc).join('<br>')}</p><div class="actions">${href ? `<a class="button" href="${esc(href)}">${action} →</a>` : '<span>Acceso aún no disponible</span>'}${student && !delivered ? `<a class="text-link" href="alumno.html?proyecto=${encodeURIComponent(project.id)}">Ver mi progreso</a>` : ''}</div></div>`;
      $('projects').append(card);
      if (student && started && !delivered && href) resumable.push({ project, href, time: Date.parse(saved?.ultimo_guardado) || 0 });
    }
    resumable.sort((a,b) => b.time - a.time);
    if (resumable.length) { const {project, href} = resumable[0]; $('resume-title').textContent = project.nombre; $('resume-description').textContent = 'Retoma tu trabajo y sigue avanzando a tu ritmo.'; $('resume-link').href = href; $('resume').hidden = false; }
    $('project-count').textContent = `${proyectos.length} ${proyectos.length === 1 ? 'proyecto disponible' : 'proyectos disponibles'}`;
    const partial = student && (!progressOK || modules?.status !== 'fulfilled');
    $('message').hidden = proyectos.length > 0 && !partial;
    $('message').textContent = !proyectos.length ? 'Todavía no hay proyectos activos. Tu docente te indicará cuándo estarán disponibles.' : 'Parte de tu progreso no está disponible en este momento.';
    $('retry').hidden = !partial;
  } catch {
    $('message').textContent = 'No pudimos cargar tus proyectos. Comprueba tu conexión y vuelve a intentar.';
    $('retry').hidden = false;
  }
}
$('retry').addEventListener('click', load);
$('logout').addEventListener('click', () => { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = 'index.html'; });
if (!token) location.replace('index.html'); else load();
