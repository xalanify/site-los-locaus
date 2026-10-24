import { useEffect, useRef, useState } from 'react'

/* ============================================================
   ENTRADA — clean
   ------------------------------------------------------------
   Sem janela de terminal: só o nome do site + uma barra de
   progresso suave e umas "janelas" de estado.
   · entra sozinho ~3,2 s;
   · clique/toque depois de 0,8 s entra já;
   · timers limpos — nada a fugir.
   ============================================================ */

const DURACAO = 3200
const MARCOS = ['a ligar', 'a verificar sessão', 'a abrir o site']

export default function BootScreen({ visible, onEnter }) {
  const [agora, setAgora] = useState(0)
  const entrou = useRef(false)
  const timers = useRef([])
  const inicioRef = useRef(0)

  useEffect(() => {
    if (!visible) return undefined
    entrou.current = false
    inicioRef.current = Date.now()
    setAgora(0)

    const iv = setInterval(() => {
      setAgora(Date.now() - inicioRef.current)
    }, 50)
    timers.current.push(iv)

    const fim = setTimeout(() => {
      if (entrou.current) return
      entrou.current = true
      setAgora(DURACAO)
      onEnter && onEnter()
    }, DURACAO)
    timers.current.push(fim)

    return () => {
      timers.current.forEach((t) => {
        clearInterval(t)
        clearTimeout(t)
      })
      timers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  const progresso = Math.min(100, (agora / DURACAO) * 100)
  const indice = Math.min(2, Math.floor((agora / DURACAO) * MARCOS.length))

  const saltar = () => {
    if (agora < 800 || entrou.current) return
    entrou.current = true
    setAgora(DURACAO)
    onEnter && onEnter()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050308] px-6 py-10"
      onClick={saltar}
      role="presentation"
    >
      {/* brilho violeta ao fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 32rem at 50% 42%, rgba(139,92,246,.16) 0%, rgba(5,3,8,0) 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* marca */}
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-lg font-black text-white ring-1 ring-violet-500/40 shadow-lg shadow-violet-900/40">
          L
        </span>
        <h1 className="mt-4 text-center font-display text-3xl font-black uppercase tracking-wide text-white">
          <span className="gradient-text">Locaus</span>
        </h1>
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-gray-500">
          Locaus · site da comunidade
        </p>

        {/* barra de progresso */}
        <div className="mt-7">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-100"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-gray-600">
            <span>{MARCOS[indice]}</span>
            <span className="tabular-nums">{Math.round(progresso)}%</span>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-gray-700 sm:text-[10px]">
          clica para entrar já
        </p>
      </div>
    </div>
  )
}