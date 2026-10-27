import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/* ============================================================
   Estado "em live" global — atualiza a cada 60 segundos.
   Qualquer componente pode pedir o estado de um membro pelo
   nome, sem fazer pedidos próprios.
   ============================================================ */
const LiveContext = createContext({ liveByUser: {}, refresh: () => {}, carregado: false })

export function LiveProvider({ children }) {
  const [lista, setLista] = useState([])
  const [carregado, setCarregado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/live', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json().catch(() => null)
      setLista(Array.isArray(d?.live) ? d.live : [])
    } catch {
      /* sem ligação — mantém o último estado */
    } finally {
      setCarregado(true)
    }
  }, [])

  useEffect(() => {
    carregar()
    const iv = setInterval(carregar, 60000)
    const aoVoltar = () => {
      if (!document.hidden) carregar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  const liveByUser = useMemo(() => {
    const mapa = {}
    for (const l of lista) {
      if (l && l.username) mapa[String(l.username).toLowerCase()] = l
    }
    return mapa
  }, [lista])

  return (
    <LiveContext.Provider value={{ liveByUser, refresh: carregar, carregado }}>
      {children}
    </LiveContext.Provider>
  )
}

export function useLive() {
  return useContext(LiveContext)
}
