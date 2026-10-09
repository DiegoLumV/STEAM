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
        if (authenticated) {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const r = user.rol || user.rol_nombre;
                if (r === 'admin') window.location.href = 'PanelAdministrativo.html';
                else if (r === 'maestro') window.location.href = 'maestro.html';
                else window.location.href = 'alumno.html';
            } catch (err) {
                window.location.href = 'alumno.html';
            }
            return;
        }
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

            // Redirigir según rol
            const r = data.user.rol || data.user.rol_nombre;
            if (r === 'admin') window.location.href = 'PanelAdministrativo.html';
            else if (r === 'maestro') window.location.href = 'maestro.html';
            else window.location.href = 'alumno.html';
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
            // Redirigir según rol
            const r = data.user.rol || data.user.rol_nombre;
            if (r === 'admin') window.location.href = 'PanelAdministrativo.html';
            else if (r === 'maestro') window.location.href = 'maestro.html';
            else window.location.href = 'alumno.html';
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
                $('#btnOpenLogin').textContent = 'Mi Dashboard';
                const enterBtn = document.querySelector('.topbar .btn-main');
                if (enterBtn) {
                    enterBtn.textContent = 'Mi Dashboard →';
                    const r = data.user.rol || data.user.rol_nombre;
                    if (r === 'admin') enterBtn.href = 'PanelAdministrativo.html';
                    else if (r === 'maestro') enterBtn.href = 'maestro.html';
                    else enterBtn.href = 'alumno.html';
                }
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
        } else {
            const renderBotones = () => {
                if (window.google && window.google.accounts) {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: (response) => handleGoogleCredential(response.credential),
                    });
                    
                    const renderOpts = { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with' };
                    
                    if (btnLogin) {
                        btnLogin.innerHTML = '';
                        btnLogin.style.padding = '0';
                        btnLogin.style.border = 'none';
                        btnLogin.style.background = 'transparent';
                        window.google.accounts.id.renderButton(btnLogin, renderOpts);
                    }
                    if (btnReg) {
                        btnReg.innerHTML = '';
                        btnReg.style.padding = '0';
                        btnReg.style.border = 'none';
                        btnReg.style.background = 'transparent';
                        window.google.accounts.id.renderButton(btnReg, renderOpts);
                    }
                } else {
                    setTimeout(renderBotones, 100);
                }
            };
            renderBotones();
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
            const r = data.user.rol || data.user.rol_nombre;
            if (r === 'admin') window.location.href = 'PanelAdministrativo.html';
            else if (r === 'maestro') window.location.href = 'maestro.html';
            else window.location.href = 'alumno.html';
        } catch (err) {
            const errEl = modalLogin.classList.contains('visible') ? loginError : regError;
            showError(errEl, 'Error de conexión con Google');
        }
    }

    // El flujo de Google ahora se maneja automáticamente mediante los botones
    // renderizados por window.google.accounts.id.renderButton() en aplicarEstadoBotonesGoogle.

    // Cargar configuración de Google al inicio (oculta botones si no hay Client ID)
    cargarConfigGoogle();
})();
