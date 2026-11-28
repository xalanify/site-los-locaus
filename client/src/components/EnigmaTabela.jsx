import { useEffect, useMemo, useState } from 'react'
import { Crown, CheckCircle2, Timer } from 'lucide-react'

/* ============================================================
   TABELA DO ENIGMA — igual na home e na página /enigmas
   Sem tempos. Com contagem decrescente até 23 à meia-noite.
   ============================================================ */

const medalha = (pos) =>
  pos === 1 ? 'text-[#f5c542]' : pos === 2 ? 'text-[#cfd6e4]' : pos === 3 ? 'text-[#d9925a]' : 'text-zinc-500'

const dois = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0')

export default function EnigmaTabela({ limite = 10, titulo = 'Classificação' }) {
  const [dados, setDados] = useState(null)
  const [eu, setEu] = useState('')
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    try {
      setEu(String(JSON.parse(localStorage.getItem('user') || '{}').username || '').toLowerCase())
    } catch {
      setEu('')
    }
  }, [])

  useEffect(() => {
    let vivo = true
    const carregar = () =>
      fetch('/api/enigma/tabela', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (vivo) setDados(d)
        })
        .catch(() => {})
    carregar()
    const t = setInterval(carregar, 30000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const lista = (dados?.tabela || []).slice(0, limite)

  const contagem = useMemo(() => {
    if (!dados?.fim) return null
    const resta = new Date(dados.fim).getTime() - agora
    if (resta <= 0) return { fim: true, d: 0, h: 0, m: 0, s: 0 }
    const s = Math.floor(resta / 1000)
    return {
      fim: false,
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
    }
  }, [dados, agora])

  return (
    <div className="glass relative overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a94]">{titulo}</h3>
        <div className="flex items-center gap-2">
          {contagem && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] ${
                contagem.fim
                  ? 'border-white/10 bg-white/5 text-zinc-500'
                  : 'border-[#ff7a94]/30 bg-[#c50337]/10 text-[#ffb3c1]'
              }`}
              title="Fim do enigma: 19 deste mês, à meia-noite"
            >
              <Timer className="h-3 w-3" />
              {contagem.fim
                ? 'Terminado'
                : `${contagem.d}d ${dois(contagem.h)}h ${dois(contagem.m)}m ${dois(contagem.s)}s`}
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {dados ? `${dados.total} jogador${dados.total === 1 ? '' : 'es'}` : '…'}
          </span>
        </div>
      </div>

      {!lista.length ? (
        <p className="border-t border-white/10 px-5 py-6 text-sm text-zinc-500">
          Ainda ninguém entrou. Sê o primeiro a resolver o enigma.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-white/10">
          <table className="w-full min-w-[440px] border-collapse text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                <th className="px-4 py-2.5 font-bold">#</th>
                <th className="px-2 py-2.5 font-bold">Jogador</th>
                <th className="px-2 py-2.5 text-center font-bold">Etapa</th>
                <th className="px-4 py-2.5 text-right font-bold">Prémio</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((j, i) => {
                const meu = eu && String(j.nome).toLowerCase() === eu
                return (
                  <tr
                    key={j.nome + i}
                    className={`border-t border-white/[0.06] text-sm ${meu ? 'bg-[#c50337]/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs font-bold ${medalha(i + 1)}`}>
                        {j.admin ? (
                          '—'
                        ) : j.terminou ? (
                          <span className="inline-flex items-center gap-1">
                            {i + 1}
                            {i === 0 && <Crown className="h-3.5 w-3.5" />}
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                    </td>
                    <td className="max-w-[150px] px-2 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`truncate font-bold ${meu ? 'text-white' : 'text-zinc-200'}`}>
                          {j.nome}
                        </span>
                        {j.admin && (
                          <span className="shrink-0 rounded-full border border-[#ff7a94]/30 bg-[#c50337]/20 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-[#ffb3c1]">
                            DEV
                          </span>
                        )}
                        {meu && !j.admin && (
                          <span className="shrink-0 rounded-full bg-[#c50337]/25 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-[#ff9db0]">
                            TU
                          </span>
                        )}
                      </span>
                      {j.admin ? (
                        <span className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
                          desenvolvedor · fora da classificação
                        </span>
                      ) : (
                        j.terminou && (
                          <span className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" /> terminou · {j.posicao || i + 1}.º
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-[11px] text-[#ffb3c1]">
                          {j.etapa}
                          <span className="text-zinc-600">/6</span>
                        </span>
                        <span className="flex gap-0.5" aria-hidden="true">
                          {Array.from({ length: 6 }).map((_, n) => (
                            <span
                              key={n}
                              className={`h-1 w-2 rounded-full ${
                                n < j.etapa ? (j.terminou ? 'bg-emerald-400' : 'bg-[#ff2e5b]') : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {j.moedas ? (
                        <span className="font-mono text-xs font-bold text-[#f5c542]">+{j.moedas}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
