/* =============================================================
 * backup.js  —  Exportar / Importar copia de seguridad
 * -------------------------------------------------------------
 * Genera un JSON con todas las señas (media en base64) para
 * descargarlo como archivo, y permite importarlo para restaurar
 * o sincronizar entre dispositivos.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.Backup = (function () {
  const S = () => LSA.Store;

  // Genera el archivo de copia y lo descarga.
  async function exportToFile() {
    const data = await S().exportData();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = 'lsa-copia-' + ts + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Lee un archivo JSON y lo importa (merge por id).
  async function importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const payload = JSON.parse(String(reader.result));
          const count = await S().importData(payload);
          resolve(count);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsText(file);
    });
  }

  return { exportToFile, importFromFile };
})();
