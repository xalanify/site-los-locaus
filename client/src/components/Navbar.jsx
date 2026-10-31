import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Home, Clapperboard, MessageCircle, Trophy, User } from 'lucide-react'
import Sino from './Sino'
import AvatarImg from './AvatarImg'

/* ============================================================
   Telemóvel — barra de topo compacta (marca + sino + conta +
   menu) e pílula flutuante em baixo.
   ============================================================ */
export default function Navbar({ isAdmin = false, user = null, onMenu, menuOpen = false }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'
  const isProfile = location.pathname.startsWith('/perfil')
  const isClips = location.pathname === '/clips'
  const isChat = location.pathname === '/chat'
  const isPrevisoes = location.pathname === '/previsoes'

  const links = [
    { name: 'Home', icon: Home, action: () => navigate('/'), active: isHome },
    { name: 'Clips', icon: Clapperboard, action: () => navigate('/clips'), active: isClips },
    { name: 'Chat', icon: MessageCircle, action: () => navigate('/chat'), active: isChat },
    { name: 'Previsões', icon: Trophy, action: () => navigate('/previsoes'), active: isPrevisoes },
    {
      name: 'Conta',
      icon: User,
      action: () =>
        navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil'),
      active: isProfile,
    },
  ]

  return (
    <>
      {/* ---------------- Barra de topo ---------------- */}
      <nav id="topbar" className="kova-mobilebar lg:hidden" aria-label="Barra de topo">
        <div className="kova-mobilebar-inner">
          <Link to="/" className="kova-brand">
            locaus<span>.</span>
          </Link>

          <div className="kova-mobilebar-acoes">
            <Sino user={user} />
            <button
              type="button"
              onClick={() =>
                navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil')
              }
              aria-label="Conta"
              className="kova-mobilebar-user"
            >
              <AvatarImg src={user?.avatar_url} name={user?.username || 'AJ'} className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={onMenu}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ---------------- Pílula em baixo ---------------- */}
      <nav className="kova-bottomnav lg:hidden" aria-label="Navegação principal">
        <div className="kova-bottomnav-inner">
          {links.map((l) => {
            const Icon = l.icon
            return (
              <button
                key={l.name}
                type="button"
                onClick={l.action}
                data-active={l.active ? 'true' : 'false'}
                className="kova-bottomnav-item"
                aria-label={l.name}
                aria-current={l.active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{l.name}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
