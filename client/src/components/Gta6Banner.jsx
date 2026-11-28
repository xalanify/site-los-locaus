import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'

/* ============================================================
   GTA6 — aviso na home (PC + telemóvel)
   Visual editorial (o /gta6 continua com o seu estilo próprio)
   ============================================================ */

export default function Gta6Banner() {
  return (
    <section className="gta6-banner relative mb-4 overflow-hidden rounded-2xl border border-[#ece5d8]/10 bg-[#14110c]">
      <div className="flex items-center justify-between gap-3 border-b border-[#ece5d8]/10 px-4 py-2">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e4cf9f]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c9a86a]" /> gta6 build
        </span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-[#7a7264]">
          xbox 1.0.2.1 → pc
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#ece5d8]/15 bg-[#0b0a08]">
          <img src="/gta6.png" alt="GTA VI" className="h-full w-full object-cover" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[clamp(18px,2.4vw,26px)] font-normal leading-tight text-[#f1e9db]">
            Avisos importantes <em className="italic text-[#e4cf9f]">GTA 6 port para PC</em>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[#a89e8d]">
            <AlertTriangle className="h-3 w-3 text-[#c9a86a]" /> leia os avisos
          </p>
        </div>

        <Link to="/gta6" className="ui-btn ui-btn-ghost ui-btn-sm shrink-0">
          ver avisos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  )
}
