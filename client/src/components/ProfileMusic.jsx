import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Music2, Pause, Play, Volume2 } from 'lucide-react'
import { musicaDe } from '../data/temasPerfil'

/* Música do perfil: ficheiro local ou música do YouTube servida pelo
   nosso proxy (/api/musica/stream) — sem anúncios e com corte
   (começa em `musicaInicio` e repete até `musicaFim`).
   Se o proxy não estiver disponível (ex.: servidor sem yt-dlp),
   cai para o player do YouTube. */
export default function ProfileMusic({
  musicaId,
  musicaUrl,
  musicaNome,
  musicaInicio,
  musicaFim,
}) {
  const musica = musicaDe(musicaId)
  const ytId = (() => {
    const m = /^yt:([A-Za-z0-9_-]{11})$/.exec(String(musicaUrl || ''))
    return m ? m[1] : null
  })()
  const inicio = ytId ? Math.max(0, Number(musicaInicio) || 0) : 0
  const fim = ytId ? Math.max(0, Number(musicaFim) || 0) : 0
  const comInicio = inicio > 0
  const comFim = fim > inicio
  const nome = ytId ? musicaNome || 'Música do YouTube' : musica?.nome || ''
  const src = ytId ? `/api/musica/stream/${ytId}` : musica?.ficheiro || ''

  const audioRef = useRef(null)
  const ytBox = useRef(null)
  const ytRef = useRef(null)
  const [modo, setModo] = useState('audio') // audio | youtube
  const [aTocar, setATocar] = useState(false)
  const [volume, setVolume] = useState(0.12)
  const [bloqueado, setBloqueado] = useState(false)
  const [ytPronto, setYtPronto] = useState(false)

  /* áudio (ficheiro local ou proxy) */
  useEffect(() => {
    if (modo !== 'audio') return
    const audio = audioRef.current
    if (!audio || !src) return
    audio.volume = volume
    audio.loop = !comInicio
    setBloqueado(false)
    const tentar = audio.play()
    if (tentar && tentar.catch) {
      tentar
        .then(() => setATocar(true))
        .catch(() => {
          setATocar(false)
          setBloqueado(true)
        })
    }
    return () => {
      try {
        audio.pause()
      } catch {
        /* nada */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, inicio, fim, modo])

  /* player do YouTube (alternativa quando o proxy falha) */
  useEffect(() => {
    if (modo !== 'youtube' || !ytId || !ytBox.current) return
    let vivo = true
    const criar = () => {
      if (!vivo || !ytBox.current || !window.YT || !window.YT.Player) return
      try {
        ytRef.current = new window.YT.Player(ytBox.current, {
          videoId: ytId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            loop: comInicio ? 0 : 1,
            ...(comInicio ? {} : { playlist: ytId }),
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (!vivo) return
              setYtPronto(true)
              try {
                e.target.setVolume(Math.round(volume * 100))
                if (comInicio) e.target.seekTo(inicio, true)
                e.target.playVideo()
              } catch {
                /* autoplay bloqueado */
              }
            },
            onStateChange: (e) => {
              if (!vivo) return
              setATocar(e.data === 1)
              if (e.data === 1) setBloqueado(false)
              if (e.data === 0 && comInicio) {
                try {
                  e.target.seekTo(inicio, true)
                  e.target.playVideo()
                } catch {
                  /* nada */
                }
              }
            },
          },
        })
      } catch {
        /* player ainda não disponível */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, ytId, comInicio, inicio])

  /* no modo YouTube, mantém o trecho em loop */
  useEffect(() => {
    if (modo !== 'youtube' || !comFim) return
    const t = setInterval(() => {
      const p = ytRef.current
      if (!p || !p.getCurrentTime) return
      const agora = Number(p.getCurrentTime()) || 0
      if (agora >= fim) {
        try {
          p.seekTo(inicio, true)
        } catch {
          /* nada */
        }
      }
    }, 500)
    return () => clearInterval(t)
  }, [modo, comFim, inicio, fim])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    try {
      if (ytRef.current && ytRef.current.setVolume) ytRef.current.setVolume(Math.round(volume * 100))
    } catch {
      /* nada */
    }
  }, [volume])

  /* pausa a música enquanto há um vídeo a tocar */
  useEffect(() => {
    const estava = { atual: false }
    const aoComecarVideo = () => {
      if (modo === 'youtube') {
        try {
          if (ytRef.current && ytRef.current.getPlayerState && ytRef.current.getPlayerState() === 1) {
            estava.atual = true
            ytRef.current.pauseVideo()
            setATocar(false)
          }
        } catch {
          /* nada */
        }
        return
      }
      const audio = audioRef.current
      if (!audio) return
      if (!audio.paused) {
        estava.atual = true
        audio.pause()
        setATocar(false)
      }
    }
    const aoPararVideo = () => {
      if (!estava.atual) return
      estava.atual = false
      if (modo === 'youtube') {
        try {
          ytRef.current && ytRef.current.playVideo()
          setATocar(true)
        } catch {
          /* nada */
        }
        return
      }
      const audio = audioRef.current
      if (!audio) return
      audio
        .play()
        .then(() => setATocar(true))
        .catch(() => setBloqueado(true))
    }
    window.addEventListener('locaus:video-play', aoComecarVideo)
    window.addEventListener('locaus:video-stop', aoPararVideo)
    return () => {
      window.removeEventListener('locaus:video-play', aoComecarVideo)
      window.removeEventListener('locaus:video-stop', aoPararVideo)
    }
  }, [modo])

  if (!musica && !ytId) return null

  const alternar = () => {
    if (modo === 'youtube') {
      try {
        if (!ytPronto) {
          setBloqueado(true)
          return
        }
        if (aTocar) {
          ytRef.current.pauseVideo()
          setATocar(false)
        } else {
          ytRef.current.playVideo()
          setATocar(true)
          setBloqueado(false)
        }
      } catch {
        setBloqueado(true)
      }
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (aTocar) {
      audio.pause()
      setATocar(false)
      return
    }
    try {
      if (comInicio && (audio.currentTime < inicio || (comFim && audio.currentTime >= fim))) {
        audio.currentTime = inicio
      }
    } catch {
      /* nada */
    }
    audio
      .play()
      .then(() => {
        setATocar(true)
        setBloqueado(false)
      })
      .catch(() => setBloqueado(true))
  }

  return (
    <>
      {modo === 'audio' ? (
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          loop={!comInicio}
          onLoadedMetadata={(e) => {
            const a = e.currentTarget
            if (comInicio && inicio < a.duration) {
              try {
                a.currentTime = inicio
              } catch {
                /* nada */
              }
            }
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget
            if (comFim && !a.paused && a.currentTime >= fim) {
              try {
                a.currentTime = inicio
              } catch {
                /* nada */
              }
            }
          }}
          onPlay={() => setATocar(true)}
          onPause={() => setATocar(false)}
          onEnded={(e) => {
            const a = e.currentTarget
            if (comInicio) {
              try {
                a.currentTime = inicio
                a.play().catch(() => setATocar(false))
              } catch {
                setATocar(false)
              }
              return
            }
            setATocar(false)
          }}
          onError={() => {
            // Proxy indisponível (ex.: servidor sem yt-dlp) -> player do YouTube
            if (ytId) setModo('youtube')
          }}
        />
      ) : (
        <div className="pointer-events-none fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden">
          <div ref={ytBox} />
        </div>
      )}
      {createPortal(
        <div className="pf-music fixed bottom-24 right-3 z-[100] flex items-center gap-2 rounded-2xl border border-white/15 bg-[#0b0b0c]/90 px-2.5 py-2 shadow-2xl shadow-black/50 backdrop-blur-md sm:right-5 lg:bottom-5">
          <button
            type="button"
            onClick={alternar}
            title={aTocar ? 'Pausar música' : 'Tocar música'}
            className="pf-music-play grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#1a0f0f] transition-opacity hover:opacity-90"
            style={{ background: 'var(--salmon, #ff9e9e)' }}
          >
            {aTocar ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
              <Music2 className="h-3 w-3 text-zinc-300" /> {nome}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-20 cursor-pointer"
                style={{ accentColor: 'var(--salmon, #ff9e9e)' }}
                title="Volume"
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
