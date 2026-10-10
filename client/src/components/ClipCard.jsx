import { useState, useEffect, useRef } from 'react'
import {
  Heart,
  MessageCircle,
  Bookmark,
  Download,
  Trash2,
  Send,
  Lock,
  X,
  Gamepad2,
  Pencil,
  Loader2,
  FolderPlus,
} from 'lucide-react'
import AvatarImg from './AvatarImg'
import Estado from './Estado'
import { authHeaders, mmss } from '../lib/auth'
import { CLIP_GAMES, gameLabel } from '../data/clipGames'

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso.includes('T') || iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fmtComment = fmtDate

/* Cartão de um clip: vídeo (com corte), autor, gostos,
   comentários com respostas, guardar e transferir. */
export default function ClipCard({
  clip,
  user,
  onRequestAuth,
  onProfile,
  onUpdate,
  onDelete,
  onColecao = null,
}) {
  const [c, setC] = useState(clip)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadedComments, setLoadedComments] = useState(false)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [busy, setBusy] = useState(false)
  const videoRef = useRef(null)

  // edição (só para o dono do clip)
  const [editando, setEditando] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoJogo, setNovoJogo] = useState('')
  const [novaVis, setNovaVis] = useState('public')
  const [errEdit, setErrEdit] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => setC(clip), [clip])

  const start = Number(c.start) || 0
  const end = c.end != null ? Number(c.end) : null

  const update = (next) => {
    setC(next)
    if (onUpdate) onUpdate(next)
  }

  /* ---- vídeo: reproduz só o trecho cortado ---- */
  const onMeta = () => {
    const v = videoRef.current
    if (v && start > 0) v.currentTime = start
  }
  const onTime = () => {
    const v = videoRef.current
    if (!v) return
    if (start > 0 && v.currentTime < start - 0.5) {
      v.currentTime = start
      return
    }
    if (end != null && v.currentTime >= end - 0.06) {
      v.currentTime = start
    }
  }

  /* ---- gostar ---- */
  const like = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clips/${c.id}/like`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) update({ ...c, liked: data.liked, likes: data.likes })
    } catch {
      /* sem rede */
    } finally {
      setBusy(false)
    }
  }

  /* ---- guardar ---- */
  const save = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clips/${c.id}/save`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) update({ ...c, saved: data.saved, saves: data.saves })
    } catch {
      /* sem rede */
    } finally {
      setBusy(false)
    }
  }

  /* ---- transferir ---- */
  const download = async () => {
    try {
      const res = await fetch(`/api/clips/${c.id}/download`, { headers: authHeaders() })
      if (!res.ok) {
        if (res.status === 401) onRequestAuth && onRequestAuth()
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${c.title || 'clip'}${c.url.slice(c.url.lastIndexOf('.'))}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      update({ ...c, downloads: (c.downloads || 0) + 1 })
    } catch {
      /* sem rede */
    }
  }

  /* ---- comentários ---- */
  const toggleComments = async () => {
    const next = !showComments
    setShowComments(next)
    if (next && !loadedComments) {
      try {
        const res = await fetch(`/api/clips/${c.id}/comments`)
        if (res.ok) {
          setComments(await res.json())
          setLoadedComments(true)
        }
      } catch {
        /* sem rede */
      }
    }
  }

  const send = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    const content = text.trim()
    if (!content || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clips/${c.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content, parent_id: replyTo }),
      })
      if (res.ok) {
        const cm = await res.json()
        setComments((prev) => [...prev, cm])
        setText('')
        setReplyTo(null)
        update({ ...c, comments_count: (c.comments_count || 0) + 1 })
      }
    } catch {
      /* sem rede */
    } finally {
      setBusy(false)
    }
  }

  const removeComment = async (cm) => {
    try {
      const res = await fetch(`/api/clips/${c.id}/comments/${cm.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        setComments((prev) => prev.filter((x) => x.id !== cm.id && x.parent_id !== cm.id))
        update({ ...c, comments_count: Math.max(0, (c.comments_count || 0) - 1) })
      }
    } catch {
      /* sem rede */
    }
  }

  /* ---- gosto num comentário (toggle) ---- */
  const toggleCommentLike = async (cm) => {
    if (!user) return onRequestAuth && onRequestAuth()
    const liked = !cm.liked
    const anterior = cm.likes || 0
    // atualiza já, sem esperar pelo servidor
    setComments((prev) =>
      prev.map((x) =>
        x.id === cm.id ? { ...x, liked, likes: Math.max(0, anterior + (liked ? 1 : -1)) } : x,
      ),
    )
    try {
      const res = await fetch(`/api/clips/${c.id}/comments/${cm.id}/like`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (res.ok) {
        const d = await res.json()
        setComments((prev) => prev.map((x) => (x.id === cm.id ? { ...x, ...d } : x)))
      } else {
        throw new Error('falhou')
      }
    } catch {
      // sem rede -> volta ao que estava
      setComments((prev) =>
        prev.map((x) => (x.id === cm.id ? { ...x, liked: !liked, likes: anterior } : x)),
      )
    }
  }

  /* ---- editar (só o dono) ---- */
  const abrirEdicao = () => {
    setNovoTitulo(c.title)
    setNovoJogo(c.game || '')
    setNovaVis(c.visibility === 'private' ? 'private' : 'public')
    setErrEdit('')
    setEditando(true)
  }

  const guardarEdicao = async () => {
    if (salvando) return
    const t = novoTitulo.trim()
    if (!t) return setErrEdit('O título não pode ficar vazio.')
    setSalvando(true)
    setErrEdit('')
    try {
      const res = await fetch(`/api/clips/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ title: t, game: novoJogo || undefined, visibility: novaVis }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrEdit((data && data.error) || 'Não consegui guardar as alterações.')
        return
      }
      update({ ...c, ...data })
      setEditando(false)
    } catch {
      setErrEdit('Sem rede — tenta outra vez.')
    } finally {
      setSalvando(false)
    }
  }

  const removeClip = async () => {
    if (!window.confirm('Eliminar este clip?')) return
    try {
      const res = await fetch(`/api/clips/${c.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok && onDelete) onDelete(c.id)
    } catch {
      /* sem rede */
    }
  }

  const tops = comments.filter((x) => !x.parent_id)
  const repliesOf = (id) => comments.filter((x) => x.parent_id === id)

  const actionCls = (active) =>
    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
      active
        ? 'bg-orange-500/20 text-orange-400'
        : 'text-gray-400 hover:bg-white/10 hover:text-white'
    }`

  const renderComment = (cm, isReply = false) => (
    <div key={cm.id} className={isReply ? 'ml-6 mt-2' : 'mt-3'}>
      <div className="flex items-start gap-2">
        <AvatarImg name={cm.author} src={cm.author_avatar} className="h-6 w-6" />
        <div className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-2">
            <button
              onClick={() => onProfile && onProfile(cm.author)}
              className="text-xs font-bold text-orange-400 hover:underline"
            >
              {cm.author}
            </button>
            <span className="text-[10px] text-gray-500">{fmtComment(cm.created_at)}</span>
          </div>
          <p className="mt-0.5 break-words text-sm text-gray-200">{cm.content}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={() => toggleCommentLike(cm)}
            title={cm.liked ? 'Tirar o gosto' : 'Gostar do comentário'}
            aria-pressed={!!cm.liked}
            className={`flex items-center gap-0.5 rounded p-1 transition-colors ${
              cm.liked ? 'text-rose-400' : 'text-gray-500 hover:bg-white/10 hover:text-rose-400'
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={cm.liked ? 'currentColor' : 'none'} />
            {!!cm.likes && <span className="text-[10px] font-black leading-none">{cm.likes}</span>}
          </button>
          <button
            onClick={() => {
              if (!user) return onRequestAuth && onRequestAuth()
              setReplyTo(replyTo === cm.id ? null : cm.id)
            }}
            title="Responder"
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-orange-400"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
          {cm.deletable && (
            <button
              onClick={() => removeComment(cm)}
              title="Eliminar comentário"
              className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {!isReply && repliesOf(cm.id).map((r) => renderComment(r, true))}
    </div>
  )

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* Autor + jogo + data */}
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <button
          onClick={() => onProfile && onProfile(c.author)}
          className="group flex items-center gap-2.5"
        >
          <AvatarImg name={c.author} src={c.author_avatar} className="h-9 w-9" />
          <span className="text-sm font-bold text-white group-hover:text-orange-400">
            {c.author}
          </span>
        </button>
        {c.game && (
          <span className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold text-orange-300 ring-1 ring-orange-500/30">
            <Gamepad2 className="h-3 w-3" /> {gameLabel(c.game)}
          </span>
        )}
        <span className="text-xs text-gray-500">{fmtDate(c.created_at)}</span>
        {c.visibility === 'private' && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-bold text-yellow-400">
            <Lock className="h-3 w-3" /> Privado
          </span>
        )}
        {c.mine && (
          <div className={`flex items-center gap-1 ${c.visibility === 'private' ? '' : 'ml-auto'}`}>
            {!editando && (
              <button
                onClick={abrirEdicao}
                title="Editar clip"
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-orange-500/15 hover:text-orange-400"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={removeClip}
              title="Eliminar clip"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Título + vídeo */}
      <div className="px-4 pt-3">
        {editando ? (
          <div className="rounded-xl bg-white/5 p-3">
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              maxLength={100}
              placeholder="Título do clip"
              className="w-full rounded-lg bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none ring-1 ring-white/10 focus:ring-orange-500/50"
            />
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={novoJogo}
                onChange={(e) => setNovoJogo(e.target.value)}
                title="Jogo do clip"
                className="cursor-pointer rounded-lg bg-black/40 px-2.5 py-2 text-xs font-bold text-gray-200 outline-none ring-1 ring-white/10 focus:ring-orange-500/50"
              >
                {!novoJogo && (
                  <option value="" className="bg-neutral-900">
                    Escolher jogo…
                  </option>
                )}
                {CLIP_GAMES.map((g) => (
                  <option key={g.id} value={g.id} className="bg-neutral-900">
                    {g.label}
                  </option>
                ))}
              </select>
              <select
                value={novaVis}
                onChange={(e) => setNovaVis(e.target.value)}
                title="Visibilidade do clip"
                className="cursor-pointer rounded-lg bg-black/40 px-2.5 py-2 text-xs font-bold text-gray-200 outline-none ring-1 ring-white/10 focus:ring-orange-500/50"
              >
                <option value="public" className="bg-neutral-900">
                  Público — vê toda a gente
                </option>
                <option value="private" className="bg-neutral-900">
                  Privado — vês só tu
                </option>
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={guardarEdicao}
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> A guardar…
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
              <button
                onClick={() => setEditando(false)}
                disabled={salvando}
                className="flex-1 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/20 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
            {errEdit && <p className="mt-2 text-xs font-bold text-red-400">{errEdit}</p>}
          </div>
        ) : (
          <h3 className="font-bold text-white">{c.title}</h3>
        )}
        <video
          ref={videoRef}
          src={c.url}
          controls
          preload="metadata"
          playsInline
          onLoadedMetadata={onMeta}
          onTimeUpdate={onTime}
          /* só um clip a tocar de cada vez (menos CPU e banda) */
          onPlay={() =>
            document.querySelectorAll('video').forEach((v) => {
              if (v !== videoRef.current && !v.paused) v.pause()
            })
          }
          className="mt-3 max-h-[65vh] w-full rounded-xl bg-black"
        />
        {(start > 0 || end != null) && (
          <p className="mt-1.5 text-xs text-gray-500">
            Trecho: {mmss(start)} – {end != null ? mmss(end) : 'fim'}
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-3">
        <button onClick={like} className={actionCls(c.liked)} title="Gosto">
          <Heart className={`h-4 w-4 ${c.liked ? 'fill-orange-400 text-orange-400' : ''}`} />
          {c.likes || 0}
        </button>
        <button onClick={toggleComments} className={actionCls(showComments)} title="Comentários">
          <MessageCircle className="h-4 w-4" />
          {c.comments_count || 0}
        </button>
        <button onClick={save} className={actionCls(c.saved)} title="Guardar">
          <Bookmark className={`h-4 w-4 ${c.saved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {c.saves || 0}
        </button>
        {onColecao && (
          <button
            onClick={() => (user ? onColecao(c) : onRequestAuth && onRequestAuth())}
            className={actionCls(false)}
            title="Guardar numa coleção"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        )}
        <button onClick={download} className={actionCls(false)} title="Transferir">
          <Download className="h-4 w-4" />
          {c.downloads || 0}
        </button>
      </div>

      {/* Comentários */}
      {showComments && (
        <div className="border-t border-white/10 px-4 py-3">
          {comments.length === 0 && loadedComments && (
            <Estado
              compacto
              icon={MessageCircle}
              titulo="Ainda não há comentários"
              texto="Sê o primeiro a deixar a tua neste clip."
            />
          )}
          {tops.map((cm) => renderComment(cm))}

          {replyTo && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs text-orange-300">
              A responder a {comments.find((x) => x.id === replyTo)?.author}
              <button onClick={() => setReplyTo(null)} className="hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {user ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={replyTo ? 'Escreve uma resposta…' : 'Escreve um comentário…'}
                maxLength={1000}
                className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15"
              />
              <button
                onClick={send}
                disabled={busy || !text.trim()}
                className="rounded-full bg-orange-500 p-2.5 text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRequestAuth && onRequestAuth()}
              className="mt-3 w-full rounded-xl border border-dashed border-white/20 py-2.5 text-sm font-bold text-gray-400 transition-colors hover:border-orange-500/50 hover:text-orange-400"
            >
              Entra na conta para comentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
