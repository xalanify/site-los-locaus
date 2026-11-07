require('dotenv').config({ path: 'server/.env' })
const { Pool } = require('pg')
const p = new Pool({
  host: process.env.SUPABASE_DB_HOST, port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || 'postgres', user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
})
const api = (path, opts = {}, token) => fetch(`http://localhost:3001${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
;(async () => {
  const stamp = Date.now().toString().slice(-6)
  const username = `tchk_${stamp}`
  const reg = await api('/api/users/register', { method: 'POST', body: JSON.stringify({ username, email: `tchk.${stamp}@example.com`, password: 'TesteQA12345' }) })
  const d = await reg.json()
  await p.query(`INSERT INTO public.user_profiles (user_id, presence_override) VALUES ($1, 'offline') ON CONFLICT (user_id) DO UPDATE SET presence_override='offline'`, [d.user.id])
  const m = await (await api('/api/mercado', {}, d.token)).json()
  const obs = m.itens.find(i => i.id === 'cor-obsidian')
  const top = m.itens.filter(i => i.tipo === 'carta').sort((a,b)=>b.preco-a.preco).slice(0,3).map(i=>({n:i.nome, p:i.preco_compra}))
  const ed = await (await api('/api/mercado/edicoes', {}, d.token)).json()
  console.log(JSON.stringify({ username, id: d.user.id, obsidian: obs && { base: obs.base, preco: obs.preco_compra }, topCartas: top, edicoes: (ed.edicoes||[]).map(e=>({nome:e.nome,preco:e.preco})) }, null, 1))
  await p.end()
})().catch(e => { console.error(e.message); process.exit(1) })
