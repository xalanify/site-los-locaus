import { useEffect, useState } from 'react'
import { Loader2, Coins, RefreshCw, TrendingUp, TrendingDown, Package, Users } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { toast } from './Feedback'

/* ============================================================
   Admin → Economia
   Moedas em circulação, fortunas, itens e inflação da semana.
   ============================================================ */

const fmt = (n) => Number(n || 0).toLocaleString('pt-PT')

export default function AdminEconomia() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)

  const carregar = async () => {
    try {
      const r = await fetch('/api/mercado/admin/economia', {
        headers: authHeaders(),
        cache: 'no-store',
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir a economia.')
      setDados(d)
      setErro('')
    } catch (e) {
      setErro(e.message)
    }
  }

  useEffect(() => {
    carregar()
    fetch('/api/users/list', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUsers(Array.isArray(d?.users) ? d.users : []))
      .catch(() => {})
  }, [])

  const aplicar = async () => {
    if (!userId) return toast.erro('Escolhe um membro.')
    const n = Math.round(Number(valor))
    if (!Number.isFinite(n) || n === 0) return toast.erro('Escreve um valor (pode ser negativo).')
    setBusy(true)
    try {
      const r = await fetch('/api/mercado/admin/moedas', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(userId), valor: n, motivo }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível aplicar.')
      toast.ok(`${n > 0 ? '+' : ''}${n} moedas a ${d.user}.`)
      setValor('')
      setMotivo('')
      await carregar()
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!dados) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-sm text-zinc-400">
        {erro ? (
          erro
        ) : (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> A calcular a economia…
          </>
        )}
      </div>
    )
  }

  const sem = dados.semana || {}
  const positivo = (sem.liquido || 0) >= 0

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
            <Coins className="h-3 w-3" /> Em circulação
          </span>
          <span className="mt-1 block font-display text-2xl font-black text-white">
            {fmt(dados.circulacao.total)}
          </span>
          <span className="text-[10px] text-zinc-500">média {fmt(dados.circulacao.media)}/membro</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
            <Users className="h-3 w-3" /> Membros
          </span>
          <span className="mt-1 block font-display text-2xl font-black text-white">
            {fmt(dados.circulacao.membros)}
          </span>
          <span className="text-[10px] text-zinc-500">com conta</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
            <Package className="h-3 w-3" /> Itens
          </span>
          <span className="mt-1 block font-display text-2xl font-black text-white">
            {fmt(dados.itens.total)}
          </span>
          <span className="text-[10px] text-zinc-500">{fmt(dados.itens.unicos)} únicos</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
            {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{' '}
            Inflação 7 dias
          </span>
          <span
            className={`mt-1 block font-display text-2xl font-black ${
              positivo ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {positivo ? '+' : ''}
            {fmt(sem.liquido)}
          </span>
          <span className="text-[10px] text-zinc-500">
            +{fmt(sem.criadas)} criadas · −{fmt(sem.destruidas)} gastas
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">Top 10 fortunas</h3>
            <button type="button" onClick={carregar} className="text-[11px] font-bold text-zinc-400 hover:text-white">
              <RefreshCw className="mr-1 inline h-3 w-3" /> atualizar
            </button>
          </div>
          <ul className="space-y-1">
            {dados.fortunas.map((f, i) => (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-1.5 text-[11px]"
              >
                <span className="w-5 shrink-0 text-center font-black text-zinc-500">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-white">{f.username}</span>
                <span className="shrink-0 text-[10px] text-zinc-500">
                  {fmt(f.acertos)} acertos · {fmt(f.creditos)} mercado
                </span>
                <span className="w-16 shrink-0 text-right font-black tabular-nums text-amber-200">
                  {fmt(f.disponivel)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <h3 className="text-sm font-black text-white">Dar / retirar moedas</h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Valor positivo dá moedas; negativo retira. Fica registado no extrato com o motivo.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">Escolher membro…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex.: 50 ou -20"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </div>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (ex.: prémio do torneio)"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={aplicar}
              disabled={busy}
              className="ui-btn ui-btn-primary ui-btn-sm mt-2 w-full justify-center"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              Aplicar
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-zinc-400">
            <p>
              <b className="text-white">{fmt(dados.tesouro)}</b> moedas no tesouro ·{' '}
              <b className="text-white">{fmt(dados.anuncios)}</b> anúncios ativos
            </p>
            <p>
              <b className="text-white">{fmt(dados.packs.dados)}</b> packs dados ·{' '}
              <b className="text-white">{fmt(dados.packs.abertos)}</b> abertos
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              O tesouro paga as compras automáticas; enche com a taxa de 3% de cada venda. A
              inflação conta o mercado e as compras; os acertos das previsões não têm data e não
              entram neste número.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
