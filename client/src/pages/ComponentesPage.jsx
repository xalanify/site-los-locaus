import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Zap,
  Box,
  Fan,
  MonitorPlay,
  Mouse,
  MousePointer2,
  Keyboard,
  Headphones,
  Mic,
  Search,
  RefreshCcw,
  Loader2,
  ExternalLink,
  Pencil,
  X,
  Check,
  Euro,
  AlertTriangle,
  Lock,
  ShoppingCart,
  Sparkles,
  Store,
  SlidersHorizontal,
  History,
  Bell,
  Gauge,
  TrendingDown,
  Trash2,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import BuildLabPage from './BuildLabPage'
import { authHeaders } from '../lib/auth'

/* ============================================================
   COMPONENTES E PERIFÉRICOS (só admin · em testes)
   ------------------------------------------------------------
   Duas formas de ver:
   · Destaques — modelos do catálogo, com comparação de preços
     entre as lojas e a mais barata destacada.
   · Pesquisa ao vivo — procura qualquer produto nas lojas
     (GlobalData, PCComponentes, MaxGaming, LDLC) e mostra os
     resultados reais com foto, preço e link.
   ============================================================ */

const ICONES = {
  gpu: MonitorPlay,
  cpu: Cpu,
  ram: MemoryStick,
  motherboard: CircuitBoard,
  ssd: HardDrive,
  psu: Zap,
  caixa: Box,
  cooler: Fan,
  rato: Mouse,
  teclado: Keyboard,
  mousepad: MousePointer2,
  headset: Headphones,
  microfone: Mic,
}

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const precoFmt = (v) => (Number(v) > 0 ? eur.format(Number(v)) : '—')

/* Pesquisa por marca dentro de uma categoria — evita juntar termos
   contraditórios como "geforce rtx radeon" quando se escolhe AMD. */
const MARCA_QUERY = {
  gpu: {
    AMD: 'AMD Radeon RX',
    NVIDIA: 'NVIDIA GeForce RTX',
    Intel: 'Intel Arc',
  },
  cpu: {
    AMD: 'AMD Ryzen',
    Intel: 'Intel Core',
  },
  motherboard: {
    ASUS: 'ASUS motherboard',
    MSI: 'MSI motherboard',
    Gigabyte: 'Gigabyte motherboard',
    ASRock: 'ASRock motherboard',
  },
  rato: {
    Logitech: 'Logitech mouse',
    Razer: 'Razer mouse',
    Lamzu: 'Lamzu mouse',
    Pulsar: 'Pulsar mouse',
    Zowie: 'Zowie mouse',
    WLmouse: 'WLmouse',
  },
  teclado: {
    Wooting: 'Wooting keyboard',
    Razer: 'Razer keyboard',
    Keychron: 'Keychron keyboard',
    Logitech: 'Logitech keyboard',
  },
}

const dataFmt = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function IconeCategoria({ id, className = 'h-4 w-4' }) {
  const Icone = ICONES[id] || Cpu
  return <Icone className={className} />
}

function pesquisaLoja(loja, consulta) {
  if (!loja) return '#'
  if (loja.pesquisaBase) {
    return `${loja.pesquisaBase}${encodeURIComponent(consulta)}${loja.pesquisaSufixo || ''}`
  }
  return loja.base || '#'
}

