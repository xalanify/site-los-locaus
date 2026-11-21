import { useRef } from 'react'

/* ============================================================
   CARTA DO ENIGMA 2 — dourado/preto, 3D, marca de água no rato
   ============================================================ */
export default function CartaEnigma2({ nome = 'membro', ampliada = false, onClick, className = '' }) {
  const ref = useRef(null)

  const mover = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`)
    el.style.transform = `perspective(900px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) translateY(-3px)`
  }

  const sair = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = ''
    el.style.setProperty('--mx', '50%')
    el.style.setProperty('--my', '50%')
  }

  return (
    <div
      ref={ref}
      onPointerMove={mover}
      onPointerLeave={sair}
      onClick={onClick}
      className={`ce2 ${ampliada ? 'ce2--ampla' : ''} ${onClick ? 'ce2--clicavel' : ''} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined
      }
    >
      <img
        className="ce2-img"
        src="/cartas/carta-enigma2.jpg"
        alt="Carta do enigma 2"
        draggable={false}
      />
      <span className="ce2-veu" aria-hidden="true" />
      <span className="ce2-brilho" aria-hidden="true" />

      <span className="ce2-watermark" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, r) => (
          <span key={r} className="ce2-watermark-row">
            {Array.from({ length: 8 }).map((_, c) => (
              <span key={c}>{nome}</span>
            ))}
          </span>
        ))}
      </span>

      <span className="ce2-topo">
        <span className="ce2-selo">ENIGMA 2</span>
        <span className="ce2-num">1/1</span>
      </span>

      <span className="ce2-info">
        <b>Carta do enigma 2</b>
        <em>Exclusiva do vencedor da semana 2</em>
      </span>
    </div>
  )
}
