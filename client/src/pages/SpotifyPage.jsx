import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Music,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Terminal,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* ============================================================
   Spotify Premium By Xalana
   ------------------------------------------------------------
   Página dedicada para instalar/atualizar o Spotify modificado.
   Executa scripts no PC onde está o servidor (requer admin).
   ============================================================ */

export default function SpotifyPage() {
  const [estado, setEstado] = useState(null)
  const [aCorrer, setACorrer] = useState(null)
  const [logs, setLogs] = useState([])
  const [aviso, setAviso] = useState(null)
  const fimRef = useRef(null)

  const carregar = () => {
    fetch('/api/ferramentas', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setEstado(d)
          // procura as ferramentas spotify
          const spotify = d.ferramentas?.filter((f) => f.cat === 'Spotify')
          setEstado((prev) => ({ ...prev, spotify }))
        }
      })
      .catch(() => {})
  }

  useEffect(carregar, [])

  /* acompanha logs */
  useEffect(() => {
    if (!aCorrer) return undefined
    const iv = setInterval(() => {
      fetch('/api/ferramentas/status', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setLogs(d.logs || [])
            if (d.fim) setACorrer(null)
          }
        })
        .catch(() => {})
    }, 700)
    return () => clearInterval(iv)
  }, [aCorrer])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [logs.length])

  const executar = async (id) => {
    if (aCorrer) return
    setAviso(null)
    setLogs([])
    setACorrer(id)
    try {
      const r = await fetch('/api/ferramentas/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setAviso(d.error || 'Não deu para executar.')
        setACorrer(null)
        return
      }
    } catch {
      setAviso('Não deu para falar com o servidor.')
      setACorrer(null)
    }
  }

  const spotifyTools = estado?.spotify || []

  return (
    <section className="min-h-screen px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(7.5rem+env(safe-area-inset-top))] lg:pt-[calc(3.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-3xl">
        {/* ---------------- Cabeçalho ---------------- */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 ring-1 ring-green-500/30">
              <Music className="h-7 w-7 text-green-400" />
            </span>
            <div>
              <h1 className="font-black gradient-text text-3xl sm:text-4xl">Spotify Premium By Xalana</h1>
              <p className="mt-1 text-gray-400">Instala e mantém o Spotify modificado sem anúncios, skips ilimitados e qualidade máxima.</p>
            </div>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-[13px] text-yellow-200">
            <AlertTriangle className="inline h-4 w-4 mr-2 shrink-0 mt-0.5" />
            <strong>Requisitos:</strong> Windows 10/11, PowerShell como administrador, ligação à internet.
            O script instala o Spotify (se não tiver), baixa o motor spicetify e aplica a configuração Premium By Xalana.
          </div>
        </motion.div>

        {/* ---------------- Aviso global ---------------- */}
        {aviso && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl bg-red-500/15 border border-red-500/20 px-4 py-3 text-[13px] font-bold text-red-400"
          >
            {aviso}
          </motion.div>
        )}

        {/* ---------------- Cards das ações ---------------- */}
        <div className="space-y-4">
          {spotifyTools.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/15">
                    <Music className="h-6 w-6 text-green-400" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-black text-white">{f.nome}</h3>
                    <p className="mt-0.5 text-[13px] text-gray-400">{f.desc}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-green-500/15 text-green-400">
                  {f.id === 'spotify-instalar' ? 'Instalação' : 'Atualização'}
                </span>
              </div>

              {f.comando ? (
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-[12px] text-gray-300 font-mono">
                  {f.comando}
                </div>
              ) : (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-[12px] text-yellow-200">
                  ⚠ Tens de ter o <strong>Spotify já instalado</strong> no PC. Este comando corre
                  em modo normal (sem privilégios de administrador).
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => executar(f.id)}
                  disabled={aCorrer || !estado?.podeLocal}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-[13px] font-black text-white transition-colors hover:bg-green-400 disabled:opacity-40 disabled:hover:bg-green-500"
                >
                  {aCorrer === f.id ? (
                    <>
                      <span className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white rounded-full" />
                      A executar…
                    </>
                  ) : (
                    <>
                      {f.id === 'spotify-instalar' ? <Download className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                      {f.id === 'spotify-instalar' ? 'Instalar Spotify Premium' : 'Atualizar e Aplicar'}
                    </>
                  )}
                </button>
              </div>

              {f.id === 'spotify-instalar' && (
                <p className="mt-3 text-[11px] text-gray-500">
                  ⚠ Se passados dias o Spotify voltar ao normal (perdeu a modificação),
                  volta aqui e clica em <strong>Atualizar e Aplicar</strong> para reaplicar a configuração.
                </p>
              )}
            </motion.div>
          ))}

          {spotifyTools.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Music className="mx-auto h-12 w-12 mb-3 text-gray-600" />
              <p>Ferramentas Spotify não disponíveis. Verifica se o servidor tem PowerShell.</p>
            </div>
          )}
        </div>

        {/* ---------------- Terminal de logs ---------------- */}
        {(aCorrer || logs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass rounded-2xl p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                <span className={`h-2 w-2 rounded-full ${aCorrer ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`} />
                {aCorrer ? 'A executar…' : 'Última execução'}
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
              {logs.map((lg, i) => (
                <p key={i} className="text-gray-300">
                  <span className="text-emerald-500">›</span> {lg.l}
                </p>
              ))}
              {aCorrer && <p className="text-gray-500">› …</p>}
              <div ref={fimRef} />
            </div>
          </motion.div>
        )}

        {/* ---------------- Nota final ---------------- */}
        <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-gray-400">
          <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <p>
            Scripts correm no PC do servidor (requer PowerShell admin). A configuração aplicada é a
            <span className="font-bold text-green-400">Premium By Xalana</span> — sem anúncios, skips ilimitados,
            qualidade máxima. Para remover, desinstala o Spotify normalmente e apaga a pasta
            <code className="bg-black/40 px-1.5 rounded font-mono text-[11px]">%APPDATA%\Spotify</code>.
          </p>
        </div>
      </div>
    </section>
  )
}