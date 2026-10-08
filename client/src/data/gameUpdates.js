/* Jogos acompanhados na página "Atualizações > Jogos".
   Os números de jogadores e as notícias chegam em tempo real
   da Steam (ver server/gamestats.js) — nada é manual aqui.
   O AppID serve também para buscar a capa do jogo (círculo). */

const steamImg = (appid) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`

export const GAMES = [
  { id: 'cs2', name: 'CS2', short: 'CS2', color: '#f97316', appid: 730 },
  { id: 'bf6', name: 'Battlefield 6', short: 'BF6', color: '#22c55e', appid: 2807960 },
  { id: 'bfv', name: 'Battlefield V', short: 'BFV', color: '#eab308', appid: 1238810 },
  { id: 'bf1', name: 'Battlefield 1', short: 'BF1', color: '#65a30d', appid: 1238840 },
  { id: 'codmw3', name: 'COD MW3 2023', short: 'COD MW3', color: '#f43f5e', appid: 3595270 },
  { id: 'r6', name: 'Rainbow Six Siege', short: 'R6', color: '#38bdf8', appid: 359550 },
]

// Capa do jogo (com fallback para o ícone se a imagem falhar)
export const gameImg = (g) => (g.appid ? steamImg(g.appid) : null)
