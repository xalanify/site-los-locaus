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
import { Cpu, MemoryStick } from 'lucide-react'

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
    id: 'previsao1',
    label: '1.º NAS PREVISÕES',
    desc: 'Líder da classificação das previsões',
    color: '#FFC800',
    light: '#FFE9A3',
    dark: '#7A5A00',
    anim: 'shine',
  },
]

/* Legenda DEV: branco → vermelho com brilho */
export const devLabelClass =
  'bg-gradient-to-r from-white via-red-100 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_9px_rgba(255,31,61,.95)]'

/* Nome dourado brilhante — quem está em 1.º nas previsões (badge previsao1) */
export const nomeDouradoClass =
  'bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,200,0,.55)]'
export const temPrevisao1 = (badges) => Array.isArray(badges) && badges.includes('previsao1')

/* Distinções dinâmicas de overclock, calculadas a partir da leitura
   REAL do PC (specs.details.avaliacao). Agora são independentes:
   - CPU com overclock           -> OVERCLOCK CPU
   - memórias com overclock      -> OVERCLOCK MEMÓRIA
   - XMP/EXPO ligado             -> XMP
   Se tiver OS TRÊS -> só OVERCLOCK SUPREMO. Se tiver duas -> mostra
   as duas. Cada uma com a sua cor e o seu ícone (CPU / memória). */
export const OC_CPU_BADGE = {
  id: 'oc-cpu',
  ic: 'cpu',
  label: 'OVERCLOCK CPU',
  desc: 'CPU acima do relógio de fábrica',
  color: '#F97316',
  light: '#FFC084',
  dark: '#7A2A08',
  anim: 'pulse',
}
export const OC_RAM_BADGE = {
  id: 'oc-ram',
  ic: 'ram',
  label: 'OVERCLOCK MEMÓRIA',
  desc: 'Memórias acima do perfil de fábrica',
  color: '#A855F7',
  light: '#D8B4FE',
  dark: '#5B21B6',
  anim: 'float',
}
export const XMP_BADGE = {
  id: 'xmp',
  ic: 'ram',
  label: 'XMP',
  desc: 'Perfil de memória XMP/EXPO ligado',
  color: '#22D3EE',
  light: '#A5F3FC',
  dark: '#0E4F5A',
  anim: 'float',
}
export const SUPREMO_BADGE = {
  id: 'oc-supremo',
  ic: 'both',
  label: 'OVERCLOCK SUPREMO (CPU + MEM + XMP)',
  desc: 'CPU e memórias com overclock e XMP ligado',
  color: '#FF2D78',
  light: '#FFA5C8',
  dark: '#7A0030',
  anim: 'shine',
}

/** Devolve o ARRAY de distinções de overclock que a conta tem. */
export function distincoesOverclock(dist) {
  if (!dist) return []
  const { oc_cpu: ocCpu, oc_ram: ocRam, xmp } = dist
  if (ocCpu && ocRam && xmp) return [SUPREMO_BADGE]
  const out = []
  if (ocCpu) out.push(OC_CPU_BADGE)
  if (ocRam) out.push(OC_RAM_BADGE)
  if (xmp) out.push(XMP_BADGE)
  return out
}

/* Catálogo das distinções de overclock (aba Atualizações). */
export const OVERCLOCK_BADGES = [OC_CPU_BADGE, OC_RAM_BADGE, XMP_BADGE, SUPREMO_BADGE]

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
  const ic = badge.ic // 'cpu' | 'ram' | 'both' (distinções de overclock)

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

        {/* chifres (só as caras de diabo) */}
        {!ic && (
          <>
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
          </>
        )}

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

        {/* olhos de diabo (só as caras de diabo) */}
        {!ic && (
          <g filter={olhoGlow ? `url(#og-${uid})` : undefined}>
            <polygon points="26,50 48,60 46,67 28,60" fill={olhoFill} />
            <polygon points="74,50 52,60 54,67 72,60" fill={olhoFill} />
          </g>
        )}
      </svg>

      {/* ícone de CPU / memória no centro da gema (overclock) —
          branco com sombra escura para contrastar com a cor da gema */}
      {ic && (
        <span
          className="absolute z-10 flex items-center justify-center gap-[0.05em]"
          style={{
            left: '50%',
            top: '58%',
            transform: 'translate(-50%, -50%)',
            width: size * 0.64,
            height: size * 0.64,
            color: '#ffffff',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.85)) drop-shadow(0 0 1px rgba(0,0,0,.9))',
          }}
        >
          {(ic === 'cpu' || ic === 'both') && (
            <Cpu
              strokeWidth={2.5}
              style={{ width: ic === 'both' ? size * 0.3 : size * 0.52, height: ic === 'both' ? size * 0.3 : size * 0.52 }}
            />
          )}
          {(ic === 'ram' || ic === 'both') && (
            <MemoryStick
              strokeWidth={2.5}
              style={{ width: ic === 'both' ? size * 0.3 : size * 0.52, height: ic === 'both' ? size * 0.3 : size * 0.52 }}
            />
          )}
        </span>
      )}

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
