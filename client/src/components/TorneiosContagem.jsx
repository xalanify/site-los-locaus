import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, X } from 'lucide-react'

/* ============================================================
   Contagem regressiva até aos próximos grandes torneios
   (R6, CS2, Fortnite). Os dados vêm da API de previsões —
   os próximos jogos de cada jogo. Se não houver, esconde.
   ============================================================ */

const JOGOS = [
  { id: 'r6', nome: 'Rainbow Six', cor: 'from-orange-500 to-amber-500', txt: 'text-orange-300' },
  { id: 'cs2', nome: 'CS2', cor: 'from-yellow-500 to-amber-600', txt: 'text-yellow-300' },
  { id: 'fortnite', nome: 'Fortnite', cor: 'from-zinc-500 to-zinc-500', txt: 'text-zinc-300' },
]

function tempoPara(iso) {
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return null
  const dias = Math.floor(diff / 86400000)
  const horas = Math.floor((diff % 86400000) / 3600000)
  const min = Math.floor((diff % 3600000) / 60000)
  const seg = Math.floor((diff % 60000) / 1000)
  return { dias, horas, min, seg }
}

function Contador({ iso }) {
  const [t, setT] = useState(() => tempoPara(iso))
  useEffect(() => {
    const id = setInterval(() => setT(tempoPara(iso)), 1000)
    return () => clearInterval(id)
  }, [iso])
  if (!t) return <span className="text-white/60">A começar…</span>
  const p = (n) => String(n).padStart(2, '0')
  return (
    <span className="font-mono tabular-nums">
      {t.dias > 0 && <span className="text-white">{t.dias}d </span>}
      <span className="text-white">{p(t.horas)}h</span>{' '}
      <span className="text-white/80">{p(t.min)}m</span>{' '}
      <span className="text-white/60">{p(t.seg)}s</span>
    </span>
  )
}

export default function TorneiosContagem() {
  const [jogos, setJogos] = useState([])
  const [fechado, setFechado] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch('/api/previsoes?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d) return
        const matches = d.matches || []
        const porJogo = {}
        for (const m of matches) {
          if (!m.start_time) continue
          const data = new Date(m.start_time)
          if (data.getTime() < Date.now()) continue
          const chave = m.region || m.competition || ''
          // associa ao jogo pela competição/região
          const jid = m.jogo || inferirJogo(m)
          if (!jid) continue
          if (!porJogo[jid] || new Date(porJogo[jid].start_time) > data) {
            porJogo[jid] = m
          }
        }
        const lista = JOGOS.filter((j) => porJogo[j.id]).map((j) => ({
          ...j,
          match: porJogo[j.id],
        }))
        setJogos(lista)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (fechado || !jogos.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto mt-14 max-w-6xl px-3 sm:mt-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121214]/95 shadow-2xl shadow-black/40 backdrop-blur">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-500/60 to-transparent" />
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-500 to-zinc-500 text-white">
              <Trophy className="h-4 w-4" />
            </span>
            <span className="hidden shrink-0 text-[11px] font-black uppercase tracking-wider text-gray-400 sm:block">
              Próximos torneios
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 overflow-x-auto">
              {jogos.map((j) => (
                <div key={j.id} className="flex shrink-0 items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${j.txt}`}>
                    {j.nome}
                  </span>
                  <span className="text-[11px] font-bold text-gray-300">
                    <Contador iso={j.match.start_time} />
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setFechado(true)}
              title="Fechar"
              className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* inferir o jogo a partir do nome da competição/região */
function inferirJogo(m) {
  const s = `${m.competition || ''} ${m.championship || ''} ${m.region || ''}`.toLowerCase()
  if (/rainbow|r6|six/.test(s)) return 'r6'
  if (/cs2|counter|csgo/.test(s)) return 'cs2'
  if (/fortnite|fn/.test(s)) return 'fortnite'
  return null
}
