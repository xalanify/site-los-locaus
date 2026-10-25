import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, Clapperboard, Home, User, MessageCircle, Trophy } from 'lucide-react'
import Sino from './Sino'

/* ============================================================
   Barra de topo (foto que abre o menu lateral + marca) + barra
   de navegação flutuante em pílula, em baixo ao centro.
   Só a aba ativa fica em roxo/brilho; as restantes ficam cinza.
   O ícone de Conta abre o perfil da conta (/perfil).
   ============================================================ */
export default function Navbar({ isAdmin = false, user = null, onMenu }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Navega para a home e faz scroll para a secção
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
  const isProfile = location.pathname.startsWith('/perfil')
  const isClips = location.pathname === '/clips'
  const isChat = location.pathname === '/chat'
  const isPrevisoes = location.pathname === '/previsoes'

  const links = [
    {
      name: 'Home',
      icon: Home,
      action: () => goTo('#home'),
      active: isHome && !location.hash,
    },
    {
      name: 'Clips e Publicações',
      icon: Clapperboard,
      action: () => navigate('/clips'),
      active: isClips,
    },
    {
      name: 'Chat geral',
      icon: MessageCircle,
      action: () => navigate('/chat'),
      active: isChat,
    },
    {
      name: 'Previsões',
      icon: Trophy,
      action: () => navigate('/previsoes'),
      active: isPrevisoes,
    },
  ]

  return (
    <>
      {/* ---------------- Barra de topo (só no telemóvel) ---------------- */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0a0813]/88 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
          {/* Botão de menu — abre o menu lateral (estilo X) */}
          <button
            onClick={onMenu}
            aria-label="Abrir menu"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 transition-colors hover:bg-white/10 active:scale-95"
          >
            <Menu className="h-5 w-5 text-gray-200" />
            <span className="text-xs font-bold text-gray-200">Menu</span>
          </button>

          {/* Marca */}
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="gradient-text truncate font-display text-base font-black uppercase tracking-wide sm:text-lg xl:text-xl">
              Locaus
            </span>
            <span className="shrink-0 rounded border border-violet-400/40 bg-violet-500/15 px-1 py-0.5 font-display text-[8px] font-black uppercase tracking-wider text-violet-300">
              Beta
            </span>
          </Link>

          {/* Notificações (sino) — só para contas com sessão */}
          <Sino user={user} />
        </div>
      </nav>

      {/* ---------------- Barra flutuante (pílula) ----------------
          No telemóvel só os ícones (as etiquetas empurravam a pílula
          para duas linhas e ela ficava enorme); os nomes aparecem a
          partir do ecrã médio. */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-3 left-1/2 z-40 w-[calc(100vw-1rem)] max-w-3xl -translate-x-1/2 sm:bottom-4 sm:w-[calc(100vw-1.5rem)] lg:hidden"
      >
        <div className="flex flex-nowrap items-center justify-between gap-1 rounded-3xl border border-white/10 bg-[#1b1630]/95 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.7)] backdrop-blur-md sm:flex-wrap sm:justify-center sm:gap-1.5 sm:rounded-full">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.name}
                onClick={link.action}
                title={link.name}
                aria-label={link.name}
                aria-current={link.active ? 'page' : undefined}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 transition-all duration-300 sm:h-12 sm:flex-none sm:px-4 ${
                  link.active
                    ? 'bg-violet-500 text-white glow-violet'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span className="hidden whitespace-nowrap text-sm font-bold md:inline">
                  {link.name}
                </span>
              </button>
            )
          })}

          {/* Conta — abre o perfil da conta */}
          <button
            onClick={() =>
              navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil')
            }
            title={user ? `Conta: ${user.username}` : 'Conta'}
            aria-label="Conta"
            aria-current={isProfile ? 'page' : undefined}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 transition-all duration-300 sm:h-12 sm:flex-none sm:px-4 ${
              isProfile
                ? 'bg-violet-500 text-white glow-violet'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <User className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span className="hidden whitespace-nowrap text-sm font-bold md:inline">Conta</span>
          </button>
        </div>
      </nav>
    </>
  )
}
