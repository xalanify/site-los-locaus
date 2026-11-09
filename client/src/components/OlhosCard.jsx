import { useRef, useState } from 'react'
import { svgAvatar } from '../lib/avatar'

/* ============================================================
   CARTA OLHAR — design original, sem imitar Pokémon.
   ------------------------------------------------------------
   Arte em ecrã cheio (olhos com brilho arco-íris), moldura
   iridescente, nome/id do membro por cima da arte e um verso
   próprio com um olho desenhado em CSS.
   ============================================================ */

const anoDe = (iso) => {
  if (!iso) return '2026'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '2026' : String(d.getFullYear())
}

export default function OlhosCard({
  perfil = {},
  username: nomeDado = '',
  id: idDado = null,
  className = '',
  preview = false,
}) {
  const username = nomeDado || perfil.username || 'Membro'
  const id = idDado ?? perfil.display_id ?? perfil.id ?? '—'
  const ano = anoDe(perfil.created_at)
  const avatar = perfil.avatar_url || svgAvatar(username, '#a1a1aa')

  const ref = useRef(null)
  const [ativa, setAtiva] = useState(false)

  const artPreviewStyle = preview
    ? {
        backgroundColor: '#000',
        backgroundImage: 'url(/cartas/olhos.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
      }
    : undefined

  const mover = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
  }

  const sair = () => {
    const el = ref.current
    if (el) {
      el.style.setProperty('--mx', '50%')
      el.style.setProperty('--my', '50%')
    }
    setAtiva(false)
  }

  return (
    <div
      className={`olhos-scene ${preview ? 'olhos-scene--preview' : ''} ${className}`}
      style={{ '--tcg-accent': '#c084fc' }}
    >
      <div
        ref={ref}
        className={`olhos-card ${ativa ? 'olhos-card--ativa' : ''}`}
        onPointerMove={mover}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') setAtiva((v) => !v)
        }}
        onPointerLeave={sair}
        onPointerCancel={sair}
      >
        {/* ---------- FRENTE ---------- */}
        <div className="olhos-face olhos-front">
          <div className="olhos-frame">
            <header className="olhos-head">
              <span className="olhos-brand">Locaus</span>
              <span className="olhos-serie">Olhar · 004</span>
            </header>

            <div className="olhos-art" style={artPreviewStyle}>
              {!preview && (
                <img
                  src="/cartas/olhos.png"
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="olhos-art-img"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0'
                  }}
                />
              )}
              <span className="olhos-art-shade" aria-hidden="true" />
              <span className="tcg-watermark" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, row) => (
                  <span key={row} className="tcg-watermark-row">
                    {Array.from({ length: 5 }).map((_, col) => (
                      <span key={col} className="tcg-watermark-word">
                        {username}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span className="tcg-holo" aria-hidden="true" />
              <img
                src={avatar}
                alt=""
                loading="lazy"
                className="olhos-avatar"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
              <div className="olhos-caption">
                <span className="olhos-kicker">Membro Locaus</span>
                <span className="olhos-nome">{username}</span>
                <span className="olhos-id">#{id} · {ano}</span>
              </div>
            </div>

            <footer className="olhos-foot">
              <span>Olhar</span>
              <span>Locaus · {ano}</span>
            </footer>
          </div>
        </div>

      </div>
    </div>
  )
}
