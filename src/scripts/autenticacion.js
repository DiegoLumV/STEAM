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

    // ─── GOOGLE IDENTITY SERVICES ───
    // Carga el Client ID desde el servidor (variable de entorno GOOGLE_CLIENT_ID).
    // Si no está configurado, los botones de Google se ocultan automáticamente.
    // El Client ID es público (va en el HTML de todas formas), pero así nunca
    // queda hardcodeado en el código fuente ni en el repositorio.
    let GOOGLE_CLIENT_ID = '';

    async function cargarConfigGoogle() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) return;
            const cfg = await res.json();
            GOOGLE_CLIENT_ID = cfg.googleClientId || '';
        } catch (e) {
            // Sin config → botones de Google ocultos
        }
        aplicarEstadoBotonesGoogle();
    }

    function aplicarEstadoBotonesGoogle() {
        const btnLogin = $('#btnGoogleLogin');
        const btnReg = $('#btnGoogleRegister');
        if (!GOOGLE_CLIENT_ID) {
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnReg) btnReg.style.display = 'none';
            // Ocultar también los divisores
            document.querySelectorAll('.auth-divider').forEach(d => d.style.display = 'none');
        }
    }

    async function handleGoogleCredential(credential) {
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });
            const data = await res.json();

            if (!res.ok) {
                const errEl = modalLogin.classList.contains('visible') ? loginError : regError;
                showError(errEl, data.error || 'Error al autenticar con Google');
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'proyectos.html';
        } catch (err) {
            const errEl = modalLogin.classList.contains('visible') ? loginError : regError;
            showError(errEl, 'Error de conexión con Google');
        }
    }

    function iniciarFlujoGoogle(targetErrorEl) {
        if (!GOOGLE_CLIENT_ID) {
            showError(targetErrorEl, 'Google no está configurado en este servidor.');
            return;
        }
        if (!(window.google && window.google.accounts)) {
            showError(targetErrorEl, 'La librería de Google no cargó. Verifica tu conexión.');
            return;
        }
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => handleGoogleCredential(response.credential),
            cancel_on_tap_outside: true,
        });
        window.google.accounts.id.prompt((notification) => {
            // Si One Tap no está disponible, mostramos aviso
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                showError(targetErrorEl, 'El popup de Google fue bloqueado. Permite ventanas emergentes e intenta de nuevo.');
            }
        });
    }

    // Botón Google en el modal de Login
    const btnGoogleLogin = $('#btnGoogleLogin');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', () => {
            loginError.hidden = true;
            iniciarFlujoGoogle(loginError);
        });
    }

    // Botón Google en el modal de Registro
    const btnGoogleRegister = $('#btnGoogleRegister');
    if (btnGoogleRegister) {
        btnGoogleRegister.addEventListener('click', () => {
            regError.hidden = true;
            iniciarFlujoGoogle(regError);
        });
    }

    // Cargar configuración de Google al inicio (oculta botones si no hay Client ID)
    cargarConfigGoogle();
})();
