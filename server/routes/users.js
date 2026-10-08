const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../database');
const store = require('../usersStore');
const storage = require('../storage');
const { validateEmail } = require('../emailValidate');
const { sendRecoveryEmail } = require('../mailer');
const { JWT_SECRET, attachAuth } = require('../middleware/auth');
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
      .prepare('SELECT avatar_url, game_nick FROM user_profiles WHERE user_id = ?')
      .get(userId);
    return {
      avatar_url: (row && row.avatar_url) || null,
      game_nick: (row && row.game_nick) || null,
    };
  } catch {
    return { avatar_url: null, game_nick: null };
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

const publicUser = async (u) => {
  const [prof, badges] = await Promise.all([profileOf(u.id), badgesOf(u.id)]);
  return {
    id: u.id,
    username: u.username,
    email: u.email || null,
    is_admin: Boolean(u.is_admin),
    created_at: u.created_at,
    ...prof,
    badges,
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

// Guardar dados do perfil (nick no CS2; avatar_url opcional para limpar)
router.put('/me/profile', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) {
    return res.status(401).json({ error: 'Sessão não iniciada' });
  }
  try {
    const uid = Number(req.auth.uid);
    const body = req.body || {};
    const hasNick = Object.prototype.hasOwnProperty.call(body, 'game_nick');
    const hasAvatar = Object.prototype.hasOwnProperty.call(body, 'avatar_url');
    if (!hasNick && !hasAvatar) {
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

    const user = await store.findById(uid);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
    res.json(await publicUser(user));
  } catch (error) {
    console.error('Erro users profile save:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===================== Recuperação de palavra-passe (por email) =====================
const RECOVERY_TTL_MIN = 60;

// Esconde parte do email: xalanix@gmail.com -> xa***@gmail.com
function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${'*'.repeat(Math.max(3, user.length - head.length))}@${domain}`;
}

const EXPIRED_SQL = `CASE WHEN now() > expires_at THEN 1 ELSE 0 END AS expired`;

// POST /api/users/forgot   { username }  -> envia link de recuperação por email
router.post('/forgot', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Escreve o teu nome.' });

    const user = await store.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'Não existe nenhuma conta com esse nome.' });

    const email = String(user.email || '').trim();
    if (!email) {
      return res.status(400).json({
        error: 'Esta conta ainda não tem email associado. Pede ao admin para adicionar um no painel.',
      });
    }

    // Token de uso único (64 hex) — nunca volta ao browser em produção
    const token = crypto.randomBytes(32).toString('hex');
    const db = getDb();
    await db
      .prepare(
        `INSERT INTO pass_recovery
           (user_id, username, email, status, token, expires_at, attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'sent', ?, now() + interval '60 minutes', 0, now(), now())
         ON CONFLICT(username) DO UPDATE SET
           email = excluded.email,
           status = 'sent',
           token = excluded.token,
           expires_at = excluded.expires_at,
           attempts = 0,
           updated_at = now()`,
      )
      .run(user.id, user.username, email, token);

    const sent = await sendRecoveryEmail({
      to: email,
      username: user.username,
      token,
      expiresInMin: RECOVERY_TTL_MIN,
    });
    if (!sent.ok) return res.status(500).json({ error: sent.error || 'Não foi possível enviar o email.' });

    res.json({
      ok: true,
      masked: maskEmail(email),
      // Só existe em modo local (sem SMTP) — para poderes testar sem email real
      ...(sent.dev ? { dev: true, devUrl: sent.url } : {}),
    });
  } catch (error) {
    console.error('Erro forgot:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users/recovery?token=x -> valida o link e devolve a conta (ecrã de nova pass)
router.get('/recovery', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!/^[a-f0-9]{32,128}$/i.test(token)) {
      return res.status(400).json({ error: 'Link inválido.' });
    }

    const db = getDb();
    const row = await db
      .prepare(`SELECT *, ${EXPIRED_SQL} FROM pass_recovery WHERE token = ?`)
      .get(token);

    if (!row) return res.status(404).json({ error: 'Link inválido ou já foi usado.' });
    if (row.status === 'used') return res.status(410).json({ error: 'Este link já foi usado. Pede um novo.' });
    if (Number(row.expired) === 1) {
      await db.prepare(`UPDATE pass_recovery SET status = 'locked', token = NULL WHERE id = ?`).run(row.id);
      return res.status(410).json({ error: 'O link expirou (60 min). Pede um novo.' });
    }

    res.json({ ok: true, username: row.username, email: maskEmail(row.email || '') });
  } catch (error) {
    console.error('Erro recovery link:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/users/recovery/reset  { token, new_password }
router.post('/recovery/reset', async (req, res) => {
  try {
    const token = String((req.body && req.body.token) || '').trim();
    const pwdIn = String((req.body && req.body.new_password) || '');

    if (!/^[a-f0-9]{32,128}$/i.test(token)) {
      return res.status(400).json({ error: 'Link inválido.' });
    }
    if (pwdIn.length < 6) {
      return res.status(400).json({ error: 'A nova palavra-passe precisa de pelo menos 6 caracteres.' });
    }
    if (pwdIn.length > 100) return res.status(400).json({ error: 'Palavra-passe demasiado longa.' });

    const db = getDb();
    const row = await db
      .prepare(`SELECT *, ${EXPIRED_SQL} FROM pass_recovery WHERE token = ?`)
      .get(token);

    if (!row) return res.status(404).json({ error: 'Link inválido ou já foi usado.' });
    if (row.status === 'used') return res.status(410).json({ error: 'Este link já foi usado. Pede um novo.' });
    if (Number(row.expired) === 1) {
      await db.prepare(`UPDATE pass_recovery SET status = 'locked', token = NULL WHERE id = ?`).run(row.id);
      return res.status(410).json({ error: 'O link expirou (60 min). Pede um novo.' });
    }

    const user = await store.findByUsername(row.username);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });

    // Consome o token ANTES de alterar (só pode ser usado uma vez)
    const consumed = await db
      .prepare(
        `UPDATE pass_recovery SET status = 'used', token = NULL, updated_at = now() WHERE id = ? AND status = 'sent'`,
      )
      .run(row.id);
    if (!consumed.changes) {
      return res.status(410).json({ error: 'Este link já foi usado. Pede um novo.' });
    }

    const hash = bcrypt.hashSync(pwdIn, 10);
    try {
      await store.updatePassword(user.id, hash);
    } catch (e) {
      // Devolve o token para não bloquear a conta se a BD falhar
      await db
        .prepare(`UPDATE pass_recovery SET status = 'sent', token = ?, updated_at = now() WHERE id = ?`)
        .run(token, row.id);
      console.error('Erro updatePassword:', e.message);
      return res.status(500).json({ error: 'Não foi possível atualizar a palavra-passe.' });
    }

    const fresh = await store.findByUsername(row.username);
    const who = fresh || user;
    res.json({ ok: true, token: signUser(who), user: await publicUser(who) });
  } catch (error) {
    console.error('Erro recovery reset:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users/exists?username=x -> existe a conta? (para mostrar "Esqueci a pass")
router.get('/exists', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) return res.json({ exists: false });
    const user = await store.findByUsername(username);
    res.json({ exists: !!user });
  } catch {
    res.json({ exists: false });
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
        `SELECT c.*, u.username FROM clips c
         JOIN users u ON u.id = c.user_id
         WHERE c.user_id = ? AND (c.visibility = 'public' OR ? = 1)
         ORDER BY c.created_at DESC, c.id DESC LIMIT 100`,
      )
      .all(user.id, isOwnerOrAdmin ? 1 : 0);

    const clips = await decorateClips(db, rows, auth);
    const stats = {
      clips: clips.length,
      likes: clips.reduce((s, c) => s + c.likes, 0),
      downloads: clips.reduce((s, c) => s + c.downloads, 0),
      saved: clips.filter((c) => c.saved).length,
    };

    const [badges, prof] = await Promise.all([badgesOf(user.id), profileOf(user.id)]);

    res.json({
      found: true,
      profile: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
        badges,
        ...prof,
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
