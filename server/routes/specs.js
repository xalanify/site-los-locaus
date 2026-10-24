// ============================================================
//  Specs dos PCs dos membros
//  ------------------------------------------------------------
//  O browser recolhe (SO, browser, núcleos da CPU, RAM, GPU via
//  WebGL, ecrã e quota de armazenamento) e envia para aqui a
//  cada entrada. A PRIMEIRA leitura fica guardada como baseline
//  — serve para comparar e avisar quando o PC muda ou quando os
//  valores se desviam (overclock, troca de GPU, etc.).
//
//    POST /me          -> guarda/atualiza as minhas specs
//    GET  /            -> lista de todos os membros (com comparação)
//    GET  /me          -> as minhas + detalhe da comparação
// ============================================================
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { requireUser, JWT_SECRET } = require('../middleware/auth');
const pcs = require('../pcs');
const agente = require('../agente');

const router = express.Router();

const SCRIPT_PS1 = path.join(__dirname, '..', 'scripts', 'lerpc.ps1');

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('specs:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

/* Quando o site está na nuvem, a leitura é feita pelo agente local. */
async function lerPeloAgente(uid, tipo, timeoutMs) {
  const st = await agente.estado(uid);
  if (!st.online) {
    return {
      ok: false,
      offline: true,
      erro:
        'O PC não está ligado ao site. Abre a página Ferramentas Windows e liga o PC com o LOCAUS-PC.bat.',
    };
  }
  const job = await agente.criarJob(uid, { tipo }, false);
  if (!job.ok) return { ok: false, erro: job.erro || 'Não deu para pedir a leitura ao PC.' };
  const r = await agente.esperarJob(job.job.id, timeoutMs);
  if (!r.ok) return { ok: false, erro: r.erro || 'O PC não respondeu.' };
  const dados = r.resultado && r.resultado.dados;
  if (!dados) return { ok: false, erro: 'O PC não devolveu os dados.' };
  return { ok: true, dados, passos: r.passos || [] };
}

/* Grava uma leitura completa e devolve o mesmo formato da rota local. */
async function guardarLeitura(uid, dados, passos) {
  const detalhes = { ...dados, avaliacao: pcs.analisar(dados) };
  const guardado = await salvarDeep(uid, pcs.camposBasicos(dados), detalhes);
  return { ok: true, passos: passos || [], ...guardado };
}

const clean = (v, max = 120) => (v == null ? null : String(v).trim().slice(0, max) || null);
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

/* Comparação atual vs baseline — devolve os campos alterados e o
   desvio percentual do score da CPU (o que revela overclock). */
function comparar(cur, base) {
  if (!base) return { mudou: false, campos: [], scoreDelta: null };
  const campos = [];
  const chaves = ['os', 'browser', 'cpu_cores', 'ram_gb', 'gpu', 'screen', 'storage_gb'];
  for (const k of chaves) {
    const a = cur[k];
    const b = base[k];
    if ((a || null) !== (b || null)) campos.push({ campo: k, antes: b, agora: a });
  }
  // sem score nos dois lados não há desvio para mostrar (a interface
  // trata null como "sem baseline" e mostra "—")
  const scoreDelta =
    cur.cpu_score != null && base.cpu_score != null
      ? Math.round(((cur.cpu_score - base.cpu_score) / base.cpu_score) * 100)
      : null;
  return {
    mudou: campos.length > 0 || (scoreDelta != null && Math.abs(scoreDelta) >= 15),
    campos,
    scoreDelta,
  };
}

// POST /api/users/specs/me — guardar as minhas specs
router.post(
  '/me',
  requireUser,
  safe(async (req, res) => {
    const uid = Number(req.auth.uid);
    const b = req.body || {};

    // só os campos que vieram no pedido contam (um teste de CPU
    // isolado, por exemplo, não apaga as specs já conhecidas)
    const spec = {};
    if ('os' in b) spec.os = clean(b.os);
    if ('browser' in b) spec.browser = clean(b.browser);
    if ('cpu_cores' in b) spec.cpu_cores = num(b.cpu_cores);
    if ('ram_gb' in b) spec.ram_gb = num(b.ram_gb);
    if ('gpu' in b) spec.gpu = clean(b.gpu, 200);
    if ('screen' in b) spec.screen = clean(b.screen);
    if ('storage_gb' in b) spec.storage_gb = num(b.storage_gb);
    if ('cpu_score' in b) spec.cpu_score = num(b.cpu_score);
    if (!Object.keys(spec).length) {
      return res.status(400).json({ error: 'Sem specs para guardar.' });
    }

    /* O Windows conhecido ao completo ("Windows 10 IoT Enterprise
       LTSC", da leitura PowerShell) nunca cai para a versão genérica
       do browser ("Windows 10/11"/"Windows 10") — fica sempre a
       descrição mais específica. */
    const pontuaSO = (v) => {
      if (!v) return -1;
      const s = String(v).toLowerCase();
      let n = Math.min(s.length, 60);
      if (/enterprise|professional|\bpro\b|education|ultimate|embedded/.test(s)) n += 40;
      if (/\bltsc\b/.test(s)) n += 25;
      if (/\biot\b/.test(s)) n += 15;
      if (/\b(server|home)\b/.test(s)) n += 20;
      if (/10\/11/.test(s)) n -= 45;           // "Windows 10/11" = nada decidido
      if (/^windows (10|11|nt [\d.]+)$/.test(s)) n -= 45; // genérico também
      return n;
    };

    const db = getDb();
    const cur = await db.prepare('SELECT * FROM user_specs WHERE user_id = ?').get(uid);

    if (cur && 'os' in spec) {
      spec.os = pontuaSO(spec.os) > pontuaSO(cur.os) ? spec.os : cur.os;
    }

    if (!cur) {
      // primeira leitura -> baseline é ela própria
      const completo = {
        os: null,
        browser: null,
        cpu_cores: null,
        ram_gb: null,
        gpu: null,
        screen: null,
        storage_gb: null,
        cpu_score: null,
        ...spec,
      };
      await db
        .prepare(
          `INSERT INTO user_specs (user_id, os, browser, cpu_cores, ram_gb, gpu, screen, storage_gb, cpu_score, baseline, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, now())`,
        )
        .run(
          uid,
          completo.os,
          completo.browser,
          completo.cpu_cores,
          completo.ram_gb,
          completo.gpu,
          completo.screen,
          completo.storage_gb,
          completo.cpu_score,
          JSON.stringify(completo),
        );
      return res.json({ ok: true, primeiraLeitura: true, spec: completo });
    }

    // atualiza só o que veio no pedido (o score da CPU vem do teste)
    const next = { ...pick(cur), ...spec };
    await db
      .prepare(
        `UPDATE user_specs SET os = ?, browser = ?, cpu_cores = ?, ram_gb = ?, gpu = ?,
                screen = ?, storage_gb = ?, cpu_score = ?, updated_at = now()
         WHERE user_id = ?`,
      )
      .run(
        next.os,
        next.browser,
        next.cpu_cores,
        next.ram_gb,
        next.gpu,
        next.screen,
        next.storage_gb,
        next.cpu_score,
        uid,
      );

    // Se a baseline ainda não tinha score, o primeiro conhecido passa
    // a ser ele — é a partir daí que se mede a diferença.
    let baseNova = json(cur.baseline);
    if (baseNova && baseNova.cpu_score == null && next.cpu_score != null) {
      baseNova = { ...baseNova, cpu_score: next.cpu_score };
      await db
        .prepare('UPDATE user_specs SET baseline = ?::jsonb WHERE user_id = ?')
        .run(JSON.stringify(baseNova), uid);
    }

    res.json({ ok: true, primeiraLeitura: false, spec: next, comparacao: comparar(next, baseNova) });
  }),
);

// GET /api/users/specs/me — as minhas specs com comparação
router.get(
  '/me',
  requireUser,
  safe(async (req, res) => {
    const row = await getDb()
      .prepare('SELECT * FROM user_specs WHERE user_id = ?')
      .get(Number(req.auth.uid));
    if (!row) return res.json({ tem: false });
    const spec = pick(row);
    res.json({ tem: true, spec, comparacao: comparar(spec, json(row.baseline)) });
  }),
);

// GET /api/users/specs — dashboard dos PCs do grupo (membro vê os outros)
router.get(
  '/',
  requireUser,
  safe(async (req, res) => {
    const rows = await getDb()
      .prepare(
        `SELECT s.*, u.username, p.avatar_url
         FROM user_specs s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN user_profiles p ON p.user_id = s.user_id
         WHERE u.password_hash NOT LIKE '!%'
           /* contas de teste nossas: não são máquinas do grupo */
           AND lower(u.username) <> 'teste'
         ORDER BY u.username`,
      )
      .all();
    res.json({
      specs: rows.map((r) => {
        const spec = pick(r);
        const base = json(r.baseline);
        return {
          user_id: Number(r.user_id),
          username: r.username,
          avatar_url: r.avatar_url || null,
          ...spec,
          baseline: base,
          comparacao: comparar(spec, base),
          updated_at: r.updated_at,
        };
      }),
    });
  }),
);

/* ============================================================
   Leitura REAL do PC (PowerShell) — relógios, timings, discos
   ------------------------------------------------------------
   O browser não chega a isto. O site corre o script no PC onde o
   servidor está (Windows) e mostra os passos; para outro PC
   existe o script para copiar (irm ... | iex).
   ============================================================ */

/* token curto só para o script enviar as specs (24 h) */
function tokenDoScript(uid) {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '24h' });
}

