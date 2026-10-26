import { useEffect, useState } from 'react'
import { authHeaders, userToken } from '../lib/auth'

/* ============================================================
   Contador de mensagens por ler do Chat geral.
   - O servidor guarda até onde cada conta já leu.
   - Atualiza a cada 15 s e quando a página volta a ficar visível.
   - O ChatPage avisa quando marca mensagens como lidas
     (evento "locaus:chat-lido") e o número volta a zero.
   ============================================================ */
export default function useChatNaoLidas(ativo = true) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!ativo || !userToken()) {
      setCount(0)
      return undefined
    }
    let vivo = true

    const carregar = async () => {
      if (document.hidden) return
      try {
        const r = await fetch('/api/chat/nao-lidas', { headers: authHeaders() })
        if (!r.ok) return
        const d = await r.json().catch(() => null)
        if (vivo) setCount(Number(d && d.count) || 0)
      } catch {
        /* rede intermitente */
      }
    }

    carregar()
    const t = setInterval(carregar, 15000)
    const aoLido = () => setCount(0)
    const aoVisivel = () => {
      if (!document.hidden) carregar()
    }
    window.addEventListener('locaus:chat-lido', aoLido)
    document.addEventListener('visibilitychange', aoVisivel)

    return () => {
      vivo = false
      clearInterval(t)
      window.removeEventListener('locaus:chat-lido', aoLido)
      document.removeEventListener('visibilitychange', aoVisivel)
    }
  }, [ativo])

  return count
}
