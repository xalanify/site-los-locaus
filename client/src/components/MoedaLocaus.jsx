/* ============================================================
   Moeda Locaus — moeda virtual do site
   1 acerto nas previsões = 1 Moeda Locaus.
   Design bimetálico tipo moeda de 2€: anel prateado, núcleo
   dourado e "L" branco gravado no meio.
   ============================================================ */
export default function MoedaLocaus({ size = 20, className = '' }) {
  const reinos = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2
    const x1 = 32 + Math.cos(a) * 28.6
    const y1 = 32 + Math.sin(a) * 28.6
    const x2 = 32 + Math.cos(a) * 30.4
    const y2 = 32 + Math.sin(a) * 30.4
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
        {/* anel prateado */}
        <linearGradient id="locPrata" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#e8eaee" />
          <stop offset="0.62" stopColor="#b9bec6" />
          <stop offset="0.85" stopColor="#8b929c" />
          <stop offset="1" stopColor="#6d737d" />
        </linearGradient>
        {/* núcleo dourado */}
        <radialGradient id="locOuro" cx="36%" cy="28%" r="85%">
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset="0.3" stopColor="#f7dc86" />
          <stop offset="0.62" stopColor="#e2ae26" />
          <stop offset="0.85" stopColor="#b57c08" />
          <stop offset="1" stopColor="#8a5c04" />
        </radialGradient>
        <linearGradient id="locLuz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* disco prateado com serrilha */}
      <circle cx="32" cy="32" r="30" fill="url(#locPrata)" stroke="#5d636c" strokeWidth="1.2" />
      <g stroke="#7c828b" strokeWidth="0.6" opacity="0.5">
        {reinos}
      </g>

      {/* núcleo dourado */}
      <circle cx="32" cy="32" r="21.5" fill="url(#locOuro)" stroke="#8a5c04" strokeWidth="0.9" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#fff3b0" strokeOpacity="0.5" strokeWidth="0.9" />

      {/* brilho */}
      <path d="M13 22a22 22 0 0 1 13-11" fill="none" stroke="url(#locLuz)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12.5 43a22 22 0 0 0 8 8" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />

      {/* L branco gravado */}
      <g>
        <path
          d="M26 20.5h5.6v17.4h9.4v5.6H26z"
          fill="#ffffff"
          stroke="#8a5c04"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <path d="M26 20.5h5.6v2.2h-3.2v18.6H26z" fill="#fffbe6" opacity="0.6" />
      </g>

      <circle cx="32" cy="32" r="30" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1" />
    </svg>
  )
}
