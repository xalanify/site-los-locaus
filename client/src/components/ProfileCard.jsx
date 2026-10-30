import { useRef } from 'react'
import { Mouse, Keyboard, Headphones, Monitor, Star } from 'lucide-react'
import ProfileBanner from './ProfileBanner'
import { BadgeGem, badgesDe, distincoesOverclock } from './BadgeGem'
import GameLogo from './GameLogo'
import { classesNome } from '../data/nomeEfeitos'
import { svgAvatar } from '../lib/avatar'

/* ============================================================
   Cartas de perfil — 4 estilos (license, kova, dvd, felony)
   + o estilo padrão. Usadas nos membros, loja e editor.
   ============================================================ */

const VARIANT_LABEL = {
  padrao: 'LOCAUS CARD',
  license: 'AIMER LICENSE',
  kova: 'KOVA CARD',
  dvd: 'LOCAUS // RED',
  felony: 'FELONY CARD',
  neon: 'NEON CARD',
  blood: 'BLOOD CARD',
  cosmic: 'COSMIC CARD',
  crimson: 'CRIMSON CARD',
  violet: 'VIOLET CARD',
  sleepin: 'AIMER LICENSE',
  river: 'MENTALIST',
  dev: 'AIMER LICENSE',
}

const VARIANT_ACCENT = {
  padrao: '#a1a1aa',
  license: '#e4e4e7',
  kova: '#a1a1aa',
  dvd: '#ff4d4d',
  felony: '#c084fc',
  neon: '#e879f9',
  blood: '#ff3b3b',
  cosmic: '#60a5fa',
  crimson: '#ef4444',
  violet: '#c084fc',
  sleepin: '#e4e4e7',
  river: '#f9a8d4',
  dev: '#e4e4e7',
}

const ano = (iso) => {
  if (!iso) return '2026'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '2026' : String(d.getFullYear())
}

/* Maior rank entre os jogos ligados (R6, CS2, BF, Fortnite...). */
const rankScore = (r) =>
  Number(r?.valor ?? r?.elo ?? r?.points ?? r?.level ?? 0) || 0

function rankDoPerfil(perfil) {
  const entradas = Object.entries(perfil?.game_ranks || {}).filter(
    ([, r]) => r && (r.name || r.icon),
  )
  if (!entradas.length) return null
  entradas.sort((a, b) => rankScore(b[1]) - rankScore(a[1]))
  const [jogo, rank] = entradas[0]
  return { jogo, ...rank }
}

function RankBadge({ rank, compacto = false }) {
  if (!rank) return null
  return (
    <span className={`pc-rank ${compacto ? 'pc-rank--compacto' : ''}`}>
      {rank.icon ? (
        <img src={rank.icon} alt="" loading="lazy" />
      ) : (
        <Star className="h-3 w-3" />
      )}
      <span>{rank.name || 'Rank'}</span>
    </span>
  )
}

