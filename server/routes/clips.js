const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb } = require('../database');
const { requireUser, requireUserOrAdmin, attachAuth } = require('../middleware/auth');

const router = express.Router();

const CLIPS_DIR = path.join(__dirname, '..', 'data', 'clips');
try {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
} catch (e) {
  console.error('Erro ao criar pasta de clips:', e.message);
}

const MAX_BYTES = 150 * 1024 * 1024; // 150 MB
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

// Forma canónica de um clip na API
function decorate(db, rows, auth) {
  const cntStmt = db.prepare(
    'SELECT COUNT(*) AS n FROM clip_comments WHERE clip_id = ?',
  );
  const likedStmt = db.prepare(
    'SELECT 1 FROM clip_likes WHERE clip_id = ? AND user_id = ?',
  );
  const savedStmt = db.prepare(
    'SELECT 1 FROM clip_saves WHERE clip_id = ? AND user_id = ?',
  );

  return rows.filter((c) => canSee(c, auth)).map((c) => ({
    id: Number(c.id),
    title: c.title,
    url: '/clips/' + c.file,
    start: Number(c.start_sec) || 0,
    end: c.end_sec == null ? null : Number(c.end_sec),
    visibility: c.visibility === 'private' ? 'private' : 'public',
    likes: Number(c.likes) || 0,
    saves: Number(c.saves) || 0,
    downloads: Number(c.downloads) || 0,
    comments_count: Number((cntStmt.get(Number(c.id)) || {}).n) || 0,
    author: c.username || '???',
    author_id: Number(c.user_id),
    mine: !!(auth && auth.uid && Number(c.user_id) === auth.uid),
    liked: !!(auth && auth.uid && likedStmt.get(Number(c.id), auth.uid)),
    saved: !!(auth && auth.uid && savedStmt.get(Number(c.id), auth.uid)),
    created_at: c.created_at,
  }));
}

const SELECT_SQL = `
  SELECT c.*, u.username FROM clips c
  JOIN users u ON u.id = c.user_id
`;

// Conta interna usada quando o ADMIN publica um clip de teste.
// O nome 'admin' é reservado (ninguém o pode registar) e o hash começa
// com '!' por isso a conta nunca consegue entrar como utilizador.
function ensureAdminUser(db) {
  const existing = db
    .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
    .get('admin');
  if (existing) return existing;
  const result = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run('admin', '!' + crypto.randomBytes(24).toString('hex'));
  return { id: Number(result.lastInsertRowid) };
}

