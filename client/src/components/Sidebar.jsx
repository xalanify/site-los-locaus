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
  Cpu,
  Wrench,
  Sparkles,
} from 'lucide-react'

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
  const isProfile = location.pathname === '/perfil'
  const isMembers = location.pathname === '/membros'
  const isGames = location.pathname === '/jogos'
  const isPcs = location.pathname === '/pcs'
  const isFerramentas = location.pathname === '/ferramentas'

  const links = [
    { name: 'Página inicial', icon: Home, action: () => goTo('#home'), active: isHome && !location.hash },
    { name: 'Clips e Publicações', icon: Clapperboard, action: () => navigate('/clips'), active: isClips },
    { name: 'Distinções', icon: Trophy, action: () => navigate('/distincoes'), active: isDistincoes },
    { name: 'Membros', icon: Users, action: () => navigate('/membros'), active: isMembers },
    // Jogos, Specs e Ferramentas: abertas a todos os membros
    { name: 'Jogos e estatísticas', icon: Gamepad2, action: () => navigate('/jogos'), active: isGames },
    { name: 'PCs / Specs', icon: Cpu, action: () => navigate('/pcs'), active: isPcs },
    { name: 'Ferramentas Windows', icon: Wrench, action: () => navigate('/ferramentas'), active: isFerramentas },
  ]

  return (
    <aside className="painel-fixo fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col justify-between border-r border-white/10 px-3 py-5 lg:flex xl:w-[280px]"
      style={{
        background:
          'linear-gradient(180deg, #150f26 0%, #100b1d 55%, #0b0715 100%)',
      }}
    >
      {/* Marca */}
      <div>
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30">
            <Youtube className="h-5 w-5 text-violet-400" />
          </span>
          <span className="gradient-text font-display text-lg font-black uppercase tracking-wide">
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
                    ? 'bg-violet-500/15 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${link.active ? 'text-violet-400' : ''}`} />
                <span className="text-[15px] font-bold">{link.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conta em baixo (as notificações vivem no cartão da coluna da direita) */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/perfil')}
          className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left transition-colors ${
            isProfile
              ? 'bg-violet-500/15 text-white'
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
            <span className="block truncate text-sm font-bold text-white">
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
