import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import Sino from './Sino'
import SaldoMoedas from './SaldoMoedas'
import AvatarImg from './AvatarImg'
import AvisoFotos from './AvisoFotos'
import { MODES, linksDoModo, linkAtivo, modeDe } from '../data/navegacao'

/* ============================================================
   Barra (PC) — 4 modos + sub-navegação contextual.
   O Mapa (M) é a única lista completa.
   ============================================================ */

export default function KovaTopbar({ user, isAdmin = false, onMapa }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mode = modeDe(pathname)
  const links = linksDoModo(mode, isAdmin)

  return (
    <header className="lv-bar hidden lg:block">
      <div className="lv-bar-top">
        <Link to="/" className="lv-brand" aria-label="Locaus — início">
          locaus<span>.</span>
          <em>beta</em>
        </Link>

        <nav className="mode-nav" aria-label="Modos">
          {MODES.map((m) => (
            <Link
              key={m.id}
              to={m.path}
              data-active={m.id === mode.id ? 'true' : 'false'}
              className="mode-link"
              style={{ '--mode-accent': m.accent }}
            >
              <m.Icon className="mode-ico" />
              <span>{m.nome}</span>
            </Link>
          ))}
        </nav>

        <div className="lv-actions">
          <button type="button" className="lv-mapa" onClick={onMapa} title="Mapa (M)">
            <LayoutGrid className="h-4 w-4" />
            <span>Mapa</span>
            <kbd>M</kbd>
          </button>
          <SaldoMoedas user={user} compacto />
          <Sino user={user} />
          <button
            type="button"
            className="lv-user"
            title={user ? `Conta: ${user.username}` : 'Conta'}
            onClick={() =>
              navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil')
            }
          >
            <AvatarImg src={user?.avatar_url} name={user?.username || 'AJ'} className="h-7 w-7" />
          </button>
        </div>
      </div>

      <div className="lv-subnav" style={{ '--mode-accent': mode.accent }}>
        <span className="lv-subnav-mode">
          <mode.Icon className="h-3.5 w-3.5" />
          {mode.nome}
        </span>
        <nav aria-label={`${mode.nome} — páginas`}>
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              data-active={linkAtivo(pathname, l.path) ? 'true' : 'false'}
              className="lv-sublink"
            >
              <l.Icon className="h-3.5 w-3.5" />
              {l.nome}
            </Link>
          ))}
        </nav>
      </div>

      <AvisoFotos />
    </header>
  )
}
