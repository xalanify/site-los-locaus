/* Sparkline simples (SVG) — inspirado nos Stat Cards do EasyUI. */
export default function Sparkline({ values = [], color = '#a78bfa', height = 34, className = '' }) {
  const nums = (Array.isArray(values) ? values : []).map((v) => Number(v) || 0)
  if (nums.length < 2) return null
  const max = Math.max(1, ...nums)
  const min = Math.min(...nums)
  const w = 100
  const h = height
  const span = Math.max(1, max - min)
  const pontos = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * w
    const y = h - 4 - ((v - min) / span) * (h - 8)
    return [x, y]
  })
  const linha = pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${linha} L${w},${h} L0,${h} Z`
  const id = `sp-${String(color).replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={linha} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
