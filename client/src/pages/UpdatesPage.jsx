import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users, Loader2 } from 'lucide-react'
import { BADGES, BadgeGem, OVERCLOCK_BADGES } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'

/* ============================================================
   Página Distinções
   ------------------------------------------------------------
   Mostra TODAS as distinções que existem no site (as normais
   e as de overclock automáticas), com a lista de quem já as
   tem. Sem histórico de atualizações nem notícias dos jogos.
   ============================================================ */

export default function UpdatesPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/users/list', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!alive) return
        setUsers(Array.isArray(d) ? d : d?.users || [])
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // Map badge id -> array de usernames que o têm
  const holders = useMemo(() => {
    const m = {}
    for (const u of users) {
      const bs = Array.isArray(u.badges) ? u.badges : []
      for (const b of bs) {
        if (!m[b]) m[b] = []
        m[b].push(u.username || u.name || 'utilizador')
      }
    }
    return m
  }, [users])

  const renderGroup = (title, subtitle, list, accent = 'violet') => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass mb-8 rounded-3xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <Trophy className="h-6 w-6 shrink-0 text-violet-400" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((b) => {
          const hs = holders[b.id] || []
          return (
            <div
              key={b.id}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                <BadgeGem badge={b} size={44} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-black uppercase tracking-wide text-white">
                  {b.label}
                </p>
                {b.desc && (
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{b.desc}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )

  return (
    <section className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-black gradient-text" style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}>
            Distinções
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Todas as insígnias do site e quem já as tem. Aparecem no perfil de cada conta.
          </p>
        </motion.div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> a carregar detentores…
          </div>
        )}

        {renderGroup(
          'Distinções',
          'Insígnias que existem no site — cada uma com a sua cor.',
          BADGES,
        )}
        {renderGroup(
          'Overclock (automáticas)',
          'Ganhas conforme as specs reais: CPU acima do de fábrica, memórias com overclock e/ou XMP ligado.',
          OVERCLOCK_BADGES,
        )}
      </div>
    </section>
  )
}
