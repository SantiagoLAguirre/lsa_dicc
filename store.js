/* =============================================================
 * store.js  —  Lógica de datos y estado de la aplicación
 * -------------------------------------------------------------
 * Media entre la interfaz (render/app) y el almacenamiento (db).
 * Mantiene en memoria la lista de señas y categorías, expone
 * operaciones CRUD, búsqueda, filtros y agrupación por clase.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.Store = (function () {
  const DEFAULT_CATEGORIES = [
    'Saludos', 'Personas', 'Familia', 'Verbos', 'Objetos', 'Lugares',
    'Números', 'Tiempo', 'Emociones', 'Preguntas', 'Expresiones', 'Otros',
  ];

  const state = {
    signs: [],
    categories: [],
  };

  // Cache de object URLs para no recrearlos en cada render.
  const _urlCache = new Map();

  function uid() {
    return 's_' + Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Carga inicial ---------- */
  async function init() {
    state.categories = await LSA.DB.getMeta('categories', null) ||
      DEFAULT_CATEGORIES.slice();
    await refresh();
    return state;
  }

  async function refresh() {
    const signs = await LSA.DB.getAllSigns();
    // Orden cronológico: por fecha de la clase y luego por creación.
    signs.sort((a, b) => {
      if (a.fecha !== b.fecha) return (a.fecha || '').localeCompare(b.fecha || '');
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    state.signs = signs;
    return signs;
  }

  /* ---------- Object URLs para medios ---------- */
  function mediaURL(sign) {
    if (!sign || !sign.media || !sign.media.blob) return null;
    if (_urlCache.has(sign.id)) return _urlCache.get(sign.id);
    const url = URL.createObjectURL(sign.media.blob);
    _urlCache.set(sign.id, url);
    return url;
  }
  function revokeURL(id) {
    if (_urlCache.has(id)) {
      URL.revokeObjectURL(_urlCache.get(id));
      _urlCache.delete(id);
    }
  }

  /* ---------- CRUD ---------- */
  async function addSign(data) {
    const now = Date.now();
    const sign = Object.assign({
      id: uid(),
      nombre: '',
      categoria: 'Otros',
      clase: '',
      fecha: '',
      descripcion: '',
      notas: '',
      fuente: '',
      media: null,
      createdAt: now,
      updatedAt: now,
    }, data);
    await ensureCategory(sign.categoria);
    await LSA.DB.putSign(sign);
    await refresh();
    return sign;
  }

  async function updateSign(id, data) {
    const existing = await LSA.DB.getSign(id);
    if (!existing) return null;
    // Si llega media nueva, liberamos el URL cacheado.
    if (data.media !== undefined) revokeURL(id);
    const updated = Object.assign({}, existing, data, {
      id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    });
    await ensureCategory(updated.categoria);
    await LSA.DB.putSign(updated);
    await refresh();
    return updated;
  }

  async function removeSign(id) {
    revokeURL(id);
    await LSA.DB.deleteSign(id);
    await refresh();
  }

  function getSign(id) {
    return state.signs.find((s) => s.id === id) || null;
  }

  /* ---------- Categorías ---------- */
  async function ensureCategory(cat) {
    if (cat && !state.categories.includes(cat)) {
      state.categories.push(cat);
      state.categories.sort((a, b) => a.localeCompare(b, 'es'));
      await LSA.DB.setMeta('categories', state.categories);
    }
  }
  async function addCategory(cat) {
    cat = (cat || '').trim();
    if (cat) await ensureCategory(cat);
    return state.categories;
  }

  /* ---------- Consultas ---------- */
  function getCategoriesInUse() {
    return Array.from(new Set(state.signs.map((s) => s.categoria).filter(Boolean)));
  }

  function getClasses() {
    // Devuelve clases únicas con su fecha, en orden cronológico.
    const map = new Map();
    state.signs.forEach((s) => {
      const key = s.clase || 'Sin clase';
      if (!map.has(key)) map.set(key, { clase: key, fecha: s.fecha, count: 0 });
      const info = map.get(key);
      info.count += 1;
      // Conserva la fecha más temprana registrada para esa clase.
      if (s.fecha && (!info.fecha || s.fecha < info.fecha)) info.fecha = s.fecha;
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.fecha || '').localeCompare(b.fecha || ''));
  }

  function groupByClass(signs) {
    const groups = new Map();
    signs.forEach((s) => {
      const key = s.clase || 'Sin clase';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    });
    // Reordena las claves por fecha de la clase.
    const classInfo = new Map(getClasses().map((c) => [c.clase, c.fecha]));
    return Array.from(groups.entries())
      .sort((a, b) => (classInfo.get(a[0]) || '').localeCompare(classInfo.get(b[0]) || ''))
      .map(([clase, items]) => ({ clase, fecha: classInfo.get(clase), items }));
  }

  function query({ text = '', categoria = '', clase = '', desde = '', hasta = '' } = {}) {
    const t = text.trim().toLowerCase();
    return state.signs.filter((s) => {
      if (t && !(s.nombre || '').toLowerCase().includes(t) &&
              !(s.descripcion || '').toLowerCase().includes(t)) return false;
      if (categoria && s.categoria !== categoria) return false;
      if (clase && (s.clase || 'Sin clase') !== clase) return false;
      if (desde && (s.fecha || '') < desde) return false;
      if (hasta && (s.fecha || '') > hasta) return false;
      return true;
    });
  }

  /* ---------- Copia de seguridad (exportar / importar) ---------- */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  function base64ToBlob(b64, type) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'application/octet-stream' });
  }

  // Genera un objeto serializable con todas las señas (media → base64).
  async function exportData() {
    const signs = await LSA.DB.getAllSigns();
    const out = [];
    for (const s of signs) {
      let media = null;
      if (s.media && s.media.blob) {
        media = { type: s.media.type, name: s.media.name, data: await blobToBase64(s.media.blob) };
      }
      out.push(Object.assign({}, s, { media }));
    }
    return { app: 'cuaderno-lsa', version: 1, exportedAt: Date.now(),
      categories: state.categories.slice(), signs: out };
  }

  // Importa una copia. Combina por id: si el id ya existe lo reemplaza,
  // si es nuevo lo agrega (no genera duplicados al reimportar el mismo archivo).
  async function importData(payload) {
    if (!payload || !Array.isArray(payload.signs)) {
      throw new Error('El archivo no es una copia válida de Cuaderno LSA.');
    }
    if (Array.isArray(payload.categories)) {
      for (const c of payload.categories) await ensureCategory(c);
    }
    const signs = payload.signs.map((s) => Object.assign({}, s, {
      media: (s.media && s.media.data)
        ? { type: s.media.type, name: s.media.name, blob: base64ToBlob(s.media.data, s.media.type) }
        : null,
    }));
    signs.forEach((s) => revokeURL(s.id));
    await LSA.DB.bulkPut(signs);
    await refresh();
    return signs.length;
  }

  function stats() {
    const classes = getClasses();
    const last = state.signs.length
      ? state.signs[state.signs.length - 1] : null;
    return {
      total: state.signs.length,
      totalClases: classes.length,
      ultimaClase: classes.length ? classes[classes.length - 1] : null,
      recientes: state.signs.slice().sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6),
      ultima: last,
    };
  }

  return {
    state, DEFAULT_CATEGORIES, init, refresh,
    mediaURL, revokeURL,
    addSign, updateSign, removeSign, getSign,
    addCategory, getCategoriesInUse, getClasses, groupByClass,
    query, stats,
    exportData, importData,
  };
})();
