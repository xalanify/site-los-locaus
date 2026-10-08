/* ============================================================
   Snapshots do tracker.gg (Rainbow Six / Battlefield)
   ------------------------------------------------------------
   Ficheiros JSON gerados na pasta server/data/ (colha no
   browser) e servidos sem processamento aos endpoints
   GET /r6 e GET /bf. Leitura com cache por mtime — mais leve
   que reparsear o JSON a cada pedido.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const R6_FILE = path.join(DATA_DIR, 'r6.json');
const BF_FILES = {
  bf1: path.join(DATA_DIR, 'bf1.json'),
  bfv: path.join(DATA_DIR, 'bfv.json'),
  bf6: path.join(DATA_DIR, 'bf6.json'),
};

// file -> { mtime, data }
const cache = new Map();

function readJson(file) {
  try {
    const st = fs.statSync(file);
    const hit = cache.get(file);
    if (hit && hit.mtime === st.mtimeMs) return hit.data;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache.set(file, { mtime: st.mtimeMs, data });
    return data;
  } catch (err) {
    return null; // ficheiro em falta ou JSON inválido → tratado pela rota
  }
}

function missing(file) {
  return ['server/data/' + path.basename(file)];
}

module.exports = { DATA_DIR, R6_FILE, BF_FILES, readJson, missing };
