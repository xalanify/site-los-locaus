const express = require('express');
const fetch = require('node-fetch');
const cs2 = require('../cs2data');
const cs2live = require('../cs2live');
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
// CS2 AO VIVO — Steam Web API oficial (ISteamUserStats).
// Automático para sempre: a Steam mantém os números frescos.
// Precisa de STEAM_API_KEY no server/.env (key gratuita, criada
// uma vez em steamcommunity.com/dev/apikey) e dos membros em
// server/data/cs2-steam.json → [{ nick, steam: "7656119..." }]
// ============================================================
// ============================================================
// CS2 AO VIVO — Steam Web API oficial (ISteamUserStats).
// Nada manual: a Steam mantém os números frescos; os amigos
// precisam apenas de "Detalhes do jogo" público no perfil.
// Precisa de STEAM_API_KEY no server/.env (key gratuita) e dos
// membros em server/data/cs2-steam.json → [{ nick, steam }] ou
// só ["nome-da-steam"] (servidor resolve os IDs sozinho).
// ============================================================
router.get('/cs2-live', async (req, res) => {
  try {
    res.json(await cs2live.aoVivo());
  } catch (error) {
    console.error('Erro cs2-live:', error.message);
    res.status(502).json({ ok: false, motivo: 'erro' });
  }
});

