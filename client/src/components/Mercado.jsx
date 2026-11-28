import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  Music2,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from './Feedback'
import MoedaLocaus from './MoedaLocaus'
import ItemMini from './ItemMini'
import CartaEnigmaMercado from './CartaEnigmaMercado'
import { CARTAS_NOVAS, MUSICAS_CARTAS } from './CartaMusical'
import CartaLimitada from './CartaLimitada'
import ProfileCard from './ProfileCard'
import ProfileStylePreview from './ProfileStylePreview'
import { classesNome } from '../data/nomeEfeitos'

/* ============================================================
   MERCADO — os mesmos cosméticos da loja, com preço a mexer.
   ============================================================ */

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('pt-PT')

const hora = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

/* Nomes antigos que já não existem no catálogo chegam como id
   (ex.: "carta-arte-galaxia") — aqui ficam legíveis. */
const nomeDaVenda = (nome) => {
  if (!nome || !/-/.test(nome)) return nome || 'Item'
  return nome
    .replace(/^(carta-arte-|cor-arte-|carta-|cor-|camo-|roupa-|estilo-)/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

const CORES_RARIDADE = {
  comum: '#a1a1aa',
  raro: '#60a5fa',
  epico: '#c084fc',
  lendario: '#f5c542',
}

const NOME_RARIDADE = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
}

function Linha({ serie, cor, w = 92, h = 30 }) {
  if (!serie || serie.length < 2) return <span className="text-[10px] text-zinc-600">—</span>
  const min = Math.min(...serie.map((p) => p.preco))
  const max = Math.max(...serie.map((p) => p.preco))
  const span = max - min || 1
  const pontos = serie
    .map((p, i) => {
      const x = (i / (serie.length - 1)) * w
      const y = h - ((p.preco - min) / span) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pontos} fill="none" stroke={cor} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function Grafico({ serie, cor }) {
  const w = 560
  const h = 190
  const pad = 10
  if (!serie || serie.length < 2) {
    return <p className="py-10 text-center text-xs text-zinc-500">Ainda sem histórico suficiente.</p>
  }
  const precos = serie.map((p) => p.preco)
  const min = Math.min(...precos)
  const max = Math.max(...precos)
  const span = max - min || 1
  const pontos = serie.map((p, i) => {
    const x = pad + (i / (serie.length - 1)) * (w - pad * 2)
    const y = h - pad - ((p.preco - min) / span) * (h - pad * 2)
    return [x, y]
  })
  const linha = pontos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${h - pad} ${linha} ${w - pad},${h - pad}`
  const id = `grad-${cor.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" />
      <text x={pad} y={14} fill="#71717a" fontSize="10" fontWeight="700">
        {fmt(max)}
      </text>
      <text x={pad} y={h - 2} fill="#52525b" fontSize="10" fontWeight="700">
        {fmt(min)}
      </text>
    </svg>
  )
}

function Previsao({ item, me }) {
  if (!item) return null
  if (item.tipo === 'cor') {
    return (
      <div className="preview-cor">
        <span className={classesNome(item.valor)}>{me?.username || 'O teu nome'}</span>
      </div>
    )
  }
  if (item.tipo === 'carta') {
    return (
      <div className="preview-carta">
        <ProfileCard
          perfil={{ ...(me || {}), card_style: item.valor }}
          variant={item.valor}
          jogos={[
            ...new Set([
              ...((me && me.game_accounts) || []),
              ...Object.keys((me && me.game_ranks) || {}),
            ]),
          ].filter((g) => g !== 'csgo')}
        />
      </div>
    )
  }
  return <ProfileStylePreview style={item.valor} nome={me?.username || 'O teu nome'} />
}

/* Cartão da grelha — inclinação 3D suave a acompanhar o rato. */
function CartaoMercado({ item, me, flash, musicasCartas, onAbrir }) {
  const sobe = item.variacao >= 0
  const cor = CORES_RARIDADE[item.raridade] || '#a1a1aa'
  const musica = MUSICAS_CARTAS[item.valor]

  const aoMover = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    el.style.setProperty('--mk-rx', `${((0.5 - py) * 8).toFixed(2)}deg`)
    el.style.setProperty('--mk-ry', `${((px - 0.5) * 10).toFixed(2)}deg`)
    el.style.setProperty('--mk-mx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--mk-my', `${(py * 100).toFixed(1)}%`)
  }

  const aoSair = (e) => {
    const el = e.currentTarget
    el.style.setProperty('--mk-rx', '0deg')
    el.style.setProperty('--mk-ry', '0deg')
    el.style.setProperty('--mk-mx', '50%')
    el.style.setProperty('--mk-my', '50%')
  }

  return (
    <button
      type="button"
      onClick={() => onAbrir(item)}
      onPointerMove={aoMover}
      onPointerLeave={aoSair}
      className="mk-item"
      style={{ '--mk-cor': cor }}
      title={item.nome}
    >
      <span className="mk-item-luz" aria-hidden="true" />

      <span className="mk-item-topo">
        <span className="mk-item-rar">{NOME_RARIDADE[item.raridade] || 'Raro'}</span>
        {item.comprado ? (
          <span className="mk-item-tag">tens</span>
        ) : CARTAS_NOVAS.has(item.valor) ? (
          <span className="mk-item-tag mk-item-tag--novo">novo</span>
        ) : null}
      </span>

      <span className="mk-item-arte">
        {item.tipo === 'cor' ? (
          <span className="mk-cor-tile">
            <span className={classesNome(item.valor)}>{me?.username || 'Nome'}</span>
          </span>
        ) : (
          <ItemMini item={item} me={me} className="mk-mini-grelha" />
        )}
      </span>

      <span className="mk-item-nome">
        <span className="mk-item-nome-txt">{item.nome}</span>
        {musica && (
          <Music2
            className="h-3 w-3 shrink-0 text-[#ff9db0]"
            title={musicasCartas[item.valor]?.titulo || musica.cancao}
          />
        )}
      </span>

      <span className="mk-item-pe">
        <span className={`mk-item-preco${flash ? ` preco--${flash}` : ''}`}>
          {fmt(item.comprado ? item.preco_venda : item.preco_compra)}
          <MoedaLocaus size={12} />
        </span>
        <span className={`mk-item-var ${sobe ? 'is-sobe' : 'is-desce'}`}>
          {sobe ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {sobe ? '+' : ''}
          {Number(item.variacao || 0).toFixed(1)}%
        </span>
      </span>

      <span className="mk-item-spark">
        <Linha serie={item.historico} cor={sobe ? '#34d399' : '#f87171'} w={92} h={24} />
      </span>
    </button>
  )
}

export default function Mercado({ onSaldo }) {
  const [dados, setDados] = useState(null)
  const [me, setMe] = useState(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [ordem, setOrdem] = useState('relevancia')
  const [busy, setBusy] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [flash, setFlash] = useState({})
  const precosRef = useRef({})
  const [searchParams, setSearchParams] = useSearchParams()
  const [musicasCartas, setMusicasCartas] = useState({})

  const carregar = async () => {
    try {
      const r = await fetch('/api/mercado', { headers: authHeaders(), cache: 'no-store' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir o mercado.')
      setDados(d)
      setErro('')
      if (onSaldo && d && d.saldo) onSaldo(d.saldo.disponiveis)
    } catch (e) {
      setErro(e.message || 'Sem ligação ao mercado.')
    }
  }

  useEffect(() => {
    carregar()
    fetch('/api/cartas', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMusicasCartas((d && d.itens) || {}))
      .catch(() => {})
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {})
    const t = setInterval(carregar, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const itens = useMemo(() => {
    const lista = (dados && dados.itens) || []
    const filtrada = filtro === 'todos' ? lista : lista.filter((x) => x.tipo === filtro)
    const preco = (x) => (x.comprado ? x.preco_venda : x.preco_compra)
    const copia = [...filtrada]
    if (ordem === 'preco-desc') copia.sort((a, b) => preco(b) - preco(a))
    else if (ordem === 'preco-asc') copia.sort((a, b) => preco(a) - preco(b))
    else if (ordem === 'subida') copia.sort((a, b) => b.variacao - a.variacao)
    else if (ordem === 'descida') copia.sort((a, b) => a.variacao - b.variacao)
    else if (ordem === 'nome') copia.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    return copia
  }, [dados, filtro, ordem])

  // Abrir um item vindo de outra página (?item=...)
  useEffect(() => {
    const alvo = searchParams.get('item')
    if (!alvo || !dados) return
    const achado = (dados.itens || []).find((i) => i.id === alvo)
    if (achado) setDetalhe(achado)
    const next = new URLSearchParams(searchParams)
    next.delete('item')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, searchParams])

  // Pisca o preço quando sobe ou desce entre atualizações
  useEffect(() => {
    if (!dados || !Array.isArray(dados.itens)) return undefined
    const anteriores = precosRef.current
    const novos = {}
    const mudou = {}
    dados.itens.forEach((it) => {
      const antes = anteriores[it.id]
      if (typeof antes === 'number' && Math.abs(antes - it.preco_compra) > 0.004) {
        mudou[it.id] = it.preco_compra > antes ? 'sobe' : 'desce'
      }
      novos[it.id] = it.preco_compra
    })
    precosRef.current = novos
    if (Object.keys(mudou).length) {
      setFlash(mudou)
      const t = setTimeout(() => setFlash({}), 1500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [dados])

  const comprar = async (item) => {
    const ok = await confirmar(
      `Comprar “${item.nome}” por ${fmt(item.preco)} moedas? O preço muda ao longo do dia.`,
      { titulo: 'Comprar no mercado?', okTexto: 'Comprar', perigoso: false },
    )
    if (!ok) return
    setBusy(item.id)
    try {
      const r = await fetch('/api/mercado/comprar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível comprar.')
      toast.ok(`${item.nome} comprado por ${fmt(d.preco)} moedas.`)
      window.dispatchEvent(new Event('locaus:moedas'))
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const vender = async (item) => {
    const ok = await confirmar(
      `Vender “${item.nome}” por ${fmt(item.preco)} moedas? Perdes o cosmético.`,
      { titulo: 'Vender no mercado?', okTexto: 'Vender', perigoso: true },
    )
    if (!ok) return
    setBusy(item.id)
    try {
      const r = await fetch('/api/mercado/vender', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível vender.')
      toast.ok(`${item.nome} vendido por ${fmt(d.preco)} (recebes ${fmt(d.recebido)}).`)
      window.dispatchEvent(new Event('locaus:moedas'))
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const equipar = async (item) => {
    setBusy(item.id)
    try {
      const r = await fetch('/api/cosmeticos/aplicar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível equipar.')
      toast.ok(`${item.nome} equipado no teu perfil.`)
      const me2 = await fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
        .then((x) => (x.ok ? x.json() : null))
        .catch(() => null)
      if (me2) setMe(me2)
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const comprarEdicao = async (item) => {
    const ok = await confirmar(
      `Comprar “${item.nome}” por ${fmt(item.preco_compra)} moedas? O número é sorteado entre os que faltam.`,
      { titulo: 'Comprar edição limitada?', okTexto: 'Comprar', perigoso: false },
    )
    if (!ok) return
    setBusy(item.id)
    try {
      const r = await fetch('/api/mercado/edicoes/comprar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível comprar.')
      toast.ok(`Saiu-te a ${item.nome} nº ${d.numero} de ${item.total}.`)
      window.dispatchEvent(new Event('locaus:moedas'))
      setDetalhe(null)
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const venderEdicao = async (item, copia) => {
    const ok = await confirmar(
      `Vender a ${item.nome} nº ${copia.numero} de ${item.total}? Perdes essa cópia.`,
      { titulo: 'Vender cópia?', okTexto: 'Vender', perigoso: true },
    )
    if (!ok) return
    setBusy(item.id)
    try {
      const r = await fetch('/api/mercado/edicoes/vender', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ copia_id: copia.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível vender.')
      toast.ok(`Vendeste a ${item.nome} nº ${copia.numero} por ${d.recebido} moedas.`)
      window.dispatchEvent(new Event('locaus:moedas'))
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const comprarAnuncio = async (anuncio) => {
    if (!detalhe) return
    const ok = await confirmar(
      `Comprar “${detalhe.nome}” a @${anuncio.username} por ${fmt(anuncio.preco)} moedas?`,
      { titulo: 'Comprar anúncio?', okTexto: 'Comprar', perigoso: false },
    )
    if (!ok) return
    setBusy(detalhe.id)
    try {
      const r = await fetch(`/api/mercado/anuncios/${anuncio.id}/comprar`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível comprar.')
      toast.ok(`Compraste “${detalhe.nome}” a @${anuncio.username} por ${fmt(d.preco)}.`)
      window.dispatchEvent(new Event('locaus:moedas'))
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const equipado = (item) => {
    if (!me || !item) return false
    if (item.tipo === 'cor') return me.name_color === item.valor
    if (item.tipo === 'carta') return me.card_style === item.valor
    return me.profile_style === item.valor
  }

  if (!dados) {
    if (erro) {
      return (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-20 text-sm text-gray-400">
          <span className="flex flex-wrap items-center justify-center gap-3">
            {erro}
            <button type="button" onClick={carregar} className="ui-btn ui-btn-ghost ui-btn-sm">
              Tentar outra vez
            </button>
          </span>
        </div>
      )
    }
    return (
      <div aria-busy="true" aria-label="A carregar o mercado">
        <p className="mb-2 text-[11px] font-semibold text-zinc-500">A carregar o mercado…</p>
        <div className="mercado-skel mercado-skel--lg mb-3" style={{ width: '38%' }} />
        <div className="mb-3 h-16 rounded-2xl border border-white/5 bg-white/[0.02]" />
        <div className="mb-4 h-11 max-w-md rounded-xl border border-white/5 bg-white/[0.02]" />
        <ul className="space-y-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="mercado-skel-linha" />
          ))}
        </ul>
      </div>
    )
  }

  const saldo = dados.saldo || {}

  // Destaque do mercado
  const todos = dados.itens || []
  const destaque = todos
    .filter((x) => !x.emBreve)
    .reduce((melhor, x) => (!melhor || x.variacao > melhor.variacao ? x : melhor), null)

  return (
    <div className="mk">
      <CartaEnigmaMercado />

      {/* estado do mercado */}
      <div className="mk-hud">
        <span className="mk-chip mk-chip--saldo">
          <MoedaLocaus size={14} /> {Number(saldo.disponiveis || 0).toLocaleString('pt-PT')}
          <span className="mk-chip-dim">disponíveis</span>
        </span>
        <span className="mk-chip">
          <span className="mk-live">
            <span className="mk-live-ping" />
            <span className="mk-live-dot" />
          </span>
          ao vivo <span className="mk-chip-dim">· {hora(dados.atualizado_em)}</span>
        </span>

        {destaque && (
          <button type="button" className="mk-alta" onClick={() => setDetalhe(destaque)}>
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="mk-alta-tag">maior subida</span>
            <span className="mk-alta-nome">{destaque.nome}</span>
            <span className="mk-alta-var">+{destaque.variacao.toFixed(1)}%</span>
          </button>
        )}

        <button type="button" onClick={carregar} className="mk-refresh" aria-label="Atualizar o mercado">
          <RefreshCw className="h-3.5 w-3.5" /> <span className="mk-refresh-txt">atualizar</span>
        </button>
      </div>

      {/* filtros */}
      <div className="mk-barra">
        <div className="ui-tabs mk-tabs">
          {[
            { id: 'todos', nome: 'Tudo' },
            { id: 'cor', nome: 'Cores' },
            { id: 'carta', nome: 'Cartas' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              data-active={filtro === f.id}
              className="ui-tab"
            >
              {f.nome}
            </button>
          ))}
        </div>

        <span className="mk-total">{itens.length} itens</span>

        <label className="mk-ordem">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar o mercado">
            <option value="relevancia">ordem do mercado</option>
            <option value="preco-desc">preço: maior primeiro</option>
            <option value="preco-asc">preço: menor primeiro</option>
            <option value="subida">maior subida</option>
            <option value="descida">maior descida</option>
            <option value="nome">nome (a–z)</option>
          </select>
        </label>
      </div>

      {/* grelha */}
      {itens.length === 0 ? (
        <p className="mk-vazio">Nada nesta categoria por agora.</p>
      ) : (
        <div className="mk-grelha">
          {itens.map((item) => (
            <CartaoMercado
              key={item.id}
              item={item}
              me={me}
              flash={flash[item.id]}
              musicasCartas={musicasCartas}
              onAbrir={setDetalhe}
            />
          ))}
        </div>
      )}

      {/* últimas vendas */}
      {dados.ultimasVendas.length > 0 && (
        <div className="mk-vendas">
          <p className="mk-vendas-titulo">Últimas negociações</p>
          <ul>
            {dados.ultimasVendas.slice(0, 8).map((v, i) => (
              <li key={`${v.item_id}-${i}`}>
                <span className="mk-vendas-hora">{hora(v.em)}</span>
                <span className="mk-vendas-nome">
                  {nomeDaVenda(v.nome)}
                  <em>
                    {` ${v.tipo === 'venda' ? 'vendido por' : 'comprado por'} ${v.username}`}
                    {v.contraparte ? ` → ${v.contraparte}` : ''}
                  </em>
                </span>
                <span className="mk-vendas-preco">
                  {fmt(v.preco)}
                  <MoedaLocaus size={11} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalhe — edição limitada */}
      {detalhe &&
        detalhe.tipo === 'edicao' &&
        createPortal(
          <div className="mercado-modal" onClick={() => setDetalhe(null)} role="presentation">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mercado-modal-painel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-base font-black text-white">
                    {detalhe.nome}
                    {MUSICAS_CARTAS[detalhe.valor] && (
                      <Music2
                        className="h-4 w-4 shrink-0 text-[#ff9db0]"
                        title={musicasCartas[detalhe.valor]?.titulo || MUSICAS_CARTAS[detalhe.valor].cancao}
                      />
                    )}
                    {CARTAS_NOVAS.has(detalhe.valor) && <span className="novo-tag">Novo</span>}
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500">
                    Limitado · {detalhe.disponiveis} de {detalhe.total} disponíveis
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalhe(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="mx-auto mb-3 w-full max-w-[260px]">
                  <CartaLimitada
                    id={detalhe.id}
                    nome={detalhe.nome}
                    username={me?.username || 'Locaus'}
                    numero={detalhe.minhas && detalhe.minhas[0] ? detalhe.minhas[0].numero : null}
                    total={detalhe.total}
                  />
                </div>
                <div className="mb-3 flex items-end justify-between">
                  <p className="flex items-center gap-1.5 font-display text-3xl font-black leading-none text-white">
                    {fmt(detalhe.preco_compra)}
                    <MoedaLocaus size={20} />
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500">
                    venda {fmt(detalhe.preco_venda)}
                  </p>
                </div>

                {detalhe.minhas && detalhe.minhas.length > 0 ? (
                  <div className="mb-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      As tuas cópias
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detalhe.minhas.map((m) => (
                        <span key={m.id} className="edicao-copia">
                          <b>nº {m.numero}</b>/{detalhe.total}
                          <button
                            type="button"
                            onClick={() => venderEdicao(detalhe, m)}
                            disabled={busy === detalhe.id}
                          >
                            vender
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-zinc-500">Ainda não tens nenhuma cópia.</p>
                )}

                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Cada compra recebe um número livre aleatório. O nº 1 é o mais raro.
                </p>
              </div>

              <div className="mercado-acoes">
                <button
                  type="button"
                  onClick={() => comprarEdicao(detalhe)}
                  disabled={!detalhe.disponiveis || busy === detalhe.id}
                  className="ui-btn ui-btn-primary ui-btn-sm flex-1 justify-center"
                >
                  {busy === detalhe.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {detalhe.disponiveis > 0
                    ? `Comprar por ${fmt(detalhe.preco_compra)}`
                    : 'Esgotada'}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* Detalhe */}
      {detalhe &&
        detalhe.tipo !== 'edicao' &&
        createPortal(
        <div
          className="mercado-modal"
          onClick={() => setDetalhe(null)}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mercado-modal-painel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-base font-black text-white">
                  {detalhe.nome}
                  {MUSICAS_CARTAS[detalhe.valor] && (
                    <Music2
                      className="h-4 w-4 shrink-0 text-[#ff9db0]"
                      title={musicasCartas[detalhe.valor]?.titulo || MUSICAS_CARTAS[detalhe.valor].cancao}
                    />
                  )}
                  {CARTAS_NOVAS.has(detalhe.valor) && <span className="novo-tag">Novo</span>}
                </p>
                <p className="text-[11px] font-semibold text-zinc-500">
                  {NOME_RARIDADE[detalhe.raridade]} ·{' '}
                  {detalhe.tipo === 'cor' ? 'cor de nome' : detalhe.tipo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalhe(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="flex items-center gap-1.5 font-display text-3xl font-black leading-none text-white">
                    {fmt(detalhe.comprado ? detalhe.preco_venda : detalhe.preco_compra)}
                    <MoedaLocaus size={20} />
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                    compra {fmt(detalhe.preco_compra)} · venda {fmt(detalhe.preco_venda)} · base{' '}
                    {fmt(detalhe.base)}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-bold ${
                    detalhe.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {detalhe.variacao >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(detalhe.variacao).toFixed(1)}%
                </span>
              </div>

              {detalhe.anuncios && detalhe.anuncios.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {detalhe.anuncios.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#ff7a94]/25 bg-[#ff7a94]/[0.06] px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-[11px] font-semibold text-zinc-300">
                        À venda por <b className="text-white">{fmt(a.preco)}</b> · @{a.username}
                      </span>
                      {a.meu ? (
                        <span className="shrink-0 text-[10px] font-bold uppercase text-zinc-500">
                          teu
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => comprarAnuncio(a)}
                          disabled={busy === detalhe.id}
                          className="shrink-0 rounded-lg bg-[#ff7a94] px-2.5 py-1 text-[10px] font-black text-[#0a0a0b]"
                        >
                          Comprar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-3">
                <Previsao item={detalhe} me={me} />
              </div>

              <Grafico serie={detalhe.historico} cor={detalhe.variacao >= 0 ? '#34d399' : '#f87171'} />

              {detalhe.minhasVendas.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Últimas negociações
                  </p>
                  <ul className="space-y-0.5">
                    {detalhe.minhasVendas.map((v, i) => (
                      <li key={i} className="flex justify-between text-[11px] text-zinc-400">
                        <span>
                          {v.tipo === 'venda' ? 'Venda' : 'Compra'} · {v.username || 'Mercado'}
                          {v.contraparte ? ` → ${v.contraparte}` : ''}
                        </span>
                        <span className="font-bold text-white">{fmt(v.preco)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mercado-acoes">
              {detalhe.emBreve ? (
                <p className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] font-bold text-zinc-400">
                  Em breve — os estilos de perfil ainda não estão à venda.
                </p>
              ) : detalhe.comprado ? (
                <>
                  {!equipado(detalhe) && (
                    <button
                      type="button"
                      onClick={() => equipar(detalhe)}
                      disabled={busy === detalhe.id}
                      className="ui-btn ui-btn-primary ui-btn-sm flex-1 justify-center"
                    >
                      {busy === detalhe.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Equipar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => vender(detalhe)}
                    disabled={busy === detalhe.id}
                    className="ui-btn ui-btn-ghost ui-btn-sm flex-1 justify-center"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Vender por {fmt(detalhe.preco_venda)}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => comprar(detalhe)}
                  disabled={busy === detalhe.id}
                  className="ui-btn ui-btn-primary ui-btn-sm flex-1 justify-center"
                >
                  {busy === detalhe.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Comprar por {fmt(detalhe.preco_compra)}
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  )
}
