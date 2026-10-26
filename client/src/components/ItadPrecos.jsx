import { useEffect, useState } from 'react'
import { Loader2, Tag, ExternalLink, TrendingDown, History } from 'lucide-react'

/* ============================================================
   Preços fora da Steam — IsThereAnyDeal / CheapShark
   ============================================================ */

const eur = (v) =>
  Number(v) > 0
    ? Number(v).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
    : '—'

export default function ItadPrecos({ titulo }) {
  const [estado, setEstado] = useState({ loading: true, dados: null, erro: '' })

  useEffect(() => {
    if (!titulo) return
    let vivo = true
    setEstado({ loading: true, dados: null, erro: '' })
    fetch(`/api/itad?title=${encodeURIComponent(titulo)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return
        if (!d || d.ok === false) {
          setEstado({ loading: false, dados: null, erro: (d && d.error) || 'Sem preços.' })
        } else {
          setEstado({ loading: false, dados: d, erro: '' })
        }
      })
      .catch(() => vivo && setEstado({ loading: false, dados: null, erro: 'Sem ligação aos preços.' }))
    return () => {
      vivo = false
    }
  }, [titulo])

  const d = estado.dados
  const melhor = d && d.deals && d.deals[0]

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.05] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-300">
          <Tag className="h-3.5 w-3.5" /> Preços fora da Steam
        </p>
        <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
          {d?.fonte || 'IsThereAnyDeal'}
        </span>
      </div>

      {estado.loading ? (
        <p className="flex items-center gap-2 py-3 text-[11px] text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> A procurar melhores preços…
        </p>
      ) : estado.erro ? (
        <p className="py-2 text-[11px] text-gray-500">{estado.erro}</p>
      ) : melhor ? (
        <>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
                Mais barato · {melhor.loja}
              </p>
              <p className="flex items-center gap-2 font-display text-xl font-black text-white">
                {eur(melhor.preco)}
                {melhor.desconto > 0 && (
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                    <TrendingDown className="mr-0.5 inline h-2.5 w-2.5" />-{melhor.desconto}%
                  </span>
                )}
              </p>
            </div>
            {d.historico && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                <History className="h-3 w-3" /> mínimo histórico {eur(d.historico)}
              </p>
            )}
            <a
              href={melhor.url || d.link}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1 rounded-full bg-violet-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-violet-400"
            >
              Abrir loja <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {d.deals.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {d.deals.slice(1, 5).map((x, i) => (
                <a
                  key={`${x.loja}-${i}`}
                  href={x.url || d.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                >
                  {x.loja} · {eur(x.preco)}
                </a>
              ))}
            </div>
          )}

          <a
            href={d.link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-violet-300 hover:text-violet-200"
          >
            Ver histórico completo no IsThereAnyDeal <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </>
      ) : (
        <a
          href={d?.link || `https://isthereanydeal.com/search/?q=${encodeURIComponent(titulo)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center gap-1 text-[11px] font-bold text-violet-300 hover:text-violet-200"
        >
          Procurar no IsThereAnyDeal <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
