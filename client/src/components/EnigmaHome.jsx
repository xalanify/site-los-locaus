import { Link } from 'react-router-dom'
import { ArrowRight, Trophy } from 'lucide-react'
import CartaEnigma2 from './CartaEnigma2'

/* ============================================================
   ENIGMA — cartão da página inicial (semana 2 em breve)
   ============================================================ */
export default function EnigmaHome() {
  const nomeConta = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').username || 'membro'
    } catch {
      return 'membro'
    }
  })()

  return (
    <section className="enigma-home relative mb-5 mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#150b12] via-[#0a0710] to-[#05070f] p-5 shadow-[0_24px_60px_rgba(0,0,0,.5)] sm:p-7">
      <span className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#c50337]/20 blur-3xl" />

      <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a94]/30 bg-[#ff7a94]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ff9db0]">
            <Trophy className="h-3 w-3" /> Enigma 2 · aberto
          </span>

          <h2 className="mt-3 font-display text-3xl font-black leading-[1.03] tracking-tight text-white sm:text-4xl">
            Enigma 2 <span className="text-[#ff7a94]">aberto</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
            Cinco etapas no Protocolo Orion, com imagens, códigos e pistas espalhadas pelo site.
            Cada jogador recebe chaves diferentes — e o 1.º leva a carta dourada 1/1 e 40 moedas.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link to="/enigma2" className="ui-btn ui-btn-primary">
              Ir para o Enigma 2
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/enigmas#arquivo" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-300">
              Vencedores anteriores
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[220px]">
          <Link to="/enigma2" className="block" aria-label="Entrar no Enigma 2">
            <CartaEnigma2 nome={nomeConta} />
          </Link>
        </div>
      </div>
    </section>
  )
}
