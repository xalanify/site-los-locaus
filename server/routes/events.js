// ============================================================
//  GET /api/events/stream?token=...
//
//  O EventSource do browser não consegue mandar cabeçalhos, por
//  isso o token vai na query. É o mesmo JWT do site: se não for
//  válido, a ligação é recusada.
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const sse = require('../sse');

const router = express.Router();

router.get('/stream', (req, res) => {
  const token = String(req.query.token || '');
  let uid = null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.uid) uid = Number(payload.uid);
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
  if (!uid) return res.status(401).json({ error: 'Sessão inválida' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  // se o browser cair, tenta de novo dentro de 3 s
  res.write('retry: 3000\n\n');
  sse.add(uid, res);
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, uid })}\n\n`);

  const fechar = () => {
    sse.remove(uid, res);
    try {
      res.end();
    } catch {
      /* já estava fechado */
    }
  };
  req.on('close', fechar);
  req.on('aborted', fechar);
});

// diagnóstico rápido (só para o admin local)
router.get('/stats', (req, res) => {
  res.json({ ligacoes: sse.total() });
});

module.exports = { eventsRouter: router };
