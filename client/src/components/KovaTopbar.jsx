import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Home,
  Clapperboard,
  MessageCircle,
  Swords,
  Users,
  BarChart3,
  ShoppingBag,
  Award,
  Newspaper,
  Wrench,
  CircuitBoard,
} from 'lucide-react'
import Sino from './Sino'
import SaldoMoedas from './SaldoMoedas'
import AvatarImg from './AvatarImg'

/* ============================================================
   Barra de topo (desktop) no estilo da referência:
   marca em serif à esquerda, links com ícone, conta à direita.
   ============================================================ */

const LINKS = [
  { nome: 'Home', path: '/', Icon: Home },
  { nome: 'Clips', path: '/clips', Icon: Clapperboard },
  { nome: 'Chat', path: '/chat', Icon: MessageCircle },
  { nome: 'Previsões', path: '/previsoes', Icon: Swords },
  { nome: 'Membros', path: '/membros', Icon: Users },
  { nome: 'Estatísticas', path: '/jogos', Icon: BarChart3 },
  { nome: 'Loja', path: '/cosmeticos', Icon: ShoppingBag },
]

const MAIS = [
  { nome: 'Distinções', path: '/distincoes', Icon: Award },
  { nome: 'Notícias', path: '/noticias', Icon: Newspaper },
  { nome: 'Ferramentas Windows', path: '/ferramentas', Icon: Wrench },
]

export default function KovaTopbar({ user, isAdmin = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [maisAberto, setMaisAberto] = useState(false)
  const maisRef = useRef(null)

  // Fecha o "Mais" ao clicar fora ou ao mudar de página
  useEffect(() => {
    if (!maisAberto) return undefined
    const fechar = (e) => {
      if (maisRef.current && !maisRef.current.contains(e.target)) setMaisAberto(false)
    }
    document.addEventListener('pointerdown', fechar)
    return () => document.removeEventListener('pointerdown', fechar)
  }, [maisAberto])

  useEffect(() => {
    setMaisAberto(false)
  }, [location.pathname])

  const ativo = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <nav className="kova-topbar hidden lg:flex" aria-label="Navegação principal">
      <div className="kova-topbar-inner">
        <Link to="/" className="kova-brand">
          locaus<span>.</span>
        </Link>

        <div className="kova-links">
          {LINKS.map((l) => {
            const Icon = l.Icon
            return (
              <Link
                key={l.path}
                to={l.path}
                data-active={ativo(l.path) ? 'true' : 'false'}
                title={l.nome}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{l.nome}</span>
              </Link>
            )
          })}

          <div className="kova-mais" ref={maisRef}>
            <button
              type="button"
              className="kova-mais-btn"
              onClick={() => setMaisAberto((v) => !v)}
              aria-expanded={maisAberto}
            >
              Mais
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {maisAberto && (
              <div className="kova-mais-menu">
                {MAIS.map((l) => {
                  const Icon = l.Icon
                  return (
                    <Link
                      key={l.path}
                      to={l.path}
                      onClick={() => setMaisAberto(false)}
                      data-active={ativo(l.path) ? 'true' : 'false'}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{l.nome}</span>
                    </Link>
                  )
                })}
                {isAdmin && (
                  <Link
                    to="/componentes"
                    onClick={() => setMaisAberto(false)}
                    data-active={ativo('/componentes') ? 'true' : 'false'}
                  >
                    <CircuitBoard className="h-4 w-4 shrink-0" />
                    <span>Componentes e Periféricos</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="kova-actions">
          <SaldoMoedas user={user} compacto />
          <Sino user={user} />

          <button
            type="button"
            className="kova-user"
            title={user ? `Conta: ${user.username}` : 'Conta'}
            onClick={() =>
              navigate(user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil')
            }
          >
            <AvatarImg src={user?.avatar_url} name={user?.username || 'AJ'} className="h-7 w-7" />
          </button>
        </div>
      </div>
    </nav>
  )
}
