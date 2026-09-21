/* =============================================================
 * app.js  —  Controlador: enrutado, eventos y ciclo de vida
 * -------------------------------------------------------------
 * Conecta el estado (Store) con las vistas (Views) y maneja la
 * interacción del usuario. Enrutado por hash (#/inicio, etc.).
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.App = (function () {
  const R = () => LSA.Render;
  const S = () => LSA.Store;
  const V = () => LSA.Views;

  let root, modal, editingId = null;
  let dicFilters = {};

  const ROUTES = {
    'inicio': () => V().home(),
    'clases': () => V().clases(),
    'diccionario': () => V().diccionario(dicFilters),
    'agregar': () => V().form(null),
  };

  function currentRoute() {
    const h = (location.hash || '#/inicio').replace(/^#\//, '');
    return ROUTES[h] ? h : 'inicio';
  }

  function setActiveNav(route) {
    document.querySelectorAll('.nav__link').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.route === route);
    });
  }

  function render() {
    const route = currentRoute();
    setActiveNav(route);
    root.innerHTML = ROUTES[route]();
    // Rutas de edición usan el formulario con datos precargados.
    if (route === 'agregar' && editingId) {
      const sign = S().getSign(editingId);
      if (sign) root.innerHTML = V().form(sign);
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Modal de detalle ---------- */
  function openDetail(id) {
    const sign = S().getSign(id);
    if (!sign) return;
    modal.innerHTML = V().detail(sign);
    modal.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.innerHTML = '';
    document.body.classList.remove('no-scroll');
  }

  /* ---------- Lectura de archivo (GIF/video) ---------- */
  function readFileAsMedia(file) {
    return new Promise((resolve) => {
      if (!file) return resolve(undefined); // undefined = no cambiar
      const blob = file.slice(0, file.size, file.type || 'application/octet-stream');
      resolve({ type: file.type || 'application/octet-stream', name: file.name, blob });
    });
  }

  /* ---------- Envío del formulario ---------- */
  async function handleFormSubmit(formEl) {
    const fd = new FormData(formEl);
    const file = formEl.querySelector('input[name="media"]').files[0];
    const media = await readFileAsMedia(file);
    const nueva = (fd.get('nuevaCategoria') || '').trim();
    if (nueva) await S().addCategory(nueva);
    const data = {
      nombre: (fd.get('nombre') || '').trim(),
      categoria: nueva || fd.get('categoria') || 'Otros',
      clase: (fd.get('clase') || '').trim() || 'Sin clase',
      fecha: fd.get('fecha') || '',
      descripcion: (fd.get('descripcion') || '').trim(),
      notas: (fd.get('notas') || '').trim(),
      fuente: (fd.get('fuente') || '').trim(),
    };
    const id = fd.get('id');
    if (id) {
      if (media !== undefined) data.media = media;
      await S().updateSign(id, data);
      editingId = null;
      location.hash = '#/diccionario';
      render();
    } else {
      if (media !== undefined) data.media = media;
      const created = await S().addSign(data);
      editingId = null;
      location.hash = '#/clases';
      render();
      // Pequeño resaltado de la seña recién creada.
      requestAnimationFrame(() => {
        const el = root.querySelector(`.card[data-id="${created.id}"]`);
        if (el) { el.classList.add('card--new'); el.scrollIntoView({ block: 'center' }); }
      });
    }
  }

  /* ---------- Vista previa del archivo elegido ---------- */
  function previewMedia(input) {
    const box = document.getElementById('media-preview');
    if (!box) return;
    const file = input.files[0];
    if (!file) { box.innerHTML = ''; return; }
    const url = URL.createObjectURL(file);
    if (/^video\//.test(file.type)) {
      box.innerHTML = `<div class="media"><video src="${url}" muted loop autoplay playsinline></video></div>`;
    } else {
      box.innerHTML = `<div class="media"><img src="${url}" alt="vista previa"></div>`;
    }
  }

  /* ---------- Filtros del diccionario ---------- */
  function readFilters() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    dicFilters = {
      text: g('f-text'), categoria: g('f-cat'), clase: g('f-class'),
      desde: g('f-desde'), hasta: g('f-hasta'),
    };
  }
  function updateDicResults() {
    readFilters();
    const box = document.getElementById('dic-results');
    if (box) box.innerHTML = R().grid(S().query(dicFilters));
  }

  /* ---------- Delegación de eventos ---------- */
  function bindEvents() {
    // Clicks globales.
    document.body.addEventListener('click', async (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'go-add') { editingId = null; location.hash = '#/agregar'; }
        else if (action === 'cancel-form') { editingId = null; history.back(); }
        else if (action === 'close-modal') { closeModal(); }
        else if (action === 'clear-filters') { dicFilters = {}; render(); }
        else if (action === 'export') {
          try { await LSA.Backup.exportToFile(); }
          catch (err) { alert('No se pudo exportar: ' + err.message); }
        }
        else if (action === 'import') {
          const input = document.getElementById('import-file');
          if (input) input.click();
        }
        else if (action === 'edit-sign') {
          editingId = actionEl.dataset.id; closeModal(); location.hash = '#/agregar';
          if (currentRoute() === 'agregar') render();
        }
        else if (action === 'delete-sign') {
          const id = actionEl.dataset.id;
          if (confirm('¿Eliminar esta seña? Esta acción no se puede deshacer.')) {
            await S().removeSign(id); closeModal(); render();
          }
        }
        return;
      }
      // Click en tarjeta -> abrir detalle.
      const card = e.target.closest('.card');
      if (card && card.dataset.id) openDetail(card.dataset.id);
      // Click en el fondo del modal -> cerrar.
      if (e.target === modal) closeModal();
    });

    // Teclado en tarjetas (accesibilidad) + Escape para cerrar.
    document.body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
      if ((e.key === 'Enter' || e.key === ' ')) {
        const card = e.target.closest('.card');
        if (card && card.dataset.id) { e.preventDefault(); openDetail(card.dataset.id); }
      }
    });

    // Envio del formulario (submit se propaga).
    document.body.addEventListener('submit', (e) => {
      if (e.target.id === 'sign-form') { e.preventDefault(); handleFormSubmit(e.target); }
    });

    // Cambios en inputs: vista previa de media y filtros en vivo.
    document.body.addEventListener('change', (e) => {
      if (e.target.name === 'media') previewMedia(e.target);
      if (['f-cat', 'f-class', 'f-desde', 'f-hasta'].includes(e.target.id)) updateDicResults();
      if (e.target.id === 'import-file') handleImportFile(e.target);
    });
    document.body.addEventListener('input', (e) => {
      if (e.target.id === 'f-text') updateDicResults(); // búsqueda instantánea
    });

    window.addEventListener('hashchange', () => { editingId = editingId; render(); });
  }

  /* ---------- Importación de copia de seguridad ---------- */
  async function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;
    try {
      const count = await LSA.Backup.importFromFile(file);
      alert('Copia importada: ' + count + ' seña(s). Tus datos ya están disponibles.');
      render();
    } catch (err) {
      alert('No se pudo importar el archivo: ' + err.message);
    } finally {
      input.value = ''; // permite reimportar el mismo archivo
    }
  }

  /* ---------- Arranque ---------- */
  async function start() {
    root = document.getElementById('app');
    modal = document.getElementById('modal');
    await LSA.DB.open();
    await LSA.Seed.run();
    await S().init();
    bindEvents();
    if (!location.hash) location.hash = '#/inicio';
    render();
  }

  return { start };
})();

document.addEventListener('DOMContentLoaded', () => LSA.App.start());
