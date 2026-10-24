/* ============================================================
   1.º LUGAR NAS PREVISÕES — automático
   ------------------------------------------------------------
   Quem estiver em 1.º na classificação das previsões R6 (mais
   acertos; desempate por total de jogos e depois id) recebe a
   distinção `previsao1`. É recalculada:
     - no arranque do servidor (index.js);
     - sempre que alguém abre a classificação (GET /classificacao),
       o que apanha resultados novos logo que a página refresca.
   ============================================================ */
const { getDb } = require('./database');

async function syncTop1Previsoes() {
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        `SELECT user_id,
                count(*)::int AS total,
                count(*) FILTER (WHERE correct IS TRUE)::int AS acertos
         FROM r6_predictions
         GROUP BY user_id
         HAVING count(*) > 0
         ORDER BY acertos DESC, total DESC, user_id ASC
         LIMIT 1`,
      )
      .all();
    const lider = rows[0];
    // sem ninguém com pelo menos 1 acerto não há líder (e não mexemos
    // nas atribuições manuais do admin)
    if (!lider || !Number(lider.acertos)) {
      // garante que ninguém fica com a distinção se não há acertos
      await db.prepare("DELETE FROM user_badges WHERE badge = 'previsao1'").run().catch(() => {});
      return { lider: null, acertos: 0 };
    }

    const want = Number(lider.user_id);
    const holders = (await db
      .prepare("SELECT user_id FROM user_badges WHERE badge = 'previsao1'")
      .all()).map((r) => Number(r.user_id));

    if (!holders.includes(want)) {
      await db
        .prepare(
          "INSERT INTO user_badges (user_id, badge, granted_by) VALUES (?, 'previsao1', NULL) ON CONFLICT (user_id, badge) DO NOTHING",
        )
        .run(want);
    }
    for (const uid of holders) {
      if (uid !== want) {
        await db.prepare("DELETE FROM user_badges WHERE user_id = ? AND badge = 'previsao1'").run(uid);
      }
    }
    return { lider: want, acertos: Number(lider.acertos) };
  } catch (e) {
    console.error('Erro syncTop1Previsoes:', e.message);
    return null;
  }
}

module.exports = { syncTop1Previsoes };
