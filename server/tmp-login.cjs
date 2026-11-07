require('dotenv').config({ path: 'server/.env' })
const { Pool } = require('pg')
const p = new Pool({
  host: process.env.SUPABASE_DB_HOST, port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || 'postgres', user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
})
;(async () => {
  const stamp = Date.now().toString().slice(-6)
  const username = `tlogin_${stamp}`
  const email = `tlogin.${stamp}@example.com`
  const password = 'TesteQA12345'
  const reg = await fetch('http://localhost:3001/api/users/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, email, password }) })
  const d = await reg.json()
  console.log('registo local:', reg.status, d.error || 'ok')
  if (d.user) await p.query(`INSERT INTO public.user_profiles (user_id, presence_override) VALUES ($1,'offline') ON CONFLICT (user_id) DO UPDATE SET presence_override='offline'`, [d.user.id])
  for (const base of ['http://localhost:3001','https://www.locaus.fun']) {
    const r = await fetch(base + '/api/users/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })
    const j = await r.json().catch(()=>({}))
    console.log(base, '->', r.status, j.error || 'ok')
  }
  console.log(JSON.stringify({ username, id: d.user && d.user.id }))
  await p.end()
})().catch(e => { console.error(e.message); process.exit(1) })
