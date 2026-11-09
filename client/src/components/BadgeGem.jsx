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

export const BADGES = [  {
    id: 'dev',
    label: 'DEV',
    desc: 'Desenvolvedor do site',
    color: '#FF1F3D',
    light: '#FFB3BD',
    dark: '#B0001B',
    anim: 'pulse',
    icone: '/distincoes/diamond-dev.png',
  },
  {
    id: 'top1',
    label: 'TOP 1 KILL DE CS',
    desc: '',
    color: '#F97316',
    light: '#FFC084',
    dark: '#7A2A08',
    anim: 'shine',
    icone: '/distincoes/diamond-top1.png',
  },
  {
    id: 'previsao1',
    label: '1.º CLASSIFICAÇÃO PREVISÕES',
    desc: 'Líder da classificação total das previsões',
    color: '#2E1065',
    light: '#7C3AED',
    dark: '#0B0418',
    glow: '#8B5CF6',
    labelColor: '#F3F4F6',
    anim: 'shine',
    arte: 'obsidian',
    icone: '/distincoes/diamond-previsao.png',
  },
  {
    id: 'fortnite-rank1',
    label: 'RANK MAIS ALTO FORTNITE',
    desc: 'Melhor rank atual do Fortnite entre os membros ligados',
    color: '#A855F7',
    light: '#D8B4FE',
    dark: '#4C1D95',
    glow: '#A855F7',
    labelColor: '#C084FC',
    anim: 'float',
    arte: 'fortnite',
    icone: '/distincoes/diamond-fortnite.png',
  },
  {
    id: 'cs2-inventory',
    label: 'INVENTÁRIO CS2 MAIS CARO',
    desc: 'Maior valor de inventário CS2 do grupo',
    color: '#F5C542',
    light: '#FFF3B0',
    dark: '#7A4D00',
    glow: '#F5C542',
    anim: 'shine',
    icone: '/distincoes/gold-face.png',
    iconeFit: 'cover',
    iconePos: 'center 32%',
  },
]

/* Distinção dinâmica de acertos seguidos: streak-5, streak-6, ... */
export function badgeDe(id) {
  const fixa = BADGES.find((b) => b.id === id)
  if (fixa) return fixa
  const m = /^streak-(\d+)$/.exec(String(id || ''))
  if (!m) return null
  const nivel = Math.max(5, Number(m[1]) || 5)
  const intensidade = Math.min(1, (nivel - 5) / 12)
  const luz = Math.max(18, Math.round(70 - intensidade * 52))
  return {
    id,
    label: `${nivel} ACERTOS SEGUIDOS`,
    desc: `Sequência de ${nivel} acertos consecutivos nas previsões`,
    color: '#5B0A0A',
    light: `#${luz.toString(16).padStart(2, '0')}0808`,
    dark: '#050000',
    glow: '#EF4444',
    labelColor: '#FCA5A5',
    anim: 'pulse',
    arte: 'streak',
    icone: '/distincoes/diamond-streak.png',
    nivel,
  }
}

export function badgesDe(ids = []) {
  return (Array.isArray(ids) ? ids : []).map(badgeDe).filter(Boolean)
}

export const STREAK_BADGE = badgeDe('streak-5')

/* Legenda DEV: branco → vermelho com brilho */
export const devLabelClass =
  'bg-gradient-to-r from-white via-red-100 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_9px_rgba(255,31,61,.95)]'

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

