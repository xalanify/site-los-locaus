/* ============================================================
   LOCAUS.FUN :: ENIGMA 2 — PROTOCOLO ORION
   ------------------------------------------------------------
   5 etapas, cada uma com DUAS pistas (desafio a desafio) até à
   palavra-chave final. Chaves únicas por jogador.
   Mecânicas: Base64, texto invisível, metadados de imagem,
   coordenadas, comentários HTML, César, Morse, links e 404.
   ============================================================ */

const express = require('express')
const crypto = require('crypto')
const { getDb } = require('../database')
const { attachAuth } = require('../middleware/auth')
const { gerarPngCifra } = require('../enigma-png')

const router = express.Router()

const ADMIN = ['xalana']
const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const PREMIOS = [40, 30, 25, 20, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const PALAVRAS = ['VEGA', 'ORION', 'LYRA', 'NOVA', 'ATLAS', 'SIRIUS', 'RIGEL', 'ALTAIR']
const LUGARES = [
  { nome: 'GIZÉ', lat: 29.9792, lon: 31.1342 },
  { nome: 'PARIS', lat: 48.8584, lon: 2.2945 },
  { nome: 'ROMA', lat: 41.8902, lon: 12.4922 },
  { nome: 'LONDRES', lat: 51.5007, lon: -0.1246 },
  { nome: 'TÓQUIO', lat: 35.6586, lon: 139.7454 },
  { nome: 'ATENAS', lat: 37.9715, lon: 23.7267 },
]
const PALAVRAS_LISTA = [
  'ALFA', 'BETA', 'GAMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'TETA', 'IOTA', 'CAPA',
  'LAMBDA', 'MI', 'NI', 'XI', 'OMICRON', 'PI', 'RO', 'SIGMA', 'TAU', 'UPSILON',
  'FI', 'CHI', 'PSI', 'OMEGA', 'COMETA', 'NEBULOSA', 'QUASAR', 'PULSAR', 'ORBITA', 'ECLIPSE',
]

const rand = (n) => crypto.randomBytes(n).toString('hex')
const sorteia = (n) => {
  let s = ''
  const b = crypto.randomBytes(n)
  for (let i = 0; i < n; i++) s += ALFABETO[b[i] % ALFABETO.length]
  return s
}
const b64 = (t) => Buffer.from(String(t), 'utf8').toString('base64')
const escolhe = (arr) => arr[Math.floor(Math.random() * arr.length)]

function caesar(texto, n) {
  return String(texto)
    .split('')
    .map((c) => {
      const upper = c >= 'A' && c <= 'Z'
      const lower = c >= 'a' && c <= 'z'
      if (!upper && !lower) return c
      const base = upper ? 65 : 97
      return String.fromCharCode(((c.charCodeAt(0) - base + n + 26) % 26) + base)
    })
    .join('')
}

const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
}

/* ------------------------------------------------------------
   Tabela
   ------------------------------------------------------------ */
let tabela = null
async function garantirTabela() {
  if (!tabela) {
    tabela = getDb()
      .prepare(
        `CREATE TABLE IF NOT EXISTS public.enigma2_jogadores (
           user_id bigint primary key,
           dados text not null,
           etapa int not null default 1,
           iniciado_em timestamptz not null default now(),
           concluido_em timestamptz,
           posicao int,
           moedas int not null default 0,
           tentativas int not null default 0
         )`,
      )
      .run()
  }
  await tabela
}

/* ------------------------------------------------------------
   Estado novo (2 pistas por etapa)
   ------------------------------------------------------------ */
function gerarChave(palavra, usadas) {
  let chave = ''
  let voltas = 0
  do {
    chave = `${palavra}-${sorteia(4)}`
    voltas += 1
  } while (usadas.has(norm(chave)) && voltas < 300)
  usadas.add(norm(chave))
  return chave
}

