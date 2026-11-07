;(async () => {
  const stamp = Date.now().toString().slice(-6)
  const username = `tfix_${stamp}`
  const password = 'TesteQA12345'
  const reg = await fetch('http://localhost:3001/api/users/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, email: `tfix.${stamp}@example.com`, password }) })
  const rd = await reg.json().catch(()=>({}))
  console.log('registo:', reg.status, rd.error || 'ok', rd.user && rd.user.id)
  const login = await fetch('http://localhost:3001/api/users/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })
  const ld = await login.json().catch(()=>({}))
  console.log('login:', login.status, ld.error || 'ok')
  if (ld.token) {
    const me = await fetch('http://localhost:3001/api/users/me', { headers:{ Authorization:`Bearer ${ld.token}` } })
    console.log('me:', me.status)
  }
  console.log(JSON.stringify({ username, id: rd.user && rd.user.id }))
})().catch(e=>{console.error(e.message);process.exit(1)})
