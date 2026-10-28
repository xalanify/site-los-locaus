import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Crosshair, Loader2, Radio, Shield, Target, Users } from 'lucide-react'

/* ============================================================
   Próximos torneios — contagem ao vivo (R6 e CS2)
   ------------------------------------------------------------
   Lê os jogos reais das previsões, escolhe o próximo torneio
   de cada jogo e mostra a contagem segundo a segundo. As
   equipas vêm dos jogos agendados desse torneio.
   ============================================================ */

const JOGOS = {
  r6: {
    nome: 'Rainbow Six',
    Icon: Shield,
    cor: 'orange',
    chip: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    grad: 'from-orange-500/20 via-transparent to-amber-500/10',
    anel: 'ring-orange-400/30',
  },
  cs2: {
    nome: 'CS2',
    Icon: Crosshair,
    cor: 'yellow',
    chip: 'bg-yellow-500/15 text-yellow-300 ring-yellow-400/30',
    grad: 'from-yellow-500/20 via-transparent to-amber-500/10',
    anel: 'ring-yellow-400/30',
  },
}

function tempoPara(iso) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    dias: Math.floor(diff / 86400000),
    horas: Math.floor((diff % 86400000) / 3600000),
    min: Math.floor((diff % 3600000) / 60000),
    seg: Math.floor((diff % 60000) / 1000),
  }
}

function Contagem({ iso, live }) {
  const [t, setT] = useState(() => tempoPara(iso))
  useEffect(() => {
    setT(tempoPara(iso))
    const id = setInterval(() => setT(tempoPara(iso)), 1000)
    return () => clearInterval(id)
  }, [iso])

  if (live) {
    return (
      <span className="inline-flex items-center gap-2 text-lg font-black text-red-300 sm:text-xl">
        <span className="live-pulso" aria-hidden="true" /> A decorrer agora
      </span>
    )
  }
  if (!t) {
    return <span className="text-lg font-black text-white sm:text-xl">A começar…</span>
  }
  const p = (n) => String(n).padStart(2, '0')
  return (
    <span className="font-mono text-xl font-black tabular-nums text-white sm:text-2xl">
      {t.dias > 0 && <span className="text-white/90">{t.dias}d </span>}
      {p(t.horas)}:{p(t.min)}:{p(t.seg)}
    </span>
  )
}

