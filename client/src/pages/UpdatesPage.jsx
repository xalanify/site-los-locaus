import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  Plus,
  Sparkles,
  Wrench,
  Trash2,
  Calendar,
  Gamepad2,
  Monitor,
  Users,
  RotateCcw,
  ExternalLink,
  Newspaper,
  TrendingUp,
  Trophy,
  Loader2,
} from 'lucide-react'
import { updates, CHANGE_TYPES } from '../data/updates'
import { BADGES, BadgeTile } from '../components/BadgeGem'
import { GAMES, gameImg } from '../data/gameUpdates'

const TYPE_ICONS = {
  novo: Plus,
  melhoria: Sparkles,
  correcao: Wrench,
  remocao: Trash2,
}

/* Histórico do site: mostra apenas o mês e o ano (sem horas) */
const fmtDate = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

const fmtShort = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-PT'))

const fmtTime = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

/* Filtros de tempo das atualizações de jogos */
const TIME_FILTERS = [
  { id: 'recentes', label: 'Recentes', hint: '7 dias', days: 7 },
  { id: 'ultimas', label: 'Últimas', hint: '30 dias', days: 30 },
  { id: 'todas', label: 'Todas', hint: 'sem limite', days: null },
]

/* ============================================================
   Cartão de uma alteração (tipo + texto)
   ============================================================ */
function ChangeRow({ c, showGame = false }) {
  const meta = CHANGE_TYPES[c.type] || CHANGE_TYPES.melhoria
  const Icon = TYPE_ICONS[c.type] || Sparkles
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${meta.color}`}
      >
        <Icon className="h-3 w-3" />
        {meta.label}
      </span>
      <span className="text-sm leading-relaxed text-gray-300">
        <span className="font-semibold text-white">{c.title}</span>
        {c.text ? ` — ${c.text}` : ''}
      </span>
      {showGame && c.game && (
        <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
          {c.game}
        </span>
      )}
    </li>
  )
}

/* ============================================================
   Âmbito SITE — histórico de alterações ao site
   ============================================================ */
function SiteScope() {
  const [filter, setFilter] = useState('todas')

  const counts = useMemo(() => {
    const c = { todas: 0 }
    for (const k of Object.keys(CHANGE_TYPES)) c[k] = 0
    for (const u of updates) {
      c.todas += u.changes.length
      for (const ch of u.changes) if (c[ch.type] !== undefined) c[ch.type] += 1
    }
    return c
  }, [])

  const list = useMemo(() => {
    if (filter === 'todas') return updates
    return updates
      .map((u) => ({ ...u, changes: u.changes.filter((c) => c.type === filter) }))
      .filter((u) => u.changes.length > 0)
  }, [filter])

  const filters = [{ id: 'todas', label: 'Todas' }].concat(
    Object.entries(CHANGE_TYPES).map(([id, v]) => ({ id, label: v.label })),
  )

  return (
    <div>
      {/* Filtros por tipo */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 sm:text-sm ${
              filter === f.id
                ? 'bg-orange-500 text-white glow-orange scale-105'
                : 'glass text-gray-300 hover:text-white'
            }`}
          >
            {f.label}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                filter === f.id ? 'bg-white/20' : 'bg-white/10 text-gray-400'
              }`}
            >
              {counts[f.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="relative space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-white/10 sm:before:left-[19px]"
        >
          {list.map((u, i) => (
            <div key={u.id} className="relative pl-10 sm:pl-12">
              <span className="absolute left-0 top-1 h-8 w-8 rounded-full border-2 border-orange-500 bg-dark sm:h-10 sm:w-10" />
              <span className="absolute left-2.5 top-3.5 h-2 w-2 rounded-full bg-orange-500 sm:left-3 sm:top-5" />

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-2xl p-5 sm:p-6"
              >
                <h2 className="mb-1 text-lg font-black text-white sm:text-xl">{u.title}</h2>
                <div className="mb-4 flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5 text-orange-400" />
                  <span className="first-letter:uppercase">{fmtDate(u.date)}</span>
                </div>
                <ul className="space-y-2.5">
                  {u.changes.map((c, idx) => (
                    <ChangeRow key={idx} c={c} />
                  ))}
                </ul>
              </motion.div>
            </div>
          ))}

          {list.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">Sem alterações deste tipo.</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   ÂMBITO JOGOS — números reais + atualizações com fonte (PC)
   ============================================================ */

/* Cartão de número real (agora / pico 24h / pico máximo) */
function LiveStat({ icon: Icon, label, value, accent, dot = false }) {
  return (
    <div className="glass rounded-2xl p-4 text-center sm:p-5">
      <div
        className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}22` }}
      >
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="text-2xl font-black text-white sm:text-3xl">
        {dot && value != null && (
          <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-green-500 align-middle" />
        )}
        {fmtNum(value)}
      </div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </div>
    </div>
  )
}

