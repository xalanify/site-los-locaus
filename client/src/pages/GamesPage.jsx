import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gamepad2,
  Trophy,
  Swords,
  Flame,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  KeyRound,
  Target,
  Crosshair,
  Skull,
  Star,
  Calendar,
  Link,
  BarChart3,
  Filter,
  RotateCcw,
  Info,
  AlertCircle,
  Search,
  Loader2,
} from 'lucide-react'
import TabBar from '../components/TabBar'
import Estado from '../components/Estado'

const fmt = (n) => (Number(n) || 0).toLocaleString('pt-PT')

const resultLabel = { win: 'Vitória', loss: 'Derrota', draw: 'Empate' }
const resultBadge = {
  win: 'bg-green-500/20 text-green-400',
  loss: 'bg-red-500/20 text-red-400',
  draw: 'bg-yellow-500/20 text-yellow-400',
}
const resultColor = {
  win: 'text-green-400',
  loss: 'text-red-400',
  draw: 'text-yellow-400',
}

/* Cores próprias de cada jogador acompanhado */
const PLAYER_COLORS = {
  xalanix: '#f97316', // laranja
  sonojo: '#3b82f6', // azul
  jrm: '#22c55e', // verde
  take: '#a855f7', // roxo
  habibi: '#ec4899', // rosa
  rabixo: '#06b6d4', // ciano
  /* Rainbow Six — esquadrão (chaves = handle em minúsculas) */
  'xalana.': '#f43f5e', // rosa
  'm4xi01504': '#eab308', // âmbar
  'xandy_r6': '#22c55e', // verde
  'simao270413': '#06b6d4', // ciano
  'xalanix-': '#f97316', // laranja (mesmo do CS2)
}

/* ------------------------------------------------------------
   Agregação no cliente (espelha o servidor) — necessária para
   as estatísticas reagirem aos filtros de jogadores
   ------------------------------------------------------------ */
function aggregate(list) {
  let matches = 0
  let wins = 0
  let losses = 0
  let draws = 0
  let roundsFor = 0
  let roundsAgainst = 0
  const players = {}

  for (const m of list) {
    matches++
    if (m.result === 'win') wins++
    else if (m.result === 'loss') losses++
    else if (m.result === 'draw') draws++
    if (m.ourTeam !== null && m.ourTeam !== undefined) {
      roundsFor += m.ourScore
      roundsAgainst += m.oppScore
    }

    for (const team of [m.teamA, m.teamB]) {
      const teamIdx = team === m.teamA ? 0 : 1
      const teamWon = m.scoreA > m.scoreB ? 0 : m.scoreB > m.scoreA ? 1 : -1
      for (const p of team) {
        if (!p.tracked) continue
        const ps =
          players[p.tracked] ||
          (players[p.tracked] = {
            matches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            mvps: 0,
            hspSum: 0,
            scoreSum: 0,
          })
        ps.matches++
        if (teamWon === teamIdx) ps.wins++
        else if (teamWon === -1) ps.draws++
        else ps.losses++
        ps.kills += p.k
        ps.deaths += p.d
        ps.assists += p.a
        ps.mvps += p.mvp
        ps.hspSum += p.hsp
        ps.scoreSum += p.score
      }
    }
  }

  const finished = {}
  for (const [k, p] of Object.entries(players)) {
    const n = p.matches || 1
    finished[k] = {
      matches: p.matches,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      winRate: p.matches
        ? Math.round(((p.wins + p.draws * 0.5) / p.matches) * 100)
        : 0,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      mvps: p.mvps,
      kd: p.deaths ? Math.round((p.kills / p.deaths) * 100) / 100 : p.kills,
      avgKills: Math.round((p.kills / n) * 10) / 10,
      avgScore: Math.round(p.scoreSum / n),
      avgHsp: Math.round((p.hspSum / n) * 10) / 10,
    }
  }

  return {
    matches,
    wins,
    losses,
    draws,
    winRate: matches ? Math.round(((wins + draws * 0.5) / matches) * 100) : 0,
    roundsFor,
    roundsAgainst,
    players: finished,
  }
}

/* Toda a gente selecionada tem de estar na MESMA partida */
function matchHasAll(m, keys) {
  if (!keys.length) return true
  const roster = [...(m.teamA || []), ...(m.teamB || [])]
  return keys.every((k) => roster.some((p) => p.tracked === k))
}

function StatCard({ icon: Icon, label, value, color = 'text-violet-400', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-105 sm:p-5"
    >
      <Icon className={`mx-auto mb-2 h-7 w-7 sm:h-8 sm:w-8 ${color}`} />
      <div className="text-2xl font-black text-white sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-gray-400 sm:text-sm">{label}</div>
    </motion.div>
  )
}

function WinRateBar({ value, delay = 0 }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ delay, duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
      />
    </div>
  )
}

/* ============================================================
   Logótipo do jogo dentro do círculo — se a imagem não carregar,
   fica o ícone de sempre (nunca um círculo vazio).
   ============================================================ */
function LogoJogo({ logo, Icon, cor }) {
  const lista = Array.isArray(logo) ? logo : [logo]
  const [falhou, setFalhou] = useState(0)
  const src = lista[falhou]
  if (!src || falhou >= lista.length) return <Icon className={`h-8 w-8 ${cor}`} />
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFalhou((f) => f + 1)}
      className="h-full w-full rounded-full object-cover"
    />
  )
}

/* ============================================================
   Escolha do jogo — nada vem já selecionado
   ============================================================ */
