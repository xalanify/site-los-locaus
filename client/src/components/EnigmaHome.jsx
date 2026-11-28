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
    <section className="enigma-home relative mb-5 mt-4 overflow-hidden rounded-3xl border border-[#ece5d8]/10 bg-gradient-to-b from-[#1a1610] via-[#12100c] to-[#0b0a08] p-5 shadow-[0_24px_60px_rgba(0,0,0,.5)] sm:p-7">
      <span className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#c9a86a]/15 blur-3xl" />

      <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a86a]/40 bg-[#c9a86a]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#e4cf9f]">
            <Trophy className="h-3 w-3" /> Enigma 2 · em breve
          </span>

          <h2 className="mt-3 font-display text-3xl font-black leading-[1.03] tracking-tight text-[#f1e9db] sm:text-4xl">
            Enigma 2 <span className="text-[#e4cf9f]">em breve</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#a89e8d]">
            O Enigma 2 está a ser feito. Abre em breve, com cinco etapas, uma carta dourada
            exclusiva e prémios para os mais rápidos.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              className="ui-btn ui-btn-primary cursor-not-allowed opacity-50"
            >
              Em breve
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <Link to="/enigmas#arquivo" className="inline-flex min-h-[34px] items-center px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a7264] transition hover:text-[#ece5d8]">
              Vencedores anteriores
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[220px]">
          <div className="block">
            <CartaEnigma2 nome={nomeConta} />
          </div>
        </div>
      </div>
    </section>
  )
}
