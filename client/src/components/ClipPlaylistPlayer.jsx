import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ListVideo, Music } from 'lucide-react'
import { videoComecou, videoParou } from '../lib/musicaPerfil'

const mmss = (s) => {
  const n = Math.max(0, Number(s) || 0)
  const m = Math.floor(n / 60)
  const seg = Math.floor(n % 60)
  return `${m}:${String(seg).padStart(2, '0')}`
}

/* Player de uma publicação com vários clips + música de fundo.
   Toca cada clip no intervalo escolhido e passa ao seguinte. */
export default function ClipPlaylistPlayer({ items, musicUrl, volume = 0.25, onPlay }) {
  const lista = Array.isArray(items) ? items.filter((i) => i && (i.url || i.remoto)) : []
  const [idx, setIdx] = useState(0)
  const [aTocar, setATocar] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const musicaAtiva = useRef(false)
  const aMudar = useRef(false)
  const atual = lista[idx] || null

  useEffect(() => {
    if (idx >= lista.length) setIdx(0)
  }, [lista.length, idx])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !atual) return
    const start = Number(atual.start) || 0
    try {
      if (v.readyState >= 1) v.currentTime = start
    } catch {
      /* ainda sem metadados */
    }
    if (aTocar) v.play().catch(() => {})
  }, [idx, atual, aTocar])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = Math.max(0, Math.min(1, Number(volume) || 0))
  }, [volume, musicUrl])

  const pararMusica = () => {
    const eraAtiva = musicaAtiva.current
    if (audioRef.current) audioRef.current.pause()
    musicaAtiva.current = false
    if (eraAtiva) videoParou()
  }

  const tocarMusica = () => {
    if (!audioRef.current || !musicUrl) return
    audioRef.current.volume = Math.max(0, Math.min(1, Number(volume) || 0))
    audioRef.current.play().catch(() => {})
    musicaAtiva.current = true
    videoComecou()
  }

  const mudarItem = (proximo) => {
    if (!lista.length) return
    const i = (proximo + lista.length) % lista.length
    aMudar.current = true
    setIdx(i)
    setTimeout(() => {
      aMudar.current = false
    }, 800)
  }

  const onPlayVideo = () => {
    setATocar(true)
    tocarMusica()
    if (onPlay) onPlay()
    window.dispatchEvent(new CustomEvent('locaus:clip-play', { detail: { id: 'playlist' } }))
    document.querySelectorAll('video').forEach((v) => {
      if (v !== videoRef.current && !v.paused) v.pause()
    })
  }

  const onPauseVideo = () => {
    if (aMudar.current) return
    setATocar(false)
    pararMusica()
  }

  if (!atual) return null

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black">
      <div className="relative">
        <video
          key={`${atual.id || idx}-${idx}`}
          ref={videoRef}
          src={atual.url || undefined}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const start = Number(atual.start) || 0
            if (start > 0) {
              try {
                e.currentTarget.currentTime = start
              } catch {
                /* ignora */
              }
            }
          }}
          onTimeUpdate={(e) => {
            const end = atual.end == null ? null : Number(atual.end)
            if (end != null && e.currentTarget.currentTime >= end - 0.06) {
              if (idx + 1 < lista.length) mudarItem(idx + 1)
              else {
                e.currentTarget.pause()
                e.currentTarget.currentTime = Number(atual.start) || 0
              }
            }
          }}
          onPlay={onPlayVideo}
          onPause={onPauseVideo}
          onEnded={() => {
            if (idx + 1 < lista.length) mudarItem(idx + 1)
            else {
              setATocar(false)
              pararMusica()
            }
          }}
          className="max-h-[65vh] w-full bg-black"
        />
        {lista.length > 1 && (
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
            <ListVideo className="h-3 w-3 text-violet-300" /> {idx + 1}/{lista.length}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-2.5 py-2">
        {lista.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => mudarItem(idx - 1)}
              className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
              title="Clip anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mudarItem(idx + 1)}
              className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
              title="Clip seguinte"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-300">
          {atual.title || `Clip ${idx + 1}`}
          {atual.end != null && (
            <span className="ml-1 text-gray-500">
              · {mmss(atual.start)}–{mmss(atual.end)}
            </span>
          )}
        </span>
        {musicUrl && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-violet-300">
            <Music className="h-3 w-3" /> música
          </span>
        )}
      </div>

      {musicUrl && (
        <audio ref={audioRef} src={musicUrl} loop preload="none" className="hidden" />
      )}
    </div>
  )
}
