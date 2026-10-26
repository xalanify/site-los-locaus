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
  {
    id: 'g18',
    nome: 'War 01',
    ficheiro: '/perfil/cardbanner/18.webp',
    cor: '#ef4444',
  },
  {
    id: 'g19',
    nome: 'War 02',
    ficheiro: '/perfil/cardbanner/19.webp',
    cor: '#f59e0b',
  },
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
    cor: '#d0cb69',
    cor2: '#8ebc5e',
    rgb: '208 203 105',
    imagem: '/perfil/fundos/01.jpg',
  },
  {
    id: 'f02',
    nome: 'Operação',
    cor: '#94a3b8',
    cor2: '#64748b',
    rgb: '148 163 184',
    imagem: '/perfil/fundos/02.jpg',
  },
  {
    id: 'f03',
    nome: 'Espaço',
    cor: '#2f91d6',
    cor2: '#353cb2',
    rgb: '47 145 214',
    imagem: '/perfil/fundos/03.jpg',
  },
  {
    id: 'f04',
    nome: 'Black Ops',
    cor: '#38bbc9',
    cor2: '#3d64a5',
    rgb: '56 187 201',
    imagem: '/perfil/fundos/04.jpg',
  },
  {
    id: 'f05',
    nome: 'Black Ops II',
    cor: '#94a3b8',
    cor2: '#64748b',
    rgb: '148 163 184',
    imagem: '/perfil/fundos/05.jpg',
  },
  {
    id: 'f06',
    nome: 'World at War',
    cor: '#5e8ccc',
    cor2: '#5f53b8',
    rgb: '94 140 204',
    imagem: '/perfil/fundos/06.jpg',
  },
  {
    id: 'f07',
    nome: 'GTA V — Los Santos',
    cor: '#dc6575',
    cor2: '#c9865a',
    rgb: '220 101 117',
    imagem: '/perfil/fundos/07.jpg',
  },
  {
    id: 'f08',
    nome: 'GTA V — Pier',
    cor: '#c59048',
    cor2: '#9fa946',
    rgb: '197 144 72',
    imagem: '/perfil/fundos/08.jpg',
  },
  {
    id: 'f09',
    nome: 'Red Dead 1',
    cor: '#e84642',
    cor2: '#d18f39',
    rgb: '232 70 66',
    imagem: '/perfil/fundos/09.jpg',
  },
  {
    id: 'f10',
    nome: 'Red Dead 2',
    cor: '#c86052',
    cor2: '#b28e49',
    rgb: '200 96 82',
    imagem: '/perfil/fundos/10.jpg',
  },
  {
    id: 'f11',
    nome: 'Espaço 01',
    cor: '#597fcb',
    cor2: '#634fb6',
    rgb: '89 127 203',
    imagem: '/perfil/fundos/11.jpg',
  },
  {
    id: 'f12',
    nome: 'Espaço 02',
    cor: '#2967d6',
    cor2: '#4933ad',
    rgb: '41 103 214',
    imagem: '/perfil/fundos/12.jpg',
  },
  {
    id: 'f13',
    nome: 'War 01',
    cor: '#94a3b8',
    cor2: '#64748b',
    rgb: '148 163 184',
    imagem: '/perfil/fundos/13.jpg',
  },
  {
    id: 'f14',
    nome: 'War 02',
    cor: '#94a3b8',
    cor2: '#64748b',
    rgb: '148 163 184',
    imagem: '/perfil/fundos/14.jpg',
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

export const CORES_BORDA = [
  { id: 'banner', nome: 'Cor do banner', cor: '' },
  { id: 'branco', nome: 'Branco', cor: '#ffffff' },
  { id: 'preto', nome: 'Preto', cor: '#000000' },
  { id: 'violeta', nome: 'Violeta', cor: '#8b5cf6' },
  { id: 'azul', nome: 'Azul', cor: '#38bdf8' },
  { id: 'verde', nome: 'Verde', cor: '#22c55e' },
  { id: 'ambar', nome: 'Âmbar', cor: '#f59e0b' },
  { id: 'rosa', nome: 'Rosa', cor: '#ec4899' },
  { id: 'ciano', nome: 'Ciano', cor: '#22d3ee' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#ef4444' },
  { id: 'roxo', nome: 'Roxo', cor: '#a855f7' },
]

export const corBordaDe = (id, bannerCor) => {
  const c = CORES_BORDA.find((x) => x.id === id)
  return (c && c.cor) || bannerCor
}

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
    nome: 'GTA 4 Theme Novo',
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
