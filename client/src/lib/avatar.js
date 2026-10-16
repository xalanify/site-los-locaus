/* Avatares de recurso (fallback) — SVG inline, nunca dependem da rede.
   Usados quando a API do YouTube não devolve a foto ou quando a
   imagem externa falha em carregar (ex.: via.placeholder.com). */

function initialsOf(name) {
  const clean = String(name || '')
    .trim()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
  if (clean.length === 0) return 'AJ'
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase()
  return (clean[0][0] + clean[1][0]).toUpperCase()
}

export function svgAvatar(label = 'AJ', color = '#8b5cf6') {
  const initials = initialsOf(label)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="#0f0f0f"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="80" fill="#1a1a1a"/>
  <circle cx="80" cy="80" r="74" fill="url(#g)"/>
  <circle cx="80" cy="80" r="74" fill="rgba(0,0,0,0.25)"/>
  <text x="80" y="80" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="800"
        fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}
