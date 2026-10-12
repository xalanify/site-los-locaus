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
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { authHeaders } from '../lib/auth'
import { stressCPU } from '../lib/specs'

/* ============================================================
   PCs / Specs — dashboard das máquinas dos membros
   ------------------------------------------------------------
   O browser entrega o que consegue ler (SO, núcleos, RAM, GPU
   via WebGL, ecrã e quota). A PRIMEIRA leitura fica guardada como
   baseline: serve para comparar e pintar a vermelho quando algo
   muda muito (desempenho muito acima do normal -> overclock).
   ============================================================ */
const fmt = (n) => (Number(n) || 0).toLocaleString('pt-PT')

const ROTULOS = {
  os: 'Sistema',
  browser: 'Navegador',
  cpu_cores: 'Núcleos da CPU',
  ram_gb: 'Memória (GB)',
  gpu: 'Placa gráfica',
  screen: 'Ecrã',
  storage_gb: 'Armazenamento (GB)',
  cpu_score: 'Score da CPU',
}

/* desvio face ao normal: +15% no score = overclock aos olhos do site */
const OVERCLOCK_DESvio = 15

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

/* uma linha da tabela de detalhe: valor atual vs baseline */
function LinhaSpec({ campo, atual, base }) {
  const a = atual == null ? '—' : String(atual)
  const b = base == null ? '—' : String(base)
  const num = Number(atual)
  const numB = Number(base)
  const ehNum = Number.isFinite(num) && Number.isFinite(numB) && numB > 0 && typeof atual === 'number'
  const delta = ehNum ? Math.round(((num - numB) / numB) * 100) : null
  const mudou = a !== b

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${
        mudou ? 'bg-red-500/10 ring-1 ring-red-500/30' : 'bg-white/5'
      }`}
    >
      <span className="text-gray-400">{ROTULOS[campo] || campo}</span>
      <span className="flex items-center gap-2">
        <span className={`font-bold ${mudou ? 'text-red-300' : 'text-white'}`}>{a}</span>
        {mudou && (
          <>
            <span className="text-[11px] text-gray-500">era {b}</span>
            {delta != null && (
              <Badge tom={delta > 0 ? 'perigo' : 'aviso'}>
                {delta > 0 ? '+' : ''}
                {delta}%
              </Badge>
            )}
            {delta == null && <Badge tom="aviso">Alterado</Badge>}
          </>
        )}
      </span>
    </div>
  )
}

/* uma linha do bloco "leitura real" */
function LinhaReal({ rotulo, valor, tom = 'text-white' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-[13px]">
      <span className="text-gray-400">{rotulo}</span>
      <span className={`text-right font-bold ${tom}`}>{valor}</span>
    </div>
  )
}

/* ============================================================
   Leitura REAL do PC — o que o PowerShell mandou (relógios,
   módulos de RAM, discos, motherboard) com o veredito de overclock
   ============================================================ */
function LeituraReal({ d }) {
  if (!d) return null
  const av = d.avaliacao || {}

  return (
    <div className="space-y-2">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-500">
        <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Leitura real (PowerShell)
      </p>

      {/* CPU: atual vs de fábrica */}
      {d.cpu?.nome && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-white">
            <Cpu className="h-3.5 w-3.5 text-orange-400" /> {String(d.cpu.nome).trim()}
          </p>
          {av.cpu ? (
            <p className="text-gray-400">
              Relógio atual{' '}
              <span className="font-bold text-white">{fmt(av.cpu.atual_mhz)} MHz</span> · de fábrica{' '}
              <span className="font-bold text-white">{fmt(av.cpu.fabrica_mhz)} MHz</span>{' '}
              {av.cpu.estado === 'overclock' ? (
                <Badge tom="perigo">+{av.cpu.desvio_pct}% — overclock</Badge>
              ) : (
                <Badge tom="ok">dentro do normal</Badge>
              )}
            </p>
          ) : (
            <p className="text-gray-500">Sem relógios para comparar.</p>
          )}
          <p className="mt-1 text-[11px] text-gray-500">
            {d.cpu.nucleos || '—'} núcleos · {d.cpu.logicos || '—'} lógicos
            {d.cpu.socket ? ` · ${d.cpu.socket}` : ''}
          </p>
        </div>
      )}

      {/* RAM: módulos, MHz, CAS */}
      {d.ram?.modulos?.length > 0 && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-white">
            <MemoryStick className="h-3.5 w-3.5 text-violet-400" /> Memória — {d.ram.total_gb} GB ·{' '}
            {d.ram.slots} módulos
            {av.ram?.estado === 'overclock' && <Badge tom="perigo">overclock</Badge>}
          </p>
          <ul className="space-y-1 text-gray-400">
            {d.ram.modulos.map((m, i) => {
              const oc = (m.desvio_pct ?? 0) >= 5
              return (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white">{m.tamanho_gb || '—'} GB</span>
                  <span>
                    {m.velocidade_mhz ? `${fmt(m.velocidade_mhz)} MHz` : '—'}
                    {m.aplicada_mhz && m.aplicada_mhz !== m.velocidade_mhz
                      ? ` (a correr a ${fmt(m.aplicada_mhz)} MHz)`
                      : ''}
                  </span>
                  {m.cas && <span className="text-gray-500">CAS {m.cas}</span>}
                  {m.tensao_v && <span className="text-gray-500">{m.tensao_v} V</span>}
                  {oc && <Badge tom="perigo">+{m.desvio_pct}%</Badge>}
                </li>
              )
            })}
          </ul>
          <p className="mt-1.5 text-[11px] text-gray-600">
            {d.ram.modulos[0]?.referencia ? `Ref. ${d.ram.modulos[0].referencia}` : ''}
            {d.ram.modulos[0]?.fabricante ? ` · ${d.ram.modulos[0].fabricante}` : ''}
          </p>
        </div>
      )}

      {/* GPU */}
      {d.gpu?.nome && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-white">
            <Monitor className="h-3.5 w-3.5 text-sky-400" /> {d.gpu.nome}
            {d.gpu.memoria_gb ? ` · ${d.gpu.memoria_gb} GB` : ''}
          </p>
          {d.gpu.clock_atual_mhz ? (
            <p className="text-gray-400">
              Relógio <span className="font-bold text-white">{fmt(d.gpu.clock_atual_mhz)} MHz</span>
              {d.gpu.clock_mem_mhz ? ` · memória ${fmt(d.gpu.clock_mem_mhz)} MHz` : ''}
              {d.gpu.temperatura ? ` · ${d.gpu.temperatura} °C` : ''}
              {d.gpu.potencia_atual_w && d.gpu.limite_w
                ? ` · ${d.gpu.potencia_atual_w} W de ${d.gpu.limite_w} W`
                : ''}
              <span className="ml-1 text-[11px] text-gray-500">
                (sem valor de fábrica para comparar)
              </span>
            </p>
          ) : (
            <p className="text-[12px] text-gray-500">
              Sem relógios — o Windows só os dá com NVIDIA (nvidia-smi). Dizemo-lo em vez de
              inventar.
            </p>
          )}
        </div>
      )}

      {/* Discos + placa + BIOS */}
      {d.discos?.length > 0 && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-white">
            <HardDrive className="h-3.5 w-3.5 text-emerald-400" /> Discos
          </p>
          <ul className="space-y-0.5 text-gray-400">
            {d.discos.map((x, i) => (
              <li key={i} className="truncate">
                <span className="font-bold text-white">{x.tamanho_gb || '—'} GB</span>{' '}
                {x.modelo || 'sem nome'} {x.interface ? `· ${x.interface}` : ''}
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
            [
              d.placa?.fabricante,
              d.placa?.modelo,
              d.bios?.versao ? `BIOS ${d.bios.versao}` : null,
              d.bios?.data ? `(${d.bios.data})` : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'
          }
        />
      )}

      <p className="text-[11px] leading-relaxed text-gray-600">
        Estes valores vêm do Windows (WMI/CIM), não do browser — por isso é que dá para falar de
        relógios e timings.
        {d.recolhido ? ` Recolhido em ${new Date(d.recolhido).toLocaleString('pt-PT')}.` : ''}
      </p>
    </div>
  )
}

export default function PcsPage() {
  const [lista, setLista] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [aberto, setAberto] = useState(null) // linha expandida
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState(null)

  /* leitura real do PC (PowerShell) */
  const [podeLocal, setPodeLocal] = useState(null) // null = ainda não sabemos
  const [lendo, setLendo] = useState(false)
  const [passos, setPassos] = useState([])
  const [lido, setLido] = useState(null) // { passos, spec, details }
  const [erroLeitura, setErroLeitura] = useState(null)
  const [comando, setComando] = useState('')
  const [copiado, setCopiado] = useState(false)

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
        carregar()
      }
    } catch {
      setErroLeitura('Não deu para falar com o servidor.')
    } finally {
      clearInterval(iv)
      setLendo(false)
    }
  }

  /* média do grupo (só quem já tem score) */
  const mediaGrupo = useMemo(() => {
    const s = lista.map((x) => x.cpu_score).filter((n) => n > 0)
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0
  }, [lista])

  const resumo = useMemo(() => {
    const alterados = lista.filter((s) => s.comparacao?.mudou).length
    const overclock = lista.filter(
      (s) => (s.comparacao?.scoreDelta || 0) >= OVERCLOCK_DESvio,
    ).length
    return { total: lista.length, alterados, overclock }
  }, [lista])

  /* ordena por score (é a tabela "top" do grupo) */
  const ordenada = useMemo(
    () =>
      [...lista].sort((a, b) => (b.cpu_score || 0) - (a.cpu_score || 0)),
    [lista],
  )

  /* teste de CPU local -> guarda o score e mostra a comparação */
  const correrTeste = async () => {
    if (testando) return
    setTestando(true)
    setResultado(null)
    try {
      const r = await stressCPU(2500)
      const res = await fetch('/api/users/specs/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cpu_score: r.score }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResultado({ erro: d?.error || 'Não deu para guardar o score.' })
        return
      }
      const deltaBase =
        d?.comparacao?.scoreDelta != null ? d.comparacao.scoreDelta : null

      // média do grupo JÁ com o score novo (senão a comparação fica velha)
      let media = 0
      try {
        const rl = await fetch('/api/users/specs', { headers: authHeaders() })
        const dl = await rl.json()
        const s = (dl?.specs || []).map((x) => x.cpu_score).filter((n) => n > 0)
        if (s.length) media = Math.round(s.reduce((a, b) => a + b, 0) / s.length)
      } catch {
        /* fica só a comparação com a baseline */
      }

      setResultado({
        ...r,
        deltaBase,
        vsGrupo: media ? Math.round(((r.score - media) / media) * 100) : null,
      })
      carregar()
    } catch {
      setResultado({ erro: 'Não deu para correr o teste.' })
    } finally {
      setTestando(false)
    }
  }

  return (
    <section className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
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
            As máquinas dos membros, recolhidas automaticamente pelo site a cada entrada. Cada PC
            guarda a primeira leitura como <span className="font-bold text-white">baseline</span> —
            é com ela que se vê o que mudou.
          </p>
        </motion.div>

        {/* ---------------- Resumo ---------------- */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Monitor} label="PCs registados" value={fmt(resumo.total)} delay={0} />
          <StatCard
            icon={Activity}
            label="Score médio do grupo"
            value={mediaGrupo ? fmt(mediaGrupo) : '—'}
            tom="text-orange-400"
            delay={0.05}
          />
          <StatCard
            icon={AlertTriangle}
            label="Com alterações"
            value={fmt(resumo.alterados)}
            tom="text-yellow-400"
            delay={0.1}
          />
          <StatCard
            icon={Gauge}
            label="Overclock"
            value={fmt(resumo.overclock)}
            tom="text-red-400"
            delay={0.15}
          />
        </div>

        {/* ---------------- O que o browser lê (honesto) ---------------- */}
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-gray-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <p>
            O browser só consegue ler uma parte da máquina (sistema, núcleos, memória anunciada,
            placa gráfica via WebGL, ecrã e armazenamento). Não há como ler clocks nem timings da
            RAM — por isso o <span className="font-bold text-red-400">OVERCLOCK</span> é detetado
            pelo desempenho: um resultado muito acima da baseline ou da média do grupo aparece a
            vermelho. Em baixo há o botão que lê os valores <span className="font-bold text-white">à
            verdade</span> com um script do Windows.
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
                Leitura real do PC
              </h2>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-gray-500">
                O site, sozinho, não chega aos relógios nem aos timings — o browser não os expõe. Este
                botão corre um script do Windows <span className="text-gray-300">no PC onde está o
                servidor</span>: mostra aqui cada passo que dá, lê CPU (relógio atual vs de fábrica),
                RAM (módulos em MHz, CAS, tensão), GPU e discos, e guarda tudo no teu PC.
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

          {/* terminal com os passos do PowerShell */}
          {(lendo || passos.length > 0) && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                <span className={`h-2 w-2 rounded-full ${lendo ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`} />
                PowerShell — o que está a fazer
              </div>
              <ul className="space-y-0.5">
                {passos.map((p, i) => (
                  <li key={i} className="text-gray-300">
                    <span className="text-emerald-500">›</span> {p}
                  </li>
                ))}
                {lendo && <li className="text-gray-500">› …</li>}
              </ul>
            </div>
          )}

          {erroLeitura && (
            <p className="mt-3 text-sm font-bold text-red-400">{erroLeitura}</p>
          )}

          {!podeLocal && !lendo && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="mb-2 text-[13px] leading-relaxed text-gray-400">
                Este servidor não está num Windows local (a Vercel não tem PowerShell). Nesse caso,
                corre o comando abaixo <span className="font-bold text-white">no PowerShell do teu
                PC</span> — ele mostra tudo o que vai buscar e envia o resultado para o site.
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
            <div className="mt-4">
              <LeituraReal d={lido.details} />
            </div>
          )}
        </motion.div>

        {/* ---------------- Teste de CPU ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass mb-6 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase text-white">
                <Cpu className="h-5 w-5 text-orange-400" />
                Stress test da CPU
              </h2>
              <p className="mt-1 text-[13px] text-gray-500">
                2,5 s de carga no teu processador — dá um score em operações/segundo.
              </p>
            </div>
            <button
              onClick={correrTeste}
              disabled={testando}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-orange-400 disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${testando ? 'animate-spin' : ''}`} />
              {testando ? 'A medir…' : 'Testar agora'}
            </button>
          </div>

          <AnimatePresence>
            {resultado && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {resultado.erro ? (
                  <p className="mt-3 text-sm font-bold text-red-400">{resultado.erro}</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-black/40 p-3 text-center">
                      <div className="font-display text-xl font-black text-white">
                        {fmt(resultado.score)}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        ops/segundo
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/40 p-3 text-center">
                      <div
                        className={`font-display text-xl font-black ${
                          (resultado.deltaBase || 0) >= OVERCLOCK_DESvio
                            ? 'text-red-400'
                            : 'text-white'
                        }`}
                      >
                        {resultado.deltaBase == null
                          ? '—'
                          : `${resultado.deltaBase > 0 ? '+' : ''}${resultado.deltaBase}%`}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        face à tua baseline
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/40 p-3 text-center">
                      <div className="font-display text-xl font-black text-white">
                        {resultado.vsGrupo == null
                          ? '—'
                          : `${resultado.vsGrupo > 0 ? '+' : ''}${resultado.vsGrupo}%`}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        face à média do grupo
                      </div>
                    </div>
                    {resultado.deltaBase != null &&
                    resultado.deltaBase >= OVERCLOCK_DESvio ? (
                      <p className="text-center text-xs font-black uppercase tracking-wide text-red-400 sm:col-span-3">
                        ⚠ Valores muito acima da tua baseline — possível overclock
                      </p>
                    ) : null}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ---------------- Tabela ---------------- */}
        <div className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-gray-300">
              Máquinas do grupo
            </h2>
            <span className="text-[11px] font-bold text-gray-500">
              {lista.length} registos · clique numa linha para ver tudo
            </span>
          </div>

          {!carregado ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
              <RefreshCcw className="h-4 w-4 animate-spin text-orange-400" /> A carregar specs…
            </div>
          ) : lista.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Ainda sem specs — cada membro envia as do seu PC automaticamente ao entrar no site.
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
                    <th className="px-4 py-2.5 text-right font-bold">Score</th>
                    <th className="px-4 py-2.5 text-right font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenada.map((s, i) => {
                    const delta = s.comparacao?.scoreDelta || 0
                    const oc = delta >= OVERCLOCK_DESvio
                    const alterado = s.comparacao?.campos?.length > 0
                    const expandido = aberto === s.user_id
                    const vsGrupo =
                      s.cpu_score && mediaGrupo
                        ? Math.round(((s.cpu_score - mediaGrupo) / mediaGrupo) * 100)
                        : null
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
                            {s.cpu_cores ? `${s.cpu_cores} núcleos` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {s.ram_gb ? `${s.ram_gb} GB` : '—'}
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-3 text-gray-300">
                            {s.gpu || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-display font-black text-white">
                            {s.cpu_score ? fmt(s.cpu_score) : '—'}
                            {vsGrupo != null && (
                              <span className="ml-1.5 text-[10px] font-bold text-gray-500">
                                {vsGrupo > 0 ? '+' : ''}
                                {vsGrupo}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              {oc ? (
                                <Badge tom="perigo">Overclock</Badge>
                              ) : alterado ? (
                                <Badge tom="aviso">Alterado</Badge>
                              ) : (
                                <Badge tom="ok">Normal</Badge>
                              )}
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-500 transition-transform ${expandido ? 'rotate-180' : ''}`}
                              />
                            </span>
                          </td>
                        </tr>

                        {/* detalhe da máquina */}
                        {expandido && (
                          <tr>
                            <td colSpan={8} className="bg-black/40 px-4 py-4">
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="space-y-1.5">
                                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    Valores atuais vs original (baseline)
                                  </p>
                                  {Object.keys(ROTULOS).map((campo) => (
                                    <LinhaSpec
                                      key={campo}
                                      campo={campo}
                                      atual={s[campo]}
                                      base={s.baseline?.[campo]}
                                    />
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">
                                    Leitura do site
                                  </p>
                                  {oc && (
                                    <div className="rounded-xl bg-red-500/15 px-3 py-2.5 text-[13px] font-bold text-red-400">
                                      ⚠ OVERCLOCK — o score está {delta}% acima da baseline deste PC.
                                    </div>
                                  )}
                                  {alterado && (
                                    <div className="rounded-xl bg-yellow-500/10 px-3 py-2.5 text-[13px] text-yellow-300">
                                      {s.comparacao.campos
                                        .map((c) => `${ROTULOS[c.campo] || c.campo}: “${c.antes ?? '—'}” → “${c.agora ?? '—'}”`)
                                        .join(' · ')}
                                    </div>
                                  )}
                                  {!oc && !alterado && (
                                    <div className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-[13px] text-emerald-300">
                                      Sem alterações face à primeira leitura.
                                    </div>
                                  )}
                                  <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-gray-400">
                                    <MemoryStick className="mr-1.5 inline h-3.5 w-3.5 text-violet-400" />
                                    Memória: {s.ram_gb ? `${s.ram_gb} GB (anunciados pelo sistema)` : '—'}
                                  </div>
                                  <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-gray-400">
                                    <HardDrive className="mr-1.5 inline h-3.5 w-3.5 text-violet-400" />
                                    Armazenamento: {s.storage_gb ? `${s.storage_gb} GB (quota do browser)` : '—'}
                                  </div>
                                  <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-gray-400">
                                    <Monitor className="mr-1.5 inline h-3.5 w-3.5 text-violet-400" />
                                    Ecrã: {s.screen || '—'} · {s.browser || '—'}
                                  </div>
                                  <p className="text-[11px] text-gray-600">
                                    Última leitura:{' '}
                                    {s.updated_at
                                      ? new Date(s.updated_at).toLocaleString('pt-PT')
                                      : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* valores reais (PowerShell) quando existem */}
                              {s.details ? (
                                <div className="mt-4 border-t border-white/10 pt-4">
                                  <LeituraReal d={s.details} />
                                </div>
                              ) : (
                                <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-gray-500">
                                  <Terminal className="mr-1.5 inline h-3.5 w-3.5 text-emerald-400" />
                                  Sem leitura real ainda — este PC ainda não correu o script do
                                  PowerShell (botão lá em cima, no PC do membro).
                                </div>
                              )}
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
