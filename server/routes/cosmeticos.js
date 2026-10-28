/* ============================================================
   Loja de cosméticos — aberta a todos os membros
   ============================================================ */
const express = require('express');
const { requireUser } = require('../middleware/auth');
const cosmeticos = require('../cosmeticos');

const router = express.Router();

/* Saldo de Moedas Locaus — qualquer conta com sessão. */
router.get('/saldo', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await cosmeticos.saldo(uid));
  } catch (e) {
    console.error('Erro saldo moedas:', e.message);
    res.status(500).json({ error: 'Não foi possível obter o saldo.' });
  }
});

router.get('/', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await cosmeticos.listar(uid));
  } catch (e) {
    console.error('Erro cosmeticos:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir a loja.' });
  }
});

router.post('/comprar', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    const dados = await cosmeticos.comprar(uid, req.body && req.body.item_id);
    res.json({ ok: true, ...dados });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível comprar.' });
  }
});

router.post('/aplicar', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    const dados = await cosmeticos.aplicar(uid, req.body && req.body.item_id);
    res.json({ ok: true, ...dados });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível aplicar.' });
  }
});

module.exports = { cosmeticosRouter: router };
