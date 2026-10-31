import { MICE } from '../data/mice'

/* ============================================================
   Rato do perfil — encontra a marca e o logo a partir do que
   está guardado. Serve para mostrar sempre "Marca Modelo",
   mesmo quando o perfil antigo só tem o modelo.
   ============================================================ */

export function infoRato(valor) {
  const s = String(valor || '').trim()
  if (!s) return null
  const low = s.toLowerCase()

  return (
    MICE.find((m) => `${m.brand} ${m.model}`.toLowerCase() === low) ||
    MICE.find((m) => m.model.toLowerCase() === low) ||
    MICE.find((m) => low.startsWith(String(m.brand).toLowerCase())) ||
    MICE.find((m) => low.includes(m.model.toLowerCase())) ||
    null
  )
}

export function nomeRato(valor) {
  const s = String(valor || '').trim()
  if (!s) return ''
  const info = infoRato(s)
  if (!info) return s
  if (s.toLowerCase().startsWith(String(info.brand).toLowerCase())) return s
  return `${info.brand} ${s}`
}

export function logoRato(valor) {
  return infoRato(valor)?.logo || null
}
