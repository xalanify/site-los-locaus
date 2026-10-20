// ============================================================
//  PREVISÕES R6 — dados oficiais da Ubisoft (Tier 1)
//
//  Fonte: o próprio site oficial r6esports/ubisoft.com. O
//  `__NEXT_DATA__` é servido por /_next/data/<buildId>/... e
//  traz calendário, equipas, resultados e pontuação ao vivo.
//
//  A sincronização é feita a pedido (quando a página abre ou o
//  utilizador carrega em atualizar), com cache de 75 s. Não
//  precisamos de cron nem de chaves de API.
// ============================================================
const { getDb } = require('./database');
const { notify } = require('./notify');

const BASE_PAGE = 'https://www.ubisoft.com/en-gb/esports/rainbow-six/siege';
const BASE_DATA = 'https://www.ubisoft.com/_next/data';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const CACHE_MS = 75_000;
const JANELA_ANTES = 50 * 86400; // resultados recentes
const JANELA_DEPOIS = 75 * 86400; // próximos jogos

let buildCache = { id: '', at: 0 };
let aCorrer = null;

async function getBuildId(force = false) {
  if (!force && buildCache.id && Date.now() - buildCache.at < 30 * 60_000) return buildCache.id;
  const r = await fetch(BASE_PAGE, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`site oficial ${r.status}`);
  const html = await r.text();
  const m = html.match(/"buildId"\s*:\s*"([^"]+)"/);
  if (!m) throw new Error('buildId não encontrado');
  buildCache = { id: m[1], at: Date.now() };
  return m[1];
}

