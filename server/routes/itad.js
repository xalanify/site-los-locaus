const express = require('express');
const itad = require('../itad');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await itad.precos(req.query.title || req.query.q));
  } catch (e) {
    console.error('Erro ITAD:', e.message);
    res.status(502).json({ ok: false, deals: [], error: 'Sem ligação aos preços.' });
  }
});

module.exports = { itadRouter: router };
