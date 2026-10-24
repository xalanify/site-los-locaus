/* ============================================================
   API do agente local
   ------------------------------------------------------------
   Utilizador (JWT normal):
     POST   /api/agente/sessao          -> cria sessão + token
     GET    /api/agente/estado          -> PC ligado? trabalho ativo?
     GET    /api/agente/baixar?token=   -> LOCAUS-PC.bat personalizado
     POST   /api/agente/jobs            -> enfileira ferramenta/specs/saúde
     GET    /api/agente/jobs/:id        -> estado + logs
     POST   /api/agente/jobs/:id/cancelar
     DELETE /api/agente/sessao          -> desliga o PC

   Agente (token da sessão):
     GET    /api/agente/proximo             -> próximo trabalho
     POST   /api/agente/jobs/:id/logs       -> logs a andar
     GET    /api/agente/jobs/:id/controlo   -> cancelar?
     POST   /api/agente/jobs/:id/fim        -> resultado final
   ============================================================ */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireUser, requireUserOrAdmin } = require('../middleware/auth');
const agente = require('../agente');
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

function tokenDoAgente(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function requireAgente(req, res, next) {
  try {
    const s = await agente.autenticar(tokenDoAgente(req));
    if (!s) return res.status(401).json({ error: 'Sessão do agente inválida ou expirada.' });
    req.agente = s;
    next();
  } catch (e) {
    console.error('Agente auth:', e.message);
    res.status(500).json({ error: 'Erro a validar o agente.' });
  }
}

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
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri (\'%SITE%/api/agente/script\') -UseBasicParsing -OutFile (\'%PS%\') -ErrorAction Stop } catch { exit 1 }"',
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

/* ---------------- utilizador ---------------- */

// O LOCAUS-PC.bat descarrega o agente daqui (fica dentro da função
// da Vercel; um ficheiro em client/public podia ser apanhado pelo
// rewrite do SPA).
router.get('/script', (req, res) => {
  try {
    const f = path.join(__dirname, '..', 'agente.ps1');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.error('Agente /script:', e.message);
    res.status(500).type('text/plain').send('Erro ao ler o agente.');
  }
});

router.post('/sessao', requireUserOrAdmin, async (req, res) => {
  try {
    const uid = Number(req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem conta.' });
    const b = req.body || {};
    const s = await agente.criarSessao(uid, {
      nome: b.nome || 'PC Windows',
      versao: b.versao,
      plataforma: b.plataforma,
    });
    res.json({ ok: true, ...s });
  } catch (e) {
    console.error('Agente /sessao:', e);
    res.status(500).json({ error: 'Não deu para criar a sessão do PC.' });
  }
});

router.get('/ping', (req, res) => {
  res.json({ ok: true, online: true, msg: 'PC conectado via .bat' })
})

router.get('/estado', requireUserOrAdmin, async (req, res) => {
  try {
    res.json(await agente.estado(Number(req.auth.uid)));
  } catch (e) {
    console.error('Agente /estado:', e);
    res.status(500).json({ ok: false, online: false, erro: 'Erro ao ler o estado do PC.' });
  }
});

router.get('/baixar', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const s = await agente.validarToken(token);
    if (!s) return res.status(401).type('text/plain').send('Sessao invalida ou expirada. Cria outra no site.');
    const bat = gerarBat(baseDoSite(req), token);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="LOCAUS-PC.bat"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(bat, 'ascii'));
  } catch (e) {
    console.error('Agente /baixar:', e);
    res.status(500).type('text/plain').send('Erro ao gerar o ficheiro.');
  }
});

// Mini-app .exe — serve o ficheiro diretamente (sem .bat intermediário).
// O user clica no botão, descarrega o LOCAUS-PC.exe, abre-o e clica
// "Ligar ao site" na janela da app.
router.get('/baixar-exe', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const s = await agente.validarToken(token);
    if (!s) return res.status(401).type('text/plain').send('Sessao invalida ou expirada. Cria outra no site.');
    const exe = path.join(__dirname, '..', 'LOCAUS-PC.exe');
    if (!fs.existsSync(exe)) return res.status(404).type('text/plain').send('O mini-app ainda nao esta disponivel.');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="LOCAUS-PC.exe"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(fs.readFileSync(exe));
  } catch (e) {
    console.error('Agente /baixar-exe:', e);
    res.status(500).type('text/plain').send('Erro ao descarregar o mini-app.');
  }
});

// O .exe em si (o atalho acima descarrega-o daqui).
router.get('/exe', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const s = await agente.validarToken(token);
    if (!s) return res.status(401).type('text/plain').send('Sessao invalida ou expirada.');
    const exe = path.join(__dirname, '..', 'LOCAUS-PC.exe');
    if (!fs.existsSync(exe)) return res.status(404).type('text/plain').send('O mini-app ainda nao esta disponivel.');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="LOCAUS-PC.exe"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(fs.readFileSync(exe));
  } catch (e) {
    console.error('Agente /exe:', e);
    res.status(500).type('text/plain').send('Erro ao descarregar o mini-app.');
  }
});

/* Comando one-shot (sem .bat): o PC cria a sessão, corre a ferramenta
   e devolve os logs — tudo num único comando PowerShell que o
   utilizador copia e cola. Nada fica instalado. */
