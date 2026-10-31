import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Loader2, Tag, X, TrendingUp, TrendingDown, Coins, RefreshCw } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { toast } from './Feedback'
import MoedaLocaus from './MoedaLocaus'
import ProfileCard from './ProfileCard'
import ProfileStylePreview from './ProfileStylePreview'
import { classesNome } from '../data/nomeEfeitos'

/* ============================================================
   OS MEUS ITENS — o que tenho, quanto vale e pôr à venda pelo
   preço que eu quiser.
   ============================================================ */

const fmt = (n) =>
  Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const NOME_TIPO = { cor: 'Cor de nome', carta: 'Carta', estilo: 'Estilo de perfil' }

function Mini({ item, me }) {
  if (item.tipo === 'cor') {
    return (
      <span className="mini-cor">
        <span className={classesNome(item.valor)}>{me?.username || 'Nome'}</span>
      </span>
    )
  }
  if (item.tipo === 'carta') {
    return (
      <span className="mini-carta">
        <ProfileCard
          perfil={{ ...(me || {}), card_style: item.valor }}
          variant={item.valor}
          jogos={[]}
        />
      </span>
    )
  }
  return (
    <span className="mini-estilo">
      <ProfileStylePreview style={item.valor} nome={me?.username || 'Nome'} />
    </span>
  )
}

export default function MeusItens() {
  const [dados, setDados] = useState(null)
  const [me, setMe] = useState(null)
  const [erro, setErro] = useState('')
  const [venda, setVenda] = useState(null)
  const [preco, setPreco] = useState('')
  const [busy, setBusy] = useState('')

  const carregar = async () => {
    try {
      const r = await fetch('/api/mercado/meus', { headers: authHeaders(), cache: 'no-store' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir os teus itens.')
      setDados(d)
      setErro('')
    } catch (e) {
      setErro(e.message)
      setDados({ itens: [], saldo: {} })
    }
  }

  useEffect(() => {
    carregar()
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {})
  }, [])

  const abrirVenda = (item) => {
    setVenda(item)
    setPreco(String(Math.round(item.preco)))
  }

  const anunciar = async () => {
    if (!venda) return
    const valor = Math.round(Number(preco))
    if (!Number.isFinite(valor) || valor <= 0) return toast.erro('Escreve um valor válido.')
    setBusy(venda.id)
    try {
      const r = await fetch('/api/mercado/anunciar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: venda.id, preco: valor }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível pôr à venda.')
      toast.ok(`“${venda.nome}” à venda por ${fmt(d.preco)} moedas.`)
      setVenda(null)
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const cancelar = async (item, anuncio) => {
    setBusy(item.id)
    try {
      const r = await fetch(`/api/mercado/anuncios/${anuncio.id}/cancelar`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível cancelar.')
      toast.ok('Anúncio cancelado.')
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy('')
    }
  }

  const itens = useMemo(() => (dados && dados.itens) || [], [dados])

  if (!dados) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-20 text-sm text-gray-400">
        {erro ? erro : <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> A abrir os teus itens…</>}
      </div>
    )
  }

  if (!itens.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
        <Coins className="mx-auto h-8 w-8 text-zinc-600" />
        <p className="mt-3 text-sm font-bold text-white">Ainda não tens cosméticos</p>
        <p className="mt-1 text-xs text-zinc-500">
          Compra no mercado ou abre um Locaus Pack para começares a tua coleção.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.06] px-3 py-1.5 text-xs font-bold text-amber-100">
          <MoedaLocaus size={14} /> {Number(dados.saldo?.disponiveis || 0).toLocaleString('pt-PT')}{' '}
          disponíveis
        </span>
        <button type="button" onClick={carregar} className="ui-btn ui-btn-ghost ui-btn-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {itens.map((item) => {
          const anuncio = (item.anuncios || []).find((a) => a.meu)
          const sobe = item.variacao >= 0
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-white/[0.07] bg-[#101012]/85 p-3"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0">
                  <Mini item={item} me={me} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-bold ${
                      item.tipo === 'cor' ? classesNome(item.valor) || 'text-white' : 'text-white'
                    }`}
                  >
                    {item.nome}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {NOME_TIPO[item.tipo] || item.tipo}
                  </p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-base font-black text-white">
                      {fmt(item.preco)}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-500">mercado</span>
                    <span
                      className={`ml-1 flex items-center gap-0.5 text-[10px] font-bold ${
                        sobe ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {sobe ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {item.variacao.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>

              {item.minhasVendas?.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-white/[0.05] pt-2">
                  {item.minhasVendas.slice(0, 2).map((v, i) => (
                    <li key={i} className="flex justify-between text-[10px] text-zinc-500">
                      <span className="truncate">
                        {v.tipo === 'venda' ? 'Venda' : 'Compra'} · {v.username || 'Mercado'}
                        {v.contraparte ? ` → ${v.contraparte}` : ''}
                      </span>
                      <span className="font-bold text-zinc-300">{fmt(v.preco)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3">
                {item.emBreve ? (
                  <span className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-center text-[11px] font-bold text-zinc-500">
                    Em breve — ainda não é possível vender
                  </span>
                ) : anuncio ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-[#f7a8a8]/25 bg-[#f7a8a8]/[0.06] px-2.5 py-1.5">
                    <span className="min-w-0 truncate text-[11px] font-semibold text-zinc-300">
                      À venda por <b className="text-white">{fmt(anuncio.preco)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelar(item, anuncio)}
                      disabled={busy === item.id}
                      className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirVenda(item)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-zinc-200 hover:border-[#f7a8a8]/40 hover:text-white"
                  >
                    <Tag className="h-3.5 w-3.5" /> Vender pelo meu preço
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {venda &&
        createPortal(
        <div
          className="fixed inset-0 z-[125] flex items-start justify-center overflow-y-auto bg-black/85 p-4 pb-24 backdrop-blur-sm sm:items-center sm:pb-4"
          onClick={() => setVenda(null)}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-auto w-full max-w-sm rounded-2xl border border-white/10 bg-[#111113] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Vender “{venda.nome}”</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Valor de mercado: {fmt(venda.preco)} moedas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVenda(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                O teu preço
              </span>
              <input
                type="number"
                min="1"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-lg font-black text-white"
              />
            </label>

            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              O mercado passa a valer este valor. Se alguém comprar, recebes as moedas e o item passa
              para essa pessoa.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setVenda(null)}
                className="ui-btn ui-btn-ghost ui-btn-sm flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={anunciar}
                disabled={busy === venda.id}
                className="ui-btn ui-btn-primary ui-btn-sm flex-1 justify-center"
              >
                {busy === venda.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4" />
                )}
                Pôr à venda
              </button>
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </div>
  )
}