async function getData(rota, query = '', tentativa = 0) {
  const build = await getBuildId(tentativa > 0);
  const url = `${BASE_DATA}/${build}/en-gb/esports/rainbow-six/siege${rota}.json${query}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404 && tentativa === 0) {
    buildCache = { id: '', at: 0 };
    return getData(rota, query, 1);
  }
  if (!r.ok) throw new Error(`dados ${r.status}`);
  const j = await r.json();
  const p = j && j.pageProps && j.pageProps.pageData;
  if (!p) throw new Error('dados sem pageData');
  return p;
}

function segundos(v) {
  return Number(v) || 0;
}

function escolherCompetições(home) {
  const agora = Date.now() / 1000;
  const ids = new Set();

  const regioes = (home.calendar && home.calendar.regions) || [];
  for (const regiao of regioes) {
    for (const campeonato of regiao.championships || []) {
      for (const etapa of campeonato.stages || []) {
        const c = etapa.singleCompetition;
        if (!c) continue;
        const inicio = segundos(etapa.startTimestamp);
        const fim = segundos(etapa.endTimestamp);
        if (fim > agora - JANELA_ANTES && inicio < agora + JANELA_DEPOIS) ids.add(Number(c.id));
      }
    }
  }

  // Jogos em destaque (por vezes a final é depois do endDate da etapa)
  for (const m of home.matches || []) {
    if (m.competition && m.competition.id) ids.add(Number(m.competition.id));
  }

  return [...ids].filter((n) => Number.isFinite(n) && n > 0).slice(0, 12);
}

function passos(p) {
  const pd = p.phaseDetails;
  if (!pd || !pd.steps) return [];
  return Array.isArray(pd.steps) ? pd.steps : Object.values(pd.steps);
}

function jogosDaCompeticao(p) {
  const mapa = new Map();
  for (const s of passos(p)) {
    for (const m of s.matches || []) if (m && m.id) mapa.set(Number(m.id), m);
  }
  for (const m of (p.overview && p.overview.matches) || []) {
    if (m && m.id && !mapa.has(Number(m.id))) mapa.set(Number(m.id), m);
  }
  return [...mapa.values()];
}

function lado(equipas, side) {
  return (equipas || []).find((t) => Number(t.sideIndex) === side) || null;
}

function decorarJogo(m, p, equipasPorId) {
  const ta = lado(m.teams, 1);
  const tb = lado(m.teams, 2);
  const infA = ta && equipasPorId.get(Number(ta.id));
  const infB = tb && equipasPorId.get(Number(tb.id));

  const status = [1, 2, 3, 4].includes(Number(m.status)) ? Number(m.status) : 1;
  let winner = null;
  if (status === 3) {
    if (ta && Number(ta.result) === 1) winner = 'a';
    else if (tb && Number(tb.result) === 1) winner = 'b';
    else if (ta && tb && Number(ta.score) > Number(tb.score)) winner = 'a';
    else if (ta && tb && Number(tb.score) > Number(ta.score)) winner = 'b';
  }

  const jogos = (m.games || []).map((g) => {
    const a = lado(g.teams, 1);
    const b = lado(g.teams, 2);
    return {
      index: Number(g.index) || 0,
      status: Number(g.status) || 0,
      a: a ? Number(a.score) || 0 : null,
      b: b ? Number(b.score) || 0 : null,
      mapa: (g.map && (g.map.name || g.map.mapName)) || null,
    };
  });

  return {
    external_id: Number(m.id),
    competition_id: Number((m.competition && m.competition.id) || (p.competition && p.competition.id)) || null,
    competition_name: (m.competition && m.competition.name) || (p.competition && p.competition.name) || '',
    competition_logo:
      (m.competition && (m.competition.darkLogoUrl || m.competition.logoUrl)) ||
      (p.competition && (p.competition.darkLogoUrl || p.competition.logoUrl)) ||
      null,
    championship_name: (m.championship && m.championship.name) || '',
    phase_name: m.phaseName || '',
    step_name: m.stepTypeName || '',
    format: Number(m.matchFormatNumberOfGames) || null,
    team_a_id: ta ? Number(ta.id) || null : null,
    team_a: (infA && infA.name) || '',
    team_a_logo: infA ? infA.darkLogoUrl || infA.logoForDarkBackgroundUrl || infA.logoUrl || null : null,
    team_b_id: tb ? Number(tb.id) || null : null,
    team_b: (infB && infB.name) || '',
    team_b_logo: infB ? infB.darkLogoUrl || infB.logoForDarkBackgroundUrl || infB.logoUrl || null : null,
    start_time: m.date || null,
    status,
    score_a: ta ? Number(ta.score) || 0 : 0,
    score_b: tb ? Number(tb.score) || 0 : 0,
    winner,
    maps: JSON.stringify(jogos),
    stream_url: m.youtubeLink || m.replayLink || null,
  };
}

async function upsertJogo(db, j) {
  if (!j.external_id || !j.start_time) return false;
  await db
    .prepare(
      `INSERT INTO r6_matches
        (external_id, competition_id, competition_name, competition_logo,
         championship_name, phase_name, step_name, format,
         team_a_id, team_a, team_a_logo, team_b_id, team_b, team_b_logo,
         start_time, status, score_a, score_b, winner, maps, stream_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)
       ON CONFLICT (external_id) DO UPDATE SET
         competition_id = EXCLUDED.competition_id,
         competition_name = EXCLUDED.competition_name,
         competition_logo = EXCLUDED.competition_logo,
         championship_name = EXCLUDED.championship_name,
         phase_name = EXCLUDED.phase_name,
         step_name = EXCLUDED.step_name,
         format = EXCLUDED.format,
         team_a_id = EXCLUDED.team_a_id,
         team_a = EXCLUDED.team_a,
         team_a_logo = EXCLUDED.team_a_logo,
         team_b_id = EXCLUDED.team_b_id,
         team_b = EXCLUDED.team_b,
         team_b_logo = EXCLUDED.team_b_logo,
         start_time = EXCLUDED.start_time,
         status = EXCLUDED.status,
         score_a = EXCLUDED.score_a,
         score_b = EXCLUDED.score_b,
         winner = COALESCE(EXCLUDED.winner, r6_matches.winner),
         maps = EXCLUDED.maps,
         stream_url = EXCLUDED.stream_url,
         updated_at = now()`,
    )
    .run(
      j.external_id,
      j.competition_id,
      j.competition_name,
      j.competition_logo,
      j.championship_name,
      j.phase_name,
      j.step_name,
      j.format,
      j.team_a_id,
      j.team_a,
      j.team_a_logo,
      j.team_b_id,
      j.team_b,
      j.team_b_logo,
      j.start_time,
      j.status,
      j.score_a,
      j.score_b,
      j.winner,
      j.maps,
      j.stream_url,
    );
  return true;
}

async function resolverPrevisoes(db) {
  const acabados = await db
    .prepare("SELECT id, team_a, team_b, winner FROM r6_matches WHERE status = 3 AND winner IS NOT NULL")
    .all();
  let resolvidas = 0;
  for (const m of acabados) {
    const pendentes = await db
      .prepare('SELECT user_id, pick FROM r6_predictions WHERE match_id = ? AND correct IS NULL')
      .all(m.id);
    if (!pendentes.length) continue;
    for (const p of pendentes) {
      const acertou = p.pick === m.winner;
      await db
        .prepare('UPDATE r6_predictions SET correct = ?, updated_at = now() WHERE match_id = ? AND user_id = ?')
        .run(acertou, m.id, p.user_id);
      resolvidas++;
      try {
        await notify({
          userId: p.user_id,
          type: 'previsao',
          entity: 'r6_match',
          entityId: m.id,
          title: acertou ? 'Acertaste na previsão!' : 'Desta vez falhaste',
          body: `${m.team_a || 'Equipa A'} vs ${m.team_b || 'Equipa B'}`,
          link: '/previsoes',
        });
      } catch {
        // a notificação não pode impedir o resultado de ficar guardado
      }
    }
  }
  return resolvidas;
}

async function sincronizar({ force = false } = {}) {
  if (aCorrer) return aCorrer;
  aCorrer = (async () => {
    const db = getDb();
    const estado = await db
      .prepare('SELECT last_sync, last_ok, last_error, build_id FROM r6_sync WHERE id = 1')
      .get();
    const ultimo = estado && estado.last_sync ? new Date(estado.last_sync).getTime() : 0;
    if (!force && ultimo && Date.now() - ultimo < CACHE_MS) {
      return { ok: true, cached: true, ...(estado || {}) };
    }

    let total = 0;
    let competicoes = 0;
    try {
      const build = await getBuildId();
      await db.prepare('UPDATE r6_sync SET build_id = ? WHERE id = 1').run(build);

      const home = await getData('');
      const ids = escolherCompetições(home);
      competicoes = ids.length;

      const resultados = await Promise.allSettled(
        ids.map((id) => getData(`/competition/${id}`, `?competitionAndPhaseIds=${id}`)),
      );

      const vistos = new Set();
      for (const res of resultados) {
        if (res.status !== 'fulfilled') continue;
        const p = res.value;
        const equipas = new Map((p.teams || []).map((t) => [Number(t.id), t]));
        for (const m of jogosDaCompeticao(p)) {
          const j = decorarJogo(m, p, equipas);
          if (!j.external_id || vistos.has(j.external_id)) continue;
          vistos.add(j.external_id);
          if (await upsertJogo(db, j)) total++;
        }
      }

      // Jogos em destaque que não venham nas competições (ex.: finais)
      for (const m of home.matches || []) {
        if (!m || !m.id || vistos.has(Number(m.id))) continue;
        const equipas = new Map();
        for (const t of [m.team1, m.team2]) if (t && t.id) equipas.set(Number(t.id), t);
        const j = decorarJogo(
          {
            ...m,
            teams: [
              { id: m.team1 && m.team1.id, score: (m.scores && m.scores.team1) || 0, sideIndex: 1 },
              { id: m.team2 && m.team2.id, score: (m.scores && m.scores.team2) || 0, sideIndex: 2 },
            ],
          },
          { competition: m.competition, teams: [...equipas.values()] },
          equipas,
        );
        if (await upsertJogo(db, j)) total++;
      }

      const resolvidas = await resolverPrevisoes(db);
      await db
        .prepare('UPDATE r6_sync SET last_sync = now(), last_ok = now(), last_error = NULL WHERE id = 1')
        .run();
      return {
        ok: true,
        matches: total,
        competitions: competicoes,
        resolved: resolvidas,
        last_ok: new Date().toISOString(),
      };
    } catch (e) {
      console.error('Erro sync previsões:', e.message);
      await db
        .prepare('UPDATE r6_sync SET last_sync = now(), last_error = ? WHERE id = 1')
        .run(String(e.message || e).slice(0, 300))
        .catch(() => {});
      return { ok: false, error: String(e.message || e) };
    }
  })().finally(() => {
    aCorrer = null;
  });
  return aCorrer;
}

module.exports = { sincronizar };
