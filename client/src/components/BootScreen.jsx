import { useEffect, useRef, useState } from 'react'

/* ============================================================
   SPLASH / LOADING — "locaus.fun" aparece letra a letra
   ------------------------------------------------------------
   Fundo: pintura do campo de ténis (loading.png) escurecida.
   A revelação das letras é feita em JavaScript (setTimeout),
   por isso funciona sempre — telemóvel, PC, PWA, browsers com
   animações reduzidas/otimizadas. Não depende de CSS animation.
   ============================================================ */

const PALAVRA = 'locaus.fun'
const PASSO_MS = 118 // intervalo entre letras
const ESPERA_FIM_MS = 950 // pausa depois da última letra
const SAIDA_MS = 560 // fade final

export default function BootScreen({ visible, onEnter }) {
  const [visiveis, setVisiveis] = useState(0)
  const [aEntrar, setAEntrar] = useState(false)
  const onEnterRef = useRef(onEnter)

  useEffect(() => {
    onEnterRef.current = onEnter
  }, [onEnter])

  useEffect(() => {
    if (!visible) return undefined

    setVisiveis(0)
    setAEntrar(false)

    let cancelado = false
    let ultimoTimer = 0
    let indice = 0

    const proxima = () => {
      if (cancelado) return
      indice += 1
      setVisiveis(indice)
      if (indice < PALAVRA.length) {
        ultimoTimer = window.setTimeout(proxima, PASSO_MS)
        return
      }
      // todas as letras visíveis -> pausa e sai
      ultimoTimer = window.setTimeout(() => {
        if (cancelado) return
        setAEntrar(true)
        ultimoTimer = window.setTimeout(() => {
          if (!cancelado && onEnterRef.current) onEnterRef.current()
        }, SAIDA_MS)
      }, ESPERA_FIM_MS)
    }

    // pequeno atraso para o fundo aparecer antes da primeira letra
    ultimoTimer = window.setTimeout(proxima, 180)

    return () => {
      cancelado = true
      window.clearTimeout(ultimoTimer)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`bootv2 ${aEntrar ? 'bootv2--sair' : ''}`}
      role="dialog"
      aria-label="A entrar no site"
    >
      <div className="bootv2-fundo" aria-hidden="true" />
      <div className="bootv2-veu" aria-hidden="true" />

      <div className="bootv2-centro">
        <h1 className="bootv2-marca" aria-label="locaus.fun">
          {PALAVRA.split('').map((letra, i) => (
            <span
              key={`${letra}-${i}`}
              className={`bootv2-letra ${i < visiveis ? 'is-on' : ''}`}
              style={{ transitionDelay: `${(i % 3) * 20}ms` }}
              aria-hidden="true"
            >
              {letra}
            </span>
          ))}
        </h1>
        <span className={`bootv2-linha ${visiveis >= PALAVRA.length ? 'is-on' : ''}`} aria-hidden="true" />
        <p className={`bootv2-sub bootv2-beta ${visiveis >= PALAVRA.length ? 'is-on' : ''}`}>
          beta
        </p>
      </div>
    </div>
  )
}
