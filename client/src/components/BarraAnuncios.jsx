import { useEffect, useState } from 'react'
import { Megaphone, X, ChevronRight } from 'lucide-react'
import Announcements from './Announcements'

/* ============================================================
   Barra de anúncios — fica "presa" no topo da página.
   Mostra o anúncio mais recente numa linha; se houver mais,
   o botão abre a lista completa (mesmos anúncios da home).
   Sem anúncios, a barra nem aparece.
   ============================================================ */
export default function BarraAnuncios() {
  const [posts, setPosts] = useState(null) // null = a carregar
  const [aberto, setAberto] = useState(false)
  const [escondida, setEscondida] = useState(() => {
    try {
      return sessionStorage.getItem('locaus:barra-anuncios') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    fetch('/api/posts?limit=8')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
  }, [])

  const fechar = () => {
    setEscondida(true)
    try {
      sessionStorage.setItem('locaus:barra-anuncios', '1')
    } catch {
      /* modo privado */
    }
  }

  if (escondida || !posts || posts.length === 0) return null

  const ultimo = posts[0]
  const texto = ultimo.content || ultimo.title || ''

  return (
    <>
      <div className="sticky top-14 z-30 px-3 pt-3 sm:top-16 sm:px-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-3 py-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-300">
            <Megaphone className="h-3.5 w-3.5" />
          </span>
          <button
            onClick={() => setAberto(true)}
            title="Abrir todos os anúncios"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <span className="truncate text-xs font-bold text-violet-100 sm:text-sm">{texto}</span>
            {posts.length > 1 && (
              <span className="hidden shrink-0 items-center gap-1 text-[11px] font-black uppercase tracking-wide text-violet-300 sm:inline-flex">
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </span>
            )}
          </button>
          <button
            onClick={fechar}
            title="Fechar anúncios"
            aria-label="Fechar anúncios"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-violet-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Lista completa dos anúncios */}
      {aberto && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-20 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        >
          <div
            className="glass w-full max-w-2xl rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-base font-black uppercase tracking-wide text-white sm:text-lg">
                <Megaphone className="h-4 w-4 text-violet-400" />
                Anúncios
              </h2>
              <button
                onClick={() => setAberto(false)}
                title="Fechar"
                aria-label="Fechar"
                className="grid h-8 w-8 place-items-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <Announcements />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