function dataCurta(iso) {
  try {
    return new Date(iso).toLocaleString('pt-PT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function equipasDoTorneio(matches, competicao) {
  const mapa = new Map()
  for (const m of matches) {
    if (m.competition !== competicao) continue
    for (const t of [m.team_a, m.team_b]) {
      const nome = String(t?.name || '').trim()
      if (nome) mapa.set(nome, t?.logo || null)
    }
  }
  return [...mapa.entries()].map(([nome, logo]) => ({ nome, logo }))
}

function escolherTorneio(matches) {
  const agora = Date.now()
  const validos = (Array.isArray(matches) ? matches : []).filter((m) => {
    if (!m?.start_time || Number(m.status) === 3) return false
    const t = new Date(m.start_time).getTime()
    return t > agora - 3 * 3600 * 1000
  })
  const vivos = validos
    .filter((m) => Number(m.status) === 2)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const futuros = validos
    .filter((m) => new Date(m.start_time).getTime() > agora)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const match = vivos[0] || futuros[0]
  if (!match) return null
  return {
    match,
    live: Number(match.status) === 2,
    equipas: equipasDoTorneio(matches, match.competition),
  }
}

function CartaoJogo({ id, info }) {
  const meta = JOGOS[id]
  const [aberto, setAberto] = useState(false)
  const Icon = meta.Icon

  if (!info) {
    return (
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.grad}`} />
        <div className="relative flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white/5 ring-1 ${meta.anel}`}>
            <Icon className="h-6 w-6 text-white/60" />
          </span>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wider ${meta.chip.split(' ')[1]}`}>
              {meta.nome}
            </p>
            <p className="text-sm font-bold text-gray-300">Sem torneios agendados</p>
          </div>
        </div>
      </div>
    )
  }

  const { match, live, equipas } = info
  const logo = match.competition_logo || null
  const nomeTorneio = match.competition || match.championship || 'Torneio'
  const fase = [match.championship, match.phase, match.step].filter(Boolean).join(' · ')
  const temEquipas = equipas.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass relative overflow-hidden rounded-3xl p-4 sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.grad}`} />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative flex items-start gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/5 ring-1 ${meta.anel}`}
        >
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-9 w-9 object-contain"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <Icon className="h-6 w-6 text-white/70" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`ui-chip ring-1 ${meta.chip}`}>{meta.nome}</span>
            {live ? (
              <span className="ui-chip bg-red-500/15 text-red-300 ring-1 ring-red-400/35">
                <span className="live-pulso" aria-hidden="true" /> ao vivo
              </span>
            ) : (
              <span className="ui-chip bg-white/5 text-gray-400">em breve</span>
            )}
          </div>
          <h3 className="mt-1.5 truncate font-display text-base font-black text-white sm:text-lg">
            {nomeTorneio}
          </h3>
          <p className="truncate text-[11px] font-semibold text-gray-400">{fase || 'Calendário oficial'}</p>
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">
              {live ? 'Estado' : 'Começa em'}
            </p>
            <Contagem iso={match.start_time} live={live} />
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">
              {live ? 'Agora' : 'Data'}
            </p>
            <p className="text-[11px] font-bold text-gray-300">{dataCurta(match.start_time)}</p>
          </div>
        </div>
        {match.team_a?.name && match.team_b?.name && (
          <p className="mt-2 truncate text-[11px] font-semibold text-gray-300">
            {match.team_a.name} <span className="text-gray-500">vs</span> {match.team_b.name}
          </p>
        )}
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="ui-btn ui-btn-ghost ui-btn-sm"
          aria-expanded={aberto}
        >
          <Users className="h-3.5 w-3.5" />
          {aberto ? 'Esconder equipas' : `Ver equipas${temEquipas ? ` (${equipas.length})` : ''}`}
        </button>
        <Link to="/previsoes" className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-white">
          Prever resultado <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {aberto && (
        <div className="relative mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          {temEquipas ? (
            <div className="flex flex-wrap gap-1.5">
              {equipas.map((e) => (
                <span
                  key={e.nome}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-gray-200"
                >
                  {e.logo && (
                    <img
                      src={e.logo}
                      alt=""
                      className="h-4 w-4 object-contain"
                      loading="lazy"
                      onError={(ev) => {
                        ev.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  {e.nome}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-gray-400">
              Equipas ainda por anunciar para este torneio.
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function TorneiosHome() {
  const [r6, setR6] = useState(null)
  const [cs2, setCs2] = useState(null)
  const [r6Torneio, setR6Torneio] = useState(null)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    let vivo = true
    const carregar = async () => {
      try {
        const [a, b, c] = await Promise.all([
          fetch('/api/previsoes?limit=50', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/previsoes/cs2', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/previsoes/proximo-torneio', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ])
        if (!vivo) return
        setR6(Array.isArray(a?.matches) ? a.matches : [])
        setCs2(Array.isArray(b?.matches) ? b.matches : [])
        setR6Torneio(c?.torneio || null)
      } catch {
        /* mantém o que já está */
      } finally {
        if (vivo) setCarregado(true)
      }
    }
    carregar()
    const iv = setInterval(carregar, 60000)
    const aoVoltar = () => {
      if (!document.hidden) carregar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      vivo = false
      clearInterval(iv)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  const fallbackR6 = useMemo(() => {
    if (!r6Torneio?.inicio) return null
    const nome = r6Torneio.nome || r6Torneio.campeonato || 'BLAST R6 Major'
    const equipas =
      Array.isArray(r6Torneio.equipas) && r6Torneio.equipas.length > 0
        ? r6Torneio.equipas
        : equipasDoTorneio(r6 || [], nome).length > 0
          ? equipasDoTorneio(r6 || [], nome)
          : equipasDoTorneio(r6 || [], r6Torneio.campeonato)
    return {
      match: {
        competition: nome,
        championship: r6Torneio.campeonato || nome,
        phase: r6Torneio.fase || '',
        region: r6Torneio.regiao || '',
        start_time: r6Torneio.inicio,
        status: 1,
        competition_logo: r6Torneio.logo || null,
      },
      live: false,
      equipas,
    }
  }, [r6Torneio, r6])

  const infoR6 = useMemo(() => escolherTorneio(r6 || []) || fallbackR6, [r6, fallbackR6])
  const infoCs2 = useMemo(() => escolherTorneio(cs2 || []), [cs2])

  if (!carregado) {
    return (
      <section className="mx-auto mb-8 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <span className="ui-chip bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/25">
            <Radio className="h-3 w-3" /> em tempo real
          </span>
          <h2 className="mt-2 font-display text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
            Próximos torneios
          </h2>
          <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-300" />
            A carregar os próximos torneios…
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-56 animate-pulse rounded-3xl" />
          ))}
        </div>
      </section>
    )
  }

  if (!infoR6 && !infoCs2) {
    return (
      <section className="mx-auto mb-8 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <span className="ui-chip bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/25">
            <Radio className="h-3 w-3" /> em tempo real
          </span>
          <h2 className="mt-2 font-display text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
            Próximos torneios
          </h2>
        </div>
        <div className="ui-card py-6 text-center">
          <p className="text-sm font-semibold text-gray-400">
            Sem torneios agendados de momento. Assim que houver jogos, aparecem aqui.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto mb-8 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="ui-chip bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/25">
            <Radio className="h-3 w-3" /> em tempo real
          </span>
          <h2 className="mt-2 font-display text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
            Próximos torneios
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Contagem ao vivo para Rainbow Six e CS2 — atualiza sozinha.
          </p>
        </div>
        <Link to="/previsoes" className="ui-btn ui-btn-ghost ui-btn-sm">
          <Target className="h-3.5 w-3.5" /> Ver previsões
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CartaoJogo id="r6" info={infoR6} />
        <CartaoJogo id="cs2" info={infoCs2} />
      </div>
    </section>
  )
}
