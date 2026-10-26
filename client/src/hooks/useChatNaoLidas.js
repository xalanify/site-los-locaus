import { useEffect, useRef, useState } from 'react'
import { authHeaders, userToken } from '../lib/auth'
import { tocarSom } from '../lib/sons'

/* ============================================================
   Contador de mensagens por ler do Chat geral.
   - O servidor guarda até onde cada conta já leu.
   - Atualiza a cada 15 s e quando a página volta a ficar visível.
   - O ChatPage avisa quando marca mensagens como lidas
     (evento "locaus:chat-lido") e o número volta a zero.
   ============================================================ */
export default function useChatNaoLidas(ativo = true) {
  const [count, setCount] = useState(0)
  const anteriorRef = useRef(0)
  const primeiroRef = useRef(true)

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
        if (vivo) {
          const novo = Number(d && d.count) || 0
          if (primeiroRef.current) {
            primeiroRef.current = false
            anteriorRef.current = novo
          } else {
            if (
              novo > anteriorRef.current &&
              novo > 0 &&
              !window.location.pathname.startsWith('/chat')
            ) {
              tocarSom('recebido')
            }
            anteriorRef.current = novo
          }
          setCount(novo)
        }
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
