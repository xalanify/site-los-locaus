/* ============================================================
   Import do Battlefield 6 a partir de uma página guardada do
   tracker.gg ("Guardar como…" no browser).
   ------------------------------------------------------------
   O tracker renderiza os números no HTML; extraímos os rótulos
   principais e guardamos um snapshot normalizado em bf_snapshot.
   ============================================================ */

const limparHtml = (html) =>
  String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()

const numero = (v) => {
  const limpo = String(v || '').replace(/[^\d.,-]/g, '')
  if (!limpo) return null
  if (limpo.includes('.') && limpo.includes(',')) {
    return Number(limpo.replace(/\./g, '').replace(',', '.'))
  }
  if (limpo.includes(',')) {
    const partes = limpo.split(',')
    if (partes.length === 2 && partes[1].length === 3 && partes[0].length <= 3) {
      return Number(partes.join(''))
    }
    return Number(limpo.replace(',', '.'))
  }
  return Number(limpo)
}

const primeiro = (texto, regex) => {
  const m = texto.match(regex)
  return m ? numero(m[1]) : null
}

const textoEntre = (texto, regex) => {
  const m = texto.match(regex)
  return m ? String(m[1] || '').trim() : null
}

const segundosDe = (h, m) => {
  const horas = Number(h) || 0
  const minutos = Number(m) || 0
  return horas * 3600 + minutos * 60
}

function extrairClasse(texto, nome) {
  const re = new RegExp(
    `${nome}\\s+Time Played\\s+(?:(\\d+)h\\s*)?(?:(\\d+)m)?\\s*KDA\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)`,
    'i',
  )
  const m = texto.match(re)
  if (!m) return null
  return {
    key: `kit_${nome.toLowerCase()}`,
    name: nome,
    stats: {
      timePlayed: segundosDe(m[1], m[2]),
      kdaRatio: numero(m[3]),
      kills: numero(m[4]),
      deaths: numero(m[5]),
      assists: numero(m[6]),
    },
  }
}

function extrairArma(texto, nome) {
  const re = new RegExp(`${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+Kills\\s+([\\d.,]+)`, 'i')
  const m = texto.match(re)
  return m ? { name: nome, kills: numero(m[1]) } : null
}

function parseBattlefield(html) {
  const texto = limparHtml(html)
  if (!texto) return { ok: false, erro: 'Ficheiro vazio.' }

  const profileId = textoEntre(html, /\/bf6\/profile\/(\d+)/i) || textoEntre(texto, /\/bf6\/profile\/(\d+)/i)
  const handle =
    textoEntre(html, /<title>([^<]+?)(?:'s|’s)\s+Battlefield 6/i) ||
    textoEntre(texto, /^(.+?)(?:'s|’s)\s+Battlefield 6/i) ||
    'Jogador'

  const matchesPlayed = primeiro(texto, /Overview\s+([\d.,]+)\s+Matches Played/i)
  if (matchesPlayed == null) {
    return { ok: false, erro: 'Não encontrei os números do Battlefield. Guarda a página do perfil (Overview) no tracker.gg.' }
  }

  const tempo = texto.match(/Matches Played\s*\/\/\s*(?:(\d+)h\s*)?(?:(\d+)m)?\s*Playtime/i)
  const timePlayed = tempo ? segundosDe(tempo[1], tempo[2]) : null

  const overview = {
    careerPlayerRank: primeiro(texto, /Current Level\s+([\d.,]+)/i),
    matchesPlayed,
    matchesWon: primeiro(texto, /\bWins\s+([\d.,]+)/i),
    matchesLost: primeiro(texto, /\bLosses\s+([\d.,]+)/i),
    timePlayed,
    kills: primeiro(texto, /Player Kills\s+([\d.,]+)/i),
    deaths: primeiro(texto, /\bDeaths\s+([\d.,]+)/i),
    assists: primeiro(texto, /\bAssists\s+([\d.,]+)/i),
    revives: primeiro(texto, /\bRevives\s+([\d.,]+)/i),
    objectivesCaptured: primeiro(texto, /Objectives Captured\s+([\d.,]+)/i),
    objectivesDestroyed: primeiro(texto, /Objectives Destroyed\s+([\d.,]+)/i),
    scorePerMinute: primeiro(texto, /Score\/Min\s+([\d.,]+)/i),
    kdRatio: primeiro(texto, /Player K\/D\s+([\d.,]+)/i) ?? primeiro(texto, /\bK\/D\s+([\d.,]+)/i),
    wlPercentage: primeiro(texto, /Win %\s+([\d.,]+)\s*%/i),
    killsPerMinute: primeiro(texto, /Kills\/Min\s+([\d.,]+)/i),
    headshotPercentage: primeiro(texto, /HS%\s+([\d.,]+)\s*%/i),
    damagePerMinute: primeiro(texto, /Dmg\/Min\s+([\d.,]+)/i),
    objectiveTimePct: primeiro(texto, /Obj Time %\s+([\d.,]+)\s*%/i),
  }

  const kits = ['Recon', 'Support', 'Assault', 'Engineer']
    .map((n) => extrairClasse(texto, n))
    .filter(Boolean)
  const armas = ['M433', 'M2010 ESR', 'M4A1']
    .map((n) => extrairArma(texto, n))
    .filter(Boolean)

  return {
    ok: true,
    dados: {
      source: 'tracker.gg',
      game: 'bf6',
      handle,
      profileId: profileId || null,
      avatar: null,
      updated: new Date().toISOString(),
      overview,
      modes: [],
      kits,
      weapons: armas,
      matches: [],
      matchesSupported: false,
    },
  }
}

module.exports = { parseBattlefield, limparHtml }
