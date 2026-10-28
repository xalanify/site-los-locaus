import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Newspaper, RefreshCw, Sparkles, Gamepad2 } from 'lucide-react'
import PageShell from '../components/PageShell'
import NoticiaModal from '../components/NoticiaModal'

/* ============================================================
   Notícias — antiga "Loja de Jogos"
   ------------------------------------------------------------
   A página mostra apenas notícias de gaming/hardware. A loja de
   jogos deixou de existir; o que interessa são as notícias.
   ============================================================ */

const fmtData = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

export default function SteamStorePage() {
  const [noticias, setNoticias] = useState({ loading: true, lista: [], erro: '' })
  const [aberta, setAberta] = useState(null)

  const carregar = async () => {
    setNoticias((n) => ({ ...n, loading: true, erro: '' }))
    try {
      const r = await fetch('/api/news', { cache: 'no-store' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Sem ligação às notícias.')
      setNoticias({ loading: false, lista: (d && d.noticias) || [], erro: '' })
    } catch (e) {
      setNoticias((n) => ({
        ...n,
        loading: false,
        erro: e.message || 'Sem ligação às notícias.',
      }))
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1
              className="font-black gradient-text"
              style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
            >
              Notícias
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              As últimas notícias de gaming e hardware — Call of Duty, Rockstar/GTA, NVIDIA,
              AMD, processadores, memórias e desbloqueios PS4/PS5.
            </p>
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={noticias.loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${noticias.loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </motion.div>

      <section className="rounded-2xl border border-white/10 bg-[#121214]/80 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-zinc-400" />
            <h2 className="ui-section-title font-display">Últimas notícias</h2>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-gray-500">
            Atualiza de hora a hora
          </span>
        </div>

        {noticias.loading && noticias.lista.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-14 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar notícias…
          </p>
        ) : noticias.erro && noticias.lista.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-bold text-yellow-300">{noticias.erro}</p>
            <button
              type="button"
              onClick={carregar}
              className="ui-btn ui-btn-primary ui-btn-sm mt-3"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tentar outra vez
            </button>
          </div>
        ) : noticias.lista.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            Ainda não há notícias. Voltamos a tentar em instantes.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {noticias.lista.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => setAberta(n)}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] text-left transition-colors hover:border-zinc-400/35 hover:bg-white/[0.05]"
              >
                {n.imagem ? (
                  <img
                    src={n.imagem}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallback) {
                        e.currentTarget.dataset.fallback = '1'
                        e.currentTarget.src = '/noticias/gaming.svg'
                      } else {
                        e.currentTarget.style.display = 'none'
                      }
                    }}
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-zinc-500/20 to-[#0b0b0c]">
                    <Gamepad2 className="h-8 w-8 text-zinc-300/60" />
                  </div>
                )}
                <div className="p-3">
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-300">
                    {n.fonte}
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-500">{fmtData(n.data)}</span>
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-white">
                    {n.titulo}
                  </h3>
                  {n.resumo && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-400">
                      {n.resumo}
                    </p>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-500 group-hover:text-zinc-300">
                    Ver resumo <Sparkles className="h-3 w-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-[10px] font-semibold text-gray-600">
        Fontes: sites oficiais e imprensa de gaming. Resumos em português.
      </p>

      <NoticiaModal noticia={aberta} onFechar={() => setAberta(null)} />
    </PageShell>
  )
}
