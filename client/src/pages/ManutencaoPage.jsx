import { LogOut, Clock, Sparkles, Store, Gift, History, Wrench } from 'lucide-react'
import AvatarImg from '../components/AvatarImg'

/* ============================================================
   Página de manutenção — o site só abre para admins.
   Os membros vêem o aviso das alterações e da hora de abertura.
   ============================================================ */

const NOVIDADES = [
  {
    Icon: Sparkles,
    titulo: 'Novo design em todo o site',
    texto: 'Navbar com ícones, tipografia nova, fundo vivo e cartões repensados.',
  },
  {
    Icon: Store,
    titulo: 'Mercado ao vivo no lugar da loja',
    texto: 'Preços a subir e a descer, gráficos, compras e vendas entre membros.',
  },
  {
    Icon: Gift,
    titulo: 'Locaus Packs',
    texto: 'Packs Básico, Épico e Lendário — a chegar em breve.',
  },
  {
    Icon: History,
    titulo: 'Histórico e anúncios',
    texto: 'Põe os teus itens à venda e acompanha todas as compras e vendas.',
  },
]

export default function ManutencaoPage({ user, onLogout }) {
  return (
    <div className="manutencao">
      <div className="manutencao-card">
        <span className="manutencao-badge">
          <Wrench className="h-3.5 w-3.5" /> Em manutenção
        </span>

        <h1>
          Estamos a preparar o <em>mercado ao vivo</em>.
        </h1>

        <p className="manutencao-sub">
          A loja de cosméticos deu lugar a um mercado com preços a subir e a descer. Estamos a
          afinar os últimos detalhes e a corrigir bugs.
        </p>

        <ul className="manutencao-lista">
          {NOVIDADES.map((n) => {
            const Icon = n.Icon
            return (
              <li key={n.titulo}>
                <span className="manutencao-icone">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{n.titulo}</span>
                  <span className="block text-[11px] leading-snug text-zinc-500">{n.texto}</span>
                </span>
              </li>
            )
          })}
        </ul>

        <div className="manutencao-hora">
          <Clock className="h-4 w-4" />
          <span>
            Abrimos <b>hoje à noite</b>. Volta mais tarde.
          </span>
        </div>

        <div className="manutencao-conta">
          <AvatarImg src={user?.avatar_url} name={user?.username || 'Membro'} className="h-8 w-8" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-white">
              {user?.username || 'Membro'}
            </span>
            <span className="block text-[10px] text-zinc-500">Sessão iniciada</span>
          </span>
          <button type="button" onClick={onLogout} className="manutencao-sair">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </div>
    </div>
  )
}
