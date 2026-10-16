import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
};

let payload = null;
try {
  payload = JSON.parse(atob(token.split('.')[1]));
} catch (e) {
  window.location.href = 'index.html';
}

if (payload?.rol_nombre !== 'alumno') {
  if (payload?.rol_nombre === 'maestro') window.location.href = 'maestro.html';
  else if (payload?.rol_nombre === 'admin') window.location.href = 'PanelAdministrativo.html';
}

// Iniciales y usuario
const userInitials = payload?.nombre_completo ? payload.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'A';
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (sidebarAvatar) sidebarAvatar.textContent = userInitials;
const topbarAvatar = document.getElementById('topbarAvatar');
if (topbarAvatar) topbarAvatar.textContent = userInitials;

const topbarUserName = document.getElementById('topbarUserName');
if (topbarUserName) topbarUserName.textContent = payload?.nombre_completo || 'Alumno';

const sidebarUserLearn = document.getElementById('sidebar-user-learn');
if (sidebarUserLearn) {
  sidebarUserLearn.innerHTML = `<strong style="color:var(--text-dark);display:block">${payload.nombre_completo}</strong>Alumno STEAM`;
}

const saludo = document.getElementById('saludo');
if (saludo) {
  saludo.textContent = `¡Hola, ${payload.nombre_completo.split(' ')[0]}!`;
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

// Helpers
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = f => f ? new Date(f).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const EXAMEN = { no_iniciado: 'Sin iniciar', en_progreso: 'En progreso', entregado: 'Entregado' };
const ACCION = {
  login: 'Inicio de sesión',
  entrega_casa: 'Entrega del examen',
  reinicio_casa: 'Reinicio de la casa',
  pregunta_creada: 'Pregunta publicada',
  registro_google: 'Cuenta vinculada con Google',
};

/* ── NAVEGACIÓN ENTRE TABS ── */
window.switchTab = function (tabId) {
  document.querySelectorAll('.dash-view').forEach(view => view.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.classroom-sidebar .nav-item-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

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

// Mobile menu toggle
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

// Notificaciones popover
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

const get = url => fetch(url, { headers }).then(r => {
  if (!r.ok) throw new Error(r.status);
  return r.json();
});

/* ── CHARTS INSTANCES ── */
let chartProgresoInstance = null;
let chartObjetivosInstance = null;

function renderStudentCharts(proyectos, calificaciones, objetivos) {
  // 1. Chart Estado de proyectos (Doughnut)
  const ctxProg = document.getElementById('chartAlumnoEstado')?.getContext('2d');
  if (ctxProg) {
    const entregados = proyectos.filter(p => p.examen === 'entregado').length;
    const enProgreso = proyectos.filter(p => p.examen === 'en_progreso').length;
    const sinIniciar = Math.max(proyectos.length - entregados - enProgreso, 0);

    if (chartProgresoInstance) chartProgresoInstance.destroy();
    chartProgresoInstance = new Chart(ctxProg, {
      type: 'doughnut',
      data: {
        labels: ['Entregados', 'En curso', 'Sin iniciar'],
        datasets: [{
          data: [entregados, enProgreso, sinIniciar || 1],
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

  // 2. Chart Objetivos de Construcción (Bar)
  const ctxObj = document.getElementById('chartAlumnoObjetivos')?.getContext('2d');
  if (ctxObj) {
    const objs = objetivos || [
      { label: 'Paredes', actual: 0, requerido: 5 },
      { label: 'Puertas', actual: 0, requerido: 2 },
      { label: 'Ventanas', actual: 0, requerido: 3 },
    ];

    if (chartObjetivosInstance) chartObjetivosInstance.destroy();
    chartObjetivosInstance = new Chart(ctxObj, {
      type: 'bar',
      data: {
        labels: objs.map(o => o.label),
        datasets: [
          {
            label: 'Elementos colocados',
            data: objs.map(o => o.actual),
            backgroundColor: '#234e40',
            borderRadius: 6,
          },
          {
            label: 'Meta requerida',
            data: objs.map(o => o.requerido),
            backgroundColor: 'rgba(35, 78, 64, 0.15)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(35, 78, 64, 0.06)' }, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
      },
    });
  }
}

/* ── CARGAR DASHBOARD ── */
const pid = parseInt(new URLSearchParams(location.search).get('proyecto'), 10);

async function inicializarDashboard() {
  try {
    const califsPromise = get('/api/alumno/calificaciones').then(d => d.calificaciones || []).catch(() => []);

    if (Number.isInteger(pid)) {
      // ── MODO PROYECTO ESPECÍFICO (?proyecto=ID) ──
      const navVolver = document.getElementById('navVolverProyecto');
      if (navVolver) navVolver.style.display = 'block';

      const [d, califs] = await Promise.all([
        get(`/api/alumno/proyectos/${pid}/dashboard`),
        califsPromise,
      ]);

      if (saludo) saludo.textContent = d.proyecto.nombre;
      const subtitulo = document.getElementById('subtitulo');
      if (subtitulo) subtitulo.textContent = d.proyecto.descripcion || 'Progreso y entregas en este proyecto STEAM';

      // Actualizar tarjetas de KPI
      document.getElementById('statAlumnoProyectos').textContent = '1';
      document.getElementById('statAlumnoObjetivos').textContent = `${d.progreso.objetivos_completos}/${d.progreso.objetivos_total}`;
      document.getElementById('statAlumnoEstadoExamen').textContent = EXAMEN[d.examen.estado] || 'Sin iniciar';

      const miCalif = califs.find(c => c.ruta === d.proyecto.nombre && c.calificacion_final != null);
      document.getElementById('statAlumnoCalif').textContent = miCalif ? `${parseFloat(miCalif.calificacion_final)}/100` : (d.examen.estado === 'entregado' ? 'En revisión' : 'Pendiente');

      // Badges
      const badgeEntrega = document.getElementById('badgeEntrega');
      const badgeCuestionario = document.getElementById('badgeCuestionario');
      const badgeCalif = document.getElementById('badgeCalif');

      if (d.examen.estado === 'entregado') {
        if (badgeEntrega) {
          badgeEntrega.textContent = 'Entregado';
          badgeEntrega.className = 'status-pill status-entregado';
        }
        if (badgeCuestionario) {
          badgeCuestionario.textContent = 'Disponible';
          badgeCuestionario.className = 'status-pill status-entregado';
        }
      } else {
        if (badgeEntrega) {
          badgeEntrega.textContent = 'Sin entregar';
          badgeEntrega.className = 'status-pill status-pendiente';
        }
        if (badgeCuestionario) {
          badgeCuestionario.textContent = 'Entrega para desbloquear';
          badgeCuestionario.className = 'status-pill status-pendiente';
        }
      }

      if (badgeCalif) {
        if (miCalif) {
          badgeCalif.textContent = `${parseFloat(miCalif.calificacion_final)}/100`;
          badgeCalif.className = 'status-pill status-entregado';
        } else if (d.examen.estado === 'entregado') {
          badgeCalif.textContent = 'Por calificar';
          badgeCalif.className = 'status-pill status-progreso';
        } else {
          badgeCalif.textContent = 'Pendiente';
          badgeCalif.className = 'status-pill status-pendiente';
        }
      }

      // Renderizar objetivos en la pestaña Pendientes
      const objetivosContainer = document.getElementById('objetivosListaContainer');
      if (objetivosContainer && d.objetivos) {
        objetivosContainer.innerHTML = d.objetivos.map(o => `
          <div class="dx-row ${o.completo ? 'ok' : ''}" style="padding:12px 0;">
            <div>
              <strong style="display:block;font-size:14px;">${esc(o.label)}</strong>
              <small style="color:var(--text-light);">${o.completo ? '¡Objetivo completado!' : `Se requieren ${o.requerido} elementos colocados`}</small>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="status-pill ${o.completo ? 'status-entregado' : 'status-pendiente'}">${o.actual}/${o.requerido}</span>
            </div>
          </div>
        `).join('');
      }

      // Renderizar calificaciones del proyecto
      renderCalificacionesTabla(califs.filter(c => c.ruta === d.proyecto.nombre));

      // Renderizar actividad
      renderActividadAlumno(d.actividad.eventos || []);

      // Gráficas
      renderStudentCharts([{ id: d.proyecto.id, examen: d.examen.estado }], califs, d.objetivos);
    } else {
      // ── MODO DASHBOARD GENERAL ──
      const [d, califs] = await Promise.all([
        get('/api/alumno/dashboard'),
        califsPromise,
      ]);

      // KPIs
      document.getElementById('statAlumnoProyectos').textContent = d.resumen.total;
      document.getElementById('statAlumnoObjetivos').textContent = `${d.resumen.completados}/${d.resumen.total}`;
      document.getElementById('statAlumnoEstadoExamen').textContent = d.resumen.completados > 0 ? `${d.resumen.completados} entregados` : 'En progreso';

      const primeraNota = califs.find(c => c.calificacion_final != null);
      document.getElementById('statAlumnoCalif').textContent = primeraNota ? `${parseFloat(primeraNota.calificacion_final)}/100` : 'Pendiente';

      // Renderizar lista de proyectos
      renderProyectosAlumno(d.proyectos || []);

      // Renderizar calificaciones
      renderCalificacionesTabla(califs);

      // Renderizar actividad
      renderActividadAlumno(d.actividad || []);

      // Gráficas
      renderStudentCharts(d.proyectos || [], califs, null);
    }

    // Cargar perfil del alumno
    cargarPerfilAlumno();
  } catch (err) {
    console.error('Error inicializando dashboard alumno:', err);
  }
}

function renderProyectosAlumno(proyectos) {
  const container = document.getElementById('alumnoProyectosCards');
  if (!container) return;

  if (!proyectos.length) {
    container.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1/-1;">
        <div class="empty-state-icon">📚</div>
        <h4 class="empty-state-title">Aún no estás inscrito en ningún proyecto</h4>
        <p class="empty-state-desc">Explora el catálogo de proyectos o solicita a tu docente que te asigne a un curso.</p>
        <a href="proyectos.html" class="btn-classroom-dark">Explorar Proyectos →</a>
      </div>
    `;
    return;
  }

  container.innerHTML = proyectos.map((p, idx) => {
    const themes = ['theme-green', 'theme-blue', 'theme-orange', 'theme-purple'];
    const theme = themes[idx % themes.length];
    const pct = p.objetivos_total ? Math.round((p.objetivos_completos / p.objetivos_total) * 100) : (p.examen === 'entregado' ? 100 : 25);

    return `
      <div class="course-card-item">
        <div class="course-card-banner ${theme}">
          <div class="course-banner-top">
            <span class="course-category-tag">Proyecto STEAM</span>
            <span class="course-status-badge ${p.examen === 'entregado' ? 'completado' : ''}">${EXAMEN[p.examen] || 'En curso'}</span>
          </div>
          <h3 class="course-card-title">${esc(p.nombre)}</h3>
        </div>
        <div class="course-card-body">
          <p class="course-desc">${esc(p.descripcion || 'Diseña una vivienda y da vida a tus ideas en un entorno 3D sustentable.')}</p>
          <div class="course-progress-block">
            <div class="course-progress-label">
              <span>Progreso de construcción</span>
              <span>${pct}%</span>
            </div>
            <div class="course-progress-bar">
              <div class="course-progress-fill" style="width:${pct}%;"></div>
            </div>
          </div>
          <div class="course-card-footer">
            <span class="course-meta-text">${p.ultimo_guardado ? `Guardado: ${new Date(p.ultimo_guardado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : 'Sin guardar'}</span>
            <div style="display:flex;gap:8px;">
              <a href="alumno.html?proyecto=${p.id}" class="btn-card-action">Detalles →</a>
              <a href="learn.html?proyecto=${p.id}" class="btn-classroom-primary" style="padding:4px 10px;font-size:11px;">Entrar</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCalificacionesTabla(calificaciones) {
  const tbody = document.getElementById('calificacionesTableBody');
  if (!tbody) return;

  if (!calificaciones.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Aún no tienes calificaciones registradas. Completa y entrega tu examen para recibir evaluación.</td></tr>';
    return;
  }

  tbody.innerHTML = calificaciones.map(c => `
    <tr>
      <td class="cell-name">${esc(c.practica)}</td>
      <td><span class="curso-pill">${esc(c.ruta)}</span></td>
      <td>${fecha(c.fecha_realizacion)}</td>
      <td>
        ${c.calificacion_final != null
          ? `<strong style="color:#16a34a;font-size:14px;">${parseFloat(c.calificacion_final)}/100</strong>`
          : '<span class="status-pill status-pendiente">Pendiente de revisión</span>'}
      </td>
    </tr>
  `).join('');
}

function renderActividadAlumno(eventos) {
  const tbody = document.getElementById('alumnoActividadTableBody');
  const notifList = document.getElementById('notifList');

  if (tbody) {
    if (!eventos.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="table-empty">Sin actividad registrada todavía.</td></tr>';
    } else {
      tbody.innerHTML = eventos.map(e => `
        <tr>
          <td class="cell-date">${fecha(e.creado_en)}</td>
          <td class="cell-name"><strong>${esc(ACCION[e.tipo_accion] || e.tipo_accion)}</strong></td>
          <td style="font-size:12px;color:var(--text-light);">Acción registrada en la plataforma</td>
        </tr>
      `).join('');
    }
  }

  if (notifList) {
    if (!eventos.length) {
      notifList.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-light);">Sin notificaciones recientes</div>';
    } else {
      notifList.innerHTML = eventos.slice(0, 5).map(e => `
        <div class="notification-item">
          <span class="notification-dot"></span>
          <div class="notification-text">
            <strong>${esc(ACCION[e.tipo_accion] || e.tipo_accion)}</strong>
            <div class="notification-time">${fecha(e.creado_en)}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

async function cargarPerfilAlumno() {
  const container = document.getElementById('alumnoProfileDetails');
  if (!container) return;
  try {
    const res = await get('/api/auth/me');
    if (res.user) {
      container.innerHTML = `
        <div><strong>Nombre completo:</strong> ${esc(res.user.nombre_completo)}</div>
        <div><strong>Correo:</strong> ${esc(res.user.email)}</div>
        <div><strong>Rol educativo:</strong> Alumno activo</div>
        <div><strong>Carrera / Especialidad:</strong> ${esc(res.user.carrera || 'No especificada')}</div>
        <div><strong>Fecha de registro:</strong> ${new Date(res.user.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      `;
    }
  } catch (e) {
    container.textContent = 'No se pudo cargar la información del perfil.';
  }
}

inicializarDashboard();
