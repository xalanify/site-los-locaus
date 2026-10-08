import Announcements from './Announcements'

/* Topo da página inicial — anúncios do admin (bloco de notas).
   O aviso "Em breve" dos clips está agora no topo da home
   (ClipNotice), logo abaixo da barra de navegação.
   A secção de clips foi desativada no site (ficheiros mantidos). */
export default function HomeFeed() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 pt-14 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Announcements />
      </div>
    </section>
  )
}
