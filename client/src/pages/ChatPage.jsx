import { useEffect, useRef, useState } from 'react'
import {
  Send,
  ImagePlus,
  Smile,
  Clapperboard,
  Loader2,
  X,
  MessageCircle,
  Trash2,
  Play,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from '../components/Feedback'

const EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😅', '😭',
  '😡', '🤯', '🥳', '😴', '🤝', '👏', '🙌', '🔥', '💜', '💀',
  '🎮', '🕹️', '🏆', '⚡', '💥', '🎯', '👀', '✅', '❌', '🤡',
  '🍀', '🚀', '🐐', '🧠', '😤', '🫡', '🤝', '💪', '👑', '🎉',
]

const linkify = (texto) => {
  const partes = String(texto || '').split(/(https?:\/\/[^\s]+)/g)
  return partes.map((p, i) =>
    /^https?:\/\//i.test(p) ? (
      <a
        key={i}
        href={p}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-violet-300 underline decoration-violet-400/40 underline-offset-2 hover:text-violet-200"
      >
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

const hora = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

const dia = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })
}

function ClipPreview({ clip, onOpen }) {
  if (!clip) return null
  return (
    <button
      onClick={() => onOpen(clip)}
      className="group mt-2 flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 text-left transition-colors hover:border-violet-400/40"
    >
      <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-violet-500/20">
        {clip.thumb_url ? (
          <img src={clip.thumb_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-violet-300">
            <Clapperboard className="h-6 w-6" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-bold text-white">{clip.title}</span>
        <span className="mt-1 block text-[11px] font-semibold text-gray-400">Clip de {clip.author}</span>
      </span>
    </button>
  )
}

export default function ChatPage({ user }) {
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState([])
  const [loading, setLoading] = useState(true)
  const [texto, setTexto] = useState('')
  const [aEnviar, setAEnviar] = useState(false)
  const [aSubir, setASubir] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [pendingMedia, setPendingMedia] = useState(null)
  const [pendingClip, setPendingClip] = useState(null)
  const [emojiAberto, setEmojiAberto] = useState(false)
  const [clipsAberto, setClipsAberto] = useState(false)
  const [clips, setClips] = useState([])
  const [clipsLoading, setClipsLoading] = useState(false)
  const [clipAberto, setClipAberto] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [novasMensagens, setNovasMensagens] = useState(false)
  const [erro, setErro] = useState('')

  const listaRef = useRef(null)
  const fimRef = useRef(null)
  const lastIdRef = useRef(0)
  const typingRef = useRef(0)
  const pertoDoFundoRef = useRef(true)
  const inputFileRef = useRef(null)
  const textareaRef = useRef(null)
  const aPollarRef = useRef(false)

  const juntar = (novas) => {
    if (!novas || !novas.length) return
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id))
      const add = novas.filter((m) => !ids.has(m.id))
      if (!add.length) return prev
      const lista = [...prev, ...add].sort((a, b) => a.id - b.id)
      return lista.slice(-250)
    })
    const ultimo = novas[novas.length - 1]
    if (ultimo) lastIdRef.current = Math.max(lastIdRef.current, ultimo.id)
  }

  const scrollFundo = (suave = false) => {
    const el = listaRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const r = await fetch('/api/chat?limit=60', { headers: authHeaders() })
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error((d && d.error) || 'Erro ao abrir o chat.')
        if (!vivo) return
        setMessages(d.messages || [])
        setTyping(d.typing || [])
        setHasMore(Boolean(d.has_more))
        lastIdRef.current = Number(d.last_id) || 0
        setLoading(false)
        setTimeout(() => scrollFundo(false), 30)
      } catch (e) {
        if (vivo) {
          setErro(e.message || 'Sem ligação ao chat.')
          setLoading(false)
        }
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    let vivo = true
    const tick = async () => {
      if (!vivo) return
      if (document.hidden || aPollarRef.current) return
      aPollarRef.current = true
      try {
        const depois = lastIdRef.current
        const r = await fetch(`/api/chat${depois ? `?after=${depois}` : '?limit=80'}`, {
          headers: authHeaders(),
        })
        if (r.ok) {
          const d = await r.json()
          if (d.typing) setTyping(d.typing)
          if (d.messages && d.messages.length) {
            const antes = listaRef.current
            const perto =
              !antes || antes.scrollHeight - antes.scrollTop - antes.clientHeight < 140
            juntar(d.messages)
            if (perto) setTimeout(() => scrollFundo(true), 40)
            else setNovasMensagens(true)
          }
        }
      } catch {
        /* rede intermitente */
      } finally {
        aPollarRef.current = false
      }
    }
    const t = setInterval(tick, 1800)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  const onScroll = () => {
    const el = listaRef.current
    if (!el) return
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    pertoDoFundoRef.current = perto
    if (perto) setNovasMensagens(false)
  }

  const pedirTyping = () => {
    const agora = Date.now()
    if (agora - typingRef.current < 2200) return
    typingRef.current = agora
    fetch('/api/chat/typing', { method: 'POST', headers: authHeaders() }).catch(() => {})
  }

  const carregarAnteriores = async () => {
    if (!messages.length || !hasMore) return
    const primeiro = messages[0].id
    try {
      const r = await fetch(`/api/chat?before=${primeiro}&limit=50`, { headers: authHeaders() })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d) return
      const el = listaRef.current
      const alturaAntes = el ? el.scrollHeight : 0
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        const add = (d.messages || []).filter((m) => !ids.has(m.id))
        return [...add, ...prev]
      })
      setHasMore(Boolean(d.has_more))
      setTimeout(() => {
        if (el) el.scrollTop = el.scrollHeight - alturaAntes
      }, 30)
    } catch {
      /* ignora */
    }
  }

  const enviar = async () => {
    const body = texto.trim()
    if (!body && !pendingMedia && !pendingClip) return
    if (aEnviar) return
    setAEnviar(true)
    setErro('')
    try {
      const payload = { body }
      if (pendingMedia) {
        payload.media_url = pendingMedia.url
        payload.media_type = pendingMedia.tipo
      }
      if (pendingClip) payload.clip_id = pendingClip.id
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para enviar.')
      juntar([d])
      setTexto('')
      setPendingMedia(null)
      setPendingClip(null)
      setEmojiAberto(false)
      setTimeout(() => scrollFundo(true), 20)
      if (textareaRef.current) textareaRef.current.focus()
    } catch (e) {
      setErro(e.message || 'Não deu para enviar.')
      toast.erro(e.message || 'Não deu para enviar.')
    } finally {
      setAEnviar(false)
    }
  }

  const escolherImagem = () => inputFileRef.current && inputFileRef.current.click()

  const subirImagem = async (file) => {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.erro('A imagem é demasiado grande (máx. 8 MB).')
      return
    }
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      toast.erro('Usa JPG, PNG, WebP ou GIF.')
      return
    }
    setASubir(true)
    setProgresso(0)
    try {
      const r = await fetch('/api/chat/upload-url', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: file.type }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para preparar a imagem.')
      await new Promise((resolve, reject) => {
        const x = new XMLHttpRequest()
        x.open('PUT', d.uploadUrl)
        x.setRequestHeader('Content-Type', file.type)
        x.setRequestHeader('x-upsert', 'false')
        x.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 100))
        }
        x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('Subida falhou.')))
        x.onerror = () => reject(new Error('Sem ligação ao Storage.'))
        x.send(file)
      })
      setPendingMedia({
        url: d.publicUrl,
        tipo: file.type === 'image/gif' ? 'gif' : 'image',
        preview: URL.createObjectURL(file),
      })
      setTimeout(() => textareaRef.current && textareaRef.current.focus(), 20)
    } catch (e) {
      toast.erro(e.message || 'Não deu para subir a imagem.')
    } finally {
      setASubir(false)
      setProgresso(0)
      if (inputFileRef.current) inputFileRef.current.value = ''
    }
  }

  const abrirClips = async () => {
    setClipsAberto(true)
    setClipsLoading(true)
    try {
      const r = await fetch('/api/clips?limit=60', { headers: authHeaders() })
      const d = await r.json().catch(() => null)
      setClips(Array.isArray(d) ? d.filter((c) => c.mine) : [])
    } catch {
      setClips([])
    } finally {
      setClipsLoading(false)
    }
  }

  const apagar = async (m) => {
    if (!(await confirmar('Apagar esta mensagem?'))) return
    try {
      const r = await fetch(`/api/chat/${m.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error('Não deu para apagar.')
      setMessages((prev) => prev.filter((x) => x.id !== m.id))
    } catch (e) {
      toast.erro(e.message || 'Não deu para apagar.')
    }
  }

  const inserirEmoji = (e) => {
    setTexto((t) => t + e)
    setEmojiAberto(false)
    setTimeout(() => textareaRef.current && textareaRef.current.focus(), 20)
  }

  let diaAnterior = ''

  return (
    <div className="mx-auto w-full max-w-3xl px-2 pb-2 pt-14 sm:pt-16 lg:px-0 lg:pt-0">
      <div className="flex h-[calc(100dvh-10.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0a16]/90 shadow-2xl shadow-black/40 sm:h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-8.5rem)]">
        {/* cabeçalho */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-white">Chat geral</h1>
            <p className="truncate text-[11px] font-semibold text-gray-400">
              {typing.length
                ? `${typing.map((t) => t.username).slice(0, 2).join(', ')}${typing.length > 2 ? ' e mais' : ''} a escrever…`
                : 'Toda a comunidade, em tempo real'}
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Online
          </span>
        </div>

        {/* mensagens */}
        <div
          ref={listaRef}
          onScroll={onScroll}
          className="chat-scroll flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir o chat…
            </div>
          )}

          {!loading && hasMore && (
            <div className="mb-3 flex justify-center">
              <button
                onClick={carregarAnteriores}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-300 hover:bg-white/10"
              >
                <ChevronUp className="h-3.5 w-3.5" /> Carregar anteriores
              </button>
            </div>
          )}

          {!loading && !messages.length && (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20">
                <Sparkles className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-lg font-black text-white">Ainda está tudo calado…</h2>
              <p className="mt-1 text-sm text-gray-400">
                Manda a primeira mensagem, uma imagem, um GIF ou um clip.
              </p>
            </div>
          )}

          {!loading &&
            messages.map((m, i) => {
              const minha = Number(m.user.id) === Number(user && user.id)
              const anterior = messages[i - 1]
              const seguida = anterior && anterior.user.id === m.user.id
              const rotuloDia = dia(m.created_at)
              const mostrarDia = rotuloDia !== diaAnterior
              if (mostrarDia) diaAnterior = rotuloDia
              return (
                <div key={m.id}>
                  {mostrarDia && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {rotuloDia}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <div className={`group flex items-end gap-2 ${minha ? 'flex-row-reverse' : ''} ${seguida ? 'mt-0.5' : 'mt-3'}`}>
                    <span className={seguida ? 'w-8 shrink-0' : 'w-8 shrink-0'}>
                      {!seguida && (
                        <AvatarImg src={m.user.avatar_url} name={m.user.username} className="h-8 w-8" />
                      )}
                    </span>
                    <div className={`max-w-[82%] sm:max-w-[74%] ${minha ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!seguida && (
                        <span className={`mb-1 px-1 text-[11px] font-bold ${minha ? 'text-violet-300' : 'text-gray-400'}`}>
                          {minha ? 'Tu' : m.user.username} · {hora(m.created_at)}
                        </span>
                      )}
                      <div
                        className={`relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                          minha
                            ? 'rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white'
                            : 'rounded-bl-md border border-white/10 bg-white/[0.06] text-gray-100'
                        }`}
                      >
                        {m.body && <p className="whitespace-pre-wrap break-words">{linkify(m.body)}</p>}
                        {m.media_url && (
                          <button
                            onClick={() => window.open(m.media_url, '_blank', 'noopener')}
                            className={`block overflow-hidden rounded-xl ${m.body ? 'mt-2' : ''}`}
                          >
                            <img
                              src={m.media_url}
                              alt=""
                              loading="lazy"
                              className="max-h-72 w-auto max-w-full object-contain"
                            />
                          </button>
                        )}
                        <ClipPreview clip={m.clip} onOpen={setClipAberto} />
                        {minha && (
                          <span className="mt-1 block text-right text-[9px] font-semibold text-white/60">
                            {hora(m.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    {minha && (
                      <button
                        onClick={() => apagar(m)}
                        title="Apagar mensagem"
                        className="mb-1 hidden rounded-lg p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-300 group-hover:block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          <div ref={fimRef} />
        </div>

        {novasMensagens && (
          <button
            onClick={() => {
              setNovasMensagens(false)
              scrollFundo(true)
            }}
            className="mx-auto -mt-10 mb-2 flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-violet-900/40"
          >
            Novas mensagens
          </button>
        )}

        {erro && (
          <div className="mx-3 mb-1 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
            {erro}
          </div>
        )}

        {/* anexos pendentes */}
        {(pendingMedia || pendingClip || aSubir) && (
          <div className="border-t border-white/10 bg-white/[0.02] px-3 pt-2">
            <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-2">
              {aSubir ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </span>
              ) : pendingMedia ? (
                <img src={pendingMedia.preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Clapperboard className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                  {aSubir ? 'A subir imagem…' : pendingMedia ? 'Imagem pronta a enviar' : pendingClip?.title || 'Clip'}
                </p>
                <p className="text-[10px] font-semibold text-gray-400">
                  {aSubir ? `${progresso}%` : 'Escreve uma mensagem (opcional) e envia.'}
                </p>
              </div>
              {!aSubir && (
                <button
                  onClick={() => {
                    setPendingMedia(null)
                    setPendingClip(null)
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* compositor */}
        <div className="relative border-t border-white/10 bg-[#0d0a16] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3">
          {emojiAberto && (
            <div className="absolute bottom-full left-2 right-2 mb-2 grid max-h-56 grid-cols-8 gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#171122] p-2 shadow-2xl sm:left-3 sm:right-auto sm:w-80">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => inserirEmoji(e)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-white/10"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <input
              ref={inputFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => subirImagem(e.target.files && e.target.files[0])}
            />
            <button
              onClick={escolherImagem}
              disabled={aSubir}
              title="Enviar imagem ou GIF"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/10 hover:text-violet-300 disabled:opacity-40"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              onClick={abrirClips}
              title="Enviar um clip"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/10 hover:text-violet-300"
            >
              <Clapperboard className="h-5 w-5" />
            </button>
            <button
              onClick={() => setEmojiAberto((v) => !v)}
              title="Emojis"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10 ${
                emojiAberto ? 'bg-violet-500/15 text-violet-300' : 'text-gray-400 hover:text-violet-300'
              }`}
            >
              <Smile className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={texto}
              maxLength={2000}
              onChange={(e) => {
                setTexto(e.target.value)
                if (e.target.value.trim()) pedirTyping()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  enviar()
                }
              }}
              placeholder="Mensagem…"
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-400/40 focus:bg-white/[0.07]"
            />
            <button
              onClick={enviar}
              disabled={aEnviar || aSubir || (!texto.trim() && !pendingMedia && !pendingClip)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-40"
              title="Enviar"
            >
              {aEnviar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 hidden px-1 text-[10px] font-semibold text-gray-600 sm:block">
            Enter envia · Shift + Enter muda de linha · máx. 2000 caracteres
          </p>
        </div>
      </div>

      {/* escolher clip */}
      {clipsAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[75dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#120d1d] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-black text-white">
                <Clapperboard className="h-4 w-4 text-violet-300" /> Os teus clips
              </h2>
              <button onClick={() => setClipsAberto(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {clipsLoading ? (
                <div className="flex items-center justify-center py-10 text-sm font-semibold text-gray-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A carregar…
                </div>
              ) : !clips.length ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  Ainda não tens clips teus. Publica um na página de Clips.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {clips.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setPendingClip(c)
                        setClipsAberto(false)
                        setTimeout(() => textareaRef.current && textareaRef.current.focus(), 20)
                      }}
                      className="overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left transition hover:border-violet-400/50"
                    >
                      <span className="block aspect-video bg-violet-500/10">
                        {c.thumb_url ? (
                          <img src={c.thumb_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-violet-300">
                            <Clapperboard className="h-5 w-5" />
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 block px-2 py-1.5 text-[11px] font-bold text-white">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ver clip */}
      {clipAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" onClick={() => setClipAberto(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-bold text-white">{clipAberto.title}</p>
              <button onClick={() => setClipAberto(null)} className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black">
              {clipAberto.remoto ? (
                <iframe
                  title={clipAberto.title}
                  src={`https://www.youtube-nocookie.com/embed/${clipAberto.remoto}?autoplay=1&rel=0`}
                  className="aspect-video w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : clipAberto.url ? (
                <video src={clipAberto.url} controls autoPlay playsInline className="max-h-[75dvh] w-full" />
              ) : (
                <p className="p-8 text-center text-sm text-gray-400">Este clip não está disponível.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
