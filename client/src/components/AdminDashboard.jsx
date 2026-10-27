import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Film,
  Eye,
  Heart,
  MessageSquare,
  Download,
  Save,
  Clapperboard,
  Activity,
  RefreshCcw,
  Loader2,
  ArrowUpRight,
  Clock,
  Wifi,
  Database,
  ShieldCheck,
  Trash2,
  Gamepad2,
  Crown,
  TrendingUp,
} from 'lucide-react'
import Sparkline from './ui/Sparkline'
import { authHeaders } from '../lib/auth'
import { gameLabel } from '../data/clipGames'

/* ============================================================
   Dashboard do painel admin — dados ao vivo, gráficos animados
   e cartões com o mesmo espaçamento/estilo em todo o painel.
   ============================================================ */

function Contador({ valor }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const alvo = Number(valor) || 0
    if (alvo <= 0) return setN(0)
    let vivo = true
    const t0 = performance.now()
    const passo = (t) => {
      if (!vivo) return
      const p = Math.min(1, (t - t0) / 520)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(alvo * eased))
      if (p < 1) requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
    return () => {
      vivo = false
    }
  }, [valor])
  return <>{n.toLocaleString('pt-PT')}</>
}

function Kpi({ Icon, label, valor, cor, trend, linha }) {
  return (
    <div className="ui-kpi">
      <div className="flex items-center justify-between gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${cor}`}>
          <Icon className="h-4 w-4" />
        </span>
        {Array.isArray(trend) && trend.length > 1 && (
          <Sparkline values={trend} color={linha || '#a78bfa'} height={26} className="max-w-[92px] opacity-80" />
        )}
      </div>
      <div className="font-display text-2xl font-black leading-none text-white">
        <Contador valor={valor} />
      </div>
      <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  )
}

