import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const API = '/api';
const token = localStorage.getItem('token');

if (!token) {
  window.location.href = 'index.html';
}

let me = null;
try {
  me = JSON.parse(atob(token.split('.')[1]));
  if (!['maestro', 'admin'].includes(me.rol_nombre)) {
    window.location.href = 'alumno.html';
  }
} catch (e) {
  window.location.href = 'index.html';
}

// Iniciales del avatar
const userInitials = me?.nombre_completo ? me.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'M';
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (sidebarAvatar) sidebarAvatar.textContent = userInitials;
const topbarAvatar = document.getElementById('topbarAvatar');
if (topbarAvatar) topbarAvatar.textContent = userInitials;

const topbarUserName = document.getElementById('topbarUserName');
if (topbarUserName) topbarUserName.textContent = me?.nombre_completo || 'Maestro';

const sidebarUser = document.getElementById('sidebar-user');
if (sidebarUser) {
  sidebarUser.innerHTML = `<strong>${me.nombre_completo}</strong>${me.rol_nombre === 'admin' ? 'Administrador' : 'Docente'}`;
}

// Logout
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
}

const hdrs = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

// Toast
function toast(msg, ok = true) {
  const t = document.getElementById('toast');
  const dot = document.getElementById('toastDot');
  const msgEl = document.getElementById('toastMsg');
  if (dot) dot.className = 'toast-dot ' + (ok ? 'green' : 'red');
  if (msgEl) msgEl.textContent = msg;
  if (t) {
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }
}

function fmt(fecha) {
  return fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function fmtDateTime(fecha) {
  return fecha ? new Date(fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

const ETIQUETA_ESTADO = { en_progreso: 'En progreso', completado: 'Completado' };

/* ── NAVEGACIÓN ENTRE SECCIONES (TABS) ── */
window.switchTab = function (tabId) {
  document.querySelectorAll('.dash-view').forEach(view => view.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.classroom-sidebar .nav-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Cerrar sidebar en móvil si está abierto
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
};

document.querySelectorAll('.classroom-sidebar .nav-item-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    window.switchTab(btn.dataset.tab);
  });
});

// Responsive Sidebar
const btnToggleMenu = document.getElementById('btnToggleMenu');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

if (btnToggleMenu && sidebar) {
  btnToggleMenu.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
  });
}
if (sidebarBackdrop && sidebar) {
  sidebarBackdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');
  });
}

/* ── NOTIFICACIONES POPOVER ── */
const btnNotifications = document.getElementById('btnNotifications');
const popoverNotifications = document.getElementById('popoverNotifications');
const btnCloseNotif = document.getElementById('btnCloseNotif');

if (btnNotifications && popoverNotifications) {
  btnNotifications.addEventListener('click', (e) => {
    e.stopPropagation();
    popoverNotifications.classList.toggle('visible');
  });
}
if (btnCloseNotif && popoverNotifications) {
  btnCloseNotif.addEventListener('click', () => popoverNotifications.classList.remove('visible'));
}
document.addEventListener('click', (e) => {
  if (popoverNotifications && !popoverNotifications.contains(e.target) && e.target !== btnNotifications) {
    popoverNotifications.classList.remove('visible');
  }
});

/* ── VARIABLES DE DATOS ── */
let alumnos = [];
let cursos = [];
const currentCursoId = parseInt(new URLSearchParams(location.search).get('curso'), 10);

/* ── CHARTS INSTANCES ── */
let chartAvanceInstance = null;
let chartEntregasInstance = null;

