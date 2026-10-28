// ============================================================
//  API das Previsões R6
// ============================================================
const express = require('express');
const { getDb } = require('../database');
const { attachAuth, requireUser } = require('../middleware/auth');
const { sincronizar, proximoTorneio } = require('../r6previsoes');
const { syncTop1Previsoes } = require('../previsoestop1');
const { syncStreaks } = require('../previsoesstreak');
const cs2 = require('../cs2previsoes');
const notify = require('../notify');

const router = express.Router();

// Cache do próximo torneio (a home pede a cada minuto; o calendário da
// Ubisoft não muda assim tão depressa).
let cacheProxTorneio = { at: 0, dados: null };

/* Avisa no Windows/PWA quando um jogo entra ao vivo (uma vez por jogo). */
function avisarAoVivo(jogo, lista) {
  const agora = Date.now();
  for (const m of Array.isArray(lista) ? lista : []) {
    if (Number(m.status) !== 2) continue;
    const t = new Date(m.start_time).getTime();
    // só interessa se começou nas últimas 2 horas (evita avisos antigos)
    if (Number.isFinite(t) && agora - t > 2 * 60 * 60 * 1000) continue;
    notify.avisarJogoAoVivo(jogo, m).catch(() => {});
  }
}

/* Regiões R6 Tier 1 — o calendário oficial da Ubisoft organiza o
   calendário por regiões. O nome do campeonato traz a região
   (ex.: "North America League Stage 2" -> "North America"). */
const REGIOES = {
  'North America': 'North America',
  'Europe': 'Europe',
  'Europe Mena': 'Europe Mena',
  'Asia Pacific': 'Asia Pacific',
  'South America': 'South America',
  'China': 'China',
  'Brazil': 'Brazil',
  'Japan': 'Japan',
  'Korea': 'Korea',
  'Latin America': 'Latin America',
  'MENA': 'MENA',
  'APAC': 'Asia Pacific',
  'EMEA': 'Europe Mena',
};

function regiaoDe(nome) {
  const s = String(nome || '');
  const lower = s.toLowerCase();
  // ordenar por comprimento (mais específicos primeiro)
  const chaves = Object.keys(REGIOES).sort((a, b) => b.length - a.length);
  for (const k of chaves) {
    if (lower.includes(k.toLowerCase())) return REGIOES[k];
  }
  return 'Outros';
}

function mapas(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
}

function decorar(m, votos, uid) {
  const agora = Date.now();
  const inicio = new Date(m.start_time).getTime();
  const status = Number(m.status) || 1;
  const a = votos.filter((v) => v.pick === 'a');
  const b = votos.filter((v) => v.pick === 'b');
  const meu = uid ? votos.find((v) => Number(v.user_id) === uid) || null : null;
  const equipasConhecidas = Boolean(m.team_a && m.team_b);
  return {
    id: Number(m.id),
    external_id: Number(m.external_id),
    competition: m.competition_name || '',
    competition_logo: m.competition_logo || null,
    championship: m.championship_name || '',
    region: regiaoDe(m.championship_name || m.competition_name || ''),
    phase: m.phase_name || '',
    step: m.step_name || '',
    format: Number(m.format) || null,
    start_time: m.start_time,
    status,
    score_a: Number(m.score_a) || 0,
    score_b: Number(m.score_b) || 0,
    winner: m.winner || null,
    maps: mapas(m.maps),
    stream_url: m.stream_url || null,
    team_a: { id: m.team_a_id ? Number(m.team_a_id) : null, name: m.team_a || '', logo: m.team_a_logo || null },
    team_b: { id: m.team_b_id ? Number(m.team_b_id) : null, name: m.team_b || '', logo: m.team_b_logo || null },
    can_vote: status === 1 && equipasConhecidas && agora < inicio,
    locked: status !== 1 || agora >= inicio,
    pick: meu ? meu.pick : null,
    correct: meu && meu.correct !== null ? Boolean(meu.correct) : null,
    counts: { a: a.length, b: b.length, total: votos.length },
    voters: {
      a: a.map((v) => ({
        id: Number(v.user_id),
        username: v.username,
        avatar_url: v.avatar_url || null,
        correct: v.correct === null ? null : Boolean(v.correct),
      })),
      b: b.map((v) => ({
        id: Number(v.user_id),
        username: v.username,
        avatar_url: v.avatar_url || null,
        correct: v.correct === null ? null : Boolean(v.correct),
      })),
    },
    updated_at: m.updated_at,
  };
}