function Grafico({ porDia }) {
  const dias = Array.isArray(porDia) ? porDia : []
  const W = 720
  const H = 210
  const pad = 18
  const valores = dias.map((d) => Number(d.visitas) || 0)
  const max = Math.max(1, ...valores)
  const pontos = valores.map((v, i) => {
    const x = pad + (i / Math.max(1, valores.length - 1)) * (W - pad * 2)
    const y = H - pad - (v / max) * (H - pad * 2)
    return [x, y]
  })
  const linha = pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = pontos.length ? `${linha} L${W - pad},${H - pad} L${pad},${H - pad} Z` : ''
  const maxC = Math.max(1, ...dias.map((d) => Number(d.clips) || 0))
  const maxK = Math.max(1, ...dias.map((d) => Number(d.comentarios) || 0))
  const linha2 = dias
    .map((d, i) => {
      const x = pad + (i / Math.max(1, dias.length - 1)) * (W - pad * 2)
      const y = H - pad - ((Number(d.clips) || 0) / maxC) * (H - pad * 2)
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const linha3 = dias
    .map((d, i) => {
      const x = pad + (i / Math.max(1, dias.length - 1)) * (W - pad * 2)
      const y = H - pad - ((Number(d.comentarios) || 0) / maxK) * (H - pad * 2)
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="ui-card min-w-0">
      <div className="ui-card-header">
        <div>
          <h3 className="ui-section-title">
            <TrendingUp className="h-4 w-4 text-violet-300" /> Movimento dos últimos 14 dias
          </h3>
          <p className="mt-1 text-[11px] text-gray-500">Visitas, clips e comentários — atualiza sozinho.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400">
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" /> visitas</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-violet-400" /> clips</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-400" /> comentários</span>
        </div>
      </div>
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full" preserveAspectRatio="none" role="img" aria-label="Gráfico de atividade">
          <defs>
            <linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={pad} x2={W - pad} y1={pad + ((H - pad * 2) / 3) * i} y2={pad + ((H - pad * 2) / 3) * i} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
          ))}
          {area && <motion.path d={area} fill="url(#adminArea)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }} />}
          {linha && (
            <motion.path
              d={linha}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          )}
          {linha2 && <motion.path d={linha2} fill="none" stroke="#a78bfa" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.1 }} />}
          {linha3 && <motion.path d={linha3} fill="none" stroke="#38bdf8" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.2 }} />}
          {pontos.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" fill="#34d399">
              <title>{`${dias[i]?.dia}: ${dias[i]?.visitas || 0} visitas`}</title>
            </circle>
          ))}
        </svg>
        <div className="mt-1 flex justify-between px-1 text-[9px] font-bold text-gray-600">
          {dias.map((d, i) => (
            <span key={d.dia} className={i % 2 ? 'hidden sm:inline' : ''}>{String(d.dia).slice(8)}/{String(d.dia).slice(5, 7)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarrasJogo({ porJogo }) {
  const lista = Array.isArray(porJogo) ? porJogo.slice(0, 7) : []
  const max = Math.max(1, ...lista.map((j) => Number(j.n) || 0))
  return (
    <div className="ui-card">
      <div className="ui-card-header">
        <h3 className="ui-section-title"><Gamepad2 className="h-4 w-4 text-fuchsia-300" /> Clips por jogo</h3>
        <span className="ui-chip bg-white/5 text-gray-400">{porJogo?.length || 0} jogos</span>
      </div>
      {!lista.length ? (
        <p className="py-8 text-center text-xs text-gray-500">Ainda não há clips.</p>
      ) : (
        <div className="space-y-3">
          {lista.map((j, i) => (
            <div key={j.jogo}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-bold text-gray-200">{gameLabel(j.jogo)}</span>
                <span className="shrink-0 font-black text-white">{j.n}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, (Number(j.n) / max) * 100)}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TopClips({ topClips }) {
  const lista = Array.isArray(topClips) ? topClips : []
  return (
    <div className="ui-card">
      <div className="ui-card-header">
        <h3 className="ui-section-title"><Film className="h-4 w-4 text-violet-300" /> Clips mais vistos</h3>
        <span className="ui-chip bg-violet-500/10 text-violet-300">top {lista.length}</span>
      </div>
      {!lista.length ? (
        <p className="py-8 text-center text-xs text-gray-500">Sem clips ainda.</p>
      ) : (
        <ol className="space-y-2">
          {lista.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-orange-400 text-black' : 'bg-white/10 text-gray-300'}`}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-white">{c.title || '(sem título)'}</span>
                <span className="block truncate text-[10px] text-gray-500">{c.username} · {c.game ? gameLabel(c.game) : '—'}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[10px] text-gray-400">
                <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {c.views || 0}</span>
                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {c.likes || 0}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function TopAutores({ topAutores }) {
  const lista = Array.isArray(topAutores) ? topAutores : []
  const max = Math.max(1, ...lista.map((a) => Number(a.n) || 0))
  return (
    <div className="ui-card">
      <div className="ui-card-header">
        <h3 className="ui-section-title"><Crown className="h-4 w-4 text-amber-300" /> Quem mais comenta</h3>
      </div>
      {!lista.length ? (
        <p className="py-8 text-center text-xs text-gray-500">Sem comentários ainda.</p>
      ) : (
        <div className="space-y-3">
          {lista.map((a) => (
            <div key={a.username}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-bold text-gray-200">{a.username}</span>
                <span className="font-black text-white">{a.n}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" initial={{ width: 0 }} animate={{ width: `${Math.max(4, (Number(a.n) / max) * 100)}%` }} transition={{ duration: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard({ onTab, onLimparChat, chatLimparBusy, chatLimparMsg, chatLimparOk }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregado, setCarregado] = useState(false)
  const [aAtualizar, setAAtualizar] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState(null)

  const carregar = async (manual = false) => {
    if (manual) setAAtualizar(true)
    try {
      const r = await fetch('/api/admin/stats', { headers: authHeaders(), cache: 'no-store' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || 'Não foi possível carregar.')
      setDados(d)
      setErro('')
      setAtualizadoEm(new Date())
    } catch (e) {
      setErro(e.message || 'Falha de ligação.')
    } finally {
      setCarregado(true)
      if (manual) setAAtualizar(false)
    }
  }

  useEffect(() => {
    carregar()
    const iv = setInterval(() => carregar(), 10000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const r = dados?.resumo || {}
  const porDia = dados?.porDia || []
  const porJogo = dados?.porJogo || []
  const topClips = dados?.topClips || []
  const topAutores = dados?.topAutores || []
  const visitas = useMemo(() => porDia.map((d) => Number(d.visitas) || 0), [porDia])

  if (!carregado) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho do dashboard */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-black text-white">Centro de controlo</h2>
            <span className="ui-chip bg-emerald-500/10 text-emerald-300"><span className="ui-live-dot" /> ao vivo</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Dados reais do site · atualização automática a cada 10 segundos
            {atualizadoEm ? ` · ${atualizadoEm.toLocaleTimeString('pt-PT')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => carregar(true)} disabled={aAtualizar} className="ui-btn ui-btn-ghost">
            {aAtualizar ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Atualizar
          </button>
          <button onClick={() => onTab && onTab('utilizadores')} className="ui-btn ui-btn-primary">
            <Users className="h-4 w-4" /> Utilizadores
          </button>
        </div>
      </div>

      {erro && (
        <p className="rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs font-bold text-red-300">{erro}</p>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi Icon={Users} label="Contas" valor={r.usersTotal} cor="bg-violet-500/15 text-violet-300" />
        <Kpi Icon={Film} label="Clips" valor={r.clipsTotal} cor="bg-fuchsia-500/15 text-fuchsia-300" trend={porDia.map((d) => d.clips)} linha="#e879f9" />
        <Kpi Icon={Eye} label="Visualizações" valor={r.views} cor="bg-sky-500/15 text-sky-300" trend={visitas} linha="#38bdf8" />
        <Kpi Icon={Heart} label="Gostos" valor={r.likes} cor="bg-rose-500/15 text-rose-300" />
        <Kpi Icon={MessageSquare} label="Comentários" valor={r.comentarios} cor="bg-indigo-500/15 text-indigo-300" trend={porDia.map((d) => d.comentarios)} linha="#818cf8" />
        <Kpi Icon={Activity} label="Online agora" valor={r.visitasOnline} cor="bg-emerald-500/15 text-emerald-300" />
      </div>

      {/* Gráfico + estado */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><Grafico porDia={porDia} /></div>
        <div className="ui-card">
          <div className="ui-card-header">
            <h3 className="ui-section-title"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Estado do site</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { Icon: Wifi, label: 'Servidor', valor: 'Online', cor: 'text-emerald-300' },
              { Icon: Database, label: 'Base de dados', valor: 'Ligada', cor: 'text-emerald-300' },
              { Icon: Users, label: 'Visitantes online', valor: r.visitasOnline || 0, cor: 'text-sky-300' },
              { Icon: Clock, label: 'Última atualização', valor: atualizadoEm ? atualizadoEm.toLocaleTimeString('pt-PT') : '—', cor: 'text-gray-300' },
            ].map((x) => (
              <div key={x.label} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-bold text-gray-400"><x.Icon className="h-3.5 w-3.5" /> {x.label}</span>
                <span className={`text-[11px] font-black ${x.cor}`}>{x.valor}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => onTab && onTab('anuncios')} className="ui-btn ui-btn-ghost text-[11px]"><Clapperboard className="h-3.5 w-3.5" /> Anúncios</button>
            <button onClick={() => onTab && onTab('ferramentas')} className="ui-btn ui-btn-ghost text-[11px]"><Activity className="h-3.5 w-3.5" /> Auditoria</button>
            <button onClick={() => onTab && onTab('stats')} className="ui-btn ui-btn-ghost col-span-2 text-[11px]"><ArrowUpRight className="h-3.5 w-3.5" /> Estatísticas completas</button>
          </div>
        </div>
      </div>

      {/* Secundários */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BarrasJogo porJogo={porJogo} />
        <TopClips topClips={topClips} />
        <TopAutores topAutores={topAutores} />
      </div>

      {/* Ações rápidas */}
      <div className="ui-card">
        <div className="ui-card-header">
          <h3 className="ui-section-title"><Download className="h-4 w-4 text-sky-300" /> Resumo rápido</h3>
          <span className="ui-chip bg-white/5 text-gray-400">todos os números</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Públicos', valor: r.clipsPublicos, Icon: Eye },
            { label: 'Privados', valor: r.clipsPrivados, Icon: Film },
            { label: 'Guardados', valor: r.saves, Icon: Save },
            { label: 'Transferências', valor: r.downloads, Icon: Download },
            { label: 'Publicações', valor: r.posts, Icon: Clapperboard },
            { label: 'Novas contas (30d)', valor: r.usersNovos, Icon: Users },
            { label: 'Visitas totais', valor: r.visitasTotal, Icon: Activity },
            { label: 'Comentários', valor: r.comentarios, Icon: MessageSquare },
          ].map((x) => (
            <div key={x.label} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
              <x.Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-gray-500">{x.label}</span>
                <span className="block text-sm font-black text-white">{Number(x.valor || 0).toLocaleString('pt-PT')}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <p className="text-[10px] text-gray-500">Ações destrutivas pedem sempre confirmação.</p>
          <button onClick={onLimparChat} disabled={chatLimparBusy} className="ui-btn ui-btn-danger">
            {chatLimparBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpar chat
          </button>
        </div>
        {chatLimparMsg && (
          <p className={`mt-2 text-[11px] font-bold ${chatLimparOk ? 'text-emerald-300' : 'text-red-300'}`}>{chatLimparMsg}</p>
        )}
      </div>
    </div>
  )
}
