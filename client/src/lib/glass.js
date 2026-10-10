/* ============================================================
   Reflexo dos botões de vidro (.btn-glass)

   A luz especular dentro do botão acompanha o rato — é o que dá
   aquele efeito de "líquido" do iOS 26. Só escreve duas variáveis
   CSS no botão sob o cursor e respeita o refresh rate do ecrã
   (um pedido de animação por frame).
   ============================================================ */

let ligado = false
let pendente = null
let raf = 0

/* Mesmos botões que o CSS pinta de vidro (index.css). */
const SELETOR =
  ".btn-glass, button[class*='bg-white/10'], button[class*='border border-white/15']";

function aplicar() {
  raf = 0
  if (!pendente) return
  const { el, x, y } = pendente
  pendente = null
  if (!el.isConnected) return
  el.style.setProperty('--mx', `${x}%`)
  el.style.setProperty('--my', `${y}%`)
}

export function ligarVidro() {
  if (ligado || typeof document === 'undefined') return
  ligado = true

  document.addEventListener(
    'pointermove',
    (e) => {
      const alvo = e.target && e.target.closest ? e.target.closest(SELETOR) : null
      if (!alvo) {
        pendente = null
        return
      }
      const r = alvo.getBoundingClientRect()
      if (!r.width || !r.height) return
      pendente = {
        el: alvo,
        x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10,
        y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10,
      }
      if (!raf) raf = requestAnimationFrame(aplicar)
    },
    { passive: true },
  )
}
