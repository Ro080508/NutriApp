// =================================================================
// Menú Hamburguesa Responsivo y Accesible (NutriApp)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
  const btnHamburguesa = document.getElementById('btn-hamburguesa');
  const navPrincipal = document.getElementById('menu-principal');
  const cabecera = document.querySelector('.cabecera');

  if (!btnHamburguesa || !navPrincipal) return;

  function cerrarMenu() {
    navPrincipal.classList.remove('abierto');
    btnHamburguesa.classList.remove('abierto');
    btnHamburguesa.setAttribute('aria-expanded', 'false');
    btnHamburguesa.setAttribute('aria-label', 'Abrir menú de navegación');
  }

  function alternarMenu() {
    const estaAbierto = navPrincipal.classList.toggle('abierto');
    btnHamburguesa.classList.toggle('abierto', estaAbierto);
    btnHamburguesa.setAttribute('aria-expanded', String(estaAbierto));
    btnHamburguesa.setAttribute(
      'aria-label',
      estaAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
  }

  btnHamburguesa.addEventListener('click', alternarMenu);

  // Cerrar el menú al seleccionar cualquier enlace o botón de acción dentro del menú
  navPrincipal.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('click', () => {
      cerrarMenu();
      // También cerrar el desplegable <details> si estaba abierto
      const details = navPrincipal.querySelector('details[open]');
      if (details) details.removeAttribute('open');
    });
  });

  // Cerrar con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navPrincipal.classList.contains('abierto')) {
      cerrarMenu();
      btnHamburguesa.focus();
    }
  });

  // Cerrar al hacer clic fuera de la cabecera
  document.addEventListener('click', (e) => {
    if (
      navPrincipal.classList.contains('abierto') &&
      cabecera &&
      !cabecera.contains(e.target)
    ) {
      cerrarMenu();
    }
  });

  // Restablecer si se amplía la pantalla a escritorio
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860 && navPrincipal.classList.contains('abierto')) {
      cerrarMenu();
    }
  });
});