async function votosDosJogos(db, ids) {
  const porJogo = new Map();
  if (!ids.length) return porJogo;
  const rows = await db
    .prepare(
      `SELECT p.match_id, p.user_id, p.pick, p.correct, u.username, up.avatar_url
       FROM r6_predictions p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN user_profiles up ON up.user_id = p.user_id
       WHERE p.match_id = ANY(?::bigint[])
       ORDER BY u.username ASC`,
    )
    .all(ids);
  for (const r of rows) {
    const k = Number(r.match_id);
    if (!porJogo.has(k)) porJogo.set(k, []);
    porJogo.get(k).push(r);
  }
  return porJogo;
}

router.get('/', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth && req.auth.uid ? Number(req.auth.uid) : null;
    // Os dados atuais saem já; só sincronizamos quando o cliente pede
    // (primeira abertura / refresh / de vez em quando no polling). Assim
    // a página abre em ~100 ms em vez de esperar 3 s pela Ubisoft.
    const forcar = String(req.query.sync || '') === '1';
    let sync = { ok: true, cached: true };
    try {
      const temDados = await db.prepare('SELECT count(*)::int AS n FROM r6_matches').get();
      if (forcar || !Number(temDados && temDados.n)) {
        sync = await sincronizar({ force: forcar });
      }
    } catch (e) {
      sync = { ok: false, error: e.message };
    }

    // Corrige jogos que ficaram "ao vivo" (status 2) mas já acabaram há
    // muito — a Ubisoft às vezes não atualiza o estado. Evita o "1 ao vivo"
    // eterno no site.
    try {
      await db
        .prepare(
          `UPDATE r6_matches
             SET status = 3,
                 winner = COALESCE(winner, CASE
                   WHEN score_a > score_b THEN 'a'
                   WHEN score_b > score_a THEN 'b'
                   ELSE NULL END),
                 updated_at = now()
           WHERE status = 2 AND start_time < now() - interval '6 hours'`,
        )
        .run();
    } catch {
      /* se falhar, segue */
    }

    const [proximos, recentes] = await Promise.all([
      db
        .prepare(
          `SELECT * FROM r6_matches
           WHERE status IN (1, 2) AND start_time > now() - interval '12 hours'
           ORDER BY start_time ASC LIMIT 24`,
        )
        .all(),
      db
        .prepare(
          `SELECT * FROM r6_matches
           WHERE status = 3 AND start_time > now() - interval '35 days'
           ORDER BY start_time DESC LIMIT 35`,
        )
        .all(),
    ]);

    const todos = [...proximos, ...recentes.filter((r) => !proximos.some((p) => p.id === r.id))];
    avisarAoVivo('r6', proximos);
    const votos = await votosDosJogos(
      db,
      todos.map((m) => Number(m.id)),
    );

    res.json({
      matches: todos.map((m) => decorar(m, votos.get(Number(m.id)) || [], uid)),
      sync,
      now: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro previsões GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/:id/voto', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth.uid;
    const id = Number(req.params.id);
    const pick = String((req.body && req.body.pick) || '').toLowerCase();
    if (!['a', 'b'].includes(pick)) return res.status(400).json({ error: 'Escolhe uma equipa.' });
    if (!Number.isFinite(id) || id <= 0) return res.status(404).json({ error: 'Jogo não encontrado.' });

    const m = await db.prepare('SELECT * FROM r6_matches WHERE id = ?').get(id);
    if (!m) return res.status(404).json({ error: 'Jogo não encontrado.' });
    if (Number(m.status) !== 1) {
      return res.status(409).json({ error: 'As apostas já fecharam para este jogo.' });
    }
    if (!m.team_a || !m.team_b) {
      return res.status(409).json({ error: 'Ainda não se sabe quem joga. Tenta mais tarde.' });
    }
    if (Date.now() >= new Date(m.start_time).getTime()) {
      return res.status(409).json({ error: 'O jogo já começou — apostas fechadas.' });
    }

    await db
      .prepare(
        `INSERT INTO r6_predictions (match_id, user_id, pick, updated_at)
         VALUES (?, ?, ?, now())
         ON CONFLICT (match_id, user_id) DO UPDATE SET pick = EXCLUDED.pick, updated_at = now()`,
      )
      .run(id, uid, pick);

    const rows = await db
      .prepare(
        `SELECT p.user_id, p.pick, p.correct, u.username, up.avatar_url
         FROM r6_predictions p JOIN users u ON u.id = p.user_id
         LEFT JOIN user_profiles up ON up.user_id = p.user_id
         WHERE p.match_id = ? ORDER BY u.username ASC`,
      )
      .all(id);
    const a = rows.filter((v) => v.pick === 'a').length;
    const b = rows.filter((v) => v.pick === 'b').length;
    res.json({ ok: true, pick, counts: { a, b, total: rows.length } });
  } catch (error) {
    console.error('Erro previsão voto:', error.message);
    res.status(500).json({ error: 'Não deu para guardar o voto.' });
  }
});

