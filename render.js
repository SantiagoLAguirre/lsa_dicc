/* =============================================================
 * render.js  —  Construcción del HTML de cada vista
 * -------------------------------------------------------------
 * Funciones puras que reciben datos y devuelven marcado. El
 * enrutado y los eventos viven en app.js.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.Render = (function () {
  const S = () => LSA.Store;

  /* ---------- Utilidades ---------- */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return 'Sin fecha';
    const p = iso.split('-');
    if (p.length !== 3) return esc(iso);
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  function isVideo(sign) {
    return sign && sign.media && /^video\//.test(sign.media.type || '');
  }

  // Miniatura: video en loop, silenciado y sin controles; o GIF/imagen.
  function mediaThumb(sign) {
    const url = S().mediaURL(sign);
    if (!url) {
      return `<div class="media media--empty"><span>Sin imagen</span></div>`;
    }
    if (isVideo(sign)) {
      return `<div class="media"><video src="${esc(url)}" muted loop autoplay ` +
        `playsinline preload="metadata"></video></div>`;
    }
    return `<div class="media"><img src="${esc(url)}" alt="${esc(sign.nombre)}" loading="lazy"></div>`;
  }

  // Versión grande para el detalle: video con controles.
  function mediaLarge(sign) {
    const url = S().mediaURL(sign);
    if (!url) {
      return `<div class="media media--empty media--large"><span>Sin imagen</span></div>`;
    }
    if (isVideo(sign)) {
      return `<div class="media media--large"><video src="${esc(url)}" controls loop ` +
        `autoplay muted playsinline></video></div>`;
    }
    return `<div class="media media--large"><img src="${esc(url)}" alt="${esc(sign.nombre)}"></div>`;
  }

  // Tarjeta de una seña (usada en cuadrículas).
  function signCard(sign) {
    return `<article class="card" data-id="${esc(sign.id)}" role="button" tabindex="0">
      ${mediaThumb(sign)}
      <div class="card__body">
        <h3 class="card__title">${esc(sign.nombre)}</h3>
        <div class="card__meta">
          <span class="chip">${esc(sign.categoria || 'Otros')}</span>
          <span class="card__class">${esc(sign.clase || 'Sin clase')}</span>
        </div>
      </div>
    </article>`;
  }

  function grid(signs) {
    if (!signs.length) {
      return `<div class="empty">Aún no hay señas aquí.</div>`;
    }
    return `<div class="grid">${signs.map(signCard).join('')}</div>`;
  }

  return { esc, fmtDate, isVideo, mediaThumb, mediaLarge, signCard, grid };
})();
