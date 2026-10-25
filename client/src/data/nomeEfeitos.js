/* ============================================================
   Efeitos de nome do perfil (só admin)
   ============================================================ */

export const CORES_NOME = [
  { id: '', nome: 'Normal', cor: '#ffffff' },
  { id: 'gold', nome: 'Gold', cor: '#f59e0b' },
  { id: 'diamond', nome: 'Diamante', cor: '#67e8f9' },
  { id: 'damascus', nome: 'Damascus', cor: '#818cf8' },
  { id: 'interstellar', nome: 'Interstellar', cor: '#6366f1' },
  { id: 'rainbow', nome: 'Rainbow', cor: '#f472b6' },
  { id: 'red', nome: 'Vermelho', cor: '#ef4444' },
  { id: 'green', nome: 'Verde', cor: '#22c55e' },
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

export const classesCard = (efeito) => (efeito ? `card-efeito-${efeito}` : '')
