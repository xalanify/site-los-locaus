/* ============================================================
   Artes das edições limitadas — ilustrações originais em SVG
   (leves, sem imagens externas). Se existir uma foto real em
   /edicoes/<id>.jpg, ela é usada por cima desta arte.
   ============================================================ */

export default function ArteEdicao({ id }) {
  if (id === 'edicao-remember') {
    return (
      <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
        <defs>
          <linearGradient id="rem-fundo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#111417" />
            <stop offset="1" stopColor="#0a0c0e" />
          </linearGradient>
        </defs>
        <rect width="160" height="200" fill="url(#rem-fundo)" />
        <rect x="12" y="10" width="136" height="180" rx="7" fill="#15191c" stroke="#2a3035" />
        <rect x="24" y="22" width="112" height="36" rx="3" fill="#0a0d0f" stroke="#242a2f" />
        <circle cx="38" cy="40" r="3" fill="#39424a" />
        <circle cx="50" cy="40" r="3" fill="#39424a" />
        <circle cx="62" cy="40" r="3" fill="#e25c5c" />
        <circle cx="74" cy="40" r="3" fill="#4ade80" />
        <rect x="104" y="35" width="22" height="9" rx="2" fill="#242a2f" />
        <g fill="#1f252a">
          <rect x="24" y="72" width="70" height="6" rx="2" />
          <rect x="24" y="84" width="52" height="6" rx="2" />
          <rect x="24" y="96" width="64" height="6" rx="2" />
          <rect x="24" y="108" width="44" height="6" rx="2" />
          <rect x="24" y="120" width="58" height="6" rx="2" />
        </g>
        <text x="80" y="158" textAnchor="middle" fill="#e25c5c" fontSize="14" fontWeight="900" letterSpacing="1.6">
          REMEMBER
        </text>
        <text x="80" y="173" textAnchor="middle" fill="#8a949c" fontSize="6.4" fontWeight="700" letterSpacing="3.2">
          NO RUSSIAN
        </text>
        <rect x="24" y="176" width="112" height="1" fill="#242a2f" />
      </svg>
    )
  }

  if (id === 'edicao-nightops') {
    return (
      <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
        <defs>
          <radialGradient id="noite-ceu" cx="50%" cy="38%" r="75%">
            <stop offset="0" stopColor="#181d20" />
            <stop offset="0.7" stopColor="#0d1012" />
            <stop offset="1" stopColor="#07090a" />
          </radialGradient>
          <radialGradient id="noite-olho" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f2ffd0" />
            <stop offset="0.45" stopColor="#c9f078" stopOpacity="0.95" />
            <stop offset="1" stopColor="#c9f078" stopOpacity="0" />
          </radialGradient>
          <filter id="noite-grao">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.16" />
            </feComponentTransfer>
          </filter>
          <linearGradient id="noite-horizonte" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c0f11" />
            <stop offset="1" stopColor="#050607" />
          </linearGradient>
        </defs>

        <rect width="160" height="200" fill="url(#noite-ceu)" />
        <path d="M0 166 Q34 152 70 162 T160 154 L160 200 L0 200 Z" fill="url(#noite-horizonte)" />
        <ellipse cx="80" cy="168" rx="66" ry="9" fill="#0a0c0e" opacity="0.7" />

        {/* soldado */}
        <g>
          <path d="M52 200 L52 152 Q52 128 66 121 L94 121 Q108 128 108 152 L108 200 Z" fill="#0b0e10" />
          <path d="M57 132 L103 132 L106 168 L54 168 Z" fill="#11161a" />
          <path d="M57 140 L103 140" stroke="#1b2227" strokeWidth="1.4" />
          <path d="M64 150 L96 150" stroke="#161c20" strokeWidth="2" />
          <rect x="70" y="152" width="9" height="12" fill="#1a2126" />
          <rect x="82" y="152" width="9" height="12" fill="#1a2126" />

          {/* cabeça */}
          <ellipse cx="80" cy="104" rx="19" ry="22" fill="#0a0d0f" />
          <path d="M62 104 Q62 84 80 84 Q98 84 98 104 L94 112 Q80 102 66 112 Z" fill="#151a1d" />
          <path d="M66 108 Q80 118 94 108 L94 118 Q80 128 66 118 Z" fill="#0c1012" />
          <rect x="75" y="72" width="10" height="9" rx="2" fill="#1b2227" />
          <rect x="66" y="64" width="10" height="9" rx="4" fill="#20282d" />
          <rect x="84" y="64" width="10" height="9" rx="4" fill="#20282d" />
          <rect x="92" y="80" width="5" height="6" rx="2" fill="#232b30" />

          <circle cx="71" cy="101" r="2.4" fill="#e6ffb0" />
          <circle cx="89" cy="101" r="2.4" fill="#e6ffb0" />
          <circle cx="71" cy="101" r="7" fill="url(#noite-olho)" />
          <circle cx="89" cy="101" r="7" fill="url(#noite-olho)" />

          {/* arma */}
          <g transform="rotate(-18 80 150)">
            <rect x="34" y="146" width="52" height="5" rx="1.5" fill="#0a0d0f" />
            <rect x="30" y="143" width="10" height="10" rx="1.5" fill="#0d1113" />
            <rect x="76" y="147" width="14" height="3" rx="1.5" fill="#0a0d0f" />
            <rect x="60" y="151" width="7" height="10" rx="1.5" fill="#0d1113" />
          </g>
        </g>

        <rect width="160" height="200" filter="url(#noite-grao)" opacity="0.5" />
        <rect width="160" height="200" fill="none" stroke="#000" strokeOpacity="0.35" />
      </svg>
    )
  }

  if (id === 'edicao-stealth') {
    return (
      <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
        <defs>
          <linearGradient id="ceu-frio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d6dadd" />
            <stop offset="1" stopColor="#c3c9cc" />
          </linearGradient>
          <filter id="neve-grao">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.1" />
            </feComponentTransfer>
          </filter>
        </defs>

        <rect width="160" height="200" fill="url(#ceu-frio)" />
        <path d="M0 120 L26 104 L52 118 L78 100 L104 116 L132 102 L160 118 L160 200 L0 200 Z" fill="#b3babe" />
        <path d="M0 132 L30 118 L58 132 L86 116 L114 132 L142 118 L160 130 L160 200 L0 200 Z" fill="#a2a9ad" />
        <path d="M0 148 L34 136 L66 150 L98 134 L130 150 L160 138 L160 200 L0 200 Z" fill="#e7eaeb" />
        <path d="M0 164 L40 152 L80 164 L120 152 L160 164 L160 200 L0 200 Z" fill="#f1f3f4" />

        {/* bombardeiros */}
        <g fill="#101416">
          <path d="M28 70 L88 58 L116 68 L118 72 L92 69 L96 75 L84 73 L52 72 Z" />
          <path d="M58 86 L92 80 L104 84 L104 86 L90 84 L94 88 L86 87 L66 86 Z" opacity="0.75" />
        </g>

        {/* cavaleiro */}
        <g fill="#0e1113">
          <path d="M112 170 q8 -8 16 -7 q6 1 8 5 l6 9 l-3 2 l-7 -9 q-5 -3 -10 0 l-6 8 l-2 -1 l5 -9 q-4 2 -5 6 l-1 6 l-2 0 l1 -7 q1 -6 0 -3 z" />
          <ellipse cx="124" cy="160" rx="6" ry="6" />
          <path d="M118 152 q6 -6 10 -1 l2 4 l-3 3 l-4 -3 l-3 4 z" />
        </g>
        <path d="M104 178 q10 -4 20 -3 l6 1 l-1 3 q-10 1 -18 3 z" fill="#cfd4d6" opacity="0.7" />

        <rect width="160" height="200" filter="url(#neve-grao)" opacity="0.6" />
        <text x="80" y="190" textAnchor="middle" fill="#6b7479" fontSize="6.2" fontWeight="800" letterSpacing="3.4">
          STEALTH
        </text>
      </svg>
    )
  }

  /* Edição extra (racing) — caso seja adicionada no futuro */
  return (
    <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
      <defs>
        <linearGradient id="pista" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d7276" />
          <stop offset="1" stopColor="#4b5054" />
        </linearGradient>
      </defs>
      <rect width="160" height="200" fill="url(#pista)" />
      <g opacity="0.28" fill="#e8ebee">
        <rect x="0" y="60" width="160" height="3" />
        <rect x="0" y="92" width="160" height="2" />
        <rect x="0" y="120" width="160" height="4" />
      </g>
      <circle cx="62" cy="150" r="22" fill="#0d1012" />
      <circle cx="62" cy="150" r="10" fill="#2a3034" />
      <circle cx="112" cy="158" r="14" fill="#0d1012" />
      <path d="M46 140 L104 128 L118 140 L110 152 L70 158 Z" fill="#c0392b" />
      <path d="M62 106 q14 -6 22 4 l10 22 l-14 4 l-8 -16 l-12 12 l-10 -6 z" fill="#d9dde0" />
      <circle cx="80" cy="98" r="10" fill="#1b2024" />
      <path d="M0 176 L160 168 L160 200 L0 200 Z" fill="#e5c53f" />
      <path d="M0 186 L160 180 L160 200 L0 200 Z" fill="#c0392b" />
    </svg>
  )
}
