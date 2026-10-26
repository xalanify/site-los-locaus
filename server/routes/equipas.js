/* ============================================================
   Equipas de esports (CS2 / Rainbow Six) — pesquisa + ficha
   ============================================================ */
const express = require('express');
const { attachAuth } = require('../middleware/auth');
const equipas = require('../equipas');

const router = express.Router();

/* GET /api/equipas?jogo=cs2&q=navi */
router.get('/', attachAuth, async (req, res) => {
  try {
    const jogo = String(req.query.jogo || 'cs2').toLowerCase();
    const dados = await equipas.pesquisar(jogo, req.query.q);
    res.setHeader('Cache-Control', 'no-store');
    res.json(dados);
  } catch (e) {
    console.error('Erro equipas pesquisa:', e.message);
    res.status(502).json({ resultados: [], error: 'Não foi possível pesquisar equipas agora.' });
  }
});

/* GET /api/equipas/cs2/Natus%20Vincere */
router.get('/:jogo/:titulo', attachAuth, async (req, res) => {
  try {
    const dados = await equipas.equipa(req.params.jogo, req.params.titulo);
    res.setHeader('Cache-Control', 'no-store');
    res.json(dados);
  } catch (e) {
    console.error('Erro equipa:', e.message);
    res.status(502).json({ ok: false, error: e.message || 'Não foi possível abrir a equipa.' });
  }
});

module.exports = { equipasRouter: router };
