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
  if (me.rol_nombre !== 'admin') {
    window.location.href = 'proyectos.html';
  }
} catch (e) {
  window.location.href = 'index.html';
}

// Iniciales del usuario
const userInitials = me?.nombre_completo ? me.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'A';
const sidebarAvatar = document.getElementById('sidebarAvatar');
if (sidebarAvatar) sidebarAvatar.textContent = userInitials;
const topbarAvatar = document.getElementById('topbarAvatar');
if (topbarAvatar) topbarAvatar.textContent = userInitials;

const topbarUserName = document.getElementById('topbarUserName');
if (topbarUserName) topbarUserName.textContent = me?.nombre_completo || 'Administrador';

const sidebarUser = document.getElementById('sidebar-user');
if (sidebarUser) {
  sidebarUser.innerHTML = `<strong>${me.nombre_completo}</strong>Administrador`;
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
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Toast
let toastTimer;
function showToast(msg, type = 'green') {
  clearTimeout(toastTimer);
  const dot = document.getElementById('toastDot');
  const msgEl = document.getElementById('toastMsg');
  const t = document.getElementById('toast');
  if (dot) dot.className = `toast-dot ${type}`;
  if (msgEl) msgEl.textContent = msg;
  if (t) {
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
  }
}

function rolBadge(rol) {
  const map = { admin: 'badge-admin', alumno: 'badge-alumno', maestro: 'badge-maestro' };
  return `<span class="badge-rol ${map[rol] || 'badge-alumno'}">${rol}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

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

/* ── CHARTS INSTANCES ── */
let chartRolesInstance = null;
let chartActividadInstance = null;
let chartTiposInstance = null;
let chartProyectosInstance = null;

function renderCharts(statsData, cursosData) {
  // 1. Chart Roles (Doughnut)
  const ctxRoles = document.getElementById('chartRoles')?.getContext('2d');
  if (ctxRoles) {
    if (chartRolesInstance) chartRolesInstance.destroy();
    chartRolesInstance = new Chart(ctxRoles, {
      type: 'doughnut',
      data: {
        labels: ['Alumnos', 'Docentes', 'Administradores'],
        datasets: [{
          data: [
            statsData.total_alumnos || 0,
            statsData.total_maestros || 0,
            statsData.total_admins || 0,
          ],
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

  // 2. Chart Actividad en el tiempo (Line)
  const ctxAct = document.getElementById('chartActividad')?.getContext('2d');
  if (ctxAct) {
    const actData = statsData.actividad_reciente || [];
    const labels = actData.map(d => new Date(d.dia).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
    const values = actData.map(d => parseInt(d.total, 10));

    if (chartActividadInstance) chartActividadInstance.destroy();
    chartActividadInstance = new Chart(ctxAct, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Sin datos'],
        datasets: [{
          label: 'Eventos diarios',
          data: values.length ? values : [0],
          borderColor: '#234e40',
          backgroundColor: 'rgba(35, 78, 64, 0.08)',
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#234e40',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(35, 78, 64, 0.06)' }, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // 3. Chart Tipos de actividad (Bar horizontal)
  const ctxTipos = document.getElementById('chartTiposActividad')?.getContext('2d');
  if (ctxTipos) {
    const tipos = statsData.actividad_por_tipo || [];
    const labels = tipos.map(t => t.tipo_accion.replace(/_/g, ' '));
    const counts = tipos.map(t => parseInt(t.cantidad, 10));

    if (chartTiposInstance) chartTiposInstance.destroy();
    chartTiposInstance = new Chart(ctxTipos, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Sin registros'],
        datasets: [{
          label: 'Ocurrencias',
          data: counts.length ? counts : [0],
          backgroundColor: '#3a6fa8',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(35, 78, 64, 0.06)' }, ticks: { precision: 0 } },
          y: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // 4. Chart Inscripciones por Proyecto / Curso
  const ctxProy = document.getElementById('chartProyectosInscritos')?.getContext('2d');
  if (ctxProy) {
    const cursos = cursosData || [];
    const labels = cursos.map(c => c.titulo);
    const counts = cursos.map(c => parseInt(c.total_alumnos, 10));

    if (chartProyectosInstance) chartProyectosInstance.destroy();
    chartProyectosInstance = new Chart(ctxProy, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Constructor de Casa'],
        datasets: [{
          label: 'Alumnos inscritos',
          data: counts.length ? counts : [0],
          backgroundColor: '#234e40',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(35, 78, 64, 0.06)' }, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
}

/* ── CARGA DE ESTADÍSTICAS ── */
async function loadStats() {
  try {
    const [d, cursosRes] = await Promise.all([
      fetch(`${API}/admin/stats`, { headers: hdrs() }).then(r => r.json()),
      fetch(`${API}/maestro/cursos`, { headers: hdrs() }).then(r => r.json()).catch(() => ({ cursos: [] })),
    ]);

    // IDs tradicionales
    const statTotal = document.getElementById('stat-total');
    if (statTotal) statTotal.textContent = d.total_usuarios ?? '—';
    const statAlumnos = document.getElementById('stat-alumnos');
    if (statAlumnos) statAlumnos.textContent = d.total_alumnos ?? '—';
    const statRutas = document.getElementById('stat-rutas');
    if (statRutas) statRutas.textContent = d.total_rutas ?? '—';
    const statAvg = document.getElementById('stat-avg');
    if (statAvg) statAvg.textContent = d.promedio_general ? `${d.promedio_general}/100` : '—';

    // IDs nuevos
    const statMaestros = document.getElementById('stat-maestros');
    if (statMaestros) statMaestros.textContent = d.total_maestros ?? '0';

    const badgeTotalUsers = document.getElementById('badgeTotalUsers');
    if (badgeTotalUsers) badgeTotalUsers.textContent = d.total_usuarios ?? '—';

    // Renderizar gráficas con datos reales
    renderCharts(d, cursosRes.cursos || []);
  } catch (e) {
    console.error('Error cargando stats:', e);
  }
}

/* ── GESTIÓN DE USUARIOS & PAGINACIÓN ── */
let allUsers = [];
let usersCurrentPage = 1;
const USERS_PER_PAGE = 8;

async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Cargando…</td></tr>`;

  try {
    const d = await fetch(`${API}/admin/users`, { headers: hdrs() }).then(r => r.json());
    allUsers = d.users || [];

    const topbarSub = document.getElementById('topbar-sub');
    if (topbarSub) {
      topbarSub.textContent = `${allUsers.length} usuarios registrados en la plataforma`;
    }

    renderUsersTable();
    renderSummaryUsers();
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error al cargar usuarios.</td></tr>`;
  }
}

function getFilteredUsers() {
  const q = (document.getElementById('searchInput')?.value || document.getElementById('globalSearchInput')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('filterUserRole')?.value || '';

  return allUsers.filter(u => {
    const matchesSearch = !q || u.nombre_completo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = !roleFilter || u.rol === roleFilter;
    return matchesSearch && matchesRole;
  });
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const filtered = getFilteredUsers();
  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE) || 1;
  if (usersCurrentPage > totalPages) usersCurrentPage = totalPages;

  const start = (usersCurrentPage - 1) * USERS_PER_PAGE;
  const pageUsers = filtered.slice(start, start + USERS_PER_PAGE);

  if (!pageUsers.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No se encontraron usuarios con esos filtros.</td></tr>`;
  } else {
    tbody.innerHTML = pageUsers.map(u => `
      <tr>
        <td class="cell-name">${u.nombre_completo}</td>
        <td class="cell-email">${u.email}</td>
        <td>${rolBadge(u.rol)}</td>
        <td class="cell-date">${fmtDate(u.creado_en)}</td>
        <td style="text-align:right">
          ${u.id === me.id
            ? `<span style="font-size:.75rem;font-weight:600;color:var(--text-light)">Tú (Sesión actual)</span>`
            : `
              <button class="btn-edit" data-id="${u.id}" data-name="${u.nombre_completo}" data-rol="${u.rol}">Cambiar rol</button>
              <button class="btn-delete" data-id="${u.id}" data-name="${u.nombre_completo}">Eliminar</button>
            `
          }
        </td>
      </tr>
    `).join('');
  }

  // Paginación
  const paginationInfo = document.getElementById('userPaginationInfo');
  if (paginationInfo) {
    paginationInfo.textContent = `Mostrando ${Math.min(start + 1, filtered.length)} - ${Math.min(start + USERS_PER_PAGE, filtered.length)} de ${filtered.length} usuarios`;
  }
  const currPageEl = document.getElementById('usersCurrentPage');
  if (currPageEl) currPageEl.textContent = `${usersCurrentPage} de ${totalPages}`;

  const btnPrev = document.getElementById('btnPrevUsersPage');
  if (btnPrev) btnPrev.disabled = usersCurrentPage <= 1;
  const btnNext = document.getElementById('btnNextUsersPage');
  if (btnNext) btnNext.disabled = usersCurrentPage >= totalPages;
}

function renderSummaryUsers() {
  const tbody = document.getElementById('usersSummaryTableBody');
  if (!tbody) return;
  const recents = allUsers.slice(0, 5);
  if (!recents.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Sin usuarios registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = recents.map(u => `
    <tr>
      <td class="cell-name">${u.nombre_completo}</td>
      <td class="cell-email">${u.email}</td>
      <td>${rolBadge(u.rol)}</td>
      <td class="cell-date">${fmtDate(u.creado_en)}</td>
      <td style="text-align:right">
        <button class="btn-classroom-primary" style="padding:4px 10px;font-size:11px;" onclick="window.switchTab('tab-usuarios')">Ver detalle</button>
      </td>
    </tr>
  `).join('');
}

// Eventos de búsqueda y paginación
document.getElementById('searchInput')?.addEventListener('input', () => {
  usersCurrentPage = 1;
  renderUsersTable();
});
document.getElementById('globalSearchInput')?.addEventListener('input', () => {
  const globalQ = document.getElementById('globalSearchInput').value;
  const userSearch = document.getElementById('searchInput');
  if (userSearch) userSearch.value = globalQ;
  usersCurrentPage = 1;
  renderUsersTable();
});
document.getElementById('filterUserRole')?.addEventListener('change', () => {
  usersCurrentPage = 1;
  renderUsersTable();
});
document.getElementById('btnPrevUsersPage')?.addEventListener('click', () => {
  if (usersCurrentPage > 1) {
    usersCurrentPage--;
    renderUsersTable();
  }
});
document.getElementById('btnNextUsersPage')?.addEventListener('click', () => {
  usersCurrentPage++;
  renderUsersTable();
});

/* ── MODAL AGREGAR USUARIO ── */
document.getElementById('btnAddUser')?.addEventListener('click', () => {
  document.getElementById('formAddUser')?.reset();
  const err = document.getElementById('addError');
  if (err) err.style.display = 'none';
  document.getElementById('modalAddUser')?.classList.add('visible');
});

document.getElementById('btnCloseAdd')?.addEventListener('click', () => {
  document.getElementById('modalAddUser')?.classList.remove('visible');
});

document.getElementById('modalAddUser')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modalAddUser')) {
    document.getElementById('modalAddUser')?.classList.remove('visible');
  }
});

