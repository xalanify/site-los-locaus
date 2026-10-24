// Cria a conta de teste "Afonso Teste" (idempotente) e gera o
// token JWT que o código do portão "afonso" usa para entrar só
// no chat. Rodar: node server/criar-afonso.js
require('dotenv').config({ path: __dirname + '/.env' })
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const store = require('./usersStore')
const { JWT_SECRET } = require('./middleware/auth')

const NOME = 'Afonso Teste'

;(async () => {
  let user = await store.findByUsername(NOME)
  if (!user) {
    const hash = bcrypt.hashSync('afonso-teste-2026', 10)
    user = await store.createUser(NOME, hash, null)
    console.log('Conta criada: id', user.id)
  } else {
    console.log('Conta já existe: id', user.id)
  }

  const token = jwt.sign(
    { uid: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '100y' },
  )
  console.log('TOKEN=' + token)
})().catch((e) => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
