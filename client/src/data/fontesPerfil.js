/* ============================================================
   Fontes icónicas do perfil
   Cada user pode escolher a fonte de TODOS os textos enquanto
   o perfil está aberto (sidebar incluída).
   ============================================================ */

export const FONTES = [
  {
    id: '',
    nome: 'Padrão',
    familia: '',
    exemplo: 'Locaus',
  },
  {
    id: 'minecraft',
    nome: 'Minecraft',
    familia: "'Minecraft', 'Press Start 2P', monospace",
    exemplo: 'LOCAUS',
  },
  {
    id: 'gta',
    nome: 'GTA',
    familia: "'Pricedown', 'Bebas Neue', sans-serif",
    exemplo: 'Los Santos',
  },
  {
    id: 'bo2',
    nome: 'Black Ops II',
    familia: "'Black Ops One', 'Rajdhani', sans-serif",
    exemplo: 'BLACK OPS',
  },
  {
    id: 'cod',
    nome: 'Call of Duty',
    familia: "'Teko', 'Rajdhani', sans-serif",
    exemplo: 'TASK FORCE',
  },
  {
    id: 'fortnite',
    nome: 'Fortnite',
    familia: "'Bangers', 'Luckiest Guy', cursive",
    exemplo: 'VICTORY ROYALE',
  },
  {
    id: 'cyberpunk',
    nome: 'Cyberpunk',
    familia: "'Orbitron', 'Rajdhani', sans-serif",
    exemplo: 'NIGHT CITY',
  },
  {
    id: 'halo',
    nome: 'Halo',
    familia: "'Michroma', 'Orbitron', sans-serif",
    exemplo: 'SPARTAN',
  },
]

export const fonteDe = (id) => FONTES.find((f) => f.id === id) || FONTES[0]
