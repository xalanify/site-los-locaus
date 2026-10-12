import { useEffect, useState } from 'react'
import { Users, Search, Loader2 } from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { BADGES, BadgeGem } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'

/* ============================================================
   Página de membros — lista toda a comunidade com o estado
   (online/offline), as distinções de cada um e pesquisa.
   Clicar num membro abre o perfil público dele.
   ============================================================ */
export default function MembrosPage({ onProfile }) {
  const [membros, setMembros] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/users/list', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMembros(d?.users || []))
      .catch(() => {})
      .finally(() => setACarregar(false))
  }, [])

  const filtrados = membros.filter((m) =>
    m.username.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const online = membros.filter((m) => m.online).length

  return (
    <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Cabeçalho */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
            <Users className="h-5 w-5 text-orange-400" />
            Membros
          </h1>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-gray-400">
            {membros.length} · {online} online
          </span>
        </div>

        {/* Pesquisa */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar membro…"
            maxLength={30}
            className="w-full rounded-2xl border border-white/10 bg-[#0e0e11] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/40"
          />
        </div>

        {aCarregar ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">Nenhum membro encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onProfile?.(m.username)}
                  className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <span className="relative shrink-0">
                    <AvatarImg name={m.username} src={m.avatar_url} className="h-11 w-11" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0e0e11] ${
                        m.online ? 'bg-emerald-400' : 'bg-gray-600'
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">
                      {m.username}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {m.online ? 'Online' : 'Offline'}
                    </span>
                  </span>
                  {/* Distinções do membro */}
                  <span className="flex shrink-0 items-center gap-1.5">
                    {m.badges.slice(0, 3).map((id) => {
                      const b = BADGES.find((x) => x.id === id)
                      return b ? <BadgeGem key={b.id} badge={b} size={22} /> : null
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
