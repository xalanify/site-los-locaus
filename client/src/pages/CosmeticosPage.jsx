import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Palette,
  CreditCard,
  Sparkles,
  Loader2,
  Check,
  Lock,
  ShoppingBag,
  RefreshCw,
  X,
  Clock,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from '../components/Feedback'
import { classesNome } from '../data/nomeEfeitos'
import MoedaLocaus from '../components/MoedaLocaus'
import ProfileCard from '../components/ProfileCard'
import ProfileStylePreview from '../components/ProfileStylePreview'

/* ============================================================
   LOJA DE COSMÉTICOS — aberta a todos os membros
   ------------------------------------------------------------
   Paga-se com acertos das previsões (R6 + CS2). Comprar desconta
   os acertos disponíveis; a classificação total continua igual.
   Só há cores de nome, cartas e estilos de perfil. Os estilos
   estão "Em breve" e ainda não podem ser comprados.
   ============================================================ */

const TIPOS = [
  { id: 'cor', nome: 'Cores de nome', Icon: Palette },
  { id: 'carta', nome: 'Cartas', Icon: CreditCard },
  { id: 'estilo', nome: 'Estilo de perfil', Icon: Sparkles },
]

export default function CosmeticosPage({ isAdmin }) {
  const [dados, setDados] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [tipo, setTipo] = useState('cor')
  const [aComprar, setAComprar] = useState('')
  const [aAplicar, setAAplicar] = useState('')
  const [zoom, setZoom] = useState(null)

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const r = await fetch('/api/cosmeticos', { headers: authHeaders() })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir a loja.')
      setDados(d)
    } catch (e) {
      setErro(e.message || 'Sem ligação ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {})
  }, [])

  const itens = useMemo(
    () => ((dados && dados.itens) || []).filter((x) => x.tipo === tipo),
    [dados, tipo],
  )

  const comprar = async (item) => {
    if (!dados || dados.disponiveis < item.custo) return
    const ok = await confirmar(
      `Vais gastar ${item.custo} Moeda(s) Locaus em “${item.nome}”. A tua classificação total não muda.`,
      { titulo: 'Comprar cosmético?', okTexto: 'Comprar', perigoso: false },
    )
    if (!ok) return
    setAComprar(item.id)
    try {
      const r = await fetch('/api/cosmeticos/comprar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível comprar.')
      setDados(d)
      window.dispatchEvent(new Event('locaus:moedas'))
      toast.ok(`${item.nome} comprado!`)
    } catch (e) {
      toast.erro(e.message || 'Não foi possível comprar.')
    } finally {
      setAComprar('')
    }
  }

  const aplicar = async (item) => {
    setAAplicar(item.id)
    try {
      const r = await fetch('/api/cosmeticos/aplicar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível aplicar.')
      setDados(d)
      toast.ok(`${item.nome} aplicado ao teu perfil.`)
    } catch (e) {
      toast.erro(e.message || 'Não foi possível aplicar.')
    } finally {
      setAAplicar('')
    }
  }

  if (!dados && erro) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-gray-500" />
          <h1 className="mt-3 text-lg font-black text-white">Loja de cosméticos</h1>
          <p className="mt-1 text-sm text-gray-400">{erro}</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-black text-white sm:text-3xl">
              Loja de <span className="gradient-text">cosméticos</span>
              <span className="rounded-full bg-[#ff9e9e] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1a0f0f]">
                Novo
              </span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Cores e camuflagens para o nome, cartas e estilos de perfil, pagos com Moedas
              Locaus. Cada acerto nas previsões vale 1 moeda — os acertos continuam a contar para
              a classificação, só as moedas é que são gastas.
            </p>
          </div>
          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        {erro && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
            <span>{erro}</span>
            <button
              type="button"
              onClick={carregar}
              className="flex items-center gap-1 rounded-lg border border-red-300/30 bg-red-500/15 px-2 py-1 text-[10px] font-black text-red-100"
            >
              <RefreshCw className="h-3 w-3" /> Tentar outra vez
            </button>
          </div>
        )}

        {loading && !dados ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-20 text-sm text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-zinc-400" /> A abrir a loja…
          </div>
        ) : dados ? (
          <>
            {/* saldo */}
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <Saldo
                icon={MoedaLocaus}
                rotulo="Moedas ganhas"
                valor={dados.acertos}
                nota="1 acerto = 1 moeda"
                cor="amber"
              />
              <Saldo
                icon={ShoppingBag}
                rotulo="Moedas gastas"
                valor={dados.gastos}
                nota="em cosméticos"
                cor="violet"
              />
              <Saldo
                icon={MoedaLocaus}
                rotulo="Moedas Locaus"
                valor={dados.disponiveis}
                nota="disponíveis para gastar"
                cor="emerald"
                destaque
              />
            </div>

            {/* tabs */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-black transition sm:text-xs ${
                    tipo === t.id
                      ? 'border-[#ff9e9e]/40 bg-[#ff9e9e]/10 text-[#ff9e9e]'
                      : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <t.Icon className="h-4 w-4 shrink-0" /> {t.nome}
                </button>
              ))}
            </div>

            {/* grelha */}
            <div className="grid gap-3 sm:grid-cols-2">
              {itens.map((item) => (
                <Cartao
                  key={item.id}
                  item={item}
                  perfilPreview={{ ...(me || {}), ...((dados && dados.perfil) || {}) }}
                  disponiveis={dados.disponiveis}
                  aComprar={aComprar === item.id}
                  aAplicar={aAplicar === item.id}
                  onComprar={() => comprar(item)}
                  onAplicar={() => aplicar(item)}
                  onZoom={() => setZoom(item)}
                />
              ))}
            </div>

            <p className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-gray-500">
              Os cosméticos são permanentes na tua conta. Se comprares algo que já tens, não é
              cobrado outra vez. Cada acerto nas previsões vale 1 Moeda Locaus; os acertos
              continuam a somar na classificação e a loja só gasta as moedas.
            </p>
          </>
        ) : null}
      </motion.div>

      {zoom && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-[560px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="absolute -right-1 -top-1 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="origin-center scale-[0.92] sm:scale-100">
              <ProfileCard
                perfil={{ ...(me || {}), ...((dados && dados.perfil) || {}), card_style: zoom.valor }}
                variant={zoom.valor}
                jogos={[
                  ...new Set([
                    ...((me && me.game_accounts) || []),
                    ...Object.keys((me && me.game_ranks) || {}),
                  ]),
                ].filter((g) => g !== 'csgo')}
                className="w-full"
              />
            </div>
            <p className="mt-3 text-center text-xs font-bold text-zinc-300">{zoom.nome}</p>
          </div>
        </div>
      )}
    </PageShell>
  )
}

