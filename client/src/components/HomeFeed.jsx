import Announcements from './Announcements'

/* Topo da página inicial — anúncios do admin (bloco de notas).
   O último clip público aparece por cima (RecentClip) e o botão
   leva à aba "Clips e Publicações". */
export default function HomeFeed() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 pt-14 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Announcements />
      </div>
    </section>
  )
}
