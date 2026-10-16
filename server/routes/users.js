const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const store = require('../usersStore');
const storage = require('../storage');
const { validateEmail } = require('../emailValidate');
const { JWT_SECRET, attachAuth, requireUser } = require('../middleware/auth');
const { decorateClips } = require('./clips');

const router = express.Router();

const RESERVED = new Set(['me', 'admin', 'login', 'register', 'novo', 'publicacoes', 'perfil']);
const USER_RE = /^[\p{L}\p{N}_. -]{3,20}$/u;
const NICK_RE = /^[\p{L}\p{N}_. -]{1,24}$/u;

/* ---------- fotos de perfil ----------
   O utilizador escolhe uma imagem; o servidor sobe-a para o
   Supabase Storage e associa o link à conta. (O Vercel não tem disco.) */
const BUCKET = 'avatars';
const AVATAR_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
// 4 MB — acima disso ultrapassa o limite de corpo do Vercel (4,5 MB)
const MAX_AVATAR = 4 * 1024 * 1024;

const signUser = (u) =>
  jwt.sign(
    { uid: u.id, username: u.username, ...(u.is_admin ? { admin: true } : {}) },
    JWT_SECRET,
    { expiresIn: '30d' },
  );

/* Dados extras do perfil (foto + nick no CS2) — guardados no Supabase. */
const profileOf = async (userId) => {
  try {
    const row = await getDb()
      .prepare(
        `SELECT avatar_url, game_nick, mouse, dpi
         FROM user_profiles WHERE user_id = ?`,
      )
      .get(userId);
    return {
      avatar_url: (row && row.avatar_url) || null,
      game_nick: (row && row.game_nick) || null,
      mouse: (row && row.mouse) || null,
      dpi: (row && row.dpi) || null,
    };
  } catch {
    return { avatar_url: null, game_nick: null, mouse: null, dpi: null };
  }
};

const badgesOf = async (userId) => {
  try {
    const rows = await getDb()
      .prepare('SELECT badge FROM user_badges WHERE user_id = ?')
      .all(userId);
    return rows.map((r) => r.badge);
  } catch {
    return [];
  }
};

/* Distinções de overclock lidas da leitura REAL do PC (specs.details.avaliacao).
   Devolve o que o utilizador tem alterado: CPU acima do teto, memórias com
   overclock e/ou perfil XMP ligado. Sem leitura -> null (não mostra nada). */
const distincoesOverclock = async (userId) => {
  try {
    const row = await getDb()
      .prepare('SELECT details FROM user_specs WHERE user_id = ?')
      .get(userId);
    let det = row && row.details;
    if (det && typeof det === 'string') {
      try { det = JSON.parse(det); } catch { det = null; }
    }
    const av = det && det.avaliacao;
    if (!av) return null;
    const ocCpu = av.cpu?.estado === 'overclock';
    const ocRam = av.ram?.estado === 'overclock';
    const xmp = Boolean(av.ram?.tem_xmp || av.ram?.estado === 'xmp');
    if (!ocCpu && !ocRam && !xmp) return null;
    return { oc_cpu: ocCpu, oc_ram: ocRam, xmp };
  } catch {
    return null;
  }
};

const publicUser = async (u) => {
  const [prof, badges, dist] = await Promise.all([
    profileOf(u.id),
    badgesOf(u.id),
    distincoesOverclock(u.id),
  ]);
  return {
    id: u.id,
    username: u.username,
    email: u.email || null,
    is_admin: Boolean(u.is_admin),
    // Modo de recuperação ativo pelo admin -> o ecrã de nova pass aparece sempre
    recovery: Boolean(u.recovery),
    created_at: u.created_at,
    ...prof,
    badges,
    distincoes: dist,
  };
};

/* apaga avatar nosso no Storage (best-effort) */
function removeAvatarFile(url) {
  if (typeof url !== 'string') return;
  const m = url.match(/\/avatars\/(avatar-[\w-]+\.(?:jpg|png|webp|gif))$/);
  if (!m) return;
  storage.remove(BUCKET, m[1]).catch(() => {});
}

const ensureProfileRow = (db, uid) =>
  db
    .prepare('INSERT INTO user_profiles (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING')
    .run(uid);