document.getElementById('formAddUser')?.addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('addError');
  if (errEl) errEl.style.display = 'none';
  const btn = document.getElementById('btnSubmitAdd');
  btn.disabled = true;
  btn.textContent = 'Creando…';

  const body = {
    nombre_completo: document.getElementById('addName')?.value.trim(),
    email: document.getElementById('addEmail')?.value.trim(),
    password: document.getElementById('addPassword')?.value,
  };

  try {
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: hdrs(), body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) {
      if (errEl) {
        errEl.textContent = d.error || 'Error al crear usuario';
        errEl.style.display = 'block';
      }
    } else {
      document.getElementById('modalAddUser')?.classList.remove('visible');
      showToast(`✓ "${body.nombre_completo}" creado como alumno`, 'green');
      loadUsers();
      loadStats();
    }
  } catch (e) {
    if (errEl) {
      errEl.textContent = 'Error de conexión';
      errEl.style.display = 'block';
    }
  }
  btn.disabled = false;
  btn.textContent = 'Crear usuario';
});

/* ── MODAL ELIMINAR USUARIO ── */
let pendingDeleteId = null;
document.getElementById('usersTableBody')?.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  pendingDeleteId = btn.dataset.id;
  const nameEl = document.getElementById('deleteUserName');
  if (nameEl) {
    nameEl.textContent = `Se eliminará a "${btn.dataset.name}". Esta acción no se puede deshacer.`;
  }
  document.getElementById('modalConfirmDelete')?.classList.add('visible');
});

