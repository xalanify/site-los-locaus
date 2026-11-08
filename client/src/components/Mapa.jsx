import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, LogOut, Search, User, X } from 'lucide-react'
import { MODES, linksDoModo, modeDe } from '../data/navegacao'

/* ============================================================
   MAPA — a única lista de tudo. Abre com M ou pelo botão.
   Agrupa os destinos por modo; sem menus sobrepostos.
   ============================================================ */

export default function Mapa({ open, onClose, user, isAdmin = false, onLogout }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const atual = modeDe(location.pathname)

  useEffect(() => {
    if (!open) return undefined
    setQ('')
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = anterior
    }
  }, [open])

  if (!open) return null

  const termo = q.trim().toLowerCase()
  const modos = MODES.map((m) => {
    const links = linksDoModo(m, isAdmin).filter(
      (l) =>
        !termo ||
        m.nome.toLowerCase().includes(termo) ||
        l.nome.toLowerCase().includes(termo) ||
        l.desc.toLowerCase().includes(termo),
    )
    return { ...m, links }
  }).filter((m) => m.links.length > 0)

  const perfilPath = user?.username
    ? `/perfil/${encodeURIComponent(user.username)}`
    : '/perfil'

  return createPortal(
    <div className="mapa" role="dialog" aria-modal="true" aria-label="Mapa do site">
      <div className="mapa-shell">
        <header className="mapa-top">
          <Link to="/" className="lv-brand" onClick={onClose}>
            locaus<span>.</span>
          </Link>

          <label className="mapa-search">
            <Search className="h-4 w-4" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Para onde queres ir?"
              aria-label="Procurar página"
            />
          </label>

          <button type="button" onClick={onClose} className="mapa-close" aria-label="Fechar mapa">
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
                      data-active={l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path)}
                    >
                      <span className="mapa-link-icon">
                        <l.Icon className="h-4 w-4" />
                      </span>
                      <span className="mapa-link-txt">
                        <strong>{l.nome}</strong>
                        <em>{l.desc}</em>
                      </span>
                      <ArrowUpRight className="mapa-link-arrow h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {termo && modos.length === 0 && (
          <p className="mapa-vazio">Sem resultados para “{q.trim()}”.</p>
        )}

        <footer className="mapa-foot">
          <span className="mapa-hint">
            <kbd>M</kbd> abrir / fechar <kbd>ESC</kbd> fechar
          </span>
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
    </div>,
    document.body,
  )
}
