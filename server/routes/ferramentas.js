// ============================================================
//  Ferramentas Windows (admin)
// -------------------------------------------------------------
//    GET  /api/ferramentas         -> catálogo + estado
//    POST /api/ferramentas/run     -> { id, arg? } corre um script
//    GET  /api/ferramentas/status  -> logs a andar (polling)
// ============================================================
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const ferramentas = require('../ferramentas');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
  res.json({
    podeLocal: ferramentas.podeLocal(),
    ferramentas: ferramentas.listar(),
    estado: ferramentas.estadoPublico(),
  });
});

router.post('/run', requireAdmin, (req, res) => {
  const { id, arg } = req.body || {};
  const r = ferramentas.executar(String(id || ''), arg);
  res.status(r.ok ? 200 : 400).json(r);
});

router.get('/status', requireAdmin, (req, res) => {
  res.json(ferramentas.estadoPublico());
});

module.exports = { ferramentasRouter: router };