/* o `irm ... | iex` não manda cabeçalhos — aceitamos o token na query */
function tokenNaQuery(req, res, next) {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${String(req.query.token).slice(0, 400)}`;
  }
  next();
}

// GET /api/users/specs/script — o mesmo script, já com URL + token
router.get(
  '/script',
  tokenNaQuery,
  requireUser,
  safe(async (req, res) => {
    let txt;
    try {
      // o ficheiro leva BOM (o PowerShell 5.1 precisa para os acentos),
      // mas no texto servido ele lixa o `param` — os acentos já vêm bem do HTTP
      txt = fs.readFileSync(SCRIPT_PS1, 'utf8').replace(/^\uFEFF/, '');
    } catch {
      return res.status(500).json({ error: 'Script em falta no servidor.' });
    }
    const base = `${req.protocol}://${req.get('host')}`;
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(401).json({ error: 'Sessão sem conta de utilizador.' });
    const token = tokenDoScript(uid);

    // forma de comando: uma linha só, para colar no PowerShell de qualquer PC
    if (req.query.como === 'comando') {
      const url = `${base}/api/users/specs/script?token=${encodeURIComponent(token)}`;
      return res
        .type('text/plain; charset=utf-8')
        .send(
          `powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr '${url}' -UseBasicParsing).Content"`,
        );
    }

    const cabecalho = `param([string]$Url = '${base}/api/users/specs/deep', [string]$Token = '${token}')\n`;
    const rodape = `
# Envia para o site (o mesmo que o site faz ao clicar no botão)
$___json = $out | ConvertTo-Json -Depth 6 -Compress
if ($Token) {
  Passo 'A enviar para o site...'
  try {
    Invoke-RestMethod -Uri $Url -Method Post -Headers @{ Authorization = "Bearer $Token" } -ContentType 'application/json' -Body $___json | Out-Null
    Passo 'Envio feito. Vai ver o resultado na pagina PCs / Specs.'
  } catch {
    Write-Output "[passo] Falhou o envio: $($_.Exception.Message)"
  }
}
`;
    res.type('text/plain; charset=utf-8').send(cabecalho + txt + rodape);
  }),
);

