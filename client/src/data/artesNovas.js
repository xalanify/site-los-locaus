/* Artes novas do mercado: cores de nome e cartas. */

export const CORES_NOVAS = [
  { slug: 'hipnose', nome: 'Hipnose' },
  { slug: 'eter', nome: 'Éter' },
  { slug: 'rubra', nome: 'Rubra' },
  { slug: 'cromo', nome: 'Cromo Líquido' },
  { slug: 'malaquite', nome: 'Malaquite' },
  { slug: 'filigrana', nome: 'Filigrana' },
  { slug: 'dragao', nome: 'Dragão' },
  { slug: 'estrela', nome: 'Estrela' },
  { slug: 'ouro', nome: 'Ouro' },
  { slug: 'inverno', nome: 'Inverno' },
  { slug: 'vela', nome: 'Vela' },
  { slug: 'siberia', nome: 'Sibéria' },
  { slug: 'mercurio', nome: 'Mercúrio' },
  { slug: 'marmore', nome: 'Mármore' },
  { slug: 'tinta', nome: 'Tinta' },
  { slug: 'asfalto', nome: 'Asfalto' },
  { slug: 'ouro-negro', nome: 'Ouro Negro' },
  { slug: 'glitch', nome: 'Glitch' },
  { slug: 'anjo', nome: 'Anjo' },
  { slug: 'teia', nome: 'Teia' },
  { slug: 'suspenso', nome: 'Suspenso' },
  { slug: 'prisma', nome: 'Prisma' },
  { slug: '3d-prata', nome: 'Prata 3D', classe: 'nome-cor-3d-prata' },
]

export const CARTAS_NOVAS = [
  ...CORES_NOVAS.filter((a) => a.slug !== '3d-prata'),
  { slug: 'vidro', nome: 'Vidro' },
  { slug: 'operador', nome: 'Operador' },
  { slug: 'corrente', nome: 'Corrente' },
]