document.getElementById('btnCancelDelete')?.addEventListener('click', () => {
  document.getElementById('modalConfirmDelete')?.classList.remove('visible');
  pendingDeleteId = null;
});

document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    const r = await fetch(`${API}/admin/users/${pendingDeleteId}`, { method: 'DELETE', headers: hdrs() });
    const d = await r.json();
    document.getElementById('modalConfirmDelete')?.classList.remove('visible');
    if (r.ok) {
      showToast('Usuario eliminado del sistema', 'red');
      loadUsers();
      loadStats();
    } else {
      showToast(d.error || 'Error al eliminar', 'red');
    }
  } catch (e) {
    showToast('Error de conexión', 'red');
  }
  pendingDeleteId = null;
});

/* ── MODAL CAMBIAR ROL ── */
let pendingRoleUserId = null;
document.getElementById('usersTableBody')?.addEventListener('click', e => {
  const btnEdit = e.target.closest('.btn-edit');
  if (!btnEdit) return;
  pendingRoleUserId = btnEdit.dataset.id;
  const titleEl = document.getElementById('roleUserName');
  if (titleEl) titleEl.textContent = `Selecciona el nuevo rol para ${btnEdit.dataset.name}.`;
  const select = document.getElementById('changeRoleSelect');
  if (select) select.value = btnEdit.dataset.rol;
  const errEl = document.getElementById('roleError');
  if (errEl) errEl.style.display = 'none';
  document.getElementById('modalChangeRole')?.classList.add('visible');
});

