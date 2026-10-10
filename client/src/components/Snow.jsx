import { useEffect, useRef } from 'react'

/* ============================================================
   Neve a cair (tema natal) — canvas, sem imagens e sem libs.

   - fica por cima do conteúdo mas por baixo da navbar e dos modais
   - respeita "reduzir movimento" (fica só com os floconos parados)
   - responde ao tamanho do ecrã e ao refresh rate do monitor
   ============================================================ */
export default function Snow() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const semMovimento =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let largura = 0
    let altura = 0
    let floconos = []
    let raf = 0

    const novoFlacon = (inicial) => {
      const r = 1 + Math.random() * 3.4
      return {
        x: Math.random() * largura,
        y: inicial ? Math.random() * altura : -10 - Math.random() * 60,
        r,
        vel: 14 + Math.random() * 40 + r * 6,
        amp: 8 + Math.random() * 26,
        fase: Math.random() * Math.PI * 2,
        velFase: 0.4 + Math.random() * 0.9,
        alfa: 0.35 + Math.random() * 0.5,
      }
    }

    const dimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      largura = window.innerWidth
      altura = window.innerHeight
      canvas.width = Math.floor(largura * dpr)
      canvas.height = Math.floor(altura * dpr)
      canvas.style.width = `${largura}px`
      canvas.style.height = `${altura}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const qtd = Math.min(150, Math.max(45, Math.round(largura / 9)))
      floconos = Array.from({ length: qtd }, () => novoFlacon(true))
      if (semMovimento) desenhar(0)
    }

    const desenhar = (dt) => {
      ctx.clearRect(0, 0, largura, altura)
      for (const f of floconos) {
        if (dt) {
          f.y += f.vel * dt
          f.fase += f.velFase * dt
          if (f.y - f.r > altura) {
            const novo = novoFlacon(false)
            f.x = novo.x
            f.y = novo.y
            f.r = novo.r
            f.vel = novo.vel
            f.amp = novo.amp
            f.alfa = novo.alfa
          }
        }
        const x = f.x + Math.sin(f.fase) * f.amp
        ctx.beginPath()
        ctx.fillStyle = `rgba(255,255,255,${f.alfa})`
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let anterior = performance.now()
    const passo = (agora) => {
      const dt = Math.min(0.05, (agora - anterior) / 1000)
      anterior = agora
      desenhar(dt)
      raf = requestAnimationFrame(passo)
    }

    dimensionar()
    window.addEventListener('resize', dimensionar)
    if (!semMovimento) raf = requestAnimationFrame(passo)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', dimensionar)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[45]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
