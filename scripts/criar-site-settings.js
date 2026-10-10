/* Cria a tabela das definições do site (tema, etc.).
   Correr uma vez:  node scripts/criar-site-settings.js  */
const path = require('path');
require(path.join(__dirname, '../node_modules/dotenv')).config({
  path: path.join(__dirname, '../server/.env'),
});
const { initDatabase, getDb, closeDatabase } = require(path.join(__dirname, '../server/database'));

(async () => {
  await initDatabase();
  await getDb().exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      k          text PRIMARY KEY,
      v          text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const row = await getDb().prepare("SELECT k, v FROM site_settings WHERE k = 'theme'").get();
  if (!row) {
    await getDb()
      .prepare("INSERT INTO site_settings (k, v) VALUES ('theme', 'normal') ON CONFLICT (k) DO NOTHING")
      .run();
  }
  const all = await getDb().prepare('SELECT k, v FROM site_settings ORDER BY k').all();
  console.log('site_settings:', JSON.stringify(all));
  await closeDatabase();
})().catch((e) => {
  console.error('ERRO', e.message);
  process.exit(1);
});
