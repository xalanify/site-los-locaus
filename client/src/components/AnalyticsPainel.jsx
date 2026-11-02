import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Eye, Loader2, Smartphone, Users } from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ESTATÍSTICAS DO SITE (dentro do painel admin) — analytics
   simples, sem cookies e sem nomes.
   ============================================================ */

const fmt = (n) => Number(n || 0).toLocaleString('pt-PT')

function Barra({ valor, max, cor = '#f7a8a8' }) {
  const pct = max ? Math.round((valor / max) * 100) : 0
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
    </span>
  )
}

export default function AnalyticsPainel() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/users/analytics', { headers: authHeaders(), cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir as estatísticas.')
        return d
      })
      .then(setDados)
      .catch((e) => setErro(e.message))
  }, [])

  const maxDia = useMemo(
    () => Math.max(1, ...((dados && dados.dias) || []).map((d) => d.n)),
    [dados],
  )
  const maxPagina = useMemo(
    () => Math.max(1, ...((dados && dados.paginas) || []).map((p) => p.n)),
    [dados],
  )
  const paginas = (dados && dados.paginas) || []
  const mais = paginas.slice(0, 8)
  const menos = [...paginas].reverse().slice(0, 8)

  if (erro) {
    return (
      <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-6 text-sm text-red-300">
        {erro}
      </p>
    )
  }

  if (!dados) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-16 text-sm text-zinc-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> A abrir as estatísticas…
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          { Icon: Eye, label: 'Visitas (14 dias)', valor: fmt(dados.totais?.views), cor: '#f7a8a8' },
          { Icon: Users, label: 'Membros ativos', valor: fmt(dados.totais?.membros), cor: '#60a5fa' },
          { Icon: Smartphone, label: 'Visitas anónimas', valor: fmt(dados.totais?.anonimas), cor: '#a78bfa' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <span
              className="grid h-8 w-8 place-items-center rounded-xl"
              style={{ background: `${k.cor}1f`, color: k.cor }}
            >
              <k.Icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
              {k.label}
            </p>
            <p className="font-display text-2xl font-black tabular-nums text-white">{k.valor}</p>
          </div>
        ))}
      </div>

      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
          <BarChart3 className="h-4 w-4 text-[#f7a8a8]" /> Visitas por dia
        </h2>
        <div className="flex h-28 items-end gap-1.5">
          {(dados.dias || []).map((d) => (
            <div key={d.dia} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-zinc-500">{d.n}</span>
              <span
                className="w-full rounded-t bg-[#f7a8a8]/80"
                style={{ height: `${Math.max(4, (d.n / maxDia) * 72)}px` }}
                title={`${d.dia}: ${d.n}`}
              />
              <span className="text-[8px] text-zinc-600">{d.dia.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { titulo: 'Páginas mais usadas', lista: mais, cor: '#f7a8a8' },
          { titulo: 'Páginas menos usadas', lista: menos, cor: '#60a5fa' },
        ].map((bloco) => (
          <section key={bloco.titulo} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-3 text-sm font-black text-white">{bloco.titulo}</h2>
            <ul className="space-y-2">
              {bloco.lista.map((p) => (
                <li key={p.path}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-semibold text-zinc-300">{p.path}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      {fmt(p.n)} · {fmt(p.pessoas)} pessoas
                    </span>
                  </div>
                  <Barra valor={p.n} max={maxPagina} cor={bloco.cor} />
                </li>
              ))}
              {bloco.lista.length === 0 && (
                <li className="py-3 text-center text-xs text-zinc-500">Ainda sem dados.</li>
              )}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-3 text-sm font-black text-white">Dispositivos</h2>
          <ul className="space-y-2">
            {(dados.dispositivos || []).map((d) => {
              const max = Math.max(1, ...(dados.dispositivos || []).map((x) => x.n))
              return (
                <li key={d.device}>
                  <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                    <span>{d.device === 'telemovel' ? 'Telemóvel' : 'PC'}</span>
                    <span className="tabular-nums">{fmt(d.n)}</span>
                  </div>
                  <Barra valor={d.n} max={max} cor="#a78bfa" />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="mb-3 text-sm font-black text-white">De onde vêm</h2>
          <ul className="space-y-2">
            {(dados.origens || []).map((o) => {
              const max = Math.max(1, ...(dados.origens || []).map((x) => x.n))
              return (
                <li key={o.origem}>
                  <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                    <span className="truncate">{o.origem}</span>
                    <span className="tabular-nums">{fmt(o.n)}</span>
                  </div>
                  <Barra valor={o.n} max={max} cor="#34d399" />
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="mb-1 text-sm font-black text-white">Membros mais ativos</h2>
        <p className="mb-3 text-[11px] text-zinc-500">Códigos anónimos — não há nomes guardados.</p>
        <ul className="space-y-1">
          {(dados.membros || []).map((m, i) => (
            <li
              key={m.user_hash}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-[11px] odd:bg-white/[0.02]"
            >
              <span className="w-5 text-zinc-600">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-zinc-300">
                Membro #{String(m.user_hash).slice(0, 6)}
              </span>
              <span className="tabular-nums text-zinc-400">{fmt(m.paginas)} páginas</span>
              <span className="w-16 text-right font-bold tabular-nums text-white">{fmt(m.n)}</span>
            </li>
          ))}
          {(!dados.membros || dados.membros.length === 0) && (
            <li className="py-4 text-center text-xs text-zinc-500">Ainda sem dados.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
