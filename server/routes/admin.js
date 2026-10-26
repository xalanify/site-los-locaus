const express = require('express');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const store = require('../usersStore');
const { validateEmail } = require('../emailValidate');

const router = express.Router();

/* Distinções possíveis (tem de coincidir com o cliente) */
const VALID_BADGES = ['dev', 'top1', 'previsao1', 'fortnite-rank1'];

/* Ligação user <-> conta de jogo — mesma lista dos clips (server/clipGames.js) */
const { CLIP_GAME_IDS } = require('../clipGames');
const { notify, enviarPush } = require('../notify');

/* Rótulos das distinções para as notificações */
const BADGE_LABEL = { dev: 'Dev', top1: 'Top 1 Kill de CS (total)', previsao1: '1.º na classificação das previsões', 'fortnite-rank1': 'Rank mais alto Fortnite' };

const count = async (db, sql) => {
  try {
    const row = await db.prepare(sql).get();
    return row ? Number(row.n) : 0;
  } catch {
    return 0;
  }
};

/* ---------- Painel: visão geral de tudo ---------- */
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const users = await store.listAll();
    const [anuncios, comentarios, clips, visitas, distincoes] = await Promise.all([
      count(db, 'SELECT COUNT(*) n FROM posts'),
      count(db, 'SELECT COUNT(*) n FROM post_comments'),
      count(db, 'SELECT COUNT(*) n FROM clips'),
      count(db, 'SELECT COUNT(*) n FROM visitors'),
      count(db, 'SELECT COUNT(*) n FROM user_badges'),
    ]);
    res.json({
      contas: users.length,
      administradores: users.filter((u) => u.is_admin).length,
      anuncios,
      comentarios,
      clips,
      visitas,
      distincoes,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar o painel.' });
  }
});

