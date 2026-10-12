import { AnimatePresence, motion } from 'framer-motion'
import {
  Home,
  Clapperboard,
  History,
  Users,
  Gamepad2,
  Cpu,
  User,
  LogOut,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import AvatarImg from './AvatarImg'

/* ============================================================
   Menu lateral do telemóvel (abre pela foto na barra de topo).
   Estilo X: perfil em cima, lista de páginas em baixo e sair
   no fim. A pílula do fundo continua para as abas principais.
   ============================================================ */
export default function MobileMenu({ open, onClose, user, isAdmin, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  const go = (path) => {
    onClose()
    navigate(path)
  }

  const itens = [
    { name: 'Página inicial', icon: Home, path: '/' },
    { name: 'Clips e Publicações', icon: Clapperboard, path: '/clips' },
    { name: 'Atualizações', icon: History, path: '/atualizacoes' },
    { name: 'Membros', icon: Users, path: '/membros' },
    // Jogos e Specs: só o admin abre (as contas de jogo ficam no backend)
    ...(isAdmin ? [{ name: 'Jogos e estatísticas', icon: Gamepad2, path: '/jogos' }] : []),
    ...(isAdmin ? [{ name: 'PCs / Specs', icon: Cpu, path: '/pcs' }] : []),
    { name: 'Conta', icon: User, path: '/perfil' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* fundo escuro */}
          <motion.button
            key="fundo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Fechar menu"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden"
          />

          {/* painel deslizante */}
          <motion.aside
            key="painel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-y-0 left-0 z-[61] flex w-[82vw] max-w-[330px] flex-col overflow-y-auto border-r border-white/10 bg-black pb-8 lg:hidden"
          >
            {/* topo: fechar */}
            <div className="flex h-14 items-center justify-between px-4">
              <button
                onClick={onClose}
                aria-label="Fechar menu"
                className="grid h-9 w-9 place-items-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* perfil */}
            <button
              onClick={() => go('/perfil')}
              className="flex items-center gap-3 px-4 pb-4 text-left transition-colors hover:bg-white/5"
            >
              <AvatarImg
                src={user?.avatar_url}
                name={user?.username || '?'}
                className="h-14 w-14"
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-lg font-black uppercase text-white">
                  {user?.username || 'Conta'}
                </span>
                <span className="block text-sm text-gray-500">
                  @{user?.username || ''}
                </span>
                <span className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {isAdmin ? 'Admin' : 'Membro'}
                </span>
              </span>
            </button>

            {/* itens */}
            <nav className="flex-1 space-y-1 px-3">
              {itens.map((it) => {
                const Icon = it.icon
                const ativo = location.pathname === it.path
                return (
                  <button
                    key={it.path}
                    onClick={() => go(it.path)}
                    className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors ${
                      ativo
                        ? 'bg-orange-500/15 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${ativo ? 'text-orange-400' : 'text-gray-500'}`}
                    />
                    <span className="text-[15px] font-bold">{it.name}</span>
                  </button>
                )
              })}

              <div className="my-3 h-px bg-white/10" />

              <button
                onClick={() => {
                  onClose()
                  onLogout && onLogout()
                }}
                className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-[15px] font-bold">Sair</span>
              </button>
            </nav>

            <p className="px-5 pt-4 text-[11px] text-gray-600">
              Ashow e Jazer · site da comunidade
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
