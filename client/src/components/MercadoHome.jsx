import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Loader2, Sparkles } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import MoedaLocaus from './MoedaLocaus'

/* ============================================================
   MERCADO (home) — prévia dos cosméticos mais caros, com
   mini-gráfico e atalho para o mercado completo.
   ============================================================ */

const fmt = (n) =>
  Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const RARIDADE = {
  comum: '#a1a1aa',
  raro: '#60a5fa',
  epico: '#c084fc',
  lendario: '#f5c542',
}

function MiniGrafico({ serie, cor }) {
  if (!serie || serie.length < 2) return <span className="text-[10px] text-zinc-600">—</span>
  const w = 86
  const h = 26
  const precos = serie.map((p) => p.preco)
  const min = Math.min(...precos)
  const max = Math.max(...precos)
  const span = max - min || 1
  const pontos = serie
    .map((p, i) => {
      const x = (i / (serie.length - 1)) * w
      const y = h - ((p.preco - min) / span) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={pontos}
        fill="none"
        stroke={cor}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function MercadoHome() {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    fetch('/api/mercado', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDados(d))
      .catch(() => {})
  }, [])

  const top = useMemo(() => {
    const lista = (dados && dados.itens) || []
    return [...lista]
      .filter((x) => !x.emBreve)
      .sort((a, b) => b.preco_compra - a.preco_compra)
      .slice(0, 3)
  }, [dados])

  const saldo = dados && dados.saldo ? dados.saldo.disponiveis : null

  return (
    <section className="relative pt-20 pb-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="glass relative overflow-hidden rounded-3xl">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f7a8a8]/30 bg-[#f7a8a8]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f7a8a8]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f7a8a8] opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#f7a8a8]" />
                </span>
                Mercado ao vivo
              </span>
              <h2 className="mt-2 font-display text-2xl font-black leading-tight text-white sm:text-3xl">
                Os cosméticos mais caros agora
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Cores, cartas e estilos com preço a mexer. Vê o topo do mercado e vai buscar o teu.
              </p>
            </div>
            <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f7a8a8]/10 text-[#f7a8a8] ring-1 ring-[#f7a8a8]/20 sm:grid">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>

          <div className="border-t border-white/10">
            {!dados ? (
              <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir o mercado…
              </div>
            ) : top.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">Ainda sem itens no mercado.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {top.map((item, i) => {
                  const sobe = item.variacao >= 0
                  return (
                    <li key={item.id}>
                      <Link
                        to="/cosmeticos"
                        className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03] sm:px-6"
                      >
                        <span className="w-4 shrink-0 text-center font-display text-sm font-black tabular-nums text-zinc-600">
                          {i + 1}
                        </span>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: RARIDADE[item.raridade],
                            boxShadow: `0 0 10px ${RARIDADE[item.raridade]}`,
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-white">
                            {item.nome}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            {item.tipo === 'cor' ? 'cor de nome' : item.tipo}
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <MiniGrafico
                            serie={item.historico}
                            cor={sobe ? '#34d399' : '#f87171'}
                          />
                        </span>
                        <span className="w-[86px] shrink-0 text-right">
                          <span className="block font-display text-sm font-black tabular-nums text-white">
                            {fmt(item.preco_compra)}
                          </span>
                          <span
                            className={`block text-[10px] font-bold ${
                              sobe ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {sobe ? '+' : ''}
                            {item.variacao.toFixed(1)}%
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-100">
              <MoedaLocaus size={14} />
              {saldo == null ? '—' : Number(saldo).toLocaleString('pt-PT')} disponíveis
            </span>
            <Link to="/cosmeticos" className="ui-btn ui-btn-primary ui-btn-sm">
              Ir para o mercado <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
