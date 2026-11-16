/* ============================================================
   LOCAUS.FUN :: ENIGMA 1 SEMANA
   ------------------------------------------------------------
   API + páginas das etapas (endereços aleatórios /e/<slug>).

   - Estado em server/data/enigma.json (criado no primeiro arranque)
   - Slugs e códigos sorteados uma vez e guardados
   - "xalana" (admin) joga mas não entra na tabela nem ganha moedas
   ============================================================ */

const express = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getDb } = require('../database')
const { attachAuth } = require('../middleware/auth')
const cosmeticos = require('../cosmeticos')

const router = express.Router()
const paginas = express.Router()

const DIR = path.join(__dirname, '..', 'enigma')
const PAGINAS = path.join(DIR, 'paginas')
const ESTADO = path.join(__dirname, '..', 'data', 'enigma.json')

const ADMIN = ['xalana']
const TEXTO_QR = 'a segunda imagem'
const CHAVE_IMAGEM = '0101'
const COORD = '39.69762892600141, -31.107149522910337'
const COORD_DIG = COORD.replace(/[^0-9]/g, '')
const LUGAR = 'corvo'

/* O enigma fecha a 23 deste mês à meia-noite (hora de Lisboa). */
const FIM = new Date('2026-11-24T00:00:00+00:00')
const encerrado = () => Date.now() >= FIM.getTime()

const rand = (n) => crypto.randomBytes(n).toString('hex')
const randNum = (n) => String(Math.floor(Math.random() * Math.pow(10, n))).padStart(n, '0')

function estadoInicial() {
  const s = { slugs: {}, jogadores: {}, ordemFim: [] }
  for (let i = 1; i <= 7; i++) s.slugs[i] = rand(6)
  s.codigo1 = randNum(4)
  s.codigo4 = randNum(3)
  s.codigo5 = randNum(4)
  s.chave6 = randNum(4)
  return s
}

let tabelaEstado = null
async function garantirEstadoTabela() {
  if (!tabelaEstado) {
    tabelaEstado = getDb()
      .prepare(
        `CREATE TABLE IF NOT EXISTS public.enigma_estado (
           id int primary key,
           dados text not null,
           atualizado timestamptz not null default now()
         )`,
      )
      .run()
      .then(() => true)
      .catch(() => false)
  }
  await tabelaEstado
}

/* Estado persistido na base de dados (funciona na Vercel).
   O ficheiro local fica só como cópia de segurança. */
async function lerEstado() {
  try {
    await garantirEstadoTabela()
    const row = await getDb()
      .prepare('SELECT dados FROM public.enigma_estado WHERE id = 1')
      .get()
    if (row && row.dados) {
      const e = JSON.parse(row.dados)
      if (e && e.slugs && e.codigo1) return e
    }
  } catch (err) {
    /* sem base de dados — usa o ficheiro */
  }

  try {
    const e = JSON.parse(fs.readFileSync(ESTADO, 'utf8'))
    if (!e || !e.slugs || !e.codigo1) throw new Error('incompleto')
    return e
  } catch (err) {
    const novo = estadoInicial()
    await gravar(novo)
    return novo
  }
}

async function gravar(e) {
  try {
    fs.mkdirSync(path.dirname(ESTADO), { recursive: true })
    fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2))
  } catch (err) {
    /* sem disco (Vercel) */
  }
  try {
    await garantirEstadoTabela()
    await getDb()
      .prepare(
        `INSERT INTO public.enigma_estado (id, dados) VALUES (1, ?)
         ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado = now()`,
      )
      .run(JSON.stringify(e))
  } catch (err) {
    console.error('[enigma] nao consegui gravar estado:', err.message)
  }
}

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const soDigitos = (s) => String(s || '').replace(/[^0-9]/g, '')
const ehAdmin = (nome) => ADMIN.includes(norm(nome))

const urlEtapa = (estado, n) => (estado.slugs[n] ? `/e/${estado.slugs[n]}` : '/enigmas')

