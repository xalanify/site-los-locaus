import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import CartasGaleria from '../components/CartasGaleria'
import ProfileCard from '../components/ProfileCard'
import { authHeaders } from '../lib/auth'

/* ============================================================
   Página das cartas — todas as cartas dos membros.
   No telemóvel em miniaturas; no PC em cartas grandes.
   ============================================================ */
export default function CartasPage() {
  const [membros, setMembros] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [query, setQuery] = useState('')
  const [cartaZoom, setCartaZoom] = useState(null)

  useEffect(() => {
    fetch('/api/users/list', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMembros(d?.users || []))
      .catch(() => {})
      .finally(() => setACarregar(false))
  }, [])

  const filtrados = membros.filter((m) =>
    m.username.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <PageShell>
      <PageHeader
        title="Cartas"
        subtitle={
          <>
            As cartas de perfil de todos os membros. Toca numa para ver em grande.{' '}
            <span className="glass-chip ml-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-zinc-300">
              {membros.length} cartas
            </span>
          </>
        }
      >
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar carta…"
            maxLength={30}
            className="glass-chip w-full rounded-xl py-2.5 pl-10 pr-9 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar pesquisa"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </PageHeader>

      {aCarregar ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
        </div>
      ) : filtrados.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">
          {query.trim() ? `Nenhuma carta de “${query.trim()}”.` : 'Ainda sem cartas.'}
        </p>
      ) : (
        <CartasGaleria membros={filtrados} onVer={setCartaZoom} />
      )}

      {cartaZoom && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setCartaZoom(null)}
        >
          <div className="relative w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setCartaZoom(null)}
              className="absolute -right-1 -top-1 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
              aria-label="Fechar carta"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="origin-center scale-[0.92] sm:scale-100">
              <ProfileCard
                perfil={cartaZoom}
                variant={cartaZoom.card_style || 'padrao'}
                jogos={[
                  ...new Set([
                    ...(cartaZoom.game_accounts || []),
                    ...Object.keys(cartaZoom.game_ranks || {}),
                  ]),
                ].filter((g) => g !== 'csgo')}
                className="w-full"
              />
            </div>
            <p className="mt-3 text-center text-xs font-bold text-zinc-300">{cartaZoom.username}</p>
          </div>
        </div>
      )}
    </PageShell>
  )
}
