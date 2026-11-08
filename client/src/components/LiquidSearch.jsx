import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search,
  Home,
  Clapperboard,
  MessageCircle,
  Swords,
  Users,
  CreditCard,
  ShoppingBag,
  BarChart3,
  Award,
  Wrench,
  User,
  ArrowRight,
} from 'lucide-react'

/* ============================================================
   PESQUISA GLOBAL — paleta de comandos em vidro líquido
   ============================================================ */

const PAGINAS = [
  { nome: 'Home', path: '/', Icon: Home, tags: 'inicio pagina inicial' },
  { nome: 'Clips', path: '/clips', Icon: Clapperboard, tags: 'videos publicacoes' },
  { nome: 'Chat', path: '/chat', Icon: MessageCircle, tags: 'mensagens conversar' },
  { nome: 'Previsões', path: '/previsoes', Icon: Swords, tags: 'r6 cs2 fortnite jogos' },
  { nome: 'Membros', path: '/membros', Icon: Users, tags: 'comunidade perfis' },
  { nome: 'Cartas', path: '/cartas', Icon: CreditCard, tags: 'trading cards colecao' },
  { nome: 'Mercado', path: '/cosmeticos', Icon: ShoppingBag, tags: 'loja comprar vender precos' },
  { nome: 'Estatísticas', path: '/jogos', Icon: BarChart3, tags: 'jogos ranks' },
  { nome: 'Distinções', path: '/distincoes', Icon: Award, tags: 'badges conquistas' },
  { nome: 'Ferramentas', path: '/ferramentas', Icon: Wrench, tags: 'windows otimizacoes' },
]

export default function LiquidSearch({ user = null, variant = 'bar' }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  const paginas = [
    ...PAGINAS,
    {
      nome: 'O meu perfil',
      path: user?.username ? `/perfil/${encodeURIComponent(user.username)}` : '/perfil',
      Icon: User,
      tags: 'conta perfil',
    },
  ]

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const filtradas = paginas.filter((p) => {
    const alvo = norm(`${p.nome} ${p.path} ${p.tags}`)
    return !q.trim() || alvo.includes(norm(q))
  })

  useEffect(() => {
    if (!aberto) return undefined
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [aberto])

  useEffect(() => {
    if (variant !== 'bar') return undefined
    const aoTeclar = (e) => {
      if (!window.matchMedia('(min-width: 1024px)').matches) return
      const alvo = String((document.activeElement && document.activeElement.tagName) || '')
      const dentro = /input|textarea|select/i.test(alvo)
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault()
        setAberto((v) => !v)
        return
      }
      if (!dentro && e.key === '/') {
        e.preventDefault()
        setAberto(true)
        return
      }
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [variant])

  useEffect(() => {
    if (!aberto) setQ('')
  }, [aberto])

  const ir = (path) => {
    setAberto(false)
    navigate(path)
  }

  return (
    <>
      {variant === 'bar' ? (
        <button
          type="button"
          className="liquid-searchbar"
          onClick={() => setAberto(true)}
          aria-label="Pesquisar no site"
        >
          <Search className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
          <span>Pesquisar...</span>
          <kbd>⌘K</kbd>
        </button>
      ) : (
        <button
          type="button"
          className="liquid-searchicon"
          onClick={() => setAberto(true)}
          aria-label="Pesquisar no site"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {aberto &&
        createPortal(
          <div
            className="liquid-cmd-overlay"
            role="presentation"
            onClick={() => setAberto(false)}
          >
            <motion.div
              className="liquid-cmd"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="liquid-cmd-head">
                <Search className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filtradas[0]) ir(filtradas[0].path)
                    if (e.key === 'Escape') setAberto(false)
                  }}
                  placeholder="Pesquisar páginas, jogos, membros..."
                  maxLength={60}
                  aria-label="Pesquisar"
                />
                <kbd>ESC</kbd>
              </div>

              <div className="liquid-cmd-list">
                {filtradas.length === 0 ? (
                  <p className="liquid-cmd-empty">Sem resultados para “{q}”.</p>
                ) : (
                  filtradas.map((p) => {
                    const Icon = p.Icon
                    return (
                      <button
                        key={p.path}
                        type="button"
                        className="liquid-cmd-item"
                        onClick={() => ir(p.path)}
                      >
                        <span className="liquid-cmd-icon">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="liquid-cmd-nome">{p.nome}</span>
                        <span className="liquid-cmd-path">{p.path}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-white/35" aria-hidden="true" />
                      </button>
                    )
                  })
                )}
              </div>

              <div className="liquid-cmd-foot">
                <span>
                  <b>↵</b> abrir
                </span>
                <span>
                  <b>Esc</b> fechar
                </span>
                <span className="ml-auto hidden sm:inline">
                  <b>⌘K</b> abrir a qualquer momento
                </span>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  )
}
