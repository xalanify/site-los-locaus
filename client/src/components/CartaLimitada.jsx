import { useRef } from 'react'

/* ============================================================
   CARTA LIMITADA — como as cartas normais (nome do membro,
   marca de água e inclinação), mas com a arte da edição e o
   número da cópia.
   ============================================================ */

export default function CartaLimitada({
  id,
  nome,
  username = 'Locaus',
  numero = null,
  total = 0,
  className = '',
  tilt = true,
}) {
  const ref = useRef(null)

  const mover = (e) => {
    if (!tilt) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    el.style.transform = `perspective(750px) rotateX(${((0.5 - py) * 12).toFixed(2)}deg) rotateY(${(
      (px - 0.5) * 14
    ).toFixed(2)}deg)`
    el.style.setProperty('--cx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--cy', `${(py * 100).toFixed(1)}%`)
  }

  const sair = () => {
    const el = ref.current
    if (el) {
      el.style.transform = ''
      el.style.setProperty('--cx', '50%')
      el.style.setProperty('--cy', '50%')
    }
  }

  return (
    <div
      ref={ref}
      className={`carta-limitada ${className}`}
      onPointerMove={mover}
      onPointerLeave={sair}
      onPointerCancel={sair}
    >
      <img
        src={`/edicoes/${id}.jpg`}
        alt=""
        className="carta-limitada-img"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <span className="carta-limitada-veu" aria-hidden="true" />
      <span className="carta-limitada-badge">Limitado</span>
      <span className="carta-limitada-num">
        {numero ? `nº ${numero} / ${total}` : `${total} unidade${total === 1 ? '' : 's'}`}
      </span>
      <span className="carta-limitada-marca" aria-hidden="true">
        {username}
      </span>
      <span className="carta-limitada-info">
        <span className="carta-limitada-nome">{username}</span>
        <span className="carta-limitada-sub">Membro Locaus · {nome}</span>
      </span>
      <span className="carta-limitada-luz" aria-hidden="true" />
    </div>
  )
}
