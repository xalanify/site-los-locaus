/* ============================================================
   R6 UBISOFT — estatísticas semi-live só com a API da Ubisoft
   ------------------------------------------------------------
   Endpoints espelhados no open source SwiftCODA/R6-API
   (github.com/SwiftCODA/R6-API, licença MIT): login de conta
   Ubisoft → tickets v2/v3 → perfis, nível, stats de carreira e
   rank da temporada — tudo SEM tracker.gg, SEM HTML manual.

   Config (uma vez):
     server/.env →  UBI_EMAIL=conta@dominio   UBI_PASSWORD=***     (conta Ubisoft gratuita)

   Esquadrão: server/data/r6-jogadores.json (array de handles,
   mesmo formato que já usavas: ["xalana.", "m4xi01504", ...])

   Intervalo: R6_UBI_MIN (default 15 min; Ubisoft tolera, mas vai
   com calma — 1 login a cada ~2h no máximo).
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CASO_FILE = path.join(DATA_DIR, 'r6-ubisoft.json'); // dados p/ a página
const LISTA_FILE = path.join(DATA_DIR, 'r6-jogadores.json'); // handles
const SESS_FILE = path.join(DATA_DIR, 'ubisessoes.json'); // tickets guardados

const APPID_V2 = '3587dcbb-7f81-457c-9781-0e3f29f6f56a';
const APPID_V3 = 'e3d5ea9e-50bd-43b7-88bf-39794f4e3d40';
const SPACE_R6 = '0d2ae42d-4c27-4cb7-af6c-2099062302bb'; // skill / nível
const SPACE_DATA = '05bfb3f7-6c21-4c42-be1f-97a33fb5cf66'; // datadev stats
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const MIN = Math.max(5, Number(process.env.R6_UBI_MIN) || 15);

/* ---------- status (mostrado na página) ---------- */
const estado = {
  fonte: 'ubisoft',
  credencial: false,
  intervaloMin: MIN,
  ultimaTentativa: null,
  ultimoErro: null,
  ciclos: 0,
  jogadoresOk: 0,
};

/* ---------- temporada atual (YxSy) ----------
   Âncora calibrada: out/2026 → Y11S3 (temporadas de ~3 meses).
   Fixas: R6_TEMPORADA=Y11S3 no .env, se valores futuros derem drift. */
function temporadaAtual() {
  const fixa = (process.env.R6_TEMPORADA || '').trim().match(/^Y(\d+)S(\d)$/i);
  if (fixa) return { label: fixa[0].toUpperCase(), y: Number(fixa[1]), s: Number(fixa[2]) };
  const ancor = Date.UTC(2016, 1, 15); // Y1S1
  const meses = (Date.now() - ancor) / (30.44 * 24 * 3600 * 1000);
  const idx = Math.max(0, Math.floor(meses / 3)) + 1;
  const y = Math.ceil(idx / 4);
  const s = ((idx - 1) % 4) + 1;
  return { label: `Y${y}S${s}`, y, s };
}

/* todas as temporadas desde Y1S1 até à atual (parâmetro "seasons") */
function todasTemporadas() {
  const { y, s } = temporadaAtual();
  const out = [];
  let yy = 1, ss = 1;
  while (true) {
    out.push(`Y${yy}S${ss}`);
    if (yy === y && ss === s) break;
    if (ss < 4) ss++;
    else { ss = 1; yy++; }
  }
  return out.join(',');
}