function novoEstado(uid, usadas = new Set()) {
  /* as palavras também não se repetem dentro do mesmo jogador */
  const baralho = [...PALAVRAS].sort(() => Math.random() - 0.5)
  const p1 = baralho[0]
  const p3 = baralho[1]
  const p4 = baralho[2]

  const lugar = escolhe(LUGARES)

  const numero = 5 + Math.floor(Math.random() * 20)
  const p5 = PALAVRAS_LISTA[numero - 1]

  const s1 = gerarChave(p1, usadas).split('-')[1]
  const s2 = gerarChave(lugar.nome, usadas).split('-')[1]
  const desloc = 3 + Math.floor(Math.random() * 10)
  const s3 = gerarChave(p3, usadas).split('-')[1]
  const s4 = gerarChave(p4, usadas).split('-')[1]

  /* etapa 4: mensagem em binário com a chave completa no meio */
  const chave4 = `${p4}-${s4}`
  const mensagem4 = `PROTOCOLO ORION // SINAL RECEBIDO // A CHAVE DESTA ETAPA E ${chave4} // REPETE O SINAL PARA CONFIRMAR // FIM`
  const binario4 = Array.from(Buffer.from(mensagem4, 'utf8'))
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ')
  const s5 = gerarChave(p5, usadas).split('-')[1]

  return {
    uid,
    etapas: {
      1: { palavra: p1, sufixo: s1, chave: `${p1}-${s1}` },
      2: { palavra: lugar.nome, sufixo: s2, chave: `${lugar.nome}-${s2}` },
      3: { palavra: p3, sufixo: s3, chave: `${p3}-${s3}` },
      4: { palavra: p4, sufixo: s4, chave: `${p4}-${s4}` },
      5: { palavra: p5, sufixo: s5, chave: `${p5}-${s5}` },
    },
    puzzles: {
      1: { b64: b64(p1) },
      2: { lat: lugar.lat, lon: lugar.lon },
      3: { deslocamento: desloc, cifra: caesar(p3, desloc) },
      4: { binario: binario4 },
      5: { numero },
    },
    tokens: {
      2: rand(16),
      3: rand(16),
      4: rand(16),
      5: rand(16),
    },
    criado: Date.now(),
  }
}

async function carregar(uid) {
  await garantirTabela()
  const row = await getDb()
    .prepare('SELECT * FROM public.enigma2_jogadores WHERE user_id = ?')
    .get(uid)
  if (!row) return null
  let dados = null
  try {
    dados = JSON.parse(row.dados)
  } catch {
    dados = null
  }
  /* jogadores criados antes de existir token de uma etapa: completa agora */
  if (dados && dados.tokens) {
    let mudou = false
    for (const k of [2, 3, 4, 5]) {
      if (!dados.tokens[k]) {
        dados.tokens[k] = rand(16)
        mudou = true
      }
    }
    if (mudou) {
      try {
        await getDb()
          .prepare('UPDATE public.enigma2_jogadores SET dados = ? WHERE user_id = ?')
          .run(JSON.stringify(dados), uid)
      } catch (e) {
        console.error('[enigma2] tokens:', e.message)
      }
    }
  }
  return { row, dados }
}

async function ehAdminConta(uid, nome) {
  if (ADMIN.includes(norm(nome))) return true
  try {
    const u = await getDb().prepare('SELECT is_admin, username FROM users WHERE id = ?').get(uid)
    return Boolean(u && (u.is_admin || ADMIN.includes(norm(u.username))))
  } catch {
    return false
  }
}

const chaveDe = (dados, etapa) => dados.etapas[etapa].chave
const sufixoDe = (dados, etapa) => dados.etapas[etapa].sufixo

function payloadEtapa(dados, etapa) {
  if (!dados || !dados.etapas || !dados.etapas[etapa]) return null

  if (etapa === 1) {
    return {
      tipo: 'sinal',
      b64: dados.puzzles[1].b64,
      sufixo: sufixoDe(dados, 1),
      texto: 'Duas pistas: um código em Base64 e uma frase escondida na cor do fundo.',
    }
  }
  if (etapa === 2) {
    return {
      tipo: 'orbita',
      imagem: `/api/enigma2/imagem/${dados.tokens[2]}/a_ultima_resposta_esta_no_inicio.svg`,
      sufixoPista: 'os metadados do ficheiro',
    }
  }
  if (etapa === 3) {
    return {
      tipo: 'cifra',
      download: `/api/enigma2/cifra/${dados.tokens[3]}/orion.png`,
    }
  }
  if (etapa === 4) {
    return {
      tipo: 'binario',
      binario: dados.puzzles[4].binario,
    }
  }
  if (etapa === 5) {
    return {
      tipo: 'horizonte',
      pagina: `/api/enigma2/pagina/${dados.tokens[5]}`,
      lista: PALAVRAS_LISTA,
    }
  }
  return null
}

