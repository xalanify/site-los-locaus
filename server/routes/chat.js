// ============================================================
//  CHAT GERAL
//
//  Tempo real por polling curto (1,5–2 s): funciona na Vercel,
//  onde as funções não podem manter WebSockets abertos, e no
//  telemóvel. Inclui indicador "a escrever…" e envio de
//  imagens/GIFs/clips.
// ============================================================
const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../database');
const { requireUser, requireUserOrAdmin } = require('../middleware/auth');
const storage = require('../storage');

const router = express.Router();
const BUCKET = 'chat';
const MAX_BODY = 2000;
const MAX_MEDIA_MB = 8;
const EXT_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

let bucketPronto = null;
function garantirBucket() {
  if (!bucketPronto) {
    bucketPronto = storage.ensureBucket(BUCKET, true).catch((e) => {
      bucketPronto = null;
      throw e;
    });
  }
  return bucketPronto;
}

/* limite simples por utilizador (evita spam no chat) */
const envios = new Map();
function podeEnviar(uid) {
  const agora = Date.now();
  const lista = (envios.get(uid) || []).filter((t) => agora - t < 30_000);
  if (lista.length >= 15) {
    envios.set(uid, lista);
    return false;
  }
  lista.push(agora);
  envios.set(uid, lista);
  return true;
}

const SELECT_MSG = `
  SELECT m.id, m.user_id, m.body, m.kind, m.media_url, m.media_type,
         m.clip_id, m.created_at,
         u.username, up.avatar_url,
         c.title AS clip_title, c.thumb AS clip_thumb, c.file AS clip_file,
         c.youtube_id AS clip_youtube, c.visibility AS clip_visibility,
         c.user_id AS clip_user_id, cu.username AS clip_author,
         cu.id AS clip_author_id
  FROM chat_messages m
  JOIN users u ON u.id = m.user_id
  LEFT JOIN user_profiles up ON up.user_id = m.user_id
  LEFT JOIN clips c ON c.id = m.clip_id
  LEFT JOIN users cu ON cu.id = c.user_id
  WHERE m.deleted_at IS NULL
`;

function decorar(r) {
  let clip = null;
  if (r.clip_id && r.clip_title) {
    clip = {
      id: Number(r.clip_id),
      title: r.clip_title,
      thumb_url: r.clip_thumb || null,
      url: r.clip_file ? storage.publicUrl('clips', r.clip_file) : null,
      remoto: r.clip_youtube || null,
      author: r.clip_author || '',
      author_id: Number(r.clip_author_id) || null,
      visibility: r.clip_visibility === 'private' ? 'private' : 'public',
    };
  }
  return {
    id: Number(r.id),
    body: r.body || '',
    kind: r.kind || 'text',
    media_url: r.media_url || null,
    media_type: r.media_type || null,
    clip,
    user: {
      id: Number(r.user_id),
      username: r.username || '???',
      avatar_url: r.avatar_url || null,
    },
    created_at: r.created_at,
  };
}

async function typingUsers(db, uid) {
  try {
    await db
      .prepare("DELETE FROM chat_typing WHERE typing_at < now() - interval '30 seconds'")
      .run();
    return await db
      .prepare(
        `SELECT t.user_id, u.username
         FROM chat_typing t JOIN users u ON u.id = t.user_id
         WHERE t.user_id <> ? AND t.typing_at > now() - interval '7 seconds'
         ORDER BY t.typing_at DESC LIMIT 8`,
      )
      .all(uid);
  } catch {
    return [];
  }
}

