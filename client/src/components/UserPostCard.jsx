import { useState } from 'react'
import { Heart, Trash2, CalendarDays } from 'lucide-react'
import { svgAvatar } from '../lib/avatar'
import { confirmar, toast } from './Feedback'

function dataCurta(valor) {
  try {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/* Mensagem/publicação de um utilizador no feed do perfil. */
export default function UserPostCard({ post, viewer, onDelete, onUpdate, autor }) {
  const [liked, setLiked] = useState(Boolean(post.liked))
  const [likes, setLikes] = useState(Number(post.likes) || 0)
  const [zoom, setZoom] = useState(false)
  const [apagar, setApagar] = useState(false)

  const nome = autor?.username || post.author || 'Membro'
  const avatar = autor?.avatar_url || post.author_avatar
  const dono = Boolean(viewer && (viewer.id === post.user_id || viewer.is_admin))

  const gostar = async () => {
    if (liked) return
    try {
      const r = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      if (!r.ok) return
      setLiked(true)
      setLikes((n) => n + 1)
    } catch {
      /* sem ligação */
    }
  }

  const eliminar = async () => {
    const ok = await confirmar('Apagar esta mensagem?', {
      titulo: 'Apagar mensagem',
      okTexto: 'Apagar',
    })
    if (!ok) return
    setApagar(true)
    try {
      const token =
        localStorage.getItem('userToken') || localStorage.getItem('adminToken') || ''
      const r = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error('falhou')
      toast.ok('Mensagem apagada.')
      if (onDelete) onDelete(post.id)
    } catch {
      toast.erro('Não deu para apagar a mensagem.')
      setApagar(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.022] shadow-lg shadow-black/10 backdrop-blur-md">
      <header className="flex items-center gap-2.5 px-4 pt-3.5">
        <img
          src={avatar || svgAvatar(nome, '#8b5cf6')}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/15"
          onError={(e) => {
            if (e.currentTarget.dataset.fb) return
            e.currentTarget.dataset.fb = '1'
            e.currentTarget.src = svgAvatar(nome, '#8b5cf6')
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-white">{nome}</p>
          <p className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
            <CalendarDays className="h-3 w-3" /> {dataCurta(post.created_at)}
          </p>
        </div>
        {dono && (
          <button
            type="button"
            onClick={eliminar}
            disabled={apagar}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
            title="Apagar mensagem"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {post.content && (
        <p className="whitespace-pre-wrap px-4 pt-2 text-[13px] leading-relaxed text-gray-200">
          {post.content}
        </p>
      )}

      {post.image_url && (
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="mt-3 block w-full overflow-hidden"
          title="Ver imagem"
        >
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="max-h-80 w-full object-cover transition-transform duration-300 hover:scale-[1.01]"
          />
        </button>
      )}

      <footer className="flex items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={gostar}
          className={`flex items-center gap-1.5 text-[12px] font-bold transition-colors ${
            liked ? 'text-rose-400' : 'text-gray-400 hover:text-rose-300'
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-rose-400' : ''}`} /> {likes}
        </button>
      </footer>

      {zoom && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={post.image_url}
            alt=""
            className="max-h-[80vh] max-w-[92vw] rounded-xl border border-white/15 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  )
}
