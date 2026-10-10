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
