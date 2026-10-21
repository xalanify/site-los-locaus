import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Activity,
  AlertTriangle,
  Aperture,
  Archive,
  BookOpen,
  Bookmark,
  Box,
  Boxes,
  Braces,
  Camera,
  Code,
  Coffee,
  Cpu,
  Disc,
  Download,
  Eraser,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Gamepad2,
  Gauge,
  GitBranch,
  Github,
  Globe,
  HardDrive,
  Hexagon,
  Image,
  Joystick,
  Key,
  KeyRound,
  Layout,
  LayoutGrid,
  Library,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic,
  Monitor,
  Music,
  Network,
  Paintbrush,
  Palette,
  PenTool,
  PieChart,
  Puzzle,
  Rocket,
  Send,
  Share2,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Swords,
  Thermometer,
  Trash2,
  Trophy,
  Tv,
  Usb,
  Users,
  Video,
  Volume2,
  Wifi,
  X,
  Zap,
  Square,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* Mapa de ícones Lucide por nome (todos os do catálogo de programas) */
const ICON_MAP = {
  Activity, Aperture, Archive, BookOpen, Bookmark, Box, Boxes, Braces,
  Camera, Code, Coffee, Cpu, Disc, Download, Eraser, FileCode,
  FileSpreadsheet, FileText, Film, Gamepad2, Gauge, GitBranch, Github,
  Globe, HardDrive, Hexagon, Image, Joystick, Key, KeyRound, Layout,
  LayoutGrid, Library, Lock, Mail, MessageCircle, MessageSquare, Mic,
  Monitor, Music, Network, Package, Paintbrush, Palette, PenTool,
  PieChart, Play, Puzzle, Rocket, Search, Send, Share2, Shield,
  ShieldAlert, ShoppingCart, SlidersHorizontal, Sparkles, StickyNote,
  Swords, Terminal, Thermometer, Trash2, Trophy, Tv, Usb, Users,
  Video, Volume2, Wifi, Wrench, Zap, Loader2, Check, RefreshCcw,
};

/* ============================================================
   Ferramentas Windows
   ------------------------------------------------------------
   Uma lista de scripts PowerShell prontos a correr no PC onde está
   o servidor: rede, debloat, otimização, sistema e instalação de
   programas via winget (nada de installers). Clicou -> corre e os
   logs aparecem a andar aqui em baixo.
   ============================================================ */

const CATS = ['Otimizador by Xalana', 'Programas', 'Limpeza']

/* icone pequeno ao lado do nome de cada categoria */
const CAT_ICONES = {
  'Otimizador by Xalana': Gauge,
  Programas: Package,
  Limpeza: Eraser,
}