/* ---------- Lista de contas (+ distinções de cada uma) ---------- */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    let grants = [];
    try {
      grants = await db.prepare('SELECT user_id, badge FROM user_badges').all();
    } catch {
      /* tabela ainda não existe */
    }
    let profiles = [];
    try {
      profiles = await db.prepare('SELECT user_id, avatar_url, game_nick FROM user_profiles').all();
    } catch {
      /* tabela ainda não existe */
    }
    let gameAccounts = [];
    try {
      gameAccounts = await db.prepare('SELECT id, user_id, game, nick FROM user_game_accounts').all();
    } catch {
      /* tabela ainda não existe */
    }
    // CS2: sincroniza o nick com o nome atual da Steam (via Steam ID).
  try {
    const cs2live = require('../cs2live');
    const membros = cs2live.membros() || [];
    const mapaSteam = new Map();
    for (const m of membros) {
      const nick = typeof m === 'string' ? m.trim() : (m && m.nick ? String(m.nick).trim() : '');
      const steam = typeof m === 'string' ? null : (m && m.steam ? String(m.steam) : null);
      if (nick && steam) mapaSteam.set(nick.toLowerCase(), steam);
      if (steam) mapaSteam.set(String(steam).toLowerCase(), steam);
    }
    const key = process.env.STEAM_API_KEY;
    for (const a of gameAccounts) {
      if (String(a.game).toLowerCase() !== 'cs2') continue;
      const steamId =
        mapaSteam.get(String(a.nick || '').trim().toLowerCase()) ||
        (/^7656\d{13}$/.test(String(a.nick || '').trim()) ? String(a.nick).trim() : null);
      if (!steamId || !key) continue;
      try {
        const r = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`,
        );
        const j = await r.json();
        const p = (j && j.response && j.response.players && j.response.players[0]) || null;
        const nomeAtual = p && p.personaname ? String(p.personaname).trim() : null;
        if (nomeAtual && nomeAtual !== a.nick) {
          await db.prepare('UPDATE user_game_accounts SET nick = ? WHERE id = ?').run(nomeAtual, a.id);
          a.nick = nomeAtual;
        }
      } catch {
        /* ignora falhas de rede */
      }
    }
  } catch {
    /* cs2live indisponível */
  }

  const byUser = {};
    for (const g of grants) {
      if (!byUser[g.user_id]) byUser[g.user_id] = [];
      byUser[g.user_id].push(g.badge);
    }
    const accByUser = {};
    for (const a of gameAccounts) {
      if (!accByUser[a.user_id]) accByUser[a.user_id] = [];
      accByUser[a.user_id].push({ id: Number(a.id), game: a.game, nick: a.nick });
    }
    const profByUser = {};
    for (const p of profiles) profByUser[p.user_id] = p;
    /* quem já tem leitura do PC guardada — para o botão "Limpar specs" */
    let specsUsers = new Set();
    try {
      const spr = await db.prepare('SELECT user_id FROM user_specs').all();
      for (const s of spr) specsUsers.add(Number(s.user_id));
    } catch {
      /* tabela ainda não existe */
    }
    const users = (await store.listAll())
      .map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email || null,
        is_admin: Boolean(u.is_admin),
        recovery: Boolean(u.recovery),
        created_at: u.created_at,
        badges: byUser[u.id] || [],
        game_accounts: accByUser[u.id] || [],
        avatar_url: (profByUser[u.id] && profByUser[u.id].avatar_url) || null,
        game_nick: (profByUser[u.id] && profByUser[u.id].game_nick) || null,
        tem_specs: specsUsers.has(Number(u.id)),
      }))
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((u, i) => ({ ...u, display_id: i + 1 }));
    res.json({ users });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar as contas.' });
  }
});

/* ---------- Atribuir distinção a uma conta ---------- */
router.post('/users/:id/badges', requireAdmin, async (req, res) => {
  const badge = String((req.body && req.body.badge) || '');
  const id = Number(req.params.id);
  if (!VALID_BADGES.includes(badge)) {
    return res.status(400).json({ error: 'Distinção inválida.' });
  }
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Conta inválida.' });
  }
  try {
    const db = getDb();
    const r = await db
      .prepare(
        'INSERT INTO user_badges (user_id, badge, granted_by) VALUES (?, ?, ?) ON CONFLICT (user_id, badge) DO NOTHING RETURNING user_id AS id',
      )
      .run(id, badge, req.auth && req.auth.uid ? req.auth.uid : null);
    // avisa a conta (sino + push) — só quando a distinção é mesmo nova
    if (r && r.lastInsertRowid) {
      notify({
        userId: id,
        actorId: req.auth && req.auth.uid ? req.auth.uid : null,
        type: 'badge',
        entity: 'user',
        entityId: id,
        title: `Nova distinção: ${BADGE_LABEL[badge] || badge}`,
        body: 'O admin atribuiu-te uma distinção no site.',
        link: '/perfil',
      }).catch(() => {});
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao atribuir a distinção.' });
  }
});

/* ---------- Retirar distinção ---------- */
router.delete('/users/:id/badges/:badge', requireAdmin, async (req, res) => {
  const badge = String(req.params.badge || '');
  const id = Number(req.params.id);
  if (!VALID_BADGES.includes(badge)) {
    return res.status(400).json({ error: 'Distinção inválida.' });
  }
  try {
    const db = getDb();
    await db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge = ?').run(id, badge);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao retirar a distinção.' });
  }
});

/* ---------- Tornar / retirar admin (nunca a ti mesmo) ---------- */
router.patch('/users/:id/admin', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const value = Boolean(req.body && req.body.is_admin);
    const user = await store.findById(id);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
    if (!value && req.auth && Number(req.auth.uid) === Number(id)) {
      return res.status(400).json({ error: 'Não te podes remover a ti mesmo como admin.' });
    }
    const updated = await store.setAdmin(user.username, value);
    res.json({ ok: true, is_admin: Boolean(updated && updated.is_admin) });
  } catch {
    res.status(500).json({ error: 'Erro ao alterar as permissões.' });
  }
});

/* ---------- Email da conta (obrigatório para recuperar a pass) ---------- */
// PUT /api/admin/users/:id/email  { email }
router.put('/users/:id/email', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await store.findById(id);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });

    const emailCheck = await validateEmail((req.body && req.body.email) || '');
    if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });

    const taken = await store.findByEmail(emailCheck.email);
    if (taken && Number(taken.id) !== Number(id)) {
      return res.status(409).json({ error: 'Esse email já está associado a outra conta.' });
    }

    await store.setEmail(id, emailCheck.email);
    res.json({ ok: true, email: emailCheck.email });
  } catch (error) {
    console.error('Erro admin email:', error.message);
    res.status(500).json({
      error: /em falta|column/i.test(error.message)
        ? 'Falta a coluna "email" na base de dados (ver consola do servidor).'
        : 'Erro ao guardar o email.',
    });
  }
});

/* ---------- Pedidos de recuperação (admin ativa o modo) ---------- */
// GET /api/admin/recovery -> quem pediu "esqueci a pass" + estado da conta
router.get('/recovery', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT pr.username, pr.created_at, u.id AS user_id, u.recovery
         FROM pass_recovery pr
         LEFT JOIN users u ON u.id = pr.user_id
         WHERE pr.status IN ('requested', 'active')
         ORDER BY pr.created_at DESC`,
      )
      .all();
    res.json({ requests: rows });
  } catch {
    res.status(500).json({ error: 'Erro ao carregar pedidos de recuperação.' });
  }
});

