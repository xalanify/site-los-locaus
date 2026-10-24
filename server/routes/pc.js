/* ============================================================
   API /api/pc — o PC "liga" sem .bat nem .exe
   ------------------------------------------------------------
   O servidor local executa os trabalhos no próprio PC. O
   browser só fala com estas rotas:
     GET  /api/pc/estado           -> ligado? em curso?
     POST /api/pc/trabalho         -> enfileira (tool/desinstalar/discos/instalados/specs/saude)
     GET  /api/pc/trabalhos/:id    -> estado + logs + resultado
     POST /api/pc/trabalhos/:id/cancelar
   ============================================================ */
const express = require('express');
const pc = require('../agente-local');
const { requireUser, requireUserOrAdmin } = require('../middleware/auth');
const store = require('../usersStore');

const router = express.Router();

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

router.get('/estado', requireUserOrAdmin, (req, res) => {
  res.json(pc.estado());
});

router.post('/trabalho', requireUserOrAdmin, async (req, res) => {
  try {
    const admin = await eAdmin(req);
    const r = pc.criarJob(req.body || {}, admin);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('PC /trabalho:', e.message);
    res.status(500).json({ ok: false, erro: 'Não deu para enviar o trabalho para o PC.' });
  }
});

router.get('/trabalhos/:id', requireUserOrAdmin, (req, res) => {
  const j = pc.obter(req.params.id);
  if (!j) return res.status(404).json({ error: 'Trabalho não encontrado.' });
  res.json({ ok: true, job: j });
});

router.post('/trabalhos/:id/cancelar', requireUserOrAdmin, (req, res) => {
  res.json(pc.cancelar(req.params.id));
});

module.exports = { pcRouter: router };
