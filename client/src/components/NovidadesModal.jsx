import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { NOVIDADES } from '../data/novidades'
import { CORES_NOVAS, CARTAS_NOVAS } from '../data/artesNovas'
import ProfileCard from './ProfileCard'

/* ============================================================
   Janela de novidades — só as artes novas (cores + cartas).
   Aparece uma vez por versão.
   ============================================================ */

const PERFIL_EXEMPLO = {
  username: 'Los Locaus',
  display_id: 'LOC-001',
  avatar_url: null,
  badges: [],
  distincoes: [],
  name_color: null,
  name_effect: null,
  game_accounts: ['r6', 'cs2'],
  created_at: '2026-01-01',
}

export default function NovidadesModal({ user }) {
  const [aberto, setAberto] = useState(false)

  const chaveNaoMostrar = `locaus:novidades:nao-mostrar:${user?.id || user?.username || 'anon'}`

  useEffect(() => {
    let mostrar = true
    try {
      mostrar = !localStorage.getItem(chaveNaoMostrar)
    } catch {
      mostrar = true
    }
    if (mostrar) setAberto(true)
    else {
      // sem novidades para mostrar: o aviso das 5 moedas pode seguir
      setTimeout(() => window.dispatchEvent(new Event('locaus:novidades-fechou')), 0)
    }
    const abrir = () => setAberto(true)
    window.addEventListener('locaus:abrir-novidades', abrir)
    return () => window.removeEventListener('locaus:abrir-novidades', abrir)
  }, [chaveNaoMostrar])

  const fechar = () => {
    setAberto(false)
    try {
      window.dispatchEvent(new Event('locaus:novidades-fechou'))
    } catch {
      /* nada */
    }
  }

  const naoMostrar = () => {
    try {
      localStorage.setItem(chaveNaoMostrar, '1')
    } catch {
      /* sem armazenamento */
    }
    fechar()
  }

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md"
          onClick={fechar}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111112] shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                  Novidades · {NOVIDADES.data}
                </p>
                <h2 className="mt-1 font-display text-xl font-black tracking-tight text-white sm:text-2xl">
                  {NOVIDADES.titulo}
                </h2>
                <p className="mt-0.5 text-[12px] font-semibold text-zinc-400">
                  {NOVIDADES.subtitulo}
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar novidades"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Cores de nome
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CORES_NOVAS.map((a) => (
                    <div
                      key={a.slug}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center"
                    >
                      <span
                        className={`${a.classe || `nome-cor-arte-${a.slug}`} block truncate text-base font-black`}
                      >
                        Los Locaus
                      </span>
                      <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        {a.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Cartas de perfil
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {CARTAS_NOVAS.map((a) => (
                    <div
                      key={a.slug}
                      className="relative h-[150px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-500/10 to-black/40"
                    >
                      <div className="pointer-events-none absolute left-1/2 top-1/2 origin-center scale-[0.32] -translate-x-1/2 -translate-y-1/2">
                        <ProfileCard
                          perfil={{ ...PERFIL_EXEMPLO, card_style: `arte-${a.slug}` }}
                          variant={`arte-${a.slug}`}
                          jogos={['r6', 'cs2']}
                          className="w-[380px]"
                        />
                      </div>
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-300">
                        {a.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={fechar}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/5"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={naoMostrar}
                className="rounded-xl bg-[#ff9e9e] px-5 py-2.5 text-sm font-bold text-[#1a0f0f] transition-[filter] hover:brightness-105"
              >
                Não mostrar novamente
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