/* ---------- Modo recuperação de uma conta (on/off) ---------- */
// PATCH /api/admin/users/:id/recovery  { enabled }
router.patch('/users/:id/recovery', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const enabled = Boolean(req.body && req.body.enabled);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Conta inválida.' });

    const db = getDb();
    const upd = await db.prepare('UPDATE users SET recovery = ? WHERE id = ?').run(enabled, id);
    if (!upd.changes) return res.status(404).json({ error: 'Conta não encontrada.' });
    await db
      .prepare(
        `UPDATE pass_recovery SET status = ?, updated_at = now()
         WHERE user_id = ? AND status IN ('requested', 'sent')`,
      )
      .run(enabled ? 'active' : 'handled', id);

    res.json({ ok: true, recovery: enabled });
  } catch (error) {
    console.error('Erro admin recovery:', error.message);
    res.status(500).json({ error: 'Erro ao alterar o modo de recuperação.' });
  }
});

/* ---------- Ligações user <-> contas de jogo ---------- */
// POST /api/admin/users/:id/game-accounts  { game, nick }
router.post('/users/:id/game-accounts', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const game = String((req.body && req.body.game) || '').trim().toLowerCase();
    const nick = String((req.body && req.body.nick) || '').trim().slice(0, 40);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Conta inválida.' });
    if (!CLIP_GAME_IDS.has(game)) return res.status(400).json({ error: 'Jogo inválido.' });
    if (!nick) return res.status(400).json({ error: 'Escreve o nick nesse jogo.' });

    const db = getDb();
    await db
      .prepare(
        `INSERT INTO user_game_accounts (user_id, game, nick) VALUES (?, ?, ?)
         ON CONFLICT (user_id, game, nick) DO NOTHING`,
      )
      .run(id, game, nick);
    const rows = await db
      .prepare('SELECT id, game, nick FROM user_game_accounts WHERE user_id = ? ORDER BY id')
      .all(id);
    res.json({ ok: true, accounts: rows });
    // a distinção Top 1 Kill de CS reavalia logo — se a nova ligação
    // for a do líder, recebe a badge sem esperar pelo próximo ciclo
    if (game === 'cs2' || game === 'csgo') {
      require('../top1')
        .syncTop1Badge()
        .catch(() => {});
    }
    if (game === 'fortnite') {
      require('../fortniteRank')
        .sincronizar({ forcar: true })
        .catch(() => {});
    }
  } catch (error) {
    console.error('Erro game-accounts:', error.message);
    res.status(500).json({ error: 'Erro ao ligar a conta de jogo.' });
  }
});

// DELETE /api/admin/users/:id/game-accounts/:accId
router.delete('/users/:id/game-accounts/:accId', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const acc = Number(req.params.accId);
    if (!Number.isFinite(id) || !Number.isFinite(acc)) {
      return res.status(400).json({ error: 'Pedido inválido.' });
    }
    const db = getDb();
    await db
      .prepare('DELETE FROM user_game_accounts WHERE id = ? AND user_id = ?')
      .run(acc, id);
    const rows = await db
      .prepare('SELECT id, game, nick FROM user_game_accounts WHERE user_id = ? ORDER BY id')
      .all(id);
    require('../fortniteRank').sincronizar({ forcar: true }).catch(() => {});
    res.json({ ok: true, accounts: rows });
  } catch (error) {
    console.error('Erro game-accounts delete:', error.message);
    res.status(500).json({ error: 'Erro ao retirar a conta de jogo.' });
  }
});

