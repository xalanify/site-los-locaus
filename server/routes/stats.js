const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Obter estatísticas de visitantes
router.get('/visitors', (req, res) => {
  try {
    const db = getDb();

    // Visitantes online (últimos 5 minutos)
    const online = db.prepare(`
      SELECT COUNT(DISTINCT ip) as count FROM visitors 
      WHERE is_online = 1 AND visited_at > datetime('now', '-5 minutes')
    `).get();

    // Visitantes últimos 15 dias
    const last15Days = db.prepare(`
      SELECT COUNT(DISTINCT ip) as count FROM visitors 
      WHERE visited_at > datetime('now', '-15 days')
    `).get();

    // Visitantes últimos 30 dias
    const last30Days = db.prepare(`
      SELECT COUNT(DISTINCT ip) as count FROM visitors 
      WHERE visited_at > datetime('now', '-30 days')
    `).get();

    // Visitantes último ano
    const lastYear = db.prepare(`
      SELECT COUNT(DISTINCT ip) as count FROM visitors 
      WHERE visited_at > datetime('now', '-1 year')
    `).get();

    // Total de visitantes
    const total = db.prepare('SELECT COUNT(DISTINCT ip) as count FROM visitors').get();

    res.json({
      online: online.count,
      last15Days: last15Days.count,
      last30Days: last30Days.count,
      lastYear: lastYear.count,
      total: total.count
    });
  } catch (error) {
    console.error('Erro stats:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { statsRouter: router };
