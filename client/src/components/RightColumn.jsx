import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Megaphone, Users, ChevronRight } from 'lucide-react'
import AvatarImg from './AvatarImg'
import { authHeaders } from '../lib/auth'
import { BADGES, BadgeGem, distincoesOverclock } from './BadgeGem'

/* ============================================================
   Coluna direita (PC) — só aparece em ecrãs largos. Tem os
   últimos anúncios (clips publicados aparecem aqui sozinhos)
   e quem está online, já com as distinções de cada membro.
   No telemóvel/tablet não existe.
   ============================================================ */
function Cartao({ titulo, icone: Icon, children, link, linkTexto, acao, acaoTexto, acoes }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141020]">
      <header className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h2 className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-gray-300">
          <Icon className="h-4 w-4 text-violet-400" />
          {titulo}
        </h2>
        <span className="flex items-center gap-1.5">
          {acoes && acoes.map((a, i) => (
            <button
              key={i}
              onClick={a.acao}
              className="text-[11px] font-bold text-gray-500 transition-colors hover:text-violet-400"
            >
              {a.texto}
            </button>
          ))}
          {acao && (
            <button
              onClick={acao}
              className="text-[11px] font-bold text-gray-500 transition-colors hover:text-violet-400"
            >
              {acaoTexto}
            </button>
          )}
          {link && (
            <Link
              to={link}
              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-gray-500 transition-colors hover:text-violet-400"
            >
              {linkTexto}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </span>
      </header>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  )
}

export default function RightColumn() {
  const navigate = useNavigate()
  const [anuncios, setAnuncios] = useState([])
  const [online, setOnline] = useState([])

  useEffect(() => {
    fetch('/api/posts?limit=5')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAnuncios(Array.isArray(d) ? d.slice(0, 5) : []))
      .catch(() => {})

    // quem está online (mesma base da página de membros)
    fetch('/api/users/list', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const l = Array.isArray(d?.users) ? d.users.filter((u) => u.online) : []
        setOnline(l.slice(0, 8))
      })
      .catch(() => {})
  }, [])

  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-[320px] overflow-y-auto border-l border-white/10 bg-black px-4 pb-5 pt-14 xl:block">
      <div className="space-y-4">
        {/* Anúncios — clips publicados aparecem aqui sozinhos */}
        <Cartao titulo="Anúncios" icone={Megaphone} link="/atualizacoes" linkTexto="Ver tudo">
          {anuncios.length === 0 ? (
            <p className="py-2 text-[13px] text-gray-500">Sem anúncios de momento.</p>
          ) : (
            <ul className="space-y-3">
              {anuncios.map((a) => (
                <li key={a.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  {a.image_url && (
                    <img
                      src={a.image_url}
                      alt=""
                      loading="lazy"
                      className="mb-2 aspect-video w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="line-clamp-3 text-[13px] leading-snug text-gray-200">{a.content}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {a.author}
                    {a.created_at && ` · ${new Date(a.created_at).toLocaleDateString('pt-PT')}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {/* Quem está online — já com as distinções (gema) de cada um */}
        <Cartao titulo="Membros online" icone={Users} link="/membros" linkTexto="Todos">
          {online.length === 0 ? (
            <p className="py-2 text-[13px] text-gray-500">Ninguém online agora.</p>
          ) : (
            <ul className="space-y-1">
              {online.map((m) => {
                const estaticas = (m.badges || [])
                  .map((id) => BADGES.find((b) => b.id === id))
                  .filter(Boolean)
                const overclock = distincoesOverclock(m.distincoes)
                const joias = [...estaticas, ...overclock].slice(0, 4)
                return (
                  <li key={m.username}>
                    <button
                      onClick={() => navigate(`/perfil/${encodeURIComponent(m.username)}`)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-white/5"
                    >
                      <span className="relative shrink-0">
                        <AvatarImg
                          src={m.avatar_url}
                          name={m.display_name || m.username}
                          className="h-[30px] w-[30px]"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0e0e11] bg-emerald-400" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-200">
                        {m.display_name || m.username}
                      </span>
                      {/* Distinções: só as gemas (o nome fica no título) */}
                      {joias.length > 0 && (
                        <span className="flex shrink-0 items-center gap-1">
                          {joias.map((b) => (
                            <BadgeGem key={b.id} badge={b} size={16} />
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Cartao>

        <p className="px-1 pt-1 text-[11px] text-gray-600">Ashow e Jazer · site da comunidade</p>
      </div>
    </aside>
  )
}
