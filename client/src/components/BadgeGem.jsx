/* ============================================================
   Distinções do site — caras de diabo em estilo diamante
   (joia facetada com chifres e olhos irados), cada distinção
   com a sua cor e um efeito animado. Arte própria.

   - DEV .............. vermelho brilhante (legenda branca→vermelha)
   - TOP 1 KILL DE CS . laranja com brilho a passar
   - JOGADOR DO CANAL . roxo a flutuar
   - MODERADOR ........ azul com halo a pulsar
   - MEMBRO OG ........ dourado com brilho a passar
   - LENDA DO CANAL ... verde a flutuar

   Sem cadeados e sem estados (desbloqueada/por ganhar): só o
   nome e uma descrição curta do que significa.
   ============================================================ */

export const BADGES = [
  {
    id: 'dev',
    label: 'DEV',
    desc: 'Desenvolvedor do site',
    color: '#FF1F3D',
    light: '#FF8A9C',
    dark: '#6E0014',
    anim: 'pulse',
  },
  {
    id: 'top1',
    label: 'TOP 1 KILL DE CS',
    desc: 'Melhor kill da época em CS2',
    color: '#F97316',
    light: '#FFC084',
    dark: '#7A2A08',
    anim: 'shine',
  },
  {
    id: 'jogador',
    label: 'JOGADOR DO CANAL',
    desc: 'Destaque entre os jogadores do canal',
    color: '#8B5CF6',
    light: '#CBB7FF',
    dark: '#3B1480',
    anim: 'float',
  },
  {
    id: 'mod',
    label: 'MODERADOR',
    desc: 'Ajuda a cuidar da comunidade',
    color: '#3B82F6',
    light: '#A5CCFF',
    dark: '#0B2E63',
    anim: 'pulse',
  },
  {
    id: 'og',
    label: 'MEMBRO OG',
    desc: 'No site desde o primeiro dia',
    color: '#FBBF24',
    light: '#FFE7A3',
    dark: '#7A4A02',
    anim: 'shine',
  },
  {
    id: 'lenda',
    label: 'LENDA DO CANAL',
    desc: 'Marcou a história do canal',
    color: '#10B981',
    light: '#A7F3E0',
    dark: '#04543C',
    anim: 'float',
  },
]

/* Legenda DEV: branco → vermelho com brilho */
export const devLabelClass =
  'bg-gradient-to-r from-white via-red-100 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_9px_rgba(255,31,61,.95)]'

const ANIM_CLASS = {
  pulse: 'gem-anim-pulse',
  shine: 'gem-anim-shine',
  float: 'gem-anim-float',
}

/* A cara de diabo em si (joia facetada + chifres + olhos irados) */
export function BadgeGem({ badge, size = 56 }) {
  const dev = badge.id === 'dev'
  const uid = badge.id
  const anim = ANIM_CLASS[badge.anim] || ''
  return (
    <div
      className={`relative shrink-0 ${anim}`}
      style={{
        width: size,
        height: size,
        // eslint-disable-next-line react/forbid-dom-props
        ['--gem']: badge.color,
        filter: `drop-shadow(0 0 ${dev ? 18 : 9}px ${badge.color}BB)`,
      }}
      title={badge.desc}
    >
      {/* halo a pulsar (distinções "pulse") */}
      {badge.anim === 'pulse' && <span className="gem-halo" aria-hidden="true" />}

      <svg viewBox="0 0 100 100" className="relative h-full w-full">
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

      {/* brilho a passar (distinções "shine") */}
      {badge.anim === 'shine' && (
        <span className="absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
          <span className="gem-sheen" />
        </span>
      )}
    </div>
  )
}

/* Cartão da distinção (joia + legenda + descrição curta) */
export function BadgeTile({ badge, size = 54 }) {
  const dev = badge.id === 'dev'
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all"
      title={badge.desc}
      style={{
        borderColor: `${badge.color}66`,
        background: `radial-gradient(130% 110% at 50% 0%, ${badge.color}26, rgba(10,10,13,.92) 72%)`,
        boxShadow: `0 0 26px ${badge.color}40, inset 0 0 24px ${badge.color}14`,
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
      <span className="text-[10px] font-semibold leading-tight text-gray-400">{badge.desc}</span>
    </div>
  )
}
