import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import Sino from './Sino'
import SaldoMoedas from './SaldoMoedas'
import AvatarImg from './AvatarImg'
import AvisoFotos from './AvisoFotos'
import { linksDoModo, linkAtivo, modeDe } from '../data/navegacao'

/* ============================================================
   Barra (telemóvel) — modo atual + sub-navegação contextual.
   O chip do modo abre o Mapa.
   ============================================================ */

export default function Navbar({ user = null, isAdmin = false, onMapa }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = modeDe(pathname)
  const links = linksDoModo(mode, isAdmin)

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
        </div>
      </div>

      <div className="lv-mbar-subnav" style={{ '--mode-accent': mode.accent }}>
        <button
          type="button"
          className="lv-mode-chip"
          onClick={onMapa}
          aria-label="Abrir mapa do site"
        >
          <mode.Icon className="h-3.5 w-3.5" />
          <span>{mode.nome}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        <nav className="lv-mbar-links" aria-label={`${mode.nome} — páginas`}>
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              data-active={linkAtivo(pathname, l.path) ? 'true' : 'false'}
              className="lv-mlink"
            >
              <l.Icon className="lv-mlink-ico" />
              {l.nome}
            </Link>
          ))}
        </nav>
      </div>

      <AvisoFotos />
    </nav>
  )
}
