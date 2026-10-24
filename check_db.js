require('D:/execs/Site Los Locaus/server/node_modules/dotenv').config({ path: require('path').join(__dirname, 'server', '.env') });
const { getDb, initDatabase } = require('./server/database');
(async () => {
  await initDatabase();
  const db = getDb();
  try {
    const r = await db.prepare("SELECT count(*)::int AS n FROM public.pass_recovery").get();
    console.log('pass_recovery rows:', r?.n);
  } catch (e) {
    console.error('ERRO pass_recovery:', e.message);
  }
  try {
    const r2 = await db.prepare("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='pass_recovery'").get();
    console.log('tabela existe?', r2?.n);
  } catch (e) {
    console.error('ERRO info_schema:', e.message);
  }
})().catch(e => console.error('ERRO geral:', e.message));
