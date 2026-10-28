/* ============================================================
   Moeda Locaus — moeda virtual do site
   1 acerto nas previsões = 1 Moeda Locaus.
   Design próprio: bordo serrilhado, gravação em L, estrela e
   reflexo holográfico.
   ============================================================ */
export default function MoedaLocaus({ size = 20, className = '' }) {
  const raios = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2
    const x1 = 32 + Math.cos(a) * 28.4
    const y1 = 32 + Math.sin(a) * 28.4
    const x2 = 32 + Math.cos(a) * 30.2
    const y2 = 32 + Math.sin(a) * 30.2
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
  })

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Moeda Locaus"
    >
      <defs>
        <radialGradient id="moedaLocausOuro" cx="34%" cy="26%" r="82%">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.28" stopColor="#f9df8a" />
          <stop offset="0.58" stopColor="#e7b12a" />
          <stop offset="0.82" stopColor="#b77908" />
          <stop offset="1" stopColor="#6b4300" />
        </radialGradient>
        <linearGradient id="moedaLocausHolo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#e879f9" stopOpacity="0.6" />
          <stop offset="1" stopColor="#f5c542" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="moedaLocausLuz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="url(#moedaLocausOuro)" stroke="#5a3800" strokeWidth="1.4" />
      <g stroke="#7a4d00" strokeWidth="0.7" opacity="0.55">
        {raios}
      </g>
      <circle
        cx="32"
        cy="32"
        r="25.2"
        fill="none"
        stroke="#fff3b0"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />
      <circle
        cx="32"
        cy="32"
        r="21.6"
        fill="none"
        stroke="#7a4d00"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      <path
        d="M12.5 42.5a21.5 21.5 0 0 0 39 0"
        fill="none"
        stroke="url(#moedaLocausHolo)"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M10.5 24a24 24 0 0 1 15-14"
        fill="none"
        stroke="url(#moedaLocausLuz)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* L gravado */}
      <path
        d="M25.5 19.5h5.2v18.9h9.3v5.1H25.5z"
        fill="#ffffff"
        stroke="#6b4300"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M25.5 19.5h5.2v2.2h-3v16.7h-2.2z"
        fill="#fffbe6"
        opacity="0.55"
      />

      {/* estrela */}
      <path
        d="M32 7.2l1.7 3.4 3.7.5-2.7 2.6.6 3.7-3.3-1.7-3.3 1.7.6-3.7-2.7-2.6 3.7-.5z"
        fill="#fffbe6"
        opacity="0.9"
      />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#fff3b0" strokeOpacity="0.18" strokeWidth="1" />
    </svg>
  )
}
