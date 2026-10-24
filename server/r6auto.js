/* ============================================================
   Atualização automática do Rainbow Six (tracker.gg)
   ------------------------------------------------------------
   - Usa a API oficial (public-api.tracker.gg) e precisa da chave
     TRACKER_API_KEY no server/.env (gratuita em tracker.network/developers).
   - De 3 em 3 minutos (R6_REFRESH_MIN, por omissão 3) relê TODOS os
     jogadores do r6.json e atualiza os campos que a API devolver.
     O que a API não devolver mantém-se: o rank máximo (maxRank) e as
     partidas guardadas (matches) são dados locais, não do tracker.
   - Sem chave: usa o browser Edge local (CDP) para ler a mesma API em
      api.tracker.gg, contornando o bloqueio Cloudflare de clientes de
      programa. O JSON devolvido é idêntico à API oficial. O site mostra
      os dados disponíveis; campos não obtidos aparecem como "—" até à
      próxima atualização com chave.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { R6_FILE, DATA_DIR } = require('./trackerdata');
const { buscarJson } = require('./trackerbrowser');
const r6store = require('./r6store');

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

/* progresso da última atualização (manual ou automática) — o
   painel de admin mostra a barra e os logs disto a andar */
const trabalho = {
  aCorrer: false,
  manual: false,
  inicio: null,
  fim: null,
  total: 0,
  feitos: 0,
  mudou: 0,
  logs: [],
};

function log(linha) {
  trabalho.logs.push({ t: new Date().toISOString(), l: String(linha).slice(0, 300) });
  if (trabalho.logs.length > 200) trabalho.logs.shift();
}

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

/* nome de rank só vale se for mesmo de rank — snapshots velhos já
   trouxeram lixo como "0" (partia o ícone e mostrava "0" no card) */
const RE_RANK_NOME = /^(COPPER|BRONZE|SILVER|GOLD|PLATINUM|EMERALD|DIAMOND|CHAMPION|UNRANKED|NO RANK)\b/i;

