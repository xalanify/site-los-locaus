import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Puzzle, X } from 'lucide-react'

/* ============================================================
   NOVIDADES — cartão inicial do novo desafio (Enigma)
   "OK" fecha só desta vez; "Não mostrar novamente" guarda.
   ============================================================ */
export default function NovidadesEnigma({ user }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const chave = `locaus:novidades-enigma:v1:${user?.id || user?.username || 'anon'}`

  useEffect(() => {
    try {
      if (localStorage.getItem(chave)) return
    } catch {
      return
    }
    const t = setTimeout(() => setAberto(true), 1800)
    return () => clearTimeout(t)
  }, [chave])

  const fechar = () => setAberto(false)
  const naoMostrar = () => {
    try {
      localStorage.setItem(chave, '1')
    } catch {
      /* sem armazenamento */
    }
    setAberto(false)
  }
  const ver = () => {
    naoMostrar()
    navigate('/enigmas')
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Novidades"
      onClick={fechar}
    >
      <div
        className="novidades-enigma relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a94]/30 bg-[#ff7a94]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#ff9db0]">
            Novidades
          </span>
          <button
            type="button"
            onClick={fechar}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff7a94]/25 bg-[#c50337]/15 text-[#ff9db0]">
          <Puzzle className="h-7 w-7" />
        </span>

        <h2 className="mt-4 font-display text-2xl font-black leading-tight text-white">
          Novo desafio: Enigma
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Um enigma por semana, escondido no site. No fim, os primeiros ganham{' '}
          <b className="text-zinc-200">moedas</b> e o vencedor leva uma{' '}
          <b className="text-zinc-200">carta única</b> e uma distinção secreta.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          Joga-se no computador · termina a 23 deste mês
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={ver} className="ui-btn ui-btn-primary flex-1 justify-center">
            Ver enigma
          </button>
          <button
            type="button"
            onClick={fechar}
            className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            OK
          </button>
        </div>
        <button
          type="button"
          onClick={naoMostrar}
          className="mt-3 w-full text-center text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Não mostrar novamente
        </button>
      </div>
    </div>
  )
}