function Saldo({ icon: Icon, rotulo, valor, nota, cor, destaque }) {
  const cores = {
    violet: 'border-white/10 bg-white/[0.035] text-zinc-300',
    amber: 'border-white/10 bg-white/[0.035] text-zinc-300',
    emerald:
      'border-amber-300/25 bg-amber-400/[0.06] text-amber-100 shadow-[0_0_30px_rgba(245,197,66,0.08)]',
  }
  return (
    <div
      className={`rounded-2xl border px-4 py-3 backdrop-blur-md ${cores[cor] || cores.violet}`}
    >
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider opacity-80">
        <Icon className="h-3 w-3" /> {rotulo}
      </span>
      <span className={`mt-1 block font-display text-2xl font-black tabular-nums ${destaque ? 'text-white' : 'text-white/90'}`}>
        {valor}
      </span>
      <span className="text-[10px] font-semibold opacity-70">{nota}</span>
    </div>
  )
}

function Cartao({
  item,
  perfilPreview,
  disponiveis,
  aComprar,
  aAplicar,
  onComprar,
  onAplicar,
  onZoom,
}) {
  const falta = Math.max(0, item.custo - disponiveis)
  const emBreve = Boolean(item.emBreve)
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[#121214]/80 ${
        item.equipado
          ? 'border-emerald-400/30 shadow-lg shadow-emerald-950/20'
          : 'border-white/10'
      }`}
    >
      {/* pré-visualização */}
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-500/10 via-black/20 to-black/40 p-3 ${
          item.tipo === 'carta' ? 'h-48' : item.tipo === 'estilo' ? 'h-40' : 'h-32'
        }`}
      >
        {item.tipo === 'estilo' ? (
          <ProfileStylePreview
            style={item.valor}
            nome={(perfilPreview && perfilPreview.username) || 'O teu nome'}
          />
        ) : item.tipo === 'carta' ? (
          <button
            type="button"
            onClick={onZoom}
            title="Clicar para ampliar a carta"
            className="group/carta relative flex h-full w-full cursor-zoom-in items-center justify-center"
          >
            <div className="origin-center scale-[0.38] transition-transform duration-200 group-hover/carta:scale-[0.41]">
              <ProfileCard
                perfil={{ ...(perfilPreview || {}), card_style: item.valor }}
                variant={item.valor}
                jogos={[
                  ...new Set([
                    ...((perfilPreview && perfilPreview.game_accounts) || []),
                    ...Object.keys((perfilPreview && perfilPreview.game_ranks) || {}),
                  ]),
                ].filter((g) => g !== 'csgo')}
                className="w-[360px]"
              />
            </div>
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-zinc-200 ring-1 ring-white/15">
              Clicar para ampliar
            </span>
          </button>
        ) : (
          <span
            className={`px-2 text-center text-2xl font-black leading-tight ${classesNome(item.tipo === 'cor' ? item.valor : '', '')}`}
            style={item.tipo === 'cor' && !item.textura ? { color: item.cor } : undefined}
          >
            {item.nome}
          </span>
        )}
        {emBreve && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
            <Clock className="h-2.5 w-2.5" /> Em breve
          </span>
        )}
        {item.equipado && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
            <Check className="h-2.5 w-2.5" /> Em uso
          </span>
        )}
        {item.comprado && !item.equipado && (
          <span className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-gray-300 ring-1 ring-white/15">
            Comprado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-black leading-tight text-white">{item.nome}</p>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-black text-zinc-200 ring-1 ring-zinc-400/20">
            <MoedaLocaus size={12} /> {item.custo}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-500">
          {item.tipo === 'estilo'
            ? 'Estilo de perfil · em breve'
            : item.tipo === 'carta'
              ? 'Carta de perfil'
              : item.textura
                ? 'Camuflagem no nome'
                : 'Cor de nome'}
        </p>

        <div className="mt-auto pt-3">
          {emBreve ? (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-amber-400/10 py-2 text-[11px] font-black text-amber-300 ring-1 ring-amber-400/25"
            >
              <Clock className="h-3 w-3" /> Em breve
            </button>
          ) : item.equipado ? (
            <button
              type="button"
              disabled
              className="w-full rounded-xl bg-emerald-500/15 py-2 text-[11px] font-black text-emerald-300 ring-1 ring-emerald-400/20"
            >
              Em uso no perfil
            </button>
          ) : item.comprado ? (
            <button
              type="button"
              onClick={onAplicar}
              disabled={aAplicar}
              className="ui-btn ui-btn-primary ui-btn-sm w-full"
            >
              {aAplicar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Aplicar no perfil
            </button>
          ) : (
            <button
              type="button"
              onClick={onComprar}
              disabled={falta > 0 || aComprar}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black transition ${
                falta > 0
                  ? 'cursor-not-allowed bg-white/5 text-gray-500 ring-1 ring-white/10'
                  : 'bg-gradient-to-r from-zinc-600 to-zinc-500 text-white hover:brightness-110'
              }`}
            >
              {aComprar ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : falta > 0 ? (
                <Lock className="h-3 w-3" />
              ) : (
                <ShoppingBag className="h-3 w-3" />
              )}
              {falta > 0 ? `Faltam ${falta} moeda(s)` : `Comprar · ${item.custo} moedas`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
