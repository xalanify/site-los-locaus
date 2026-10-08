import { useState } from 'react'
import { svgAvatar } from '../lib/avatar'

/* Imagem de perfil com fallback automático:
   - se não houver URL → avatar SVG com as iniciais
   - se a imagem externa falhar → troca para o SVG */
export default function AvatarImg({ src, name = 'AJ', color = '#f97316', className = '' }) {
  const [failed, setFailed] = useState(false)
  const finalSrc = src && !failed ? src : svgAvatar(name, color)

  return (
    <img
      src={finalSrc}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ring-1 ring-orange-500/30 ${className}`}
    />
  )
}
