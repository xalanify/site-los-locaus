const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../database');
const { requireUser, requireUserOrAdmin, attachAuth } = require('../middleware/auth');
const storage = require('../storage');
const { CLIP_GAME_IDS } = require('../clipGames');

const router = express.Router();

const BUCKET = 'clips';

const MAX_BYTES = 150 * 1024 * 1024; // 150 MB (o Vercel corta aos 4,5 MB — ver nota)
const EXT_BY_TYPE = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
};

// Um clip privado só é visível ao dono (e ao admin)
function canSee(clip, auth) {
  if (clip.visibility === 'public') return true;
  if (auth && auth.admin) return true;
  return !!(auth && auth.uid && Number(clip.user_id) === auth.uid);
}

// URL de leitura do vídeo: público -> link público; privado -> temporário
function clipUrl(clip) {
  if (clip.visibility === 'public') return storage.publicUrl(BUCKET, clip.file);
  try {
    // Sincronizar a assinatura custaria uma volta extra por clip; usamos o
    // público apenas quando o bucket é público. Para privados servimos via API.
    return `/api/clips/${clip.id}/stream`;
  } catch {
    return storage.publicUrl(BUCKET, clip.file);
  }
}

// Forma canónica de um clip na API (uma só passagem por tabela)
async function decorate(db, rows, auth) {
  const visible = rows.filter((c) => canSee(c, auth));
  if (!visible.length) return [];

  const ids = visible.map((c) => Number(c.id));
  const uid = auth && auth.uid;

  const [counts, liked, saved] = await Promise.all([
    db
      .prepare(
        'SELECT clip_id, COUNT(*)::int AS n FROM clip_comments WHERE clip_id = ANY(?::int[]) GROUP BY clip_id',
      )
      .all(ids),
    uid
      ? db
          .prepare(
            'SELECT DISTINCT clip_id FROM clip_likes WHERE user_id = ? AND clip_id = ANY(?::int[])',
          )
          .all(uid, ids)
      : [],
    uid
      ? db
          .prepare(
            'SELECT DISTINCT clip_id FROM clip_saves WHERE user_id = ? AND clip_id = ANY(?::int[])',
          )
          .all(uid, ids)
      : [],
  ]);

  const countBy = new Map(counts.map((r) => [Number(r.clip_id), Number(r.n)]));
  const likedSet = new Set(liked.map((r) => Number(r.clip_id)));
  const savedSet = new Set(saved.map((r) => Number(r.clip_id)));

  return visible.map((c) => ({
    id: Number(c.id),
    title: c.title,
    game: c.game || null,
    url: clipUrl(c),
    start: Number(c.start_sec) || 0,
    end: c.end_sec == null ? null : Number(c.end_sec),
    visibility: c.visibility === 'private' ? 'private' : 'public',
    likes: Number(c.likes) || 0,
    saves: Number(c.saves) || 0,
    downloads: Number(c.downloads) || 0,
    comments_count: countBy.get(Number(c.id)) || 0,
    author: c.username || '???',
    author_id: Number(c.user_id),
    mine: !!(uid && Number(c.user_id) === uid),
    liked: !!(uid && likedSet.has(Number(c.id))),
    saved: !!(uid && savedSet.has(Number(c.id))),
    created_at: c.created_at,
  }));
}

const SELECT_SQL = `
  SELECT c.*, u.username FROM clips c
  JOIN users u ON u.id = c.user_id
`;

// Conta interna usada quando o ADMIN publica um clip de teste.
// O nome 'admin' é reservado e o hash começa com '!' por isso
// a conta nunca consegue entrar como utilizador.
async function ensureAdminUser(db) {
  const existing = await db
    .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
    .get('admin');
  if (existing) return existing;
  const result = await db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id')
    .run('admin', '!' + crypto.randomBytes(24).toString('hex'));
  return { id: Number(result.lastInsertRowid) };
}

