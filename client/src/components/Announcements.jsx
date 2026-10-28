import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Send, StickyNote, Loader2 } from 'lucide-react'

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso.includes('T') || iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PAGE_POSTS = 6

/* Anúncios do admin — aparecem no topo da página inicial,
   à esquerda, com cara de bloco de notas. */
export default function Announcements() {
  const [posts, setPosts] = useState(null) // null = a carregar
  const [mais, setMais] = useState(false) // há mais anúncios
  const [aCarregarMais, setACarregarMais] = useState(false)
  const [openComments, setOpenComments] = useState({}) // postId -> bool
  const [comments, setComments] = useState({}) // postId -> []
  const [form, setForm] = useState({}) // postId -> {author, content}
  const [busy, setBusy] = useState({})

  const carregar = async (offset = 0) => {
    const res = await fetch(`/api/posts?limit=${PAGE_POSTS}&offset=${offset}`)
    if (!res.ok) throw new Error('falhou')
    const data = await res.json()
    const lista = Array.isArray(data) ? data : []
    setPosts((prev) => (offset === 0 ? lista : [...(prev || []), ...lista]))
    setMais(lista.length === PAGE_POSTS)
  }

  useEffect(() => {
    carregar().catch(() => setPosts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carregarMais = async () => {
    if (aCarregarMais || posts === null) return
    setACarregarMais(true)
    try {
      await carregar(posts.length)
    } catch {
      setMais(false)
    } finally {
      setACarregarMais(false)
    }
  }

  if (posts === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }
  if (posts.length === 0) return null

  const like = (p) => {
    if (busy[p.id]) return
    setBusy((b) => ({ ...b, [p.id]: true }))
    fetch(`/api/posts/${p.id}/like`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPosts((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, likes: data.likes } : x)),
          )
        }
      })
      .finally(() => setBusy((b) => ({ ...b, [p.id]: false })))
  }

  const toggleComments = async (p) => {
    const open = !openComments[p.id]
    setOpenComments((s) => ({ ...s, [p.id]: open }))
    if (open && !comments[p.id]) {
      try {
        const res = await fetch(`/api/posts/${p.id}/comments`)
        if (res.ok) {
          const data = await res.json()
          setComments((c) => ({ ...c, [p.id]: data }))
        }
      } catch {
        /* sem rede */
      }
    }
  }

  const send = async (p) => {
    const f = form[p.id] || { author: '', content: '' }
    if (!f.author.trim() || !f.content.trim() || busy[p.id]) return
    setBusy((b) => ({ ...b, [p.id]: true }))
    try {
      const res = await fetch(`/api/posts/${p.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: f.author.trim(), content: f.content.trim() }),
      })
      if (res.ok) {
        const cm = await res.json()
        setComments((c) => ({ ...c, [p.id]: [...(c[p.id] || []), cm] }))
        setForm((s) => ({ ...s, [p.id]: { author: '', content: '' } }))
      }
    } catch {
      /* sem rede */
    } finally {
      setBusy((b) => ({ ...b, [p.id]: false }))
    }
  }

  const setField = (id, key, value) =>
    setForm((s) => ({ ...s, [id]: { ...(s[id] || { author: '', content: '' }), [key]: value } }))

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
        <StickyNote className="h-5 w-5 text-yellow-400" />
        Anúncios
      </h2>

      <div className="space-y-5">
        {posts.map((p, i) => (
          <article
            key={p.id}
            className="rounded-lg border border-amber-300/60 bg-amber-100 p-4 text-gray-900 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            style={{ transform: `rotate(${i % 2 === 0 ? '-0.5' : '0.5'}deg)` }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-black leading-snug text-amber-900">{p.title}</h3>
              <span className="shrink-0 text-[11px] font-semibold text-amber-700">
                {fmtDate(p.created_at)}
              </span>
            </div>

            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {p.content}
            </p>

            {p.image_url && (
              <img
                src={p.image_url}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
                className="mt-2.5 w-full rounded-md border border-amber-300/70"
              />
            )}

            <div className="mt-3 flex items-center gap-1 border-t border-amber-300/80 pt-2">
              <button
                onClick={() => like(p)}
                disabled={busy[p.id]}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                  p.liked
                    ? 'bg-red-500/15 text-red-600'
                    : 'text-amber-800 hover:bg-amber-300/60'
                }`}
              >
                <Heart className={`h-4 w-4 ${p.liked ? 'fill-red-500 text-red-600' : ''}`} />
                {p.likes || 0}
              </button>
              <button
                onClick={() => toggleComments(p)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-300/60"
              >
                <MessageCircle className="h-4 w-4" />
                {p.comments_count || (comments[p.id] || []).length || 0}
              </button>
            </div>

            {openComments[p.id] && (
              <div className="mt-2 space-y-2">
                {(comments[p.id] || []).map((c) => (
                  <div key={c.id} className="rounded-md bg-white/70 px-3 py-2">
                    <span className="text-xs font-black text-amber-900">{c.author}</span>
                    <p className="text-sm text-gray-800">{c.content}</p>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    value={(form[p.id] && form[p.id].author) || ''}
                    onChange={(e) => setField(p.id, 'author', e.target.value)}
                    placeholder="Nome"
                    maxLength={50}
                    className="w-24 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                  <input
                    value={(form[p.id] && form[p.id].content) || ''}
                    onChange={(e) => setField(p.id, 'content', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send(p)}
                    placeholder="Comentário…"
                    maxLength={1000}
                    className="flex-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => send(p)}
                    disabled={busy[p.id]}
                    className="rounded-md bg-amber-600 p-1.5 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Feed paginado — o resto dos anúncios vem a pedido */}
      {mais && (
        <button
          onClick={carregarMais}
          disabled={aCarregarMais}
          className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {aCarregarMais ? 'A carregar…' : 'Ver mais anúncios'}
        </button>
      )}
    </div>
  )
}
