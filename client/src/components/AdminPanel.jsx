import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Users,
  Calendar,
  TrendingUp,
  Globe,
  LogOut,
  Activity,
  StickyNote,
  Plus,
  Trash2,
  Film,
  Lock,
  Upload,
  Loader2,
  ExternalLink,
  LayoutDashboard,
  ShieldCheck,
  MessageSquare,
  Eye,
  Award,
  Gamepad2,
  KeyRound,
  BarChart3,
  RefreshCcw,
  ScrollText,
} from 'lucide-react'
import { mmss, parseTime } from '../lib/auth'
import TabBar from './TabBar'
import Estado from './Estado'
import AdminStats from './AdminStats'
import { BADGES, BadgeGem } from './BadgeGem'
import { CLIP_GAMES, gameLabel } from '../data/clipGames'

/* Data simples das contas (dd mmm aaaa) */
const fmtUserDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* Email da conta — obrigatório para poder recuperar a palavra-passe.
   O servidor valida o formato e o domínio (MX) antes de guardar. */
function EmailRow({ user, onSaved }) {
  const [value, setValue] = useState(user.email || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  const save = async () => {
    const next = value.trim()
    if (!next) {
      setOk(false)
      setMsg('Escreve um email.')
      return
    }
    if (next === (user.email || '')) {
      setOk(true)
      setMsg('Sem alterações.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch(`/api/admin/users/${user.id}/email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('userToken') || localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ email: next }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.ok) {
        setOk(false)
        setMsg(d.error || 'Erro ao guardar o email.')
        return
      }
      setOk(true)
      setMsg('Email guardado.')
      if (onSaved) onSaved(d.email)
    } catch {
      setOk(false)
      setMsg('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  const missing = !user.email

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</span>
        <input
          type="email"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setMsg('')
          }}
          placeholder="nome@dominio.com"
          maxLength={254}
          className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white outline-none placeholder:text-gray-600 focus:bg-white/15 focus:ring-1 focus:ring-violet-500/40"
        />
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Guardar
        </button>
      </div>
      {missing && !msg && (
        <p className="mt-1.5 text-[11px] text-amber-400">
          Sem email — esta conta não pode recuperar a palavra-passe sozinha.
        </p>
      )}
      {msg && (
        <p className={`mt-1.5 text-[11px] font-semibold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

export default function AdminPanel({ onClose, onLogout, user = null }) {
  const [tab, setTab] = useState('painel') // 'painel' | 'utilizadores' | 'anuncios' | 'temas' | 'clips'
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Painel: visão geral de tudo
  const [overview, setOverview] = useState(null)

  // Utilizadores: lista + distinções
  const [userList, setUserList] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')

  // Pedidos de recuperação de palavra-passe ("esqueci a pass")
  const [requests, setRequests] = useState([])

  // Contas de jogo (ligação user <-> jogador) por conta aberta
  const [openUser, setOpenUser] = useState(null)
  const [accForm, setAccForm] = useState({ game: 'cs2', nick: '', escolha: '' })
  const [accBusy, setAccBusy] = useState(false)
  const [nomesJogo, setNomesJogo] = useState([]) // nomes das estatísticas do jogo aberto

  // Anúncios (publicações do admin)
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Clips de teste (publicados com a sessão do admin)
  const [clips, setClips] = useState([])
  const [clipTitle, setClipTitle] = useState('')
  const [clipFile, setClipFile] = useState(null)
  const [clipPreview, setClipPreview] = useState('')
  const [clipDur, setClipDur] = useState(null)
  const [clipStart, setClipStart] = useState('0:00')
  const [clipEnd, setClipEnd] = useState('')
  const [clipVis, setClipVis] = useState('public')
  const [clipProg, setClipProg] = useState(-1)
  const [clipMsg, setClipMsg] = useState('')
  const [clipOk, setClipOk] = useState(false)
  const clipInputRef = useRef(null)
  const clipPreviewRef = useRef(null)

  // Rainbow Six: estado do tracker.gg + atualização manual
  const [r6, setR6] = useState(null)
  const [r6Msg, setR6Msg] = useState('')

  /* Registo de auditoria das ferramentas Windows (só admin) */
  const [ferrRuns, setFerrRuns] = useState([])
  const [ferrLoading, setFerrLoading] = useState(false)
  const [ferrErro, setFerrErro] = useState('')

  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('userToken') || localStorage.getItem('adminToken')}`,
  })

  const fetchStats = () => {
    fetch('/api/stats/visitors')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const fetchOverview = () => {
    fetch('/api/admin/overview', { headers: adminHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOverview(data)
      })
      .catch(() => {})
  }

  const fetchUsers = () => {
    setUsersLoading(true)
    setUsersError('')
    fetch('/api/admin/users', { headers: adminHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('res'))))
      .then((data) => {
        setUserList(Array.isArray(data.users) ? data.users : [])
        setUsersLoading(false)
      })
      .catch(() => {
        setUsersError('Não foi possível carregar as contas.')
        setUsersLoading(false)
      })
  }

  const fetchRequests = () => {
    fetch('/api/admin/recovery', { headers: adminHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setRequests(d && Array.isArray(d.requests) ? d.requests : []))
      .catch(() => {})
  }

  const fetchPosts = () => {
    fetch('/api/posts')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  const fetchClips = () => {
    fetch('/api/clips', { headers: adminHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setClips(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  /* ---------- Rainbow Six: atualização manual (barra + logs) ---------- */
  const fetchR6 = () => {
    fetch('/api/admin/r6/status', { headers: adminHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d && setR6(d))
      .catch(() => {})
  }

  /* ---------- Registo de auditoria das ferramentas Windows ---------- */
  const fetchFerrRuns = () => {
    setFerrLoading(true)
    setFerrErro('')
    fetch('/api/ferramentas/historico?limit=80', { headers: adminHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('http')
        return res.json()
      })
      .then((d) => setFerrRuns(Array.isArray(d) ? d : []))
      .catch(() => setFerrErro('Não foi possível ler o registo.'))
      .finally(() => setFerrLoading(false))
  }

  const atualizarR6 = async () => {
    setR6Msg('')
    try {
      const res = await fetch('/api/admin/r6/refresh', {
        method: 'POST',
        headers: adminHeaders(),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        setR6Msg(d.error || 'Não foi possível atualizar.')
        return
      }
      fetchR6()
    } catch {
      setR6Msg('Sem ligação ao servidor.')
    }
  }

  /* ---------- Rainbow Six: importar JSON guardados (um a um) ----------
     O utilizador abre a página do tracker.gg, guarda o JSON (ou copia),
     e carrega aqui. Enviamos tudo ao servidor, que identifica cada
     jogador pelo handle e atualiza o r6.json. */
  const r6FileRef = useRef(null)
  const [r6ImportMsg, setR6ImportMsg] = useState(null)

  const importarR6 = async (ev) => {
    const ficheiros = Array.from(ev.target.files || [])
    if (!ficheiros.length) return
    setR6ImportMsg(null)
    const conteudos = []
    for (const f of ficheiros) {
      try {
        // manda o texto bruto — o servidor lida com HTML (página
        // guardada do tracker.gg) ou JSON e extrai os dados
        conteudos.push(await f.text())
      } catch {
        setR6ImportMsg(`Não deu para ler "${f.name}" — ignorado.`)
      }
    }
    if (!conteudos.length) return
    try {
      const res = await fetch('/api/admin/r6/import', {
        method: 'POST',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsons: conteudos }),
      })
      const d = await res.json().catch(() => ({}))
      const resul = d.resultados || []
      const bons = resul.filter((r) => r.ok)
      const maus = resul.filter((r) => !r.ok)
      if (bons.length || maus.length) {
        const partes = []
        if (bons.length) {
          partes.push(
            `Importado: ${bons.map((r) => r.handle + (r.mudou ? '' : ' (sem mudanças)')).join(', ')} (${bons.length}/${resul.length}).`,
          )
        }
        if (maus.length) {
          partes.push(maus.map((r) => r.erro || 'falhou').join(' · '))
        }
        setR6ImportMsg({ ok: bons.length > 0, texto: partes.join(' ') })
        fetchR6()
      } else {
        setR6ImportMsg({ ok: false, texto: d.error || 'Não deu para importar.' })
      }
    } catch {
      setR6ImportMsg({ ok: false, texto: 'Sem ligação ao servidor.' })
    } finally {
      if (r6FileRef.current) r6FileRef.current.value = ''
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Atualizar a cada 30 segundos
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (tab === 'painel') fetchOverview()
    if (tab === 'utilizadores') {
      fetchUsers()
      fetchRequests()
    }
    if (tab === 'anuncios') fetchPosts()
    if (tab === 'clips') fetchClips()
    if (tab === 'r6') fetchR6()
    if (tab === 'ferramentas') fetchFerrRuns()
  }, [tab])

  /* acompanha a atualização do R6 enquanto estiver a correr */
  const r6ACorrer = tab === 'r6' && Boolean(r6?.trabalho?.aCorrer)
  useEffect(() => {
    if (!r6ACorrer) return undefined
    const iv = setInterval(fetchR6, 700)
    return () => clearInterval(iv)
  }, [r6ACorrer])

  const handleLogout = () => {
    onLogout()
  }

  /* ---------- distinções (atribuir / retirar) ---------- */
  const toggleBadge = async (u, badgeId) => {
    const has = u.badges.includes(badgeId)
    setUsersError('')
    try {
      const res = await fetch(`/api/admin/users/${u.id}/badges${has ? `/${badgeId}` : ''}`, {
        method: has ? 'DELETE' : 'POST',
        headers: adminHeaders(),
        body: has ? undefined : JSON.stringify({ badge: badgeId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(data.error || 'Erro ao atualizar a distinção.')
        return
      }
      setUserList((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? {
                ...x,
                badges: has
                  ? x.badges.filter((b) => b !== badgeId)
                  : [...x.badges, badgeId],
              }
            : x,
        ),
      )
    } catch {
      setUsersError('Sem ligação ao servidor.')
    }
  }

  /* ---------- modo recuperação (nova pass pedido pelo user) ---------- */
  const toggleRecovery = async (u) => {
    const next = !u.recovery
    setUsersError('')
    try {
      const res = await fetch(`/api/admin/users/${u.id}/recovery`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ enabled: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(data.error || 'Erro ao alterar o modo de recuperação.')
        return
      }
      setUserList((prev) => prev.map((x) => (x.id === u.id ? { ...x, recovery: next } : x)))
      setRequests((prev) =>
        next
          ? prev.map((r) =>
              Number(r.user_id) === Number(u.id) ? { ...r, recovery: true } : r,
            )
          : prev.filter((r) => Number(r.user_id) !== Number(u.id)),
      )
    } catch {
      setUsersError('Sem ligação ao servidor.')
    }
  }

  /* ---------- ligações user <-> contas de jogo ---------- */
  // Nomes disponíveis: os que já aparecem nas estatísticas do jogo
  // escolhido (cada jogo tem os seus — CS2, Rainbow, …)
  useEffect(() => {
    if (!openUser) return
    let vivo = true
    setNomesJogo([])
    fetch(`/api/admin/game-names?game=${encodeURIComponent(accForm.game)}`, {
      headers: adminHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setNomesJogo(Array.isArray(d?.names) ? d.names : []))
      .catch(() => {})
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUser, accForm.game])

  const addGameAccount = async (u) => {
    const nick = accForm.nick.trim()
    if (!nick) {
      setUsersError('Escolhe um nome das estatísticas (ou escreve outro).')
      return
    }
    setAccBusy(true)
    setUsersError('')
    try {
      const res = await fetch(`/api/admin/users/${u.id}/game-accounts`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ game: accForm.game, nick }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(data.error || 'Erro ao ligar a conta de jogo.')
        return
      }
      setUserList((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, game_accounts: data.accounts } : x)),
      )
      setAccForm((f) => ({ ...f, nick: '', escolha: '' }))
    } catch {
      setUsersError('Sem ligação ao servidor.')
    } finally {
      setAccBusy(false)
    }
  }

  const removeGameAccount = async (u, accId) => {
    setUsersError('')
    try {
      const res = await fetch(`/api/admin/users/${u.id}/game-accounts/${accId}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(data.error || 'Erro ao retirar a conta de jogo.')
        return
      }
      setUserList((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, game_accounts: data.accounts } : x)),
      )
    } catch {
      setUsersError('Sem ligação ao servidor.')
    }
  }

  /* ---------- tornar / retirar admin ---------- */
  const toggleAdminUser = async (u) => {
    const value = !u.is_admin
    setUsersError('')
    try {
      const res = await fetch(`/api/admin/users/${u.id}/admin`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ is_admin: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsersError(data.error || 'Erro ao alterar as permissões.')
        return
      }
      setUserList((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: value } : x)))
    } catch {
      setUsersError('Sem ligação ao servidor.')
    }
  }

  const createPost = async () => {
    if (saving) return
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('Título e conteúdo são obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          image_url: imageUrl.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar o anúncio.')
        return
      }
      setTitle('')
      setContent('')
      setImageUrl('')
      setPosts((prev) => [data, ...prev])
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async (id) => {
    if (!window.confirm('Eliminar este anúncio?')) return
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      /* sem rede */
    }
  }

  /* ---------- clips de teste ---------- */
  const resetClipForm = () => {
    if (clipPreview) URL.revokeObjectURL(clipPreview)
    setClipTitle('')
    setClipFile(null)
    setClipPreview('')
    setClipDur(null)
    setClipStart('0:00')
    setClipEnd('')
    setClipVis('public')
    setClipProg(-1)
    if (clipInputRef.current) clipInputRef.current.value = ''
  }

  const onClipPick = (f) => {
    if (!f) return
    if (clipPreview) URL.revokeObjectURL(clipPreview)
    setClipFile(f)
    setClipDur(null)
    setClipEnd('')
    setClipPreview(URL.createObjectURL(f))
    setClipMsg('')
    setClipOk(false)
  }

  const onClipMeta = () => {
    const v = clipPreviewRef.current
    if (v && Number.isFinite(v.duration)) {
      setClipDur(v.duration)
      setClipEnd(mmss(v.duration))
    }
  }

  const submitClip = () => {
    setClipMsg('')
    setClipOk(false)
    const t = clipTitle.trim()
    if (!t) return setClipMsg('Dá um título ao clip.')
    if (!clipFile) return setClipMsg('Escolhe um vídeo.')
    const start = parseTime(clipStart) ?? 0
    const end = clipEnd.trim() ? parseTime(clipEnd) : null
    if (clipEnd.trim() && end == null) {
      return setClipMsg('Tempo inválido — usa min:seg (ex.: 1:30).')
    }
    if (end != null && end <= start) return setClipMsg('O fim tem de ser depois do início.')
    if (clipDur && end != null && end > clipDur + 0.5) {
      return setClipMsg('O fim passa a duração do vídeo.')
    }

    const qs = new URLSearchParams({
      title: t,
      visibility: clipVis,
      start: String(start),
      end: end != null ? String(end) : '',
    })

    setClipProg(0)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/clips?${qs}`)
    xhr.setRequestHeader('Content-Type', clipFile.type || 'video/mp4')
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('userToken') || localStorage.getItem('adminToken')}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setClipProg(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setClipProg(-1)
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* resposta inválida */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) {
        resetClipForm()
        setClipOk(true)
        setClipMsg('Clip publicado! Se for o mais recente, já aparece na página inicial.')
        setClips((prev) => [data, ...prev])
      } else {
        setClipMsg((data && data.error) || 'Erro ao enviar o vídeo.')
      }
    }
    xhr.onerror = () => {
      setClipProg(-1)
      setClipMsg('Falha no envio — tenta outra vez.')
    }
    xhr.send(clipFile)
  }

  const deleteClip = async (id) => {
    if (!window.confirm('Eliminar este clip? O vídeo é apagado do servidor.')) return
    try {
      const res = await fetch(`/api/clips/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      if (res.ok) setClips((prev) => prev.filter((c) => c.id !== id))
    } catch {
      /* sem rede */
    }
  }

  const statCards = [
    {
      icon: <Activity className="w-6 h-6" />,
      label: 'Online Agora',
      value: stats?.online || 0,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      label: 'Últimos 15 Dias',
      value: stats?.last15Days || 0,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Últimos 30 Dias',
      value: stats?.last30Days || 0,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      label: 'Último Ano',
      value: stats?.lastYear || 0,
      color: 'text-violet-400',
      bgColor: 'bg-violet-400/10',
    },
  ]

  /* Cartões da visão geral do site */
  const OVERVIEW_CARDS = [
    { key: 'contas', label: 'Contas', Icon: Users, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { key: 'administradores', label: 'Admins', Icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-400/10' },
    { key: 'anuncios', label: 'Anúncios', Icon: StickyNote, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { key: 'comentarios', label: 'Comentários', Icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { key: 'clips', label: 'Clips', Icon: Film, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { key: 'visitas', label: 'Visitas', Icon: Eye, color: 'text-green-400', bg: 'bg-green-400/10' },
    { key: 'distincoes', label: 'Distinções', Icon: Award, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  const inputCls =
    'w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-400 focus:bg-white/15'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0813]/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass rounded-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-500" />
            Painel Admin
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Terminar sessão"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="mb-6">
          <TabBar
            ariaLabel="Secções do painel de administração"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'painel', label: 'Painel', Icon: LayoutDashboard },
              { id: 'utilizadores', label: 'Utilizadores', Icon: Users },
              { id: 'anuncios', label: 'Anúncios', Icon: StickyNote },
              { id: 'stats', label: 'Estatísticas', Icon: BarChart3 },
              { id: 'r6', label: 'Rainbow Six', Icon: Gamepad2 },
              { id: 'ferramentas', label: 'Auditoria', Icon: ScrollText },
            ]}
          />
        </div>

        {tab === 'painel' ? (
          loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <>
              {/* Visão geral de tudo */}
              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {OVERVIEW_CARDS.map((c) => (
                  <div key={c.key} className="glass rounded-xl p-4 text-center">
                    <div
                      className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${c.bg}`}
                    >
                      <c.Icon className={`h-5 w-5 ${c.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {overview ? overview[c.key] ?? 0 : '—'}
                    </div>
                    <div className="text-xs text-gray-400">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Visitantes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                  <div key={stat.label} className="glass rounded-xl p-4 text-center">
                    <div
                      className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center mx-auto mb-3`}
                    >
                      <div className={stat.color}>{stat.icon}</div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stat.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass rounded-xl p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Total de Visitantes</h3>
                <div className="text-4xl font-black gradient-text">
                  {(stats?.total || 0).toLocaleString()}
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-gray-400">
                Os dados são atualizados automaticamente a cada 30 segundos
              </div>
            </>
          )
        ) : tab === 'utilizadores' ? (
          /* ---------- UTILIZADORES: contas + distinções ---------- */
          <div>
            <p className="mb-4 text-xs text-gray-400">
              Clica numa joia para atribuir ou retirar a distinção de qualquer conta — até à tua
              própria.
            </p>

            {usersError && (
              <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                {usersError}
              </p>
            )}

            {/* ----- Pedidos de recuperação de palavra-passe ----- */}
            <div className="glass mb-5 rounded-xl p-4">
              <h3 className="mb-2 flex items-center gap-2 font-bold text-white">
                <KeyRound className="h-4 w-4 text-violet-400" /> Pedidos de recuperação
              </h3>
              {requests.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Ninguém pediu recuperação de palavra-passe. Quando alguém clicar em "Esqueci a
                  pass", o nome aparece aqui.
                </p>
              ) : (
                <ul className="space-y-2">
                  {requests.map((r) => (
                    <li
                      key={`${r.user_id}-${r.created_at}`}
                      className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 px-3 py-2"
                    >
                      <span className="text-sm font-bold text-white">{r.username}</span>
                      <span className="text-[11px] text-gray-400">
                        pedido a {fmtUserDate(r.created_at)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          r.recovery
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-yellow-500/15 text-yellow-400'
                        }`}
                      >
                        {r.recovery ? 'modo recovery ativo' : 'por aprovar'}
                      </span>
                      <button
                        onClick={() =>
                          toggleRecovery(
                            userList.find((x) => Number(x.id) === Number(r.user_id)) || {
                              id: r.user_id,
                              recovery: r.recovery,
                            },
                          )
                        }
                        className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          r.recovery
                            ? 'border border-red-500/40 text-red-400 hover:bg-red-500/15'
                            : 'bg-violet-500 text-white hover:bg-violet-600'
                        }`}
                      >
                        {r.recovery ? 'Desativar recovery' : 'Ativar modo recovery'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                Com o modo recovery ativo, ao entrar no site essa conta aparece sempre no ecrã de
                criar nova palavra-passe — sem email nenhum.
              </p>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500"></div>
              </div>
            ) : userList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-400">
                Ainda não há contas.
              </p>
            ) : (
              <div className="space-y-3">
                {userList.map((u) => (
                  <div key={u.id} className="glass rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-500/20 text-sm font-black text-white">
                        {u.username.slice(0, 2).toUpperCase()}
                        {u.avatar_url && (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="absolute inset-0 h-full w-full rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                          {u.username}
                          {user && Number(user.id) === Number(u.id) && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-400">
                              és tu
                            </span>
                          )}
                          {u.is_admin && (
                            <span className="flex items-center gap-1 rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-400">
                              <ShieldCheck className="h-3 w-3" /> admin
                            </span>
                          )}
                          {u.recovery && (
                            <span className="flex items-center gap-1 rounded-full border border-yellow-500/50 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-yellow-400">
                              <KeyRound className="h-3 w-3" /> recovery
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          ID {u.id} · criada a {fmtUserDate(u.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAdminUser(u)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          u.is_admin
                            ? 'border border-red-500/40 text-red-400 hover:bg-red-500/15'
                            : 'bg-violet-500 text-white hover:bg-violet-600'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {u.is_admin ? 'Retirar admin' : 'Tornar admin'}
                      </button>
                    </div>

                    {/* Email (obrigatório para recuperar a pass) */}
                    <EmailRow
                      user={u}
                      onSaved={(email) =>
                        setUserList((list) =>
                          list.map((x) => (Number(x.id) === Number(u.id) ? { ...x, email } : x)),
                        )
                      }
                    />

                    {/* Distinções manuais */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Distinções
                      </span>
                      {BADGES.map((b) => {
                        const on = u.badges.includes(b.id)
                        return (
                          <button
                            key={b.id}
                            onClick={() => toggleBadge(u, b.id)}
                            title={`${b.label} — ${on ? 'retirar' : 'atribuir'}`}
                            className="rounded-full p-1 transition-all"
                            style={{
                              filter: on ? 'none' : 'grayscale(1) opacity(.35)',
                              boxShadow: on ? `0 0 12px ${b.color}80` : 'none',
                              background: on
                                ? `radial-gradient(circle, ${b.color}22, transparent 70%)`
                                : 'transparent',
                            }}
                          >
                            <BadgeGem badge={b} size={30} />
                          </button>
                        )
                      })}
                    </div>

                    {/* Contas de jogo ligadas a esta conta */}
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Contas de jogo
                        </span>
                        {(u.game_accounts || []).map((a) => (
                          <span
                            key={a.id}
                            className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-gray-200"
                          >
                            <Gamepad2 className="h-3 w-3 text-violet-400" />
                            {gameLabel(a.game)} · {a.nick}
                            <button
                              onClick={() => removeGameAccount(u, a.id)}
                              title="Retirar esta ligação"
                              className="ml-0.5 text-gray-400 transition-colors hover:text-red-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            setOpenUser(openUser === u.id ? null : u.id)
                            setAccForm({ game: 'cs2', nick: '', escolha: '' })
                          }}
                          className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-gray-300 hover:bg-white/20"
                        >
                          {openUser === u.id ? 'Fechar' : 'Ligar conta'}
                        </button>
                      </div>

                      {openUser === u.id && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <select
                            value={accForm.game}
                            onChange={(e) =>
                              setAccForm((f) => ({
                                ...f,
                                game: e.target.value,
                                nick: '',
                                escolha: '',
                              }))
                            }
                            className="rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white outline-none"
                          >
                            {CLIP_GAMES.map((g) => (
                              <option key={g.id} value={g.id} className="bg-[#1b1630]">
                                {g.label}
                              </option>
                            ))}
                          </select>

                          {/* nomes que já aparecem nas estatísticas desse jogo */}
                          <select
                            value={accForm.escolha}
                            onChange={(e) => {
                              const v = e.target.value
                              setAccForm((f) => ({
                                ...f,
                                escolha: v,
                                nick: v === '__outro__' ? '' : v,
                              }))
                            }}
                            title="Jogadores que aparecem nas estatísticas deste jogo"
                            className="min-w-0 max-w-[16rem] flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="" className="bg-[#1b1630]">
                              {nomesJogo.length ? 'Escolhe o jogador…' : 'Sem lista para este jogo'}
                            </option>
                            {nomesJogo.map((n) => (
                              <option key={n} value={n} className="bg-[#1b1630]">
                                {n}
                              </option>
                            ))}
                            <option value="__outro__" className="bg-[#1b1630]">
                              Outro nome / conta secundária…
                            </option>
                          </select>

                          {accForm.escolha === '__outro__' && (
                            <input
                              value={accForm.nick}
                              onChange={(e) => setAccForm((f) => ({ ...f, nick: e.target.value }))}
                              maxLength={40}
                              placeholder="Nick nesse jogo"
                              className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white outline-none placeholder:text-gray-600"
                            />
                          )}

                          <button
                            onClick={() => addGameAccount(u)}
                            disabled={accBusy || !accForm.nick.trim()}
                            className="flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
                          >
                            {accBusy && <Loader2 className="h-3 w-3 animate-spin" />} Ligar
                          </button>
                        </div>
                      )}
                      <p className="mt-1.5 text-[10px] text-gray-400">
                        Os nomes são os que aparecem nas estatísticas de cada jogo (cada jogo tem
                        os seus) e um membro pode ter vários no mesmo jogo. É assim que o TOP 1
                        KILL muda sozinho quando o líder muda.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'anuncios' ? (
          /* ---------- ANÚNCIOS (só admin cria) ---------- */
          <div>
            <div className="glass rounded-xl p-4">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-white">
                <Plus className="h-4 w-4 text-violet-400" /> Novo anúncio
              </h3>
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={150}
                  placeholder="Título"
                  className={inputCls}
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Conteúdo do anúncio…"
                  className={`${inputCls} resize-y`}
                />
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={2000}
                  placeholder="URL de imagem (opcional)"
                  className={inputCls}
                />
                {error && (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                    {error}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={createPost}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2 text-sm font-bold text-white hover:bg-violet-600 disabled:opacity-50"
                  >
                    <StickyNote className="h-4 w-4" />
                    {saving ? 'A guardar…' : 'Publicar anúncio'}
                  </button>
                </div>
              </div>
            </div>

            <h3 className="mb-3 mt-6 font-bold text-white">
              Anúncios existentes ({posts.length})
            </h3>
            {posts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-400">
                Ainda não há anúncios.
              </p>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">{p.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-400">{p.content}</p>
                    </div>
                    <button
                      onClick={() => deletePost(p.id)}
                      title="Eliminar anúncio"
                      className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'r6' ? (
          /* ---------- RAINBOW SIX: atualização manual ---------- */
          <div>
            <div className="glass rounded-xl p-4">
              <h3 className="mb-1 flex items-center gap-2 font-bold text-white">
                <Gamepad2 className="h-4 w-4 text-violet-400" /> Rainbow Six — tracker.gg
              </h3>
              <p className="text-[13px] text-gray-400">
                As estatísticas do esquadrão são atualizadas ao importar o JSON de cada jogador.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-300">
                  atualização manual
                </span>
                {r6?.atualizacoes ? (
                  <span className="text-[11px] font-bold text-gray-400">
                    {r6.atualizacoes} atualizações
                  </span>
                ) : null}
              </div>

              {/* importar JSON guardados um a um */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-1 text-[13px] font-bold text-white">Atualizar estatísticas</p>
                <p className="mb-3 text-[12px] leading-relaxed text-gray-400">
                  Abre a página de cada jogador no tracker.gg e usa <b>Guardar como…</b> (HTML).
                  Escolhe aqui os ficheiros guardados — o site lê os dados e atualiza os números.
                </p>
                <input
                  ref={r6FileRef}
                  type="file"
                  accept=".html,.htm,.json,.txt,text/html,application/json"
                  multiple
                  onChange={importarR6}
                  className="block w-full text-[12px] text-gray-400 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-violet-500 file:px-4 file:py-2 file:text-[12px] file:font-black file:text-white hover:file:bg-violet-400"
                />
                {r6ImportMsg && (
                  <p
                    className={`mt-2 text-[12px] font-bold ${
                      r6ImportMsg.ok ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {r6ImportMsg.texto || r6ImportMsg}
                  </p>
                )}
              </div>
              {r6Msg && <p className="mt-2 text-[13px] font-bold text-red-400">{r6Msg}</p>}
            </div>

            {/* barra de progresso + logs */}
            {(r6ACorrer || (r6?.trabalho?.logs?.length ?? 0) > 0) && (
              <div className="glass mt-4 rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wider">
                  <span className={r6ACorrer ? 'text-emerald-400' : 'text-gray-400'}>
                    {r6ACorrer ? 'A ir buscar…' : 'Última atualização'}
                  </span>
                  <span className="text-gray-400">
                    {r6.trabalho.feitos}/{r6.trabalho.total} jogadores
                  </span>
                </div>

                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{
                      width: `${
                        r6.trabalho.total
                          ? Math.max(6, Math.round((r6.trabalho.feitos / r6.trabalho.total) * 100))
                          : 6
                      }%`,
                    }}
                  />
                </div>

                <div className="scroll-forte max-h-56 space-y-1 overflow-y-auto rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
                  {r6.trabalho.logs.map((lg, i) => (
                    <p key={i} className="text-gray-300">
                      <span className="text-emerald-500">›</span> {lg.l}
                    </p>
                  ))}
                  {r6ACorrer && <p className="text-gray-400">› …</p>}
                </div>
              </div>
            )}

            {/* quem está a ser seguido */}
            <div className="glass mt-4 rounded-xl p-4">
              <h4 className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                Esquadrão · {r6?.jogadores?.length || 0} jogadores
              </h4>
              <ul className="flex flex-wrap gap-2">
                {(r6?.jogadores || []).map((j) => (
                  <li
                    key={j}
                    className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-gray-300"
                  >
                    {j}
                  </li>
                ))}
              </ul>
              {r6?.ultimoErro && (
                <p className="mt-2 text-[12px] text-red-400">{r6.ultimoErro}</p>
              )}
            </div>
          </div>
        ) : tab === 'stats' ? (
          /* ---------- ESTATÍSTICAS ---------- */
          <AdminStats />
        ) : tab === 'ferramentas' ? (
          /* ---------- AUDITORIA DAS FERRAMENTAS WINDOWS ---------- */
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">
                <ScrollText className="mr-1.5 inline h-4 w-4 text-violet-400" />
                Registo de execuções
              </h3>
              <button
                onClick={fetchFerrRuns}
                disabled={ferrLoading}
                className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 transition-colors hover:text-gray-300 disabled:opacity-50"
              >
                <RefreshCcw className={`h-3 w-3 ${ferrLoading ? 'animate-spin' : ''}`} /> atualizar
              </button>
            </div>

            <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[12.5px] leading-relaxed text-gray-400">
              Cada ferramenta que corre no PC fica aqui registada: quem a correu, quando,
              quanto demorou e o que saiu no terminal. Só tu vês este registo.
            </p>

            {ferrErro && (
              <p className="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-[13px] font-bold text-red-400">
                {ferrErro}
              </p>
            )}

            {ferrLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              </div>
            ) : ferrRuns.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Ainda não há execuções registadas.
              </p>
            ) : (
              <div className="space-y-2">
                {ferrRuns.map((r) => {
                  const ini = r.inicio ? new Date(r.inicio) : null
                  const fim = r.fim ? new Date(r.fim) : null
                  const dur =
                    ini && fim ? Math.max(0, Math.round((fim - ini) / 1000)) : null
                  const falhou =
                    Boolean(r.erro) ||
                    (r.codigo != null && r.codigo !== '' && Number(r.codigo) !== 0)
                  return (
                    <div key={r.id} className="glass rounded-xl p-3.5">
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span
                          className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                            r.cancelado ? 'bg-yellow-400' : falhou ? 'bg-red-500' : 'bg-emerald-400'
                          }`}
                        />
                        <span className="font-black text-white">{r.nome || r.ferramenta_id}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400">{r.username || 'admin'}</span>
                        <span className="flex-1" />
                        <span className="text-[11px] text-gray-400">
                          {ini
                            ? ini.toLocaleString('pt-PT', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                          {dur != null ? ` · ${dur}s` : ''}
                        </span>
                      </div>
                      {r.arg && (
                        <p className="mt-1 font-mono text-[11px] text-gray-400">arg: {r.arg}</p>
                      )}
                      {r.cancelado && (
                        <p className="mt-1 text-[12px] font-bold text-yellow-400">
                          Interrompido pelo admin
                        </p>
                      )}
                      {r.erro && (
                        <p className="mt-1.5 text-[12px] font-bold text-red-400">{r.erro}</p>
                      )}
                      {!r.cancelado && (r.codigo_texto || r.codigo != null) && (
                        <p
                          className={`mt-1 text-[12px] font-bold ${
                            falhou ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          Resultado: {r.codigo_texto || `código ${r.codigo}`}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ---------- CLIPS DE TESTE (admin publica direto) ---------- */
          <div>
            <div className="glass rounded-xl p-4">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-white">
                <Film className="h-4 w-4 text-violet-400" /> Novo clip (teste)
              </h3>
              <div className="space-y-3">
                <input
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Título do clip"
                  className={inputCls}
                />

                {/* vídeo escolhido */}
                {!clipPreview ? (
                  <button
                    onClick={() => clipInputRef.current && clipInputRef.current.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/20 px-4 py-8 text-gray-400 transition-colors hover:border-violet-500/60 hover:text-violet-400"
                  >
                    <Upload className="h-7 w-7" />
                    <span className="text-sm font-bold">Escolher vídeo</span>
                    <span className="text-xs text-gray-400">
                      MP4, WebM ou MOV · máx. 150 MB
                    </span>
                  </button>
                ) : (
                  <div>
                    <video
                      ref={clipPreviewRef}
                      src={clipPreview}
                      controls
                      preload="metadata"
                      onLoadedMetadata={onClipMeta}
                      className="max-h-64 w-full rounded-xl bg-black"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="truncate font-semibold text-violet-400">
                        {clipFile?.name}
                      </span>
                      <button
                        onClick={() => clipInputRef.current && clipInputRef.current.click()}
                        className="rounded-full bg-white/10 px-2.5 py-1 font-bold hover:bg-white/20"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={clipInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => onClipPick(e.target.files && e.target.files[0])}
                />

                {/* corte do trecho */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-gray-400">
                      Começa em
                    </span>
                    <input
                      value={clipStart}
                      onChange={(e) => setClipStart(e.target.value)}
                      placeholder="0:00"
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-gray-400">
                      Termina em
                    </span>
                    <input
                      value={clipEnd}
                      onChange={(e) => setClipEnd(e.target.value)}
                      placeholder="0:00"
                      className={inputCls}
                    />
                  </label>
                </div>

                {/* visibilidade */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setClipVis('public')}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      clipVis === 'public'
                        ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    <Globe className="h-4 w-4" /> Público
                  </button>
                  <button
                    onClick={() => setClipVis('private')}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      clipVis === 'private'
                        ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    <Lock className="h-4 w-4" /> Privado
                  </button>
                </div>

                {clipMsg && (
                  <p
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      clipOk ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {clipMsg}
                  </p>
                )}

                {clipProg >= 0 && (
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-violet-500 transition-all"
                      style={{ width: `${clipProg}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-gray-400 underline decoration-dotted hover:text-white"
                  >
                    Ver a página inicial ↗
                  </a>
                  <button
                    onClick={submitClip}
                    disabled={clipProg >= 0}
                    className="flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2 text-sm font-bold text-white hover:bg-violet-600 disabled:opacity-50"
                  >
                    {clipProg >= 0 ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> A enviar {clipProg}%
                      </>
                    ) : (
                      <>
                        <Film className="h-4 w-4" /> Publicar clip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <h3 className="mb-3 mt-6 font-bold text-white">Clips no site ({clips.length})</h3>
            {clips.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-400">
                Ainda não há clips.
              </p>
            ) : (
              <div className="space-y-3">
                {clips.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{c.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {c.author} · {c.visibility === 'private' ? 'privado' : 'público'} ·{' '}
                        {c.downloads || 0} transferências
                      </p>
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir vídeo"
                      className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => deleteClip(c.id)}
                      title="Eliminar clip"
                      className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