/* ---------- Limpar as specs/PCs de um membro (botão do painel) ----------
   Apaga a linha em user_specs desse membro — PCs, leitura detalhada,
   sinais vitais e avaliação. A próxima leitura recomeça do zero. */
router.post('/users/:id/limpar-specs', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Pedido inválido.' });
    const db = getDb();
    await db.prepare('DELETE FROM user_specs WHERE user_id = ?').run(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro limpar-specs:', error.message);
    res.status(500).json({ error: 'Erro ao limpar as specs.' });
  }
});

/* ---------- Limpar o chat geral (botão do painel admin) ----------
   Apaga TODAS as mensagens e o estado de "a escrever" — o chat
   volta a estar vazio para toda a gente. */
router.post('/chat/limpar', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.prepare('DELETE FROM chat_messages').run();
    await db.prepare('DELETE FROM chat_typing').run().catch(() => {});
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro chat limpar:', error.message);
    res.status(500).json({ error: 'Erro ao limpar o chat.' });
  }
});

/* ---------- Nomes que já aparecem nas estatísticas de cada jogo ----------
   O painel liga um membro a um nome real das estatísticas: o CS2 tem
   os nomes do CS2, o Rainbow os do Rainbow, etc. Cada membro pode ter
   vários nomes no mesmo jogo (contas secundárias). */
const tracker = require('../trackerdata');
const cs2 = require('../cs2data');

