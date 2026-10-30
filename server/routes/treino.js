/* ============================================================
   TREINO — pontuações do treino 3D (mira e parkour)
   ------------------------------------------------------------
   Uma linha por tentativa. A leaderboard mostra sempre o melhor
   resultado de cada jogador em cada jogo/modo.
   ============================================================ */
const express = require('express');
const { requireUser } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();

const JOGOS = new Set(['cs2', 'cod', 'finals']);
const MODOS = new Set(['mira', 'parkour', 'surf', 'ff', 'tdm', 'ambos']);

const RANKS = [
  { id: 'bronze', nome: 'Bronze', min: 0, cor: '#b45309' },
  { id: 'prata', nome: 'Prata', min: 600, cor: '#cbd5e1' },
  { id: 'ouro', nome: 'Ouro', min: 1500, cor: '#facc15' },
  { id: 'platina', nome: 'Platina', min: 3000, cor: '#67e8f9' },
  { id: 'diamante', nome: 'Diamante', min: 6000, cor: '#60a5fa' },
  { id: 'crimson', nome: 'Crimson', min: 10000, cor: '#ef4444' },
  { id: 'iridescente', nome: 'Iridescente', min: 16000, cor: '#c084fc' },
  { id: 'top250', nome: 'Top 250', min: 25000, cor: '#f59e0b' },
];

function rankDe(xp) {
  let atual = RANKS[0];
  for (const r of RANKS) if (xp >= r.min) atual = r;
  const idx = RANKS.indexOf(atual);
  const proximo = RANKS[idx + 1] || null;
  const progresso = proximo
    ? Math.round(((xp - atual.min) / (proximo.min - atual.min)) * 100)
    : 100;
  return { ...atual, xp, proximo, progresso };
}

let tabela = null;
function garantirTabela() {
  if (!tabela) {
    tabela = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.treino_scores (
          id          bigint generated always as identity primary key,
          user_id     bigint not null references public.users(id) on delete cascade,
          jogo        text not null,
          modo        text not null,
          pontos      integer not null default 0,
          precisao    integer not null default 0,
          tempo_ms    integer not null default 0,
          arma        text,
          criado_em   timestamptz not null default now()
        );
        CREATE INDEX IF NOT EXISTS treino_scores_lookup
          ON public.treino_scores (jogo, modo, pontos DESC, tempo_ms ASC);
        ALTER TABLE public.treino_scores ADD COLUMN IF NOT EXISTS mortes integer NOT NULL DEFAULT 0;
        ALTER TABLE public.treino_scores ADD COLUMN IF NOT EXISTS mapa text;
        CREATE TABLE IF NOT EXISTS public.cod_stats (
          user_id    bigint primary key references public.users(id) on delete cascade,
          kills      integer not null default 0,
          deaths     integer not null default 0,
          matches    integer not null default 0,
          xp         integer not null default 0,
          updated_at timestamptz not null default now()
        );
      `)
      .then(() => true)
      .catch(() => false);
  }
  return tabela;
}

function limparJogo(v) {
  const s = String(v || '').toLowerCase();
  return JOGOS.has(s) ? s : null;
}
function limparModo(v) {
  const s = String(v || '').toLowerCase();
  return MODOS.has(s) ? s : null;
}

async function leaderboard(jogo, modo, uid) {
  await garantirTabela();
  const db = getDb();
  const porTempo = modo === 'parkour' || modo === 'surf';
  const ordem = porTempo
    ? 'm.tempo_ms ASC, m.pontos DESC, m.criado_em ASC'
    : 'm.pontos DESC, m.precisao DESC, m.tempo_ms ASC, m.criado_em ASC';
  const rows = await db
    .prepare(
      `WITH melhores AS (
         SELECT DISTINCT ON (user_id)
           user_id, pontos, precisao, tempo_ms, arma, criado_em
         FROM public.treino_scores
         WHERE jogo = ? AND modo = ?
         ORDER BY user_id,
           ${porTempo ? 'tempo_ms ASC' : 'pontos DESC'},
           criado_em ASC
       )
       SELECT m.user_id, u.username, pr.avatar_url,
              m.pontos, m.precisao, m.tempo_ms, m.arma, m.criado_em
       FROM melhores m
       JOIN public.users u ON u.id = m.user_id
       LEFT JOIN public.user_profiles pr ON pr.user_id = m.user_id
       WHERE lower(u.username) NOT LIKE 'teste%'
       ORDER BY ${ordem}
       LIMIT 20`,
    )
    .all(jogo, modo);

  return rows.map((r, i) => ({
    posicao: i + 1,
    user_id: Number(r.user_id),
    username: r.username,
    avatar_url: r.avatar_url || null,
    pontos: Number(r.pontos) || 0,
    precisao: Number(r.precisao) || 0,
    tempo_ms: Number(r.tempo_ms) || 0,
    arma: r.arma || null,
    eu: uid ? Number(r.user_id) === Number(uid) : false,
  }));
}

router.get('/leaderboard', requireUser, async (req, res) => {
  try {
    const jogo = limparJogo(req.query.jogo) || 'cs2';
    const modo = limparModo(req.query.modo) || 'mira';
    const uid = Number(req.auth && req.auth.uid) || null;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ jogo, modo, users: await leaderboard(jogo, modo, uid) });
  } catch (e) {
    console.error('Erro leaderboard treino:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir a leaderboard.' });
  }
});

router.post('/score', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    const jogo = limparJogo(req.body && req.body.jogo);
    const modo = limparModo(req.body && req.body.modo);
    if (!jogo || !modo) return res.status(400).json({ error: 'Jogo ou modo inválido.' });

    const pontos = Math.max(0, Math.min(1000000, Math.round(Number(req.body.pontos) || 0)));
    const precisao = Math.max(0, Math.min(100, Math.round(Number(req.body.precisao) || 0)));
    const tempo = Math.max(0, Math.min(3600000, Math.round(Number(req.body.tempo_ms) || 0)));
    const arma = String((req.body && req.body.arma) || '').slice(0, 40) || null;

    await garantirTabela();
    await getDb()
      .prepare(
        `INSERT INTO public.treino_scores (user_id, jogo, modo, pontos, precisao, tempo_ms, arma)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(uid, jogo, modo, pontos, precisao, tempo, arma);

    res.json({ ok: true, users: await leaderboard(jogo, modo, uid) });
  } catch (e) {
    console.error('Erro guardar treino:', e.message);
    res.status(500).json({ error: 'Não foi possível guardar o resultado.' });
  }
});