/* Prémios: 1.º 30, 2.º 25, 3.º 20, 4.º 10, 5.º 9, 6.º 8, 7.º 7, ... */
const PREMIOS = [40, 30, 25, 20, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

function moedasPara(posicao) {
  return PREMIOS[posicao - 1] || 1
}

/* Identidade: conta com sessão (uid) ou nome livre (compatibilidade). */
async function identidade(req, nomeBody) {
  if (req.auth && req.auth.uid) {
    const uid = Number(req.auth.uid)
    let nome = String(req.auth.username || '').trim()
    if (!nome) {
      try {
        const u = await getDb().prepare('SELECT username FROM users WHERE id = ?').get(uid)
        nome = (u && u.username) || ''
      } catch (e) {
        /* sem base de dados */
      }
    }
    return { uid, nome: nome || `membro-${uid}`, chave: `u:${uid}`, auth: true }
  }
  const nome = String(nomeBody || '').trim().slice(0, 24)
  if (!nome) return null
  return { uid: null, nome, chave: `n:${norm(nome)}`, auth: false }
}

/* Paga as moedas do prémio uma única vez, na conta verdadeira. */
async function pagarPremio(j) {
  if (!j || !j.uid || j.pago) return
  try {
    const db = getDb()
    await db
      .prepare('INSERT INTO mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
      .run(Number(j.uid), Number(j.moedas) || 0, `enigma:semana1:${j.posicao}`)
    j.pago = true
  } catch (e) {
    console.error('[enigma] não consegui pagar moedas:', e.message)
  }
}

/* Vencedor (1.º a terminar) ganha a distinção secreta do enigma. */
async function registarVencedor(j) {
  if (!j || !j.uid || j.posicao !== 1) return
  try {
    const db = getDb()
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS public.enigma_vencedores (
           user_id bigint not null,
           semana text not null,
           criado_em timestamptz not null default now(),
           primary key (user_id, semana)
         )`,
      )
      .run()
    await db
      .prepare(
        'INSERT INTO public.enigma_vencedores (user_id, semana) VALUES (?, ?) ON CONFLICT DO NOTHING',
      )
      .run(Number(j.uid), 'semana-1')
  } catch (e) {
    console.error('[enigma] não consegui guardar vencedor:', e.message)
  }
}

async function terminar(estado, chave) {
  const j = estado.jogadores[chave]
  if (!j || j.terminou) return
  j.terminou = true
  j.terminouEm = Date.now()
  j.tempoMs = Math.max(1000, j.terminouEm - (j.iniciouEm || j.terminouEm))
  estado.ordemFim.push(chave)
  j.posicao = estado.ordemFim.length
  j.moedas = moedasPara(j.posicao)
  await pagarPremio(j)
  await registarVencedor(j)
  await darCarta(j)
}

/* ------------------------------------------------- carta exclusiva 1/1 */
const CARTA_ID = 'carta-enigma-cromada'

async function garantirCarta() {
  await getDb()
    .prepare(
      `CREATE TABLE IF NOT EXISTS public.enigma_carta (
         id int primary key,
         owner_id bigint,
         em_venda boolean not null default false,
         preco int not null default 100,
         atualizado timestamptz not null default now()
       )`,
    )
    .run()
}

async function darCarta(j) {
  if (!j || !j.uid || j.posicao !== 1) return
  try {
    const db = getDb()
    await garantirCarta()
    const atual = await db.prepare('SELECT owner_id FROM public.enigma_carta WHERE id = 1').get()
    if (atual && atual.owner_id) return
    await db
      .prepare(
        `INSERT INTO public.enigma_carta (id, owner_id, em_venda, preco) VALUES (1, ?, false, 100)
         ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id, em_venda = false, atualizado = now()`,
      )
      .run(Number(j.uid))
    await db
      .prepare(
        `INSERT INTO public.cosmeticos_compras (user_id, item_id, tipo, custo)
         VALUES (?, ?, 'carta', 0) ON CONFLICT (user_id, item_id) DO NOTHING`,
      )
      .run(Number(j.uid), CARTA_ID)
  } catch (e) {
    console.error('[enigma] não consegui dar a carta:', e.message)
  }
}

/* ---------------------------------------------------------------- API */

function novoJogador(id) {
  return {
    uid: id.uid,
    nome: id.nome,
    admin: ehAdmin(id.nome),
    iniciouEm: Date.now(),
    etapa: 1,
    terminou: false,
    terminouEm: null,
    tempoMs: null,
    moedas: 0,
    pago: false,
  }
}

function garantirJogador(estado, id) {
  let j = estado.jogadores[id.chave]
  if (!j) {
    j = novoJogador(id)
    estado.jogadores[id.chave] = j
  }
  j.admin = ehAdmin(id.nome)
  if (id.uid) j.uid = id.uid
  if (id.nome) j.nome = id.nome
  return j
}

router.post('/entrar', attachAuth, async (req, res) => {
  const id = await identidade(req, req.body && req.body.nome)
  if (!id) return res.status(400).json({ ok: false, erro: 'sessão ou nome em falta' })

  const estado = await lerEstado()
  const j = garantirJogador(estado, id)
  await gravar(estado)

  if (encerrado()) {
    if (!j.admin) {
      return res.json({
        ok: true,
        admin: false,
        etapa: Math.min(j.etapa || 1, 6),
        terminou: !!j.terminou,
        url: null,
        encerrado: true,
      })
    }
  }

  res.json({
    ok: true,
    admin: !!j.admin,
    etapa: Math.min(j.etapa || 1, 6),
    terminou: !!j.terminou,
    posicao: j.posicao || null,
    moedas: j.moedas || 0,
    encerrado: encerrado(),
    url: j.admin
      ? urlEtapa(estado, Math.min(j.etapa || 1, 6))
      : j.terminou || encerrado()
        ? '/enigmas'
        : urlEtapa(estado, j.etapa || 1),
  })
})

router.post('/entrou', attachAuth, async (req, res) => {
  const etapa = Number((req.body && req.body.etapa) || 0)
  if (!etapa) return res.json({ ok: false })

  const id = await identidade(req, req.body && req.body.nome)
  if (!id) return res.json({ ok: false, semSessao: true })

  const estado = await lerEstado()
  const j = garantirJogador(estado, id)
  if (etapa > (j.etapa || 1)) j.etapa = etapa
  if (!j.admin && !encerrado() && etapa >= 7 && !j.terminou) await terminar(estado, id.chave)
  await gravar(estado)
  res.json({ ok: true, admin: !!j.admin, encerrado: encerrado() })
})

router.post('/responder', attachAuth, async (req, res) => {
  if (encerrado()) return res.json({ ok: false, encerrado: true })
  const etapa = Number((req.body && req.body.etapa) || 0)
  const valor = String((req.body && req.body.valor) || '')

  const estado = await lerEstado()
  const v = norm(valor)
  let r = { ok: false }

  if (etapa === 1) {
    if (v === norm(estado.codigo1)) r = { ok: true, url: urlEtapa(estado, 2) }
  } else if (etapa === 2) {
    if (v === norm(TEXTO_QR)) r = { ok: true, passo: 2 }
    else if (v === norm(CHAVE_IMAGEM)) r = { ok: true, url: urlEtapa(estado, 3) }
  } else if (etapa === 3) {
    if (soDigitos(valor) && soDigitos(valor) === COORD_DIG) r = { ok: true, passo: 2 }
    else if (v.includes(LUGAR)) r = { ok: true, url: urlEtapa(estado, 4) }
  } else if (etapa === 4) {
    if (v === norm(estado.codigo4)) r = { ok: true, url: urlEtapa(estado, 5) }
  } else if (etapa === 5) {
    if (soDigitos(valor) === estado.codigo5) r = { ok: true, url: urlEtapa(estado, 6) }
  } else if (etapa === 6) {
    if (v === norm(estado.chave6)) r = { ok: true, url: urlEtapa(estado, 7) }
  }

  // progresso / fim — ligado à conta com sessão (admins jogam, mas não ganham)
  if (r.ok) {
    const id = await identidade(req, req.body && req.body.nome)
    if (id) {
      const j = garantirJogador(estado, id)
      if (r.url) {
        const idx = Object.keys(estado.slugs).find((k) => `/e/${estado.slugs[k]}` === r.url)
        const n = Number(idx || 1)
        if (n > (j.etapa || 1)) j.etapa = n
        if (!j.admin && n >= 7) await terminar(estado, id.chave)
      }
      await gravar(estado)
    }
  }

  res.json(r)
})

router.post('/xalana', async (req, res) => {
  const estado = await lerEstado()
  res.json({ ok: true, chave: estado.chave6 })
})

/* Estado público: fim da contagem */
router.get('/estado', (req, res) => {
  res.json({ ok: true, fim: FIM.toISOString(), encerrado: encerrado() })
})

/* Carta exclusiva do vencedor (1/1) */
router.get('/carta', attachAuth, async (req, res) => {
  try {
    const db = getDb()
    await garantirCarta()
    const c = await db.prepare('SELECT * FROM public.enigma_carta WHERE id = 1').get()
    if (!c || !c.owner_id) return res.json({ ok: true, existe: false })
    const u = await db
      .prepare('SELECT username FROM users WHERE id = ?')
      .get(Number(c.owner_id))
      .catch(() => null)
    const uid = req.auth && req.auth.uid ? Number(req.auth.uid) : 0
    res.json({
      ok: true,
      existe: true,
      nome: 'Carta do Enigma',
      numero: '1/1',
      owner: (u && u.username) || 'membro',
      owner_id: Number(c.owner_id),
      em_venda: !!c.em_venda,
      preco: Number(c.preco) || 100,
      souEu: uid === Number(c.owner_id),
    })
  } catch (e) {
    console.error('[enigma] carta:', e.message)
    res.json({ ok: true, existe: false })
  }
})

router.post('/carta/vender', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ ok: false })
  try {
    const db = getDb()
    await garantirCarta()
    const c = await db.prepare('SELECT * FROM public.enigma_carta WHERE id = 1').get()
    if (!c || Number(c.owner_id) !== Number(req.auth.uid)) {
      return res.status(403).json({ ok: false, erro: 'Esta carta não é tua.' })
    }
    await db
      .prepare('UPDATE public.enigma_carta SET em_venda = true, preco = 100, atualizado = now() WHERE id = 1')
      .run()
    res.json({ ok: true, em_venda: true, preco: 100 })
  } catch (e) {
    console.error('[enigma] vender carta:', e.message)
    res.status(500).json({ ok: false, erro: 'Não consegui pôr a carta à venda.' })
  }
})

router.post('/carta/comprar', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ ok: false })
  try {
    const uid = Number(req.auth.uid)
    const db = getDb()
    await garantirCarta()
    const c = await db.prepare('SELECT * FROM public.enigma_carta WHERE id = 1').get()
    if (!c || !c.owner_id) return res.status(404).json({ ok: false, erro: 'A carta ainda não existe.' })
    if (Number(c.owner_id) === uid) return res.status(400).json({ ok: false, erro: 'A carta já é tua.' })
    if (!c.em_venda) return res.status(400).json({ ok: false, erro: 'A carta não está à venda.' })

    const preco = Number(c.preco) || 100
    const saldo = await cosmeticos.saldo(uid)
    if (Number(saldo.disponiveis) < preco) {
      return res.status(400).json({
        ok: false,
        erro: `Faltam ${preco - Number(saldo.disponiveis)} moedas para comprar a carta.`,
      })
    }

    await db
      .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
      .run(uid, -preco, 'compra:carta-do-enigma')
    await db
      .prepare('INSERT INTO public.mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
      .run(Number(c.owner_id), preco, 'venda:carta-do-enigma')

    await db
      .prepare('UPDATE public.cosmeticos_compras SET user_id = ? WHERE item_id = ? AND user_id = ?')
      .run(uid, CARTA_ID, Number(c.owner_id))
    await db
      .prepare(
        'UPDATE public.enigma_carta SET owner_id = ?, em_venda = false, atualizado = now() WHERE id = 1',
      )
      .run(uid)

    res.json({ ok: true, preco })
  } catch (e) {
    console.error('[enigma] comprar carta:', e.message)
    res.status(500).json({ ok: false, erro: 'Não consegui comprar a carta.' })
  }
})

/* Estado do próprio membro (não inscreve ninguém) */
router.get('/eu', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ ok: false })
  const id = await identidade(req)
  const estado = await lerEstado()
  const j = id ? estado.jogadores[id.chave] : null
  if (!j)
    return res.json({
      ok: true,
      inscrito: false,
      etapa: 1,
      terminou: false,
      url: null,
      fim: FIM.toISOString(),
      encerrado: encerrado(),
    })
  res.json({
    ok: true,
    inscrito: true,
    admin: !!j.admin,
    etapa: Math.min(j.etapa || 1, 6),
    terminou: !!j.terminou,
    posicao: j.posicao || null,
    moedas: j.moedas || 0,
    fim: FIM.toISOString(),
    encerrado: encerrado(),
    url: j.admin
      ? j.etapa && j.etapa < 7
        ? urlEtapa(estado, j.etapa)
        : null
      : j.terminou || encerrado()
        ? null
        : urlEtapa(estado, j.etapa || 1),
  })
})

router.get('/tabela', async (req, res) => {
  const estado = await lerEstado()
  const lista = Object.keys(estado.jogadores).map((k) => {
    const j = estado.jogadores[k]
    return {
      nome: j.nome,
      admin: !!j.admin,
      etapa: Math.min(j.etapa || 1, 6),
      terminou: !!j.terminou,
      moedas: j.moedas || 0,
      posicao: j.posicao || null,
      uid: j.uid || null,
    }
  })

  lista.sort((a, b) => {
    if (a.admin !== b.admin) return a.admin ? 1 : -1
    if (a.terminou !== b.terminou) return a.terminou ? -1 : 1
    if (a.terminou && b.terminou) return (a.posicao || 99) - (b.posicao || 99)
    return b.etapa - a.etapa
  })

  res.json({ ok: true, total: lista.length, fim: FIM.toISOString(), encerrado: encerrado(), tabela: lista })
})

/* ---------------------------------------------------------------- páginas */

const cachePaginas = {}

function lerPagina(nome) {
  if (!cachePaginas[nome]) {
    cachePaginas[nome] = fs.readFileSync(path.join(PAGINAS, nome), 'utf8')
  }
  return cachePaginas[nome]
}

function render(nome, trocas) {
  let html = lerPagina(nome)
  Object.keys(trocas || {}).forEach((k) => {
    html = html.split(k).join(trocas[k])
  })
  return html
}

function binarioEmLinhas(texto) {
  const bytes = Array.from(Buffer.from(texto, 'utf8')).map((b) => b.toString(2).padStart(8, '0'))
  const linhas = []
  for (let i = 0; i < bytes.length; i += 11) linhas.push(bytes.slice(i, i + 11).join(' '))
  return linhas.join('\n')
}

paginas.get('/assets/:f', (req, res) => {
  const f = req.params.f
  if (!/^(estilo\.css|enigma\.js)$/.test(f)) return res.status(404).end()
  res.type(f.endsWith('.css') ? 'text/css' : 'application/javascript')
  res.sendFile(path.join(DIR, 'assets', f))
})

paginas.get('/img/:f', (req, res) => {
  const f = req.params.f
  if (!/^(qr\.png|segunda\.jpg|mapa\.jpg)$/.test(f)) return res.status(404).end()
  if (f === 'mapa.jpg') res.set('X-Coordenadas', COORD)
  res.set('Cache-Control', 'no-store')
  res.sendFile(path.join(DIR, 'img', f))
})

paginas.get('/:slug', async (req, res) => {
  const estado = await lerEstado()
  const slug = String(req.params.slug || '')
  const n = Object.keys(estado.slugs).find((k) => estado.slugs[k] === slug)
  if (!n) {
    res.status(404)
    res.set('Cache-Control', 'no-store')
    return res.send(render('nao-existe.html', { '{{CODIGO}}': estado.codigo5 }))
  }

  const etapa = Number(n)
  const trocas = { '{{ETAPA}}': String(etapa) }

  if (etapa === 1) {
    const frase = 'a chave desta etapa e ' + estado.codigo1
    trocas['{{B64}}'] = Buffer.from(frase, 'utf8').toString('base64')
  }
  if (etapa === 4) {
    trocas['{{COOKIE}}'] = Buffer.from(estado.codigo4, 'utf8').toString('base64')
  }
  if (etapa === 5) {
    trocas['{{CODIGO}}'] = estado.codigo5
  }
  if (etapa === 6) {
    trocas['{{BINARIO}}'] = binarioEmLinhas('coloque isto na consola: xalana')
  }

  res.set('Cache-Control', 'no-store')
  res.send(render('etapa' + etapa + '.html', trocas))
})

module.exports = { enigmaRouter: router, enigmaPaginas: paginas }
