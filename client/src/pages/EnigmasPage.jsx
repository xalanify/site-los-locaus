import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Loader2, Sparkles, Trophy } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import CartaEnigma from '../components/CartaEnigma'
import CartaEnigma2 from '../components/CartaEnigma2'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMAS — semana 2 em breve + arquivo de vencedores
   ============================================================ */
export default function EnigmasPage() {
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [zoom, setZoom] = useState(null)
  const [zoomEnigma, setZoomEnigma] = useState(false)
  const [tabela, setTabela] = useState(null)
  const [progresso, setProgresso] = useState(null)
  const [movel, setMovel] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px), (pointer: coarse)')
    const aplicar = () => setMovel(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])
  const nomeConta = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').username || 'membro'
    } catch {
      return 'membro'
    }
  })()
  const { hash } = useLocation()

  useEffect(() => {
    fetch('/api/enigma/arquivo', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) throw new Error('Sem resposta.')
        setArquivo(d)
      })
      .catch((e) => setErro(e.message || 'Não consegui abrir o arquivo.'))
  }, [])

  useEffect(() => {
    fetch('/api/enigma2/estado', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProgresso(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let vivo = true
    const carregar = () =>
      fetch('/api/enigma2/tabela', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => vivo && setTabela((d && d.jogadores) || []))
        .catch(() => {})
    carregar()
    const t = setInterval(carregar, 30000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (hash === '#arquivo') {
      const el = document.getElementById('arquivo')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, arquivo])

  const vencedores = arquivo?.vencedores || []

  return (
    <PageShell>
      <PageHeader
        eyebrow="Jogar"
        title="Enigmas"
        subtitle="O Enigma 2 está a ser preparado."
      >
        <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
          <Sparkles className="h-3 w-3 text-[#ff7a94]" /> Semana 2 em breve
        </span>
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* estado: em breve */}
        <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <span className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#c50337]/15 blur-3xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff7a94]/30 bg-[#ff7a94]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ff9db0]">
            Protocolo Orion
          </span>

          <h2 className="mt-3 font-display text-3xl font-black leading-tight text-white">
            Enigma 2 <span className="text-[#ff7a94]">em breve</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            O Enigma 2 está a ser feito e abre em breve. Vai ter cinco etapas, uma carta dourada
            exclusiva e prémios para os mais rápidos — fica atento.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              className="ui-btn ui-btn-primary cursor-not-allowed opacity-50"
            >
              Abre em breve
            </button>
            <span className="text-[11px] text-zinc-500">
              O Enigma 2 está a ser feito. Ainda não é possível entrar.
            </span>
          </div>

          {movel && (
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              O Protocolo Orion precisa de teclado, consola (F12) e imagens grandes.
            </p>
          )}

          {erro && <p className="mt-3 text-xs text-[#ff9db0]">{erro}</p>}
        </section>

        {/* carta por revelar */}
        <section className="glass relative overflow-hidden rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a94]">
              Carta do enigma 2
            </h3>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">1/1</span>
          </div>

          <CartaEnigma2 nome={nomeConta} onClick={() => setZoomEnigma(true)} />

          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            Só há uma unidade. É entregue ao 1.º a terminar o enigma e fica na coleção dele.
          </p>
        </section>
      </div>

      {/* classificação do Enigma 2 */}
      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-black text-white">Classificação · Enigma 2</h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Quem chegou mais longe e quem terminou primeiro
            </p>
          </div>
        </div>

        <div className="glass overflow-hidden rounded-3xl">
          {!tabela ? (
            <div className="flex items-center justify-center gap-2 p-8 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
            </div>
          ) : tabela.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">
              Ainda ninguém entrou no Protocolo Orion. Sê o primeiro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    <th className="px-4 py-3 font-black">#</th>
                    <th className="px-4 py-3 font-black">Membro</th>
                    <th className="px-4 py-3 font-black">Etapa</th>
                    <th className="px-4 py-3 font-black">Tempo</th>
                    <th className="px-4 py-3 text-right font-black">Moedas</th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.map((j, i) => {
                    const posicao = j.concluido && j.posicao ? j.posicao : i + 1
                    const mm = j.tempoMs ? String(Math.floor(j.tempoMs / 60000)).padStart(2, '0') : null
                    const ss = j.tempoMs ? String(Math.floor((j.tempoMs % 60000) / 1000)).padStart(2, '0') : null
                    return (
                      <tr key={`${j.username}-${i}`} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 font-mono text-[12px] text-zinc-500">
                          {j.admin ? (
                            <span className="text-amber-300/80">dev</span>
                          ) : j.concluido ? (
                            <span className={posicao === 1 ? 'text-[#f5c542]' : 'text-zinc-300'}>
                              {posicao}.º
                            </span>
                          ) : (
                            `—`
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-200">
                          {j.username}
                          {j.admin && (
                            <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-300">
                              não conta
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {j.concluido ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                                j.admin
                                  ? 'border-white/15 bg-white/[0.04] text-zinc-400'
                                  : 'border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]'
                              }`}
                            >
                              <Trophy className="h-3 w-3" /> Concluído
                            </span>
                          ) : (
                            <span className="text-[12px] text-zinc-400">Etapa {j.etapa} / 5</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-zinc-400">
                          {mm ? `${mm}:${ss}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-zinc-400">
                          {j.admin ? '—' : j.moedas ? `+${j.moedas}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* arquivo */}
      <section id="arquivo" className="mt-6 scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-xl font-black text-white">Vencedores anteriores</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {vencedores.length} semana{vencedores.length === 1 ? '' : 's'}
          </span>
        </div>

        {!arquivo ? (
          <div className="glass flex justify-center rounded-3xl py-10">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        ) : vencedores.length === 0 ? (
          <p className="glass rounded-3xl px-5 py-6 text-sm text-zinc-500">
            Ainda não há vencedores.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {vencedores.map((v) => (
              <li key={v.semana}>
                <button
                  type="button"
                  onClick={() => setZoom(v)}
                  className="glass group flex w-full items-center gap-4 rounded-3xl p-4 text-left"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#ff9db0]">
                      Enigma {String(v.semana).replace('semana-', '')}
                    </span>
                    <span className="mt-0.5 block truncate font-display text-xl font-black text-white">
                      {v.nome}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">
                      1.º lugar · +{v.moedas} moedas · carta exclusiva 1/1
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 transition-colors group-hover:text-white">
                    Ver carta
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {zoomEnigma && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomEnigma(false)}
          role="presentation"
        >
          <div className="w-full max-w-[400px]" onClick={(e) => e.stopPropagation()}>
            <CartaEnigma2 nome={nomeConta} ampliada />
            <button
              type="button"
              onClick={() => setZoomEnigma(false)}
              className="ui-btn ui-btn-ghost mt-3 w-full justify-center"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <div className="w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <CartaEnigma nome={zoom.nome} ampliada />
            <div className="mt-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ff9db0]">
                Enigma {String(zoom.semana).replace('semana-', '')} · 1.º lugar
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                +{zoom.moedas} moedas e a carta exclusiva 1/1
              </p>
              <button
                type="button"
                onClick={() => setZoom(null)}
                className="ui-btn ui-btn-ghost mt-3 w-full justify-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
