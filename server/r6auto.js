/* ============================================================
   Atualização automática do Rainbow Six (tracker.gg)
   ------------------------------------------------------------
   - Usa a API oficial (public-api.tracker.gg) e precisa da chave
     TRACKER_API_KEY no server/.env (gratuita em tracker.network/developers).
   - De 3 em 3 minutos (R6_REFRESH_MIN, por omissão 3) relê TODOS os
     jogadores do r6.json e atualiza os campos que a API devolver.
     O que a API não devolver mantém-se: o rank máximo (maxRank) e as
     partidas guardadas (matches) são dados locais, não do tracker.
   - Sem chave: fica desligado e só regista um aviso no log.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { R6_FILE, DATA_DIR } = require('./trackerdata');

const API = 'https://public-api.tracker.gg/v2/r6siege/standard/profile';
const MIN = Math.max(1, Number(process.env.R6_REFRESH_MIN) || 3);
/** Quem faz parte do esquadrão (server/data/r6-jogadores.json). */
const LISTA_FILE = path.join(DATA_DIR, 'r6-jogadores.json');

/* ---------- estado (para mostrar na página) ---------- */
const estado = {
  ligado: false,
  chave: false,
  intervaloMin: MIN,
  ultimaTentativa: null,
  ultimoErro: null,
  atualizacoes: 0,
};

/* ---------- rank (mesmo padrão do cliente) ---------- */
const slugDeNome = (nome) => {
  const s = String(nome || '').toUpperCase().trim();
  const m = s.match(/^(.+?)[\s-]+(IV|III|II|I|V)$/);
  const tier = (m ? m[1] : s).trim().toLowerCase().replace(/\s+/g, '-');
  const num = m ? { I: 1, II: 2, III: 3, IV: 4, V: 5 }[m[2]] : null;
  return num ? `${tier}-${num}` : tier;
};
const rankImg = (slug) =>
  `https://trackercdn.com/cdn/r6.tracker.network/ranks/3.0/medium/${slug}.png?v=5`;

/* ---------- leitura defensiva da resposta da API ---------- */
const seg = (segs, tipo) => segs.find((s) => s && s.type === tipo);

/** valor de uma estatística: aceita { value } ou valor direto */
function stat(segmento, ...nomes) {
  if (!segmento || !segmento.stats) return null;
  for (const n of nomes) {
    const s = segmento.stats[n];
    if (s == null) continue;
    if (typeof s === 'object') {
      if (s.value != null) return s.value;
      continue;
    }
    return s;
  }
  return null;
}

/** nome + ícone de um rank (a API pode trazer no metadata do stat) */
function rankInfo(segmento, ...nomes) {
  if (!segmento || !segmento.stats) return null;
  for (const n of nomes) {
    const s = segmento.stats[n];
    if (!s) continue;
    const meta = s.metadata || {};
    const nome =
      (typeof s === 'object' && (s.displayValue || meta.name || meta.tierName)) || null;
    const pontos =
      (typeof s === 'object' && (s.value ?? null)) ??
      stat(segmento, 'rankedRating', 'rankPoints', 'rating');
    const img = meta.iconUrl || meta.icon || null;
    if (nome || pontos != null) return { nome, pontos, img };
  }
  return null;
}

