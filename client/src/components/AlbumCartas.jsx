import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import ProfileCard from './ProfileCard'

/* ============================================================
   ÁLBUM DE CARTAS — visível no perfil de qualquer membro.
   ============================================================ */

export default function AlbumCartas({ username }) {
  const [dados, setDados] = useState(null)

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
        <span className="pf-section-count">{pct}%</span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#a78bfa] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {cartas.map((c) => (
          <div
            key={c.valor}
            className="relative h-[172px] w-[124px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30"
            title={c.nome}
          >
            <span className="pointer-events-none absolute left-1/2 top-1/2 block origin-center scale-[0.32] -translate-x-1/2 -translate-y-1/2">
              <ProfileCard perfil={{ username }} variant={c.valor} jogos={[]} className="w-[380px]" />
            </span>
            <span className="absolute bottom-1 left-1/2 max-w-[110px] -translate-x-1/2 truncate rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-300">
              {c.nome}
            </span>
          </div>
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
    </section>
  )
}