/* ranks por inteiro (0–36) — enum do SwiftCODA */
const RANKS = [
  'NO RANK', 'COPPER V', 'COPPER IV', 'COPPER III', 'COPPER II', 'COPPER I',
  'BRONZE V', 'BRONZE IV', 'BRONZE III', 'BRONZE II', 'BRONZE I',
  'SILVER V', 'SILVER IV', 'SILVER III', 'SILVER II', 'SILVER I',
  'GOLD V', 'GOLD IV', 'GOLD III', 'GOLD II', 'GOLD I',
  'PLATINUM V', 'PLATINUM IV', 'PLATINUM III', 'PLATINUM II', 'PLATINUM I',
  'EMERALD V', 'EMERALD IV', 'EMERALD III', 'EMERALD II', 'EMERALD I',
  'DIAMOND V', 'DIAMOND IV', 'DIAMOND III', 'DIAMOND II', 'DIAMOND I',
  'CHAMPION',
];
const nomeRank = (i) => RANKS[Math.max(0, Math.min(RANKS.length - 1, Number(i) || 0))];
const slugDeNome = (nome) => {
  const m = String(nome).toUpperCase().match(/^(.+?)[\s-]+(IV|III|II|I|V)$/);
  const tier = (m ? m[1] : String(nome).toUpperCase()).trim().toLowerCase();
  const num = m ? { I: 1, II: 2, III: 3, IV: 4, V: 5 }[m[2]] : null;
  return num ? `${tier}-${num}` : tier;
};
const rankImg = (slug) =>
  `https://trackercdn.com/cdn/r6.tracker.network/ranks/3.0/medium/${slug}.png?v=5`;

