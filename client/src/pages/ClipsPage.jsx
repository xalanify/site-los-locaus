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
  Search,
  Users,
  Gamepad2,
  Calendar,
  Award,
} from 'lucide-react'
import ClipCard from '../components/ClipCard'
import AvatarImg from '../components/AvatarImg'
import { BADGES, BadgeGem } from '../components/BadgeGem'
import { CLIP_GAMES, gameLabel } from '../data/clipGames'
import { authHeaders, mmss, parseTime } from '../lib/auth'

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'publicos', label: 'Públicos' },
  { id: 'meus', label: 'Meus' },
  { id: 'guardados', label: 'Guardados' },
]

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
  const badges = (d?.profile?.badges || []).map((id) => BADGES.find((b) => b.id === id)).filter(Boolean)
  const accounts = d?.profile?.game_accounts || []

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
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
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : !d || !d.found ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-500">
            {state.error || 'Perfil não encontrado.'}
          </p>
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <AvatarImg name={d.profile.username} className="h-14 w-14" />
              <div className="min-w-0">
                <div className="truncate font-display text-xl font-black uppercase text-white">
                  {d.profile.username}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="h-3.5 w-3.5 text-orange-400" />
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
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Clips
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <div className="text-lg font-black text-orange-400">{d.stats?.likes ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Gostos
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 text-center">
                <div className="text-lg font-black text-yellow-400">{d.stats?.downloads ?? 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Transferências
                </div>
              </div>
            </div>

            {/* Contas de jogo ligadas pelo admin */}
            <div className="rounded-2xl bg-white/5 p-4">
              <h3 className="mb-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                <Gamepad2 className="h-4 w-4 text-orange-400" /> Contas de jogo
              </h3>
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-500">Ainda sem contas de jogo associadas.</p>
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
              <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                <Award className="h-4 w-4 text-orange-400" /> Distinções
              </h3>
              {badges.length === 0 ? (
                <p className="text-sm text-gray-500">Ainda sem distinções.</p>
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
              <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                <Film className="h-4 w-4 text-orange-400" /> Clips
              </h3>
              {d.clips.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-gray-500">
                  Ainda não há clips para ver.
                </p>
              ) : (
                <div className="space-y-5">
                  {d.clips.map((c) => (
                    <ClipCard
                      key={c.id}
                      clip={c}
                      user={user}
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
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [showForm, setShowForm] = useState(false)

  // lista lateral de membros (online/offline + pesquisa)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [member, setMember] = useState(null) // perfil público aberto

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
  const [error, setError] = useState('')
  const previewRef = useRef(null)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clips', { headers: authHeaders() })
      if (res.ok) setClips(await res.json())
    } catch {
      /* sem rede */
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/users/list', { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setMembers(d.users || [])
      }
    } catch {
      /* sem rede */
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadMembers()
    const t = setInterval(loadMembers, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Chegada com um membro escolhido (ex.: clique no autor de um clip)
  useEffect(() => {
    const m = location.state && location.state.member
    if (m) setMember(m)
  }, [location.state])

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
    if (fileRef.current) fileRef.current.value = ''
  }

  const onPick = (f) => {
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setDuration(null)
    setEndStr('')
    setPreview(URL.createObjectURL(f))
  }

  const onPreviewMeta = () => {
    const v = previewRef.current
    if (v && Number.isFinite(v.duration)) {
      setDuration(v.duration)
      setEndStr(mmss(v.duration))
    }
  }

  const submit = () => {
    setError('')
    const trimmed = title.trim()
    if (!trimmed) return setError('Dá um título ao clip.')
    if (!game) return setError('Escolhe o jogo do clip.')
    if (!file) return setError('Escolhe um vídeo.')
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

    setProgress(0)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/clips?${qs}`)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    const token = localStorage.getItem('userToken')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
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
      setProgress(-1)
      setError('Falha no envio — tenta outra vez.')
    }
    xhr.send(file)
  }

  const filtered = clips.filter((c) => {
    if (tab === 'publicos') return c.visibility === 'public'
    if (tab === 'meus') return c.mine
    if (tab === 'guardados') return c.saved
    return true
  })

  const shownMembers = members.filter((m) =>
    m.username.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const tabChip = (t) => (
    <button
      key={t.id}
      onClick={() => setTab(t.id)}
      className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        tab === t.id
          ? 'bg-orange-500 text-white'
          : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
      }`}
    >
      {t.label}
    </button>
  )

  const emptyMsg = {
    todos: 'Ainda não há clips.',
    publicos: 'Ainda não há clips públicos.',
    meus: 'Ainda não publicaste clips.',
    guardados: 'Ainda não guardaste clips.',
  }[tab]

  return (
    <section className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        {/* ---------------- Conteúdo ---------------- */}
        <div className="min-w-0 flex-1">
          {/* Cabeçalho */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1
              className="font-black gradient-text"
              style={{ fontSize: 'clamp(1.7rem, 6vw, 2.6rem)' }}
            >
              Clips e Publicações
            </h1>
            <button
              onClick={openForm}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" /> Publicar clip
            </button>
          </div>

          {/* Formulário */}
          {showForm && user && (
            <div className="glass mb-6 rounded-2xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-white">
                  <Film className="h-5 w-5 text-orange-400" /> Novo clip
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

              <div className="space-y-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Título do clip"
                  className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15"
                />

                {/* jogo do clip — obrigatório */}
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-gray-500">
                    Jogo do clip <span className="text-orange-400">*</span>
                  </span>
                  <select
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white outline-none focus:bg-white/15"
                  >
                    <option value="" className="bg-[#131316]">
                      Escolhe o jogo…
                    </option>
                    {CLIP_GAMES.map((g) => (
                      <option key={g.id} value={g.id} className="bg-[#131316]">
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* vídeo escolhido */}
                {!preview ? (
                  <button
                    onClick={() => fileRef.current && fileRef.current.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/20 px-4 py-8 text-gray-400 transition-colors hover:border-orange-500/60 hover:text-orange-400"
                  >
                    <Upload className="h-7 w-7" />
                    <span className="text-sm font-bold">Escolher vídeo</span>
                    <span className="text-xs text-gray-500">MP4, WebM ou MOV · máx. 150 MB</span>
                  </button>
                ) : (
                  <div>
                    <video
                      ref={previewRef}
                      src={preview}
                      controls
                      preload="metadata"
                      onLoadedMetadata={onPreviewMeta}
                      className="max-h-72 w-full rounded-xl bg-black"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="truncate font-semibold text-orange-400">{file?.name}</span>
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

                {/* corte do trecho */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-gray-500">
                      Começa em
                    </span>
                    <input
                      value={startStr}
                      onChange={(e) => setStartStr(e.target.value)}
                      placeholder="0:00"
                      className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:bg-white/15"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-gray-500">
                      Termina em
                    </span>
                    <input
                      value={endStr}
                      onChange={(e) => setEndStr(e.target.value)}
                      placeholder={duration != null ? mmss(duration) : 'fim do vídeo'}
                      className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:bg-white/15"
                    />
                  </label>
                </div>

                {/* visibilidade */}
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

                {error && (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                    {error}
                  </p>
                )}

                {progress >= 0 && (
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-white/20"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submit}
                    disabled={progress >= 0}
                    className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
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
          )}

          {/* Filtros */}
          <div className="mb-5 flex flex-wrap gap-2">
            {TABS.filter((t) => user || (t.id !== 'meus' && t.id !== 'guardados')).map(tabChip)}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-9 w-9 animate-spin text-orange-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-4 py-14 text-center text-gray-500">
              <Film className="mx-auto mb-3 h-9 w-9 opacity-50" />
              {emptyMsg}
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((c) => (
                <ClipCard
                  key={c.id}
                  clip={c}
                  user={user}
                  onRequestAuth={onRequestAuth}
                  onProfile={onProfile}
                  onUpdate={(next) =>
                    setClips((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                  }
                  onDelete={(id) => setClips((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------------- Membros (online/offline) ---------------- */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="glass rounded-2xl p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-white">
              <Users className="h-4 w-4 text-orange-400" /> Membros
              <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-gray-400">
                {members.length}
              </span>
            </h2>

            {/* Pesquisa */}
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar membro…"
                maxLength={30}
                className="w-full rounded-xl bg-white/10 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15"
              />
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : shownMembers.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">Nenhum membro encontrado.</p>
            ) : (
              <ul className="max-h-[24rem] space-y-1 overflow-y-auto pr-1">
                {shownMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setMember(m.username)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10"
                      title={`Ver o perfil de ${m.username}`}
                    >
                      <span className="relative shrink-0">
                        <AvatarImg name={m.username} src={m.avatar_url} className="h-8 w-8" />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#131316] ${
                            m.online ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                          title={m.online ? 'Online' : 'Offline'}
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                        {m.username}
                      </span>
                      {m.badges.slice(0, 3).map((id) => {
                        const b = BADGES.find((x) => x.id === id)
                        return b ? <BadgeGem key={b.id} badge={b} size={15} /> : null
                      })}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500">
              <span className="h-2 w-2 rounded-full bg-green-500" /> online ·{' '}
              <span className="h-2 w-2 rounded-full bg-gray-600" /> offline
            </p>
          </div>
        </aside>
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
    </section>
  )
}
