import { AnimatePresence, motion } from 'framer-motion'
import {
  Home,
  Clapperboard,
  Trophy,
  Users,
  Gamepad2,
  User,
  LogOut,
  Sparkles,
  MessageCircle,
  Swords,
  CreditCard,
  Wrench,
  Cpu,
  CircuitBoard,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import useChatNaoLidas from '../hooks/useChatNaoLidas'

/* ============================================================
   Menu do telemóvel — painel inteiro por baixo da barra de topo,
   com secções (You / Browse / Compete / Tools), como na referência.
   ============================================================ */
export default function MobileMenu({ open, onClose, user, isAdmin, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const naoLidas = useChatNaoLidas(Boolean(user))

  const go = (path) => {
    onClose()
    navigate(path)
  }

  const perfilPath = user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil'

  const secoes = [
    {
      titulo: 'Conta',
      itens: [{ name: 'O meu perfil', icon: User, path: perfilPath }],
    },
    {
      titulo: 'Explorar',
      itens: [
        { name: 'Página inicial', icon: Home, path: '/' },
        { name: 'Clips e publicações', icon: Clapperboard, path: '/clips' },
        {
          name: 'Chat geral',
          icon: MessageCircle,
          path: '/chat',
          naoLidas: location.pathname !== '/chat' ? naoLidas : 0,
        },
        { name: 'Membros', icon: Users, path: '/membros' },
        { name: 'Cartas', icon: CreditCard, path: '/cartas' },
        { name: 'Estatísticas', icon: Gamepad2, path: '/jogos' },
        { name: 'Distinções', icon: Trophy, path: '/distincoes' },
        { name: 'Mercado', icon: Sparkles, path: '/cosmeticos' },
      ],
    },
    {
      titulo: 'Competir',
      itens: [{ name: 'Previsões', icon: Swords, path: '/previsoes' }],
    },
    {
      titulo: 'Ferramentas',
      itens: [
        { name: 'Ferramentas Windows', icon: Wrench, path: '/ferramentas' },
        { name: 'PCs / Specs', icon: Cpu, path: '/pcs' },
        ...(isAdmin
          ? [{ name: 'Componentes e periféricos', icon: CircuitBoard, path: '/componentes' }]
          : []),
      ],
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="kova-menu lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="kova-menu-inner">
            {secoes.map((sec) => (
              <div key={sec.titulo} className="kova-menu-secao-bloco">
                <p className="kova-menu-secao">{sec.titulo}</p>
                {sec.itens.map((it) => {
                  const Icon = it.icon
                  const ativo = location.pathname === it.path
                  return (
                    <button
                      key={it.path}
                      type="button"
                      onClick={() => go(it.path)}
                      className="kova-menu-item"
                      data-active={ativo ? 'true' : 'false'}
                    >
                      <span className="kova-menu-icone">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="kova-menu-nome">{it.name}</span>
                      {it.naoLidas > 0 && (
                        <span className="kova-menu-badge">
                          {it.naoLidas > 99 ? '99+' : it.naoLidas}
                        </span>
                      )}
                      {it.badge && <span className="kova-menu-etiqueta">{it.badge}</span>}
                      {ativo && <span className="kova-menu-ponto" />}
                    </button>
                  )
                })}
              </div>
            ))}
            <div className="kova-menu-secao-bloco">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onLogout && onLogout()
                }}
                className="kova-menu-item kova-menu-sair"
              >
                <span className="kova-menu-icone">
                  <LogOut className="h-4 w-4" />
                </span>
                <span className="kova-menu-nome">Sair</span>
              </button>
            </div>

            <p className="kova-menu-rodape">Locaus — a comunidade</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
