const express = require('express');
const { getLiveSnapshot } = require('../live');

const router = express.Router();

// Quem (conta admin) está em live agora — deteção automática.
router.get('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ live: await getLiveSnapshot() });
  } catch (error) {
    console.error('Erro live snapshot:', error.message);
    res.status(500).json({ error: 'Não foi possível verificar as lives.' });
  }
});

module.exports = { liveRouter: router };