// POST /api/users/specs/bench — guarda o bench da CPU (ST + MT)
// que o browser mediu. O número passa a ser o cpu_score: é a
// medida que serve para comparar membros entre si.
router.post(
  '/bench',
  requireUser,
  safe(async (req, res) => {
    const uid = Number(req.auth.uid);
    const b = req.body || {};
    const st = num(b.st);
    const mt = num(b.mt);
    if (!st || !mt || st <= 0 || mt <= 0 || st > 999999 || mt > 999999) {
      return res.status(400).json({ error: 'Bench incompleto ou impossível.' });
    }

    const db = getDb();
    const cur = await db.prepare('SELECT * FROM user_specs WHERE user_id = ?').get(uid);
    const detalhes = (cur && json(cur.details)) || {};
    detalhes.bench = {
      st,
      mt,
      nucleos: num(b.nucleos) || null,
      em: new Date().toISOString(),
    };

    if (!cur) {
      await db
        .prepare(
          `INSERT INTO user_specs (user_id, cpu_score, details, baseline, updated_at)
           VALUES (?, ?, ?::jsonb, ?::jsonb, now())`,
        )
        .run(uid, mt, JSON.stringify(detalhes), JSON.stringify({ cpu_score: mt }));
      return res.json({ ok: true, bench: detalhes.bench, primeiraLeitura: true });
    }

    await db
      .prepare(
        `UPDATE user_specs SET cpu_score = ?, details = ?::jsonb, updated_at = now()
         WHERE user_id = ?`,
      )
      .run(mt, JSON.stringify(detalhes), uid);

    res.json({ ok: true, bench: detalhes.bench });
  }),
);

