import { useMemo, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { svgAvatar } from '../lib/avatar'

/* ============================================================
   CARTA TCG — design inspirado nas cartas de Pokémon.
   ------------------------------------------------------------
   - Frente: moldura holográfica, barra de topo com o nome do
     membro, janela de arte em arco, ataques com os dados do
     membro (#id, ano), barra de fraqueza/recuo e caixa de regra.
   - Verso: design único por carta (Underground, Underground 2
     e World at War).
   - Efeitos: tilt (feito pelo ProfileCard), brilho que segue o
     rato/dedo, watermark do nome e flip 3D suave.
   ============================================================ */

const ARTES = {
  'foto-nfsu1': {
    src: '/cartas/nfs1.png',
    titulo: 'Underground',
    back: 'u1',
    emblema: 'U1',
    serie: 'LOC · 001/003',
    tipo: 'Velocidade',
    cor: '#67e8f9',
  },
  'foto-nfsu2': {
    src: '/cartas/nfs2.png',
    titulo: 'Underground 2',
    back: 'u2',
    emblema: 'U2',
    serie: 'LOC · 002/003',
    tipo: 'Tuning',
    cor: '#fb923c',
  },
  'foto-guerra': {
    src: '/cartas/waw.png',
    titulo: 'World at War',
    back: 'waw',
    emblema: 'WAW',
    serie: 'LOC · 003/003',
    tipo: 'Guerra',
    cor: '#d6c98a',
  },
}

const anoDe = (iso) => {
  if (!iso) return '2026'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '2026' : String(d.getFullYear())
}

export default function PokemonCard({
  variant = 'foto-nfsu1',
  perfil = {},
  username: nomeDado = '',
  id: idDado = null,
  className = '',
}) {
  const info = ARTES[variant] || ARTES['foto-nfsu1']
  const username = nomeDado || perfil.username || 'Membro'
  const id = idDado ?? perfil.display_id ?? perfil.id ?? '—'
  const ano = anoDe(perfil.created_at)
  const avatar = perfil.avatar_url || svgAvatar(username, '#a1a1aa')

  const ref = useRef(null)
  const [virada, setVirada] = useState(false)
  const [ativa, setAtiva] = useState(false)

  const moves = useMemo(
    () => [
      {
        pips: 1,
        nome: 'Membro Locaus',
        valor: `#${id}`,
        texto: 'O teu nome fica em destaque em todo o site.',
      },
      {
        pips: 2,
        nome: 'Desde',
        valor: ano,
        texto: 'Carta de membro da comunidade Locaus.',
      },
    ],
    [id, ano],
  )

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

  const alternar = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setVirada((v) => !v)
  }

  return (
    <div className={`tcg-scene ${className}`} style={{ '--tcg-accent': info.cor }}>
      <div
        ref={ref}
        className={`tcg-card ${virada ? 'tcg-card--virada' : ''} ${ativa ? 'tcg-card--ativa' : ''}`}
        onPointerMove={mover}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') setAtiva((v) => !v)
        }}
        onPointerLeave={sair}
        onPointerCancel={sair}
      >
        {/* ---------- FRENTE ---------- */}
        <div className={`tcg-face tcg-front tcg-front--${info.back}`}>
          <div className="tcg-frame">
            <header className="tcg-head">
              <span className="tcg-stage">Membro</span>
              <span className="tcg-name" title={username}>
                {username}
              </span>
              <span className="tcg-ex">Locaus</span>
              <span className="tcg-hp">
                <b>Nº</b>
                {id}
              </span>
            </header>

            <div className="tcg-art">
              <img
                src={info.src}
                alt=""
                loading="eager"
                decoding="async"
                className="tcg-art-img"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0'
                }}
              />
              <span className="tcg-art-vignette" aria-hidden="true" />
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
              <img
                src={avatar}
                alt=""
                loading="lazy"
                className="tcg-avatar"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
              <span className="tcg-holo" aria-hidden="true" />
            </div>

            <div className="tcg-moves">
              {moves.map((m) => (
                <div key={m.nome}>
                  <div className="tcg-move">
                    <span className="tcg-pips" aria-hidden="true">
                      {Array.from({ length: m.pips }).map((_, i) => (
                        <span key={i} className="tcg-pip">
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="tcg-move-name">{m.nome}</span>
                    <span className="tcg-move-dmg">{m.valor}</span>
                  </div>
                  <p className="tcg-move-txt">{m.texto}</p>
                </div>
              ))}
            </div>

            <div className="tcg-strip">
              <span className="tcg-strip-cell">
                <span>Fraqueza</span>
                <b>—</b>
              </span>
              <span className="tcg-strip-cell">
                <span>Recuo</span>
                <b>★</b>
              </span>
            </div>

            <div className="tcg-rule">
              <span className="tcg-rule-badge">Membro</span>
              <p>Quando esta carta entra em jogo, o teu nome aparece em todo o site.</p>
            </div>

            <footer className="tcg-foot">
              <span>Ilust. Locaus</span>
              <span>{info.serie}</span>
            </footer>
          </div>
        </div>

        {/* ---------- VERSO ---------- */}
        <div className={`tcg-face tcg-back tcg-back--${info.back}`}>
          <span className="tcg-back-glow" aria-hidden="true" />
          <div className="tcg-back-inner">
            <span className="tcg-back-top">Locaus · Trading Card</span>
            <span className="tcg-back-emblem" aria-hidden="true">
              {info.emblema}
            </span>
            <span className="tcg-back-name">{info.titulo}</span>
            <span className="tcg-back-rule" aria-hidden="true" />
            <span className="tcg-back-user">
              {username} · #{id}
            </span>
            <span className="tcg-back-foot">{info.serie}</span>
          </div>
        </div>
      </div>

      <span
        role="button"
        tabIndex={0}
        className="tcg-flip"
        aria-label={virada ? 'Mostrar a frente da carta' : 'Virar a carta'}
        title={virada ? 'Mostrar a frente' : 'Virar carta'}
        onClick={alternar}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setVirada((v) => !v)
          }
        }}
      >
        <RotateCw className="tcg-flip-icon" aria-hidden="true" />
        <span className="tcg-flip-label">{virada ? 'Frente' : 'Virar'}</span>
      </span>
    </div>
  )
}
