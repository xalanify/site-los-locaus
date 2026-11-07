import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Bug, Coins } from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* ============================================================
   BÓNUS 12 MOEDAS — aviso único para quem encontrou o bug da
   cor de nome (ficava equipada mesmo depois de vender o item).
   ============================================================ */

export default function BonusBugModal({ user }) {
  const [aberto, setAberto] = useState(false)
  const uid = user && user.id
  const chave = `locaus:bonusbug:v1:${uid || 'anon'}`

  useEffect(() => {
    if (!uid) return undefined
    let vivo = true
    fetch('/api/mercado/bonusbug', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d || !d.bonus) return
        let visto = false
        try {
          visto = localStorage.getItem(chave) === '1'
        } catch {
          visto = false
        }
        if (visto) return
        const timer = window.setTimeout(() => setAberto(true), 1200)
        return () => clearTimeout(timer)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [uid, chave])

  const fechar = () => {
    try {
      localStorage.setItem(chave, '1')
    } catch {
      /* nada */
    }
    setAberto(false)
  }

  if (!aberto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={fechar}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-300/25 bg-[#111113] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/30">
          <Bug className="h-8 w-8" />
        </span>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/80">
          Encontraste um bug
        </p>
        <h2 className="mt-1 flex items-center justify-center gap-1.5 font-display text-2xl font-black text-white">
          +12 moedas <Coins className="h-6 w-6 text-amber-300" />
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          A cor de nome continuava equipada no perfil mesmo depois de venderes o item. Já corrigimos —
          obrigado por teres dado por isso.
        </p>
        <button type="button" onClick={fechar} className="ui-btn ui-btn-primary mt-5 w-full justify-center">
          OK
        </button>
      </motion.div>
    </div>,
    document.body,
  )
}
