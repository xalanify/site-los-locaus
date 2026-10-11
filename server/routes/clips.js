const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../database');
const { requireUser, requireUserOrAdmin, attachAuth } = require('../middleware/auth');
const storage = require('../storage');
const { CLIP_GAME_IDS } = require('../clipGames');
const { notify } = require('../notify');
const { disponivel, transcodificar } = require('../transcode');

const router = express.Router();

const BUCKET = 'clips';

/* Tamanho máximo de um clip.
   O Supabase Storage tem limite próprio (por omissão 50 MB) — se
   aumentares no dashboard, sobe aqui também (CLIP_MAX_MB no .env). */
const MAX_MB = Math.max(1, Number(process.env.CLIP_MAX_MB) || 50);
const MAX_BYTES = MAX_MB * 1024 * 1024;
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

/* ============================================================
   Otimização em segundo plano (720p H.264)

   O clip já está publicado com o original; depois, sem o utilizador
   ficar à espera, busca-se o vídeo, comprime-se e substitui-se no
   mesmo caminho. Se falhar (ou não houver ffmpeg) fica tudo como
   estava — nunca é bloqueio.
   ============================================================ */
function otimizarClip(file) {
  if (!disponivel() || !file) return;
  setImmediate(async () => {
    try {
      const r = await fetch(storage.publicUrl(BUCKET, file));
      if (!r.ok) return;
      const original = Buffer.from(await r.arrayBuffer());
      const novo = await transcodificar(original);
      if (!novo) return;
      await storage.upload(BUCKET, file, novo, 'video/mp4');
      const mb = (n) => Math.round((n / 1048576) * 10) / 10;
      console.log(`Clip otimizado ${file}: ${mb(original)}MB -> ${mb(novo)}MB (720p H.264)`);
    } catch (erro) {
      console.warn('Otimização de vídeo saltou:', String(erro.message).slice(0, 160));
    }
  });
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
    views: Number(c.views) || 0,
    comments_count: countBy.get(Number(c.id)) || 0,
    author: c.username || '???',
    author_id: Number(c.user_id),
    // foto de perfil do autor (Supabase) — sem ela o cartão mostra só as iniciais
    author_avatar: c.author_avatar || null,
    mine: !!(uid && Number(c.user_id) === uid),
    liked: !!(uid && likedSet.has(Number(c.id))),
    saved: !!(uid && savedSet.has(Number(c.id))),
    created_at: c.created_at,
  }));
}

