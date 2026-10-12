/* ============================================================
   Aparência do perfil (experimental)
   ------------------------------------------------------------
   Banners criados AQUI pelo site — o utilizador não envia imagens,
   só escolhe entre as que existem. Tudo em CSS puro: leve, igual
   em qualquer ecrã e sem ficheiros para guardar.
   Acrescenta-se cor do nome e efeito da letra.
   ============================================================ */

export const BANNERS = [
  { id: 'nenhum', nome: 'Sem banner', style: null },

  {
    id: 'meia-noite',
    nome: 'Meia-noite',
    style:
      'radial-gradient(120% 170% at 12% 0%, rgba(139,92,246,.55) 0%, rgba(139,92,246,0) 58%),' +
      'radial-gradient(70% 130% at 88% 100%, rgba(255,122,26,.28) 0%, rgba(255,122,26,0) 62%),' +
      'linear-gradient(180deg, #0b0b13 0%, #000 100%)',
  },
  {
    id: 'lava',
    nome: 'Lava',
    style:
      'linear-gradient(115deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 45%),' +
      'linear-gradient(115deg, #000 0%, #2c0d04 38%, #7c2a08 68%, #ff7a1a 100%)',
  },
  {
    id: 'grade',
    nome: 'Grade neon',
    style:
      'repeating-linear-gradient(90deg, rgba(139,92,246,.28) 0 1px, transparent 1px 44px),' +
      'repeating-linear-gradient(0deg, rgba(139,92,246,.2) 0 1px, transparent 1px 44px),' +
      'radial-gradient(90% 150% at 70% -20%, rgba(139,92,246,.45) 0%, rgba(139,92,246,0) 70%),' +
      'linear-gradient(160deg, #12081f 0%, #000 75%)',
  },
  {
    id: 'faisca',
    nome: 'Faísca',
    style:
      'radial-gradient(55% 150% at 76% 15%, rgba(255,138,26,.55) 0%, rgba(255,138,26,0) 62%),' +
      'radial-gradient(55% 130% at 18% 85%, rgba(139,92,246,.45) 0%, rgba(139,92,246,0) 66%),' +
      'linear-gradient(180deg, #06060c 0%, #000 100%)',
  },
  {
    id: 'oceano',
    nome: 'Oceano',
    style:
      'linear-gradient(100deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.2) 100%),' +
      'linear-gradient(100deg, #04121f 0%, #0e7490 55%, #22d3ee 100%)',
  },
  {
    id: 'listras',
    nome: 'Listras',
    style:
      'repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 14px, transparent 14px 30px),' +
      'linear-gradient(135deg, #1c0f33 0%, #05050a 70%)',
  },
  {
    id: 'ouro',
    nome: 'Ouro',
    style:
      'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.75) 100%),' +
      'linear-gradient(100deg, #1a1204 0%, #6b4a09 55%, #fbbf24 100%)',
  },
  {
    id: 'fogo',
    nome: 'Fogo',
    style:
      'radial-gradient(80% 160% at 90% 50%, rgba(248,113,113,.5) 0%, rgba(248,113,113,0) 60%),' +
      'linear-gradient(100deg, #000 0%, #3d0505 45%, #b91c1c 78%, #f97316 100%)',
  },
  {
    id: 'turbo',
    nome: 'Turbo',
    style:
      'repeating-linear-gradient(115deg, rgba(34,211,238,.14) 0 10px, transparent 10px 26px),' +
      'radial-gradient(100% 160% at 15% 0%, rgba(34,211,238,.4) 0%, rgba(34,211,238,0) 65%),' +
      'linear-gradient(115deg, #04101a 0%, #0a0a12 70%)',
  },
]

/* Cores escolhíveis para o nome */
export const CORES_NOME = [
  { id: 'branco', nome: 'Branco', hex: '#ffffff' },
  { id: 'laranja', nome: 'Laranja', hex: '#FF8A1A' },
  { id: 'violeta', nome: 'Violeta', hex: '#A78BFA' },
  { id: 'ciano', nome: 'Ciano', hex: '#22D3EE' },
  { id: 'rosa', nome: 'Rosa', hex: '#F472B6' },
  { id: 'verde', nome: 'Verde', hex: '#34D399' },
  { id: 'amarelo', nome: 'Amarelo', hex: '#FBBF24' },
  { id: 'vermelho', nome: 'Vermelho', hex: '#F87171' },
]

/* Efeitos de letra */
export const EFEITOS_NOME = [
  { id: 'nenhum', nome: 'Normal' },
  { id: 'gradiente', nome: 'Gradiente' },
  { id: 'brilho', nome: 'Brilho' },
]

export const bannerStyle = (id) => BANNERS.find((b) => b.id === id)?.style || null
export const corHex = (id) => CORES_NOME.find((c) => c.id === id)?.hex || null

/* { className, style } para aplicar a qualquer <span> com o nome */
export function estiloNome(colorId, effectId) {
  if (effectId === 'gradiente') return { className: 'gradient-text', style: undefined }
  const hex = corHex(colorId)
  if (effectId === 'brilho' && hex) {
    return {
      className: '',
      style: { color: hex, textShadow: `0 0 12px ${hex}, 0 0 28px ${hex}55` },
    }
  }
  if (hex) return { className: '', style: { color: hex } }
  return { className: '', style: undefined }
}