export default function ProfileCard({
  perfil = {},
  variant = 'padrao',
  jogos = null,
  className = '',
}) {
  const v = VARIANT_LABEL[variant] ? variant : 'padrao'
  const accent = VARIANT_ACCENT[v]
  const wide =
    v === 'license' || v === 'blood' || v === 'crimson' || v === 'sleepin' || v === 'dev'
  const violet = v === 'violet'
  const ref = useRef(null)
  const username = perfil.username || 'Membro'
  const id = perfil.display_id ?? perfil.id ?? '—'
  const avatar = perfil.avatar_url || svgAvatar(username, '#a1a1aa')
  const nomeCls = classesNome(perfil.name_color, perfil.name_effect)
  const rank = rankDoPerfil(perfil)
  const marca = v === 'dev' ? 'desenvolvedor' : username
  const badges = [
    ...badgesDe(perfil.badges),
    ...distincoesOverclock(perfil.distincoes),
  ]
  const listaJogos = (
    jogos || perfil.game_accounts || []
  ).filter((g) => g && g !== 'csgo')
  const barcode = `LOCAUS<<${String(username).toUpperCase()}<<${id}<<${ano(perfil.created_at)}<<<<`

  const aoMover = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`)
    el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-4px)`
  }
  const aoSair = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  const arrasto = useRef({ x: 0, y: 0, ativo: false, ultimo: 0 })
  const aoClicar = (e) => {
    const el = ref.current
    if (!el) return
    arrasto.current.x = e.clientX
    arrasto.current.y = e.clientY
    arrasto.current.ativo = false
    if (e.pointerType !== 'mouse') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* sem captura */
      }
    }
    const r = el.getBoundingClientRect()
    el.style.setProperty('--cx', `${e.clientX - r.left}px`)
    el.style.setProperty('--cy', `${e.clientY - r.top}px`)
    el.classList.remove('pc-clicado')
    void el.offsetWidth
    el.classList.add('pc-clicado')
    window.setTimeout(() => el.classList.remove('pc-clicado'), 520)
  }
  const aoMoverPointer = (e) => {
    if (e.pointerType !== 'mouse') {
      const dx = e.clientX - arrasto.current.x
      const dy = e.clientY - arrasto.current.y
      if (Math.abs(dx) + Math.abs(dy) > 6) arrasto.current.ativo = true
    }
    aoMover(e)
  }
  const aoSoltar = (e) => {
    if (e.pointerType !== 'mouse') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* sem captura */
      }
    }
    if (arrasto.current.ativo) arrasto.current.ultimo = Date.now()
    aoSair()
  }
  const aoClicarCarta = (e) => {
    if (Date.now() - arrasto.current.ultimo < 450) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div
      ref={ref}
      onPointerMove={aoMoverPointer}
      onPointerLeave={aoSair}
      onPointerDown={aoClicar}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onClick={aoClicarCarta}
      className={`profile-card profile-card--${v} group ${
        wide
          ? 'profile-card--wide'
          : violet
            ? 'profile-card--violet aspect-[3/4]'
            : v === 'river'
              ? 'aspect-[4/5]'
              : 'min-h-[440px]'
      } ${className}`}
      style={{ '--pc-accent': accent }}
    >
      {v === 'dvd' && (
        <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/70 via-black/45 to-black/90" />
      )}
      <span className="pc-watermark" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, row) => (
          <span key={row} className="pc-watermark-row">
            {Array.from({ length: 6 }).map((_, col) => (
              <span key={col} className="pc-watermark-word">
                {marca}
              </span>
            ))}
          </span>
        ))}
      </span>
      <span className="pc-glow" aria-hidden="true" />
      <span className="pc-ripple" aria-hidden="true" />

      <div className={`pc-body relative z-10 flex h-full flex-col ${v === 'sleepin' || v === 'dev' || v === 'river' ? 'p-0' : 'p-4 sm:p-5'}`}>
        {v === 'sleepin' || v === 'dev' ? (
          <div className="sleepin-body">
            <div className="sleepin-bg" aria-hidden="true">
              <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/30 via-black/25 to-black/85" />
            </div>
            <div className="sleepin-top">
              <img
                src={avatar}
                alt={username}
                loading="lazy"
                className="sleepin-avatar"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
              <div className="sleepin-title">
                <span className="sleepin-kicker">AIMER LICENSE</span>
                <h3 className={`sleepin-name ${nomeCls || 'text-white'}`}>{username}</h3>
                <p>@{username} · Membro #{id}</p>
              </div>
              <RankBadge rank={rank} />
            </div>
            <div className="sleepin-grid">
              <div><span>NAME</span><strong>{username}</strong></div>
              <div><span>TEAM</span><strong>{perfil.team || 'LOCAUS'}</strong></div>
              <div><span>RANK</span><strong>{rank?.name || '—'}</strong></div>
              <div><span>COUNTRY</span><strong>{perfil.country || 'PT'} {ano(perfil.created_at)}</strong></div>
              <div><span>SENS</span><strong>{perfil.sens || '—'}</strong></div>
              <div><span>DPI</span><strong>{perfil.dpi || '—'}</strong></div>
              <div><span>POLLING</span><strong>{perfil.polling || '1000 Hz'}</strong></div>
              <div><span>MOUSE</span><strong>{perfil.mouse || '—'}</strong></div>
            </div>
            <div className="sleepin-foot">
              <span>F1 V3 ULTIMATE+</span>
              <span>{perfil.keyboard || 'ES EDT70'}</span>
              <span className="sleepin-sign">{username}</span>
            </div>
            <p className="sleepin-barcode">{barcode}</p>
          </div>
        ) : v === 'river' ? (
          <div className="river-body">
            <div className="river-head">
              <span className="river-name">
                {username} <Star className="h-3 w-3" />
              </span>
              <span className="river-mark">✦</span>
            </div>
            <div className="river-banner">
              <span className="river-word">MENTALIST</span>
              <img
                src={avatar}
                alt={username}
                loading="lazy"
                className="river-avatar"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
              <span className="river-phonetic">/ˈmen·tə·list/ noun.</span>
            </div>
            <div className="river-chips">
              <span className="river-chip river-chip--master">master</span>
              <span className="river-chip">{rank?.name || 'voltaic s5.5'}</span>
              <span className="river-chip">sea aim</span>
            </div>
            <div className="river-stats">
              <div><span>VALORANT SENS</span><strong>{perfil.sens || '0.163'}</strong></div>
              <div><span>DPI</span><strong>{perfil.dpi || '1600'}</strong></div>
              <div><span>POLLING</span><strong>{perfil.polling || '2000 hz'}</strong></div>
            </div>
            <ul className="river-gear">
              <li><Mouse className="h-3.5 w-3.5" /> {perfil.mouse || 'viper v4 pro'} <span>RAZER</span></li>
              <li><Keyboard className="h-3.5 w-3.5" /> {perfil.keyboard || 'sp-005 (summer miku)'} <span>WALLHACK</span></li>
              <li><Monitor className="h-3.5 w-3.5" /> {perfil.monitor || '80he+ tenz'} <span>WOOTING</span></li>
              <li><Headphones className="h-3.5 w-3.5" /> {perfil.headset || 'arctis nova pro wireless'} <span>STEELSERIES</span></li>
            </ul>
            <div className="river-foot">
              #{id} · 9 GEAR · {ano(perfil.created_at)} <span>kova.</span>
            </div>
          </div>
        ) : (
          <>
        <div className="pc-head flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
            {VARIANT_LABEL[v]}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <RankBadge rank={rank} compacto />
            <span className="brand-serif shrink-0 text-sm text-white">locaus.</span>
          </span>
        </div>

        {violet && (
          <div className="pc-mouse-hero mt-3 flex flex-col items-center justify-center gap-1">
            <Mouse className="h-12 w-12 text-zinc-400" />
            <span className="text-[11px] font-semibold text-zinc-300">
              {perfil.mouse || 'Mouse'}
            </span>
          </div>
        )}

        <div className="pc-id mt-4 flex items-center gap-3">
          <img
            src={avatar}
            alt={username}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/15 sm:h-16 sm:w-16"
            onError={(e) => {
              if (e.currentTarget.dataset.fb) return
              e.currentTarget.dataset.fb = '1'
              e.currentTarget.src = svgAvatar(username, '#a1a1aa')
            }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`truncate font-display text-xl font-black sm:text-2xl ${
                  nomeCls || 'text-white'
                }`}
              >
                {username}
              </span>
              {badges.slice(0, 3).map((b) => (
                <BadgeGem key={b.id} badge={b} size={15} />
              ))}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-zinc-500">
              @{username} · Membro #{id}
            </p>
          </div>
        </div>

        <div className="pc-stats mt-4 grid grid-cols-2 gap-1.5">
          <div className="pc-stat">
            <span>Mouse</span>
            <strong>{perfil.mouse || '—'}</strong>
          </div>
          <div className="pc-stat">
            <span>DPI</span>
            <strong>{perfil.dpi || '—'}</strong>
          </div>
        </div>

        {listaJogos.length > 0 && (
          <div className="pc-games mt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Jogos</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listaJogos.slice(0, 5).map((g) => {
                const logoLargo = ['cod', 'cs2'].includes(g)
                return (
                  <div
                    key={g}
                    className={`flex flex-col items-center gap-0.5 ${logoLargo ? 'w-20' : 'w-14'}`}
                  >
                    <span
                      className={`grid place-items-center rounded-xl border border-white/10 bg-white/[0.04] ${
                        logoLargo ? 'h-14 w-20' : 'h-14 w-14'
                      }`}
                    >
                      <GameLogo
                        game={g}
                        className={logoLargo ? 'h-8 w-16' : 'h-9 w-9'}
                      />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="pc-foot mt-auto pt-3">
          <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>LOCAUS · {ano(perfil.created_at)}</span>
            <span>#{id}</span>
          </div>
          <p className="mt-1.5 truncate font-mono text-[8px] tracking-[0.18em] text-zinc-600">
            {barcode}
          </p>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
