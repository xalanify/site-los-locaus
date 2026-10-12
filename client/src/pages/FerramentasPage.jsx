import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wrench,
  Terminal,
  Play,
  RefreshCcw,
  ShieldAlert,
  Search,
  Check,
  Loader2,
  Package,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* ============================================================
   Ferramentas Windows
   ------------------------------------------------------------
   Uma lista de scripts PowerShell prontos a correr no PC onde está
   o servidor: rede, debloat, otimização, sistema e instalação de
   programas via winget (nada de installers). Clicou -> corre e os
   logs aparecem a andar aqui em baixo.
   ============================================================ */

const CATS = ['Todas', 'Rede', 'Debloat', 'Otimização', 'Sistema', 'Programas', 'Verificar OC']

const PERIGO = {
  baixo: { tom: 'ok', txt: 'rotina' },
  medio: { tom: 'aviso', txt: 'mexe no sistema' },
  alto: { tom: 'perigo', txt: 'mexe no arranque' },
}

function Badge({ tom, children }) {
  const tons = {
    ok: 'bg-white/10 text-gray-400',
    aviso: 'bg-yellow-500/15 text-yellow-400',
    perigo: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tons[tom] || tons.ok}`}
    >
      {children}
    </span>
  )
}

export default function FerramentasPage() {
  const [dados, setDados] = useState(null)
  const [estado, setEstado] = useState(null)
  const [cat, setCat] = useState('Todas')
  const [idLivre, setIdLivre] = useState('')
  const [aviso, setAviso] = useState(null)
  const [recarregado, setRecarregado] = useState(false)
  const fimRef = useRef(null)

  const carregar = () => {
    fetch('/api/ferramentas', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setDados(d)
          setEstado(d.estado)
        }
      })
      .catch(() => {})
      .finally(() => setRecarregado(true))
  }

  useEffect(carregar, [])

  const aCorrer = estado?.aCorrer || null

  /* acompanha os logs enquanto há trabalho */
  useEffect(() => {
    if (!aCorrer) return undefined
    const iv = setInterval(() => {
      fetch('/api/ferramentas/status', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setEstado(d))
        .catch(() => {})
    }, 700)
    return () => clearInterval(iv)
  }, [aCorrer])

  /* o terminal acompanha o fundo */
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [estado?.logs?.length])

  const ferramentas = useMemo(() => dados?.ferramentas || [], [dados])
  const cats = useMemo(() => {
    const usadas = new Set(ferramentas.map((f) => f.cat))
    return CATS.filter((c) => c === 'Todas' || usadas.has(c))
  }, [ferramentas])
  const visiveis = useMemo(
    () => (cat === 'Todas' ? ferramentas : ferramentas.filter((f) => f.cat === cat)),
    [ferramentas, cat],
  )

  const executar = async (id) => {
    if (aCorrer) return
    setAviso(null)
    try {
      const r = await fetch('/api/ferramentas/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id, arg: idLivre }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setAviso(d.error || 'Não deu para executar.')
        return
      }
      setEstado((prev) => ({ ...(prev || {}), aCorrer: id, logs: [], fim: null, erro: null }))
    } catch {
      setAviso('Não deu para falar com o servidor.')
    }
  }

  const logs = estado?.logs || []
  const podeLocal = dados?.podeLocal

  return (
    <section className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        {/* ---------------- Cabeçalho ---------------- */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1
            className="font-black gradient-text"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
          >
            Ferramentas Windows
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Otimizações, rede, debloat e instalação de programas — tudo por script, sem setup.
            Corre no PC onde está o servidor.
          </p>
        </motion.div>

        {podeLocal === false && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-[13px] text-yellow-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <p>
              Este servidor não tem PowerShell (Vercel) — as ferramentas só correm quando o site
              está num PC Windows local (INICIAR.bat).
            </p>
          </div>
        )}

        {/* ---------------- Filtros ---------------- */}
        <div className="mb-5 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wide transition-colors ${
                cat === c
                  ? 'bg-orange-500 text-white'
                  : 'btn-glass text-gray-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {aviso && (
          <p className="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-[13px] font-bold text-red-400">
            {aviso}
          </p>
        )}

        {/* ---------------- Terminal ---------------- */}
        {(aCorrer || logs.length > 0) && (
          <div className="glass mb-6 rounded-2xl p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                <span
                  className={`h-2 w-2 rounded-full ${aCorrer ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`}
                />
                {aCorrer ? 'A executar…' : 'Última execução'}
                {estado?.erro ? <span className="text-red-400">· erro</span> : null}
              </p>
              <button
                onClick={carregar}
                className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 transition-colors hover:text-gray-300"
              >
                <RefreshCcw className="h-3 w-3" /> limpar
              </button>
            </div>

            {/* barra de progresso (indeterminada — não sabemos o tamanho do script) */}
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={`h-full rounded-full ${estado?.erro ? 'bg-red-500' : 'bg-emerald-400'}`}
                initial={{ width: '4%' }}
                animate={aCorrer ? { width: ['10%', '75%', '92%'] } : { width: '100%' }}
                transition={aCorrer ? { duration: 22, repeat: Infinity, ease: 'easeInOut' } : undefined}
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
              {logs.map((lg, i) => (
                <p key={i} className="text-gray-300">
                  <span className="text-emerald-500">›</span> {lg.l}
                </p>
              ))}
              {aCorrer && <p className="text-gray-500">› …</p>}
              <div ref={fimRef} />
            </div>
          </div>
        )}

        {/* ---------------- Grelha ---------------- */}
        {!recarregado ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
            <RefreshCcw className="h-4 w-4 animate-spin text-orange-400" /> A carregar ferramentas…
          </div>
        ) : visiveis.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">Sem ferramentas nesta aba.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((f, i) => {
              const pg = PERIGO[f.perigo] || PERIGO.baixo
              const ocupado = Boolean(aCorrer)
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="glass flex flex-col rounded-2xl p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-display text-[15px] font-black leading-tight text-white">
                      {f.livre ? <Package className="mr-1.5 inline h-4 w-4 text-orange-400" /> : null}
                      {f.nome}
                    </p>
                    <Badge tom={pg.tom}>{pg.txt}</Badge>
                  </div>
                  <p className="mb-3 flex-1 text-[12.5px] leading-relaxed text-gray-400">{f.desc}</p>

                  {f.livre ? (
                    <div className="flex gap-2">
                      <input
                        value={idLivre}
                        onChange={(e) => setIdLivre(e.target.value)}
                        placeholder="ShareX.ShareX"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
                        disabled={ocupado}
                      />
                      <button
                        onClick={() => executar(f.id)}
                        disabled={ocupado || !idLivre.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-[12px] font-black text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
                      >
                        <Search className="h-3.5 w-3.5" /> Instalar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => executar(f.id)}
                      disabled={ocupado || podeLocal === false}
                      className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-[13px] font-black text-white transition-colors hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-white/10"
                    >
                      {aCorrer === f.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                      ) : (
                        <Play className="h-4 w-4 text-orange-400" />
                      )}
                      {aCorrer === f.id ? 'A correr…' : 'Executar'}
                    </button>
                  )}

                  {f.comando ? (
                    <p className="mt-2 truncate font-mono text-[10.5px] text-gray-600" title={f.comando}>
                      {f.comando}
                    </p>
                  ) : null}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* ---------------- Nota ---------------- */}
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-gray-400">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <p>
            Scripts puros — vê o que cada um faz no fim do cartão. Para mexer no sistema, corre o
            site <span className="font-bold text-white">como administrador</span>; sem isso, o
            script avisa e segue.
          </p>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
          <Terminal className="h-3 w-3" /> {ferramentas.length} ferramentas ·{' '}
          {dados?.estado?.podeLocal ? 'PowerShell disponível' : aCorrer ? 'a correr' : 'estado desconhecido'}
        </p>
      </div>
    </section>
  )
}
