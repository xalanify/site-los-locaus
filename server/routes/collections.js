// ============================================================
//  Coleções de clips — pastas próprias sobre os guardados
//
//    GET    /mine         -> as minhas coleções (contagem)
//    POST   /             -> criar  { name }
//    DELETE /:id          -> apagar
//    POST   /:id/items    -> meter clip na coleção { clip_id }
//    DELETE /:id/items/:clipId -> tirar o clip
//
//  Os clips de uma coleção pedem-se depois em
//  GET /api/clips?collection=<id> (mesma lista de sempre).
// ============================================================
const express = require('express');
const { getDb } = require('../database');
const { requireUser } = require('../middleware/auth');

const router = express.Router();
const MAX_COLECOES = 30;

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('coleções:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

router.get(
  '/mine',
  requireUser,
  safe(async (req, res) => {
    const rows = await getDb()
      .prepare(
        `SELECT c.id, c.name, c.created_at,
                COUNT(i.clip_id)::int AS n
         FROM clip_collections c
         LEFT JOIN clip_collection_items i ON i.collection_id = c.id
         WHERE c.user_id = ?
         GROUP BY c.id, c.name, c.created_at
         ORDER BY c.created_at ASC`,
      )
      .all(req.auth.uid);
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        n: Number(r.n),
        created_at: r.created_at,
      })),
    );
  }),
);

router.post(
  '/',
  requireUser,
  safe(async (req, res) => {
    const name = String(req.body?.name || '')
      .trim()
      .slice(0, 40);
    if (!name) return res.status(400).json({ error: 'Dá um nome à coleção' });

    const db = getDb();
    const n = await db
      .prepare('SELECT COUNT(*) n FROM clip_collections WHERE user_id = ?')
      .get(req.auth.uid);
    if (Number(n?.n || 0) >= MAX_COLECOES) {
      return res.status(400).json({ error: `Máximo de ${MAX_COLECOES} coleções` });
    }
    const dup = await db
      .prepare('SELECT id FROM clip_collections WHERE user_id = ? AND LOWER(name) = LOWER(?)')
      .get(req.auth.uid, name);
    if (dup) return res.status(409).json({ error: 'Já tens uma coleção com esse nome' });

    const r = await db
      .prepare('INSERT INTO clip_collections (user_id, name) VALUES (?, ?) RETURNING id')
      .run(req.auth.uid, name);
    res.json({ id: Number(r.lastInsertRowid), name, n: 0 });
  }),
);

async function minhaColecao(req, res) {
  const db = getDb();
  const col = await db
    .prepare('SELECT id, user_id FROM clip_collections WHERE id = ?')
    .get(Number(req.params.id));
  if (!col) {
    res.status(404).json({ error: 'Coleção não encontrada' });
    return null;
  }
  if (Number(col.user_id) !== req.auth.uid) {
    res.status(403).json({ error: 'Sem permissões' });
    return null;
  }
  return col;
}

/** Coleções do utilizador para um clip (com o que já o contém). */
router.get(
  '/for-clip',
  requireUser,
  safe(async (req, res) => {
    const clipId = Number(req.query.clip_id);
    if (!clipId) return res.status(400).json({ error: 'Clip inválido' });
    const rows = await getDb()
      .prepare(
        `SELECT c.id, c.name, (i.clip_id IS NOT NULL) AS dentro
         FROM clip_collections c
         LEFT JOIN clip_collection_items i
                ON i.collection_id = c.id AND i.clip_id = ?
         WHERE c.user_id = ?
         ORDER BY c.created_at ASC`,
      )
      .all(clipId, req.auth.uid);
    res.json(
      rows.map((r) => ({ id: Number(r.id), name: r.name, dentro: !!r.dentro })),
    );
  }),
);

router.delete(
  '/:id',
  requireUser,
  safe(async (req, res) => {
    const col = await minhaColecao(req, res);
    if (!col) return;
    await getDb().prepare('DELETE FROM clip_collections WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/items',
  requireUser,
  safe(async (req, res) => {
    const col = await minhaColecao(req, res);
    if (!col) return;
    const clipId = Number(req.body?.clip_id);
    if (!clipId) return res.status(400).json({ error: 'Clip inválido' });

    const db = getDb();
    const clip = await db.prepare('SELECT id FROM clips WHERE id = ?').get(clipId);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });

    await db
      .prepare(
        `INSERT INTO clip_collection_items (collection_id, clip_id) VALUES (?, ?)
         ON CONFLICT DO NOTHING`,
      )
      .run(Number(req.params.id), clipId);
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id/items/:clipId',
  requireUser,
  safe(async (req, res) => {
    const col = await minhaColecao(req, res);
    if (!col) return;
    await getDb()
      .prepare('DELETE FROM clip_collection_items WHERE collection_id = ? AND clip_id = ?')
      .run(Number(req.params.id), Number(req.params.clipId));
    res.json({ ok: true });
  }),
);

module.exports = { collectionsRouter: router };
