// ============================================================
//  API das Previsões R6
// ============================================================
const express = require('express');
const { getDb } = require('../database');
const { attachAuth, requireUser } = require('../middleware/auth');
const { sincronizar } = require('../r6previsoes');

const router = express.Router();

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
    const rows = await db
      .prepare(
        `SELECT p.match_id, p.pick, p.correct, m.team_a, m.team_b, m.score_a, m.score_b,
                m.start_time, m.competition_name
         FROM r6_predictions p
         JOIN r6_matches m ON m.id = p.match_id
         WHERE p.user_id = ? AND p.correct IS NOT NULL AND p.seen_at IS NULL AND m.status = 3
         ORDER BY m.start_time DESC LIMIT 12`,
      )
      .all(uid);
    res.json({
      results: rows.map((r) => ({
        match_id: Number(r.match_id),
        pick: r.pick,
        correct: Boolean(r.correct),
        team_a: r.team_a || '',
        team_b: r.team_b || '',
        score_a: Number(r.score_a) || 0,
        score_b: Number(r.score_b) || 0,
        start_time: r.start_time,
        competition: r.competition_name || '',
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
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro resultados vistos:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { previsoesRouter: router };
