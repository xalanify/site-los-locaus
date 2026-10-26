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
const TEMA_RE = /^[a-z0-9_-]{1,32}$/;
const COR_RE = /^#[0-9a-fA-F]{6}$/;
const CORES_NOME = new Set([
  '',
  'gold',
  'diamond',
  'damascus',
  'interstellar',
  'darkmatter',
  'chrome',
  'platinum',
  'obsidian',
  'rainbow',
  'red',
  'green',
  'pink',
  'cyan',
]);
const EFEITOS_NOME = new Set(['', 'glow', 'blink', 'pulse', 'shimmer']);

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
        `SELECT avatar_url, game_nick, mouse, dpi, banner_id, background_id, musica_id, musica_url, musica_nome, dynamic_colors, accent_color, name_color, name_effect, borda_cor, fonte_perfil
         FROM user_profiles WHERE user_id = ?`,
      )
      .get(userId);
    return {
      avatar_url: (row && row.avatar_url) || null,
      game_nick: (row && row.game_nick) || null,
      mouse: (row && row.mouse) || null,
      dpi: (row && row.dpi) || null,
      banner_id: (row && row.banner_id) || null,
      background_id: (row && row.background_id) || null,
      musica_id: (row && row.musica_id) || null,
      musica_url: (row && row.musica_url) || null,
      musica_nome: (row && row.musica_nome) || null,
      dynamic_colors: row && row.dynamic_colors != null ? Boolean(row.dynamic_colors) : true,
      accent_color: (row && row.accent_color) || null,
      name_color: (row && row.name_color) || null,
      name_effect: (row && row.name_effect) || null,
      borda_cor: (row && row.borda_cor) || null,
      fonte_perfil: null,
    };
  } catch {
    return {
      avatar_url: null,
      game_nick: null,
      mouse: null,
      dpi: null,
      banner_id: null,
      background_id: null,
      musica_id: null,
      musica_url: null,
      musica_nome: null,
      dynamic_colors: true,
      accent_color: null,
      name_color: null,
      name_effect: null,
      borda_cor: null,
      fonte_perfil: null,
    };
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

/* ID visível e sequencial (1..N) pela ordem de entrada.
   O id real da BD pode saltar (contas apagadas); este nunca salta. */
const displayIdOf = async (userId) => {
  try {
    const row = await getDb()
      .prepare("SELECT COUNT(*)::int AS n FROM users WHERE id <= ? AND COALESCE(password_hash, '') NOT LIKE '!%'")
      .get(userId);
    return Number(row && row.n) || null;
  } catch {
    return null;
  }
};

const publicUser = async (u) => {
  const [prof, badges, dist, displayId] = await Promise.all([
    profileOf(u.id),
    badgesOf(u.id),
    distincoesOverclock(u.id),
    displayIdOf(u.id),
  ]);
  return {
    id: u.id,
    display_id: displayId,
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

// Apagar a própria conta de teste (só nomes que começam por teste-locaus-)
router.delete('/me/teste', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = Number(req.auth.uid);
    const u = await db.prepare('SELECT username FROM users WHERE id = ?').get(uid);
    if (!u || !/^teste-locaus-/i.test(String(u.username || ''))) {
      return res.status(403).json({ error: 'Esta conta não é uma conta de teste.' });
    }
    await db.prepare('DELETE FROM clip_comments WHERE user_id = ?').run(uid).catch(() => {});
    const clipsGostados = await db
      .prepare('SELECT DISTINCT clip_id FROM clip_likes WHERE user_id = ?')
      .all(uid)
      .catch(() => []);
    await db.prepare('DELETE FROM clip_likes WHERE user_id = ?').run(uid).catch(() => {});
    for (const c of clipsGostados) {
      await db
        .prepare(
          'UPDATE clips SET likes = (SELECT count(*)::int FROM clip_likes WHERE clip_id = ?) WHERE id = ?',
        )
        .run(c.clip_id, c.clip_id)
        .catch(() => {});
    }
    // opcional: recalcula todos os contadores de gostos (limpeza de testes)
    if (String(req.query.recalcular || '') === '1') {
      await db
        .prepare(
          'UPDATE clips SET likes = (SELECT count(*)::int FROM clip_likes WHERE clip_id = clips.id)',
        )
        .run()
        .catch(() => {});
    }
    await db.prepare('DELETE FROM clip_saves WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM chat_reactions WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM chat_reads WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM r6_predictions WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM cs2_predictions WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM notifications WHERE user_id = ? OR actor_id = ?').run(uid, uid).catch(() => {});
    await db.prepare('DELETE FROM push_subs WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM user_badges WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM user_profiles WHERE user_id = ?').run(uid).catch(() => {});
    await db.prepare('DELETE FROM users WHERE id = ?').run(uid);
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro apagar conta teste:', e.message);
    res.status(500).json({ error: 'Não deu para apagar a conta de teste.' });
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
    // garante que a distinção de 1.º nas previsões está atualizada
    try {
      await require('../previsoestop1').syncTop1Previsoes();
    } catch {
      /* segue sem distinção */
    }
    const user = await store.findById(req.auth.uid);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
    res.setHeader('Cache-Control', 'no-store');
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
    const hasBanner = Object.prototype.hasOwnProperty.call(body, 'banner_id');
    const hasBackground = Object.prototype.hasOwnProperty.call(body, 'background_id');
    const hasMusic = Object.prototype.hasOwnProperty.call(body, 'musica_id');
    const hasMusicUrl = Object.prototype.hasOwnProperty.call(body, 'musica_url');
    const hasMusicNome = Object.prototype.hasOwnProperty.call(body, 'musica_nome');
    const hasAccent = Object.prototype.hasOwnProperty.call(body, 'accent_color');
    const hasDynamic = Object.prototype.hasOwnProperty.call(body, 'dynamic_colors');
    const hasNameColor = Object.prototype.hasOwnProperty.call(body, 'name_color');
    const hasNameEffect = Object.prototype.hasOwnProperty.call(body, 'name_effect');
    const hasBorda = Object.prototype.hasOwnProperty.call(body, 'borda_cor');
    const musicaAlterada = Boolean(body.musica_alterada);
    if (
      !hasNick &&
      !hasAvatar &&
      !hasMouse &&
      !hasDpi &&
      !hasBanner &&
      !hasBackground &&
      !hasMusic &&
      !hasMusicUrl &&
      !hasMusicNome &&
      !hasAccent &&
      !hasDynamic &&
      !hasNameColor &&
      !hasNameEffect &&
      !hasBorda
    ) {
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

    const guardarTema = async (campo, valor) => {
      const id = String(valor || '').trim();
      if (id && !TEMA_RE.test(id)) {
        return res.status(400).json({ error: 'Tema inválido.' });
      }
      await db
        .prepare(
          `UPDATE user_profiles SET ${campo} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        )
        .run(id || null, uid);
      return null;
    };

    if (hasBanner) {
      const erro = await guardarTema('banner_id', body.banner_id);
      if (erro) return erro;
    }
    if (hasBackground) {
      const erro = await guardarTema('background_id', body.background_id);
      if (erro) return erro;
    }
    if (hasMusic) {
      const erro = await guardarTema('musica_id', body.musica_id);
      if (erro) return erro;
      // user normal escolheu uma música da lista (ou "sem música"):
      // limpa a música do YouTube que o admin possa ter posto
      if (musicaAlterada) {
        const conta = await store.findById(uid);
        const souAdmin = Boolean((req.auth && req.auth.admin) || (conta && conta.is_admin));
        if (!souAdmin) {
          await db
            .prepare(
              'UPDATE user_profiles SET musica_url = NULL, musica_nome = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            )
            .run(uid);
        }
      }
    }
    if (hasMusicUrl || hasMusicNome) {
      const conta = await store.findById(uid);
      const souAdmin = Boolean((req.auth && req.auth.admin) || (conta && conta.is_admin));
      // As músicas pesquisadas no YouTube são só para o admin. Para os
      // restantes users, estes campos são simplesmente ignorados (sem erro).
      if (souAdmin) {
        if (hasMusicUrl) {
          const url = String(body.musica_url || '').trim();
          if (url && !/^yt:[A-Za-z0-9_-]{11}$/.test(url)) {
            return res.status(400).json({ error: 'Música inválida.' });
          }
          await db
            .prepare(
              'UPDATE user_profiles SET musica_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            )
            .run(url || null, uid);
        }
        if (hasMusicNome) {
          const nome = String(body.musica_nome || '').trim().slice(0, 120);
          await db
            .prepare(
              'UPDATE user_profiles SET musica_nome = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            )
            .run(nome || null, uid);
        }
      }
    }
    if (hasAccent) {
      const cor = String(body.accent_color || '').trim();
      if (cor && !COR_RE.test(cor)) {
        return res.status(400).json({ error: 'Cor de destaque inválida.' });
      }
      await db
        .prepare(
          'UPDATE user_profiles SET accent_color = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(cor || null, uid);
    }
    if (hasDynamic) {
      await db
        .prepare(
          'UPDATE user_profiles SET dynamic_colors = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(Boolean(body.dynamic_colors), uid);
    }

    if (hasBorda) {
      const borda = String(body.borda_cor || '').trim();
      if (borda && !['banner', 'branco', 'preto', 'violeta', 'azul', 'verde', 'ambar', 'rosa', 'ciano', 'vermelho', 'roxo'].includes(borda)) {
        return res.status(400).json({ error: 'Cor da borda inválida.' });
      }
      await db
        .prepare(
          'UPDATE user_profiles SET borda_cor = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(borda || null, uid);
    }
    if (hasNameColor || hasNameEffect) {
      const conta = await store.findById(uid);
      const souAdmin = Boolean((req.auth && req.auth.admin) || (conta && conta.is_admin));
      // Cores/efeitos de nome são só para o admin; para os restantes
      // users os campos são ignorados (sem mostrar erro).
      if (souAdmin) {
        if (hasNameColor) {
          const cor = String(body.name_color || '').trim();
          if (!CORES_NOME.has(cor)) {
            return res.status(400).json({ error: 'Cor de nome inválida.' });
          }
          await db
            .prepare(
              'UPDATE user_profiles SET name_color = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            )
            .run(cor || null, uid);
        }
        if (hasNameEffect) {
          const efeito = String(body.name_effect || '').trim();
          if (!EFEITOS_NOME.has(efeito)) {
            return res.status(400).json({ error: 'Efeito de nome inválido.' });
          }
          await db
            .prepare(
              'UPDATE user_profiles SET name_effect = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            )
            .run(efeito || null, uid);
        }
      }
    }

    const user = await store.findById(uid);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada' });
    res.json(await publicUser(user));
  } catch (error) {
    console.error('Erro users profile save:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===================== Recuperação de palavra-passe (via email) =====================
// O utilizador escreve o nome, o site envia um link por email (válido 1h).
// Ao clicar no link abre a página /recuperar?token=... onde define a nova pass.

const crypto = require('crypto');
const mailer = require('../mailer');

// garante que a tabela pass_recovery existe (idempotente)
let passRecoveryTabela = null;
async function garantirPassRecovery() {
  if (passRecoveryTabela !== null) return passRecoveryTabela;
  try {
    const db = getDb();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS public.pass_recovery (
        id         bigint generated by default as identity primary key,
        user_id    bigint not null,
        username   text   not null unique,
        email      text,
        status     text   not null default 'pending',
        token      text,
        expires_at timestamptz,
        code       text,
        attempts   integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_pass_recovery_token ON public.pass_recovery (token)').run();
    passRecoveryTabela = true;
  } catch (e) {
    console.error('pass_recovery (criar tabela):', e.message);
    passRecoveryTabela = false;
  }
  return passRecoveryTabela;
}

// POST /api/users/forgot   { username }  -> envia email com link de reset
router.post('/forgot', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Escreve o teu nome.' });

    const user = await store.findByUsername(username);
    if (!user) return res.status(404).json({ error: 'Não existe nenhuma conta com esse nome.' });

    const email = String(user.email || '').trim();
    if (!email) {
      return res.status(400).json({
        error: 'Esta conta não tem email registado. Pede ao admin para ativar a recuperação manualmente.',
      });
    }

    // gera token aleatório (32 bytes) e guarda só o hash na base
    const token = crypto.randomBytes(32).toString('hex');
    const expiresInMin = 60;
    const expiresAt = new Date(Date.now() + expiresInMin * 60 * 1000).toISOString();

    const db = getDb();
    await garantirPassRecovery();
    await db
      .prepare(
        `INSERT INTO pass_recovery
           (user_id, username, email, status, token, expires_at, attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'sent', ?, ?, 0, now(), now())
         ON CONFLICT(username) DO UPDATE SET
           status = 'sent',
           token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           attempts = 0,
           updated_at = now()`,
      )
      .run(user.id, user.username, email, token, expiresAt);

    const r = await mailer.sendRecoveryEmail({ to: email, username: user.username, token, expiresInMin });
    if (!r.ok && !r.dev) {
      // reverte o token se o email falhou (para o utilizador poder tentar de novo)
      await db
        .prepare('UPDATE pass_recovery SET status = \'requested\', token = NULL, expires_at = NULL, updated_at = now() WHERE username = ?')
        .run(user.username);
      return res.status(500).json({ error: r.error || 'Não foi possível enviar o email. Verifica a configuração de email no servidor (Resend/SMTP).' });
    }

    res.json({ ok: true, dev: Boolean(r.dev) });
  } catch (error) {
    console.error('Erro forgot:', error.message);
    res.status(500).json({ error: 'Erro interno: ' + (error.message || 'desconhecido') });
  }
});

// GET /api/users/reset?token=x -> valida o token e devolve o username
router.get('/reset', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token em falta.' });

    const db = getDb();
    const row = await db
      .prepare(
        `SELECT pr.*, u.id AS uid, u.username AS uname
         FROM pass_recovery pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.token = ? AND pr.status IN ('sent', 'active')`,
      )
      .get(token);
    if (!row) return res.status(400).json({ error: 'Token inválido.' });
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'O link expirou. Pede um novo.' });
    }
    res.json({ ok: true, username: row.uname });
  } catch (error) {
    console.error('Erro reset GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/users/reset  { token, new_password }  -> define a nova pass
router.post('/reset', async (req, res) => {
  try {
    const token = String((req.body && req.body.token) || '').trim();
    const pwdIn = String((req.body && req.body.new_password) || '');
    if (!token) return res.status(400).json({ error: 'Token em falta.' });
    if (pwdIn.length < 6) {
      return res.status(400).json({ error: 'A nova palavra-passe precisa de pelo menos 6 caracteres.' });
    }
    if (pwdIn.length > 100) return res.status(400).json({ error: 'Palavra-passe demasiado longa.' });

    const db = getDb();
    const row = await db
      .prepare(
        `SELECT pr.*, u.id AS uid, u.username AS uname
         FROM pass_recovery pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.token = ? AND pr.status IN ('sent', 'active')`,
      )
      .get(token);
    if (!row) return res.status(400).json({ error: 'Token inválido.' });
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'O link expirou. Pede um novo.' });
    }

    const hash = bcrypt.hashSync(pwdIn, 10);
    await store.updatePassword(row.uid, hash);

    await db
      .prepare(
        `UPDATE pass_recovery SET status = 'used', token = NULL, updated_at = now()
         WHERE id = ?`,
      )
      .run(row.id);

    const fresh = (await store.findById(row.uid)) || { ...row, recovery: false };
    res.json({ token: signUser(fresh), user: await publicUser(fresh) });
  } catch (error) {
    console.error('Erro reset POST:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users/exists?username=x -> existe a conta? (mantido para compatibilidade)
router.get('/exists', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) return res.json({ exists: false, recovery: false });
    const user = await store.findByUsername(username);
    res.json({ exists: !!user, recovery: false });
  } catch {
    res.json({ exists: false, recovery: false });
  }
});

// ===================== Presença + lista de membros =====================
// POST /api/users/presence — o cliente "pinga" de 30 em 30 segundos
router.post('/presence', requireUser, async (req, res) => {
  try {
    const db = getDb();
    // plataforma (pc|mobile) — para mostrar "No PC" / "No Telemóvel"
    const plataforma = String((req.body && req.body.plataforma) || '').toLowerCase();
    const ok = plataforma === 'pc' || plataforma === 'mobile';
    if (ok) {
      await db
        .prepare(
          `INSERT INTO user_presence (user_id, last_seen, plataforma) VALUES (?, now(), ?)
           ON CONFLICT (user_id) DO UPDATE SET last_seen = now(), plataforma = EXCLUDED.plataforma`,
        )
        .run(req.auth.uid, plataforma);
    } else {
      await db
        .prepare(
          `INSERT INTO user_presence (user_id, last_seen) VALUES (?, now())
           ON CONFLICT (user_id) DO UPDATE SET last_seen = now()`,
        )
        .run(req.auth.uid);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro presence:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/users/list — todos os membros + sinal online/offline
router.get('/list', attachAuth, async (req, res) => {
  try {
    require('../fortniteRank').sincronizar().catch(() => {});
    require('../top1').syncTop1Badge().catch(() => {});
    require('../previsoestop1').syncTop1Previsoes().catch(() => {});
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT u.id, u.username,
                (SELECT COUNT(*)::int FROM users u2 WHERE u2.id <= u.id AND COALESCE(u2.password_hash, '') NOT LIKE '!%') AS display_id,
                p.avatar_url, p.mouse, p.dpi, p.banner_id, p.background_id, p.musica_id, p.musica_url, p.musica_nome, p.dynamic_colors, p.accent_color, p.name_color, p.name_effect, p.borda_cor, p.fonte_perfil,
                (p2.last_seen IS NOT NULL AND p2.last_seen > now() - interval '2 minutes') AS online,
                p2.last_seen,
                CASE WHEN p2.last_seen IS NOT NULL AND p2.last_seen > now() - interval '2 minutes'
                     THEN p2.plataforma END AS plataforma
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
        display_id: Number(r.display_id) || null,
        username: r.username,
        avatar_url: r.avatar_url || null,
        mouse: r.mouse || null,
        dpi: r.dpi || null,
        banner_id: r.banner_id || null,
        background_id: r.background_id || null,
        musica_id: r.musica_id || null,
        musica_url: r.musica_url || null,
        musica_nome: r.musica_nome || null,
        dynamic_colors: r.dynamic_colors != null ? Boolean(r.dynamic_colors) : true,
        accent_color: r.accent_color || null,
        name_color: r.name_color || null,
        name_effect: r.name_effect || null,
        borda_cor: r.borda_cor || null,
        fonte_perfil: null,
        online: Boolean(r.online),
        last_seen: r.last_seen ? new Date(r.last_seen).toISOString() : null,
        plataforma: r.online && (r.plataforma === 'pc' || r.plataforma === 'mobile') ? r.plataforma : null,
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

    const [badges, prof, pres, dist, displayId] = await Promise.all([
      badgesOf(user.id),
      profileOf(user.id),
      getDb()
        .prepare('SELECT last_seen FROM user_presence WHERE user_id = ?')
        .get(user.id)
        .catch(() => null),
      distincoesOverclock(user.id),
      displayIdOf(user.id),
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
        display_id: displayId,
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
