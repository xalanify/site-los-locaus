/* ============================================================
   Distinções do site — caras de diabo em estilo diamante
   (joia facetada com chifres e olhos irados), cada distinção
   com a sua cor e um efeito animado. Arte própria.

   - DEV .............. vermelho brilhante (legenda branca→vermelha)
   - TOP 1 KILL DE CS . laranja com brilho a passar (sem descrição)
   - JOGADOR DO CANAL . roxo a flutuar

   Sem cadeados e sem estados (desbloqueada/por ganhar): só o
   nome (e a descrição curta, quando existe).
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
    desc: '',
    color: '#F97316',
    light: '#FFC084',
    dark: '#7A2A08',
    anim: 'shine',
  },
  {
    id: 'jogador',
    label: 'JOGADOR DO CANAL',
    desc: '',
    color: '#8B5CF6',
    light: '#CBB7FF',
    dark: '#3B1480',
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
  const top1 = badge.id === 'top1'
  const uid = badge.id
  const anim = ANIM_CLASS[badge.anim] || ''

  // Paleta da gema: top1 é preta com olhos laranja; as outras usam a cor da distinção
  const gemLight = top1 ? '#3A3A44' : badge.light
  const gemColor = top1 ? '#111116' : badge.color
  const gemDark = top1 ? '#000000' : badge.dark
  const olhoFill = top1 ? '#FF8A1A' : '#08080e'
  const olhoGlow = top1 ? '#FF6B00' : null

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
            <stop offset="0%" stopColor={gemLight} />
            <stop offset="55%" stopColor={gemColor} />
            <stop offset="100%" stopColor={gemDark} />
          </radialGradient>
          <linearGradient id={`fh-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gemLight} />
            <stop offset="100%" stopColor={gemDark} />
          </linearGradient>
          <clipPath id={`fc-${uid}`}>
            <circle cx="50" cy="58" r="30" />
          </clipPath>
          {/* brilho dos olhos (só top1) */}
          {olhoGlow && (
            <filter id={`og-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* chifres */}
        <path
          d="M42,29 Q32,20 24,6 Q20,22 30,36 Z"
          fill={`url(#fh-${uid})`}
          stroke={top1 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.45)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M58,29 Q68,20 76,6 Q80,22 70,36 Z"
          fill={`url(#fh-${uid})`}
          stroke={top1 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.45)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* cabeça / gema circular */}
        <circle cx="50" cy="58" r="30" fill={`url(#fg-${uid})`} />

        {/* facetas do cristal (recortadas à volta) */}
        <g clipPath={`url(#fc-${uid})`}>
          <polygon points="22,46 50,34 42,64" fill="#fff" opacity={top1 ? '0.07' : '0.16'} />
          <polygon points="50,34 80,50 60,66" fill="#000" opacity={top1 ? '0.30' : '0.14'} />
          <polygon points="20,58 42,64 34,86" fill="#fff" opacity={top1 ? '0.05' : '0.10'} />
          <polygon points="42,64 60,66 54,88" fill="#000" opacity={top1 ? '0.35' : '0.20'} />
          <polygon points="60,66 82,60 70,86" fill="#fff" opacity={top1 ? '0.06' : '0.12'} />
          <polygon points="32,78 72,80 50,96" fill="#000" opacity={top1 ? '0.40' : '0.24'} />
          {/* brilho do vidro */}
          <ellipse
            cx="36"
            cy="44"
            rx="13"
            ry="8"
            fill="#fff"
            opacity={top1 ? '0.10' : '0.25'}
            transform="rotate(-22 36 44)"
          />
        </g>

        {/* contorno da gema */}
        <circle
          cx="50"
          cy="58"
          r="30"
          fill="none"
          stroke={top1 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.55)'}
          strokeWidth="2.5"
        />

        {/* olhos de diabo (irados, a apontar para o centro) */}
        <g filter={olhoGlow ? `url(#og-${uid})` : undefined}>
          <polygon points="26,50 48,60 46,67 28,60" fill={olhoFill} />
          <polygon points="74,50 52,60 54,67 72,60" fill={olhoFill} />
        </g>
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
      {badge.desc ? (
        <span className="text-[10px] font-semibold leading-tight text-gray-400">{badge.desc}</span>
      ) : null}
    </div>
  )
}
