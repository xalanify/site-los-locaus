import { useEffect, useState } from 'react'
import { Loader2, Lock, Sparkles } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from './Feedback'
import MoedaLocaus from './MoedaLocaus'
import ArteEdicao from './ArteEdicao'

/* ============================================================
   EDIÇÕES LIMITADAS — cartas numeradas (1 de 10, 5 de 10, …).
   Cada compra recebe um número livre aleatório.
   ============================================================ */

const RARIDADE = {
  comum: { nome: 'Comum', cor: '#a1a1aa' },
  raro: { nome: 'Raro', cor: '#60a5fa' },
  epico: { nome: 'Épico', cor: '#c084fc' },
  lendario: { nome: 'Lendário', cor: '#f5c542' },
}

export default function EdicoesLimitadas() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState('')

  const carregar = async () => {
    try {
      const r = await fetch('/api/mercado/edicoes', { headers: authHeaders(), cache: 'no-store' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir as edições.')
      setDados(Array.isArray(d && d.edicoes) ? d.edicoes : [])
      setErro('')
    } catch (e) {
      setErro(e.message)
      setDados([])
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const comprar = async (e) => {
    const ok = await confirmar(
      `Comprar a edição “${e.nome}” por ${e.preco} moedas? O número é sorteado entre os que faltam.`,
      { titulo: 'Comprar edição limitada?', okTexto: 'Comprar', perigoso: false },
    )
    if (!ok) return
    setBusy(e.id)
    try {
      const r = await fetch('/api/mercado/edicoes/comprar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: e.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível comprar.')
      toast.ok(`Saiu-te a ${e.nome} nº ${d.numero} de ${e.total}.`)
      window.dispatchEvent(new Event('locaus:moedas'))
      await carregar()
    } catch (err) {
      toast.erro(err.message)
    } finally {
      setBusy('')
    }
  }

  const vender = async (e, copia) => {
    const ok = await confirmar(
      `Vender a ${e.nome} nº ${copia.numero} de ${e.total}? Perdes essa cópia.`,
      { titulo: 'Vender cópia?', okTexto: 'Vender', perigoso: true },
    )
    if (!ok) return
    setBusy(e.id)
    try {
      const r = await fetch('/api/mercado/edicoes/vender', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ copia_id: copia.id }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível vender.')
      toast.ok(`Vendeste a ${e.nome} nº ${copia.numero} por ${d.recebido} moedas.`)
      window.dispatchEvent(new Event('locaus:moedas'))
      await carregar()
    } catch (err) {
      toast.erro(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-black text-white">
            <Sparkles className="h-4 w-4 text-[#f7a8a8]" /> Edições limitadas
          </h2>
          <p className="text-[11px] font-semibold text-zinc-500">
            Cartas numeradas. Cada compra recebe um número aleatório — o nº 1 é o mais raro.
          </p>
        </div>
      </div>

      {!dados ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#101012]/80 py-10 text-sm text-zinc-500">
          {erro ? erro : <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir as edições…</>}
        </div>
      ) : (
        <div className="edicoes">
          {dados.map((e) => {
            const rar = RARIDADE[e.raridade] || RARIDADE.raro
            const esgotada = e.disponiveis <= 0
            return (
              <article key={e.id} className="edicao">
                <div className="edicao-arte">
                  <ArteEdicao id={e.id} />
                  <img
                    src={`/edicoes/${e.id}.jpg`}
                    alt=""
                    className="edicao-img"
                    loading="lazy"
                    onError={(ev) => {
                      ev.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="edicao-selo" style={{ color: rar.cor, borderColor: `${rar.cor}55` }}>
                    {rar.nome}
                  </span>
                  <span className="edicao-stock">
                    {esgotada ? 'esgotada' : `${e.disponiveis} de ${e.total}`}
                  </span>
                </div>

                <div className="edicao-corpo">
                  <p className="edicao-nome">{e.nome}</p>

                  {e.minhas.length > 0 ? (
                    <div className="edicao-minhas">
                      {e.minhas.map((m) => (
                        <span key={m.id} className="edicao-copia">
                          <b>nº {m.numero}</b>/{e.total}
                          <button
                            type="button"
                            onClick={() => vender(e, m)}
                            disabled={busy === e.id}
                            title={`Vender nº ${m.numero}`}
                          >
                            vender
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="edicao-sub">Ainda não tens nenhuma.</p>
                  )}

                  <div className="edicao-rodape">
                    <span className="edicao-preco">
                      {e.preco} <MoedaLocaus size={12} />
                    </span>
                    <button
                      type="button"
                      onClick={() => comprar(e)}
                      disabled={esgotada || busy === e.id}
                      className="ui-btn ui-btn-primary ui-btn-sm"
                    >
                      {busy === e.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : esgotada ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : null}
                      {esgotada ? 'Esgotada' : 'Comprar'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
