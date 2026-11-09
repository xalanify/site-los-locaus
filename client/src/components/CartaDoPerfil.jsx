import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, X } from 'lucide-react'
import ProfileCard from './ProfileCard'

/* ============================================================
   Carta flutuante do perfil
   ------------------------------------------------------------
   Um botão pequeno, no canto inferior, que abre a carta do
   utilizador numa janela. Serve tanto o próprio perfil como o
   perfil público de outro membro.
   ============================================================ */

export default function CartaDoPerfil({ perfil = {}, jogos = null }) {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!aberto) return undefined
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', onKey)
    }
  }, [aberto])

  return (
    <>
      <button
        type="button"
        className="carta-flutuante"
        onClick={() => setAberto(true)}
        aria-label="Ver carta"
        title="Ver carta"
      >
        <CreditCard className="h-4 w-4" />
        <span>Carta</span>
      </button>

      {aberto &&
        createPortal(
          <div
            className="carta-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Carta de ${perfil.username || 'membro'}`}
            onClick={() => setAberto(false)}
          >
            <div className="carta-modal-box" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="carta-modal-close"
                onClick={() => setAberto(false)}
                aria-label="Fechar carta"
              >
                <X className="h-4 w-4" />
              </button>
              <ProfileCard
                perfil={perfil}
                variant={perfil.card_style || 'padrao'}
                jogos={jogos}
                className="w-full"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
