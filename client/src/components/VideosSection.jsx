import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Eye, ThumbsUp, MessageCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import AvatarImg from './AvatarImg'

const asArray = (d) => (Array.isArray(d) ? d : [])

export default function VideosSection() {
  const [videos, setVideos] = useState([])
  const [topVideos, setTopVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedVideo, setExpandedVideo] = useState(null)
  const [comments, setComments] = useState({})
  const [loadingComments, setLoadingComments] = useState({})

  useEffect(() => {
    Promise.all([
      fetch('/api/youtube/videos').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/youtube/top-videos').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([all, top]) => {
        setVideos(asArray(all))
        setTopVideos(asArray(top))
      })
      .finally(() => setLoading(false))
  }, [])

  const loadComments = async (videoId) => {
    if (comments[videoId]) return
    setLoadingComments((p) => ({ ...p, [videoId]: true }))
    try {
      const res = await fetch(`/api/youtube/comments/${videoId}`)
      const data = res.ok ? await res.json() : []
      setComments((p) => ({ ...p, [videoId]: asArray(data) }))
    } catch {
      setComments((p) => ({ ...p, [videoId]: [] }))
    } finally {
      setLoadingComments((p) => ({ ...p, [videoId]: false }))
    }
  }

  const toggleComments = (videoId) => {
    if (expandedVideo === videoId) {
      setExpandedVideo(null)
    } else {
      setExpandedVideo(videoId)
      loadComments(videoId)
    }
  }

  const formatNumber = (num) => {
    num = Number(num) || 0
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return String(num)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const displayVideos = activeTab === 'top' ? topVideos : videos
  const videoUrl = (id) => `https://www.youtube.com/watch?v=${id}`

  if (loading) {
    return (
      <section id="videos" className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
        </div>
      </section>
    )
  }

  return (
    <section id="videos" className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center sm:mb-12"
        >
          <h2 className="mb-3 font-black gradient-text sm:mb-4" style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)' }}>
            Vídeos
          </h2>
          <p className="text-base text-gray-400 sm:text-lg">Todos os vídeos do canal</p>
        </motion.div>

        {/* Tabs */}
        <div className="mb-10 flex flex-wrap justify-center gap-3 sm:gap-4 sm:mb-12">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:px-6 sm:py-3 sm:text-base ${
              activeTab === 'all'
                ? 'bg-orange-500 text-white glow-orange'
                : 'glass text-gray-300 hover:text-white'
            }`}
          >
            Todos os Vídeos
          </button>
          <button
            onClick={() => setActiveTab('top')}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:px-6 sm:py-3 sm:text-base ${
              activeTab === 'top'
                ? 'bg-orange-500 text-white glow-orange'
                : 'glass text-gray-300 hover:text-white'
            }`}
          >
            Mais Assistidos (30 dias)
          </button>
        </div>

        {/* Grid de Vídeos */}
        {displayVideos.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-lg">
              Sem vídeos para mostrar. Verifica a API Key e o ID do canal no ficheiro{' '}
              <code className="text-orange-500">server/.env</code>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {displayVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.08, 0.5) }}
                className="group overflow-hidden rounded-2xl glass transition-all duration-300 hover:scale-105"
              >
                {/* Thumbnail — clique abre no YouTube */}
                <a
                  href={videoUrl(video.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-video overflow-hidden"
                  aria-label={`Abrir "${video.title}" no YouTube`}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Play className="h-12 w-12 text-white drop-shadow-lg sm:h-16 sm:w-16" />
                  </div>
                  {video.publishedAt && (
                    <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs text-white">
                      {formatDate(video.publishedAt)}
                    </div>
                  )}
                </a>

                <div className="p-4">
                  <a
                    href={videoUrl(video.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 block line-clamp-2 font-bold transition-colors group-hover:text-orange-500 text-base sm:text-lg"
                  >
                    {video.title}
                  </a>
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-400 sm:gap-4 sm:text-sm">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {formatNumber(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" /> {formatNumber(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" /> {formatNumber(video.comments)}
                    </span>
                    <a
                      href={videoUrl(video.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-orange-500 transition-colors hover:text-orange-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> YouTube
                    </a>
                  </div>

                  <button
                    onClick={() => toggleComments(video.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-gray-300 transition-all duration-300 hover:bg-orange-500/20 hover:text-orange-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">
                      {comments[video.id]
                        ? `${comments[video.id].length} Comentário${comments[video.id].length === 1 ? '' : 's'}`
                        : 'Ver Comentários'}
                    </span>
                    {expandedVideo === video.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedVideo === video.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 max-h-60 space-y-2 overflow-y-auto"
                      >
                        {loadingComments[video.id] ? (
                          <div className="flex justify-center py-4">
                            <div className="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
                          </div>
                        ) : (comments[video.id] || []).length > 0 ? (
                          comments[video.id].map((comment) => (
                            <div
                              key={comment.id}
                              className={`rounded-lg bg-white/5 p-3 ${
                                comment.isReply ? 'ml-5 border-l-2 border-orange-500/40' : ''
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <AvatarImg
                                  src={comment.authorImage}
                                  name={comment.author}
                                  color="#f97316"
                                  className="h-6 w-6"
                                />
                                <span className="text-xs font-semibold text-orange-500 sm:text-sm">
                                  {comment.author}
                                </span>
                                {comment.isReply && (
                                  <span className="text-[10px] text-gray-500">resposta</span>
                                )}
                                {comment.likes > 0 && (
                                  <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                                    <ThumbsUp className="h-3 w-3" /> {comment.likes}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-300 sm:text-sm">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="py-2 text-center text-xs text-gray-500 sm:text-sm">
                            Sem comentários ou a API não está configurada
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
