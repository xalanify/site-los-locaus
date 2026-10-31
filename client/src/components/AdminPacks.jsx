import { useEffect, useState } from 'react'
import { Gift, Loader2, Coins } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from './Feedback'

/* ============================================================
   Admin → Locaus Packs
   Dá packs a um membro (ele abre-os na loja).
   ============================================================ */

const TIPOS = [
  { id: 'basico', nome: 'Básico', desc: 'Comum na maioria' },
  { id: 'epico', nome: 'Épico', desc: 'Melhores probabilidades' },
  { id: 'lendario', nome: 'Lendário', desc: 'Só épico ou lendário' },
]

export default function AdminPacks() {
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [tipo, setTipo] = useState('basico')
  const [qtd, setQtd] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [limparId, setLimparId] = useState('')
  const [busyLimpar, setBusyLimpar] = useState(false)
  const [msgLimpar, setMsgLimpar] = useState('')

  useEffect(() => {
    fetch('/api/users/list', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUsers(Array.isArray(d?.users) ? d.users : []))
      .catch(() => {})
  }, [])

  const dar = async () => {
    if (!userId) return toast.erro('Escolhe um membro.')
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/mercado/packs/dar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(userId), tipo, quantidade: Number(qtd) }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível dar os packs.')
      const texto = `${d.quantidade} pack(s) ${d.tipo} dados a ${d.user}.`
      setMsg(texto)
      toast.ok(texto)
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusy(false)
    }
  }

  const limpar = async () => {
    if (!limparId) return toast.erro('Escolhe um membro.')
    const alvo = users.find((u) => String(u.id) === String(limparId))
    const ok = await confirmar(
      `Apagar todos os cosméticos que ${alvo?.username || 'este membro'} ganhou em packs? As compras do mercado ficam.`,
      { titulo: 'Limpar itens dos packs?', okTexto: 'Apagar', perigoso: true },
    )
    if (!ok) return
    setBusyLimpar(true)
    setMsgLimpar('')
    try {
      const r = await fetch('/api/mercado/packs/limpar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(limparId) }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível limpar.')
      const texto = `${d.removidos} item(ns) removido(s) de ${d.user}.`
      setMsgLimpar(texto)
      toast.ok(texto)
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusyLimpar(false)
    }
  }

  const limparTudo = async (tipo) => {
    if (!limparId) return toast.erro('Escolhe um membro.')
    const alvo = users.find((u) => String(u.id) === String(limparId))
    const textos = {
      'limpar-creditos': ['Apagar os créditos das vendas', 'Apagar'],
      'limpar-itens': ['Apagar TODOS os cosméticos', 'Apagar'],
      'limpar-packs': ['Retirar todos os packs', 'Retirar'],
    }
    const [pergunta, okTexto] = textos[tipo] || ['Limpar', 'Limpar']
    const ok = await confirmar(`${pergunta} de ${alvo?.username || 'este membro'}?`, {
      titulo: 'Confirmar limpeza',
      okTexto,
      perigoso: true,
    })
    if (!ok) return
    setBusyLimpar(true)
    setMsgLimpar('')
    try {
      const r = await fetch(`/api/mercado/admin/${tipo}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(limparId) }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível limpar.')
      const n = d.creditos ?? d.itens ?? d.packs ?? 0
      const texto = `${n} removido(s) de ${d.user}.`
      setMsgLimpar(texto)
      toast.ok(texto)
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBusyLimpar(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <Gift className="h-4 w-4 text-[#f7a8a8]" /> Dar Locaus Packs
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          O membro recebe os packs e abre-os na loja (aba <b>Packs</b>). A raridade sai na hora de
          abrir.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Membro
            </span>
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
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Quantidade
            </span>
            <input
              type="number"
              min="1"
              max="50"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                tipo === t.id
                  ? 'border-[#f7a8a8]/50 bg-[#f7a8a8]/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <span className="block text-sm font-black text-white">{t.nome}</span>
              <span className="block text-[10px] text-zinc-500">{t.desc}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={dar}
          disabled={busy}
          className="ui-btn ui-btn-primary ui-btn-sm mt-4 w-full justify-center"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          Dar packs
        </button>

        {msg && <p className="mt-2 text-center text-[11px] font-bold text-emerald-300">{msg}</p>}
      </div>

      <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <Gift className="h-4 w-4 text-red-300" /> Limpar itens ganhos em packs
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Remove só os cosméticos que vieram de packs. As compras do mercado e as do tempo da loja
          ficam na conta. Se algum estava equipado, volta ao padrão.
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Membro
            </span>
            <select
              value={limparId}
              onChange={(e) => setLimparId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="">Escolher membro…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={limpar}
            disabled={busyLimpar}
            className="ui-btn ui-btn-ghost ui-btn-sm"
          >
            {busyLimpar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Limpar
          </button>
        </div>

        {msgLimpar && (
          <p className="mt-2 text-[11px] font-bold text-emerald-300">{msgLimpar}</p>
        )}
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <Coins className="h-4 w-4 text-amber-300" /> Limpeza total
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Usa o membro escolhido na caixa acima. Cada botão pede confirmação.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => limparTudo('limpar-creditos')}
            disabled={busyLimpar}
            className="ui-btn ui-btn-ghost ui-btn-sm justify-center"
          >
            <Coins className="h-4 w-4" /> Créditos de vendas
          </button>
          <button
            type="button"
            onClick={() => limparTudo('limpar-itens')}
            disabled={busyLimpar}
            className="ui-btn ui-btn-ghost ui-btn-sm justify-center"
          >
            <Gift className="h-4 w-4" /> Todos os cosméticos
          </button>
          <button
            type="button"
            onClick={() => limparTudo('limpar-packs')}
            disabled={busyLimpar}
            className="ui-btn ui-btn-ghost ui-btn-sm justify-center"
          >
            <Gift className="h-4 w-4" /> Todos os packs
          </button>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500">
        Probabilidades: <b>Básico</b> 70% comum · 22% raro · 7% épico · 1% lendário. <b>Épico</b>{' '}
        30/45/22/3. <b>Lendário</b> 5/25/45/25. Se o membro já tiver o item, recebe metade do valor
        em moedas.
      </p>
    </div>
  )
}
