/* ============================================================
   Cor dominante de uma imagem de fundo
   ------------------------------------------------------------
   Lê a imagem no browser (canvas), agrupa os pixéis por cor e
   devolve uma cor de destaque legível. Imagens escuras/cinzentas
   caem num cinza neutro em vez de inventar verde/laranja.
   ============================================================ */

const cache = new Map()

const NEUTRO = { cor: '#94a3b8', cor2: '#64748b', rgb: '148 163 184' }

function rgbParaHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return { h, s, l }
}

function hslParaHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const hex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function hexParaRgb(hex) {
  const limpo = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(limpo)) return NEUTRO.rgb
  return `${parseInt(limpo.slice(0, 2), 16)} ${parseInt(limpo.slice(2, 4), 16)} ${parseInt(limpo.slice(4, 6), 16)}`
}

export function extrairCores(src) {
  if (!src) return Promise.resolve(null)
  if (cache.has(src)) return Promise.resolve(cache.get(src))

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const n = 48
        const canvas = document.createElement('canvas')
        canvas.width = n
        canvas.height = n
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, n, n)
        const { data } = ctx.getImageData(0, 0, n, n)

        const bins = Array.from({ length: 24 }, () => ({ peso: 0, r: 0, g: 0, b: 0, n: 0 }))
        let total = 0

        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3]
          if (a < 180) continue
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const { h, s, l } = rgbParaHsl(r, g, b)
          if (l < 0.1 || l > 0.9) continue
          const peso = Math.pow(s, 1.35) * (1 - Math.abs(l - 0.52) * 1.2)
          if (peso <= 0) continue
          const bin = bins[Math.floor(h / 15) % 24]
          bin.peso += peso
          bin.r += r * peso
          bin.g += g * peso
          bin.b += b * peso
          bin.n += peso
          total += peso
        }

        const melhor = bins.reduce((a, b) => (b.peso > a.peso ? b : a), bins[0])
        if (!melhor || !melhor.n || !total || melhor.peso / total < 0.1) {
          cache.set(src, NEUTRO)
          resolve(NEUTRO)
          return
        }

        const mr = melhor.r / melhor.n
        const mg = melhor.g / melhor.n
        const mb = melhor.b / melhor.n
        const base = rgbParaHsl(mr, mg, mb)
        if (base.s < 0.12) {
          cache.set(src, NEUTRO)
          resolve(NEUTRO)
          return
        }

        const s = Math.max(0.52, Math.min(0.78, base.s * 0.95 + 0.1))
        const l = Math.max(0.5, Math.min(0.63, base.l * 0.35 + 0.44))
        const cor = hslParaHex(base.h, s, l)
        const cor2 = hslParaHex(base.h + 32, Math.max(0.4, s * 0.8), Math.max(0.42, l - 0.06))
        const out = { cor, cor2, rgb: hexParaRgb(cor) }
        cache.set(src, out)
        resolve(out)
      } catch {
        resolve(NEUTRO)
      }
    }
    img.onerror = () => resolve(NEUTRO)
    img.src = src
  })
}
