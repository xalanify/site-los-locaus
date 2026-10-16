import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Megaphone,
  Youtube,
  Users,
  ChevronRight,
  Bell,
  Heart,
  MessageSquare,
  Trophy,
  UserPlus,
} from 'lucide-react'
import AvatarImg from './AvatarImg'
import { authHeaders } from '../lib/auth'

/* ============================================================
   Coluna direita (PC) — só aparece em ecrãs largos. Tem os
   últimos anúncios do grupo, quem está online, o acesso ao
   canal do YouTube e, em baixo, as notificações (mesmo design
   dos outros cartões). No telemóvel/tablet não existe.
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

const NOTIF_ICONE = {
  like: Heart,
  comment: MessageSquare,
  reply: MessageSquare,
  save: Heart,
  badge: Trophy,
  top1: Trophy,
  follow: UserPlus,
}

/* tempo curto: "há 5 min" / "ontem" / data */
function quando(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 60000
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${Math.floor(diff)} min`
  if (diff < 60 * 24) return `há ${Math.floor(diff / 60)} h`
  if (diff < 60 * 48) return 'ontem'
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
}

export default function RightColumn() {
  const navigate = useNavigate()
  const [anuncios, setAnuncios] = useState([])
  const [online, setOnline] = useState([])
  const [notifs, setNotifs] = useState({ items: [], unread: 0 })

  useEffect(() => {
    fetch('/api/posts?limit=3')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAnuncios(Array.isArray(d) ? d.slice(0, 3) : []))
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

  const carregarNotifs = useCallback(() => {
    fetch('/api/notifications', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.items)) {
          setNotifs({ items: d.items.slice(0, 6), unread: d.unread || 0 })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    carregarNotifs()
  }, [carregarNotifs])

  const marcarTudo = () => {
    fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: authHeaders(),
    })
      .then(() => carregarNotifs())
      .catch(() => {})
  }

  const limparTudo = () => {
    if (!window.confirm('Apagar TODAS as notificações? Esta ação não pode ser desfeita.')) return
    fetch('/api/notifications', {
      method: 'DELETE',
      headers: authHeaders(),
    })
      .then(() => carregarNotifs())
      .catch(() => {})
  }

  const abrirNotificacao = (n) => {
    if (!n.read) {
      fetch(`/api/notifications/${n.id}/read`, {
        method: 'POST',
        headers: authHeaders(),
      })
        .then(() => carregarNotifs())
        .catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-[320px] overflow-y-auto border-l border-white/10 bg-black px-4 pb-5 pt-14 xl:block">
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
                  </button>
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
            className="block rounded-xl bg-violet-500/10 p-3 text-center text-[13px] font-bold text-violet-400 transition-colors hover:bg-violet-500/20"
          >
            Subscrever o canal ↗
          </a>
        </Cartao>

        {/* Notificações — mesmo design, por baixo do canal */}
        <Cartao
          titulo="Notificações"
          icone={Bell}
          acoes={[
            { acao: marcarTudo, texto: notifs.unread > 0 ? 'Marcar tudo' : undefined },
            { acao: limparTudo, texto: notifs.items.length > 0 ? 'Limpar' : undefined },
          ].filter(a => a.texto)}
        >
          {notifs.items.length === 0 ? (
            <p className="py-2 text-[13px] text-gray-500">Sem notificações.</p>
          ) : (
            <ul className="space-y-1">
              {notifs.items.map((n) => {
                const Icon = NOTIF_ICONE[n.type] || Bell
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => abrirNotificacao(n)}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-1 py-2 text-left transition-colors hover:bg-white/5 ${
                        n.read ? 'opacity-70' : ''
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          n.read
                            ? 'bg-white/5 text-gray-500'
                            : 'bg-violet-500/15 text-violet-400'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[13px] font-bold ${
                            n.read ? 'text-gray-400' : 'text-white'
                          }`}
                        >
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="line-clamp-2 block text-[12px] leading-snug text-gray-500">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[10px] text-gray-600">
                          {quando(n.created_at)}
                        </span>
                      </span>
                      {!n.read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
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