document.getElementById('btnCloseRole')?.addEventListener('click', () => {
  document.getElementById('modalChangeRole')?.classList.remove('visible');
  pendingRoleUserId = null;
});

document.getElementById('modalChangeRole')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modalChangeRole')) {
    document.getElementById('modalChangeRole')?.classList.remove('visible');
    pendingRoleUserId = null;
  }
});

document.getElementById('formChangeRole')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!pendingRoleUserId) return;

  const errEl = document.getElementById('roleError');
  if (errEl) errEl.style.display = 'none';
  const btn = document.getElementById('btnSubmitRole');
  btn.disabled = true;
  btn.textContent = 'Actualizando…';

  const rol_nombre = document.getElementById('changeRoleSelect')?.value;

  try {
    const r = await fetch(`${API}/admin/users/${pendingRoleUserId}/role`, {
      method: 'PUT',
      headers: hdrs(),
      body: JSON.stringify({ rol_nombre }),
    });
    const d = await r.json();

    if (!r.ok) {
      if (errEl) {
        errEl.textContent = d.error || 'Error al actualizar rol';
        errEl.style.display = 'block';
      }
    } else {
      document.getElementById('modalChangeRole')?.classList.remove('visible');
      showToast('✓ Rol actualizado correctamente', 'green');
      loadUsers();
      loadStats();
      pendingRoleUserId = null;
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Error de conexión';
      errEl.style.display = 'block';
    }
  }

  btn.disabled = false;
  btn.textContent = 'Actualizar rol';
});