/* ============================================================
   CALL OF LOCAUS — perfil, rank e resultados de partidas
   ============================================================ */
async function perfilCod(uid) {
  await garantirTabela();
  const db = getDb();
  const row = await db
    .prepare(
      'SELECT kills, deaths, matches, xp FROM public.cod_stats WHERE user_id = ?',
    )
    .get(uid)
    .catch(() => null);
  const kills = Number(row && row.kills) || 0;
  const deaths = Number(row && row.deaths) || 0;
  const matches = Number(row && row.matches) || 0;
  const xp = Number(row && row.xp) || 0;
  return {
    kills,
    deaths,
    matches,
    xp,
    kd: deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills,
    rank: rankDe(xp),
  };
}

router.get('/cod/perfil', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(await perfilCod(uid));
  } catch (e) {
    console.error('Erro perfil COD:', e.message);
    res.status(500).json({ error: 'Não foi possível abrir o perfil.' });
  }
});

router.post('/cod/score', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem utilizador.' });
    const modo = String((req.body && req.body.modo) || 'ff').toLowerCase();
    if (!['ff', 'tdm', 'ambos'].includes(modo)) {
      return res.status(400).json({ error: 'Modo inválido.' });
    }
    const mapa = String((req.body && req.body.mapa) || '').slice(0, 40) || null;
    const kills = Math.max(0, Math.min(10000, Math.round(Number(req.body.kills) || 0)));
    const deaths = Math.max(0, Math.min(10000, Math.round(Number(req.body.deaths) || 0)));
    const tempo = Math.max(0, Math.min(3600000, Math.round(Number(req.body.tempo_ms) || 0)));
    const arma = String((req.body && req.body.arma) || '').slice(0, 40) || null;

    await garantirTabela();
    const db = getDb();
    await db
      .prepare(
        `INSERT INTO public.treino_scores (user_id, jogo, modo, pontos, precisao, tempo_ms, arma, mortes, mapa)
         VALUES (?, 'cod', ?, ?, 0, ?, ?, ?, ?)`,
      )
      .run(uid, modo, kills, tempo, arma, deaths, mapa);

    const xpGanho = kills * 100 + 50;
    await db
      .prepare(
        `INSERT INTO public.cod_stats (user_id, kills, deaths, matches, xp)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           kills = public.cod_stats.kills + EXCLUDED.kills,
           deaths = public.cod_stats.deaths + EXCLUDED.deaths,
           matches = public.cod_stats.matches + 1,
           xp = public.cod_stats.xp + EXCLUDED.xp,
           updated_at = now()`,
      )
      .run(uid, kills, deaths, xpGanho);

    res.json({
      ok: true,
      xpGanho,
      perfil: await perfilCod(uid),
      users: await leaderboard('cod', modo, uid),
    });
  } catch (e) {
    console.error('Erro guardar partida COD:', e.message);
    res.status(500).json({ error: 'Não foi possível guardar a partida.' });
  }
});

module.exports = { treinoRouter: router };
