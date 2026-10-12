import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  Gauge,
  AlertTriangle,
  RefreshCcw,
  ChevronDown,
  Activity,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Lock,
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { authHeaders } from '../lib/auth'

/* ============================================================
   PCs / Specs — as máquinas do grupo
   ------------------------------------------------------------
   Aqui só entram valores REIS: o site corre um script do Windows
   (PowerShell + CPU-Z) no PC onde está o servidor e lê relógios,
   tensões e a RAM a correr. O browser não chega a isso — por isso
   a aba tem um portão: sem clicar em "Ler o PC", não se entra.
   ============================================================ */
const fmt = (n) => (Number(n) || 0).toLocaleString('pt-PT')

const ROTULOS = {
  os: 'Sistema',
  browser: 'Navegador',
  cpu_cores: 'Núcleos',
  ram_gb: 'Memória',
  gpu: 'Placa gráfica',
  screen: 'Ecrã',
  storage_gb: 'Armazenamento',
}

function Badge({ tom, children }) {
  const tons = {
    ok: 'bg-white/10 text-gray-400',
    aviso: 'bg-yellow-500/15 text-yellow-400',
    perigo: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40',
    bom: 'bg-emerald-500/15 text-emerald-400',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tons[tom] || tons.ok}`}
    >
      {children}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, tom = 'text-white', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-4 text-center"
    >
      <Icon className={`mx-auto mb-2 h-6 w-6 ${tom}`} />
      <div className="font-display text-2xl font-black leading-none">{value}</div>
      <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </div>
    </motion.div>
  )
}

function LinhaReal({ rotulo, valor, tom = 'text-white' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-[13px]">
      <span className="text-gray-400">{rotulo}</span>
      <span className={`text-right font-bold ${tom}`}>{valor}</span>
    </div>
  )
}

/* o que a análise (servidor) diz de cada peça — texto curto */
const VEREDITO_CPU = {
  overclock: { tom: 'perigo', txt: 'overclock' },
  boost: { tom: 'aviso', txt: 'acima do fábrico' },
  normal: { tom: 'ok', txt: 'de fábrica' },
  'sem-dados': { tom: 'ok', txt: 'sem dados' },
}

/* ============================================================
   Leitura real — o que o PowerShell/CPU-Z mandou
   ============================================================ */
function LeituraReal({ d }) {
  if (!d) return null
  const av = d.avaliacao || {}
  const cpu = av.cpu || {}
  const ram = av.ram || {}
  const ver = VEREDITO_CPU[cpu.estado] || VEREDITO_CPU['sem-dados']

  return (
    <div className="space-y-2">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-500">
        <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Valores reais (PowerShell + CPU-Z)
      </p>

      {/* ---------- CPU ---------- */}
      {d.cpu?.nome && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex flex-wrap items-center gap-2 font-bold text-white">
            <Cpu className="h-3.5 w-3.5 text-orange-400" /> {String(d.cpu.nome).trim()}
            <Badge tom={ver.tom}>{ver.txt}</Badge>
          </p>
          {cpu.relogio_mhz ? (
            <p className="text-gray-400">
              Relógio{' '}
              <span className="font-bold text-white">{fmt(cpu.relogio_mhz)} MHz</span>
              {cpu.teto_fabrica_mhz ? (
                <>
                  {' '}
                  · fábrica até <span className="font-bold text-white">{fmt(cpu.teto_fabrica_mhz)} MHz</span>
                </>
              ) : null}
              {cpu.desvio_pct != null ? ` (${cpu.desvio_pct > 0 ? '+' : ''}${cpu.desvio_pct}%)` : ''}
            </p>
          ) : (
            <p className="text-gray-500">Sem relógios para comparar.</p>
          )}
          <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
            {d.cpu.nucleos ? <span>{d.cpu.nucleos} núcleos / {d.cpu.logicos} threads</span> : null}
            {d.cpu.socket ? <span>{d.cpu.socket}</span> : null}
            {cpu.tensao_v ? <span>{cpu.tensao_v} V</span> : null}
            {cpu.temperatura_c ? <span>{cpu.temperatura_c} °C</span> : null}
            {cpu.potencia_w ? <span>{cpu.potencia_w} W</span> : null}
            {cpu.bclk_mhz ? <span>BCLK {cpu.bclk_mhz} MHz</span> : null}
          </p>
        </div>
      )}

      {/* ---------- RAM ---------- */}
      {ram.aplicada_mhz || d.ram?.modulos?.length ? (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex flex-wrap items-center gap-2 font-bold text-white">
            <MemoryStick className="h-3.5 w-3.5 text-violet-400" />
            Memória — {d.ram?.total_gb || '—'} GB {ram.tipo ? `· ${ram.tipo}` : ''}
            {ram.estado === 'xmp' ? <Badge tom="aviso">XMP/EXPO ligado</Badge> : null}
          </p>
          {ram.aplicada_mhz ? (
            <p className="text-gray-400">
              A correr a <span className="font-bold text-white">{fmt(ram.aplicada_mhz)} MHz</span>
              {ram.jedec_mhz ? (
                <>
                  {' '}
                  · padrão até <span className="font-bold text-white">{fmt(ram.jedec_mhz)} MHz</span>
                </>
              ) : null}
              {ram.kit_mhz ? ` · kit ${fmt(ram.kit_mhz)} MHz` : ''}
              {ram.tensao_xmp_v ? ` · ${ram.tensao_xmp_v} V` : ''}
            </p>
          ) : null}
          {d.ram?.modulos?.length > 0 && (
            <ul className="mt-1 space-y-1 text-gray-400">
              {d.ram.modulos.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white">{m.tamanho_gb || '—'} GB</span>
                  <span>
                    {m.velocidade_mhz ? `${fmt(m.velocidade_mhz)} MHz` : '—'}
                    {m.aplicada_mhz && m.aplicada_mhz !== m.velocidade_mhz
                      ? ` (a correr ${fmt(m.aplicada_mhz)})`
                      : ''}
                  </span>
                  {m.cas ? <span className="text-gray-500">CAS {m.cas}</span> : null}
                  {m.tensao_v ? <span className="text-gray-500">{m.tensao_v} V</span> : null}
                </li>
              ))}
            </ul>
          )}
          {d.ram?.modulos?.[0]?.referencia ? (
            <p className="mt-1.5 truncate text-[11px] text-gray-600">{d.ram.modulos[0].referencia}</p>
          ) : null}
        </div>
      ) : null}

      {/* ---------- GPU ---------- */}
      {d.gpu?.nome && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex flex-wrap items-center gap-2 font-bold text-white">
            <Monitor className="h-3.5 w-3.5 text-sky-400" /> {d.gpu.nome}
            {d.gpu.memoria_gb ? ` · ${d.gpu.memoria_gb} GB` : ''}
            {av.gpu?.estado === 'com-relogios' ? <Badge tom="ok">com relógios</Badge> : null}
          </p>
          {d.gpu.clock_atual_mhz ? (
            <p className="text-gray-400">
              Relógio <span className="font-bold text-white">{fmt(d.gpu.clock_atual_mhz)} MHz</span>
              {d.gpu.clock_base_mhz ? ` · base ${fmt(d.gpu.clock_base_mhz)} MHz` : ''}
              {d.gpu.clock_mem_mhz ? ` · memória ${fmt(d.gpu.clock_mem_mhz)} MHz` : ''}
              {d.gpu.temperatura ? ` · ${d.gpu.temperatura} °C` : ''}
            </p>
          ) : (
            <p className="text-[12px] text-gray-500">
              Sem relógios — o Windows só os dá com NVIDIA.
            </p>
          )}
        </div>
      )}

      {/* ---------- Discos / placa ---------- */}
      {d.discos?.length > 0 && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-white">
            <HardDrive className="h-3.5 w-3.5 text-emerald-400" /> Discos
          </p>
          <ul className="space-y-0.5 text-gray-400">
            {d.discos.map((x, i) => (
              <li key={i} className="truncate">
                <span className="font-bold text-white">{x.tamanho_gb || '—'} GB</span> {x.modelo || 'sem nome'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(d.placa || d.bios) && (
        <LinhaReal
          rotulo="Motherboard / BIOS"
          tom="text-gray-300"
          valor={
            [d.placa?.fabricante, d.placa?.modelo, d.bios?.versao ? `BIOS ${d.bios.versao}` : null]
              .filter(Boolean)
              .join(' · ') || '—'
          }
        />
      )}

      <p className="text-[11px] leading-relaxed text-gray-600">
        Vem do Windows e do CPU-Z, não do browser.
        {d.recolhido ? ` Lido em ${new Date(d.recolhido).toLocaleString('pt-PT')}.` : ''}
      </p>
    </div>
  )
}

/* ============================================================
   Terminal de passos (usado no portão e no cartão)
   ============================================================ */
function TerminalPassos({ passos, aCorrer }) {
  if (!passos?.length && !aCorrer) return null
  return (
    <div className="max-h-52 overflow-y-auto rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
        <span className={`h-2 w-2 rounded-full ${aCorrer ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`} />
        PowerShell
      </div>
      <ul className="space-y-0.5">
        {passos.map((p, i) => (
          <li key={i} className="text-gray-300">
            <span className="text-emerald-500">›</span> {p}
          </li>
        ))}
        {aCorrer && <li className="text-gray-500">› …</li>}
      </ul>
    </div>
  )
}

export default function PcsPage() {
  const [lista, setLista] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [aberto, setAberto] = useState(null) // linha expandida

  /* leitura real do PC (PowerShell) */
  const [podeLocal, setPodeLocal] = useState(null) // null = ainda não sabemos
  const [lendo, setLendo] = useState(false)
  const [passos, setPassos] = useState([])
  const [lido, setLido] = useState(null) // { passos, spec, details }
  const [erroLeitura, setErroLeitura] = useState(null)
  const [comando, setComando] = useState('')
  const [copiado, setCopiado] = useState(false)
  /* portão: bloqueia a aba até se correr a leitura */
  const [portao, setPortao] = useState(true)

  const carregar = () => {
    fetch('/api/users/specs', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLista(Array.isArray(d?.specs) ? d.specs : []))
      .catch(() => {})
      .finally(() => setCarregado(true))
  }

  useEffect(carregar, [])

  /* dá para correr o PowerShell no PC onde está o servidor? */
  useEffect(() => {
    fetch('/api/users/specs/status', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setPodeLocal(Boolean(d.podeLocal))
          if (Array.isArray(d.passos) && d.aCorrer) setPassos(d.passos)
        }
      })
      .catch(() => setPodeLocal(false))
  }, [])

  /* comando copiável para correr noutro PC (a Vercel não tem PowerShell) */
  useEffect(() => {
    fetch('/api/users/specs/script?como=comando', { headers: authHeaders() })
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => setComando(t.trim()))
      .catch(() => setComando(''))
  }, [])

  const copiarComando = async () => {
    if (!comando) return
    try {
      await navigator.clipboard.writeText(comando)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      /* o utilizador pode selecionar à mão a caixa do comando */
    }
  }

  /* corre o script no PC do servidor e mostra o que ele vai fazendo */
  const lerPC = async () => {
    if (lendo) return
    setLendo(true)
    setLido(null)
    setErroLeitura(null)
    setPassos([])

    const iv = setInterval(() => {
      fetch('/api/users/specs/status', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && Array.isArray(d.passos)) setPassos(d.passos)
        })
        .catch(() => {})
    }, 700)

    try {
      const r = await fetch('/api/users/specs/deep', {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setErroLeitura(d?.error || 'Não deu para ler o PC.')
        if (r.status === 501) setPodeLocal(false)
      } else {
        if (Array.isArray(d.passos) && d.passos.length) setPassos(d.passos)
        setLido(d)
        setPortao(false) // leitura feita -> a aba abre
        carregar()
      }
    } catch {
      setErroLeitura('Não deu para falar com o servidor.')
    } finally {
      clearInterval(iv)
      setLendo(false)
    }
  }

  /* resumo: só interessa o que foi lido a sério */
  const resumo = useMemo(() => {
    const reais = lista.filter((s) => s.details?.avaliacao)
    return {
      total: lista.length,
      reais: reais.length,
      ocCpu: reais.filter((s) => s.details.avaliacao?.cpu?.estado === 'overclock').length,
      xmp: reais.filter((s) => s.details.avaliacao?.ram?.estado === 'xmp').length,
    }
  }, [lista])

  /* primeiro quem já tem leitura real */
  const ordenada = useMemo(
    () =>
      [...lista].sort((a, b) => {
        const ra = a.details ? 1 : 0
        const rb = b.details ? 1 : 0
        if (ra !== rb) return rb - ra
        return String(a.username).localeCompare(String(b.username), 'pt')
      }),
    [lista],
  )

  const badgeDe = (s) => {
    const av = s.details?.avaliacao
    if (!av) return <Badge tom="ok">—</Badge>
    if (av.cpu?.estado === 'overclock') return <Badge tom="perigo">Overclock</Badge>
    if (av.ram?.estado === 'xmp') return <Badge tom="aviso">XMP</Badge>
    if (av.cpu?.estado === 'boost') return <Badge tom="aviso">Boost</Badge>
    return <Badge tom="ok">Normal</Badge>
  }

  return (
    <section className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        {/* ---------------- PORTÃO: bloqueia a aba até ler o PC ---------------- */}
        <AnimatePresence>
          {portao && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.94, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="glass w-full max-w-lg rounded-2xl p-5 ring-1 ring-white/10"
              >
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                    <Lock className="h-5 w-5 text-orange-400" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-black uppercase text-white">
                      Ler as specs deste PC
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-400">
                      Precisamos de correr o PowerShell aqui: é a única forma de ver os GHz
                      reais, a tensão e a RAM a correr. Toca no botão para entrar.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {podeLocal && (
                    <button
                      onClick={lerPC}
                      disabled={lendo}
                      className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
                    >
                      <RefreshCcw className={`h-4 w-4 ${lendo ? 'animate-spin' : ''}`} />
                      {lendo ? 'A ler o PC…' : 'Ler o meu PC agora'}
                    </button>
                  )}
                  {!podeLocal && podeLocal !== null && (
                    <button
                      onClick={() => setPortao(false)}
                      className="btn-glass rounded-full px-5 py-2.5 text-sm font-bold text-gray-300"
                    >
                      Entrar
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <TerminalPassos passos={passos} aCorrer={lendo} />
                </div>

                {erroLeitura && (
                  <p className="mt-3 text-[13px] font-bold text-red-400">{erroLeitura}</p>
                )}

                {!podeLocal && !lendo && podeLocal !== null && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="mb-2 text-[12px] leading-relaxed text-gray-400">
                      Este servidor não tem PowerShell (Vercel). Corre este comando no PC e o
                      resultado vem para o site:
                    </p>
                    {comando ? (
                      <button
                        onClick={copiarComando}
                        className="block w-full overflow-x-auto rounded-lg border border-emerald-500/30 bg-black/60 px-3 py-2 text-left font-mono text-[11px] text-emerald-300 transition-colors hover:border-emerald-500/60"
                        title="Clicar para copiar"
                      >
                        {copiado ? '✓ copiado' : comando}
                      </button>
                    ) : (
                      <p className="text-[12px] text-gray-600">A preparar o comando…</p>
                    )}
                  </div>
                )}

                {/* só depois de falhar (ou de não haver PowerShell) dá para passar */}
                {(erroLeitura || (!podeLocal && podeLocal !== null)) && !lendo && (
                  <button
                    onClick={() => setPortao(false)}
                    className="mt-3 w-full text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-300"
                  >
                    Entrar mesmo assim
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------- Cabeçalho ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1
            className="font-black gradient-text"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
          >
            PCs / Specs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            As máquinas do grupo com valores lidos no Windows. Clique numa linha para ver tudo.
          </p>
        </motion.div>

        {/* ---------------- Resumo ---------------- */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Monitor} label="PCs registados" value={fmt(resumo.total)} delay={0} />
          <StatCard
            icon={Terminal}
            label="Leituras reais"
            value={fmt(resumo.reais)}
            tom="text-emerald-400"
            delay={0.05}
          />
          <StatCard
            icon={Gauge}
            label="CPU com overclock"
            value={fmt(resumo.ocCpu)}
            tom="text-red-400"
            delay={0.1}
          />
          <StatCard
            icon={MemoryStick}
            label="Com XMP/EXPO"
            value={fmt(resumo.xmp)}
            tom="text-yellow-400"
            delay={0.15}
          />
        </div>

        {/* ---------------- Aviso curto ---------------- */}
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-gray-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <p>
            O browser não lê relógios — os valores vêm do Windows (PowerShell + CPU-Z).{' '}
            <span className="font-bold text-white">Overclock</span> = CPU acima do teto de
            fábrica ou RAM com XMP/EXPO ligado.
          </p>
        </div>

        {/* ---------------- Leitura real do PC (PowerShell) ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass mb-6 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase text-white">
                <Terminal className="h-5 w-5 text-emerald-400" />
                Ler o meu PC
              </h2>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-gray-500">
                Corre o script aqui no PC: CPU (relógio real, tensão, teto de fábrica), RAM (MHz,
                XMP), GPU e discos. Demora ~15 s.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {podeLocal && (
                <button
                  onClick={lerPC}
                  disabled={lendo}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
                >
                  <RefreshCcw className={`h-4 w-4 ${lendo ? 'animate-spin' : ''}`} />
                  {lendo ? 'A ler o PC…' : 'Ler o meu PC agora'}
                </button>
              )}
              <button
                onClick={copiarComando}
                disabled={!comando}
                className="btn-glass flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-gray-300 disabled:opacity-60"
                title="Copia o comando para correr no PowerShell do qualquer PC"
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiado ? 'Copiado' : 'Copiar comando'}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <TerminalPassos passos={passos} aCorrer={lendo} />
          </div>

          {erroLeitura && <p className="mt-3 text-sm font-bold text-red-400">{erroLeitura}</p>}

          {!podeLocal && !lendo && podeLocal !== null && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="mb-2 text-[13px] leading-relaxed text-gray-400">
                Sem PowerShell no servidor. Corre o comando no PC — ele envia o resultado para o
                site.
              </p>
              {comando ? (
                <button
                  onClick={copiarComando}
                  className="group block w-full overflow-x-auto rounded-lg border border-emerald-500/30 bg-black/60 px-3 py-2.5 text-left font-mono text-[11.5px] leading-relaxed text-emerald-300 transition-colors hover:border-emerald-500/60"
                  title="Clicar para copiar"
                >
                  {copiado ? '✓ copiado' : comando}
                </button>
              ) : (
                <p className="text-[12px] text-gray-600">A preparar o comando…</p>
              )}
            </div>
          )}

          {lido?.details && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <LeituraReal d={lido.details} />
            </div>
          )}
        </motion.div>

        {/* ---------------- Tabela ---------------- */}
        <div className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-gray-300">
              Máquinas do grupo
            </h2>
            <span className="text-[11px] font-bold text-gray-500">
              {lista.length} registos · clique numa linha
            </span>
          </div>

          {!carregado ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
              <RefreshCcw className="h-4 w-4 animate-spin text-orange-400" /> A carregar specs…
            </div>
          ) : lista.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Ainda sem specs — cada membro envia as do seu PC ao entrar no site.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2.5 font-bold">#</th>
                    <th className="px-4 py-2.5 font-bold">Membro</th>
                    <th className="px-4 py-2.5 font-bold">Sistema</th>
                    <th className="px-4 py-2.5 font-bold">CPU</th>
                    <th className="px-4 py-2.5 font-bold">RAM</th>
                    <th className="px-4 py-2.5 font-bold">Placa gráfica</th>
                    <th className="px-4 py-2.5 text-right font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenada.map((s, i) => {
                    const av = s.details?.avaliacao
                    const expandido = aberto === s.user_id
                    return (
                      <Fragment key={s.user_id}>
                        <tr
                          onClick={() => setAberto(expandido ? null : s.user_id)}
                          className={`cursor-pointer border-t border-white/5 transition-colors hover:bg-white/5 ${
                            expandido ? 'bg-white/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`font-display text-sm font-black ${
                                i === 0 ? 'text-orange-400' : 'text-gray-500'
                              }`}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <AvatarImg
                                src={s.avatar_url}
                                name={s.username}
                                className="h-7 w-7"
                              />
                              <span className="font-bold text-white">{s.username}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{s.os || '—'}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {av?.cpu?.relogio_mhz ? (
                              <>
                                <span className="font-black text-white">
                                  {fmt(av.cpu.relogio_mhz)} MHz
                                </span>
                                {s.cpu_cores ? (
                                  <span className="text-gray-500"> · {s.cpu_cores} núc.</span>
                                ) : null}
                              </>
                            ) : s.cpu_cores ? (
                              `${s.cpu_cores} núcleos`
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {av?.ram?.aplicada_mhz ? (
                              <>
                                <span className="font-black text-white">
                                  {fmt(av.ram.aplicada_mhz)} MHz
                                </span>
                                <span className="text-gray-500">
                                  {' '}
                                  · {s.ram_gb || '—'} GB
                                </span>
                              </>
                            ) : s.ram_gb ? (
                              `${s.ram_gb} GB`
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-3 text-gray-300">
                            {s.gpu || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              {badgeDe(s)}
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-500 transition-transform ${expandido ? 'rotate-180' : ''}`}
                              />
                            </span>
                          </td>
                        </tr>

                        {/* detalhe da máquina */}
                        {expandido && (
                          <tr>
                            <td colSpan={7} className="bg-black/40 px-4 py-4">
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="space-y-1.5">
                                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    Leitura do site
                                  </p>
                                  {Object.keys(ROTULOS).map((campo) => (
                                    <LinhaReal
                                      key={campo}
                                      rotulo={ROTULOS[campo]}
                                      valor={
                                        campo === 'ram_gb' && s[campo]
                                          ? `${s[campo]} GB`
                                          : (s[campo] ?? '—')
                                      }
                                    />
                                  ))}
                                  <p className="text-[11px] text-gray-600">
                                    Última leitura:{' '}
                                    {s.updated_at
                                      ? new Date(s.updated_at).toLocaleString('pt-PT')
                                      : '—'}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  {s.details ? (
                                    <LeituraReal d={s.details} />
                                  ) : (
                                    <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-gray-500">
                                      <Terminal className="mr-1.5 inline h-3.5 w-3.5 text-emerald-400" />
                                      Sem leitura real — este PC ainda não correu o script.
                                    </div>
                                  )}
                                  {av?.cpu?.estado === 'overclock' || av?.ram?.estado === 'xmp' ? (
                                    <div className="rounded-xl bg-red-500/15 px-3 py-2.5 text-[13px] font-bold text-red-400">
                                      <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                                      Overclock detetado
                                      {av.cpu?.estado === 'overclock' ? ' na CPU' : ''}
                                      {av.cpu?.estado === 'overclock' && av.ram?.estado === 'xmp'
                                        ? ' e na RAM'
                                        : av.ram?.estado === 'xmp' ? ' na RAM (XMP)' : ''}
                                      .
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
