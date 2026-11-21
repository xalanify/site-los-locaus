import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, X } from 'lucide-react'
import ProfileCard from './ProfileCard'
import MoedaLocaus from './MoedaLocaus'

/* ============================================================
   ÁLBUM DE CARTAS — visível no perfil de qualquer membro.
   ============================================================ */

export default function AlbumCartas({ username, inventario = 0 }) {
  const [dados, setDados] = useState(null)
  const [zoom, setZoom] = useState(null)

  useEffect(() => {
    if (!username) return undefined
    let vivo = true
    fetch(`/api/users/${encodeURIComponent(username)}/album`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && d && setDados(d))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [username])

  if (!dados) return null
  const total = Number(dados.total) || 0
  const cartas = Array.isArray(dados.cartas) ? dados.cartas : []
  const n = cartas.length
  const pct = total ? Math.round((n / total) * 100) : 0
  const restantes = Math.max(0, total - n)
  const slots = Math.min(restantes, 8)

  return (
    <section className="pf-section pf-album overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="pf-section-head">
        <div>
          <h2>Álbum de cartas</h2>
          <p className="pf-section-count mt-1 block">
            {n === 0 ? 'Ainda sem cartas' : `${n} de ${total} cartas`}
          </p>
        </div>
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/[0.06] px-2.5 py-1 text-[10px] font-bold text-amber-200"
            title="Valor atual das cartas e cores de nome que tem"
          >
            <MoedaLocaus size={12} />
            Valor de inventário: {Number(inventario || 0).toLocaleString('pt-PT')}
          </span>
          <span className="pf-section-count">{pct}%</span>
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#a78bfa] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {cartas.map((c) => (
          <button
            key={c.valor}
            type="button"
            onClick={() => setZoom(c)}
            className="relative h-[172px] w-[124px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 text-left transition hover:border-white/30"
            title={`Ampliar ${c.nome}`}
          >
            <span className="pointer-events-none absolute left-1/2 top-1/2 block origin-center scale-[0.32] -translate-x-1/2 -translate-y-1/2">
              <ProfileCard perfil={{ username }} variant={c.valor} jogos={[]} className="w-[380px]" />
            </span>
            <span className="absolute bottom-1 left-1/2 max-w-[110px] -translate-x-1/2 truncate rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-300">
              {c.nome}
            </span>
          </button>
        ))}

        {Array.from({ length: slots }).map((_, i) => (
          <div
            key={`lock-${i}`}
            className="grid h-[172px] w-[124px] shrink-0 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] text-zinc-700"
          >
            <Lock className="h-5 w-5" />
          </div>
        ))}

        {restantes > slots && (
          <div className="grid h-[172px] w-[124px] shrink-0 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] text-[11px] font-bold text-zinc-500">
            +{restantes - slots}
          </div>
        )}
      </div>

      {zoom &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={() => setZoom(null)}
            role="dialog"
            aria-label={`Carta ${zoom.nome}`}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setZoom(null)}
                className="absolute -right-2 -top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/80 text-white/70 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
              <ProfileCard
                perfil={{ username }}
                variant={zoom.valor}
                jogos={[]}
                className="w-[min(78vw,360px)]"
              />
              <p className="mt-3 text-center text-[12px] font-black uppercase tracking-[0.16em] text-white/70">
                {zoom.nome}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}
