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
    <div className="glass-chip flex items-center gap-2.5 rounded-2xl px-3 py-2.5">
      <MoedaLocaus size={24} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-black uppercase tracking-widest text-amber-200/80">
          Moedas Locaus
        </span>
        <span className="block text-sm font-black tabular-nums text-white">
          {Number(saldo.disponiveis).toLocaleString('pt-PT')}
        </span>
      </span>
    </div>
  )
}
