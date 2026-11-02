import { useEffect, useState } from 'react'
import { Loader2, Lock, Sparkles } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { confirmar, toast } from './Feedback'
import MoedaLocaus from './MoedaLocaus'

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

function Arte({ id }) {
  if (id === 'edicao-remember') {
    return (
      <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
        <rect width="160" height="200" fill="#0d0f11" />
        <rect x="12" y="12" width="136" height="176" rx="6" fill="#15181b" stroke="#2a2f34" />
        <rect x="24" y="24" width="112" height="34" rx="3" fill="#0a0c0e" stroke="#23282d" />
        <circle cx="38" cy="41" r="3" fill="#3a4046" />
        <circle cx="50" cy="41" r="3" fill="#3a4046" />
        <circle cx="62" cy="41" r="3" fill="#e25c5c" />
        <circle cx="74" cy="41" r="3" fill="#4ade80" />
        <rect x="100" y="36" width="28" height="10" rx="2" fill="#23282d" />
        <g fill="#20252a">
          <rect x="24" y="70" width="72" height="7" rx="2" />
          <rect x="24" y="83" width="58" height="7" rx="2" />
          <rect x="24" y="96" width="66" height="7" rx="2" />
          <rect x="24" y="109" width="48" height="7" rx="2" />
          <rect x="24" y="122" width="62" height="7" rx="2" />
        </g>
        <text x="80" y="158" textAnchor="middle" fill="#e25c5c" fontSize="13" fontWeight="900" letterSpacing="1.5">
          REMEMBER
        </text>
        <text x="80" y="172" textAnchor="middle" fill="#8a949c" fontSize="6.5" fontWeight="700" letterSpacing="3">
          NO RUSSIAN
        </text>
      </svg>
    )
  }
  if (id === 'edicao-nightops') {
    return (
      <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
        <rect width="160" height="200" fill="#07090a" />
        <circle cx="80" cy="84" r="34" fill="#0f1315" />
        <path d="M46 118c0-24 15-40 34-40s34 16 34 40v46H46z" fill="#0c0f11" />
        <circle cx="70" cy="82" r="2.6" fill="#d9f99d" />
        <circle cx="90" cy="82" r="2.6" fill="#d9f99d" />
        <circle cx="70" cy="82" r="6" fill="#d9f99d" opacity="0.18" />
        <circle cx="90" cy="82" r="6" fill="#d9f99d" opacity="0.18" />
        <rect x="58" y="60" width="44" height="6" rx="3" fill="#151a1d" />
        <text x="80" y="184" textAnchor="middle" fill="#4b555c" fontSize="6.5" fontWeight="800" letterSpacing="3.2">
          NIGHT OPS
        </text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 160 200" className="edicao-svg" aria-hidden="true">
      <rect width="160" height="200" fill="#c9cdd0" />
      <rect width="160" height="120" fill="#d8dcdf" />
      <path d="M0 120 L160 120 L160 132 L0 132 Z" fill="#aeb4b8" />
      <path d="M0 132 L160 132 L160 142 L0 142 Z" fill="#e8ebec" />
      <path d="M0 142 L160 142 L160 200 L0 200 Z" fill="#dfe2e4" />
      <path d="M50 88 L140 100 L140 106 L50 94 Z" fill="#14171a" />
      <path d="M68 84 L118 96 L118 100 L68 88 Z" fill="#14171a" />
      <path d="M84 78 L104 91 L104 95 L84 82 Z" fill="#14171a" />
      <path d="M44 104 L96 110 L96 113 L44 107 Z" fill="#14171a" />
      <path d="M0 150 L30 136 L62 150 L96 134 L132 150 L160 140 L160 200 L0 200 Z" fill="#cdd2d5" />
      <text x="80" y="188" textAnchor="middle" fill="#5b6469" fontSize="6.5" fontWeight="800" letterSpacing="3.6">
        STEALTH
      </text>
    </svg>
  )
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
                  <Arte id={e.id} />
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