const SELECT_SQL = `
  SELECT c.*, u.username, up.avatar_url AS author_avatar
  FROM clips c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN user_profiles up ON up.user_id = c.user_id
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

    // Paginação opcional: quem pede ?limit= recebe só uma página
    const limit = req.query.limit
      ? Math.min(200, Math.max(1, Number(req.query.limit) || 1))
      : 100;
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const sql =
      SELECT_SQL +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?';
    const rows = await db.prepare(sql).all(...params, limit, offset);
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

// Tamanho máximo de um clip (o cliente usa para mostrar os MB e cortar)
router.get('/limits', (req, res) => {
  res.json({ maxMB: MAX_MB });
});

/* ============================================================
   Subida direta ao Supabase: o browser pede a URL de subida
   assinada, sobe o vídeo sozinho e só depois o servidor guarda
   a linha na BD. Assim os vídeos não passam pelo servidor (no
   Vercel os corpos grandes são cortados) e o limite de tamanho
   deixa de ser o do servidor — fica o do Supabase.
   ============================================================ */
function metaFromQuery(q) {
  const visibility = q.visibility === 'private' ? 'private' : 'public';
  const start = Math.max(0, Number(q.start) || 0);
  let end =
    q.end === undefined || q.end === null || q.end === '' || q.end === 'null'
      ? null
      : Number(q.end);
  if (end != null && (!Number.isFinite(end) || end <= start)) end = null;
  return { visibility, start, end };
}

router.post('/upload-url', requireUserOrAdmin, async (req, res) => {
  try {
    const title = String(req.query.title || '').trim().slice(0, 100);
    if (!title) return res.status(400).json({ error: 'Título em falta' });

    const game = String(req.query.game || '').trim().toLowerCase();
    if (!CLIP_GAME_IDS.has(game)) {
      return res.status(400).json({ error: 'Escolhe o jogo do clip.' });
    }

    const ct = String(req.query.type || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const ext = EXT_BY_TYPE[ct];
    if (!ext) {
      return res.status(415).json({ error: 'Formato não suportado — usa MP4, WebM ou MOV.' });
    }
    if (!storage.isConfigured()) {
      return res.status(503).json({ error: 'Storage por configurar.' });
    }

    const file = crypto.randomBytes(16).toString('hex') + ext;
    const uploadUrl = await storage.signedUploadUrl(BUCKET, file);
    res.json({ path: file, uploadUrl, maxMB: MAX_MB });
  } catch (error) {
    console.error('Erro clips upload-url:', error.message);
    res.status(500).json({ error: 'Não consegui preparar a subida.' });
  }
});

// Depois de o browser subir o vídeo, fica registar a linha
router.post('/confirm', requireUserOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const b = req.body || {};

    const file = String(b.file || '');
    if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/i.test(file)) {
      return res.status(400).json({ error: 'Ficheiro inválido.' });
    }
    const title = String(b.title || '').trim().slice(0, 100);
    if (!title) return res.status(400).json({ error: 'Título em falta' });

    const game = String(b.game || '').trim().toLowerCase();
    if (!CLIP_GAME_IDS.has(game)) {
      return res.status(400).json({ error: 'Escolhe o jogo do clip.' });
    }

    // o vídeo tem mesmo de estar no Storage (e dentro do limite)
    const url = storage.publicUrl(BUCKET, file);
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) {
      return res.status(400).json({ error: 'O vídeo não chegou ao Supabase — tenta outra vez.' });
    }
    const bytes = Number(head.headers.get('content-length') || 0);
    if (bytes > MAX_BYTES) {
      storage.remove(BUCKET, file).catch(() => {});
      return res.status(413).json({ error: `Vídeo demasiado grande (máx. ${MAX_MB} MB).` });
    }

    let uid = req.auth && req.auth.uid;
    if (!uid && req.auth && req.auth.admin) uid = (await ensureAdminUser(db)).id;
    if (!uid) return res.status(401).json({ error: 'Inicia sessão para continuares' });

    const meta = metaFromQuery(b);
    const result = await db
      .prepare(
        'INSERT INTO clips (user_id, title, game, file, start_sec, end_sec, visibility) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      )
      .run(uid, title, game, file, meta.start, meta.end, meta.visibility);

    const row = await db
      .prepare(SELECT_SQL + ' WHERE c.id = ?')
      .get(Number(result.lastInsertRowid));
    if (!row) return res.status(500).json({ error: 'Erro ao guardar o clip' });
    res.json((await decorate(db, [row], req.auth))[0]);
    // em segundo plano: passa a 720p H.264 (pesa menos no telemóvel)
    otimizarClip(file);
  } catch (error) {
    console.error('Erro clips confirm:', error.message);
    res.status(500).json({ error: 'Erro ao guardar o clip.' });
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
        return res.status(413).json({ error: `Vídeo demasiado grande (máx. ${MAX_MB} MB).` });
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
      // em segundo plano: passa a 720p H.264 (pesa menos no telemóvel)
      otimizarClip(file);
    } catch (error) {
      console.error('Erro clips POST:', error.message);
      if (/413|EntityTooLarge|maximum allowed|Payload too large/i.test(error.message || '')) {
        return res
          .status(413)
          .json({ error: `O vídeo não passou — o limite é de ${MAX_MB} MB. Corta o vídeo.` });
      }
      res.status(500).json({ error: 'Erro ao guardar o clip.' });
    }
  },
);

// Erros próprios deste router (ex.: vídeo acima do limite)
router.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: `Vídeo demasiado grande (máx. ${MAX_MB} MB).` });
  }
  next(err);
});

// Gosto (toggle) — exige conta
router.post('/:id/like', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT id, user_id, title FROM clips WHERE id = ?').get(id);
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
      // avisa o dono do clip (sino + push)
      notify({
        userId: Number(clip.user_id),
        actorId: req.auth.uid,
        type: 'like',
        entity: 'clip',
        entityId: id,
        title: `${req.auth.username} gostou do teu clip`,
        body: clip.title,
        link: `/clips?clip=${id}`,
      }).catch(() => {});
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

/* Contador de visualizações — o cliente soma uma vista por clip e
   por sessão, para não inflar com os refresh nem com os pedidos de
   range do próprio <video>. */
router.post('/:id/view', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Id inválido' });
    const clip = await db.prepare('SELECT id FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });
    await db.prepare('UPDATE clips SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(id);
    const after = await db.prepare('SELECT views FROM clips WHERE id = ?').get(id);
    res.json({ views: Number(after.views) || 0 });
  } catch (error) {
    console.error('Erro clip view:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/* Comentários (com respostas) — paginados pelos de topo, para que
   as respostas continuem sempre junto do comentário pai.
   Sem ?limit devolve todos (como dantes). */
router.get('/:id/comments', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    const limite = req.query.limit
      ? Math.min(50, Math.max(1, Number(req.query.limit) || 20))
      : 0;
    const offset = Math.max(0, Number(req.query.offset) || 0);

    let cond = 'cc.clip_id = ?';
    let args = [id];
    if (limite) {
      const tops = await db
        .prepare(
          'SELECT id FROM clip_comments WHERE clip_id = ? AND parent_id IS NULL ' +
            'ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?',
        )
        .all(id, limite, offset);
      const ids = tops.map((r) => Number(r.id));
      if (!ids.length) return res.json([]);
      // as respostas vão buscar-se todas (as threads nunca ficam cortadas)
      cond = '(cc.parent_id = ANY(?::int[]) OR cc.id = ANY(?::int[]))';
      args = [ids, ids];
    }

    const rows = await db
      .prepare(
        `SELECT cc.id, cc.parent_id, cc.content, cc.created_at, cc.user_id, u.username,
                up.avatar_url AS author_avatar,
                (SELECT COUNT(*) FROM comment_likes cl
                   WHERE cl.comment_id = cc.id AND cl.kind = 'clip')::int AS likes,
                EXISTS(SELECT 1 FROM comment_likes cl
                   WHERE cl.comment_id = cc.id AND cl.kind = 'clip'
                     AND cl.user_id = ?) AS liked
         FROM clip_comments cc JOIN users u ON u.id = cc.user_id
         LEFT JOIN user_profiles up ON up.user_id = cc.user_id
         WHERE ${cond} ORDER BY cc.created_at ASC, cc.id ASC`,
      )
      .all((req.auth && req.auth.uid) || 0, ...args);
    const auth = req.auth;
    res.json(
      rows.map((c) => ({
        id: Number(c.id),
        parent_id: c.parent_id == null ? null : Number(c.parent_id),
        content: c.content,
        created_at: c.created_at,
        author: c.username,
        author_avatar: c.author_avatar || null,
        likes: Number(c.likes) || 0,
        liked: !!c.liked,
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

    // Avisa o dono do clip (ou a quem se respondeu)
    let alvoId = Number(clip.user_id);
    if (parentId) {
      const pai = await db
        .prepare('SELECT user_id FROM clip_comments WHERE id = ?')
        .get(parentId);
      if (pai && Number(pai.user_id) !== Number(req.auth.uid)) alvoId = Number(pai.user_id);
    }
    notify({
      userId: alvoId,
      actorId: req.auth.uid,
      type: parentId ? 'reply' : 'comment',
      entity: 'clip',
      entityId: id,
      title: parentId
        ? `${req.auth.username} respondeu ao teu comentário`
        : `${req.auth.username} comentou no teu clip`,
      body: content.slice(0, 140),
      link: '/clips',
    }).catch(() => {});

    const row = await db
      .prepare(
        `SELECT cc.id, cc.parent_id, cc.content, cc.created_at, cc.user_id, u.username,
                up.avatar_url AS author_avatar
         FROM clip_comments cc JOIN users u ON u.id = cc.user_id
         LEFT JOIN user_profiles up ON up.user_id = cc.user_id
         WHERE cc.id = ?`,
      )
      .get(Number(result.lastInsertRowid));
    res.json({
      id: Number(row.id),
      parent_id: row.parent_id == null ? null : Number(row.parent_id),
      content: row.content,
      created_at: row.created_at,
      author: row.username,
      author_avatar: row.author_avatar || null,
      likes: 0,
      liked: false,
      deletable: true,
    });
  } catch (error) {
    console.error('Erro clip comment POST:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Gosto num comentário (toggle) — exige conta
router.post('/:id/comments/:commentId/like', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId) || commentId <= 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    const c = await db
      .prepare('SELECT id, clip_id, user_id, content FROM clip_comments WHERE id = ?')
      .get(commentId);
    if (!c || Number(c.clip_id) !== Number(req.params.id)) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    const uid = req.auth.uid;
    const has = await db
      .prepare(
        "SELECT 1 FROM comment_likes WHERE comment_id = ? AND kind = 'clip' AND user_id = ?",
      )
      .get(commentId, uid);
    if (has) {
      await db
        .prepare(
          "DELETE FROM comment_likes WHERE comment_id = ? AND kind = 'clip' AND user_id = ?",
        )
        .run(commentId, uid);
    } else {
      await db
        .prepare("INSERT INTO comment_likes (comment_id, kind, user_id) VALUES (?, 'clip', ?)")
        .run(commentId, uid);
      notify({
        userId: Number(c.user_id),
        actorId: uid,
        type: 'like',
        entity: 'clip',
        entityId: Number(c.clip_id),
        title: `${req.auth.username} gostou do teu comentário`,
        body: String(c.content || '').slice(0, 140),
        link: '/clips',
      }).catch(() => {});
    }
    const n = await db
      .prepare("SELECT COUNT(*) n FROM comment_likes WHERE comment_id = ? AND kind = 'clip'")
      .get(commentId);
    res.json({ liked: !has, likes: Number(n?.n || 0) });
  } catch (error) {
    console.error('Erro comment like:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Eliminar comentário (autor ou admin) — e respostas a ele
router.delete('/:id/comments/:commentId', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId) || commentId <= 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    const c = await db.prepare('SELECT id, user_id FROM clip_comments WHERE id = ?').get(commentId);
    if (!c) return res.status(404).json({ error: 'Comentário não encontrado' });
    const auth = req.auth;
    if (!auth || !(auth.admin || (auth.uid && Number(c.user_id) === auth.uid))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }
    // apaga os gostos do comentário e das respostas primeiro
    await db
      .prepare(
        `DELETE FROM comment_likes WHERE kind = 'clip' AND comment_id IN
           (SELECT id FROM clip_comments WHERE id = ? OR parent_id = ?)`,
      )
      .run(commentId, commentId);
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
/* Editar um clip (título, jogo e visibilidade) — só o dono ou o admin */
router.patch('/:id', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });

    const auth = req.auth;
    if (!auth || !(auth.admin || (auth.uid && Number(clip.user_id) === auth.uid))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }

    const b = req.body || {};
    const title =
      b.title === undefined ? clip.title : String(b.title).trim().slice(0, 100);
    if (!title) return res.status(400).json({ error: 'Título em falta' });

    // o jogo só é validado quando é enviado (há clips antigos sem jogo)
    let game = clip.game;
    if (b.game !== undefined) {
      game = String(b.game).trim().toLowerCase();
      if (!CLIP_GAME_IDS.has(game)) {
        return res.status(400).json({ error: 'Escolhe um jogo válido.' });
      }
    }

    const visibility =
      b.visibility === undefined
        ? clip.visibility
        : b.visibility === 'private'
          ? 'private'
          : 'public';

    await db
      .prepare('UPDATE clips SET title = ?, game = ?, visibility = ? WHERE id = ?')
      .run(title, game, visibility, id);

    const row = await db.prepare(SELECT_SQL + ' WHERE c.id = ?').get(id);
    if (!row) return res.status(500).json({ error: 'Erro ao guardar' });
    res.json((await decorate(db, [row], auth))[0]);
  } catch (error) {
    console.error('Erro clip PATCH:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

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
