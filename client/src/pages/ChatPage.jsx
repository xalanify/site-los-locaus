import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ArrowDown,
  Copy,
  Check,
  CheckCheck,
  Maximize2,
  Users,
  Hash,
  CornerUpLeft,
  Pin,
  Palette,
  Volume2,
  VolumeX,
  Sticker,
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { authHeaders } from '../lib/auth'
import { tocarSom } from '../lib/sons'
import { vistoPorUltimo } from '../lib/tempo'
import PageShell from '../components/PageShell'
import { confirmar, toast } from '../components/Feedback'
/* Temas do chat — só o admin muda; aplica a todos.
   Cada tema = cor principal + fundo do chat. */
const TEMAS = {
  violeta: { nome: 'Violeta', grad: 'from-violet-600 to-fuchsia-600', cor: 'text-violet-300', borda: 'border-violet-400/40', bg: '#0d0a16', chip: 'bg-violet-500/15 text-violet-300' },
  azul: { nome: 'Azul', grad: 'from-blue-600 to-cyan-500', cor: 'text-blue-300', borda: 'border-blue-400/40', bg: '#080d1a', chip: 'bg-blue-500/15 text-blue-300' },
  verde: { nome: 'Verde', grad: 'from-emerald-600 to-green-500', cor: 'text-emerald-300', borda: 'border-emerald-400/40', bg: '#08140d', chip: 'bg-emerald-500/15 text-emerald-300' },
  rosa: { nome: 'Rosa', grad: 'from-pink-600 to-rose-500', cor: 'text-pink-300', borda: 'border-pink-400/40', bg: '#160a12', chip: 'bg-pink-500/15 text-pink-300' },
  laranja: { nome: 'Laranja', grad: 'from-orange-600 to-amber-500', cor: 'text-orange-300', borda: 'border-orange-400/40', bg: '#160f08', chip: 'bg-orange-500/15 text-orange-300' },
}
const TEMA_PADRAO = 'violeta'