function validate(username, password) {
  const name = String(username || '').trim();
  if (!USER_RE.test(name)) {
    return 'O nome tem de ter 3 a 20 caracteres (letras, números, ponto, traço ou espaço).';
  }
  if (RESERVED.has(name.toLowerCase())) return 'Esse nome não está disponível.';
  if (typeof password !== 'string' || password.length < 6) {
    return 'A palavra-passe precisa de pelo menos 6 caracteres.';
  }
  if (password.length > 100) return 'Palavra-passe demasiado longa.';
  return null;
}

// Criar conta (Supabase ou local, conforme usersStore)
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.username || '').trim();
    const err = validate(name, req.body.password);
    if (err) return res.status(400).json({ error: err });

    // Email obrigatório: formato + domínio tem de receber emails (MX)
    const emailCheck = await validateEmail(req.body.email);
    if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });

    const exists = await store.findByUsername(name);
    if (exists) return res.status(409).json({ error: 'Esse nome já está a ser usado.' });

    const emailTaken = await store.findByEmail(emailCheck.email);
    if (emailTaken) return res.status(409).json({ error: 'Esse email já está associado a outra conta.' });

    const hash = bcrypt.hashSync(String(req.body.password), 10);
    const user = await store.createUser(name, hash, emailCheck.email);
    res.json({ token: signUser(user), user: await publicUser(user) });
  } catch (error) {
    if (error.message === 'EMAIL_COLUMN_MISSING') {
      return res.status(503).json({
        error:
          'O email é obrigatório, mas falta na base de dados. O admin tem de correr no Supabase: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;',
      });
    }
    if (/duplicate|unique|23505/i.test(error.message)) {
      return res.status(409).json({ error: 'Esse nome já está a ser usado.' });
    }
    console.error('Erro users register:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Entrar
router.post('/login', async (req, res) => {
  try {
    const name = String(req.body.username || '').trim();
    const user = await store.findByUsername(name);
    if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.password_hash)) {
      return res.status(401).json({ error: 'Nome ou palavra-passe incorretos.' });
    }
    res.json({ token: signUser(user), user: await publicUser(user) });
  } catch (error) {
    console.error('Erro users login:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Quem sou eu (com token)
router.get('/me', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) {
    return res.status(401).json({ error: 'Sessão não iniciada' });
  }
  try {
    const user = await store.findById(req.auth.uid);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
    res.json(await publicUser(user));
  } catch (error) {
    console.error('Erro users me:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Enviar foto de perfil (o corpo do pedido É a imagem escolhida)
router.post(
  '/me/avatar',
  attachAuth,
  express.raw({ type: 'image/*', limit: MAX_AVATAR }),
  async (req, res) => {
    if (!req.auth || !req.auth.uid) {
      return res.status(401).json({ error: 'Sessão não iniciada' });
    }
    try {
      const ct = String(req.headers['content-type'] || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const ext = AVATAR_EXT[ct];
      if (!ext) {
        return res
          .status(415)
          .json({ error: 'Formato não suportado — usa JPG, PNG, WebP ou GIF.' });
      }
      if (!req.body || !req.body.length) {
        return res.status(400).json({ error: 'Imagem em falta.' });
      }

      const uid = Number(req.auth.uid);
      const name = `avatar-${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
      await storage.upload(BUCKET, name, req.body, ct);
      const url = storage.publicUrl(BUCKET, name);

      const db = getDb();
      await ensureProfileRow(db, uid);
      const cur = await db
        .prepare('SELECT avatar_url FROM user_profiles WHERE user_id = ?')
        .get(uid);
      await db
        .prepare(
          'UPDATE user_profiles SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(url, uid);
      // ficheiro antigo (nosso) fica para trás
      if (cur && cur.avatar_url && cur.avatar_url !== url) removeAvatarFile(cur.avatar_url);

      const user = await store.findById(uid);
      if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
      res.json(await publicUser(user));
    } catch (error) {
      console.error('Erro avatar upload:', error.message);
      res.status(500).json({ error: 'Erro ao guardar a foto.' });
    }
  },
);

// Guardar dados do perfil (nick no CS2, avatar_url opcional para limpar)
router.put('/me/profile', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) {
    return res.status(401).json({ error: 'Sessão não iniciada' });
  }
  try {
    const uid = Number(req.auth.uid);
    const body = req.body || {};
    const hasNick = Object.prototype.hasOwnProperty.call(body, 'game_nick');
    const hasAvatar = Object.prototype.hasOwnProperty.call(body, 'avatar_url');
    const hasMouse = Object.prototype.hasOwnProperty.call(body, 'mouse');
    const hasDpi = Object.prototype.hasOwnProperty.call(body, 'dpi');
    if (!hasNick && !hasAvatar && !hasMouse && !hasDpi) {
      return res.status(400).json({ error: 'Nada para guardar.' });
    }

    const db = getDb();
    await ensureProfileRow(db, uid);

    if (hasNick) {
      const nick = String(body.game_nick || '').trim();
      if (nick && !NICK_RE.test(nick)) {
        return res.status(400).json({
          error:
            'O nick no CS2 pode ter até 24 caracteres (letras, números, ponto, traço ou espaço).',
        });
      }
      await db
        .prepare(
          'UPDATE user_profiles SET game_nick = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(nick || null, uid);
    }

    if (hasAvatar) {
      const avatar = String(body.avatar_url || '').trim();
      if (avatar && avatar.length > 500) {
        return res.status(400).json({ error: 'O link da foto é demasiado longo (máx. 500).' });
      }
      if (avatar && !/^https?:\/\/\S+/i.test(avatar)) {
        return res
          .status(400)
          .json({ error: 'O link da foto tem de começar por http:// ou https://.' });
      }
      const cur = await db
        .prepare('SELECT avatar_url FROM user_profiles WHERE user_id = ?')
        .get(uid);
      await db
        .prepare(
          'UPDATE user_profiles SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(avatar || null, uid);
      if (cur && cur.avatar_url && cur.avatar_url !== avatar) removeAvatarFile(cur.avatar_url);
    }

    if (hasMouse) {
      const mouse = String(body.mouse || '').trim().slice(0, 80);
      await db
        .prepare('UPDATE user_profiles SET mouse = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(mouse || null, uid);
    }
    if (hasDpi) {
      const dpi = Number(body.dpi);
      const safe = Number.isFinite(dpi) && dpi > 0 && dpi < 100000 ? Math.round(dpi) : null;
      await db
        .prepare('UPDATE user_profiles SET dpi = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(safe, uid);
    }

    const user = await store.findById(uid);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
    res.json(await publicUser(user));
  } catch (error) {
    console.error('Erro users profile save:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===================== Recuperação de palavra-passe (via admin) =====================
/* Sem emails por agora: o pedido fica registado, o admin vê-o no
   painel e ativa o "modo recuperação" da conta. Enquanto esse modo
   estiver ligado, ao entrar no site aparece o ecrã de criar nova pass. */

// POST /api/users/forgot   { username }  -> regista o pedido para o admin
router.post('/forgot', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Escreve o teu nome.' });

    const user = await store.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'Não existe nenhuma conta com esse nome.' });

    const db = getDb();
    await db
      .prepare(
        `INSERT INTO pass_recovery
           (user_id, username, email, status, attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'requested', 0, now(), now())
         ON CONFLICT(username) DO UPDATE SET
           status = 'requested',
           token = NULL,
           expires_at = NULL,
           attempts = 0,
           updated_at = now()`,
      )
      .run(user.id, user.username, String(user.email || '').trim());

    res.json({ ok: true });
  } catch (error) {
    console.error('Erro forgot:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users/exists?username=x -> existe a conta? + modo de recuperação
// (para mostrar "Esqueci a pass" e para saltar direto ao ecrã de nova pass)
router.get('/exists', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) return res.json({ exists: false, recovery: false });
    const user = await store.findByUsername(username);
    res.json({ exists: !!user, recovery: !!(user && user.recovery) });
  } catch {
    res.json({ exists: false, recovery: false });
  }
});

// POST /api/users/reset  { username, new_password }
// Só funciona com o "modo recuperação" ligado pelo admin.
router.post('/reset', async (req, res) => {
  try {
    const username = String((req.body && req.body.username) || '').trim();
    const pwdIn = String((req.body && req.body.new_password) || '');

    if (!username) return res.status(400).json({ error: 'Escreve o teu nome.' });
    if (pwdIn.length < 6) {
      return res.status(400).json({ error: 'A nova palavra-passe precisa de pelo menos 6 caracteres.' });
    }
    if (pwdIn.length > 100) return res.status(400).json({ error: 'Palavra-passe demasiado longa.' });

    const user = await store.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
    if (!user.recovery) {
      return res
        .status(403)
        .json({ error: 'A recuperação ainda não foi aprovada pelo admin.' });
    }

    const hash = bcrypt.hashSync(pwdIn, 10);
    await store.updatePassword(user.id, hash);

    const db = getDb();
    await db.prepare('UPDATE users SET recovery = false WHERE id = ?').run(user.id);
    await db
      .prepare(
        `UPDATE pass_recovery SET status = 'handled', token = NULL, updated_at = now()
         WHERE user_id = ? AND status IN ('requested', 'active', 'sent')`,
      )
      .run(user.id);

    const fresh = (await store.findById(user.id)) || { ...user, recovery: false };
    res.json({ token: signUser(fresh), user: await publicUser(fresh) });
  } catch (error) {
    console.error('Erro reset:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===================== Presença + lista de membros =====================
// POST /api/users/presence — o cliente "pinga" de 30 em 30 segundos
router.post('/presence', requireUser, async (req, res) => {
  try {
    const db = getDb();
    await db
      .prepare(
        `INSERT INTO user_presence (user_id, last_seen) VALUES (?, now())
         ON CONFLICT (user_id) DO UPDATE SET last_seen = now()`,
      )
      .run(req.auth.uid);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro presence:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users/list — todos os membros + sinal online/offline
router.get('/list', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT u.id, u.username, p.avatar_url, p.mouse, p.dpi,
                (p2.last_seen IS NOT NULL AND p2.last_seen > now() - interval '2 minutes') AS online
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         LEFT JOIN user_presence p2 ON p2.user_id = u.id
         WHERE u.password_hash NOT LIKE '!%'
         ORDER BY u.username`,
      )
      .all();
    const badges = await db.prepare('SELECT user_id, badge FROM user_badges').all();
    const byUser = {};
    for (const b of badges) (byUser[b.user_id] = byUser[b.user_id] || []).push(b.badge);
    // distinções de overclock (leitura real do PC) — para os membros
    const dists = await Promise.all(rows.map((r) => distincoesOverclock(r.id)));
    res.json({
      users: rows.map((r, i) => ({
        id: Number(r.id),
        username: r.username,
        avatar_url: r.avatar_url || null,
        mouse: r.mouse || null,
        dpi: r.dpi || null,
        online: Boolean(r.online),
        badges: byUser[r.id] || [],
        distincoes: dists[i] || null,
      })),
    });
  } catch (error) {
    console.error('Erro users list:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Perfil público (+ clips visíveis ao visitante)
router.get('/:username', attachAuth, async (req, res) => {
  try {
    const name = String(req.params.username || '');
    const user = await store.findByUsername(name.slice(0, 30));
    if (!user) return res.status(404).json({ error: 'Perfil não encontrado' });

    const auth = req.auth;
    const isOwnerOrAdmin = !!(
      auth && (auth.admin || (auth.uid && Number(auth.uid) === Number(user.id)))
    );

    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT c.*, u.username, p.avatar_url AS author_avatar
         FROM clips c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN user_profiles p ON p.user_id = c.user_id
         WHERE c.user_id = ? AND (c.visibility = 'public' OR ? = 1)
         ORDER BY c.created_at DESC, c.id DESC LIMIT 100`,
      )
      .all(user.id, isOwnerOrAdmin ? 1 : 0);

    const clips = await decorateClips(db, rows, auth);
    const stats = {
      clips: clips.length,
      likes: clips.reduce((s, c) => s + c.likes, 0),
      downloads: clips.reduce((s, c) => s + c.downloads, 0),
      views: clips.reduce((s, c) => s + (c.views || 0), 0),
      saved: clips.filter((c) => c.saved).length,
    };

    const [badges, prof, pres, dist] = await Promise.all([
      badgesOf(user.id),
      profileOf(user.id),
      getDb()
        .prepare('SELECT last_seen FROM user_presence WHERE user_id = ?')
        .get(user.id)
        .catch(() => null),
      distincoesOverclock(user.id),
    ]);

    // "online agora" — mesma regra da lista de membros (2 minutos)
    const online = !!(
      pres &&
      pres.last_seen &&
      Date.now() - new Date(pres.last_seen).getTime() < 120000
    );

    res.json({
      found: true,
      profile: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
        badges,
        distincoes: dist,
        online,
        ...prof,
        // as contas de jogo ficam no backend (painel admin) — não saem aqui
      },
      isOwner: isOwnerOrAdmin,
      stats,
      clips,
    });
  } catch (error) {
    console.error('Erro users profile:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Erros próprios deste router (ex.: foto acima do limite)
router.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Foto demasiado grande (máx. 4 MB).' });
  }
  next(err);
});

module.exports = { usersRouter: router };
