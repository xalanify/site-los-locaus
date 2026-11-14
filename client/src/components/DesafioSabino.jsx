import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bug, CheckCircle2, X } from 'lucide-react'
import {
  marcarFinalAvisoVisto,
  marcarWinVisto,
  useDesafioSabino,
} from '../lib/desafioSabino'

/* ============================================================
   AVISO FLUTUANTE DO DESAFIO — só para a conta Sabinojr
   Sem moedas, sem prémios: apenas mensagens.
   ============================================================ */
export default function DesafioSabino() {
  const estado = useDesafioSabino()
  const [finalAberto, setFinalAberto] = useState(false)
  const [winAberto, setWinAberto] = useState(false)

  useEffect(() => {
    if (!estado) return
    if (estado.final && !estado.ganhou && !estado.finalAvisoVisto) setFinalAberto(true)
    if (estado.ganhou && !estado.winVisto) setWinAberto(true)
  }, [estado])

  if (!estado) return null

  const fecharWin = () => {
    marcarWinVisto()
    setWinAberto(false)
  }

  return (
    <>
      {!estado.ganhou && (
        <div className="desafio-aviso" role="status">
          <Bug className="h-3.5 w-3.5" />
          <span>
            Bugs encontrados <b>{estado.encontrados}/3</b>
            {estado.final ? ' · falta o bug final' : ''}
          </span>
        </div>
      )}

      {/* Mensagem de vitória — aviso flutuante, sem qualquer recompensa */}
      {estado.ganhou && winAberto && (
        <div className="desafio-aviso desafio-win" role="status">
          <span className="desafio-win-ico">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <span className="desafio-win-txt">
            <b>Você ganhou os testes de bugs.</b>
            <em>Todos os bugs foram encontrados.</em>
          </span>
          <button type="button" onClick={fecharWin} aria-label="Fechar aviso">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {finalAberto &&
        !estado.ganhou &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4"
            onClick={() => {
              marcarFinalAvisoVisto()
              setFinalAberto(false)
            }}
            role="presentation"
          >
            <div
              className="relative w-full max-w-sm rounded-3xl border border-[#ff9e9e]/30 bg-[#141014] p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ff9e9e]/10 text-[#ff9e9e] ring-1 ring-[#ff9e9e]/30">
                <Bug className="h-7 w-7" />
              </span>
              <h2 className="mt-4 font-display text-xl font-black text-white">
                Desbloqueaste todos os bugs
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Encontraste os 3 bugs. Ainda falta um bug final: o banner do teu perfil.
              </p>
              <button
                type="button"
                onClick={() => {
                  marcarFinalAvisoVisto()
                  setFinalAberto(false)
                }}
                className="ui-btn ui-btn-primary mt-5 w-full justify-center"
              >
                Continuar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
