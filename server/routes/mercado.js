/* ============================================================
   API do mercado + packs
   ============================================================ */
const express = require('express');
const { getDb } = require('../database');
const { requireUser, requireAdmin } = require('../middleware/auth');
const mercado = require('../mercado');

const router = express.Router();

const uidDe = (req) => Number(req.auth && req.auth.uid);

router.get('/', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await mercado.listar(uid));
  } catch (e) {
    console.error('Mercado:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir o mercado.' });
  }
});

router.post('/comprar', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.json(await mercado.comprar(uid, req.body && req.body.item_id));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível comprar.' });
  }
});

router.post('/vender', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.json(await mercado.vender(uid, req.body && req.body.item_id));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível vender.' });
  }
});

/* ---------------- Packs ---------------- */

router.get('/packs', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ packs: await mercado.meusPacks(uid) });
  } catch (e) {
    console.error('Packs:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir os packs.' });
  }
});

router.post('/packs/:id/abrir', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.json(await mercado.abrirPack(uid, req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível abrir o pack.' });
  }
});

/* Só o admin dá packs. */
router.post('/packs/dar', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const db = getDb();
    const alvo = b.user_id
      ? await db.prepare('SELECT id, username FROM users WHERE id = ?').get(Number(b.user_id))
      : await db
          .prepare('SELECT id, username FROM users WHERE lower(username) = lower(?)')
          .get(String(b.username || '').trim());
    if (!alvo) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    const n = await mercado.darPacks({
      userId: alvo.id,
      tipo: b.tipo,
      quantidade: b.quantidade,
    });
    res.json({ ok: true, user: alvo.username, quantidade: n, tipo: b.tipo || 'basico' });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível dar os packs.' });
  }
});

/* Só o admin limpa os itens ganhos em packs. */
router.post('/packs/limpar', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const db = getDb();
    const alvo = b.user_id
      ? await db.prepare('SELECT id, username FROM users WHERE id = ?').get(Number(b.user_id))
      : await db
          .prepare('SELECT id, username FROM users WHERE lower(username) = lower(?)')
          .get(String(b.username || '').trim());
    if (!alvo) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    const r = await mercado.limparItensDePacks(alvo.id);
    res.json({ ok: true, user: alvo.username, ...r });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível limpar os itens.' });
  }
});

router.get('/historico', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await mercado.historico(req.query.limit));
  } catch (e) {
    console.error('Histórico mercado:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir o histórico.' });
  }
});

router.get('/meus', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await mercado.meusItens(uid));
  } catch (e) {
    console.error('Meus itens:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir os teus itens.' });
  }
});

router.post('/anunciar', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    const b = req.body || {};
    res.json(await mercado.anunciar(uid, b.item_id, b.preco));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível pôr à venda.' });
  }
});

router.post('/anuncios/:id/cancelar', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.json(await mercado.cancelarAnuncio(uid, req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível cancelar.' });
  }
});

router.post('/anuncios/:id/comprar', requireUser, async (req, res) => {
  try {
    const uid = uidDe(req);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.json(await mercado.comprarAnuncio(uid, req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível comprar o anúncio.' });
  }
});

/* ---------------- Admin: limpezas ---------------- */

async function alvoDe(req) {
  const b = req.body || {};
  const db = getDb();
  if (b.user_id) {
    return db.prepare('SELECT id, username FROM users WHERE id = ?').get(Number(b.user_id));
  }
  return db
    .prepare('SELECT id, username FROM users WHERE lower(username) = lower(?)')
    .get(String(b.username || '').trim());
}

function rotaLimpeza(caminho, fn, chave) {
  router.post(caminho, requireAdmin, async (req, res) => {
    try {
      const alvo = await alvoDe(req);
      if (!alvo) return res.status(404).json({ error: 'Utilizador não encontrado.' });
      const r = await fn(alvo.id);
      res.json({ ok: true, user: alvo.username, [chave]: r.removidos });
    } catch (e) {
      res.status(400).json({ error: e.message || 'Não foi possível limpar.' });
    }
  });
}

rotaLimpeza('/admin/limpar-creditos', mercado.limparCreditos, 'creditos');
rotaLimpeza('/admin/limpar-itens', mercado.limparItens, 'itens');
rotaLimpeza('/admin/limpar-packs', mercado.limparPacks, 'packs');

router.get('/admin/economia', requireAdmin, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await mercado.economia());
  } catch (e) {
    console.error('Economia:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir a economia.' });
  }
});

router.post('/admin/moedas', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const db = getDb();
    const alvo = b.user_id
      ? await db.prepare('SELECT id, username FROM users WHERE id = ?').get(Number(b.user_id))
      : await db
          .prepare('SELECT id, username FROM users WHERE lower(username) = lower(?)')
          .get(String(b.username || '').trim());
    if (!alvo) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    const r = await mercado.ajustarMoedas(alvo.id, b.valor, b.motivo);
    res.json({ ok: true, user: alvo.username, ...r });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Não foi possível ajustar as moedas.' });
  }
});

module.exports = { mercadoRouter: router };
