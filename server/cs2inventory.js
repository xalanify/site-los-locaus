/* ============================================================
   Distinção automática: inventário CS2 mais caro
   ------------------------------------------------------------
   O admin guarda o valor do inventário (€) de cada conta em
   user_profiles.cs2_inventory_eur. Esta rotina dá a distinção
   `cs2-inventory` a quem tiver o valor mais alto e retira-a aos
   restantes. (A avaliação automática das skins precisaria de uma
   API de preços da Steam; o valor é atualizado no perfil.)
   ============================================================ */
const { getDb } = require('./database');
const CS2_STEAM = require('./data/cs2-steam.json');

let ultimo = 0;
let ultimoValores = 0;

const normNick = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[._-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const STEAM_BY_NICK = new Map(
  (Array.isArray(CS2_STEAM) ? CS2_STEAM : [])
    .filter((x) => x && x.nick && x.steam)
    .map((x) => [normNick(x.nick), String(x.steam)]),
);

async function valorInventarioSteam(steamid) {
  try {
    const base = process.env.PORT || 3001;
    const r = await fetch(
      `http://127.0.0.1:${base}/api/games/cs2-inventario?steam=${encodeURIComponent(steamid)}`,
      { signal: AbortSignal.timeout(45000) },
    );
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || !d.ok) return null;
    return Number(d.valorEstimado) || 0;
  } catch {
    return null;
  }
}

/* Vai buscar os inventários das contas CS2 ligadas e guarda o total
   por utilizador. Corre em background (e pode ser forçado no editor). */
async function sincronizarValores({ forcar = false } = {}) {
  if (!forcar && Date.now() - ultimoValores < 30 * 60 * 1000) return null;
  ultimoValores = Date.now();
  try {
    const db = getDb();
    const rows = await db
      .prepare("SELECT user_id, nick FROM user_game_accounts WHERE lower(game) = 'cs2'")
      .all();
    const porUser = new Map();
    for (const row of rows) {
      const steam = STEAM_BY_NICK.get(normNick(row.nick));
      if (!steam) continue;
      if (!porUser.has(row.user_id)) porUser.set(row.user_id, new Set());
      porUser.get(row.user_id).add(steam);
    }

    const resultado = [];
    for (const [uid, ids] of porUser) {
      let total = 0;
      let algum = false;
      for (const steam of ids) {
        const v = await valorInventarioSteam(steam);
        if (v != null) {
          total += v;
          algum = true;
        }
      }
      if (!algum) continue;
      const valor = Number(total.toFixed(2));
      await db
        .prepare(
          'UPDATE user_profiles SET cs2_inventory_eur = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        )
        .run(valor, uid);
      resultado.push({ user_id: Number(uid), valor });
    }

    await syncCs2InventoryBadge({ forcar: true });
    return { ok: true, contas: porUser.size, valores: resultado };
  } catch (e) {
    console.error('Erro sync valores CS2:', e.message);
    return null;
  }
}

async function syncCs2InventoryBadge({ forcar = false } = {}) {
  if (!forcar && Date.now() - ultimo < 2 * 60 * 1000) return null;
  ultimo = Date.now();
  try {
    const db = getDb();
    const rows = await db
      .prepare(
        'SELECT user_id, cs2_inventory_eur FROM user_profiles WHERE cs2_inventory_eur > 0 ORDER BY cs2_inventory_eur DESC',
      )
      .all();
    const top = rows[0];
    const holders = (
      await db.prepare("SELECT user_id FROM user_badges WHERE badge = 'cs2-inventory'").all()
    ).map((r) => Number(r.user_id));

    if (!top) {
      await db.prepare("DELETE FROM user_badges WHERE badge = 'cs2-inventory'").run();
      return null;
    }

    const want = Number(top.user_id);
    if (!holders.includes(want)) {
      await db
        .prepare(
          "INSERT INTO user_badges (user_id, badge, granted_by) VALUES (?, 'cs2-inventory', NULL) ON CONFLICT (user_id, badge) DO NOTHING",
        )
        .run(want);
    }
    for (const uid of holders) {
      if (uid !== want) {
        await db
          .prepare("DELETE FROM user_badges WHERE user_id = ? AND badge = 'cs2-inventory'")
          .run(uid);
      }
    }
    return { user_id: want, valor: Number(top.cs2_inventory_eur) };
  } catch (e) {
    console.error('Erro sync inventário CS2:', e.message);
    return null;
  }
}

module.exports = { syncCs2InventoryBadge, sincronizarValores };
