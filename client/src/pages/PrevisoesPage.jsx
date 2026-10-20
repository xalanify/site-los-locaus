import { useEffect, useRef, useState } from 'react'
import {
  Swords,
  Trophy,
  Clock,
  Flame,
  Lock,
  Check,
  X,
  RefreshCw,
  Users,
  Target,
  Sparkles,
  Loader2,
  ChevronDown,
  Medal,
  ArrowRight,
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import { authHeaders } from '../lib/auth'
import { toast } from '../components/Feedback'

const fmtDia = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hoje = new Date()
  const amanha = new Date()
  amanha.setDate(hoje.getDate() + 1)
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  if (d.toDateString() === amanha.toDateString()) return 'Amanhã'
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })
}

const fmtHora = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

const faltam = (iso) => {
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const min = Math.floor(ms / 60000)
  const dias = Math.floor(min / 1440)
  const horas = Math.floor((min % 1440) / 60)
  if (dias > 0) return `Faltam ${dias}d ${horas}h`
  if (horas > 0) return `Faltam ${horas}h ${min % 60}min`
  return `Faltam ${Math.max(1, min)}min`
}

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0)

function TeamLogo({ team, size = 'h-12 w-12' }) {
  if (team && team.logo) {
    return (
      <img
        src={team.logo}
        alt=""
        className={`${size} shrink-0 object-contain`}
        loading="lazy"
      />
    )
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-black text-violet-300 ring-1 ring-violet-400/20`}
    >
      {(team && team.name ? team.name.slice(0, 1) : '?').toUpperCase()}
    </span>
  )
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-300 ring-1 ring-red-400/30">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      Ao vivo
    </span>
  )
}

function VoterList({ match, user }) {
  const votos = [
    ...match.voters.a.map((v) => ({ ...v, pick: 'a' })),
    ...match.voters.b.map((v) => ({ ...v, pick: 'b' })),
  ].sort((a, b) => String(a.username).localeCompare(String(b.username)))
  if (!votos.length) {
    return <p className="py-2 text-xs font-semibold text-gray-500">Ainda ninguém votou neste jogo.</p>
  }
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {votos.map((v) => {
        const escolha = v.pick === 'a' ? match.team_a.name : match.team_b.name
        return (
          <div
            key={`${v.id}-${v.pick}`}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
              v.id === Number(user && user.id)
                ? 'border-violet-400/30 bg-violet-500/[0.08]'
                : 'border-white/5 bg-white/[0.03]'
            }`}
          >
            <AvatarImg src={v.avatar_url} name={v.username} className="h-6 w-6" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-200">
              {v.username}
              {v.id === Number(user && user.id) ? ' (tu)' : ''}
            </span>
            <span className="max-w-[42%] truncate text-[10px] font-semibold text-gray-400">{escolha}</span>
            {v.correct === true && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
            {v.correct === false && <X className="h-3.5 w-3.5 shrink-0 text-red-400" />}
          </div>
        )
      })}
    </div>
  )
}

