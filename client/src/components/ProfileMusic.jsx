import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Music2, Pause, Play, Volume2 } from 'lucide-react'
import { musicaDe } from '../data/temasPerfil'

/* Música do perfil: começa sozinha (vol. baixo), com controles
   flutuantes no canto inferior direito. */
export default function ProfileMusic({ musicaId }) {
  const musica = musicaDe(musicaId)
  const audioRef = useRef(null)
  const [aTocar, setATocar] = useState(false)
  const [volume, setVolume] = useState(0.12)
  const [bloqueado, setBloqueado] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !musica) return
    audio.volume = volume
    audio.loop = true
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
    // só muda quando a música escolhida muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musica?.id])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  if (!musica) return null

  const alternar = () => {
    const audio = audioRef.current
    if (!audio) return
    if (aTocar) {
      audio.pause()
      setATocar(false)
    } else {
      audio
        .play()
        .then(() => {
          setATocar(true)
          setBloqueado(false)
        })
        .catch(() => setBloqueado(true))
    }
  }

  return (
    <>
      <audio ref={audioRef} src={musica.ficheiro} preload="auto" loop />
      {createPortal(
      <div className="fixed bottom-24 right-3 z-[100] flex items-center gap-2 rounded-2xl border border-white/15 bg-[#0b0716]/90 px-2.5 py-2 shadow-2xl shadow-black/50 backdrop-blur-md sm:right-5 lg:bottom-5">
        <button
          type="button"
          onClick={alternar}
          title={aTocar ? 'Pausar música' : 'Tocar música'}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--perfil-accent, #8b5cf6)' }}
        >
          {aTocar ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
            <Music2 className="h-3 w-3 text-violet-300" /> {musica.nome}
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
              style={{ accentColor: 'var(--perfil-accent, #8b5cf6)' }}
              title="Volume"
            />
          </div>
          {bloqueado && (
            <p className="text-[9px] font-semibold text-amber-300">Clica no play para ouvir</p>
          )}
        </div>
      </div>,
      document.body,
      )}
    </>
  )
}
