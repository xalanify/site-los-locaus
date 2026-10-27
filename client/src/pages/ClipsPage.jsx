import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Plus,
  X,
  Film,
  Globe,
  Lock,
  Loader2,
  Upload,
  Gamepad2,
  Calendar,
  Award,
  Scissors,
  AlertTriangle,
  Check,
  Zap,
  MessageSquare,
  Image as ImageIcon,
} from 'lucide-react'
import ClipCard from '../components/ClipCard'
import AvatarImg from '../components/AvatarImg'
import TabBar from '../components/TabBar'
import Estado from '../components/Estado'
import { badgesDe, BadgeGem } from '../components/BadgeGem'
import { CLIP_GAMES, gameLabel } from '../data/clipGames'
import { authHeaders, mmss, parseTime } from '../lib/auth'
import PageShell from '../components/PageShell'
import { toast } from '../components/Feedback'

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'publicos', label: 'Públicos' },
  { id: 'meus', label: 'Meus' },
  { id: 'guardados', label: 'Guardados' },
]

/* Clips por página no feed (o resto vem com "carregar mais") */
const PAGE_CLIPS = 12

/* Tamanho máximo de um clip (o servidor manda o valor certo em
   /api/clips/limits — o Supabase Storage também tem um limite próprio). */
const DEFAULT_MAX_MB = 50

/* codecs possíveis para gravar o corte (o melhor primeiro).
   webm/opus primeiro: é o caminho que o MediaRecorder grava com
   ÁUDIO fiável no Chrome. O MP4 do MediaRecorder costuma gravar sem
   áudio (mux quebrado) — por isso o mp4 fica só como último recurso.
   O servidor converte depois webm -> mp4 com ffmpeg, com som. */
const MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
]

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null
  return MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || null
}

/* ============================================================
   Perfil público de um membro — contas de jogo, distinções
   e clips (aberto ao clicar na lista lateral ou num autor).
   ============================================================ */
