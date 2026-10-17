import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ background: 'radial-gradient(70rem 40rem at 50% 20%, #17102a 0%, #0a0813 70%)' }}
    >
      {/* Brilhos violeta que respiram no fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[18%] top-[22%] h-72 w-72 rounded-full bg-violet-600/20 blur-[120px]"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[15%] h-80 w-80 rounded-full bg-fuchsia-600/10 blur-[130px]"
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.7, 0.4, 0.7] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-xs flex-col items-center text-center"
      >
        {/* Marca */}
        <div className="relative mb-8">
          <motion.div
            className="absolute -inset-4 rounded-full border border-violet-500/30"
            animate={{ scale: [1, 1.14, 1], opacity: [0.7, 0.25, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="h-24 w-24 overflow-hidden rounded-full ring-2 ring-violet-500/60 shadow-[0_0_60px_rgba(139,92,246,0.35)] sm:h-28 sm:w-28">
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
            className="relative h-full rounded-full bg-gradient-to-r from-violet-400 via-violet-500 to-violet-600 shadow-[0_0_12px_rgba(139,92,246,0.8)]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          >
            <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          </motion.div>
        </div>

        <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] tabular-nums text-violet-300/80">
          {Math.round(progress)}%
        </div>
      </motion.div>
    </div>
  )
}