function GameChooser({ live, loading, error, onRetry, onPick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl text-center"
    >
      <div className="mb-6">
        <h2 className="text-xl font-black text-white sm:text-2xl">Escolhe o jogo</h2>
        <p className="mt-1 text-sm text-gray-400">
          Atualizações das versões de <span className="font-bold text-orange-400">PC</span> com
          fonte e link — com os números reais de jogadores da{' '}
          <span className="font-bold text-orange-400">Steam</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g, i) => {
          const nums = live?.games?.[g.id]
          return (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onPick(g.id)}
              className="glass group rounded-2xl border-2 border-transparent p-5 transition-all duration-300 hover:scale-[1.03] hover:border-orange-500"
            >
              <div
                className="relative mx-auto mb-3 h-14 w-14 overflow-hidden rounded-full"
                style={{ backgroundColor: `${g.color}22` }}
              >
                <Gamepad2
                  className="absolute inset-0 m-auto h-7 w-7"
                  style={{ color: g.color }}
                />
                <img
                  src={(live?.covers?.[g.id] || gameImg(g)) || undefined}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                  className="relative h-full w-full object-cover"
                />
              </div>
              <div className="mb-1 text-lg font-black text-white">{g.name}</div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <Monitor className="h-3 w-3" />
                Apenas PC
              </div>
              <div className="mt-3 border-t border-white/5 pt-2 text-[11px] text-gray-400">
                {loading ? (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> a carregar…
                  </span>
                ) : nums && nums.now != null ? (
                  <span>
                    <span className="font-bold text-green-400">●</span> agora:{' '}
                    <span className="font-bold text-white">{fmtNum(nums.now)}</span>
                    {nums.peak24 != null && (
                      <span className="block text-gray-500">
                        pico 24h: {fmtNum(nums.peak24)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-600">sem números</span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {error && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-amber-400">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-gray-400 hover:border-orange-500 hover:text-orange-400"
          >
            <RotateCcw className="mr-1 inline h-3 w-3" />
            Tentar novamente
          </button>
        </div>
      )}
    </motion.div>
  )
}

function GameScope() {
  const [gameId, setGameId] = useState(null)
  const [time, setTime] = useState('todas')

  // Números reais (Steam + Steam Charts)
  const [live, setLive] = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState('')

  // Notícias oficiais do jogo
  const [news, setNews] = useState(null)
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState('')

  const loadLive = useCallback(async () => {
    setLiveLoading(true)
    setLiveError('')
    try {
      const r = await fetch('/api/games/live')
      const d = await r.json()
      if (d?.error) setLiveError(d.error)
      else setLive(d)
    } catch {
      setLiveError('Sem ligação à Steam. Tenta novamente.')
    } finally {
      setLiveLoading(false)
    }
  }, [])

  const loadNews = useCallback(async (id) => {
    if (!id) return
    setNewsLoading(true)
    setNewsError('')
    setNews(null)
    try {
      const r = await fetch(`/api/games/news?game=${encodeURIComponent(id)}`)
      const d = await r.json()
      if (d?.error) setNewsError(d.error)
      else setNews(d)
    } catch {
      setNewsError('Sem ligação à Steam. Tenta novamente.')
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLive()
  }, [loadLive])

  useEffect(() => {
    if (gameId) loadNews(gameId)
  }, [gameId, loadNews])

  const meta = GAMES.find((g) => g.id === gameId)
  const nums = gameId ? live?.games?.[gameId] : null

  const filtered = useMemo(() => {
    if (!news?.items) return []
    const tf = TIME_FILTERS.find((t) => t.id === time)
    const list = [...news.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    if (!tf || !tf.days) return list
    const limit = Date.now() - tf.days * 24 * 60 * 60 * 1000
    return list.filter((u) => new Date(u.date).getTime() >= limit)
  }, [news, time])

  if (!gameId)
    return (
      <GameChooser
        live={live}
        loading={liveLoading}
        error={liveError}
        onRetry={loadLive}
        onPick={setGameId}
      />
    )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Cabeçalho do jogo */}
      <div className="glass rounded-2xl p-5 text-center sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <span
            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full"
            style={{ backgroundColor: `${meta?.color || '#f97316'}22` }}
          >
            <Gamepad2 className="h-5 w-5" style={{ color: meta?.color }} />
            {meta && (live?.covers?.[meta.id] || gameImg(meta)) && (
              <img
                src={live?.covers?.[meta.id] || gameImg(meta)}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </span>
          <h2 className="text-2xl font-black text-white sm:text-3xl">{meta?.name}</h2>
          <span className="flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-[11px] font-black text-blue-400">
            <Monitor className="h-3 w-3" />
            PC
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Todas as atualizações desta página são para a versão de PC.
        </p>
        <button
          onClick={() => setGameId(null)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-gray-400 transition-colors hover:border-orange-500 hover:text-orange-400"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Trocar de jogo
        </button>
      </div>

      {/* NÚMEROS REAIS — Steam / Steam Charts */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Users className="h-5 w-5 text-green-400" />
          <h4 className="text-lg font-bold text-white sm:text-xl">Jogadores</h4>
          <span className="ml-auto text-[11px] text-gray-500">
            {live?.updated ? `atualizado às ${fmtTime(live.updated)}` : ''}
          </span>
        </div>

        {liveLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> A obter números reais da Steam…
          </div>
        ) : nums && (nums.now != null || nums.peak24 != null) ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <LiveStat
                icon={Users}
                label="A jogar agora"
                value={nums.now}
                accent="#22c55e"
                dot
              />
              <LiveStat
                icon={TrendingUp}
                label="Pico últimas 24h"
                value={nums.peak24}
                accent="#f97316"
              />
              <LiveStat
                icon={Trophy}
                label="Pico máximo"
                value={nums.peakAll}
                accent="#a855f7"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
              <span>
                Fonte:{' '}
                <a
                  href="https://store.steampowered.com/charts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 underline decoration-dotted hover:text-orange-400"
                >
                  Steam
                </a>
                {' · '}
                <a
                  href={nums.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gray-400 underline decoration-dotted hover:text-orange-400"
                >
                  Steam Charts
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="mb-2 text-sm text-amber-400">
              {liveError || 'Sem dados disponíveis para este jogo.'}
            </p>
            <button
              onClick={loadLive}
              className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-gray-400 hover:border-orange-500 hover:text-orange-400"
            >
              <RotateCcw className="mr-1 inline h-3 w-3" />
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      {/* Filtros de tempo */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        {TIME_FILTERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTime(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 sm:text-sm ${
              time === t.id
                ? 'bg-orange-500 text-white glow-orange scale-105'
                : 'glass text-gray-300 hover:text-white'
            }`}
          >
            {t.label}
            <span className="text-[10px] font-normal opacity-70">({t.hint})</span>
          </button>
        ))}
      </div>

      {/* Atualizações do jogo — cada uma com a SUA fonte */}
      <AnimatePresence mode="wait">
        <motion.div
          key={gameId + time}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {newsLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> A obter atualizações da Steam…
            </div>
          ) : newsError ? (
            <div className="py-6 text-center">
              <p className="mb-2 text-sm text-amber-400">{newsError}</p>
              <button
                onClick={() => loadNews(gameId)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-gray-400 hover:border-orange-500 hover:text-orange-400"
              >
                <RotateCcw className="mr-1 inline h-3 w-3" />
                Tentar novamente
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Sem atualizações neste período. Experimenta o filtro «Todas».
            </p>
          ) : (
            filtered.map((u, i) => (
              <motion.article
                key={u.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="glass rounded-2xl p-5"
              >
                <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-black text-white sm:text-lg">{u.title}</h3>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${
                      u.patch
                        ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                        : 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                    }`}
                  >
                    <Newspaper className="h-3 w-3" />
                    {u.patch ? 'Patch' : 'Notícia'}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-orange-400" />
                    <span className="first-letter:uppercase">{fmtShort(u.date)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3.5 w-3.5" />
                    PC
                  </span>
                </div>
                {u.text && (
                  <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-gray-300">
                    {u.text}
                  </p>
                )}
                {/* SEMPRE com a fonte */}
                <a
                  href={u.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-gray-400 transition-colors hover:border-orange-500 hover:text-orange-400"
                >
                  Fonte: {u.source || 'Steam'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </motion.article>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================================================
   Página de Atualizações — Site ou Jogos
   ============================================================ */
export default function UpdatesPage() {
  return (
    <section className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center sm:mb-10"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
            <History className="h-8 w-8 text-orange-400" />
          </div>
          <h1
            className="mb-3 font-black gradient-text"
            style={{ fontSize: 'clamp(1.9rem, 7vw, 3.2rem)' }}
          >
            Atualizações
          </h1>
          <p className="mx-auto max-w-2xl text-base text-gray-400 sm:text-lg">
            As notícias dos jogos com fonte e as distinções do site — cada uma com a sua cor.
          </p>
        </motion.div>

        {/* Distinções existentes — para todos verem quais há */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mb-8 rounded-3xl p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
                Distinções
              </h2>
              <p className="text-xs text-gray-500">
                Insígnias que existem no site — cada uma com a sua cor. Ficam visíveis no
                perfil de cada conta.
              </p>
            </div>
            <Trophy className="h-6 w-6 shrink-0 text-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BADGES.map((b) => (
              <BadgeTile key={b.id} badge={b} size={48} />
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key="jogos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <GameScope />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
