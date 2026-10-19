import { useEffect, useRef, useState } from 'react'
import { Lock, Loader2, X } from 'lucide-react'

/* ============================================================
   PÁGINA "EM BREVE" COM PORTÃO
   ------------------------------------------------------------
   É a primeira coisa que aparece no site publicado: o mesmo
   visual do placeholder (fundo, nome, "Em breve"), mas com um
   pequeno link "escrever código".

   Código certo -> guarda o desbloqueio no browser, mostra o
   loading estilo CMD e entra no site normalmente.

   Nota: é um portão suave (client-side) — serve para esconder o
   site de quem chega por acaso, não é autenticação a sério.
   ============================================================ */

const CODIGO = 'xlnadminpass'
const CHAVE = 'aj-gate-v1'

const FUNDO = '/gta5.gif'

export default function GatePage({ onUnlock }) {
  const [aberto, setAberto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [aVerificar, setAVerificar] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!aberto) return undefined
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 120)
    const esc = (e) => {
      if (e.key === 'Escape' && !aVerificar) fechar()
    }
    window.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', esc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, aVerificar])

  const fechar = () => {
    if (aVerificar) return
    setAberto(false)
    setCodigo('')
    setErro('')
  }

  const tentar = async (e) => {
    e.preventDefault()
    if (aVerificar) return
    const limpo = codigo.trim()
    if (!limpo) {
      setErro('Escreve o código.')
      return
    }
    setErro('')
    setAVerificar(true)
    // pequena pausa — parece que está mesmo a verificar
    await new Promise((r) => setTimeout(r, 600))
    if (limpo === CODIGO) {
      try {
        localStorage.setItem(CHAVE, '1')
      } catch {
        /* sem armazenamento: entra na mesma nesta visita */
      }
      onUnlock && onUnlock()
      return
    }
    setAVerificar(false)
    setCodigo('')
    setErro('Código errado. Tenta outra vez.')
    if (inputRef.current) inputRef.current.focus()
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black text-white">
      {/* fundo: o mesmo gif do placeholder, com véu escuro */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${FUNDO}')` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 35%, rgba(0,0,0,.45) 0%, rgba(0,0,0,.86) 100%), linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,.82) 100%)',
        }}
      />
      {/* brilhos violeta */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[18vmax] -top-[22vmax] h-[60vmax] w-[60vmax] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-[24vmax] -right-[18vmax] h-[55vmax] w-[55vmax] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #6d28d9 0%, transparent 65%)' }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* marca */}
        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <h1
            className="max-w-[14ch] text-center font-display font-black uppercase leading-[0.92] tracking-tight"
            style={{
              fontSize: 'clamp(2.8rem, 13vw, 6rem)',
              background: 'linear-gradient(135deg, #ede9fe 0%, #8b5cf6 55%, #6d28d9 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ashow e Jazer
          </h1>
        </main>

        {/* rodapé: em breve + link do código */}
        <footer className="relative px-5 pb-9 text-center sm:pb-14">
          <h2
            className="mb-5 font-display font-black uppercase leading-none tracking-[0.22em] opacity-90 sm:tracking-[0.4em]"
            style={{
              fontSize: 'clamp(1.5rem, 7vw, 3.25rem)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,.3) 0%, rgba(139,92,246,.22) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Em breve
          </h2>

          <div className="flex items-center justify-center" aria-hidden="true">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-violet-500/20 border-t-violet-500" />
          </div>

          <a
            href="https://www.youtube.com/@AshoweJazer"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
            </svg>
            Ashow e Jazer no YouTube
          </a>

          {/* O pequeno link que abre a janela do código */}
          <div className="mt-7">
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600 transition-colors hover:text-violet-300"
            >
              <Lock className="h-3 w-3" />
              escrever código
            </button>
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-gray-700">
            Versão para telemóvel ainda em melhoria contínua.
          </p>
        </footer>
      </div>

      {/* janela do código */}
      {aberto && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={fechar}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0c0916] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-black text-white">Acesso reservado</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Introduz o código para desbloquear o site.
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={tentar} className="mt-5">
              <input
                ref={inputRef}
                type="password"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value)
                  if (erro) setErro('')
                }}
                placeholder="código"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center text-sm font-semibold tracking-[0.2em] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20"
              />

              {erro && <p className="mt-2 text-center text-xs font-semibold text-red-400">{erro}</p>}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={fechar}
                  disabled={aVerificar}
                  className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-gray-200 transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aVerificar}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-400 disabled:opacity-60"
                >
                  {aVerificar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A verificar
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