// GET /api/users/specs/status — como vai a leitura local (para mostrar os passos)
router.get(
  '/status',
  requireUser,
  safe(async (req, res) => {
    if (pcs.podeLocal()) return res.json(pcs.estadoPublico());
    const uid = Number(req.auth.uid);
    const st = await agente.estado(uid);
    const job = st.job && st.job.tipo === 'specs' ? st.job : null;
    const passos = (Array.isArray(job?.logs) ? job.logs : [])
      .map((x) => String((x && x.l) || ''))
      .filter((x) => /^\[passo\]/i.test(x))
      .map((x) => x.replace(/^\[passo\]\s*/i, ''));
    res.json({
      podeLocal: false,
      agenteOnline: Boolean(st.online),
      aCorrer: Boolean(job),
      passos,
    });
  }),
);

// GET /api/users/specs/health — saúde do PC (discos, temps, boots)
router.get(
  '/health',
  requireUser,
  safe(async (req, res) => {
    const uid = Number(req.auth.uid);
    if (!pcs.podeLocal()) {
      const r = await lerPeloAgente(uid, 'saude', 45000);
      if (!r.ok) return res.status(r.offline ? 501 : 500).json({ error: r.erro });
      return res.json({ ok: true, dados: r.dados, cache: false });
    }
    const saude = require('../saude');
    const r = await saude.correr();
    if (!r.ok) return res.status(500).json({ error: r.erro || 'Não deu para ler a saúde do PC.' });
    res.json({ ok: true, dados: r.dados, cache: Boolean(r.cache) });
  }),
);

// POST /api/users/specs/deep — corre o PowerShell no PC do servidor
// (na nuvem: enfileira no agente e devolve 202; o browser acompanha o
// trabalho e chama /deep/fim quando ele acabar — sem funções de 60 s)
router.post(
  '/deep',
  requireUser,
  safe(async (req, res) => {
    const uid = Number(req.auth.uid);
    if (!pcs.podeLocal()) {
      const st = await agente.estado(uid);
      if (!st.online) {
        return res.status(501).json({
          error:
            'O PC não está ligado ao site. Abre a página Ferramentas Windows e liga o PC com o LOCAUS-PC.bat.',
        });
      }
      const job = await agente.criarJob(uid, { tipo: 'specs' }, false);
      if (!job.ok) {
        return res.status(400).json({ error: job.erro || 'Não deu para pedir a leitura ao PC.' });
      }
      return res.status(202).json({ ok: true, async: true, jobId: job.job.id, passos: [] });
    }
    const r = await pcs.correr();
    if (!r.ok) return res.status(500).json({ error: r.erro || 'Não deu para ler o PC.' });
    res.json(await guardarLeitura(uid, r.dados, r.passos));
  }),
);

