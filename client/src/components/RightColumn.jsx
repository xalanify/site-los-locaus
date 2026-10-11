import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Youtube, Users, ChevronRight } from 'lucide-react'
import AvatarImg from './AvatarImg'

/* ============================================================
   Coluna direita (PC) — só aparece em ecrãs largos. Tem os
   últimos anúncios do grupo, quem está online e o acesso ao
   canal do YouTube. No telemóvel/tablet não existe.
   ============================================================ */
function Cartao({ titulo, icone: Icon, children, link, linkTexto }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e11]">
      <header className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <h2 className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-gray-300">
          <Icon className="h-4 w-4 text-orange-400" />
          {titulo}
        </h2>
        {link && (
          <Link
            to={link}
            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-gray-500 transition-colors hover:text-orange-400"
          >
            {linkTexto}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  )
}

export default function RightColumn() {
  const [anuncios, setAnuncios] = useState([])
  const [online, setOnline] = useState([])

  useEffect(() => {
    fetch('/api/posts?limit=3')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAnuncios(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => {})

    fetch('/api/users/online')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOnline(Array.isArray(d) ? d.slice(0, 8) : []))
      .catch(() => {})
  }, [])

  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-[320px] overflow-y-auto border-l border-white/10 bg-black px-4 py-5 xl:block">
      <div className="space-y-4">
        {/* Anúncios */}
        <Cartao titulo="Anúncios" icone={Megaphone} link="/atualizacoes" linkTexto="Ver tudo">
          {anuncios.length === 0 ? (
            <p className="py-2 text-[13px] text-gray-500">Sem anúncios de momento.</p>
          ) : (
            <ul className="space-y-3">
              {anuncios.map((a) => (
                <li key={a.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
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

        {/* Quem está online */}
        <Cartao titulo="Membros online" icone={Users} link="/membros" linkTexto="Todos">
          {online.length === 0 ? (
            <p className="py-2 text-[13px] text-gray-500">Ninguém online agora.</p>
          ) : (
            <ul className="space-y-1">
              {online.map((m) => (
                <li
                  key={m.username}
                  className="flex items-center gap-2.5 rounded-xl px-1 py-1.5"
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
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {/* Canal do YouTube */}
        <Cartao titulo="Canal no YouTube" icone={Youtube}>
          <a
            href="https://www.youtube.com/@AshoweJazer"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl bg-orange-500/10 p-3 text-center text-[13px] font-bold text-orange-400 transition-colors hover:bg-orange-500/20"
          >
            Subscrever o canal ↗
          </a>
        </Cartao>

        <p className="px-1 pt-1 text-[11px] text-gray-600">Ashow e Jazer · site da comunidade</p>
      </div>
    </aside>
  )
}