function renderTeacherCharts(lista) {
  // 1. Chart Estado de Entregas (Doughnut)
  const ctxEntregas = document.getElementById('chartDocenteEntregas')?.getContext('2d');
  if (ctxEntregas) {
    const entregados = lista.filter(a => a.entregado_en).length;
    const sinEntregar = lista.length - entregados;
    const calificados = lista.filter(a => a.calificacion_final != null).length;

    if (chartEntregasInstance) chartEntregasInstance.destroy();
    chartEntregasInstance = new Chart(ctxEntregas, {
      type: 'doughnut',
      data: {
        labels: ['Calificados', 'Por calificar', 'Sin entregar'],
        datasets: [{
          data: [calificados, entregados - calificados, sinEntregar],
          backgroundColor: ['#234e40', '#3a6fa8', '#c29540'],
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
        },
        cutout: '65%',
      },
    });
  }

  // 2. Chart Calificaciones de Alumnos (Bar)
  const ctxAvance = document.getElementById('chartDocenteAvance')?.getContext('2d');
  if (ctxAvance) {
    const calificados = lista.filter(a => a.calificacion_final != null);
    const labels = calificados.length ? calificados.map(a => a.nombre_completo.split(' ')[0]) : ['Sin notas aún'];
    const scores = calificados.length ? calificados.map(a => parseFloat(a.calificacion_final)) : [0];

    if (chartAvanceInstance) chartAvanceInstance.destroy();
    chartAvanceInstance = new Chart(ctxAvance, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Calificación Final (0-100)',
          data: scores,
          backgroundColor: '#234e40',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(35, 78, 64, 0.06)' } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
}

/* ── ACTUALIZAR ESTADÍSTICAS DEL DOCENTE ── */
function actualizarStats(lista) {
  const statTotal = document.getElementById('statTotal');
  if (statTotal) statTotal.textContent = lista.length;

  const entregados = lista.filter(a => a.entregado_en);
  const statEntregados = document.getElementById('statEntregados');
  if (statEntregados) statEntregados.textContent = entregados.length;

  const pendientes = entregados.filter(a => a.calificacion_final == null);
  const statPendientes = document.getElementById('statPendientes');
  if (statPendientes) statPendientes.textContent = pendientes.length;

  // Promedio del grupo
  const notas = lista.filter(a => a.calificacion_final != null).map(a => parseFloat(a.calificacion_final));
  const avg = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';
  const statPromedio = document.getElementById('statPromedio');
  if (statPromedio) statPromedio.textContent = avg !== '—' ? `${avg}/100` : '—';

  // Badges en sidebar
  const badgeAlumnos = document.getElementById('badgeTeacherAlumnos');
  if (badgeAlumnos) badgeAlumnos.textContent = lista.length;
  const badgeEntregas = document.getElementById('badgeTeacherEntregas');
  if (badgeEntregas) badgeEntregas.textContent = pendientes.length ? `${pendientes.length} pend.` : entregados.length;

  // Renderizar gráficas
  renderTeacherCharts(lista);
}

/* ── RENDERIZAR TABLA DE ALUMNOS ── */
function render(lista) {
  const tbody = document.getElementById('alumnosTableBody');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Sin alumnos asignados todavía. Asigna estudiantes usando el botón "+ Asignar alumno".</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(a => {
    const progresoCalc = a.entregado_en ? 100 : (a.progreso?.buildPhase ? Math.min(Math.round((a.progreso.buildPhase / 4) * 100), 90) : (a.ultimo_guardado ? 30 : 0));
    return `
      <tr>
        <td class="cell-name">
          <div style="font-weight:600;">${a.nombre_completo}</div>
          <div style="font-size:11px;color:var(--text-light);">${a.email}</div>
        </td>
        <td><span class="curso-pill">${a.curso}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;min-width:60px;height:6px;background:var(--surface-2);border-radius:4px;overflow:hidden;">
              <div style="width:${progresoCalc}%;height:100%;background:#234e40;border-radius:4px;"></div>
            </div>
            <span style="font-size:11px;font-weight:600;">${progresoCalc}%</span>
          </div>
        </td>
        <td>${ETIQUETA_ESTADO[a.estado_general] || a.estado_general || 'En progreso'}</td>
        <td>${a.entregado_en
          ? `<span class="estado-pill estado-entregado">Entregado · ${fmt(a.entregado_en)}</span>`
          : `<span class="estado-pill estado-pendiente">Sin entregar</span>`}</td>
        <td>
          ${a.entregado_en
            ? `<input type="number" min="0" max="100" class="calif-input" id="calif-${a.id}" value="${a.calificacion_final ?? ''}" placeholder="—">`
            : '<span style="font-size:12px;color:var(--text-light)">Pendiente</span>'}
        </td>
        <td style="text-align:right">
          ${a.entregado_en ? `
            <button class="btn-mini" title="Abrir escena 3D entregada en el simulador" onclick="window.open('sandbox.html?proyecto=${currentCursoId || 1}&alumno=${a.id}', '_blank')">Simulador</button>
            <button class="btn-mini" style="margin-left:4px" onclick="guardarCalificacion(${a.id})">Guardar</button>
          ` : `
            <button class="btn-classroom-ghost" style="padding:4px 8px;font-size:11px;color:#b24b32;border-color:rgba(178,75,50,0.2);" onclick="window.desasignarAlumno(${a.curso_id || 1}, ${a.id}, '${a.nombre_completo}')">Desasignar</button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

/* ── RENDERIZAR TABLA DE ENTREGAS Y REVISIÓN ── */
function renderEntregas(lista) {
  const tbody = document.getElementById('entregasTableBody');
  if (!tbody) return;

  const entregados = lista.filter(a => a.entregado_en);
  if (!entregados.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No hay trabajos entregados pendientes de revisión.</td></tr>';
    return;
  }

  tbody.innerHTML = entregados.map(a => `
    <tr>
      <td class="cell-name">${a.nombre_completo}</td>
      <td><span class="curso-pill">${a.curso}</span></td>
      <td>${fmtDateTime(a.entregado_en)}</td>
      <td>${a.calificacion_final != null ? `<span class="status-pill status-entregado">Calificado (${a.calificacion_final}/100)</span>` : '<span class="status-pill status-pendiente">Por revisar</span>'}</td>
      <td>
        <input type="number" min="0" max="100" class="calif-input" id="calif-entrega-${a.id}" value="${a.calificacion_final ?? ''}" placeholder="0-100">
      </td>
      <td style="text-align:right">
        <button class="btn-mini" onclick="window.open('sandbox.html?proyecto=${currentCursoId || 1}&alumno=${a.id}', '_blank')">Ver Casa 3D</button>
        <button class="btn-mini" style="margin-left:4px" onclick="guardarCalificacionEntrega(${a.id})">Guardar</button>
      </td>
    </tr>
  `).join('');
}

/* ── RENDERIZAR TARJETAS DE CURSOS (ESTILO CLASSROOM) ── */
function renderCursos(lista) {
  const cont = document.getElementById('cursosRow');
  const catalogCont = document.getElementById('cursosCardsContainer');

  const html = !lista.length
    ? '<div class="table-empty" style="grid-column: 1/-1;">Sin cursos asignados todavía.</div>'
    : lista.map((c, idx) => {
      const themes = ['theme-green', 'theme-blue', 'theme-orange', 'theme-purple'];
      const theme = themes[idx % themes.length];
      return `
        <div class="course-card-item">
          <div class="course-card-banner ${theme}">
            <div class="course-banner-top">
              <span class="course-category-tag">Curso STEAM</span>
              <span class="course-status-badge">${c.total_alumnos} alumnos</span>
            </div>
            <h3 class="course-card-title">${c.titulo}</h3>
          </div>
          <div class="course-card-body">
            <p class="course-desc">${c.descripcion || 'Curso interactivo de modelado y construcción de viviendas 3D.'}</p>
            <div class="course-card-footer">
              <span class="course-meta-text">Secuencia #${c.orden_secuencia || 1}</span>
              <a href="maestro.html?curso=${c.id}" class="btn-card-action">Ver alumnos del curso →</a>
            </div>
          </div>
        </div>
      `;
    }).join('');

  if (cont) cont.innerHTML = html;
  if (catalogCont) catalogCont.innerHTML = html;

  const select = document.getElementById('addCurso');
  if (select) {
    select.innerHTML = '<option value="">Selecciona un curso…</option>' +
      lista.map(c => `<option value="${c.id}">${c.titulo}</option>`).join('');
  }
}

/* ── CARGAR DATOS DE CURSOS Y ALUMNOS ── */
async function cargarCursos() {
  try {
    const res = await fetch(`${API}/maestro/cursos`, { headers: hdrs() });
    const d = await res.json();
    cursos = d.cursos || [];
    renderCursos(cursos);
  } catch (e) {
    console.error('Error cargando cursos:', e);
  }
}

async function cargarAlumnos() {
  try {
    const res = await fetch(`${API}/maestro/alumnos`, { headers: hdrs() });
    const d = await res.json();
    let todosAlumnos = d.alumnos || [];

    if (Number.isInteger(currentCursoId)) {
      const cursoInfo = cursos.find(c => c.id === currentCursoId);
      if (cursoInfo) {
        const topH1 = document.querySelector('.classroom-hero-banner .hero-banner-title');
        if (topH1) topH1.textContent = cursoInfo.titulo;
        const tablaTitulo = document.getElementById('tablaTitulo');
        if (tablaTitulo) tablaTitulo.textContent = `Alumnos en ${cursoInfo.titulo}`;
        todosAlumnos = todosAlumnos.filter(a => a.curso === cursoInfo.titulo);
      }
    }

    alumnos = todosAlumnos;
    render(alumnos);
    renderEntregas(alumnos);
    actualizarStats(alumnos);
  } catch (e) {
    console.error('Error cargando alumnos:', e);
  }
}

/* ── GUARDAR CALIFICACIÓN ── */
async function guardarCalificacion(alumnoId) {
  const input = document.getElementById(`calif-${alumnoId}`);
  const val = input.value.trim();
  if (val === '') {
    toast('Escribe una calificación', false);
    return;
  }
  const res = await fetch(`${API}/maestro/calificaciones/${alumnoId}`, {
    method: 'PUT',
    headers: hdrs(),
    body: JSON.stringify({ calificacion_final: parseFloat(val) }),
  });
  const d = await res.json();
  if (!res.ok) {
    toast(d.error || 'No se pudo guardar', false);
    return;
  }
  toast('✓ Calificación guardada');
  cargarAlumnos();
}
window.guardarCalificacion = guardarCalificacion;

async function guardarCalificacionEntrega(alumnoId) {
  const input = document.getElementById(`calif-entrega-${alumnoId}`);
  const val = input.value.trim();
  if (val === '') {
    toast('Escribe una calificación', false);
    return;
  }
  const res = await fetch(`${API}/maestro/calificaciones/${alumnoId}`, {
    method: 'PUT',
    headers: hdrs(),
    body: JSON.stringify({ calificacion_final: parseFloat(val) }),
  });
  const d = await res.json();
  if (!res.ok) {
    toast(d.error || 'No se pudo guardar', false);
    return;
  }
  toast('✓ Calificación registrada');
  cargarAlumnos();
}
window.guardarCalificacionEntrega = guardarCalificacionEntrega;

/* ── DESASIGNAR ALUMNO ── */
window.desasignarAlumno = async function (cursoId, alumnoId, nombre) {
  if (!confirm(`¿Estás seguro de desasignar a ${nombre} de este curso?`)) return;
  try {
    const res = await fetch(`${API}/maestro/cursos/${cursoId}/alumnos/${alumnoId}`, {
      method: 'DELETE',
      headers: hdrs(),
    });
    const d = await res.json();
    if (res.ok) {
      toast('✓ Alumno desasignado');
      cargarAlumnos();
      cargarCursos();
    } else {
      toast(d.error || 'No se pudo desasignar', false);
    }
  } catch (e) {
    toast('Error de conexión', false);
  }
};

/* ── BÚSQUEDA Y FILTRADO ── */
function aplicarFiltrosAlumnos() {
  const q = (document.getElementById('searchInput')?.value || document.getElementById('globalSearchInput')?.value || '').toLowerCase().trim();
  const filterCurso = document.getElementById('filterStudentCourse')?.value || '';
  const filterEntrega = document.getElementById('filterStudentEntrega')?.value || '';

  const filtrados = alumnos.filter(a => {
    const matchSearch = !q || a.nombre_completo.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    const matchCurso = !filterCurso || a.curso === filterCurso;
    const matchEntrega = !filterEntrega || (filterEntrega === 'entregado' ? Boolean(a.entregado_en) : !a.entregado_en);
    return matchSearch && matchCurso && matchEntrega;
  });

  render(filtrados);
}

document.getElementById('searchInput')?.addEventListener('input', aplicarFiltrosAlumnos);
document.getElementById('globalSearchInput')?.addEventListener('input', () => {
  const globalQ = document.getElementById('globalSearchInput').value;
  const localSearch = document.getElementById('searchInput');
  if (localSearch) localSearch.value = globalQ;
  aplicarFiltrosAlumnos();
});
document.getElementById('filterStudentCourse')?.addEventListener('change', aplicarFiltrosAlumnos);
document.getElementById('filterStudentEntrega')?.addEventListener('change', aplicarFiltrosAlumnos);

/* ── MODAL: ASIGNAR ALUMNO EXISTENTE ── */
const modalAdd = document.getElementById('modalAddUser');
const formAdd = document.getElementById('formAddUser');
const addError = document.getElementById('addError');
let alumnosDisponibles = [];

async function cargarAlumnosDisponibles() {
  try {
    const res = await fetch(`${API}/maestro/alumnos-disponibles`, { headers: hdrs() });
    const d = await res.json();
    alumnosDisponibles = d.alumnos || [];
    actualizarSelectAlumnos('');
  } catch (err) {
    alumnosDisponibles = [];
  }
}

function actualizarSelectAlumnos(filtro) {
  const select = document.getElementById('addAlumnoSelect');
  if (!select) return;
  const q = filtro.toLowerCase().trim();
  const filtrados = q
    ? alumnosDisponibles.filter(a =>
        a.nombre_completo.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      )
    : alumnosDisponibles;

  if (!filtrados.length) {
    select.innerHTML = '<option value="">— Sin resultados —</option>';
  } else {
    select.innerHTML = '<option value="">— Selecciona un alumno —</option>' +
      filtrados.map(a =>
        `<option value="${a.id}">${a.nombre_completo} &lt;${a.email}&gt;</option>`
      ).join('');
  }
}

document.getElementById('addSearch')?.addEventListener('input', (e) => {
  actualizarSelectAlumnos(e.target.value);
});

document.getElementById('btnAddUser')?.addEventListener('click', () => {
  formAdd?.reset();
  if (addError) addError.style.display = 'none';
  cargarAlumnosDisponibles();
  modalAdd?.classList.add('visible');
});

document.getElementById('btnCloseAdd')?.addEventListener('click', () => modalAdd?.classList.remove('visible'));
modalAdd?.addEventListener('click', (e) => {
  if (e.target === modalAdd) modalAdd?.classList.remove('visible');
});

formAdd?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitAdd');
  btn.disabled = true;
  btn.textContent = 'Asignando…';
  if (addError) addError.style.display = 'none';

  const alumnoId = document.getElementById('addAlumnoSelect')?.value;
  const rutaId = document.getElementById('addCurso')?.value;

  if (!alumnoId) {
    if (addError) {
      addError.textContent = 'Selecciona un alumno';
      addError.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Asignar alumno';
    return;
  }
  if (!rutaId) {
    if (addError) {
      addError.textContent = 'Selecciona un curso';
      addError.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Asignar alumno';
    return;
  }

  const res = await fetch(`${API}/maestro/alumnos`, {
    method: 'POST',
    headers: hdrs(),
    body: JSON.stringify({
      alumno_id: parseInt(alumnoId),
      ruta_id: parseInt(rutaId),
    }),
  });
  const d = await res.json();
  if (!res.ok) {
    if (addError) {
      addError.textContent = d.error || 'No se pudo asignar el alumno';
      addError.style.display = 'block';
    }
  } else {
    modalAdd?.classList.remove('visible');
    toast('✓ Alumno asignado correctamente');
    cargarAlumnos();
    cargarCursos();
  }
  btn.disabled = false;
  btn.textContent = 'Asignar alumno';
});

/* ── CARGAR ACTIVIDAD DEL DOCENTE (POPOVER) ── */
async function cargarActividadDocente() {
  const notifList = document.getElementById('notifList');
  if (!notifList) return;
  try {
    const res = await fetch(`${API}/admin/actividad?limit=8`, { headers: hdrs() }).catch(() => null);
    if (!res || !res.ok) {
      notifList.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-light);">Sin actividad registrada.</div>';
      return;
    }
    const d = await res.json();
    const items = d.actividad || [];
    if (!items.length) {
      notifList.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-light);">Sin actividad registrada.</div>';
      return;
    }
    notifList.innerHTML = items.map(act => `
      <div class="notification-item">
        <span class="notification-dot"></span>
        <div class="notification-text">
          <strong>${act.usuario || 'Estudiante'}:</strong> ${(act.tipo_accion || '').replace(/_/g, ' ')}
          <div class="notification-time">${fmtDateTime(act.creado_en)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    notifList.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-light);">Sin notificaciones.</div>';
  }
}

/* ── INICIALIZACIÓN ── */
if (Number.isInteger(currentCursoId)) {
  const genSec = document.getElementById('general-section');
  if (genSec) genSec.style.display = 'none';
  const subLink = document.querySelector('.hero-banner-subtitle');
  if (subLink) subLink.innerHTML = '<a href="maestro.html" style="color:#ffffff;text-decoration:underline;">← Volver al Panel General del Maestro</a>';
}

cargarCursos();
cargarAlumnos();
cargarActividadDocente();
