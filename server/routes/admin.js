const express = require('express');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const store = require('../usersStore');
const { validateEmail } = require('../emailValidate');

const router = express.Router();

/* Distinções possíveis (tem de coincidir com o cliente) */
const VALID_BADGES = ['dev', 'top1', 'clip', 'jogador'];

const count = async (db, sql) => {
  try {
    const row = await db.prepare(sql).get();
    return row ? Number(row.n) : 0;
  } catch {
    return 0;
  }
};

/* ---------- Painel: visão geral de tudo ---------- */
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const users = await store.listAll();
    const [anuncios, comentarios, clips, visitas, distincoes] = await Promise.all([
      count(db, 'SELECT COUNT(*) n FROM posts'),
      count(db, 'SELECT COUNT(*) n FROM post_comments'),
      count(db, 'SELECT COUNT(*) n FROM clips'),
      count(db, 'SELECT COUNT(*) n FROM visitors'),
      count(db, 'SELECT COUNT(*) n FROM user_badges'),
    ]);
    res.json({
      contas: users.length,
      administradores: users.filter((u) => u.is_admin).length,
      anuncios,
      comentarios,
      clips,
      visitas,
      distincoes,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar o painel.' });
  }
});

/* ---------- Lista de contas (+ distinções de cada uma) ---------- */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    let grants = [];
    try {
      grants = await db.prepare('SELECT user_id, badge FROM user_badges').all();
    } catch {
      /* tabela ainda não existe */
    }
    let profiles = [];
    try {
      profiles = await db.prepare('SELECT user_id, avatar_url, game_nick FROM user_profiles').all();
    } catch {
      /* tabela ainda não existe */
    }
    const byUser = {};
    for (const g of grants) {
      if (!byUser[g.user_id]) byUser[g.user_id] = [];
      byUser[g.user_id].push(g.badge);
    }
    const profByUser = {};
    for (const p of profiles) profByUser[p.user_id] = p;
    const users = (await store.listAll())
      .map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email || null,
        is_admin: Boolean(u.is_admin),
        created_at: u.created_at,
        badges: byUser[u.id] || [],
        avatar_url: (profByUser[u.id] && profByUser[u.id].avatar_url) || null,
        game_nick: (profByUser[u.id] && profByUser[u.id].game_nick) || null,
      }))
      .sort((a, b) => Number(a.id) - Number(b.id));
    res.json({ users });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar as contas.' });
  }
});

/* ---------- Atribuir distinção a uma conta ---------- */
router.post('/users/:id/badges', requireAdmin, async (req, res) => {
  const badge = String((req.body && req.body.badge) || '');
  const id = Number(req.params.id);
  if (!VALID_BADGES.includes(badge)) {
    return res.status(400).json({ error: 'Distinção inválida.' });
  }
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Conta inválida.' });
  }
  try {
    const db = getDb();
    await db
      .prepare(
        'INSERT INTO user_badges (user_id, badge, granted_by) VALUES (?, ?, ?) ON CONFLICT (user_id, badge) DO NOTHING',
      )
      .run(id, badge, req.auth && req.auth.uid ? req.auth.uid : null);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao atribuir a distinção.' });
  }
});

/* ---------- Retirar distinção ---------- */
router.delete('/users/:id/badges/:badge', requireAdmin, async (req, res) => {
  const badge = String(req.params.badge || '');
  const id = Number(req.params.id);
  if (!VALID_BADGES.includes(badge)) {
    return res.status(400).json({ error: 'Distinção inválida.' });
  }
  try {
    const db = getDb();
    await db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge = ?').run(id, badge);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao retirar a distinção.' });
  }
});

/* ---------- Tornar / retirar admin (nunca a ti mesmo) ---------- */
router.patch('/users/:id/admin', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const value = Boolean(req.body && req.body.is_admin);
    const user = await store.findById(id);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
    if (!value && req.auth && Number(req.auth.uid) === Number(id)) {
      return res.status(400).json({ error: 'Não te podes remover a ti mesmo como admin.' });
    }
    const updated = await store.setAdmin(user.username, value);
    res.json({ ok: true, is_admin: Boolean(updated && updated.is_admin) });
  } catch {
    res.status(500).json({ error: 'Erro ao alterar as permissões.' });
  }
});

/* ---------- Email da conta (obrigatório para recuperar a pass) ---------- */
// PUT /api/admin/users/:id/email  { email }
router.put('/users/:id/email', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await store.findById(id);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });

    const emailCheck = await validateEmail((req.body && req.body.email) || '');
    if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });

    const taken = await store.findByEmail(emailCheck.email);
    if (taken && Number(taken.id) !== Number(id)) {
      return res.status(409).json({ error: 'Esse email já está associado a outra conta.' });
    }

    await store.setEmail(id, emailCheck.email);
    res.json({ ok: true, email: emailCheck.email });
  } catch (error) {
    console.error('Erro admin email:', error.message);
    res.status(500).json({
      error: /em falta|column/i.test(error.message)
        ? 'Falta a coluna "email" na base de dados (ver consola do servidor).'
        : 'Erro ao guardar o email.',
    });
  }
});

/* ---------- Pedidos de recuperação (visibilidade) ---------- */
// GET /api/admin/recovery -> pedidos ativos (enviados por email)
router.get('/recovery', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(`SELECT * FROM pass_recovery WHERE status IN ('sent','locked') ORDER BY created_at DESC`)
      .all();
    res.json({ requests: rows });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar pedidos de recuperação.' });
  }
});

module.exports = { adminRouter: router };
