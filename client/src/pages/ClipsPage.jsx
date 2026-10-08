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
} from 'lucide-react'
import ClipCard from '../components/ClipCard'
import { authHeaders, mmss, parseTime } from '../lib/auth'

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'publicos', label: 'Públicos' },
  { id: 'meus', label: 'Meus' },
  { id: 'guardados', label: 'Guardados' },
]

export default function ClipsPage({ user, onRequestAuth, onProfile }) {
  const location = useLocation()
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [showForm, setShowForm] = useState(false)

  // formulário
  const [title, setTitle] = useState('')
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

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
      <div className="mx-auto max-w-3xl">
        {/* Cabeçalho */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1
            className="font-black gradient-text"
            style={{ fontSize: 'clamp(1.7rem, 6vw, 2.6rem)' }}
          >
            Publicações (Clips)
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
    </section>
  )
}
