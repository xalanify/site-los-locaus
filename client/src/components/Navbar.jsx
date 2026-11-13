import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, Menu } from 'lucide-react'
import Sino from './Sino'
import SaldoMoedas from './SaldoMoedas'
import AvatarImg from './AvatarImg'
import { modeDe } from '../data/navegacao'

/* ============================================================
   Barra (telemóvel) — marca, ações e um botão "Menu".
   O botão usa a cor do modo atual e abre a lista completa.
   ============================================================ */

export default function Navbar({ user = null, onMenu }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = modeDe(pathname)

  return (
    <nav id="topbar" className="lv-mbar lg:hidden" aria-label="Barra de topo">
      <div className="lv-mbar-top">
        <Link to="/" className="lv-brand" aria-label="Locaus — início">
          locaus<span>.</span>
        </Link>

        <div className="lv-mbar-actions">
          <SaldoMoedas user={user} compacto />
          <Sino user={user} />
          <button
            type="button"
            onClick={() =>
              navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil')
            }
            aria-label="Conta"
            className="lv-mbar-user"
          >
            <AvatarImg src={user?.avatar_url} name={user?.username || 'AJ'} className="h-7 w-7" />
          </button>
          <button
            type="button"
            className="lv-menu-btn"
            style={{ '--mode-accent': mode.accent }}
            onClick={onMenu}
            aria-label="Abrir menu"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>Menu</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </nav>
  )
}
