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
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pc = require('../agente-local');
const { requireUser, requireUserOrAdmin } = require('../middleware/auth');
const store = require('../usersStore');

const router = express.Router();

/* ---------------- sessões do agente (PC remoto via .bat) ---------------- */

const SESSAO_MS = 12 * 60 * 60 * 1000; // 12 h
const ONLINE_MS = 30 * 1000; // agente conta como ligado se falou nos últimos 30 s

let sessoes = new Map(); // token -> { uid, nome, criadoEm, vistoEm, expiraEm }

/* limpeza periódica */
setInterval(() => {
  const agora = Date.now();
  for (const [tok, s] of sessoes) {
    if (agora > new Date(s.expiraEm).getTime() || agora - new Date(s.vistoEm).getTime() > 24 * 60 * 60 * 1000) {
      sessoes.delete(tok);
    }
  }
}, 5 * 60 * 1000).unref();

function criarSessao(uid, nome) {
  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + SESSAO_MS).toISOString();
  const sessao = {
    uid: Number(uid),
    nome: String(nome || 'PC Windows').slice(0, 80),
    criadoEm: new Date().toISOString(),
    vistoEm: new Date().toISOString(),
    expiraEm: expira,
  };
  sessoes.set(token, sessao);
  return { token, expiraEm: expira };
}

function validarSessao(token) {
  if (!token) return null;
  const s = sessoes.get(token);
  if (!s) return null;
  if (Date.now() > new Date(s.expiraEm).getTime()) {
    sessoes.delete(token);
    return null;
  }
  s.vistoEm = new Date().toISOString();
  return s;
}

function tokenDoAgente(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function requireAgente(req, res, next) {
  const s = validarSessao(tokenDoAgente(req));
  if (!s) return res.status(401).json({ error: 'Sessão do agente inválida ou expirada.' });
  req.agente = s;
  next();
}

/* ---------------- geração do .bat ---------------- */

function baseDoSite(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/+$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function gerarBat(site, token) {
  return [
    '@echo off',
    'setlocal',
    'title Locaus PC',
    'net session >nul 2>&1',
    'if not "%errorlevel%"=="0" (',
    '  powershell -NoProfile -Command "Start-Process -FilePath \'%~f0\' -Verb RunAs"',
    '  exit /b',
    ')',
    `set "SITE=${site}"`,
    `set "TOKEN=${token}"`,
    'set "PS=%TEMP%\\locaus-agente.ps1"',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri (\'%SITE%/api/pc/agente-ps1\') -UseBasicParsing -OutFile (\'%PS%\') -ErrorAction Stop } catch { exit 1 }"',
    'if not exist "%PS%" (',
    '  echo.',
    '  echo Falhou o download do agente. Verifica a ligacao a internet.',
    '  pause',
    '  exit /b 1',
    ')',
    'echo Agente a arrancar em segundo plano (a janela fecha em instantes).',
    'start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PS%" -Site "%SITE%" -Token "%TOKEN%"',
    'timeout /t 2 >nul',
    'exit /b',
    '',
  ].join('\r\n');
}

/* ---------------- rotas públicas (utilizador) ---------------- */

router.get('/estado', requireUserOrAdmin, (req, res) => {
  const st = pc.estado();
  /* se o PC está ligado via agente remoto, mostra isso */
  const uid = Number(req.auth.uid || 0);
  if (uid) {
    for (const [tok, s] of sessoes) {
      if (s.uid === uid) {
        const online = Date.now() - new Date(s.vistoEm).getTime() < ONLINE_MS;
        if (online) {
          st.online = true;
          st.agenteRemoto = true;
          st.nomePc = s.nome;
        }
      }
    }
  }
  res.json(st);
});

/* gera o .bat personalizado com o token do user */
router.get('/ligar', requireUserOrAdmin, (req, res) => {
  try {
    const uid = Number(req.auth.uid || 0);
    const nome = String(req.query.nome || 'PC Windows').slice(0, 80);
    const { token, expiraEm } = criarSessao(uid, nome);
    const site = baseDoSite(req);
    const bat = gerarBat(site, token);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="LOCAUS-PC.bat"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(bat, 'ascii'));
  } catch (e) {
    console.error('PC /ligar:', e.message);
    res.status(500).type('text/plain').send('Erro ao gerar o ficheiro.');
  }
});

/* serve o agente PowerShell (o .bat descarrega daqui) */
router.get('/agente-ps1', (req, res) => {
  try {
    const f = path.join(__dirname, '..', 'pc-agente.ps1');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.error('PC /agente-ps1:', e.message);
    res.status(500).type('text/plain').send('Erro ao ler o agente.');
  }
});

/* ---------------- rotas do agente (PC remoto) ---------------- */

router.post('/heartbeat', requireAgente, (req, res) => {
  res.json({ ok: true, agora: new Date().toISOString() });
});

router.get('/proximo', requireAgente, (req, res) => {
  const job = pc.proximo(req.agente.uid);
  res.json(job);
});

router.post('/trabalhos/:id/logs', requireAgente, (req, res) => {
  const r = pc.anexarLogs(Number(req.params.id), req.agente.uid, req.body.logs);
  res.json(r);
});

router.get('/trabalhos/:id/controlo', requireAgente, (req, res) => {
  const r = pc.controlo(Number(req.params.id), req.agente.uid);
  res.json(r);
});

router.post('/trabalhos/:id/fim', requireAgente, (req, res) => {
  const b = req.body || {};
  const r = pc.finalizar(Number(req.params.id), req.agente.uid, {
    status: b.status,
    codigo: b.codigo,
    erro: b.erro,
    logs: b.logs,
    saida: b.saida,
    resultado: b.resultado,
  });
  res.json(r);
});

/* ---------------- rotas locais (servidor no PC) ---------------- */

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
