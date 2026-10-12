// ============================================================
//  Notificações — dentro do site (sino) + Web Push (PWA)
//
//    GET    /                  -> as minhas (mais recentes)
//    GET    /unread            -> { n }
//    POST   /read-all          -> marca tudo como lido
//    POST   /:id/read          -> marca uma como lida
//    GET    /push/public-key   -> chave pública VAPID
//    POST   /push/subscribe    -> regista este dispositivo
//    POST   /push/unsubscribe  -> apaga este dispositivo
// ============================================================
const express = require('express');
const { getDb } = require('../database');
const { requireUser, attachAuth } = require('../middleware/auth');

const router = express.Router();

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('notificações:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

router.get(
  '/',
  requireUser,
  safe(async (req, res) => {
    const rows = await getDb()
      .prepare(
        `SELECT id, type, entity, entity_id, title, body, link, read_at, created_at
         FROM notifications WHERE user_id = ?
         ORDER BY created_at DESC, id DESC LIMIT 50`,
      )
      .all(req.auth.uid);
    const n = rows.filter((r) => !r.read_at).length;
    res.json({
      unread: n,
      items: rows.map((r) => ({
        id: Number(r.id),
        type: r.type,
        entity: r.entity,
        entity_id: r.entity_id == null ? null : Number(r.entity_id),
        title: r.title,
        body: r.body,
        link: r.link,
        read: !!r.read_at,
        created_at: r.created_at,
      })),
    });
  }),
);

router.get(
  '/unread',
  requireUser,
  safe(async (req, res) => {
    const row = await getDb()
      .prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL')
      .get(req.auth.uid);
    res.json({ n: Number(row?.n || 0) });
  }),
);

router.post(
  '/read-all',
  requireUser,
  safe(async (req, res) => {
    await getDb()
      .prepare('UPDATE notifications SET read_at = now() WHERE user_id = ? AND read_at IS NULL')
      .run(req.auth.uid);
    res.json({ ok: true });
  }),
);

// Apaga o histórico (notificações já lidas) do utilizador
router.delete(
  '/',
  requireUser,
  safe(async (req, res) => {
    await getDb().prepare('DELETE FROM notifications WHERE user_id = ?').run(req.auth.uid);
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/read',
  requireUser,
  safe(async (req, res) => {
    await getDb()
      .prepare('UPDATE notifications SET read_at = now() WHERE id = ? AND user_id = ?')
      .run(Number(req.params.id), req.auth.uid);
    res.json({ ok: true });
  }),
);

/* ---------------- Web Push ---------------- */

router.get('/push/public-key', attachAuth, (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  res.json({ key: key || null });
});

router.post(
  '/push/subscribe',
  requireUser,
  safe(async (req, res) => {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Subscribe inválida' });
    }
    const db = getDb();
    await db
      .prepare(
        `INSERT INTO push_subs (user_id, endpoint, p256dh, auth, user_agent)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      )
      .run(
        req.auth.uid,
        String(endpoint).slice(0, 2000),
        String(keys.p256dh).slice(0, 300),
        String(keys.auth).slice(0, 300),
        String(req.headers['user-agent'] || '').slice(0, 300),
      );
    res.json({ ok: true });
  }),
);

router.post(
  '/push/unsubscribe',
  requireUser,
  safe(async (req, res) => {
    const endpoint = String(req.body?.endpoint || '');
    if (endpoint) {
      await getDb()
        .prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?')
        .run(endpoint, req.auth.uid);
    }
    res.json({ ok: true });
  }),
);

module.exports = { notificationsRouter: router };
