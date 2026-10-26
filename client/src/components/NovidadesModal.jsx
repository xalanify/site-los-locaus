import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles, Music2, Play, Pause, Image as ImageIcon, Newspaper } from 'lucide-react'
import { NOVIDADES } from '../data/novidades'
import { BANNERS, FUNDOS, MUSICAS } from '../data/temasPerfil'

/* Janela flutuante de novidades — aparece sempre que se entra, até o
   utilizador clicar em "Não mostrar novamente". O botão "Novidades"
   do perfil abre-a outra vez mesmo depois de escondida. */
export default function NovidadesModal({ user }) {
  const [aberto, setAberto] = useState(false)
  const [aTocar, setATocar] = useState('')
  const audioRef = useRef(null)

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

  useEffect(() => {
    if (!aberto) {
      try {
        if (audioRef.current) audioRef.current.pause()
      } catch {
        /* nada */
      }
      setATocar('')
    }
  }, [aberto])

  const fechar = () => {
    setAberto(false)
  }

  const naoMostrar = () => {
    try {
      localStorage.setItem(chave, '1')
    } catch {
      /* sem armazenamento */
    }
    setAberto(false)
  }

  const alternarMusica = (m) => {
    const audio = audioRef.current
    if (!audio) return
    if (aTocar === m.id) {
      audio.pause()
      setATocar('')
      return
    }
    audio.src = m.ficheiro
    audio.volume = 0.35
    audio
      .play()
      .then(() => setATocar(m.id))
      .catch(() => setATocar(''))
  }

  const bannersDaSeccao = (s) =>
    s.ids ? BANNERS.filter((b) => b.ficheiro && s.ids.includes(b.id)) : BANNERS.filter((b) => b.ficheiro).slice(0, 6)
  const fundosDaSeccao = (s) =>
    s.ids ? FUNDOS.filter((f) => f.imagem && s.ids.includes(f.id)) : FUNDOS.filter((f) => f.imagem).slice(0, 6)

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md"
          onClick={fechar}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-violet-400/25 bg-[#0b0716] p-5 shadow-2xl shadow-violet-950/40 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-black uppercase tracking-wide text-white">
                    {NOVIDADES.titulo}
                  </h2>
                  <p className="text-[11px] font-semibold text-gray-400">
                    {NOVIDADES.subtitulo} · {NOVIDADES.data}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={naoMostrar}
                  className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:bg-white/10 hover:text-white sm:inline-flex"
                >
                  Não mostrar novamente
                </button>
                <button
                  onClick={fechar}
                  className="rounded-full bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
                  aria-label="Fechar novidades"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {NOVIDADES.secoes.map((s) => (
                <section key={s.titulo}>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-300">
                    {s.tipo === 'musicas' ? (
                      <Music2 className="h-3.5 w-3.5" />
                    ) : s.tipo === 'noticias' ? (
                      <Newspaper className="h-3.5 w-3.5" />
                    ) : s.tipo ? (
                      <ImageIcon className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {s.titulo}
                  </h3>
                  {s.texto && <p className="mb-2 text-[12px] text-gray-400">{s.texto}</p>}

                  {s.itens && (
                    <ul className="space-y-2">
                      {s.itens.map((it) => (
                        <li
                          key={it.titulo}
                          className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                        >
                          <p className="text-[12px] font-black text-white">{it.titulo}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{it.texto}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.tipo === 'banners' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {bannersDaSeccao(s).map((b) => (
                        <img
                          key={b.id}
                          src={b.ficheiro}
                          alt={b.nome}
                          loading="lazy"
                          className="aspect-video w-full rounded-lg border border-white/10 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {s.tipo === 'fundos' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {fundosDaSeccao(s).map((f) => (
                        <img
                          key={f.id}
                          src={f.imagem}
                          alt={f.nome}
                          loading="lazy"
                          className="aspect-video w-full rounded-lg border border-white/10 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {s.tipo === 'musicas' && (
                    <div className="space-y-1.5">
                      {MUSICAS.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => alternarMusica(m)}
                          className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.07]"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-200">
                            {aTocar === m.id ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-white">
                            {m.nome}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                            ouvir
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={naoMostrar}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12px] font-bold text-gray-300 transition-colors hover:bg-white/10"
              >
                Não mostrar novamente
              </button>
              <button
                type="button"
                onClick={fechar}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white transition-all hover:brightness-110"
              >
                OK
              </button>
            </div>

            <audio ref={audioRef} preload="none" onEnded={() => setATocar('')} className="hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