/* ── GESTIÓN DE PROYECTOS ── */
let allProjects = [];
async function loadProjects() {
  const container = document.getElementById('projectsCardsContainer');
  if (!container) return;

  try {
    const res = await fetch(`${API}/admin/proyectos`, { headers: hdrs() });
    const data = await res.json();
    allProjects = data.proyectos || [];

    if (!allProjects.length) {
      container.innerHTML = '<div class="table-empty" style="grid-column: 1/-1;">No hay proyectos registrados aún.</div>';
      return;
    }

    container.innerHTML = allProjects.map((p, idx) => {
      const themes = ['theme-green', 'theme-orange', 'theme-blue', 'theme-purple'];
      const theme = themes[idx % themes.length];
      return `
        <div class="course-card-item">
          <div class="course-card-banner ${theme}">
            <div class="course-banner-top">
              <span class="course-category-tag">Proyecto STEAM #${p.id}</span>
              <span class="course-status-badge ${p.activo ? 'completado' : ''}">${p.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
            <h3 class="course-card-title">${p.nombre}</h3>
          </div>
          <div class="course-card-body">
            <p class="course-desc">${p.descripcion || 'Sin descripción detallada.'}</p>
            <div class="course-progress-block">
              <div class="course-progress-label">
                <span>Sesiones registradas</span>
                <span>${p.usos || 0} usos</span>
              </div>
            </div>
            <div class="course-card-footer">
              <span class="course-meta-text">${p.url_simulador || 'Simulador 3D'}</span>
              <div style="display:flex;gap:8px;">
                <button class="btn-classroom-primary" style="padding:4px 10px;font-size:11px;" onclick="window.location.href='PanelAdministrativo.html?proyecto=${p.id}'">Ver Alumnos</button>
                <button class="btn-classroom-ghost" style="padding:4px 10px;font-size:11px;color:#204e40;border-color:rgba(35,78,64,0.2);" onclick="window.openEditProject(${p.id})">Editar</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="table-empty" style="grid-column: 1/-1;">Error al cargar proyectos.</div>';
  }
}

// Modal Proyecto (Crear / Editar)
window.openEditProject = function (id) {
  const p = allProjects.find(item => item.id === id);
  if (!p) return;
  document.getElementById('projectModalTitle').textContent = 'Editar Proyecto';
  document.getElementById('editProjectId').value = p.id;
  document.getElementById('projectNombre').value = p.nombre;
  document.getElementById('projectDescripcion').value = p.descripcion || '';
  document.getElementById('projectUrl').value = p.url_simulador || '';
  document.getElementById('projectActivo').checked = p.activo !== false;
  document.getElementById('projectError').style.display = 'none';
  document.getElementById('modalProjectForm')?.classList.add('visible');
};

document.getElementById('btnCreateProject')?.addEventListener('click', () => {
  document.getElementById('projectModalTitle').textContent = 'Nuevo Proyecto';
  document.getElementById('formProject')?.reset();
  document.getElementById('editProjectId').value = '';
  document.getElementById('projectError').style.display = 'none';
  document.getElementById('modalProjectForm')?.classList.add('visible');
});

document.getElementById('btnCloseProjectModal')?.addEventListener('click', () => {
  document.getElementById('modalProjectForm')?.classList.remove('visible');
});

document.getElementById('formProject')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editProjectId')?.value;
  const isEdit = Boolean(id);
  const btn = document.getElementById('btnSubmitProject');
  const errEl = document.getElementById('projectError');
  errEl.style.display = 'none';
  btn.disabled = true;

  const payload = {
    nombre: document.getElementById('projectNombre')?.value.trim(),
    descripcion: document.getElementById('projectDescripcion')?.value.trim(),
    url_simulador: document.getElementById('projectUrl')?.value.trim(),
    activo: document.getElementById('projectActivo')?.checked,
  };

  try {
    const url = isEdit ? `${API}/admin/proyectos/${id}` : `${API}/admin/proyectos`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Error al guardar proyecto';
      errEl.style.display = 'block';
    } else {
      document.getElementById('modalProjectForm')?.classList.remove('visible');
      showToast(isEdit ? '✓ Proyecto actualizado' : '✓ Proyecto creado con éxito');
      loadProjects();
      loadStats();
    }
  } catch (err) {
    errEl.textContent = 'Error de conexión';
    errEl.style.display = 'block';
  }
  btn.disabled = false;
});

/* ── REPORTE ESCOLAR Y EXPORTACIÓN CSV ── */
let reportData = [];
async function loadReport() {
  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;
  try {
    const res = await fetch(`${API}/maestro/alumnos`, { headers: hdrs() });
    const d = await res.json();
    reportData = d.alumnos || [];

    if (!reportData.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Sin registros de alumnos para reporte.</td></tr>';
      return;
    }

    tbody.innerHTML = reportData.map(a => `
      <tr>
        <td class="cell-name">${a.nombre_completo}</td>
        <td class="cell-email">${a.email}</td>
        <td><span class="badge-rol badge-alumno">${a.curso}</span></td>
        <td>${a.estado_general || 'En progreso'}</td>
        <td>${a.entregado_en ? `<span class="status-pill status-entregado">Entregado (${fmtDate(a.entregado_en)})</span>` : '<span class="status-pill status-pendiente">Pendiente</span>'}</td>
        <td><strong>${a.calificacion_final != null ? `${a.calificacion_final}/100` : '—'}</strong></td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error cargando reporte.</td></tr>';
  }
}

document.getElementById('btnExportCSV')?.addEventListener('click', () => {
  if (!reportData.length) {
    showToast('No hay datos disponibles para exportar', 'red');
    return;
  }
  const headers = ['Nombre', 'Correo', 'Curso', 'Estado', 'Entregado', 'Fecha Entrega', 'Calificacion'];
  const rows = reportData.map(a => [
    `"${a.nombre_completo.replace(/"/g, '""')}"`,
    `"${a.email}"`,
    `"${a.curso}"`,
    `"${a.estado_general || ''}"`,
    `"${a.entregado_en ? 'Si' : 'No'}"`,
    `"${a.entregado_en ? new Date(a.entregado_en).toISOString() : ''}"`,
    `"${a.calificacion_final ?? ''}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `reporte_steam_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✓ Reporte CSV descargado exitosamente');
});

/* ── AUDITORÍA Y ACTIVIDAD RECIENTE ── */
async function loadActivity() {
  const tbody = document.getElementById('activityTableBody');
  const notifList = document.getElementById('notifList');
  const typeFilter = document.getElementById('filterActivityType')?.value || '';

  try {
    const url = typeFilter ? `${API}/admin/actividad?limit=50&tipo=${encodeURIComponent(typeFilter)}` : `${API}/admin/actividad?limit=50`;
    const res = await fetch(url, { headers: hdrs() });
    const d = await res.json();
    const items = d.actividad || [];

    if (tbody) {
      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Sin eventos registrados aún.</td></tr>';
      } else {
        tbody.innerHTML = items.map(act => `
          <tr>
            <td class="cell-date">${fmtDateTime(act.creado_en)}</td>
            <td class="cell-name">${act.usuario || 'Sistema'}</td>
            <td>${rolBadge(act.rol || 'admin')}</td>
            <td><strong>${(act.tipo_accion || '').replace(/_/g, ' ')}</strong></td>
            <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);">${JSON.stringify(act.detalle || {})}</td>
          </tr>
        `).join('');
      }
    }

    if (notifList) {
      if (!items.length) {
        notifList.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-light);">Sin notificaciones recientes</div>';
      } else {
        notifList.innerHTML = items.slice(0, 7).map(act => `
          <div class="notification-item">
            <span class="notification-dot"></span>
            <div class="notification-text">
              <strong>${act.usuario || 'Usuario'}:</strong> ${(act.tipo_accion || '').replace(/_/g, ' ')}
              <div class="notification-time">${fmtDateTime(act.creado_en)}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error al cargar actividad.</td></tr>';
  }
}

document.getElementById('filterActivityType')?.addEventListener('change', loadActivity);

/* ── PERFIL DEL ADMINISTRADOR EN CONFIGURACIÓN ── */
async function loadAdminProfile() {
  const container = document.getElementById('adminProfileDetails');
  if (!container) return;
  try {
    const res = await fetch(`${API}/auth/me`, { headers: hdrs() });
    const d = await res.json();
    if (d.user) {
      container.innerHTML = `
        <div><strong>Nombre:</strong> ${d.user.nombre_completo}</div>
        <div><strong>Correo:</strong> ${d.user.email}</div>
        <div><strong>Rol:</strong> Administrador general</div>
        <div><strong>Cuenta creada:</strong> ${fmtDate(d.user.creado_en)}</div>
      `;
    }
  } catch (e) {
    container.textContent = 'No se pudo cargar el perfil.';
  }
}

/* ── CONTEXTO DE PROYECTO PUNTUAL (?proyecto=ID) ── */
const currentProyectoId = parseInt(new URLSearchParams(location.search).get('proyecto'), 10);

if (Number.isInteger(currentProyectoId)) {
  document.getElementById('general-section').style.display = 'none';
  document.getElementById('project-section').style.display = 'block';

  async function loadProjectContext() {
    try {
      const [cursosRes, alumnosRes] = await Promise.all([
        fetch(`${API}/maestro/cursos`, { headers: hdrs() }),
        fetch(`${API}/maestro/alumnos`, { headers: hdrs() }),
      ]);

      const cursosData = await cursosRes.json();
      const alumnosData = await alumnosRes.json();

      const curso = (cursosData.cursos || []).find(c => c.id === currentProyectoId);
      if (curso) {
        document.getElementById('projectContextTitle').textContent = `Proyecto: ${curso.titulo}`;

        const projectAlumnos = (alumnosData.alumnos || []).filter(a => a.curso === curso.titulo);
        const tbody = document.getElementById('projectTableBody');

        if (!projectAlumnos.length) {
          tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Sin alumnos inscritos en este proyecto todavía.</td></tr>`;
        } else {
          tbody.innerHTML = projectAlumnos.map(a => `
            <tr>
              <td class="cell-name">${a.nombre_completo}</td>
              <td class="cell-email">${a.email}</td>
              <td>${a.estado_general || 'En progreso'}</td>
              <td>${a.entregado_en ? `<span class="status-pill status-entregado">Entregado (${fmtDate(a.entregado_en)})</span>` : '<span class="status-pill status-pendiente">Pendiente</span>'}</td>
              <td><strong>${a.calificacion_final != null ? `${a.calificacion_final}/100` : '—'}</strong></td>
            </tr>
          `).join('');
        }
      } else {
        document.getElementById('projectTableBody').innerHTML = `<tr><td colspan="5" class="table-empty">Proyecto no encontrado.</td></tr>`;
      }
    } catch (e) {
      document.getElementById('projectTableBody').innerHTML = `<tr><td colspan="5" class="table-empty">Error al cargar datos del proyecto.</td></tr>`;
    }
  }

  loadProjectContext();
} else {
  loadStats();
  loadUsers();
  loadProjects();
  loadReport();
  loadActivity();
  loadAdminProfile();
}