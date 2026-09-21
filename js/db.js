/* =============================================================
 * db.js  —  Capa de almacenamiento (IndexedDB)
 * -------------------------------------------------------------
 * Persiste las señas y sus medios (GIF/video) de forma local en
 * el navegador. IndexedDB permite guardar Blobs directamente, por
 * lo que los videos/GIF sobreviven al cerrar y reabrir la página.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.DB = (function () {
  const DB_NAME = 'lsa_notebook';
  const DB_VERSION = 1;
  const STORE_SIGNS = 'signs';
  const STORE_META = 'meta';

  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_SIGNS)) {
          const s = db.createObjectStore(STORE_SIGNS, { keyPath: 'id' });
          s.createIndex('clase', 'clase', { unique: false });
          s.createIndex('categoria', 'categoria', { unique: false });
          s.createIndex('fecha', 'fecha', { unique: false });
          s.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(storeName, mode) {
    return open().then((db) => {
      const t = db.transaction(storeName, mode);
      return t.objectStore(storeName);
    });
  }

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /* ---------- Señas ---------- */
  async function getAllSigns() {
    const store = await tx(STORE_SIGNS, 'readonly');
    return reqToPromise(store.getAll());
  }
  async function getSign(id) {
    const store = await tx(STORE_SIGNS, 'readonly');
    return reqToPromise(store.get(id));
  }
  async function putSign(sign) {
    const store = await tx(STORE_SIGNS, 'readwrite');
    await reqToPromise(store.put(sign));
    return sign;
  }
  async function deleteSign(id) {
    const store = await tx(STORE_SIGNS, 'readwrite');
    return reqToPromise(store.delete(id));
  }
  async function bulkPut(signs) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE_SIGNS, 'readwrite');
      const store = t.objectStore(STORE_SIGNS);
      signs.forEach((s) => store.put(s));
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
    });
  }

  /* ---------- Metadatos (categorías, flags) ---------- */
  async function getMeta(key, fallback) {
    const store = await tx(STORE_META, 'readonly');
    const row = await reqToPromise(store.get(key));
    return row ? row.value : fallback;
  }
  async function setMeta(key, value) {
    const store = await tx(STORE_META, 'readwrite');
    return reqToPromise(store.put({ key, value }));
  }

  return {
    open, getAllSigns, getSign, putSign, deleteSign, bulkPut,
    getMeta, setMeta,
  };
})();
