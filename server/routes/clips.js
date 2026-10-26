const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../database');
const { requireUser, requireUserOrAdmin, attachAuth } = require('../middleware/auth');
const storage = require('../storage');
const { CLIP_GAME_IDS } = require('../clipGames');
const { notify } = require('../notify');
const { disponivel, transcodificar } = require('../transcode');
const yt = require('../youtube');

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
// Um clip publicado no YouTube não tem ficheiro nosso — o player vem de lá.
function clipUrl(clip) {
  if (clip.youtube_id) return null;
  if (!clip.file) return null;
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
   Otimização em segundo plano (1080p H.264 + som)

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
      console.log(`Clip otimizado ${file}: ${mb(original)}MB -> ${mb(novo)}MB (1080p H.264 + som)`);
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
    // vídeo remoto (sem ficheiro no nosso storage) — o cliente monta o player
    remoto: c.youtube_id || null,
    // capa NOSSA: um frame do próprio vídeo (nunca a da plataforma)
    thumb_url: c.thumb || null,
    start: Number(c.start_sec) || 0,
    end: c.end_sec == null ? null : Number(c.end_sec),
    visibility: c.visibility === 'private' ? 'private' : 'public',
    likes: Number(c.likes) || 0,
    saves: Number(c.saves) || 0,
    downloads: Number(c.downloads) || 0,
    // Já existe uma cópia MP4 transferível (ficheiro próprio ou cópia no Storage)
    download_ready: !!(c.download_file || c.file),
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

// Um clip específico — usado quando se clica num clip enviado no chat
router.get('/:id', attachAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    const db = getDb();
    const row = await db.prepare(SELECT_SQL + ' WHERE c.id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Clip não encontrado' });
    const auth = req.auth;
    const dono = Boolean(
      auth && (auth.admin || (auth.uid && Number(auth.uid) === Number(row.user_id))),
    );
    if (row.visibility === 'private' && !dono) {
      return res.status(403).json({ error: 'Esse clip é privado.' });
    }
    res.json((await decorate(db, [row], auth))[0]);
  } catch (error) {
    console.error('Erro clip GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
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
// URL assinada para guardar a cópia MP4 que o telemóvel pode transferir
router.post('/download-url', requireUserOrAdmin, async (req, res) => {
  try {
    if (!storage.isConfigured()) {
      return res.status(503).json({ error: 'Storage por configurar.' });
    }
    const file = 'downloads/' + crypto.randomBytes(16).toString('hex') + '.mp4';
    const uploadUrl = await storage.signedUploadUrl(BUCKET, file);
    res.json({ path: file, uploadUrl, maxMB: MAX_MB });
  } catch (error) {
    console.error('Erro clips download-url:', error.message);
    res.status(500).json({ error: 'Não deu para preparar a transferência.' });
  }
});

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

/* ============================================================
   Publicação automática no YouTube (opção C)

   O vídeo vai DIRETO do browser para o YouTube (nunca passa pelo
   Vercel, que só aceita 4,5 MB). O servidor só:
     1. dá um access token curto e escolhe o contador livre;
     2. depois confere que o vídeo existe, é do nosso canal e
        ficou unlisted;
     3. guarda o ID na BD — é o único "ficheiro" que fica.

   ============================================================ */

/* O clip pode ser novo (youtube_id) — a tabela já existe, mas a
   coluna pode faltar numa BD antiga. Criamo-la à primeira vez.
   A `thumb` guarda a NOSSA capa (um frame do próprio vídeo, tirado
   no browser) — nunca a capa da plataforma. */
let colunaYT = false;
async function garantirColunaYT(db) {
  if (colunaYT) return true;
  try {
    await db.prepare('ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS youtube_id text').run();
    await db.prepare('ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS youtube_thumb text').run();
    await db.prepare('ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS thumb text').run();
    colunaYT = true;
  } catch (e) {
    console.warn('Clips (coluna) saltou:', String(e.message).slice(0, 120));
  }
  return colunaYT;
}

/* Capa nossa: o browser manda um frame do vídeo (data URL JPEG) e
   nós guardamo-lo no storage. Falhou? Segue sem capa — o cliente
   mostra um fundo nosso por omissão. */
async function guardarCapa(videoId, thumb) {
  try {
    const m = /^data:image\/(jpe?g|png|webp);base64,(.+)$/.exec(String(thumb || ''));
    if (!m) return null;
    const bin = Buffer.from(m[2], 'base64');
    if (!bin.length || bin.length > 900 * 1024) return null; // capa pesada demais
    const tipo = m[1] === 'png' ? 'image/png' : m[1] === 'webp' ? 'image/webp' : 'image/jpeg';
    const ext = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
    return await storage.upload(
      BUCKET,
      `capa_${String(videoId).replace(/[^A-Za-z0-9_-]/g, '')}.${ext}`,
      bin,
      tipo,
    );
  } catch (e) {
    console.warn('Capa do clip saltou:', String(e.message).slice(0, 120));
    return null;
  }
}

/* Anúncio automático: cada clip publicado em público aparece nos
   anúncios do site, sem ninguém ter de escrever nada. */
async function anunciarClip(db, { title, autor, capa }) {
  try {
    await db
      .prepare('INSERT INTO posts (title, content, image_url) VALUES (?, ?, ?)')
      .run(
        'Novo clip: ' + String(title || '').slice(0, 120),
        `${autor || 'Alguém do grupo'} publicou o clip "${String(title || '').slice(0, 80)}". Vai ver.`,
        capa || null,
      );
  } catch (e) {
    console.warn('Anúncio automático saltou:', String(e.message).slice(0, 120));
  }
}

// Estado da publicação automática (o botão e o aviso do frontend)
router.get('/pub/estado', requireUserOrAdmin, (req, res) => {
  res.json(yt.estadoPublico());
});

// Dá o access token com que o browser sobe o vídeo (só a quem pode publicar)
router.post('/pub/token', requireUserOrAdmin, async (req, res) => {
  try {
    const r = await yt.prepararToken();
    res.json({
      token: r.token,
      contador: r.contador,
      nome: r.nome,
      // o browser submete com estes cabeçalhos (resumable)
      uploadUrl: 'https://www.googleapis.com/upload/youtube/v3/videos',
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      estado: yt.estadoPublico(),
    });
  } catch (e) {
    const st = e.codigo === 'esgotado' ? 429 : e.codigo === 'nao_configurado' ? 503 : 502;
    res.status(st).json({ error: e.message, codigo: e.codigo, resetEm: e.resetEm, aviso: e.aviso });
  }
});

// O browser avisa que a publicação foi recusada por cota
router.post('/pub/esgotado', requireUserOrAdmin, (req, res) => {
  const i = Number(req.body && req.body.contador);
  if (Number.isInteger(i)) yt.marcarEsgotado(i, String((req.body && req.body.motivo) || ''));
  res.json(yt.estadoPublico());
});

// Depois de o vídeo estar publicado, confere e guarda o clip
router.post('/pub/confirm', requireUserOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const b = req.body || {};

    const title = String(b.title || '').trim().slice(0, 100);
    if (!title) return res.status(400).json({ error: 'Título em falta' });

    const game = String(b.game || '').trim().toLowerCase();
    if (!CLIP_GAME_IDS.has(game)) {
      return res.status(400).json({ error: 'Escolhe o jogo do clip.' });
    }

    const videoId = String(b.videoId || '');
    const contador = Number.isInteger(Number(b.contador)) ? Number(b.contador) : 0;
    if (!yt.configurado()) {
      return res.status(503).json({ error: 'Publicação automática por configurar.' });
    }
    if (!(await garantirColunaYT(db))) {
      return res.status(503).json({ error: 'Base de dados por atualizar (corre migrate.js).' });
    }

    // confere com o YouTube: existe? é do nosso canal? ficou unlisted?
    let info;
    try {
      info = await yt.verificar(videoId, contador);
    } catch (e) {
      const st = e.codigo === 'esgotado' ? 429 : 400;
      return res
        .status(st)
        .json({ error: e.message, codigo: e.codigo, resetEm: e.resetEm, aviso: e.aviso });
    }
    yt.registarUpload(contador);

    let uid = req.auth && req.auth.uid;
    if (!uid && req.auth && req.auth.admin) uid = (await ensureAdminUser(db)).id;
    if (!uid) return res.status(401).json({ error: 'Inicia sessão para continuares' });

    const meta = metaFromQuery(b);
    // Já não guardamos uma cópia MP4 completa no Supabase (ocupava
    // imenso espaço). O download é feito no PC via yt-dlp; no
    // telemóvel o site avisa que ainda não está disponível.
    const downloadFile = '';
    // Capa NOSSA: um frame do vídeo que o browser guardou antes de subir
    const capa = await guardarCapa(videoId, b.thumb);
    const result = await db
      .prepare(
        'INSERT INTO clips (user_id, title, game, file, start_sec, end_sec, visibility, youtube_id, youtube_thumb, thumb, download_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      )
      .run(
        uid,
        title,
        game,
        '', // sem ficheiro no nosso storage — o vídeo vive no servidor remoto
        meta.start,
        meta.end,
        meta.visibility,
        info.id,
        null, // nunca guardamos a capa da plataforma
        capa,
        downloadFile || null,
      );

    const row = await db
      .prepare(SELECT_SQL + ' WHERE c.id = ?')
      .get(Number(result.lastInsertRowid));
    if (!row) return res.status(500).json({ error: 'Erro ao guardar o clip' });

    // Anúncio automático — clips públicos aparecem sozinhos nos anúncios
    if (meta.visibility === 'public') {
      const autor = await db
        .prepare('SELECT username FROM users WHERE id = ?')
        .get(uid)
        .then((u) => (u && u.username) || '')
        .catch(() => '');
      await anunciarClip(db, { title, autor, capa });
    }

    res.json({
      clip: (await decorate(db, [row], req.auth))[0],
      remoto: { id: info.id, privacidade: info.privacidade, canal: info.canal },
      estado: yt.estadoPublico(),
    });
  } catch (error) {
    console.error('Erro clips pub confirm:', error.message);
    res.status(500).json({ error: 'Erro ao guardar o clip.' });
  }
});

// Vídeo publicado que afinal não deu para guardar o clip: apaga-se
// para não ficar órfão (o link só aparece se isto falhar).
router.post('/pub/apagar', requireUserOrAdmin, async (req, res) => {
  try {
    const id = String((req.body && req.body.videoId) || '');
    const ok = await yt.apagar(id).catch(() => false);
    res.json({ ok });
  } catch (e) {
    console.error('Erro clips pub apagar:', e.message);
    res.json({ ok: false });
  }
});

/* O vídeo remoto está pronto a reproduzir? O leitor só abre quando
   isto dá true — enquanto a plataforma ainda está a processar, o
   site mostra o AVISO NOSSO e nunca o ecrã de processamento deles. */
router.get('/pub/pronto/:videoId', requireUserOrAdmin, async (req, res) => {
  try {
    const id = String(req.params.videoId || '');
    if (!yt.configurado()) return res.json({ pronto: true });
    const r = await yt.processado(id).catch(() => ({ pronto: true }));
    res.json(r);
  } catch (e) {
    console.error('Erro clips pub pronto:', e.message);
    res.json({ pronto: true });
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
    // vídeo remoto: não tem ficheiro nosso para servir
    if (clip.youtube_id) return res.status(404).json({ error: 'Sem ficheiro para transferir' });
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
    const clip = await db.prepare('SELECT id, user_id, title, thumb FROM clips WHERE id = ?').get(id);
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
        image: clip.thumb || null,
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
    // tem de ir visibility + user_id: o canSee() lê esses campos
    // (com "SELECT id" dava 403 sempre e as vistas nunca contavam)
    const clip = await db
      .prepare('SELECT id, visibility, user_id FROM clips WHERE id = ?')
      .get(id);
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
      image: clip.thumb || clip.thumb_url || null,
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

// Transferir vídeo REMOTO (YouTube) na máxima qualidade (até 4K).
// O yt-dlp (já instalado neste PC) despede o stream direto do YouTube
// já mesclado video+audio via ffmpeg e enche o nosso response.
function acharYtDlp() {
  try {
    const { execFileSync } = require('child_process');
    const saida = execFileSync('where.exe', ['yt-dlp'], { encoding: 'utf8' });
    const linha = String(saida || '').split(/\r?\n/).find((x) => x.trim());
    return linha ? linha.trim() : null;
  } catch {
    return null;
  }
}

/* Devolve o URL público com "?download=" (o Supabase manda o
   Content-Disposition: attachment, que é o que faz o telemóvel
   guardar o ficheiro em vez de o abrir num leitor). */
function transferenciaDoClip(clip) {
  const rel = clip.download_file || clip.file;
  if (!rel) return null;
  const safe =
    String(clip.title || 'clip')
      .replace(/[^\p{L}\p{N} _-]/gu, '_')
      .slice(0, 60)
      .trim() || 'clip';
  const ext = (String(rel).match(/\.[a-z0-9]{2,5}$/i) || ['.mp4'])[0];
  const filename = safe + ext;
  return {
    url: storage.publicUrl(BUCKET, rel) + '?download=' + encodeURIComponent(filename),
    filename,
  };
}

async function contarDownload(db, id) {
  try {
    await db.prepare('UPDATE clips SET downloads = downloads + 1 WHERE id = ?').run(id);
  } catch {}
}

router.get('/:id/download-remoto', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    // Já há uma cópia MP4 no Storage: é essa que o telemóvel transfere.
    const copia = transferenciaDoClip(clip);
    if (copia) {
      await contarDownload(db, id);
      return res.json(copia);
    }

    if (!clip.youtube_id) {
      return res.status(400).json({ error: 'Este clip já tem ficheiro próprio (usa Transferir normal).' });
    }

    const yt = acharYtDlp();
    if (!yt) {
      return res.status(503).json({
        error: 'O download de vídeos está disponível apenas no PC (com o yt-dlp instalado).',
      });
    }

    const safe = String(clip.title || 'clip').replace(/[^\p{L}\p{N} _-]/gu, '_').slice(0, 60) || 'clip';
    res.setHeader('Content-Disposition', 'attachment; filename="' + safe + '.mp4"');

    const path = require('path');
    let tmp = path.join(
      require('os').tmpdir(),
      'll-clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.mp4',
    );

    // yt-dlp funde video+audio com ffmpeg no ficheiro temporário;
    // depois mandamos em stream como MP4 autêntico (não TS disfarçado)
    const { spawn } = require('child_process');
    const filho = spawn(
      yt,
      [
        '-f', 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best',
        '--merge-output-format', 'mp4',
        '--no-part', '--no-playlist', '--no-warnings', '--quiet',
        '--concurrent-fragments', '4',
        '-o', tmp,
        'https://www.youtube.com/watch?v=' + clip.youtube_id,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    let msgErr = '';
    filho.stderr.on('data', (d) => {
      msgErr += String(d);
      if (msgErr.length > 4000) msgErr = msgErr.slice(-4000);
    });
    filho.on('close', (code) => {
      if (code !== 0) {
        console.error('[download-remoto] yt-dlp saiu com', code, msgErr.slice(-800));
        try {
          require('fs').unlinkSync(tmp);
        } catch {}
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Não deu para baixar este vídeo agora (o YouTube pode tê-lo privado ou bloqueado).',
          });
        } else {
          try { res.end(); } catch {}
        }
        return;
      }
      // MP4 pronto: stream para o cliente
      try {
        const fs = require('fs');
        const tamanho = fs.statSync(tmp).size;
        res.setHeader('Content-Length', tamanho);
        res.setHeader('Content-Type', 'video/mp4');
        res.flushHeaders && res.flushHeaders();
        let contado = false;
        const st = fs.createReadStream(tmp);
        st.on('error', () => {
          try { res.end(); } catch {}
          try { fs.unlinkSync(tmp); } catch {}
        });
        st.on('open', () => {
          if (!contado) {
            contado = true;
            (async () => {
              try {
                await db.prepare('UPDATE clips SET downloads = downloads + 1 WHERE id = ?').run(id);
              } catch {}
            })();
          }
        });
        st.pipe(res);
        st.on('close', () => {
          try { fs.unlinkSync(tmp); } catch {}
        });
      } catch {
        try { res.end(); } catch {}
        try { require('fs').unlinkSync(tmp); } catch {}
      }
    });

    // cliente cancelou -> mata o download e limpa
    req.on('close', () => {
      try { filho.kill(); } catch {}
      setTimeout(() => {
        try { require('fs').unlinkSync(tmp); } catch {}
      }, 1500);
    });
  } catch (error) {
    console.error('Erro clip download-remoto:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno' });
    else { try { res.end(); } catch {} }
  }
});

