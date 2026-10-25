/* ============================================================
   Distinção automática: RANK MAIS ALTO FORTNITE
   ------------------------------------------------------------
   Lê o snapshot do tracker.gg (fortnite_snapshot), escolhe o
   jogador com o rank atual mais alto e dá a badge à conta do
   site que tiver esse nick ligado em user_game_accounts.
   ============================================================ */
const { getDb } = require('./database');
const store = require('./fortnitestore');

const BADGE = 'fortnite-rank1';
let ultimo = 0;
let emCurso = null;

function valorDoRank(j) {
  const p = j && j.perfil;
  const atual = p && p.rankAtual;
  const melhor = p && p.melhorRank;
  const vAtual = atual && Number.isFinite(Number(atual.valor)) ? Number(atual.valor) : null;
  const vMelhor = melhor && Number.isFinite(Number(melhor.valor)) ? Number(melhor.valor) : null;
  return { valor: vAtual ?? vMelhor, nome: (atual && atual.nome) || (melhor && melhor.nome) || null };
}

async function sincronizar({ forcar = false } = {}) {
  if (!forcar && Date.now() - ultimo < 2 * 60 * 1000) return { ok: true, saltado: true };
  if (emCurso) return emCurso;

  emCurso = (async () => {
    try {
      const snap = await store.ler();
      const jogadores = (snap && snap.jogadores) || {};
      let melhor = null;
      for (const j of Object.values(jogadores)) {
        if (!j || !j.temDados) continue;
        const r = valorDoRank(j);
        if (!r.valor || !r.nome) continue;
        if (!melhor || r.valor > melhor.valor) {
          melhor = { ...r, nomeJogador: j.nome || null };
        }
      }
      if (!melhor || !melhor.nomeJogador) {
        ultimo = Date.now();
        return { ok: true, semDados: true };
      }

      const db = getDb();
      const contas = await db
        .prepare(
          `SELECT user_id, nick FROM user_game_accounts
            WHERE lower(game) = 'fortnite'`,
        )
        .all();
      const conta = contas.find(
        (a) => String(a.nick || '').trim().toLowerCase() === melhor.nomeJogador.trim().toLowerCase(),
      );
      if (!conta) {
        await db.prepare('DELETE FROM user_badges WHERE badge = ?').run(BADGE);
        ultimo = Date.now();
        return { ok: true, semConta: true, jogador: melhor.nomeJogador, rank: melhor.nome };
      }

      await db
        .prepare(
          `INSERT INTO user_badges (user_id, badge, granted_by)
           VALUES (?, ?, NULL)
           ON CONFLICT (user_id, badge) DO NOTHING`,
        )
        .run(Number(conta.user_id), BADGE);
      await db
        .prepare('DELETE FROM user_badges WHERE badge = ? AND user_id <> ?')
        .run(BADGE, Number(conta.user_id));

      ultimo = Date.now();
      return {
        ok: true,
        userId: Number(conta.user_id),
        jogador: melhor.nomeJogador,
        rank: melhor.nome,
      };
    } catch (e) {
      console.warn('Fortnite rank badge:', e.message);
      return { ok: false, erro: e.message };
    } finally {
      emCurso = null;
    }
  })();

  return emCurso;
}

module.exports = { sincronizar, BADGE };