// POST /api/users/specs/deep/fim — guarda a leitura feita pelo agente
router.post(
  '/deep/fim',
  requireUser,
  safe(async (req, res) => {
    const uid = Number(req.auth.uid);
    const jobId = Number(req.body && req.body.jobId);
    if (!jobId) return res.status(400).json({ error: 'Falta o trabalho da leitura.' });
    const j = await agente.obterJob(uid, jobId);
    if (!j) return res.status(404).json({ error: 'Leitura não encontrada.' });
    if (['pendente', 'a_correr'].includes(j.status)) {
      const passos = (Array.isArray(j.logs) ? j.logs : [])
        .map((x) => String((x && x.l) || ''))
        .filter((x) => /^\[passo\]/i.test(x))
        .map((x) => x.replace(/^\[passo\]\s*/i, ''));
      return res.status(202).json({ ok: false, pendente: true, status: j.status, passos });
    }
    if (j.status !== 'concluido') {
      return res.status(400).json({ error: j.erro || 'A leitura do PC falhou.' });
    }
    const dados = j.resultado && j.resultado.dados;
    if (!dados) return res.status(500).json({ error: 'O PC não devolveu os dados.' });
    const passos = (j.resultado && j.resultado.passos) || [];
    res.json(await guardarLeitura(uid, dados, passos));
  }),
);

/** Grava a leitura detalhada (e o que ela disser das colunas básicas). */
async function salvarDeep(uid, campos, detalhes) {
  const db = getDb();
  const cur = await db.prepare('SELECT * FROM user_specs WHERE user_id = ?').get(uid);
  // ler o PC de novo não apaga o bench — ele é medido no browser,
  // noutro momento, e é o que serve para comparar membros
  const detAntigo = (cur && json(cur.details)) || null;
  if (detAntigo && detAntigo.bench) detalhes.bench = detAntigo.bench;
  const valores = {
    os: null,
    browser: null,
    cpu_cores: null,
    ram_gb: null,
    gpu: null,
    screen: null,
    storage_gb: null,
    cpu_score: null,
    ...(cur ? pick(cur) : {}),
  };
  for (const [k, v] of Object.entries(campos)) if (v != null) valores[k] = v;
  delete valores.details;

  if (!cur) {
    await db
      .prepare(
        `INSERT INTO user_specs (user_id, os, browser, cpu_cores, ram_gb, gpu, screen, storage_gb, cpu_score, details, baseline, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, now())`,
      )
      .run(
        uid,
        valores.os,
        valores.browser,
        valores.cpu_cores,
        valores.ram_gb,
        valores.gpu,
        valores.screen,
        valores.storage_gb,
        valores.cpu_score,
        JSON.stringify(detalhes),
        JSON.stringify({ ...valores, detalhado: true }),
      );
    return { primeiraLeitura: true, spec: valores, details: detalhes };
  }

  await db
    .prepare(
      `UPDATE user_specs SET os = ?, browser = ?, cpu_cores = ?, ram_gb = ?, gpu = ?,
              screen = ?, storage_gb = ?, cpu_score = ?, details = ?::jsonb, updated_at = now()
       WHERE user_id = ?`,
    )
    .run(
      valores.os,
      valores.browser,
      valores.cpu_cores,
      valores.ram_gb,
      valores.gpu,
      valores.screen,
      valores.storage_gb,
      valores.cpu_score,
      JSON.stringify(detalhes),
      uid,
    );

  // A baseline antiga vinha do browser (estimativa). Com uma leitura
  // real passa a usá-la — é a primeira medição fiável.
  const baseAntiga = json(cur.baseline);
  let base = baseAntiga;
  if (!baseAntiga || !baseAntiga.detalhado) {
    base = { ...valores, detalhado: true };
    await db
      .prepare('UPDATE user_specs SET baseline = ?::jsonb WHERE user_id = ?')
      .run(JSON.stringify(base), uid);
  }

  return {
    primeiraLeitura: false,
    spec: valores,
    details: detalhes,
    comparacao: comparar(valores, base),
  };
}

/* ---------- ajudas ---------- */
function pick(r) {
  return {
    os: r.os || null,
    browser: r.browser || null,
    cpu_cores: r.cpu_cores == null ? null : Number(r.cpu_cores),
    ram_gb: r.ram_gb == null ? null : Number(r.ram_gb),
    gpu: r.gpu || null,
    screen: r.screen || null,
    storage_gb: r.storage_gb == null ? null : Number(r.storage_gb),
    cpu_score: r.cpu_score == null ? null : Number(r.cpu_score),
    details: json(r.details),
  };
}
function json(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

module.exports = { specsRouter: router, comparar };
