import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Youtube, ArrowUpRight, Play } from 'lucide-react'
import { svgAvatar } from '../lib/avatar'

/* ============================================================
   Cabeçalho do canal — a home abre com o essencial e nada mais:
   a foto, o nome, os subscritores e as visualizações.
   ============================================================ */
export default function Hero({ onVerVideos }) {
  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/youtube/channel')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setChannel(data && data.snippet ? data : null))
      .catch(() => setChannel(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section id="home" className="flex min-h-[45vh] items-center justify-center pt-20">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-zinc-500" />
      </section>
    )
  }

  const stats = channel?.statistics || {}
  const channelUrl = channel?.channelUrl || 'https://www.youtube.com'
  const foto =
    channel?.snippet?.thumbnails?.medium?.url ||
    channel?.snippet?.thumbnails?.high?.url ||
    svgAvatar('AJ')

  return (
    <section id="home" className="relative pt-20 pb-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="glass relative overflow-hidden rounded-3xl"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-500/60 to-transparent" />

          <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
            <img
              src={foto}
              alt={channel?.snippet?.title || 'Ashow e Jazer'}
              onError={(e) => {
                if (e.currentTarget.dataset.fb) return
                e.currentTarget.dataset.fb = '1'
                e.currentTarget.src = svgAvatar('AJ')
              }}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/10 sm:h-20 sm:w-20"
            />
            <div className="min-w-0">
              <h1 className="font-display font-black uppercase leading-tight text-white" style={{ fontSize: 'clamp(1.2rem, 5.6vw, 2.1rem)' }}>
                {channel?.snippet?.title || 'Ashow e Jazer'}
              </h1>
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 transition-colors hover:text-zinc-400"
              >
                <Youtube className="h-3.5 w-3.5" />
                Canal no YouTube
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="px-5 pb-4 sm:px-6">
            <button
              type="button"
              onClick={onVerVideos}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-400/30 bg-zinc-500/15 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-200 transition-colors hover:bg-zinc-500/25 hover:text-white"
            >
              <Play className="h-3.5 w-3.5" />
              Ver vídeos
            </button>
          </div>

          <div className="grid grid-cols-2 border-t border-white/10">
            <div className="p-5 text-center sm:p-6">
              <div className="font-display text-3xl font-black leading-none text-white sm:text-4xl">
                {parseInt(stats.subscriberCount || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Subscritores
              </div>
            </div>
            <div className="border-l border-white/10 p-5 text-center sm:p-6">
              <div className="font-display text-3xl font-black leading-none text-white sm:text-4xl">
                {parseInt(stats.viewCount || 0).toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Visualizações
              </div>
            </div>
          </div>
        </motion.div>

        <p className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Informações do canal <span className="text-emerald-400">ao vivo</span> — atualizadas em
          tempo real
        </p>
      </div>
    </section>
  )
}