function MemberModal({ name, onClose, user, onRequestAuth, onProfile }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let alive = true
    setState({ loading: true, data: null, error: '' })
    fetch(`/api/users/${encodeURIComponent(name)}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setState({ loading: false, data: d, error: '' }))
      .catch(() => alive && setState({ loading: false, data: null, error: 'Perfil não encontrado.' }))
    return () => {
      alive = false
    }
  }, [name])

  const d = state.data
  const badges = badgesDe(d?.profile?.badges)
  const accounts = d?.profile?.game_accounts || []

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#0a0813]/88 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass my-8 w-full max-w-2xl rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
            Perfil de {name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : !d || !d.found ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-400">
            {state.error || 'Perfil não encontrado.'}
          </p>
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <AvatarImg
                name={d.profile.username}
                src={d.profile.avatar_url}
                className="h-14 w-14"
              />
              <div className="min-w-0">
                <div className="truncate font-display text-xl font-black uppercase text-white">
                  {d.profile.username}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="h-3.5 w-3.5 text-violet-400" />
                  Membro desde{' '}
                  {new Date(d.profile.created_at).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Números */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <div className="text-lg font-black text-white">{d.stats?.clips ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Clips
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <div className="text-lg font-black text-violet-400">{d.stats?.likes ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Gostos
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <div className="text-lg font-black text-yellow-400">{d.stats?.downloads ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Transferências
                </div>
              </div>
            </div>

            {/* Contas de jogo ligadas pelo admin */}
            <div className="rounded-2xl bg-white/5 p-4">
              <h3 className="mb-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                <Gamepad2 className="h-4 w-4 text-violet-400" /> Contas de jogo
              </h3>
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-400">Ainda sem contas de jogo associadas.</p>
              ) : (
                <ul className="space-y-1.5">
                  {accounts.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-gray-300">
                        {gameLabel(a.game)}
                      </span>
                      <span className="font-semibold text-white">{a.nick}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Distinções */}
            <div className="rounded-2xl bg-white/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                <Award className="h-4 w-4 text-violet-400" /> Distinções
              </h3>
              {badges.length === 0 ? (
                <p className="text-sm text-gray-400">Ainda sem distinções.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span
                      key={b.id}
                      className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ring-1"
                      style={{
                        background: `${b.color}18`,
                        boxShadow: `0 0 14px ${b.color}40`,
                        ringColor: `${b.color}66`,
                      }}
                      title={b.desc}
                    >
                      <BadgeGem badge={b} size={18} />
                      <span
                        className="font-display text-[10px] font-black uppercase tracking-wider"
                        style={{ color: b.color }}
                      >
                        {b.label}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Clips */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                <Film className="h-4 w-4 text-violet-400" /> Clips
              </h3>
              {d.clips.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-400">
                  Ainda não há clips para ver.
                </p>
              ) : (
                <div className="space-y-5">
                  {d.clips.map((c) => (
                    <ClipCard
                      key={c.id}
                      clip={c}
                      user={user}
                      transparent
                      onRequestAuth={onRequestAuth}
                      onProfile={onProfile}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClipsPage({ user, onRequestAuth, onProfile }) {
  const location = useLocation()
  const [clips, setClips] = useState([])
  const [destaque, setDestaque] = useState(null)
  // paginação do feed — o servidor devolve uma página de cada vez
  const [maisClips, setMaisClips] = useState(false)
  const [aCarregarMaisClips, setACarregarMaisClips] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [jogo, setJogo] = useState('') // filtro por jogo ('' = todos)
  const [showForm, setShowForm] = useState(false)
  const [escolhaPublicar, setEscolhaPublicar] = useState(false)
  const [showMensagem, setShowMensagem] = useState(false)
  const [msgTexto, setMsgTexto] = useState('')
  const [msgImagem, setMsgImagem] = useState(null)
  const [msgPreview, setMsgPreview] = useState('')
  const [msgEnviando, setMsgEnviando] = useState(false)
  const [msgErro, setMsgErro] = useState('')
  const msgFileRef = useRef(null)

  // perfil público aberto (clique no autor de um clip)
  const [member, setMember] = useState(null)

  // formulário
  const [title, setTitle] = useState('')
  const [game, setGame] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [duration, setDuration] = useState(null)
  const [startStr, setStartStr] = useState('0:00')
  const [endStr, setEndStr] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [progress, setProgress] = useState(-1)
  // detalhes do envio para a barra: bytes, início e fase
  const [envio, setEnvio] = useState({ total: 0, enviado: 0, inicio: 0, fase: '' })
  const xhrRef = useRef(null)
  const canceladoRef = useRef(false)
  const [error, setError] = useState('')
  const [maxMB, setMaxMB] = useState(DEFAULT_MAX_MB)
  /* Publicação automática no YouTube (estado vem do servidor:
     configurado? ainda há quota hoje? aviso quando esgota). */
  const [ytEstado, setYtEstado] = useState(null)
  const [trimming, setTrimming] = useState(null) // { done, total } enquanto corta
  const [nota, setNota] = useState('') // aviso depois de cortar
  const [thumb, setThumb] = useState('') // capa nossa (frame do vídeo)
  const previewRef = useRef(null)
  const fileRef = useRef(null)
  const audioRef = useRef(null) // grafo de áudio usado no corte
  const previewingRef = useRef(false) // "ver só o trecho" em curso

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clips?limit=${PAGE_CLIPS}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setClips(data)
        setMaisClips(data.length === PAGE_CLIPS)
      }
    } catch {
      /* sem rede */
    } finally {
      setLoading(false)
    }
  }

  // página seguinte do feed (junta ao fim da lista)
  const carregarMaisClips = async () => {
    if (aCarregarMaisClips) return
    setACarregarMaisClips(true)
    try {
      const res = await fetch(`/api/clips?limit=${PAGE_CLIPS}&offset=${clips.length}`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setClips((prev) => [...prev, ...data])
        setMaisClips(data.length === PAGE_CLIPS)
      }
    } catch {
      /* sem rede */
    } finally {
      setACarregarMaisClips(false)
    }
  }

  useEffect(() => {
    load()
    // limite real de tamanho (o servidor decide)
    fetch('/api/clips/limits')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.maxMB) setMaxMB(Number(d.maxMB))
      })
      .catch(() => {})
    // publicação automática (só para quem pode publicar)
    if (user) {
      fetch('/api/clips/pub/estado', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setYtEstado(d))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Chegada com um membro escolhido (ex.: clique no autor de um clip)
  useEffect(() => {
    const m = location.state && location.state.member
    if (m) setMember(m)
  }, [location.state])

  /* Chegou do chat com ?clip=ID -> mostra esse clip no topo e vai até ele */
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('clip'))
    if (!Number.isInteger(id) || id <= 0) {
      setDestaque(null)
      return
    }
    let vivo = true
    setTab('todos')
    setJogo('')
    fetch(`/api/clips/${id}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!vivo || !c || !c.id) return
        setDestaque(c)
        setTimeout(() => {
          const el = document.getElementById(`clip-${c.id}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 450)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [location.search])

  useEffect(() => {
    if (location.state && location.state.novo) {
      if (user) setShowForm(true)
      else onRequestAuth && onRequestAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const openForm = () => {
    if (!user) return onRequestAuth && onRequestAuth()
    setShowForm(true)
    setError('')
    // estado fresco da publicação automática (pode ter esgotado entretanto)
    fetch('/api/clips/pub/estado', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setYtEstado(d))
      .catch(() => {})
  }

  /* Botão único "Publicar" -> escolhe Vídeo ou Mensagem */
  const abrirPublicar = () => {
    if (!user) return onRequestAuth && onRequestAuth()
    setShowForm(false)
    setShowMensagem(false)
    setEscolhaPublicar(true)
    setError('')
    setMsgErro('')
  }

  const fecharMensagem = () => {
    if (msgPreview) URL.revokeObjectURL(msgPreview)
    setShowMensagem(false)
    setMsgTexto('')
    setMsgImagem(null)
    setMsgPreview('')
    setMsgErro('')
  }

  const escolherImagemMensagem = (f) => {
    setMsgErro('')
    if (!f) return
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
      setMsgErro('Formato não suportado — usa JPG, PNG, WebP ou GIF.')
      return
    }
    if (f.size > 4 * 1024 * 1024) {
      setMsgErro('A imagem é demasiado grande (máx. 4 MB).')
      return
    }
    if (msgPreview) URL.revokeObjectURL(msgPreview)
    setMsgImagem(f)
    setMsgPreview(URL.createObjectURL(f))
    if (msgFileRef.current) msgFileRef.current.value = ''
  }

  const publicarMensagem = async (e) => {
    e?.preventDefault()
    if (msgEnviando) return
    if (!msgTexto.trim() && !msgImagem) {
      setMsgErro('Escreve uma mensagem ou escolhe uma imagem.')
      return
    }
    setMsgEnviando(true)
    setMsgErro('')
    try {
      let imageUrl = ''
      if (msgImagem) {
        const token =
          localStorage.getItem('userToken') || localStorage.getItem('adminToken') || ''
        const up = await fetch('/api/posts/image', {
          method: 'POST',
          headers: {
            'Content-Type': msgImagem.type || 'image/jpeg',
            Authorization: `Bearer ${token}`,
          },
          body: msgImagem,
        })
        const ud = await up.json().catch(() => ({}))
        if (!up.ok) throw new Error(ud.error || 'Não deu para enviar a imagem.')
        imageUrl = ud.url || ''
      }
      const r = await fetch('/api/posts', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msgTexto.trim(), image_url: imageUrl }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Não deu para publicar a mensagem.')
      toast.ok('Mensagem publicada no teu perfil.')
      fecharMensagem()
    } catch (err) {
      setMsgErro(err.message || 'Não deu para publicar a mensagem.')
    } finally {
      setMsgEnviando(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setGame('')
    setFile(null)
    setPreview('')
    setDuration(null)
    setStartStr('0:00')
    setEndStr('')
    setVisibility('public')
    setProgress(-1)
    setError('')
    setTrimming(null)
    setNota('')
    setThumb('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const onPick = (f) => {
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    previewingRef.current = false
    setFile(f)
    setDuration(null)
    setStartStr('0:00')
    setEndStr('')
    setNota('')
    setThumb('')
    setPreview(URL.createObjectURL(f))
    // capa nossa: um frame qualquer do próprio vídeo (em paralelo)
    gerarCapa(f)
  }

  /* ---------------------------------------------------------------
     Capa do clip: tiramos UM FRAME do vídeo no próprio browser
     (posição aleatória) e mandamos-guardamos no site. É isto que
     aparece no cartão — nunca a capa da plataforma.
     --------------------------------------------------------------- */
  const gerarCapa = (f) => {
    try {
      const url = URL.createObjectURL(f)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.muted = true
      v.playsInline = true
      v.src = url
      let feito = false
      const limpar = () => {
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* nada */
        }
        v.removeAttribute('src')
        v.load()
      }
      const apanhar = () => {
        if (feito) return
        feito = true
        try {
          const larg = Math.min(960, v.videoWidth || 960)
          const alt = Math.max(1, Math.round((larg * (v.videoHeight || 540)) / (v.videoWidth || 960)))
          const cv = document.createElement('canvas')
          cv.width = larg
          cv.height = alt
          const ctx = cv.getContext('2d')
          ctx.drawImage(v, 0, 0, larg, alt)
          const data = cv.toDataURL('image/jpeg', 0.78)
          if (data && data.length < 900 * 1024) setThumb(data)
        } catch {
          /* sem canvas — fica sem capa nossa */
        }
        limpar()
      }
      v.addEventListener('loadedmetadata', () => {
        const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1
        // posição aleatória (entre 10% e 80% do vídeo)
        try {
          v.currentTime = d * (0.1 + Math.random() * 0.7)
        } catch {
          apanhar()
        }
      })
      v.addEventListener('seeked', apanhar, { once: true })
      v.addEventListener('loadeddata', () => setTimeout(apanhar, 400), { once: true })
      v.addEventListener('error', () => {
        feito = true
        limpar()
      })
      // rede lenta: não fica preso à espera
      setTimeout(() => {
        if (!feito) apanhar()
      }, 6000)
    } catch {
      /* sem suporte — segue sem capa */
    }
  }

  const onPreviewMeta = () => {
    const v = previewRef.current
    if (!v) return
    const aplicar = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setDuration(v.duration)
        setEndStr(mmss(v.duration))
      }
    }
    if (Number.isFinite(v.duration) && v.duration > 0) return aplicar()
    // WebM gravado no browser vem sem duração no cabeçalho —
    // obrigamos o browser a calculá-la (truque do seek gigante)
    const onDur = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        v.removeEventListener('durationchange', onDur)
        try {
          v.currentTime = 0
        } catch {
          /* nada */
        }
        aplicar()
      }
    }
    v.addEventListener('durationchange', onDur)
    try {
      v.currentTime = 1e101
    } catch {
      /* nada */
    }
    setTimeout(onDur, 4000)
  }

  const submit = async () => {
    setError('')
    const trimmed = title.trim()
    if (!trimmed) return setError('Dá um título ao clip.')
    if (!game) return setError('Escolhe o jogo do clip.')
    if (!file) return setError('Escolhe um vídeo.')
    // Com o YouTube configurado não há limite de MB (o Google aceita
    // até 256 GB) — o aviso de tamanho só serve para o Supabase.
    const vaiParaYT = !!(ytEstado && ytEstado.configurado && ytEstado.disponivel)
    if (file.size > maxMB * 1048576 && !vaiParaYT) {
      const agora = Math.round((file.size / 1048576) * 10) / 10
      return setError(
        `O vídeo tem ${agora} MB e o limite é ${maxMB} MB — corta o vídeo para ficar abaixo.`,
      )
    }
    const start = parseTime(startStr) ?? 0
    const end = endStr.trim() ? parseTime(endStr) : null
    if (endStr.trim() && end == null) return setError('Tempo inválido — usa min:seg (ex.: 1:30).')
    if (end != null && end <= start) return setError('O fim tem de ser depois do início.')
    if (duration && end != null && end > duration + 0.5) {
      return setError('O fim passa a duração do vídeo.')
    }

    const qs = new URLSearchParams({
      title: trimmed,
      game,
      visibility,
      start: String(start),
      end: end != null ? String(end) : '',
    })

    canceladoRef.current = false
    setProgress(0)
    setEnvio({ total: file ? file.size : 0, enviado: 0, inicio: Date.now(), fase: 'enviar' })
    // 1) publicação automática no YouTube (sem limite de tamanho)
    if (await enviarParaYouTube(qs)) return
    // 2) tenta subir direto ao Supabase (o vídeo não passa pelo site)
    if (await enviarDireto(qs)) return
    // 3) fallback: envio pelo servidor (servidor local ou vídeos pequenos)
    enviarPeloServidor(qs)
  }

  /* ============================================================
     Publicação automática no YouTube (opção C)

     O browser sobe o vídeo DIRETO para o YouTube (resumable):
     1. o servidor dá um access token curto e diz que contador usar;
     2. abre-se a sessão de subida com os metadados (unlisted);
     3. faz-se PUT do ficheiro — há barra de progresso, sem limite;
     4. o servidor confere e guarda o id do vídeo na BD.

     O vídeo nunca passa pelo site, por isso funciona igual na
     Vercel (que só aceita corpos de 4,5 MB).
     ============================================================ */
  const avisoQuota = async (mensagem, contador) => {
    setProgress(-1)
    setYtEstado((s) => ({ ...(s || {}), disponivel: false, aviso: mensagem }))
    setError(mensagem)
    if (contador != null) {
      fetch('/api/clips/pub/esgotado', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ contador, motivo: mensagem }),
      })
        .then((r) => r.json())
        .then((d) => d && setYtEstado(d))
        .catch(() => {})
    }
  }

  /* Só um 429 (ou um erro que fale em quota) é mesmo quota. Um 403
     normalmente é permissão/escopo — marcar isso como "esgotado"
     bloqueava as publicações todas até à meia-noite sem motivo. */
  const eQuota = (status, corpo) => {
    if (status === 429) return true
    const s = typeof corpo === 'string' ? corpo : JSON.stringify(corpo || '')
    return /quota|rate.?limit|upload.?limit|daily.?limit/i.test(s)
  }

  const enviarParaYouTube = async (qs) => {
    // sem YouTube configurado -> continua pelo Supabase (como dantes)
    if (!ytEstado || !ytEstado.configurado) return false
    if (canceladoRef.current) return false

    try {
      // 1) token + contador livre
      const t = await fetch('/api/clips/pub/token', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: '{}',
      })
      const td = await t.json().catch(() => null)
      if (!t.ok) {
        if (t.status === 429) {
          await avisoQuota((td && (td.aviso || td.error)) || 'Publicações esgotadas por hoje.', null)
          return true
        }
        if (t.status === 503) return false // não configurado -> Supabase
        setProgress(-1)
        setError((td && td.error) || 'Não consegui autorizar a publicação.')
        return true
      }
      if (td && td.estado) setYtEstado(td.estado)

      const titulo = (qs.get('title') || '').slice(0, 100)
      const meta = {
        snippet: {
          title: titulo,
          description: 'Clip de Los Locaus — ' + titulo,
          categoryId: '20', // Gaming
        },
        status: {
          privacyStatus: 'unlisted',
          embeddable: true,
          publicStatsViewable: false,
          selfDeclaredMadeForKids: false,
        },
      }

      // 2) abrir a sessão resumable (só metadados)
      const ini = await fetch(
        `${td.uploadUrl}?uploadType=resumable&part=snippet,status&notifySubscribers=false`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + td.token,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': String(file.size),
            'X-Upload-Content-Type': file.type || 'video/mp4',
          },
          body: JSON.stringify(meta),
        },
      )
      if (!ini.ok) {
        const e = await ini.json().catch(() => null)
        if (eQuota(ini.status, e)) {
          await avisoQuota('As publicações automáticas esgotaram por hoje.', td.contador)
          return true
        }
        setProgress(-1)
        setError(
          (e && e.error && (e.error.message || e.error)) ||
            'A abertura da subida foi recusada (erro ' + ini.status + ').',
        )
        return true
      }
      const loc = ini.headers.get('location') || ini.headers.get('Location')
      if (!loc) {
        setProgress(-1)
        setError('O endereço da subida não chegou. Tenta outra vez.')
        return true
      }

      // 3) o vídeo em si, com barra de progresso
      const sub = await new Promise((resolve) => {
        const x = new XMLHttpRequest()
        xhrRef.current = x
        x.open('PUT', loc)
        x.setRequestHeader('Content-Type', file.type || 'video/mp4')
        x.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 90))
            setEnvio((s) => ({ ...s, total: e.total, enviado: e.loaded }))
          }
        }
        x.onload = () => {
          xhrRef.current = null
          resolve({ ok: x.status >= 200 && x.status < 300, status: x.status, body: x.responseText })
        }
        x.onerror = () => {
          xhrRef.current = null
          resolve({ ok: false, status: 0 })
        }
        x.onabort = () => {
          xhrRef.current = null
          resolve({ ok: false, status: 0, cancelado: true })
        }
        x.send(file)
      })

      if (canceladoRef.current || sub.cancelado) return true
      if (!sub.ok) {
        let corpoSub = null
        try {
          corpoSub = JSON.parse(sub.body)
        } catch {
          /* corpo não é JSON */
        }
        if (eQuota(sub.status, corpoSub)) {
          await avisoQuota('As publicações automáticas esgotaram por hoje.', td.contador)
          return true
        }
        setProgress(-1)
        setError(
          (corpoSub && corpoSub.error && (corpoSub.error.message || corpoSub.error)) ||
            (sub.status
              ? 'A subida foi recusada (erro ' + sub.status + '). Tenta outra vez.'
              : 'A subida falhou — vê se tens internet e tenta outra vez.'),
        )
        return true
      }

      let videoId = null
      try {
        videoId = JSON.parse(sub.body).id
      } catch {
        /* corpo não é JSON */
      }
      if (!videoId) {
        setProgress(-1)
        setError('Não recebi o id do vídeo. Espera uns segundos e tenta outra vez.')
        return true
      }

      if (canceladoRef.current) return true

      // 4) confere e guarda na BD do utilizador
      setProgress(96)
      setEnvio((s) => ({ ...s, fase: 'guardar' }))
      const pedirConfirm = () =>
        fetch('/api/clips/pub/confirm', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            contador: td.contador,
            title: qs.get('title'),
            game: qs.get('game'),
            visibility: qs.get('visibility'),
            start: qs.get('start'),
            end: qs.get('end'),
            thumb, // capa nossa (frame do vídeo) — sem ela o site mostra o fundo por omissão
          }),
        })

      // 4) confere e guarda na BD do utilizador (uma repetição para erros
      //    passageiros do servidor — o vídeo já está no YouTube)
      let conf = await pedirConfirm()
      let cd = await conf.json().catch(() => null)
      if (!conf.ok && conf.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000))
        if (canceladoRef.current) return true
        conf = await pedirConfirm()
        cd = await conf.json().catch(() => null)
      }

      if (!conf.ok) {
        setProgress(-1)
        if (conf.status === 429) {
          await avisoQuota((cd && (cd.aviso || cd.error)) || 'Publicações esgotadas por hoje.', null)
        } else {
          const erro = (cd && cd.error) || 'Erro ao guardar o clip.'
          // O vídeo já foi publicado mas o clip não se guardou: em vez de
          // deixar órfão, tentamos apagar. Se não der, mostramos onde ficou.
          let onde = ''
          try {
            const ap = await fetch('/api/clips/pub/apagar', {
              method: 'POST',
              headers: { ...authHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId, contador: td.contador }),
            })
            const ad = await ap.json().catch(() => null)
            if (!(ad && ad.ok)) onde = ' O vídeo ficou publicado: https://youtu.be/' + videoId
          } catch {
            onde = ' O vídeo ficou publicado: https://youtu.be/' + videoId
          }
          setError(erro + onde)
        }
        return true
      }

      if (cd.estado) setYtEstado(cd.estado)
      setClips((prev) => [cd.clip, ...prev])
      resetForm()
      setShowForm(false)
      setTab('todos')
      return true
    } catch {
      setProgress(-1)
      setError('Não deu para publicar — tenta outra vez.')
      return true
    }
  }

  /* O vídeo vai direto do browser para o Supabase: o servidor só
     dá a URL de subida assinada e guarda o caminho no fim. */
  const enviarDireto = async (qs) => {
    try {
      const res = await fetch(
        `/api/clips/upload-url?${qs}&type=${encodeURIComponent(file.type || 'video/mp4')}`,
        { method: 'POST', headers: authHeaders() },
      )
      if (!res.ok) return false
      const d = await res.json()
      if (!d || !d.uploadUrl || !d.path) return false

      const subido = await new Promise((resolve) => {
        const x = new XMLHttpRequest()
        xhrRef.current = x
        x.open('PUT', d.uploadUrl)
        x.setRequestHeader('Content-Type', file.type || 'video/mp4')
        x.setRequestHeader('x-upsert', 'false')
        x.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 90))
            setEnvio((s) => ({ ...s, total: e.total, enviado: e.loaded }))
          }
        }
        x.onload = () => {
          xhrRef.current = null
          resolve(x.status >= 200 && x.status < 300)
        }
        x.onerror = () => {
          xhrRef.current = null
          resolve(false)
        }
        x.onabort = () => {
          xhrRef.current = null
          resolve(false)
        }
        x.send(file)
      })
      // cancelado pelo utilizador -> não tenta o envio alternativo
      if (canceladoRef.current) return true
      if (!subido) return false

      setProgress(95)
      setEnvio((s) => ({ ...s, fase: 'guardar' }))
      const conf = await fetch('/api/clips/confirm', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: d.path,
          title: qs.get('title'),
          game: qs.get('game'),
          visibility: qs.get('visibility'),
          start: qs.get('start'),
          end: qs.get('end'),
        }),
      })
      if (!conf.ok) {
        setProgress(-1)
        const err = await conf.json().catch(() => null)
        setError((err && err.error) || 'Erro ao guardar o clip.')
        return true // erro já explicado — não repetir no servidor
      }
      const clip = await conf.json()
      setClips((prev) => [clip, ...prev])
      resetForm()
      setShowForm(false)
      setTab('todos')
      return true
    } catch {
      setProgress(-1)
      return false
    }
  }

  /* Envio antigo (vídeo no corpo do pedido) — usado quando a
     subida direta não é possível. */
  const enviarPeloServidor = (qs) => {
    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open('POST', `/api/clips?${qs}`)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    const token = localStorage.getItem('userToken')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
        setEnvio((s) => ({ ...s, total: e.total, enviado: e.loaded }))
      }
    }
    xhr.onload = () => {
      xhrRef.current = null
      setProgress(-1)
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* resposta inválida */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) {
        setClips((prev) => [data, ...prev])
        resetForm()
        setShowForm(false)
        setTab('todos')
      } else {
        setError((data && data.error) || 'Erro ao enviar o vídeo.')
      }
    }
    xhr.onerror = () => {
      xhrRef.current = null
      setProgress(-1)
      setError('Falha no envio — tenta outra vez.')
    }
    xhr.onabort = () => {
      xhrRef.current = null
      setProgress(-1)
    }
    xhr.send(file)
  }

  /* Corta o envio a meio (botão "cancelar" da barra) */
  const cancelarEnvio = () => {
    canceladoRef.current = true
    if (xhrRef.current) {
      try {
        xhrRef.current.abort()
      } catch {
        /* já estava morto */
      }
    }
    xhrRef.current = null
    setProgress(-1)
  }

  /* ============================================================
     Tamanho (MB em tempo real) e corte do vídeo no browser
     ============================================================ */
  const MAXB = maxMB * 1048576
  /* Com o YouTube configurado não há limite de MB: a barra de aviso
     de tamanho e a compressão automática ficam de fora. */
  const vaiParaYT = !!(ytEstado && ytEstado.configurado && ytEstado.disponivel)
  const sizeMB = file ? Math.round((file.size / 1048576) * 10) / 10 : 0
  const over = !!file && file.size > MAXB && !vaiParaYT
  const dur = duration || 0
  const tA = dur > 0 ? Math.min(Math.max(0, parseTime(startStr) ?? 0), dur) : 0
  const parsedEnd = endStr.trim() ? parseTime(endStr) : null
  const tB = dur > 0 ? Math.min(Math.max(0, parsedEnd ?? dur), dur) : 0
  const sel = Math.max(0, tB - tA)
  const mbps = file && dur > 0 ? Math.round(((file.size * 8) / dur / 1000000) * 10) / 10 : 0
  const bitrateOrig = file && dur > 0 ? (file.size * 8) / dur : 0
  const base = bitrateOrig > 0 ? bitrateOrig : 6000000
  // alvo: 75% do limite para o vídeo (o resto fica para o áudio e para a margem)
  const bitrateMax = vaiParaYT ? Infinity : sel > 0 ? Math.max(300000, (MAXB * 0.75 * 8) / sel - 128000) : Infinity
  const vbps = Math.round(Math.max(Math.min(500000, base), Math.min(base, bitrateMax)))
  // sem compressão a fazer, o corte sai com o tamanho do original
  const aComprimir = !vaiParaYT && bitrateOrig > 0 && bitrateOrig * sel > MAXB * 0.75 * 8
  const saidaMB =
    sel > 0
      ? Math.max(
          0.1,
          aComprimir
            ? Math.round((((vbps + 128000) * sel) / 8 / 1048576) * 10) / 10
            : Math.round(sizeMB * (sel / dur) * 10) / 10,
        )
      : 0
  const pctBar = file ? Math.min(100, (sizeMB / maxMB) * 100) : 0
  const corBarra = over ? 'bg-red-500' : pctBar > 80 ? 'bg-amber-500' : 'bg-green-500'
  const corTexto = over ? 'text-red-400' : pctBar > 80 ? 'text-amber-400' : 'text-green-400'

  /* espera o vídeo chegar a um instante concreto */
  const seekTo = (v, t) =>
    new Promise((resolve) => {
      let feito = false
      const ok = () => {
        if (feito) return
        feito = true
        v.removeEventListener('seeked', ok)
        resolve()
      }
      v.addEventListener('seeked', ok)
      try {
        v.currentTime = t
      } catch {
        ok()
      }
      setTimeout(ok, 4000)
    })

  /* Grafo de áudio: manda o som do vídeo para o gravador sem
     o fazer soar em voz alta durante o corte. */
  const audioGraph = (v) => {
    if (audioRef.current && audioRef.current.el === v) return audioRef.current
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC || !v) return null
      if (audioRef.current) {
        try {
          audioRef.current.ctx.close()
        } catch {
          /* já fechado */
        }
      }
      const ctx = new AC()
      const src = ctx.createMediaElementSource(v)
      const dest = ctx.createMediaStreamDestination()
      const monitor = ctx.createGain()
      monitor.gain.value = 1
      src.connect(dest)
      src.connect(monitor)
      monitor.connect(ctx.destination)
      audioRef.current = { el: v, ctx, dest, monitor }
      return audioRef.current
    } catch {
      return null
    }
  }

  /* ver só o trecho escolhido (sem cortar nada) */
  const playSelection = async () => {
    const v = previewRef.current
    if (!v || sel < 0.3) return
    previewingRef.current = true
    await seekTo(v, tA)
    try {
      await v.play()
    } catch {
      previewingRef.current = false
    }
  }

  const onTimeUpdate = () => {
    const v = previewRef.current
    if (!v || !previewingRef.current) return
    if (v.currentTime >= tB - 0.05) {
      v.pause()
      previewingRef.current = false
    }
  }

  /* O corte saiu com áudio? (decode do blob já gravado — se não houver
     pista de som ou estiver digitalmente mudo, o utilizador tem de
     saber já, em vez de só ao ver o clip.) */
  const gravouAudio = async (blob) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC || !blob || !blob.size) return true
      const ctx = new AC()
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
      try { await ctx.close() } catch { /* já fechado */ }
      let peak = 0
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c)
        for (let i = 0; i < d.length; i++) {
          const a = d[i] < 0 ? -d[i] : d[i]
          if (a > peak) peak = a
        }
      }
      return peak > 0.00055 // abaixo de -55 dBFS = silêncio
    } catch {
      return false // sem pista de áudio (ou ilegível) — avisa
    }
  }

  /* Corta o vídeo no browser (grava o trecho escolhido) e troca o
     ficheiro pelo cortado — sai com o tamanho que couber no limite. */
  const cutVideo = async () => {
    const v = previewRef.current
    if (!file || !v) return
    if (typeof MediaRecorder === 'undefined') {
      return setError('Este browser não sabe cortar vídeos — usa Chrome ou Edge.')
    }
    if (sel < 0.4) return setError('O trecho tem de ter pelo menos meio segundo.')
    setError('')
    setNota('')

    const mime = pickMime()
    const graph = audioGraph(v)
    try {
      if (graph) await graph.ctx.resume()
    } catch {
      /* segue sem áudio */
    }
    if (graph) graph.monitor.gain.value = 0

    /* Qualidade inicial: 60 fps, igual ao original. Os fps NUNCA descem
       (descer para 30/24 estraga a qualidade do clip) — se não couber no
       limite, o que baixa é a resolução. */
    const FPS = 60
    const ratio = bitrateOrig > 0 ? (MAXB * 0.75 * 8) / (bitrateOrig * Math.max(sel, 1)) : 1
    let escala = ratio >= 1 ? 1 : Math.max(0.3, Math.min(1, Math.sqrt(ratio)))

    /* Grava o trecho escolhido (em tempo real) com a qualidade dada */
    const gravar = async (qEscala, qFps, tentativa) => {
      const vw = v.videoWidth || 1280
      const vh = v.videoHeight || 720
      const cw = Math.max(160, Math.round((vw * qEscala) / 2) * 2)
      const ch = Math.max(90, Math.round((vh * qEscala) / 2) * 2)
      const out = document.createElement('canvas')
      out.width = cw
      out.height = ch
      const ctxOut = out.getContext('2d')

      // o elemento NÃO pode estar muted — senão o áudio que chega ao
      // WebAudio/captureStream é silêncio e o corte sai sem som
      try { v.muted = false } catch { /* nada */ }

      let stream = null
      let rec = null
      try {
        const cvStream = out.captureStream(qFps)
        stream = new MediaStream(cvStream.getVideoTracks())
        let temAudio = false
        if (graph) {
          graph.dest.stream.getAudioTracks().forEach((t) => { stream.addTrack(t); temAudio = true })
        }
        // rede de segurança: áudio direto do elemento se o gráfico falhar
        if (!temAudio) {
          try {
            const el = v.captureStream ? v.captureStream() : (v.mozCaptureStream ? v.mozCaptureStream() : null)
            if (el) el.getAudioTracks().forEach((t) => { stream.addTrack(t); temAudio = true })
          } catch { /* segue sem áudio */ }
        }
        rec = new MediaRecorder(
          stream,
          mime ? { mimeType: mime, videoBitsPerSecond: vbps, audioBitsPerSecond: 128000 } : undefined,
        )
      } catch {
        if (stream) stream.getTracks().forEach((t) => t.stop())
        throw new Error('Gravação indisponível')
      }

      const chunks = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data)
      }
      const terminou = new Promise((res) => {
        rec.onstop = res
      })

      previewingRef.current = false
      try {
        v.pause()
      } catch {
        /* nada */
      }
      // espera o vídeo estar pronto a dar imagem
      if (v.readyState < 2) {
        await new Promise((res) => {
          v.addEventListener('loadeddata', res, { once: true })
          setTimeout(res, 5000)
        })
      }
      setTrimming({ done: 0, total: sel, tentativa })
      await seekTo(v, tA)

      let deveParar = false
      let rafDraw = 0
      const desenhar = () => {
        if (deveParar) return
        try {
          ctxOut.drawImage(v, 0, 0, cw, ch)
        } catch {
          /* frame perdido */
        }
        rafDraw = requestAnimationFrame(desenhar)
      }

      rec.start(250)
      await new Promise((resolve) => {
        const t0 = Date.now()
        const limite = (sel + 6) * 1000 // rede de segurança se o vídeo travar
        const tick = () => {
          const feito = Math.max(0, Math.min(sel, v.currentTime - tA))
          setTrimming({ done: feito, total: sel, tentativa })
          if (v.currentTime >= tB - 0.04 || v.ended || Date.now() - t0 > limite) resolve()
          else requestAnimationFrame(tick)
        }
        desenhar()
        v.play()
          .then(() => requestAnimationFrame(tick))
          .catch(() => resolve())
      })

      deveParar = true
      if (rafDraw) cancelAnimationFrame(rafDraw)
      try {
        v.pause()
      } catch {
        /* nada */
      }
      if (rec.state !== 'inactive') rec.stop()
      await terminou
      if (stream) stream.getTracks().forEach((t) => t.stop())
      const type = (rec.mimeType || 'video/webm').split(';')[0]
      return new Blob(chunks, { type })
    }

    try {
      let blob = null
      if (vaiParaYT) {
        // YouTube não tem o limite de 50 MB: grava na qualidade máxima,
        // sem reduzir resolução para "caber" no Supabase.
        blob = await gravar(1, FPS, 1)
      } else {
        for (let tent = 1; tent <= 4; tent++) {
          blob = await gravar(escala, FPS, tent)
          if (blob.size <= MAXB || tent === 4) break
          // ficou acima do limite: baixa a resolução (mantendo os 60 fps),
          // mas NUNCA abaixo de metade — abaixo disso a qualidade fica má
          const novoEscala = Math.max(0.5, escala * 0.75)
          if (novoEscala === escala) break // já no mínimo — não baixa mais
          escala = novoEscala
        }
      }
      if (graph) graph.monitor.gain.value = 1
      setTrimming(null)
      if (!blob || !blob.size) return setError('O corte não deu resultado — tenta outra vez.')

      const ficou = Math.round((blob.size / 1048576) * 10) / 10
      if (!vaiParaYT && blob.size > MAXB) {
        return setError(
          `Mesmo a reduzir a resolução ficou em ${ficou} MB (limite ${maxMB} MB) — escolhe menos segundos do vídeo.`,
        )
      }

      const type = blob.type || 'video/webm'
      const nomeBase = (file.name || 'video').replace(/\.[^.]+$/, '').slice(0, 60)
      const novo = new File(
        [blob],
        nomeBase + '-cortado' + (type.indexOf('mp4') >= 0 ? '.mp4' : '.webm'),
        { type },
      )
      setStartStr('0:00')
      onPick(novo)
      const temSom = await gravouAudio(blob)
      setNota(
        `Cortado — agora tem ${ficou} MB (trecho de ${mmss(sel)}, ${FPS} fps).` +
          (temSom
            ? ''
            : ' ⚠ Não detetei áudio no corte — se o original tem som, tenta outra vez (recarrega a página e repete).'),
      )
    } catch {
      if (graph) graph.monitor.gain.value = 1
      setTrimming(null)
      return setError('Não consegui cortar este vídeo neste browser.')
    }
  }

  const filteredBase = clips.filter((c) => {
    if (tab === 'publicos' && c.visibility !== 'public') return false
    if (tab === 'meus' && !c.mine) return false
    if (tab === 'guardados' && !c.saved) return false
    if (jogo && c.game !== jogo) return false
    return true
  })
  const filtered =
    destaque && !filteredBase.some((c) => Number(c.id) === Number(destaque.id))
      ? [destaque, ...filteredBase]
      : filteredBase

  // jogos que já têm clips (para o filtro não ficar cheio de opções vazias)
  const jogosComClips = []
  for (const c of clips) {
    if (c.game && !jogosComClips.some((j) => j.id === c.game)) {
      jogosComClips.push({ id: c.game, label: gameLabel(c.game) })
    }
  }
  jogosComClips.sort((a, b) => a.label.localeCompare(b.label, 'pt'))

  const emptyMsg = jogo
    ? `Ainda não há clips de ${gameLabel(jogo)}.`
    : {
        todos: 'Ainda não há clips.',
        publicos: 'Ainda não há clips públicos.',
        meus: 'Ainda não publicaste clips.',
        guardados: 'Ainda não guardaste clips.',
      }[tab]

  /* Barra de upload — MB enviados, velocidade e quanto falta */
  const mbTotal = envio.total
    ? Math.round((envio.total / 1048576) * 10) / 10
    : Number(sizeMB) || 0
  const mbEnviado = Math.round((envio.enviado / 1048576) * 10) / 10
  const segundos = envio.inicio ? (Date.now() - envio.inicio) / 1000 : 0
  const velocidade =
    segundos > 0.4 && envio.enviado > 0
      ? Math.max(0.1, Math.round((envio.enviado / 1048576 / segundos) * 10) / 10)
      : 0
  const restante =
    velocidade > 0 && mbTotal > mbEnviado && envio.fase === 'enviar'
      ? `cerca de ${Math.max(1, Math.ceil((mbTotal - mbEnviado) / velocidade))} s a restar`
      : ''

  return (
    <PageShell>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ---------------- Conteúdo ---------------- */}
        <div className="min-w-0 flex-1">
          {/* Cabeçalho */}
          <div className="mb-6 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/15 via-[#17102a]/70 to-fuchsia-600/10 p-4 shadow-xl shadow-violet-950/10 backdrop-blur-md sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-300">
                <Film className="h-2.5 w-2.5" /> Feed da comunidade
              </span>
              <h1
                className="font-black gradient-text"
                style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
              >
                Clips e Publicações
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                {clips.length}
                {maisClips ? '+' : ''} clip{clips.length === 1 && !maisClips ? '' : 's'} · cortes
                do grupo, comentários e guardados
              </p>
            </div>
            <button
              onClick={abrirPublicar}
              className="ui-btn ui-btn-primary ui-btn-lg"
            >
              <Plus className="h-4 w-4" /> Publicar
            </button>
          </div>
          </div>

          {/* Escolha: vídeo ou mensagem */}
          {escolhaPublicar && (
            <div className="glass mb-6 rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-white">
                  <Plus className="h-5 w-5 text-violet-400" /> O que queres publicar?
                </h2>
                <button
                  onClick={() => setEscolhaPublicar(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setEscolhaPublicar(false)
                    openForm()
                  }}
                  className="flex items-start gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-left transition-colors hover:bg-violet-500/20"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/25 text-violet-200">
                    <Film className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-white">Vídeo / Clip</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">
                      Envia um clip, corta e publica no feed com capa e comentários.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEscolhaPublicar(false)
                    setMsgErro('')
                    setShowMensagem(true)
                  }}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gray-200">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-white">Mensagem</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">
                      Escreve uma mensagem (com ou sem imagem) para o teu perfil.
                    </span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Formulário de mensagem */}
          {showMensagem && user && (
            <form onSubmit={publicarMensagem} className="glass mb-6 rounded-2xl p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-white">
                  <MessageSquare className="h-5 w-5 text-violet-400" /> Nova mensagem
                </h2>
                <button
                  type="button"
                  onClick={fecharMensagem}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <textarea
                value={msgTexto}
                onChange={(e) => setMsgTexto(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="O que estás a pensar? Podes juntar uma imagem do PC ou do telemóvel."
                className="w-full resize-none rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-400 focus:bg-white/15"
              />

              {msgPreview && (
                <div className="relative mt-3 w-fit">
                  <img
                    src={msgPreview}
                    alt=""
                    className="max-h-48 rounded-xl border border-white/10 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (msgPreview) URL.revokeObjectURL(msgPreview)
                      setMsgImagem(null)
                      setMsgPreview('')
                    }}
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {msgErro && (
                <p className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-[12px] font-bold text-red-300">
                  {msgErro}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => msgFileRef.current && msgFileRef.current.click()}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-bold text-gray-200 hover:bg-white/10"
                >
                  <ImageIcon className="h-4 w-4" /> {msgPreview ? 'Trocar imagem' : 'Juntar imagem'}
                </button>
                <input
                  ref={msgFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => escolherImagemMensagem(e.target.files && e.target.files[0])}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fecharMensagem}
                    className="rounded-xl border border-white/15 px-3 py-2 text-[12px] font-bold text-gray-300 hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={msgEnviando}
                    className="ui-btn ui-btn-primary"
                  >
                    {msgEnviando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Publicar mensagem
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Formulário */}
          {showForm && user && (
            <div className="glass mb-6 rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-white">
                  <Film className="h-5 w-5 text-violet-400" /> Novo clip
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* o que vai acontecer ao vídeo — ANTES de escolher o ficheiro */}
              {ytEstado && ytEstado.configurado ? (
                ytEstado.disponivel ? (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-emerald-200">
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p>
                      <span className="font-black text-white">
                        Publicação de clip automática ativada.
                      </span>
                      {typeof ytEstado.restantes === 'number' && ytEstado.restantes > 0 && (
                        <>
                          {' '}
                          Hoje ainda dá para publicar{' '}
                          <b className="text-white">{ytEstado.restantes}</b>.
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-yellow-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                    <p>
                      <span className="font-black text-white">
                        {ytEstado.aviso || 'Publicações esgotadas por hoje.'}
                      </span>{' '}
                      Podes guardar o clip e voltar a publicar quando o aviso desaparecer.
                    </p>
                  </div>
                )
              ) : (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p>
                    <span className="font-black text-white">
                      Máximo {maxMB} MB por vídeo.
                    </span>{' '}
                    Se o ficheiro passar disto, o site avisa logo a seguir à escolha — corta o
                    vídeo (ou grava em 720p) antes de publicar.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* título + jogo */}
                <div className="grid gap-4 sm:grid-cols-[1fr,14rem]">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Título do clip"
                    className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-400 focus:bg-white/15"
                  />

                  {/* jogo do clip — obrigatório */}
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-gray-400">
                      Jogo do clip <span className="text-violet-400">*</span>
                    </span>
                    <select
                      value={game}
                      onChange={(e) => setGame(e.target.value)}
                      className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:bg-white/15"
                    >
                      <option value="" className="bg-[#1b1630]">
                        Escolhe o jogo…
                      </option>
                      {CLIP_GAMES.map((g) => (
                        <option key={g.id} value={g.id} className="bg-[#1b1630]">
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* vídeo escolhido */}
                {!preview ? (
                  <button
                    onClick={() => fileRef.current && fileRef.current.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/20 px-4 py-8 text-gray-400 transition-colors hover:border-violet-500/60 hover:text-violet-400"
                  >
                    <Upload className="h-7 w-7" />
                    <span className="text-sm font-bold">Escolher vídeo</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                        vaiParaYT
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-violet-300'
                      }`}
                    >
                      {vaiParaYT
                        ? 'Publicação automática · sem limite de MB'
                        : `MP4, WebM ou MOV · até ${maxMB} MB`}
                    </span>
                  </button>
                ) : (
                  <div>
                    <video
                      ref={previewRef}
                      src={preview}
                      controls={!trimming}
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        e.currentTarget.volume = 0.25
                        onPreviewMeta(e)
                      }}
                      onTimeUpdate={onTimeUpdate}
                      className="max-h-72 w-full rounded-xl bg-black"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="truncate font-semibold text-violet-400">{file?.name}</span>
                      <div className="flex items-center gap-2">
                        {duration != null && <span>Duração {mmss(duration)}</span>}
                        <button
                          onClick={() => fileRef.current && fileRef.current.click()}
                          className="rounded-full bg-white/10 px-2.5 py-1 font-bold hover:bg-white/20"
                        >
                          Trocar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files && e.target.files[0])}
                />

                {/* peso + corte — tudo no mesmo sítio */}
                {file && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-400">
                        <Scissors className="h-4 w-4 text-violet-400" /> Peso e corte
                      </span>
                      <span className="text-xs font-bold">
                        {vaiParaYT ? (
                          <span className="flex items-center gap-1.5 font-black text-emerald-300">
                            <Check className="h-3.5 w-3.5" /> {sizeMB} MB · sem limite
                          </span>
                        ) : (
                          <>
                            <span className={corTexto}>{sizeMB} MB</span>
                            <span className="text-gray-400"> / {maxMB} MB</span>
                            <span className={`ml-2 ${corTexto}`}>
                              {over ? `${Math.round(sizeMB - maxMB)} MB acima` : 'cabe'}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* barra de tamanho (só quando há limite) */}
                    {!vaiParaYT && (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all ${corBarra}`}
                          style={{ width: `${pctBar}%` }}
                        />
                      </div>
                    )}

                    {/* trecho: hora editável + barra de arrastar */}
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2">
                        <span className="w-11 shrink-0 text-[11px] font-black uppercase text-gray-400">
                          Início
                        </span>
                        <input
                          value={startStr}
                          onChange={(e) => setStartStr(e.target.value)}
                          placeholder="0:00"
                          disabled={!!trimming}
                          className="w-16 shrink-0 rounded-lg bg-white/10 px-2 py-1.5 text-center text-xs font-bold text-violet-300 outline-none focus:bg-white/15 disabled:opacity-50"
                        />
                        <input
                          type="range"
                          min={0}
                          max={dur}
                          step={1}
                          value={tA}
                          disabled={!!trimming || dur <= 0}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setStartStr(mmss(val))
                            if (val >= tB) setEndStr(mmss(Math.min(dur, val + 1)))
                          }}
                          className="min-w-0 flex-1 accent-violet-500"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span className="w-11 shrink-0 text-[11px] font-black uppercase text-gray-400">
                          Fim
                        </span>
                        <input
                          value={endStr}
                          onChange={(e) => setEndStr(e.target.value)}
                          placeholder={duration != null ? mmss(duration) : 'fim'}
                          disabled={!!trimming}
                          className="w-16 shrink-0 rounded-lg bg-white/10 px-2 py-1.5 text-center text-xs font-bold text-violet-300 outline-none focus:bg-white/15 disabled:opacity-50"
                        />
                        <input
                          type="range"
                          min={0}
                          max={dur}
                          step={1}
                          value={tB}
                          disabled={!!trimming || dur <= 0}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            if (val <= tA) setStartStr(mmss(Math.max(0, val - 1)))
                            setEndStr(mmss(val))
                          }}
                          className="min-w-0 flex-1 accent-violet-500"
                        />
                      </label>
                    </div>

                    {nota && (
                      <p className="mt-2 rounded-lg bg-green-500/10 px-2.5 py-1.5 text-[11px] font-bold text-green-400">
                        {nota}
                      </p>
                    )}

                    {/* ações do corte */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={playSelection}
                        disabled={!!trimming || dur <= 0}
                        className="ui-btn ui-btn-ghost ui-btn-sm"
                      >
                        Ver só o trecho
                      </button>
                      <button
                        onClick={cutVideo}
                        disabled={!!trimming || dur <= 0}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        {trimming ? 'A cortar…' : over ? 'Cortar para caber' : 'Cortar vídeo'}
                      </button>
                      {dur > 0 && (
                        <span className="text-[11px] text-gray-400">
                          trecho {mmss(sel)} · sai com{' '}
                          <span className={corTexto}>{saidaMB} MB</span>
                        </span>
                      )}
                    </div>

                    {trimming && (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[11px] font-bold text-violet-300">
                          <span>
                            A cortar em tempo real…
                            {trimming.tentativa > 1 ? ` (tentativa ${trimming.tentativa}/4)` : ''}
                          </span>
                          <span>
                            {mmss(trimming.done)} / {mmss(trimming.total)} (
                            {Math.round((trimming.done / Math.max(0.01, trimming.total)) * 100)}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{
                              width: `${Math.min(100, (trimming.done / Math.max(0.01, trimming.total)) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-400">
                          Deixa esta aba aberta — o vídeo tem de correr todo o trecho para ser
                          cortado (dura {mmss(sel)}) e o som não é reproduzido.
                        </p>
                      </div>
                    )}

                    {/* números técnicos — disponíveis mas fora do caminho */}
                    <details className="mt-3 border-t border-white/10 pt-2 text-[11px] text-gray-400">
                      <summary className="cursor-pointer font-bold text-gray-400 hover:text-gray-200">
                        Detalhes técnicos
                      </summary>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {duration != null && <span>Duração {mmss(duration)}</span>}
                        {mbps > 0 && <span>≈ {mbps} Mbps originais</span>}
                        <span>{Math.round(pctBar)}% do limite</span>
                        <span>60 fps na saída</span>
                        <span>
                          {over
                            ? 'Corta o vídeo até caber.'
                            : 'Cabe no limite — podes publicar.'}
                        </span>
                      </div>
                      <p className="mt-1.5">
                        O corte é feito aqui no browser e não envia nada para o site: fica só o
                        trecho escolhido, a 60 fps e com um tamanho que cabe nos {maxMB} MB.
                      </p>
                    </details>
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                    {error}
                  </p>
                )}

                {progress >= 0 && (
                  <div className="rounded-xl bg-white/5 px-3 py-2.5">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-gray-200">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
                        {envio.fase === 'guardar'
                          ? 'A guardar o clip.'
                          : envio.fase === 'copia'
                            ? 'A preparar a transferência.'
                            : 'A enviar o vídeo.'}
                      </span>
                      <span className="flex items-center gap-2 text-gray-400">
                        <span>
                          {mbEnviado} / {mbTotal} MB
                        </span>
                        {velocidade > 0 && (
                          <>
                            <span className="text-gray-600">·</span>
                            <span>{velocidade} MB/s</span>
                          </>
                        )}
                        <span className="font-black text-white">{progress}%</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{restante}</span>
                      <button
                        onClick={cancelarEnvio}
                        className="text-[11px] font-bold text-gray-400 transition-colors hover:text-red-400"
                      >
                        cancelar envio
                      </button>
                    </div>
                  </div>
                )}

                {/* visibilidade + ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setVisibility('public')}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        visibility === 'public'
                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      <Globe className="h-4 w-4" /> Público
                    </button>
                    <button
                      onClick={() => setVisibility('private')}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        visibility === 'private'
                          ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      <Lock className="h-4 w-4" /> Privado
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowForm(false)
                        resetForm()
                      }}
                      className="ui-btn ui-btn-ghost"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={submit}
                      disabled={progress >= 0}
                      className="ui-btn ui-btn-primary"
                    >
                      {progress >= 0 ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> A enviar {progress}%
                        </>
                      ) : (
                        'Publicar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros (aba + jogo) */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <TabBar
              ariaLabel="Filtrar clips"
              value={tab}
              onChange={setTab}
              items={TABS.filter((t) => user || (t.id !== 'meus' && t.id !== 'guardados'))}
            />
            {jogosComClips.length > 0 && (
              <label className="ml-auto flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-gray-300 focus-within:bg-white/10">
                <Gamepad2 className="h-4 w-4 text-violet-400" />
                <select
                  value={jogo}
                  onChange={(e) => setJogo(e.target.value)}
                  title="Filtrar por jogo"
                  className="cursor-pointer bg-transparent text-sm font-bold text-gray-200 outline-none"
                >
                  <option value="" className="bg-neutral-900">
                    Todos os jogos
                  </option>
                  {jogosComClips.map((g) => (
                    <option key={g.id} value={g.id} className="bg-neutral-900">
                      {g.label}
                    </option>
                  ))}
                  {jogo && !jogosComClips.some((g) => g.id === jogo) && (
                    <option value={jogo} className="bg-neutral-900">
                      {gameLabel(jogo)}
                    </option>
                  )}
                </select>
              </label>
            )}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <span className="text-sm">A carregar clips…</span>
            </div>
          ) : filtered.length === 0 ? (
            <Estado
              icon={Film}
              titulo={emptyMsg}
              texto={
                tab === 'guardados'
                  ? 'Toca no ícone de guardar de um clip e ele aparece aqui.'
                  : jogo
                    ? `Escolhe outro jogo ou publica o primeiro clip de ${gameLabel(jogo)}.`
                    : 'Publica um clip novo e fica logo no topo da lista.'
              }
              acao={
                user
                  ? { label: 'Publicar', onClick: abrirPublicar }
                  : { label: 'Entrar para publicar', onClick: () => onRequestAuth?.('clips') }
              }
            />
          ) : (
            <div className="space-y-6">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  id={`clip-${c.id}`}
                  className={
                    destaque && Number(c.id) === Number(destaque.id)
                      ? 'rounded-2xl ring-2 ring-violet-400/60'
                      : ''
                  }
                >
                  <ClipCard
                    clip={c}
                    user={user}
                    transparent
                    onRequestAuth={onRequestAuth}
                    onProfile={onProfile}
                    onUpdate={(next) =>
                      setClips((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                    }
                    onDelete={(id) => setClips((prev) => prev.filter((x) => x.id !== id))}
                  />
                </div>
              ))}

              {/* Feed paginado — só aparece se existir mais do que uma página */}
              {maisClips && (
                <button
                  onClick={carregarMaisClips}
                  disabled={aCarregarMaisClips}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {aCarregarMaisClips ? 'A carregar…' : 'Carregar mais clips'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Perfil público */}
      {member && (
        <MemberModal
          name={member}
          onClose={() => setMember(null)}
          user={user}
          onRequestAuth={onRequestAuth}
          onProfile={onProfile}
        />
      )}
    </PageShell>
  )
}