/* lista sem repetidos (xandy_R6 / xandy_r6 é o mesmo jogador) */
const uniq = (list) => {
  const seen = new Set();
  const out = [];
  for (const s of list) {
    const v = String(s || '').trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
};

async function namesForGame(game) {
  if (game === 'cs2' || game === 'csgo') {
    // AO VIVO: cs2-steam.json segue os nomes reais da Steam (segue os
    // renames automaticamente), em vez da lista fixa antiga
    try {
      const live = require('../cs2live');
      const m = (live.membros() || [])
        .filter((x) => typeof x === 'object' && x)
        .map((x) => String(x.nick || '').trim())
        .filter(Boolean);
      if (m.length) return uniq(m);
    } catch {}
    return uniq((cs2.TRACKED || []).map((t) => t.name));
  }
  if (game === 'r6') {
    const d = tracker.readJson(tracker.R6_FILE);
    return uniq((d?.players || []).flatMap((p) => [p.handle, p.key]));
  }
  if (game === 'fortnite') {
    const nomes = [];
    try {
      nomes.push(...require('../fortniteauto').links().map((l) => l.nome));
    } catch {}
    try {
      const snap = await require('../fortnitestore').ler();
      nomes.push(
        ...Object.values((snap && snap.jogadores) || {})
          .map((j) => j && j.nome)
          .filter(Boolean),
      );
    } catch {}
    return uniq(nomes.filter(Boolean));
  }
  if (tracker.BF_FILES[game]) {
    const d = tracker.readJson(tracker.BF_FILES[game]);
    return uniq([d && (d.handle || d.name)]);
  }
  return [];
}

router.get('/game-names', requireAdmin, async (req, res) => {
  try {
    const game = String(req.query.game || '').trim().toLowerCase();
    if (!CLIP_GAME_IDS.has(game)) return res.status(400).json({ error: 'Jogo inválido.' });
    res.json({ game, names: await namesForGame(game) });
  } catch (error) {
    console.error('Erro game-names:', error.message);
    res.status(500).json({ error: 'Erro ao ler os nomes do jogo.' });
  }
});

/* ---------- Rainbow Six: atualização automática ---------- */
router.get('/r6/status', requireAdmin, async (req, res) => {
  try {
    res.json(require('../r6auto').status());
  } catch {
    res.json({ ligado: false });
  }
});

/* ---------- Rainbow Six: atualização (manual pelo painel) ----------
   O POST arranca a ida ao tracker.gg e responde logo; o painel
   faz polling a /r6/status e mostra a barra + os logs a andar. */
router.get('/r6/links', requireAdmin, async (req, res) => {
  try {
    const lista = require('../data/r6-jogadores.json');
    const jogadores = (Array.isArray(lista) ? lista : [])
      .map((x) => {
        const nick = typeof x === 'string' ? x : x && x.nick;
        return nick
          ? {
              nick,
              url: `https://r6.tracker.network/profile/pc/${encodeURIComponent(nick)}`,
              operadores: `https://r6.tracker.network/profile/pc/${encodeURIComponent(nick)}/operators`,
            }
          : null;
      })
      .filter(Boolean);
    res.json({ ok: true, jogadores });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/* ---------- Música do perfil (admin): pesquisa no YouTube ---------- */
const MUSICA_CACHE = new Map();
router.get('/musica/search', requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (!q) return res.json({ ok: true, resultados: [] });
    const key = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!key) {
      return res.status(503).json({
        ok: false,
        error: 'Falta a YOUTUBE_API_KEY no servidor para pesquisar músicas.',
        resultados: [],
      });
    }
    const hit = MUSICA_CACHE.get(q);
    if (hit && Date.now() - hit.t < 10 * 60 * 1000) {
      return res.json({ ok: true, resultados: hit.v });
    }
    const url =
      'https://www.googleapis.com/youtube/v3/search?' +
      new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10',
        maxResults: '8',
        q,
        key,
      });
    const r = await fetch(url);
    if (!r.ok) throw new Error('youtube ' + r.status);
    const j = await r.json();
    const resultados = (j.items || []).map((it) => ({
      id: it.id && it.id.videoId,
      titulo: it.snippet && it.snippet.title,
      canal: it.snippet && it.snippet.channelTitle,
      thumb:
        it.snippet &&
        it.snippet.thumbnails &&
        (it.snippet.thumbnails.medium?.url || it.snippet.thumbnails.default?.url),
    })).filter((x) => x.id);
    MUSICA_CACHE.set(q, { t: Date.now(), v: resultados });
    res.json({ ok: true, resultados });
  } catch (e) {
    console.error('Erro admin musica/search:', e.message);
    res.status(502).json({ ok: false, error: 'Não foi possível pesquisar no YouTube.', resultados: [] });
  }
});

