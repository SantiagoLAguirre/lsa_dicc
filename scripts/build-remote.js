#!/usr/bin/env node
/* =============================================================
 * build-remote.js — Publicar el diccionario en el sitio
 * -------------------------------------------------------------
 * Toma una copia de seguridad exportada desde la app
 * (Inicio → Exportar copia, archivo lsa-copia-*.json) y genera:
 *
 *   data/diccionario.json  → señas livianas (sin base64)
 *   media/                 → cada GIF/PNG/video como archivo suelto
 *
 * Uso (parado en la raíz del repositorio):
 *   node scripts/build-remote.js "ruta/a/lsa-copia-XXXX.json"
 *
 * Después: git add . && git commit -m "..." && git push
 * La página (GitHub Pages) se actualiza sola en unos minutos.
 * ===========================================================*/
const fs = require('fs');
const path = require('path');

const backupPath = process.argv[2];
if (!backupPath || !fs.existsSync(backupPath)) {
  console.error('Uso: node scripts/build-remote.js "ruta/a/lsa-copia-XXXX.json"');
  process.exit(1);
}

const repoDir = path.resolve(__dirname, '..');
const mediaDir = path.join(repoDir, 'media');
const dataDir = path.join(repoDir, 'data');
fs.mkdirSync(mediaDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

console.log('Leyendo copia de seguridad (puede demorar si pesa mucho)...');
const payload = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const EXT_BY_TYPE = {
  'image/gif': '.gif', 'image/png': '.png', 'image/jpeg': '.jpg',
  'video/mp4': '.mp4', 'video/webm': '.webm',
};

function safeName(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extFor(media) {
  const m = /\.(gif|png|jpe?g|mp4|webm)$/i.exec(media.name || '');
  if (m) return '.' + m[1].toLowerCase();
  return EXT_BY_TYPE[media.type] || '.bin';
}

// Conserva los medios ya existentes para reusar nombres estables entre copias.
const existing = new Map();
for (const f of fs.readdirSync(mediaDir)) {
  existing.set(f, path.join(mediaDir, f));
}

const used = new Set(existing.keys());
const outSigns = [];
let escritos = 0, reusados = 0, totalBytes = 0;

for (const s of payload.signs) {
  const sign = Object.assign({}, s);
  if (sign.media && sign.media.data) {
    const m = sign.media;
    const buf = Buffer.from(m.data, 'base64');
    // Si ya existe un medio idéntico (mismo tamaño), se reutiliza.
    const clave = safeName(sign.id || 'sign') + extFor(m);
    let file = null;
    if (existing.has(clave) && fs.statSync(existing.get(clave)).size === buf.length) {
      file = clave; reusados++;
    } else {
      file = clave;
      let i = 2;
      while (used.has(file)) file = safeName(sign.id || 'sign') + '_' + (i++) + extFor(m);
      fs.writeFileSync(path.join(mediaDir, file), buf);
      escritos++;
      totalBytes += buf.length;
    }
    used.add(file);
    sign.media = { type: m.type, name: m.name, url: 'media/' + file };
  } else if (sign.media && sign.media.url) {
    // Ya venía con URL remota: se mantiene.
    used.add(sign.media.url.replace(/^media\//, ''));
  }
  outSigns.push(sign);
}

const out = {
  app: 'cuaderno-lsa',
  version: 1,
  exportedAt: payload.exportedAt || Date.now(),
  categories: payload.categories,
  signs: outSigns,
};
const outPath = path.join(dataDir, 'diccionario.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`Señas: ${outSigns.length} | categorías: ${(payload.categories || []).length}`);
console.log(`Medios nuevos: ${escritos} (${(totalBytes / 1048576).toFixed(1)} MB) | reutilizados: ${reusados}`);
console.log(`diccionario.json: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
console.log('Listo. Ahora: git add . && git commit -m "Actualizo diccionario" && git push');
