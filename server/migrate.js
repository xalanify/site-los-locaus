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
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS background_id text',
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS name_color text',
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS name_effect text',
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS mouse text',
  'ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS dpi integer',
  'ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author text',
  "DELETE FROM public.posts WHERE title LIKE 'Novo clip:%' AND author IS NULL",
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

  // ============================================================
  //  Downloads dos clips (cópia MP4 no Storage)
  //  Assim o telemóvel transfere direto do Supabase, sem yt-dlp.
  // ============================================================
  'ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS download_file text',

  // ============================================================
  //  CHAT GERAL
  // ============================================================
  `CREATE TABLE IF NOT EXISTS public.chat_messages (
     id         bigint generated always as identity primary key,
     user_id    bigint not null references public.users(id) on delete cascade,
     body       text not null default '',
     kind       text not null default 'text',
     media_url  text,
     media_type text,
     clip_id    integer references public.clips(id) on delete set null,
     created_at timestamptz not null default now(),
     deleted_at timestamptz
   )`,
  'CREATE INDEX IF NOT EXISTS chat_messages_id_idx ON public.chat_messages (id)',
  `CREATE TABLE IF NOT EXISTS public.chat_typing (
     user_id   bigint primary key references public.users(id) on delete cascade,
     typing_at timestamptz not null default now()
   )`,

  // ============================================================
  //  PREVISÕES R6 (Tier 1 oficial da Ubisoft)
  // ============================================================
  `CREATE TABLE IF NOT EXISTS public.r6_matches (
     id               bigint generated always as identity primary key,
     external_id      bigint not null unique,
     competition_id   bigint,
     competition_name text,
     competition_logo text,
     championship_name text,
     phase_name       text,
     step_name        text,
     format           integer,
     team_a_id        bigint,
     team_a           text,
     team_a_logo      text,
     team_b_id        bigint,
     team_b           text,
     team_b_logo      text,
     start_time       timestamptz not null,
     status           integer not null default 1,
     score_a          integer not null default 0,
     score_b          integer not null default 0,
     winner           text,
     maps             jsonb,
     stream_url       text,
     updated_at       timestamptz not null default now(),
     created_at       timestamptz not null default now()
   )`,
  'CREATE INDEX IF NOT EXISTS r6_matches_start_idx ON public.r6_matches (start_time)',
  'CREATE INDEX IF NOT EXISTS r6_matches_status_idx ON public.r6_matches (status, start_time)',
  `CREATE TABLE IF NOT EXISTS public.r6_predictions (
     match_id  bigint not null references public.r6_matches(id) on delete cascade,
     user_id   bigint not null references public.users(id) on delete cascade,
     pick      text not null check (pick in ('a', 'b')),
     correct   boolean,
     notified  boolean not null default false,
     seen_at   timestamptz,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now(),
     primary key (match_id, user_id)
   )`,
  'CREATE INDEX IF NOT EXISTS r6_predictions_user_idx ON public.r6_predictions (user_id, created_at DESC)',
  `CREATE TABLE IF NOT EXISTS public.r6_sync (
     id         integer primary key,
     last_sync  timestamptz,
     last_ok    timestamptz,
     last_error text,
     build_id   text
   )`,
  'INSERT INTO public.r6_sync (id) VALUES (1) ON CONFLICT (id) DO NOTHING',

  // ============================================================
  //  Agente local (site na nuvem -> PC Windows)
  // ============================================================
  `CREATE TABLE IF NOT EXISTS public.agente_sessoes (
     id         bigint generated always as identity primary key,
     user_id    bigint not null references public.users(id) on delete cascade,
     nome       text,
     token_hash text not null unique,
     versao     text,
     plataforma text,
     criado_em  timestamptz not null default now(),
     visto_em   timestamptz,
     expira_em  timestamptz not null,
     encerrar   boolean not null default false
   )`,
  'ALTER TABLE public.agente_sessoes ADD COLUMN IF NOT EXISTS encerrar boolean NOT NULL DEFAULT false',
  'CREATE INDEX IF NOT EXISTS agente_sessoes_user_idx ON public.agente_sessoes (user_id, criado_em DESC)',
  `CREATE TABLE IF NOT EXISTS public.agente_jobs (
     id            bigint generated always as identity primary key,
     sessao_id     bigint not null references public.agente_sessoes(id) on delete cascade,
     user_id       bigint not null references public.users(id) on delete cascade,
     tipo          text not null,
     ferramenta_id text,
     arg           text,
     acoes         jsonb,
     ids           jsonb,
     comando       text not null,
     nome          text,
     tempo         integer,
     status        text not null default 'pendente',
     logs          jsonb not null default '[]'::jsonb,
     resultado     jsonb,
     erro          text,
     codigo        integer,
     cancelar      boolean not null default false,
     criado_em     timestamptz not null default now(),
     inicio_em     timestamptz,
     fim_em        timestamptz
   )`,
  'CREATE INDEX IF NOT EXISTS agente_jobs_sessao_idx ON public.agente_jobs (sessao_id, status, id)',
  'CREATE INDEX IF NOT EXISTS agente_jobs_user_idx ON public.agente_jobs (user_id, criado_em DESC)',
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
