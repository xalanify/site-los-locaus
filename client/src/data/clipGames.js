/* ============================================================
   Categorias de jogo — obrigatórias ao publicar um clip
   (e usadas nas ligações "conta do jogo" do painel admin).

   Tem de coincidir com server/clipGames.js.
   ============================================================ */
export const CLIP_GAMES = [
  { id: 'cs2', label: 'CS2' },
  { id: 'csgo', label: 'CS:GO' },
  { id: 'r6', label: 'Rainbow Six Siege' },
  { id: 'bf1', label: 'Battlefield 1' },
  { id: 'bfv', label: 'Battlefield V' },
  { id: 'bf6', label: 'Battlefield 6' },
  { id: 'eafc', label: 'EA FC 26' },
  { id: 'fortnite', label: 'Fortnite' },
  { id: 'minecraft', label: 'Minecraft' },
  { id: 'roblox', label: 'Roblox' },
  { id: 'valorant', label: 'Valorant' },
  { id: 'apex', label: 'Apex Legends' },
  { id: 'cod', label: 'Call of Duty' },
  { id: 'gta', label: 'GTA V' },
  { id: 'rocket', label: 'Rocket League' },
  { id: 'lol', label: 'League of Legends' },
  { id: 'dota', label: 'Dota 2' },
  { id: 'pubg', label: 'PUBG' },
  { id: 'outro', label: 'Outro' },
];

export const gameLabel = (id) => {
  const g = CLIP_GAMES.find((x) => x.id === id);
  return g ? g.label : id || null;
};
