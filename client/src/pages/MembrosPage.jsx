import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Loader2, X, Award, Sparkles } from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { badgeDe, BadgeGem, distincoesOverclock, nomeDouradoClass, temPrevisao1, hexToRgba } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'
import { vistoPorUltimo } from '../lib/tempo'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import ProfileCard from '../components/ProfileCard'
import ProfileBanner from '../components/ProfileBanner'
import LiveBadge from '../components/LiveBadge'
import { classesCard, classesNome } from '../data/nomeEfeitos'

/* ============================================================
   Página de membros — grelha de cartões da comunidade
   (banner, avatar, nome, distinções e estado online).
   Clicar num membro abre o perfil público dele.
   ============================================================ */
export default function MembrosPage({ onProfile }) {
  const [membros, setMembros] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [query, setQuery] = useState('')
  const [vista, setVista] = useState('membros')
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
  const online = membros.filter((m) => m.online && !m.away).length
  const ausentes = membros.filter((m) => m.online && m.away).length

  return (
    <PageShell>
      <PageHeader
        title="Membros"
        subtitle={
          <>
            Toda a comunidade — clica num membro para ver o perfil.{' '}
            <span className="glass-chip ml-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-zinc-300">
              {membros.length} membros · {online} online
              {ausentes ? ` · ${ausentes} ausente${ausentes > 1 ? 's' : ''}` : ''}
            </span>
          </>
        }
      >
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar membro…"
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

      <div className="ui-tabs mb-4 max-w-xs">
        {[
          { id: 'membros', label: 'Membros' },
          { id: 'cartas', label: 'Cartas' },
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            data-active={vista === v.id}
            className="ui-tab"
          >
            {v.label}
          </button>
        ))}
      </div>

      {aCarregar ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Search className="h-7 w-7 text-zinc-400" />
          <p className="text-sm text-zinc-400">
            {query.trim() ? `Nenhum membro com “${query.trim()}”.` : 'Ainda sem membros.'}
          </p>
          {query.trim() && (
            <button onClick={() => setQuery('')} className="ui-btn ui-btn-primary ui-btn-sm">
              <X className="h-3.5 w-3.5" /> Limpar pesquisa
            </button>
          )}
        </div>
      ) : vista === 'cartas' ? (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          {filtrados.map((m) => (
            <div key={m.id} className="mb-4 break-inside-avoid">
              <button
                type="button"
                onClick={() => setCartaZoom(m)}
                className="block w-full text-left"
              >
                <ProfileCard
                  perfil={m}
                  variant={m.card_style || 'padrao'}
                  jogos={[
                    ...new Set([
                      ...(m.game_accounts || []),
                      ...Object.keys(m.game_ranks || {}),
                    ]),
                  ].filter((g) => g !== 'csgo')}
                  className="w-full"
                />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtrados.map((m) => {
            const dists = distincoesOverclock(m.distincoes)
            const gear = [m.mouse, m.dpi ? `${m.dpi} DPI` : ''].filter(Boolean).join(' · ')
            return (
              <li key={m.id}>
                <button
                  onClick={() => onProfile?.(m.username)}
                  className={`glass group relative w-full overflow-hidden rounded-2xl text-left ${classesCard(m.name_effect)}`}
                >
                  {/* Banner do perfil */}
                  <span className="relative block h-28 overflow-hidden sm:h-32">
                    <ProfileBanner
                      bannerId={m.banner_id}
                      overlay="from-black/35 via-black/15 to-black/75"
                    />
                    <span className="absolute left-2.5 top-2.5 z-10">
                      <LiveBadge username={m.username} />
                    </span>
                    <span className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/85 backdrop-blur-md">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          m.online
                            ? m.away
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                            : 'bg-zinc-500'
                        }`}
                      />
                      {m.online ? (m.away ? 'Ausente' : 'Online') : 'Offline'}
                    </span>
                  </span>

                  {/* Corpo do cartão */}
                  <span className="relative z-10 block px-3.5 pb-3.5">
                    <span className="-mt-6 flex items-end gap-3">
                      <span className="relative shrink-0">
                        <AvatarImg
                          name={m.username}
                          src={m.avatar_url}
                          className="h-14 w-14 ring-2 ring-[#121214]"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#121214] ${
                            m.online
                              ? m.away
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                              : 'bg-zinc-600'
                          }`}
                        />
                      </span>
                      <span className="min-w-0 flex-1 pb-1">
                        <span className="flex min-w-0 items-center gap-1">
                          <span
                            className={`truncate text-[15px] font-bold ${
                              classesNome(m.name_color, m.name_effect) ||
                              (temPrevisao1(m.badges) ? nomeDouradoClass : 'text-white')
                            }`}
                          >
                            {m.username}
                          </span>
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          @{m.username}
                        </span>
                      </span>
                    </span>

                    <span className="mt-2 block truncate text-[11px] text-zinc-400">
                      {gear || 'Membro Locaus'}
                    </span>

                    <span className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                      <span className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500">
                        <span className="inline-flex items-center gap-1" title="Distinções">
                          <Award className="h-3.5 w-3.5" /> {m.badges.length}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Distinções overclock">
                          <Sparkles className="h-3.5 w-3.5" /> {dists.length}
                        </span>
                        <span
                          className="truncate"
                          title={
                            !m.online && m.last_seen
                              ? new Date(m.last_seen).toLocaleString('pt-PT')
                              : undefined
                          }
                        >
                          {m.online
                            ? m.away
                              ? 'Ausente'
                              : m.plataforma === 'mobile'
                                ? 'No telemóvel'
                                : m.plataforma === 'pc'
                                  ? 'No PC'
                                  : 'Online'
                            : vistoPorUltimo(m.last_seen)}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5">
                        {m.badges.slice(0, 2).map((id) => {
                          const b = badgeDe(id)
                          return b ? <BadgeGem key={b.id} badge={b} size={18} /> : null
                        })}
                        {dists.slice(0, 2).map((b) => (
                          <span
                            key={b.id}
                            title={b.desc || b.label}
                            className="flex items-center justify-center rounded-full p-[2px] ring-1"
                            style={{
                              background: hexToRgba(b.color, 0.09),
                              boxShadow: `0 0 10px ${hexToRgba(b.color, 0.22)}`,
                              ['--tw-ring-color']: hexToRgba(b.color, 0.35),
                            }}
                          >
                            <BadgeGem badge={b} size={15} />
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {cartaZoom && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setCartaZoom(null)}
        >
          <div
            className="relative w-full max-w-[560px]"
            onClick={(e) => e.stopPropagation()}
          >
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
            <p className="mt-3 text-center text-xs font-bold text-zinc-300">
              {cartaZoom.username}
            </p>
          </div>
        </div>
      )}
    </PageShell>
  )
}
