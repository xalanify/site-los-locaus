import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Magnet } from 'lucide-react'

/* ============================================================
   GTA6 — build Xbox 1.0.2.1 → PC (em preparação)
   Estilo terminal: Courier, azul, verde e vermelho.
   ============================================================ */

const MONO = "'Courier New', Courier, 'Lucida Console', monospace"
const AZUL = '#4d8dff'
const AZUL_ESCURO = '#1e3a8a'
const BORDA = 'rgba(47,91,208,.55)'
const TEXTO = '#8ea6d6'
const CLARO = '#cfe0ff'
const VERDE = '#39ff88'
const VERDE_ESCURO = '#0d3a24'
const VERMELHO = '#ff3b57'

export default function Gta6Page() {
  /* página fixa: sem scroll e sem faixa preta em baixo */
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  return (
    <div
      className="gta6-cyber relative overflow-hidden"
      style={{
        height: '100dvh',
        marginTop: 'calc(-1 * (var(--nv-header, 64px) + 6px))',
        background:
          'linear-gradient(rgba(70,120,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(70,120,255,.05) 1px, transparent 1px), #02040e',
        backgroundSize: '60px 60px, 60px 60px, auto',
        fontFamily: MONO,
        color: TEXTO,
      }}
    >
      <div className="gta6-inner mx-auto flex h-full w-full max-w-5xl flex-col px-4 pb-3 sm:px-6 sm:pb-4" style={{ paddingTop: 'calc(var(--nv-header, 64px) + 10px)' }}>
        <nav className="flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition hover:brightness-125"
            style={{ borderColor: BORDA, color: '#6f9fd8', background: 'rgba(30,58,138,.12)' }}
          >
            <ArrowLeft className="h-3 w-3" /> início
          </Link>
        </nav>

        <header className="mt-3 text-center">
          <div
            className="mx-auto grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full border"
            style={{
              borderColor: AZUL,
              boxShadow: '0 0 34px rgba(77,141,255,.4)',
              background: '#03081c',
            }}
          >
            <img src="/gta6.png" alt="GTA VI" className="h-full w-full object-cover" />
          </div>

          <h1
            className="mt-4 text-[clamp(34px,6.4vw,62px)] font-bold uppercase leading-none tracking-[0.3em]"
            style={{ color: AZUL, textShadow: '0 0 24px rgba(77,141,255,.5)' }}
          >
            GTA6
          </h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.24em] text-[#6f9fd8]">
            xbox build 1.0.2.1 · recompilação para pc _
          </p>
          <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.22em]" style={{ color: VERMELHO }}>
            em desenvolvimento · muito em breve
          </p>
        </header>

        <section
          className="mt-5 border p-4 text-center sm:p-5"
          style={{ borderColor: 'rgba(255,59,87,.7)', background: 'rgba(12,6,24,.8)' }}
        >
          <p
            className="flex items-center justify-center gap-2 text-[15px] font-bold uppercase tracking-[0.14em]"
            style={{ color: VERMELHO }}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> gta6 build para pc em breve
          </p>
          <p className="mx-auto mt-2.5 max-w-2xl text-[14px] leading-relaxed">
            Está a ser feita uma <b style={{ color: CLARO }}>recompilação de uma build de Xbox (1.0.2.1)</b>{' '}
            para PC. Quando estiver pronta, publico aqui o tutorial completo — requisitos, ferramentas,
            passo a passo e como testar.
          </p>
          <p className="mt-2.5 text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: VERDE }}>
            ⚑ isto não será a pagar — vai ser tudo grátis
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#5f7fae]">
            ensino tudo · nos próximos dias
          </p>
        </section>

        <section className="mt-4 border" style={{ borderColor: BORDA, background: 'rgba(3,8,27,.78)' }}>
          <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'rgba(47,91,208,.35)' }}>
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#9fc3ff' }}>
              <span className="inline-block h-1.5 w-1.5" style={{ background: VERDE }} /> download
            </span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-[#5f7fae]">magnet / torrent</span>
          </div>

          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="/gta6-ficheiros.png"
              target="_blank"
              rel="noreferrer"
              className="group flex shrink-0 items-center gap-3"
              title="Ver a lista de ficheiros do torrent"
            >
              <img
                src="/gta6-ficheiros.png"
                alt="Lista de ficheiros do torrent"
                className="h-[96px] w-[76px] border object-cover object-top transition group-hover:brightness-125"
                style={{ borderColor: BORDA, background: '#03081c' }}
              />
              <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: '#7ea6d6' }}>
                lista de<br />ficheiros ↗
              </span>
            </a>

            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-relaxed">
                Já existe um torrent, mas por questões de segurança ainda não o vou publicar.
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em]" style={{ color: VERDE }}>
                torrent do jogo em breve
              </p>
            </div>

            <span
              className="inline-flex cursor-not-allowed items-center gap-2 border px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] opacity-80"
              style={{ borderColor: '#2fbf71', background: VERDE_ESCURO, color: '#7dffb0' }}
              title="Ainda não disponível"
            >
              <Magnet className="h-3 w-3" /> torrent
            </span>
          </div>
        </section>

        <p className="mt-auto pt-3 text-center text-[9.5px] uppercase tracking-[0.24em] text-[#3d5d8a]">
          locaus.fun // gta6 // 2026
        </p>
      </div>
    </div>
  )
}
