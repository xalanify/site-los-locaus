import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Youtube, Clapperboard, Gamepad2, Home, History, User } from 'lucide-react'

/* ============================================================
   Barra de topo (só a marca) + barra de navegação flutuante
   em pílula, em baixo ao centro — PC e telemóvel.
   Só a aba ativa fica em roxo/brilho; as restantes ficam cinza.
   O ícone de Conta abre o perfil da conta (/perfil).
   ============================================================ */
export default function Navbar({ isAdmin = false, user = null }) {
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

  const isGames = location.pathname === '/jogos'
  const isUpdates = location.pathname === '/atualizacoes'
  const isHome = location.pathname === '/'
  const isProfile = location.pathname === '/perfil'
  const isClips = location.pathname === '/clips'

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
      name: 'Jogos',
      icon: Gamepad2,
      action: () => navigate('/jogos'),
      active: isGames,
    },
    {
      name: 'Atualizações',
      icon: History,
      action: () => navigate('/atualizacoes'),
      active: isUpdates,
    },
  ]

  return (
    <>
      {/* ---------------- Barra de topo ---------------- */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Marca */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-500/30">
              <Youtube className="h-5 w-5 text-orange-400" />
            </span>
            <span className="gradient-text font-display text-lg font-black uppercase tracking-wide xl:text-xl">
              Ashow e Jazer Site
            </span>
          </Link>
        </div>
      </nav>

      {/* ---------------- Barra flutuante (pílula) ---------------- */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-4 left-1/2 z-40 w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2"
      >
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-3xl border border-white/10 bg-[#131316]/95 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.7)] backdrop-blur-md sm:rounded-full sm:gap-1.5">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.name}
                onClick={link.action}
                title={link.name}
                aria-label={link.name}
                aria-current={link.active ? 'page' : undefined}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3 transition-all duration-300 sm:h-12 sm:px-4 ${
                  link.active
                    ? 'bg-orange-500 text-white glow-orange'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span className="whitespace-nowrap text-[11px] font-bold sm:text-sm">
                  {link.name}
                </span>
              </button>
            )
          })}

          {/* Conta — abre o perfil da conta */}
          <button
            onClick={() => navigate('/perfil')}
            title={user ? `Conta: ${user.username}` : 'Conta'}
            aria-label="Conta"
            aria-current={isProfile ? 'page' : undefined}
            className={`flex h-10 items-center gap-1.5 rounded-full px-3 transition-all duration-300 sm:h-12 sm:px-4 ${
              isProfile
                ? 'bg-orange-500 text-white glow-orange'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <User className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span className="whitespace-nowrap text-[11px] font-bold sm:text-sm">Conta</span>
          </button>
        </div>
      </nav>
    </>
  )
}
