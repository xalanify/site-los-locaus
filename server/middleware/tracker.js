const { getDb } = require('../database');

/* Fila: os registos correm um de cada vez — sem ela, pedidos
   simultâneos fazem INSERT + UPDATEs que se cruzam e o Postgres
   aborta com "deadlock detected" (visitas perdidas + erros no log). */
let fila = Promise.resolve();
let ultimaLimpeza = 0;

/* ------------------------------------------------------------------
   Cada visitante só é registado de 4 em 4 minutos.

   Antes: cada pedido a /api fazia 2–3 escritas na base de dados.
   Com o polling do site (30–60 s por separador aberto) isso eram
   milhares de escritas por hora — o maior gasto de CPU na Vercel.

   Agora: 1 escrita por IP a cada 4 min. O "online" continua certo
   porque a limpeza marca offline quem não visita há mais de 5 min.
   ------------------------------------------------------------------ */
const JANELA_MS = 4 * 60 * 1000;
const ultimoPorIp = new Map();

function limparMapa(agora) {
  if (ultimoPorIp.size < 4000) return;
  for (const [ip, t] of ultimoPorIp) {
    if (agora - t > JANELA_MS) ultimoPorIp.delete(ip);
  }
}

/** Não atrasa o pedido: corre em paralelo e só regista erros. */
function trackVisitor(req, res, next) {
  // O agente local faz polling de 2 em 2 segundos: não conta como visita.
  if (String(req.originalUrl || '').startsWith('/api/agente')) return next();
  if (req.method !== 'GET' && req.method !== 'POST') return next();

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const agora = Date.now();
  const ultimo = ultimoPorIp.get(ip);
  if (ultimo && agora - ultimo < JANELA_MS) return next();

  ultimoPorIp.set(ip, agora);
  limparMapa(agora);

  const userAgent = req.headers['user-agent'] || '';
  const db = getDb();

  fila = fila
    .then(async () => {
      // Registar visita
      await db.prepare('INSERT INTO visitors (ip, user_agent) VALUES (?, ?)').run(ip, userAgent);

      // Limpeza pesada no máximo 1x por minuto (evita locks/deadlocks
      // quando há muitos pedidos em paralelo ou várias instâncias).
      if (Date.now() - ultimaLimpeza > 60_000) {
        ultimaLimpeza = Date.now();
        await db
          .prepare(
            `UPDATE visitors SET is_online = 0
             WHERE is_online = 1 AND visited_at < now() - interval '5 minutes'`,
          )
          .run();
      }

      // Marcar este visitante como online (o registado há instantes)
      await db
        .prepare(
          `UPDATE visitors SET is_online = 1
           WHERE id = (SELECT MAX(id) FROM visitors WHERE ip = ?)`,
        )
        .run(ip);
    })
    .catch((err) => console.error('Erro no registo de visita:', err.message));

  next();
}

module.exports = { trackVisitor };
