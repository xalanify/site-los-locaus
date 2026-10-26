/* ============================================================
   EQUIPAS DE ESPORTS — pesquisa e ficha (CS2 / Rainbow Six)
   ------------------------------------------------------------
   CS2  -> API pública do bo3.gg (plantel, prémios, jogos e torneios)
   R6   -> API da Liquipedia (plantel, torneios e ganhos)

   Tudo passa pelo servidor e fica em cache (6 h na BD + memória),
   para não sobrecarregar as fontes.
   ============================================================ */
const { getDb } = require('./database');

const BO3 = 'https://api.bo3.gg/api/v1';
const WIKI = { r6: 'rainbowsix', cs2: 'counterstrike' };
const UA = 'LocausSite/1.0 (https://www.locaus.fun; contacto@locaus.fun)';
const TTL = 6 * 60 * 60 * 1000;
const TTL_PESQUISA = 30 * 60 * 1000;

const mem = new Map();
let fila = Promise.resolve();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- cache ---------------- */
async function cacheDb(chave, ttl) {
  try {
    const db = getDb();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS public.equipas_cache (
           chave text primary key,
           dados jsonb not null,
           atualizado_em timestamptz not null default now()
         )`,
      )
      .run()
      .catch(() => {});
    const row = await db
      .prepare(
        `SELECT dados FROM public.equipas_cache
         WHERE chave = ? AND atualizado_em > now() - interval '1 second' * ?`,
      )
      .get(chave, Math.round(ttl / 1000));
    return row && row.dados ? row.dados : null;
  } catch {
    return null;
  }
}

async function guardarDb(chave, dados) {
  try {
    const db = getDb();
    await db
      .prepare(
        `INSERT INTO public.equipas_cache (chave, dados, atualizado_em)
         VALUES (?, ?::jsonb, now())
         ON CONFLICT (chave) DO UPDATE
           SET dados = EXCLUDED.dados, atualizado_em = now()`,
      )
      .run(chave, JSON.stringify(dados));
  } catch {
    /* cache é opcional */
  }
}

/* ---------------- bo3.gg (CS2) ---------------- */
async function bo3(caminho, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const url = `${BO3}${caminho}${qs.toString() ? `?${qs}` : ''}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`bo3 ${r.status}`);
  return r.json();
}

function equipaBo3(t) {
  return {
    id: Number(t.id),
    nome: t.name,
    slug: t.slug,
    logo: t.image_url || null,
    pais: (t.country && t.country.name) || null,
    regiao: (t.country && t.country.region && t.country.region.name) || null,
    rank: t.rank || null,
  };
}

const ALIASES_CS2 = {
  navi: 'natus-vincere',
  'natus vincere': 'natus-vincere',
  'navi junior': 'natus-vincere-junior',
  g2: 'g2',
  vitality: 'vitality',
  spirit: 'spirit',
  faze: 'faze',
  liquid: 'liquid',
  mouz: 'mouz-cs2',
  astralis: 'astralis',
  heroic: 'heroic',
  fnatic: 'fnatic',
  c9: 'cloud9',
  cloud9: 'cloud9',
  vp: 'virtus-pro',
  'virtus pro': 'virtus-pro',
  falcons: 'falcons-esports',
  mongolz: 'the-mongolz',
  'the mongolz': 'the-mongolz',
  pain: 'pain-gaming',
  'pain gaming': 'pain-gaming',
  furia: 'furia',
  'eternal fire': 'eternal-fire',
  aurora: 'aurora-gaming',
  betboom: 'betboom-team',
};

