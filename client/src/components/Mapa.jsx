import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LogOut, User, X } from 'lucide-react'
import { MODES, linksDoModo, modeDe } from '../data/navegacao'

/* ============================================================
   MENU — lista completa de páginas, agrupada por modo.
   Sem pesquisa, sem segunda navbar. Abre pelo botão Menu.
   ============================================================ */

export default function Mapa({ open, onClose, user, isAdmin = false, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const atual = modeDe(location.pathname)

  useEffect(() => {
    if (!open) return undefined
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [open])

  if (!open) return null

  const modos = MODES.map((m) => ({ ...m, links: linksDoModo(m, isAdmin) })).filter(
    (m) => m.links.length > 0,
  )

  const perfilPath = user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil'

  return (
    <div className="mapa" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="mapa-shell">
        <header className="mapa-top">
          <Link to="/" className="lv-brand" onClick={onClose}>
            locaus<span>.</span>
            <em>beta</em>
          </Link>
          <span className="mapa-title">Menu</span>
          <button type="button" onClick={onClose} className="mapa-close" aria-label="Fechar menu">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mapa-grid">
          {modos.map((m) => (
            <section
              key={m.id}
              className={`mapa-col ${m.id === atual.id ? 'is-current' : ''}`}
              style={{ '--mode-accent': m.accent }}
            >
              <div className="mapa-col-head">
                <span className="mapa-col-icon">
                  <m.Icon className="h-4 w-4" />
                </span>
                <h2>{m.nome}</h2>
                <p>{m.desc}</p>
              </div>
              <ul>
                {m.links.map((l) => (
                  <li key={l.path}>
                    <Link
                      to={l.path}
                      onClick={onClose}
                      data-active={
                        l.path === '/'
                          ? location.pathname === '/'
                          : location.pathname.startsWith(l.path)
                      }
                    >
                      <span className="mapa-link-icon">
                        <l.Icon className="h-4 w-4" />
                      </span>
                      <span className="mapa-link-txt">
                        <strong>{l.nome}</strong>
                      </span>
                      <ArrowUpRight className="mapa-link-arrow h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mapa-foot">
          <span className="mapa-foot-note">BETA · design em evolução</span>
          <div className="mapa-conta">
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(perfilPath)
              }}
            >
              <User className="h-3.5 w-3.5" /> {user?.username || 'Conta'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onLogout?.()
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
