/* Tempo relativo em português — “agora”, “há 3 min”, “há 2 h”, “ontem”…
   Recebe uma data ISO (ou Date) e devolve texto curto para as listas. */
export function tempoRelativo(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'agora'
  if (seg < 3600) {
    const m = Math.floor(seg / 60)
    return `há ${m} min`
  }
  if (seg < 86400) {
    const h = Math.floor(seg / 3600)
    return `há ${h} h`
  }
  if (seg < 86400 * 2) return 'ontem'
  if (seg < 86400 * 7) return `há ${Math.floor(seg / 86400)} dias`
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

/* “Visto há 3 min” / “Visto ontem” / “Nunca entrou” */
export function vistoPorUltimo(iso) {
  const t = tempoRelativo(iso)
  return t ? `Visto ${t}` : 'Nunca entrou'
}
