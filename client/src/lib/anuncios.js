/* ============================================================
   Anúncios de clips — visibility control
   ------------------------------------------------------------
   - X click -> hide that anúncio (guard in localStorage).
   - Older than 24h -> hide automatically (both bar + sidebar).
   ============================================================ */
const CHAVE_FECHADOS = 'locaus:anuncios-fechados'
const JANELA_MS = 24 * 60 * 60 * 1000 // 24 horas

export function anunciosFechados() {
  try {
    const l = JSON.parse(localStorage.getItem(CHAVE_FECHADOS) || '[]')
    return Array.isArray(l) ? l : []
  } catch {
    return []
  }
}

export function fecharAnuncio(id) {
  try {
    const fe = anunciosFechados()
    if (!fe.includes(String(id))) {
      fe.push(String(id))
      localStorage.setItem(CHAVE_FECHADOS, JSON.stringify(fe.slice(-40)))
    }
  } catch {
    /* sem armazenamento */
  }
}

/** Os únicos anúncios "novos": publicados há menos de 24h e não fechados. */
export function anunciosVisiveis(lista) {
  const agora = Date.now()
  const fe = new Set(anunciosFechados().map(String))
  return (Array.isArray(lista) ? lista : []).filter((p) => {
    if (!p || fe.has(String(p.id))) return false
    const t = new Date(p.created_at || '').getTime()
    if (!Number.isFinite(t)) return true // sem data -> mostra
    return agora - t < JANELA_MS
  })
}