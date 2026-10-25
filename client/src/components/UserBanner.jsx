import { bannerDe } from '../data/temasPerfil'

/* Faixa animada (GIF) do tema do perfil — usada em cartões pequenos
   como a lista "Membros online". */
export default function UserBanner({ bannerId, className = 'h-2 w-full' }) {
  const b = bannerDe(bannerId)
  if (!b.ficheiro) return null
  return (
    <span
      className={`${className} bg-cover bg-center`}
      style={{ backgroundImage: `url(${b.ficheiro})` }}
      aria-hidden="true"
    />
  )
}
