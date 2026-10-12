const express = require('express');
const fetch = require('node-fetch');
const cs2 = require('../cs2data');
const { syncTop1Badge } = require('../top1');
const stats = require('../gamestats');
const tracker = require('../trackerdata');

const router = express.Router();

const BASE = 'https://proclubs.ea.com/api/fc';
const PLATFORM = process.env.EA_PLATFORM || 'common-gen5';
// Clube do nosso canal — configurado no server/.env
const CLUB_NAME = (process.env.FC_CLUB_NAME || '').trim();
const CLUB_ID_RAW = (process.env.FC_CLUB_ID || '').trim();

// Headers estilo browser — sem eles a Akamai da EA devolve 403
const EA_HEADERS = {
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  referer: 'https://proclubs.ea.com/',
  origin: 'https://proclubs.ea.com',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

const toNum = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

// Cor decimal RGB da EA -> hex
const toHex = (c) => {
  const n = toNum(c);
  return '#' + n.toString(16).padStart(6, '0');
};

async function eaGet(endpoint, params) {
  const qs = new URLSearchParams({ platform: PLATFORM, ...params });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${BASE}/${endpoint}?${qs}`, {
      headers: EA_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`EA ${res.status}`);
    const data = await res.json();
    return data === null ? [] : data;
  } finally {
    clearTimeout(timer);
  }
}

// Cache simples (60s)
const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < 60 * 1000) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

// Resolve o ID do "nosso clube" (ID no .env, ou pesquisa pelo nome no .env)
let resolvedClubId = CLUB_ID_RAW || null;
async function resolveClubId() {
  if (resolvedClubId) return resolvedClubId;
  if (!CLUB_NAME) return null;

  const results = await cached(`search:${CLUB_NAME}`, () =>
    eaGet('allTimeLeaderboard/search', { clubName: CLUB_NAME }),
  );
  const list = Array.isArray(results) ? results : [];
  if (list.length === 0) return null;

  // Nome exato (ignora maiúsculas) ou primeiro resultado
  const exact = list.find((c) => (c.clubName || '').trim().toLowerCase() === CLUB_NAME.toLowerCase());
  const chosen = exact || list[0];
  resolvedClubId = String(chosen.clubId);
  return resolvedClubId;
}

// Estatísticas completas de um clube
async function getClubStats(clubId) {
  return cached(`stats:${clubId}`, async () => {
    const [infoRaw, overallRaw, matchesRaw, membersRaw] = await Promise.all([
      eaGet('clubs/info', { clubIds: clubId }),
      eaGet('clubs/overallStats', { clubIds: clubId }),
      eaGet('clubs/matches', { clubIds: clubId, matchType: 'leagueMatch', maxResultCount: '10' }),
      eaGet('members/stats', { clubId }).catch(() => ({ members: [] })),
    ]);

    const info =
      infoRaw && typeof infoRaw === 'object' && !Array.isArray(infoRaw)
        ? infoRaw[clubId] || Object.values(infoRaw)[0]
        : null;

    const overall = Array.isArray(overallRaw) ? overallRaw[0] || {} : {};
    const kit = info?.customKit || {};

    // Escudo do clube: cores do kit (a API não tem imagem de logo)
    const crest = {
      color1: toHex(kit.kitColor1 || 16777215),
      color2: toHex(kit.kitColor2 || 0),
      color3: toHex(kit.kitColor3 || 0),
    };

    const matches = (Array.isArray(matchesRaw) ? matchesRaw : []).map((m) => {
      const clubs = m.clubs || {};
      const us = clubs[clubId];
      const oppId = Object.keys(clubs).find((id) => id !== clubId);
      const them = oppId ? clubs[oppId] : null;

      const gf = toNum(us?.goals);
      const ga = toNum(us?.goalsAgainst);

      let result;
      if (us?.wins === '1') result = 'win';
      else if (us?.losses === '1') result = 'loss';
      else if (us?.ties === '1') result = 'draw';
      else if (gf > ga) result = 'win';
      else if (gf < ga) result = 'loss';
      else result = 'draw';

      const t = Number(m.timestamp);
      let date = '';
      if (Number.isFinite(t)) {
        try {
          date = new Date(t * 1000).toLocaleDateString('pt-PT');
        } catch {
          date = '';
        }
      }

      return {
        matchId: m.matchId,
        date,
        opponent: them?.details?.name || 'Desconhecido',
        opponentId: oppId,
        goalsFor: gf,
        goalsAgainst: ga,
        result,
        dnf: us?.winnerByDnf === '1' || them?.winnerByDnf === '1',
      };
    });

    const members = (membersRaw?.members || []).map((p) => ({
      name: p.name || '???',
      gamesPlayed: toNum(p.gamesPlayed),
      goals: toNum(p.goals),
      assists: toNum(p.assists),
      winRate: toNum(p.winRate),
      rating: parseFloat(p.ratingAve) || 0,
      manOfTheMatch: toNum(p.manOfTheMatch),
      position: p.favoritePosition || '',
    }));

    return {
      club: {
        clubId,
        name: info?.name || CLUB_NAME || 'O Nosso Clube',
        stadium: info?.customKit?.stadName || '',
        crest,
      },
      overall: {
        gamesPlayed: toNum(overall.gamesPlayed),
        wins: toNum(overall.wins),
        ties: toNum(overall.ties),
        losses: toNum(overall.losses),
        goals: toNum(overall.goals),
        goalsAgainst: toNum(overall.goalsAgainst),
        skillRating: toNum(overall.skillRating),
        winStreak: toNum(overall.wstreak),
        unbeatenStreak: toNum(overall.unbeatenstreak),
        promotions: toNum(overall.promotions),
        relegations: toNum(overall.relegations),
        bestDivision: overall.bestDivision || null,
      },
      matches,
      members,
    };
  });
}

// O NOSSO clube — carrega direto, sem pesquisa
router.get('/my-club', async (req, res) => {
  try {
    if (!CLUB_NAME && !CLUB_ID_RAW) {
      return res.json({ configured: false });
    }
    const clubId = await resolveClubId();
    if (!clubId) {
      return res.json({ configured: true, found: false, name: CLUB_NAME });
    }
    const stats = await getClubStats(clubId);
    res.json({ configured: true, found: true, ...stats });
  } catch (error) {
    console.error('Erro my-club:', error.message);
    res.status(502).json({ error: 'Não foi possível contactar a EA. Tenta daqui a pouco.' });
  }
});

// Pesquisar clube por nome (alternativa manual)
router.get('/club/search', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: 'Nome do clube em falta' });

    const results = await cached(`search:${name}`, () =>
      eaGet('allTimeLeaderboard/search', { clubName: name }),
    );

    const clubs = (Array.isArray(results) ? results : []).map((c) => ({
      clubId: String(c.clubId),
      name: c.clubName || c.clubInfo?.name || 'Sem nome',
      division: c.currentDivision || '-',
      gamesPlayed: toNum(c.gamesPlayed),
    }));

    res.json(clubs.slice(0, 20));
  } catch (error) {
    console.error('Erro club search:', error.message);
    res.status(502).json({ error: 'Não foi possível contactar a EA. Tenta daqui a pouco.' });
  }
});

// Estatísticas de um clube específico (ID)
router.get('/club/:id/stats', async (req, res) => {
  try {
    const clubId = String(req.params.id).replace(/[^0-9]/g, '');
    if (!clubId) return res.status(400).json({ error: 'ID inválido' });
    const stats = await getClubStats(clubId);
    res.json(stats);
  } catch (error) {
    console.error('Erro club stats:', error.message);
    res.status(502).json({ error: 'Não foi possível obter as estatísticas da EA.' });
  }
});

// ============================================================
// CS2 — páginas HTML do histórico da Steam guardadas pelo
// utilizador (historico-*.html na raiz do projeto)
// ============================================================
router.get('/cs2', (req, res) => {
  try {
    const data = cs2.getData();
    // Histórico pode ter mudado — revalida o TOP 1 KILL automático
    syncTop1Badge();
    res.json(data);
  } catch (error) {
    console.error('Erro cs2:', error.message);
    res.status(500).json({
      configured: false,
      error: 'Não foi possível analisar os ficheiros do histórico.',
    });
  }
});

// ============================================================
// Atualizações > Jogos — números reais de jogadores
// (Steam API + Steam Charts) por jogo
// ============================================================
router.get('/live', async (req, res) => {
  try {
    res.json(await stats.getLive());
  } catch (error) {
    console.error('Erro games/live:', error.message);
    res.status(502).json({ error: 'Sem ligação à Steam. Tenta daqui a pouco.' });
  }
});

// Atualizações/notícias oficiais de um jogo (com fonte)
router.get('/news', async (req, res) => {
  try {
    const id = String(req.query.game || '').trim();
    const data = await stats.getNews(id);
    if (!data) return res.status(400).json({ error: 'Jogo desconhecido.' });
    res.json(data);
  } catch (error) {
    console.error('Erro games/news:', error.message);
    res.status(502).json({ error: 'Sem ligação à Steam. Tenta daqui a pouco.' });
  }
});

// ============================================================
// Rainbow Six Siege — snapshot colhido no tracker.gg
// (server/data/r6.json)
// ============================================================
router.get('/r6', (req, res) => {
  try {
    const data = tracker.readJson(tracker.R6_FILE);
    if (!data) return res.json({ configured: false, missing: tracker.missing(tracker.R6_FILE) });
    // estado da atualização automática (tracker API, a cada X min)
    let auto = null;
    try {
      auto = require('../r6auto').status();
    } catch {
      auto = null;
    }
    res.json({ ...data, auto });
  } catch (error) {
    console.error('Erro games/r6:', error.message);
    res.status(500).json({ configured: false, error: 'Não foi possível ler os dados do Rainbow Six.' });
  }
});

// ============================================================
// Battlefield — BF1 / BFV / BF6 (server/data/bf*.json)
// ============================================================
router.get('/bf', (req, res) => {
  try {
    const g = String(req.query.g || '').trim().toLowerCase();
    const file = tracker.BF_FILES[g];
    if (!file) return res.status(400).json({ error: 'Jogo inválido.' });
    const data = tracker.readJson(file);
    if (!data) return res.json({ configured: false, missing: tracker.missing(file) });
    res.json(data);
  } catch (error) {
    console.error('Erro games/bf:', error.message);
    res.status(500).json({ configured: false, error: 'Não foi possível ler os dados do Battlefield.' });
  }
});

module.exports = { gamesRouter: router };
