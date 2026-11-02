/* ============================================================
   Peça de roupa — silhueta original (SVG) com suporte a imagem
   real em /roupas/<valor>.png (basta largar o ficheiro lá).
   ============================================================ */

const CORES = {
  'tee-stealth': '#cbd5e1',
  'tee-racing': '#ef4444',
  'tee-night': '#84cc16',
  'shorts-operator': '#a3a3a3',
  'calcas-cargo': '#78716c',
  'calcas-track': '#f7a8a8',
}

export default function RoupaPreview({ valor = '', className = '' }) {
  const cor = CORES[valor] || '#d4d4d8'
  const tipo = valor.startsWith('tee')
    ? 'tee'
    : valor.startsWith('shorts')
      ? 'shorts'
      : 'calcas'

  return (
    <span className={`roupa-mini ${className}`}>
      <svg viewBox="0 0 80 72" aria-hidden="true">
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
            <text
              x="40"
              y="40"
              textAnchor="middle"
              fill={cor}
              fontSize="5.5"
              fontWeight="900"
              letterSpacing="0.6"
            >
              LOCAUS
            </text>
            <rect x="34" y="45" width="12" height="2" fill={cor} opacity="0.7" />
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
            <rect x="37" y="20" width="6" height="2" fill={cor} opacity="0.7" />
            <rect x="30" y="34" width="8" height="6" fill="none" stroke={cor} strokeWidth="0.9" opacity="0.7" />
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