/* hex (#RRGGBB) + alpha (0..1) -> rgba(), mais compatível no iOS/Safari */
export function hexToRgba(hex, alpha = 1) {
  const h = String(hex || '#000000').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* Estrela 3D das distinções — sem fundo, só a estrela.
   A cor muda por distinção e os olhos também (ex.: TOP 1 = estrela
   preta com olhos laranja; DEV = estrela vermelha com olhos pretos). */
function StarBadge({ badge, size, anim, corLight, cor, corDark, olhoFill, olhoGlow, glow }) {
  const sid = String(badge.id || 'star').replace(/[^a-zA-Z0-9_-]/g, '')
  const fillId = `star-fill-${sid}`
  const shineId = `star-shine-${sid}`
  const filterId = `star-eyes-${sid}`
  const estrela =
    'M50 9 L61.2 36.2 L91.8 37.6 L68.2 56.6 L77.2 87.8 L50 71.4 L22.8 87.8 L31.8 56.6 L8.2 37.6 L38.8 36.2 Z'

  return (
    <div
      className={`relative shrink-0 ${anim}`}
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${Math.max(6, size * 0.16)}px ${hexToRgba(glow, 0.55)})`,
      }}
      title={badge.desc}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={fillId} cx="32%" cy="20%" r="88%">
            <stop offset="0%" stopColor={corLight || badge.light || badge.color} />
            <stop offset="58%" stopColor={cor || badge.color} />
            <stop offset="100%" stopColor={corDark || badge.dark || '#050505'} />
          </radialGradient>
          <linearGradient id={shineId} x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.26" />
          </linearGradient>
          {olhoGlow && (
            <filter id={filterId} x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* base sólida: garante que a estrela aparece sempre, mesmo
            em browsers que não resolvem o gradiente */}
        <path
          d={estrela}
          fill={cor || badge.color}
          stroke={corLight || badge.color}
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* gradiente 3D por cima da base */}
        <path
          d={estrela}
          fill={`url(#${fillId})`}
          stroke="none"
        />
        {/* brilho de cima / sombra em baixo */}
        <path
          d={estrela}
          fill={`url(#${shineId})`}
          stroke="none"
          opacity="0.9"
        />
        {/* olhos redondos/ovais, como na imagem */}
        <g filter={olhoGlow ? `url(#${filterId})` : undefined}>
          <ellipse
            cx="40.5"
            cy="53"
            rx="3.3"
            ry="7.2"
            fill={olhoFill}
            transform="rotate(-4 40.5 53)"
          />
          <ellipse
            cx="59.5"
            cy="53"
            rx="3.3"
            ry="7.2"
            fill={olhoFill}
            transform="rotate(4 59.5 53)"
          />
        </g>
        {/* ponto de luz nos olhos */}
        <ellipse cx="39.4" cy="49.8" rx="0.9" ry="2.3" fill="#ffffff" opacity="0.8" />
        <ellipse cx="58.4" cy="49.8" rx="0.9" ry="2.3" fill="#ffffff" opacity="0.8" />
      </svg>
    </div>
  )
}

/* Ícone real das distinções normais (diamante) e do inventário CS2
   (cara dourada). A imagem é usada tal como foi enviada, só com o
   fundo removido; a cor do diamante muda por distinção. */
function IconeArte({ badge, size, anim, glow }) {
  return (
    <div
      className={`relative shrink-0 ${anim}`}
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${Math.max(4, size * 0.14)}px ${hexToRgba(glow, 0.5)})`,
      }}
      title={badge.desc}
    >
      <img
        src={badge.icone}
        alt=""
        draggable={false}
        className={`h-full w-full ${badge.iconeFit === 'cover' ? 'object-cover' : 'object-contain'}`}
        style={badge.iconePos ? { objectPosition: badge.iconePos } : undefined}
      />
    </div>
  )
}

/* A cara de diabo (joia facetada + chifres + olhos) — fica só para
   as distinções de overclock, que mantêm o ícone antigo. */
export function BadgeGem({ badge, size = 56 }) {
  const dev = badge.id === 'dev'
  const top1 = badge.id === 'top1'
  const uid = badge.id
  const anim = ANIM_CLASS[badge.anim] || ''
  const ic = badge.ic // 'cpu' | 'ram' | 'both' (distinções de overclock)
  const arte = badge.arte || (top1 ? 'top1' : 'gem')
  const semChifres = arte === 'r6' || arte === 'cs2'
  const obsidian = arte === 'obsidian'
  const fortnite = arte === 'fortnite'
  const cs2 = arte === 'cs2'
  const r6 = arte === 'r6'
  const streak = arte === 'streak'

  // Paleta da gema: top1 é preta com olhos laranja; as outras usam a cor da distinção
  const gemLight = cs2 ? '#4B5563' : obsidian ? '#7C3AED' : top1 ? '#3A3A44' : badge.light
  const gemColor = cs2 ? '#111827' : obsidian ? '#2E1065' : top1 ? '#111116' : badge.color
  const gemDark = cs2 ? '#000000' : obsidian ? '#0B0418' : top1 ? '#000000' : badge.dark
  const olhoFill = obsidian
    ? '#D8B4FE'
    : fortnite
      ? '#FFFFFF'
      : top1
        ? '#FF8A1A'
        : streak
          ? '#FF2D2D'
          : '#08080e'
  const olhoGlow = obsidian ? '#A855F7' : fortnite ? '#C084FC' : top1 ? '#FF6B00' : streak ? '#FF0000' : null
  const glow = badge.glow || badge.color

  if (badge.icone) {
    return <IconeArte badge={badge} size={size} anim={anim} glow={glow} />
  }

  if (badge.icon === 'euro') {
    return (
      <div
        className={`relative shrink-0 ${anim}`}
        style={{
          width: size,
          height: size,
          filter: `drop-shadow(0 0 9px ${hexToRgba(glow, 0.65)})`,
        }}
        title={badge.desc}
      >
        <svg viewBox="0 0 100 100" className="relative h-full w-full">
          <defs>
            <radialGradient id={`euro-${uid}`} cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#fff8d6" />
              <stop offset="45%" stopColor="#f5c542" />
              <stop offset="100%" stopColor="#8a5a00" />
            </radialGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill={`url(#euro-${uid})`}
            stroke="#fff3b0"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="37"
            fill="none"
            stroke="#7a4d00"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          <text
            x="50"
            y="68"
            textAnchor="middle"
            fontFamily="Inter, Arial, sans-serif"
            fontSize="52"
            fontWeight="800"
            fill="#ffffff"
          >
            €
          </text>
        </svg>
      </div>
    )
  }

  /* Overclock mantém a joia com o ícone de CPU/RAM. Todas as outras
     distinções passam a usar a estrela, sem fundo. */
  if (!ic) {
    return (
      <StarBadge
        badge={badge}
        size={size}
        anim={anim}
        corLight={gemLight}
        cor={gemColor}
        corDark={gemDark}
        olhoFill={olhoFill}
        olhoGlow={olhoGlow}
        glow={glow}
      />
    )
  }

  return (
    <div
      className={`relative shrink-0 ${anim}`}
      style={{
        width: size,
        height: size,
        // eslint-disable-next-line react/forbid-dom-props
        ['--gem']: badge.color,
        filter: `drop-shadow(0 0 ${dev ? 18 : 9}px ${hexToRgba(glow, 0.73)})`,
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
          {obsidian && (
            <linearGradient id={`ob-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F3E8FF">
                <animate attributeName="stop-color" values="#F3E8FF;#C084FC;#A855F7;#F3E8FF" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#A855F7">
                <animate attributeName="stop-color" values="#A855F7;#7C3AED;#C084FC;#A855F7" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          )}
          {/* brilho dos olhos (top1 / obsidian / fortnite) */}
          {olhoGlow && (
            <filter id={`og-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur
                stdDeviation={streak ? 2.2 + Math.min(3, ((badge.nivel || 5) - 5) * 0.35) : 2.4}
                result="b"
              />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* chifres (só as caras de diabo; R6/CS2 são letras) */}
        {!ic && !semChifres && (
          <>
            <path
              d="M42,29 Q32,20 24,6 Q20,22 30,36 Z"
              fill={`url(#fh-${uid})`}
              stroke={top1 || obsidian || streak ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.45)'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M58,29 Q68,20 76,6 Q80,22 70,36 Z"
              fill={`url(#fh-${uid})`}
              stroke={top1 || obsidian || streak ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.45)'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* cabeça / gema circular */}
        <circle cx="50" cy="58" r="30" fill={`url(#fg-${uid})`} />

        {/* facetas do cristal (recortadas à volta) */}
        <g clipPath={`url(#fc-${uid})`}>
          <polygon points="22,46 50,34 42,64" fill="#fff" opacity={top1 || obsidian || streak ? '0.07' : '0.16'} />
          <polygon points="50,34 80,50 60,66" fill="#000" opacity={top1 || obsidian || streak ? '0.30' : '0.14'} />
          <polygon points="20,58 42,64 34,86" fill="#fff" opacity={top1 || obsidian || streak ? '0.05' : '0.10'} />
          <polygon points="42,64 60,66 54,88" fill="#000" opacity={top1 || obsidian || streak ? '0.35' : '0.20'} />
          <polygon points="60,66 82,60 70,86" fill="#fff" opacity={top1 || obsidian || streak ? '0.06' : '0.12'} />
          <polygon points="32,78 72,80 50,96" fill="#000" opacity={top1 || obsidian || streak ? '0.40' : '0.24'} />
          {/* brilho do vidro */}
          <ellipse
            cx="36"
            cy="44"
            rx="13"
            ry="8"
            fill="#fff"
            opacity={top1 || obsidian || streak ? '0.10' : '0.25'}
            transform="rotate(-22 36 44)"
          />
        </g>

        {/* contorno da gema */}
        <circle
          cx="50"
          cy="58"
          r="30"
          fill="none"
          stroke={top1 || obsidian || streak ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.55)'}
          strokeWidth="2.5"
        />

        {/* olhos de diabo (top1 / obsidian / fortnite) */}
        {!ic && !semChifres && (
          <g filter={olhoGlow ? `url(#og-${uid})` : undefined}>
            <polygon points="26,50 48,60 46,67 28,60" fill={olhoFill} />
            <polygon points="74,50 52,60 54,67 72,60" fill={olhoFill} />
          </g>
        )}

        {/* letras R6 / CS2 no centro */}
        {(r6 || cs2) && (
          <text
            x="50"
            y="69"
            textAnchor="middle"
            fontFamily="Archivo, Inter, sans-serif"
            fontSize="30"
            fontWeight="900"
            letterSpacing="-1"
            fill={r6 ? '#FFFFFF' : '#FFFFFF'}
            style={{
              filter: r6
                ? 'drop-shadow(0 0 3px #FF1F3D)'
                : 'drop-shadow(0 0 3px rgba(255,255,255,.65))',
            }}
          >
            {r6 ? 'R6' : 'CS2'}
          </text>
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
        style={
          dev
            ? undefined
            : {
                color: badge.labelColor || badge.color,
                textShadow: `0 0 10px ${hexToRgba(badge.labelColor || badge.color, 0.7)}`,
              }
        }
      >
        {badge.label}
      </span>
      {badge.desc ? (
        <span className="text-[10px] font-semibold leading-tight text-gray-400">{badge.desc}</span>
      ) : null}
    </div>
  )
}
