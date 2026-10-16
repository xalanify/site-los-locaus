// ============================================================
//  Ferramentas Windows (admin)
// -------------------------------------------------------------
//    GET  /api/ferramentas          -> catálogo + estado
//    POST /api/ferramentas/run      -> { id, arg? } corre um script
//    POST /api/ferramentas/stop     -> pára a execução em curso
//    GET  /api/ferramentas/status   -> logs a andar (polling)
//    GET  /api/ferramentas/historico-> registo de auditoria (admin)
// ============================================================
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const ferramentas = require('../ferramentas');

const router = express.Router();

/* Quem correu — fica no registo de auditoria do painel admin.
   Sempre uma string curta, mesmo quando só há a sessão antiga. */
function quem(req) {
  const a = req.auth || {};
  if (a.username) return String(a.username).slice(0, 40);
  if (a.uid) return 'uid ' + a.uid;
  return 'admin';
}

router.get('/', requireAdmin, (req, res) => {
  res.json({
    podeLocal: ferramentas.podeLocal(),
    ferramentas: ferramentas.listar(),
    estado: ferramentas.estadoPublico(),
  });
});

router.post('/run', requireAdmin, (req, res) => {
  try {
    const { id, arg } = req.body || {};
    const r = ferramentas.executar(String(id || ''), arg, quem(req));
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Erro /run:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno ao arrancar: ' + e.message });
  }
});

// Pára a ferramenta que está a correr (mate o processo ou a tarefa)
router.post('/stop', requireAdmin, (req, res) => {
  try {
    const r = ferramentas.parar();
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Erro /stop:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno ao parar: ' + e.message });
  }
});

// GET /api/ferramentas/instalados -> quais programas do catálogo já estão no PC
router.get('/instalados', requireAdmin, async (req, res) => {
  const r = await ferramentas.detectarInstalados();
  res.status(r.ok ? 200 : 400).json(r);
});

// GET /api/ferramentas/discos -> letras dos discos fixos (seletor do scan de vírus)
router.get('/discos', requireAdmin, (req, res) => {
  res.json(ferramentas.discosFixos());
});

// POST /api/ferramentas/desinstalar -> { ids: [...] } desinstala os selecionados (Revo)
router.post('/desinstalar', requireAdmin, (req, res) => {
  try {
    const { ids } = req.body || {};
    const r = ferramentas.desinstalar(Array.isArray(ids) ? ids : [], quem(req));
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Erro /desinstalar:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno: ' + e.message });
  }
});

router.get('/status', requireAdmin, (req, res) => {
  res.json(ferramentas.estadoPublico());
});

/* Registo de auditoria — vê-se SÓ no painel de admin.
   (A rota já exige requireAdmin; aqui ainda filtramos o limite.) */
router.get('/historico', requireAdmin, async (req, res) => {
  try {
    const linhas = await ferramentas.historico(req.query.limit || 50);
    res.json(linhas);
  } catch (e) {
    console.error('Erro /historico:', e);
    res.status(500).json({ error: 'Erro ao ler o histórico.' });
  }
});

module.exports = { ferramentasRouter: router };
