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

export const BANNERS = [
  { id: '', nome: 'Padrão', ficheiro: '', cor: '#8b5cf6' },
  ...Array.from({ length: 17 }, (_, i) => {
    const n = dois(i + 1)
    return {
      id: `g${n}`,
      nome: `Banner ${n}`,
      ficheiro: `/perfil/cardbanner/${n}.webp`,
      cor: CORES_BANNER[i % CORES_BANNER.length] || '#a855f7',
    }
  }),
]

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
    imagem: '/perfil/fundos/01.jpg',
  },
  {
    id: 'f02',
    nome: 'Operação',
    cor: '#cbd5e1',
    cor2: '#94a3b8',
    rgb: '203 213 225',
    imagem: '/perfil/fundos/02.jpg',
  },
  {
    id: 'f03',
    nome: 'Espaço',
    cor: '#38bdf8',
    cor2: '#818cf8',
    rgb: '56 189 248',
    imagem: '/perfil/fundos/03.jpg',
  },
  {
    id: 'f04',
    nome: 'Black Ops',
    cor: '#f97316',
    cor2: '#facc15',
    rgb: '249 115 22',
    imagem: '/perfil/fundos/04.jpg',
  },
  {
    id: 'f05',
    nome: 'Black Ops II',
    cor: '#38bdf8',
    cor2: '#f97316',
    rgb: '56 189 248',
    imagem: '/perfil/fundos/05.jpg',
  },
  {
    id: 'f06',
    nome: 'World at War',
    cor: '#a3e635',
    cor2: '#d97706',
    rgb: '163 230 53',
    imagem: '/perfil/fundos/06.jpg',
  },
  {
    id: 'f07',
    nome: 'GTA V — Los Santos',
    cor: '#f472b6',
    cor2: '#f59e0b',
    rgb: '244 114 182',
    imagem: '/perfil/fundos/07.jpg',
  },
  {
    id: 'f08',
    nome: 'GTA V — Pier',
    cor: '#38bdf8',
    cor2: '#fb923c',
    rgb: '56 189 248',
    imagem: '/perfil/fundos/08.jpg',
  },
  {
    id: 'f09',
    nome: 'Red Dead 1',
    cor: '#ef4444',
    cor2: '#f59e0b',
    rgb: '239 68 68',
    imagem: '/perfil/fundos/09.jpg',
  },
  {
    id: 'f10',
    nome: 'Red Dead 2',
    cor: '#f97316',
    cor2: '#fbbf24',
    rgb: '249 115 22',
    imagem: '/perfil/fundos/10.jpg',
  },
  {
    id: 'f11',
    nome: 'Espaço 01',
    cor: '#818cf8',
    cor2: '#22d3ee',
    rgb: '129 140 248',
    imagem: '/perfil/fundos/11.jpg',
  },
  {
    id: 'f12',
    nome: 'Espaço 02',
    cor: '#c084fc',
    cor2: '#38bdf8',
    rgb: '192 132 252',
    imagem: '/perfil/fundos/12.jpg',
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
  {
    id: 'm03',
    nome: 'BO3 Damned',
    ficheiro: '/perfil/musicas/03.mp3',
  },
  {
    id: 'm04',
    nome: 'COD 4 Theme',
    ficheiro: '/perfil/musicas/04.mp3',
  },
  {
    id: 'm05',
    nome: 'COD WaW 2008',
    ficheiro: '/perfil/musicas/05.mp3',
  },
  {
    id: 'm06',
    nome: 'COD WWII 2017',
    ficheiro: '/perfil/musicas/06.mp3',
  },
  {
    id: 'm07',
    nome: 'GTA 4 Theme',
    ficheiro: '/perfil/musicas/07.mp3',
  },
  {
    id: 'm08',
    nome: 'GTA 5 Menu Pausa',
    ficheiro: '/perfil/musicas/08.mp3',
  },
  {
    id: 'm09',
    nome: 'GTA 5 Theme',
    ficheiro: '/perfil/musicas/09.mp3',
  },
  {
    id: 'm10',
    nome: 'GTA Liberty City',
    ficheiro: '/perfil/musicas/10.mp3',
  },
  {
    id: 'm11',
    nome: 'MW2 Music',
    ficheiro: '/perfil/musicas/11.mp3',
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
