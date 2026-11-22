import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'

/* ============================================================
   GTA6 — aviso na home (PC + telemóvel)
   Mesmo estilo terminal da página /gta6.
   ============================================================ */

const MONO = "'Courier New', Courier, 'Lucida Console', monospace"
const AZUL = '#4d8dff'
const BORDA = 'rgba(47,91,208,.55)'
const TEXTO = '#8ea6d6'
const VERDE = '#39ff88'
const VERMELHO = '#ff3b57'

export default function Gta6Banner() {
  return (
    <section
      className="gta6-banner relative overflow-hidden border"
      style={{
        borderColor: BORDA,
        background:
          'linear-gradient(rgba(70,120,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(70,120,255,.05) 1px, transparent 1px), #03081c',
        backgroundSize: '46px 46px, 46px 46px, auto',
        fontFamily: MONO,
        color: TEXTO,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-1.5"
        style={{ borderColor: 'rgba(47,91,208,.35)' }}
      >
        <span
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: '#9fc3ff' }}
        >
          <span className="inline-block h-1.5 w-1.5" style={{ background: VERDE }} /> gta6 build
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#5f7fae]">xbox 1.0.2.1 → pc</span>
      </div>

      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border"
          style={{ borderColor: AZUL, background: '#03081c', boxShadow: '0 0 20px rgba(77,141,255,.35)' }}
        >
          <img src="/gta6.png" alt="GTA VI" className="h-full w-full object-cover" />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="text-[clamp(17px,2.3vw,24px)] font-bold uppercase leading-tight tracking-[0.12em]"
            style={{ color: '#dbe7ff', textShadow: '0 0 18px rgba(77,141,255,.3)' }}
          >
            GTA6 build para PC <span style={{ color: VERMELHO }}>em breve</span>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.13em]">
            <AlertTriangle className="h-3 w-3" style={{ color: VERMELHO }} />
            gta6 xbox 1.0.2.1 build para pc — ensino tudo!
          </p>
        </div>

        <Link
          to="/gta6"
          className="inline-flex shrink-0 items-center justify-center gap-2 border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#cfe0ff] transition hover:brightness-125"
          style={{ borderColor: BORDA, background: 'linear-gradient(180deg, rgba(77,141,255,.24), rgba(30,58,138,.18))' }}
        >
          ver a página
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  )
}
