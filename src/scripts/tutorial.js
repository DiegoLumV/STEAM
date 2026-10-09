export function startTutorial() {
  const steps = [
    { target: null, title: '¡Bienvenido al simulador!', text: 'Aquí podrás diseñar y construir una casa en 3D. Te daremos un recorrido rápido por las herramientas básicas.' },
    { target: 'c', title: 'Cámara', text: 'Haz clic y arrastra sobre el fondo (o usa las teclas de flecha) para girar la cámara. Usa la rueda del ratón para acercar y alejar la vista.' },
    { target: 'cat-header', title: 'Materiales', text: 'Aquí tienes los bloques individuales. Haz clic en un material y luego en el terreno para colocarlo uno por uno.' },
    { target: 'btnWall', title: 'Construir Paredes y Pisos', text: 'Este botón te permite generar paredes enteras y pisos de forma rápida, definiendo sus dimensiones.' },
    { target: 'cat-puerta', title: 'Puertas y Ventanas', text: 'Las puertas y ventanas se encuentran en el catálogo. Deberás crear un hueco en la pared para poder instalarlas.' },
    { target: 'tip', title: 'Edición', text: 'Haz clic en cualquier objeto colocado para seleccionarlo. Podrás rotarlo, eliminarlo o ver su información en la parte inferior.' },
    { target: 'btnEntregar', title: 'Entrega Final', text: 'Cuando cumplas todos los objetivos de diseño, usa este botón para entregar tu casa y terminar la práctica. ¡Es hora de construir!' }
  ];

  let currentStep = 0;
  
  // Create tutorial UI container
  let overlay = document.getElementById('tut-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'auto'; // Blocks clicks to the game
    document.body.appendChild(overlay);
  }

  let box = document.getElementById('tut-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'tut-box';
    box.style.position = 'absolute';
    box.style.backgroundColor = 'rgba(20, 30, 50, 0.95)';
    box.style.border = '1px solid rgba(80, 160, 255, 0.5)';
    box.style.borderRadius = '12px';
    box.style.padding = '20px';
    box.style.width = '320px';
    box.style.color = '#fff';
    box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    box.style.transition = 'all 0.3s ease';
    box.style.pointerEvents = 'auto';
    overlay.appendChild(box);
  }

  let arrow = document.getElementById('tut-arrow');
  if (!arrow) {
    arrow = document.createElement('div');
    arrow.id = 'tut-arrow';
    arrow.style.position = 'absolute';
    arrow.style.fontSize = '40px';
    arrow.style.color = '#ffda44';
    arrow.style.textShadow = '0 0 10px rgba(0,0,0,0.8)';
    arrow.style.transition = 'all 0.3s ease';
    arrow.style.zIndex = '10000';
    arrow.innerHTML = '⬇';
    overlay.appendChild(arrow);
  }

  function renderStep() {
    const step = steps[currentStep];
    
    let html = `
      <h3 style="margin: 0 0 10px 0; color: #5ba8ff; font-size: 18px;">${step.title}</h3>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #ccc;">${step.text}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888;">
        <span>Paso ${currentStep + 1} de ${steps.length}</span>
        <div style="display: flex; gap: 8px;">
          ${currentStep > 0 ? '<button id="tut-prev" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Anterior</button>' : ''}
          <button id="tut-next" style="background: #5ba8ff; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer;">${currentStep === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button>
        </div>
      </div>
      <div style="margin-top: 12px; text-align: center;">
        <button id="tut-skip" style="background: none; border: none; color: #aaa; text-decoration: underline; cursor: pointer; font-size: 11px;">Omitir tutorial</button>
      </div>
    `;
    box.innerHTML = html;

    if (currentStep > 0) {
      document.getElementById('tut-prev').onclick = () => { currentStep--; renderStep(); };
    }
    document.getElementById('tut-next').onclick = () => {
      if (currentStep === steps.length - 1) {
        finishTutorial();
      } else {
        currentStep++;
        renderStep();
      }
    };
    document.getElementById('tut-skip').onclick = finishTutorial;

    // Positioning
    arrow.style.display = 'none';
    if (!step.target) {
      box.style.top = '50%';
      box.style.left = '50%';
      box.style.transform = 'translate(-50%, -50%)';
    } else {
      const targetEl = document.getElementById(step.target);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        
        box.style.top = '50%';
        box.style.left = '50%';
        box.style.transform = 'translate(-50%, -50%)';
        
        arrow.style.display = 'block';
        if (rect.top > window.innerHeight / 2) {
           arrow.innerHTML = '⬇';
           arrow.style.top = (rect.top - 50) + 'px';
           arrow.style.left = (rect.left + rect.width / 2 - 20) + 'px';
        } else {
           arrow.innerHTML = '⬆';
           arrow.style.top = (rect.bottom + 10) + 'px';
           arrow.style.left = (rect.left + rect.width / 2 - 20) + 'px';
        }
      } else {
        box.style.top = '50%';
        box.style.left = '50%';
        box.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  function finishTutorial() {
    overlay.remove();
    let userId = 'anon';
    try {
      const t = localStorage.getItem('token');
      if (t) userId = JSON.parse(atob(t.split('.')[1])).id;
    } catch(e) {}
    localStorage.setItem('tutorial_completado_' + userId, 'true');
  }

  overlay.style.display = 'block';
  renderStep();
}

export function checkTutorial() {
  const vistaAlumnoId = new URLSearchParams(window.location.search).get('alumno');
  if (vistaAlumnoId) return; // Si es maestro, no mostrar tutorial
  
  let userId = 'anon';
  try {
    const t = localStorage.getItem('token');
    if (t) userId = JSON.parse(atob(t.split('.')[1])).id;
  } catch(e) {}
  
  if (localStorage.getItem('tutorial_completado_' + userId) !== 'true') {
    startTutorial();
  }
}
