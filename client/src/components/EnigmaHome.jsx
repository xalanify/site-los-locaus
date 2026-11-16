import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MonitorSmartphone, Trophy } from 'lucide-react'
import EnigmaTabela from './EnigmaTabela'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMA 1 SEMANA — cartão da página inicial
   Só informa e leva à página dos enigmas (jogar é no PC).
   ============================================================ */
export default function EnigmaHome() {
  const [eu, setEu] = useState(null)
  const [movel, setMovel] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const aplicar = () => setMovel(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  useEffect(() => {
    fetch('/api/enigma/eu', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEu(d))
      .catch(() => {})
  }, [])

  const etapa = eu?.etapa || 1
  const terminou = Boolean(eu?.terminou)
  const encerrado = Boolean(eu?.encerrado)

  return (
    <section className="enigma-home relative mb-5 mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#150b12] via-[#0a0710] to-[#05070f] p-5 shadow-[0_24px_60px_rgba(0,0,0,.5)] sm:p-7">
      <span className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#c50337]/20 blur-3xl" />

      <div className="relative grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a94]/30 bg-[#ff7a94]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ff9db0]">
            <Trophy className="h-3 w-3" /> Enigma · semana 1
          </span>

          <h2 className="mt-3 font-display text-3xl font-black leading-[1.03] tracking-tight text-white sm:text-4xl">
            Enigma semana 1
          </h2>

          {movel ? (
            <>
              <p className="mt-2 flex items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-3 text-[12px] leading-relaxed text-amber-100/90">
                <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Este enigma é para jogar num <b>computador</b>. No telemóvel não é possível
                  resolver as etapas.
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Seis etapas escondidas no site. O primeiro a terminar leva <b>30 moedas</b>.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Seis etapas escondidas no site. A tabela sabe sempre em que etapa estás — não
                precisas de escrever nada. O 1.º leva <b className="text-zinc-200">40 moedas</b>,
                o 2.º <b className="text-zinc-200">30</b>, e por aí abaixo.
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Termina a 23 deste mês, à meia-noite
              </p>
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link to="/enigmas" className="ui-btn ui-btn-primary">
              Ver enigmas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {eu?.inscrito && !terminou && !encerrado && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                Etapa {etapa} de 6
              </span>
            )}
            {terminou && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400">
                Terminaste em {eu?.posicao}.º · +{eu?.moedas || 0} moedas
              </span>
            )}
            {encerrado && !terminou && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                Enigma terminado
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <EnigmaTabela titulo="Classificação" limite={8} />
        </div>
      </div>
    </section>
  )
}
