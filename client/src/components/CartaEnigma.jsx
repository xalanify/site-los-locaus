import { useRef, useState } from 'react'

/* ============================================================
   CARTA DO ENIGMA — 1/1, cromada, só para o vencedor
   Com inclinação 3D ao mover o rato (como as cartas do perfil).
   ============================================================ */
export default function CartaEnigma({ nome = 'vencedor', className = '', ampliada = false }) {
  const [semImg, setSemImg] = useState(false)
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
    el.style.transform = `perspective(900px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg) translateY(-3px)`
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
      className={`carta-enigma ${ampliada ? 'carta-enigma--ampla' : ''} ${className}`}
    >
      <span className="carta-enigma-brilho" aria-hidden="true" />
      <span className="carta-enigma-moldura" aria-hidden="true" />
      <span className="carta-enigma-luz" aria-hidden="true" />

      <div className="carta-enigma-arte">
        {!semImg && (
          <img
            src="/carta-enigma.jpg"
            alt=""
            draggable={false}
            onError={() => setSemImg(true)}
          />
        )}
        {semImg && <span className="carta-enigma-vazia" aria-hidden="true" />}
      </div>

      <div className="carta-enigma-info">
        <span className="carta-enigma-selo">Carta limitada · 1/1</span>
        <b className="carta-enigma-nome">{nome}</b>
        <em>Vencedor do primeiro enigma</em>
      </div>
    </div>
  )
}
