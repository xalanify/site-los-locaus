import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, ArrowDownRight, ArrowUpRight, History, Tag } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import MoedaLocaus from './MoedaLocaus'

/* ============================================================
   HISTÓRICO — todas as compras e vendas do mercado.
   ============================================================ */

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('pt-PT')

const dataHora = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Historico() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [scope, setScope] = useState('meu')
  const [users, setUsers] = useState([])
  const [userFiltro, setUserFiltro] = useState('')

  const carregar = async () => {
    try {
      const query =
        scope === 'meu' ? '/api/mercado/historico?meu=1&limit=500' : '/api/mercado/historico?limit=300'
      const r = await fetch(query, {
        headers: authHeaders(),
        cache: 'no-store',
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir o histórico.')
      setDados(d)
      setErro('')
    } catch (e) {
      setErro(e.message)
      setDados({ vendas: [] })
    }
  }

  useEffect(() => {
    carregar()
    fetch('/api/users/list', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUsers(Array.isArray(d?.users) ? d.users : []))
      .catch(() => {})
    const t = setInterval(carregar, 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const vendas = useMemo(() => {
    let lista = (dados && dados.vendas) || []
    if (filtro === 'compras') lista = lista.filter((v) => v.tipo === 'compra')
    if (filtro === 'vendas') lista = lista.filter((v) => v.tipo === 'venda')
    if (userFiltro) {
      lista = lista.filter((v) => v.username === userFiltro || v.contraparte === userFiltro)
    }
    return lista
  }, [dados, filtro, userFiltro])

  const resumo = useMemo(() => {
    const lista = (dados && dados.vendas) || []
    let compras = 0
    let vendasN = 0
    let gasto = 0
    let recebido = 0
    lista.forEach((v) => {
      if (v.tipo === 'compra') {
        compras += 1
        gasto += v.preco
      } else {
        vendasN += 1
        recebido += v.preco
      }
    })
    return { compras, vendas: vendasN, gasto, recebido }
  }, [dados])

  const anuncios = useMemo(() => {
    let lista = (dados && dados.anuncios) || []
    if (userFiltro) lista = lista.filter((a) => a.username === userFiltro)
    return lista
  }, [dados, userFiltro])

  if (!dados) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-20 text-sm text-gray-400">
        {erro ? (
          erro
        ) : (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> A abrir o histórico…
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="toolbar mb-3">
        <div className="ui-tabs toolbar-tabs">
          {[
            { id: 'meu', nome: 'As minhas' },
            { id: 'todas', nome: 'Todas' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              data-active={scope === s.id}
              className="ui-tab"
            >
              {s.nome}
            </button>
          ))}
        </div>
        <div className="toolbar-acoes">
          <button type="button" onClick={carregar} className="ui-btn ui-btn-ghost ui-btn-sm">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </div>

      <div className="toolbar mb-4">
        <div className="ui-tabs toolbar-tabs">
          {[
            { id: 'todos', nome: 'Tudo' },
            { id: 'compras', nome: 'Compras' },
            { id: 'vendas', nome: 'Vendas' },
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
        {scope === 'todas' && (
          <div className="toolbar-acoes">
            <label className="select-regiao">
              <select
                value={userFiltro}
                onChange={(e) => setUserFiltro(e.target.value)}
                aria-label="Filtrar por membro"
              >
                <option value="">Todos os membros</option>
                {users.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.username}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {scope === 'meu' && (
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-400">
          <span className="page-nota">
            <ArrowDownRight className="h-3 w-3" /> {resumo.compras} compra{resumo.compras === 1 ? '' : 's'} ·{' '}
            {fmt(resumo.gasto)}
          </span>
          <span className="page-nota">
            <ArrowUpRight className="h-3 w-3" /> {resumo.vendas} venda{resumo.vendas === 1 ? '' : 's'} ·{' '}
            {fmt(resumo.recebido)}
          </span>
        </div>
      )}

      {vendas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <History className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-bold text-white">
            {scope === 'meu' ? 'Ainda não fizeste movimentos' : 'Ainda sem movimentos'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {scope === 'meu'
              ? 'As tuas compras e vendas no mercado ficam guardadas aqui para sempre.'
              : 'Assim que houver compras ou vendas, aparecem aqui.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {vendas.map((v, i) => {
            const compra = v.tipo === 'compra'
            return (
              <li
                key={`${v.item_id}-${v.em}-${i}`}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-[#101012]/70 px-3 py-2 text-[11px]"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    compra ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'
                  }`}
                >
                  {compra ? (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-white">{v.nome}</span>
                  <span className="block truncate text-[10px] text-zinc-500">
                    {compra ? 'comprado por' : 'vendido por'} {v.username}
                    {v.contraparte ? ` → ${v.contraparte}` : ''}
                  </span>
                </span>

                <span className="w-14 shrink-0 text-right text-[10px] text-zinc-600">
                  {dataHora(v.em)}
                </span>
                <span
                  className={`flex w-20 shrink-0 items-center justify-end gap-1 text-right font-black tabular-nums ${
                    compra ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {fmt(v.preco)}
                  <MoedaLocaus size={11} />
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {anuncios.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Itens à venda
          </p>
          <ul className="space-y-1">
            {anuncios.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-[#101012]/70 px-3 py-2 text-[11px]"
              >
                <Tag className="h-3.5 w-3.5 shrink-0 text-[#f7a8a8]" />
                <span className="min-w-0 flex-1 truncate font-bold text-white">{a.nome}</span>
                <span className="shrink-0 text-zinc-500">@{a.username}</span>
                <span className="w-20 shrink-0 text-right font-black tabular-nums text-white">
                  {fmt(a.preco)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
