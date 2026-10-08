const { getDb } = require('../database');

function trackVisitor(req, res, next) {
  const db = getDb();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  // Registar visita
  db.prepare('INSERT INTO visitors (ip, user_agent) VALUES (?, ?)').run(ip, userAgent);

  // Marcar visitantes como offline se não visitaram nos últimos 5 minutos
  db.prepare(`
    UPDATE visitors SET is_online = 0 
    WHERE visited_at < datetime('now', '-5 minutes')
  `).run();

  // Marcar este visitante como online
  db.prepare(`
    UPDATE visitors SET is_online = 1 
    WHERE id = (SELECT MAX(id) FROM visitors WHERE ip = ?)
  `).run(ip);

  next();
}

module.exports = { trackVisitor };
