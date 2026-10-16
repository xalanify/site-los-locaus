/* Jogos acompanhados na página "Atualizações > Jogos".
   Os números de jogadores e as notícias chegam em tempo real
   da Steam (ver server/gamestats.js) — nada é manual aqui.
   O AppID serve também para buscar a capa do jogo (círculo). */

const steamImg = (appid) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`

// Capa em círculo: a library capsule da Steam (quadrada) cai melhor
// dentro de um círculo do que a header horizontal.
const steamCapa = (appid) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`

export const GAMES = [
  { id: 'cs2', name: 'CS2', short: 'CS2', color: '#f97316', appid: 730 },
  { id: 'bf6', name: 'Battlefield 6', short: 'BF6', color: '#22c55e', appid: 2807960 },
  { id: 'bfv', name: 'Battlefield V', short: 'BFV', color: '#eab308', appid: 1238810 },
  { id: 'bf1', name: 'Battlefield 1', short: 'BF1', color: '#65a30d', appid: 1238840 },
  {
    id: 'codmw3',
    name: 'COD MW3 2023',
    short: 'COD MW3',
    color: '#f43f5e',
    appid: 3595270,
    // o appid acima é o da Steam (números); para a imagem usamos o
    // Call of Duty HQ, que tem capa em caminho direto
    circulo: steamCapa(2519060),
  },
  { id: 'r6', name: 'Rainbow Six Siege', short: 'R6', color: '#38bdf8', appid: 359550 },
]

// Capa do jogo (com fallback para o ícone se a imagem falhar)
export const gameImg = (g) => (g.appid ? steamImg(g.appid) : null)

// Imagem para o círculo (capa da biblioteca da Steam)
export const gameCirculo = (g) =>
  (g && g.circulo) || (g && g.appid ? steamCapa(g.appid) : null)
