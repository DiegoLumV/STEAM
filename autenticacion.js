(() => {
    const $ = (s) => document.querySelector(s);

    // Elementos
    const modalLogin = $('#modalLogin');
    const modalRegister = $('#modalRegister');
    const formLogin = $('#formLogin');
    const formRegister = $('#formRegister');
    const loginError = $('#loginError');
    const regError = $('#regError');

    // ─── Abrir / cerrar modales ───
    $('#btnOpenLogin').addEventListener('click', (e) => {
        e.preventDefault();
        modalLogin.classList.add('visible');
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

            // Redirigir según el rol
            const destinos = { admin: 'PanelAdministrativo.html', maestro: 'maestro.html', alumno: 'learn.html' };
            window.location.href = destinos[data.user.rol_nombre] || 'learn.html';
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
            window.location.href = 'learn.html';
        } catch (err) {
            showError(regError, 'Error de conexión. ¿Está corriendo el servidor?');
            setLoading(btn, false);
        }
    });

    // ─── Si ya está logueado, redirigir ───
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (data.user) {
                    // Ya está logueado — mostrar opción en topbar
                    const topbar = document.querySelector('.topbar');
                    const enterBtn = topbar.querySelector('.btn-main');
                    const firstName = data.user.nombre_completo.split(' ')[0];
                    const destinos = { admin: 'PanelAdministrativo.html', maestro: 'maestro.html', alumno: 'learn.html' };
                    const destino = destinos[data.user.rol_nombre] || 'learn.html';
                    enterBtn.textContent = `Hola, ${firstName} →`;
                    enterBtn.href = destino;
                    enterBtn.onclick = (e) => {
                        e.preventDefault();
                        window.location.href = destino;
                    };
                }
            })
            .catch(() => {
                // Token inválido, limpiar y proteger botones
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                guardButtons();
            });
    } else {
        // Sin sesión — bloquear botones de acceso
        guardButtons();
    }

    // Intercepta clics en todos los btn-main para abrir login si no hay sesión
    function guardButtons() {
        document.querySelectorAll('a.btn-main').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                modalLogin.classList.add('visible');
            });
        });
    }
})();