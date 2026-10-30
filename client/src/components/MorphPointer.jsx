import { useEffect } from 'react'

/* ============================================================
   Morphing dos botões (.ui-btn)
   ------------------------------------------------------------
   Um único listener global acompanha o ponteiro e escreve a
   posição (--mx / --my) no botão que está debaixo do rato ou do
   dedo. O CSS usa essas variáveis para desenhar o brilho radial
   que segue o cursor — a interação é em tempo real e não custa
   um listener por botão.
   ============================================================ */
export default function MorphPointer() {
  useEffect(() => {
    let ativo = null
    let frame = 0

    const pintar = (el, x, y) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      el.style.setProperty('--mx', `${x - r.left}px`)
      el.style.setProperty('--my', `${y - r.top}px`)
    }

    const mover = (e) => {
      const alvo = e.target instanceof Element ? e.target.closest('.ui-btn') : null
      if (!alvo) {
        if (ativo) {
          ativo.style.removeProperty('--mx')
          ativo.style.removeProperty('--my')
          ativo = null
        }
        return
      }
      ativo = alvo
      const { clientX: x, clientY: y } = e
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (ativo) pintar(ativo, x, y)
      })
    }

    const sair = () => {
      if (ativo) {
        ativo.style.removeProperty('--mx')
        ativo.style.removeProperty('--my')
        ativo = null
      }
    }

    window.addEventListener('pointermove', mover, { passive: true })
    window.addEventListener('pointerdown', mover, { passive: true })
    window.addEventListener('pointerleave', sair, { passive: true })
    window.addEventListener('blur', sair)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerdown', mover)
      window.removeEventListener('pointerleave', sair)
      window.removeEventListener('blur', sair)
    }
  }, [])

  return null
}