function GameChooser({ onPick }) {
  const games = [
    {
      id: 'cs2',
      name: 'CS2',
      icon: Gamepad2,
      logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_600x900.jpg',
      color: 'text-violet-400',
      ring: 'hover:border-violet-500',
      bg: 'bg-violet-500/10',
      desc: 'Partidas do histórico da Steam — Braço Direito, Competitivo, CS:GO e Premier.',
    },
    {
      id: 'r6',
      name: 'Rainbow Six',
      icon: Crosshair,
      logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/359550/library_600x900.jpg',
      color: 'text-red-400',
      ring: 'hover:border-red-500',
      bg: 'bg-red-500/10',
      desc: 'R6 Siege — só o esquadrão, com nível, rank e números de cada um (tracker.gg).',
    },
    {
      id: 'fortnite',
      name: 'Fortnite',
      icon: Flame,
      logo: 'https://cdn2.unrealengine.com/en-fn-og-42-10-c1sx-egs-launcher-blade-1200x1600-1200x1600-6e74a083a5cd.jpg',
      color: 'text-purple-400',
      ring: 'hover:border-purple-500',
      bg: 'bg-purple-500/10',
      desc: 'Estatísticas — em desenvolvimento.',
      emBreve: true,
    },
    {
      id: 'bf',
      name: 'Battlefield',
      icon: Target,
      logo: ['/bf1.jpg'],
      color: 'text-sky-400',
      ring: 'hover:border-sky-500',
      bg: 'bg-sky-500/10',
      desc: 'BF1 / BF V / BF6 — Top 20 de skins raras e estatísticas do esquadrão.',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl text-center"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {games.map((g, i) => {
          const Icon = g.icon
          return (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              onClick={() => onPick(g.id)}
              className={`glass group rounded-2xl border-2 border-transparent p-3.5 transition-all duration-300 hover:scale-[1.03] sm:p-6 ${g.ring}`}
            >
              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full sm:mb-4 sm:h-16 sm:w-16 ${g.bg}`}
              >
                <LogoJogo logo={g.logo} Icon={Icon} cor={g.color} />
              </div>
              <div className="mb-1 text-base font-black leading-tight text-white sm:text-2xl">
                {g.name}
              </div>
              {g.emBreve && (
                <div className={`mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide ${g.color}`}>
                  <Clock className="h-3.5 w-3.5 animate-spin [animation-duration:3s]" />
                  Em desenvolvimento
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ============================================================
   Jogos por implementar — o mesmo aviso para todos
   ============================================================ */
function EmBreve({ nome, sub, Icon, cor, bg, logo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass mx-auto max-w-xl rounded-2xl p-8 text-center"
    >
      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ${bg}`}>
        <LogoJogo logo={logo} Icon={Icon} cor={cor} />
      </div>
      <h3 className="mb-3 text-xl font-bold text-white sm:text-2xl">{nome}</h3>
      <p className="text-sm leading-relaxed text-gray-400 sm:text-base">
        {sub}
        <br />
        Em breve fica disponível!
      </p>
      <div className={`mt-6 flex items-center justify-center gap-2 text-xs ${cor}`}>
        <Clock className="h-4 w-4 animate-spin [animation-duration:3s]" />
        Em desenvolvimento
      </div>
    </motion.div>
  )
}

function EafcPage() {
  return (
    <EmBreve
      nome="EA FC 26 — Pro Clubs"
      sub="As estatísticas do EA FC 26 ainda não estão implementadas."
      Icon={Trophy}
      cor="text-yellow-400"
      bg="bg-yellow-500/10"
      logo="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3405690/2d96aa1b06e453cd62dae9029d412f19e61932c3/header.jpg?t=1789751159"
    />
  )
}

/* ============================================================
   Aba "Skins / Amuletos raros" — listas curadas por jogo,
   servidas pelo servidor (server/data/skins-raros.json).
   Imagens oficiais para CS (ByMykel) e Fortnite (fortnite-api);
   R6/BF ficam com emblema próprio enquanto não existir API
   pública de cosméticos da Ubisoft/EA.
   ============================================================ */
const ABA_SKINS_LABEL = {
  cs2: 'Skins e Facas raras',
  r6: 'Skins e Amuletos raros',
  fortnite: 'Skins · Paraquedas · Picaretas',
}

const SKINS_SEC = {
  cs2: [
    { chave: 'armas', titulo: 'Skins de armas' },
    { chave: 'facas', titulo: 'Facas' },
  ],
  r6: [
    { chave: 'armas', titulo: 'Skins de armas' },
    { chave: 'amuletos', titulo: 'Amuletos' },
  ],
  fortnite: [
    { chave: 'skins', titulo: 'Skins' },
    { chave: 'paraquedas', titulo: 'Paraquedas' },
    { chave: 'picaretas', titulo: 'Picaretas' },
  ],
}

/* cor do chip por "estado" (nunca mais obtível fica em vermelho) */
const estadoChip = (t = '') => {
  const s = String(t)
  if (/nunca/i.test(s)) return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (/quase imposs|<[0-9]/i.test(s)) return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300'
  if (/temporada|janela|edi[cç]|s&#243; na T|sorteio|presencial| profissional/i.test(s))
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  return 'border-violet-500/30 bg-violet-500/10 text-violet-300'
}

function SkinCard({ it, i, onZoom }) {
  const rankCor =
    it.rank === 1
      ? 'border-amber-400/50 bg-gradient-to-br from-amber-400/30 to-amber-500/10 text-amber-200'
      : it.rank === 2
        ? 'border-gray-300/40 bg-gradient-to-br from-gray-300/25 to-gray-400/10 text-gray-100'
        : it.rank === 3
          ? 'border-orange-700/50 bg-gradient-to-br from-orange-700/30 to-orange-900/10 text-orange-300'
          : 'border-violet-500/25 bg-violet-500/10 text-violet-200'
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.3 }}
      onClick={() => it.img && onZoom(it)}
      title={it.img ? 'Clica para ampliar' : ''}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 ${
        it.img ? 'cursor-zoom-in transition-colors hover:border-violet-400/50' : ''
      }`}
    >
      {it.rank != null && (
        <span
          className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border text-xs font-black tabular-nums shadow-lg ${rankCor}`}
        >
          #{it.rank}
        </span>
      )}
      <div className="mb-3 grid h-28 place-items-center">
        {it.img ? (
          <img
            src={it.img}
            alt={it.nome}
            loading="lazy"
            className="max-h-28 object-contain drop-shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* item sem imagem oficial: emblema elegante em vez de ficha vazia */
          <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-transparent ring-1 ring-white/15">
            <span className="font-display text-2xl font-black text-white/80">
              {it.nome.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p className="font-display text-sm font-black leading-snug text-white">{it.nome}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {it.raridade && (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-300">
            {it.raridade}
          </span>
        )}
        {it.estado && (
          <span
            className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${estadoChip(it.estado)}`}
          >
            {it.estado}
          </span>
        )}
        {it.tipo && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
            {it.tipo}
          </span>
        )}
      </div>
      {(it.por || it.origem) && (
        <p className="mt-2 text-[11.5px] leading-snug text-gray-400">{it.por || it.origem}</p>
      )}
    </motion.div>
  )
}

function SkinsRarosTab({ jogo }) {
  const [d, setD] = useState(null)
  const [seccao, setSeccao] = useState(SKINS_SEC[jogo]?.[0]?.chave)
  const [zoom, setZoom] = useState(null)

  useEffect(() => {
    fetch('/api/games/skins-raros')
      .then((r) => r.json())
      .then(setD)
      .catch(() => setD({}))
  }, [])

  useEffect(() => {
    setSeccao(SKINS_SEC[jogo]?.[0]?.chave)
    setZoom(null)
  }, [jogo])

  /* fechar o zoom com ESC */
  useEffect(() => {
    if (!zoom) return
    const fechar = (e) => {
      if (e.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [zoom])

  const seccoes = SKINS_SEC[jogo] || []
  const bloco = d ? d[jogo === 'cs2' ? 'cs' : jogo] || {} : {}
  const lista = Array.isArray(bloco[seccao]) ? bloco[seccao] : []

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-base font-black text-white">
          <Trophy className="h-4 w-4 text-amber-300" />
          {ABA_SKINS_LABEL[jogo]}
        </h3>
        <p className="text-[11px] text-gray-500">Top 20 real — nº1, nº2… · dados oficiais quando existem</p>
      </div>

      {seccoes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {seccoes.map((s) => (
            <button
              key={s.chave}
              onClick={() => setSeccao(s.chave)}
              className={
                seccao === s.chave
                  ? 'rounded-xl bg-violet-500 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-violet-500/20'
                  : 'rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400 transition-colors hover:bg-white/10'
              }
            >
              {s.titulo}
            </button>
          ))}
        </div>
      )}

      {!d ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300" />
          A carregar as listas…
        </div>
      ) : !lista.length ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
          Sem itens nesta lista — tenta outra sub-aba.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lista.map((it, i) => (
              <SkinCard key={it.nome + i} it={it} i={i} onZoom={setZoom} />
            ))}
          </div>
          {jogo === 'r6' && (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11.5px] leading-snug text-gray-500">
              Rainbow Six: renders da comunidade (Fandom) com o FUNDO REMOVIDO e servidos
              pelo próprio site — clica numa carta para ampliar. Itens sem render público
              (dev-only, Kickstarter, eventos únicos…) ficam com emblema.
            </p>
          )}
        </>
      )}

      {/* zoom em ecrã inteiro — clica para abrir, ESC / fora / X para fechar */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
            className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#12091f] p-6 text-center"
            >
              <button
                onClick={() => setZoom(null)}
                aria-label="Fechar"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-sm font-black text-gray-300 transition-colors hover:bg-white/10"
              >
                ✕
              </button>
              <div className="grid place-items-center py-2">
                <img
                  src={zoom.img}
                  alt={zoom.nome}
                  className="mx-auto max-h-[64vh] w-auto object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                />
              </div>
              <p className="mt-3 font-display text-lg font-black text-white">
                #{zoom.rank} · {zoom.nome}
              </p>
              {zoom.estado && (
                <span className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${estadoChip(zoom.estado)}`}>
                  {zoom.estado}
                </span>
              )}
              {(zoom.por || zoom.origem) && (
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-300">{zoom.por || zoom.origem}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* alternador Estatísticas ↔ Skins que fica no topo de cada jogo */
function SubAbaJogo({ jogo, aba, setAba }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={() => setAba('stats')}
        className={
          aba === 'stats'
            ? 'rounded-xl bg-violet-500 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-violet-500/20'
            : 'rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-gray-400 transition-colors hover:bg-white/10'
        }
      >
        Estatísticas
      </button>
      <button
        onClick={() => setAba('skins')}
        className={
          aba === 'skins'
            ? 'rounded-xl bg-violet-500 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-violet-500/20'
            : 'rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-gray-400 transition-colors hover:bg-white/10'
        }
      >
        {ABA_SKINS_LABEL[jogo]}
      </button>
    </div>
  )
}

function FortniteStats() {
  return (
    <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-purple-500/15">
        <Flame className="h-8 w-8 text-purple-400" />
      </div>
      <h2 className="gradient-text font-display text-xl font-black sm:text-2xl">Fortnite</h2>
      <p className="mt-3 text-[13px] font-bold text-gray-400">
        As estatísticas do Fortnite estão em desenvolvimento.
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        Em breve: pesquisa por nome, vitórias, K/D, partidas por modo.
      </p>
    </div>
  )
}
function FortnitePage() {
  const [aba, setAba] = useState('stats')
  return (
    <div className="space-y-5">
      <SubAbaJogo jogo="fortnite" aba={aba} setAba={setAba} />
      {aba === 'stats' ? <FortniteStats /> : <SkinsRarosTab jogo="fortnite" />}
    </div>
  )
}

/* ============================================================
   Battlefield — BF1 / BFV / BF6 via gametools.network
   (API comunitária aberta). Mostra apenas o que acompanhamos;
   se a API estiver fora, cai no snapshot tracker.gg guardado.
   ============================================================ */
const BF_JOGOS = [
  { id: 'bf1', nome: 'Battlefield 1', cor: 'text-amber-300', fundo: 'bg-amber-500/15' },
  { id: 'bfv', nome: 'Battlefield V', cor: 'text-emerald-300', fundo: 'bg-emerald-500/15' },
  { id: 'bf6', nome: 'Battlefield 6', cor: 'text-sky-300', fundo: 'bg-sky-500/15' },
]

function BattlefieldStats({ aoMudarJogo }) {
  const [jogo, setJogo] = useState('bf1')
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(true)
  const [aVivo, setAVivo] = useState(false)

  /* o fundo da página Juros segue o jogo BF escolhido */
  useEffect(() => {
    if (aoMudarJogo) aoMudarJogo(jogo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogo])

  useEffect(() => {
    let abortou = false
    document.body.dataset.theme = jogo
    const correr = async () => {
      setACarregar(true)
      setErro('')
      setDados(null)
      try {
        const r = await fetch(`/api/games/bf-live?g=${jogo}&armas=1`)
        const d = await r.json().catch(() => ({}))
        if (abortou) return
        if (!r.ok || !d.ok) {
          setErro(d.error || 'Não foi possível consultar o Battlefield agora.')
          return
        }
        setDados(d)
        setAVivo(!!d.aoVivo)
      } catch {
        if (!abortou) setErro('Sem resposta do servidor.')
      } finally {
        if (!abortou) setACarregar(false)
      }
    }
    correr()
    return () => {
      abortou = true
    }
  }, [jogo])

  const num = (v, dec = 0) =>
    v == null ? '—' : Number(v).toLocaleString('pt-PT', { maximumFractionDigits: dec, minimumFractionDigits: dec })

  const Cartão = ({ label, valor, Icon: Ic, cor = 'text-white', atraso = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: atraso, duration: 0.35 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
    >
      {Ic && <Ic className="mx-auto mb-1.5 h-5 w-5 opacity-80" />}
      <p className={`font-display text-2xl font-black ${cor}`}>{valor}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* seletor de jogo BF */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {BF_JOGOS.map((j) => (
          <button
            key={j.id}
            onClick={() => setJogo(j.id)}
            className={`rounded-full border px-5 py-2 text-[13px] font-black transition-all ${
              jogo === j.id
                ? `${j.fundo} border-white/25 ${j.cor} scale-105`
                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white'
            }`}
          >
            {j.nome}
          </button>
        ))}
      </motion.div>

      {aCarregar && (
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" /> A consultar os números…
        </div>
      )}

      {!aCarregar && erro && (
        <div className="glass rounded-2xl p-6 text-center">
          <Target className="mx-auto mb-2 h-7 w-7 text-amber-400" />
          <p className="text-sm font-bold text-red-400">{erro}</p>
          <p className="mt-1 text-[12px] text-gray-500">
            Os snapshots guardados continuam disponíveis — tenta de novo em instantes.
          </p>
        </div>
      )}

      {!aCarregar && !erro && dados?.jogadores?.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-gray-400">
          Ainda não há jogadores acompanhados neste jogo.
        </div>
      )}

      {!aCarregar && !erro && dados?.jogadores?.map((p, i) => (
        <motion.div
          key={`${p.handle}-${i}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          className="glass rounded-2xl p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {p.avatar ? (
                <img src={p.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] font-display text-lg font-black text-violet-300">
                  {(p.nome || p.handle || '?').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-display text-base font-black text-white">{p.nome || p.handle}</p>
                <p className="text-[11px] text-gray-500">
                  {p.fonte === 'gametools' ? 'gametools.network · ao vivo' : 'snapshot guardado'}
                  {p.classeTop ? ` · classe top: ${p.classeTop}` : ''}
                </p>
              </div>
            </div>
            {p.rank != null && (
              <span className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-black text-amber-300">
                {p.rankImg ? <img src={p.rankImg} alt="" className="h-7 w-7 object-contain" /> : null}
                {p.rankNome ? `Rank ${p.rankNome}` : `Rank ${p.rank}`}
                {p.skill != null ? ` · ${num(p.skill)} skill` : ''}
              </span>
            )}
          </div>

          {/* BF6: a gametools ainda sem partidas para este ID */}
          {p.fonte === 'gametools' && (Number(p.kills) || 0) === 0 && (
            <p className="mb-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-[12px] text-yellow-400">
              A API ainda não tem partidas deste ID no BF6 — confirma o nome EA exato de dentro do
              jogo (Perfil EA). Enquanto isso, os números mostrados vêm a zeros.
            </p>
          )}

          {/* cartões de carreira (sem horas, como pediste) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cartão label="K/D" valor={p.kd != null ? Number(p.kd).toFixed(2) : '—'} Icon={Crosshair} cor="text-violet-300" atraso={0.05} />
            <Cartão label="Kills" valor={num(p.kills)} Icon={Skull} atraso={0.08} />
            <Cartão label="Vitórias" valor={num(p.vitorias ?? p.wins)} Icon={Trophy} cor="text-green-400" atraso={0.11} />
            <Cartão
              label="Win %"
              valor={p.winPct != null ? `${Math.round(p.winPct)}%` : '—'}
              Icon={Info}
              cor="text-emerald-300"
              atraso={0.14}
            />
            <Cartão label="Skill" valor={p.skill != null ? num(p.skill) : '—'} Icon={Star} cor="text-amber-300" atraso={0.17} />
            <Cartão
              label="Precisão"
              valor={p.precisao != null ? `${p.precisao.toFixed(1)}%` : '—'}
              Icon={Target}
              cor="text-sky-300"
              atraso={0.2}
            />
            <Cartão label="Rondas" valor={num(p.rondas)} Icon={Swords} atraso={0.23} />
            <Cartão label="K/min" valor={p.killsMin != null ? Number(p.killsMin).toFixed(2) : '—'} Icon={BarChart3} cor="text-rose-300" atraso={0.26} />
          </div>

          {/* série de extra: sequência máxima, headshot mais rápido, dogtags */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-white/[0.04] py-2">
              <p className="font-black text-white">{p.sequencia != null ? num(p.sequencia) : '—'}</p>
              <p className="uppercase tracking-wider text-gray-500">Sequência máx.</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] py-2">
              <p className="font-black text-white">
                {p.hsMax != null ? `${p.hsMax} m` : '—'}
              </p>
              <p className="uppercase tracking-wider text-gray-500">HS mais distante</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] py-2">
              <p className="font-black text-white">{num(p.dogtags)}</p>
              <p className="uppercase tracking-wider text-gray-500">Dogtags</p>
            </div>
          </div>

          {/* armas (gametools, com imagens da EA) */}
          {p.armas?.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-white">
                  <Crosshair className="h-4 w-4 text-violet-400" /> Armas · top {p.armas.length}
                </h4>
                <p className="text-[10px] text-gray-500">por kills · live</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {p.armas.map((w, j) => (
                  <div
                    key={w.nome}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5"
                  >
                    {w.imagem ? (
                      <img
                        src={w.imagem}
                        alt=""
                        loading="lazy"
                        className="h-9 w-9 shrink-0 object-contain"
                      />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-gray-500">
                        <Crosshair className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black text-white">{w.nome}</p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">
                        {w.tipo || 'arma'}
                        {w.kpm != null ? ` · ${Number(w.kpm).toFixed(2)} k/min` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-black text-violet-300">{num(w.kills)}</p>
                      <p className="text-[9px] font-bold uppercase text-gray-500">Kills</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ============================================================
   CS2 — cartão de resumo (V/E/D + taxa)
   ============================================================ */
function SummaryCards({ s, delayBase = 0 }) {
  if (!s) return null
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <StatCard icon={Swords} label="Partidas" value={fmt(s.matches)} delay={delayBase} />
        <StatCard
          icon={Trophy}
          label="Vitórias"
          value={fmt(s.wins)}
          color="text-green-400"
          delay={delayBase + 0.05}
        />
        <StatCard
          icon={Skull}
          label="Derrotas"
          value={fmt(s.losses)}
          color="text-red-400"
          delay={delayBase + 0.1}
        />
        <StatCard
          icon={Target}
          label="Empates"
          value={fmt(s.draws)}
          color="text-yellow-400"
          delay={delayBase + 0.15}
        />
        <StatCard
          icon={Flame}
          label="Taxa Vitória"
          value={`${s.winRate}%`}
          color="text-violet-400"
          delay={delayBase + 0.2}
        />
        <StatCard
          icon={Crosshair}
          label="Rondas M / S"
          value={`${fmt(s.roundsFor)} / ${fmt(s.roundsAgainst)}`}
          color="text-purple-400"
          delay={delayBase + 0.25}
        />
      </div>
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-300">Taxa de vitória</span>
          <span className="font-black text-violet-400">{s.winRate}%</span>
        </div>
        <WinRateBar value={s.winRate} delay={0.3} />
        <p className="mt-2 text-xs text-gray-500">
          {s.matches > 0
            ? `${s.wins}V · ${s.draws}E · ${s.losses}D — empates contam meio ponto na taxa.`
            : 'Sem partidas nesta seleção.'}
        </p>
      </div>
    </>
  )
}

/* ============================================================
   CS2 — tabela dos jogadores acompanhados (com cores)
   ============================================================ */
function PlayersTable({ players, stats, subtitle }) {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-violet-400" />
        <h4 className="text-lg font-bold text-white sm:text-xl">
          Jogadores
          <span className="ml-2 text-sm font-normal text-gray-400">{subtitle}</span>
        </h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-gray-500">
              <th className="pb-3 pr-3">Jogador</th>
              <th className="pb-3 pr-3 text-right">Partidas</th>
              <th className="pb-3 pr-3 text-right">V / E / D</th>
              <th className="pb-3 pr-3 text-right">Taxa</th>
              <th className="pb-3 pr-3 text-right">Kills</th>
              <th className="pb-3 pr-3 text-right">K/D</th>
              <th className="pb-3 pr-3 text-right">★ MVP</th>
              <th className="pb-3 pr-3 text-right">Score méd.</th>
              <th className="pb-3 text-right">HSP méd.</th>
            </tr>
          </thead>
          <tbody>
            {players.map((pl) => {
              const s = stats[pl.key]
              const empty = !s || s.matches === 0
              const color = PLAYER_COLORS[pl.key] || '#f97316'
              return (
                <tr
                  key={pl.key}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-bold" style={{ color }}>
                        {pl.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right text-gray-300">
                    {empty ? '—' : fmt(s.matches)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {empty ? (
                      '—'
                    ) : (
                      <span className="text-xs">
                        <span className="font-bold text-green-400">{s.wins}</span>
                        <span className="text-gray-600"> / </span>
                        <span className="font-bold text-yellow-400">{s.draws}</span>
                        <span className="text-gray-600"> / </span>
                        <span className="font-bold text-red-400">{s.losses}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right font-bold text-violet-400">
                    {empty ? '—' : `${s.winRate}%`}
                  </td>
                  <td className="py-3 pr-3 text-right text-gray-300">
                    {empty ? '—' : fmt(s.kills)}
                  </td>
                  <td className="py-3 pr-3 text-right font-bold text-yellow-400">
                    {empty ? '—' : s.kd}
                  </td>
                  <td className="py-3 pr-3 text-right text-gray-300">
                    {empty ? '—' : fmt(s.mvps)}
                  </td>
                  <td className="py-3 pr-3 text-right text-gray-300">
                    {empty ? '—' : fmt(s.avgScore)}
                  </td>
                  <td className="py-3 text-right text-gray-300">
                    {empty ? '—' : `${s.avgHsp}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Médias por partida — refletem o filtro de jogadores ativo.
      </p>
    </div>
  )
}

/* ============================================================
   CS2 — filtros de jogadores (sozinhos ou juntos)
   ============================================================ */
function PlayerFilters({ players, selected, onToggle, onClear, shown, total }) {
  const label = selected.map((k) => players.find((p) => p.key === k)?.name || k)

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
          <Filter className="h-4 w-4 text-violet-400" />
          Jogadores
        </h4>
        {selected.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/20 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Chip "todas" */}
        <button
          onClick={onClear}
          className={`rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
            selected.length === 0
              ? 'bg-violet-500 text-white glow-violet'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          Todas
        </button>

        {/* Um chip por jogador */}
        {players.map((p) => {
          const color = PLAYER_COLORS[p.key] || '#f97316'
          const on = selected.includes(p.key)
          return (
            <button
              key={p.key}
              onClick={() => onToggle(p.key)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm"
              style={{
                backgroundColor: on ? `${color}33` : 'rgba(255,255,255,0.05)',
                color: on ? color : '#d1d5db',
                boxShadow: on ? `0 0 0 1.5px ${color}` : 'none',
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {p.name}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {selected.length === 0 ? (
          <>{fmt(total)} partidas</>
        ) : selected.length === 1 ? (
          <>
            <span className="font-bold text-white">{label[0]}</span> — {fmt(shown)} de{' '}
            {fmt(total)}
          </>
        ) : (
          <>
            <span className="font-bold text-white">{label.join(' + ')}</span>{' '}
            <span className="font-bold text-violet-400">juntos</span> — {fmt(shown)} de{' '}
            {fmt(total)}
          </>
        )}
      </p>
    </div>
  )
}

/* ============================================================
   CS2 — cartões por modo (visibilidade global)
   ============================================================ */
function ModeCards({ modes, perMode, onSelect }) {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-violet-400" />
        <h4 className="text-lg font-bold text-white sm:text-xl">Resumo por modo</h4>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((m, i) => {
          const s = perMode[m.id]
          return (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(m.id)}
              className="rounded-xl bg-white/5 p-4 text-left transition-all duration-300 hover:bg-white/10 hover:scale-[1.02]"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-bold text-white">{m.label}</span>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                    m.game === 'CS2'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {m.game}
                </span>
              </div>
              <div className="mb-2 text-xs text-gray-500">
                {fmt(m.count)} {m.count === 1 ? 'partida' : 'partidas'}
              </div>
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="font-bold text-green-400">{s.wins}V</span>
                <span className="font-bold text-yellow-400">{s.draws}E</span>
                <span className="font-bold text-red-400">{s.losses}D</span>
                <span className="ml-auto font-black text-violet-400">{s.winRate}%</span>
              </div>
              <WinRateBar value={s.winRate} delay={0.1 * i} />
            </motion.button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">Clica num modo para ver só as partidas dele.</p>
    </div>
  )
}

/* ============================================================
   CS2 — linha de partida (expansível com o scoreboard)
   ============================================================ */
function TeamBoard({ players, score, title, isOurs }) {
  return (
    <div
      className={`rounded-xl p-3 ${
        isOurs ? 'bg-violet-500/10 ring-1 ring-violet-500/30' : 'bg-black/30'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className={`text-xs font-black uppercase ${isOurs ? 'text-violet-400' : 'text-gray-500'}`}>
          {title}
        </span>
        <span className={`text-lg font-black ${isOurs ? 'text-violet-400' : 'text-gray-400'}`}>
          {score}
        </span>
      </div>
      <div className="space-y-1">
        {players.map((p, i) => {
          const color = p.tracked ? PLAYER_COLORS[p.tracked] : null
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
              style={
                color
                  ? { backgroundColor: `${color}22` }
                  : { backgroundColor: 'rgba(255,255,255,0.05)' }
              }
            >
              <span
                className={`flex min-w-0 items-center gap-1.5 ${color ? 'font-bold' : 'text-gray-300'}`}
                style={color ? { color } : undefined}
              >
                {color && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="truncate">{p.name}</span>
              </span>
              <span className="flex shrink-0 gap-2 pl-2 text-gray-400">
                <span>
                  <span className="font-bold text-green-400">{p.k}</span>K
                </span>
                <span>
                  <span className="font-bold text-blue-400">{p.a}</span>A
                </span>
                <span>
                  <span className="font-bold text-red-400">{p.d}</span>D
                </span>
                {p.mvp > 0 && <span className="font-bold text-yellow-400">★{p.mvp}</span>}
                <span className="hidden sm:inline">{p.hsp}%</span>
                <span className="font-bold text-white">{p.score}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MatchRow({ m, open, onToggle }) {
  const date = m.date ? new Date(m.date) : null
  const dateLabel = date
    ? date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
  const timeLabel = date
    ? date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : ''
  const res = m.result || 'draw'
  const scoreText =
    m.ourTeam !== null && m.ourTeam !== undefined
      ? `${m.ourScore} - ${m.oppScore}`
      : `${m.scoreA} - ${m.scoreB}`

  const trackedHere = [...(m.teamA || []), ...(m.teamB || [])].filter((p) => p.tracked)

  return (
    <div className="overflow-hidden rounded-xl bg-white/5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${resultBadge[res]}`}
          >
            {resultLabel[res]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-200">{m.label}</span>
              {/* Jogadores acompanhados nesta partida, com as suas cores */}
              {trackedHere.length > 0 && (
                <span className="flex shrink-0 items-center gap-1">
                  {trackedHere.map((p, i) => (
                    <span
                      key={i}
                      title={p.name}
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PLAYER_COLORS[p.tracked] || '#f97316' }}
                    />
                  ))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              {dateLabel && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {dateLabel} {timeLabel}
                </span>
              )}
              {m.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-spin [animation-duration:3s]" />
                  {m.duration}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {m.demo && (
            <a
              href={m.demo}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Ver demo"
              className="text-gray-500 transition-colors hover:text-violet-400"
            >
              <Link className="h-4 w-4" />
            </a>
          )}
          <span className={`text-base font-black ${resultColor[res]}`}>{scoreText}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5"
          >
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
              <TeamBoard
                players={m.teamA}
                score={m.scoreA}
                title="Equipa de cima"
                isOurs={m.ourTeam === 0}
              />
              <TeamBoard
                players={m.teamB}
                score={m.scoreB}
                title="Equipa de baixo"
                isOurs={m.ourTeam === 1}
              />
            </div>
            <p className="px-4 pb-3 text-[11px] text-gray-500">
              Cada jogador acompanhado tem a sua cor · K / A / D · ★ MVP · Headshots % · Score
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   CS2 — página principal
   ============================================================ */
/* Mini-formulário: liga um jogador CS2 só pelo NOME público da
   Steam — o servidor resolve o SteamID sozinho e grava. */
function FormLigar({ nick, setNick, onLigar, aLigar, msg }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onLigar()}
          placeholder="Nome na Steam (igual ao URL: steamcommunity.com/id/NOME)"
          className="w-full max-w-sm rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-gray-600 focus:border-green-500/60 focus:outline-none"
        />
        <button
          onClick={onLigar}
          disabled={aLigar || !nick.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-[13px] font-black text-white transition-colors hover:bg-green-500 disabled:opacity-50"
        >
          {aLigar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          Ligar jogador
        </button>
      </div>
      {msg && (
        <p
          className={`text-[12px] font-bold ${
            msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {msg.texto}
        </p>
      )}
    </div>
  )
}

/* ============================================================
   CS2 — painel AO VIVO via Steam Web API (servidor busca sozinho)
   ============================================================ */
function BattlefieldPage({ aoMudarJogo }) {
  return (
    <div className="space-y-5">
      <BattlefieldStats aoMudarJogo={aoMudarJogo} />
    </div>
  )
}

function Cs2Vivo() {
  const [vivo, setVivo] = useState(null)
  const [cs2Nick, setCs2Nick] = useState('')
  const [aLigar, setALigar] = useState(false)
  const [msgLigar, setMsgLigar] = useState(null)

  const load = () => {
    fetch('/api/games/cs2-live')
      .then((r) => r.json())
      .then((dd) => setVivo(dd))
      .catch(() => setVivo({ ok: false, motivo: 'erro' }))
  }

  useEffect(() => {
    load()
  }, [])

  const ligar = async () => {
    const nick = cs2Nick.trim()
    if (!nick || aLigar) return
    setALigar(true)
    setMsgLigar(null)
    try {
      const r = await fetch('/api/games/cs2-ligar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) setMsgLigar({ tipo: 'erro', texto: d.error || 'Não deu para ligar agora.' })
      else {
        setMsgLigar({ tipo: 'ok', texto: `"${nick}" ligado à Steam — as estatísticas dele já aparecem ao vivo.` })
        setCs2Nick('')
        load()
      }
    } catch {
      setMsgLigar({ tipo: 'erro', texto: 'Sem resposta do servidor.' })
    } finally {
      setALigar(false)
    }
  }

  const setupMsg = {
    'sem-key':
      'Falta só a key gratuita da Steam: cria em steamcommunity.com/dev/apikey e coloca STEAM_API_KEY no server/.env. Depois disto as estatísticas de CS2 mostradas aqui ficam ao vivo sempre, sem exportar nada.',
    'sem-membros':
      'Basta escrever os nomes da Steam dos nossos jogadores em server/data/cs2-steam.json — tipo ["xalanix", "sonojo"] — e o servidor descobre os IDs sozinho. Ou usa o campo abaixo.',
    'ids-invalidos':
      'Há nomes nesta lista que não correspondem a nenhum perfil público da Steam (steamcommunity.com/id/NOME). Confirma o nome no URL do perfil deles ou os IDs tem de ser SteamID64 (17 números, 7656…).',
  }

  if (vivo === null) return null

  if (!vivo.ok) {
    return (
      <div className="space-y-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-gray-300">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <p>
            <span className="font-bold text-white">CS2 ao vivo (Steam):</span>{' '}
            {setupMsg[vivo.motivo] ||
              'Sem ligação à Steam Web API agora — as estatísticas de baixo continuam disponíveis.'}
          </p>
        </div>
        <FormLigar
          nick={cs2Nick}
          setNick={setCs2Nick}
          onLigar={ligar}
          aLigar={aLigar}
          msg={msgLigar}
        />
      </div>
    )
  }

  const tudo = vivo.jogadores || []
  const jog = tudo.filter((p) => p.ok)
  const priv = tudo.filter((p) => !p.ok)
  if (!tudo.length) return null

  const Célula = ({ label, valor, cor = 'text-white' }) => (
    <div className="rounded-lg bg-white/[0.04] py-2 text-center">
      <p className={`font-display text-base font-black ${cor}`}>{valor}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
    </div>
  )

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative grid h-2.5 w-2.5 place-items-center">
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="h-2 w-2 rounded-full bg-green-400" />
          </span>
          <h3 className="font-display text-base font-black text-white">
            CS2 ao vivo <span className="text-gray-500">— via Steam</span>
          </h3>
        </div>
        <p className="text-[11px] text-gray-500">atualiza sozinho · Steam Web API</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {jog.map((p, i) => (
          <motion.div
            key={p.steam}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              {p.avatar ? (
                <img src={p.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-lg font-black text-violet-300">
                  {(p.nick || p.nome || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-black text-white">{p.nick || p.nome}</p>
                <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-green-400">
                  Ao vivo
                </span>
              </div>
            </div>

            {/* heróis */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-xl font-black text-violet-300">{p.kills ?? '—'}</p>
                <p className="text-[9px] font-bold uppercase text-gray-500">Kills</p>
              </div>
              <div>
                <p className="font-display text-xl font-black text-white">{p.kd ?? '—'}</p>
                <p className="text-[9px] font-bold uppercase text-gray-500">K/D</p>
              </div>
              <div>
                <p className="font-display text-xl font-black text-sky-300">
                  {p.hs != null ? `${p.hs}%` : '—'}
                </p>
                <p className="text-[9px] font-bold uppercase text-gray-500">HS %</p>
              </div>
            </div>

            {/* detalhe completo */}
            <div className="mt-2 grid grid-cols-4 gap-2">
              <Célula label="MVPs (rondas)" valor={p.mvps ?? '—'} cor="text-amber-300" />
              <Célula label="Precisão" valor={p.precisao != null ? `${p.precisao}%` : '—'} cor="text-sky-300" />
              <Célula label="Vitórias" valor={p.vitorias ?? '—'} cor="text-green-400" />
              <Célula label="Partidas" valor={p.partidas ?? '—'} />
              <Célula label="Rondas" valor={p.rondas ?? '—'} />
              <Célula label="Faca" valor={p.faca ?? '—'} cor="text-orange-300" />
              <Célula label="Granadas" valor={p.he ?? '—'} cor="text-orange-300" />
              <Célula
                label="Bombas P/D"
                valor={p.planted != null || p.defused != null ? `${p.planted ?? 0}/${p.defused ?? 0}` : '—'}
                cor="text-emerald-300"
              />
              <Célula label="Danos" valor={p.dano != null ? fmt(p.dano) : '—'} />
              <Célula label="Pistola" valor={p.pistola ?? '—'} />
              <Célula label="Mortes" valor={p.deaths ?? '—'} cor="text-gray-300" />
            </div>
          </motion.div>
        ))}
        {priv.map((p) => (
          <div
            key={p.steam}
            className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4"
            title={p.erro || ''}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm font-black text-gray-300">{p.nick || p.steam}</p>
              <span className="rounded-md bg-yellow-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-yellow-400">
                {p.motivo === 'nao-publico' ? 'Steam: recusado' : 'Sem dados'}
              </span>
            </div>
            {p.motivo === 'nao-publico' ? (
              <p className="text-[12px] leading-snug text-gray-500">
                A própria Steam devolve <span className="font-bold text-yellow-400">"Profile is not public"</span> para
                esta conta — no jogo nada se vê, mesmo que o perfil se veja. Quem dono dela é que tem de fazer:{' '}
                <span className="font-bold text-gray-300">Steam → editar perfil → Privacidade → "Detalhes do jogo: Público"</span>{' '}
                (e na biblioteca: botão direito no CS2 → Gerir → "Definir como privado" <span className="font-bold">DESLIGADO</span>).
              </p>
            ) : (
              <p className="text-[12px] leading-snug text-gray-500">
                A Steam ainda não devolveu números para estas contas — pode ser
                só um atraso/caches da Steam; repete em minutos (a página refresca
                com o botão de atualizar).
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Rankings ao vivo — comparar os jogadores ligados (nada de ficheiros) */}
      {jog.length > 1 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-gray-300">
            <Trophy className="h-4 w-4 text-amber-300" />
            Rankings do esquadrão — ao vivo
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Top kills', campo: 'kills', cor: 'text-violet-300' },
              { label: 'Melhor K/D', campo: 'kd', cor: 'text-white' },
              { label: 'MVPs (rondas)', campo: 'mvps', cor: 'text-amber-300' },
              { label: 'HS %', campo: 'hs', sufixo: '%', cor: 'text-sky-300' },
              { label: 'Precisão', campo: 'precisao', sufixo: '%', cor: 'text-sky-300' },
              { label: 'Vitórias', campo: 'vitorias', cor: 'text-green-400' },
            ].map((r) => {
              const ordem = [...jog].sort(
                (a, b) => (Number(b?.[r.campo]) || -1) - (Number(a?.[r.campo]) || -1),
              )
              const val = (x) =>
                x?.[r.campo] != null && x?.[r.campo] !== '' ? `${x[r.campo]}${r.sufixo || ''}` : '—'
              return (
                <div key={r.campo} className="rounded-lg bg-white/[0.05] p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    {r.label}
                  </p>
                  {ordem.slice(0, 3).map((x, xi) => (
                    <p
                      key={x.steam}
                      className="mt-1 flex items-center justify-between gap-2 text-[13px]"
                    >
                      <span className="min-w-0 truncate font-bold text-gray-200">
                        {['🥇', '🥈', '🥉'][xi]} {x.nick || x.nome}
                      </span>
                      <span
                        className={`shrink-0 font-black ${xi === 0 ? r.cor : 'text-gray-400'}`}
                      >
                        {val(x)}
                      </span>
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-gray-500">
            Calculado de imediato com o que a Steam mostra ao vivo de cada jogador. A Steam
            não publica as partidas uma a uma (nem as 10 melhores nem as 10 últimas de cada
            conta) — isso só seria possível se os jogadores ligassem as contas ao FACEIT.
          </p>
        </div>
      )}

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="mb-2 text-[12px] text-gray-500">
          Queres acrescentar mais alguém ao vivo? Escreve só o nome da Steam:
        </p>
        <FormLigar
          nick={cs2Nick}
          setNick={setCs2Nick}
          onLigar={ligar}
          aLigar={aLigar}
          msg={msgLigar}
        />
      </div>
    </div>
  )
}

function Cs2Page() {
  const [aba, setAba] = useState('stats')
  return (
    <div className="space-y-5">
      <SubAbaJogo jogo="cs2" aba={aba} setAba={setAba} />
      {aba === 'stats' ? <Cs2Vivo /> : <SkinsRarosTab jogo="cs2" />}
    </div>
  )
}

const fmtSecs = (sec) => {
  const s = Number(sec) || 0
  const h = Math.floor(s / 3600)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
  return `${Math.round(s / 60)} min`
}


/* ============================================================
   Rainbow Six — cartões do esquadrão (rank, nível, carreira)
   ============================================================ */

/* RP -> rank do Rainbow Six (Ranked 2.0): devolve o nome e o
   ícone do rank atingido, para o "Rank máx." não ficar só em números. */
const ROMANOS = ['V', 'IV', 'III', 'II', 'I']
const R6_TIERS = [
  { nome: 'COPPER', slug: 'copper', min: 0, max: 1600 },
  { nome: 'BRONZE', slug: 'bronze', min: 1600, max: 2100 },
  { nome: 'SILVER', slug: 'silver', min: 2100, max: 2600 },
  { nome: 'GOLD', slug: 'gold', min: 2600, max: 3200 },
  { nome: 'PLATINUM', slug: 'platinum', min: 3200, max: 4100 },
  { nome: 'EMERALD', slug: 'emerald', min: 4100, max: 4600 },
  { nome: 'DIAMOND', slug: 'diamond', min: 4600, max: 5000 },
  { nome: 'CHAMPION', slug: 'champion', min: 5000, max: Infinity },
]
const rankImg = (slug) =>
  `https://trackercdn.com/cdn/r6.tracker.network/ranks/3.0/medium/${slug}.png?v=5`

/* Converte um nome de rank ("GOLD III") para o slug da imagem */
const slugDeNome = (nome) => {
  const s = String(nome || '').toUpperCase().trim()
  const m = s.match(/^(.+?)[\s-]+(IV|III|II|I|V)$/)
  const tier = (m ? m[1] : s).trim().toLowerCase().replace(/\s+/g, '-')
  const num = m ? { I: 1, II: 2, III: 3, IV: 4, V: 5 }[m[2]] : null
  return num ? `${tier}-${num}` : tier
}

const rankFromRp = (rp) => {
  const r = Number(rp) || 0
  if (r <= 0) return null
  const t = R6_TIERS.find((x) => r >= x.min && r < x.max)
  if (!t) return null
  if (!Number.isFinite(t.max)) return { name: 'CHAMPION', img: rankImg('champion') }
  const idx = Math.min(4, Math.max(0, Math.floor((r - t.min) / ((t.max - t.min) / 5))))
  return { name: `${t.nome} ${ROMANOS[idx]}`, img: rankImg(`${t.slug}-${5 - idx}`) }
}

/* Rank máximo: vem do tracker (r6.json → maxRank, colhido no perfil
   de cada jogador — é o melhor rank que a conta já teve, não o do RP
   das partidas guardadas aqui). Aceita objeto {name, img, rp, season}
   ou texto antigo; só em último caso se calcula do maior RP. */
const maxRankDe = (p, rp) => {
  const m = p.maxRank
  if (m && typeof m === 'object' && m.name) {
    return { name: m.name, img: m.img || rankImg(slugDeNome(m.name)), rp: m.rp, season: m.season }
  }
  if (typeof m === 'string' && m.trim()) return { name: m, img: rankImg(slugDeNome(m)) }
  return rankFromRp(rp)
}

function R6Squad({ players, maxRp = {} }) {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-violet-400" />
        <h4 className="text-lg font-bold text-white sm:text-xl">Esquadrão</h4>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p, i) => {
          const color = PLAYER_COLORS[p.key] || '#f97316'
          const ov = p.overview || {}
          const wr = ov.matchesPlayed
            ? Math.round(((ov.matchesWon || 0) / ov.matchesPlayed) * 100)
            : 0
          const rank = p.rank || null
          const ranked = rank && rank.name && rank.name !== 'NO RANK'
          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-xl bg-white/5 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {(p.handle || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-bold" style={{ color }}>
                    {p.handle}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Nível {p.level ?? '—'}
                    {ranked && rank.points > 0 ? ` · ${fmt(rank.points)} RP` : ''}
                  </div>
                </div>
                {rank && rank.img && (
                  <img
                    src={rank.img}
                    alt=""
                    title={rank.name}
                    className="ml-auto h-10 w-10 shrink-0 object-contain"
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-black text-white">{fmt(ov.matchesPlayed || 0)}</div>
                  <div className="text-gray-500">Partidas</div>
                </div>
                <div>
                  <div className="font-black text-violet-400">{wr}%</div>
                  <div className="text-gray-500">Vitórias</div>
                </div>
                <div>
                  <div className="font-black text-yellow-400">{ov.kdRatio ?? '—'}</div>
                  <div className="text-gray-500">K/D</div>
                </div>
                <div>
                  <div className="font-black text-green-400">{ov.killsPerMatch ?? '—'}</div>
                  <div className="text-gray-500">K/partida</div>
                </div>
                <div>
                  <div className="font-black text-purple-400">{fmt(ov.kills || 0)}</div>
                  <div className="text-gray-500">Kills</div>
                </div>
                <div>
                  <div className="font-black text-blue-400">{fmtSecs(ov.timePlayed || 0)}</div>
                  <div className="text-gray-500">Tempo</div>
                </div>
              </div>
              <div
                className={`mt-2 text-center text-[11px] font-black ${
                  ranked ? 'text-yellow-400' : 'text-gray-500'
                }`}
              >
                {rank ? rank.name : 'Sem rank'}
                {rank && rank.season ? ` · ${rank.season}` : ''}
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-black text-violet-300">
                {(() => {
                  // rank máximo: o melhor que a conta já teve (tracker)
                  const max = maxRankDe(p, maxRp[p.key])
                  if (!max) return <span className="text-gray-500">Rank máx. · —</span>
                  const rp = max.rp || maxRp[p.key]
                  return (
                    <>
                      <img
                        src={max.img}
                        alt=""
                        title={`${max.name}${rp ? ` · ${rp} RP` : ''}${max.season ? ` · ${max.season}` : ''}`}
                        className="h-4 w-4 shrink-0 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <span className="truncate">Rank máx. · {max.name}</span>
                    </>
                  )
                })()}
              </div>
            </motion.div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Nível, rank da temporada, rank máximo e números de carreira de cada membro — só o
        esquadrão.
      </p>
    </div>
  )
}

/* ============================================================
   Rainbow Six — página principal
   ============================================================ */
/* ============================================================
   Rainbow Six — só o esquadrão
   (sem secções, modos, partidas nem filtros)
   ============================================================ */
function R6Stats() {
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  const load = () => {
    setState({ loading: true, data: null, error: '' })
    fetch('/api/games/r6')
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setState({ loading: false, data: d, error: d.error })
        else setState({ loading: false, data: d, error: '' })
      })
      .catch(() =>
        setState({ loading: false, data: null, error: 'Erro ao carregar. Tenta novamente.' }),
      )
  }

  useEffect(() => {
    let cancel = false
    fetch('/api/games/r6')
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return
        if (d?.error) setState({ loading: false, data: d, error: d.error })
        else setState({ loading: false, data: d, error: '' })
      })
      .catch(() => {
        if (!cancel)
          setState({ loading: false, data: null, error: 'Erro ao carregar. Tenta novamente.' })
      })
    return () => {
      cancel = true
    }
  }, [])

  const d = state.data

  /* Rank máximo de cada um: maior RP atingido nas partidas ranked
     (se o campo manual `maxRank` existir no r6.json, esse manda) */
  const maxRp = useMemo(() => {
    const map = {}
    for (const m of d?.matches || []) {
      if (m.modeKey !== 'ranked') continue
      for (const p of m.players || []) {
        const rp = Number(p.rp) || 0
        if (rp > (map[p.key] || 0)) map[p.key] = rp
      }
    }
    return map
  }, [d])

  if (state.loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p className="text-sm text-gray-400">A ler os dados do Rainbow Six...</p>
      </div>
    )
  }

  // ---------- Snapshot em falta ----------
  if (d?.configured === false && d?.missing?.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mx-auto max-w-2xl rounded-2xl p-6 sm:p-8"
      >
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
            <KeyRound className="h-8 w-8 text-violet-500" />
          </div>
          <h2 className="mb-2 text-xl font-black text-white">Falta o snapshot do tracker.gg</h2>
          <p className="text-sm text-gray-400">
            Falta gerar o ficheiro com os dados do esquadrão:
          </p>
        </div>
        <ul className="space-y-2">
          {d.missing.map((f) => (
            <li
              key={f}
              className="rounded-lg bg-black/40 px-4 py-2 font-mono text-sm text-violet-400"
            >
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-gray-500">
          Depois reinicia com o <code className="text-violet-500">INICIAR.bat</code> e os dados
          aparecem aqui.
        </p>
        <div className="mt-5 text-center">
          <button
            onClick={load}
            className="rounded-full bg-violet-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-600"
          >
            Tentar novamente
          </button>
        </div>
      </motion.div>
    )
  }

  // ---------- Erro ----------
  if (state.error || !d) {
    return (
      <div className="mx-auto max-w-xl">
        <Estado
          tipo="erro"
          icon={Gamepad2}
          titulo="Não deu para carregar"
          texto={state.error || 'Erro ao carregar.'}
          acao={{ label: 'Tentar novamente', onClick: load }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* estado da atualização — engine Ubisoft (open source) */}
      {d.auto?.ligado ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-500/25 bg-green-500/5 px-4 py-2.5 text-[13px] text-gray-300">
          <span className="relative inline-flex h-2.5 w-2.5 place-items-center">
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="h-2 w-2 rounded-full bg-green-400" />
          </span>
          <span>
            Estatísticas <span className="font-bold text-green-400">automáticas</span> — API da
            Ubisoft (open source SwiftCODA/R6-API)
            {d.auto.intervaloMin
              ? ` · a cada ${d.auto.intervaloMin} min`
              : ''}
            {d.temporada ? ` · temporada ${d.temporada}` : ''}
            {d.updatedAt
              ? ` · dados ${new Date(d.updatedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </span>
        </div>
      ) : d.auto?.credencial ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-gray-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>
            <span className="font-bold text-white">R6 automático (API da Ubisoft):</span> conta
            ligada — a sincronizar.{' '}
            {d.auto?.ultimoErro
              ? `Última tentativa: ${d.auto.ultimoErro}`
              : 'Ainda sem dados novos.'}{' '}
            A Ubisoft limita pedidos por hora (e antigos do tracker ficam como recuo até a primeira
            sincronização chegar).
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-gray-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <p>
            <span className="font-bold text-white">R6 automático (API da Ubisoft):</span> falta só a
            conta — cria uma conta Ubisoft gratuita, coloca{' '}
            <code className="text-violet-300">UBI_EMAIL=...</code> e{' '}
            <code className="text-violet-300">UBI_PASSWORD=...</code> no{' '}
            <code className="text-violet-300">server/.env</code> e reinicia. A partir daí o servidor
            atualiza o esquadrão sozinho (open source SwiftCODA/R6-API) — sem tracker.gg nem
            carregamentos manuais.
          </p>
        </div>
      )}

      <R6Squad players={d.players || []} maxRp={maxRp} />

      <p className="text-center text-xs text-gray-500">
        <Star className="mr-1 inline h-3 w-3 text-violet-400" />
        Dados da API oficial da Ubisoft
        {d.auto?.fonte === 'ubisoft' && d.auto?.credencial
          ? ' — atualização automática, sem tracker.gg'
          : ' — lidos localmente enquanto a conta Ubisoft não está no .env'}
        {d.updatedAt
          ? ' · atualizado a ' +
            new Date(d.updatedAt).toLocaleString('pt-PT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''}
      </p>
    </div>
  )
}

function R6StatsPage() {
  const [aba, setAba] = useState('stats')
  return (
    <div className="space-y-5">
      <SubAbaJogo jogo="r6" aba={aba} setAba={setAba} />
      {aba === 'stats' ? <R6Stats /> : <SkinsRarosTab jogo="r6" />}
    </div>
  )
}

export default function GamesPage() {
  const [tab, setTab] = useState(null)
  /* qual dos três Battlefield está selecionado — muda a foto de fundo */
  const [bfJogo, setBfJogo] = useState('bf1')

  /* marca o body quando um jogo com fundo está ativo
     (as colunas fixas ganham translucidez via CSS .painel-fixo) */
  useEffect(() => {
    const jogosComFundo = ['cs2', 'r6', 'fortnite', 'bf']
    document.body.classList.toggle('in-jogo', jogosComFundo.includes(tab))
    // temática de cores por jogo
    const tema = tab === null ? 'default' : tab === 'bf' ? 'bf1' : tab
    document.body.dataset.theme = tema
    return () => {
      document.body.classList.remove('in-jogo')
      document.body.dataset.theme = 'default'
    }
  }, [tab])

  return (
    <section className="relative min-h-screen px-4 pb-20 pt-24 sm:pt-28 sm:px-6">
      {/* fundo com a imagem do jogo: FIXA no ecrã inteiro (passa por
          baixo da sidebar e da coluna direita, translúcidas), escurecido
          para as estatísticas ficarem bem visíveis */}
      {['cs2', 'r6', 'fortnite', 'bf'].includes(tab) && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
            style={{
              backgroundImage:
                tab === 'cs2'
                  ? 'url(/nukecs2.png)'
                  : tab === 'r6'
                  ? 'url(/coastliner6.jpg)'
                  : tab === 'fortnite'
                  ? 'url(/fortnite.jpg)'
                  : tab === 'bf'
                  ? 'url(/bf1.jpg)'
                  : 'url(/bf1.jpg)',
            }}
          />
          {/* véu escuro por cima da foto */}
          <div className="absolute inset-0 bg-black/65" />
          {/* gradiente para fundir com o resto da página */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0612]/80 via-[#0a0612]/50 to-[#0a0612]/90" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center sm:mb-10"
        >
          <h1
            className="mb-3 font-black gradient-text"
            style={{ fontSize: 'clamp(1.9rem, 7vw, 3.2rem)' }}
          >
            Jogos
          </h1>
        </motion.div>

        {tab === null ? (
          <GameChooser onPick={setTab} />
        ) : (
          <>
            {/* Abas de jogo */}
            <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
              <TabBar
                ariaLabel="Escolher jogo"
                className="tabbar-grande"
                value={tab}
                onChange={setTab}
                items={[
                  { id: 'cs2', label: 'CS2', Icon: Gamepad2 },
                  { id: 'r6', label: 'Rainbow Six', Icon: Crosshair },
                  { id: 'fortnite', label: 'Fortnite', Icon: Flame },
                  { id: 'bf', label: 'Battlefield', Icon: Target },
                ]}
              />
              <button
                onClick={() => setTab(null)}
                title="Escolher outro jogo"
                className="btn-glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-gray-300"
              >
                <RotateCcw className="h-4 w-4" />
                Trocar
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {tab === 'fortnite' ? (
                  <FortnitePage />
                ) : tab === 'bf' ? (
                  <BattlefieldPage aoMudarJogo={setBfJogo} />
                ) : tab === 'r6' ? (
                  <R6StatsPage />
                ) : (
                  <Cs2Page />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  )
}
