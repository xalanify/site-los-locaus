import { useRef } from 'react'
import { Mouse } from 'lucide-react'
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
}

const ano = (iso) => {
  if (!iso) return '2026'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '2026' : String(d.getFullYear())
}

export default function ProfileCard({
  perfil = {},
  variant = 'padrao',
  jogos = null,
  className = '',
}) {
  const v = VARIANT_LABEL[variant] ? variant : 'padrao'
  const accent = VARIANT_ACCENT[v]
  const wide = v === 'license' || v === 'blood' || v === 'crimson'
  const violet = v === 'violet'
  const ref = useRef(null)
  const username = perfil.username || 'Membro'
  const id = perfil.display_id ?? perfil.id ?? '—'
  const avatar = perfil.avatar_url || svgAvatar(username, '#a1a1aa')
  const nomeCls = classesNome(perfil.name_color, perfil.name_effect)
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

  return (
    <div
      ref={ref}
      onMouseMove={aoMover}
      onMouseLeave={aoSair}
      className={`profile-card profile-card--${v} group ${
        wide ? 'profile-card--wide' : violet ? 'profile-card--violet aspect-[3/4]' : 'aspect-[4/5]'
      } ${className}`}
      style={{ '--pc-accent': accent }}
    >
      {v === 'dvd' && (
        <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/70 via-black/45 to-black/90" />
      )}
      <span className="pc-watermark" aria-hidden="true">
        {`${username} · `.repeat(14)}
      </span>

      <div className="pc-body relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="pc-head flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
            {VARIANT_LABEL[v]}
          </span>
          <span className="brand-serif text-sm text-white">locaus.</span>
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
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">
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
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Jogos</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listaJogos.slice(0, 5).map((g) => (
                <div key={g} className="flex w-9 flex-col items-center gap-0.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <GameLogo game={g} className="h-5 w-5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pc-foot mt-auto pt-3">
          <div className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>LOCAUS · {ano(perfil.created_at)}</span>
            <span>#{id}</span>
          </div>
          <p className="mt-1.5 truncate font-mono text-[7px] tracking-[0.18em] text-zinc-600">
            {barcode}
          </p>
        </div>
      </div>
    </div>
  )
}
