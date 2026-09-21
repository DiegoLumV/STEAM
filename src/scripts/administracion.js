const API = '/api';
const token = localStorage.getItem('token');

if (!token) { window.location.href = 'index.html'; }

let me = null;
try {
    me = JSON.parse(atob(token.split('.')[1]));
    if (me.rol_nombre !== 'admin') window.location.href = 'learn.html';
} catch (e) { window.location.href = 'index.html'; }

document.getElementById('sidebar-user').innerHTML =
    `<strong>${me.nombre_completo}</strong>Administrador`;

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

const hdrs = () => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' });

let toastTimer;
function showToast(msg, type = 'green') {
    clearTimeout(toastTimer);
    document.getElementById('toastDot').className = `toast-dot ${type}`;
    document.getElementById('toastMsg').textContent = msg;
    const t = document.getElementById('toast');
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function rolBadge(rol) {
    const map = { admin: 'badge-admin', alumno: 'badge-alumno', maestro: 'badge-maestro' };
    return `<span class="badge-rol ${map[rol] || 'badge-alumno'}">${rol}</span>`;
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadStats() {
    try {
        const d = await fetch(`${API}/admin/stats`, { headers: hdrs() }).then(r => r.json());
        document.getElementById('stat-total').textContent = d.total_usuarios ?? '—';
        document.getElementById('stat-alumnos').textContent = d.total_alumnos ?? '—';
        document.getElementById('stat-rutas').textContent = d.total_rutas ?? '—';
        document.getElementById('stat-avg').textContent = d.promedio_general ?? '—';
    } catch (e) { console.error(e); }
}

let allUsers = [];
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Cargando…</td></tr>`;
    try {
        const d = await fetch(`${API}/admin/users`, { headers: hdrs() }).then(r => r.json());
        allUsers = d.users || [];
        document.getElementById('topbar-sub').textContent =
            `${allUsers.length} usuario${allUsers.length !== 1 ? 's' : ''} registrado${allUsers.length !== 1 ? 's' : ''}`;
        renderUsers(allUsers);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error al cargar usuarios.</td></tr>`;
    }
}

function renderUsers(list) {
    const tbody = document.getElementById('usersTableBody');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No se encontraron usuarios.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(u => `
        <tr>
          <td class="cell-name">${u.nombre_completo}</td>
          <td class="cell-email">${u.email}</td>
          <td>${rolBadge(u.rol)}</td>
          <td class="cell-date">${fmtDate(u.creado_en)}</td>
          <td>${u.id === me.id
            ? `<span style="font-size:.7rem;color:var(--text-light)">Tú</span>`
            : `<button class="btn-edit" data-id="${u.id}" data-name="${u.nombre_completo}" data-rol="${u.rol}">Editar rol</button><button class="btn-delete" data-id="${u.id}" data-name="${u.nombre_completo}">Eliminar</button>`
        }</td>
        </tr>`).join('');
}

document.getElementById('searchInput').addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    renderUsers(q ? allUsers.filter(u =>
        u.nombre_completo.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ) : allUsers);
});

let pendingId = null;
document.getElementById('usersTableBody').addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    pendingId = btn.dataset.id;
    document.getElementById('deleteUserName').textContent =
        `Se eliminará a "${btn.dataset.name}". Esta acción no se puede deshacer.`;
    document.getElementById('modalConfirmDelete').classList.add('visible');
});

document.getElementById('btnCancelDelete').addEventListener('click', () => {
    document.getElementById('modalConfirmDelete').classList.remove('visible');
    pendingId = null;
});

document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    if (!pendingId) return;
    try {
        const r = await fetch(`${API}/admin/users/${pendingId}`, { method: 'DELETE', headers: hdrs() });
        const d = await r.json();
        document.getElementById('modalConfirmDelete').classList.remove('visible');
        if (r.ok) { showToast('Usuario eliminado', 'red'); loadUsers(); loadStats(); }
        else showToast(d.error || 'Error', 'red');
    } catch (e) { showToast('Error de conexión', 'red'); }
    pendingId = null;
});

