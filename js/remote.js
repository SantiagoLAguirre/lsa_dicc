/* =============================================================
 * remote.js — Diccionario publicado en el sitio
 * -------------------------------------------------------------
 * Al iniciar, descarga data/diccionario.json (las señas con sus
 * medios como archivos en media/) y las importa la primera vez
 * o cuando la copia publicada cambia. Así el diccionario queda
 * cargado de forma permanente para cualquier visitante y se
 * actualiza solo cuando publicás una copia nueva.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.Remote = (function () {
  const REMOTE_URL = 'data/diccionario.json';

  // Quita las señas de demostración si quedaron de visitas previas.
  async function quitarDemo() {
    const signs = await LSA.DB.getAllSigns();
    for (const s of signs) {
      if (/^s_seed_/.test(s.id)) await LSA.DB.deleteSign(s.id);
    }
  }

  async function sync() {
    try {
      const res = await fetch(REMOTE_URL, { cache: 'no-cache' });
      if (!res.ok) return 0; // no hay diccionario publicado
      const payload = await res.json();
      if (!payload || !Array.isArray(payload.signs)) return 0;

      // Solo importa si la copia publicada cambió desde la última visita.
      const stamp = String(payload.exportedAt || 'sin-fecha');
      const previo = await LSA.DB.getMeta('remoteStamp', '');
      if (stamp === previo) return 0;

      const count = await LSA.Store.importData(payload);
      await LSA.DB.setMeta('remoteStamp', stamp);
      if (count > 0) {
        await quitarDemo();
        await LSA.DB.setMeta('seeded', true); // desactiva las señas demo
      }
      return count;
    } catch (err) {
      return 0; // sin conexión o archivo local: la app sigue con sus datos
    }
  }

  return { sync };
})();
