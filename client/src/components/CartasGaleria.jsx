import ProfileCard from './ProfileCard'

/* Galeria das cartas dos membros.
   Telemóvel: miniaturas compactas (dá para rolar).
   PC: cartas grandes, como antes. */

const jogosDe = (m) =>
  [
    ...new Set([...(m.game_accounts || []), ...Object.keys(m.game_ranks || {})]),
  ].filter((g) => g !== 'csgo')

export default function CartasGaleria({ membros = [], onVer }) {
  return (
    <>
      {/* telemóvel / tablet */}
      <div className="flex flex-wrap gap-3 md:hidden">
        {membros.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onVer?.(m)}
            className="group relative h-[150px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-500/10 to-black/40"
          >
            <span className="pointer-events-none absolute left-1/2 top-1/2 block origin-center scale-[0.34] -translate-x-1/2 -translate-y-1/2">
              <ProfileCard
                perfil={m}
                variant={m.card_style || 'padrao'}
                jogos={jogosDe(m)}
                className="w-[380px]"
              />
            </span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-300">
              {m.username}
            </span>
          </button>
        ))}
      </div>

      {/* PC */}
      <div className="hidden columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4 md:block">
        {membros.map((m) => (
          <div key={m.id} className="mb-4 break-inside-avoid">
            <button type="button" onClick={() => onVer?.(m)} className="block w-full text-left">
              <ProfileCard
                perfil={m}
                variant={m.card_style || 'padrao'}
                jogos={jogosDe(m)}
                className="w-full"
              />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
