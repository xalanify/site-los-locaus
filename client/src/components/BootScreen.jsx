import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Panorama360 from './Panorama360'

/* ============================================================
   ENTRADA — panorama 360°
   ------------------------------------------------------------
   A imagem equirretangular é o fundo. No PC acompanha o rato;
   no telemóvel usa o giroscópio (com autorização) e o arrasto.
   Só se entra no site ao clicar em "Entrar" — sem barra nem
   temporizador automático.
   ============================================================ */

const PANO_DESKTOP = '/boot/qwantani-4096.jpg'
const PANO_MOBILE = '/boot/qwantani-2048.jpg'

export default function BootScreen({ visible, onEnter }) {
  const [aEntrar, setAEntrar] = useState(false)
  const entrou = useRef(false)

  useEffect(() => {
    if (visible) {
      setAEntrar(false)
      entrou.current = false
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    const aoTeclar = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        entrar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, aEntrar])

  const entrar = () => {
    if (entrou.current) return
    entrou.current = true
    setAEntrar(true)
    // deixa a animação de saída correr antes de montar o site
    window.setTimeout(() => onEnter && onEnter(), 420)
  }

  if (!visible) return null

  return (
    <div
      className={`boot-screen ${aEntrar ? 'boot-sair' : ''}`}
      role="dialog"
      aria-label="Entrada no site"
    >
      <Panorama360 desktopSrc={PANO_DESKTOP} mobileSrc={PANO_MOBILE} />

      {/* véu para o texto ficar legível sobre o céu */}
      <div className="boot-veu" aria-hidden="true" />

      <div className="boot-conteudo">
        <header className="boot-topo">
          <h1 className="boot-titulo">
            Ashow <span className="boot-e">e</span> Jazer
          </h1>
        </header>

        <main className="boot-meio">
          <button type="button" onClick={entrar} className="boot-entrar" disabled={aEntrar}>
            <span>Entrar</span>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="boot-beta">em beta</span>
        </main>

        <footer className="boot-fundo">
          <span className="boot-dica boot-dica-pc">move o rato para explorar</span>
          <span className="boot-dica boot-dica-touch">arrasta para explorar</span>
          <button
            type="button"
            className="boot-gyro"
            onClick={() => window.dispatchEvent(new Event('locaus:pedir-gyro'))}
          >
            ativar movimento
          </button>
        </footer>
      </div>
    </div>
  )
}
