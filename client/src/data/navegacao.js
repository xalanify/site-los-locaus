import { desafioAtivo } from '../lib/desafioSabino'
import {
  Home,
  Clapperboard,
  MessageCircle,
  Users,
  Swords,
  BarChart3,
  Award,
  ShoppingBag,
  CreditCard,
  Newspaper,
  Wrench,
  Cpu,
  UsersRound,
  Gamepad2,
  Puzzle,
} from 'lucide-react'

/* ============================================================
   Arquitetura de navegação — 4 modos, sub-navegação contextual.
   A navbar só mostra o modo; o Mapa mostra tudo, agrupado.
   ============================================================ */

export const MODES = [
  {
    id: 'comunidade',
    nome: 'Comunidade',
    Icon: UsersRound,
    accent: '#ff2e5b',
    path: '/',
    desc: 'O feed, os clips, o chat e as pessoas.',
    links: [
      { nome: 'Início', path: '/', Icon: Home, desc: 'O pulso da comunidade.' },
      { nome: 'Clips', path: '/clips', Icon: Clapperboard, desc: 'Vídeos e publicações.' },
      { nome: 'Chat', path: '/chat', Icon: MessageCircle, desc: 'A conversa em direto.' },
      { nome: 'Membros', path: '/membros', Icon: Users, desc: 'Quem anda por cá.' },
      { nome: 'Cartas', path: '/cartas', Icon: CreditCard, desc: 'O álbum de todos.' },
    ],
  },
  {
    id: 'jogar',
    nome: 'Jogar',
    Icon: Gamepad2,
    accent: '#ff2e5b',
    path: '/previsoes',
    desc: 'Previsões, estatísticas e distinções.',
    links: [
      { nome: 'Previsões', path: '/previsoes', Icon: Swords, desc: 'Vota e sobe na tabela.' },
      { nome: 'Estatísticas', path: '/jogos', Icon: BarChart3, desc: 'Números por jogo.' },
      { nome: 'Enigmas', path: '/enigmas', Icon: Puzzle, desc: 'Segredos escondidos no site.' },
      { nome: 'Enigma 2', path: '/enigma2', Icon: Puzzle, desc: 'Protocolo Orion: 5 etapas.' },
      { nome: 'Distinções', path: '/distincoes', Icon: Award, desc: 'As insígnias da casa.' },
      { nome: 'Notícias', path: '/noticias', Icon: Newspaper, desc: 'Novidades dos jogos e da comunidade.', soSabino: true },
    ],
  },
  {
    id: 'mercado',
    nome: 'Mercado',
    Icon: ShoppingBag,
    accent: '#ff2e5b',
    path: '/cosmeticos',
    desc: 'Cartas, cores e o mercado ao vivo.',
    links: [
      { nome: 'Mercado', path: '/cosmeticos', Icon: ShoppingBag, desc: 'Compra, vende e acompanha.' },
    ],
  },
  {
    id: 'sistema',
    nome: 'Sistema',
    Icon: Wrench,
    accent: '#ff2e5b',
    path: '/ferramentas',
    desc: 'Ferramentas, PCs e otimizações.',
    links: [
      { nome: 'Ferramentas', path: '/ferramentas', Icon: Wrench, desc: 'Otimização, manutenção e PCs.' },
    ],
  },
]

export const modeDe = (pathname = '/') => {
  const p = String(pathname || '/')
  if (
    p.startsWith('/previsoes') ||
    p.startsWith('/jogos') ||
    p.startsWith('/distincoes') ||
    p.startsWith('/atualizacoes') ||
    p.startsWith('/noticias')
  ) {
    return MODES[1]
  }
  if (p.startsWith('/cosmeticos')) return MODES[2]
  if (p.startsWith('/ferramentas') || p.startsWith('/pcs') || p.startsWith('/componentes')) return MODES[3]
  return MODES[0]
}

export const linksDoModo = (mode, isAdmin = false) =>
  (mode?.links || []).filter(
    (l) => (!l.admin || isAdmin) && (!l.soSabino || desafioAtivo()),
  )

export const linkAtivo = (pathname, path) =>
  path === '/' ? pathname === '/' : pathname.startsWith(path)
