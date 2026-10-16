require('dotenv').config({ path: __dirname + '/.env' });
const { initDatabase, getDb, closeDatabase } = require('./database');
(async () => {
  await initDatabase();
  const db = getDb();
  const r = await db.prepare("DELETE FROM posts WHERE title LIKE 'Novo clip:%' AND author IS NULL").run();
  console.log('apagados (author null):', r.rowCount || r.changes || JSON.stringify(r));
  await closeDatabase();
})().catch((e) => { console.error(e.message); process.exit(1); });
