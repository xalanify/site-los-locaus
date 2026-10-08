import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Heart,
  Calendar,
  MessageCircle,
  Trash2,
  Send,
  Megaphone,
  Plus,
} from 'lucide-react'
import AvatarImg from './AvatarImg'

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso.includes('T') || iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PublicationsModal({ isOpen, onClose, isAdmin = false }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentForm, setCommentForm] = useState({}) // postId -> {author, content}
  const [sending, setSending] = useState({}) // postId -> bool
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', image_url: '' })
  const [creating, setCreating] = useState(false)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
  })

  const load = useCallback(() => {
    fetch('/api/posts')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      load()
    }
  }, [isOpen, load])

  // Fecha com ESC
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
      if (!res.ok) return
      const updated = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated, liked: true } : p)))
    } catch {
      /* ignora */
    }
  }

  const handleComment = async (postId) => {
    const form = commentForm[postId] || {}
    if (!form.author?.trim() || !form.content?.trim()) {
      setError('Escreve o teu nome e o comentário.')
      return
    }
    setError('')
    setSending((s) => ({ ...s, [postId]: true }))
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: form.author, content: form.content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao comentar')
        return
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), data],
                comments_count: (p.comments_count || 0) + 1,
              }
            : p,
        ),
      )
      setCommentForm((f) => ({ ...f, [postId]: { ...(f[postId] || {}), content: '' } }))
    } catch {
      setError('Erro de conexão')
    } finally {
      setSending((s) => ({ ...s, [postId]: false }))
    }
  }

  const handleDelete = async (postId) => {
    if (!window.confirm('Eliminar esta publicação?')) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch {
      /* ignora */
    }
  }

  const handleCreate = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      setError('Preenche o título e o conteúdo.')
      return
    }
    setError('')
    setCreating(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newPost),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar publicação')
        return
      }
      setPosts((prev) => [{ ...data, liked: false, comments: [], comments_count: 0 }, ...prev])
      setNewPost({ title: '', content: '', image_url: '' })
      setShowForm(false)
    } catch {
      setError('Erro de conexão')
    } finally {
      setCreating(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="flex items-center gap-2 text-lg font-black text-white sm:text-xl">
                <Megaphone className="h-5 w-5 text-orange-400" />
                Publicações
              </h3>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {/* Criar publicação (admin) */}
              {isAdmin && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-orange-500/40 py-3 text-sm font-bold text-orange-400 transition-colors hover:bg-orange-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Nova publicação
                </button>
              )}

              {isAdmin && showForm && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-400">
                    <Megaphone className="h-4 w-4" />
                    Nova publicação
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      maxLength={150}
                      placeholder="Título"
                      value={newPost.title}
                      onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                    />
                    <textarea
                      rows={4}
                      maxLength={5000}
                      placeholder="Conteúdo..."
                      value={newPost.content}
                      onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                      className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                    />
                    <input
                      type="url"
                      placeholder="URL de imagem (opcional)"
                      value={newPost.image_url}
                      onChange={(e) => setNewPost((p) => ({ ...p, image_url: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                      >
                        {creating ? 'A criar...' : 'Publicar'}
                      </button>
                      <button
                        onClick={() => {
                          setShowForm(false)
                          setError('')
                        }}
                        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-white/20"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-orange-500" />
                </div>
              ) : posts.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Ainda não há publicações.
                </p>
              ) : (
                posts.map((post) => {
                  const form = commentForm[post.id] || {}
                  const comments = post.comments || []
                  return (
                    <div key={post.id} className="rounded-xl bg-white/5 p-4">
                      {/* Cabeçalho do post */}
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="break-words text-base font-bold text-white sm:text-lg">
                            {post.title}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {fmtDate(post.created_at)}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            title="Eliminar publicação"
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                          className="mb-3 max-h-64 w-full rounded-lg object-cover"
                        />
                      )}

                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                        {post.content}
                      </p>

                      {/* Gostos */}
                      <div className="mt-3 flex items-center gap-4 border-t border-white/5 pt-3">
                        <button
                          onClick={() => handleLike(post.id)}
                          disabled={post.liked}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${
                            post.liked
                              ? 'cursor-default text-red-400'
                              : 'text-gray-400 hover:text-red-400'
                          }`}
                          title={post.liked ? 'Já gostaste desta publicação' : 'Gostar'}
                        >
                          <Heart
                            className={`h-4 w-4 ${post.liked ? 'fill-red-500 text-red-500' : ''}`}
                          />
                          <span className="font-bold">{post.likes || 0}</span>
                        </button>
                        <span className="flex items-center gap-1.5 text-sm text-gray-400">
                          <MessageCircle className="h-4 w-4" />
                          <span className="font-bold">{comments.length}</span>
                        </span>
                      </div>

                      {/* Comentários */}
                      <div className="mt-3 space-y-2">
                        {comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2">
                            <AvatarImg
                              name={c.author}
                              color="#f97316"
                              className="mt-0.5 h-6 w-6"
                            />
                            <div className="min-w-0 rounded-lg bg-black/30 px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-orange-400">
                                  {c.author}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {fmtDate(c.created_at)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap break-words text-xs text-gray-300 sm:text-sm">
                                {c.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Formulário de comentário */}
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          maxLength={50}
                          placeholder="O teu nome"
                          value={form.author || ''}
                          onChange={(e) =>
                            setCommentForm((f) => ({
                              ...f,
                              [post.id]: { ...form, author: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 sm:w-40"
                        />
                        <input
                          type="text"
                          maxLength={1000}
                          placeholder="Escreve um comentário..."
                          value={form.content || ''}
                          onChange={(e) =>
                            setCommentForm((f) => ({
                              ...f,
                              [post.id]: { ...form, content: e.target.value },
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          className="w-full flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={sending[post.id]}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          Enviar
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {error && <p className="text-center text-xs text-red-400">{error}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
