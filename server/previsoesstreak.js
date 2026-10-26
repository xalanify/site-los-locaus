/* ============================================================
   Sequência de acertos nas previsões
   ------------------------------------------------------------
   Conta os acertos consecutivos mais recentes de cada conta,
   juntando R6 + CS2 por ordem do início do jogo. A partir de 5
   acertos seguidos, a conta recebe a distinção dinâmica
   `streak-5`, `streak-6`, ... (o número sobe enquanto acertar).
   Ao falhar, a sequência volta a zero e a distinção sai.
   ============================================================ */
const { getDb } = require('./database');

async function syncStreaks() {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `WITH preds AS (
           SELECT p.user_id, p.correct, m.start_time, p.match_id
             FROM r6_predictions p
             JOIN r6_matches m ON m.id = p.match_id
            WHERE p.correct IS NOT NULL
           UNION ALL
           SELECT p.user_id, p.correct, m.start_time, p.match_id
             FROM cs2_predictions p
             JOIN cs2_matches m ON m.id = p.match_id
            WHERE p.correct IS NOT NULL
         )
         SELECT user_id, correct
           FROM preds
          ORDER BY user_id ASC, start_time ASC NULLS LAST, match_id ASC`,
      )
      .all();

    const sequencias = new Map();
    for (const r of rows) {
      const uid = Number(r.user_id);
      const atual = sequencias.get(uid) || 0;
      sequencias.set(uid, r.correct ? atual + 1 : 0);
    }

    const desejados = [];
    for (const [uid, n] of sequencias) {
      if (n >= 5) desejados.push([uid, `streak-${n}`]);
    }

    // Limpa as antigas e aplica as sequências atuais.
    await db.prepare("DELETE FROM user_badges WHERE badge LIKE 'streak-%'").run().catch(() => {});
    for (const [uid, badge] of desejados) {
      await db
        .prepare(
          `INSERT INTO user_badges (user_id, badge, granted_by)
           VALUES (?, ?, NULL)
           ON CONFLICT (user_id, badge) DO NOTHING`,
        )
        .run(uid, badge)
        .catch(() => {});
    }
    return desejados.map(([user_id, badge]) => ({ user_id, badge }));
  } catch (e) {
    console.error('Erro syncStreaks:', e.message);
    return [];
  }
}

module.exports = { syncStreaks };