/* rank a partir do RP (Ranked 2.0) — fallback quando o nome veio lixo */
const DIV_R = ['V', 'IV', 'III', 'II', 'I'];
const CAM_R = [
  ['COPPER', 0, 1600],
  ['BRONZE', 1600, 2100],
  ['SILVER', 2100, 2600],
  ['GOLD', 2600, 3200],
  ['PLATINUM', 3200, 4100],
  ['EMERALD', 4100, 4600],
  ['DIAMOND', 4600, 5000],
  ['CHAMPION', 5000, Infinity],
];
function rankDeRp(rp) {
  const r = Number(rp) || 0;
  if (r <= 0) return 'NO RANK';
  const camada = CAM_R.find(([, min, max]) => r >= min && r < max);
  if (!camada) return 'NO RANK';
  const [nome, min, max] = camada;
  if (max === Infinity) return 'CHAMPION';
  const idx = Math.min(4, Math.max(0, Math.floor((r - min) / ((max - min) / 5))));
  return `${nome} ${DIV_R[idx]}`;
}

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
    // nome lixo (ex.: "0" de snapshots velhos) -> deriva do RP ou NO RANK
    let nome = ri.nome || (p.rank && p.rank.name) || 'NO RANK';
    if (!RE_RANK_NOME.test(String(nome))) nome = rankDeRp(rp);
    p.rank = {
      season: temporadaNome || (p.rank && p.rank.season) || null,
      points: Number(rp) || 0,
      name: nome,
      img:
        ri.img ||
        (/^https?:/.test(nome)
          ? null
          : /^NO RANK$/i.test(nome)
            ? rankImg('unranked')
            : rankImg(slugDeNome(nome))),
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

  // operadores (se o ficheiro do tracker trouxer segmentos de operador)
  const ops = segs.filter((s) => s && /operator/i.test(String(s.type || '')));
  if (ops.length) {
    p.operators = ops.map((s) => {
      const nome =
        (s.metadata && (s.metadata.name || s.metadata.operator || s.metadata.operatorName)) ||
        'Operador';
      const base = {};
      for (const [destino, candidatos] of Object.entries(mapa)) {
        const v = stat(s, ...candidatos);
        if (v != null) base[destino] = v;
      }
      base.timePlayed = stat(s, 'timePlayed', 'timePlayedSeconds') ?? base.timePlayed;
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
  if (chave) {
    // Caminho da API oficial com chave TRN-Api-Key
    const r = await fetch(`${API}/${platform}/${id}`, {
      headers: { 'TRN-Api-Key': chave, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`tracker devolveu ${r.status}`);
    return r.json();
  }
  // Fallback sem chave: usar browser Edge + CDP (trackerbrowser)
  const url = `https://api.tracker.gg/api/v2/r6siege/standard/profile/ubi/${id}`;
  const api = await buscarJson(url, p.handle);
  return api;
}

/**
 * Atualiza todos os jogadores a partir do tracker.gg.
 * Preenche `trabalho` (barra + logs) para o painel de admin.
 * Devolve { ok, motivo?, mudou?, n? }.
 */
async function refreshNow(opcoes = {}) {
  if (trabalho.aCorrer) return { ok: false, motivo: 'em-curso' };

  trabalho.aCorrer = true;
  trabalho.manual = Boolean(opcoes.manual);
  trabalho.inicio = new Date().toISOString();
  trabalho.fim = null;
  trabalho.total = 0;
  trabalho.feitos = 0;
  trabalho.mudou = 0;
  trabalho.logs = [];

  const chave = process.env.TRACKER_API_KEY;
  estado.chave = Boolean(chave);
  estado.ultimaTentativa = new Date().toISOString();

  try {
    const dados = await r6store.ler();
    if (!dados || !Array.isArray(dados.players) || !dados.players.length) {
      estado.ultimoErro = 'Sem jogadores no r6.json';
      log('Sem jogadores no r6.json.');
      return { ok: false, motivo: 'sem-jogadores' };
    }

    // primeiro: garante que a lista do esquadrão está toda no ficheiro
    let mudou = sincronizarLista(dados);
    trabalho.total = dados.players.length;
    log(`Esquadrão: ${dados.players.length} jogador(es) para ver no tracker.gg`);

    let n = 0;
    let alterados = 0;
    for (const p of dados.players) {
      log(`→ ${p.handle} · a perguntar ao tracker.gg...`);
      try {
        const api = await buscarJogador(p, chave);
        const antes = JSON.stringify(p);
        const novo = mapPlayer(api, p);
        if (JSON.stringify(novo) !== antes) {
          Object.assign(p, novo);
          // mapPlayer apaga semDados no objeto novo — e o assign não apaga
          if (!('semDados' in novo)) delete p.semDados;
          mudou = true;
          alterados++;
          const extra = [p.level ? `nível ${p.level}` : null, p.rank && p.rank.name]
            .filter(Boolean)
            .join(' · ');
          log(`✓ ${p.handle} · atualizado${extra ? ` (${extra})` : ''}`);
        } else {
          log(`• ${p.handle} · sem alterações`);
        }
        n++;
      } catch (e) {
        // um jogador a falhar não pára os outros
        estado.ultimoErro = `${p.handle}: ${e.message}`;
        log(`✗ ${p.handle} · ${e.message}`);
      }
      trabalho.feitos++;
      trabalho.mudou = alterados;
      await new Promise((r) => setTimeout(r, 400)); // respeita o rate limit
    }

    if (mudou) {
      dados.source = 'auto';
      dados.updatedAt = new Date().toISOString();
      await r6store.guardar(dados);
      estado.atualizacoes++;
    }
    estado.ultimoErro = n === 0 ? estado.ultimoErro : null;
    if (alterados) log(`${alterados} perfil(is) atualizado(s) — já está no site.`);
    else log('Nada para atualizar: tudo igual.');
    return { ok: true, mudou, n };
  } finally {
    trabalho.aCorrer = false;
    trabalho.fim = new Date().toISOString();
  }
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
  // Automático LIGA sempre: com chave usa a API oficial; sem chave
  // usa o fallback do browser Edge (CDP) para ler a mesma API.
  estado.ligado = true;
  const ciclo = () => {
    refreshNow().catch((e) => console.warn('R6 auto:', e.message));
  };
  setInterval(ciclo, MIN * 60 * 1000).unref();
  setTimeout(ciclo, 20 * 1000).unref(); // primeira passada pouco depois de arrancar
  console.log(
    chave
      ? `R6 automático: a cada ${MIN} min (tracker.gg, com chave).`
      : `R6 automático: a cada ${MIN} min (tracker.gg via browser Edge — sem chave).`,
  );
  return true;
}

function status() {
  return {
    ...estado,
    agora: new Date().toISOString(),
    jogadores: lerLista(),
    trabalho: { ...trabalho, logs: trabalho.logs.slice(-120) },
  };
}

/* ============================================================
   Importação manual (o utilizador guarda a página do tracker.gg
   como HTML — ex. "TaKe.EASy._'s R6_ Siege Overview Stats...
   .html" — ou o JSON, e carrega aqui)
   ------------------------------------------------------------
   Aceita string (HTML ou JSON) ou objeto. Devolve { data: {...} }
   na forma que o mapPlayer lê, ou null se não der para extrair.
   ============================================================ */

/** procura recursivamente o objeto que tem platformInfo.platformUserHandle */
function acharPerfil(obj, prof = 0) {
  if (!obj || prof > 14) return null;
  if (Array.isArray(obj)) {
    for (const it of obj) {
      const r = acharPerfil(it, prof + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    if (obj.platformInfo && obj.platformInfo.platformUserHandle) return obj;
    for (const v of Object.values(obj)) {
      const r = acharPerfil(v, prof + 1);
      if (r) return r;
    }
  }
  return null;
}

/* envolve o objeto achado na forma { data } que o mapPlayer espera */
function embrulhar(j) {
  if (!j || typeof j !== 'object') return null;
  if (j.data && j.data.platformInfo) return j;
  if (j.platformInfo) return { data: j };
  const achado = acharPerfil(j);
  return achado ? { data: achado } : null;
}

/* ---------- extrair do DOM renderizado (a overview do tracker.gg
   não embute JSON do jogador — as stats só estão no HTML já
   desenhado, em pares stat-name -> stat-value). Constrói a mesma
   forma { data } da API para reutilizar o mapPlayer. ---------- */
const limparTxt = (s) =>
  String(s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* pares rotulo=>valor do DOM (cada stat-name com o stat-value a seguir) */
function paresDoDom(html) {
  const re =
    /class="[^"]*stat-name[^"]*"[^>]*>[\s\S]*?<span[^>]*class="truncate"[^>]*>([^<]*)<\/span>[\s\S]*?class="[^"]*stat-value[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]*)</g;
  const out = [];
  for (const m of html.matchAll(re)) {
    const rot = limparTxt(m[1]);
    const val = limparTxt(m[2]);
    if (rot) out.push({ rot, val });
  }
  return out;
}

const numDe = (s) => {
  if (s == null) return null;
  const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/* nomes de rank do R6 (para reconhecer alt="COPPER I" etc.) */
const RE_RANK = /^(COPPER|BRONZE|SILVER|GOLD|PLATINUM|EMERALD|DIAMOND|CHAMPION|UNRANKED|NO RANK)\b/i;

/* temporada visível no seletor (Y11S3 = a primeira sem display:none) */
function temporadaVisivel(html) {
  const re = /Y\d+S\d/gi;
  let m;
  while ((m = re.exec(html))) {
    const perto = html.slice(Math.max(0, m.index - 300), m.index);
    if (!/display:\s*none/.test(perto)) return m[0].toUpperCase();
  }
  return null;
}

/* monta { data:{ platformInfo, segments:[overview] } } a partir do DOM */
function apiDoDom(html) {
  const pares = paresDoDom(html);
  if (!pares.length) return null;

  // handle a partir do <title> ("Nome's R6: Siege Overview Stats…")
  const t = html.match(/<title>([^<]*)<\/title>/i);
  const hm = t && t[1].match(/^(.+?)'s\b/i);
  const handle = hm ? hm[1].trim() : null;
  if (!handle) return null;

  // avatar Ubisoft
  const av = html.match(/https:\\u002F\\u002Fubisoft-avatars[^"]*|https:\/\/ubisoft-avatars[^"]*/i);
  const avatar = av ? av[0].replace(/\\u002F/g, '/') : null;

  // bloco coerente = o resumo de carreira, que começa no "Level";
  // lemos a PRIMEIRA ocorrência de cada rótulo a partir daí
  const iLevel = pares.findIndex((p) => /^level$/i.test(p.rot));
  const inicio = iLevel >= 0 ? iLevel : 0;
  const primeiro = (rot) => {
    const alvo = rot.toLowerCase();
    const p = pares.slice(inicio).find((x) => x.rot.toLowerCase() === alvo);
    return p ? p.val : null;
  };

  const stats = {};
  const lvl = iLevel >= 0 ? numDe(pares[iLevel].val) : null;
  if (lvl != null) stats.level = { value: lvl };
  const mapear = {
    matchesPlayed: 'Matches',
    matchesWon: 'Wins',
    matchesLost: 'Losses',
    matchesAbandoned: 'Abandons',
    kills: 'Kills',
    deaths: 'Deaths',
    killsPerMatch: 'Kills/Match',
  };
  for (const [dest, rot] of Object.entries(mapear)) {
    const v = numDe(primeiro(rot));
    if (v != null) stats[dest] = { value: v };
  }
  const kd = numDe(primeiro('K/D'));
  if (kd != null) stats.kdRatio = { value: kd };

  if (!Object.keys(stats).length) return null;

  // ---------- rank ATUAL (cartão "Current Season") ----------
  const segments = [{ type: 'overview', stats }];
  const iCS = html.indexOf('Current Season');
  if (iCS >= 0) {
    const iFim = html.indexOf('Season Peaks', iCS);
    const cartao = html.slice(iCS, iFim > iCS ? iFim : iCS + 6000);
    const alts = [...cartao.matchAll(/<img[^>]*\balt="([^"]+)"/g)].map((x) =>
      x[1].replace(/\s+background$/i, '').trim(),
    );
    const nome = alts.find((a) => RE_RANK.test(a)) || null;
    const rpM = cartao.match(/>([\d.,]+)<\/span>\s*<sup[^>]*>RP/i);
    if (nome) {
      segments.push({
        type: 'season',
        metadata: { seasonName: temporadaVisivel(html) },
        stats: {
          rank: { value: null, displayValue: nome },
          rankPoints: { value: rpM ? Number(rpM[1].replace(/[^\d]/g, '')) : 0 },
        },
      });
    }
  }

  // ---------- rank MÁXIMO (cartão "Season Peaks" -> 1a linha = BEST) ----------
  let maxRank = null;
  const iPeaks = html.indexOf('Season Peaks');
  if (iPeaks >= 0) {
    const iFim = html.indexOf('v3-card__title', iPeaks);
    const regiao = html.slice(iPeaks, iFim > iPeaks ? iFim : iPeaks + 12000);
    for (const tr of regiao.match(/<tr[\s\S]*?<\/tr>/g) || []) {
      const alt = (tr.match(/<img[^>]*\balt="([^"]+)"/) || [])[1];
      if (!alt) continue;
      const nome = alt.replace(/\s+background$/i, '').trim();
      if (!RE_RANK.test(nome)) continue;
      const txt = limparTxt(tr);
      const mm = txt.match(/([\d.,]+)\s*RP/i);
      const season = (txt.split(/\s*[\d.,]+\s*RP/i)[0] || '').trim() || null;
      maxRank = {
        name: nome,
        img: rankImg(slugDeNome(nome)),
        rp: mm ? Number(mm[1].replace(/[^\d]/g, '')) : 0,
        season,
      };
      break; // a primeira linha com rank é a "BEST" (a máxima de sempre)
    }
  }

  return {
    data: {
      platformInfo: { platformUserHandle: handle, avatarUrl: avatar },
      segments,
    },
    extras: maxRank ? { maxRank } : null,
  };
}

/* de um HTML, sai com o JSON embebido (__NEXT_DATA__ / scripts) */
function extrairDeHtml(html) {
  // 1) __NEXT_DATA__ (páginas Next.js do tracker.gg)
  const m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m) {
    try {
      const r = embrulhar(JSON.parse(m[1]));
      if (r) return r;
    } catch { /* segue */ }
  }
  // 2) qualquer <script type="application/json">
  for (const s of html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const r = embrulhar(JSON.parse(s[1]));
      if (r) return r;
    } catch { /* segue */ }
  }
  // 3) qualquer script cujo conteúdo traga platformInfo
  for (const s of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const c = s[1];
    if (c.includes('platformInfo')) {
      try {
        const r = embrulhar(JSON.parse(c));
        if (r) return r;
      } catch { /* segue */ }
    }
  }
  // 4) página renderizada (sem JSON) — lê os pares do DOM
  const dom = apiDoDom(html);
  if (dom) return dom;
  return null;
}

/** aceita objeto, JSON string ou HTML string -> { data } ou null */
function extrairApi(conteudo) {
  if (conteudo == null) return null;
  if (typeof conteudo === 'object') return embrulhar(conteudo);
  let txt = String(conteudo).trim();
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1).trim(); // tira BOM
  if (!txt) return null;
  // parece HTML? (página guardada do tracker.gg)
  if (
    /^<\s*(!doctype|html|head|body|script)/i.test(txt) ||
    txt.includes('__INITIAL_STATE__') ||
    txt.includes('__NEXT_DATA__') ||
    /<title>[^<]*r6/i.test(txt) ||
    txt.includes('stat-name')
  ) {
    return extrairDeHtml(txt);
  }
  // JSON puro
  try {
    return embrulhar(JSON.parse(txt));
  } catch {
    // pode ser JSON colado com lixo à volta — tenta extrair o objeto
    const ini = txt.indexOf('{');
    const fim = txt.lastIndexOf('}');
    if (ini >= 0 && fim > ini) {
      try { return embrulhar(JSON.parse(txt.slice(ini, fim + 1))); } catch { /* nada */ }
    }
    // último recurso: tratar como HTML
    return extrairDeHtml(txt);
  }
}

async function importarJson(conteudo) {
  try {
    const api = extrairApi(conteudo);
    if (!api) {
      return { ok: false, erro: 'Não encontrei dados do jogador (platformInfo) neste ficheiro.' };
    }
    const d = api.data || {};
    const info = d.platformInfo || {};
    const handle = String(info.platformUserHandle || d.username || '').trim();
    if (!handle) return { ok: false, erro: 'Ficheiro sem handle do jogador.' };

    const dados = (await r6store.ler()) || { players: [] };
    if (!Array.isArray(dados.players)) dados.players = [];

    const chave = handle.toLowerCase();
    let p = dados.players.find(
      (x) => String(x.key || x.handle).toLowerCase() === chave || String(x.handle).toLowerCase() === chave,
    );
    let novo = false;
    if (!p) {
      p = {
        key: chave,
        id: handle,
        handle,
        avatar: null,
        level: null,
        season: null,
        rank: null,
        overview: {},
        modes: [],
        maxRank: null,
      };
      dados.players.push(p);
      novo = true;
    }

    const antes = JSON.stringify(p);
    const atualizado = mapPlayer(api, p);
    Object.assign(p, atualizado);
    // mapPlayer apaga semDados no objeto novo — e o assign não apaga
    if (!('semDados' in atualizado)) delete p.semDados;
    // rank máximo colhido no HTML (Season Peaks) — o mapPlayer não o toca
    if (api.extras && api.extras.maxRank) p.maxRank = api.extras.maxRank;
    const mudou = JSON.stringify(p) !== antes;

    if (mudou) {
      dados.source = 'import';
      dados.updatedAt = new Date().toISOString();
      await r6store.guardar(dados);
      estado.atualizacoes++;
    }
    return { ok: true, handle: p.handle, novo, mudou };
  } catch (e) {
    return { ok: false, erro: e.message || 'Não deu para importar o ficheiro.' };
  }
}

module.exports = { start, refreshNow, status, importarJson };
