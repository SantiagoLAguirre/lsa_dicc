/* =============================================================
 * views.js  —  Vistas de página completas
 * -------------------------------------------------------------
 * Cada función devuelve el HTML de una sección (Inicio, Clases,
 * Diccionario, Formulario, Detalle). Usa las primitivas de
 * LSA.Render.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.Views = (function () {
  const R = () => LSA.Render;
  const S = () => LSA.Store;

  /* ---------- INICIO ---------- */
  function home() {
    const st = S().stats();
    const uc = st.ultimaClase;
    return `
    <section class="view">
      <div class="page-head">
        <div>
          <h1>Mi cuaderno de LSA</h1>
          <p class="muted">Archivo personal de Lengua de Señas Argentina.</p>
        </div>
        <button class="btn btn--primary" data-action="go-add">+ Agregar seña</button>
      </div>

      <div class="stats">
        <div class="stat"><span class="stat__num">${st.total}</span><span class="stat__lbl">señas en total</span></div>
        <div class="stat"><span class="stat__num">${st.totalClases}</span><span class="stat__lbl">clases registradas</span></div>
        <div class="stat">
          <span class="stat__num">${uc ? R().esc(uc.clase) : '—'}</span>
          <span class="stat__lbl">última clase${uc ? ' · ' + R().fmtDate(uc.fecha) : ''}</span>
        </div>
      </div>

      <h2 class="section-title">Últimas señas agregadas</h2>
      ${R().grid(st.recientes)}
    </section>`;
  }

  /* ---------- CLASES ---------- */
  function clases() {
    const groups = S().groupByClass(S().state.signs);
    if (!groups.length) {
      return `<section class="view"><div class="page-head"><h1>Clases</h1></div>
        <div class="empty">Todavía no registraste ninguna clase.</div></section>`;
    }
    const blocks = groups.map((g) => `
      <div class="class-block">
        <h2 class="class-block__head">${R().esc(g.clase)}
          <span class="class-block__date">${R().fmtDate(g.fecha)}</span>
          <span class="class-block__count">${g.items.length} seña${g.items.length === 1 ? '' : 's'}</span>
        </h2>
        ${R().grid(g.items)}
      </div>`).join('');
    return `<section class="view">
      <div class="page-head"><h1>Clases</h1>
        <button class="btn btn--primary" data-action="go-add">+ Agregar seña</button></div>
      ${blocks}
    </section>`;
  }

  /* ---------- DICCIONARIO ---------- */
  function diccionario(filters) {
    filters = filters || {};
    const cats = S().state.categories;
    const classes = S().getClasses();
    const catOpts = ['<option value="">Todas las categorías</option>']
      .concat(cats.map((c) => `<option value="${R().esc(c)}"${filters.categoria === c ? ' selected' : ''}>${R().esc(c)}</option>`)).join('');
    const classOpts = ['<option value="">Todas las clases</option>']
      .concat(classes.map((c) => `<option value="${R().esc(c.clase)}"${filters.clase === c.clase ? ' selected' : ''}>${R().esc(c.clase)}</option>`)).join('');
    return `<section class="view">
      <div class="page-head"><h1>Diccionario</h1>
        <button class="btn btn--primary" data-action="go-add">+ Agregar seña</button></div>
      <div class="filters">
        <input type="search" id="f-text" class="input" placeholder="Buscar por nombre…" value="${R().esc(filters.text || '')}">
        <select id="f-cat" class="input">${catOpts}</select>
        <select id="f-class" class="input">${classOpts}</select>
        <input type="date" id="f-desde" class="input" title="Desde" value="${R().esc(filters.desde || '')}">
        <input type="date" id="f-hasta" class="input" title="Hasta" value="${R().esc(filters.hasta || '')}">
        <button class="btn" data-action="clear-filters">Limpiar</button>
      </div>
      <div id="dic-results">${R().grid(S().query(filters))}</div>
    </section>`;
  }

  /* ---------- FORMULARIO (agregar / editar) ---------- */
  function form(sign) {
    const editing = !!sign;
    sign = sign || {};
    const cats = S().state.categories;
    const catOpts = cats.map((c) =>
      `<option value="${R().esc(c)}"${sign.categoria === c ? ' selected' : ''}>${R().esc(c)}</option>`).join('');
    const today = new Date().toISOString().slice(0, 10);
    const hasMedia = sign.media && sign.media.blob;
    return `<section class="view view--narrow">
      <div class="page-head"><h1>${editing ? 'Editar seña' : 'Agregar seña'}</h1></div>
      <form id="sign-form" class="form">
        <div class="form__row">
          <label>Nombre de la seña *
            <input class="input" name="nombre" required value="${R().esc(sign.nombre || '')}" placeholder="Ej: HOLA">
          </label>
        </div>
        <div class="form__grid">
          <label>Categoría
            <select class="input" name="categoria">${catOpts}</select>
          </label>
          <label>Nueva categoría (opcional)
            <input class="input" name="nuevaCategoria" placeholder="Crear otra…">
          </label>
          <label>Clase
            <input class="input" name="clase" value="${R().esc(sign.clase || '')}" placeholder="Ej: Clase 3">
          </label>
          <label>Fecha
            <input class="input" type="date" name="fecha" value="${R().esc(sign.fecha || today)}">
          </label>
        </div>
        <div class="form__row">
          <label>GIF o video corto
            <input class="input" type="file" name="media" accept="image/gif,image/*,video/*">
          </label>
          <div class="form__hint">${hasMedia ? 'Ya hay un archivo cargado. Subí uno nuevo solo si querés reemplazarlo.' : 'Se prioriza video corto; también se admite GIF.'}</div>
          <div id="media-preview" class="media-preview">${hasMedia ? R().mediaThumb(sign) : ''}</div>
        </div>
        <div class="form__row">
          <label>Descripción de cómo se realiza
            <textarea class="input" name="descripcion" rows="3">${R().esc(sign.descripcion || '')}</textarea>
          </label>
        </div>
        <div class="form__row">
          <label>Notas personales
            <textarea class="input" name="notas" rows="2">${R().esc(sign.notas || '')}</textarea>
          </label>
        </div>
        <div class="form__row">
          <label>Fuente o enlace al video original
            <input class="input" name="fuente" value="${R().esc(sign.fuente || '')}" placeholder="https://…">
          </label>
        </div>
        <div class="form__actions">
          <button type="submit" class="btn btn--primary">${editing ? 'Guardar cambios' : 'Guardar seña'}</button>
          <button type="button" class="btn" data-action="cancel-form">Cancelar</button>
        </div>
        ${editing ? `<input type="hidden" name="id" value="${R().esc(sign.id)}">` : ''}
      </form>
    </section>`;
  }

  /* ---------- DETALLE (modal) ---------- */
  function detail(sign) {
    const fuente = sign.fuente
      ? `<a href="${R().esc(sign.fuente)}" target="_blank" rel="noopener noreferrer">${R().esc(sign.fuente)}</a>`
      : '<span class="muted">—</span>';
    return `<div class="modal__panel" role="dialog" aria-modal="true" aria-label="Detalle de ${R().esc(sign.nombre)}">
      <button class="modal__close" data-action="close-modal" aria-label="Cerrar">×</button>
      ${R().mediaLarge(sign)}
      <div class="detail">
        <h2 class="detail__title">${R().esc(sign.nombre)}</h2>
        <div class="detail__meta">
          <span class="chip">${R().esc(sign.categoria || 'Otros')}</span>
          <span>${R().esc(sign.clase || 'Sin clase')}</span>
          <span>${R().fmtDate(sign.fecha)}</span>
        </div>
        <dl class="detail__list">
          <dt>Descripción</dt><dd>${R().esc(sign.descripcion) || '<span class="muted">—</span>'}</dd>
          <dt>Notas personales</dt><dd>${R().esc(sign.notas) || '<span class="muted">—</span>'}</dd>
          <dt>Fuente</dt><dd>${fuente}</dd>
        </dl>
        <div class="detail__actions">
          <button class="btn" data-action="edit-sign" data-id="${R().esc(sign.id)}">Editar</button>
          <button class="btn btn--danger" data-action="delete-sign" data-id="${R().esc(sign.id)}">Eliminar</button>
        </div>
      </div>
    </div>`;
  }

  return { home, clases, diccionario, form, detail };
})();
