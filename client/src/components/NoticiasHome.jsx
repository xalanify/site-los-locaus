import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Newspaper } from 'lucide-react'
import NoticiaModal from './NoticiaModal'

/* ============================================================
   Últimas notícias da home
   ------------------------------------------------------------
   As 4 mais recentes da mesma fonte da página de notícias.
   O servidor guarda em cache durante 1 hora, por isso os textos
   mudam de hora a hora e chegam já traduzidos para português.
   ============================================================ */

const fmtData = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NoticiasHome() {
  const [noticias, setNoticias] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [selecionada, setSelecionada] = useState(null)

  useEffect(() => {
    let vivo = true
    const carregar = async () => {
      try {
        const r = await fetch('/api/news/destaques')
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error((d && d.error) || 'Sem notícias.')
        if (vivo) {
          setNoticias(Array.isArray(d?.noticias) ? d.noticias : [])
          setErro('')
        }
      } catch (e) {
        if (vivo) setErro(e.message || 'Sem ligação às notícias.')
      } finally {
        if (vivo) setLoading(false)
      }
    }
    carregar()
    const t = setInterval(carregar, 10 * 60 * 1000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  return (
    <section id="noticias" className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
              Últimas notícias
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">
              Atualizadas de hora a hora · Call of Duty, Rockstar, NVIDIA, AMD e desbloqueios PS4/PS5
            </p>
          </div>
          <Link
            to="/jogos-steam?aba=noticias"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : erro ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
            {erro}
          </p>
        ) : !noticias.length ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
            Ainda não há notícias para mostrar. Volta dentro de pouco.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {noticias.map((n, i) => (
              <motion.button
                type="button"
                key={n.id || n.link}
                onClick={() => setSelecionada(n)}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.06, 0.24) }}
                className="glass group flex flex-col overflow-hidden rounded-2xl text-left"
              >
                <span className="relative block aspect-video overflow-hidden bg-violet-500/10">
                  {n.imagem ? (
                    <img
                      src={n.imagem}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Newspaper className="h-10 w-10 text-violet-300/30" />
                    </span>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-200 ring-1 ring-white/10">
                    {n.fonte}
                  </span>
                </span>

                <span className="flex flex-1 flex-col p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {fmtData(n.data)}
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-violet-300">
                    {n.titulo}
                  </span>
                  {n.resumo && (
                    <span className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-gray-400">
                      {n.resumo}
                    </span>
                  )}
                  <span className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-black uppercase tracking-wide text-violet-300">
                    <Sparkles className="h-3 w-3" /> Ver resumo
                  </span>
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <NoticiaModal noticia={selecionada} onFechar={() => setSelecionada(null)} />
    </section>
  )
}
