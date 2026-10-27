import PlatformIcon from './PlatformIcon'
import { useLive } from '../lib/live'

const NOMES = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  tiktok: 'TikTok',
  kick: 'Kick',
  instagram: 'Instagram',
  x: 'X',
}

/* Selo "em live" — clicável, abre a live na plataforma.
   É um span (não um link) para poder entrar dentro de cartões
   que já são botões/links sem HTML inválido. */
export default function LiveBadge({ username, className = '', compacto = false }) {
  const { liveByUser } = useLive()
  const live = liveByUser[String(username || '').toLowerCase()]
  if (!live || !live.url) return null

  const abrir = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    window.open(live.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          abrir(e)
        }
      }}
      title={`Em live na ${NOMES[live.platform] || live.platform}`}
      className={`live-badge live-${live.platform} ${className}`}
    >
      <span className="live-pulso" aria-hidden="true" />
      <PlatformIcon platform={live.platform} className="h-3 w-3" />
      <span>{compacto ? 'live' : 'em live'}</span>
    </span>
  )
}
