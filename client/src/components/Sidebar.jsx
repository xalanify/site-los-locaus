import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Youtube,
  Clapperboard,
  History,
  Home,
  Trophy,
  User,
  Users,
  Gamepad2,
  Wrench,
  Sparkles,
  MessageCircle,
  Swords,
  Newspaper,
  CircuitBoard,
} from 'lucide-react'
import useChatNaoLidas from '../hooks/useChatNaoLidas'
import Sino from './Sino'
import SaldoMoedas from './SaldoMoedas'

/* ============================================================
   Barra de navegação lateral (PC) — fixa à esquerda, com a
   marca em cima, os itens empilhados e a conta + sino em baixo.
   No telemóvel não aparece (usa a pílula do Navbar).
   ============================================================ */
export default function Sidebar({ user = null, isAdmin = false }) {
  const navigate = useNavigate()
  const location = useLocation()

  const goTo = (hash) => {
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } else {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const isHome = location.pathname === '/'
  const isClips = location.pathname === '/clips'
  const isDistincoes = location.pathname === '/distincoes'
  const isProfile = location.pathname.startsWith('/perfil')
  const isMembers = location.pathname === '/membros'
  const isGames = location.pathname === '/jogos'
  const isNoticias = location.pathname === '/noticias' || location.pathname === '/jogos-steam'
  const isFerramentas = location.pathname === '/ferramentas'
  const isChat = location.pathname === '/chat'
  const isPrevisoes = location.pathname === '/previsoes'
  const isComponentes = location.pathname === '/componentes'
  const isCosmeticos = location.pathname === '/cosmeticos'
  const naoLidas = useChatNaoLidas(Boolean(user))

  const links = [
    { name: 'Página inicial', icon: Home, action: () => goTo('#home'), active: isHome && !location.hash },
    { name: 'Clips e Publicações', icon: Clapperboard, action: () => navigate('/clips'), active: isClips },
    {
      name: 'Chat geral',
      icon: MessageCircle,
      action: () => navigate('/chat'),
      active: isChat,
      naoLidas: !isChat ? naoLidas : 0,
    },
    { name: 'Previsões', icon: Swords, action: () => navigate('/previsoes'), active: isPrevisoes },
    { name: 'Notícias', icon: Newspaper, action: () => navigate('/noticias'), active: isNoticias },
    { name: 'Distinções', icon: Trophy, action: () => navigate('/distincoes'), active: isDistincoes },
    { name: 'Membros', icon: Users, action: () => navigate('/membros'), active: isMembers },
    // Estatísticas: aberta a todos os membros
    { name: 'Estatísticas', icon: Gamepad2, action: () => navigate('/jogos'), active: isGames },
    // Loja: aberta a todos os membros
    {
      name: 'Loja',
      icon: Sparkles,
      action: () => navigate('/cosmeticos'),
      active: isCosmeticos,
      badge: 'Novo',
    },
    // Componentes e Periféricos: só o admin vê no sidebar
    ...(isAdmin
      ? [
          {
            name: 'Componentes e Periféricos',
            icon: CircuitBoard,
            action: () => navigate('/componentes'),
            active: isComponentes,
            badge: 'Admin',
          },
        ]
      : []),
    {
      name: 'Ferramentas Windows',
      icon: Wrench,
      action: () => navigate('/ferramentas'),
      active: isFerramentas,
      badge: 'Novo',
    },
  ]

  return (
    <aside className="painel-fixo fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col justify-between border-r border-white/10 px-3 py-5 lg:flex xl:w-[280px]">
      {/* Marca + navegação (rola se o ecrã for baixo) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Link to="/" className="mb-6 flex min-w-0 items-center gap-2.5 px-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-500/15 ring-1 ring-zinc-500/30">
            <Youtube className="h-5 w-5 text-zinc-400" />
          </span>
          <span className="brand-serif gradient-text min-w-0 truncate font-display text-lg font-black tracking-wide">
            Ashow e Jazer
          </span>
        </Link>

        {/* Navegação */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.name}
                onClick={link.action}
                className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left transition-colors ${
                  link.active
                    ? 'nav-ativo text-[#ff9e9e]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${link.active ? 'nav-ativo-icon' : ''}`} />
                <span className="text-[15px] font-medium">{link.name}</span>
                {link.naoLidas > 0 && (
                  <span className="ml-auto grid min-w-[20px] place-items-center rounded-full bg-zinc-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-[0_0_12px_rgba(255,255,255,0.16)]">
                    {link.naoLidas > 99 ? '99+' : link.naoLidas}
                  </span>
                )}
                {link.badge && (
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-200 ring-1 ring-white/15">
                    {link.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conta em baixo */}
      <div className="shrink-0 space-y-2 pt-3">
        <SaldoMoedas user={user} />
        <Sino user={user} posicao="lateral" variant="card" />
        <button
          onClick={() =>
            navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil')
          }
          className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left transition-colors ${
            isProfile
              ? 'nav-ativo text-[#ff9e9e]'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-gray-400" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-sm font-bold ${isProfile ? 'text-[#ff9e9e]' : 'text-white'}`}>
              {user?.username || 'Conta'}
            </span>
            <span className="block text-xs text-gray-500">
              {isAdmin ? 'Admin' : 'Membro'}
            </span>
          </span>
        </button>
      </div>
    </aside>
  )
}
