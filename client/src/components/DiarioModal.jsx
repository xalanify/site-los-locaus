import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Coins } from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* ============================================================
   MOEDA DIÁRIA — 1 moeda grátis por dia, com aviso.
   ============================================================ */

export default function DiarioModal({ user }) {
  const [aberto, setAberto] = useState(false)
  const uid = user && user.id

  useEffect(() => {
    if (!uid) return undefined
    let vivo = true
    let timer = 0

    const pedir = () => {
      fetch('/api/mercado/diario', { method: 'POST', headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!vivo || !d || !d.recebeu) return
          setAberto(true)
          window.dispatchEvent(new Event('locaus:moedas'))
        })
        .catch(() => {})
    }

    const aoFecharNovidades = () => pedir()

    if (window.__novidadesAberta) {
      window.addEventListener('locaus:novidades-fechou', aoFecharNovidades, { once: true })
    } else {
      // pequeno atraso para não competir com o arranque do site
      timer = window.setTimeout(pedir, 500)
    }

    return () => {
      vivo = false
      if (timer) clearTimeout(timer)
      window.removeEventListener('locaus:novidades-fechou', aoFecharNovidades)
    }
  }, [uid])

  if (!aberto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setAberto(false)}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-300/25 bg-[#111113] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/30 shadow-[0_0_40px_rgba(251,191,36,0.18)]">
          <Coins className="h-8 w-8" />
        </span>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
          Moeda diária
        </p>
        <h2 className="mt-1 font-display text-2xl font-black text-white">+1 moeda grátis</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          Passaste por cá hoje. Recebeste 1 Moeda Locaus.
        </p>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="ui-btn ui-btn-primary mt-5 w-full justify-center"
        >
          OK
        </button>
      </motion.div>
    </div>,
    document.body,
  )
}
