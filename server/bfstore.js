/* ============================================================
   Snapshot do Battlefield 6 (tracker.gg) — guardado na BD
   ------------------------------------------------------------
   A Vercel é read-only; o import manual grava em public.bf_snapshot.
   ============================================================ */
const fs = require('fs')
const path = require('path')
const { getDb } = require('./database')

const FILE = path.join(__dirname, 'data', 'bf6.json')

let tabelaOk = null
async function garantirTabela() {
  if (tabelaOk !== null) return tabelaOk
  try {
    await getDb().exec(
      `CREATE TABLE IF NOT EXISTS public.bf_snapshot (
         id integer primary key,
         data jsonb not null,
         updated_at timestamptz not null default now()
       )`,
    )
    tabelaOk = true
  } catch (e) {
    console.warn('bf_snapshot (tabela):', e.message)
    tabelaOk = false
  }
  return tabelaOk
}

async function ler() {
  if (await garantirTabela()) {
    try {
      const row = await getDb()
        .prepare('SELECT data, updated_at FROM public.bf_snapshot WHERE id = 1')
        .get()
      if (row && row.data) {
        const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        return { ...d, updatedAt: row.updated_at }
      }
    } catch (e) {
      console.warn('bf_snapshot ler:', e.message)
    }
  }
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    return null
  }
}

async function guardar(dados) {
  let ok = false
  if (await garantirTabela()) {
    try {
      await getDb()
        .prepare(
          `INSERT INTO public.bf_snapshot (id, data, updated_at) VALUES (1, ?::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        )
        .run(JSON.stringify(dados))
      ok = true
    } catch (e) {
      console.error('bf_snapshot guardar:', e.message)
    }
  }
  try {
    fs.writeFileSync(FILE, JSON.stringify(dados, null, 2), 'utf8')
  } catch {
    /* read-only */
  }
  return ok
}

module.exports = { ler, guardar }
