/* ============================================================
   Temas de perfil — banners animados e fundos de página
   ------------------------------------------------------------
   O id é guardado em user_profiles.banner_id / background_id.
   As classes CSS vivem em index.css (perfil-banner-*, perfil-fundo-*).
   ============================================================ */

export const BANNERS = [
  { id: 'aurora', nome: 'Aurora', cor: '#8b5cf6' },
  { id: 'neon', nome: 'Neon', cor: '#f0abfc' },
  { id: 'fogo', nome: 'Fogo', cor: '#fb923c' },
  { id: 'gelo', nome: 'Gelo', cor: '#38bdf8' },
  { id: 'galaxia', nome: 'Galáxia', cor: '#c084fc' },
  { id: 'glitch', nome: 'Glitch', cor: '#22d3ee' },
  { id: 'ouro', nome: 'Ouro', cor: '#fbbf24' },
  { id: 'cyber', nome: 'Cyber', cor: '#4ade80' },
  { id: 'holo', nome: 'Holográfico', cor: '#f472b6' },
]

export const FUNDOS = [
  { id: '', nome: 'Padrão', cor: '#8b5cf6' },
  { id: 'aurora', nome: 'Aurora', cor: '#8b5cf6' },
  { id: 'neon', nome: 'Neon', cor: '#e879f9' },
  { id: 'fogo', nome: 'Fogo', cor: '#f97316' },
  { id: 'gelo', nome: 'Gelo', cor: '#38bdf8' },
  { id: 'galaxia', nome: 'Galáxia', cor: '#a855f7' },
  { id: 'cyber', nome: 'Cyber', cor: '#22c55e' },
  { id: 'ouro', nome: 'Ouro', cor: '#eab308' },
]

const byId = (lista, id) => lista.find((x) => x.id === id) || null

export const bannerDe = (id) => byId(BANNERS, id) || BANNERS[0]
export const fundoDe = (id) => byId(FUNDOS, id) || FUNDOS[0]

export const classeBanner = (id) => `perfil-banner perfil-banner-${bannerDe(id).id}`
export const classeFundo = (id) => (id ? `perfil-fundo perfil-fundo-${id}` : '')
