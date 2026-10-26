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
const notify = require('../notify');
const storage = require('../storage');

const router = express.Router();
const BUCKET = 'chat';
const MAX_BODY = 2000;
const MAX_MEDIA_MB = 8;

/* Tabelas novas (reações, respostas, fixação, tema) — criadas uma vez,
   idempotente. O tema do chat é global (o admin muda, aplica a todos). */
let chatTabelas = null;
function garantirChatTabelas() {
  if (!chatTabelas) {
    chatTabelas = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.chat_reactions (
          id bigint generated always as identity primary key,
          message_id bigint not null references public.chat_messages(id) on delete cascade,
          user_id bigint not null references public.users(id) on delete cascade,
          emoji text not null,
          criado_em timestamptz not null default now(),
          unique (message_id, user_id, emoji)
        );
        CREATE TABLE IF NOT EXISTS public.chat_pins (
          message_id bigint primary key references public.chat_messages(id) on delete cascade,
          pinned_by bigint not null references public.users(id),
          pinned_at timestamptz not null default now()
        );
        CREATE TABLE IF NOT EXISTS public.chat_settings (
          chave text primary key,
          valor text
        );
        CREATE TABLE IF NOT EXISTS public.chat_reads (
          user_id bigint primary key references public.users(id) on delete cascade,
          last_read_id bigint not null default 0,
          atualizado_em timestamptz not null default now()
        );
        ALTER TABLE public.chat_reads ADD COLUMN IF NOT EXISTS chat_ativo boolean NOT NULL DEFAULT false;
        ALTER TABLE public.chat_reads ADD COLUMN IF NOT EXISTS chat_ativo_em timestamptz;
        ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to bigint;
      `)
      .then(async () => {
        // preenche o histórico: quem já enviou mensagens considera-se
        // que leu tudo até à sua última mensagem
        try {
          await getDb()
            .prepare(
              `INSERT INTO public.chat_reads (user_id, last_read_id)
               SELECT user_id, MAX(id) FROM chat_messages
               WHERE deleted_at IS NULL
               GROUP BY user_id
               ON CONFLICT (user_id) DO UPDATE
                 SET last_read_id = GREATEST(public.chat_reads.last_read_id, EXCLUDED.last_read_id)`,
            )
            .run();
        } catch {
          /* histórico opcional */
        }
        return true;
      })
      .catch(() => false);
  }
  return chatTabelas;
}
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
         m.clip_id, m.created_at, m.reply_to,
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

/* Reações agregadas por mensagem: Map<msgId, [{emoji, count, users}]> */
async function reacoesPorMensagens(db, ids) {
  if (!ids.length) return new Map();
  const rows = await db
    .prepare(
      `SELECT r.message_id, r.emoji, r.user_id, u.username
       FROM public.chat_reactions r
       JOIN users u ON u.id = r.user_id
       WHERE r.message_id = ANY(?)
       ORDER BY r.criado_em ASC`,
    )
    .all(ids);
  const out = new Map();
  for (const r of rows) {
    const mid = Number(r.message_id);
    const lista = out.get(mid) || out.set(mid, []).get(mid);
    let g = lista.find((x) => x.emoji === r.emoji);
    if (!g) {
      g = { emoji: r.emoji, count: 0, users: [] };
      lista.push(g);
    }
    g.count++;
    g.users.push({ id: Number(r.user_id), username: r.username });
  }
  return out;
}

/* Mensagens fixadas (admin) — id -> {pinned_by, pinned_at, username} */
async function pinsPorMensagens(db, ids) {
  if (!ids.length) return new Map();
  const rows = await db
    .prepare(
      `SELECT p.message_id, p.pinned_at, u.username
       FROM public.chat_pins p
       JOIN users u ON u.id = p.pinned_by
       WHERE p.message_id = ANY(?)`,
    )
    .all(ids);
  const mapa = new Map();
  for (const r of rows) {
    mapa.set(Number(r.message_id), { pinned_at: r.pinned_at, username: r.username });
  }
  return mapa;
}

function decorar(r, reacoes, pin) {
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
    reply_to: r.reply_to ? Number(r.reply_to) : null,
    reactions: reacoes || [],
    pinned: pin || null,
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
    await garantirChatTabelas();
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
    // enriquece com reações, pins e a mensagem respondida
    const ids = mensagens.map((m) => m.id);
    const reacoes = await reacoesPorMensagens(db, ids);
    const pins = await pinsPorMensagens(db, ids);
    const idsReply = [...new Set(mensagens.map((m) => m.reply_to).filter(Boolean))];
    const replies = new Map();
    if (idsReply.length) {
      const rRows = await db
        .prepare(
          `SELECT m.id, m.body, u.username, up.avatar_url
           FROM chat_messages m
           JOIN users u ON u.id = m.user_id
           LEFT JOIN user_profiles up ON up.user_id = m.user_id
           WHERE m.id = ANY(?) AND m.deleted_at IS NULL`,
        )
        .all(idsReply);
      for (const r of rRows) {
        replies.set(Number(r.id), {
          id: Number(r.id),
          body: (r.body || '').slice(0, 140),
          username: r.username || '???',
          avatar_url: r.avatar_url || null,
        });
      }
    }
    for (const m of mensagens) {
      m.reactions = (reacoes.get(m.id) || []).map((g) => ({
        ...g,
        mine: g.users.some((u) => u.id === uid),
      }));
      m.pinned = pins.get(m.id) || null;
      if (m.reply_to && replies.get(m.reply_to)) m.reply = replies.get(m.reply_to);
    }

    /* Quem já leu cada mensagem — só interessa nas mensagens do próprio.
       O chat_reads guarda o último id lido; para o histórico também
       contamos a última mensagem que cada pessoa enviou (quem respondeu
       mais tarde já tinha visto o que estava para trás). */
    try {
      const leitores = await db
        .prepare(
          `SELECT r.user_id, r.last_read_id, u.username
           FROM public.chat_reads r
           JOIN users u ON u.id = r.user_id
           WHERE r.last_read_id > 0`,
        )
        .all();
      for (const m of mensagens) {
        if (Number(m.user.id) !== Number(uid)) continue;
        const quem = leitores
          .filter(
            (l) => Number(l.user_id) !== Number(m.user.id) && Number(l.last_read_id) >= m.id,
          )
          .map((l) => ({ id: Number(l.user_id), username: l.username }))
          .sort((a, b) => a.username.localeCompare(b.username));
        m.read_by = quem.slice(0, 12);
        m.read_count = quem.length;
      }
    } catch {
      /* sem tabela de leituras: o chat continua a funcionar */
    }
    // mensagem fixada (a mais recente) para o banner do topo
    let pinnedMsg = null;
    if (ids.length) {
      const pRow = await db
        .prepare(
          `SELECT p.message_id FROM public.chat_pins p
           WHERE p.message_id = ANY(?)
           ORDER BY p.pinned_at DESC LIMIT 1`,
        )
        .get(ids);
      if (pRow) {
        const pm = mensagens.find((m) => m.id === Number(pRow.message_id));
        if (pm) pinnedMsg = pm;
      }
    }
    res.json({
      messages: mensagens,
      has_more: hasMore,
      last_id: mensagens.length ? mensagens[mensagens.length - 1].id : 0,
      first_id: mensagens.length ? mensagens[0].id : 0,
      typing: await typingUsers(db, uid),
      pinned: pinnedMsg,
      now: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro chat GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/* ============================================================
   MENSAGENS POR LER — contador do item "Chat geral" no menu
   GET  /api/chat/nao-lidas  -> { count, last_read_id }
   POST /api/chat/lido       { last_id }  marca como visto
   ============================================================ */
/* POST /api/chat/ativo { ativo } — diz ao servidor se estou a ver o chat.
   Enquanto estiver ativo (e a página visível), não recebo push do chat. */
router.post('/ativo', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const ativo = Boolean(req.body && req.body.ativo);
    await db
      .prepare(
        `INSERT INTO public.chat_reads (user_id, last_read_id, chat_ativo, chat_ativo_em)
         VALUES (?, 0, ?, CASE WHEN ?::boolean THEN now() ELSE NULL END)
         ON CONFLICT (user_id) DO UPDATE
           SET chat_ativo = EXCLUDED.chat_ativo,
               chat_ativo_em = EXCLUDED.chat_ativo_em`,
      )
      .run(uid, ativo, ativo);
    res.json({ ok: true, ativo });
  } catch (error) {
    console.error('Erro chat ativo:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/nao-lidas', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const row = await db
      .prepare('SELECT last_read_id FROM public.chat_reads WHERE user_id = ?')
      .get(uid);

    let ultimo = Number(row && row.last_read_id) || 0;
    if (!row) {
      // Primeira visita: começa a contar a partir de agora (não do início do chat)
      const max = await db
        .prepare('SELECT COALESCE(MAX(id), 0) AS id FROM chat_messages')
        .get();
      ultimo = Number(max && max.id) || 0;
      await db
        .prepare(
          `INSERT INTO public.chat_reads (user_id, last_read_id) VALUES (?, ?)
           ON CONFLICT (user_id) DO NOTHING`,
        )
        .run(uid, ultimo)
        .catch(() => {});
    }

    const c = await db
      .prepare(
        `SELECT count(*)::int AS n FROM chat_messages
         WHERE id > ? AND user_id <> ? AND deleted_at IS NULL`,
      )
      .get(ultimo, uid);
    res.json({ count: Number(c && c.n) || 0, last_read_id: ultimo });
  } catch (error) {
    console.error('Erro chat nao-lidas:', error.message);
    res.json({ count: 0, last_read_id: 0 });
  }
});

router.post('/lido', requireUser, async (req, res) => {  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const id = Number(req.body && req.body.last_id);
    if (!Number.isFinite(id) || id <= 0) return res.json({ ok: true });
    await db
      .prepare(
        `INSERT INTO public.chat_reads (user_id, last_read_id) VALUES (?, ?)
         ON CONFLICT (user_id) DO UPDATE
           SET last_read_id = GREATEST(public.chat_reads.last_read_id, EXCLUDED.last_read_id),
               atualizado_em = now()`,
      )
      .run(uid, id);
    res.json({ ok: true, last_read_id: id });
  } catch (error) {
    console.error('Erro chat lido:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/* ============================================================
   REAÇÕES — qualquer membro reage (toggle)
   POST /api/chat/:id/react  { emoji }
   ============================================================ */
router.post('/:id/react', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const id = Number(req.params.id);
    const emoji = String((req.body && req.body.emoji) || '').trim().slice(0, 8);
    if (!Number.isFinite(id) || !emoji) return res.status(400).json({ error: 'Reação inválida.' });
    const msg = await db.prepare('SELECT id FROM chat_messages WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada.' });
    const existe = await db
      .prepare('SELECT id FROM public.chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
      .get(id, uid, emoji);
    if (existe) {
      await db.prepare('DELETE FROM public.chat_reactions WHERE id = ?').run(existe.id);
    } else {
      await db
        .prepare('INSERT INTO public.chat_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)')
        .run(id, uid, emoji);
    }
    const reacoes = await reacoesPorMensagens(db, [id]);
    res.json({ ok: true, reactions: (reacoes.get(id) || []).map((g) => ({ ...g, mine: g.users.some((u) => u.id === uid) })) });
  } catch (error) {
    console.error('Erro chat react:', error.message);
    res.status(500).json({ error: 'Não deu para reagir.' });
  }
});

/* ============================================================
   FIXAR / DESFIXAR — só o admin
   POST /api/chat/:id/pin   (fixa)
   DELETE /api/chat/:id/pin (desfixa)
   ============================================================ */
router.post('/:id/pin', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const id = Number(req.params.id);
    const u = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(uid);
    if (!u || !u.is_admin) return res.status(403).json({ error: 'Só o admin fixa mensagens.' });
    const msg = await db.prepare('SELECT id FROM chat_messages WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada.' });
    await db
      .prepare(
        `INSERT INTO public.chat_pins (message_id, pinned_by) VALUES (?, ?)
         ON CONFLICT (message_id) DO UPDATE SET pinned_by = EXCLUDED.pinned_by, pinned_at = now()`,
      )
      .run(id, uid);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro chat pin:', error.message);
    res.status(500).json({ error: 'Não deu para fixar.' });
  }
});

router.delete('/:id/pin', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const id = Number(req.params.id);
    const u = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(uid);
    if (!u || !u.is_admin) return res.status(403).json({ error: 'Só o admin desfixa.' });
    await db.prepare('DELETE FROM public.chat_pins WHERE message_id = ?').run(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro chat unpin:', error.message);
    res.status(500).json({ error: 'Não deu para desfixar.' });
  }
});

/* ============================================================
   TEMA DO CHAT — global; só o admin muda, aplica a todos.
   GET  /api/chat/tema  -> { tema }
   POST /api/chat/tema  { tema }  (só admin)
   ============================================================ */
router.get('/tema', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const r = await db.prepare("SELECT valor FROM public.chat_settings WHERE chave = 'tema'").get();
    res.json({ tema: (r && r.valor) || 'violeta' });
  } catch {
    res.json({ tema: 'violeta' });
  }
});

router.post('/tema', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    const u = await db.prepare('SELECT is_admin FROM users WHERE id = ?').get(uid);
    if (!u || !u.is_admin) return res.status(403).json({ error: 'Só o admin muda o tema.' });
    const tema = String((req.body && req.body.tema) || 'violeta').slice(0, 20);
    await db
      .prepare(
        `INSERT INTO public.chat_settings (chave, valor) VALUES ('tema', ?)
         ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
      )
      .run(tema);
    res.json({ ok: true, tema });
  } catch (error) {
    console.error('Erro chat tema:', error.message);
    res.status(500).json({ error: 'Não deu para mudar o tema.' });
  }
});

