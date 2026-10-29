import { useEffect, useState } from 'react'
import { authHeaders } from '../lib/auth'
import MoedaLocaus from './MoedaLocaus'

/* ============================================================
   Indicador de Moedas Locaus (sidebar)
   1 acerto = 1 moeda. O saldo é o mesmo da loja de cosméticos.
   ============================================================ */
export default function SaldoMoedas({ user }) {
  const [saldo, setSaldo] = useState(null)

  useEffect(() => {
    if (!user) {
      setSaldo(null)
      return
    }
    let vivo = true
    const carregar = () => {
      fetch('/api/cosmeticos/saldo', { headers: authHeaders(), cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (vivo && d) setSaldo(d)
        })
        .catch(() => {})
    }
    carregar()
    const aoMudar = () => carregar()
    window.addEventListener('locaus:moedas', aoMudar)
    const t = setInterval(carregar, 60000)
    return () => {
      vivo = false
      window.removeEventListener('locaus:moedas', aoMudar)
      clearInterval(t)
    }
  }, [user])

  if (!user || !saldo) return null

  return (
    <div className="glass flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400/10 ring-1 ring-amber-300/25">
        <MoedaLocaus size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/80">
          Moedas Locaus
        </span>
        <span className="block text-lg font-black tabular-nums leading-tight text-white">
          {Number(saldo.disponiveis).toLocaleString('pt-PT')}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-400 ring-1 ring-white/10">
        saldo
      </span>
    </div>
  )
}
