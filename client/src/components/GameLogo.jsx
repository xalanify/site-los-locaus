/* Logos dos jogos (SVG brancos, sem fundo) + ícone de rank. */
export const GAME_LOGO = {
  cs2: '/jogos/cs2.svg',
  csgo: '/jogos/csgo.svg',
  r6: '/jogos/r6.png',
  cod: '/jogos/cod.png',
  fortnite: '/jogos/fortnite.svg',
  bf1: '/jogos/bf6.svg',
  bfv: '/jogos/bf6.svg',
  bf6: '/jogos/bf6.svg',
  apex: '/jogos/apex.svg',
  valorant: '/jogos/valorant.svg',
  minecraft: '/jogos/minecraft.svg',
  roblox: '/jogos/roblox.svg',
  gta: '/jogos/gta.svg',
  rocket: '/jogos/rocket.svg',
  lol: '/jogos/lol.svg',
  dota: '/jogos/dota.svg',
  pubg: '/jogos/pubg.svg',
  eafc: '/jogos/eafc.svg',
  steam: '/jogos/steam.svg',
}

const GAME_ABREV = {
  cs2: 'CS2',
  csgo: 'CS',
  r6: 'R6',
  cod: 'COD',
  fortnite: 'FN',
  bf1: 'BF',
  bfv: 'BF',
  bf6: 'BF6',
  apex: 'APX',
  valorant: 'VAL',
  minecraft: 'MC',
  roblox: 'RBX',
  gta: 'GTA',
  rocket: 'RL',
  lol: 'LOL',
  dota: 'DOTA',
  pubg: 'PUBG',
  eafc: 'FC',
  steam: 'STM',
}

export const RANK_CORES = {
  bronze: '#b08d57',
  silver: '#c0c0c0',
  gold: '#f5c542',
  platinum: '#5eead4',
  emerald: '#34d399',
  diamond: '#60a5fa',
  champion: '#f472b6',
  bf: '#ff9e9e',
}

export function RankIcon({ tier, className = 'h-3.5 w-3.5' }) {
  const cor = RANK_CORES[tier] || '#a1a1aa'
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" fill={cor} opacity="0.9" />
      <path d="M12 6l5 2v3c0 3-2 5-5 7-3-2-5-4-5-7V8z" fill="#0a0a0b" opacity="0.25" />
    </svg>
  )
}

export default function GameLogo({ game, className = 'h-7 w-7' }) {
  const base = GAME_LOGO[game]
  const src = base ? `${base}?v=3` : null
  if (!src) {
    return (
      <span
        className={`flex items-center justify-center text-[8px] font-black tracking-wider text-zinc-400 ${className}`}
      >
        {GAME_ABREV[game] || '?'}
      </span>
    )
  }
  return <img src={src} alt="" loading="lazy" className={`object-contain brightness-0 invert ${className}`} />
}