/* ---------- mapear um jogador da API para a nossa forma ---------- */
function mapPlayer(api, antigo) {
  const d = (api && api.data) || {};
  const info = d.platformInfo || {};
  const segs = d.segments || (d.payload && d.payload.segments) || [];
  const ov = seg(segs, 'overview') || segs[0] || null;
  const temporada = seg(segs, 'season') || seg(segs, 'ranked') || null;

  const p = { ...antigo };

  // identidade
  if (info.platformUserHandle) p.handle = info.platformUserHandle;
  if (info.avatarUrl) p.avatar = info.avatarUrl;

  // nível
  const nivel = stat(ov, 'level', 'playerLevel');
  if (nivel != null) p.level = Number(nivel) || p.level;

  // números de carreira (só substitui o que a API trouxer)
  const ovAntigo = { ...(p.overview || {}) };
  const mapa = {
    matchesPlayed: ['matchesPlayed', 'matches'],
    matchesWon: ['matchesWon', 'wins'],
    matchesLost: ['matchesLost', 'losses'],
    matchesAbandoned: ['matchesAbandoned', 'abandons', 'quits'],
    kills: ['kills'],
    deaths: ['deaths'],
    assists: ['assists'],
    headshots: ['headshots'],
    timePlayed: ['timePlayed', 'timePlayedSeconds'],
    kdRatio: ['kdRatio', 'kd', 'kD'],
    killsPerMatch: ['killsPerMatch', 'killsPerGame', 'kpm'],
  };
  const novoOv = { ...ovAntigo };
  for (const [destino, candidatos] of Object.entries(mapa)) {
    const v = stat(ov, ...candidatos);
    if (v != null) novoOv[destino] = typeof v === 'string' && /^[\d.]+$/.test(v) ? Number(v) : v;
  }
  // kd/killsPerMatch são decimais — normaliza
  if (novoOv.kdRatio != null) novoOv.kdRatio = Number(Number(novoOv.kdRatio).toFixed(2));
  if (novoOv.killsPerMatch != null)
    novoOv.killsPerMatch = Number(Number(novoOv.killsPerMatch).toFixed(1));
  p.overview = novoOv;

  // rank da temporada
  const ri =
    rankInfo(temporada, 'rankedRank', 'rank', 'rankName', 'tier') ||
    rankInfo(ov, 'rankedRank', 'rank');
  const rp =
    stat(temporada, 'rankedRating', 'rankPoints', 'rating', 'rp') ??
    (ri && ri.pontos);
  const temporadaNome =
    (temporada && temporada.metadata && (temporada.metadata.seasonName || temporada.metadata.name)) ||
    null;
  if (ri && (ri.nome || rp != null)) {
    const nome = ri.nome || (p.rank && p.rank.name) || 'NO RANK';
    p.rank = {
      season: temporadaNome || (p.rank && p.rank.season) || null,
      points: Number(rp) || 0,
      name: nome,
      img: ri.img || (/^https?:/.test(nome) ? null : rankImg(slugDeNome(nome))),
    };
  } else if (rp != null) {
    p.rank = { ...(p.rank || {}), points: Number(rp) || 0 };
  }

  // modos (o cliente hoje só usa o overview, mas mantém a forma)
  const modos = segs.filter((s) => s && (s.type === 'gameMode' || s.type === 'mode'));
  if (modos.length) {
    p.modes = modos.map((s) => {
      const nome = (s.metadata && (s.metadata.mode || s.metadata.name)) || 'Modo';
      const base = {};
      for (const [destino, candidatos] of Object.entries(mapa)) {
        const v = stat(s, ...candidatos);
        if (v != null) base[destino] = v;
      }
      return { name: nome, stats: base };
    });
  }

  // já há dados reais — deixa de contar como "à espera de dados"
  if (p.semDados) delete p.semDados;

  return p;
}

