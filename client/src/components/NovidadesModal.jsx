import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Sparkles, X } from 'lucide-react'
import PokemonCard from './PokemonCard'
import OlhosCard from './OlhosCard'

/* ============================================================
   NOVIDADES — apenas as três cartas TCG novas.
   Aparece uma vez até "não mostrar novamente".
   ============================================================ */

const CHAVE = 'locaus:novidades:2026-11-07-cartas-tcg-v2'

const CARTAS = [
  {
    valor: 'foto-nfsu2',
    nome: 'Underground 2',
    jogo: 'Need for Speed',
    nota: 'Tuning e luz de pôr do sol, verso laranja.',
  },
  {
    valor: 'foto-guerra',
    nome: 'World at War',
    jogo: 'Call of Duty',
    nota: 'Guerra e névoa, verso militar.',
  },
  {
    valor: 'foto-olhos',
    nome: 'Olhar',
    jogo: 'Locaus Original',
    nota: 'Design próprio, sem imitar Pokémon. Olhos com brilho arco-íris.',
    tipo: 'olhos',
  },
]

export default function NovidadesModal({ user }) {
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

  /* Pré-carrega as artes para o modal não mostrar o quadrado preto
     enquanto as imagens descodificam. */
  useEffect(() => {
    const fontes = ['/cartas/nfs2.png', '/cartas/waw.png', '/cartas/olhos.png']
    const imagens = fontes.map((src) => {
      const img = new Image()
      img.src = src
      return img
    })
    return () => {
      imagens.forEach((img) => {
        img.src = ''
      })
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

  const nome = user?.username || 'Locaus'
  const id = user?.display_id ?? user?.id ?? '—'

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center bg-black/75 p-3"
      onClick={() => fechar(false)}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111113]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5 border-b border-amber-400/20 bg-amber-500/[0.08] px-5 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <p className="text-[11px] font-semibold leading-relaxed text-amber-100/90">
            O chat continua a funcionar normalmente. As fotos de perfil é que não estão a aparecer
            por enquanto por um problema.
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7a8a8]">
              <Sparkles className="h-3 w-3" /> Novidades · 7 de novembro
            </p>
            <div className="mt-1 font-display text-2xl font-black text-white">
              Novas cartas
            </div>
            <p className="mt-1 text-[11px] font-semibold text-zinc-400">
              Três cartas novas, com flip 3D e um verso único para cada uma.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
            {CARTAS.map((c) => (
              <div key={c.valor} className="w-[214px] shrink-0 snap-center sm:w-[224px]">
                <div className="relative overflow-hidden rounded-2xl">
                  {c.tipo === 'olhos' ? (
                    <OlhosCard perfil={user || {}} username={nome} id={id} preview />
                  ) : (
                    <PokemonCard
                      variant={c.valor}
                      perfil={user || {}}
                      username={nome}
                      id={id}
                      preview
                    />
                  )}
                  <span className="pointer-events-none absolute left-2 top-2 z-40 rounded-full bg-[#f7a8a8] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1a0c0c]">
                    Nova
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-black text-white">{c.nome}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {c.jogo}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{c.nota}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-[#f7a8a8]" />
            <p className="text-[11px] font-semibold text-zinc-300">
              Cada carta tem um verso único. <b className="text-white">Nova</b> no mercado.
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