function PredictionCard({ match, user, onVote, votando }) {
  const [aberto, setAberto] = useState(false)
  const live = match.status === 2
  const acabado = match.status === 3
  const total = match.counts.total
  const minhaEscolha = match.pick
  const escolhaCerta = acabado && match.winner ? (match.winner === 'a' ? match.team_a : match.team_b) : null

  const classeEquipa = (lado) => {
    const escolhida = minhaEscolha === lado
    if (acabado) {
      if (match.winner === lado) return 'border-emerald-400/40 bg-emerald-500/[0.08]'
      if (match.winner) return 'border-white/5 bg-white/[0.02] opacity-70'
    }
    if (escolhida) return 'border-violet-400/60 bg-violet-500/[0.14] ring-1 ring-violet-400/30'
    return match.can_vote
      ? 'border-white/10 bg-white/[0.03] hover:border-violet-400/40 hover:bg-violet-500/[0.06]'
      : 'border-white/5 bg-white/[0.02]'
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.045] to-white/[0.015] shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2.5 sm:px-4">
        {match.competition_logo ? (
          <img src={match.competition_logo} alt="" className="h-6 w-6 rounded object-contain" loading="lazy" />
        ) : (
          <Swords className="h-4 w-4 text-violet-300" />
        )}
        <span className="min-w-0 flex-1 break-words text-[11px] font-black uppercase leading-snug tracking-wider text-gray-300">
          {match.competition || 'Rainbow Six Siege'}
          {match.phase ? <span className="font-semibold normal-case tracking-normal text-gray-500"> · {match.phase}</span> : null}
        </span>
        {match.format && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
            BO{match.format}
          </span>
        )}
        {live ? <LiveDot /> : null}
      </div>

      <div className="px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
            <Clock className="h-3 w-3" /> {fmtDia(match.start_time)} · {fmtHora(match.start_time)}
            {match.status === 1 && faltam(match.start_time) && (
              <span className="ml-1 text-violet-300">· {faltam(match.start_time)}</span>
            )}
          </span>
          {acabado && match.winner && (
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Resultado final</span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
          <button
            type="button"
            disabled={!match.can_vote || votando}
            onClick={() => onVote(match, 'a')}
            className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all ${classeEquipa('a')} ${
              match.can_vote ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <TeamLogo team={match.team_a} />
            <span className="line-clamp-2 text-xs font-black leading-tight text-white sm:text-sm">
              {match.team_a.name || 'A definir'}
            </span>
            {match.status !== 1 && <span className="text-2xl font-black tabular-nums text-white">{match.score_a}</span>}
            {total > 0 && (
              <span className="w-full">
                <span className="block text-[10px] font-bold text-gray-400">{pct(match.counts.a, total)}%</span>
                <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-violet-500" style={{ width: `${pct(match.counts.a, total)}%` }} />
                </span>
              </span>
            )}
          </button>

          <div className="flex w-10 flex-col items-center justify-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">vs</span>
            {match.locked && match.status === 1 ? (
              <Lock className="h-4 w-4 text-gray-500" title="Apostas fechadas" />
            ) : match.can_vote ? (
              <Target className="h-4 w-4 text-violet-400/70" />
            ) : null}
          </div>

          <button
            type="button"
            disabled={!match.can_vote || votando}
            onClick={() => onVote(match, 'b')}
            className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all ${classeEquipa('b')} ${
              match.can_vote ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <TeamLogo team={match.team_b} />
            <span className="line-clamp-2 text-xs font-black leading-tight text-white sm:text-sm">
              {match.team_b.name || 'A definir'}
            </span>
            {match.status !== 1 && <span className="text-2xl font-black tabular-nums text-white">{match.score_b}</span>}
            {total > 0 && (
              <span className="w-full">
                <span className="block text-[10px] font-bold text-gray-400">{pct(match.counts.b, total)}%</span>
                <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-fuchsia-500" style={{ width: `${pct(match.counts.b, total)}%` }} />
                </span>
              </span>
            )}
          </button>
        </div>

        {live && match.maps && match.maps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.maps
              .filter((m) => m.status === 3 || m.a || m.b)
              .map((m) => (
                <span
                  key={m.index}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold text-gray-300"
                >
                  {m.mapa || `Mapa ${m.index}`}: <span className="text-white">{m.a ?? 0}</span> —{' '}
                  <span className="text-white">{m.b ?? 0}</span>
                </span>
              ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {match.can_vote && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-300 ring-1 ring-violet-400/20">
              <Target className="h-3 w-3" /> Escolhe quem ganha
            </span>
          )}
          {match.status === 1 && match.locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-400">
              <Lock className="h-3 w-3" /> Apostas fechadas
            </span>
          )}
          {minhaEscolha && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${
                match.correct === true
                  ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30'
                  : match.correct === false
                    ? 'bg-red-500/10 text-red-300 ring-red-400/30'
                    : 'bg-white/5 text-gray-300 ring-white/10'
              }`}
            >
              {match.correct === true ? <Check className="h-3 w-3" /> : match.correct === false ? <X className="h-3 w-3" /> : <Target className="h-3 w-3" />}
              A tua escolha: {minhaEscolha === 'a' ? match.team_a.name : match.team_b.name}
              {match.correct === true ? ' · acertaste' : match.correct === false ? ' · falhaste' : ''}
            </span>
          )}
          {acabado && escolhaCerta && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/20">
              <Trophy className="h-3 w-3" /> {escolhaCerta.name}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-gray-500">
            <Users className="h-3 w-3" /> {total} {total === 1 ? 'voto' : 'votos'}
          </span>
          <button
            onClick={() => setAberto((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-300 hover:bg-white/10 hover:text-white"
          >
            Quem votou <ChevronDown className={`h-3 w-3 transition-transform ${aberto ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {aberto && (
          <div className="mt-2 rounded-xl border border-white/5 bg-black/20 p-2">
            <VoterList match={match} user={user} />
          </div>
        )}
      </div>
    </article>
  )
}

function Podium({ users }) {
  if (!users.length) return null
  const ordem = [users[1], users[0], users[2]].filter(Boolean)
  const cores = ['from-slate-400/30 to-slate-600/10', 'from-amber-400/30 to-amber-600/10', 'from-orange-500/25 to-orange-700/10']
  const alturas = ['sm:mt-6', '', 'sm:mt-9']
  return (
    <div className="mb-4 grid grid-cols-3 items-end gap-2">
      {ordem.map((u) => {
        const idx = users.findIndex((x) => x.id === u.id)
        const cor = cores[Math.min(idx, 2)] || cores[0]
        const altura = alturas[Math.min(idx, 2)] || ''
        return (
          <div key={u.id} className={`rounded-2xl border border-white/10 bg-gradient-to-b ${cor} px-2 py-3 text-center ${altura}`}>
            <div className="relative mx-auto mb-2 w-fit">
              <AvatarImg src={u.avatar_url} name={u.username} className="h-12 w-12 ring-2 ring-white/20" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#171122] text-[10px] font-black text-white ring-1 ring-white/20">
                {idx + 1}
              </span>
            </div>
            <p className="truncate text-xs font-black text-white">{u.username}</p>
            <p className="mt-0.5 text-[10px] font-bold text-emerald-300">{u.acertos} acertos</p>
            <p className="text-[9px] font-semibold text-gray-400">
              {u.acertos + u.falhas ? Math.round((u.acertos / (u.acertos + u.falhas)) * 100) : 0}% · {u.total} jogos
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default function PrevisoesPage({ user }) {
  const [matches, setMatches] = useState([])
  const [tab, setTab] = useState('proximos')
  const [loading, setLoading] = useState(true)
  const [sync, setSync] = useState(null)
  const [erro, setErro] = useState('')
  const [votando, setVotando] = useState(0)
  const [classificacao, setClassificacao] = useState([])
  const [classLoading, setClassLoading] = useState(false)
  const [resultadosNovos, setResultadosNovos] = useState([])
  const [modalResultados, setModalResultados] = useState(false)
  const [, setTick] = useState(0)
  const recarregarRef = useRef(() => {})

  const carregarResultadosNovos = async () => {
    try {
      const r = await fetch('/api/previsoes/resultados-novos', { headers: authHeaders() })
      if (!r.ok) return
      const d = await r.json()
      if (d.results && d.results.length) {
        setResultadosNovos(d.results)
        setModalResultados(true)
      }
    } catch {
      /* ignora */
    }
  }

  useEffect(() => {
    let vivo = true
    let n = 0
    const carregar = async (forcar = false) => {
      try {
        const r = await fetch(`/api/previsoes${forcar ? '?sync=1' : ''}`, { headers: authHeaders() })
        const d = await r.json().catch(() => null)
        if (!vivo) return
        if (!r.ok || !d) throw new Error((d && d.error) || 'Não deu para carregar os jogos.')
        setMatches(d.matches || [])
        setSync(d.sync || null)
        setErro('')
      } catch (e) {
        if (vivo) setErro(e.message || 'Sem ligação ao servidor.')
      } finally {
        if (vivo) setLoading(false)
      }
    }
    recarregarRef.current = async () => {
      await carregar(true)
      carregarResultadosNovos()
    }
    // Abre já com o que está na base de dados e sincroniza a seguir,
    // para a página nunca ficar 3 segundos em "a carregar".
    carregar(false).finally(() => {
      if (vivo) {
        carregar(true).finally(() => {
          if (vivo) carregarResultadosNovos()
        })
      }
    })
    const t = setInterval(async () => {
      if (document.hidden) return
      n++
      if (n % 4 === 0) {
        await carregar(true)
        if (vivo) carregarResultadosNovos()
      } else {
        carregar(false)
      }
    }, 20000)
    const relogio = setInterval(() => setTick((x) => x + 1), 30000)
    return () => {
      vivo = false
      clearInterval(t)
      clearInterval(relogio)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'classificacao') return
    let vivo = true
    setClassLoading(true)
    fetch('/api/previsoes/classificacao', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d) setClassificacao(d.users || [])
      })
      .catch(() => {})
      .finally(() => vivo && setClassLoading(false))
    return () => {
      vivo = false
    }
  }, [tab, matches.length])

  const votar = async (m, pick) => {
    if (!m.can_vote || votando) return
    setVotando(m.id)
    try {
      const r = await fetch(`/api/previsoes/${m.id}/voto`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ pick }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não deu para votar.')
      setMatches((prev) =>
        prev.map((x) =>
          x.id === m.id
            ? { ...x, pick, counts: { ...x.counts, ...(d.counts || {}) }, can_vote: true }
            : x,
        ),
      )
      toast.ok('Voto guardado. Boa sorte!')
    } catch (e) {
      toast.erro(e.message || 'Não deu para votar.')
    } finally {
      setVotando(0)
    }
  }

  const fecharResultados = () => {
    setModalResultados(false)
    fetch('/api/previsoes/resultados-vistos', { method: 'POST', headers: authHeaders() }).catch(() => {})
    setTimeout(() => setResultadosNovos([]), 250)
  }

  const proximos = matches.filter((m) => m.status === 1 || m.status === 2)
  const resultados = matches.filter((m) => m.status === 3)
  const aoVivo = proximos.filter((m) => m.status === 2)
  const acertos = resultados.filter((m) => m.correct === true).length
  const falhas = resultados.filter((m) => m.correct === false).length

  const meuNome = user && user.id
  const minhaClass = classificacao.find((u) => u.id === Number(meuNome))

  return (
    <div className="mx-auto w-full max-w-4xl px-2 pb-4 pt-14 sm:pt-16 lg:px-0 lg:pt-0">
      {/* cabeçalho */}
      <section className="relative mb-4 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/25 via-[#17102a] to-fuchsia-600/10 p-4 shadow-2xl shadow-violet-950/20 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-violet-200 ring-1 ring-white/15">
                <Flame className="h-3 w-3 text-orange-300" /> R6 Tier 1
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/20">
                Dados oficiais
              </span>
            </div>
            <h1 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              Previsões <span className="gradient-text">R6</span>
            </h1>
            <p className="mt-1 max-w-lg text-xs font-semibold leading-relaxed text-gray-300 sm:text-sm">
              Escolhe o vencedor dos jogos profissionais de Rainbow Six Siege. Vê quem apostou no quê,
              acompanha a pontuação ao vivo e sobe na classificação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-center">
              <p className="text-lg font-black text-white">{acertos}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Acertos</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-center">
              <p className="text-lg font-black text-white">{falhas}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-red-300">Falhas</p>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-violet-900/40">
            <Swords className="h-3.5 w-3.5" /> Rainbow Six Siege
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-500">
            CS2 <span className="text-[8px] uppercase tracking-wider">em breve</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-500">
            Fortnite <span className="text-[8px] uppercase tracking-wider">em breve</span>
          </span>
          {aoVivo.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-300 ring-1 ring-red-400/20">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> {aoVivo.length} ao vivo
            </span>
          )}
        </div>
      </section>

      {/* separadores */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {[
            ['proximos', 'Próximos', proximos.length],
            ['resultados', 'Resultados', resultados.length],
            ['classificacao', 'Classificação', classificacao.length || null],
          ].map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-black transition-all sm:text-sm ${
                tab === id ? 'bg-violet-500 text-white shadow-lg shadow-violet-900/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {label}
              {n ? <span className={`rounded-full px-1.5 text-[9px] ${tab === id ? 'bg-white/20' : 'bg-white/10'}`}>{n}</span> : null}
            </button>
          ))}
        </div>
        <button
          onClick={() => recarregarRef.current()}
          title="Atualizar resultados"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {sync && sync.ok === false ? 'A sincronização falhou — mostro os últimos dados.' : 'Atualização automática a cada 20 segundos'}
        </span>
        {sync && sync.last_ok && <span>· Última sincronização: {fmtHora(sync.last_ok)}</span>}
        {minhaClass && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-300 ring-1 ring-violet-400/20">
            <Medal className="h-3 w-3" /> {minhaClass.pos}.º lugar · {minhaClass.acertos} acertos
          </span>
        )}
      </div>

      {erro && (
        <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-20 text-sm font-semibold text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> A carregar os jogos…
        </div>
      ) : tab === 'proximos' ? (
        <div className="space-y-3">
          {proximos.length ? (
            proximos.map((m) => (
              <PredictionCard key={m.id} match={m} user={user} onVote={votar} votando={votando === m.id} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20">
                <Swords className="h-6 w-6" />
              </span>
              <h3 className="mt-3 text-base font-black text-white">Sem jogos Tier 1 marcados</h3>
              <p className="mx-auto mt-1 max-w-md text-xs font-semibold text-gray-400">
                Quando a Ubisoft anunciar os próximos jogos, eles aparecem aqui automaticamente. Voltamos
                a verificar a cada minuto.
              </p>
            </div>
          )}
        </div>
      ) : tab === 'resultados' ? (
        <div className="space-y-3">
          {resultados.length ? (
            resultados.map((m) => (
              <PredictionCard key={m.id} match={m} user={user} onVote={votar} votando={false} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-14 text-center">
              <Trophy className="mx-auto h-8 w-8 text-gray-600" />
              <p className="mt-2 text-sm font-bold text-gray-400">Ainda não há resultados recentes.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {classLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-20 text-sm font-semibold text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> A carregar a classificação…
            </div>
          ) : classificacao.length ? (
            <>
              <Podium users={classificacao} />
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <div className="hidden grid-cols-[48px_1fr_70px_70px_70px_80px] gap-2 border-b border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 sm:grid">
                  <span>#</span>
                  <span>Membro</span>
                  <span className="text-center">Acertos</span>
                  <span className="text-center">Falhas</span>
                  <span className="text-center">Jogos</span>
                  <span className="text-center">Precisão</span>
                </div>
                {classificacao.map((u) => (
                  <div
                    key={u.id}
                    className={`grid grid-cols-[32px_1fr_auto] items-center gap-2 border-b border-white/5 px-3 py-2.5 last:border-0 sm:grid-cols-[48px_1fr_70px_70px_70px_80px] sm:px-4 ${
                      u.id === Number(meuNome) ? 'bg-violet-500/[0.08]' : ''
                    }`}
                  >
                    <span className={`text-sm font-black ${u.pos <= 3 ? 'text-amber-300' : 'text-gray-500'}`}>{u.pos}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <AvatarImg src={u.avatar_url} name={u.username} className="h-7 w-7" />
                      <span className="truncate text-xs font-bold text-white">
                        {u.username}
                        {u.id === Number(meuNome) ? <span className="ml-1 text-violet-300">(tu)</span> : null}
                      </span>
                    </span>
                    <span className="hidden text-center text-xs font-bold text-emerald-300 sm:block">{u.acertos}</span>
                    <span className="hidden text-center text-xs font-bold text-red-300 sm:block">{u.falhas}</span>
                    <span className="hidden text-center text-xs font-semibold text-gray-400 sm:block">{u.total}</span>
                    <span className="hidden text-center text-xs font-black text-white sm:block">
                      {u.acertos + u.falhas ? Math.round((u.acertos / (u.acertos + u.falhas)) * 100) : 0}%
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-bold sm:hidden">
                      <span className="text-emerald-300">{u.acertos} ✓</span>
                      <span className="text-red-300">{u.falhas} ✗</span>
                      <span className="text-gray-500">{u.total} jogos</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] font-semibold text-gray-500">
                A classificação soma todos os jogos R6 Tier 1 com voto. Ainda não há prémios — primeiro
                queremos acertar nas previsões.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-14 text-center">
              <Trophy className="mx-auto h-8 w-8 text-gray-600" />
              <p className="mt-2 text-sm font-bold text-gray-400">Ainda não há votos suficientes.</p>
              <p className="text-xs text-gray-500">Sê o primeiro a prever um jogo.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-[11px] font-semibold leading-relaxed text-gray-500">
        <p className="flex items-start gap-1.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
          Fonte: site oficial da Rainbow Six Esports (Ubisoft). Só entram ligas profissionais Tier 1.
          As apostas fecham quando o jogo começa; podes mudar o voto até lá. Quando o resultado sair,
          recebes um aviso nesta página e no sino.
        </p>
      </div>

      {/* janela flutuante de resultados */}
      {modalResultados && resultadosNovos.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-violet-400/25 bg-[#140f22] shadow-2xl shadow-black/60">
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600/30 to-fuchsia-600/10 px-5 pb-4 pt-5 text-center">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl" />
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-amber-300 ring-1 ring-white/20">
                <Trophy className="h-7 w-7" />
              </span>
              <h2 className="mt-3 font-display text-xl font-black text-white">
                {resultadosNovos.every((r) => r.correct) ? 'Em grande!' : 'Resultados das tuas previsões'}
              </h2>
              <p className="mt-1 text-xs font-semibold text-gray-300">
                {resultadosNovos.filter((r) => r.correct).length} de {resultadosNovos.length} certas.
              </p>
            </div>
            <div className="max-h-[45dvh] space-y-2 overflow-y-auto p-3">
              {resultadosNovos.map((r) => (
                <div
                  key={r.match_id}
                  className={`flex items-center gap-2 rounded-xl border p-2 ${
                    r.correct ? 'border-emerald-400/20 bg-emerald-500/[0.07]' : 'border-red-400/20 bg-red-500/[0.06]'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${r.correct ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    {r.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">
                      {r.team_a} <span className="text-gray-400">{r.score_a} — {r.score_b}</span> {r.team_b}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-gray-500">
                      {r.competition} · escolheste {r.pick === 'a' ? r.team_a : r.team_b}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black ${r.correct ? 'text-emerald-300' : 'text-red-300'}`}>
                    {r.correct ? 'ACERTASTE' : 'FALHASTE'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-white/10 p-3">
              <button
                onClick={() => {
                  setTab('resultados')
                  fecharResultados()
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-gray-200 hover:bg-white/10"
              >
                Ver histórico <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={fecharResultados}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2.5 text-xs font-black text-white hover:brightness-110"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
