import { useEffect, useRef, useState } from 'react'

/* ============================================================
   LOADING ESTILO CMD
   ------------------------------------------------------------
   Um terminal que "liga o servidor" e entra no site: as linhas
   vão aparecendo, o cursor pisca e a barra de estado enche.

   Regras:
   · dura ~3,2 s e entra sozinho;
   · um clique/toque depois de 0,8 s entra já (quem tem pressa);
   · tudo com limpeza de timers — sem intervalos a fugir.
   ============================================================ */

const DURACAO = 3200

const LINHAS = [
  { t: 0, tipo: 'dim', texto: 'Microsoft Windows [Versão 10.0.19045.3803]' },
  { t: 140, tipo: 'dim', texto: '(c) Ashow e Jazer. Todos os direitos reservados.' },
  { t: 300, tipo: 'dim', texto: '' },
  { t: 520, tipo: 'cmd', texto: 'C:\\Users\\visitante> cd C:\\LosLocaus' },
  { t: 800, tipo: 'cmd', texto: 'C:\\LosLocaus> iniciar servidor --site' },
  { t: 1150, tipo: 'ok', texto: '[ ok ] rede ligada' },
  { t: 1420, tipo: 'ok', texto: '[ ok ] sessão verificada' },
  { t: 1680, tipo: 'ok', texto: '[ ok ] base de dados ligada' },
  { t: 1940, tipo: 'ok', texto: '[ ok ] módulos carregados' },
  { t: 2230, tipo: 'cmd', texto: 'C:\\LosLocaus> entrar' },
  { t: 2520, tipo: 'accent', texto: 'A entrar no site...' },
  { t: 2930, tipo: 'ok', texto: '[ ok ] bem-vindo.' },
]

const CORES = {
  dim: 'text-gray-500',
  cmd: 'text-gray-200',
  ok: 'text-gray-400',
  accent: 'text-violet-300',
}

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

  const saltar = () => {
    // deixa passar o primeiro instante para não entrar sem se ver nada
    if (agora < 800 || entrou.current) return
    entrou.current = true
    setAgora(DURACAO)
    onEnter && onEnter()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050308] px-3 py-6 sm:px-6"
      onClick={saltar}
      role="presentation"
    >
      {/* brilho violeta muito discreto ao fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 32rem at 50% 42%, rgba(139,92,246,.13) 0%, rgba(5,3,8,0) 70%)',
        }}
      />

      <div className="relative w-full max-w-[38rem]">
        {/* janela do terminal */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0810] shadow-[0_30px_90px_rgba(0,0,0,.75)]">
          {/* barra de título */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 truncate font-mono text-[10px] text-gray-500 sm:text-[11px]">
              cmd.exe — Ashow e Jazer
            </span>
          </div>

          {/* corpo */}
          <div className="min-h-[15rem] px-3 py-3 font-mono text-[10px] leading-relaxed sm:min-h-[17rem] sm:px-4 sm:py-4 sm:text-[12px]">
            {LINHAS.map((linha, i) => {
              if (agora < linha.t) return null
              if (!linha.texto) return <div key={i} className="h-2" />
              return (
                <div key={i} className={`whitespace-pre-wrap break-words ${CORES[linha.tipo]}`}>
                  {linha.tipo === 'ok' ? (
                    <>
                      <span className="text-emerald-400">[ ok ]</span>
                      {linha.texto.replace('[ ok ]', '')}
                    </>
                  ) : linha.tipo === 'cmd' ? (
                    <>
                      <span className="text-violet-400">
                        {linha.texto.slice(0, linha.texto.indexOf('>') + 1)}
                      </span>
                      {linha.texto.slice(linha.texto.indexOf('>') + 1)}
                    </>
                  ) : (
                    linha.texto
                  )}
                </div>
              )
            })}

            {/* cursor */}
            <div className="mt-0.5 flex items-center text-gray-300">
              <span className="text-violet-400">C:\LosLocaus&gt;</span>
              <span className="ml-1 inline-block h-3 w-[7px] animate-pulse bg-violet-300/90 sm:h-3.5" />
            </div>
          </div>

          {/* barra de estado */}
          <div className="border-t border-white/10 bg-black/30 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-100"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <span className="w-9 text-right font-mono text-[10px] tabular-nums text-gray-500">
                {Math.round(progresso)}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-gray-600 sm:text-[10px]">
              <span>{agora < DURACAO ? 'ligado :: a entrar' : 'pronto'}</span>
              <span>127.0.0.1:3001</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-gray-700 sm:text-[10px]">
          clica para entrar já
        </p>
      </div>
    </div>
  )
}
