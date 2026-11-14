import { useEffect, useState } from 'react'

/* ============================================================
   DESAFIO SABINOJR — 3 bugs + 1 bug final
   ------------------------------------------------------------
   Tudo é local ao browser da conta Sabinojr. Não mexe em dados,
   moedas, compras nem no servidor.
   ============================================================ */

export const FOTO_SIMAO =
  'https://kanqsliusuejwgqczvao.supabase.co/storage/v1/object/public/avatars/avatar-191-1793554597161-6lvci.jpg'

const CHAVE = 'locaus:desafio:sabino:v1'
const EVENTO = 'locaus:desafio'

export const souSabino = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return String(u.username || '').trim().toLowerCase() === 'sabinojr'
  } catch {
    return false
  }
}

const vazio = () => ({
  bugs: [],
  encontrados: 0,
  final: false,
  ganhou: false,
  finalAvisoVisto: false,
  winVisto: false,
})

export const lerEstado = () => {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) || '{}')
    const bugs = Array.isArray(d.bugs) ? [...new Set(d.bugs)] : []
    return {
      ...vazio(),
      ...d,
      bugs,
      encontrados: Math.min(3, bugs.length),
      final: Boolean(d.final) || bugs.length >= 3,
    }
  } catch {
    return vazio()
  }
}

const guardar = (estado) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {
    /* sem localStorage */
  }
  cacheGanhou = Boolean(estado.ganhou)
  window.dispatchEvent(new Event(EVENTO))
  return estado
}

/* cache leve para os overrides visuais (chamados muitas vezes por render) */
let cacheGanhou = null
export const desafioAtivo = () => {
  if (!souSabino()) return false
  if (cacheGanhou === null) cacheGanhou = Boolean(lerEstado().ganhou)
  return !cacheGanhou
}

export const marcarBug = (id) => {
  if (!souSabino()) return lerEstado()
  const e = lerEstado()
  if (e.ganhou || e.bugs.includes(id)) return e
  const bugs = [...e.bugs, id].slice(0, 3)
  return guardar({
    ...e,
    bugs,
    encontrados: bugs.length,
    final: bugs.length >= 3 || e.final,
  })
}

export const marcarFinalGanho = () => {
  if (!souSabino()) return lerEstado()
  return guardar({ ...lerEstado(), ganhou: true, winVisto: false })
}

export const marcarFinalAvisoVisto = () =>
  guardar({ ...lerEstado(), finalAvisoVisto: true })

export const marcarWinVisto = () =>
  guardar({ ...lerEstado(), winVisto: true })

export const useDesafioSabino = () => {
  const [estado, setEstado] = useState(() => (souSabino() ? lerEstado() : null))

  useEffect(() => {
    if (!souSabino()) {
      setEstado(null)
      return undefined
    }
    setEstado(lerEstado())
    const aoMudar = () => setEstado(souSabino() ? lerEstado() : null)
    window.addEventListener(EVENTO, aoMudar)
    window.addEventListener('storage', aoMudar)
    return () => {
      window.removeEventListener(EVENTO, aoMudar)
      window.removeEventListener('storage', aoMudar)
    }
  }, [])

  return estado
}

export const avatarDesafio = (nome, src) => {
  if (!desafioAtivo()) return src
  if (String(nome || '').trim().toLowerCase() === 'sabinojr') return FOTO_SIMAO
  return src
}

export const nomeDesafio = (nome, classes) => {
  if (!desafioAtivo()) return classes
  if (String(nome || '').trim().toLowerCase() === 'sabinojr') return 'nome-cor-rainbow'
  return classes
}

export const souEUDesafio = (nome) =>
  souSabino() && String(nome || '').trim().toLowerCase() === 'sabinojr'