async function pesquisarCs2(q) {
  const j = await bo3('/teams', {
    'filter[teams.name][like]': q,
    'page[limit]': 10,
    with: 'players',
  });
  const termo = q.toLowerCase();
  let lista = (j.results || []).filter((t) => t && t.name);

  // atalhos por sigla (a API do bo3 só pesquisa pelo nome completo)
  const alias = ALIASES_CS2[termo];
  if (alias && !lista.some((t) => t.slug === alias)) {
    try {
      const at = await bo3(`/teams/${encodeURIComponent(alias)}`, { with: 'players' });
      if (at && at.id) lista = [at, ...lista];
    } catch {
      /* sigla sem equipa: segue a pesquisa normal */
    }
  }

  return lista
    .map((t) => {
      const p = (t.players || []).filter((x) => !x.is_coach);
      return {
        titulo: t.name,
        ref: t.slug,
        jogo: 'cs2',
        logo: t.image_url || null,
        resumo: [
          (t.country && t.country.name) || null,
          t.rank ? `#${t.rank} ranking` : null,
          p.length ? `${p.length} jogadores` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        _score:
          alias && t.slug === alias
            ? -1
            : t.name.toLowerCase() === termo
              ? 0
              : t.name.toLowerCase().startsWith(termo)
                ? 1
                : 2,
      };
    })
    .sort((a, b) => a._score - b._score)
    .slice(0, 10)
    .map(({ _score, ...rest }) => rest);
}

async function equipaCs2(slug) {
  const t = await bo3(`/teams/${encodeURIComponent(slug)}`, { with: 'players' });
  if (!t || !t.id) throw new Error('Equipa não encontrada.');

  const id = Number(t.id);
  const [dinheiro, torneiosProx, torneiosUlt, jogosProx, jogosUlt] = await Promise.all([
    bo3('/teams/earnings', { 'filter[teams.id][eq]': id, 'page[limit]': 1 }).catch(() => null),
    bo3('/tournaments', {
      'page[limit]': 8,
      sort: 'start_date',
      'filter[tournaments.status][in]': 'upcoming,current',
      'filter[tournaments.team_ids][contains]': id,
    }).catch(() => null),
    bo3('/tournaments', {
      'page[limit]': 8,
      sort: '-end_date',
      'filter[tournaments.status][in]': 'finished',
      'filter[tournaments.team_ids][contains]': id,
    }).catch(() => null),
    bo3('/matches', {
      'page[limit]': 8,
      sort: 'start_date',
      'filter[matches.status][in]': 'upcoming,current',
      'filter[matches.team_ids][contains]': id,
    }).catch(() => null),
    bo3('/matches', {
      'page[limit]': 10,
      sort: '-start_date',
      'filter[matches.status][in]': 'finished,defwin',
      'filter[matches.team_ids][contains]': id,
    }).catch(() => null),
  ]);

  // nomes dos adversários (os jogos só trazem ids)
  const idsAdversarios = new Set();
  for (const m of [...(jogosProx?.results || []), ...(jogosUlt?.results || [])]) {
    const outro = Number(m.team1_id) === id ? Number(m.team2_id) : Number(m.team1_id);
    if (outro) idsAdversarios.add(outro);
  }
  let nomes = new Map();
  if (idsAdversarios.size) {
    try {
      const j = await bo3('/teams', {
        'filter[teams.id][in]': [...idsAdversarios].slice(0, 50).join(','),
        'page[limit]': 50,
      });
      nomes = new Map((j.results || []).map((x) => [Number(x.id), x.name]));
    } catch {
      /* sem nomes: mostramos “adversário” */
    }
  }

  const torneios = new Map();
  for (const tr of [...(torneiosProx?.results || []), ...(torneiosUlt?.results || [])]) {
    torneios.set(Number(tr.id), tr);
  }

  const jogos = (lista, estado) =>
    (lista?.results || []).map((m) => {
      const outro = Number(m.team1_id) === id ? Number(m.team2_id) : Number(m.team1_id);
      const venceu = Number(m.winner_team_id) === id;
      return {
        id: m.id,
        data: m.start_date,
        estado,
        adversario: nomes.get(outro) || null,
        torneio: (torneios.get(Number(m.tournament_id)) || {}).name || null,
        placar:
          estado === 'finished' ? `${Number(m.team1_score) || 0}–${Number(m.team2_score) || 0}` : null,
        venceu: estado === 'finished' ? venceu : null,
        tier: m.tier ? String(m.tier).toUpperCase() : null,
      };
    });

  const players = (t.players || []).filter((p) => !p.is_coach);
  const coaches = (t.players || []).filter((p) => p.is_coach);

  return {
    ok: true,
    jogo: 'cs2',
    id,
    nome: t.name,
    slug: t.slug,
    link: `https://bo3.gg/teams/${t.slug}`,
    logo: t.image_url || null,
    pais: (t.country && t.country.name) || null,
    regiao: (t.country && t.country.region && t.country.region.name) || null,
    rank: t.rank || null,
    criado: t.est_date || t.created_at || null,
    capitao: null,
    treinador: coaches.length ? coaches.map((c) => c.nickname).join(', ') : null,
    ceo: null,
    ganhos:
      dinheiro && dinheiro.results && dinheiro.results[0]
        ? `$${Number(dinheiro.results[0].total_money || 0).toLocaleString('en-US')}`
        : null,
    vitoriasTorneios:
      dinheiro && dinheiro.results && dinheiro.results[0]
        ? Number(dinheiro.results[0].tour_wins) || 0
        : null,
    ganhos6m: Number(t.six_month_earned) || 0,
    jogadores: players.map((p) => ({
      id: p.nickname,
      nome: [p.first_name, p.last_name].filter(Boolean).join(' '),
      pais: (p.country && p.country.name) || null,
      foto: p.image_url || null,
      entrou: null,
      capitao: false,
    })),
    proximosTorneios: (torneiosProx?.results || []).map((tr) => ({
      nome: tr.name,
      datas: tr.start_date
        ? `${new Date(tr.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}${
            tr.end_date
              ? ` – ${new Date(tr.end_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`
              : ''
          }`
        : null,
      tier: tr.tier ? String(tr.tier).toUpperCase() : null,
      premio: tr.prize ? `$${Number(tr.prize).toLocaleString('en-US')}` : null,
      estado: tr.status,
    })),
    ultimosTorneios: (torneiosUlt?.results || []).map((tr) => ({
      data: tr.end_date || tr.start_date,
      posicao: null,
      tier: tr.tier ? String(tr.tier).toUpperCase() : null,
      torneio: tr.name,
      premio: tr.prize ? `$${Number(tr.prize).toLocaleString('en-US')}` : null,
    })),
    conquistas: (t.achievements || []).slice(0, 10).map((a) => ({
      data: a.date,
      titulo: a.title,
      torneio: (a.tournament && a.tournament.name) || null,
      premio: a.tournament && a.tournament.prize ? `$${Number(a.tournament.prize).toLocaleString('en-US')}` : null,
    })),
    proximosJogos: jogos(jogosProx, 'upcoming'),
    ultimosJogos: jogos(jogosUlt, 'finished'),
    atualizado: new Date().toISOString(),
  };
}

/* ---------------- Liquipedia (R6) ---------------- */
function agendar(fn) {
  const p = fila.then(async () => {
    const out = await fn();
    await dormir(2200);
    return out;
  });
  fila = p.catch(() => {});
  return p;
}

async function liquipedia(wiki, params) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const url = `https://liquipedia.net/${wiki}/api.php?${qs.toString()}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Liquipedia ${r.status}`);
  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error('Resposta inválida da Liquipedia.');
  }
}

