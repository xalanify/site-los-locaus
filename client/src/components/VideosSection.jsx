import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Eye,
  Heart,
  MessageSquare,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import TabBar from './TabBar'

const fmtNum = (n) => Number(n || 0).toLocaleString('pt-PT')

const fmtDate = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

/* ============================================================
   Vídeos do canal — a grelha ocupa a largura toda (no PC
   aparecem várias colunas) e, ao clicar num vídeo, abre o
   player com vistas, gostos e comentários por baixo.
   ============================================================ */
export default function VideosSection() {
  const [videos, setVideos] = useState([])
  const [topVideos, setTopVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [aberto, setAberto] = useState(null) // vídeo aberto no player
  const [comentarios, setComentarios] = useState(null) // null = a carregar

  useEffect(() => {
    Promise.all([
      fetch('/api/youtube/videos').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/youtube/top-videos').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([all, top]) => {
        setVideos(Array.isArray(all) ? all : [])
        setTopVideos(Array.isArray(top) ? top : [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Ao abrir um vídeo, vai buscar os comentários do YouTube
  useEffect(() => {
    if (!aberto) return
    let vivo = true
    setComentarios(null)
    fetch(`/api/youtube/comments/${aberto.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => vivo && setComentarios(Array.isArray(d) ? d : []))
      .catch(() => vivo && setComentarios([]))
    return () => {
      vivo = false
    }
  }, [aberto])

  // Esc fechar + travar o scroll de fundo enquanto o player está aberto
  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => e.key === 'Escape' && setAberto(null)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [aberto])

  if (loading) {
    return (
      <section id="videos" className="flex min-h-[30vh] items-center justify-center px-4 py-10">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </section>
    )
  }

  const list = activeTab === 'top' ? topVideos : videos

  return (
    <section id="videos" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Título + filtro */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
            Vídeos do canal
          </h2>
          <TabBar
            ariaLabel="Filtrar vídeos"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'all', label: 'Todos' },
              { id: 'top', label: 'Mais assistidos' },
            ]}
          />
        </div>

        {list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-gray-500">
            Sem vídeos para mostrar agora.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((video, index) => (
              <motion.button
                key={video.id}
                type="button"
                onClick={() => setAberto(video)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className="glass group overflow-hidden rounded-2xl text-left"
              >
                {/* Miniatura com botão de play */}
                <span className="relative block aspect-video overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Play className="h-12 w-12 text-white drop-shadow-lg" />
                  </span>
                </span>

                <span className="block p-4">
                  <span className="line-clamp-2 text-sm font-bold text-white sm:text-base">
                    {video.title}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {video.publishedAt && <span>{fmtDate(video.publishedAt)}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {fmtNum(video.views)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {fmtNum(video.likes)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> {fmtNum(video.comments)}
                    </span>
                  </span>
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Player + estatísticas ---------- */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setAberto(null)}
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#0a0a0b]/88 p-3 pt-14 sm:p-6 sm:pt-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-4xl overflow-hidden rounded-3xl"
            >
              {/* topo do modal */}
              <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <h3 className="min-w-0 flex-1 text-sm font-bold text-white sm:text-base">
                  {aberto.title}
                </h3>
                <button
                  onClick={() => setAberto(null)}
                  title="Fechar"
                  aria-label="Fechar"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* vídeo */}
              <div className="aspect-video w-full bg-black">
                <iframe
                  key={aberto.id}
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${aberto.id}?autoplay=1&rel=0`}
                  title={aberto.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* vistas / gostos / comentários */}
              <div className="grid grid-cols-3 border-y border-white/10">
                <div className="p-4 text-center">
                  <div className="inline-flex items-center gap-1.5 font-display text-xl font-black text-white sm:text-2xl">
                    <Eye className="h-4 w-4 text-zinc-400" />
                    {fmtNum(aberto.views)}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Vistas
                  </div>
                </div>
                <div className="border-x border-white/10 p-4 text-center">
                  <div className="inline-flex items-center gap-1.5 font-display text-xl font-black text-white sm:text-2xl">
                    <Heart className="h-4 w-4 text-rose-400" />
                    {fmtNum(aberto.likes)}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Gostos
                  </div>
                </div>
                <div className="p-4 text-center">
                  <div className="inline-flex items-center gap-1.5 font-display text-xl font-black text-white sm:text-2xl">
                    <MessageSquare className="h-4 w-4 text-zinc-400" />
                    {fmtNum(aberto.comments)}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Comentários
                  </div>
                </div>
              </div>

              {/* comentários do vídeo */}
              <div className="max-h-[45vh] overflow-y-auto px-4 py-4 sm:px-5">
                {comentarios === null ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> A carregar comentários…
                  </div>
                ) : comentarios.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Este vídeo ainda não tem comentários.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {comentarios.map((c) => (
                      <li key={c.id} className="flex gap-3">
                        <img
                          src={c.authorImage}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white">{c.author}</span>
                            <span className="text-[11px] text-gray-600">
                              {fmtDate(c.publishedAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-300">
                            {c.text}
                          </p>
                          {c.likes > 0 && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
                              <Heart className="h-3 w-3" /> {fmtNum(c.likes)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* abrir no YouTube */}
              <div className="border-t border-white/10 px-4 py-3 sm:px-5">
                <a
                  href={`https://www.youtube.com/watch?v=${aberto.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 transition-colors hover:text-zinc-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver no YouTube
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
