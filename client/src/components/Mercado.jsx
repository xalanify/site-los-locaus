import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from './Feedback'
import MoedaLocaus from './MoedaLocaus'
import ProfileCard from './ProfileCard'
import ProfileStylePreview from './ProfileStylePreview'
import { classesNome } from '../data/nomeEfeitos'

/* ============================================================
   MERCADO — os mesmos cosméticos da loja, com preço a mexer.
   ============================================================ */

const fmt = (n) =>
  Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const hora = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
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

export default function Mercado({ onSaldo }) {
  const [dados, setDados] = useState(null)
  const [me, setMe] = useState(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [busy, setBusy] = useState('')
  const [detalhe, setDetalhe] = useState(null)

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
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {})
    const t = setInterval(carregar, 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const itens = useMemo(() => {
    const lista = (dados && dados.itens) || []
    return filtro === 'todos' ? lista : lista.filter((x) => x.tipo === filtro)
  }, [dados, filtro])

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
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-20 text-sm text-gray-400">
        {erro ? (
          <span className="flex items-center gap-2">
            {erro}
            <button type="button" onClick={carregar} className="underline">
              tentar outra vez
            </button>
          </span>
        ) : (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> A abrir o mercado…
          </>
        )}
      </div>
    )
  }

  const saldo = dados.saldo || {}

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.06] px-3 py-1.5 text-xs font-bold text-amber-100">
            <MoedaLocaus size={14} /> {Number(saldo.disponiveis || 0).toLocaleString('pt-PT')} disponíveis
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            ao vivo · {hora(dados.atualizado_em)}
          </span>
        </div>
        <button type="button" onClick={carregar} className="ui-btn ui-btn-ghost ui-btn-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[
          { id: 'todos', nome: 'Todos' },
          { id: 'cor', nome: 'Cores' },
          { id: 'carta', nome: 'Cartas' },
          { id: 'estilo', nome: 'Estilos' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
              filtro === f.id
                ? 'border-[#f7a8a8]/50 bg-[#f7a8a8]/15 text-[#f7a8a8]'
                : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white'
            }`}
          >
            {f.nome}
          </button>
        ))}
      </div>

      <ul className="space-y-1.5">
        {itens.map((item) => {
          const sobe = item.variacao >= 0
          const cor = sobe ? '#34d399' : '#f87171'
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setDetalhe(item)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-[#101012]/80 px-3 py-2.5 text-left transition-colors hover:border-white/15 hover:bg-[#151518]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: CORES_RARIDADE[item.raridade] }}
                  title={NOME_RARIDADE[item.raridade]}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-bold ${
                      item.tipo === 'cor'
                        ? classesNome(item.valor) || 'text-white'
                        : 'text-white'
                    }`}
                  >
                    {item.nome}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {NOME_RARIDADE[item.raridade]} · {item.tipo === 'cor' ? 'cor de nome' : item.tipo}
                  </span>
                </span>

                <span className="hidden sm:block">
                  <Linha serie={item.historico} cor={cor} />
                </span>

                <span className="w-[92px] shrink-0 text-right">
                  <span className="block font-display text-sm font-black tabular-nums text-white">
                    {fmt(item.comprado ? item.preco_venda : item.preco_compra)}
                  </span>
                  <span
                    className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${
                      sobe ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {sobe ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {sobe ? '+' : ''}
                    {item.variacao.toFixed(1)}%
                  </span>
                </span>

                <span className="hidden shrink-0 items-center gap-1 text-[10px] font-bold text-zinc-500 md:flex">
                  {item.emBreve ? 'em breve' : item.comprado ? 'tens' : 'comprar'}
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {dados.ultimasVendas.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#0f0f11]/80 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Últimas vendas
          </p>
          <ul className="space-y-1">
            {dados.ultimasVendas.slice(0, 8).map((v, i) => (
              <li key={`${v.item_id}-${i}`} className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="w-12 shrink-0 text-zinc-600">{hora(v.em)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {v.nome}
                  <span className="ml-1 text-zinc-500">
                    · {v.tipo === 'venda' ? 'vendido por' : 'comprado por'} {v.username}
                    {v.contraparte ? ` → ${v.contraparte}` : ''}
                  </span>
                </span>
                <span className="w-16 shrink-0 text-right font-bold tabular-nums text-white">
                  {fmt(v.preco)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalhe */}
      {detalhe && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/85 p-3 pb-24 pt-4 backdrop-blur-sm sm:items-center sm:pb-4"
          onClick={() => setDetalhe(null)}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111113]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-white">{detalhe.nome}</p>
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
                  <p className="font-display text-3xl font-black leading-none text-white">
                    {fmt(detalhe.comprado ? detalhe.preco_venda : detalhe.preco_compra)}
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#f7a8a8]/25 bg-[#f7a8a8]/[0.06] px-3 py-2"
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
                          className="shrink-0 rounded-lg bg-[#f7a8a8] px-2.5 py-1 text-[10px] font-black text-[#0a0a0b]"
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

              <div className="mercado-acoes mt-3 flex flex-wrap gap-2">
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
          </motion.div>
        </div>
      )}
    </div>
  )
}
