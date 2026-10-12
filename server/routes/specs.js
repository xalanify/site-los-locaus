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
const { getDb } = require('../database');
const { requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('specs:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

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

    const db = getDb();
    const cur = await db.prepare('SELECT * FROM user_specs WHERE user_id = ?').get(uid);

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

// GET /api/users/specs — todos os membros (para o dashboard, só admin)
router.get(
  '/',
  requireAdmin,
  safe(async (req, res) => {
    const rows = await getDb()
      .prepare(
        `SELECT s.*, u.username, p.avatar_url
         FROM user_specs s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN user_profiles p ON p.user_id = s.user_id
         WHERE u.password_hash NOT LIKE '!%'
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
