/* Etiqueta "BETA · EM DESENVOLVIMENTO" — visível em PC e telemóvel,
   discreta e sem tapar a navegação. */
export default function BetaBadge() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-16 top-1.5 z-[70] hidden select-none text-right sm:right-28 sm:top-2 lg:right-6 lg:top-3 lg:block"
    >
      <span className="font-display text-[8px] font-black uppercase tracking-[0.18em] text-violet-300 sm:text-[9px] lg:text-[10px]">
        Beta
      </span>
      <span className="ml-1 text-[7px] font-bold uppercase tracking-[0.12em] text-gray-400 sm:text-[8px] lg:ml-0 lg:mt-0.5 lg:block lg:text-[8px] lg:text-gray-500">
        Em desenvolvimento
      </span>
    </div>
  )
}