/* GET /api/chat?after=ID | ?before=ID&limit=40 */
router.get('/', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth.uid;
    const after = Number(req.query.after);
    const before = Number(req.query.before);
    const limit = Math.min(80, Math.max(10, Number(req.query.limit) || 40));

    let rows;
    let hasMore = false;
    if (Number.isFinite(after) && after > 0) {
      rows = await db
        .prepare(SELECT_MSG + ' AND m.id > ? ORDER BY m.id ASC LIMIT ?')
        .all(after, limit);
    } else if (Number.isFinite(before) && before > 0) {
      rows = await db
        .prepare(SELECT_MSG + ' AND m.id < ? ORDER BY m.id DESC LIMIT ?')
        .all(before, limit);
      rows.reverse();
      hasMore = true;
    } else {
      rows = await db
        .prepare(SELECT_MSG + ' ORDER BY m.id DESC LIMIT ?')
        .all(limit + 1);
      if (rows.length > limit) {
        rows.pop();
        hasMore = true;
      }
      rows.reverse();
    }

    const mensagens = rows.map(decorar);
    res.json({
      messages: mensagens,
      has_more: hasMore,
      last_id: mensagens.length ? mensagens[mensagens.length - 1].id : 0,
      first_id: mensagens.length ? mensagens[0].id : 0,
      typing: await typingUsers(db, uid),
      now: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro chat GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/* POST /api/chat — texto, imagem/GIF ou clip */
router.post('/', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth.uid;
    if (!podeEnviar(uid)) {
      return res.status(429).json({ error: 'Calma aí — demasiadas mensagens seguidas.' });
    }

    const b = req.body || {};
    const body = String(b.body || '').replace(/\r\n/g, '\n').trim().slice(0, MAX_BODY);
    const clipId = Number(b.clip_id) || null;
    let mediaUrl = b.media_url ? String(b.media_url).trim() : null;
    let mediaType = b.media_type ? String(b.media_type).toLowerCase() : null;

    if (!body && !clipId && !mediaUrl) {
      return res.status(400).json({ error: 'Escreve uma mensagem ou anexa algo.' });
    }

    let clip = null;
    if (clipId) {
      clip = await db
        .prepare("SELECT id, user_id, visibility FROM clips WHERE id = ?")
        .get(clipId);
      if (!clip) return res.status(404).json({ error: 'Clip não encontrado.' });
      if (clip.visibility === 'private' && Number(clip.user_id) !== uid) {
        return res.status(403).json({ error: 'Esse clip é privado.' });
      }
    }

    if (mediaUrl) {
      const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
      if (!base || !mediaUrl.startsWith(base + '/storage/v1/object/public/' + BUCKET + '/')) {
        return res.status(400).json({ error: 'Imagem inválida.' });
      }
      if (!['image', 'gif'].includes(mediaType)) {
        mediaType = /\.gif(?:$|\?)/i.test(mediaUrl) ? 'gif' : 'image';
      }
    }

    const kind = clipId ? 'clip' : mediaUrl ? 'media' : 'text';
    const r = await db
      .prepare(
        'INSERT INTO chat_messages (user_id, body, kind, media_url, media_type, clip_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      )
      .run(uid, body, kind, mediaUrl, mediaType, clipId);

    await db.prepare('DELETE FROM chat_typing WHERE user_id = ?').run(uid).catch(() => {});
    const row = await db.prepare(SELECT_MSG + ' AND m.id = ?').get(Number(r.lastInsertRowid));
    res.status(201).json(decorar(row));
  } catch (error) {
    console.error('Erro chat POST:', error.message);
    res.status(500).json({ error: 'Não deu para enviar a mensagem.' });
  }
});

/* POST /api/chat/typing — "a escrever…" */
router.post('/typing', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth.uid;
    await db
      .prepare(
        'INSERT INTO chat_typing (user_id, typing_at) VALUES (?, now()) ON CONFLICT (user_id) DO UPDATE SET typing_at = now()',
      )
      .run(uid);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro chat typing:', error.message);
    res.json({ ok: false });
  }
});

/* POST /api/chat/upload-url — imagem/GIF direto para o Supabase */
router.post('/upload-url', requireUser, async (req, res) => {
  try {
    const tipo = String((req.body && req.body.type) || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const ext = EXT_BY_TYPE[tipo];
    if (!ext) {
      return res.status(415).json({ error: 'Formato não suportado — usa JPG, PNG, WebP ou GIF.' });
    }
    if (!storage.isConfigured()) {
      return res.status(503).json({ error: 'Storage por configurar.' });
    }
    await garantirBucket();
    const file = crypto.randomBytes(16).toString('hex') + ext;
    const uploadUrl = await storage.signedUploadUrl(BUCKET, file);
    res.json({
      path: file,
      uploadUrl,
      publicUrl: storage.publicUrl(BUCKET, file),
      maxMB: MAX_MEDIA_MB,
    });
  } catch (error) {
    console.error('Erro chat upload-url:', error.message);
    res.status(500).json({ error: 'Não deu para preparar a imagem.' });
  }
});

/* DELETE /api/chat/:id — apagar a própria mensagem (ou admin) */
router.delete('/:id', requireUserOrAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(404).json({ error: 'Não encontrada' });
    const msg = await db.prepare('SELECT user_id FROM chat_messages WHERE id = ?').get(id);
    if (!msg) return res.status(404).json({ error: 'Não encontrada' });
    const auth = req.auth || {};
    if (!(auth.admin || (auth.uid && Number(auth.uid) === Number(msg.user_id)))) {
      return res.status(403).json({ error: 'Sem permissões' });
    }
    await db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro chat DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { chatRouter: router };
