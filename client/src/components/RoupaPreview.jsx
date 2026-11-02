/* ============================================================
   Peça de roupa — silhueta original (SVG) com estampa inspirada
   nas artes das edições. Se existir /roupas/<valor>.png, a foto
   real substitui a silhueta.
   ============================================================ */

const CORES = {
  'tee-stealth': '#cbd5e1',
  'tee-racing': '#ef4444',
  'tee-night': '#84cc16',
  'shorts-operator': '#a3a3a3',
  'calcas-cargo': '#78716c',
  'calcas-track': '#f7a8a8',
}

function Estampa({ tipo }) {
  if (tipo === 'night') {
    return (
      <g clipPath="url(#camisa-print)">
        <rect x="30" y="26" width="20" height="18" fill="#0a0d0f" />
        <path d="M34 40 q6 -9 12 0 z" fill="#141a1d" />
        <circle cx="37" cy="36" r="1.6" fill="#d9f99d" />
        <circle cx="43" cy="36" r="1.6" fill="#d9f99d" />
        <rect x="34" y="27" width="12" height="2" fill="#1f262a" />
        <text x="40" y="50" textAnchor="middle" fill="#d9f99d" fontSize="2.6" fontWeight="900" letterSpacing="0.8">
          NIGHT OPS
        </text>
      </g>
    )
  }
  if (tipo === 'stealth') {
    return (
      <g clipPath="url(#camisa-print)">
        <rect x="30" y="26" width="20" height="18" fill="#dfe3e5" />
        <path d="M30 40 l5 -3 l5 3 l5 -3 l5 3 v4 h-20 z" fill="#c3c9cc" />
        <path d="M34 32 l9 -2 l5 2 v1 l-6 -1 l1 1 l-4 -1 l-5 0 z" fill="#101416" />
        <text x="40" y="49" textAnchor="middle" fill="#5b6469" fontSize="2.4" fontWeight="800" letterSpacing="1">
          STEALTH
        </text>
      </g>
    )
  }
  if (tipo === 'racing') {
    return (
      <g clipPath="url(#camisa-print)">
        <rect x="30" y="26" width="20" height="18" fill="#1b1f23" />
        <circle cx="35" cy="41" r="4" fill="#0d1012" />
        <circle cx="46" cy="42" r="3" fill="#0d1012" />
        <path d="M32 39 l9 -3 l3 3 l-2 3 l-7 1 z" fill="#c0392b" />
        <circle cx="40" cy="33" r="3" fill="#e8ebee" />
        <rect x="30" y="44" width="20" height="2" fill="#e5c53f" />
        <text x="40" y="50" textAnchor="middle" fill="#e5c53f" fontSize="2.4" fontWeight="900" letterSpacing="1">
          APEX
        </text>
      </g>
    )
  }
  return null
}

export default function RoupaPreview({ valor = '', className = '' }) {
  const cor = CORES[valor] || '#d4d4d8'
  const tipo = valor.startsWith('tee')
    ? 'tee'
    : valor.startsWith('shorts')
      ? 'shorts'
      : 'calcas'
  const estampa = valor === 'tee-night' ? 'night' : valor === 'tee-stealth' ? 'stealth' : valor === 'tee-racing' ? 'racing' : null

  return (
    <span className={`roupa-mini ${className}`}>
      <svg viewBox="0 0 80 72" aria-hidden="true">
        <defs>
          <clipPath id="camisa-print">
            <rect x="30" y="26" width="20" height="18" rx="1" />
          </clipPath>
        </defs>
        <rect width="80" height="72" fill="#111114" />
        {tipo === 'tee' && (
          <>
            <path
              d="M22 14 L32 8 L40 12 L48 8 L58 14 L54 28 L48 26 L48 62 L32 62 L32 26 L26 28 Z"
              fill="#1c1f23"
              stroke={cor}
              strokeWidth="1.4"
            />
            <path d="M34 8 Q40 16 46 8" fill="none" stroke={cor} strokeWidth="1.2" />
            <Estampa tipo={estampa} />
          </>
        )}
        {tipo === 'shorts' && (
          <>
            <path
              d="M24 12 H56 L61 44 L46 48 L40 32 L34 48 L19 44 Z"
              fill="#1c1f23"
              stroke={cor}
              strokeWidth="1.4"
            />
            <path d="M24 18 H56" stroke={cor} strokeWidth="1.2" opacity="0.8" />
            <rect x="37" y="22" width="6" height="2" fill={cor} opacity="0.7" />
            <text x="40" y="40" textAnchor="middle" fill={cor} fontSize="3" fontWeight="900" letterSpacing="1">
              LOCAUS
            </text>
          </>
        )}
        {tipo === 'calcas' && (
          <>
            <path
              d="M26 8 H54 L58 64 H45 L40 30 L35 64 H22 Z"
              fill="#1c1f23"
              stroke={cor}
              strokeWidth="1.4"
            />
            <path d="M26 14 H54" stroke={cor} strokeWidth="1.2" opacity="0.8" />
            <rect x="30" y="34" width="8" height="6" fill="none" stroke={cor} strokeWidth="0.9" opacity="0.7" />
            <rect x="42" y="34" width="8" height="6" fill="none" stroke={cor} strokeWidth="0.9" opacity="0.7" />
            <text x="40" y="22" textAnchor="middle" fill={cor} fontSize="2.6" fontWeight="900" letterSpacing="1">
              LOCAUS
            </text>
          </>
        )}
      </svg>
      <img
        src={`/roupas/${valor}.png`}
        alt=""
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    </span>
  )
}
