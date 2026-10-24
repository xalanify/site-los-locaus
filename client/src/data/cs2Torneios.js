/* ============================================================
   Palmarés CS2 — últimos grandes torneios (Majors / IEM / BLAST)
   ------------------------------------------------------------
   Este ficheiro é editável: acrescenta/atualiza torneios aqui e
   aparecem logo na aba CS2 das Previsões, sem mexer no código.
   Estrutura de cada entrada:
     { id, nome, local, dataInicio, dataFim, campeao, vice,
       mvp: { nome, equipa }, resultadoFinal }
   ============================================================ */
export const CS2_TORNEIOS = [
  {
    id: 'cph2024',
    nome: 'PGL Major Copenhagen 2024',
    local: 'Copenhaga, Dinamarca',
    dataInicio: '17 mar',
    dataFim: '31 mar 2024',
    campeao: 'Natus Vincere',
    vice: 'FaZe Clan',
    mvp: { nome: 'jL', equipa: 'Natus Vincere' },
    resultadoFinal: '2–1',
  },
  {
    id: 'kat2024',
    nome: 'IEM Katowice 2024',
    local: 'Katowice, Polónia',
    dataInicio: '31 jan',
    dataFim: '11 fev 2024',
    campeao: 'Team Spirit',
    vice: 'FaZe Clan',
    mvp: { nome: 'donk', equipa: 'Team Spirit' },
    resultadoFinal: '3–0',
  },
  {
    id: 'col2024',
    nome: 'IEM Cologne 2024',
    local: 'Colónia, Alemanha',
    dataInicio: '7 ago',
    dataFim: '18 ago 2024',
    campeao: 'Team Vitality',
    vice: 'Natus Vincere',
    mvp: { nome: 'ZywOo', equipa: 'Team Vitality' },
    resultadoFinal: '3–1',
  },
  {
    id: 'sha2024',
    nome: 'PGL Major Shanghai 2024',
    local: 'Xangai, China',
    dataInicio: '30 nov',
    dataFim: '15 dez 2024',
    campeao: 'Team Spirit',
    vice: 'FaZe Clan',
    mvp: { nome: 'donk', equipa: 'Team Spirit' },
    resultadoFinal: '2–1',
  },
  {
    id: 'kat2025',
    nome: 'IEM Katowice 2025',
    local: 'Katowice, Polónia',
    dataInicio: '29 jan',
    dataFim: '9 fev 2025',
    campeao: 'Team Vitality',
    vice: 'MOUZ',
    mvp: { nome: 'ZywOo', equipa: 'Team Vitality' },
    resultadoFinal: '3–1',
  },
];
