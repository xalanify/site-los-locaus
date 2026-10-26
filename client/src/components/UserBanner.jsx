import { bannerDe } from '../data/temasPerfil'

/* Faixa animada (GIF) do tema do perfil — usada em cartões pequenos
   como a lista "Membros online". */
export default function UserBanner({ bannerId, className = 'h-2 w-full' }) {
  const b = bannerDe(bannerId)
  if (!b.ficheiro) {
    // sem banner escolhido: mantém a risca colorida (não desaparece)
    return (
      <span
        className={`${className} block`}
        style={{
          background: `linear-gradient(180deg, ${b.cor || '#8b5cf6'}, ${b.cor || '#8b5cf6'}55)`,
        }}
        aria-hidden="true"
      />
    )
  }
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
