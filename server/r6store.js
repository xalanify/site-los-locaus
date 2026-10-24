/* ============================================================
   Snapshot do Rainbow Six (r6.json) — leitura/escrita resiliente
   ------------------------------------------------------------
   Na Vercel o disco é read-only (/var/task), por isso o ficheiro
   não pode ser escrito. Guardamos o snapshot na base de dados
   (public.r6_snapshot) e mantemos o ficheiro como fallback local.
   ============================================================ */
const fs = require('fs');
const { getDb } = require('./database');
const { R6_FILE } = require('./trackerdata');

let tabelaOk = null;
async function garantirTabela() {
  if (tabelaOk !== null) return tabelaOk;
  try {
    await getDb().exec(
      `CREATE TABLE IF NOT EXISTS public.r6_snapshot (
         id integer primary key,
         data jsonb not null,
         updated_at timestamptz not null default now()
       )`,
    );
    tabelaOk = true;
  } catch (e) {
    console.warn('r6_snapshot (tabela):', e.message);
    tabelaOk = false;
  }
  return tabelaOk;
}

async function ler() {
  if (await garantirTabela()) {
    try {
      const row = await getDb()
        .prepare('SELECT data FROM public.r6_snapshot WHERE id = 1')
        .get();
      if (row && row.data) {
        return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      }
    } catch (e) {
      console.warn('r6_snapshot ler:', e.message);
    }
  }
  try {
    return JSON.parse(fs.readFileSync(R6_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function guardar(dados) {
  let ok = false;
  if (await garantirTabela()) {
    try {
      await getDb()
        .prepare(
          `INSERT INTO public.r6_snapshot (id, data, updated_at) VALUES (1, ?::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        )
        .run(JSON.stringify(dados));
      ok = true;
    } catch (e) {
      console.error('r6_snapshot guardar:', e.message);
    }
  }
  // fallback: tenta também o ficheiro (local); na Vercel falha por read-only
  try {
    fs.writeFileSync(R6_FILE, JSON.stringify(dados, null, 2), 'utf8');
  } catch {
    /* read-only */
  }
  return ok;
}

module.exports = { ler, guardar };