const semTags = (s) =>
  String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&#58;/g, ':')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const isoData = (txt) => {
  const m = String(txt || '').match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
};

const primeiroAncora = (html) => {
  const m = String(html).match(/<a[^>]+title="([^"]+)"/i);
  return m ? m[1].trim() : null;
};

function tabelaCom(html, palavras, max = 250000) {
  const re = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    const cab = m[0].slice(0, 2500);
    if (palavras.every((p) => new RegExp(p, 'i').test(cab))) return m[0].slice(0, max);
  }
  return '';
}

function lerInfobox(html) {
  const out = { nome: null, logo: null, pais: null, regiao: null, criado: null, ganhos: null };
  const box = html.slice(html.indexOf('fo-nttax-infobox-container'));
  if (!box) return out;
  const campo = (rotulo) => {
    const re = new RegExp(
      `infobox-description[^>]*>\\s*${rotulo}\\s*:?\\s*</div>\\s*<div>([\\s\\S]*?)</div>`,
      'i',
    );
    const m = box.match(re);
    return m ? semTags(m[1]) : null;
  };
  const nomeM = box.match(/infobox-header[^>]*>([\s\S]*?)<\/div>/i);
  out.nome = nomeM ? semTags(nomeM[1]).replace(/^\[\s*e\s*\]\s*\[\s*h\s*\]/i, '').trim() : null;
  out.pais = campo('Location');
  out.regiao = campo('Region');
  out.ceo = campo('CEO');
  out.capitao = campo('Captain');
  out.treinador = campo('Coach');
  const criado = box.match(/(?:Created|Founded)[^<]*<\/div>\s*<div>([\s\S]*?)<\/div>/i);
  out.criado = criado ? semTags(criado[1]).slice(0, 80) : null;
  const texto = semTags(box);
  const ganhos = texto.match(/Approx\.?\s*Total\s*Winnings\s*:?\s*([$€£]\s?[\d.,]+)/i);
  out.ganhos = ganhos ? ganhos[1].replace(/\s/g, '') : null;
  const img = box.match(/infobox-image[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
  if (img) {
    out.logo = img[1].startsWith('http')
      ? img[1]
      : `https://liquipedia.net${img[1].startsWith('/') ? '' : '/'}${img[1]}`;
  }
  return out;
}

function lerPlantel(html) {
  const seg = tabelaCom(html, ['>ID<', '>Name<'], 60000);
  if (!seg) return [];
  const rows = seg.match(/<tr class="table2__row--body"[\s\S]*?<\/tr>/gi) || [];
  const out = [];
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (tds.length < 2) continue;
    const id = primeiroAncora(tds[0]);
    if (!id) continue;
    const pais = (tds[0].match(/<img[^>]+alt="([^"]+)"/i) || [])[1] || null;
    out.push({
      id: semTags(id),
      nome: semTags(tds[1]) || null,
      pais,
      entrou: isoData(semTags(tds[tds.length - 1])),
      capitao: /fa-crown/i.test(row),
    });
    if (out.length >= 12) break;
  }
  return out;
}

function lerProximosTorneios(html) {
  const seg = tabelaCom(html, ['>Tournament<', 'Date'], 60000);
  if (!seg) return [];
  const rows = seg.match(/<tr class="table2__row--body"[\s\S]*?<\/tr>/gi) || [];
  const out = [];
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (!tds.length) continue;
    const textos = tds.map(semTags);
    const nome =
      primeiroAncora(tds.find((t) => /title="[^"]{3,}"/.test(t)) || '') ||
      textos.find((t) => t.length > 4 && !/^\d/.test(t));
    if (!nome) continue;
    const datas = textos.find((t) => /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(t));
    const tier = textos.find((t) => /^(S|A|B|C)-Tier|Major|Premier|Qualifier/i.test(t)) || null;
    out.push({ nome: semTags(nome), datas: datas || null, tier, premio: null });
    if (out.length >= 8) break;
  }
  return out;
}

function lerUltimosTorneios(html) {
  const seg = tabelaCom(html, ['>Prize<', '>Tournament<'], 200000);
  if (!seg) return [];
  const rows = seg.match(/<tr class="table2__row--body"[\s\S]*?<\/tr>/gi) || [];
  const out = [];
  for (const row of rows) {
    const tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (tds.length < 4) continue;
    const textos = tds.map(semTags);
    const data = isoData(textos[0]) || textos.find((t) => /\d{4}-\d{2}-\d{2}/.test(t));
    if (!data) continue;
    const posicao =
      (row.match(/placement-text[^>]*>([^<]+)</i) || [])[1] ||
      textos.find((t) => /^\d+(st|nd|rd|th)$/i.test(t)) ||
      null;
    const torneio =
      primeiroAncora(tds.find((t) => /title="[^"]{3,}"/.test(t)) || '') || null;
    const tier = textos.find((t) => /^(S|A|B|C)-Tier|Major|Premier|Qualifier/i.test(t)) || null;
    const premio = textos.find((t) => /[$€£]\s?[\d.,]+/.test(t)) || null;
    out.push({
      data,
      posicao,
      tier,
      torneio: torneio ? semTags(torneio) : null,
      premio,
    });
    if (out.length >= 15) break;
  }
  return out.sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 10);
}

async function pesquisarR6(q) {
  const j = await agendar(() =>
    liquipedia(WIKI.r6, {
      action: 'query',
      list: 'search',
      srsearch: q,
      srnamespace: '0',
      srlimit: '8',
    }),
  );
  return ((j.query && j.query.search) || [])
    .filter((s) => s && s.title)
    .map((s) => ({
      titulo: s.title,
      ref: s.title,
      jogo: 'r6',
      logo: null,
      resumo: semTags(s.snippet || '').slice(0, 160),
    }));
}

async function equipaR6(titulo) {
  const j = await agendar(() =>
    liquipedia(WIKI.r6, { action: 'parse', page: titulo, prop: 'text', redirects: '1' }),
  );
  if (!j.parse || !j.parse.text) throw new Error('Equipa não encontrada.');
  const html = j.parse.text;
  const info = lerInfobox(html);
  return {
    ok: true,
    jogo: 'r6',
    nome: info.nome || titulo,
    link: `https://liquipedia.net/${WIKI.r6}/${encodeURIComponent(titulo.replace(/ /g, '_'))}`,
    logo: info.logo,
    pais: info.pais,
    regiao: info.regiao,
    rank: null,
    criado: info.criado,
    ceo: info.ceo || null,
    capitao: info.capitao || null,
    treinador: info.treinador || null,
    ganhos: info.ganhos,
    vitoriasTorneios: null,
    ganhos6m: 0,
    jogadores: lerPlantel(html),
    proximosTorneios: lerProximosTorneios(html),
    ultimosTorneios: lerUltimosTorneios(html),
    conquistas: [],
    proximosJogos: [],
    ultimosJogos: [],
    atualizado: new Date().toISOString(),
  };
}

/* ---------------- API pública ---------------- */
async function pesquisar(jogo, q) {
  const termo = String(q || '').trim().slice(0, 60);
  if (termo.length < 2) return { resultados: [] };
  const chave = `pesquisa:${jogo}:${termo.toLowerCase()}`;
  const emMem = mem.get(chave);
  if (emMem && Date.now() - emMem.t < TTL_PESQUISA) return emMem.dados;
  const naBd = await cacheDb(chave, TTL_PESQUISA);
  if (naBd) {
    mem.set(chave, { t: Date.now(), dados: naBd });
    return naBd;
  }
  const dados =
    jogo === 'r6'
      ? { resultados: await pesquisarR6(termo) }
      : { resultados: await pesquisarCs2(termo) };
  mem.set(chave, { t: Date.now(), dados });
  guardarDb(chave, dados);
  return dados;
}

async function equipa(jogo, ref) {
  const nome = String(ref || '').trim().slice(0, 120);
  if (!nome) throw new Error('Falta o nome da equipa.');
  const chave = `equipa:${jogo}:${nome.toLowerCase()}`;
  const emMem = mem.get(chave);
  if (emMem && Date.now() - emMem.t < TTL) return emMem.dados;
  const naBd = await cacheDb(chave, TTL);
  if (naBd) {
    mem.set(chave, { t: Date.now(), dados: naBd });
    return naBd;
  }
  const dados = jogo === 'r6' ? await equipaR6(nome) : await equipaCs2(nome);
  mem.set(chave, { t: Date.now(), dados });
  guardarDb(chave, dados);
  return dados;
}

module.exports = { pesquisar, equipa };
