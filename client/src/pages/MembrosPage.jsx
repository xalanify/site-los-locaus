import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Loader2, X } from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { BADGES, BadgeGem, distincoesOverclock, nomeDouradoClass, temPrevisao1, hexToRgba } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'
import PageShell from '../components/PageShell'
import ProfileBanner from '../components/ProfileBanner'

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
    <PageShell>
        {/* Cabeçalho — mesmo padrão das outras páginas (título em gradiente) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1
            className="font-black gradient-text"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
          >
            Membros
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-gray-400">
              Toda a comunidade — clica num membro para ver o perfil.
            </p>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-gray-400">
              {membros.length} · {online} online
            </span>
          </div>
        </motion.div>

        {/* Pesquisa */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar membro…"
            maxLength={30}
            className="w-full rounded-2xl border border-white/10 bg-[#141020] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-500/40"
          />
        </div>

        {aCarregar ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-7 w-7 text-gray-400" />
            <p className="text-sm text-gray-400">
              {query.trim() ? `Nenhum membro com “${query.trim()}”.` : 'Ainda sem membros.'}
            </p>
            {query.trim() && (
              <button
                onClick={() => setQuery('')}
                className="flex items-center gap-1.5 rounded-full bg-violet-500 px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-violet-400"
              >
                <X className="h-3.5 w-3.5" /> Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {filtrados.map((m) => {
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onProfile?.(m.username)}
                    className="glass relative w-full overflow-hidden rounded-2xl text-left transition-colors hover:bg-white/5"
                  >
                    <ProfileBanner
                      bannerId={m.banner_id}
                      overlay="from-black/80 via-black/55 to-black/85"
                    />
                    <span className="relative z-10 flex w-full items-center gap-3 px-4 py-3">
                      <span className="relative shrink-0">
                        <AvatarImg name={m.username} src={m.avatar_url} className="h-11 w-11" />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0e0e11] ${
                            m.online ? 'bg-emerald-400' : 'bg-gray-600'
                          }`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-bold ${
                            temPrevisao1(m.badges) ? nomeDouradoClass : 'text-white'
                          }`}
                        >
                          {m.username}
                        </span>
                        <span className={`block text-xs ${m.online ? 'text-emerald-400/90' : 'text-gray-500'}`}>
                          {m.online
                            ? m.plataforma === 'mobile'
                              ? 'No Telemóvel'
                              : m.plataforma === 'pc'
                                ? 'No PC'
                                : 'Online'
                            : 'Offline'}
                        </span>
                      </span>
                      {/* Distinções do membro (estáticas + overclock) */}
                      <span className="flex max-w-[60%] shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {m.badges.slice(0, 3).map((id) => {
                          const b = BADGES.find((x) => x.id === id)
                          return b ? <BadgeGem key={b.id} badge={b} size={22} /> : null
                        })}
                        {distincoesOverclock(m.distincoes).map((b) => (
                          <span
                            key={b.id}
                            title={b.desc || b.label}
                            className="flex items-center justify-center rounded-full p-[3px] ring-1"
                            style={{
                              background: hexToRgba(b.color, 0.09),
                              boxShadow: `0 0 12px ${hexToRgba(b.color, 0.25)}`,
                              // eslint-disable-next-line react/forbid-dom-props
                              ['--tw-ring-color']: hexToRgba(b.color, 0.4),
                            }}
                          >
                            {/* só o ícone — o nome aparece no passar o rato */}
                            <BadgeGem badge={b} size={18} />
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </PageShell>
  )
}
