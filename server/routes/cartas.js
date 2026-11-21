/* ============================================================
   CARTAS — música por carta (trecho editável no painel admin)
   ------------------------------------------------------------
   GET  /api/cartas               -> música de cada carta
   POST /api/cartas/musica        -> upload de áudio (admin)
   PUT  /api/cartas/musica/:item  -> título / início / fim (admin)
   ============================================================ */
const express = require('express')
const { getDb } = require('../database')
const storage = require('../storage')
const { requireAdmin } = require('../middleware/auth')

const router = express.Router()

let tabela = null
function garantirTabela() {
  if (!tabela) {
    tabela = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.cartas_musica (
          item_id text primary key,
          titulo text,
          url text,
          inicio numeric not null default 0,
          fim numeric not null default 14,
          atualizado timestamptz not null default now()
        );
      `)
      .then(() => true)
      .catch(() => false)
  }
  return tabela
}

async function listar() {
  await garantirTabela()
  const rows = await getDb().prepare('SELECT * FROM public.cartas_musica').all()
  const out = {}
  for (const r of rows) {
    out[r.item_id] = {
      titulo: r.titulo || '',
      url: r.url || '',
      inicio: Number(r.inicio) || 0,
      fim: Number(r.fim) || 14,
    }
  }
  return out
}

router.get('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ ok: true, itens: await listar() })
  } catch (e) {
    console.error('[cartas] listar:', e.message)
    res.json({ ok: true, itens: {} })
  }
})

const TIPOS = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'application/octet-stream': 'mp3',
}

router.post(
  '/musica',
  requireAdmin,
  express.raw({ type: Object.keys(TIPOS), limit: '14mb' }),
  async (req, res) => {
    try {
      const item = String(req.query.item || '').trim().slice(0, 40)
      if (!item) return res.status(400).json({ ok: false, erro: 'Falta a carta.' })
      if (!req.body || !req.body.length) return res.status(400).json({ ok: false, erro: 'Ficheiro vazio.' })

      const tipo = String(req.headers['content-type'] || 'audio/mpeg')
      const ext = TIPOS[tipo] || 'mp3'
      const ficheiro = `musica-${item}-${Date.now()}.${ext}`
      const url = await storage.upload('cartas', ficheiro, req.body, tipo)

      await garantirTabela()
      const titulo = String(req.query.titulo || '').slice(0, 120)
      const inicio = Number(req.query.inicio)
      const fim = Number(req.query.fim)
      await getDb()
        .prepare(
          `INSERT INTO public.cartas_musica (item_id, titulo, url, inicio, fim, atualizado)
           VALUES (?, ?, ?, ?, ?, now())
           ON CONFLICT (item_id) DO UPDATE SET
             titulo = COALESCE(NULLIF(EXCLUDED.titulo, ''), cartas_musica.titulo),
             url = EXCLUDED.url,
             inicio = EXCLUDED.inicio,
             fim = EXCLUDED.fim,
             atualizado = now()`,
        )
        .run(
          item,
          titulo || null,
          url,
          Number.isFinite(inicio) && inicio >= 0 ? inicio : 0,
          Number.isFinite(fim) && fim > 0 ? fim : 14,
        )

      res.json({ ok: true, item: (await listar())[item] })
    } catch (e) {
      console.error('[cartas] upload musica:', e.message)
      res.status(500).json({ ok: false, erro: 'Não consegui guardar a música.' })
    }
  },
)

router.put('/musica/:item', requireAdmin, async (req, res) => {
  try {
    const item = String(req.params.item || '').trim().slice(0, 40)
    await garantirTabela()
    const temUrl = Object.prototype.hasOwnProperty.call(req.body || {}, 'url')
    const url = temUrl ? String(req.body.url || '').slice(0, 500) : null
    const titulo = String(req.body?.titulo || '').slice(0, 120)
    const inicio = Number(req.body?.inicio)
    const fim = Number(req.body?.fim)

    if (temUrl) {
      await getDb()
        .prepare(
          `INSERT INTO public.cartas_musica (item_id, titulo, url, inicio, fim, atualizado)
           VALUES (?, ?, ?, ?, ?, now())
           ON CONFLICT (item_id) DO UPDATE SET
             titulo = EXCLUDED.titulo,
             url = EXCLUDED.url,
             inicio = EXCLUDED.inicio,
             fim = EXCLUDED.fim,
             atualizado = now()`,
        )
        .run(
          item,
          titulo || null,
          url,
          Number.isFinite(inicio) && inicio >= 0 ? inicio : 0,
          Number.isFinite(fim) && fim > 0 ? fim : 14,
        )
    } else {
      await getDb()
        .prepare(
          `INSERT INTO public.cartas_musica (item_id, titulo, inicio, fim, atualizado)
           VALUES (?, ?, ?, ?, now())
           ON CONFLICT (item_id) DO UPDATE SET
             titulo = EXCLUDED.titulo,
             inicio = EXCLUDED.inicio,
             fim = EXCLUDED.fim,
             atualizado = now()`,
        )
        .run(
          item,
          titulo || null,
          Number.isFinite(inicio) && inicio >= 0 ? inicio : 0,
          Number.isFinite(fim) && fim > 0 ? fim : 14,
        )
    }
    res.json({ ok: true, item: (await listar())[item] })
  } catch (e) {
    console.error('[cartas] editar musica:', e.message)
    res.status(500).json({ ok: false, erro: 'Não consegui guardar.' })
  }
})

module.exports = { cartasRouter: router }
