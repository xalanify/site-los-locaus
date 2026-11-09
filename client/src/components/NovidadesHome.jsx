import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { BADGES, BadgeGem } from './BadgeGem'

/* ============================================================
   NOVIDADES (home)
   ------------------------------------------------------------
   Cartão curto para anunciar o novo ícone das distinções.
   Mostra as estrelas reais, com as cores de cada insígnia.
   ============================================================ */

const MOSTRAR = ['dev', 'top1', 'previsao1']

export default function NovidadesHome() {
  const badges = MOSTRAR.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean)

  return (
    <Link to="/distincoes" className="home-novidades glass group">
      <div className="home-novidades-txt">
        <span className="home-novidades-chip">
          <Sparkles className="h-3 w-3" /> Novidades
        </span>
        <h2>Novo ícone das distinções</h2>
        <p>
          As insígnias do site passam a usar uma estrela, cada uma com a sua cor e os seus olhos.
        </p>
        <span className="home-novidades-link">
          Ver distinções <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="home-novidades-stars" aria-hidden="true">
        {badges.map((b) => (
          <span key={b.id} className="home-novidades-star">
            <BadgeGem badge={b} size={44} />
            <em>{b.id === 'top1' ? 'TOP 1' : b.id === 'previsao1' ? 'PREVISÃO' : 'DEV'}</em>
          </span>
        ))}
      </div>
    </Link>
  )
}
