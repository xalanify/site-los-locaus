import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, ExternalLink } from 'lucide-react'
import TabBar from './TabBar'

/* Vídeos do canal — só o essencial: miniatura, título, data e o
   botão para ver no YouTube. Sem comentários nem estatísticas. */
export default function VideosSection() {
  const [videos, setVideos] = useState([])
  const [topVideos, setTopVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

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

  if (loading) {
    return (
      <section id="videos" className="flex min-h-[30vh] items-center justify-center px-4 py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
      </section>
    )
  }

  const list = activeTab === 'top' ? topVideos : videos

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

  return (
    <section id="videos" className="px-4 pb-20 pt-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {list.map((video, index) => (
              <motion.a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.06, 0.35) }}
                className="glass group overflow-hidden rounded-2xl"
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

                {/* Título + botão */}
                <span className="flex items-center justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white sm:text-base">
                      {video.title}
                    </span>
                    {video.publishedAt && (
                      <span className="mt-1 block text-xs text-gray-500">
                        {fmtDate(video.publishedAt)}
                      </span>
                    )}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition-colors group-hover:bg-orange-600">
                    <Play className="h-3 w-3" />
                    Ver
                  </span>
                </span>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
