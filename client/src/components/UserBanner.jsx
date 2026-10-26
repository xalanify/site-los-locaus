import { bannerDe } from '../data/temasPerfil'

/* Faixa animada (GIF) do tema do perfil — usada em cartões pequenos
   como a lista "Membros online". */
export default function UserBanner({ bannerId, className = 'h-2 w-full' }) {
  const b = bannerDe(bannerId)
  if (!b.ficheiro) return null
  return (
    <img
      src={b.ficheiro}
      alt=""
      loading="lazy"
      className={`${className} object-cover`}
      aria-hidden="true"
    />
  )
}
