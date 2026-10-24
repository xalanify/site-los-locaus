/* ============================================================
   Fortnite — import manual do tracker.gg (TRN) + links
   ------------------------------------------------------------
   A API fortnite-api.com dá kills/vitórias (usada na página),
   mas o tracker.gg tem muito mais: TRN rating, ranks do
   competitivo, playlists, últimas 7/30 dias e partidas.
   O admin guarda a página com "Guardar como…" e importa aqui;
   os dados ficam na base de dados (public.fortnite_snapshot).
   ============================================================ */
const fs = require('fs');
const path = require('path');
const store = require('./fortnitestore');

let FIXOS = [];
try {
  FIXOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'fortnite-jogadores.json'), 'utf8'));
} catch {
  FIXOS = ['XaG2 B0Y', 'Bruno Iron Man', 'gersondelcarce'];
}

function links() {
  return FIXOS.map((nome) => ({
    nome,
    url: `https://fortnitetracker.com/profile/all/${encodeURIComponent(nome)}`,
  }));
}

/* ---------- extrair o JSON embebido na página ---------- */

/* percorre um texto à procura de `chave = { ... }` e devolve o objeto */
function objetoDepoisDe(txt, marca) {
  const i = txt.indexOf(marca);
  if (i < 0) return null;
  const ini = txt.indexOf('{', i + marca.length);
  if (ini < 0) return null;
  let prof = 0;
  let dentro = false;
  let esc = false;
  for (let j = ini; j < txt.length; j++) {
    const c = txt[j];
    if (dentro) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') dentro = false;
    } else if (c === '"') dentro = true;
    else if (c === '{') prof++;
    else if (c === '}') {
      prof--;
      if (prof === 0) {
        try {
          return JSON.parse(txt.slice(ini, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/* procura recursivamente um objeto que pareça um perfil de jogador */
function acharConta(obj, prof = 0) {
  if (!obj || prof > 16) return null;
  if (Array.isArray(obj)) {
    for (const it of obj) {
      const r = acharConta(it, prof + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    const temNome =
      (obj.platformInfo && obj.platformInfo.platformUserHandle) ||
      (obj.account && (obj.account.name || obj.account.displayName)) ||
      obj.displayName ||
      obj.epicName;
    if (temNome && (obj.stats || obj.segments || obj.lifetimeStats)) return obj;
    for (const v of Object.values(obj)) {
      const r = acharConta(v, prof + 1);
      if (r) return r;
    }
  }
  return null;
}

function extrairProfile(conteudo) {
  if (conteudo && typeof conteudo === 'object') return acharConta(conteudo) || conteudo;

  const txt = String(conteudo || '');
  // página do tracker.gg: <script> const profile = { ... } </script>
  for (const marca of ['const profile =', 'profile =', 'window.profile =']) {
    const obj = objetoDepoisDe(txt, marca);
    if (obj && (obj.platformInfo || obj.stats || obj.segments)) return obj;
  }
  // __NEXT_DATA__ / JSON embebido
  const m = txt.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m) {
    try {
      const j = JSON.parse(m[1]);
      const c = acharConta(j);
      if (c) return c;
    } catch { /* segue */ }
  }
  // JSON puro
  const ini = txt.indexOf('{');
  const fim = txt.lastIndexOf('}');
  if (ini >= 0 && fim > ini) {
    try {
      const j = JSON.parse(txt.slice(ini, fim + 1));
      const c = acharConta(j);
      if (c) return c;
    } catch { /* segue */ }
  }
  return null;
}

/* ---------- normalizar (o JSON do tracker é enorme) ---------- */

function mapaDeStats(lista) {
  const out = {};
  for (const s of Array.isArray(lista) ? lista : []) {
    const k = s && s.metadata && s.metadata.key;
    if (!k) continue;
    if (s.value != null) out[k] = s.value;
    if (s.displayValue != null) out[`${k}_txt`] = s.displayValue;
    if (s.percentile != null && s.percentile > 0) out[`${k}_pct`] = s.percentile;
  }
  return out;
}

const NOMES_PLAYLIST = {
  solo: 'Solo',
  duos: 'Duos',
  trios: 'Trios',
  squads: 'Squads',
  ltm: 'LTM',
};

function normalizar(p) {
  const plataformas = Array.isArray(p.stats) ? p.stats : [];
  const input = (p.metadata && p.metadata.preferredInputId) || 'kbm';
  // dados de carreira (sem season) do input preferido; senão o primeiro
  const base =
    plataformas.find((s) => s && s.platform === input && s.season == null) ||
    plataformas.find((s) => s && s.season == null) ||
    plataformas[0] ||
    {};
  const segs = base.stats || {};

  const vida = mapaDeStats(segs.all);
  const playlists = Object.keys(NOMES_PLAYLIST)
    .map((k) => {
      const m = mapaDeStats(segs[k]);
      if (!Object.keys(m).length) return null;
      return { chave: k, nome: NOMES_PLAYLIST[k], ...m };
    })
    .filter(Boolean);

  const resumo = (entrada) => {
    if (!entrada || !Array.isArray(entrada) || !entrada.length) return null;
    const s = mapaDeStats(entrada[0] && entrada[0].stats && entrada[0].stats.all);
    if (!Object.keys(s).length) return null;
    return {
      partidas: s.Matches ?? null,
      vitorias: s.Top1 ?? null,
      winPct: s.WinRatio ?? null,
      kd: s.KD ?? null,
      kills: s.Kills ?? null,
      kpm: s.KPG ?? null,
      tempo: s.MinutesPlayed_txt ?? null,
      score: s.Score ?? null,
      top3_5_10: s.Top3_5_10 ?? null,
      top6_12_25: s.Top6_12_25 ?? null,
    };
  };

  const rankDe = (seg, tipo) => {
    const st = seg && seg.stats && seg.stats[tipo];
    if (!st) return null;
    const meta = st.metadata || {};
    return {
      nome: meta.rankName || st.displayValue || null,
      valor: typeof st.value === 'number' ? st.value : null,
      icone: meta.iconUrl || null,
      elo: meta.elo ?? null,
      progresso: meta.progression ?? null,
      semRank: Boolean(meta.isUnrated),
    };
  };

  // junta as entradas "rank" e "peak-rank" da mesma season+modo
  const porChave = new Map();
  for (const seg of Array.isArray(p.segments) ? p.segments : []) {
    if (!seg || (seg.type !== 'rank' && seg.type !== 'peak-rank')) continue;
    const meta = seg.metadata || {};
    const attr = seg.attributes || {};
    const modo = meta.modeName || meta.modeId || '—';
    const season = meta.seasonName || null;
    const chave = `${season}|${modo}`;
    let item = porChave.get(chave);
    if (!item) {
      item = {
        season,
        modo,
        atual: false,
        atualRank: null,
        picoRank: null,
        isCurrent: false,
        legacy: Boolean(attr.isLegacy),
      };
      porChave.set(chave, item);
    }
    if (seg.type === 'rank') {
      item.atual = true;
      // há seasons com duas entradas "Reload"; a atual manda
      const atual = rankDe(seg, 'latestRank');
      if (atual && (!item.atualRank || attr.isCurrent)) item.atualRank = atual;
      const pico = rankDe(seg, 'peakRank');
      if (pico && (!item.picoRank || attr.isCurrent)) item.picoRank = pico;
      if (!attr.isLegacy) item.legacy = false;
    } else {
      const pico = rankDe(seg, 'peakRank') || rankDe(seg, 'latestRank');
      if (pico && (!item.picoRank || (pico.valor || 0) > (item.picoRank.valor || 0))) {
        item.picoRank = pico;
      }
    }
    if (attr.isCurrent) item.isCurrent = true;
  }
  const ranks = [...porChave.values()].filter((r) => r.atualRank || r.picoRank);

  const atuais = ranks.filter((r) => r.atual && r.isCurrent && r.atualRank && !r.atualRank.semRank);
  // rank atual mais alto (BR e Reload em simultâneo -> mostra o melhor)
  const rankAtual =
    atuais
      .slice()
      .sort((a, b) => (b.atualRank?.valor || 0) - (a.atualRank?.valor || 0))[0] || null;

  let melhorRank = null;
  for (const r of ranks) {
    for (const cand of [r.picoRank, r.atualRank]) {
      if (!cand || cand.semRank || cand.valor == null) continue;
      if (!melhorRank || cand.valor > melhorRank.valor) melhorRank = { ...cand, season: r.season, modo: r.modo };
    }
  }

  const recentes = (Array.isArray(p.matches) ? p.matches : []).slice(0, 10).map((m) => {
    const st = (m.segments && m.segments[0] && m.segments[0].stats) || {};
    const meta = m.metadata || {};
    return {
      modo: meta.playlistName || meta.modeName || '—',
      mapa: meta.mapName || null,
      data: meta.timestamp || meta.dateCollected || null,
      partidas: meta.matches || 1,
      colocacao: st.top1 && Number(st.top1.value) > 0 ? 1 : st.placement ? st.placement.value : null,
      vitorias: st.matchesWon ? st.matchesWon.value : null,
      kills: st.kills ? st.kills.value : null,
      kd: st.killsPerMatch ? st.killsPerMatch.value : null,
      score: st.score ? st.score.value : null,
      trn: st.trnRating ? st.trnRating.value : null,
      delta: st.trnRatingDelta ? st.trnRatingDelta.value : null,
      ranked: /Ranked/i.test(meta.playlistName || ''),
    };
  });

  return {
    plataforma: (p.platformInfo && p.platformInfo.platformSlug) || null,
    input: (p.metadata && p.metadata.preferredInputId) || null,
    temporada: (p.metadata && p.metadata.currentSeasonInfo && p.metadata.currentSeasonInfo.name) || null,
    avatar: (p.platformInfo && p.platformInfo.avatarUrl) || null,
    pais: (p.userInfo && p.userInfo.countryCode) || null,
    vida,
    playlists,
    ultimos7: resumo(p.last7DaysStats),
    ultimos30: resumo(p.last30DaysStats),
    ranks,
    rankAtual,
    melhorRank,
    recentes,
    atualizadoEm: (base.metadata && base.metadata.lastUpdated) || null,
  };
}

/* ---------- nome do jogador ---------- */

function nomeDoPerfil(p) {
  return (
    (p.platformInfo && p.platformInfo.platformUserHandle) ||
    (p.platformInfo && p.platformInfo.platformUserIdentifier) ||
    (p.account && (p.account.name || p.account.displayName)) ||
    p.displayName ||
    p.epicName ||
    null
  );
}

function nomeDoHtml(conteudo) {
  const txt = String(conteudo || '');
  const t = txt.match(/<title>([^<]*)<\/title>/i);
  if (t) {
    const m = t[1].match(/^(.+?)'s\b/i);
    if (m) return m[1].trim();
  }
  return null;
}

/* ---------- importação ---------- */

async function importar(conteudo) {
  try {
    const atual = (await store.ler()) || { jogadores: {} };
    if (!atual.jogadores || typeof atual.jogadores !== 'object') atual.jogadores = {};

    const conta = extrairProfile(conteudo);
    let nome = conta ? nomeDoPerfil(conta) : null;
    if (!nome) nome = nomeDoHtml(conteudo);
    if (!nome) {
      return { ok: false, erro: 'Não encontrei o jogador neste ficheiro do tracker.gg.' };
    }

    const perfil = conta && (conta.stats || conta.segments) ? normalizar(conta) : null;
    const chave = String(nome).toLowerCase();
    atual.jogadores[chave] = {
      nome,
      avatar: (perfil && perfil.avatar) || null,
      perfil,
      temDados: Boolean(perfil),
      importadoEm: new Date().toISOString(),
    };
    await store.guardar(atual);
    return {
      ok: true,
      nome,
      temDados: Boolean(perfil),
      ranks: perfil ? perfil.ranks.length : 0,
      playlists: perfil ? perfil.playlists.length : 0,
    };
  } catch (e) {
    return { ok: false, erro: e.message || 'Não deu para importar.' };
  }
}

async function estado() {
  const d = await store.ler();
  return {
    ok: true,
    jogadores: d && d.jogadores ? Object.values(d.jogadores) : [],
    updatedAt: (d && d.updatedAt) || null,
  };
}

/* perfil TRN guardado para um dos jogadores fixos (ou null) */
async function perfilDe(nome) {
  const d = await store.ler();
  if (!d || !d.jogadores) return null;
  return d.jogadores[String(nome).toLowerCase()] || null;
}

module.exports = {
  links,
  importar,
  estado,
  perfilDe,
  normalizar,
  extrairProfile,
  FIXOS,
};
