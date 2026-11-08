import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import Sino from './Sino'
import SaldoMoedas from './SaldoMoedas'
import AvatarImg from './AvatarImg'
import AvisoFotos from './AvisoFotos'
import { MODES, linksDoModo, linkAtivo, modeDe } from '../data/navegacao'

/* ============================================================
   Barra (PC) — 4 modos. Cada modo abre uma lista em hover.
   Sem segunda navbar, sem Mapa, sem pesquisa.
   ============================================================ */

export default function KovaTopbar({ user, isAdmin = false }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mode = modeDe(pathname)
  const [aberto, setAberto] = useState(null)
  const fecharRef = useRef(0)

  useEffect(() => {
    setAberto(null)
  }, [pathname])

  useEffect(() => () => window.clearTimeout(fecharRef.current), [])

  const abrir = (id) => {
    window.clearTimeout(fecharRef.current)
    setAberto(id)
  }
  const fechar = () => {
    window.clearTimeout(fecharRef.current)
    fecharRef.current = window.setTimeout(() => setAberto(null), 120)
  }

  return (
    <header className="lv-bar hidden lg:block">
      <div className="lv-bar-top">
        <Link to="/" className="lv-brand" aria-label="Locaus — início">
          locaus<span>.</span>
          <em>beta</em>
        </Link>

        <nav className="mode-nav" aria-label="Navegação principal">
          {MODES.map((m) => (
            <div
              key={m.id}
              className="mode-item"
              style={{ '--mode-accent': m.accent }}
              onMouseEnter={() => abrir(m.id)}
              onMouseLeave={fechar}
              onFocus={() => abrir(m.id)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) fechar()
              }}
            >
              <button
                type="button"
                data-active={m.id === mode.id ? 'true' : 'false'}
                className="mode-link"
                aria-haspopup="true"
                aria-expanded={aberto === m.id}
                onClick={() => setAberto((v) => (v === m.id ? null : m.id))}
              >
                <m.Icon className="mode-ico" />
                <span>{m.nome}</span>
                <ChevronDown className="mode-chev" />
              </button>

              {aberto === m.id && (
                <div className="mode-menu" role="menu" aria-label={m.nome}>
                  {linksDoModo(m, isAdmin).map((l) => (
                    <Link
                      key={l.path}
                      to={l.path}
                      role="menuitem"
                      className="mode-menu-item"
                      data-active={linkAtivo(pathname, l.path) ? 'true' : 'false'}
                      onClick={() => setAberto(null)}
                    >
                      <l.Icon className="mode-menu-ico" />
                      <span>{l.nome}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="lv-actions">
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

      <AvisoFotos />
    </header>
  )
}
