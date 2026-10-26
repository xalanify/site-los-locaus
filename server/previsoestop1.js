/* ============================================================
   Distinção automática: 1.º na classificação total das previsões
   ------------------------------------------------------------
   A classificação total soma R6 + CS2. As classificações
   individuais continuam guardadas na BD, mas por agora não dão
   distinção própria.
   ============================================================ */
const { getDb } = require('./database');

async function lider(db, sql) {
  try {
    const rows = await db.prepare(sql).all();
    const l = rows[0];
    if (!l || !Number(l.acertos)) return null;
    return { user_id: Number(l.user_id), acertos: Number(l.acertos) };
  } catch {
    return null;
  }
}

async function aplicar(db, badge, user_id) {
  const holders = (await db
    .prepare('SELECT user_id FROM user_badges WHERE badge = ?')
    .all(badge)).map((r) => Number(r.user_id));

  if (!user_id) {
    await db.prepare('DELETE FROM user_badges WHERE badge = ?').run(badge).catch(() => {});
    return null;
  }
  if (!holders.includes(user_id)) {
    await db
      .prepare(
        'INSERT INTO user_badges (user_id, badge, granted_by) VALUES (?, ?, NULL) ON CONFLICT (user_id, badge) DO NOTHING',
      )
      .run(user_id, badge);
  }
  for (const uid of holders) {
    if (uid !== user_id) {
      await db.prepare('DELETE FROM user_badges WHERE user_id = ? AND badge = ?').run(uid, badge);
    }
  }
  return user_id;
}

async function syncTop1Previsoes() {
  try {
    const db = getDb();
    const total = await lider(
      db,
      `WITH juntas AS (
         SELECT user_id, correct FROM r6_predictions
         UNION ALL
         SELECT user_id, correct FROM cs2_predictions
       )
       SELECT user_id,
              count(*) FILTER (WHERE correct IS TRUE)::int AS acertos
         FROM juntas
         GROUP BY user_id
         HAVING count(*) > 0
         ORDER BY acertos DESC, count(*) DESC, user_id ASC
         LIMIT 1`,
    );

    await aplicar(db, 'previsao1', total && total.user_id);
    // distinções por jogo ficam desligadas por agora
    await db
      .prepare("DELETE FROM user_badges WHERE badge IN ('r6-top1', 'cs2-top1')")
      .run()
      .catch(() => {});

    return { total };
  } catch (e) {
    console.error('Erro syncTop1Previsoes:', e.message);
    return null;
  }
}

module.exports = { syncTop1Previsoes };
