// ============================================================
//  Migração SÓ de fotos (avatares, chat, posts e capas)
//
//  Como usar:
//      node server/migrar-fotos.js
//
//  Funciona de duas maneiras:
//    • com R2_* configurado  -> guarda no Cloudflare R2
//    • sem R2_* configurado  -> guarda na base de dados (Postgres)
//
//  Não mexe em cartas, mercado nem em qualquer outro dado.
//  Pode ser corrido várias vezes: só copia o que falta.
// ============================================================
require('dotenv').config({ path: __dirname + '/.env' })

const { getDb } = require('./database')
const storage = require('./storage')

const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '')

function partesSupabase(url) {
  const m = String(url || '').match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/)
  if (!m) return null
  return { bucket: decodeURIComponent(m[1]), nome: decodeURIComponent(m[2]) }
}

async function descarregar(url) {
  const r = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY || '',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY || ''}`,
    },
  })
  if (!r.ok) {
    return { ok: false, status: r.status, corpo: (await r.text()).slice(0, 140) }
  }
  const tipo = r.headers.get('content-type') || 'application/octet-stream'
  const bytes = Buffer.from(await r.arrayBuffer())
  return { ok: true, tipo, bytes }
}

async function copiar(url) {
  const p = partesSupabase(url)
  if (!p) return { ok: false, motivo: 'não é um URL do Supabase Storage' }

  // Já está na base de dados? Então não volta a descarregar.
  const ja = await storage.ler(p.bucket, p.nome)
  if (ja) {
    return { ok: true, url: storage.publicUrl(p.bucket, p.nome), jaExistia: true }
  }

  const real = await descarregar(url)
  if (!real.ok) {
    return {
      ok: false,
      motivo: `HTTP ${real.status}${real.status === 402 ? ' — quota do Supabase excedida' : ''}`,
      corpo: real.corpo,
    }
  }

  const nova = await storage.upload(p.bucket, p.nome, real.bytes, real.tipo)
  return { ok: true, url: nova }
}

async function migrarTabela({ tabela, coluna, chave = 'id', onde }) {
  const db = getDb()
  const linhas = await db
    .prepare(`SELECT ${chave} AS id, ${coluna} AS url FROM ${tabela} WHERE ${onde}`)
    .all()
  let copiadas = 0
  let falhas = 0

  for (const linha of linhas) {
    const r = await copiar(linha.url)
    if (!r.ok) {
      falhas++
      console.log(`  ${tabela} ${linha.id}: ${r.motivo}`)
      continue
    }
    if (r.url && r.url !== linha.url) {
      await db
        .prepare(`UPDATE ${tabela} SET ${coluna} = ? WHERE ${chave} = ?`)
        .run(r.url, linha.id)
    }
    copiadas++
    console.log(`  ${tabela} ${linha.id}: OK${r.jaExistia ? ' (já estava)' : ''}`)
  }

  return { copiadas, falhas, total: linhas.length }
}

async function main() {
  const destino = storage.podeUploadDireto() ? 'Cloudflare R2' : 'base de dados (Postgres)'
  console.log(`Destino: ${destino}`)
  console.log('')

  const resumo = {}

  resumo.avatares = await migrarTabela({
    tabela: 'user_profiles',
    coluna: 'avatar_url',
    chave: 'user_id',
    onde: "avatar_url LIKE '%supabase.co/storage%'",
  })

  resumo.chat = await migrarTabela({
    tabela: 'chat_messages',
    coluna: 'media_url',
    onde: "media_url LIKE '%supabase.co/storage%'",
  }).catch((e) => ({ erro: e.message, copiadas: 0, falhas: 0, total: 0 }))

  resumo.posts = await migrarTabela({
    tabela: 'posts',
    coluna: 'image_url',
    onde: "image_url LIKE '%supabase.co/storage%'",
  }).catch((e) => ({ erro: e.message, copiadas: 0, falhas: 0, total: 0 }))

  resumo.capas = await migrarTabela({
    tabela: 'clips',
    coluna: 'thumb',
    onde: "thumb LIKE '%supabase.co/storage%'",
  }).catch((e) => ({ erro: e.message, copiadas: 0, falhas: 0, total: 0 }))

  console.log('')
  console.log('Resumo:', JSON.stringify(resumo, null, 2))

  const falhas = Object.values(resumo).reduce((n, x) => n + (Number(x.falhas) || 0), 0)
  if (falhas > 0) {
    console.log(
      '\nAlguns ficheiros não puderam ser lidos do Supabase (normalmente HTTP 402 — quota de egress).' +
        '\nNão é preciso ninguém voltar a subir fotos: corre este script outra vez quando a quota reiniciar' +
        ' ou depois de passares o Supabase para Pro durante a migração.',
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Erro na migração:', e.message)
    process.exit(1)
  })