/* POST /api/chat — texto, imagem/GIF ou clip (com reply_to) */
router.post('/', requireUser, async (req, res) => {
  try {
    await garantirChatTabelas();
    const db = getDb();
    const uid = req.auth.uid;
    if (!podeEnviar(uid)) {
      return res.status(429).json({ error: 'Calma aí — demasiadas mensagens seguidas.' });
    }

    const b = req.body || {};
    const body = String(b.body || '').replace(/\r\n/g, '\n').trim().slice(0, MAX_BODY);
    const clipId = Number(b.clip_id) || null;
    const sticker = String(b.sticker || '').trim();
    let mediaUrl = b.media_url ? String(b.media_url).trim() : null;
    let mediaType = b.media_type ? String(b.media_type).toLowerCase() : null;

    if (sticker) {
      const host = String(req.headers.host || '').toLowerCase();
      const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
      if (!local) {
        return res.status(403).json({ error: 'Os stickers só estão disponíveis em localhost.' });
      }
      const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
      const svgLocal = /^\/stickers\/[a-z0-9-]+\.svg$/.test(sticker);
      const noBucket =
        Boolean(base) && sticker.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
      const tenor = /^https:\/\/(?:media\d*|c)\.tenor\.com\//i.test(sticker);
      if (!svgLocal && !noBucket && !tenor) {
        return res.status(400).json({ error: 'Sticker inválido.' });
      }
      mediaUrl = sticker;
      mediaType = 'sticker';
    }

    if (!body && !clipId && !mediaUrl && !sticker) {
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

    if (mediaUrl && !sticker) {
      const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
      if (!base || !mediaUrl.startsWith(base + '/storage/v1/object/public/' + BUCKET + '/')) {
        return res.status(400).json({ error: 'Imagem inválida.' });
      }
      if (!['image', 'gif'].includes(mediaType)) {
        mediaType = /\.gif(?:$|\?)/i.test(mediaUrl) ? 'gif' : 'image';
      }
    }

    const kind = sticker ? 'sticker' : clipId ? 'clip' : mediaUrl ? 'media' : 'text';
    const replyTo = Number(b.reply_to) || null;
    const r = await db
      .prepare(
        'INSERT INTO chat_messages (user_id, body, kind, media_url, media_type, clip_id, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      )
      .run(uid, body, kind, mediaUrl, mediaType, clipId, replyTo);

    await db.prepare('DELETE FROM chat_typing WHERE user_id = ?').run(uid).catch(() => {});
    // quem envia também fica com a conversa lida até à sua própria mensagem
    await db
      .prepare(
        `INSERT INTO public.chat_reads (user_id, last_read_id) VALUES (?, ?)
         ON CONFLICT (user_id) DO UPDATE
           SET last_read_id = GREATEST(public.chat_reads.last_read_id, EXCLUDED.last_read_id),
               atualizado_em = now()`,
      )
      .run(uid, Number(r.lastInsertRowid))
      .catch(() => {});
    const row = await db.prepare(SELECT_MSG + ' AND m.id = ?').get(Number(r.lastInsertRowid));
    const msg = decorar(row);
    if (replyTo) {
      const rRow = await db
        .prepare(
          `SELECT m.id, m.body, u.username, up.avatar_url
           FROM chat_messages m JOIN users u ON u.id = m.user_id
           LEFT JOIN user_profiles up ON up.user_id = m.user_id
           WHERE m.id = ?`,
        )
        .get(replyTo);
      if (rRow) {
        msg.reply = {
          id: Number(rRow.id),
          body: (rRow.body || '').slice(0, 140),
          username: rRow.username || '???',
          avatar_url: rRow.avatar_url || null,
        };
      }
    }
    msg.reactions = [];
    msg.pinned = null;

    /* notificação Windows/PWA para os outros membros (sem bloquear o envio) */
    const previa =
      body ||
      (kind === 'sticker'
        ? 'Enviou um sticker'
        : kind === 'clip'
          ? 'Enviou um clip'
          : mediaType === 'gif'
            ? 'Enviou um GIF'
            : 'Enviou uma imagem');
    let aVerChat = [];
    try {
      aVerChat = await db
        .prepare(
          `SELECT user_id FROM public.chat_reads
           WHERE chat_ativo = true
             AND chat_ativo_em > now() - interval '20 seconds'`,
        )
        .all();
    } catch {
      /* sem tabela: envia a todos */
    }
    notify
      .pushTodos({
        excluirUserId: uid,
        excluirIds: aVerChat.map((x) => Number(x.user_id)),
        title: `💬 ${msg.user.username || 'Chat'}`,
        body: previa.slice(0, 140),
        link: '/chat',
        image: msg.user.avatar_url || null,
        tag: `chat-${msg.id}`,
        tipo: 'chat',
      })
      .catch(() => {});

    res.status(201).json(msg);
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

/* GET /api/chat/stickers?q=... — stickers animados (Tenor).
   Só em localhost, para testes. */
const TENOR_KEY =
  process.env.TENOR_API_KEY || 'AIzaSyCZt6SSh5VgVPzD9fhyzG1DprdPRhtoaR4';
const TENOR_CLIENT = process.env.TENOR_CLIENT_KEY || 'tenor_web';
const stickersCache = new Map();

router.get('/stickers', requireUser, async (req, res) => {
  try {
    const host = String(req.headers.host || '').toLowerCase();
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    if (!local) {
      return res.status(403).json({ error: 'Os stickers só estão disponíveis em localhost.' });
    }
    const q = String(req.query.q || '').trim().slice(0, 60);
    const pos = String(req.query.pos || '').trim().slice(0, 120);
    const chave = `${q ? `q:${q.toLowerCase()}` : 'featured'}:${pos || '0'}`;
    const agora = Date.now();
    const cacheado = stickersCache.get(chave);
    if (cacheado && agora - cacheado.t < 10 * 60 * 1000) {
      return res.json({
        ok: true,
        fonte: 'Tenor',
        stickers: cacheado.dados.itens,
        next: cacheado.dados.next,
      });
    }

    const endpoint = q ? 'search' : 'featured';
    const params = new URLSearchParams({
      key: TENOR_KEY,
      client_key: TENOR_CLIENT,
      limit: '24',
      media_filter: 'tinygif,gif',
      searchfilter: 'sticker',
      contentfilter: 'high',
    });
    if (q) params.set('q', q);
    if (pos) params.set('pos', pos);
    const url = `https://tenor.googleapis.com/v2/${endpoint}?${params.toString()}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`Tenor ${r.status}`);
    const d = await r.json();
    const stickers = (Array.isArray(d.results) ? d.results : [])
      .map((item) => {
        const gif = item.media_formats && item.media_formats.gif;
        const tiny = item.media_formats && item.media_formats.tinygif;
        const media = gif || tiny;
        if (!media || !media.url) return null;
        return {
          id: item.id,
          url: media.url,
          preview: (tiny && tiny.url) || media.url,
          titulo: item.content_description || item.title || 'Sticker',
          w: media.dims ? media.dims[0] : null,
          h: media.dims ? media.dims[1] : null,
        };
      })
      .filter(Boolean);

    const next = d.next || null;
    stickersCache.set(chave, { t: agora, dados: { itens: stickers, next } });
    if (stickersCache.size > 40) {
      const primeira = stickersCache.keys().next().value;
      stickersCache.delete(primeira);
    }
    res.json({ ok: true, fonte: 'Tenor', stickers, next });
  } catch (e) {
    console.error('Erro stickers:', e.message);
    res.status(502).json({ ok: false, error: 'Não foi possível carregar os stickers.', stickers: [] });
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
