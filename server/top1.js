/* ============================================================
   TOP 1 KILL (CS2) — automático

   O jogador que lidera o ranking "Top 1 Kill" (melhor partida
   de cada um — igual ao site) recebe a distinção `top1` na sua
   conta. A ligação CS2 -> conta faz-se pelo "nick no CS2"
   guardado no perfil (ou pelo username, caso coincida).

   - Corre no arranque do servidor (index.js).
   - Repete sempre que os ficheiros do histórico mudam
     (chamado em GET /api/games/cs2).
   - Se o líder não tiver conta, não mexe nas atribuições
     (deixa as manuais do admin intactas).
   ============================================================ */
const cs2 = require('./cs2data');
const store = require('./usersStore');
const { getDb } = require('./database');

/* Mesmo cálculo do ranking "Top 1 Kill" do cliente:
   máximo de kills numa única partida, por jogador. */
function computeLeader() {
  const data = cs2.getData();
  const best = new Map();
  for (const m of data.matches || []) {
    for (const team of [m.teamA || [], m.teamB || []]) {
      for (const p of team) {
        if (!p.tracked) continue;
        const k = Number(p.k) || 0;
        const prev = best.get(p.tracked);
        const date = String(m.date || '');
        if (!prev || k > prev.kills || (k === prev.kills && date > prev.date)) {
          best.set(p.tracked, { kills: k, name: p.name || p.tracked, date });
        }
      }
    }
  }
  const ranked = [...best.entries()].sort(
    (a, b) => b[1].kills - a[1].kills || (b[1].date > a[1].date ? -1 : 1),
  );
  if (!ranked[0]) return null;
  return { key: ranked[0][0], kills: ranked[0][1].kills, name: ranked[0][1].name };
}

/* Lider -> conta (nick no CS2 primeiro, depois username) */
async function matchAccount(key) {
  const k = String(key || '').toLowerCase();
  const db = getDb();
  try {
    const rows = db
      .prepare(
        "SELECT user_id, game_nick FROM user_profiles WHERE game_nick IS NOT NULL AND TRIM(game_nick) != ''",
      )
      .all();
    const hit = rows.find((r) => String(r.game_nick).toLowerCase() === k);
    if (hit) {
      const u = await store.findById(hit.user_id);
      if (u) return u;
    }
  } catch {
    /* tabela ainda não existe */
  }
  const accounts = await store.listAll();
  return accounts.find((a) => String(a.username).toLowerCase() === k) || null;
}

/* Garante que só o líder tem a distinção top1 */
async function syncTop1Badge() {
  try {
    const leader = computeLeader();
    if (!leader) return null;

    const account = await matchAccount(leader.key);
    const db = getDb();
    const holders = db
      .prepare("SELECT user_id FROM user_badges WHERE badge = 'top1'")
      .all()
      .map((r) => Number(r.user_id));

    if (!account) {
      return { leader: leader.name, kills: leader.kills, conta: null };
    }

    const want = Number(account.id);
    if (!holders.includes(want)) {
      db.prepare(
        "INSERT OR IGNORE INTO user_badges (user_id, badge, granted_by) VALUES (?, 'top1', NULL)",
      ).run(want);
    }
    for (const uid of holders) {
      if (uid !== want) {
        db.prepare("DELETE FROM user_badges WHERE user_id = ? AND badge = 'top1'").run(uid);
      }
    }
    return { leader: leader.name, kills: leader.kills, conta: account.username };
  } catch (e) {
    console.error('Erro syncTop1:', e.message);
    return null;
  }
}

module.exports = { syncTop1Badge, computeLeader };
