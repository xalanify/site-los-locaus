import { useEffect, useState } from 'react'
import { ArrowRight, Loader2, Lock, MonitorSmartphone, Sparkles } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import EnigmaTabela from '../components/EnigmaTabela'
import CartaEnigma from '../components/CartaEnigma'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMAS — 6 etapas, tudo ligado à conta do membro
   ============================================================ */

const PREMIOS = [
  ['1.º', 40],
  ['2.º', 30],
  ['3.º', 25],
  ['4.º', 20],
  ['5.º', 15],
]

export default function EnigmasPage() {
  const [eu, setEu] = useState(null)
  const [aEntrar, setAEntrar] = useState(false)
  const [erro, setErro] = useState('')
  const [movel, setMovel] = useState(false)
  const [estado, setEstado] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [carta, setCarta] = useState(null)
  const [zoomCarta, setZoomCarta] = useState(false)
  const [cartaBusy, setCartaBusy] = useState(false)
  const [cartaMsg, setCartaMsg] = useState('')

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
    fetch('/api/enigma/estado', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEstado(d))
      .catch(() => {})
    fetch('/api/enigma/carta', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCarta(d))
      .catch(() => {})
  }, [])

  const mexerCarta = async (acao) => {
    if (cartaBusy) return
    setCartaBusy(true)
    setCartaMsg('')
    try {
      const r = await fetch(`/api/enigma/carta/${acao}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: '{}',
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || !d.ok) throw new Error((d && d.erro) || 'Não consegui.')
      const novo = await fetch('/api/enigma/carta', { headers: authHeaders(), cache: 'no-store' })
        .then((x) => (x.ok ? x.json() : null))
        .catch(() => null)
      setCarta(novo)
      window.dispatchEvent(new Event('locaus:moedas'))
      setCartaMsg(acao === 'vender' ? 'Carta à venda por 100 moedas.' : 'Carta comprada. Já é tua.')
    } catch (e) {
      setCartaMsg(e.message || 'Não consegui.')
    } finally {
      setCartaBusy(false)
    }
  }

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const jogar = async () => {
    if (aEntrar || movel || encerrado) return
    setAEntrar(true)
    setErro('')
    try {
      const r = await fetch('/api/enigma/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: '{}',
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || !d.ok) throw new Error((d && d.erro) || 'Não consegui entrar.')
      if (d.encerrado || !d.url) {
        setEstado((e) => ({ ...(e || {}), encerrado: true }))
        setErro('O enigma já terminou.')
        setAEntrar(false)
        return
      }
      window.location.href = d.url
    } catch (e) {
      setErro(e.message || 'O servidor não respondeu.')
      setAEntrar(false)
    }
  }

  const etapa = eu?.etapa || 1
  const admin = Boolean(eu?.admin)
  const terminou = Boolean(eu?.terminou)
  const encerrado = Boolean(
    eu?.encerrado || estado?.encerrado || (estado?.fim && agora >= new Date(estado.fim).getTime()),
  )

  return (
    <PageShell>
      <PageHeader
        eyebrow="Jogar"
        title="Enigma semana 1"
        subtitle="Seis etapas escondidas no site. A classificação liga-se sozinha à tua conta."
      >
        <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
          <Sparkles className="h-3 w-3 text-[#ff7a94]" /> 6 etapas
        </span>
      </PageHeader>

      {movel && (
        <div className="mb-4 flex items-start gap-3 rounded-3xl border border-amber-300/25 bg-amber-400/[0.07] p-4 text-amber-100">
          <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Este enigma é para jogar num computador</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
              No telemóvel ou na app (PWA) não é possível resolver as etapas. Abre o site num PC
              para participar.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Estado do jogador */}
        <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <span className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#c50337]/15 blur-3xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a94]/30 bg-[#ff7a94]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ff9db0]">
            {admin ? 'Desenvolvedor' : encerrado ? 'Terminado' : terminou ? 'Concluído' : eu?.inscrito ? 'Em curso' : 'Por começar'}
          </span>

          <h2 className="mt-3 font-display text-2xl font-black leading-tight text-white sm:text-3xl">
            {admin
              ? 'Modo desenvolvedor'
              : terminou
                ? `Terminaste em ${eu?.posicao || '—'}.º`
                : encerrado
                  ? 'O enigma terminou'
                  : eu?.inscrito
                    ? `Estás na etapa ${etapa} de 6`
                    : 'Ainda não começaste'}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            {admin
              ? 'Jogas como DEV: o progresso aparece na tabela, mas ficas fora da classificação e não ganhas moedas nem a carta.'
              : terminou
              ? `Ganhaste ${eu?.moedas || 0} moedas. As moedas entram direto na conta Locaus.`
              : encerrado
                ? 'A contagem chegou ao fim. Vê a classificação final abaixo.'
                : eu?.inscrito
                  ? 'Continua de onde paraste. Cada etapa tem um endereço secreto — o progresso é guardado automaticamente.'
                  : 'Ao começares, ficas inscrito na tabela. O site reconhece a etapa em que estiveres, sem escreveres o teu nome.'}
          </p>

          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < etapa ? (terminou ? 'bg-emerald-400' : 'bg-[#ff2e5b]') : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={jogar}
              disabled={aEntrar || movel || encerrado}
              className="ui-btn ui-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {aEntrar ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> A entrar…
                </>
              ) : (
                <>
                  {encerrado && !admin
                    ? 'Enigma terminado'
                    : terminou && !admin
                      ? 'Ver classificação'
                      : eu?.inscrito || admin
                        ? `Continuar na etapa ${etapa}`
                        : 'Começar enigma'}
                  {!encerrado && <ArrowRight className="h-3.5 w-3.5" />}
                </>
              )}
            </button>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Lock className="h-3 w-3" /> Progresso ligado à tua conta
            </span>
          </div>
          {movel && (
            <p className="mt-2 text-[11px] text-amber-200/80">
              Disponível apenas no computador.
            </p>
          )}
          {erro && <p className="mt-2 text-xs text-[#ff9db0]">{erro}</p>}
        </section>

        {/* Prémios */}
        <section className="glass relative overflow-hidden rounded-3xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a94]">Moedas</h3>
          <ul className="mt-3 space-y-2">
            {PREMIOS.map(([pos, moedas]) => (
              <li key={pos} className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-sm last:border-0">
                <span className="font-mono text-xs text-zinc-500">{pos}</span>
                <span className="font-mono text-sm font-bold text-[#f5c542]">+{moedas}</span>
              </li>
            ))}
            <li className="flex items-center justify-between pt-1 text-xs text-zinc-500">
              <span className="font-mono">6.º em diante</span>
              <span className="font-mono text-zinc-400">12, 11, 10… até 1</span>
            </li>
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
            Só conta a primeira conclusão de cada membro. O 1.º classificado ganha também uma
            distinção secreta. As moedas entram automaticamente na conta ao terminares.
          </p>
        </section>
      </div>

      <section className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="glass relative w-full overflow-hidden rounded-3xl p-4 lg:w-[320px] lg:shrink-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a94]">
              Carta do vencedor
            </h3>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
              1/1
            </span>
          </div>

          <button
            type="button"
            onClick={() => carta?.existe && setZoomCarta(true)}
            className="mx-auto block w-full max-w-[260px] text-left"
            aria-label="Ver carta do enigma em grande"
          >
            <CartaEnigma nome={carta?.existe ? carta.owner : 'sem vencedor'} />
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            {carta?.existe
              ? carta.em_venda
                ? 'À venda no mercado por 100 moedas. Quando alguém comprar, passa a ser dessa pessoa.'
                : carta.souEu
                  ? 'É tua. Podes vendê-la por 100 moedas — depois passa para quem comprar.'
                  : 'Exclusiva do vencedor. Só há uma unidade em todo o site.'
              : 'Ainda não há vencedor. A carta é entregue ao 1.º a terminar o enigma.'}
          </p>

          {carta?.existe && (
            <div className="mt-3 flex flex-col gap-2">
              {carta.souEu && !carta.em_venda && (
                <button
                  type="button"
                  onClick={() => mexerCarta('vender')}
                  disabled={cartaBusy}
                  className="ui-btn ui-btn-ghost w-full justify-center"
                >
                  Vender por 100 moedas
                </button>
              )}
              {carta.em_venda && !carta.souEu && (
                <button
                  type="button"
                  onClick={() => mexerCarta('comprar')}
                  disabled={cartaBusy}
                  className="ui-btn ui-btn-primary w-full justify-center"
                >
                  Comprar por {carta.preco} moedas
                </button>
              )}
              {carta.em_venda && carta.souEu && (
                <span className="text-center text-[11px] text-emerald-400">
                  À venda por 100 moedas
                </span>
              )}
              {cartaMsg && <p className="text-[11px] text-[#ffb3c1]">{cartaMsg}</p>}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <EnigmaTabela titulo="Classificação geral" limite={50} />
        </div>
      </section>

      {zoomCarta && carta?.existe && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomCarta(false)}
          role="presentation"
        >
          <div className="w-full max-w-[400px]" onClick={(e) => e.stopPropagation()}>
            <CartaEnigma nome={carta.owner} ampliada />
            <button
              type="button"
              onClick={() => setZoomCarta(false)}
              className="ui-btn ui-btn-ghost mt-3 w-full justify-center"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
