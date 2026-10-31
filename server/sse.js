// ============================================================
//  SSE — um canal aberto por utilizador
//
//  O chat e o sino deixam de andar a perguntar de 2 em 2 segundos:
//  o servidor empurra o que acontece. Só funciona no servidor
//  Node normal (localhost); na Vercel as funções não mantêm a
//  ligação aberta e o site volta sozinho ao polling.
// ============================================================

const clientes = new Map(); // userId -> Set<res>
let heartbeat = null;

function add(userId, res) {
  const uid = Number(userId);
  if (!uid) return;
  if (!clientes.has(uid)) clientes.set(uid, new Set());
  clientes.get(uid).add(res);
  arrancarHeartbeat();
}

function remove(userId, res) {
  const uid = Number(userId);
  const set = clientes.get(uid);
  if (!set) return;
  set.delete(res);
  if (!set.size) clientes.delete(uid);
}

function escrever(res, evento, dados) {
  try {
    res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

/** Envia um evento a um utilizador (todos os separadores abertos). */
function sendTo(userId, evento, dados) {
  const set = clientes.get(Number(userId));
  if (!set || !set.size) return 0;
  let n = 0;
  for (const res of [...set]) {
    if (escrever(res, evento, dados)) n += 1;
    else set.delete(res);
  }
  return n;
}

/** Envia a todos os que estão ligados (menos um, se indicado). */
function broadcast(evento, dados, { except } = {}) {
  const excluir = except == null ? null : Number(except);
  let n = 0;
  for (const [uid, set] of [...clientes]) {
    if (excluir != null && uid === excluir) continue;
    for (const res of [...set]) {
      if (escrever(res, evento, dados)) n += 1;
      else set.delete(res);
    }
    if (!set.size) clientes.delete(uid);
  }
  return n;
}

/** Mantém as ligações vivas (proxies fecham ligações paradas). */
function arrancarHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(() => {
    for (const [uid, set] of [...clientes]) {
      for (const res of [...set]) {
        try {
          res.write(': ping\n\n');
        } catch {
          set.delete(res);
        }
      }
      if (!set.size) clientes.delete(uid);
    }
  }, 25000);
  heartbeat.unref();
}

const total = () => [...clientes.values()].reduce((n, set) => n + set.size, 0);

module.exports = { add, remove, sendTo, broadcast, total };
