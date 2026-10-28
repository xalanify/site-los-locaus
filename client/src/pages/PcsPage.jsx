import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  AlertTriangle,
  RefreshCcw,
  ChevronDown,
  Activity,
  Terminal,
  Lock,
  Download,
  Loader2,
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { authHeaders } from '../lib/auth'
import { correrBench as medirBench } from '../lib/bench'

/* ============================================================
   PCs / Specs — as máquinas do grupo
   ------------------------------------------------------------
   Aqui só entram valores REIS: o site corre um script do Windows
   (PowerShell + CPU-Z) no PC onde está o servidor e lê relógios,
   tensões e a RAM a correr. O browser não chega a isso — por isso
   a aba tem um portão: sem clicar em "Ler o PC", não se entra.
   ============================================================ */
const fmt = (n) => (Number(n) || 0).toLocaleString('pt-PT')
const ghz = (n) => {
  const v = Number(n)
  return v > 0 ? `${(v / 1000).toFixed(2).replace('.', ',')} GHz` : '—'
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
  overclock: { tom: 'perigo', txt: 'acima do de fábrica' },
  boost: { tom: 'aviso', txt: 'no teto de fábrica' },
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
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">
        <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Valores reais
      </p>

      {/* ---------- CPU ---------- */}
      {d.cpu?.nome && (
        <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[13px]">
          <p className="mb-1 flex flex-wrap items-center gap-2 font-bold text-white">
            <Cpu className="h-3.5 w-3.5 text-zinc-400" /> {String(d.cpu.nome).trim()}
            <Badge tom={ver.tom}>{ver.txt}</Badge>
          </p>
          {cpu.relogio_mhz ? (
            <p className="text-gray-400">
              Relógio{' '}
              <span className="font-bold text-white">{ghz(cpu.relogio_mhz)}</span>
              {cpu.teto_fabrica_mhz ? (
                <>
                  {' '}
                  · fábrica até <span className="font-bold text-white">{ghz(cpu.teto_fabrica_mhz)}</span>
                </>
              ) : null}
              {cpu.desvio_pct != null ? ` (${cpu.desvio_pct > 0 ? '+' : ''}${cpu.desvio_pct}%)` : ''}
            </p>
          ) : (
            <p className="text-gray-400">Sem relógios para comparar.</p>
          )}
          {cpu.relogio_repouso_mhz || cpu.relogio_carga_mhz ? (
            <p className="mt-1 text-gray-400">
              {cpu.relogio_repouso_mhz ? (
                <>
                  em repouso{' '}
                  <span className="font-bold text-gray-300">{ghz(cpu.relogio_repouso_mhz)}</span>
                </>
              ) : null}
              {cpu.relogio_repouso_mhz && cpu.relogio_carga_mhz ? ' · ' : ''}
              {cpu.relogio_carga_mhz ? (
                <>
                  todos os núcleos{' '}
                  <span className="font-bold text-gray-300">{ghz(cpu.relogio_carga_mhz)}</span>
                </>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-gray-400">
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
            {ram.estado === 'overclock' ? (
              <>
                Memória com overlock
              </>
            ) : (
              <>
                <MemoryStick className="h-3.5 w-3.5 text-zinc-400" />
                Memória — {d.ram?.total_gb || '—'} GB {ram.tipo ? `· ${ram.tipo}` : ''}
              </>
            )}
            {ram.tem_xmp ? <Badge tom="aviso">XMP/EXPO ligado</Badge> : null}
            {ram.estado === 'overclock' && (
              <span className="text-zinc-400 text-[10px] ml-2">OC</span>
            )}
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
          {ram.timings?.atual ? (
            <p className="text-gray-400">
              Timings <span className="font-bold text-white">{ram.timings.atual}</span>
              {ram.timings.xmp ? (
                <>
                  {' '}
                  · de fábrica{' '}
                  <span className="font-bold text-white">{ram.timings.xmp}</span>
                </>
              ) : null}
              {ram.timings.alterado ? (
                <span className="font-bold text-red-400"> · alterados</span>
              ) : (
                <span> · como de origem</span>
              )}
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
                  {m.cas ? <span className="text-gray-400">CAS {m.cas}</span> : null}
                  {m.tensao_v ? <span className="text-gray-400">{m.tensao_v} V</span> : null}
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
            <p className="text-[12px] text-gray-400">
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
    <div className="scroll-forte max-h-52 overflow-y-auto rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
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
        {aCorrer && <li className="text-gray-400">› …</li>}
      </ul>
    </div>
  )
}

export default function PcsPage({ isAdmin = false }) {
  const [lista, setLista] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [aberto, setAberto] = useState(null) // linha expandida

  /* ligação do agente — o PC liga-se ao site via LOCAUS-PC.bat */
  const [agenteOnline, setAgenteOnline] = useState(false)
  const [agenteVerificado, setAgenteVerificado] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [passos, setPassos] = useState([])
  const [lido, setLido] = useState(null) // { passos, spec, details }
  const [erroLeitura, setErroLeitura] = useState(null)

  /* Novo: flag se o utilizador já tem specs guardadas (evita correr o script ao entrar) */
  const [temSpecsProprias, setTamSpecsProprias] = useState(false)

  /* bench da CPU (medido no browser) */
  const [bench, setBench] = useState({ aCorrer: false, resultado: null, erro: null, guardou: false })
  // saúde do PC (discos, SMART, temps, boots) + exportar relatório
  const [saude, setSaude] = useState({ aCarregar: false, dados: null, erro: null })

  /* carrega a saúde do PC (discos, temperaturas, arranques) */
  const carregarSaude = async () => {
    if (saude.aCarregar) return
    setSaude({ aCarregar: true, dados: null, erro: null })
    try {
      const r = await fetch('/api/users/specs/health', { headers: authHeaders() })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.dados) setSaude({ aCarregar: false, dados: d.dados, erro: null })
      else setSaude({ aCarregar: false, dados: null, erro: d.error || 'Não deu para ler a saúde.' })
    } catch {
      setSaude({ aCarregar: false, dados: null, erro: 'Sem ligação ao servidor.' })
    }
  }

  /* carregar specs do servidor quando a página abre */
  const carregar = () => {
    fetch('/api/users/specs', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.specs)) {
          setLista(d.specs)

          // Verificar se o utilizador atual já tem specs com avaliação guardadas
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          const meuId = user.uid || null
          const tem = d.specs.some(
            (s) => s.user_id === meuId && s.details && s.details.avaliacao
          )
          setTamSpecsProprias(tem)
        }
      })
      .catch(() => {})
      .finally(() => setCarregado(true))
  }

  useEffect(carregar, [])

  /* o site pergunta ao agente se o PC está ligado */
  useEffect(() => {
    let vivo = true
    const ver = () => {
      fetch('/api/agente/estado', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!vivo || !d) return
          setAgenteOnline(Boolean(d.online))
          setAgenteVerificado(true)
        })
        .catch(() => {})
    }
    ver()
    const iv = setInterval(ver, 2000)
    return () => {
      vivo = false
      clearInterval(iv)
    }
  }, [])

  const podeExecutar = agenteOnline

  /* descarrega o LOCAUS-PC.bat (gerado pelo site com o token do user)
     — o user dá duplo clique e o PC liga-se ao site */
  const [aLigarApp, setALigarApp] = useState(false)
  const ligarApp = async () => {
    if (aLigarApp) return
    setALigarApp(true)
    try {
      const s = await fetch('/api/agente/sessao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ nome: 'PC Windows' }),
      })
      const sd = await s.json().catch(() => ({}))
      if (!s.ok || !sd.token) throw new Error(sd.error || 'Não deu para criar a ligação.')
      const r = await fetch(`/api/agente/baixar?token=${encodeURIComponent(sd.token)}`)
      if (!r.ok) throw new Error('Não deu para gerar o ficheiro.')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'LOCAUS-PC.bat'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      /* sem rede */
    } finally {
      setALigarApp(false)
    }
  }

  /* corre o script no PC do servidor e mostra o que ele vai fazendo */
  const lerPC = async () => {
    if (lendo) return
    setLendo(true)
    setLido(null)
    setErroLeitura(null)
    setPassos([])

    try {
      /* cria o trabalho (na nuvem: via agente; local: direto) */
      const r = await fetch('/api/users/specs/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({}),
      })
      const d = await r.json().catch(() => ({}))
      /* modo local: a resposta já vem completa */
      if (r.ok && !d.async) {
        if (Array.isArray(d.passos) && d.passos.length) setPassos(d.passos)
        setLido(d)
        carregar()
        if (!d.details?.bench) setTimeout(() => correrBench(), 500)
        return
      }
      if (!r.ok || !d.jobId) {
        setErroLeitura(d.error || d.erro || 'Não deu para ler o PC.')
        return
      }
      const jobId = d.jobId

      /* segue o trabalho até terminar (o agente executa no PC) */
      const limite = Date.now() + 180000
      while (Date.now() < limite) {
        await new Promise((ok) => setTimeout(ok, 2000))
        const fr = await fetch('/api/users/specs/deep/fim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ jobId }),
        })
        const fd = await fr.json().catch(() => ({}))
        if (fd.pendente) {
          if (Array.isArray(fd.passos) && fd.passos.length) setPassos(fd.passos)
          continue
        }
        if (!fr.ok) {
          setErroLeitura(fd.error || 'A leitura do PC falhou.')
          return
        }
        if (Array.isArray(fd.passos) && fd.passos.length) setPassos(fd.passos)
        setLido(fd)
        carregar()
        if (!fd.details?.bench) setTimeout(() => correrBench(), 500)
        return
      }
      setErroLeitura('O PC demorou demasiado a responder.')
      return
    } catch {
      setErroLeitura('Não deu para falar com o servidor.')
    } finally {
      setLendo(false)
    }
  }

  /* mede a CPU no browser (1 núcleo e todos) e guarda o resultado */
  const correrBench = async () => {
    if (bench.aCorrer) return
    setBench({ aCorrer: true, resultado: null, erro: null, guardou: false })
    try {
      const r = await medirBench()
      if (!r || !r.st || !r.mt) throw new Error('sem medição')
      setBench({ aCorrer: false, resultado: r, erro: null, guardou: false })
      const resp = await fetch('/api/users/specs/bench', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
      if (resp.ok) {
        setBench((b) => ({ ...b, guardou: true }))
        carregar()
      } else {
        setBench((b) => ({ ...b, erro: 'Medi, mas não deu para guardar.' }))
      }
    } catch {
      setBench({
        aCorrer: false,
        resultado: null,
        erro: 'Não deu para medir a CPU neste browser.',
        guardou: false,
      })
    }
  }

  const badgeDe = (s) => {
    const av = s.details?.avaliacao
    if (!av) return <Badge tom="ok">—</Badge>
    /* distinções automáticas a partir da leitura do PC:
       - Overclock (CPU): cpu acima do teto de fábrica
       - Overclock (memórias): timings ou MHz alterados da RAM
       - XMP: perfil XMP/EXPO ligado
       - Melhor PC: este utilizador tem o maior cpu_score da lista */
    const lista = []
    /* 1) Overclock (CPU) */
    if (av.cpu?.estado === 'overclock')
      lista.push(
        <Badge key="cpu" tom="perigo">
          Overclock (CPU)
        </Badge>,
      )
    /* 2) Overclock (memórias) */
    if (av.ram?.estado === 'overclock') {
      lista.push(
        <Badge key="ram-oc" tom="perigo">
          Overclock (memória)
        </Badge>,
      )
    }
    /* 3) XMP/EXPO ligado */
    if (av.ram?.tem_xmp || av.ram?.estado === 'xmp')
      lista.push(
        <Badge key="xmp" tom="aviso">
          XMP
        </Badge>,
      )
    /* 4) Indicador "Melhor PC" - só na tabela resumo, não por linha individual
       (o título geral do grupo mostra quem tem o melhor score) */
    /* Nada aqui para "melhor pc" por linha - isso fica no resumo inferior */

    if (lista.length) return <span className="flex flex-col items-end gap-1">{lista}</span>
    if (av.cpu?.estado === 'boost') return <Badge tom="aviso">Boost</Badge>
    return <Badge tom="ok">Normal</Badge>
  }

  /* ---- GATE: o LOCAUS-PC.bat é obrigatório ---- */
  /* A página só abre quando o PC deste utilizador está ligado ao site
     (via LOCAUS-PC.bat). A verificação corre a cada 2s — quando o .bat
     liga o PC, a página desbloqueia sozinha. */
  if (agenteVerificado && !agenteOnline) {
    return (
      <section className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center ring-1 ring-white/10"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <Lock className="h-7 w-7 text-emerald-400" />
            </span>
            <h1 className="mt-4 font-display text-xl font-black uppercase text-white">
              PCs / Specs
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
              Para leres as specs, o teu Windows tem de estar ligado ao site.
              Descarrega o <b className="text-white">LOCAUS-PC.bat</b>, abre-o e deixa a
              janela aberta — o site deteta a ligação e desbloqueia esta página.
            </p>
            <button
              type="button"
              onClick={ligarApp}
              disabled={aLigarApp}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              {aLigarApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {aLigarApp ? 'A preparar…' : 'Descarregar LOCAUS-PC.bat'}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
              A ligação é só tua: liga o teu Windows à tua conta do site. Sem abrires o
              ficheiro, ninguém (nem tu) consegue ler as specs.
            </p>
          </motion.div>
        </div>
      </section>
    )
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                className="font-black gradient-text"
                style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
              >
                PCs / Specs
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                As máquinas do grupo com valores lidos no Windows. Clique numa linha para ver tudo.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ---------------- Tabela ---------------- */}
        <div className="glass mb-6 overflow-hidden rounded-2xl">
          <div className="flex flex-col items-start gap-1 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="ui-section-title font-display">
              Máquinas do grupo
            </h2>
            <span className="text-[11px] font-bold text-gray-400">
              {lista.length} registos · clique numa linha
            </span>
          </div>
          <p className="px-4 pt-2 text-[10px] text-gray-500 sm:hidden">
            Desliza a tabela para o lado para ver RAM e placa gráfica →
          </p>
          <div className="mx-4 mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
            Esta tabela não tem ordem nem pontuação de melhor ou pior. Mostra apenas as máquinas
            do grupo.
          </div>

          {!carregado ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-400">
              <RefreshCcw className="h-4 w-4 animate-spin text-zinc-400" /> A carregar specs…
            </div>
          ) : lista.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Ainda sem specs — cada membro envia as do seu PC ao entrar no site.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm sm:min-w-[720px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-2.5 font-bold">Membro</th>
                    <th className="px-4 py-2.5 font-bold">Sistema</th>
                    <th className="px-4 py-2.5 font-bold">CPU</th>
                    <th className="px-4 py-2.5 font-bold">RAM</th>
                    <th className="px-4 py-2.5 font-bold">Placa gráfica</th>
                    <th className="px-4 py-2.5 text-right font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((s) => {
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
                              <span className="font-black text-white">
                                {ghz(av.cpu.relogio_mhz)}
                              </span>
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
                                <span className="text-gray-400">
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
                                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
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
                                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                                    Sistema
                                  </p>
                                  <LinhaReal rotulo="Windows" valor={s.os ?? '—'} />
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
                                    <div className="rounded-xl bg-white/5 px-3 py-2.5 text-[12px] text-gray-400">
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
                                        : av.ram?.estado === 'xmp' ? ' na RAM (XMP)' : ''}.
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

        {/* ---------------- Leitura real do PC (PowerShell) ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass mb-6 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase text-white">
              <Terminal className="h-5 w-5 text-emerald-400" />
              Ler o meu PC
            </h2>

            {podeExecutar && (
              <button
                onClick={lerPC}
                disabled={lendo}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${lendo ? 'animate-spin' : ''}`} />
                {lendo ? 'A ler o PC…' : 'Ler o meu PC agora'}
              </button>
            )}
          </div>

          {/* resultado do bench da CPU (ST/MT, tipo CPU-Z) */}
          {(bench.aCorrer || bench.resultado || bench.erro) && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              {bench.aCorrer ? (
                <p className="flex items-center gap-2 text-[13px] font-bold text-gray-300">
                  <Activity className="h-4 w-4 animate-pulse text-zinc-400" />
                  A medir a CPU (single-thread e multi-thread)… não corras outras coisas.
                </p>
              ) : bench.resultado ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <span className="text-[13px] font-black text-white">
                    Bench da CPU
                    {bench.guardou ? (
                      <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        guardado
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[13px] text-gray-300">
                    <span className="font-black text-white">Single:</span>{' '}
                    <span className="font-bold text-zinc-300">{bench.resultado.st ?? '—'}</span>{' '}
                    <span className="text-gray-400">pts</span>
                  </span>
                  <span className="text-[13px] text-gray-300">
                    <span className="font-black text-white">Multi:</span>{' '}
                    <span className="font-bold text-zinc-300">{bench.resultado.mt ?? '—'}</span>{' '}
                    <span className="text-gray-400">pts</span>
                  </span>
                  <span className="text-[12px] text-gray-400">
                    {bench.resultado.nucleos} threads
                  </span>
                </div>
              ) : (
                <p className="text-[13px] font-bold text-red-400">{bench.erro}</p>
              )}
            </div>
          )}

          <div className="mt-4">
            <TerminalPassos passos={passos} aCorrer={lendo} />
          </div>

          {erroLeitura && <p className="mt-3 text-sm font-bold text-red-400">{erroLeitura}</p>}

          {lido?.details && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <LeituraReal d={lido.details} />
            </div>
          )}
        </motion.div>

        {/* ---------------- Saúde do PC + relatório ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass mb-6 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase text-white">
              <Activity className="h-5 w-5 text-zinc-400" />
              Saúde do PC
            </h2>
            <button
              onClick={carregarSaude}
              disabled={saude.aCarregar}
              className="ui-btn ui-btn-primary"
            >
              <Activity className={`h-4 w-4 ${saude.aCarregar ? 'animate-pulse' : ''}`} />
              {saude.aCarregar ? 'A ler…' : saude.dados ? 'Atualizar saúde' : 'Ver saúde do PC'}
            </button>
          </div>

          {saude.erro && <p className="mt-3 text-[13px] font-bold text-red-400">{saude.erro}</p>}

          {saude.dados && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* discos */}
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Armazenamento
                </p>
                <div className="space-y-2">
                  {(saude.dados.discos || []).map((c) => {
                    const cheio = c.pct != null && c.pct <= 15
                    return (
                      <div key={c.letra} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-black text-white">
                            {c.letra} {c.nome ? `· ${c.nome}` : ''}
                          </span>
                          <span className={cheio ? 'font-bold text-red-400' : 'font-bold text-emerald-300'}>
                            {c.livreGB} GB livres
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${cheio ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(4, 100 - (c.pct ?? 100))}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {c.totalGB} GB no total · {c.pct}% livres
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* estado + temperaturas + uptime */}
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Estado
                </p>
                <div className="space-y-2">
                  {(saude.dados.fisicos || []).map((f, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-black text-white">{f.modelo || 'Disco'}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            f.status === 'OK' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {f.status || '—'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-400">{f.totalGB} GB · {f.interface}</p>
                    </div>
                  ))}
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px]">
                    <p className="text-gray-400">
                      Tempo ligado:{' '}
                      <span className="font-bold text-white">
                        {saude.dados.uptimeMin != null
                          ? saude.dados.uptimeMin >= 60
                            ? `${Math.floor(saude.dados.uptimeMin / 60)} h ${saude.dados.uptimeMin % 60} min`
                            : `${saude.dados.uptimeMin} min`
                          : '—'}
                      </span>
                    </p>
                    {(saude.dados.temps || []).length > 0 && (
                      <p className="mt-1 text-gray-400">
                        Temperaturas:{' '}
                        <span className="font-bold text-white">
                          {saude.dados.temps.map((t) => `${t.c}°C`).join(' · ')}
                        </span>
                      </p>
                    )}
                    {(saude.dados.temps || []).length === 0 && (
                      <p className="mt-1 text-[11px] text-gray-600">
                        Temperatura: o Windows não expõe neste PC.
                      </p>
                    )}
                  </div>
                  {(saude.dados.bootDurations || []).length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px]">
                      <p className="mb-1 text-gray-400">Arranques recentes</p>
                      {saude.dados.bootDurations.slice(0, 5).map((b, i) => (
                        <p key={i} className="text-[12px] text-gray-400">
                          {new Date(b.inicio).toLocaleString('pt-PT')} ·{' '}
                          {b.demoraMs != null ? (
                            <span className={b.lento ? 'font-bold text-red-400' : 'font-bold text-emerald-300'}>
                              {(b.demoraMs / 1000).toFixed(1)} s{b.lento ? ' (lento)' : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </section>
  )
}