async function estadoPublico(uid) {
  const c = await carregar(uid)
  if (!c || !c.dados) return { iniciado: false }
  const { row, dados } = c
  if (row.concluido_em) {
    const admin = await ehAdminConta(uid, '')
    return {
      iniciado: true,
      concluido: true,
      admin,
      posicao: row.posicao || null,
      moedas: row.moedas || 0,
      etapa: 6,
      payload: null,
    }
  }
  return {
    iniciado: true,
    concluido: false,
    etapa: row.etapa,
    tentativas: row.tentativas,
    payload: payloadEtapa(dados, row.etapa),
  }
}

/* ------------------------------------------------------------
   Rotas de estado
   ------------------------------------------------------------ */
router.get('/estado', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ error: 'Sessão não iniciada' })
  try {
    res.json(await estadoPublico(Number(req.auth.uid)))
  } catch (e) {
    console.error('[enigma2] estado:', e.message)
    res.status(500).json({ error: 'Não consegui ler o estado.' })
  }
})

router.post('/iniciar', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ error: 'Sessão não iniciada' })
  const uid = Number(req.auth.uid)
  try {
    await garantirTabela()
    const db = getDb()
    const existe = await db
      .prepare('SELECT user_id FROM public.enigma2_jogadores WHERE user_id = ?')
      .get(uid)
    if (!existe) {
      /* chaves de TODOS os outros jogadores: nenhuma se repete */
      const usadas = new Set()
      const outras = await db.prepare('SELECT dados FROM public.enigma2_jogadores').all()
      for (const r of outras) {
        try {
          const d = JSON.parse(r.dados)
          for (let e = 1; e <= 5; e++) {
            const k = d.etapas && d.etapas[e] && d.etapas[e].chave
            if (k) usadas.add(norm(k))
          }
        } catch {
          /* ignora */
        }
      }
      const dadosNovos = novoEstado(uid, usadas)
      await db
        .prepare(
          'INSERT INTO public.enigma2_jogadores (user_id, dados, etapa) VALUES (?, ?, 1) ON CONFLICT (user_id) DO NOTHING',
        )
        .run(uid, JSON.stringify(dadosNovos))
    }
    res.json(await estadoPublico(uid))
  } catch (e) {
    console.error('[enigma2] iniciar:', e.message)
    res.status(500).json({ error: 'Não consegui iniciar o protocolo.' })
  }
})