// Lista de clips (públicos + os meus; guardados/meus/filtro de utilizador)
router.get('/', attachAuth, (req, res) => {
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

    const sql =
      SELECT_SQL +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY c.created_at DESC, c.id DESC LIMIT 100';
    const rows = db.prepare(sql).all(...params);
    res.json(decorate(db, rows, auth));
  } catch (error) {
    console.error('Erro clips GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Último clip público — é o que aparece na página inicial
router.get('/latest', attachAuth, (req, res) => {
  try {
    const db = getDb();
    const row = db
      .prepare(
        SELECT_SQL + " WHERE c.visibility = 'public' ORDER BY c.created_at DESC, c.id DESC LIMIT 1",
      )
      .get();
    if (!row) return res.json(null);
    const list = decorate(db, [row], req.auth);
    res.json(list[0] || null);
  } catch (error) {
    console.error('Erro clips latest:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Publicar um clip (o corpo do pedido É o vídeo; metadados na query)
// Aceita conta de utilizador ou sessão de admin (clips de teste no painel)
router.post(
  '/',
  requireUserOrAdmin,
  express.raw({ type: 'video/*', limit: MAX_BYTES }),
  async (req, res) => {
    try {
      const db = getDb();
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

      const title = String(req.query.title || '').trim().slice(0, 100);
      if (!title) return res.status(400).json({ error: 'Título em falta' });

      // utilizador normal → o próprio; admin → conta interna "admin"
      let uid = req.auth && req.auth.uid;
      if (!uid && req.auth && req.auth.admin) uid = ensureAdminUser(db).id;
      if (!uid) return res.status(401).json({ error: 'Inicia sessão para continuares' });

      const visibility = req.query.visibility === 'private' ? 'private' : 'public';
      const start = Math.max(0, Number(req.query.start) || 0);
      let end =
        req.query.end === undefined || req.query.end === '' || req.query.end === 'null'
          ? null
          : Number(req.query.end);
      if (end != null && (!Number.isFinite(end) || end <= start)) end = null;

      const file = crypto.randomBytes(16).toString('hex') + ext;
      await fs.promises.writeFile(path.join(CLIPS_DIR, file), req.body);

      const result = db
        .prepare(
          'INSERT INTO clips (user_id, title, file, start_sec, end_sec, visibility) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(uid, title, file, start, end, visibility);

      const row = db
        .prepare(SELECT_SQL + ' WHERE c.id = ?')
        .get(Number(result.lastInsertRowid));
      if (!row) return res.status(500).json({ error: 'Erro ao guardar o clip' });
      res.json(decorate(db, [row], req.auth)[0]);
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
router.post('/:id/like', requireUser, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = db.prepare('SELECT id FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });

    const has = db
      .prepare('SELECT 1 FROM clip_likes WHERE clip_id = ? AND user_id = ?')
      .get(id, req.auth.uid);
    if (has) {
      db.prepare('DELETE FROM clip_likes WHERE clip_id = ? AND user_id = ?').run(id, req.auth.uid);
      db.prepare('UPDATE clips SET likes = MAX(0, likes - 1) WHERE id = ?').run(id);
    } else {
      db.prepare('INSERT INTO clip_likes (clip_id, user_id) VALUES (?, ?)').run(id, req.auth.uid);
      db.prepare('UPDATE clips SET likes = likes + 1 WHERE id = ?').run(id);
    }
    const after = db.prepare('SELECT likes FROM clips WHERE id = ?').get(id);
    res.json({ liked: !has, likes: Number(after.likes) || 0 });
  } catch (error) {
    console.error('Erro clip like:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Guardar (toggle) — exige conta
router.post('/:id/save', requireUser, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = db.prepare('SELECT id FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });

    const has = db
      .prepare('SELECT 1 FROM clip_saves WHERE clip_id = ? AND user_id = ?')
      .get(id, req.auth.uid);
    if (has) {
      db.prepare('DELETE FROM clip_saves WHERE clip_id = ? AND user_id = ?').run(id, req.auth.uid);
      db.prepare('UPDATE clips SET saves = MAX(0, saves - 1) WHERE id = ?').run(id);
    } else {
      db.prepare('INSERT INTO clip_saves (clip_id, user_id) VALUES (?, ?)').run(id, req.auth.uid);
      db.prepare('UPDATE clips SET saves = saves + 1 WHERE id = ?').run(id);
    }
    const after = db.prepare('SELECT saves FROM clips WHERE id = ?').get(id);
    res.json({ saved: !has, saves: Number(after.saves) || 0 });
  } catch (error) {
    console.error('Erro clip save:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Comentários (com respostas)
router.get('/:id/comments', attachAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    const rows = db
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

router.post('/:id/comments', requireUser, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    const content = String(req.body.content || '').trim().slice(0, 1000);
    if (!content) return res.status(400).json({ error: 'Comentário vazio' });

    let parentId = null;
    if (req.body.parent_id != null && req.body.parent_id !== '') {
      const p = Number(req.body.parent_id);
      const parent = db
        .prepare('SELECT id, clip_id FROM clip_comments WHERE id = ?')
        .get(p);
      if (!parent || Number(parent.clip_id) !== id) {
        return res.status(400).json({ error: 'Comentário pai inválido' });
      }
      parentId = p;
    }

    const result = db
      .prepare('INSERT INTO clip_comments (clip_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)')
      .run(id, req.auth.uid, parentId, content);
    const row = db
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
router.delete('/:id/comments/:commentId', attachAuth, (req, res) => {
  try {
    const db = getDb();
    const commentId = Number(req.params.commentId);
    const c = db.prepare('SELECT id, user_id FROM clip_comments WHERE id = ?').get(commentId);
    if (!c) return res.status(404).json({ error: 'Comentário não encontrado' });
    const auth = req.auth;
    if (!auth || !(auth.admin || (auth.uid && Number(c.user_id) === auth.uid))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }
    db.prepare('DELETE FROM clip_comments WHERE id = ? OR parent_id = ?').run(commentId, commentId);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro clip comment DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Transferir o vídeo original (conta para downloads)
router.get('/:id/download', attachAuth, (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    db.prepare('UPDATE clips SET downloads = downloads + 1 WHERE id = ?').run(id);
    const safe = String(clip.title || 'clip')
      .replace(/[^\p{L}\p{N} _-]/gu, '_')
      .slice(0, 60);
    res.download(path.join(CLIPS_DIR, clip.file), safe + path.extname(clip.file));
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
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    const auth = req.auth;
    if (!auth || !(auth.admin || (auth.uid && Number(clip.user_id) === auth.uid))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }

    db.prepare('DELETE FROM clip_likes WHERE clip_id = ?').run(id);
    db.prepare('DELETE FROM clip_saves WHERE clip_id = ?').run(id);
    db.prepare('DELETE FROM clip_comments WHERE clip_id = ?').run(id);
    db.prepare('DELETE FROM clips WHERE id = ?').run(id);
    fs.promises.unlink(path.join(CLIPS_DIR, clip.file)).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error('Erro clip DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { clipsRouter: router, decorateClips: decorate };
