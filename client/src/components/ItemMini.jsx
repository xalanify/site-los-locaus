import ProfileCard from './ProfileCard'
import ProfileStylePreview from './ProfileStylePreview'
import { classesNome } from '../data/nomeEfeitos'

/* Miniatura de um cosmético: mostra o efeito real (nome, carta ou estilo)
   antes de abrir a pré-visualização grande. */
export default function ItemMini({ item, me, className = '' }) {
  if (!item) return null

  if (item.tipo === 'cor') {
    return (
      <span className={`mini-cor ${className}`}>
        <span className={classesNome(item.valor)}>{me?.username || 'Nome'}</span>
      </span>
    )
  }

  if (item.tipo === 'carta') {
    return (
      <span className={`mini-carta ${className}`}>
        <ProfileCard
          perfil={{ ...(me || {}), card_style: item.valor }}
          variant={item.valor}
          jogos={[]}
        />
      </span>
    )
  }

  return (
    <span className={`mini-estilo ${className}`}>
      <ProfileStylePreview style={item.valor} nome={me?.username || 'Nome'} />
    </span>
  )
}
