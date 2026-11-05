import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

/* ============================================================
   NOVIDADES — cartão inicial com as cartas novas e as antigas
   limitadas (agora normais). Aparece até "não mostrar novamente".
   ============================================================ */

const CHAVE = 'locaus:novidades:2026-11-05'

const CARTAS = [
  { nome: 'Remember', src: '/edicoes/edicao-remember.jpg' },
  { nome: 'Night Ops', src: '/edicoes/edicao-nightops.jpg' },
  { nome: 'Stealth', src: '/edicoes/edicao-stealth.jpg' },
  { nome: 'Apex', src: '/edicoes/edicao-apex.jpg' },
  { nome: 'Underground', src: '/cartas/nfs1.png' },
  { nome: 'Underground 2', src: '/cartas/nfs2.png' },
  { nome: 'COD World at War', src: '/cartas/waw.png' },
]

export default function NovidadesModal() {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let mostrar = true
    try {
      mostrar = !localStorage.getItem(CHAVE)
    } catch {
      mostrar = true
    }
    if (mostrar) {
      setAberto(true)
      window.__novidadesAberta = true
    } else {
      window.dispatchEvent(new Event('locaus:novidades-fechou'))
    }
    return () => {
      window.__novidadesAberta = false
    }
  }, [])

  const fechar = (definitivo) => {
    if (definitivo) {
      try {
        localStorage.setItem(CHAVE, '1')
      } catch {
        /* nada */
      }
    }
    setAberto(false)
    window.__novidadesAberta = false
    window.dispatchEvent(new Event('locaus:novidades-fechou'))
  }

  if (!aberto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md"
      onClick={() => fechar(false)}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111113]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7a8a8]">
              <Sparkles className="h-3 w-3" /> Novidades · 5 de novembro
            </p>
            <h2 className="mt-1 font-display text-2xl font-black text-white">Cartas novas</h2>
            <p className="mt-1 text-[11px] font-semibold text-amber-200/80">
              O mercado agora só tem itens até <b>100 moedas</b>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fechar(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CARTAS.map((c) => (
              <div
                key={c.nome}
                className="relative h-[150px] w-[118px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-500/10 to-black/40"
              >
                <img
                  src={c.src}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-300">
                  {c.nome}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5">
          <button type="button" onClick={() => fechar(false)} className="ui-btn ui-btn-ghost ui-btn-sm">
            Continuar
          </button>
          <button
            type="button"
            onClick={() => fechar(true)}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            Não mostrar novamente
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
