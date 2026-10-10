const express = require('express');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* Temas disponíveis. `test: true` = só aparece em localhost
   (é para experimentar sem estragar o site dos outros). */
const THEMES = [
  { id: 'normal', label: 'Nosso tema', test: false },
  { id: 'natal', label: 'Natal', test: true },
];
const IDS = new Set(THEMES.map((t) => t.id));

/* A BD é lida uma vez e guardada 15 s — o tema não muda a cada pedido. */
let cache = { tema: 'normal', quando: 0 };

async function lerTema() {
  if (Date.now() - cache.quando < 15000) return cache.tema;
  try {
    const row = await getDb().prepare("SELECT v FROM site_settings WHERE k = 'theme'").get();
    cache = { tema: row && IDS.has(row.v) ? row.v : 'normal', quando: Date.now() };
  } catch {
    /* tabela ainda não existe */
    cache = { tema: 'normal', quando: Date.now() };
  }
  return cache.tema;
}

/* GET /api/settings — público: que tema é que o site está a usar */
router.get('/', async (req, res) => {
  const theme = await lerTema();
  res.json({ theme, themes: THEMES });
});

/* POST /api/settings — só admin: trocar o tema do site */
router.post('/', requireAdmin, async (req, res) => {
  const id = String((req.body && req.body.theme) || '').trim();
  if (!IDS.has(id)) return res.status(400).json({ error: 'Tema desconhecido.' });
  try {
    await getDb()
      .prepare(
        `INSERT INTO site_settings (k, v) VALUES ('theme', ?)
         ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = now()`,
      )
      .run(id);
    cache = { tema: id, quando: Date.now() };
    res.json({ ok: true, theme: id, themes: THEMES });
  } catch (error) {
    console.error('Erro settings:', error.message);
    res.status(500).json({ error: 'Não deu para guardar o tema.' });
  }
});

module.exports = { settingsRouter: router, lerTema };
