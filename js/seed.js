/* =============================================================
 * seed.js  —  Datos de ejemplo
 * -------------------------------------------------------------
 * Se ejecuta solo la primera vez (bandera 'seeded' en IndexedDB)
 * para poblar la app con señas de muestra y sus GIF placeholder.
 * ===========================================================*/
window.LSA = window.LSA || {};

LSA.Seed = (function () {
  function dataURItoBlob(dataURI) {
    const [meta, b64] = dataURI.split(',');
    const mime = meta.match(/:(.*?);/)[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function media(word) {
    const uri = (window.SEED_MEDIA || {})[word];
    if (!uri) return null;
    return { type: 'image/gif', name: word.toLowerCase() + '.gif', blob: dataURItoBlob(uri) };
  }

  const SAMPLE = [
    { nombre: 'HOLA', categoria: 'Saludos', clase: 'Clase 1', fecha: '2026-09-05',
      descripcion: 'Mano abierta a la altura de la frente que se mueve levemente hacia afuera, como un saludo.',
      notas: 'La primera seña del curso. Fácil de recordar.', fuente: 'https://www.youtube.com/results?search_query=lsa+hola', word: 'HOLA' },
    { nombre: 'GRACIAS', categoria: 'Expresiones', clase: 'Clase 1', fecha: '2026-09-05',
      descripcion: 'Mano plana que parte desde el mentón y se proyecta hacia adelante y abajo.',
      notas: 'Recordar acompañar con expresión facial amable.', fuente: '', word: 'GRACIAS' },
    { nombre: 'ADIÓS', categoria: 'Saludos', clase: 'Clase 1', fecha: '2026-09-05',
      descripcion: 'Mano abierta que se agita de lado a lado, similar al gesto común de despedida.',
      notas: '', fuente: '', word: 'ADIÓS' },
    { nombre: 'CASA', categoria: 'Lugares', clase: 'Clase 2', fecha: '2026-09-12',
      descripcion: 'Ambas manos forman el techo de una casa; las puntas de los dedos se tocan.',
      notas: 'Se puede confundir con “techo”, prestar atención al movimiento.', fuente: '', word: 'CASA' },
    { nombre: 'MAMÁ', categoria: 'Familia', clase: 'Clase 2', fecha: '2026-09-12',
      descripcion: 'Mano abierta con el pulgar tocando la mejilla / mentón (seña femenina).',
      notas: 'La seña de “papá” es similar pero en la frente.', fuente: '', word: 'MAMÁ' },
    { nombre: 'PAPÁ', categoria: 'Familia', clase: 'Clase 2', fecha: '2026-09-12',
      descripcion: 'Mano abierta con el pulgar tocando la frente (seña masculina).',
      notas: '', fuente: '', word: 'PAPÁ' },
  ];

  async function run() {
    const seeded = await LSA.DB.getMeta('seeded', false);
    if (seeded) return false;
    const now = Date.now();
    const signs = SAMPLE.map((row, i) => ({
      id: 's_seed_' + i,
      nombre: row.nombre,
      categoria: row.categoria,
      clase: row.clase,
      fecha: row.fecha,
      descripcion: row.descripcion,
      notas: row.notas,
      fuente: row.fuente,
      media: media(row.word),
      createdAt: now + i,
      updatedAt: now + i,
    }));
    await LSA.DB.bulkPut(signs);
    await LSA.DB.setMeta('seeded', true);
    return true;
  }

  return { run };
})();
