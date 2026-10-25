/* ============================================================
   Temas de perfil — banners (GIF), fundos e músicas
   ------------------------------------------------------------
   Os ficheiros vivem em client/public/perfil/.
   O id é guardado em user_profiles.banner_id / background_id /
   musica_id.
   ============================================================ */

const dois = (n) => String(n).padStart(2, '0')

const CORES_BANNER = [
  '#a855f7',
  '#22d3ee',
  '#f472b6',
  '#fb923c',
  '#818cf8',
  '#34d399',
  '#facc15',
  '#e879f9',
  '#38bdf8',
  '#f87171',
  '#c084fc',
  '#2dd4bf',
]

export const BANNERS = Array.from({ length: 12 }, (_, i) => {
  const n = dois(i + 1)
  return {
    id: `g${n}`,
    nome: `Banner ${n}`,
    ficheiro: `/perfil/cardbanner/${n}.gif`,
    cor: CORES_BANNER[i] || '#a855f7',
  }
})

export const FUNDOS = [
  {
    id: '',
    nome: 'Padrão',
    cor: '#8b5cf6',
    cor2: '#22d3ee',
    rgb: '139 92 246',
    imagem: '',
  },
  {
    id: 'f01',
    nome: 'Guerra',
    cor: '#a3e635',
    cor2: '#facc15',
    rgb: '163 230 53',
    imagem: '/perfil/fundos/01.png',
  },
  {
    id: 'f02',
    nome: 'Operação',
    cor: '#cbd5e1',
    cor2: '#94a3b8',
    rgb: '203 213 225',
    imagem: '/perfil/fundos/02.webp',
  },
  {
    id: 'f03',
    nome: 'Espaço',
    cor: '#38bdf8',
    cor2: '#818cf8',
    rgb: '56 189 248',
    imagem: '/perfil/fundos/03.jpg',
  },
]

export const CORES_ACENTO = [
  { id: 'auto', nome: 'Automática', cor: '' },
  { id: 'violeta', nome: 'Violeta', cor: '#8b5cf6' },
  { id: 'azul', nome: 'Azul', cor: '#38bdf8' },
  { id: 'verde', nome: 'Verde', cor: '#22c55e' },
  { id: 'ambar', nome: 'Âmbar', cor: '#f59e0b' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#ef4444' },
  { id: 'rosa', nome: 'Rosa', cor: '#ec4899' },
  { id: 'ciano', nome: 'Ciano', cor: '#22d3ee' },
]

export const MUSICAS = [
  {
    id: 'm01',
    nome: 'Damned',
    ficheiro: '/perfil/musicas/01.mp3',
  },
  {
    id: 'm02',
    nome: 'BO1 Theme',
    ficheiro: '/perfil/musicas/02.mp3',
  },
]

const achar = (lista, id) => lista.find((x) => x.id === id) || null

export const bannerDe = (id) => achar(BANNERS, id) || BANNERS[0]
export const fundoDe = (id) => achar(FUNDOS, id) || FUNDOS[0]
export const musicaDe = (id) => achar(MUSICAS, id)

export const hexParaRgb = (hex) => {
  const limpo = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(limpo)) return ''
  return `${parseInt(limpo.slice(0, 2), 16)} ${parseInt(limpo.slice(2, 4), 16)} ${parseInt(limpo.slice(4, 6), 16)}`
}

export const estiloFundo = (fundo) =>
  fundo && fundo.imagem
    ? {
        backgroundImage: `url(${fundo.imagem})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: 'none',
      }
    : undefined