/* ---------- credenciais ---------- */
function credenciais() {
  const email = (process.env.UBI_EMAIL || '').trim();
  const senha = process.env.UBI_PASSWORD || '';
  if (email && senha) return { email, senha };
  try {
    const linhas = fs
      .readFileSync(path.join(__dirname, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((l) => !/^\s*#/.test(l)) // ignora comentários
      .join('\n');
    const e = (linhas.match(/UBI_EMAIL\s*=\s*(\S+)/) || [])[1];
    const p = (linhas.match(/UBI_PASSWORD\s*=\s*(\S+)/) || [])[1];
    if (e && p) return { email: e, senha: p };
  } catch {}
  return null;
}

/* ---------- sessões (tickets v2/v3 com validade ~2h) ---------- */
const TOKENS = { v2: null, v3: null };
let ultimoLogin = 0;

function carregarSessoes() {
  try {
    return JSON.parse(fs.readFileSync(SESS_FILE, 'utf8')) || { v2: null, v3: null, logins: [] };
  } catch {
    return { v2: null, v3: null, logins: [] };
  }
}

async function token(versao) {
  const cred = credenciais();
  if (!cred) {
    estado.credencial = false;
    throw new Error('sem-credenciais');
  }
  estado.credencial = true;

  const margem = Date.now() + 5 * 60 * 1000;
  if (TOKENS[versao] && Date.parse(TOKENS[versao].expira) > margem) return TOKENS[versao];

  // tenta ficheiro (evita login a cada arranque do servidor)
  const sess = carregarSessoes();
  const g = sess[versao];
  if (g && Date.parse(g.expira) > margem) {
    TOKENS[versao] = g;
    return g;
  }

  // SwiftCODA: evitar >3 logins/hora — guard de 60s entre tentativas
  const pausa = Date.now() - ultimoLogin;
  if (pausa < 60 * 1000) throw new Error('login-recuar');

  ultimoLogin = Date.now();
  const r = await fetch('https://public-ubiservices.ubi.com/v3/profiles/sessions', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Connection: 'Keep-Alive',
      'Ubi-AppId': versao === 'v2' ? APPID_V2 : APPID_V3,
      Authorization: 'Basic ' + Buffer.from(`${cred.email}:${cred.senha}`).toString('base64'),
    },
    body: JSON.stringify({ rememberMe: true }),
  });
  if (r.status === 401) throw new Error('Conta Ubisoft não existe ou a senha está errada (401).');
  if (r.status === 409) throw new Error('A Ubisoft pediu captcha — espera uns minutos e repete (409).');
  if (r.status === 429) throw new Error('Demasiados logins à Ubisoft — combinado com o número de tentativas (429).');
  if (!r.ok) throw new Error(`login Ubisoft devolveu ${r.status}`);
  const d = await r.json();
  const tok = { ticket: d.ticket, sessionId: d.sessionId, expira: d.expiration, userId: d.userId };
  TOKENS[versao] = tok;
  sess[versao] = tok;
  sess.logins = sess.logins || [];
  sess.logins.push(new Date().toISOString());
  if (sess.logins.length > 40) sess.logins = sess.logins.slice(-40);
  try {
    fs.writeFileSync(SESS_FILE, JSON.stringify(sess, null, 2));
  } catch {}
  return tok;
}

const get = async (url, tok, appId) => {
  const r = await fetch(url, {
    headers: {
      Authorization: `ubi_v1 t=${tok.ticket}`,
      'Ubi-AppId': appId,
      'Ubi-SessionId': tok.sessionId,
      'User-Agent': UA,
      Accept: 'application/json',
      Connection: 'Keep-Alive',
    },
  });
  if (!r.ok) throw new Error(`ubisoft ${r.status}`);
  return r.json();
};

/* ---------- 1) perfis: handle → userId/profileId ---------- */
async function acharConta(handle, tok) {
  const url =
    `https://api-ubiservices.ubi.com/v3/profiles` +
    `?nameOnPlatform=${encodeURIComponent(handle)}&platformType=uplay`;
  const d = await get(url, tok, APPID_V2);
  const lista = d?.profiles || [];
  const exato = lista.find(
    (p) => (p.nameOnPlatform || '').toLowerCase() === String(handle).toLowerCase(),
  );
  const p = exato || lista[0];
  if (!p) throw new Error('perfil não encontrado');
  return { userId: p.userId, profileId: p.profileId, nome: p.nameOnPlatform };
}

/* ---------- 2) nível da conta ---------- */
async function nivelConta(userId, tok) {
  const url =
    `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_R6}` +
    `/title/r6s/rewards/public_profile?profile_id=${userId}`;
  const d = await get(url, tok, APPID_V2);
  return Number(d?.level) || null;
}

/* ---------- 3) carreira: datadev (todas as temporadas) ---------- */
async function carreira(userId, tok) {
  const url =
    `https://prod.datadev.ubisoft.com/v1/users/${userId}/playerstats` +
    `?spaceId=${SPACE_DATA}&gameMode=all,ranked,casual,unranked&view=seasonal` +
    `&aggregation=summary&platform=PC&teamRole=all&seasons=${todasTemporadas()}`;
  const d = await get(url, tok, APPID_V2);

  const pl = d?.profileData?.[userId]?.platforms?.PC;
  if (!pl?.gameModes) return null;
  const gm = pl.gameModes;

  // soma as entradas (uma por temporada) como o SwiftCODA faz no Merge
  const somar = (bloco) => {
    const entries = bloco?.teamRoles?.all || [];
    return entries.reduce(
      (a, e) => ({
        kills: (a.kills || 0) + (e.kills || 0),
        deaths: (a.deaths || 0) + (e.death || 0),
        assists: (a.assists || 0) + (e.assists || 0),
        headshots: (a.headshots || 0) + (e.headshots || 0),
        revives: (a.revives || 0) + (e.revives || 0),
        won: (a.won || 0) + (e.matchesWon || 0),
        lost: (a.lost || 0) + (e.matchesLost || 0),
        minutos: (a.minutos || 0) + (e.minutesPlayed || 0),
      }),
      {},
    );
  };

  const modos = {};
  for (const [k, nome] of [
    ['all', 'Geral'],
    ['ranked', 'Ranked'],
    ['casual', 'Casual'],
    ['unranked', 'Unranked'],
  ]) {
    const t = somar(gm[k]);
    if (t.kills == null && t.won == null && t.minutos == null) continue;
    modos[nome] = t;
  }
  return modos;
}

/* ---------- 4) rank da temporada (batch: até 50 ids) ---------- */
async function saisonRank(userIds, tok) {
  const url =
    `https://public-ubiservices.ubi.com/v2/spaces/${SPACE_R6}` +
    `/title/r6s/skill/full_profiles?platform_families=pc,console` +
    `&profile_ids=${userIds.join(',')}`;
  const d = await get(url, tok, APPID_V3);
  const out = {};
  for (const fam of d?.platform_families_full_profiles || []) {
    for (const board of fam?.board_ids_full_profiles || []) {
      if (board?.board_id !== 'ranked') continue;
      for (const fp of board?.full_profiles || []) {
        const u = fp?.profile;
        if (!u) continue;
        const st = u.season_statistics || {};
        const o = st.match_outcomes || {};
        out[u.id] = {
          rank: Number(u.rank) || 0,
          maxRank: Number(u.max_rank) || 0,
          pontuação: Number(u.rank_points) || 0,
          maxPontuação: Number(u.max_rank_points) || 0,
          campeãoPosição: u.top_rank_position ?? null,
          kills: st.kills ?? null,
          deaths: st.deaths ?? null,
          wins: o.wins ?? null,
          losses: o.losses ?? null,
          abandons: o.abandons ?? null,
        };
      }
    }
  }
  return out;
}

/* ---------- ciclagem ---------- */
const lerLista = () => {
  try {
    const l = JSON.parse(fs.readFileSync(LISTA_FILE, 'utf8'));
    return Array.isArray(l) ? l.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const CASOS = {}; // handle → {userId, profileId, nome}

/**
 * Corre 1 ciclo completo: resolve handles, busca todos os dados
 * da Ubisoft e escreve server/data/r6-ubisoft.json. Falhas num
 * jogador não derrubam os restantes.
 */
async function atualizar() {
  estado.ultimaTentativa = new Date().toISOString();
  const cred = credenciais();
  estado.credencial = Boolean(cred);
  if (!cred) {
    estado.ultimoErro = 'sem-credenciais';
    return { ok: false, motivo: 'sem-credenciais' };
  }
  if (!CASOS.count) {
    try {
      Object.assign(CASOS, JSON.parse(fs.readFileSync(CASO_FILE, 'utf8'))?.contas || {});
    } catch {}
  }
  const handles = lerLista();
  if (!handles.length) {
    estado.ultimoErro = 'esquadrão vazio (r6-jogadores.json)';
    return { ok: false, motivo: 'sem-jogadores' };
  }

  const v2 = await token('v2');
  const v3 = await token('v3');

  let faltas = handles.filter((h) => !CASOS[h]);
  for (const h of faltas) {
    try {
      CASOS[h] = await acharConta(h, v2);
    } catch (e) {
      estado.ultimoErro = `${h}: ${e.message}`;
    }
    await new Promise((r) => setTimeout(r, 300)); // gentil com a Ubisoft
  }

  const vivos = handles.filter((h) => CASOS[h]);
  if (!vivos.length) return { ok: false, motivo: 'nenhum-perfil-resolvido' };

  // um único pedido batch para TODOS os ranks da temporada
  let temp = {};
  try {
    temp = await saisonRank(vivos.map((h) => CASOS[h].userId), v3);
  } catch (e) {
    estado.ultimoErro = `rank temporada: ${e.message}`;
  }

  const players = [];
  for (const h of vivos) {
    const conta = CASOS[h];
    try {
      const [nivel, car] = await Promise.all([
        nivelConta(conta.userId, v3).catch(() => null),
        carreira(conta.userId, v2),
      ]);
      const t = temp[conta.userId] || {};
      const geral = car?.Geral || {};
      const won = geral.won || 0;
      const lost = geral.lost || 0;
      const matches = won + lost;
      const kills = geral.kills || 0;
      const deaths = geral.deaths || 0;

      players.push({
        key: conta.nome || h,
        id: conta.nome || h,
        handle: conta.nome || h,
        userId: conta.userId,
        profileId: conta.profileId,
        avatar: `https://ubisoft-avatars.akamaized.net/${conta.userId}/default_256_256.png`,
        level: nivel,
        temporada: temporadaAtual().label,
        rank: t.rank != null
          ? {
              season: temporadaAtual().label,
              points: t.pontuação,
              name: t.rank === 0 ? 'NO RANK' : nomeRank(t.rank),
              img: rankImg(t.rank === 0 ? 'unranked' : slugDeNome(nomeRank(t.rank))),
              campeão: t.campeãoPosição,
            }
          : null,
        maxRank: t.maxRank
          ? {
              name: nomeRank(t.maxRank),
              img: rankImg(slugDeNome(nomeRank(t.maxRank))),
              rp: t.maxPontuação,
              season: temporadaAtual().label,
            }
          : null,
        statsTemporada: {
          kills: t.kills ?? null,
          deaths: t.deaths ?? null,
          wins: t.wins ?? null,
          losses: t.losses ?? null,
          abandons: t.abandons ?? null,
          kd: t.kills != null && t.deaths ? Number((t.kills / t.deaths).toFixed(2)) : null,
        },
        overview: {
          matchesPlayed: matches,
          matchesWon: won,
          matchesLost: lost,
          kills,
          deaths,
          headshots: geral.headshots || 0,
          assists: geral.assists || 0,
          revives: geral.revives || 0,
          timePlayed: Math.round((geral.minutos || 0) * 60),
          kdRatio: deaths ? Number((kills / deaths).toFixed(2)) : (kills ? String(kills) : null),
          killsPerMatch: matches ? Number((kills / matches).toFixed(2)) : null,
        },
        modes: Object.entries(car || {})
          .filter(([, x]) => x.kills != null || x.won != null)
          .map(([nome, x]) => ({
            name: nome,
            stats: {
              matchesPlayed: (x.won || 0) + (x.lost || 0),
              matchesWon: x.won || 0,
              matchesLost: x.lost || 0,
              kills: x.kills || 0,
              deaths: x.deaths || 0,
              timePlayed: Math.round((x.minutos || 0) * 60),
              kdRatio: x.deaths ? Number(((x.kills || 0) / x.deaths).toFixed(2)) : null,
              killsPerMatch: (x.won || 0) + (x.lost || 0) ? Number(((x.kills || 0) / ((x.won || 0) + (x.lost || 0))).toFixed(2)) : null,
            },
          })),
      });
    } catch (e) {
      estado.ultimoErro = `${h}: ${e.message}`;
      console.warn(`R6 Ubisoft "${h}":`, e.message);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  estado.jogadoresOk = players.length;
  estado.ciclos++;
  if (players.length) estado.ultimoErro = null;

  const payload = {
    source: 'ubisoft',
    engine: 'SwiftCODA/R6-API (endpoints oficiais Ubisoft)',
    fonte: 'ubisoft',
    temporada: temporadaAtual().label,
    updatedAt: new Date().toISOString(),
    players,
  };
  try {
    fs.writeFileSync(CASO_FILE, JSON.stringify({ ...payload, contas: CASOS }, null, 2));
  } catch {}
  log(payload);
  return { ok: players.length > 0, jogadores: players.length };
}

/* logs do trabalho, para a página de admin */
let trabalho = { aCorrer: false, inicio: null, fim: null, n: 0, logs: [] };
function log(payload) {
  trabalho = { aCorrer: false, inicio: null, fim: null, n: payload.players.length, logs: [] };
  trabalho.logs = payload.players.map((p) => ({
    t: new Date().toISOString(),
    l: `${(p.overview.kdRatio ?? '—')} K/D · nome ${(p.overview.matchesPlayed ?? 0)}`,
  }));
}

/** arranca o ciclo automático (nada no Vercel — sem servidor node) */
function start() {
  if (String(process.env.IS_VERCEL) === '1') return false;
  if (!credenciais()) {
    console.log(
      `R6 Ubisoft: sem credenciais (UBI_EMAIL/UBI_PASSWORD em server/.env).` +
        ` Sem elas, o site continua com o último dado gravado como recuo.`,
    );
    return false;
  }
  const ciclo = () => atualizar().catch((e) => console.warn('R6 Ubisoft:', e.message));
  setInterval(ciclo, MIN * 60 * 1000).unref();
  setTimeout(ciclo, 30 * 1000).unref(); // primeira passada já depois de arrancar
  console.log(`R6 Ubisoft: automático a cada ${MIN} min (SwiftCODA/R6-API → Ubisoft).`);
  return true;
}

/** dados para a rota /api/games/r6 — lê o ficheiro, NÃO faz pedidos */
function dados() {
  try {
    const d = JSON.parse(fs.readFileSync(CASO_FILE, 'utf8'));
    if (!Array.isArray(d?.players)) return null;
    return { ok: true, fonte: 'ubisoft', ...d };
  } catch {
    return null;
  }
}

async function status(mais) {
  return {
    ...estado,
    intervaloMin: MIN,
    temporada: temporadaAtual().label,
    ...(mais || {}),
  };
}

module.exports = { start, dados, status, atualizar, estado, temporadaAtual };
