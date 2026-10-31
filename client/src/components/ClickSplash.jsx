import { useEffect } from 'react'

/* ============================================================
   Splash do clique — uma pequena estrela de 8 raios nasce no
   cursor e desaparece. Não interfere com o clique (pointer-events
   desligado) e respeita "reduzir movimento".
   ============================================================ */
export default function ClickSplash() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    let ultimo = 0

    const criar = (x, y) => {
      const el = document.createElement('div')
      el.className = 'kova-splash'
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.innerHTML = '<i></i>'.repeat(8)
      document.body.appendChild(el)
      window.setTimeout(() => el.remove(), 560)
    }

    const aoClicar = (e) => {
      const agora = Date.now()
      if (agora - ultimo < 40) return // pointerdown + click no mesmo gesto
      ultimo = agora
      criar(e.clientX, e.clientY)
    }

    window.addEventListener('pointerdown', aoClicar, { passive: true })
    return () => window.removeEventListener('pointerdown', aoClicar)
  }, [])

  return null
}
