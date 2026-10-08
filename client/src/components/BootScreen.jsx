import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { svgAvatar } from '../lib/avatar'

const LOAD_TIME = 2500 // ms

/* ============================================================
   Ecrã de entrada — minimalista, escuro e clean, com o brilho
   violeta da identidade do site.
   ============================================================ */
export default function BootScreen({ visible, onEnter }) {
  const [progress, setProgress] = useState(0)
  const [photo, setPhoto] = useState(null)
  const timers = useRef([])

  // Foto do canal (com fallback garantido)
  useEffect(() => {
    if (!visible || photo) return
    fetch('/api/youtube/channel')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const url = data?.snippet?.thumbnails?.medium?.url || null
        if (url) setPhoto(url)
      })
      .catch(() => {})
  }, [visible, photo])

  // Progresso + entrada automática
  useEffect(() => {
    if (!visible) return
    setProgress(0)
    const started = Date.now()

    const interval = setInterval(() => {
      const pct = Math.min(((Date.now() - started) / LOAD_TIME) * 100, 100)
      setProgress(pct)
    }, 50)

    timers.current.push(
      interval,
      setTimeout(() => {
        setProgress(100)
        onEnter()
      }, LOAD_TIME),
    )

    return () => timers.current.forEach((t) => {
      clearInterval(t)
      clearTimeout(t)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6">
      {/* Brilho violeta muito subtil de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-xs flex-col items-center text-center"
      >
        {/* Marca */}
        <div className="relative mb-8">
          <div className="h-24 w-24 overflow-hidden rounded-full ring-1 ring-orange-500/50 sm:h-28 sm:w-28">
            <img
              src={photo || svgAvatar('AJ')}
              alt="Ashow e Jazer"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = svgAvatar('AJ')
              }}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="pointer-events-none absolute -inset-3 rounded-full border border-orange-500/25 shadow-[0_0_40px_rgba(139,92,246,0.18)]" />
        </div>

        <h1
          className="gradient-text font-black"
          style={{ fontSize: 'clamp(1.7rem, 6vw, 2.4rem)', letterSpacing: '0.02em' }}
        >
          Ashow e Jazer
        </h1>

        <p className="mt-3 text-[11px] uppercase tracking-[0.4em] text-gray-500">
          A carregar o site...
        </p>

        {/* Barra de progresso fina */}
        <div className="mt-9 h-[3px] w-60 overflow-hidden rounded-full bg-white/10 sm:w-72">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 shadow-[0_0_12px_rgba(139,92,246,0.8)]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>

        <div className="mt-3 text-[10px] uppercase tracking-[0.3em] tabular-nums text-gray-600">
          {Math.round(progress)}%
        </div>
      </motion.div>
    </div>
  )
}

/* Seta para voltar do site ao ecrã de carregamento */
export function BackToMenu({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Voltar"
      title="Voltar"
      className="fixed left-3 top-[4.5rem] z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-orange-500 backdrop-blur transition-all duration-300 hover:scale-110 hover:border-orange-500 hover:bg-orange-500 hover:text-black sm:left-5 sm:top-20 sm:h-12 sm:w-12"
    >
      <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  )
}