// Ligar jogador CS2 só pelo NOME público da Steam (sem IDs à mão):
// o servidor resolve o nickname → SteamID64 num perfil público e
// grava em server/data/cs2-steam.json sozinho.
router.post('/cs2-ligar', async (req, res) => {
  const nick = String(req.body?.nick || req.query.nick || '').trim();
  if (!nick) return res.status(400).json({ error: 'Escreve o nome da Steam.' });
  try {
    const id = await cs2live.resolveNick(nick);
    if (!id) {
      return res.status(404).json({
        error: `Perfil público "steamcommunity.com/id/${nick}" não existe ou o perfil é privado. Usa o nome personalizado do URL da Steam.`,
      });
    }
    const r = cs2live.ligar(nick, id);
    res.json({ ok: true, nick, steam: id, ...r });
  } catch (error) {
    console.error('Erro cs2-ligar:', error.message);
    res.status(502).json({ error: 'Sem ligação à Steam. Tenta de novo.' });
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
// ============================================================
// Rainbow Six Siege — API OFICIAL DA UBISOFT (open source
// SwiftCODA/R6-API): login Ubisoft → perfis, nível, carreira e
// rank da temporada. Sem tracker.gg, sem HTML manual.
// server/data/r6-jogadores.json = ["xalana.", "m4xi01504", ...]
// ============================================================
const r6ubi = require('../r6ubi');

router.get('/r6', async (req, res) => {
  try {
    const ubi = r6ubi.dados();
    const t = await r6ubi.status();
    if (ubi?.ok) {
      return res.json({
        ...ubi,
        auto: {
          fonte: 'ubisoft',
          ligado: t.credencial,
          intervaloMin: t.intervaloMin,
          ultimaTentativa: t.ultimaTentativa,
          ultimoErro: t.ultimoErro,
          credencial: t.credencial,
        },
      });
    }

    // Recuo (antes de configurares a conta Ubisoft no .env) — serve
    // o último dado que existir para a página não ficar vazia.
    const data = tracker.readJson(tracker.R6_FILE);
    const auto = {
      fonte: 'ubisoft',
      ligado: !!t.credencial,
      credencial: !!t.credencial,
      motivo: t.credencial ? (t.ultimoErro || 'a-sincronizar') : 'sem-credenciais',
      ultimoErro: t.ultimoErro || null,
      ultimaTentativa: t.ultimaTentativa || null,
    };
    if (!data) return res.json({ configured: false, missing: tracker.missing(tracker.R6_FILE) });
    return res.json({ ...data, auto });
  } catch (error) {
    console.error('Erro games/r6:', error.message);
    res.status(500).json({ configured: false, error: 'Não foi possível ler os dados do Rainbow Six.' });
  }
});

// ============================================================
// Battlefield LIVE — via gametools.network (API comunitária
// gratuita: github.com/community-network). Devolve as stats
// dos NOSSOS jogadores apenas. Se a API vender-se, usa o
// snapshot tracker.gg guardado em server/data/bf*.json.
// ============================================================
const BF_LIVE_CACHE = new Map();

// handles que acompanhamos por jogo (bf1/bfv/bf6)
function bfHandles(g) {
  let jog = [];
  try {
    jog = require(`../data/bf-jogadores.json`);
    if (Array.isArray(jog[g])) jog = jog[g];
    else if (!Array.isArray(jog)) jog = [];
  } catch {
    jog = [];
  }
  if (!jog.length) {
    try {
      const snap = tracker.readJson(tracker.BF_FILES[g]);
      if (snap && snap.handle) jog = [{ handle: snap.handle }];
    } catch {}
  }
  return jog.filter((x) => (x.handle || x.name || '').trim());
}

const PICKNUM = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

/* campos que vêm em texto "46.2%" (BF6 usa % em string) */
const PICKPCT = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v.replace('%', '').trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
};

const GTOOLS_GAME = { bf1: 'bf1', bfv: 'bfv', bf4: 'bf4', bf2042: 'bf2042', bf6: 'bf6' };

async function gtoolsStatsFor(g, handle) {
  const url = `https://api.gametools.network/${GTOOLS_GAME[g]}/stats/?name=${encodeURIComponent(handle)}&lang=en-us`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`gametools ${r.status}`);
    const d = await r.json();
    // a API devolve um array por plataformas; usa o primeiro bloco útil
    const b = Array.isArray(d) && d.length ? d[0] : d;
    return {
      ok: true,
      handle: b?.userName || handle,
      nome: b?.userName || handle,
      avatar: b?.avatar || null,
      rank: PICKNUM(b, ['rank']),
      rankNome: b?.rankName || null,
      rankImg: b?.rankImg || null,
      skill: PICKNUM(b, ['skill']),
      kd: PICKNUM(b, ['killDeath', 'kdRatio', 'kd']),
      kdInfantaria: PICKNUM(b, ['infantryKillDeath']),
      kills: PICKNUM(b, ['kills']),
      deaths: PICKNUM(b, ['deaths']),
      killsMin: PICKNUM(b, ['killsPerMinute']),
      vitorias: PICKNUM(b, ['wins']),
      derrotas: PICKNUM(b, ['loses', 'losses']),
      winPct: PICKPCT(b, ['winPercent']),
      partidas: PICKNUM(b, ['matchesPlayed']),
      spm: PICKNUM(b, ['scorePerMinute']),
      dano: PICKNUM(b, ['damage']),
      danosMin: PICKNUM(b, ['damagePerMinute']),
      classeTop: b?.bestClass || null,
      precisao: PICKPCT(b, ['accuracy']),
      headshots: PICKNUM(b, ['headShots', 'headshots']),
      hsPct: PICKPCT(b, ['headshots']),
      hsMax: PICKNUM(b, ['longestHeadShot']),
      sequencia: PICKNUM(b, ['highestKillStreak']),
      rondas: PICKNUM(b, ['roundsPlayed']),
      revives: PICKNUM(b, ['revives']),
      dogtags: PICKNUM(b, ['dogtagsTaken']),
      segundos: PICKNUM(b, ['secondsPlayed', 'timePlayed']),
    };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

/* Armas do jogador (com imagens da EA) — top por kills */
async function gtoolsArmasFor(g, handle) {
  const url = `https://api.gametools.network/${GTOOLS_GAME[g]}/weapons/?name=${encodeURIComponent(handle)}&lang=en-us`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) return [];
    const d = await r.json();
    const b = Array.isArray(d) && d.length ? d[0] : d;
    const lista = b?.weapons || [];
    return lista
      .filter((x) => Number(x?.kills) > 0)
      .sort((a, z) => Number(z.kills) - Number(a.kills))
      .slice(0, 12)
      .map((x) => ({
        nome: x.weaponName || '—',
        tipo: x.type || '',
        imagem: x.image || null,
        kills: Number(x.kills) || 0,
        kpm: PICKNUM(x, ['killsPerMinute']),
        headshotKills: PICKNUM(x, ['headshotKills']),
        segundos: PICKNUM(x, ['secondsEquipped', 'timeEquipped']),
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

router.get('/bf-live', async (req, res) => {
  try {
    const g = String(req.query.g || '').trim().toLowerCase();
    if (!tracker.BF_FILES[g]) return res.status(400).json({ error: 'Jogo inválido.' });
    if (!GTOOLS_GAME[g]) return res.json({ ok: false, error: 'Jogo sem suporte na API.' });

    const chave = `bf-live:${g}`;
    const hit = BF_LIVE_CACHE.get(chave);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) return res.json(hit.v);

    // armas? (?armas=1) — vêm com imagens e são guardadas junto
    const comArmas = req.query.armas === '1';
    const jogadores = bfHandles(g).slice(0, 8); // máximo 8 por pedido
    const live = await Promise.all(
      jogadores.map(async (x) => {
        const handle = x.handle || x.name;
        const r = await gtoolsStatsFor(g, handle);
        if (!r.ok) {
          // fallback: snapshot tracker.gg de uma só pessoa
          try {
            const snap = tracker.readJson(tracker.BF_FILES[g]);
            const o = snap?.overview || {};
            return {
              ok: true, fonte: 'snapshot', handle, nome: x.nome || handle,
              rank: o.rank ?? o.careerPlayerRank ?? null,
              kd: o.kdRatio ?? null, kills: o.kills ?? null, deaths: o.deaths ?? null,
              wins: o.wins ?? o.matchesWon ?? null,
              losses: o.losses ?? o.matchesLost ?? null,
              score: o.score ?? null, spm: o.scorePerMinute ?? null,
              segundos: o.timePlayed ?? null,
              armas: comArmas ? [] : undefined,
            };
          } catch {
            return { ok: false, handle, erro: r.erro || 'indisponível' };
          }
        }
        if (comArmas) r.armas = await gtoolsArmasFor(g, handle);
        return { ...r, fonte: 'gametools' };
      }),
    );
    const payload = { ok: true, jogo: g, aoVivo: live.some((p) => p.fonte === 'gametools'), jogadores: live };
    BF_LIVE_CACHE.set(chave, { t: Date.now(), v: payload });
    res.json(payload);
  } catch (error) {
    console.error('Erro games/bf-live:', error.message);
    res.status(502).json({ ok: false, error: 'Sem ligação ao gametools.network.' });
  }
});

// ============================================================
// Fortnite — pesquisa por nome via fortnite-api.com (grátis)
// Ainda não temos jogadores fixos: aqui quem pesquisa é o user.
// ============================================================
router.get('/fortnite-player', async (req, res) => {
  const nome = String(req.query.name || '').trim();
  if (!nome) return res.status(400).json({ error: 'Escreve o nome do jogador.' });
  const chave = `fn:${nome.toLowerCase()}`;
  const hit = BF_LIVE_CACHE.get(chave);
  if (hit && Date.now() - hit.t < 3 * 60 * 1000) return res.json(hit.v);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  // fortnite-api.com mantém as stats abertas mas pede um token
  // de acesso GRATUITO (pede-se no Discord deles, fica guardado
  // no server/.env como FORTNITE_API_TOKEN). Sem token mostra
  // mensagem clara; com token tudo é automático para sempre.
  const token = (process.env.FORTNITE_API_TOKEN || '').trim();
  try {
    const r = await fetch(
      `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(nome)}`,
      {
        signal: controller.signal,
        headers: token ? { Authorization: token } : {},
      },
    );
    if (r.status === 401 || r.status === 403) {
      return res.status(503).json({
        error: token
          ? 'O token da Fortnite API não é válido. Confirma o FORTNITE_API_TOKEN no server/.env.'
          : 'A Fortnite API pede um token de acesso gratuito. Configura FORTNITE_API_TOKEN no server/.env (obtém-se em dash.fortnite-api.com, após entrar no Discord discord.gg/fortniteapi).',
      });
    }
    if (r.status === 404) return res.status(404).json({ error: `Não encontramos "${nome}".` });
    if (!r.ok) throw new Error(`fortnite-api ${r.status}`);
    const j = await r.json();
    const d = j?.data || {};
    // Endpoint atual (/v2/stats/br/v2): data.stats.all.{overall,solo,duo,squad}.
    // Ajustamos account.avatar/level (vêm noutros campos) para o frontend.
    const payload = {
      ok: true,
      data: {
        ...d,
        account: {
          ...(d.account || {}),
          avatar: d.image || null,
          level: d.battlePass?.level ?? null,
        },
      },
    };
    BF_LIVE_CACHE.set(chave, { t: Date.now(), v: payload });
    res.json(payload);
  } catch (e) {
    res.status(502).json({ error: 'Sem ligação à Fortnite API. Tenta daqui a pouco.' });
  } finally {
    clearTimeout(timer);
  }
});
// ============================================================
// Battlefield — BF1 / BFV / BF6 (snapshot tracker.gg)
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

// ============================================================
// Skins/amuletos mais raros (aba de cada página de jogo)
// ============================================================
let SKINS_RAROS = null;
try {
  SKINS_RAROS = require('../data/skins-raros.json');
} catch {}

router.get('/skins-raros', (req, res) => {
  res.json(SKINS_RAROS || {});
});

// ============================================================
// Diagnóstico — o que está configurado e o que falta
// Mostra ao admin exatamente o que tem de fazer para cada
// jogo ter stats ao vivo (chaves no .env da Vercel).
// ============================================================
router.get('/diagnostico', (req, res) => {
  try {
    const steamKey = Boolean((process.env.STEAM_API_KEY || '').trim());
    const ubiEmail = Boolean((process.env.UBI_EMAIL || '').trim());
    const ubiPass = Boolean((process.env.UBI_PASSWORD || '').trim());
    const fnToken = Boolean((process.env.FORTNITE_API_TOKEN || '').trim());

    let r6Jogadores = [];
    try {
      const j = require('../data/r6-jogadores.json');
      if (Array.isArray(j)) r6Jogadores = j.map((x) => (typeof x === 'string' ? x : x.nick)).filter(Boolean);
    } catch {}

    let cs2Membros = [];
    try {
      const live = require('../cs2live');
      cs2Membros = (live.membros() || []).map((m) => (typeof m === 'string' ? m : m.nick)).filter(Boolean);
    } catch {}

    res.json({
      cs2: {
        ativo: steamKey,
        fonte: 'Steam Web API (oficial, gratuita)',
        problema: steamKey ? null : 'STEAM_API_KEY não está definida no .env / Vercel',
        nota: 'Perfis da Steam têm de ser PÚBLICOS para devolver stats. O jogador ativa em: Steam > Privacidade > Detalhes do perfil > Público.',
        membros: cs2Membros.length,
      },
      r6: {
        ativo: ubiEmail && ubiPass,
        fonte: 'Ubisoft API (open source, via SwiftCODA/R6-API)',
        problema: !ubiEmail || !ubiPass
          ? 'UBI_EMAIL e/ou UBI_PASSWORD não estão definidas no .env / Vercel'
          : (r6ubi.estado.ultimoErro || null),
        nota: 'Precisa de uma conta Ubisoft gratuita (sem 2FA) criada em ubisoft.com. Guarda as credenciais no .env.',
        jogadores: r6Jogadores.length,
        estado: {
          credencial: r6ubi.estado.credencial,
          ultimaTentativa: r6ubi.estado.ultimaTentativa,
          ultimoErro: r6ubi.estado.ultimoErro,
          falhasSeguidas: r6ubi.estado.falhasSeguidas,
        },
      },
      fortnite: {
        ativo: fnToken,
        fonte: 'fortnite-api.com (open source, token gratuito)',
        problema: fnToken
          ? null
          : 'FORTNITE_API_TOKEN não está definida no .env / Vercel',
        nota: 'Token GRATUITO: entra no Discord discord.gg/fortniteapi e pede em #support. Depois adiciona FORTNITE_API_TOKEN=teu_token ao .env (local) e nas variáveis da Vercel.',
      },
      ambiente: {
        vercel: Boolean(process.env.VERCEL),
        nodeEnv: process.env.NODE_ENV || 'development',
        siteUrl: process.env.SITE_URL || null,
      },
    });
  } catch (error) {
    console.error('Erro games/diagnostico:', error.message);
    res.status(500).json({ error: 'Erro no diagnóstico.' });
  }
});

module.exports = { gamesRouter: router };
