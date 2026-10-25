import { bannerDe } from '../data/temasPerfil'

/* Fundo animado (GIF) do cartão de perfil. Fica sempre atrás do
   conteúdo, com um véu escuro para os textos continuarem legíveis. */
export default function ProfileBanner({ bannerId, overlay = 'from-black/75 via-black/50 to-black/85' }) {
  const b = bannerDe(bannerId)
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${b.ficheiro})` }}
      />
      <span className={`absolute inset-0 bg-gradient-to-br ${overlay}`} />
    </span>
  )
}
