const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Obter estatísticas de visitantes
// (uma única passagem ao Postgres em vez de cinco)
router.get('/visitors', async (req, res) => {
  try {
    const db = getDb();

    const row = await db
      .prepare(
        `SELECT
           COUNT(DISTINCT ip) FILTER (
             WHERE is_online = 1 AND visited_at > now() - interval '5 minutes'
           ) AS online,
           COUNT(DISTINCT ip) FILTER (
             WHERE visited_at > now() - interval '15 days'
           ) AS last15,
           COUNT(DISTINCT ip) FILTER (
             WHERE visited_at > now() - interval '30 days'
           ) AS last30,
           COUNT(DISTINCT ip) FILTER (
             WHERE visited_at > now() - interval '1 year'
           ) AS lastyear,
           COUNT(DISTINCT ip) AS total
         FROM visitors`
      )
      .get();

    res.json({
      online: row.online || 0,
      last15Days: row.last15 || 0,
      last30Days: row.last30 || 0,
      lastYear: row.lastyear || 0,
      total: row.total || 0,
    });
  } catch (error) {
    console.error('Erro stats:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { statsRouter: router };