router.get('/comando', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth.uid);
    const b = req.body || {};
    const admin = await eAdmin(req);
    const p = ferramentas.preparar(String(req.query.id || ''), req.query.arg, admin, req.query.acoes ? JSON.parse(req.query.acoes) : undefined);
    if (!p.ok) return res.status(400).json({ ok: false, erro: p.erro });
    const s = await agente.criarSessao(uid, { nome: 'PC Windows' });
    const site = baseDoSite(req);
    const payload = JSON.stringify({ tipo: 'tool', id: p.id, arg: p.arg, acoes: req.query.acoes ? JSON.parse(req.query.acoes) : undefined });
    const ps = [
      `$ErrorActionPreference='Stop'`,
      `$s=Invoke-RestMethod -Uri '${site}/api/agente/sessao' -Method Post -Headers @{Authorization="Bearer ${req.headers.authorization}"} -ContentType 'application/json' -Body '${JSON.stringify({ nome: 'PC Windows' })}'`,
      `$t=$s.token`,
      `$job=Invoke-RestMethod -Uri '${site}/api/agente/jobs' -Method Post -Headers @{Authorization="Bearer ${req.headers.authorization}"} -ContentType 'application/json' -Body '${payload}'`,
      `$jid=$job.job.id`,
      `Write-Output 'A correr: ${p.nome}'`,
      `for($i=0;$i -lt 60;$i++){ Start-Sleep -Seconds 2; $j=Invoke-RestMethod -Uri '${site}/api/agente/jobs/$jid' -Headers @{Authorization="Bearer ${req.headers.authorization}"}; if($j.job.status -notin @('pendente','a_correr')){ break } }`,
      `if($j.job.logs){ $j.job.logs | ForEach-Object { Write-Output $_.l } }`,
      `if($j.job.status -eq 'concluido'){ Write-Output '=== CONCLUIDO ===' } else { Write-Output ('=== ' + $j.job.status + ': ' + $j.job.erro) }`,
    ].join('; ');
    const comando = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '`"')}"`;
    res.json({ ok: true, comando, nome: p.nome, token: s.token });
  } catch (e) {
    console.error('Agente /comando:', e);
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.post('/jobs', requireUser, async (req, res) => {
  try {
    const uid = Number(req.auth.uid);
    const admin = await eAdmin(req);
    const r = await agente.criarJob(uid, req.body || {}, admin);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    console.error('Agente /jobs:', e);
    res.status(500).json({ ok: false, erro: 'Não deu para enviar o trabalho para o PC.' });
  }
});

router.get('/jobs/:id', requireUser, async (req, res) => {
  try {
    const j = await agente.obterJob(Number(req.auth.uid), Number(req.params.id));
    if (!j) return res.status(404).json({ error: 'Trabalho não encontrado.' });
    res.json({
      ok: true,
      job: {
        id: Number(j.id),
        tipo: j.tipo,
        ferramenta_id: j.ferramenta_id,
        nome: j.nome,
        status: j.status,
        logs: j.logs,
        resultado: j.resultado,
        erro: j.erro,
        codigo: j.codigo,
        criado_em: j.criado_em,
        inicio_em: j.inicio_em,
        fim_em: j.fim_em,
      },
    });
  } catch (e) {
    console.error('Agente /jobs/:id:', e);
    res.status(500).json({ error: 'Erro ao ler o trabalho.' });
  }
});

router.post('/jobs/:id/cancelar', requireUser, async (req, res) => {
  try {
    res.json(await agente.cancelarJob(Number(req.auth.uid), Number(req.params.id)));
  } catch (e) {
    console.error('Agente /cancelar:', e);
    res.status(500).json({ ok: false, erro: 'Não deu para cancelar.' });
  }
});

router.delete('/sessao', requireUser, async (req, res) => {
  try {
    res.json(await agente.encerrarSessao(Number(req.auth.uid)));
  } catch (e) {
    console.error('Agente /sessao (delete):', e);
    res.status(500).json({ ok: false, erro: 'Não deu para desligar o PC.' });
  }
});

/* ---------------- agente ---------------- */

router.get('/proximo', requireAgente, async (req, res) => {
  try {
    res.json(await agente.proximo(req.agente));
  } catch (e) {
    console.error('Agente /proximo:', e);
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.post('/jobs/:id/logs', requireAgente, async (req, res) => {
  try {
    const b = req.body || {};
    res.json(await agente.anexarLogs(Number(req.params.id), req.agente.id, b.logs));
  } catch (e) {
    console.error('Agente /logs:', e);
    res.status(500).json({ ok: false });
  }
});

router.get('/jobs/:id/controlo', requireAgente, async (req, res) => {
  try {
    res.json(await agente.controlo(Number(req.params.id), req.agente.id));
  } catch (e) {
    res.status(500).json({ ok: false, cancelar: false, encerrar: false });
  }
});

router.post('/jobs/:id/fim', requireAgente, async (req, res) => {
  try {
    const b = req.body || {};
    res.json(
      await agente.finalizar(Number(req.params.id), req.agente.id, {
        status: b.status,
        codigo: b.codigo,
        erro: b.erro,
        logs: b.logs,
        saida: b.saida,
        resultado: b.resultado,
      }),
    );
  } catch (e) {
    console.error('Agente /fim:', e);
    res.status(500).json({ ok: false, erro: e.message });
  }
});

router.post('/heartbeat', requireAgente, (req, res) => {
  res.json({ ok: true, agora: new Date().toISOString() });
});

module.exports = { agenteRouter: router };