router.post('/responder', attachAuth, async (req, res) => {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ error: 'Sessão não iniciada' })
  const uid = Number(req.auth.uid)
  const palavra = norm(req.body && req.body.palavra)
  if (!palavra) return res.status(400).json({ error: 'Escreve a palavra-chave.' })

  try {
    const c = await carregar(uid)
    if (!c || !c.dados) return res.status(400).json({ error: 'Inicia o protocolo primeiro.' })
    if (c.row.concluido_em) {
      return res.json({
        concluido: true,
        admin: await ehAdminConta(uid, req.auth.username),
        posicao: c.row.posicao,
        moedas: c.row.moedas,
      })
    }

    const etapa = Number(c.row.etapa)
    const certa = norm(chaveDe(c.dados, etapa))

    if (palavra === certa) {
      const db = getDb()
      if (etapa >= 5) {
        const admin = await ehAdminConta(uid, req.auth.username)
        if (admin) {
          /* admin/dev: termina, mas não entra na classificação nem recebe nada */
          await db
            .prepare(
              'UPDATE public.enigma2_jogadores SET etapa = 6, concluido_em = now(), posicao = NULL, moedas = 0 WHERE user_id = ?',
            )
            .run(uid)
          return res.json({ concluido: true, admin: true, posicao: null, moedas: 0 })
        }

        /* só contam os jogadores normais já concluídos */
        const posicao =
          Number(
            (
              await db
                .prepare(
                  `SELECT count(*)::int AS n
                   FROM public.enigma2_jogadores j
                   JOIN users u ON u.id = j.user_id
                   WHERE j.concluido_em IS NOT NULL
                     AND NOT u.is_admin
                     AND lower(u.username) <> 'xalana'`,
                )
                .get()
            ).n || 0,
          ) + 1
        const moedas = PREMIOS[posicao - 1] || 1
        const pagar = true
        await db
          .prepare(
            'UPDATE public.enigma2_jogadores SET etapa = 6, concluido_em = now(), posicao = ?, moedas = ? WHERE user_id = ?',
          )
          .run(posicao, moedas, uid)
        if (pagar) {
          try {
            await db
              .prepare('INSERT INTO mercado_ledger (user_id, valor, motivo) VALUES (?, ?, ?)')
              .run(uid, moedas, `enigma2:${posicao}`)
          } catch (e) {
            console.error('[enigma2] prémio:', e.message)
          }
          if (posicao === 1) {
            try {
              await db
                .prepare(
                  `INSERT INTO public.cosmeticos_compras (user_id, item_id, tipo, custo)
                   VALUES (?, 'carta-enigma2', 'carta', 0)
                   ON CONFLICT (user_id, item_id) DO NOTHING`,
                )
                .run(uid)
            } catch (e) {
              console.error('[enigma2] carta do vencedor:', e.message)
            }
          }
        }
        return res.json({ concluido: true, admin: false, posicao, moedas })
      }

      await db
        .prepare('UPDATE public.enigma2_jogadores SET etapa = ?, tentativas = 0 WHERE user_id = ?')
        .run(etapa + 1, uid)
      const atual = await carregar(uid)
      return res.json({
        concluido: false,
        etapa: etapa + 1,
        payload: payloadEtapa(atual.dados, etapa + 1),
      })
    }

    /* chave de outro jogador? */
    const outras = await getDb()
      .prepare('SELECT user_id, dados FROM public.enigma2_jogadores WHERE user_id <> ?')
      .all(uid)
    for (const o of outras) {
      try {
        const d = JSON.parse(o.dados)
        const chave = d.etapas && d.etapas[etapa] && d.etapas[etapa].chave
        if (chave && norm(chave) === palavra) {
          return res.json({
            erro: 'Achas mesmo que ia funcionar... As chaves não são iguais para todos.',
            troll: true,
          })
        }
      } catch {
        /* ignora */
      }
    }

    await getDb()
      .prepare('UPDATE public.enigma2_jogadores SET tentativas = tentativas + 1 WHERE user_id = ?')
      .run(uid)
    res.json({ erro: 'Palavra-chave errada. Junta as duas pistas da etapa.' })
  } catch (e) {
    console.error('[enigma2] responder:', e.message)
    res.status(500).json({ error: 'O sinal falhou. Tenta outra vez.' })
  }
})

/* ------------------------------------------------------------
   Imagem com metadados (etapa 2)
   ------------------------------------------------------------ */
const esc = (t) =>
  String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function estrelasSvg(w, h, n = 70) {
  let out = ''
  for (let i = 0; i < n; i++) {
    out += `<circle cx="${(Math.random() * w).toFixed(1)}" cy="${(Math.random() * h).toFixed(1)}" r="${(0.5 + Math.random() * 1.4).toFixed(2)}" fill="#dfe8ff" opacity="${(0.25 + Math.random() * 0.6).toFixed(2)}"/>`
  }
  return out
}

