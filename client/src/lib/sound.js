/* ============================================================
   Sons de interface — gerados com Web Audio (sem ficheiros
   para baixar, zero KB e sem esperar por downloads).

   - tema normal: um "bloop" suave e aguado
   - tema natal:  um sino curto e natalino

   O som liga/desliga com o botão da barra de cima e a escolha
   fica guardada no navegador.
   ============================================================ */

let ctx = null
let mudo = typeof localStorage !== 'undefined' && localStorage.getItem('somDesligado') === '1'
const ouvintes = new Set()

function audioCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/* Uma nota com ataque e caída suaves. */
function nota(freq, { dur = 0.12, tipo = 'sine', vol = 0.05, espera = 0, descida = 320 } = {}) {
  const c = audioCtx()
  if (!c) return
  const t0 = c.currentTime + espera
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t0)
  // leve deslize para baixo -> som mais "orgânico"/aguado
  if (descida) osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq - descida), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

const SONS = {
  /* suave e aguado — tema normal */
  click: () => {
    nota(560, { dur: 0.1, tipo: 'sine', vol: 0.05, descida: 300 })
    nota(840, { dur: 0.07, tipo: 'triangle', vol: 0.02, espera: 0.02, descida: 200 })
  },
  /* sino natalino — tema de natal */
  natal: () => {
    nota(1568, { dur: 0.35, tipo: 'sine', vol: 0.05, descida: 40 })
    nota(2093, { dur: 0.3, tipo: 'sine', vol: 0.03, espera: 0.03, descida: 30 })
    nota(3136, { dur: 0.5, tipo: 'sine', vol: 0.015, espera: 0.06, descida: 20 })
  },
  /* confirmações (guardar, publicar, entrar) */
  ok: () => {
    nota(660, { dur: 0.12, tipo: 'sine', vol: 0.05, descida: 0 })
    nota(990, { dur: 0.2, tipo: 'sine', vol: 0.04, espera: 0.09, descida: 0 })
  },
  erro: () => {
    nota(300, { dur: 0.18, tipo: 'triangle', vol: 0.05, descida: 120 })
  },
}

export function tocar(nome = 'click') {
  if (mudo) return
  const natal = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'natal'
  if (nome === 'click') {
    ;(natal ? SONS.natal : SONS.click)()
    return
  }
  const fn = SONS[nome]
  if (fn) fn()
}

export const estaMudo = () => mudo

export function setMudo(v) {
  mudo = Boolean(v)
  try {
    localStorage.setItem('somDesligado', mudo ? '1' : '0')
  } catch {
    /* sem localStorage */
  }
  ouvintes.forEach((fn) => {
    try {
      fn(mudo)
    } catch {
      /* ignorar ouvinte com erro */
    }
  })
  if (!mudo) tocar('click')
}

export const onMudo = (fn) => {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

/* Toca em qualquer clique num botão/ligação do site. */
let ligado = false
export function ligarSons() {
  if (ligado || typeof document === 'undefined') return
  ligado = true
  document.addEventListener(
    'click',
    (e) => {
      if (mudo) return
      const alvo = e.target && e.target.closest
        ? e.target.closest('button, a, [role="button"], summary, input[type="checkbox"], input[type="radio"]')
        : null
      if (!alvo) return
      if (alvo.dataset && alvo.dataset.som === 'nao') return
      tocar('click')
    },
    true,
  )
}
