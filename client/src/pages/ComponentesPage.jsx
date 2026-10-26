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
} from 'lucide-react'
import PageShell from '../components/PageShell'
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
  const termo = qAtiva || (categoria !== 'todas' ? (dados?.categoriaQuery || {})[categoria] || categoria : '')

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
  }, [isAdmin, modoBusca, termo, tipo, categoria, lojasAtivas.join(',')])

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
  }, [dados, tipo, categoria, marcasAtivas, ramTipo])

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
  }, [resultados, ordenar, marcasAtivas, ramTipo, categoria])

  const maisBaratoBusca = useMemo(() => {
    if (!resultadosFiltrados.length) return null
    return resultadosFiltrados.reduce((a, b) => (b.preco < a.preco ? b : a))
  }, [resultadosFiltrados])

  const vendidosFiltrados = useMemo(() => {
    return maisVendidos
      .filter(passaFiltros)
      .filter((r) => !lojasAtivas.length || lojasAtivas.includes(r.loja))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maisVendidos, marcasAtivas, ramTipo, categoria, lojasAtivas.join(',')])

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
        {modoBusca && (
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-xs font-bold text-gray-300 focus:border-violet-500/50 focus:outline-none"
          >
            <option value="relevancia">Relevância</option>
            <option value="preco-asc">Preço ↑</option>
            <option value="preco-desc">Preço ↓</option>
          </select>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-5">
        <aside className="mb-4 lg:mb-0">
          <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-3 lg:sticky lg:top-4">
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
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gray-300">
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
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gray-300">
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
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gray-300">
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
                  aAtualizar={aAtualizar.includes(p.id)}
                  onAtualizar={() => atualizar([p.id])}
                  onEditar={() => setEditar(p)}
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

function CartaoProduto({ produto, lojas, aAtualizar, onAtualizar, onEditar }) {
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
        <div className="absolute right-2 top-2 flex gap-1">
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
                  {preco ? precoFmt(preco.preco) : 'ver'}
                </span>
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

        <div className="mt-auto flex items-center justify-between pt-2.5 text-[9px] font-semibold text-gray-600">
          <span>{atualizado ? `Atualizado ${atualizado}` : 'Sem dados'}</span>
          <span className="flex items-center gap-1">
            <ShoppingCart className="h-2.5 w-2.5" /> {produto.precos?.length || 0}/
            {produto.lojas?.length || 0} lojas
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 py-2.5 text-xs font-black text-white hover:bg-violet-400 disabled:opacity-60"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
