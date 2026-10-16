/* ============================================================
   Migrações pequenas e idempotentes (Supabase).

   Correr à mão sempre que o schema mudar:

       node server/migrate.js

   Todas as instruções têm de ser repetíveis — nada de "alter table"
   sem "if not exists", para poder correr duas vezes sem falhar.
   ============================================================ */
require('dotenv').config({ path: __dirname + '/.env' });
const { initDatabase, getDb, closeDatabase } = require('./database');

const PASSOS = [
  // Contador de visualizações nos clips
  'ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0',
  // Publicação automática: fica só o link do vídeo
  'ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS youtube_id text',
  'ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS youtube_thumb text',
  // Capa NOSSA do clip: um frame do próprio vídeo (tirado no browser)
  'ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS thumb text',
  // Experimentação: banner do perfil + cor/efeito do nome
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS banner_id text',
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS name_color text',
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS name_effect text',
  // Specs dos PCs (recolhidas no browser, com baseline para comparar)
  `CREATE TABLE IF NOT EXISTS public.user_specs (
     user_id    bigint primary key references public.users(id) on delete cascade,
     os         text,
     browser    text,
     cpu_cores  integer,
     ram_gb     integer,
     gpu        text,
     screen     text,
     storage_gb integer,
     cpu_score  bigint,
     baseline   jsonb,
     updated_at timestamptz not null default now()
   )`,
  // score em ops/segundo: um integer não chega (valores na casa dos
  // mil milhões) — corrige BDs já criadas com o tipo antigo
  'ALTER TABLE public.user_specs ALTER COLUMN cpu_score TYPE bigint',
  // leitura real do PC (PowerShell): relógios, timings e discos
  'ALTER TABLE public.user_specs ADD COLUMN IF NOT EXISTS details jsonb',
  // Registo de auditoria das ferramentas Windows (vê-se no painel admin)
  `CREATE TABLE IF NOT EXISTS public.tool_runs (
     id           bigint generated always as identity primary key,
     ferramenta_id text not null,
     nome         text,
     arg          text,
     username     text,
     inicio       timestamptz not null default now(),
     fim          timestamptz,
     codigo       integer,
     erro         text,
     cancelado    boolean not null default false,
     logs         jsonb
   )`,
  'CREATE INDEX IF NOT EXISTS tool_runs_inicio_idx ON public.tool_runs (inicio DESC)',
];

(async () => {
  const ok = await initDatabase();
  if (!ok) {
    console.log('Sem ligação à base de dados.');
    process.exit(1);
  }
  const db = getDb();
  for (const sql of PASSOS) {
    await db.prepare(sql).run();
    console.log('ok —', sql.slice(0, 78));
  }
  await closeDatabase();
  console.log('Migração concluída.');
})().catch((e) => {
  console.error('Falhou:', e.message);
  process.exit(1);
});
