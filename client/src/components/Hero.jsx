import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Users, Eye, Gamepad2 } from 'lucide-react'
import { svgAvatar } from '../lib/avatar'

export default function Hero() {
  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/youtube/channel')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setChannel(data && data.snippet ? data : null))
      .catch(() => setChannel(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section id="home" className="flex min-h-screen items-center justify-center pt-16">
        <div className="h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
      </section>
    )
  }

  const stats = channel?.statistics || {}
  const channelUrl = channel?.channelUrl || 'https://www.youtube.com'

  return (
    <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-to-br from-dark via-secondary to-dark" />
      <div className="absolute left-1/4 top-1/4 h-72 w-72 animate-pulse-slow rounded-full bg-orange-500/10 blur-3xl sm:h-96 sm:w-96" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 animate-pulse-slow rounded-full bg-orange-500/10 blur-3xl sm:h-96 sm:w-96" />

      <div className="relative z-10 max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-orange-500 glow-orange sm:h-40 sm:w-40">
              <img
                src={
                  channel?.snippet?.thumbnails?.medium?.url ||
                  channel?.snippet?.thumbnails?.high?.url ||
                  svgAvatar('AJ')
                }
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = svgAvatar('AJ')
                }}
                alt="Ashow e Jazer"
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 font-black gradient-text"
            style={{ fontSize: 'clamp(2.2rem, 8vw, 4.5rem)' }}
          >
            Ashow e Jazer
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mb-12 grid max-w-3xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3"
          >
            <div className="glass rounded-2xl p-5 transition-transform duration-300 hover:scale-105 sm:p-6">
              <Users className="mx-auto mb-3 h-8 w-8 text-orange-500 sm:h-10 sm:w-10" />
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {parseInt(stats.subscriberCount || 0).toLocaleString()}
              </div>
              <div className="text-gray-400">Subscritores</div>
            </div>
            <div className="glass rounded-2xl p-5 transition-transform duration-300 hover:scale-105 sm:p-6">
              <Eye className="mx-auto mb-3 h-8 w-8 text-orange-500 sm:h-10 sm:w-10" />
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {parseInt(stats.viewCount || 0).toLocaleString()}
              </div>
              <div className="text-gray-400">Visualizações</div>
            </div>
            <div className="glass rounded-2xl p-5 transition-transform duration-300 hover:scale-105 sm:p-6">
              <Play className="mx-auto mb-3 h-8 w-8 text-orange-500 sm:h-10 sm:w-10" />
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {parseInt(stats.videoCount || 0).toLocaleString()}
              </div>
              <div className="text-gray-400">Vídeos</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-orange-500 px-6 py-3 text-base font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-orange-600 glow-orange sm:px-8 sm:py-4 sm:text-lg"
            >
              <Play className="h-5 w-5 sm:h-6 sm:w-6" />
              Visitar Canal no YouTube
            </a>
            <button
              onClick={() => navigate('/jogos')}
              className="inline-flex items-center gap-3 rounded-full border-2 border-orange-400/70 bg-black/30 px-6 py-3 text-base font-bold text-orange-400 transition-all duration-300 hover:scale-105 hover:bg-orange-400 hover:text-black sm:px-8 sm:py-4 sm:text-lg"
            >
              <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6" />
              Ver Estatísticas nos Jogos
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
