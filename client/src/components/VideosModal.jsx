import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Play,
  Eye,
  Heart,
  MessageSquare,
  Loader2,
  ExternalLink,
  ArrowLeft,
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
   Janela flutuante dos vídeos do canal
   ------------------------------------------------------------
   Abre pelo botão "Ver vídeos" no cartão do canal (home).
   Mostra a grelha e, ao clicar, o player do YouTube.
   ============================================================ */
export default function VideosModal({ open, onClose }) {
  const [videos, setVideos] = useState([])
  const [topVideos, setTopVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('all')
  const [aberto, setAberto] = useState(null)

  useEffect(() => {
    if (!open || videos.length) return
    let vivo = true
    setLoading(true)
    Promise.all([
      fetch('/api/youtube/videos').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/youtube/top-videos').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([all, top]) => {
        if (!vivo) return
        setVideos(Array.isArray(all) ? all : [])
        setTopVideos(Array.isArray(top) ? top : [])
      })
      .finally(() => vivo && setLoading(false))
    return () => {
      vivo = false
    }
  }, [open, videos.length])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (aberto) setAberto(null)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, aberto, onClose])

  if (!open) return null

  const lista = aba === 'top' ? topVideos : videos

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="videos-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-black/85 p-3 pt-10 sm:p-6 sm:pt-14"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#101012] shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="font-display text-base font-black uppercase tracking-wide text-white">
                Vídeos do canal
              </h2>
              <p className="text-[11px] font-semibold text-gray-500">
                Ashow e Jazer · YouTube
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.12] text-gray-300 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(90dvh-4rem)] overflow-y-auto p-4 sm:p-5">
            {aberto ? (
              <div>
                <button
                  type="button"
                  onClick={() => setAberto(null)}
                  className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Todos os vídeos
                </button>
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                  <iframe
                    key={aberto.id}
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${aberto.id}?autoplay=1&rel=0`}
                    title={aberto.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <h3 className="mt-3 text-sm font-bold text-white sm:text-base">{aberto.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-gray-500">
                  {aberto.publishedAt && <span>{fmtDate(aberto.publishedAt)}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {fmtNum(aberto.views)} vistas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" /> {fmtNum(aberto.likes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> {fmtNum(aberto.comments)}
                  </span>
                  <a
                    href={`https://www.youtube.com/watch?v=${aberto.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-300 hover:text-zinc-200"
                  >
                    Ver no YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <TabBar
                    ariaLabel="Filtrar vídeos"
                    value={aba}
                    onChange={setAba}
                    items={[
                      { id: 'all', label: 'Todos' },
                      { id: 'top', label: 'Mais assistidos' },
                    ]}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                    {lista.length} vídeos
                  </span>
                </div>

                {loading ? (
                  <div className="flex justify-center py-14">
                    <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
                  </div>
                ) : lista.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">
                    Sem vídeos para mostrar agora.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lista.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setAberto(v)}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-zinc-400/30 hover:bg-white/[0.06]"
                      >
                        <span className="relative block aspect-video overflow-hidden">
                          <img
                            src={v.thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                            <Play className="h-10 w-10 text-white drop-shadow-lg" />
                          </span>
                        </span>
                        <span className="block p-3">
                          <span className="line-clamp-2 text-[12.5px] font-bold leading-snug text-white">
                            {v.title}
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-gray-500">
                            {v.publishedAt && <span>{fmtDate(v.publishedAt)}</span>}
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {fmtNum(v.views)}
                            </span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
