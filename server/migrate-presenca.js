// Garante que user_presence tem a coluna plataforma (pc|mobile).
// Idempotente — pode correr quantas vezes quiser.
require('dotenv').config({ path: __dirname + '/.env' })
const { getDb } = require('./database')

;(async () => {
  const db = getDb()
  const antes = await db
    .prepare('SELECT column_name FROM information_schema.columns WHERE table_name = ?')
    .all('user_presence')
  console.log('colunas antes:', JSON.stringify(antes))
  const tem = antes.some((c) => c.column_name === 'plataforma')
  if (!tem) {
    await db.prepare('ALTER TABLE user_presence ADD COLUMN plataforma text').run()
    console.log('coluna plataforma adicionada.')
  } else {
    console.log('coluna plataforma já existe.')
  }
  process.exit(0)
})().catch((e) => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
