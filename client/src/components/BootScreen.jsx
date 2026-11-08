import { useEffect, useRef, useState } from 'react'

/* ============================================================
   SPLASH — preto absoluto, logótipo 3D e barra de vidro
   ------------------------------------------------------------
   Entra sozinho ao fim de ~5 segundos, sem botão.
   ============================================================ */

const DURACAO = 5000

export default function BootScreen({ visible, onEnter }) {
  const [progresso, setProgresso] = useState(0)
  const [aEntrar, setAEntrar] = useState(false)
  const entrou = useRef(false)
  const onEnterRef = useRef(onEnter)

  useEffect(() => {
    onEnterRef.current = onEnter
  }, [onEnter])

  const entrar = () => {
    if (entrou.current) return
    entrou.current = true
    setAEntrar(true)
    window.setTimeout(() => {
      if (onEnterRef.current) onEnterRef.current()
    }, 520)
  }

  useEffect(() => {
    if (!visible) return undefined
    entrou.current = false
    setAEntrar(false)
    setProgresso(0)
    const inicio = performance.now()
    // setInterval (e não requestAnimationFrame) para a barra continuar a
    // andar mesmo quando o separador fica em segundo plano.
    const relogio = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - inicio) / DURACAO)
      setProgresso(Math.round(p * 100))
      if (p >= 1) {
        window.clearInterval(relogio)
        entrar()
      }
    }, 80)
    return () => window.clearInterval(relogio)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`boot-screen boot-liquid ${aEntrar ? 'boot-sair' : ''}`}
      role="dialog"
      aria-label="A entrar no site"
    >
      <div className="boot-liquid-inner">
        <div className="boot-logo-wrap">
          <span className="boot-logo boot-logo--sega">LOCAUS.FUN</span>
        </div>

        <div
          className="boot-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progresso}
        >
          <span className="boot-progress-bar">
            <span className="boot-progress-fill" style={{ width: `${progresso}%` }} />
            <span className="boot-progress-shine" aria-hidden="true" />
          </span>
          <span className="boot-progress-pct">{progresso}%</span>
        </div>

        <span className="boot-beta">beta</span>
      </div>
    </div>
  )
}