const linkify = (texto) => {
  const partes = String(texto || '').split(/(https?:\/\/[^\s]+)/g)
  return partes.map((p, i) =>
    /^https?:\/\//i.test(p) ? (
      <a
        key={i}
        href={p}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-semibold text-violet-300 underline decoration-violet-400/40 underline-offset-2 hover:text-violet-200"
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
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen(clip)
      }}
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
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState([])
  const [loading, setLoading] = useState(true)
  const [texto, setTexto] = useState('')
  const [somAtivo, setSomAtivo] = useState(() => {
    try {
      return localStorage.getItem('locaus:som-chat') !== '0'
    } catch {
      return true
    }
  })
  const [aEnviar, setAEnviar] = useState(false)
  const [aSubir, setASubir] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [pendingMedia, setPendingMedia] = useState(null)
  const [pendingClip, setPendingClip] = useState(null)
  const [stickersAberto, setStickersAberto] = useState(false)
  const [stickerPaginas, setStickerPaginas] = useState([])
  const [stickerPagina, setStickerPagina] = useState(0)
  const [stickerQuery, setStickerQuery] = useState('meme tiktok')
  const [stickersLoading, setStickersLoading] = useState(false)
  const [stickersErro, setStickersErro] = useState('')
  const stickers = stickerPaginas[stickerPagina]?.itens || []
  const [clipsAberto, setClipsAberto] = useState(false)
  const [clips, setClips] = useState([])
  const [clipsLoading, setClipsLoading] = useState(false)
  const [clipAberto, setClipAberto] = useState(null)

  const abrirClipNoFeed = (clip) => {
    if (clip && clip.id) navigate(`/clips?clip=${clip.id}`)
  }
  const [hasMore, setHasMore] = useState(false)
  const [novasMensagens, setNovasMensagens] = useState(false)
  const [erro, setErro] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [todosMembros, setTodosMembros] = useState([])
  const [onlineAberto, setOnlineAberto] = useState(false)
  const [tema, setTema] = useState(TEMA_PADRAO)
  const [temaAberto, setTemaAberto] = useState(false)
  const [resposta, setResposta] = useState(null)
  const [reactAberto, setReactAberto] = useState(null)
  const [pinned, setPinned] = useState(null)
  const t = TEMAS[tema] || TEMAS[TEMA_PADRAO]

  const listaRef = useRef(null)
  const fimRef = useRef(null)
  const lastIdRef = useRef(0)
  const typingRef = useRef(0)
  const pertoDoFundoRef = useRef(true)
  const inputFileRef = useRef(null)
  const textareaRef = useRef(null)
  const aPollarRef = useRef(false)
  const marcarLidoRef = useRef(() => {})
  const ultimoLidoRef = useRef(0)

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
        setPinned(d.pinned || null)
        lastIdRef.current = Number(d.last_id) || 0
        setLoading(false)
        setTimeout(() => scrollFundo(false), 30)
        // segundo acerto (depois de as imagens/média carregarem e mudarem a altura)
        setTimeout(() => scrollFundo(false), 400)
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
    const tick = async () => {
      if (document.hidden || aPollarRef.current) return
      aPollarRef.current = true
      try {
        const depois = lastIdRef.current
        const r = await fetch(`/api/chat${depois ? `?after=${depois}` : '?limit=80'}`, {
          headers: authHeaders(),
        })
        if (r.ok) {
          const d = await r.json()
          if (d.typing) {
            setTyping(d.typing)
            // se alguém começou a escrever, desce ao fim para ver a bolha
            if (pertoDoFundoRef.current && d.typing.length) {
              setTimeout(() => scrollFundo(true), 50)
            }
          }
          if (d.messages && d.messages.length) {
            const recebidas = d.messages.filter(
              (m) => Number(m.user.id) !== Number(user && user.id),
            )
            if (recebidas.length && depois) tocarSom('recebido')
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
    return () => clearInterval(t)
  }, [])

  // Marca as mensagens como vistas (contador do menu lateral)
  const ultimaMsgId = messages.length ? messages[messages.length - 1].id : 0
  useEffect(() => {
    if (!ultimaMsgId) return undefined
    const marcar = () => {
      if (document.hidden || !pertoDoFundoRef.current) return
      if (ultimoLidoRef.current === ultimaMsgId) return
      fetch('/api/chat/lido', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_id: ultimaMsgId }),
      })
        .then(() => {
          ultimoLidoRef.current = ultimaMsgId
          window.dispatchEvent(new Event('locaus:chat-lido'))
        })
        .catch(() => {})
    }
    marcarLidoRef.current = marcar
    marcar()
    document.addEventListener('visibilitychange', marcar)
    return () => {
      marcarLidoRef.current = () => {}
      document.removeEventListener('visibilitychange', marcar)
    }
  }, [ultimaMsgId])

  // Avisa o servidor enquanto estou a ver o chat (para não receber push do chat)
  useEffect(() => {
    const enviar = (ativo) =>
      fetch('/api/chat/ativo', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo }),
        keepalive: true,
      }).catch(() => {})
    const marcar = () => enviar(!document.hidden)
    marcar()
    const iv = setInterval(marcar, 10000)
    const vis = () => enviar(!document.hidden)
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', vis)
      enviar(false)
    }
  }, [])

  // Atualiza o número de membros online a cada 30s
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const r = await fetch('/api/users/list', { headers: authHeaders() })
        if (!r.ok) return
        const d = await r.json()
        const todos = d.users || []
        const lista = todos.filter((u) => u.online)
        setTodosMembros(todos)
        setOnlineUsers(lista)
        setOnlineCount(lista.length)
      } catch {}
    }
    fetchOnline()
    const t = setInterval(fetchOnline, 30000)
    return () => clearInterval(t)
  }, [])

  // Tema do chat (global; o admin muda, aplica a todos)
  useEffect(() => {
    let vivo = true
    const carregar = async () => {
      try {
        const r = await fetch('/api/chat/tema', { headers: authHeaders() })
        if (r.ok) {
          const d = await r.json()
          if (vivo && d.tema && TEMAS[d.tema]) setTema(d.tema)
        }
      } catch {}
    }
    carregar()
    const t = setInterval(carregar, 15000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  const mudarTema = async (nome) => {
    setTemaAberto(false)
    try {
      const r = await fetch('/api/chat/tema', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema: nome }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para mudar o tema.')
      setTema(nome)
      toast.ok(`Tema "${TEMAS[nome].nome}" aplicado a todos.`)
    } catch (e) {
      toast.erro(e.message)
    }
  }

  const reagir = async (m, emoji) => {
    setReactAberto(null)
    try {
      const r = await fetch(`/api/chat/${m.id}/react`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para reagir.')
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: d.reactions } : x)))
    } catch (e) {
      toast.erro(e.message)
    }
  }

  const fixar = async (m) => {
    try {
      const r = await fetch(`/api/chat/${m.id}/pin`, { method: 'POST', headers: authHeaders() })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para fixar.')
      setPinned(m)
      toast.ok('Mensagem fixada para todos.')
    } catch (e) {
      toast.erro(e.message)
    }
  }

  const desfixar = async (id) => {
    try {
      const r = await fetch(`/api/chat/${id}/pin`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error('Não deu para desfixar.')
      setPinned(null)
      toast.ok('Mensagem desfixada.')
    } catch (e) {
      toast.erro(e.message)
    }
  }

  const iniciarResposta = (m) => {
    setResposta(m)
    setTimeout(() => textareaRef.current && textareaRef.current.focus(), 20)
  }

  const onScroll = () => {
    const el = listaRef.current
    if (!el) return
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 140
    pertoDoFundoRef.current = perto
    if (perto) {
      setNovasMensagens(false)
      marcarLidoRef.current()
    }
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

  const enviarSticker = async (src) => {
    if (aEnviar) return
    setAEnviar(true)
    setErro('')
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sticker: src }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para enviar o sticker.')
      juntar([d])
      tocarSom('enviado')
      setStickersAberto(false)
      setTimeout(() => scrollFundo(true), 40)
    } catch (e) {
      setErro(e.message || 'Não deu para enviar o sticker.')
    } finally {
      setAEnviar(false)
    }
  }

  const carregarStickers = async (q = '', pagina = 0, forcar = false) => {
    if (!forcar && pagina < stickerPaginas.length) {
      setStickerPagina(pagina)
      return
    }
    const pos = pagina > 0 ? stickerPaginas[pagina - 1]?.next : ''
    if (pagina > 0 && !pos) return
    setStickersLoading(true)
    setStickersErro('')
    try {
      const params = new URLSearchParams({ q, pos: pos || '' })
      const r = await fetch(`/api/chat/stickers?${params.toString()}`, {
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || d.ok === false) {
        throw new Error((d && d.error) || 'Não deu para carregar os stickers.')
      }
      const itens = Array.isArray(d.stickers) ? d.stickers : []
      setStickerPaginas((prev) => {
        const next = prev.slice(0, pagina)
        next[pagina] = { itens, next: d.next || null }
        return next
      })
      setStickerPagina(pagina)
    } catch (e) {
      setStickersErro(e.message || 'Não deu para carregar os stickers.')
    } finally {
      setStickersLoading(false)
    }
  }

  useEffect(() => {
    if (stickersAberto) {
      setStickerPaginas([])
      setStickerPagina(0)
      setStickerQuery('meme tiktok')
      carregarStickers('meme tiktok', 0, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickersAberto])

  const enviar = async () => {
    const body = texto.trim()
    if (!body && !pendingMedia && !pendingClip) return
    if (aEnviar) return
    setAEnviar(true)
    setErro('')
    try {
      const payload = { body }
      if (resposta) payload.reply_to = resposta.id
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
      tocarSom('enviado')
      setTexto('')
      setResposta(null)
      setPendingMedia(null)
      setPendingClip(null)
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

  let diaAnterior = ''

  return (
    <PageShell className="chat-fixo lg:!pb-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-x-hidden">
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40 lg:h-[min(78dvh,860px)] lg:min-h-[460px]" style={{ backgroundColor: t.bg + 'f2' }}>
        {/* cabeçalho */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-white/[0.07] to-transparent px-4 py-4 sm:px-5">
          <span className={`hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${t.grad} text-white shadow-lg sm:flex`}>
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-white">Chat geral</h1>
            <p className="truncate text-[11px] font-semibold text-gray-400">
              {typing.length
                ? `${typing.map((t) => t.username).slice(0, 2).join(', ')}${typing.length > 2 ? ' e mais' : ''} a escrever…`
                : 'Toda a comunidade, em tempo real'}
            </p>
          </div>
          {/* som das mensagens */}
          <button
            type="button"
            onClick={() => {
              const v = !somAtivo
              setSomAtivo(v)
              try {
                localStorage.setItem('locaus:som-chat', v ? '1' : '0')
              } catch {}
              if (v) tocarSom('recebido')
            }}
            title={somAtivo ? 'Desligar som das mensagens' : 'Ligar som das mensagens'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            {somAtivo ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* tema — só o admin muda */}
          {user && user.is_admin && (
            <div className="relative">
              <button
                onClick={() => setTemaAberto((v) => !v)}
                title="Mudar tema (admin)"
                className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10 ${t.cor}`}
              >
                <Palette className="h-4 w-4" />
              </button>
              {temaAberto && (
                <div className="absolute right-0 top-full z-30 mt-1 grid grid-cols-1 gap-1 rounded-xl border border-white/10 bg-[#171122] p-2 shadow-2xl">
                  <p className="px-1 pb-1 text-[9px] font-black uppercase tracking-wider text-gray-500">Tema do chat (todos)</p>
                  {Object.entries(TEMAS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => mudarTema(k)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                        tema === k ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className={`h-4 w-4 rounded-full bg-gradient-to-br ${v.grad}`} />
                      {v.nome}
                      {tema === k && <Check className="ml-auto h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOnlineAberto(true)}
            title="Ver quem está online"
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20 transition-colors hover:bg-emerald-500/20"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">{onlineCount > 0 ? `${onlineCount} online` : 'Online'}</span>
            <span className="sm:hidden">{onlineCount > 0 ? onlineCount : ''}</span>
          </button>
        </div>

        {/* mensagem fixada (admin) — banner no topo */}
        {pinned && (
          <div className={`flex items-center gap-2 border-b px-4 py-2 ${t.borda} bg-white/[0.04]`}>
            <Pin className={`h-3.5 w-3.5 shrink-0 ${t.cor}`} />
            <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider ${t.cor}`}>Fixada</span>
            <span className="shrink-0 text-[11px] font-bold text-gray-300">{pinned.user.username}</span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-gray-400">{pinned.body || (pinned.media_url ? 'Imagem' : '')}</span>
            {user && user.is_admin && (
              <button onClick={() => desfixar(pinned.id)} title="Desfixar" className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* mensagens */}
        <div
          ref={listaRef}
          onScroll={onScroll}
          className="chat-scroll flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5"
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
                  <div className={`group relative flex items-end gap-2 ${minha ? 'flex-row-reverse' : ''} ${seguida ? 'mt-0.5' : 'mt-3'}`}>
                    <span className="w-9 shrink-0">
                      {!seguida && (
                        <AvatarImg src={m.user.avatar_url} name={m.user.username} className="h-9 w-9" />
                      )}
                    </span>
                    <div className={`relative min-w-0 max-w-[84%] sm:max-w-[70%] ${minha ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!seguida && (
                        <span className={`mb-1 px-1 text-[11px] font-bold ${minha ? t.cor : 'text-gray-400'}`}>
                          {minha ? 'Tu' : m.user.username} · {hora(m.created_at)}
                        </span>
                      )}
                      {m.reply && (
                        <div className={`mb-1 flex items-center gap-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px] ${t.borda} bg-white/[0.04]`}>
                          <CornerUpLeft className="h-3 w-3 shrink-0 text-gray-500" />
                          <span className="font-bold text-gray-300">{m.reply.username}</span>
                          <span className="truncate text-gray-500">{m.reply.body}</span>
                        </div>
                      )}
                      <div
                        className={`relative text-[13.5px] leading-relaxed ${
                          m.kind === 'sticker'
                            ? 'p-0'
                            : `rounded-2xl px-4 py-2.5 shadow-sm ${
                                minha
                                  ? `rounded-br-md bg-gradient-to-br ${t.grad} text-white shadow-lg`
                                  : 'rounded-bl-md border border-white/10 bg-white/[0.08] text-gray-100 shadow-lg'
                              } ${m.pinned ? 'ring-2 ' + t.borda : ''}`
                        }`}
                      >
                        {m.pinned && (
                          <span className={`mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${minha ? 'text-white/80' : t.cor}`}>
                            <Pin className="h-3 w-3" /> Fixada
                          </span>
                        )}
                        {m.kind === 'sticker' ? (
                          <img
                            src={m.media_url}
                            alt="Sticker"
                            loading="lazy"
                            className="h-28 w-28 object-contain drop-shadow-2xl sm:h-32 sm:w-32"
                          />
                        ) : (
                          <>
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
                            <ClipPreview clip={m.clip} onOpen={abrirClipNoFeed} />
                          </>
                        )}
                        {minha && (
                          <span className="mt-1 flex items-center justify-end gap-1 text-right text-[9px] font-semibold text-white/60">
                            {hora(m.created_at)}
                            {m.read_by && m.read_by.length > 0 && (
                              <span
                                className="ml-1 inline-flex items-center gap-0.5 text-emerald-200/90"
                                title={`Lido por ${m.read_by.map((r) => r.username).join(', ')}${
                                  m.read_count > m.read_by.length
                                    ? ` e mais ${m.read_count - m.read_by.length}`
                                    : ''
                                }`}
                              >
                                <CheckCheck className="h-3 w-3" />
                                {m.read_by.length <= 2
                                  ? m.read_by.map((r) => r.username).join(', ')
                                  : `${m.read_by.slice(0, 2).map((r) => r.username).join(', ')} +${m.read_count - 2}`}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {/* reações */}
                      {(m.reactions && m.reactions.length) || reactAberto === m.id ? (
                        <div className={`mt-1 flex flex-wrap gap-1 ${minha ? 'justify-end' : ''}`}>
                          {(m.reactions || []).map((g) => (
                            <button
                              key={g.emoji}
                              onClick={() => reagir(m, g.emoji)}
                              title={g.users.map((u) => u.username).join(', ')}
                              className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition ${
                                g.mine ? t.borda + ' ' + t.chip : 'border-white/10 bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              <span>{g.emoji}</span>
                              <span className="font-bold">{g.count}</span>
                            </button>
                          ))}
                          <button
                            onClick={() => setReactAberto(reactAberto === m.id ? null : m.id)}
                            title="Reagir"
                            className={`flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white ${
                              reactAberto === m.id ? t.borda : ''
                            }`}
                          >
                            <Smile className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null}
                      {/* ações (no telemóvel ficam por baixo; no PC ao passar o rato) */}
                      <div
                        className={`mt-1 flex items-center gap-0.5 opacity-100 transition-opacity sm:absolute sm:bottom-2 sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 ${
                          minha ? 'sm:-left-11' : 'sm:-right-11'
                        }`}
                      >
                        <button
                          onClick={() => iniciarResposta(m)}
                          title="Responder"
                          className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setReactAberto(reactAberto === m.id ? null : m.id)}
                          title="Reagir"
                          className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                        {user && user.is_admin && (
                          <button
                            onClick={() => (m.pinned ? desfixar(m.id) : fixar(m))}
                            title={m.pinned ? 'Desfixar' : 'Fixar para todos (admin)'}
                            className={`rounded-lg p-1 ${m.pinned ? t.cor : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {minha && (
                          <button
                            onClick={() => apagar(m)}
                            title="Apagar mensagem"
                            className="rounded-lg p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* picker de reações */}
                    {reactAberto === m.id && (
                      <div className={`absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full border border-white/10 bg-[#171122] p-1 shadow-xl ${minha ? 'right-0' : 'left-10'}`}>
                        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((e) => (
                          <button
                            key={e}
                            onClick={() => reagir(m, e)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-white/10"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          <div ref={fimRef} />

          {/* "a escrever" — dentro da conversa, com animação */}
          {typing.length > 0 && (
            <div className="flex items-end gap-2 pt-2">
              <span className="w-8 shrink-0">
                <AvatarImg
                  src={typing[0].avatar_url}
                  name={typing[0].username}
                  className="h-8 w-8"
                />
              </span>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2.5">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.36s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.24s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.12s]" />
                </span>
                <span className="text-[11px] font-semibold text-gray-400">
                  {typing
                    .map((t) => t.username)
                    .slice(0, 2)
                    .join(', ')}
                  {typing.length > 2 ? ' e mais' : ''} a escrever…
                </span>
              </div>
            </div>
          )}
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
          {resposta && (
            <div className={`mb-2 flex items-center gap-2 rounded-xl border-l-2 px-3 py-2 ${t.borda} bg-white/[0.04]`}>
              <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              <span className="shrink-0 text-[11px] font-bold text-gray-300">Responder a {resposta.user.username}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-gray-500">{resposta.body}</span>
              <button onClick={() => setResposta(null)} className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {stickersAberto && (
            <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-2xl border border-violet-400/20 bg-[#171122] shadow-2xl sm:left-3 sm:right-auto sm:w-96">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                  Stickers · Powered by Tenor
                </span>
                <button
                  type="button"
                  onClick={() => setStickersAberto(false)}
                  className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setStickerPaginas([])
                  setStickerPagina(0)
                  carregarStickers(stickerQuery, 0, true)
                }}
                className="flex gap-1.5 border-b border-white/10 p-2"
              >
                <input
                  value={stickerQuery}
                  onChange={(e) => setStickerQuery(e.target.value)}
                  placeholder="Pesquisar stickers (ex.: gato, meme, tiktok)"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-white placeholder:text-gray-600 focus:border-violet-400/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={stickersLoading}
                  className="rounded-lg bg-violet-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-violet-400 disabled:opacity-50"
                >
                  {stickersLoading ? '…' : 'Procurar'}
                </button>
              </form>
              {stickersErro ? (
                <p className="px-3 py-4 text-center text-[11px] text-amber-300">{stickersErro}</p>
              ) : stickersLoading ? (
                <p className="flex items-center justify-center gap-2 py-6 text-[11px] text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar stickers…
                </p>
              ) : (
                <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto p-2">
                  {stickers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => enviarSticker(s.url)}
                      title={s.titulo}
                      className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-1 transition hover:border-violet-400/30 hover:bg-violet-500/10"
                    >
                      <img src={s.preview} alt={s.titulo} className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              {!stickersErro && !stickersLoading && stickerPaginas.length > 0 && (
                <div className="flex items-center justify-between gap-1 border-t border-white/10 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => carregarStickers(stickerQuery, stickerPagina - 1)}
                    disabled={stickerPagina === 0}
                    className="rounded-md px-2 py-1 text-xs font-black text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    aria-label="Página anterior"
                  >
                    ‹
                  </button>
                  <div className="flex min-w-0 gap-1 overflow-x-auto">
                    {Array.from({ length: stickerPaginas.length }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => carregarStickers(stickerQuery, i)}
                        className={`min-w-6 rounded-md px-1.5 py-1 text-[10px] font-black ${
                          stickerPagina === i
                            ? 'bg-violet-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {stickerPaginas[stickerPaginas.length - 1]?.next && (
                      <button
                        type="button"
                        onClick={() => carregarStickers(stickerQuery, stickerPaginas.length)}
                        disabled={stickersLoading}
                        className="min-w-6 rounded-md bg-white/5 px-1.5 py-1 text-[10px] font-black text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      >
                        {stickerPaginas.length + 1}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => carregarStickers(stickerQuery, stickerPagina + 1)}
                    disabled={!stickerPaginas[stickerPagina]?.next || stickersLoading}
                    className="rounded-md px-2 py-1 text-xs font-black text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    aria-label="Página seguinte"
                  >
                    ›
                  </button>
                </div>
              )}
              <p className="px-3 pb-2 text-[9px] text-gray-500">
                {stickerQuery.trim() ? 'Resultados da pesquisa' : 'Tendências'} · stickers animados
                do Tenor.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-1.5">
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
              className="order-1 min-h-[54px] w-full min-w-0 max-h-32 resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-violet-400/40 focus:bg-white/[0.07] sm:order-2 sm:w-auto sm:flex-1"
            />
            <div className="order-2 flex w-full items-center gap-1 sm:order-1 sm:w-auto">
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/10 hover:text-violet-300 disabled:opacity-40 sm:h-11 sm:w-11"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <button
                onClick={abrirClips}
                title="Enviar um clip"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/10 hover:text-violet-300 sm:h-11 sm:w-11"
              >
                <Clapperboard className="h-5 w-5" />
              </button>
              <button
                onClick={() => setStickersAberto((v) => !v)}
                title="Stickers animados"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10 sm:h-11 sm:w-11 ${
                  stickersAberto
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'text-gray-400 hover:text-violet-300'
                }`}
              >
                <Sticker className="h-5 w-5" />
              </button>
              <span className="flex-1 sm:hidden" />
              <button
                onClick={enviar}
                disabled={aEnviar || aSubir || (!texto.trim() && !pendingMedia && !pendingClip)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-40 sm:hidden"
                title="Enviar"
              >
                {aEnviar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={enviar}
              disabled={aEnviar || aSubir || (!texto.trim() && !pendingMedia && !pendingClip)}
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-40 sm:order-3 sm:flex"
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
                <video
                  src={clipAberto.url}
                  controls
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => {
                    e.currentTarget.volume = 0.25
                  }}
                  className="max-h-[75dvh] w-full"
                />
              ) : (
                <p className="p-8 text-center text-sm text-gray-400">Este clip não está disponível.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {onlineAberto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
          onClick={() => setOnlineAberto(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0d0a16] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-white">
                <Users className="h-4 w-4 text-emerald-300" /> Quem está online
              </h3>
              <button
                onClick={() => setOnlineAberto(false)}
                className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {onlineUsers.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-500">Ninguém online agora.</p>
              ) : (
                <ul className="space-y-1">
                  {onlineUsers.map((u) => (
                    <li key={u.id || u.username}>
                      <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5">
                        <span className="relative shrink-0">
                          <AvatarImg src={u.avatar_url} name={u.username} className="h-9 w-9" />
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d0a16] bg-emerald-400" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                          {u.username}
                        </span>
                        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
                          {u.plataforma === 'mobile' ? 'Telemóvel' : u.plataforma === 'pc' ? 'PC' : 'Online'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* quem esteve por último — mesmo estando offline */}
              {todosMembros.filter((u) => !u.online).length > 0 && (
                <>
                  <p className="mt-3 px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Visto por último
                  </p>
                  <ul className="space-y-1">
                    {todosMembros
                      .filter((u) => !u.online)
                      .sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))
                      .map((u) => (
                        <li key={u.id || u.username}>
                          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 opacity-75 hover:bg-white/5 hover:opacity-100">
                            <span className="relative shrink-0">
                              <AvatarImg
                                src={u.avatar_url}
                                name={u.username}
                                className="h-9 w-9 grayscale"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d0a16] bg-gray-600" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-300">
                              {u.username}
                            </span>
                            <span
                              className="shrink-0 text-[10px] font-semibold text-gray-500"
                              title={u.last_seen ? new Date(u.last_seen).toLocaleString('pt-PT') : ''}
                            >
                              {vistoPorUltimo(u.last_seen)}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </PageShell>
  )
}
