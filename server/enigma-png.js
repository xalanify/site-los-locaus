/* ============================================================
   Gera a imagem PNG da etapa 3 sem dependências externas.
   Fundo escuro, tipografia 5x7, a palavra em grande.
   ============================================================ */

const zlib = require('zlib')

const FONTE = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

const TABELA_CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABELA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, dados) {
  const nome = Buffer.from(tipo, 'ascii')
  const corpo = Buffer.concat([nome, dados])
  const out = Buffer.alloc(12 + dados.length)
  out.writeUInt32BE(dados.length, 0)
  corpo.copy(out, 4)
  out.writeUInt32BE(crc32(corpo), 8 + dados.length)
  return out
}

function criarPng(w, h, pixels) {
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    assinatura,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function pintar(pixels, w, h, x, y, cor) {
  if (x < 0 || y < 0 || x >= w || y >= h) return
  const i = (y * w + x) * 4
  pixels[i] = cor[0]
  pixels[i + 1] = cor[1]
  pixels[i + 2] = cor[2]
  pixels[i + 3] = 255
}

function desenharTexto(pixels, w, h, texto, x0, y0, escala, cor) {
  let x = x0
  for (const bruto of String(texto).toUpperCase()) {
    const glifo = FONTE[bruto] || FONTE[' ']
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glifo[gy][gx] !== '1') continue
        const px = x + gx * escala
        const py = y0 + gy * escala
        for (let dy = 0; dy < escala; dy++) {
          for (let dx = 0; dx < escala; dx++) {
            pintar(pixels, w, h, px + dx, py + dy, cor)
          }
        }
      }
    }
    x += 6 * escala
  }
}

function larguraTexto(texto, escala) {
  return String(texto).length * 6 * escala - escala
}

function gerarPngCifra(palavra) {
  const w = 960
  const h = 520
  const pixels = Buffer.alloc(w * h * 4)
  const vermelho = [255, 45, 85]
  const rosa = [255, 143, 163]
  const branco = [245, 245, 248]
  const cinza = [120, 112, 118]

  /* fundo em gradiente + brilho vermelho no topo */
  for (let y = 0; y < h; y++) {
    const t = y / h
    const r = Math.round(11 * (1 - t) + 5 * t)
    const g = Math.round(5 * (1 - t) + 3 * t)
    const b = Math.round(7 * (1 - t) + 5 * t)
    for (let x = 0; x < w; x++) {
      const halo = Math.max(0, 1 - (x - w / 2) ** 2 / (w * w) - (y - 0) ** 2 / (h * h))
      const i = (y * w + x) * 4
      pixels[i] = Math.min(255, r + Math.round(halo * 45))
      pixels[i + 1] = g + Math.round(halo * 6)
      pixels[i + 2] = b + Math.round(halo * 14)
      pixels[i + 3] = 255
    }
  }

  /* estrelas */
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(Math.random() * w)
    const y = Math.floor(Math.random() * h)
    const brilho = 0.5 + Math.random() * 0.5
    pintar(pixels, w, h, x, y, [Math.round(220 * brilho), Math.round(225 * brilho), Math.round(235 * brilho)])
  }

  /* moldura */
  for (let x = 24; x < w - 24; x++) {
    pintar(pixels, w, h, x, 24, [255, 255, 255])
    pintar(pixels, w, h, x, h - 25, [255, 255, 255])
  }
  for (let y = 24; y < h - 24; y++) {
    pintar(pixels, w, h, 24, y, [255, 255, 255])
    pintar(pixels, w, h, w - 25, y, [255, 255, 255])
  }

  desenharTexto(pixels, w, h, 'PROTOCOLO ORION', 48, 56, 3, rosa)
  desenharTexto(pixels, w, h, 'CIFRA DOS NAVEGADORES', 48, 92, 2, cinza)

  desenharTexto(pixels, w, h, 'A PALAVRA:', 48, 180, 3, cinza)

  /* palavra em grande, centrada */
  const escala = 14
  const larg = larguraTexto(palavra, escala)
  desenharTexto(pixels, w, h, palavra, Math.max(48, Math.round((w - larg) / 2)), 230, escala, vermelho)

  desenharTexto(pixels, w, h, 'SUFIXO NO NOME DO FICHEIRO', 48, 430, 2, cinza)
  desenharTexto(pixels, w, h, 'JUNTA PALAVRA-SUFIXO', 48, 462, 2, rosa)

  return criarPng(w, h, pixels)
}

module.exports = { gerarPngCifra }
