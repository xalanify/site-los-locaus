import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import CartaEnigma from './CartaEnigma'
import { authHeaders } from '../lib/auth'

/* Carta 1/1 do enigma à venda no mercado (só aparece quando o vencedor a põe à venda) */
export default function CartaEnigmaMercado() {
  const [carta, setCarta] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = () =>
    fetch('/api/enigma/carta', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCarta(d))
      .catch(() => {})

  useEffect(() => {
    carregar()
  }, [])

  const comprar = async () => {
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/enigma/carta/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: '{}',
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || !d.ok) throw new Error((d && d.erro) || 'Não consegui comprar.')
      window.dispatchEvent(new Event('locaus:moedas'))
      setMsg('Carta comprada. Já é tua e desapareceu do mercado.')
      carregar()
    } catch (e) {
      setMsg(e.message || 'Não consegui comprar.')
    } finally {
      setBusy(false)
    }
  }

  if (!carta?.existe || !carta.em_venda || carta.souEu) return null

  return (
    <section className="glass relative mb-4 overflow-hidden rounded-3xl p-4 sm:p-5">
      <span className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#8a6b3a]/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-5">
        <div className="w-[150px] shrink-0">
          <CartaEnigma nome={carta.owner} />
        </div>
        <div className="min-w-[220px] flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8b98a]/30 bg-[#d8b98a]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#e4cf9f]">
            <Flame className="h-3 w-3" /> Exclusiva · 1/1
          </span>
          <h3 className="mt-2 font-display text-2xl font-black text-white">Carta do Enigma</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Vencedor do primeiro enigma: <b className="text-zinc-200">{carta.owner}</b>. Só existe
            esta unidade e está à venda por <b className="text-[#f5c542]">{carta.preco} moedas</b>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={comprar}
              disabled={busy}
              className="ui-btn ui-btn-primary"
            >
              {busy ? 'A comprar…' : `Comprar por ${carta.preco} moedas`}
            </button>
            <span className="text-[11px] text-zinc-500">Fica só tua — deixa de estar no mercado.</span>
          </div>
          {msg && <p className="mt-2 text-[11px] text-[#e4cf9f]">{msg}</p>}
        </div>
      </div>
    </section>
  )
}