document.getElementById('btnAddUser').addEventListener('click', () => {
    document.getElementById('formAddUser').reset();
    document.getElementById('addError').style.display = 'none';
    document.getElementById('modalAddUser').classList.add('visible');
});

document.getElementById('btnCloseAdd').addEventListener('click', () =>
    document.getElementById('modalAddUser').classList.remove('visible'));

document.getElementById('modalAddUser').addEventListener('click', e => {
    if (e.target === document.getElementById('modalAddUser'))
        document.getElementById('modalAddUser').classList.remove('visible');
});

document.getElementById('formAddUser').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('addError');
    errEl.style.display = 'none';
    const btn = document.getElementById('btnSubmitAdd');
    btn.disabled = true;
    btn.textContent = 'Creando…';
    const body = {
        nombre_completo: document.getElementById('addName').value.trim(),
        email: document.getElementById('addEmail').value.trim(),
        password: document.getElementById('addPassword').value,
    };
    try {
        const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: hdrs(), body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok) {
            errEl.textContent = d.error || 'Error al crear usuario';
            errEl.style.display = 'block';
        } else {
            document.getElementById('modalAddUser').classList.remove('visible');
            showToast(`✓ "${body.nombre_completo}" creado como alumno`, 'green');
            loadUsers();
            loadStats();
        }
    } catch (e) {
        errEl.textContent = 'Error de conexión';
        errEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Crear usuario';
});

let pendingRoleUserId = null;

document.getElementById('usersTableBody').addEventListener('click', e => {
    const btnEdit = e.target.closest('.btn-edit');
    if (!btnEdit) return;
    pendingRoleUserId = btnEdit.dataset.id;
    document.getElementById('roleUserName').textContent = `Selecciona el nuevo rol para ${btnEdit.dataset.name}.`;
    document.getElementById('changeRoleSelect').value = btnEdit.dataset.rol;
    document.getElementById('roleError').style.display = 'none';
    document.getElementById('modalChangeRole').classList.add('visible');
});

document.getElementById('btnCloseRole').addEventListener('click', () => {
    document.getElementById('modalChangeRole').classList.remove('visible');
    pendingRoleUserId = null;
});

document.getElementById('modalChangeRole').addEventListener('click', e => {
    if (e.target === document.getElementById('modalChangeRole')) {
        document.getElementById('modalChangeRole').classList.remove('visible');
        pendingRoleUserId = null;
    }
});

document.getElementById('formChangeRole').addEventListener('submit', async e => {
    e.preventDefault();
    if (!pendingRoleUserId) return;
    
    const errEl = document.getElementById('roleError');
    errEl.style.display = 'none';
    const btn = document.getElementById('btnSubmitRole');
    btn.disabled = true;
    btn.textContent = 'Actualizando…';
    
    const rol_nombre = document.getElementById('changeRoleSelect').value;
    
    try {
        const r = await fetch(`${API}/admin/users/${pendingRoleUserId}/role`, { 
            method: 'PUT', 
            headers: hdrs(), 
            body: JSON.stringify({ rol_nombre }) 
        });
        const d = await r.json();
        
        if (!r.ok) {
            errEl.textContent = d.error || 'Error al actualizar rol';
            errEl.style.display = 'block';
        } else {
            document.getElementById('modalChangeRole').classList.remove('visible');
            showToast('✓ Rol actualizado correctamente', 'green');
            loadUsers();
            loadStats(); // Puede afectar conteo de alumnos
            pendingRoleUserId = null;
        }
    } catch (err) {
        errEl.textContent = 'Error de conexión';
        errEl.style.display = 'block';
    }
    
    btn.disabled = false;
    btn.textContent = 'Actualizar rol';
});

loadStats();
loadUsers();