/* ações individuais do Otimizador by Xalana (mesmo mapa do servidor) */
const XALANA_ACOES = {
  'xalana-a1': { nome: 'Plano de energia: alto desempenho', desc: 'A CPU deixa de dormir; resposta mais rápida ao toque.', nivel: 'minima' },
  'xalana-a2': { nome: 'Efeitos visuais: modo leve', desc: 'Menus e janelas mais rápidos.', nivel: 'minima' },
  'xalana-a3': { nome: 'Rato 1:1 — sem aceleração', desc: 'O rato anda exatamente a distância que move.', nivel: 'minima' },
  'xalana-a4': { nome: 'Temporários do utilizador limpos', desc: 'Limpa %TEMP% (fica só o que está em uso).', nivel: 'minima' },
  'xalana-a16': { nome: 'Animações de janelas desligadas', desc: 'Fim das animações de minimizar/maximizar — menos delay.', nivel: 'minima' },
  'xalana-a17': { nome: 'USB e input nunca dormem', desc: 'Rato/teclado respondem sempre; sem suspensão seletiva.', nivel: 'minima' },
  'xalana-a5': { nome: 'Telemetria DiagTrack parada', desc: 'Menos disco e CPU em fundo.', nivel: 'normal' },
  'xalana-a6': { nome: 'Aplicações em segundo plano suspensas', desc: 'Apps deixam de correr às costas.', nivel: 'normal' },
  'xalana-a7': { nome: 'Xbox Game Bar e GameDVR desligados', desc: 'Sem overlay nem gravação de fundo.', nivel: 'normal' },
  'xalana-a8': { nome: 'Sugestões do Início desligadas', desc: 'Menu Início sem apps promovidas.', nivel: 'normal' },
  'xalana-a9': { nome: 'Transparência e demoras de menu desligadas', desc: 'Sem transparência; menus abrem de estalar.', nivel: 'normal' },
  'xalana-a10': { nome: 'Tarefas de diagnóstico desativadas', desc: '5 tarefas de telemetria paradas.', nivel: 'normal' },
  'xalana-a18': { nome: 'Latência: Nagle desligado', desc: 'Menos atraso de pacotes em todas as interfaces de rede.', nivel: 'normal' },
  'xalana-a19': { nome: 'DNS rápido (1.1.1.1 + 8.8.8.8)', desc: 'Resolução de sites mais rápida, cache limpa.', nivel: 'normal' },
  'xalana-a15': { nome: 'Feedback e relatórios desligados', desc: 'Painéis do Feedback, WER e avisos dos Mapas fora.', nivel: 'normal' },
  'xalana-a11': { nome: 'Debloat: apps pré-instaladas removidas', desc: 'Xbox, Widgets, Cortana, Solitaire, Maps, etc.', nivel: 'extremo' },
  'xalana-a12': { nome: 'Serviços pesados parados e desligados', desc: 'SysMain, Pesquisa, Xbox, DoSvc, TrkWks, Fax, Mapas...', nivel: 'extremo' },
  'xalana-a13': { nome: 'Perfil multimédia/jogo sem limitações', desc: 'Rede sem limitação; jogos em prioridade alta.', nivel: 'extremo' },
  'xalana-a20': { nome: 'Tuning TCP no máximo', desc: 'RSS ligado, timestamps e RSC fora, ACKs rápidos.', nivel: 'extremo' },
  'xalana-a21': { nome: 'GPU prioritária nos jogos', desc: 'Windows dá a GPU dedicada sempre aos jogos.', nivel: 'extremo' },
  'xalana-a14': { nome: 'Prioridade de processos: desempenho', desc: 'CPU dá prioridade a correr programas.', nivel: 'extremo' },
  'xalana-a22': { nome: 'Hibernação e arranque rápido desligados', desc: 'Liberta hiberfil.sys; o PC desliga mesmo.', nivel: 'extremo' },
}

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
  const [cat, setCat] = useState('Otimizador by Xalana')
  const [subCat, setSubCat] = useState('Todas')
  const [busca, setBusca] = useState('')
  const [idLivre, setIdLivre] = useState('')
  // discos fixos do PC (seletor da ferramenta de vírus)
  const [discos, setDiscos] = useState([])
  const [discoSel, setDiscoSel] = useState('')
  const [aviso, setAviso] = useState(null)
  const [recarregado, setRecarregado] = useState(false)
  const fimRef = useRef(null)
  const [selecionados, setSelecionados] = useState(new Set())
  const [instalados, setInstalados] = useState(new Set())
  const [aDetectar, setADetectar] = useState(false)
  const [logosFalha, setLogosFalha] = useState(new Set())
  // fila de execução (as selecionadas correm uma de cada vez)
  const [fila, setFila] = useState([])
  const filaRef = useRef([])
  // aviso flutuante (toast) quando uma ferramenta termina
  const [toast, setToast] = useState(null)
  const [nomeCorrer, setNomeCorrer] = useState(null)
  const [parando, setParando] = useState(false)
  const aCorrerRef = useRef(null)
  /* agente local (site na nuvem -> PC Windows) */
  const [agente, setAgente] = useState({ online: false, sessao: null, job: null })
  const [aLigarPc, setALigarPc] = useState(false)
  const [jobId, setJobId] = useState(null)
  const jobPollRef = useRef(null)
  const discosPedidosRef = useRef(false)

  /* Ações selecionadas por nível do Otimizador by Xalana.
     Cada nível PARTE do anterior: normal = mínimo + extras,
     extremo = tudo. O que se corrige depois é só exceção. */
  const XALANA_MINIMA = ['xalana-a1', 'xalana-a2', 'xalana-a3', 'xalana-a16', 'xalana-a17', 'xalana-a4']
  const PRESET_XALANA = {
    minima: XALANA_MINIMA,
    normal: [
      ...XALANA_MINIMA,
      'xalana-a5', 'xalana-a6', 'xalana-a7', 'xalana-a8', 'xalana-a9',
      'xalana-a18', 'xalana-a19', 'xalana-a10', 'xalana-a15',
    ],
    extremo: [
      ...XALANA_MINIMA,
      'xalana-a5', 'xalana-a6', 'xalana-a7', 'xalana-a8', 'xalana-a9',
      'xalana-a18', 'xalana-a19', 'xalana-a10', 'xalana-a15',
      'xalana-a11', 'xalana-a12', 'xalana-a13', 'xalana-a20', 'xalana-a21', 'xalana-a14', 'xalana-a22',
    ],
  }
  const [xalanaSel, setXalanaSel] = useState(PRESET_XALANA)
  /* painel "o que vai fazer" — fechado por defeito
     (ninguém quer 15 checkboxes à cara logo) */
  const [xalanaAberto, setXalanaAberto] = useState(null)

  const toggleXalanaAcao = (nivel, id) => {
    setXalanaSel((p) => {
      const atual = [...(p[nivel] || [])]
      const idx = atual.indexOf(id)
      if (idx >= 0) atual.splice(idx, 1)
      else atual.push(id)
      return { ...p, [nivel]: atual }
    })
  }

  /* pergunta ao servidor quais programas do catálogo já estão no PC */
  const detectarInstalados = async () => {
    if (aDetectar || aCorrer) return
    setADetectar(true)
    setAviso(null)
    try {
      if (dados?.podeLocal === false && agente.online) {
        const j = await esperarTrabalho({ tipo: 'instalados' }, 120000)
        const l = Array.isArray(j.resultado?.instalados) ? j.resultado.instalados : []
        setInstalados(new Set(l))
      } else {
        const r = await fetch('/api/ferramentas/instalados', { headers: authHeaders() })
        const d = await r.json().catch(() => ({}))
        if (r.ok && Array.isArray(d.instalados)) {
          setInstalados(new Set(d.instalados))
        } else {
          setAviso(d.erro || 'Não deu para verificar os programas instalados.')
        }
      }
    } catch (e) {
      setAviso(e.message || 'Não deu para falar com o servidor.')
    } finally {
      setADetectar(false)
    }
  }

  /* desinstala por completo os programas instalados que estão
     selecionados (winget + limpeza estilo Revo, no servidor) */
  const desinstalarSelecionados = async () => {
    if (aCorrer) return
    const ids = Array.from(selecionados).filter((id) => instalados.has(id))
    if (!ids.length) return
    setAviso(null)
    if (dados?.podeLocal === false && agente.online) {
      try {
        const job = await pedirTrabalho({ tipo: 'desinstalar', ids })
        setNomeCorrer(job.nome || 'Desinstalação de programas')
        seguirTrabalho(job)
      } catch (e) {
        setAviso(e.message || 'Não deu para desinstalar.')
      }
      return
    }
    try {
      const r = await fetch('/api/ferramentas/desinstalar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ids }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setAviso(d.erro || d.error || 'Não deu para desinstalar.')
        return
      }
      setNomeCorrer('Desinstalação de programas')
      setEstado((prev) => ({ ...(prev || {}), aCorrer: 'desinstalar', logs: [], fim: null, erro: null }))
    } catch {
      setAviso('Não deu para falar com o servidor.')
    }
  }

  const carregar = () => {
    fetch('/api/ferramentas', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setDados(d)
          setEstado(d.estado)
          /* discos fixos — só serve o seletor da ferramenta de vírus */
          if (d.podeLocal) {
            fetch('/api/ferramentas/discos', { headers: authHeaders() })
              .then((r) => (r.ok ? r.json() : null))
              .then((x) => {
                const l = Array.isArray(x?.discos) ? x.discos : []
                setDiscos(l)
                setDiscoSel((v) => v || l[0] || '')
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
      .finally(() => setRecarregado(true))
  }

  useEffect(carregar, [])

  /* ---------- agente local (site na nuvem -> PC Windows) ---------- */
  const pedirTrabalho = async (payload) => {
    const r = await fetch('/api/agente/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d.job) throw new Error(d.erro || d.error || 'O PC não aceitou o trabalho.')
    return d.job
  }

  /* mostra no terminal os logs de um trabalho do agente */
  const seguirTrabalho = (job) => {
    if (jobPollRef.current) clearInterval(jobPollRef.current)
    setJobId(job.id)
    setNomeCorrer(job.nome || 'Ferramenta')
    setEstado((prev) => ({
      ...(prev || {}),
      aCorrer: job.ferramenta_id || job.id,
      logs: [],
      fim: null,
      erro: null,
      codigo: null,
      codigoTexto: null,
      podeLocal: false,
      podeParar: true,
    }))
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/agente/jobs/${job.id}`, { headers: authHeaders() })
        const d = await r.json().catch(() => ({}))
        if (!r.ok || !d.job) return
        const j = d.job
        const aAndar = j.status === 'pendente' || j.status === 'a_correr'
        setEstado((prev) => ({
          ...(prev || {}),
          aCorrer: aAndar ? (j.ferramenta_id || job.id) : null,
          logs: Array.isArray(j.logs) ? j.logs : [],
          fim: j.fim_em,
          erro: j.erro || null,
          codigo: j.codigo,
          codigoTexto: j.codigo == null ? null : (j.codigo === 0 ? 'sucesso' : (j.erro || `código ${j.codigo}`)),
          podeLocal: false,
          podeParar: aAndar,
        }))
        if (!aAndar) {
          clearInterval(iv)
          jobPollRef.current = null
          setJobId(null)
        }
      } catch { /* rede oscilou; tenta no próximo */ }
    }, 700)
    jobPollRef.current = iv
  }

  /* espera por um trabalho rápido (discos, programas instalados) */
  const esperarTrabalho = async (payload, timeoutMs = 120000) => {
    const job = await pedirTrabalho(payload)
    const fim = Date.now() + timeoutMs
    while (Date.now() < fim) {
      await new Promise((r) => setTimeout(r, 700))
      const r = await fetch(`/api/agente/jobs/${job.id}`, { headers: authHeaders() })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.job) throw new Error('Perdi o trabalho do PC.')
      if (!['pendente', 'a_correr'].includes(d.job.status)) return d.job
    }
    throw new Error('O PC demorou demasiado a responder.')
  }

  const pedirDiscos = async () => {
    try {
      const j = await esperarTrabalho({ tipo: 'discos' }, 40000)
      const l = Array.isArray(j.resultado?.discos) ? j.resultado.discos : []
      if (l.length) {
        setDiscos(l)
        setDiscoSel((v) => v || l[0])
      }
    } catch { /* sem discos: o seletor fica vazio */ }
  }

  const ligarPc = async () => {
    if (aLigarPc) return
    setALigarPc(true)
    setAviso(null)
    try {
      const r = await fetch('/api/agente/sessao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ nome: 'PC Windows' }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.token) throw new Error(d.error || d.erro || 'Não deu para criar a sessão.')
      const a = document.createElement('a')
      a.href = `/api/agente/baixar?token=${encodeURIComponent(d.token)}`
      a.download = 'LOCAUS-PC.bat'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setAviso('LOCAUS-PC.bat descarregado. Abre-o no PC e aceita o pedido de administrador; o site liga-se sozinho.')
    } catch (e) {
      setAviso(e.message || 'Não deu para ligar o PC.')
    } finally {
      setALigarPc(false)
    }
  }

  const desligarPc = async () => {
    try {
      await fetch('/api/agente/sessao', { method: 'DELETE', headers: authHeaders() })
      setAgente({ online: false, sessao: null, job: null })
      setJobId(null)
      if (jobPollRef.current) { clearInterval(jobPollRef.current); jobPollRef.current = null }
      setAviso('PC desligado do site.')
    } catch {
      setAviso('Não deu para desligar o PC.')
    }
  }

  /* o site pergunta ao agente se o PC está ligado */
  useEffect(() => {
    let vivo = true
    const atualizar = async () => {
      try {
        const r = await fetch('/api/agente/estado', { headers: authHeaders() })
        const d = await r.json().catch(() => ({}))
        if (!vivo || !r.ok) return
        setAgente((prev) => ({ ...prev, ...d }))
        if (d.online && !discosPedidosRef.current) {
          discosPedidosRef.current = true
          pedirDiscos()
        }
      } catch { /* sem rede */ }
    }
    atualizar()
    const iv = setInterval(atualizar, 5000)
    return () => {
      vivo = false
      clearInterval(iv)
      if (jobPollRef.current) clearInterval(jobPollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aCorrer = estado?.aCorrer || null

  /* acompanha os logs enquanto há trabalho (só no modo local;
     no modo agente quem acompanha é o seguirTrabalho) */
  useEffect(() => {
    if (!aCorrer || dados?.podeLocal === false) return undefined
    const iv = setInterval(() => {
      fetch('/api/ferramentas/status', { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setEstado(d))
        .catch(() => {})
    }, 700)
    return () => clearInterval(iv)
  }, [aCorrer, dados?.podeLocal])

  /* o terminal acompanha o fundo */
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [estado?.logs?.length])

  const ferramentas = useMemo(() => dados?.ferramentas || [], [dados])
  const cats = useMemo(() => {
    const usadas = new Set(ferramentas.map((f) => f.cat))
    return CATS.filter((c) => usadas.has(c))
  }, [ferramentas])

  /* subcategorias da categoria actual (ex.: Programas → Navegadores, Jogos…) */
  const subCats = useMemo(() => {
    const usadas = new Set(
      ferramentas.filter((f) => f.cat === cat && f.sub).map((f) => f.sub),
    )
    return ['Todas', ...Array.from(usadas).sort((a, b) => a.localeCompare(b, 'pt'))]
  }, [ferramentas, cat])

  /* Com texto na pesquisa, procura em TODAS as categorias (nome,
     descrição, comando e categoria). Sem texto, mantém o filtro de
     sempre: categoria + subcategoria. */
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (q) {
      return ferramentas.filter((f) =>
        [f.nome, f.desc, f.cat, f.sub, f.wingetId]
          .filter(Boolean)
          .some((campo) => String(campo).toLowerCase().includes(q)),
      )
    }
    return ferramentas.filter(
      (f) => f.cat === cat && (subCat === 'Todas' || f.sub === subCat),
    )
  }, [ferramentas, cat, subCat, busca])

  /* Mostra a categoria em cada cartão quando a pesquisa está ativa
     (assim se sabe onde clicou antes). */
  const mostrarCat = busca.trim().length > 0

  /* limpa seleção e subcategoria ao mudar de categoria */
  useEffect(() => {
    setSelecionados(new Set())
    setSubCat('Todas')
  }, [cat])

  const executar = async (id, argOverride, acoes) => {
    if (aCorrer) return
    setAviso(null)
    const alvo = ferramentas.find((f) => f.id === id)
    const arg = argOverride !== undefined ? argOverride : alvo?.disco ? discoSel : idLivre
    if (dados?.podeLocal === false) {
      if (!agente.online) {
        setAviso('Liga o teu PC primeiro (botão "Ligar este PC").')
        avancarFila()
        return
      }
      try {
        const job = await pedirTrabalho({ tipo: 'tool', id, arg, acoes })
        setNomeCorrer(job.nome || alvo?.nome || 'Ferramenta')
        seguirTrabalho(job)
      } catch (e) {
        setAviso(e.message || 'Não deu para enviar a ferramenta para o PC.')
        avancarFila()
      }
      return
    }
    try {
      const r = await fetch('/api/ferramentas/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id, arg, acoes }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setAviso(d.erro || d.error || 'Não deu para executar.')
        // se veio da fila, passa à seguinte mesmo assim
        avancarFila()
        return
      }
      setNomeCorrer(d.nome || ferramentas.find((f) => f.id === id)?.nome || 'Ferramenta')
      setEstado((prev) => ({ ...(prev || {}), aCorrer: id, logs: [], fim: null, erro: null }))
    } catch {
      setAviso('Não deu para falar com o servidor.')
      avancarFila()
    }
  }

  /* pára a ferramenta que está a correr no servidor */
  const parar = async () => {
    if (parando || !aCorrer) return
    setParando(true)
    setAviso(null)
    const alvoJob = jobId || agente?.job?.id
    if (dados?.podeLocal === false && alvoJob) {
      try {
        const r = await fetch(`/api/agente/jobs/${alvoJob}/cancelar`, {
          method: 'POST',
          headers: authHeaders(),
        })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) setAviso(d.erro || 'Não deu para parar.')
      } catch {
        setAviso('Não deu para falar com o servidor.')
      } finally {
        setParando(false)
      }
      return
    }
    try {
      const r = await fetch('/api/ferramentas/stop', {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) setAviso(d.erro || 'Não deu para parar.')
    } catch {
      setAviso('Não deu para falar com o servidor.')
    } finally {
      setParando(false)
    }
  }

  /* som curto quando uma ferramenta termina (sem ficheiros) */
  const tocarSom = (ok = true) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = ok ? 720 : 260
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
      osc.start()
      osc.stop(ctx.currentTime + 0.36)
      osc.onended = () => ctx.close()
    } catch { /* sem áudio não vale a pena falhar */ }
  }

  /* mostra o toast e esconde-o passado uns segundos */
  const mostrarToast = (t) => {
    setToast(t)
    setTimeout(() => setToast((atual) => (atual === t ? null : atual)), 4200)
  }

  /* programa a fila (a seguir à atual) */
  const programarFila = (ids) => {
    filaRef.current = [...ids]
    setFila([...ids])
  }

  /* mete o próximo da fila a correr (se houver) */
  const avancarFila = () => {
    if (!filaRef.current.length) return
    const [prox, ...resto] = filaRef.current
    filaRef.current = resto
    setFila(resto)
    setTimeout(() => executar(prox), 0)
  }

  /* quando o servidor acaba (aCorrer -> null): som, toast e fila */
  useEffect(() => {
    const antes = aCorrerRef.current
    aCorrerRef.current = aCorrer
    if (antes && !aCorrer) {
      const falhou = Boolean(estado?.erro)
      tocarSom(!falhou)
      mostrarToast({
        titulo: nomeCorrer || 'Ferramenta',
        ok: !falhou,
        detalhe: falhou ? estado.erro : (estado.codigoTexto ? `Concluído — ${estado.codigoTexto}.` : 'Concluído.'),
      })
      avancarFila()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aCorrer])

  const logs = estado?.logs || []
  const podeLocal = dados?.podeLocal
  const podeExecutar = Boolean(podeLocal || agente.online)

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
            Escolhe, clica e vê o resultado aqui mesmo — sem instalar nada.
          </p>
        </motion.div>

        {podeLocal === false && !agente.online && (
          <div className="mb-6 rounded-xl border border-violet-500/25 bg-violet-500/10 p-4 text-[13px] text-violet-100">
            <div className="flex items-start gap-2.5">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <div className="min-w-0">
                <p className="font-semibold text-white">Ligar este PC ao site</p>
                <p className="mt-1 text-violet-100/80">
                  O site está na nuvem e não tem PowerShell. Descarrega o <b>LOCAUS-PC.bat</b>,
                  abre-o no PC Windows e aceita o pedido de administrador. Fica ligado em segundo
                  plano — depois podes mandar executar daqui ou do telemóvel.
                </p>
                <button
                  type="button"
                  onClick={ligarPc}
                  disabled={aLigarPc}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {aLigarPc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {aLigarPc ? 'A preparar…' : 'Descarregar LOCAUS-PC.bat'}
                </button>
                <p className="mt-2 text-[11px] text-violet-200/60">
                  Se estiveres no telemóvel, descarrega e abre o ficheiro no PC. O site deteta-o
                  sozinho em poucos segundos.
                </p>
              </div>
            </div>
          </div>
        )}

        {podeLocal === false && agente.online && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-100">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span>
                <b>PC ligado</b>
                {agente.sessao?.nome ? ` · ${agente.sessao.nome}` : ''} — as ferramentas correm no
                teu Windows.
              </span>
            </div>
            <button
              type="button"
              onClick={desligarPc}
              className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15"
            >
              Desligar PC
            </button>
          </div>
        )}

        {/* ---------------- Pesquisa ---------------- */}
        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar ferramenta…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-[13px] text-white placeholder:text-gray-400 focus:border-violet-500/50 focus:bg-white/10 focus:outline-none"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                title="Limpar pesquisa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ---------------- Filtros ---------------- */}
        <div className="mb-3 flex flex-wrap gap-2">
          {cats.map((c) => {
            const Icon = CAT_ICONES[c]
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wide transition-colors ${
                  cat === c
                    ? 'bg-violet-500 text-white'
                    : 'btn-glass text-gray-400 hover:text-white'
                }`}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {c}
              </button>
            )
          })}
        </div>

        {/* sub-filtros (só aparecem se a categoria tiver subcategorias) */}
        {subCats.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {subCats.map((s) => (
              <button
                key={s}
                onClick={() => setSubCat(s)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                  subCat === s
                    ? 'bg-white/15 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ---------------- Barra de seleção múltipla ---------------- */}
        {visiveis.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[12px]">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selecionados.size === visiveis.length}
                onChange={() => {
                  if (selecionados.size === visiveis.length) {
                    setSelecionados(new Set())
                  } else {
                    setSelecionados(new Set(visiveis.map((f) => f.id)))
                  }
                }}
                className="rounded border border-white/10 w-4 h-4 p-0 cursor-pointer"
              />
              <span className="text-gray-300">Selecionar todos ({visiveis.length})</span>
            </label>

            {/* só na categoria Programas: detetar os que já estão no PC */}
            {cat === 'Programas' && (
              <button
                onClick={detectarInstalados}
                disabled={aDetectar || aCorrer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Check className={`h-3.5 w-3.5 ${aDetectar ? 'animate-pulse' : ''}`} />
                {aDetectar ? 'A verificar…' : instalados.size ? `Rever instalados (${instalados.size})` : 'Detetar instalados'}
              </button>
            )}

            <span className="flex-1" />
            {selecionados.size > 0 && (
              <>
                {/* desinstalar só aparece se algum selecionado estiver instalado */}
                {Array.from(selecionados).some((id) => instalados.has(id)) && (
                  <button
                    onClick={desinstalarSelecionados}
                    disabled={aCorrer || !podeExecutar}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    title="Desinstala por completo (winget + limpa pastas, registo, tasks e serviços — estilo Revo)"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Desinstalar selecionados ({Array.from(selecionados).filter((id) => instalados.has(id)).length})
                  </button>
                )}
                <button
                  onClick={() => {
                    const ids = Array.from(selecionados)
                    setSelecionados(new Set())
                    if (!ids.length || aCorrer) return
                    // primeira corre já; as restantes ficam na fila
                    programarFila(ids.slice(1))
                    executar(ids[0])
                  }}
                  disabled={aCorrer || !podeExecutar}
                  className="rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
                  title="Corre os selecionados um de cada vez, por ordem"
                >
                  <Play className="h-3.5 w-3.5" /> Executar selecionados ({selecionados.size})
                </button>
              </>
            )}
          </div>
        )}

        {aviso && (
          <p className="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-[13px] font-bold text-red-400">
            {aviso}
          </p>
        )}

        {/* ---------------- Fila de execução ---------------- */}
        {fila.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5 text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-wide text-violet-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Fila ({fila.length})
            </span>
            <span className="text-gray-300">
              {fila
                .map((id) => ferramentas.find((f) => f.id === id)?.nome || id)
                .join(' · ')}
            </span>
            <span className="flex-1" />
            <button
              onClick={() => {
                filaRef.current = []
                setFila([])
              }}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-300 transition-colors hover:bg-red-500/20"
            >
              Limpar fila
            </button>
          </div>
        )}

        {/* ---------------- Terminal ---------------- */}
        {(aCorrer || logs.length > 0) && (
          <div className="glass mb-6 rounded-2xl p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                <span
                  className={`h-2 w-2 rounded-full ${aCorrer ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`}
                />
                {aCorrer ? 'A executar…' : estado?.interrompido ? 'Interrompido' : 'Última execução'}
                {estado?.erro ? <span className="text-red-400">· erro</span> : null}
              </p>
              <div className="flex items-center gap-2">
                {aCorrer && (
                  <button
                    onClick={parar}
                    disabled={parando}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                    title="Interrompe o script que está a correr"
                  >
                    {parando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
                    Parar
                  </button>
                )}
                <button
                  onClick={carregar}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 transition-colors hover:text-gray-300"
                >
                  <RefreshCcw className="h-3 w-3" /> limpar
                </button>
              </div>
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

            <div className="scroll-forte max-h-64 overflow-y-auto rounded-xl border border-emerald-500/20 bg-black/70 p-3 font-mono text-[12px] leading-relaxed">
              {logs.map((lg, i) => (
                <p key={i} className="text-gray-300">
                  <span className="text-emerald-500">›</span> {lg.l}
                </p>
              ))}
              {aCorrer && <p className="text-gray-400">› …</p>}
              <div ref={fimRef} />
            </div>
          </div>
        )}

        {/* ---------------- Grelha ---------------- */}
        {!recarregado ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-400">
            <RefreshCcw className="h-4 w-4 animate-spin text-violet-400" /> A carregar ferramentas…
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Search className="h-7 w-7 text-gray-400" />
            <p className="text-sm text-gray-400">
              {busca.trim()
                ? `Nada encontrado para “${busca.trim()}”.`
                : 'Sem ferramentas nesta aba.'}
            </p>
            <p className="max-w-sm text-[12.5px] text-gray-400">
              {busca.trim()
                ? 'Tenta outra palavra (ex.: dns, limpar, onedrive) ou limpa a pesquisa.'
                : 'Escolhe outra categoria nos botões de cima.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {busca.trim() && (
                <button
                  onClick={() => setBusca('')}
                  className="flex items-center gap-1.5 rounded-full bg-violet-500 px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-violet-400"
                >
                  <X className="h-3.5 w-3.5" /> Limpar pesquisa
                </button>
              )}
              <button
                onClick={() => {
                  setBusca('')
                  setSubCat('Todas')
                  setCat(cats[0] || 'Otimizador by Xalana')
                }}
                className="btn-glass rounded-full px-4 py-2 text-[12px] font-black text-gray-400 transition-colors hover:text-white"
              >
                {busca.trim() ? 'Ver as ferramentas' : 'Mudar de categoria'}
              </button>
            </div>
          </div>
        ) : cat === 'Otimizador by Xalana' ? (
          <div className="grid grid-cols-1 gap-4 py-10">
            {(['minima', 'normal', 'extremo']).map((nivel) => {
              const nivelLabel = { minima: 'Mínima', normal: 'Normal', extremo: 'Extremo' }[nivel]
              const nivelDesc = {
                minima: 'O básico bem feito — só ajustes de desempenho seguros, sem mexer em serviços nem tarefas.',
                normal: 'Tudo do mínimo + telemetria parada, apps de fundo, Game Bar, sugestões e tarefas de diagnóstico. O equilíbrio para jogar e trabalhar.',
                extremo: 'Tudo do mínimo e normal + debloat de apps pré-instaladas, serviços pesados desligados e perfil de jogo sem limitações. Máxima fluidez (reinicia o PC no fim).',
              }[nivel]
              const abertoPainel = xalanaAberto === nivel
              const marcadas = xalanaSel[nivel] || []
              /* todas as ações QUE O NÍVEL TOCA: mínimo entra no normal,
                 mínimo+normal entram no extremo — como se montava à mão */
              const todasAcoesNivel = PRESET_XALANA[nivel]
              return (
                <motion.div
                  key={nivel}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex flex-col overflow-hidden rounded-2xl border border-violet-500/30 p-5 transition-colors hover:border-violet-500/50"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30">
                      {nivel === 'minima' ? <Gauge className="h-5 w-5" /> : nivel === 'normal' ? <Rocket className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-display text-[17px] font-black text-white">{nivelLabel}</span>
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-400">
                          {todasAcoesNivel.length} ações
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-gray-400">{nivelDesc}</p>
                    </div>
                  </div>

                  {/* correr o nível completo (preset) */}
                  <button
                    onClick={() => {
                      const ids = PRESET_XALANA[nivel]
                      if (!ids.length || aCorrer) return
                      executar(`xalana-${nivel}`, null, ids)
                    }}
                    disabled={aCorrer || !podeExecutar}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-[13px] font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-40 disabled:hover:bg-violet-500"
                  >
                    <Play className="h-4 w-4" fill="currentColor" />
                    {aCorrer ? 'A correr…' : `Executar nível ${nivelLabel}`}
                  </button>

                  {/* execução personalizada — fechada logo, abre a pedidos */}
                  <p className="mt-2 text-center text-[11.5px] text-gray-500">
                    <button
                      onClick={() => setXalanaAberto(abertoPainel ? null : nivel)}
                      disabled={aCorrer}
                      className="inline-flex items-center gap-1 font-bold text-violet-400 transition-colors hover:text-violet-300 disabled:opacity-50"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Remover alguma opção ou fazer execução personalizada
                      <span className="text-gray-600">{abertoPainel ? ' ▴' : ' ▾'}</span>
                    </button>
                  </p>

                  {/* painel de confirmação: o que vai fazer + checkboxes */}
                  <AnimatePresence>
                    {abertoPainel && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-gray-500">
                            O que vai fazer — corrige o traço do que não queres
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {todasAcoesNivel.map((aid) => {
                              const acao = XALANA_ACOES[aid]
                              if (!acao) return null
                              const marcada = marcadas.includes(aid)
                              return (
                                <label
                                  key={aid}
                                  className="flex items-start gap-2 rounded-lg border border-white/10 p-2.5 cursor-pointer transition-colors hover:bg-white/5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={marcada}
                                    onChange={() => toggleXalanaAcao(nivel, aid)}
                                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-white/10"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-white leading-tight">{acao.nome}</span>
                                    <p className="text-[10.5px] text-gray-500 leading-relaxed">{acao.desc}</p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => {
                              if (!marcadas.length || aCorrer) return
                              executar(`xalana-${nivel}`, null, marcadas)
                            }}
                            disabled={aCorrer || !podeExecutar || marcadas.length === 0}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-[13px] font-black text-black transition-colors hover:bg-emerald-400 disabled:opacity-40"
                          >
                            <Check className="h-4 w-4" />
                            Confirmar e executar ({marcadas.length} ação{marcadas.length !== 1 ? 'ões' : ''})
                          </button>
                          {marcadas.length !== todasAcoesNivel.length && (
                            <button
                              onClick={() =>
                                setXalanaSel((p) => ({ ...p, [nivel]: [...PRESET_XALANA[nivel]] }))
                              }
                              className="mt-2 w-full text-center text-[11px] font-bold text-gray-500 transition-colors hover:text-gray-300"
                            >
                              Voltar ao preset do nível ({todasAcoesNivel.length})
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((f, i) => {
              const ocupado = Boolean(aCorrer)
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="glass flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/5 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <label className="flex min-w-0 flex-1 cursor-pointer select-none items-start gap-3">
                      {/* ícone no círculo — mesma linguagem visual do site */}
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500/25 to-fuchsia-500/10 text-violet-300 ring-1 ring-violet-500/25">
                        {f.logo && !logosFalha.has(f.id) ? (
                          <img
                            src={f.logo}
                            alt=""
                            loading="lazy"
                            onError={() =>
                              setLogosFalha((s) => new Set(s).add(f.id))
                            }
                            className="h-6 w-6 object-contain"
                          />
                        ) : f.icone && ICON_MAP[f.icone] ? (
                          (() => { const I = ICON_MAP[f.icone]; return <I className="h-5 w-5" />; })()
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 break-words pt-2 font-display text-[15px] font-black leading-tight text-white">
                        {f.nome}
                      </span>
                      <input
                        type="checkbox"
                        checked={selecionados.has(f.id)}
                        onChange={() => {
                          const novo = new Set(selecionados)
                          if (novo.has(f.id)) novo.delete(f.id)
                          else novo.add(f.id)
                          setSelecionados(novo)
                        }}
                        aria-label={`Selecionar ${f.nome}`}
                        className="mt-2.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-white/10"
                      />
                    </label>
                  </div>
                  <p className="mb-3 flex-1 text-[12.5px] leading-relaxed text-gray-400">{f.desc}</p>

                  {(instalados.has(f.id) || mostrarCat || f.desenvolvimento || (f.perigo && f.perigo !== 'baixo')) && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {instalados.has(f.id) && (
                        <>
                          <span
                            title="Já está instalado neste PC"
                            className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30"
                          >
                            instalado
                          </span>
                          {!f.perigo && (
                            <button
                              onClick={desinstalarSelecionados}
                              disabled={aCorrer || !selecionados.has(f.id)}
                              title="Seleciona este cartão e clica para desinstalar por completo (winget + limpeza estilo Revo)"
                              className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-300 ring-1 ring-red-400/30 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                            >
                              <Trash2 className="h-2.5 w-2.5" /> desinstalar
                            </button>
                          )}
                        </>
                      )}
                      {mostrarCat && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-400">
                          {(() => { const I = CAT_ICONES[f.cat]; return I ? <I className="h-3 w-3" /> : null })()}
                          {f.cat}{f.sub ? ` · ${f.sub}` : ''}
                        </span>
                      )}
                      {f.perigo && f.perigo !== 'baixo' && <Badge tom={PERIGO[f.perigo]?.tom}>{PERIGO[f.perigo]?.txt}</Badge>}
                      {f.desenvolvimento && (
                        <Badge tom="aviso">v{f.desenvolvimento} · em desenvolvimento</Badge>
                      )}
                    </div>
                  )}

                  {f.soAdmin && (
                    <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-300 ring-1 ring-violet-400/40">
                      <Lock className="mr-0.5 h-2.5 w-2.5" /> só admin · em teste
                    </span>
                  )}
                  {f.passos && f.passos.length > 0 && (
                    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-[12px]">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-gray-500">
                        O que vai fazer
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {f.passos.map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-gray-300">
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-violet-400" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {f.disco ? (
                    <div className="flex gap-2">
                      <select
                        value={discoSel}
                        onChange={(e) => setDiscoSel(e.target.value)}
                        disabled={ocupado}
                        aria-label="Escolher disco"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white focus:border-violet-500/50 focus:outline-none"
                      >
                        {discos.length === 0 && <option value="">sem discos</option>}
                        {discos.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => executar(f.id)}
                        disabled={ocupado || !discoSel}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-[12px] font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
                      >
                        <Search className="h-3.5 w-3.5" /> Scan
                      </button>
                    </div>
                  ) : f.livre ? (
                    <div className="flex gap-2">
                      <input
                        value={idLivre}
                        onChange={(e) => setIdLivre(e.target.value)}
                        placeholder="ShareX.ShareX"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
                        disabled={ocupado}
                      />
                      <button
                        onClick={() => executar(f.id)}
                        disabled={ocupado || !idLivre.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-[12px] font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
                      >
                        <Search className="h-3.5 w-3.5" /> Instalar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => executar(f.id)}
                      disabled={ocupado || !(podeLocal || agente.online)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-[13px] font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-40 disabled:hover:bg-violet-500"
                    >
                      {aCorrer === f.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white/80" />
                      ) : (
                        <Play className="h-4 w-4" fill="currentColor" />
                      )}
                      {aCorrer === f.id ? 'A correr…' : 'Executar'}
                    </button>
                  )}

                </motion.div>
              )
            })}
          </div>
        )}

        {/* ---------------- Aviso único com animação ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0.85, 1, 0.85], y: 0 }}
          transition={{
            opacity: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="glass mb-6 flex items-center gap-3 rounded-2xl border border-violet-500/25 px-4 py-3"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
            <Sparkles className="h-4 w-4 animate-pulse text-violet-400" />
          </span>
          <p className="text-[13px] font-bold text-gray-300">
            Otimizações e opções ainda serão melhoradas e adicionadas.
          </p>
        </motion.div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
          <Terminal className="h-3 w-3" />
          {busca.trim()
            ? `${visiveis.length} de ${ferramentas.length} ferramentas`
            : `${ferramentas.length} ferramentas`} ·{' '}
          {aCorrer ? 'a correr' : (podeLocal || agente.online) ? 'pronto para executar' : 'PC desligado'}
        </p>
      </div>

      {/* -------- aviso flutuante quando uma ferramenta termina -------- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast-ferramenta"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md"
            style={{
              borderColor: toast.ok ? 'rgba(16,185,129,.5)' : 'rgba(239,68,68,.5)',
              background: toast.ok ? 'rgba(6,40,30,.92)' : 'rgba(45,10,10,.92)',
            }}
          >
            <div className="flex items-start gap-2.5">
              {toast.ok ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-black text-white">
                  {toast.ok ? 'Concluído' : 'Falhou'} · {toast.titulo}
                </p>
                {toast.detalhe ? (
                  <p className="mt-0.5 truncate text-[12px] text-gray-300">{toast.detalhe}</p>
                ) : null}
                {fila.length > 0 && (
                  <p className="mt-0.5 text-[11px] font-bold text-violet-300">
                    Fila: faltam {fila.length}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
