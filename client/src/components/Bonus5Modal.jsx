import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Coins } from 'lucide-react'
import MoedaLocaus from './MoedaLocaus'
import { authHeaders } from '../lib/auth'

/* Aviso de bónus: 5 moedas grátis para todos.
   Aparece depois do card de novidades e só uma vez por conta. */
export default function Bonus5Modal({ user }) {
  const [aberto, setAberto] = useState(false)
  const chave = `locaus:bonus5:v1:${user?.id || user?.username || 'anon'}`

  useEffect(() => {
    const abrir = async () => {
      try {
        if (localStorage.getItem(chave)) return
      } catch {
        /* sem armazenamento */
      }
      try {
        const r = await fetch('/api/mercado/bonus5', { headers: authHeaders() })
        const d = await r.json().catch(() => ({}))
        if (!r.ok || !d.bonus) return
      } catch {
        return
      }
      setAberto(true)
    }
    window.addEventListener('locaus:novidades-fechou', abrir)
    return () => window.removeEventListener('locaus:novidades-fechou', abrir)
  }, [chave])

  const fechar = () => {
    try {
      localStorage.setItem(chave, '1')
    } catch {
      /* sem armazenamento */
    }
    setAberto(false)
  }

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[112] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={fechar}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-amber-300/25 bg-[#141210] p-6 text-center shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-200">
              <MoedaLocaus size={34} />
            </span>
            <h2 className="mt-4 font-display text-2xl font-black text-white">5 moedas grátis</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Já estão na tua conta. É um obrigado por estares aqui — usa-as no mercado ou guarda-as
              para uma carta.
            </p>
            <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2 text-amber-100">
              <Coins className="h-4 w-4" />
              <span className="text-sm font-black">+5 moedas Locaus</span>
            </div>
            <button
              type="button"
              onClick={fechar}
              className="mt-5 w-full rounded-xl bg-[#ff9e9e] px-5 py-2.5 text-sm font-bold text-[#1a0f0f] transition-[filter] hover:brightness-105"
            >
              Continuar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
