(() => {
    const $ = (s) => document.querySelector(s);

    // Elementos
    const modalLogin = $('#modalLogin');
    const modalRegister = $('#modalRegister');
    const modalGoogleComplete = $('#modalGoogleComplete');
    const formLogin = $('#formLogin');
    const formRegister = $('#formRegister');
    const formGoogleComplete = $('#formGoogleComplete');
    let pendingRegistroToken = null;
    let pendingGoogleCode = null;
    let googleCodeClient = null;

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
    const googleRegError = $('#googleRegError');

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
        if (modal) modal.classList.remove('visible');
    }

    $('#btnCloseLogin').addEventListener('click', () => closeModal(modalLogin));
    $('#btnCloseRegister').addEventListener('click', () => closeModal(modalRegister));
    if ($('#btnCloseGoogleComplete')) {
        $('#btnCloseGoogleComplete').addEventListener('click', () => closeModal(modalGoogleComplete));
    }

    // Clic fuera del modal cierra
    modalLogin.addEventListener('click', (e) => { if (e.target === modalLogin) closeModal(modalLogin); });
    modalRegister.addEventListener('click', (e) => { if (e.target === modalRegister) closeModal(modalRegister); });
    if (modalGoogleComplete) {
        modalGoogleComplete.addEventListener('click', (e) => { if (e.target === modalGoogleComplete) closeModal(modalGoogleComplete); });
    }

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

    // ─── Selector de carrera en modal de Google ───
    const selCarrera = $('#googleRegCarrera');
    const inputCarreraOtra = $('#googleRegCarreraOtra');
    if (selCarrera && inputCarreraOtra) {
        selCarrera.addEventListener('change', (e) => {
            if (e.target.value === 'otra') {
                inputCarreraOtra.style.display = 'block';
                inputCarreraOtra.required = true;
                inputCarreraOtra.focus();
            } else {
                inputCarreraOtra.style.display = 'none';
                inputCarreraOtra.required = false;
            }
        });
    }

    // ─── Selección de consentimiento informado (Requisito 3) ───
    const cardsConsent = document.querySelectorAll('.consent-card');
    const noticeConsent = $('#consentNotice');
    cardsConsent.forEach((card) => {
        card.addEventListener('click', () => {
            cardsConsent.forEach((c) => c.classList.remove('selected'));
            card.classList.add('selected');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                if (noticeConsent) {
                    noticeConsent.hidden = false;
                    if (radio.value === 'autorizar') {
                        noticeConsent.className = 'consent-notice consent-notice-approved';
                        noticeConsent.innerHTML = '<strong>Autorización concedida:</strong> Aceptas el uso pedagógico y la compartición de tus datos académicos con los docentes y la institución para seguimiento de competencias STEAM.';
                    } else {
                        noticeConsent.className = 'consent-notice consent-notice-declined';
                        noticeConsent.innerHTML = '<strong>No autorizado:</strong> Tus datos se mantendrán estrictamente privados y no se compartirán con terceros. Funciones de analíticas externas estarán deshabilitadas.';
                    }
                }
            }
        });
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

    // ─── REGISTRO TRADICIONAL ───
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

    // ─── FORMULARIO PARA COMPLETAR REGISTRO CON GOOGLE (Requisito 2 y 3) ───
    if (formGoogleComplete) {
        formGoogleComplete.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (googleRegError) googleRegError.hidden = true;

            let carrera = $('#googleRegCarrera')?.value || '';
            if (carrera === 'otra') {
                carrera = $('#googleRegCarreraOtra')?.value.trim() || '';
            }
            const consentRadio = document.querySelector('input[name="consentimientoGoogle"]:checked');

            // Validaciones cliente: únicamente carrera y consentimiento
            if (!carrera) {
                showError(googleRegError, 'Por favor selecciona o especifica tu carrera académica.');
                return;
            }
            if (!consentRadio) {
                showError(googleRegError, 'Debes seleccionar explícitamente si autorizas o no la compartición de información.');
                return;
            }

            const autoriza = consentRadio.value === 'autorizar';
            const btn = $('#btnSubmitGoogleComplete');
            setLoading(btn, true);

            try {
                const res = await fetch('/api/auth/google/completar-registro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        registroToken: pendingRegistroToken,
                        code: pendingGoogleCode,
                        carrera,
                        autoriza_compartir_datos: autoriza,
                    }),
                });
                const data = await res.json();

                if (!res.ok) {
                    showError(googleRegError, data.error || 'Error al completar el registro');
                    setLoading(btn, false);
                    return;
                }

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                closeModal(modalGoogleComplete);

                // Redirigir al dashboard de alumno
                window.location.href = 'alumno.html';
            } catch (err) {
                showError(googleRegError, 'Error de conexión con el servidor.');
                setLoading(btn, false);
            }
        });
    }

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
            closeModal(modalGoogleComplete);
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
            return;
        }

        const inicializarClienteOAuth = () => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                try {
                    googleCodeClient = window.google.accounts.oauth2.initCodeClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: 'openid email profile https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.gender.read',
                        ux_mode: 'popup',
                        callback: async (response) => {
                            if (response.error) {
                                console.warn('Google OAuth popup cancelado o cerrado:', response.error);
                                const errEl = modalLogin.classList.contains('visible') ? loginError : regError;
                                showError(errEl, 'Autenticación con Google cancelada.');
                                return;
                            }
                            if (response.code) {
                                await handleGoogleCode(response.code);
                            }
                        },
                        error_callback: (err) => {
                            console.error('Error de inicialización Google OAuth:', err);
                            const errEl = modalLogin.classList.contains('visible') ? loginError : regError;
                            showError(errEl, 'Error al inicializar la autenticación con Google.');
                        }
                    });

                    const handleGoogleClick = (e) => {
                        e.preventDefault();
                        if (loginError) loginError.hidden = true;
                        if (regError) regError.hidden = true;
                        if (googleCodeClient) {
                            googleCodeClient.requestCode();
                        } else {
                            const errEl = modalLogin.classList.contains('visible') ? loginError : regError;
                            showError(errEl, 'Google OAuth aún no está listo. Por favor reintenta en un momento.');
                        }
                    };

                    if (btnLogin) {
                        btnLogin.onclick = handleGoogleClick;
                    }
                    if (btnReg) {
                        btnReg.onclick = handleGoogleClick;
                    }
                } catch (initErr) {
                    console.error('Error al configurar Google OAuth:', initErr);
                }
            } else {
                setTimeout(inicializarClienteOAuth, 120);
            }
        };

        inicializarClienteOAuth();
    }

    async function handleGoogleCode(code) {
        const currentErrEl = modalLogin.classList.contains('visible') ? loginError : regError;
        if (currentErrEl) currentErrEl.hidden = true;

        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();

            if (!res.ok) {
                showError(currentErrEl, data.error || 'Error al autenticar con Google');
                return;
            }

            // Si es un usuario nuevo que necesita completar su registro (Requisito 2 y 3)
            if (data.status === 'needs_registration' || data.isNewUser) {
                pendingRegistroToken = data.registroToken || null;
                pendingGoogleCode = code;

                closeModal(modalLogin);
                closeModal(modalRegister);

                const g = data.google || {};

                // Mostrar datos recuperados automáticamente de Google
                if ($('#googleProfileName')) {
                    $('#googleProfileName').textContent = g.name || g.email?.split('@')[0] || 'Usuario de Google';
                }
                if ($('#googleUserEmail')) {
                    $('#googleUserEmail').textContent = g.email || '';
                }

                const photoEl = $('#googleProfilePhoto');
                const fallbackEl = $('#googleProfileAvatarFallback');
                if (g.picture && photoEl) {
                    photoEl.src = g.picture;
                    photoEl.style.display = 'block';
                    if (fallbackEl) fallbackEl.style.display = 'none';
                } else {
                    if (photoEl) photoEl.style.display = 'none';
                    if (fallbackEl) fallbackEl.style.display = 'flex';
                }

                if ($('#googleProfileEdad')) {
                    if (g.edad !== null && g.edad !== undefined) {
                        $('#googleProfileEdad').textContent = `${g.edad} años`;
                    } else if (g.fechaNacimiento) {
                        $('#googleProfileEdad').textContent = `Nacimiento: ${g.fechaNacimiento}`;
                    } else {
                        $('#googleProfileEdad').textContent = 'No compartida por Google';
                    }
                }

                if ($('#googleProfileGenero')) {
                    $('#googleProfileGenero').textContent = g.gender || 'No compartido por Google';
                }

                // Reiniciar selector de carrera y campo alternativo
                if ($('#googleRegCarrera')) $('#googleRegCarrera').selectedIndex = 0;
                if ($('#googleRegCarreraOtra')) {
                    $('#googleRegCarreraOtra').value = '';
                    $('#googleRegCarreraOtra').style.display = 'none';
                    $('#googleRegCarreraOtra').required = false;
                }

                // Asegurar que el consentimiento NO esté marcado por defecto (Requisito 5)
                document.querySelectorAll('input[name="consentimientoGoogle"]').forEach(r => r.checked = false);
                document.querySelectorAll('.consent-card').forEach(c => c.classList.remove('selected'));
                if (noticeConsent) {
                    noticeConsent.hidden = true;
                    noticeConsent.textContent = '';
                }
                if (googleRegError) googleRegError.hidden = true;

                // Mostrar el modal de registro complementario
                modalGoogleComplete.classList.add('visible');
                if (selCarrera) selCarrera.focus();
                return;
            }

            // Usuario existente con login directo
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            const r = data.user.rol || data.user.rol_nombre;
            if (r === 'admin') window.location.href = 'PanelAdministrativo.html';
            else if (r === 'maestro') window.location.href = 'maestro.html';
            else window.location.href = 'alumno.html';
        } catch (err) {
            showError(currentErrEl, 'Error de conexión con el servidor al procesar Google');
        }
    }

    // Cargar configuración de Google al inicio (oculta botones si no hay Client ID)
    cargarConfigGoogle();
})();