export default function ComponentesPage({ user }) {
  const isAdmin = Boolean(user && user.is_admin)

  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tipo, setTipo] = useState('componente')
  const [categoria, setCategoria] = useState('todas')
  const [q, setQ] = useState('')
  const [qAtiva, setQAtiva] = useState('')
  const [lojasAtivas, setLojasAtivas] = useState([])
  const [resultados, setResultados] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')
  const [ordenar, setOrdenar] = useState('relevancia')
  const [aAtualizar, setAAtualizar] = useState([])
  const [progresso, setProgresso] = useState(null)
  const [editar, setEditar] = useState(null)
  const [aviso, setAviso] = useState('')
  const [maisVendidos, setMaisVendidos] = useState([])
  const [carregandoVendidos, setCarregandoVendidos] = useState(false)
  const [marcasAtivas, setMarcasAtivas] = useState([])
  const [ramTipo, setRamTipo] = useState('todas')
  const [stockFiltro, setStockFiltro] = useState('todas')
  const [soPromocoes, setSoPromocoes] = useState(false)
  const [historicoProduto, setHistoricoProduto] = useState(null)
  const [alertaProduto, setAlertaProduto] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [bottleneckAberto, setBottleneckAberto] = useState(false)
  const [buildLabAberto, setBuildLabAberto] = useState(false)
  const [filtrosAberto, setFiltrosAberto] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const r = await fetch('/api/componentes', { headers: authHeaders() })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para carregar.')
      setDados(d)
    } catch (e) {
      setErro(e.message || 'Sem ligação ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (isAdmin) carregar()
    else setCarregando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return undefined
    let vivo = true
    fetch('/api/componentes/alertas', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setAlertas(Array.isArray(d?.alertas) ? d.alertas : []))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [isAdmin])

  const alertaDe = (id) => alertas.find((a) => a.produto_id === id) || null

  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  // espera que o utilizador pare de escrever antes de ir às lojas
  useEffect(() => {
    const t = setTimeout(() => setQAtiva(q.trim()), 550)
    return () => clearTimeout(t)
  }, [q])

  const lojas = dados?.lojas || {}
  const categorias = useMemo(() => {
    if (!dados) return []
    return (dados.categorias || []).filter((c) => c.tipo === tipo)
  }, [dados, tipo])

  const lojasTipo = useMemo(() => {
    return Object.values(lojas).filter(
      (l) =>
        l.id !== 'pcdiga' && (tipo === 'periferico' ? l.perifericos : l.componentes),
    )
  }, [lojas, tipo])

  const modoBusca = Boolean(qAtiva) || categoria !== 'todas'
  const termoBase = qAtiva || (categoria !== 'todas' ? (dados?.categoriaQuery || {})[categoria] || categoria : '')
  const termo =
    !qAtiva && categoria !== 'todas' && marcasAtivas.length === 1
      ? MARCA_QUERY[categoria]?.[marcasAtivas[0]] || `${marcasAtivas[0]} ${termoBase}`
      : termoBase

  // Pesquisa ao vivo nas lojas
  useEffect(() => {
    if (!isAdmin || !modoBusca || !termo) {
      setResultados(null)
      setBuscando(false)
      return undefined
    }
    let vivo = true
    setBuscando(true)
    setErroBusca('')
    const params = new URLSearchParams({ q: termo, tipo })
    if (categoria !== 'todas') params.set('categoria', categoria)
    if (lojasAtivas.length) params.set('lojas', lojasAtivas.join(','))
    fetch(`/api/componentes/pesquisar?${params.toString()}`, { headers: authHeaders() })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error((d && d.error) || 'Não deu para pesquisar.')
        if (vivo) setResultados(Array.isArray(d.resultados) ? d.resultados : [])
      })
      .catch((e) => {
        if (vivo) {
          setErroBusca(e.message || 'Não deu para pesquisar nas lojas.')
          setResultados([])
        }
      })
      .finally(() => vivo && setBuscando(false))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, modoBusca, termo, tipo, categoria, lojasAtivas.join(','), marcasAtivas.join(',')])

  // Mais vendidos nas lojas (entrada da página, sem pesquisa)
  useEffect(() => {
    if (!isAdmin || modoBusca) return undefined
    let vivo = true
    setCarregandoVendidos(true)
    const params = new URLSearchParams({ tipo })
    if (categoria !== 'todas') params.set('categoria', categoria)
    fetch(`/api/componentes/mais-vendidos?${params.toString()}`, { headers: authHeaders() })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error((d && d.error) || 'Sem mais vendidos.')
        if (vivo) setMaisVendidos(Array.isArray(d.resultados) ? d.resultados : [])
      })
      .catch(() => vivo && setMaisVendidos([]))
      .finally(() => vivo && setCarregandoVendidos(false))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, modoBusca, tipo, categoria])

  const ramCombina = (item) => {
    if (categoria !== 'ram' || ramTipo === 'todas') return true
    const t = `${item.titulo || ''} ${item.nome || ''} ${item.spec || ''}`
      .toLowerCase()
      .replace(/×/g, 'x')
      .replace(/\s+/g, '')
    return t.includes(ramTipo)
  }

  const passaFiltros = (item) => {
    if (marcasAtivas.length && !marcasAtivas.includes(item.marca)) return false
    const stockItem =
      item.stock ||
      (item.maisBarato && item.maisBarato.stock) ||
      (item.precos || []).find((p) => p.stock)?.stock ||
      ''
    if (stockFiltro !== 'todas' && stockItem !== stockFiltro) return false
    const desconto =
      Number(item.desconto) ||
      Math.max(0, ...(item.precos || []).map((p) => Number(p.desconto) || 0))
    if (soPromocoes && desconto <= 0) return false
    return ramCombina(item)
  }

  const destaques = useMemo(() => {
    if (!dados) return []
    return (dados.produtos || []).filter(
      (p) =>
        p.tipo === tipo &&
        p.imagem &&
        (categoria === 'todas' || p.categoria === categoria) &&
        (!marcasAtivas.length || marcasAtivas.includes(p.marca)) &&
        (categoria !== 'ram' || ramTipo === 'todas' || `${p.nome} ${p.spec}`.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '').includes(ramTipo)),
    )
  }, [dados, tipo, categoria, marcasAtivas, ramTipo, stockFiltro, soPromocoes])

  const marcasDisponiveis = useMemo(() => {
    const set = new Set()
    for (const p of (dados?.produtos || []).filter(
      (x) => x.tipo === tipo && (categoria === 'todas' || x.categoria === categoria),
    )) {
      if (p.marca) set.add(p.marca)
    }
    for (const r of resultados || []) if (r.marca) set.add(r.marca)
    for (const r of maisVendidos) if (r.marca) set.add(r.marca)
    return [...set].sort((a, b) => a.localeCompare(b, 'pt'))
  }, [dados, tipo, categoria, resultados, maisVendidos])

  const resultadosFiltrados = useMemo(() => {
    if (!resultados) return []
    const arr = resultados.filter(passaFiltros)
    if (ordenar === 'preco-asc') arr.sort((a, b) => a.preco - b.preco)
    else if (ordenar === 'preco-desc') arr.sort((a, b) => b.preco - a.preco)
    else arr.sort((a, b) => b.pontos - a.pontos || a.preco - b.preco)
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultados, ordenar, marcasAtivas, ramTipo, categoria, stockFiltro, soPromocoes])

  const maisBaratoBusca = useMemo(() => {
    if (!resultadosFiltrados.length) return null
    return resultadosFiltrados.reduce((a, b) => (b.preco < a.preco ? b : a))
  }, [resultadosFiltrados])

  const vendidosFiltrados = useMemo(() => {
    return maisVendidos
      .filter(passaFiltros)
      .filter((r) => !lojasAtivas.length || lojasAtivas.includes(r.loja))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maisVendidos, marcasAtivas, ramTipo, categoria, lojasAtivas.join(','), stockFiltro, soPromocoes])

  const maisBaratoVendidos = useMemo(() => {
    if (!vendidosFiltrados.length) return null
    return vendidosFiltrados.reduce((a, b) => (b.preco < a.preco ? b : a))
  }, [vendidosFiltrados])

  const trocarTipo = (novo) => {
    setTipo(novo)
    setCategoria('todas')
    setQ('')
    setQAtiva('')
    setResultados(null)
    setEditar(null)
    setLojasAtivas([])
    setMarcasAtivas([])
    setRamTipo('todas')
    setStockFiltro('todas')
    setSoPromocoes(false)
    setMaisVendidos([])
  }

  const alternarLoja = (id) => {
    setLojasAtivas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const marcar = (ids, ativo) =>
    setAAtualizar((prev) =>
      ativo ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id)),
    )

  const atualizar = async (ids) => {
    if (!ids.length) return
    marcar(ids, true)
    try {
      const r = await fetch('/api/componentes/atualizar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para atualizar.')
      setDados((prev) => (prev ? { ...prev, produtos: d.produtos || prev.produtos } : prev))
      const total = (d.atualizados || []).reduce((n, x) => n + (x.encontrados || 0), 0)
      setAviso(
        total
          ? `Preços atualizados (${total} loja${total > 1 ? 's' : ''}).`
          : 'Não foram encontrados preços novos.',
      )
    } catch (e) {
      setAviso(e.message || 'Falhou a atualização.')
    } finally {
      marcar(ids, false)
    }
  }

  const atualizarTudo = async () => {
    const ids = destaques.map((p) => p.id)
    if (!ids.length || progresso) return
    setProgresso({ feitos: 0, total: ids.length })
    for (let i = 0; i < ids.length; i += 3) {
      await atualizar(ids.slice(i, i + 3))
      setProgresso({ feitos: Math.min(i + 3, ids.length), total: ids.length })
    }
    setProgresso(null)
    setAviso('Atualização concluída.')
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Lock className="h-8 w-8 text-gray-500" />
          <h1 className="font-display text-xl font-black text-white">Só para administradores</h1>
          <p className="max-w-sm text-sm text-gray-400">
            Esta página está em testes e só está disponível para a conta de admin.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
            Componentes e Periféricos
          </h1>
          <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
            Admin · em testes
          </span>
        </div>
        <p className="max-w-3xl text-[13px] leading-relaxed text-gray-400">
          Pesquisa qualquer produto nas lojas — GlobalData, PCComponentes, MaxGaming e LDLC — ou
          vê os destaques com comparação de preços. A loja mais barata fica sempre destacada.
        </p>
        <button
          type="button"
          onClick={() => setBottleneckAberto(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-violet-200 transition-colors hover:bg-violet-500/20"
        >
          <Gauge className="h-3.5 w-3.5" /> Calculadora de bottleneck
        </button>
        <button
          type="button"
          onClick={() => setBuildLabAberto(true)}
          className="mt-3 ml-2 inline-flex items-center gap-1.5 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-sky-200 transition-colors hover:bg-sky-500/20"
        >
          <Gauge className="h-3.5 w-3.5" /> Laboratório de builds
        </button>
      </motion.div>

      {/* Tipo */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-md">
        {[
          { id: 'componente', nome: 'Componentes', Icone: Cpu },
          { id: 'periferico', nome: 'Periféricos', Icone: Mouse },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => trocarTipo(t.id)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-black transition-colors ${
              tipo === t.id
                ? 'border-violet-400/40 bg-violet-500/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <t.Icone className="h-4 w-4" />
            {t.nome}
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              tipo === 'componente'
                ? 'Pesquisar componente (ex.: RTX 5070, Ryzen, SSD…)'
                : 'Pesquisar periférico (ex.: WLmouse, teclado, mousepad…)'
            }
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-9 pr-9 text-sm text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setQAtiva('')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-white/10 hover:text-white"
              aria-label="Limpar procura"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <select
          value={ordenar}
          onChange={(e) => setOrdenar(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-xs font-bold text-gray-300 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="relevancia">Relevância</option>
          <option value="preco-asc">Preço ↑</option>
          <option value="preco-desc">Preço ↓</option>
        </select>
        <button
          type="button"
          onClick={() => setFiltrosAberto(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
          {(marcasAtivas.length > 0 || ramTipo !== 'todas' || stockFiltro !== 'todas' || soPromocoes) && (
            <span className="rounded-full bg-violet-500 px-1.5 text-[9px] text-white">
              {marcasAtivas.length + (ramTipo !== 'todas' ? 1 : 0) + (stockFiltro !== 'todas' ? 1 : 0) + (soPromocoes ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {filtrosAberto && (
        <div
          className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setFiltrosAberto(false)}
        />
      )}

      <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-5">
        <aside
          className={`${
            filtrosAberto
              ? 'fixed inset-x-3 top-3 bottom-3 z-[80] overflow-y-auto'
              : 'hidden'
          } lg:static lg:z-auto lg:mb-0 lg:block lg:overflow-visible`}
        >
          <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-3 lg:sticky lg:top-4">
            <div className="mb-2 flex items-center justify-between lg:hidden">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Filtros
              </p>
              <button
                type="button"
                onClick={() => setFiltrosAberto(false)}
                className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
                aria-label="Fechar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
              Categorias
            </p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => setCategoria('todas')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition-colors ${
                  categoria === 'todas'
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoria(c.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition-colors ${
                    categoria === c.id
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/[0.04] text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconeCategoria id={c.icone} className="h-3.5 w-3.5 shrink-0" />
                  {c.nome}
                </button>
              ))}
            </div>

            {categoria === 'ram' && (
              <>
                <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Memória
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'todas', nome: 'Todas' },
                    { id: '2x8', nome: '2×8 GB' },
                    { id: '2x16', nome: '2×16 GB' },
                    { id: '1x16', nome: '1×16 GB' },
                    { id: '2x32', nome: '2×32 GB' },
                    { id: '4x8', nome: '4×8 GB' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRamTipo(r.id)}
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                        ramTipo === r.id
                          ? 'bg-white text-black'
                          : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {r.nome}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-wider text-gray-500">
              Stock e promoções
            </p>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'todas', nome: 'Tudo' },
                { id: 'stock', nome: 'Em stock' },
                { id: 'encomenda', nome: 'Encomenda' },
                { id: 'sem', nome: 'Sem stock' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStockFiltro(s.id)}
                  className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                    stockFiltro === s.id
                      ? 'bg-white text-black'
                      : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {s.nome}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSoPromocoes((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                  soPromocoes
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <TrendingDown className="h-2.5 w-2.5" /> Promoções
              </button>
            </div>

            {marcasDisponiveis.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Marcas
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setMarcasAtivas([])}
                    className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                      !marcasAtivas.length
                        ? 'bg-white text-black'
                        : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Todas
                  </button>
                  {marcasDisponiveis.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setMarcasAtivas((prev) =>
                          prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                        )
                      }
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                        marcasAtivas.includes(m)
                          ? 'bg-white text-black'
                          : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-wider text-gray-500">
              Lojas
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setLojasAtivas([])}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                  !lojasAtivas.length
                    ? 'bg-white text-black'
                    : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Store className="h-2.5 w-2.5" /> Todas
              </button>
              {lojasTipo.map((l) => {
                const ativa = lojasAtivas.includes(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => alternarLoja(l.id)}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                      ativa
                        ? 'bg-white text-black'
                        : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: l.cor }}
                    />
                    {l.nome}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-10 text-center">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm font-bold text-red-300">{erro}</p>
          <button
            type="button"
            onClick={carregar}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/20"
          >
            Tentar outra vez
          </button>
        </div>
      ) : modoBusca ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="ui-section-title">
              <SlidersHorizontal className="h-4 w-4 text-violet-400" />
              Resultados ao vivo
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                {resultadosFiltrados.length}
              </span>
            </h2>
            {buscando && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-violet-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> a procurar nas lojas…
              </span>
            )}
          </div>

          {erroBusca ? (
            <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300">
              {erroBusca}
            </p>
          ) : !resultados && buscando ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : resultadosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-12 text-center">
              <p className="text-sm font-bold text-gray-400">
                Sem resultados para “{qAtiva || termo}”.
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Tenta o nome do modelo ou abre a pesquisa diretamente na loja.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {lojasTipo.map((l) => (
                  <a
                    key={l.id}
                    href={pesquisaLoja(l, qAtiva || termo)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-gray-300 hover:bg-white/10"
                  >
                    {l.nome} ↗
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {resultadosFiltrados.map((r) => (
                <CartaoLoja
                  key={`${r.loja}:${r.url}`}
                  r={r}
                  maisBarato={maisBaratoBusca && r.url === maisBaratoBusca.url}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          {carregandoVendidos ? (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : vendidosFiltrados.length > 0 ? (
            <section className="mb-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="ui-section-title">
                  <Store className="h-4 w-4 text-emerald-400" />
                  Mais vendidos nas lojas
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                    {vendidosFiltrados.length}
                  </span>
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">
                  PCComponentes · top de vendas
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {vendidosFiltrados.map((r) => (
                  <CartaoLoja
                    key={`vendido:${r.url}`}
                    r={r}
                    maisBarato={maisBaratoVendidos && r.url === maisBaratoVendidos.url}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="ui-section-title">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Destaques
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                {destaques.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={atualizarTudo}
              disabled={Boolean(progresso) || !destaques.length}
              className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-[11px] font-black text-violet-200 transition-colors hover:bg-violet-500/25 disabled:opacity-50"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${progresso ? 'animate-spin' : ''}`} />
              {progresso ? `${progresso.feitos}/${progresso.total}` : 'Atualizar preços'}
            </button>
          </div>

          {destaques.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-12 text-center">
              <p className="text-sm font-bold text-gray-400">
                Ainda não há destaques com fotos. Usa a pesquisa em cima ou atualiza os preços.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {destaques.map((p) => (
                <CartaoProduto
                  key={p.id}
                  produto={p}
                  lojas={lojas}
                  alerta={alertaDe(p.id)}
                  aAtualizar={aAtualizar.includes(p.id)}
                  onAtualizar={() => atualizar([p.id])}
                  onEditar={() => setEditar(p)}
                  onHistorico={() => setHistoricoProduto(p)}
                  onAlerta={() => setAlertaProduto(p)}
                />
              ))}
            </div>
          )}
        </section>
      )}
        </div>
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-gray-600">
        Preços lidos ao vivo das lojas e guardados por 10 minutos. A PCDiga bloqueia leitura
        automática em servidor, por isso aparece só com link direto. Confirma sempre o valor final
        na loja antes de comprar.
      </p>

      <AnimatePresence>
        {editar && (
          <ModalPrecos
            produto={editar}
            lojas={lojas}
            onFechar={() => setEditar(null)}
            onGuardado={(lista) => {
              setDados((prev) => (prev ? { ...prev, produtos: lista } : prev))
              setAviso('Preços guardados.')
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historicoProduto && (
          <ModalHistorico produto={historicoProduto} onFechar={() => setHistoricoProduto(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertaProduto && (
          <ModalAlerta
            produto={alertaProduto}
            alerta={alertaDe(alertaProduto.id)}
            onFechar={() => setAlertaProduto(null)}
            onGuardado={(lista) => setAlertas(lista || [])}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bottleneckAberto && <BottleneckModal onFechar={() => setBottleneckAberto(false)} />}
      </AnimatePresence>

      {buildLabAberto && (
        <div
          className="fixed inset-0 z-[125] overflow-y-auto bg-black/85 p-3 backdrop-blur-sm"
          onClick={() => setBuildLabAberto(false)}
        >
          <div
            className="mx-auto my-3 w-full max-w-6xl rounded-3xl border border-white/10 bg-[#0d0a16] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black text-white">
                <Gauge className="h-4 w-4 text-sky-300" /> Laboratório de builds
                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                  Admin
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setBuildLabAberto(false)}
                className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BuildLabPage embedded />
          </div>
        </div>
      )}

      <AnimatePresence>
        {aviso && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-5 left-1/2 z-[130] -translate-x-1/2 rounded-full border border-violet-400/30 bg-[#1a1030] px-4 py-2 text-xs font-bold text-violet-100 shadow-2xl"
          >
            {aviso}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

/* ---------------- Cartão de resultado ao vivo ---------------- */

function CartaoLoja({ r, maisBarato }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0a1a]/80">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-white/[0.03]">
        <img
          src={r.imagem}
          alt={r.titulo}
          loading="lazy"
          className="h-full w-full object-contain p-3"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
        />
        <span
          className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white ring-1 ring-white/15"
          style={{ backgroundColor: `${r.cor}cc` }}
        >
          {r.lojaNome}
        </span>
        {maisBarato && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-400/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-black">
            mais barato
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-2 min-h-[2.2rem] text-sm font-black leading-tight text-white">
          {r.titulo}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-gray-500">
              {r.lojaNome}
            </span>
            <span className="text-xl font-black text-white">{precoFmt(r.preco)}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {r.stock && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                    r.stock === 'stock'
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : r.stock === 'sem'
                        ? 'bg-red-400/15 text-red-300'
                        : 'bg-amber-400/15 text-amber-300'
                  }`}
                >
                  {r.stock === 'stock' ? 'Em stock' : r.stock === 'sem' ? 'Sem stock' : 'Encomenda'}
                </span>
              )}
              {Number(r.desconto) > 0 && (
                <span className="rounded-full bg-red-400/15 px-1.5 py-0.5 text-[8px] font-black text-red-300">
                  -{r.desconto}%
                </span>
              )}
            </span>
          </div>
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-black text-gray-300 hover:bg-white/10 hover:text-white"
          >
            abrir <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Cartão de destaque (comparação) ---------------- */

function CartaoProduto({ produto, lojas, alerta, aAtualizar, onAtualizar, onEditar, onHistorico, onAlerta }) {
  const Icone = ICONES[produto.categoria] || Cpu
  const maisBarato = produto.maisBarato
  const precos = new Map((produto.precos || []).map((p) => [p.loja, p]))
  const lojasComPreco = (produto.lojas || []).filter((id) => {
    const p = precos.get(id)
    return p && p.preco > 0
  })
  const atualizado = dataFmt(produto.atualizado_em)

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0a1a]/80">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-500/10 via-black/20 to-black/40">
        {produto.imagem ? (
          <img
            src={produto.imagem}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-contain p-3"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <Icone className="h-12 w-12 text-violet-300/40" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-300 ring-1 ring-white/10">
          {produto.marca}
        </span>
        {Number(produto.desconto) > 0 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 px-2 py-1 text-[11px] font-black text-white shadow-lg shadow-red-950/40 ring-1 ring-red-300/30">
            <TrendingDown className="h-3 w-3" /> -{produto.desconto}% promoção
          </span>
        )}
        {produto.stock && (
          <span
            className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ring-1 backdrop-blur ${
              produto.stock === 'stock'
                ? 'bg-emerald-500/85 text-white ring-emerald-300/40'
                : produto.stock === 'sem'
                  ? 'bg-red-500/85 text-white ring-red-300/40'
                  : 'bg-amber-500/85 text-black ring-amber-300/40'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            {produto.stock === 'stock' ? 'Em stock' : produto.stock === 'sem' ? 'Sem stock' : 'Encomenda'}
          </span>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            onClick={onHistorico}
            title="Histórico de preços"
            className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-gray-300 ring-1 ring-white/10 transition-colors hover:bg-black hover:text-white"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onAlerta}
            title={alerta ? `Alerta ativo: ${precoFmt(alerta.preco_alvo)}` : 'Criar alerta de descida'}
            className={`grid h-7 w-7 place-items-center rounded-full ring-1 ring-white/10 transition-colors hover:bg-black ${
              alerta ? 'bg-amber-400/90 text-black' : 'bg-black/60 text-gray-300 hover:text-white'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onAtualizar}
            disabled={aAtualizar}
            title="Atualizar preços deste produto"
            className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-gray-300 ring-1 ring-white/10 transition-colors hover:bg-black hover:text-white disabled:opacity-60"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${aAtualizar ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onEditar}
            title="Editar preços à mão"
            className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-gray-300 ring-1 ring-white/10 transition-colors hover:bg-black hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-sm font-black leading-tight text-white">{produto.nome}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-gray-500">{produto.spec}</p>

        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-2.5">
          {maisBarato ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  Mais barato · {maisBarato.nome}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-300">
                  <Sparkles className="h-2.5 w-2.5" /> melhor
                </span>
              </div>
              <div className="mt-0.5 flex items-end justify-between gap-2">
                <span className="text-xl font-black text-white">{precoFmt(maisBarato.preco)}</span>
                {maisBarato.url && (
                  <a
                    href={maisBarato.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-black text-emerald-300 hover:text-emerald-200"
                  >
                    abrir <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {produto.stock && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                      produto.stock === 'stock'
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : produto.stock === 'sem'
                          ? 'bg-red-400/15 text-red-300'
                          : 'bg-amber-400/15 text-amber-300'
                    }`}
                  >
                    {produto.stock === 'stock'
                      ? 'Em stock'
                      : produto.stock === 'sem'
                        ? 'Sem stock'
                        : 'Encomenda'}
                  </span>
                )}
                {Number(produto.desconto) > 0 && (
                  <span className="rounded-full bg-red-400/15 px-1.5 py-0.5 text-[8px] font-black text-red-300">
                    -{produto.desconto}%
                  </span>
                )}
                {alerta && (
                  <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                    Alerta {precoFmt(alerta.preco_alvo)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-[11px] font-bold text-gray-400">
              Ainda sem preço lido. Usa o lápis para preencher à mão.
            </p>
          )}
        </div>

        <div className="mt-2 space-y-1">
          {lojasComPreco.map((id) => {
            const loja = lojas[id] || { nome: id, cor: '#8b5cf6' }
            const preco = precos.get(id)
            const pesquisa = pesquisaLoja(loja, produto.consulta)
            return (
              <div
                key={id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  maisBarato && maisBarato.loja === id ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: loja.cor }}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-400">
                  {loja.nome}
                  {preco && preco.manual && (
                    <span className="ml-1 text-[8px] font-black uppercase text-amber-400/80">
                      manual
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 text-[11px] font-black ${
                    preco ? 'text-gray-200' : 'text-gray-500'
                  }`}
                  title={preco && preco.titulo ? preco.titulo : undefined}
                >
                  {preco && Number(preco.desconto) > 0 && (
                    <span className="mr-1 rounded bg-red-400/15 px-1 py-0.5 text-[8px] font-black text-red-300">
                      -{preco.desconto}%
                    </span>
                  )}
                  {preco ? precoFmt(preco.preco) : 'ver'}
                </span>
                {preco && preco.stock && (
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      preco.stock === 'stock'
                        ? 'bg-emerald-400'
                        : preco.stock === 'sem'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                    }`}
                    title={
                      preco.stock === 'stock'
                        ? 'Em stock'
                        : preco.stock === 'sem'
                          ? 'Sem stock'
                          : 'Sob encomenda'
                    }
                  />
                )}
                <a
                  href={preco && preco.url ? preco.url : pesquisa}
                  target="_blank"
                  rel="noreferrer"
                  title={`Abrir na ${loja.nome}`}
                  className="shrink-0 rounded p-0.5 text-gray-500 hover:text-white"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )
          })}
        </div>

        {/* outras lojas de confiança — só link de pesquisa, sem leitura de preço */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Object.values(lojas || {})
            .filter((l) => l && l.semPrecos)
            .map((l) => (
              <a
                key={l.id}
                href={pesquisaLoja(l, produto.consulta)}
                target="_blank"
                rel="noreferrer"
                title={`Procurar “${produto.consulta}” na ${l.nome}`}
                className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.02] px-1.5 py-0.5 text-[8px] font-bold text-gray-500 transition hover:border-white/15 hover:text-gray-200"
              >
                {l.nome} <ExternalLink className="h-2 w-2" />
              </a>
            ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-[9px] font-semibold text-gray-600">
          <span className="truncate">{atualizado ? `Atualizado ${atualizado}` : 'Sem dados'}</span>
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onHistorico}
              className="flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-violet-300 transition hover:bg-white/10 hover:text-white"
            >
              <History className="h-2.5 w-2.5" /> Histórico
            </button>
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-2.5 w-2.5" /> {produto.precos?.length || 0}/
              {produto.lojas?.length || 0} lojas
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Modal de preços manuais ---------------- */

function ModalPrecos({ produto, lojas, onFechar, onGuardado }) {
  const [valores, setValores] = useState(() => {
    const out = {}
    for (const id of produto.lojas || []) {
      const atual = (produto.precos || []).find((p) => p.loja === id)
      out[id] = {
        preco: atual ? String(atual.preco).replace('.', ',') : '',
        url: atual?.url || '',
      }
    }
    return out
  })
  const [guardando, setGuardando] = useState(false)
  const [erro, setErro] = useState('')

  const mudar = (id, campo, valor) =>
    setValores((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))

  const guardar = async () => {
    setGuardando(true)
    setErro('')
    try {
      let lista = null
      for (const id of produto.lojas || []) {
        const v = valores[id] || {}
        const numero = Number(String(v.preco).replace(',', '.'))
        const antigo = (produto.precos || []).find((p) => p.loja === id)

        if (!String(v.preco).trim()) {
          if (antigo) {
            const r = await fetch(
              `/api/componentes/preco?produto_id=${encodeURIComponent(produto.id)}&loja=${id}`,
              { method: 'DELETE', headers: authHeaders() },
            )
            const d = await r.json().catch(() => null)
            if (r.ok && d?.produtos) lista = d.produtos
          }
          continue
        }

        if (!Number.isFinite(numero) || numero <= 0) {
          throw new Error(`Preço inválido na loja ${lojas[id]?.nome || id}.`)
        }

        const r = await fetch('/api/componentes/preco', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            produto_id: produto.id,
            loja: id,
            preco: numero,
            url: String(v.url || '').trim() || null,
          }),
        })
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error((d && d.error) || 'Não deu para guardar.')
        if (d?.produtos) lista = d.produtos
      }
      if (lista) onGuardado(lista)
      onFechar()
    } catch (e) {
      setErro(e.message || 'Não deu para guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-5"
      onClick={onFechar}
      role="presentation"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#120c22] p-4 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-white">Preços à mão</h2>
            <p className="truncate text-[11px] font-semibold text-gray-500">
              {produto.marca} · {produto.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full bg-white/[0.12] p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-[11px] leading-relaxed text-gray-500">
          Deixa vazio para apagar o preço dessa loja. O link é opcional — sem link usamos a pesquisa
          da loja.
        </p>

        <div className="space-y-3">
          {(produto.lojas || []).map((id) => {
            const loja = lojas[id] || { nome: id, cor: '#8b5cf6' }
            const v = valores[id] || { preco: '', url: '' }
            return (
              <div key={id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: loja.cor }} />
                  <span className="text-xs font-black text-white">{loja.nome}</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <div className="relative">
                    <Euro className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                    <input
                      value={v.preco}
                      onChange={(e) => mudar(id, 'preco', e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-8 pr-2 text-sm font-bold text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
                    />
                  </div>
                  <input
                    value={v.url}
                    onChange={(e) => mudar(id, 'url', e.target.value)}
                    placeholder="Link do produto (opcional)"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {erro && (
          <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-[11px] font-bold text-red-300">
            {erro}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-black text-gray-300 hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="ui-btn ui-btn-primary flex-1"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
/* ---------------- Histórico de preços ---------------- */

function ModalHistorico({ produto, onFechar }) {
  const [pontos, setPontos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    fetch(`/api/componentes/historico?produto_id=${encodeURIComponent(produto.id)}`, {
      headers: authHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setPontos(Array.isArray(d?.pontos) ? d.pontos : []))
      .catch(() => vivo && setPontos([]))
      .finally(() => vivo && setLoading(false))
    return () => {
      vivo = false
    }
  }, [produto.id])

  const serie = useMemo(() => {
    const porDia = new Map()
    for (const p of pontos) {
      const d = new Date(p.criado_em)
      if (Number.isNaN(d.getTime())) continue
      const k = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
      const v = Number(p.preco) || 0
      if (v > 0 && (!porDia.has(k) || v < porDia.get(k))) porDia.set(k, v)
    }
    return [...porDia.entries()].map(([data, preco]) => ({ data, preco }))
  }, [pontos])

  const vals = serie.map((x) => x.preco)
  const min = vals.length ? Math.min(...vals) : 0
  const max = vals.length ? Math.max(...vals) : 0
  const atual = vals.length ? vals[vals.length - 1] : 0
  const W = 560
  const H = 170
  const pad = 18
  const span = max - min || 1
  const coords = serie.map((p, i) => {
    const x = serie.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (serie.length - 1)
    const y = H - pad - ((p.preco - min) / span) * (H - pad * 2)
    return `${x},${y}`
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-5"
      onClick={onFechar}
      role="presentation"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#120c22] p-4 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-white">Histórico de preços</h2>
            <p className="truncate text-[11px] font-semibold text-gray-500">
              {produto.marca} · {produto.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full bg-white/[0.12] p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : !serie.length ? (
          <p className="py-10 text-center text-sm text-gray-400">
            Ainda não há alterações registadas. O histórico começa a partir de agora — sempre que um
            preço mudar, fica guardado aqui.
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">Atual</p>
                <p className="text-sm font-black text-white">{precoFmt(atual)}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-2.5 text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Mínimo</p>
                <p className="text-sm font-black text-emerald-300">{precoFmt(min)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">Máximo</p>
                <p className="text-sm font-black text-gray-200">{precoFmt(max)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-2">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
                <defs>
                  <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {serie.length > 1 && (
                  <polygon
                    points={`${pad},${H - pad} ${coords.join(' ')} ${W - pad},${H - pad}`}
                    fill="url(#hist-fill)"
                  />
                )}
                <polyline
                  points={coords.join(' ')}
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {coords.map((c, i) => {
                  const [x, y] = c.split(',')
                  return <circle key={i} cx={x} cy={y} r="3" fill="#C4B5FD" />
                })}
              </svg>
              <div className="flex justify-between px-2 pb-1 text-[9px] font-bold text-gray-600">
                <span>{serie[0].data}</span>
                <span>{serie[serie.length - 1].data}</span>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {serie
                .slice(-6)
                .reverse()
                .map((p) => (
                  <div
                    key={p.data}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-semibold text-gray-400">{p.data}</span>
                    <span className="font-black text-gray-200">{precoFmt(p.preco)}</span>
                  </div>
                ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ---------------- Alerta de descida ---------------- */

function ModalAlerta({ produto, alerta, onFechar, onGuardado }) {
  const [preco, setPreco] = useState(
    alerta
      ? String(alerta.preco_alvo).replace('.', ',')
      : produto.maisBarato
        ? String(produto.maisBarato.preco).replace('.', ',')
        : '',
  )
  const [guardando, setGuardando] = useState(false)
  const [erro, setErro] = useState('')

  const guardar = async () => {
    const n = Number(String(preco).replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) {
      setErro('Escreve um preço válido.')
      return
    }
    setGuardando(true)
    setErro('')
    try {
      const r = await fetch('/api/componentes/alerta', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto_id: produto.id, preco_alvo: n }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para guardar.')
      onGuardado(d?.alertas || [])
      onFechar()
    } catch (e) {
      setErro(e.message || 'Não deu para guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const remover = async () => {
    setGuardando(true)
    try {
      const r = await fetch(
        `/api/componentes/alerta?produto_id=${encodeURIComponent(produto.id)}`,
        { method: 'DELETE', headers: authHeaders() },
      )
      const d = await r.json().catch(() => null)
      onGuardado(d?.alertas || [])
      onFechar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-5"
      onClick={onFechar}
      role="presentation"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#120c22] p-4 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-black text-white">Alerta de descida</h2>
            <p className="truncate text-[11px] font-semibold text-gray-500">
              {produto.marca} · {produto.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full bg-white/[0.12] p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-[12px] leading-relaxed text-gray-400">
          Avisamos-te no sino quando o preço mais barato descer até ao teu alvo.
          {produto.maisBarato ? ` Agora está a ${precoFmt(produto.maisBarato.preco)}.` : ''}
        </p>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Euro className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              inputMode="decimal"
              placeholder="Preço alvo"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm font-bold text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="ui-btn ui-btn-primary"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Guardar
          </button>
        </div>

        {erro && (
          <p className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-[11px] font-bold text-red-300">
            {erro}
          </p>
        )}

        {alerta && (
          <button
            type="button"
            onClick={remover}
            disabled={guardando}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/10 py-2 text-[11px] font-black text-red-300 hover:bg-red-500/20 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover alerta
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ---------------- Calculadora de bottleneck ---------------- */

const CPUS_BOTTLENECK = [
  { nome: 'Ryzen 7 9800X3D', score: 100 },
  { nome: 'Ryzen 7 9700X', score: 88 },
  { nome: 'Ryzen 5 7600X', score: 78 },
  { nome: 'Ryzen 5 9600X', score: 84 },
  { nome: 'Core Ultra 9 285K', score: 96 },
  { nome: 'Core i5-14600K', score: 82 },
  { nome: 'Core i7-14700K', score: 90 },
]

const GPUS_BOTTLENECK = [
  { nome: 'RTX 5090', score: 100 },
  { nome: 'RTX 5080', score: 90 },
  { nome: 'RTX 5070 Ti', score: 82 },
  { nome: 'RTX 5070', score: 72 },
  { nome: 'RTX 5060 Ti', score: 60 },
  { nome: 'RX 9070 XT', score: 80 },
  { nome: 'RX 9060 XT', score: 62 },
]

function BottleneckModal({ onFechar }) {
  const [cpuIdx, setCpuIdx] = useState(0)
  const [gpuIdx, setGpuIdx] = useState(2)
  const [cpuCustom, setCpuCustom] = useState({ nome: '', score: '' })
  const [gpuCustom, setGpuCustom] = useState({ nome: '', score: '' })
  const cpu = cpuCustom.nome
    ? { nome: cpuCustom.nome, score: Number(cpuCustom.score) || 100 }
    : CPUS_BOTTLENECK[cpuIdx]
  const gpu = gpuCustom.nome
    ? { nome: gpuCustom.nome, score: Number(gpuCustom.score) || 100 }
    : GPUS_BOTTLENECK[gpuIdx]
  const diff = gpu.score - cpu.score
  const pct = Math.round((Math.abs(diff) / Math.max(gpu.score, cpu.score)) * 100)
  const lado = diff > 8 ? 'CPU' : diff < -8 ? 'GPU' : 'Equilibrado'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-5"
      onClick={onFechar}
      role="presentation"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#120c22] p-4 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-white">
              <Gauge className="h-4 w-4 text-violet-300" /> Calculadora de bottleneck
            </h2>
            <p className="text-[11px] font-semibold text-gray-500">
              Estimativa rápida para 1080p/1440p. Depende sempre do jogo e dos settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full bg-white/[0.12] p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-500">
              Processador
            </span>
            <select
              value={cpuIdx}
              onChange={(e) => setCpuIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white focus:border-violet-500/50 focus:outline-none"
            >
              {CPUS_BOTTLENECK.map((c, i) => (
                <option key={c.nome} value={i} className="bg-[#171122]">
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-500">
              Placa gráfica
            </span>
            <select
              value={gpuIdx}
              onChange={(e) => setGpuIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white focus:border-violet-500/50 focus:outline-none"
            >
              {GPUS_BOTTLENECK.map((g, i) => (
                <option key={g.nome} value={i} className="bg-[#171122]">
                  {g.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={cpuCustom.nome}
            onChange={(e) => setCpuCustom((x) => ({ ...x, nome: e.target.value }))}
            placeholder="Ou escreve outra CPU (ex.: Ryzen 5 5500)"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
          />
          <input
            value={gpuCustom.nome}
            onChange={(e) => setGpuCustom((x) => ({ ...x, nome: e.target.value }))}
            placeholder="Ou escreve outra GPU (ex.: RTX 3080)"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
          />
          <input
            type="number"
            value={cpuCustom.score}
            onChange={(e) => setCpuCustom((x) => ({ ...x, score: e.target.value }))}
            placeholder="Desempenho CPU (100 = 9800X3D)"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
          />
          <input
            type="number"
            value={gpuCustom.score}
            onChange={(e) => setGpuCustom((x) => ({ ...x, score: e.target.value }))}
            placeholder="Desempenho GPU (100 = RTX 5090)"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-gray-600 focus:border-violet-500/50 focus:outline-none"
          />
          <p className="text-[10px] text-gray-500 sm:col-span-2">
            Escreve o nome de qualquer peça e ajusta o desempenho (100 = referência). Se deixares o
            nome vazio, usa a peça escolhida na lista.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Resultado estimado
          </p>
          <p className="mt-1 text-3xl font-black text-white">{pct}%</p>
          <p className="text-sm font-bold text-violet-300">
            {lado === 'Equilibrado'
              ? 'Configuração equilibrada'
              : `Bottleneck do ${lado}`}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${
                pct > 20 ? 'bg-amber-400' : pct > 10 ? 'bg-violet-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            {lado === 'CPU'
              ? 'A CPU está a limitar a gráfica. Um CPU mais forte deve dar mais FPS.'
              : lado === 'GPU'
                ? 'A gráfica está a limitar o CPU. Baixar settings ou subir de GPU ajuda.'
                : 'Boa combinação: CPU e GPU estão próximos em desempenho.'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
