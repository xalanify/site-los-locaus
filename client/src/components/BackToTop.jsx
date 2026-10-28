import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

/* Botão flutuante "voltar ao topo" — aparece só depois de rolar
   para baixo e volta ao início com suavidade. */
export default function BackToTop() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > 420)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  const subir = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      window.scrollTo(0, 0)
    }
  }

  return (
    <AnimatePresence>
      {visivel && (
        <motion.button
          key="back-to-top"
          onClick={subir}
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.85 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
          className="fixed bottom-6 right-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-zinc-500 text-white shadow-lg shadow-zinc-500/30 transition-colors hover:bg-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/60"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
