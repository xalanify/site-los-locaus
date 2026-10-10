/* ============================================================
   Atualiza o rank ATUAL e o rank MÁXIMO de cada jogador do
   esquadrão no server/data/r6.json, a partir de
   server/data/r6-ranks.json.

   Como se colhe o r6-ranks.json (importante):
   ------------------------------------------------------------
   O tracker.gg bloqueia chamadas feitas por node/curl (403 Akamai),
   por isso os dados só se conseguem ler com o BROWSER, como um
   pedido de página normal:

     https://api.tracker.gg/api/v2/r6siege/standard/profile/ubi/<handle>

   Por cada jogador, no objeto `data.segments` (type = "season"):
     - `attributes.gamemode === 'pvp_ranked'` -> época com ranked
     - `stats.rank` / `stats.rankPoints`      -> rank atual da época
     - `stats.maxRank` / `stats.maxRankPoints`-> melhor rank da época
     - `metadata.shortName`                   -> "Y11S3"
   O melhor de todos (maior `maxRank.value`) é o rank máximo.

   Uso:  node scripts/atualizar-r6-ranks.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const R6 = path.join(__dirname, '../server/data/r6.json');
const RANKS = path.join(__dirname, '../server/data/r6-ranks.json');

/* Nome do rank a partir do índice que o tracker usa
   (0 = sem ranked, 1..5 COPPER V..I, ... 31..35 DIAMOND V..I, 36 CHAMPION) */
const DIVISOES = ['V', 'IV', 'III', 'II', 'I'];
const CAMADAS = ['COPPER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
const nomeDeIndice = (i) => {
  const n = Number(i) || 0;
  if (n <= 0) return 'NO RANK';
  if (n <= 35) {
    const c = Math.floor((n - 1) / 5);
    return `${CAMADAS[c]} ${DIVISOES[(n - 1) % 5]}`;
  }
  return 'CHAMPION';
};
const slug = (nome) =>
  String(nome)
    .toUpperCase()
    .trim()
    .replace(/\s+(V|IV|III|II|I)$/, (_, d) => '-' + { I: 1, II: 2, III: 3, IV: 4, V: 5 }[d])
    .toLowerCase()
    .replace(/\s+/g, '-');
const imgDe = (nome) => {
  const s = slug(nome);
  return nome === 'NO RANK'
    ? 'https://trackercdn.com/cdn/r6.tracker.network/ranks/3.0/medium/unranked.png?v=5'
    : `https://trackercdn.com/cdn/r6.tracker.network/ranks/3.0/medium/${s}.png?v=5`;
};

const dados = JSON.parse(fs.readFileSync(RANKS, 'utf8'));
const r6 = JSON.parse(fs.readFileSync(R6, 'utf8'));
let mudou = 0;

for (const p of r6.players || []) {
  const novo = dados.jogadores[p.key];
  if (!novo) {
    console.log(`  ! ${p.key} sem dados em r6-ranks.json`);
    continue;
  }
  const antes = JSON.stringify({ rank: p.rank, maxRank: p.maxRank });

  if (novo.rank) {
    p.rank = {
      season: novo.rank.season,
      points: Number(novo.rank.points) || 0,
      name: novo.rank.name,
      img: imgDe(novo.rank.name),
    };
  }
  p.maxRank = novo.maxRank
    ? {
        name: novo.maxRank.name,
        img: imgDe(novo.maxRank.name),
        rp: Number(novo.maxRank.rp) || 0,
        season: novo.maxRank.season || '',
      }
    : null;

  const depois = JSON.stringify({ rank: p.rank, maxRank: p.maxRank });
  if (antes !== depois) mudou++;
  console.log(
    `  ${p.key}: rank ${p.rank.name} · rank máx. ${p.maxRank ? `${p.maxRank.name} (${p.maxRank.rp} RP, ${p.maxRank.season})` : '—'}`,
  );
}

if (mudou) {
  r6.updatedAt = new Date().toISOString();
  fs.writeFileSync(R6, JSON.stringify(r6, null, 2) + '\n', 'utf8');
}
console.log(mudou ? `\n${mudou} jogador(es) atualizado(s) em r6.json` : 'nada para atualizar');
