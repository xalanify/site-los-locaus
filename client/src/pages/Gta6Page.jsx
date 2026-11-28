import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Info } from 'lucide-react'

/* ============================================================
   GTA6 — painéis de terminal (visual tipo Cyberleek)
   Azul forte, quadrados verdes, tudo monoespaçado.
   A página encaixa sempre no ecrã (sem scroll).
   ============================================================ */

const MONO = "'Courier New', Courier, 'Lucida Console', monospace"

export default function Gta6Page() {
  const wrapRef = useRef(null)
  const fitRef = useRef(null)

  // sem scroll: trava a página e ajusta a escala do conteúdo ao ecrã
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    const fit = fitRef.current
    if (!wrap || !fit) return undefined

    let frame = 0
    let ultimo = 0

    const ajustar = () => {
      const cs = getComputedStyle(wrap)
      const pt = parseFloat(cs.paddingTop) || 0
      const pb = parseFloat(cs.paddingBottom) || 0
      const disponivel = wrap.clientHeight - pt - pb
      const altura = fit.offsetHeight
      if (!disponivel || !altura) return
      const z = Math.min(1, Math.max(0.5, (disponivel - 4) / altura))
      if (Math.abs(z - ultimo) < 0.004) return
      ultimo = z
      fit.style.zoom = z.toFixed(4)
    }

    const agendar = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(ajustar)
    }

    agendar()
    const t1 = setTimeout(ajustar, 150)
    const t2 = setTimeout(ajustar, 700)
    const t3 = setTimeout(ajustar, 1600)
    window.addEventListener('resize', agendar)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar).catch(() => {})

    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(agendar)
      ro.observe(wrap)
      ro.observe(fit)
    }

    return () => {
      window.removeEventListener('resize', agendar)
      if (ro) ro.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div
      className="gta6-cyber gta6-page relative overflow-hidden"
      style={{
        fontFamily: MONO,
      }}
    >
      <span className="gta6-fundo-linhas" aria-hidden="true" />

      <div
        ref={wrapRef}
        className="gta6-wrap"
        style={{ paddingTop: 'calc(var(--nv-header, 64px) + 16px)' }}
      >
        <div ref={fitRef} className="gta6-fit">
          <nav className="gta6-rise" style={{ animationDelay: '0ms' }}>
            <Link to="/" className="gta6-btn">
              <ArrowLeft className="h-3 w-3" /> início
            </Link>
          </nav>

          <header className="gta6-rise gta6-cabeca" style={{ animationDelay: '70ms' }}>
            <div className="gta6-logo mx-auto">
              <img src="/gta6.png" alt="GTA VI" loading="lazy" />
            </div>
            <h1 className="gta6-titulo mt-4">GTA6</h1>
            <p className="gta6-sub">xbox build 1.0.2.1 · recompilação para pc</p>
            <p className="gta6-erro">em desenvolvimento · muito em breve</p>
          </header>

          {/* avisos */}
          <section className="gta6-rise cy-painel cy-painel--avisos" style={{ animationDelay: '210ms' }}>
            <div className="cy-topo">
              <span className="cy-titulo">
                <i className="cy-quad cy-quad--vermelho" /> avisos importantes
              </span>
              <span className="cy-seta">▾</span>
            </div>

            <div className="cy-corpo">
              <ul className="cy-lista">
                <li>
                  Não descarregues nem instales ficheiros de links falsos ou desconhecidos. Podem conter{' '}
                  <b style={{ color: '#ff8b9c' }}>vírus ou malware</b> no teu PC.
                </li>
                <li>
                  Tem cuidado ao descarregar ficheiros <i>supostamente funcionais</i> de sites desconhecidos.
                </li>
                <li>
                  Os ficheiros do <b>GTA6 1.0.2.1 (208 GB)</b> são obtidos de forma ilegal — não devo
                  informar nem ensinar ninguém a como os obter.
                </li>
                <li>
                  Quando a build/port para PC ficar <b style={{ color: '#2bff88' }}>funcional e estável</b>,
                  poderei fornecer os ficheiros para tal funcionar.
                </li>
                <li>
                  Eu (<b>xalana</b>) já tenho os <b>ficheiros completos do GTA 6</b>, porém ainda não os
                  irei fornecer.
                </li>
              </ul>

              <p className="cy-assinatura">
                <Info className="h-3 w-3" /> xalana <span>—</span> locaus
              </p>
            </div>
          </section>

          <p className="gta6-rodape">locaus.fun // gta6 // 2026</p>
        </div>
      </div>
    </div>
  )
}