// Lista de clips (públicos + os meus; guardados/meus/filtro de utilizador)
router.get('/', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const auth = req.auth;
    const where = [];
    const params = [];

    if (auth && auth.admin) {
      // vê tudo
    } else if (auth && auth.uid) {
      where.push("(c.visibility = 'public' OR c.user_id = ?)");
      params.push(auth.uid);
    } else {
      where.push("c.visibility = 'public'");
    }

    if (req.query.mine === '1') {
      if (!auth || !auth.uid) return res.status(401).json({ error: 'Inicia sessão' });
      where.push('c.user_id = ?');
      params.push(auth.uid);
    }
    if (req.query.saved === '1') {
      if (!auth || !auth.uid) return res.status(401).json({ error: 'Inicia sessão' });
      where.push(
        'EXISTS (SELECT 1 FROM clip_saves s WHERE s.clip_id = c.id AND s.user_id = ?)',
      );
      params.push(auth.uid);
    }
    if (req.query.user) {
      where.push('LOWER(u.username) = ?');
      params.push(String(req.query.user).toLowerCase().slice(0, 30));
    }
    if (req.query.game) {
      where.push('c.game = ?');
      params.push(String(req.query.game).toLowerCase().slice(0, 20));
    }

    const sql =
      SELECT_SQL +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY c.created_at DESC, c.id DESC LIMIT 100';
    const rows = await db.prepare(sql).all(...params);
    res.json(await decorate(db, rows, auth));
  } catch (error) {
    console.error('Erro clips GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Último clip público — é o que aparece na página inicial
router.get('/latest', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const row = await db
      .prepare(
        SELECT_SQL + " WHERE c.visibility = 'public' ORDER BY c.created_at DESC, c.id DESC LIMIT 1",
      )
      .get();
    if (!row) return res.json(null);
    const list = await decorate(db, [row], req.auth);
    res.json(list[0] || null);
  } catch (error) {
    console.error('Erro clips latest:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Streaming/redirecionamento de um clip privado
router.get('/:id/stream', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });
    res.redirect(storage.publicUrl(BUCKET, clip.file));
  } catch (error) {
    console.error('Erro clip stream:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Publicar um clip (o corpo do pedido É o vídeo; metadados na query)
router.post(
  '/',
  requireUserOrAdmin,
  express.raw({ type: 'video/*', limit: MAX_BYTES }),
  async (req, res) => {
    try {
      const db = getDb();

      // Metadados primeiro (assim o erro certo chega antes do vídeo)
      const title = String(req.query.title || '').trim().slice(0, 100);
      if (!title) return res.status(400).json({ error: 'Título em falta' });

      // Jogo do clip — obrigatório (lista fechada)
      const game = String(req.query.game || '').trim().toLowerCase();
      if (!CLIP_GAME_IDS.has(game)) {
        return res.status(400).json({ error: 'Escolhe o jogo do clip.' });
      }

      const ct = String(req.headers['content-type'] || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const ext = EXT_BY_TYPE[ct];
      if (!ext) {
        return res
          .status(415)
          .json({ error: 'Formato não suportado — usa MP4, WebM ou MOV.' });
      }
      if (!req.body || !req.body.length) {
        return res.status(400).json({ error: 'Vídeo em falta' });
      }
      if (req.body.length > MAX_BYTES) {
        return res.status(413).json({ error: 'Vídeo demasiado grande (máx. 150 MB).' });
      }

      // utilizador normal → o próprio; admin → conta interna "admin"
      let uid = req.auth && req.auth.uid;
      if (!uid && req.auth && req.auth.admin) uid = (await ensureAdminUser(db)).id;
      if (!uid) return res.status(401).json({ error: 'Inicia sessão para continuares' });

      const visibility = req.query.visibility === 'private' ? 'private' : 'public';
      const start = Math.max(0, Number(req.query.start) || 0);
      let end =
        req.query.end === undefined || req.query.end === '' || req.query.end === 'null'
          ? null
          : Number(req.query.end);
      if (end != null && (!Number.isFinite(end) || end <= start)) end = null;

      const file = crypto.randomBytes(16).toString('hex') + ext;
      // Vai para o Storage, não para o disco (o Vercel não tem disco)
      await storage.upload(BUCKET, file, req.body, ct);

      const result = await db
        .prepare(
          'INSERT INTO clips (user_id, title, game, file, start_sec, end_sec, visibility) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
        )
        .run(uid, title, game, file, start, end, visibility);

      const row = await db
        .prepare(SELECT_SQL + ' WHERE c.id = ?')
        .get(Number(result.lastInsertRowid));
      if (!row) return res.status(500).json({ error: 'Erro ao guardar o clip' });
      res.json((await decorate(db, [row], req.auth))[0]);
    } catch (error) {
      console.error('Erro clips POST:', error.message);
      res.status(500).json({ error: 'Erro ao guardar o clip.' });
    }
  },
);

// Erros próprios deste router (ex.: vídeo acima do limite)
router.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Vídeo demasiado grande (máx. 150 MB).' });
  }
  next(err);
});

// Gosto (toggle) — exige conta
router.post('/:id/like', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT id FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });

    const has = await db
      .prepare('SELECT 1 FROM clip_likes WHERE clip_id = ? AND user_id = ?')
      .get(id, req.auth.uid);
    if (has) {
      await db.prepare('DELETE FROM clip_likes WHERE clip_id = ? AND user_id = ?').run(id, req.auth.uid);
      await db.prepare('UPDATE clips SET likes = GREATEST(0, likes - 1) WHERE id = ?').run(id);
    } else {
      await db.prepare('INSERT INTO clip_likes (clip_id, user_id) VALUES (?, ?)').run(id, req.auth.uid);
      await db.prepare('UPDATE clips SET likes = likes + 1 WHERE id = ?').run(id);
    }
    const after = await db.prepare('SELECT likes FROM clips WHERE id = ?').get(id);
    res.json({ liked: !has, likes: Number(after.likes) || 0 });
  } catch (error) {
    console.error('Erro clip like:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Guardar (toggle) — exige conta
router.post('/:id/save', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT id FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });

    const has = await db
      .prepare('SELECT 1 FROM clip_saves WHERE clip_id = ? AND user_id = ?')
      .get(id, req.auth.uid);
    if (has) {
      await db.prepare('DELETE FROM clip_saves WHERE clip_id = ? AND user_id = ?').run(id, req.auth.uid);
      await db.prepare('UPDATE clips SET saves = GREATEST(0, saves - 1) WHERE id = ?').run(id);
    } else {
      await db.prepare('INSERT INTO clip_saves (clip_id, user_id) VALUES (?, ?)').run(id, req.auth.uid);
      await db.prepare('UPDATE clips SET saves = saves + 1 WHERE id = ?').run(id);
    }
    const after = await db.prepare('SELECT saves FROM clips WHERE id = ?').get(id);
    res.json({ saved: !has, saves: Number(after.saves) || 0 });
  } catch (error) {
    console.error('Erro clip save:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Comentários (com respostas)
router.get('/:id/comments', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    const rows = await db
      .prepare(
        `SELECT cc.id, cc.parent_id, cc.content, cc.created_at, cc.user_id, u.username
         FROM clip_comments cc JOIN users u ON u.id = cc.user_id
         WHERE cc.clip_id = ? ORDER BY cc.created_at ASC, cc.id ASC`,
      )
      .all(id);
    const auth = req.auth;
    res.json(
      rows.map((c) => ({
        id: Number(c.id),
        parent_id: c.parent_id == null ? null : Number(c.parent_id),
        content: c.content,
        created_at: c.created_at,
        author: c.username,
        deletable: !!(auth && (auth.admin || (auth.uid && Number(c.user_id) === auth.uid))),
      })),
    );
  } catch (error) {
    console.error('Erro clip comments GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/:id/comments', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    const content = String(req.body.content || '').trim().slice(0, 1000);
    if (!content) return res.status(400).json({ error: 'Comentário vazio' });

    let parentId = null;
    if (req.body.parent_id != null && req.body.parent_id !== '') {
      const p = Number(req.body.parent_id);
      const parent = await db
        .prepare('SELECT id, clip_id FROM clip_comments WHERE id = ?')
        .get(p);
      if (!parent || Number(parent.clip_id) !== id) {
        return res.status(400).json({ error: 'Comentário pai inválido' });
      }
      parentId = p;
    }

    const result = await db
      .prepare(
        'INSERT INTO clip_comments (clip_id, user_id, parent_id, content) VALUES (?, ?, ?, ?) RETURNING id',
      )
      .run(id, req.auth.uid, parentId, content);
    const row = await db
      .prepare(
        `SELECT cc.id, cc.parent_id, cc.content, cc.created_at, cc.user_id, u.username
         FROM clip_comments cc JOIN users u ON u.id = cc.user_id WHERE cc.id = ?`,
      )
      .get(Number(result.lastInsertRowid));
    res.json({
      id: Number(row.id),
      parent_id: row.parent_id == null ? null : Number(row.parent_id),
      content: row.content,
      created_at: row.created_at,
      author: row.username,
      deletable: true,
    });
  } catch (error) {
    console.error('Erro clip comment POST:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Eliminar comentário (autor ou admin) — e respostas a ele
router.delete('/:id/comments/:commentId', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const commentId = Number(req.params.commentId);
    const c = await db.prepare('SELECT id, user_id FROM clip_comments WHERE id = ?').get(commentId);
    if (!c) return res.status(404).json({ error: 'Comentário não encontrado' });
    const auth = req.auth;
    if (!auth || !(auth.admin || (auth.uid && Number(c.user_id) === auth.uid))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }
    await db.prepare('DELETE FROM clip_comments WHERE id = ? OR parent_id = ?').run(commentId, commentId);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro clip comment DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Transferir o vídeo original (conta para downloads)
router.get('/:id/download', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    await db.prepare('UPDATE clips SET downloads = downloads + 1 WHERE id = ?').run(id);
    const safe = String(clip.title || 'clip')
      .replace(/[^\p{L}\p{N} _-]/gu, '_')
      .slice(0, 60);
    // Em vez de passar o vídeo pela função, mandamos o browser para o Storage
    res.redirect(storage.publicUrl(BUCKET, clip.file));
    void safe;
  } catch (error) {
    console.error('Erro clip download:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Eliminar clip (dono ou admin) — e ficheiro
router.delete('/:id', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    const auth = req.auth;
    if (!auth || !(auth.admin || (auth.uid && Number(clip.user_id) === auth.uid))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }

    await db.prepare('DELETE FROM clip_likes WHERE clip_id = ?').run(id);
    await db.prepare('DELETE FROM clip_saves WHERE clip_id = ?').run(id);
    await db.prepare('DELETE FROM clip_comments WHERE clip_id = ?').run(id);
    await db.prepare('DELETE FROM clips WHERE id = ?').run(id);
    storage.remove(BUCKET, clip.file).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error('Erro clip DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { clipsRouter: router, decorateClips: decorate };
