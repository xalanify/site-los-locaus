import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles, ChevronRight } from 'lucide-react'
import { NOVIDADES } from '../data/novidades'
import ProfileCard from './ProfileCard'
import ProfileStylePreview from './ProfileStylePreview'

/* ============================================================
   Janela de novidades — títulos curtos e exemplos visuais.
   Aparece uma vez por versão e volta a aparecer quando a versão
   muda. Pensada para o telemóvel.
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

const CARTAS_EXEMPLO = [
  { valor: 'license', nome: 'License' },
  { valor: 'felony', nome: 'Felony' },
  { valor: 'cosmic', nome: 'Cosmic' },
]

const ESTILOS_EXEMPLO = [
  { valor: 'neon', nome: 'Neon' },
  { valor: 'blood', nome: 'Blood' },
  { valor: 'cosmic', nome: 'Cosmic' },
]

export default function NovidadesModal({ user }) {
  const [aberto, setAberto] = useState(false)

  const chave = `locaus:novidades:${NOVIDADES.versao}:ocultar:${user?.id || user?.username || 'anon'}`

  useEffect(() => {
    try {
      if (!localStorage.getItem(chave)) setAberto(true)
    } catch {
      setAberto(true)
    }
    const abrir = () => setAberto(true)
    window.addEventListener('locaus:abrir-novidades', abrir)
    return () => window.removeEventListener('locaus:abrir-novidades', abrir)
  }, [chave])

  const fechar = () => setAberto(false)

  const entendi = () => {
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
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {NOVIDADES.secoes.map((s) => (
                  <li
                    key={s.titulo}
                    className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ff9e9e]/15 text-[#ff9e9e]">
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold leading-snug text-zinc-100">
                        {s.titulo}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{s.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* exemplos visuais */}
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Cartas de perfil
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {CARTAS_EXEMPLO.map((c) => (
                      <div
                        key={c.valor}
                        className="relative h-[132px] w-[124px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-500/10 to-black/40"
                      >
                        <div className="pointer-events-none absolute left-1/2 top-1/2 origin-center scale-[0.3] -translate-x-1/2 -translate-y-1/2">
                          <ProfileCard
                            perfil={{ ...PERFIL_EXEMPLO, card_style: c.valor }}
                            variant={c.valor}
                            jogos={['r6', 'cs2']}
                            className="w-[380px]"
                          />
                        </div>
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-300">
                          {c.nome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Estilos de perfil · em breve
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ESTILOS_EXEMPLO.map((e) => (
                      <div key={e.valor} className="w-[190px] shrink-0">
                        <ProfileStylePreview style={e.valor} nome="Los Locaus" />
                        <p className="mt-1 text-center text-[9px] font-black uppercase tracking-wider text-zinc-500">
                          {e.nome}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5 sm:px-6">
              <a
                href="/distincoes"
                onClick={fechar}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-300 transition-colors hover:text-white"
              >
                Todas as atualizações <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={entendi}
                className="rounded-xl bg-[#ff9e9e] px-5 py-2.5 text-sm font-bold text-[#1a0f0f] transition-[filter] hover:brightness-105"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