/* ---------- refresh ---------- */
function lerJson() {
  try {
    return JSON.parse(fs.readFileSync(R6_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function guardar(dados) {
  const tmp = path.join(DATA_DIR, 'r6.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(dados, null, 2), 'utf8');
  fs.renameSync(tmp, R6_FILE);
}

/* ---------- esquadrão: quem está a ser seguido ---------- */
function lerLista() {
  try {
    const l = JSON.parse(fs.readFileSync(LISTA_FILE, 'utf8'));
    return Array.isArray(l) ? l.map((h) => String(h).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Garante que TODOS os nomes da lista estão no r6.json.
 * Os que ainda não foram caçados entram com os campos a null —
 * a página mostra "—" até o tracker.gg devolver os números.
 * Devolve true se o ficheiro mudou.
 */
function sincronizarLista(dados) {
  const lista = lerLista();
  if (!lista.length) return false;
  const temos = new Set(dados.players.map((p) => String(p.key || p.handle).toLowerCase()));
  let mudou = false;
  for (const handle of lista) {
    if (temos.has(handle.toLowerCase())) continue;
    dados.players.push({
      key: handle.toLowerCase(),
      id: handle,
      handle,
      avatar: null,
      level: null,
      season: null,
      rank: null,
      overview: {},
      modes: [],
      maxRank: null,
      semDados: true,
    });
    temos.add(handle.toLowerCase());
    console.log(`R6: "${handle}" juntou-se ao esquadrão (à espera de dados do tracker.gg).`);
    mudou = true;
  }
  return mudou;
}

async function buscarJogador(p, chave) {
  const platform = (p.platform || 'uplay').toLowerCase();
  const id = encodeURIComponent(p.id || p.handle);
  const r = await fetch(`${API}/${platform}/${id}`, {
    headers: { 'TRN-Api-Key': chave, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`tracker devolveu ${r.status}`);
  return r.json();
}

/** Atualiza todos os jogadores. Devolve { ok, motivo?, mudou?, n? }. */
async function refreshNow() {
  const chave = process.env.TRACKER_API_KEY;
  estado.chave = Boolean(chave);
  estado.ultimaTentativa = new Date().toISOString();
  if (!chave) {
    estado.ultimoErro = 'Sem TRACKER_API_KEY no server/.env';
    return { ok: false, motivo: 'sem-chave' };
  }
  const dados = lerJson();
  if (!dados || !Array.isArray(dados.players)) {
    estado.ultimoErro = 'Sem jogadores no r6.json';
    return { ok: false, motivo: 'sem-jogadores' };
  }
  if (!dados.players.length) {
    estado.ultimoErro = 'Sem jogadores no r6.json';
    return { ok: false, motivo: 'sem-jogadores' };
  }

  // primeiro: garante que a lista do esquadrão está toda no ficheiro
  let mudou = sincronizarLista(dados);
  let n = 0;
  for (const p of dados.players) {
    try {
      const api = await buscarJogador(p, chave);
      const antes = JSON.stringify(p);
      const novo = mapPlayer(api, p);
      if (JSON.stringify(novo) !== antes) {
        Object.assign(p, novo);
        mudou = true;
      }
      n++;
    } catch (e) {
      // um jogador a falhar não pára os outros
      estado.ultimoErro = `${p.handle}: ${e.message}`;
      console.warn(`R6 auto (${p.handle}): ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400)); // respeita o rate limit
  }

  if (mudou) {
    dados.source = 'auto';
    dados.updatedAt = new Date().toISOString();
    guardar(dados);
    estado.atualizacoes++;
  }
  estado.ultimoErro = n === 0 ? estado.ultimoErro : null;
  return { ok: true, mudou, n };
}

/** Arranca o ciclo (a cada MIN minutos) — só com chave presente. */
function start() {
  // Esquadrão: sincroniza a lista primeiro, mesmo sem chave — assim
  // um nome novo aparece logo na página (com "—" até vir dado).
  try {
    const dados = lerJson();
    if (dados && Array.isArray(dados.players) && sincronizarLista(dados)) {
      guardar(dados);
      console.log('R6: lista do esquadrão sincronizada com r6-jogadores.json.');
    }
  } catch (e) {
    console.warn('R6 (lista):', e.message);
  }

  const chave = process.env.TRACKER_API_KEY;
  estado.chave = Boolean(chave);
  if (!chave) {
    console.log(
      `R6 automático: desligado (falta TRACKER_API_KEY em server/.env) — snapshot manual mantido.`,
    );
    return false;
  }
  estado.ligado = true;
  const ciclo = () => {
    refreshNow().catch((e) => console.warn('R6 auto:', e.message));
  };
  setInterval(ciclo, MIN * 60 * 1000).unref();
  setTimeout(ciclo, 20 * 1000).unref(); // primeira passada pouco depois de arrancar
  console.log(`R6 automático: a cada ${MIN} min (tracker.gg).`);
  return true;
}

function status() {
  return { ...estado, agora: new Date().toISOString(), jogadores: lerLista() };
}

module.exports = { start, refreshNow, status };
