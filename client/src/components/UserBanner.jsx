import { classeBanner } from '../data/temasPerfil'

/* Faixa animada do tema do perfil. Usada no cartão do perfil e nos
   cartões de membro (Membros / Membros online). */
export default function UserBanner({ bannerId, className = 'h-2 w-full rounded-full' }) {
  return <span className={`${classeBanner(bannerId)} ${className}`} aria-hidden="true" />
}
