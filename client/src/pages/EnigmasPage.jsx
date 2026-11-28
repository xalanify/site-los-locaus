import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy } from 'lucide-react'
import CartaEnigma from '../components/CartaEnigma'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMAS — estilo "terminal" (dark navy / azul / mono)
   O Enigma 2 está fechado: em preparação, abre em breve.
   ============================================================ */

const AZUL = '#5b9dff'
const AZUL_FORTE = '#2f6bff'
const CIANO = '#7ee7ff'
const VERDE = '#3dffa1'
const VERMELHO = '#ff4d6d'

export default function EnigmasPage() {
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [zoom, setZoom] = useState(null)
  const wrapRef = useRef(null)
  const fitRef = useRef(null)

  const nomeConta = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').username || 'membro'
    } catch {
      return 'membro'
    }
  })()

  // página fixa: trava o scroll do body (igual à página /gta6)
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  // ajusta a escala do conteúdo ao ecrã (sem scroll)
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
    }
  }, [])

  useEffect(() => {
    fetch('/api/enigma/arquivo', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) throw new Error('Sem resposta.')
        setArquivo(d)
      })
      .catch((e) => setErro(e.message || 'Não consegui abrir o arquivo.'))
  }, [])

  const vencedores = arquivo?.vencedores || []

  return (
    <div
      ref={wrapRef}
      className="relative h-screen overflow-hidden font-mono text-[#b9d4ff]"
      style={{
        paddingTop: 'calc(var(--nv-header, 64px) + 12px)',
        background:
          'linear-gradient(rgba(70,130,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(70,130,255,.045) 1px, transparent 1px), #02040c',
        backgroundSize: '56px 56px, 56px 56px, auto',
      }}
    >
      <div ref={fitRef} className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
        {/* topo */}
        <nav className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 border border-[#2f6bff]/60 bg-[#2f6bff]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cfe2ff]">
            <i className="not-italic text-[#5b9dff]">◆</i> Enigmas
          </span>
          <Link
            to="/cartas"
            className="inline-flex items-center gap-2 border border-[#2f6bff]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f9fd8] transition hover:border-[#2f6bff]/70 hover:text-[#cfe2ff]"
          >
            <i className="not-italic text-[#5b9dff]">◆</i> Cartas
          </Link>
        </nav>

        {/* marca */}
        <header className="mt-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#2f6bff]/60 shadow-[0_0_45px_rgba(47,107,255,.35)]">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-[#5b9dff]/30 bg-[#071228]">
              <Trophy className="h-6 w-6 text-[#5b9dff]" />
            </span>
          </div>
          <h1
            className="mt-4 text-[clamp(30px,6vw,54px)] font-black uppercase leading-none tracking-[0.24em] text-[#5b9dff]"
            style={{ textShadow: '0 0 28px rgba(47,107,255,.55)' }}
          >
            Enigmas
          </h1>
        </header>

        {/* enigma 2 em breve — mensagem simples */}
        <section
          className="mt-6 border p-5 text-center"
          style={{ borderColor: 'rgba(255,77,109,.65)', background: 'rgba(8,10,30,.72)' }}
        >
          <p className="text-[13px] font-black uppercase tracking-[0.2em]" style={{ color: VERMELHO }}>
            ⚠ enigma 2 em breve
          </p>
          {erro && <p className="mt-3 text-[11px]" style={{ color: VERMELHO }}>{erro}</p>}
        </section>

        {/* últimos vencedores */}
        <section className="mt-4 flex min-h-0 flex-1 flex-col border" style={{ borderColor: 'rgba(47,107,255,.45)', background: 'rgba(5,9,26,.72)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(47,107,255,.28)' }}>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: CIANO }}>
              <span className="inline-block h-1.5 w-1.5" style={{ background: CIANO }} /> últimos vencedores
            </span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#5f7fae]">
              {vencedores.length} semana{vencedores.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {!arquivo ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-[#5f7fae]" />
              </div>
            ) : vencedores.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-[#8fb3e6]">Ainda não há vencedores.</p>
            ) : (
              <ul>
                {vencedores.map((v) => (
                  <li key={v.semana} className="border-b last:border-0" style={{ borderColor: 'rgba(47,107,255,.12)' }}>
                    <button
                      type="button"
                      onClick={() => setZoom(v)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-[#2f6bff]/10"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center border" style={{ borderColor: 'rgba(245,197,66,.4)', color: '#f5c542' }}>
                        <Trophy className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] uppercase tracking-[0.22em]" style={{ color: VERMELHO }}>
                          enigma {String(v.semana).replace('semana-', '')}
                        </span>
                        <span className="mt-0.5 block truncate text-[14px] font-black uppercase tracking-[0.08em] text-[#dbe9ff]">
                          {v.nome}
                        </span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-[#5f7fae]">
                          1.º lugar · +{v.moedas} moedas · carta 1/1
                        </span>
                      </span>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-[#5b9dff]">
                        ver carta →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="mt-3 text-center text-[9px] uppercase tracking-[0.3em] text-[#3d5d8a]">
          locaus.fun // enigmas // 2026
        </p>
      </div>

      {/* zoom vencedor */}
      {zoom && (
        <div
          className="fixed inset-0 z-[140] grid place-items-center bg-black/90 p-4"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <div className="w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <CartaEnigma nome={zoom.nome} ampliada />
            <div className="mt-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: VERMELHO }}>
                enigma {String(zoom.semana).replace('semana-', '')} · 1.º lugar
              </p>
              <button
                type="button"
                onClick={() => setZoom(null)}
                className="mt-2 w-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cfe2ff]"
                style={{ borderColor: 'rgba(47,107,255,.5)', background: 'rgba(47,107,255,.12)' }}
              >
                fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

