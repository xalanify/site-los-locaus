/* ============================================================
   Etiqueta "BETA" — pequena, fixa no topo à direita, presente
   em todos os ecrãs (é só decorativa, não cliquável).
   ============================================================ */
export default function BetaBadge() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-16 top-1.5 z-[70] hidden select-none text-right sm:right-28 sm:top-2 lg:right-6 lg:top-3 lg:block"
    >
      <span className="inline-block rounded-md border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
        Beta
      </span>
      <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        Em desenvolvimento
      </span>
    </div>
  )
}