router.get('/imagem/:token/:ficheiro?', async (req, res) => {
  try {
    const token = String(req.params.token || '')
    if (!/^[a-f0-9]{16,64}$/.test(token)) return res.status(404).end()
    const rows = await getDb().prepare('SELECT dados FROM public.enigma2_jogadores').all()
    for (const r of rows) {
      let d = null
      try {
        d = JSON.parse(r.dados)
      } catch {
        continue
      }
      if (!d || !d.tokens || d.tokens[2] !== token) continue

      const meta = `${d.puzzles[2].lat}, ${d.puzzles[2].lon} | sufixo ${sufixoDe(d, 2)}`
      const nomeFicheiro = 'a_ultima_resposta_esta_no_inicio.svg'

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560" font-family="'JetBrains Mono',ui-monospace,monospace">
  <title>${nomeFicheiro}</title>
  <desc>METADADOS: ${esc(meta)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070a16"/><stop offset="0.6" stop-color="#04060f"/><stop offset="1" stop-color="#02040a"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="0%" r="80%">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.28"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="960" height="560" fill="url(#bg)"/>
  <rect width="960" height="560" fill="url(#halo)"/>
  ${estrelasSvg(960, 560)}
  <rect x="10" y="10" width="940" height="540" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.12"/>
  <text x="40" y="58" fill="#22d3ee" font-size="15" letter-spacing="4">PROTOCOLO ORION</text>
  <text x="40" y="84" fill="#ffffff" font-size="12" letter-spacing="2" opacity="0.45">MAPA ORBITAL · ÓRBITA QUEBRADA</text>
  <line x1="40" y1="100" x2="920" y2="100" stroke="#ffffff" stroke-opacity="0.12"/>
  <circle cx="300" cy="330" r="140" fill="none" stroke="#8b5cf6" stroke-opacity="0.35"/>
  <circle cx="300" cy="330" r="96" fill="none" stroke="#8b5cf6" stroke-opacity="0.25"/>
  <circle cx="300" cy="330" r="52" fill="#22d3ee" opacity="0.6"/>
  <circle cx="396" cy="330" r="8" fill="#ffffff"/>
  <text x="60" y="520" fill="#6f7b98" font-size="12">nem tudo o que vês está no ecrã</text>
  <text x="600" y="200" fill="#9aa6c4" font-size="14">a imagem tem memória.</text>
  <text x="600" y="232" fill="#6f7b98" font-size="13">vê os metadados do ficheiro.</text>
</svg>`
      res.set('Content-Type', 'image/svg+xml; charset=utf-8')
      res.set('Cache-Control', 'no-store')
      return res.send(svg)
    }
    res.status(404).end()
  } catch (e) {
    console.error('[enigma2] imagem:', e.message)
    res.status(500).end()
  }
})

/* ------------------------------------------------------------
   Áudio Morse (etapa 4)
   ------------------------------------------------------------ */
function wavMorse(palavra) {
  const sr = 8000
  const ponto = 0.11
  const traco = 0.33
  const freq = 620
  const amostras = []
  const silencio = (seg) => {
    const n = Math.round(seg * sr)
    for (let i = 0; i < n; i++) amostras.push(0)
  }
  const tom = (seg) => {
    const n = Math.round(seg * sr)
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const env = Math.min(1, Math.min(i, n - i) / (sr * 0.01))
      amostras.push(Math.sin(2 * Math.PI * freq * t) * 0.35 * env)
    }
  }

  silencio(0.4)
  for (const ch of String(palavra).toUpperCase()) {
    const codigo = MORSE[ch]
    if (!codigo) continue
    for (let i = 0; i < codigo.length; i++) {
      tom(codigo[i] === '.' ? ponto : traco)
      if (i < codigo.length - 1) silencio(ponto)
    }
    silencio(0.3)
  }
  silencio(0.6)

  const n = amostras.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sr, 24)
  buf.writeUInt32LE(sr * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, amostras[i])) * 32767), 44 + i * 2)
  }
  return buf
}

router.get('/audio/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '')
    if (!/^[a-f0-9]{16,64}$/.test(token)) return res.status(404).end()
    const rows = await getDb().prepare('SELECT dados FROM public.enigma2_jogadores').all()
    for (const r of rows) {
      let d = null
      try {
        d = JSON.parse(r.dados)
      } catch {
        continue
      }
      if (!d || !d.tokens || d.tokens[4] !== token) continue
      res.set('Content-Type', 'audio/wav')
      res.set('Cache-Control', 'no-store')
      return res.send(wavMorse(d.puzzles[4].morse))
    }
    res.status(404).end()
  } catch (e) {
    console.error('[enigma2] audio:', e.message)
    res.status(500).end()
  }
})

/* ------------------------------------------------------------
   Páginas secretas (etapas 4 e 5) + 404 com pista
   ------------------------------------------------------------ */
router.get('/pagina/:token', async (req, res) => {
  const token = String(req.params.token || '')
  const html = (titulo, corpo) => `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(900px 500px at 20% 0%,#171034,#05060f 60%);color:#e9edf7;font-family:'JetBrains Mono',ui-monospace,monospace}
  main{max-width:680px;padding:40px 24px;text-align:center}
  h1{font-size:15px;letter-spacing:5px;color:#22d3ee;text-transform:uppercase}
  p{line-height:1.8;color:#aab4cf;font-size:15px}
  b{color:#fff}
  .k{display:inline-block;margin-top:18px;padding:14px 22px;border:1px solid #8b5cf6;border-radius:12px;font-size:26px;letter-spacing:4px;color:#fff}
  a{color:#c4b5fd}
</style></head><body><main>${corpo}</main></body></html>`

  try {
    if (!/^[a-f0-9]{16,64}$/.test(token)) {
      return res
        .status(404)
        .type('html')
        .send(
          html(
            '404',
            '<h1>Não devias ter chegado aqui</h1><p>Mas já que chegaste... <b>procura 23</b>.</p><p><a href="/enigmas">voltar</a></p>',
          ),
        )
    }
    const rows = await getDb().prepare('SELECT dados FROM public.enigma2_jogadores').all()
    for (const r of rows) {
      let d = null
      try {
        d = JSON.parse(r.dados)
      } catch {
        continue
      }
      if (!d || !d.tokens) continue

      if (d.tokens[4] === token) {
        return res.type('html').send(
          html(
            'memória',
            `<h1>memória</h1>
             <p>Nem tudo o que desaparece se perde.</p>
             <p>A segunda metade da chave é:</p>
             <span class="k">${esc(sufixoDe(d, 4))}</span>
             <p>Junta à palavra do áudio: <b>PALAVRA-SUFIXO</b>.</p>`,
          ),
        )
      }
      if (d.tokens[5] === token) {
        return res.type('html').send(
          html(
            'horizonte',
            `<h1>horizonte de eventos</h1>
             <p>Não devias ter chegado aqui. Mas já que chegaste: <b>procura ${d.puzzles[5].numero}</b>.</p>
             <p>A segunda metade da chave é:</p>
             <span class="k">${esc(sufixoDe(d, 5))}</span>
             <p>Na lista da etapa, o número ${d.puzzles[5].numero} é a palavra.</p>`,
          ),
        )
      }
    }
    res
      .status(404)
      .type('html')
      .send(
        html(
          '404',
          '<h1>Não devias ter chegado aqui</h1><p>Mas já que chegaste... <b>procura 23</b>.</p>',
        ),
      )
  } catch (e) {
    console.error('[enigma2] pagina:', e.message)
    res.status(500).end()
  }
})

/* ------------------------------------------------------------
   Classificação
   ------------------------------------------------------------ */
router.get('/tabela', async (req, res) => {
  try {
    await garantirTabela()
    const rows = await getDb()
      .prepare(
        `SELECT j.user_id, u.username, u.is_admin, j.etapa, j.iniciado_em, j.concluido_em,
                j.posicao, j.moedas
         FROM public.enigma2_jogadores j
         JOIN users u ON u.id = j.user_id
         ORDER BY (u.is_admin OR lower(u.username) = 'xalana') ASC,
                  (j.concluido_em IS NULL) ASC NULLS LAST,
                  j.posicao ASC NULLS LAST,
                  j.etapa DESC,
                  j.iniciado_em ASC
         LIMIT 100`,
      )
      .all()

    const lista = rows.map((r) => {
      const concluido = Boolean(r.concluido_em)
      const admin = Boolean(r.is_admin) || norm(r.username) === 'xalana'
      return {
        username: r.username || 'membro',
        etapa: concluido ? 6 : Number(r.etapa) || 1,
        concluido,
        admin,
        conta: !admin,
        posicao: admin ? null : r.posicao || null,
        moedas: admin ? 0 : r.moedas || 0,
        tempoMs: concluido
          ? Math.max(0, new Date(r.concluido_em).getTime() - new Date(r.iniciado_em).getTime())
          : null,
      }
    })

    res.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60')
    res.json({ jogadores: lista })
  } catch (e) {
    console.error('[enigma2] tabela:', e.message)
    res.status(500).json({ error: 'Não consegui abrir a classificação.' })
  }
})

/* ------------------------------------------------------------
   Etapa 3 — imagem para descarregar (a cifra vive no ficheiro)
   O sufixo vai no NOME do ficheiro.
   ------------------------------------------------------------ */
router.get('/cifra/:token/:nome?', async (req, res) => {
  try {
    const token = String(req.params.token || '')
    if (!/^[a-f0-9]{16,64}$/.test(token)) return res.status(404).end()

    const rows = await getDb().prepare('SELECT dados FROM public.enigma2_jogadores').all()
    for (const r of rows) {
      let d = null
      try {
        d = JSON.parse(r.dados)
      } catch {
        continue
      }
      if (!d || !d.tokens || d.tokens[3] !== token) continue

      const palavra = d.etapas[3].palavra
      const sufixo = sufixoDe(d, 3)
      const png = gerarPngCifra(palavra)

      res.set('Content-Type', 'image/png')
      res.set('Cache-Control', 'no-store')
      res.set('Content-Disposition', `attachment; filename="orion-cifra-${sufixo}.png"`)
      return res.send(png)
    }
    res.status(404).end()
  } catch (e) {
    console.error('[enigma2] cifra:', e.message)
    res.status(500).end()
  }
})

module.exports = { enigma2Router: router }
