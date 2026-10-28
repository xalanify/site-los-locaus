/* Mini pré-visualização de um estilo de perfil (loja/editor). */
export default function ProfileStylePreview({
  style = 'felony',
  nome = 'O teu nome',
  className = '',
}) {
  const inicial = String(nome || '?').slice(0, 1).toUpperCase()
  return (
    <div className={`style-preview style-preview--${style} ${className}`}>
      <span className="style-preview-banner" aria-hidden="true" />
      <span className="style-preview-avatar">{inicial}</span>
      <span className="style-preview-body">
        <span className="style-preview-name">{nome}</span>
        <span className="style-preview-handle">@utilizador</span>
      </span>
      <span className="style-preview-btn">Seguir</span>
    </div>
  )
}
