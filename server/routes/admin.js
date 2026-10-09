const express = require('express');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const store = require('../usersStore');
const { validateEmail } = require('../emailValidate');

const router = express.Router();

/* Distinções possíveis (tem de coincidir com o cliente) */
const VALID_BADGES = ['dev', 'top1', 'jogador'];

/* Ligação user <-> conta de jogo — mesma lista dos clips (server/clipGames.js) */
const { CLIP_GAME_IDS } = require('../clipGames');

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
    let gameAccounts = [];
    try {
      gameAccounts = await db.prepare('SELECT id, user_id, game, nick FROM user_game_accounts').all();
    } catch {
      /* tabela ainda não existe */
    }
    const byUser = {};
    for (const g of grants) {
      if (!byUser[g.user_id]) byUser[g.user_id] = [];
      byUser[g.user_id].push(g.badge);
    }
    const accByUser = {};
    for (const a of gameAccounts) {
      if (!accByUser[a.user_id]) accByUser[a.user_id] = [];
      accByUser[a.user_id].push({ id: Number(a.id), game: a.game, nick: a.nick });
    }
    const profByUser = {};
    for (const p of profiles) profByUser[p.user_id] = p;
    const users = (await store.listAll())
      .map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email || null,
        is_admin: Boolean(u.is_admin),
        recovery: Boolean(u.recovery),
        created_at: u.created_at,
        badges: byUser[u.id] || [],
        game_accounts: accByUser[u.id] || [],
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

/* ---------- Pedidos de recuperação (admin ativa o modo) ---------- */
// GET /api/admin/recovery -> quem pediu "esqueci a pass" + estado da conta
router.get('/recovery', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT pr.username, pr.created_at, u.id AS user_id, u.recovery
         FROM pass_recovery pr
         LEFT JOIN users u ON u.id = pr.user_id
         WHERE pr.status IN ('requested', 'active')
         ORDER BY pr.created_at DESC`,
      )
      .all();
    res.json({ requests: rows });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar pedidos de recuperação.' });
  }
});

/* ---------- Modo recuperação de uma conta (on/off) ---------- */
// PATCH /api/admin/users/:id/recovery  { enabled }
router.patch('/users/:id/recovery', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const enabled = Boolean(req.body && req.body.enabled);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Conta inválida.' });

    const db = getDb();
    const upd = await db.prepare('UPDATE users SET recovery = ? WHERE id = ?').run(enabled, id);
    if (!upd.changes) return res.status(404).json({ error: 'Conta não encontrada.' });
    await db
      .prepare(
        `UPDATE pass_recovery SET status = ?, updated_at = now()
         WHERE user_id = ? AND status IN ('requested', 'sent')`,
      )
      .run(enabled ? 'active' : 'handled', id);

    res.json({ ok: true, recovery: enabled });
  } catch (error) {
    console.error('Erro admin recovery:', error.message);
    res.status(500).json({ error: 'Erro ao alterar o modo de recuperação.' });
  }
});

/* ---------- Ligações user <-> contas de jogo ---------- */
// POST /api/admin/users/:id/game-accounts  { game, nick }
router.post('/users/:id/game-accounts', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const game = String((req.body && req.body.game) || '').trim().toLowerCase();
    const nick = String((req.body && req.body.nick) || '').trim().slice(0, 40);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Conta inválida.' });
    if (!CLIP_GAME_IDS.has(game)) return res.status(400).json({ error: 'Jogo inválido.' });
    if (!nick) return res.status(400).json({ error: 'Escreve o nick nesse jogo.' });

    const db = getDb();
    await db
      .prepare(
        `INSERT INTO user_game_accounts (user_id, game, nick) VALUES (?, ?, ?)
         ON CONFLICT (user_id, game, nick) DO NOTHING`,
      )
      .run(id, game, nick);
    const rows = await db
      .prepare('SELECT id, game, nick FROM user_game_accounts WHERE user_id = ? ORDER BY id')
      .all(id);
    res.json({ ok: true, accounts: rows });
  } catch (error) {
    console.error('Erro game-accounts:', error.message);
    res.status(500).json({ error: 'Erro ao ligar a conta de jogo.' });
  }
});

// DELETE /api/admin/users/:id/game-accounts/:accId
router.delete('/users/:id/game-accounts/:accId', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const acc = Number(req.params.accId);
    if (!Number.isFinite(id) || !Number.isFinite(acc)) {
      return res.status(400).json({ error: 'Pedido inválido.' });
    }
    const db = getDb();
    await db
      .prepare('DELETE FROM user_game_accounts WHERE id = ? AND user_id = ?')
      .run(acc, id);
    const rows = await db
      .prepare('SELECT id, game, nick FROM user_game_accounts WHERE user_id = ? ORDER BY id')
      .all(id);
    res.json({ ok: true, accounts: rows });
  } catch (error) {
    console.error('Erro game-accounts delete:', error.message);
    res.status(500).json({ error: 'Erro ao retirar a conta de jogo.' });
  }
});

module.exports = { adminRouter: router };
