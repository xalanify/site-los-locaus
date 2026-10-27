import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ExternalLink, Sparkles, Newspaper, Clock } from 'lucide-react'

/* ============================================================
   Janela flutuante da notícia
   ------------------------------------------------------------
   Mostra a imagem, o resumo já traduzido e uma lista de pontos
   chave. O texto completo fica sempre na fonte original.
   ============================================================ */

const fmtData = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pontosChave(n) {
  const texto = `${n.titulo || ''}. ${n.resumo || ''}`.replace(/\s+/g, ' ').trim()
  const frases = texto
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter((f) => f.length > 30)
  const pontos = []
  for (const f of frases) {
    if (!pontos.some((p) => p.toLowerCase() === f.toLowerCase())) pontos.push(f)
    if (pontos.length >= 3) break
  }
  if (!pontos.length && n.titulo) pontos.push(n.titulo)
  return pontos
}

function porqueImporta(n) {
  const t = `${n.titulo || ''} ${n.resumo || ''}`.toLowerCase()
  if (/gta|rockstar|red dead/.test(t)) return 'Pode trazer novidades sobre GTA 6, Red Dead ou o próximo anúncio da Rockstar.'
  if (/call of duty|warzone|modern warfare|black ops|\bcod\b/.test(t)) return 'Afeta o próximo ciclo de Call of Duty e Warzone — armas, mapas, temporadas ou rumores.'
  if (/battlefield|\bdice\b/.test(t)) return 'Novidade sobre o próximo Battlefield: pode ser oficial ou rumor vindo de fontes próximas da EA/DICE.'
  if (/nvidia|geforce|rtx|amd|radeon|ryzen|gpu|cpu/.test(t)) return 'Pode mexer em preços, disponibilidade ou desempenho de GPUs/CPUs.'
  if (/jailbreak|ps4|ps5|playstation|cfw|hen/.test(t)) return 'Interessa a quem acompanha desbloqueios e homebrew de PS4/PS5.'
  return 'Notícia relevante para gaming e hardware, escolhida pelas fontes que acompanhamos.'
}

export default function NoticiaModal({ noticia, onFechar }) {
  if (!noticia) return null
  const pontos = pontosChave(noticia)

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:items-center"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
          className="my-6 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0a16] shadow-2xl"
        >
          {/* imagem */}
          {noticia.imagem && (
            <div className="relative h-48 overflow-hidden bg-violet-500/10 sm:h-60">
              <img
                src={noticia.imagem}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = '1'
                    e.currentTarget.src = '/noticias/gaming.svg'
                  } else {
                    e.currentTarget.style.display = 'none'
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a16] via-transparent to-black/20" />
              <button
                type="button"
                onClick={onFechar}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-gray-200 ring-1 ring-white/15 transition hover:bg-black hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className={`p-4 sm:p-5 ${noticia.imagem ? '' : 'pt-12'}`}>
            {!noticia.imagem && (
              <button
                type="button"
                onClick={onFechar}
                className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-gray-200 hover:bg-white/20 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-200 ring-1 ring-violet-400/20">
                <Newspaper className="h-3 w-3" /> {noticia.fonte || 'Notícia'}
              </span>
              {noticia.data && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-3 w-3" /> {fmtData(noticia.data)}
                </span>
              )}
            </div>

            <h2 className="mt-2 font-display text-lg font-black leading-snug text-white sm:text-xl">
              {noticia.titulo}
            </h2>

            <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-3.5">
              <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-300">
                <Sparkles className="h-3.5 w-3.5" /> Resumo inteligente
              </h3>
              <ul className="mt-2 space-y-1.5">
                {pontos.map((p, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-gray-200">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {noticia.resumo && (
                <p className="mt-2 border-t border-violet-400/15 pt-2 text-[11.5px] leading-relaxed text-gray-400">
                  {noticia.resumo}
                </p>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                Porque importa
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-300">{porqueImporta(noticia)}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onFechar}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Fechar
              </button>
              <a
                href={noticia.link}
                target="_blank"
                rel="noreferrer"
                className="ui-btn ui-btn-primary ui-btn-sm"
              >
                Ler notícia completa <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
