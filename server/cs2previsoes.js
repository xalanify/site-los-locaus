/* ============================================================
   CS2 — jogos ao vivo e previsões
   ------------------------------------------------------------
   Fonte: bo3.gg (API pública). Sincroniza os jogos recentes /
   próximos e resolve as previsões quando o jogo termina.
   ============================================================ */
const { getDb } = require('./database');

const BASE = 'https://api.bo3.gg/api/v1';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const TTL = 5 * 60 * 1000;
let cache = { t: 0, dados: null };
let emCurso = null;

async function json(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`bo3 ${r.status}`);
  return r.json();
}

function statusNum(s) {
  if (s === 'live') return 2;
  if (s === 'finished' || s === 'defwin') return 3;
  return 1;
}

function vencedor(d) {
  const a = Number(d.team1_id);
  const b = Number(d.team2_id);
  const w = Number(d.winner_team_id);
  if (w && w === a) return 'a';
  if (w && w === b) return 'b';
  const sa = Number(d.team1_score) || 0;
  const sb = Number(d.team2_score) || 0;
  if (sa > sb) return 'a';
  if (sb > sa) return 'b';
  return null;
}

async function detalhe(slug) {
  try {
    return await json(`${BASE}/matches/${encodeURIComponent(slug)}?join=team1,team2,tournament`);
  } catch {
    return null;
  }
}

async function sincronizar({ forcar = false } = {}) {
  if (!forcar && cache.dados && Date.now() - cache.t < TTL) return cache.dados;
  if (emCurso) return emCurso;

  emCurso = (async () => {
    try {
      const [porFim, porInicio] = await Promise.all([
        json(`${BASE}/matches?page=1&limit=40&sort=-end_date`),
        json(`${BASE}/matches?page=1&limit=40&sort=-start_date`),
      ]);
      const mapa = new Map();
      for (const m of [...(porFim.results || []), ...(porInicio.results || [])]) {
        if (!m || !m.id) continue;
        mapa.set(Number(m.id), m);
      }
      const agora = Date.now();
      const brutos = [...mapa.values()]
        .filter((m) => m && m.team1_id && m.team2_id)
        .filter((m) => ['upcoming', 'live', 'finished', 'defwin'].includes(m.status))
        .filter((m) => {
          if (m.status !== 'defwin') return true;
          // defwin no futuro não é um jogo normal para prever
          const t = new Date(m.start_date).getTime();
          return Number.isFinite(t) && t <= agora + 60 * 60 * 1000;
        })
        .slice(0, 24);

      const detalhes = [];
      for (let i = 0; i < brutos.length; i += 6) {
        const grupo = brutos.slice(i, i + 6);
        const ds = await Promise.all(grupo.map((m) => detalhe(m.slug)));
        ds.forEach((d, idx) => {
          if (d) detalhes.push(d);
        });
      }

      const db = getDb();
      for (const d of detalhes) {
        const torneio = d.tournament || {};
        const stream =
          (Array.isArray(d.streams) ? d.streams : []).map((s) => s && (s.url || s.embed_url)).find(Boolean) ||
          null;
        await db
          .prepare(
            `INSERT INTO cs2_matches
               (external_id, slug, competition, competition_logo, team_a, team_a_logo, team_b, team_b_logo,
                start_time, status, score_a, score_b, winner, stream_url, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
             ON CONFLICT (external_id) DO UPDATE SET
               slug = EXCLUDED.slug,
               competition = EXCLUDED.competition,
               competition_logo = EXCLUDED.competition_logo,
               team_a = EXCLUDED.team_a,
               team_a_logo = EXCLUDED.team_a_logo,
               team_b = EXCLUDED.team_b,
               team_b_logo = EXCLUDED.team_b_logo,
               start_time = EXCLUDED.start_time,
               status = EXCLUDED.status,
               score_a = EXCLUDED.score_a,
               score_b = EXCLUDED.score_b,
               winner = EXCLUDED.winner,
               stream_url = EXCLUDED.stream_url,
               updated_at = now()`,
          )
          .run(
            Number(d.id),
            d.slug || null,
            torneio.name || null,
            torneio.image_url || null,
            d.team1 && d.team1.name ? d.team1.name : null,
            d.team1 && d.team1.image_url ? d.team1.image_url : null,
            d.team2 && d.team2.name ? d.team2.name : null,
            d.team2 && d.team2.image_url ? d.team2.image_url : null,
            d.start_date || null,
            statusNum(d.status),
            Number(d.team1_score) || 0,
            Number(d.team2_score) || 0,
            vencedor(d),
            stream,
          );
      }

      // resolve as previsões dos jogos que já terminaram
      await db
        .prepare(
          `UPDATE cs2_predictions p
              SET correct = (m.winner = p.pick)
             FROM cs2_matches m
            WHERE p.match_id = m.id
              AND m.status = 3
              AND m.winner IS NOT NULL
              AND p.correct IS NULL`,
        )
        .run();

      const dados = { ok: true, atualizadoEm: new Date().toISOString() };
      cache = { t: Date.now(), dados };
      return dados;
    } catch (e) {
      console.warn('CS2 previsões sync:', e.message);
      if (cache.dados) return { ...cache.dados, aviso: e.message };
      return { ok: false, erro: e.message };
    } finally {
      emCurso = null;
    }
  })();

  return emCurso;
}

module.exports = { sincronizar };
