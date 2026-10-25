const { getDb } = require('../database');

/* Fila: os registos correm um de cada vez — sem ela, pedidos
   simultâneos fazem INSERT + UPDATEs que se cruzam e o Postgres
   aborta com "deadlock detected" (visitas perdidas + erros no log). */
let fila = Promise.resolve();
let ultimaLimpeza = 0;

/** Não atrasa o pedido: corre em paralelo e só regista erros. */
function trackVisitor(req, res, next) {
  // O agente local faz polling de 2 em 2 segundos: não conta como visita.
  if (String(req.originalUrl || '').startsWith('/api/agente')) return next();
  const db = getDb();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

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
