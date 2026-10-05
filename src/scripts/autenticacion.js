(() => {
    const $ = (s) => document.querySelector(s);

    // Elementos
    const modalLogin = $('#modalLogin');
    const modalRegister = $('#modalRegister');
    const formLogin = $('#formLogin');
    const formRegister = $('#formRegister');

    // Toggle visual del selector de rol (Alumno / Maestro)
    document.querySelectorAll('.role-option').forEach((opt) => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.role-option').forEach((o) => o.classList.remove('selected'));
            opt.classList.add('selected');
            opt.querySelector('input').checked = true;
        });
    });
    const loginError = $('#loginError');
    const regError = $('#regError');

    // ─── Abrir / cerrar modales ───
    $('#btnOpenLogin').addEventListener('click', (e) => {
        e.preventDefault();
        if (authenticated) { window.location.href = 'proyectos.html'; return; }
        modalLogin.classList.add('visible');
        $('#loginEmail').focus();
    });

    function closeModal(modal) {
        modal.classList.remove('visible');
    }

    $('#btnCloseLogin').addEventListener('click', () => closeModal(modalLogin));
    $('#btnCloseRegister').addEventListener('click', () => closeModal(modalRegister));

    // Clic fuera del modal cierra
    modalLogin.addEventListener('click', (e) => { if (e.target === modalLogin) closeModal(modalLogin); });
    modalRegister.addEventListener('click', (e) => { if (e.target === modalRegister) closeModal(modalRegister); });

    // ─── Alternar entre login ↔ registro ───
    $('#btnSwitchToRegister').addEventListener('click', () => {
        closeModal(modalLogin);
        setTimeout(() => {
            modalRegister.classList.add('visible');
        }, 320);
    });

    $('#btnSwitchToLogin').addEventListener('click', () => {
        closeModal(modalRegister);
        setTimeout(() => {
            modalLogin.classList.add('visible');
        }, 320);
    });

    // ─── Helpers ───
    function showError(el, msg) {
        el.textContent = msg;
        el.hidden = false;
    }

    function setLoading(btn, loading) {
        btn.querySelector('.auth-submit-text').hidden = loading;
        btn.querySelector('.auth-submit-loader').hidden = !loading;
        btn.disabled = loading;
    }

    // ─── LOGIN ───
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.hidden = true;
        const btn = $('#btnLogin');
        setLoading(btn, true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: $('#loginEmail').value.trim(),
                    password: $('#loginPassword').value,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                showError(loginError, data.error || 'Error al iniciar sesión');
                setLoading(btn, false);
                return;
            }

            // Guardar token y datos del usuario
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirigir a proyectos.html (todos los roles)
            window.location.href = 'proyectos.html';
        } catch (err) {
            showError(loginError, 'Error de conexión. ¿Está corriendo el servidor?');
            setLoading(btn, false);
        }
    });

    // ─── REGISTRO ───
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        regError.hidden = true;
        const btn = $('#btnRegister');
        setLoading(btn, true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre_completo: $('#regName').value.trim(),
                    email: $('#regEmail').value.trim(),
                    password: $('#regPassword').value,
                    rol: document.querySelector('input[name="regRole"]:checked')?.value || 'alumno',
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                showError(regError, data.error || 'Error al registrar');
                setLoading(btn, false);
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            // Redirigir a proyectos.html para todos los roles
            window.location.href = 'proyectos.html';
        } catch (err) {
            showError(regError, 'Error de conexión. ¿Está corriendo el servidor?');
            setLoading(btn, false);
        }
    });

    // Validar la sesión sin saltar la selección de proyectos.
    let authenticated = false;
    const accessButtons = document.querySelectorAll('a.btn-main');
    accessButtons.forEach(btn => btn.addEventListener('click', e => {
        if (!authenticated) {
            e.preventDefault();
            modalLogin.classList.add('visible');
            $('#loginEmail').focus();
        }
    }));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal(modalLogin);
            closeModal(modalRegister);
        }
    });
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
            .then(async r => {
                if (r.status === 401 || r.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
                if (!r.ok) return;
                const data = await r.json();
                if (!data.user) return;
                authenticated = true;
                $('#btnOpenLogin').textContent = 'Mis proyectos';
                const enterBtn = document.querySelector('.topbar .btn-main');
                enterBtn.textContent = 'Mis proyectos →';
                enterBtn.href = 'proyectos.html';
            })
            .catch(() => {});
    }
})();
