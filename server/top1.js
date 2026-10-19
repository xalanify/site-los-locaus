/* ============================================================
   TOP 1 KILL (CS2) — automático

   O jogador que lidera o ranking "Top kills" (total de kills
   acumulados, como aparece no painel ao vivo da Steam) recebe a
   distinção `top1` na sua conta. A ligação CS2 -> conta faz-se
   pelo "nick no CS2" guardado no perfil (ou pelo username, caso
   coincida).

   - Corre no arranque do servidor (index.js).
   - Repete sempre que os ficheiros do histórico mudam
     (chamado em GET /api/games/cs2) e no painel ao vivo.
   - Se o líder não tiver conta, não mexe nas atribuições
     (deixa as manuais do admin intactas).
   ============================================================ */
const cs2 = require('./cs2data');
const cs2live = require('./cs2live');
const store = require('./usersStore');
const { getDb } = require('./database');

/* Líder do ranking "Top kills" (total acumulado).

   Preferência: painel ao vivo da Steam (total_kills de cada conta
   ligada). Se não houver dados ao vivo (sem key, tudo privado),
   cai para o histórico guardado (soma de kills de todas as partidas). */
async function computeLeader() {
  // 1) ao vivo (Steam) — é o que o painel mostra
  try {
    const r = await cs2live.aoVivo();
    if (r && r.ok && Array.isArray(r.jogadores) && r.jogadores.length) {
      const publicos = r.jogadores.filter((j) => j && j.ok && Number.isFinite(j.kills));
      if (publicos.length) {
        const top = publicos.reduce((a, b) => (b.kills > a.kills ? b : a));
        return { key: top.nick, kills: top.kills, name: top.nome || top.nick };
      }
    }
  } catch (e) {
    console.error('Top1 ao vivo falhou:', e && e.message);
  }

  // 2) fallback: histórico guardado (soma de kills por jogador)
  const data = cs2.getData();
  const totals = new Map();
  const lastDate = new Map();
  for (const m of data.matches || []) {
    for (const team of [m.teamA || [], m.teamB || []]) {
      for (const p of team) {
        if (!p.tracked) continue;
        const k = Number(p.k) || 0;
        totals.set(p.tracked, (totals.get(p.tracked) || 0) + k);
        const d = String(m.date || '');
        if (!lastDate.has(p.tracked) || d > lastDate.get(p.tracked)) lastDate.set(p.tracked, d);
      }
    }
  }
  const ranked = [...totals.entries()]
    .map(([key, kills]) => ({ key, kills, date: lastDate.get(key) || '' }))
    .sort((a, b) => b.kills - a.kills || (b.date > a.date ? -1 : 1));
  if (!ranked[0]) return null;
  const t = (cs2.TRACKED || []).find((x) => String(x.key).toLowerCase() === String(ranked[0].key).toLowerCase());
  return { key: ranked[0].key, kills: ranked[0].kills, name: (t && t.name) || ranked[0].key };
}

/* Lider -> conta (ligação oficial do admin primeiro, depois
   nick no CS2 do perfil, depois username).
   O nick guardado pode ser a chave interna ou o nome que se vê nas
   estatísticas — aceita qualquer forma do mesmo jogador. */
async function matchAccount(key) {
  const k = String(key || '').toLowerCase().trim();
  const formas = new Set([k]);

  // tracked (histórico) — nomes alternativos
  try {
    const t = (cs2.TRACKED || []).find((x) => String(x.key).toLowerCase() === k);
    if (t) {
      formas.add(String(t.name || '').toLowerCase().trim());
      for (const n of t.names || []) formas.add(String(n).toLowerCase().trim());
    }
  } catch {}

  // membros ao vivo (cs2-steam.json) — o nick é a chave do líder ao vivo
  try {
    const membros = cs2live.membros();
    for (const m of membros) {
      const nick = typeof m === 'string' ? m : m.nick;
      const steam = typeof m === 'string' ? null : m.steam;
      if (String(nick || '').toLowerCase().trim() === k) {
        formas.add(String(nick).toLowerCase().trim());
        if (steam) formas.add(String(steam).toLowerCase().trim());
      }
    }
  } catch {}

  for (const f of [...formas]) if (!f) formas.delete(f);

  const db = getDb();
  // 1) user_game_accounts — ligação feita no painel admin
  try {
    const rows = await db
      .prepare("SELECT user_id, nick FROM user_game_accounts WHERE LOWER(game) = 'cs2'")
      .all();
    const hit = rows.find((r) => formas.has(String(r.nick || '').toLowerCase().trim()));
    if (hit) {
      const u = await store.findById(hit.user_id);
      if (u) return u;
    }
  } catch {
    /* tabela ainda não existe */
  }
  // 2) nick no CS2 do perfil
  try {
    const rows = await db
      .prepare(
        "SELECT user_id, game_nick FROM user_profiles WHERE game_nick IS NOT NULL AND TRIM(game_nick) != ''",
      )
      .all();
    const hit = rows.find((r) => formas.has(String(r.game_nick || '').toLowerCase().trim()));
    if (hit) {
      const u = await store.findById(hit.user_id);
      if (u) return u;
    }
  } catch {
    /* tabela ainda não existe */
  }
  const accounts = await store.listAll();
  return accounts.find((a) => formas.has(String(a.username).toLowerCase().trim())) || null;
}

/* Garante que só o líder tem a distinção top1 */
async function syncTop1Badge() {
  try {
    const leader = await computeLeader();
    if (!leader) return null;

    const account = await matchAccount(leader.key);
    const db = getDb();
    const holders = (await db
      .prepare("SELECT user_id FROM user_badges WHERE badge = 'top1'")
      .all()).map((r) => Number(r.user_id));

    if (!account) {
      return { leader: leader.name, kills: leader.kills, conta: null };
    }

    const want = Number(account.id);
    if (!holders.includes(want)) {
      await db
        .prepare(
          "INSERT INTO user_badges (user_id, badge, granted_by) VALUES (?, 'top1', NULL) ON CONFLICT (user_id, badge) DO NOTHING",
        )
        .run(want);
    }
    for (const uid of holders) {
      if (uid !== want) {
        await db.prepare("DELETE FROM user_badges WHERE user_id = ? AND badge = 'top1'").run(uid);
      }
    }
    return { leader: leader.name, kills: leader.kills, conta: account.username };
  } catch (e) {
    console.error('Erro syncTop1:', e.message);
    return null;
  }
}

module.exports = { syncTop1Badge, computeLeader };