// Transferir o vídeo (ficheiro próprio OU cópia MP4 no Storage)
router.get('/:id/download', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const clip = await db.prepare('SELECT * FROM clips WHERE id = ?').get(id);
    if (!clip) return res.status(404).json({ error: 'Clip não encontrado' });
    if (!canSee(clip, req.auth)) return res.status(403).json({ error: 'Clip privado' });

    const dl = transferenciaDoClip(clip);
    if (!dl) {
      if (clip.youtube_id) {
        return res.status(409).json({
          error: 'A cópia para telemóvel ainda está a ser preparada. Tenta novamente daqui a pouco.',
          codigo: 'sem-copia',
        });
      }
      return res.status(404).json({ error: 'Este clip não tem ficheiro para transferir.' });
    }

    await contarDownload(db, id);
    if (req.query.redirect === '1') return res.redirect(dl.url);
    res.json(dl);
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
    if (clip.file) storage.remove(BUCKET, clip.file).catch(() => {});
    // Capa nossa (frame do vídeo) — apagar também do storage
    if (clip.thumb) {
      const ultima = clip.thumb.split('?')[0].split('/').pop();
      if (/^capa_[A-Za-z0-9_-]+\.[a-z]+$/.test(ultima)) {
        storage.remove(BUCKET, ultima).catch(() => {});
      }
    }
    // Anúncio automático do clip — se o clip sai, o aviso sai também
    try {
      await db.prepare('DELETE FROM posts WHERE title = ?').run(
        'Novo clip: ' + String(clip.title || '').slice(0, 120),
      );
    } catch (e) {
      console.warn('Anúncio do clip não apagado:', String(e.message).slice(0, 100));
    }
    // Vídeo remoto: apaga também do lado de lá (não pode ficar órfão).
    // Melhor esforço — se falhar, o clip nosso já está fora.
    let remoto = true;
    if (clip.youtube_id) {
      remoto = await yt.apagar(clip.youtube_id).catch(() => false);
      if (!remoto) console.warn('Clip remoto não apagado (id', clip.youtube_id, ') — falta escopo?');
    }
    res.json({ success: true, remoto });
  } catch (error) {
    console.error('Erro clip DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { clipsRouter: router, decorateClips: decorate };
