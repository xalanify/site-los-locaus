/* ============================================================
   Efeitos de nome do perfil (só admin)
   ============================================================ */

export const CORES_NOME = [
  { id: '', nome: 'Normal', cor: '#ffffff' },
  { id: 'gold', nome: 'Gold (BO1)', cor: '#f59e0b' },
  { id: 'diamond', nome: 'Diamond (BO2)', cor: '#fde68a' },
  { id: 'damascus', nome: 'Damascus (MW19)', cor: '#60a5fa' },
  { id: 'interstellar', nome: 'Interstellar', cor: '#818cf8' },
  { id: 'darkmatter', nome: 'Dark Matter', cor: '#a855f7' },
  { id: 'chrome', nome: 'Chrome', cor: '#e5e7eb' },
  { id: 'platinum', nome: 'Platinum', cor: '#cbd5e1' },
  { id: 'obsidian', nome: 'Obsidian', cor: '#334155' },
  { id: 'rainbow', nome: 'Dark Aether', cor: '#c084fc' },
  { id: 'red', nome: 'Red Tiger', cor: '#ef4444' },
  { id: 'green', nome: 'Green Tiger', cor: '#22c55e' },
  { id: 'pink', nome: 'Rosa', cor: '#ec4899' },
  { id: 'cyan', nome: 'Ciano', cor: '#22d3ee' },
]

export const EFEITOS_NOME = [
  { id: '', nome: 'Nenhum' },
  { id: 'glow', nome: 'Brilho' },
  { id: 'blink', nome: 'Piscar preto/branco' },
  { id: 'pulse', nome: 'Pulsar' },
  { id: 'shimmer', nome: 'Shimmer' },
]

export const classesNome = (cor, efeito) =>
  [cor ? `nome-cor-${cor}` : '', efeito ? `nome-efeito-${efeito}` : '']
    .filter(Boolean)
    .join(' ')

export const classesCard = (efeito) =>
  efeito && efeito !== 'shimmer' ? `card-efeito-${efeito}` : ''
