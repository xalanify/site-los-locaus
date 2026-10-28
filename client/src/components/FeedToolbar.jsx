import { ChevronDown, Clapperboard, LayoutGrid, MessageSquare } from 'lucide-react'
import { gameLabel } from '../data/clipGames'

const TABS = [
  { id: 'tudo', label: 'Tudo', Icon: LayoutGrid },
  { id: 'videos', label: 'Clips', Icon: Clapperboard },
  { id: 'mensagens', label: 'Mensagens', Icon: MessageSquare },
]

/* Barra de filtros do feed do perfil — vidro, segmentos e selects
   discretos, no mesmo estilo do resto do site. */
export default function FeedToolbar({
  filtro,
  setFiltro,
  jogos = [],
  jogo,
  setJogo,
  ordem,
  setOrdem,
  mostrarFiltros = true,
}) {
  return (
    <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-2">
      <div className="flex rounded-xl bg-black/25 p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition-colors sm:px-3 ${
              filtro === id
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mostrarFiltros && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {jogos.length > 0 && (
            <div className="relative">
              <select
                value={jogo}
                onChange={(e) => setJogo(e.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-white/[0.045] py-2 pl-3 pr-8 text-[11px] font-bold text-zinc-200 outline-none transition-colors hover:bg-white/[0.07] focus:border-white/25"
              >
                <option value="" className="bg-[#161618]">
                  Todos os jogos
                </option>
                {jogos.map((g) => (
                  <option key={g} value={g} className="bg-[#161618]">
                    {gameLabel(g)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            </div>
          )}

          <div className="relative">
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              className="appearance-none rounded-xl border border-white/10 bg-white/[0.045] py-2 pl-3 pr-8 text-[11px] font-bold text-zinc-200 outline-none transition-colors hover:bg-white/[0.07] focus:border-white/25"
            >
              <option value="recentes" className="bg-[#161618]">
                Mais recentes
              </option>
              <option value="views" className="bg-[#161618]">
                Mais vistos
              </option>
              <option value="titulo" className="bg-[#161618]">
                Título (A-Z)
              </option>
              <option value="jogo" className="bg-[#161618]">
                Jogo (A-Z)
              </option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>
      )}
    </div>
  )
}