router.get('/fortnite/links', requireAdmin, async (req, res) => {
  try {
    res.json({ ok: true, jogadores: require('../fortniteauto').links() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post(
  '/fortnite/import',
  express.json({ limit: '40mb' }),
  requireAdmin,
  async (req, res) => {
    try {
      const fn = require('../fortniteauto');
      const body = req.body || {};
      const itens = Array.isArray(body) ? body : Array.isArray(body.jsons) ? body.jsons : [body];
      const resultados = [];
      for (const it of itens) resultados.push(await fn.importar(it));
      const ok = resultados.filter((r) => r.ok).length;
      if (ok > 0) require('../fortniteRank').sincronizar({ forcar: true }).catch(() => {});
      res.json({ ok: ok > 0, importados: ok, total: resultados.length, resultados });
    } catch (error) {
      console.error('Erro fortnite/import:', error.message);
      res.status(500).json({ ok: false, error: 'Não foi possível importar.' });
    }
  },
);

router.get('/fortnite/status', requireAdmin, async (req, res) => {
  try {
    res.json(await require('../fortniteauto').estado());
  } catch {
    res.json({ ok: false, jogadores: [] });
  }
});

router.post('/r6/refresh', requireAdmin, async (req, res) => {
  try {
    const r6 = require('../r6auto');
    const st = r6.status();
    if (st.trabalho && st.trabalho.aCorrer) {
      return res.status(409).json({ ok: false, motivo: 'em-curso', ...st });
    }
    // arranca e não espera: o painel vê o progresso pelo /status
    r6.refreshNow({ manual: true }).catch((e) => console.error('R6 manual:', e.message));
    res.json({ ok: true, aCorrer: true, ...r6.status() });
  } catch (error) {
    console.error('Erro r6/refresh:', error.message);
    res.status(500).json({ ok: false, error: 'Não foi possível atualizar.' });
  }
});

/* ---------- Rainbow Six: importar JSON guardado (manual) ----------
   O utilizador guarda a página do tracker.gg (JSON) jogador a
   jogador e carrega aqui. O servidor identifica o handle e atualiza. */
router.post(
  '/r6/import',
  express.json({ limit: '40mb' }),
  requireAdmin,
  async (req, res) => {
  try {
    const r6 = require('../r6auto');
    const body = req.body || {};
    // aceita um só JSON ou uma lista deles
    const itens = Array.isArray(body) ? body : Array.isArray(body.jsons) ? body.jsons : [body];
    const resultados = [];
    for (const it of itens) {
      const r = await r6.importarJson(it);
      resultados.push(r);
    }
    const ok = resultados.filter((r) => r.ok).length;
    res.json({ ok: ok > 0, importados: ok, total: resultados.length, resultados });
  } catch (error) {
    console.error('Erro r6/import:', error.message);
    res.status(500).json({ ok: false, error: 'Não foi possível importar.' });
  }
  },
);

/* ---------- Estatísticas (aba "Estatísticas" do painel) ---------- */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const n = async (sql) => {
      try {
        const r = await db.prepare(sql).get();
        return Number(r?.n || 0);
      } catch {
        return 0;
      }
    };
    const list = async (sql) => {
      try {
        return await db.prepare(sql).all();
      } catch {
        return [];
      }
    };

    const [
      clipsTotal,
      clipsPublicos,
      clipsPrivados,
      likes,
      saves,
      downloads,
      views,
      comClips,
      posts,
      usersTotal,
      usersNovos,
      visitasTotal,
      visitasOnline,
    ] = await Promise.all([
      n('SELECT COUNT(*) n FROM clips'),
      n("SELECT COUNT(*) n FROM clips WHERE visibility = 'public'"),
      n("SELECT COUNT(*) n FROM clips WHERE visibility <> 'public'"),
      n('SELECT COALESCE(SUM(likes),0) n FROM clips'),
      n('SELECT COALESCE(SUM(saves),0) n FROM clips'),
      n('SELECT COALESCE(SUM(downloads),0) n FROM clips'),
      n('SELECT COALESCE(SUM(views),0) n FROM clips'),
      n('SELECT COUNT(*) n FROM clip_comments'),
      n('SELECT COUNT(*) n FROM posts'),
      n('SELECT COUNT(*) n FROM users'),
      n("SELECT COUNT(*) n FROM users WHERE created_at > now() - interval '30 days'"),
      n('SELECT COUNT(*) n FROM visitors'),
      n('SELECT COUNT(*) n FROM visitors WHERE is_online = 1'),
    ]);

    const porJogo = await list(`
      SELECT COALESCE(NULLIF(game, ''), 'outro') AS jogo,
             COUNT(*)::int AS n,
             COALESCE(SUM(likes),0)::int AS likes,
             COALESCE(SUM(downloads),0)::int AS downloads
      FROM clips GROUP BY 1 ORDER BY n DESC, jogo ASC`);

    const topClips = await list(`
      SELECT c.id, c.title, c.game, c.likes, c.downloads, c.views, c.created_at, u.username,
             (SELECT COUNT(*) FROM clip_comments cc WHERE cc.clip_id = c.id)::int AS comentarios
      FROM clips c JOIN users u ON u.id = c.user_id
      ORDER BY c.views DESC, c.likes DESC, c.downloads DESC, c.created_at DESC
      LIMIT 5`);

    const topAutores = await list(`
      SELECT u.username, COUNT(*)::int AS n
      FROM clip_comments cc JOIN users u ON u.id = cc.user_id
      GROUP BY u.username ORDER BY n DESC, u.username ASC LIMIT 5`);

    const porDia = await list(`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS dia,
             COALESCE(c.n,0)::int AS clips,
             COALESCE(k.n,0)::int AS comentarios,
             COALESCE(v.n,0)::int AS visitas
      FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') AS d(day)
      LEFT JOIN (SELECT date_trunc('day', created_at) AS dia, COUNT(*) n
                 FROM clips GROUP BY 1) c ON c.dia = d.day
      LEFT JOIN (SELECT date_trunc('day', created_at) AS dia, COUNT(*) n
                 FROM clip_comments GROUP BY 1) k ON k.dia = d.day
      LEFT JOIN (SELECT date_trunc('day', visited_at) AS dia, COUNT(*) n
                 FROM visitors GROUP BY 1) v ON v.dia = d.day
      ORDER BY 1`);

    res.json({
      resumo: {
        clipsTotal,
        clipsPublicos,
        clipsPrivados,
        likes,
        saves,
        downloads,
        views,
        comentarios: comClips,
        posts,
        usersTotal,
        usersNovos,
        visitasTotal,
        visitasOnline,
      },
      porJogo,
      topClips,
      topAutores,
      porDia,
    });
  } catch (error) {
    console.error('Erro admin stats:', error.message);
    res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
  }
});

/* ---------- Notificação de teste (para o admin ver o push no telemóvel) ---------- */
router.post('/teste-notificacao', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const tipo = String((req.body && req.body.tipo) || 'geral').toLowerCase();
    // envia a quem o admin indicar (userId) ou, sem userId, ao próprio admin
    const alvo = Number((req.body && req.body.userId) || req.auth.uid || 0);
    let uid = alvo;
    if (!uid) {
      const u = await db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
      uid = u ? Number(u.id) : 0;
    }
    if (!uid) return res.status(400).json({ ok: false, error: 'Não há utilizadores para testar.' });

    const exemplos = {
      geral: {
        title: '🔔 Locaus · teste',
        body: 'Se estás a ver isto, as notificações funcionam!',
        link: '/',
        tag: 'teste-geral',
        tipo: 'geral',
      },
      chat: {
        title: '💬 Chat geral · teste',
        body: 'O teste de mensagem no chat funcionou. Se ouviste o som, está bom.',
        link: '/chat',
        tag: `teste-chat-${Date.now()}`,
        tipo: 'chat',
      },
      like: {
        title: '❤️ Gosto no teu clip · teste',
        body: 'Alguém gostou de um clip teu (teste).',
        link: '/clips',
        tag: `teste-like-${Date.now()}`,
        tipo: 'like',
      },
      comment: {
        title: '💬 Comentário no teu clip · teste',
        body: '“Este é um comentário de teste para ver se a notificação aparece.”',
        link: '/clips',
        tag: `teste-comment-${Date.now()}`,
        tipo: 'comment',
      },
      live: {
        title: '🔴 Jogo ao vivo · CS2 (teste)',
        body: 'NAVI vs Vitality — o jogo começou!',
        link: '/previsoes',
        tag: `teste-live-${Date.now()}`,
        tipo: 'live',
      },
      news: {
        title: '📰 Notícia nova · teste',
        body: 'Esta é uma notícia de teste para verificares o som e o aviso no Windows.',
        link: '/jogos-steam?aba=noticias',
        tag: `teste-news-${Date.now()}`,
        tipo: 'noticia',
      },
      game: {
        title: '🎮 Jogo ao vivo · Rainbow Six (teste)',
        body: 'G2 vs Team Secret — o jogo começou!',
        link: '/previsoes',
        tag: `teste-game-${Date.now()}`,
        tipo: 'live',
      },
    };
    const dados = exemplos[tipo] || exemplos.geral;

    let id = null;
    if (tipo === 'geral') {
      id = await notify({
        userId: uid,
        type: 'teste',
        entity: 'teste',
        title: dados.title,
        body: dados.body,
        link: dados.link,
        image: '/icon-512.png',
      });
    } else {
      await enviarPush({ userId: uid, ...dados });
    }
    res.json({ ok: true, userId: uid, tipo, push: require('../notify').pushAtivo(), id });
  } catch (error) {
    console.error('Erro teste-notificacao:', error.message);
    res.status(500).json({ ok: false, error: 'Não foi possível enviar a notificação de teste.' });
  }
});

module.exports = { adminRouter: router };