router.get('/classificacao', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT u.id, u.username, up.avatar_url,
                count(*)::int AS total,
                count(*) FILTER (WHERE p.correct IS TRUE)::int AS acertos,
                count(*) FILTER (WHERE p.correct IS FALSE)::int AS falhas
         FROM r6_predictions p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN user_profiles up ON up.user_id = p.user_id
         GROUP BY u.id, u.username, up.avatar_url
         HAVING count(*) > 0
         ORDER BY acertos DESC, total DESC, u.username ASC
         LIMIT 100`,
      )
      .all();
    // atualiza a distinção de 1.º lugar em segundo plano (sem atrasar)
    syncTop1Previsoes().catch(() => {});
    syncStreaks().catch(() => {});

    res.json({
      users: rows.map((r, i) => ({
        pos: i + 1,
        id: Number(r.id),
        username: r.username,
        avatar_url: r.avatar_url || null,
        total: Number(r.total) || 0,
        acertos: Number(r.acertos) || 0,
        falhas: Number(r.falhas) || 0,
        abertos: Math.max(0, (Number(r.total) || 0) - (Number(r.acertos) || 0) - (Number(r.falhas) || 0)),
      })),
    });
  } catch (error) {
    console.error('Erro classificação:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/resultados-novos', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth.uid;
    const r6 = await db
      .prepare(
        `SELECT p.match_id, p.pick, p.correct, m.team_a, m.team_b, m.score_a, m.score_b,
                m.start_time, m.competition_name AS competition
         FROM r6_predictions p
         JOIN r6_matches m ON m.id = p.match_id
         WHERE p.user_id = ? AND p.correct IS NOT NULL AND p.seen_at IS NULL AND m.status = 3
         ORDER BY m.start_time DESC LIMIT 12`,
      )
      .all(uid);
    const cs2 = await db
      .prepare(
        `SELECT p.match_id, p.pick, p.correct, m.team_a, m.team_b, m.score_a, m.score_b,
                m.start_time, m.competition
         FROM cs2_predictions p
         JOIN cs2_matches m ON m.id = p.match_id
         WHERE p.user_id = ? AND p.correct IS NOT NULL AND p.seen_at IS NULL AND m.status = 3
         ORDER BY m.start_time DESC LIMIT 12`,
      )
      .all(uid);
    const rows = [
      ...r6.map((r) => ({ ...r, jogo: 'r6' })),
      ...cs2.map((r) => ({ ...r, jogo: 'cs2' })),
    ]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 12);
    res.json({
      results: rows.map((r) => ({
        match_id: Number(r.match_id),
        jogo: r.jogo,
        pick: r.pick,
        correct: Boolean(r.correct),
        team_a: r.team_a || '',
        team_b: r.team_b || '',
        score_a: Number(r.score_a) || 0,
        score_b: Number(r.score_b) || 0,
        start_time: r.start_time,
        competition: r.competition || '',
      })),
    });
  } catch (error) {
    console.error('Erro resultados novos:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/resultados-vistos', requireUser, async (req, res) => {
  try {
    const db = getDb();
    await db
      .prepare(
        'UPDATE r6_predictions SET seen_at = now() WHERE user_id = ? AND correct IS NOT NULL AND seen_at IS NULL',
      )
      .run(req.auth.uid);
    await db
      .prepare(
        'UPDATE cs2_predictions SET seen_at = now() WHERE user_id = ? AND correct IS NOT NULL AND seen_at IS NULL',
      )
      .run(req.auth.uid);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro resultados vistos:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/* Próximo torneio (contagem decrescente) — automático do calendário oficial */
router.get('/proximo-torneio', async (req, res) => {
  try {
    if (cacheProxTorneio.dados && Date.now() - cacheProxTorneio.at < 5 * 60 * 1000) {
      return res.json(cacheProxTorneio.dados);
    }
    const t = await proximoTorneio();
    const dados = { ok: true, torneio: t || null };
    cacheProxTorneio = { at: Date.now(), dados };
    res.json(dados);
  } catch (error) {
    console.error('Erro proximo-torneio:', error.message);
    res.status(502).json({ ok: false, error: 'Sem ligação ao calendário da Ubisoft.' });
  }
});

/* ============================================================
   CS2 — jogos ao vivo + previsões (bo3.gg)
   ============================================================ */
function decorarCs2(m, votos, uid) {
  const agora = Date.now();
  const inicio = new Date(m.start_time).getTime();
  const status = Number(m.status) || 1;
  const a = votos.filter((v) => v.pick === 'a');
  const b = votos.filter((v) => v.pick === 'b');
  const meu = uid ? votos.find((v) => Number(v.user_id) === uid) || null : null;
  return {
    id: Number(m.id),
    external_id: Number(m.external_id) || null,
    competition: m.competition || '',
    competition_logo: m.competition_logo || null,
    region: m.region || 'Global',
    tier: m.tier || null,
    tier_rank: Number(m.tier_rank) || null,
    start_time: m.start_time,
    status,
    score_a: Number(m.score_a) || 0,
    score_b: Number(m.score_b) || 0,
    winner: m.winner || null,
    stream_url: m.stream_url || null,
    team_a: { name: m.team_a || '', logo: m.team_a_logo || null },
    team_b: { name: m.team_b || '', logo: m.team_b_logo || null },
    can_vote: status === 1 && m.team_a && m.team_b && agora < inicio,
    locked: status !== 1 || agora >= inicio,
    pick: meu ? meu.pick : null,
    correct: meu && meu.correct !== null ? Boolean(meu.correct) : null,
    counts: { a: a.length, b: b.length, total: votos.length },
    voters: {
      a: a.map((v) => ({
        id: Number(v.user_id),
        username: v.username,
        avatar_url: v.avatar_url || null,
        correct: v.correct === null ? null : Boolean(v.correct),
      })),
      b: b.map((v) => ({
        id: Number(v.user_id),
        username: v.username,
        avatar_url: v.avatar_url || null,
        correct: v.correct === null ? null : Boolean(v.correct),
      })),
    },
  };
}

async function votosCs2(db, ids) {
  const porJogo = new Map();
  if (!ids.length) return porJogo;
  const rows = await db
    .prepare(
      `SELECT p.match_id, p.user_id, p.pick, p.correct, u.username, up.avatar_url
         FROM cs2_predictions p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN user_profiles up ON up.user_id = p.user_id
        WHERE p.match_id = ANY(?::bigint[])
        ORDER BY u.username ASC`,
    )
    .all(ids);
  for (const r of rows) {
    const k = Number(r.match_id);
    if (!porJogo.has(k)) porJogo.set(k, []);
    porJogo.get(k).push(r);
  }
  return porJogo;
}

router.get('/cs2', attachAuth, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth && req.auth.uid ? Number(req.auth.uid) : null;
    const sync = await cs2.sincronizar({ forcar: String(req.query.sync || '') === '1' });
    const [proximos, recentes] = await Promise.all([
      db
        .prepare(
          `SELECT * FROM cs2_matches
            WHERE status IN (1, 2) AND tier IN ('s', 'a')
              AND start_time > now() - interval '12 hours'
            ORDER BY start_time ASC LIMIT 24`,
        )
        .all(),
      db
        .prepare(
          `SELECT * FROM cs2_matches
            WHERE status = 3 AND tier IN ('s', 'a') AND start_time > now() - interval '35 days'
            ORDER BY start_time DESC LIMIT 35`,
        )
        .all(),
    ]);
    const todos = [...proximos, ...recentes.filter((r) => !proximos.some((p) => p.id === r.id))];
    avisarAoVivo('cs2', proximos);
    const votos = await votosCs2(
      db,
      todos.map((m) => Number(m.id)),
    );
    res.json({
      matches: todos.map((m) => decorarCs2(m, votos.get(Number(m.id)) || [], uid)),
      sync,
      now: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Erro CS2 previsões GET:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/cs2/:id/voto', requireUser, async (req, res) => {
  try {
    const db = getDb();
    const uid = req.auth.uid;
    const id = Number(req.params.id);
    const pick = String((req.body && req.body.pick) || '').toLowerCase();
    if (!['a', 'b'].includes(pick)) return res.status(400).json({ error: 'Escolhe uma equipa.' });
    const m = await db.prepare('SELECT * FROM cs2_matches WHERE id = ?').get(id);
    if (!m) return res.status(404).json({ error: 'Jogo não encontrado.' });
    if (Number(m.status) !== 1) return res.status(409).json({ error: 'As apostas já fecharam.' });
    if (!m.team_a || !m.team_b) {
      return res.status(409).json({ error: 'Ainda não se sabe quem joga.' });
    }
    if (Date.now() >= new Date(m.start_time).getTime()) {
      return res.status(409).json({ error: 'O jogo já começou — apostas fechadas.' });
    }
    await db
      .prepare(
        `INSERT INTO cs2_predictions (match_id, user_id, pick, updated_at)
         VALUES (?, ?, ?, now())
         ON CONFLICT (match_id, user_id) DO UPDATE SET pick = EXCLUDED.pick, updated_at = now()`,
      )
      .run(id, uid, pick);
    const rows = await db
      .prepare(
        `SELECT p.user_id, p.pick, p.correct, u.username, up.avatar_url
           FROM cs2_predictions p JOIN users u ON u.id = p.user_id
           LEFT JOIN user_profiles up ON up.user_id = p.user_id
          WHERE p.match_id = ? ORDER BY u.username ASC`,
      )
      .all(id);
    res.json({
      ok: true,
      pick,
      counts: {
        a: rows.filter((v) => v.pick === 'a').length,
        b: rows.filter((v) => v.pick === 'b').length,
        total: rows.length,
      },
    });
  } catch (e) {
    console.error('Erro CS2 voto:', e.message);
    res.status(500).json({ error: 'Não deu para guardar o voto.' });
  }
});

router.get('/cs2/classificacao', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT u.id, u.username, up.avatar_url,
                count(*)::int AS total,
                count(*) FILTER (WHERE p.correct IS TRUE)::int AS acertos,
                count(*) FILTER (WHERE p.correct IS FALSE)::int AS falhas
           FROM cs2_predictions p
           JOIN users u ON u.id = p.user_id
           LEFT JOIN user_profiles up ON up.user_id = p.user_id
          GROUP BY u.id, u.username, up.avatar_url
          HAVING count(*) > 0
          ORDER BY acertos DESC, total DESC, u.username ASC
          LIMIT 100`,
      )
      .all();
    res.json({
      users: rows.map((r, i) => ({
        pos: i + 1,
        id: Number(r.id),
        username: r.username,
        avatar_url: r.avatar_url || null,
        total: Number(r.total) || 0,
        acertos: Number(r.acertos) || 0,
        falhas: Number(r.falhas) || 0,
      })),
    });
    syncTop1Previsoes().catch(() => {});
    syncStreaks().catch(() => {});
  } catch (e) {
    console.error('Erro classificação CS2:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/classificacao-total', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `WITH juntas AS (
           SELECT user_id, correct, 'r6' AS jogo FROM r6_predictions
           UNION ALL
           SELECT user_id, correct, 'cs2' AS jogo FROM cs2_predictions
         )
         SELECT u.id, u.username, up.avatar_url,
                count(*)::int AS total,
                count(*) FILTER (WHERE j.correct IS TRUE)::int AS acertos,
                count(*) FILTER (WHERE j.correct IS FALSE)::int AS falhas,
                count(*) FILTER (WHERE j.jogo = 'r6' AND j.correct IS TRUE)::int AS r6,
                count(*) FILTER (WHERE j.jogo = 'cs2' AND j.correct IS TRUE)::int AS cs2
           FROM juntas j
           JOIN users u ON u.id = j.user_id
           LEFT JOIN user_profiles up ON up.user_id = u.id
          GROUP BY u.id, u.username, up.avatar_url
          HAVING count(*) > 0
          ORDER BY acertos DESC, total DESC, u.username ASC
          LIMIT 100`,
      )
      .all();
    syncTop1Previsoes().catch(() => {});
    syncStreaks().catch(() => {});
    res.json({
      users: rows.map((r, i) => ({
        pos: i + 1,
        id: Number(r.id),
        username: r.username,
        avatar_url: r.avatar_url || null,
        total: Number(r.total) || 0,
        acertos: Number(r.acertos) || 0,
        falhas: Number(r.falhas) || 0,
        r6: Number(r.r6) || 0,
        cs2: Number(r.cs2) || 0,
      })),
    });
  } catch (e) {
    console.error('Erro classificação total:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/cs2/proximo', async (req, res) => {
  try {
    const db = getDb();
    const row = await db
      .prepare(
        `SELECT * FROM cs2_matches
          WHERE status IN (1, 2) AND tier IN ('s', 'a')
            AND (status = 2 OR start_time > now())
          ORDER BY CASE WHEN status = 2 THEN 0 ELSE 1 END, start_time ASC
          LIMIT 1`,
      )
      .get();
    if (!row) return res.json({ ok: true, jogo: null });
    res.json({
      ok: true,
      jogo: {
        id: Number(row.id),
        competition: row.competition || 'CS2',
        competition_logo: row.competition_logo || null,
        team_a: { name: row.team_a || '', logo: row.team_a_logo || null },
        team_b: { name: row.team_b || '', logo: row.team_b_logo || null },
        start_time: row.start_time,
        status: Number(row.status),
        stream_url: row.stream_url || null,
      },
    });
  } catch (e) {
    console.error('Erro próximo CS2:', e.message);
    res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

module.exports = { previsoesRouter: router };
