import { useEffect, useRef, useState } from 'react'
import { Loader2, Music2, Pause, Play, Search, Scissors, X } from 'lucide-react'
import { authHeaders } from '../lib/auth'

const fmtTempo = (s) => {
  const n = Math.max(0, Math.round(Number(s) || 0))
  const m = Math.floor(n / 60)
  return `${m}:${String(n % 60).padStart(2, '0')}`
}

const idDaMusica = (url) => {
  const m = /^yt:([A-Za-z0-9_-]{11})$/.exec(String(url || ''))
  return m ? m[1] : null
}

/* Pesquisa de música: procura no YouTube (yt-dlp/Piped/API),
   pré-visualiza o áudio e deixa cortar o trecho. */
export default function AdminMusica({ form, setForm }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const audioRef = useRef(null)
  const ytBox = useRef(null)
  const ytRef = useRef(null)
  const inicioRef = useRef(0)
  const [modo, setModo] = useState('audio') // audio | youtube
  const [tocando, setTocando] = useState(false)
  const [atual, setAtual] = useState(0)
  const [duracao, setDuracao] = useState(0)
  const [pronto, setPronto] = useState(false)
  const [trecho, setTrecho] = useState(false)

  const id = idDaMusica(form.musica_url)
  const inicio = Math.max(0, Number(form.musica_inicio) || 0)
  const fim = Math.max(0, Number(form.musica_fim) || 0)

  useEffect(() => {
    inicioRef.current = inicio
  }, [inicio])

  useEffect(() => {
    setTocando(false)
    setAtual(0)
    setPronto(false)
    setDuracao(0)
    setTrecho(false)
    setErro('')
    setModo('audio')
  }, [id])

  const procurar = async (e) => {
    e?.preventDefault()
    const texto = q.trim()
    if (!texto) return
    setLoading(true)
    setErro('')
    try {
      const r = await fetch(`/api/musica/search?q=${encodeURIComponent(texto)}`, {
        headers: authHeaders(),
        cache: 'no-store',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Não foi possível pesquisar.')
      setResultados(Array.isArray(d.resultados) ? d.resultados : [])
      if (!d.resultados || !d.resultados.length) setErro('Sem resultados para essa pesquisa.')
    } catch (err) {
      setResultados([])
      setErro(err.message || 'Não foi possível pesquisar.')
    } finally {
      setLoading(false)
    }
  }

  const escolher = (m) => {
    setForm((f) => ({
      ...f,
      musica_id: '',
      musica_url: `yt:${m.id}`,
      musica_nome: m.titulo,
      musica_inicio: 0,
      musica_fim: 0,
    }))
    setDuracao(Number(m.duracao) || 0)
  }

  const remover = () => {
    setForm((f) => ({ ...f, musica_url: '', musica_nome: '', musica_inicio: 0, musica_fim: 0 }))
  }

  /* player do YouTube (alternativa quando o proxy de áudio não existe) */
  useEffect(() => {
    if (modo !== 'youtube' || !id) return
    let vivo = true
    const criar = () => {
      if (!vivo || !ytBox.current || !window.YT || !window.YT.Player) return
      try {
        ytRef.current = new window.YT.Player(ytBox.current, {
          videoId: id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (!vivo) return
              setPronto(true)
              const dur = Number(e.target.getDuration()) || 0
              setDuracao(dur)
              if (inicioRef.current > 0 && inicioRef.current < dur) {
                e.target.seekTo(inicioRef.current, true)
                setAtual(inicioRef.current)
              }
              try {
                e.target.playVideo()
              } catch {
                /* autoplay bloqueado */
              }
            },
            onStateChange: (e) => setTocando(e.data === 1),
            onError: () => setErro('Esta música não pode ser tocada aqui. Tenta outra.'),
          },
        })
      } catch {
        setErro('Não foi possível abrir o player do YouTube.')
      }
    }
    if (window.YT && window.YT.Player) criar()
    else {
      const antigo = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (antigo) antigo()
        criar()
      }
      if (!document.querySelector('script[data-locaus-yt]')) {
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        s.dataset.locausYt = '1'
        document.body.appendChild(s)
      }
    }
    return () => {
      vivo = false
      try {
        if (ytRef.current && ytRef.current.destroy) ytRef.current.destroy()
      } catch {
        /* nada */
      }
      ytRef.current = null
    }
  }, [modo, id])

  /* relógio do player do YouTube */
  useEffect(() => {
    if (modo !== 'youtube') return
    const t = setInterval(() => {
      const p = ytRef.current
      if (!p || !p.getCurrentTime) return
      const agora = Number(p.getCurrentTime()) || 0
      setAtual(agora)
      if (trecho && fim > inicio && agora >= fim) {
        try {
          p.pauseVideo()
          p.seekTo(inicio, true)
        } catch {
          /* nada */
        }
        setAtual(inicio)
        setTocando(false)
        setTrecho(false)
      }
    }, 500)
    return () => clearInterval(t)
  }, [modo, trecho, inicio, fim])

  const alternar = async () => {
    if (modo === 'youtube') {
      const p = ytRef.current
      if (!p) return
      try {
        if (tocando) {
          p.pauseVideo()
          setTocando(false)
        } else {
          p.playVideo()
          setTocando(true)
          setErro('')
        }
      } catch {
        setErro('Não foi possível controlar o player.')
      }
      return
    }
    const a = audioRef.current
    if (!a) return
    if (!a.paused) {
      a.pause()
      setTocando(false)
      return
    }
    try {
      await a.play()
      setTocando(true)
      setErro('')
    } catch {
      setErro('O browser bloqueou o áudio. Toca outra vez no play.')
    }
  }

  const ouvirTrecho = async () => {
    if (modo === 'youtube') {
      const p = ytRef.current
      if (!p) return
      try {
        p.seekTo(inicio, true)
        setAtual(inicio)
        setTrecho(true)
        p.playVideo()
        setTocando(true)
        setErro('')
      } catch {
        setErro('Não foi possível tocar este trecho.')
      }
      return
    }
    const a = audioRef.current
    if (!a) return
    try {
      a.currentTime = inicio
      setAtual(inicio)
      setTrecho(true)
      await a.play()
      setTocando(true)
      setErro('')
    } catch {
      setErro('O browser bloqueou o áudio. Toca outra vez no play.')
    }
  }

  const aoTempo = () => {
    const a = audioRef.current
    if (!a) return
    setAtual(a.currentTime)
    if (trecho && fim > inicio && a.currentTime >= fim) {
      a.pause()
      a.currentTime = inicio
      setAtual(inicio)
      setTocando(false)
      setTrecho(false)
    }
  }

  const marcarInicio = () => {
    const a = audioRef.current
    const t = Math.floor(modo === 'youtube' ? atual : (a && a.currentTime) || 0)
    setForm((f) => ({
      ...f,
      musica_inicio: t,
      musica_fim: Number(f.musica_fim) > t ? Number(f.musica_fim) : 0,
    }))
  }

  const marcarFim = () => {
    const a = audioRef.current
    const t = Math.floor(modo === 'youtube' ? atual : (a && a.currentTime) || 0)
    setForm((f) => ({ ...f, musica_fim: t > (Number(f.musica_inicio) || 0) ? t : 0 }))
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
        Pesquisar música
      </p>

      <form onSubmit={procurar} className="mt-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: GTA 5 theme, COD WaW…"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-amber-400/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-black hover:bg-amber-400 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {loading ? 'A procurar' : 'Procurar'}
        </button>
      </form>

      {erro && <p className="mt-2 text-[11px] font-semibold text-red-300">{erro}</p>}

      {resultados.length > 0 && (
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
          {resultados.map((m) => {
            const escolhida = id === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => escolher(m)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  escolhida ? 'bg-amber-400/15 ring-1 ring-amber-400/40' : 'hover:bg-white/10'
                }`}
              >
                {m.thumb && (
                  <img
                    src={m.thumb}
                    alt=""
                    loading="lazy"
                    className="h-9 w-14 shrink-0 rounded object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-white">{m.titulo}</span>
                  <span className="block truncate text-[10px] text-gray-500">
                    {m.canal}
                    {m.duracao ? ` · ${fmtTempo(m.duracao)}` : ''}
                  </span>
                </span>
                {escolhida && <span className="shrink-0 text-[9px] font-black text-amber-300">ESCOLHIDA</span>}
              </button>
            )
          })}
        </div>
      )}

      {id && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alternar}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500 text-black hover:bg-amber-400"
              title={tocando ? 'Pausar' : 'Ouvir'}
            >
              {tocando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[11px] font-bold text-white">
                <Music2 className="h-3 w-3 shrink-0 text-amber-300" />
                <span className="truncate">{form.musica_nome || 'Música escolhida'}</span>
              </p>
              <p className="text-[10px] text-gray-500">
                {fmtTempo(atual)} / {duracao ? fmtTempo(duracao) : '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={remover}
              className="shrink-0 rounded-lg p-1 text-red-300 hover:bg-white/10 hover:text-red-200"
              title="Remover música"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <audio
            ref={audioRef}
            src={`/api/musica/stream/${id}`}
            preload="metadata"
            onLoadedMetadata={(e) => {
              const a = e.currentTarget
              setPronto(true)
              setDuracao(Number.isFinite(a.duration) ? a.duration : 0)
              if (inicio > 0 && inicio < a.duration) {
                a.currentTime = inicio
                setAtual(inicio)
              }
            }}
            onTimeUpdate={aoTempo}
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onEnded={() => {
              setTocando(false)
              setTrecho(false)
            }}
            onError={() => {
              // Sem proxy de áudio (ex.: servidor na nuvem) -> player do YouTube
              setErro('')
              setModo('youtube')
            }}
            className="hidden"
          />

          {modo === 'youtube' && (
            <div className="pointer-events-none fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden">
              <div ref={ytBox} />
            </div>
          )}

          <input
            type="range"
            min="0"
            max={Math.max(1, Math.floor(duracao) || 1)}
            step="1"
            value={Math.min(atual, Math.floor(duracao) || 1)}
            onChange={(e) => {
              const t = Number(e.target.value)
              if (modo === 'youtube') {
                try {
                  ytRef.current && ytRef.current.seekTo(t, true)
                } catch {
                  /* nada */
                }
              } else {
                const a = audioRef.current
                if (a) a.currentTime = t
              }
              setAtual(t)
            }}
            disabled={!pronto}
            className="mt-2 h-1 w-full cursor-pointer"
            style={{ accentColor: '#fbbf24' }}
            title="Posição"
          />

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
              <span className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-400">
                Início <b className="text-amber-300">{fmtTempo(inicio)}</b>
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(1, Math.floor(duracao) || 1)}
                step="1"
                value={Math.min(inicio, Math.floor(duracao) || 1)}
                onChange={(e) =>
                  setForm((f) => {
                    const v = Number(e.target.value)
                    return {
                      ...f,
                      musica_inicio: v,
                      musica_fim: Number(f.musica_fim) > v ? Number(f.musica_fim) : 0,
                    }
                  })
                }
                disabled={!pronto}
                className="mt-1 h-1 w-full cursor-pointer"
                style={{ accentColor: '#fbbf24' }}
              />
              <button
                type="button"
                onClick={marcarInicio}
                className="mt-1 w-full rounded bg-white/10 px-1.5 py-1 text-[9px] font-bold text-white hover:bg-white/15"
              >
                Usar o momento atual
              </button>
            </label>

            <label className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
              <span className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-400">
                Fim <b className="text-amber-300">{fim ? fmtTempo(fim) : 'até ao fim'}</b>
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(1, Math.floor(duracao) || 1)}
                step="1"
                value={Math.min(fim, Math.floor(duracao) || 1)}
                onChange={(e) =>
                  setForm((f) => {
                    const v = Number(e.target.value)
                    return { ...f, musica_fim: v > (Number(f.musica_inicio) || 0) ? v : 0 }
                  })
                }
                disabled={!pronto}
                className="mt-1 h-1 w-full cursor-pointer"
                style={{ accentColor: '#fbbf24' }}
              />
              <button
                type="button"
                onClick={marcarFim}
                className="mt-1 w-full rounded bg-white/10 px-1.5 py-1 text-[9px] font-bold text-white hover:bg-white/15"
              >
                Usar o momento atual
              </button>
            </label>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={ouvirTrecho}
              disabled={!pronto}
              className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
            >
              <Scissors className="h-3 w-3" />
              {fim
                ? `Ouvir ${fmtTempo(inicio)} → ${fmtTempo(fim)}`
                : inicio
                  ? `Ouvir de ${fmtTempo(inicio)}`
                  : 'Ouvir do início'}
            </button>
            {(inicio > 0 || fim > 0) && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, musica_inicio: 0, musica_fim: 0 }))}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-gray-300 hover:bg-white/10"
              >
                Limpar corte
              </button>
            )}
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            {modo === 'youtube'
              ? 'Pré-visualização pelo YouTube (pode ter anúncios). O perfil toca só o trecho escolhido, em loop.'
              : 'O perfil toca só este trecho, em loop. O áudio vem completo (sem anúncios) e funciona no PC e no telemóvel.'}
          </p>
        </div>
      )}
    </div>
  )
}
