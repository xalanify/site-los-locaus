/* ============================================================
   Distinções do site — caras de diabo em estilo diamante
   (joia facetada com chifres e olhos irados), cada distinção
   com a sua cor. Arte própria.
   - DEV ............. vermelho brilhante (legenda branca→vermelha)
   - TOP 1 KILL ...... laranja (CS2)
   - MAIS GOSTOS ..... cinzento (em breve)
   - JOGADOR DO CANAL roxo
   ============================================================ */
import { Lock } from 'lucide-react'

export const BADGES = [
  {
    id: 'dev',
    label: 'DEV',
    desc: 'Desenvolvedor do site',
    color: '#FF1F3D',
    light: '#FF8A9C',
    dark: '#6E0014',
    locked: false,
  },
  {
    id: 'top1',
    label: 'TOP 1 KILL DE CS',
    desc: 'Melhor kill da época em CS2',
    color: '#F97316',
    light: '#FFC084',
    dark: '#7A2A08',
    locked: false,
  },
  {
    id: 'clip',
    label: 'MAIS GOSTOS',
    desc: 'Clip com mais gostos da comunidade',
    color: '#64748B',
    light: '#A8B6C8',
    dark: '#263243',
    locked: true,
  },
  {
    id: 'jogador',
    label: 'JOGADOR DO CANAL',
    desc: 'Destaque entre os jogadores do canal',
    color: '#8B5CF6',
    light: '#CBB7FF',
    dark: '#3B1480',
    locked: false,
  },
]

/* Legenda DEV: branco → vermelho com brilho */
export const devLabelClass =
  'bg-gradient-to-r from-white via-red-100 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_9px_rgba(255,31,61,.95)]'

/* A cara de diabo em si (joia facetada + chifres + olhos irados) */
export function BadgeGem({ badge, size = 56 }) {
  const dev = badge.id === 'dev'
  const uid = badge.id
  return (
    <div
      className={`relative shrink-0 ${dev ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${dev ? 18 : 9}px ${badge.color}BB)`,
      }}
      title={badge.desc}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <radialGradient id={`fg-${uid}`} cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor={badge.light} />
            <stop offset="55%" stopColor={badge.color} />
            <stop offset="100%" stopColor={badge.dark} />
          </radialGradient>
          <linearGradient id={`fh-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={badge.light} />
            <stop offset="100%" stopColor={badge.dark} />
          </linearGradient>
          <clipPath id={`fc-${uid}`}>
            <circle cx="50" cy="58" r="30" />
          </clipPath>
        </defs>

        {/* chifres */}
        <path
          d="M42,29 Q32,20 24,6 Q20,22 30,36 Z"
          fill={`url(#fh-${uid})`}
          stroke="rgba(255,255,255,.45)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M58,29 Q68,20 76,6 Q80,22 70,36 Z"
          fill={`url(#fh-${uid})`}
          stroke="rgba(255,255,255,.45)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* cabeça / gema circular */}
        <circle cx="50" cy="58" r="30" fill={`url(#fg-${uid})`} />

        {/* facetas do cristal (recortadas à volta) */}
        <g clipPath={`url(#fc-${uid})`}>
          <polygon points="22,46 50,34 42,64" fill="#fff" opacity="0.16" />
          <polygon points="50,34 80,50 60,66" fill="#000" opacity="0.14" />
          <polygon points="20,58 42,64 34,86" fill="#fff" opacity="0.10" />
          <polygon points="42,64 60,66 54,88" fill="#000" opacity="0.20" />
          <polygon points="60,66 82,60 70,86" fill="#fff" opacity="0.12" />
          <polygon points="32,78 72,80 50,96" fill="#000" opacity="0.24" />
          {/* brilho do vidro */}
          <ellipse
            cx="36"
            cy="44"
            rx="13"
            ry="8"
            fill="#fff"
            opacity="0.25"
            transform="rotate(-22 36 44)"
          />
        </g>

        {/* contorno da gema */}
        <circle cx="50" cy="58" r="30" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" />

        {/* olhos de diabo (irados, a apontar para o centro) */}
        <polygon points="26,50 48,60 46,67 28,60" fill="#08080e" />
        <polygon points="74,50 52,60 54,67 72,60" fill="#08080e" />
      </svg>

      {/* cadeado para as distinções "em breve" */}
      {badge.locked && (
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-black/85 ring-1 ring-white/20">
          <Lock className="h-3 w-3 text-gray-400" />
        </span>
      )}
    </div>
  )
}

/* Cartão da distinção (joia + legenda + estado) */
export function BadgeTile({ badge, earned = false, size = 54 }) {
  const status = badge.locked ? 'Em breve' : earned ? 'Desbloqueada' : 'Por ganhar'
  const dev = badge.id === 'dev'
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all"
      title={badge.desc}
      style={{
        borderColor: earned ? `${badge.color}66` : 'rgba(255,255,255,.08)',
        background: earned
          ? `radial-gradient(130% 110% at 50% 0%, ${badge.color}26, rgba(10,10,13,.92) 72%)`
          : 'rgba(11,11,14,.9)',
        boxShadow: earned ? `0 0 26px ${badge.color}40, inset 0 0 24px ${badge.color}14` : 'none',
      }}
    >
      <BadgeGem badge={badge} size={size} />
      <span
        className={`font-display text-[11px] font-black uppercase leading-tight tracking-wider ${
          dev ? devLabelClass : ''
        }`}
        style={dev ? undefined : { color: badge.color, textShadow: `0 0 10px ${badge.color}90` }}
      >
        {badge.label}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">
        {status}
      </span>
    </div>
  )
}
