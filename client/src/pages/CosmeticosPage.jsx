import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Palette,
  Wand2,
  Image as ImageIcon,
  Loader2,
  Check,
  Lock,
  Trophy,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from '../components/Feedback'
import { classesNome } from '../data/nomeEfeitos'

/* ============================================================
   LOJA DE COSMÉTICOS — só admin
   ------------------------------------------------------------
   Paga-se com acertos das previsões (R6 + CS2). Comprar desconta
   os acertos disponíveis; a classificação total continua igual.
   ============================================================ */

const TIPOS = [
  { id: 'cor', nome: 'Cores de nome', Icon: Palette },
  { id: 'efeito', nome: 'Efeitos', Icon: Wand2 },
  { id: 'banner', nome: 'Banners', Icon: ImageIcon },
]

export default function CosmeticosPage({ isAdmin }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [tipo, setTipo] = useState('cor')
  const [aComprar, setAComprar] = useState('')
  const [aAplicar, setAAplicar] = useState('')

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
  }, [])

  const itens = useMemo(
    () => ((dados && dados.itens) || []).filter((x) => x.tipo === tipo),
    [dados, tipo],
  )

  const comprar = async (item) => {
    if (!dados || dados.disponiveis < item.custo) return
    const ok = await confirmar(
      `Vais gastar ${item.custo} acerto(s) em “${item.nome}”. A tua classificação total não muda.`,
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

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-gray-500" />
          <h1 className="mt-3 text-lg font-black text-white">Loja de cosméticos</h1>
          <p className="mt-1 text-sm text-gray-400">Esta loja ainda está reservada aos administradores.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
              Loja de <span className="gradient-text">cosméticos</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Cores, efeitos e banners pagos com os teus acertos das previsões. Comprar gasta os
              acertos disponíveis, mas a classificação total mantém todos os acertos.
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
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#0f0a1a]/80 py-20 text-sm text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> A abrir a loja…
          </div>
        ) : dados ? (
          <>
            {/* saldo */}
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <Saldo
                icon={Trophy}
                rotulo="Acertos totais"
                valor={dados.acertos}
                nota="contam sempre na classificação"
                cor="violet"
              />
              <Saldo
                icon={ShoppingBag}
                rotulo="Já gastos"
                valor={dados.gastos}
                nota="em cosméticos"
                cor="amber"
              />
              <Saldo
                icon={Sparkles}
                rotulo="Disponíveis"
                valor={dados.disponiveis}
                nota="para gastar agora"
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
                      ? 'border-violet-400/40 bg-violet-500/20 text-white'
                      : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <t.Icon className="h-4 w-4 shrink-0" /> {t.nome}
                </button>
              ))}
            </div>

            {/* grelha */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {itens.map((item) => (
                <Cartao
                  key={item.id}
                  item={item}
                  disponiveis={dados.disponiveis}
                  aComprar={aComprar === item.id}
                  aAplicar={aAplicar === item.id}
                  onComprar={() => comprar(item)}
                  onAplicar={() => aplicar(item)}
                />
              ))}
            </div>

            <p className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-gray-500">
              Os cosméticos são permanentes na tua conta. Se comprares algo que já tens, não é
              cobrado outra vez. A classificação das previsões continua a somar todos os acertos —
              esta loja só usa os acertos como moeda.
            </p>
          </>
        ) : null}
      </motion.div>
    </PageShell>
  )
}

function Saldo({ icon: Icon, rotulo, valor, nota, cor, destaque }) {
  const cores = {
    violet: 'border-violet-400/20 bg-violet-500/[0.08] text-violet-300',
    amber: 'border-amber-400/20 bg-amber-500/[0.08] text-amber-300',
    emerald: 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300',
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 ${cores[cor] || cores.violet}`}>
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

function Cartao({ item, disponiveis, aComprar, aAplicar, onComprar, onAplicar }) {
  const falta = Math.max(0, item.custo - disponiveis)
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[#0f0a1a]/80 ${
        item.equipado
          ? 'border-emerald-400/30 shadow-lg shadow-emerald-950/20'
          : 'border-white/10'
      }`}
    >
      {/* pré-visualização */}
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-500/10 via-black/20 to-black/40 p-3">
        {item.tipo === 'banner' ? (
          <img
            src={item.preview}
            alt={item.nome}
            loading="lazy"
            className="h-full w-full rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <span
            className={`text-xl font-black ${classesNome(item.tipo === 'cor' ? item.valor : '', item.tipo === 'efeito' ? item.valor : '')}`}
            style={item.tipo === 'cor' ? { color: item.cor } : undefined}
          >
            {item.nome}
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
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-black text-violet-200 ring-1 ring-violet-400/20">
            <Trophy className="h-2.5 w-2.5" /> {item.custo}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-500">
          {item.tipo === 'cor' ? 'Cor de nome' : item.tipo === 'efeito' ? 'Efeito no nome' : 'Banner do perfil'}
        </p>

        <div className="mt-auto pt-3">
          {item.equipado ? (
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
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-500 py-2 text-[11px] font-black text-white transition hover:bg-violet-400 disabled:opacity-60"
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
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:brightness-110'
              }`}
            >
              {aComprar ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : falta > 0 ? (
                <Lock className="h-3 w-3" />
              ) : (
                <ShoppingBag className="h-3 w-3" />
              )}
              {falta > 0 ? `Faltam ${falta} acerto(s)` : `Comprar · ${item.custo} acertos`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
