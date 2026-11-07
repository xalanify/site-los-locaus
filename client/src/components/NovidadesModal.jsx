import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Hammer, Lock, Sparkles, X } from 'lucide-react'

/* ============================================================
   NOVIDADES — aviso inicial de que a loja está a ser refeita.
   Aparece uma vez até "não mostrar novamente".
   ============================================================ */

const CHAVE = 'locaus:novidades:2026-11-07'

const MELHORIAS = [
  'Cartas novas, com o design e as informações certas',
  'Preços e compras automáticas mais estáveis',
  'Fotos de perfil e miniaturas dos clips a voltar a funcionar',
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
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111113]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7a8a8]">
              <Sparkles className="h-3 w-3" /> Novidades · 7 de novembro
            </p>
            <div className="mt-1 font-display text-2xl font-black text-white">
              Loja em manutenção
            </div>
            <p className="mt-1 text-[11px] font-semibold text-amber-200/80">
              Estamos a refazer o mercado e as cartas.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#f7a8a8]/25 bg-[#f7a8a8]/10 text-[#f7a8a8]">
              <Hammer className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-zinc-300">
                A loja e o mercado ficam <b className="text-white">temporariamente fechados</b>{' '}
                enquanto corrigimos as cartas, os preços e os uploads.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                Os teus itens, cartas, cores e moedas continuam guardados. Podes equipar o que já
                tens no editor de perfil.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {MELHORIAS.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#f7a8a8]" />
                <span className="text-[12px] font-semibold text-zinc-300">{t}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            <p className="text-[11px] font-semibold leading-relaxed text-amber-100/90">
              Durante este período, a loja fica aberta apenas para o admin.
            </p>
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
