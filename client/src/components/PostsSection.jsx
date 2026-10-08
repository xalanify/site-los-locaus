import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Calendar, Plus, Trash2, Image as ImageIcon } from 'lucide-react'

export default function PostsSection({ isAdmin }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', image_url: '' })

  useEffect(() => {
    fetch('/api/posts')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
  })

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
      if (!res.ok) return
      const updated = await res.json()
      if (updated && updated.id) {
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      }
    } catch (error) {
      console.error('Erro ao dar like:', error)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newPost),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erro ao criar publicação')
        return
      }
      const post = await res.json()
      if (post && post.id) {
        setPosts((prev) => [post, ...prev])
      }
      setNewPost({ title: '', content: '', image_url: '' })
      setShowForm(false)
    } catch (error) {
      console.error('Erro ao criar publicação:', error)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Apagar esta publicação?')) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      } else {
        alert('Erro ao apagar. Faz login novamente como admin.')
      }
    } catch (error) {
      console.error('Erro ao eliminar publicação:', error)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Apagar TODAS as publicações? Esta ação não pode ser desfeita.'))
      return
    try {
      const res = await fetch('/api/posts', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        setPosts([])
      } else {
        alert('Erro ao apagar. Faz login novamente como admin.')
      }
    } catch (error) {
      console.error('Erro ao limpar publicações:', error)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <section id="posts" className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
        </div>
      </section>
    )
  }

  return (
    <section id="posts" className="px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center sm:mb-12"
        >
          <h2 className="mb-3 font-black gradient-text sm:mb-4" style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)' }}>
            Publicações
          </h2>
          <p className="text-base text-gray-400 sm:text-lg">Novidades e avisos do canal</p>
        </motion.div>

        {isAdmin && (
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-orange-600 glow-orange sm:px-6 sm:text-base"
            >
              <Plus className="h-5 w-5" />
              Nova Publicação
            </button>
            {posts.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 rounded-full border border-red-500/50 px-5 py-3 text-sm font-bold text-red-400 transition-all duration-300 hover:bg-red-500 hover:text-white sm:px-6 sm:text-base"
              >
                <Trash2 className="h-5 w-5" />
                Apagar Tudo
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 overflow-hidden"
            >
              <form
                onSubmit={handleCreatePost}
                className="mx-auto max-w-2xl rounded-2xl p-4 glass sm:p-6"
              >
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Título da publicação"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full rounded-xl border border-gray-700 bg-dark/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-orange-500 focus:outline-none"
                    required
                    maxLength={150}
                  />
                  <textarea
                    placeholder="Escreve a tua mensagem..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-700 bg-dark/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-orange-500 focus:outline-none"
                    required
                    maxLength={5000}
                  />
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                    <input
                      type="url"
                      placeholder="URL da imagem (opcional)"
                      value={newPost.image_url}
                      onChange={(e) => setNewPost({ ...newPost, image_url: e.target.value })}
                      className="flex-1 rounded-xl border border-gray-700 bg-dark/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-orange-500 focus:outline-none"
                      maxLength={2000}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-white transition-all duration-300 hover:bg-orange-600"
                    >
                      Publicar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white transition-all duration-300 hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5 sm:space-y-6">
          {posts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-lg">Ainda não há publicações</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.08, 0.5) }}
                className="overflow-hidden rounded-2xl transition-all duration-300 glass hover:scale-[1.01]"
              >
                {post.image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">{post.title}</h3>
                      <p className="mb-4 whitespace-pre-wrap text-gray-300 text-sm sm:text-base">
                        {post.content}
                      </p>
                      {post.created_at && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 sm:text-sm">
                          <Calendar className="h-4 w-4" />
                          {formatDate(post.created_at)}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-400 transition-colors hover:text-red-300"
                        aria-label="Eliminar publicação"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="group flex items-center gap-2 text-gray-400 transition-colors hover:text-orange-500"
                    >
                      <Heart className="h-5 w-5 transition-all group-hover:fill-orange-500" />
                      <span className="font-semibold">{post.likes || 0}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
