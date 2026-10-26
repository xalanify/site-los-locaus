import { bannerDe } from '../data/temasPerfil'

/* Fundo animado (GIF) do cartão de perfil. Fica sempre atrás do
   conteúdo, com um véu escuro para os textos continuarem legíveis. */
export default function ProfileBanner({ bannerId, overlay = 'from-black/80 via-black/60 to-black/90' }) {
  const b = bannerDe(bannerId)
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {b.ficheiro ? (
        <img
          src={b.ficheiro}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-[#1b1230] to-[#0b0716]" />
      )}
      <span className={`absolute inset-0 bg-gradient-to-br ${overlay}`} />
    </span>
  )
}
