import PlatformIcon from './PlatformIcon'

const ORDEM = ['youtube', 'twitch', 'tiktok', 'kick', 'instagram', 'x']
const NOMES = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  tiktok: 'TikTok',
  kick: 'Kick',
  instagram: 'Instagram',
  x: 'X',
}

function urlDe(rede, valor) {
  const h = String(valor || '').replace(/^@/, '')
  if (rede === 'youtube') return `https://www.youtube.com/@${h}`
  if (rede === 'twitch') return `https://www.twitch.tv/${h}`
  if (rede === 'tiktok') return `https://www.tiktok.com/@${h}`
  if (rede === 'kick') return `https://kick.com/${h}`
  if (rede === 'instagram') return `https://www.instagram.com/${h}`
  if (rede === 'x') return `https://x.com/${h}`
  return null
}

/* Ligações para os canais do membro — ao lado do nome/bio. */
export default function SocialLinks({ socials, className = '' }) {
  const entradas = ORDEM.map((rede) => [rede, socials && socials[rede]]).filter(([, v]) => v)
  if (!entradas.length) return null

  return (
    <span className={`social-links ${className}`}>
      {entradas.map(([rede, valor]) => {
        const href = /^https?:\/\//i.test(String(valor)) ? String(valor) : urlDe(rede, valor)
        if (!href) return null
        return (
          <a
            key={rede}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            title={NOMES[rede] || rede}
            aria-label={NOMES[rede] || rede}
            onClick={(e) => e.stopPropagation()}
            className={`social-icon social-${rede}`}
          >
            <PlatformIcon platform={rede} className="h-3.5 w-3.5" />
          </a>
        )
      })}
    </span>
  )
}
