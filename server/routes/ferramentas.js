// ============================================================
//  Ferramentas Windows (membro)
// -------------------------------------------------------------
//    GET  /api/ferramentas          -> catálogo + estado
//    POST /api/ferramentas/run      -> { id, arg? } corre um script
//    POST /api/ferramentas/stop     -> pára a execução em curso
//    GET  /api/ferramentas/status   -> logs a andar (polling)
//    GET  /api/ferramentas/historico-> registo de auditoria (só admin)
//
//    Qualquer MEMBRO pode ver e correr as ferramentas (é um dos
//    pedidos do site) — mas o histórico de quem correu o quê fica
//    reservado ao admin, que é quem responde por isso.
// ============================================================
const express = require('express');
const { requireAdmin, requireUser } = require('../middleware/auth');
const ferramentas = require('../ferramentas');
const store = require('../usersStore');

const router = express.Router();

/* Ferramentas Windows — modo site (sem .exe obrigatório).
   Admin logado via Supabase pode ver o catálogo e correr via API.
   Execução real de scripts Windows ainda precisa do PC local
   (o Vercel é Linux — não roda wmic/revo diretamente). */
/* Quem correu — fica no registo de auditoria do painel admin.
   Sempre uma string curta, mesmo quando só há a sessão antiga. */
function quem(req) {
  const a = req.auth || {};
  if (a.username) return String(a.username).slice(0, 40);
  if (a.uid) return 'uid ' + a.uid;
  return 'admin';
}

/* A sessão é de admin? (a sessão de utilizador não traz a flag,
   por isso vemos a conta — a Otimização Xalana é só para admins). */
async function eAdmin(req) {
  try {
    const a = req.auth || {};
    if (a.admin) return true;
    if (!a.uid) return false;
    const u = await store.findById(a.uid);
    return Boolean(u && u.is_admin);
  } catch {
    return false;
  }
}

router.get('/', requireUser, async (req, res) => {
  const admin = await eAdmin(req);
  res.json({
    podeLocal: ferramentas.podeLocal(),
    ferramentas: ferramentas.listar(admin),
    admin,
    estado: ferramentas.estadoPublico(),
  });
});

router.post('/run', requireUser, async (req, res) => {
  try {
    const { id, arg, acoes, restauro } = req.body || {};
    const admin = await eAdmin(req);
    const r = ferramentas.executar(String(id || ''), arg, quem(req), admin, acoes, Boolean(restauro));
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Erro /run:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno ao arrancar: ' + e.message });
  }
});

// Pára a ferramenta que está a correr (mate o processo ou a tarefa)
router.post('/stop', requireUser, (req, res) => {
  try {
    const r = ferramentas.parar();
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Erro /stop:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno ao parar: ' + e.message });
  }
});

// GET /api/ferramentas/instalados -> quais programas do catálogo já estão no PC
router.get('/instalados', requireUser, async (req, res) => {
  const r = await ferramentas.detectarInstalados();
  res.status(r.ok ? 200 : 400).json(r);
});

// GET /api/ferramentas/discos -> letras dos discos fixos (seletor do scan de vírus)
router.get('/discos', requireUser, (req, res) => {
  res.json(ferramentas.discosFixos());
});

// POST /api/ferramentas/desinstalar -> { ids: [...] } desinstala os selecionados (Revo)
router.post('/desinstalar', requireUser, (req, res) => {
  try {
    const { ids } = req.body || {};
    const r = ferramentas.desinstalar(Array.isArray(ids) ? ids : [], quem(req));
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Erro /desinstalar:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno: ' + e.message });
  }
});

router.get('/status', requireUser, (req, res) => {
  res.json(ferramentas.estadoPublico());
});

// GET /api/ferramentas/tweaks -> estado real de algumas otimizações no Windows
router.get('/tweaks', requireAdmin, async (req, res) => {
  const r = await ferramentas.detectarTweaks();
  res.status(r.ok ? 200 : 400).json(r);
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
