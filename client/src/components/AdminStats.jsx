import { useEffect, useState } from 'react'
import {
  BarChart3,
  Clapperboard,
  Download,
  Eye,
  Film,
  Heart,
  Loader2,
  MessageSquare,
  Save,
  TrendingUp,
  Users,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'
import Estado from './Estado'
import Sparkline from './ui/Sparkline'
import { gameLabel } from '../data/clipGames'

/* Cartão de resumo (número grande + rótulo) */
function Cartao({ Icon, cor, valor, rotulo, trend, corLinha = '#a78bfa' }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const alvo = Number(valor) || 0
    if (alvo <= 0) {
      setN(0)
      return
    }
    let vivo = true
    const inicio = performance.now()
    const dur = 520
    const passo = (t) => {
      if (!vivo) return
      const p = Math.min(1, (t - inicio) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(alvo * eased))
      if (p < 1) requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
    return () => {
      vivo = false
    }
  }, [valor])

  return (
    <div className="ui-card relative overflow-hidden text-center">
      <span className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${cor}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="font-display text-xl font-black leading-none text-white">
        {n.toLocaleString('pt-PT')}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {rotulo}
      </div>
      {Array.isArray(trend) && trend.length > 1 && (
        <Sparkline values={trend} color={corLinha} height={22} className="mt-1 opacity-80" />
      )}
    </div>
  )
}

/* Barra horizontal (clip por jogo) */
function Barra({ rotulo, valor, max, extra }) {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-bold text-gray-200">{rotulo}</span>
        <span className="shrink-0 text-gray-400">
          {valor}
          {extra ? ` · ${extra}` : ''}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-zinc-500 to-zinc-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ============================================================
   Aba "Estatísticas" do painel de administração
   ============================================================ */
export default function AdminStats() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch('/api/admin/stats', { headers: authHeaders() })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        if (!r.ok) setErro(d?.error || 'Não deu para carregar.')
        else setDados(d)
      })
      .catch(() => vivo && setErro('Falha de ligação.'))
      .finally(() => vivo && setCarregado(true))
    return () => {
      vivo = false
    }
  }, [])

  if (!carregado) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (erro || !dados) {
    return <Estado tipo="erro" icon={BarChart3} titulo="Sem estatísticas" texto={erro} />
  }

  const r = dados.resumo || {}
  const porJogo = dados.porJogo || []
  const topClips = dados.topClips || []
  const topAutores = dados.topAutores || []
  const porDia = dados.porDia || []
  const maxJogo = Math.max(1, ...porJogo.map((j) => j.n))
  const maxDia = Math.max(
    1,
    ...porDia.map((d) => Math.max(d.clips, d.comentarios, d.visitas)),
  )

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 ui-section-title">
          <TrendingUp className="h-4 w-4 text-zinc-300" /> Resumo geral
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <Cartao Icon={Film} cor="bg-zinc-400/15 text-zinc-300" valor={r.clipsTotal} trend={porDia.map((d) => d.clips)} corLinha="#a78bfa" rotulo="clips" />
          <Cartao Icon={Eye} cor="bg-emerald-400/15 text-emerald-300" valor={r.clipsPublicos} rotulo="públicos" />
          <Cartao Icon={Heart} cor="bg-rose-400/15 text-rose-300" valor={r.likes} rotulo="gostos" />
          <Cartao Icon={Download} cor="bg-sky-400/15 text-sky-300" valor={r.downloads} rotulo="transferidos" />
          <Cartao Icon={Eye} cor="bg-zinc-400/15 text-zinc-300" valor={r.views} trend={porDia.map((d) => d.visitas)} corLinha="#38bdf8" rotulo="visualizações" />
          <Cartao Icon={Save} cor="bg-amber-400/15 text-amber-300" valor={r.saves} rotulo="guardados" />
          <Cartao Icon={MessageSquare} cor="bg-indigo-400/15 text-indigo-300" valor={r.comentarios} trend={porDia.map((d) => d.comentarios)} corLinha="#818cf8" rotulo="comentários" />
          <Cartao Icon={Clapperboard} cor="bg-zinc-400/15 text-zinc-300" valor={r.posts} rotulo="publicações" />
          <Cartao Icon={Users} cor="bg-lime-400/15 text-lime-300" valor={r.usersTotal} rotulo="contas" />
          <Cartao Icon={Users} cor="bg-teal-400/15 text-teal-300" valor={r.usersNovos} rotulo="novas (30d)" />
          <Cartao Icon={Eye} cor="bg-cyan-400/15 text-cyan-300" valor={r.visitasTotal} rotulo="visitas" />
          <Cartao Icon={Eye} cor="bg-green-400/15 text-green-300" valor={r.visitasOnline} rotulo="online" />
          <Cartao Icon={Film} cor="bg-zinc-400/15 text-zinc-300" valor={r.clipsPrivados} rotulo="privados" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Clips por jogo */}
        <div className="ui-card">
          <h3 className="ui-section-title mb-3">
            Clips por jogo
          </h3>
          {porJogo.length === 0 ? (
            <Estado compacto icon={Film} titulo="Ainda não há clips" />
          ) : (
            <div className="space-y-3">
              {porJogo.map((j) => (
                <Barra
                  key={j.jogo}
                  rotulo={gameLabel(j.jogo)}
                  valor={j.n}
                  max={maxJogo}
                  extra={`${j.likes} gostos · ${j.downloads} transf.`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top clips */}
        <div className="ui-card">
          <h3 className="ui-section-title mb-3">
            Clips mais vistos
          </h3>
          {topClips.length === 0 ? (
            <Estado compacto icon={Film} titulo="Sem clips ainda" />
          ) : (
            <ol className="space-y-2">
              {topClips.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                >
                  <span className="font-display text-sm font-black text-zinc-300">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">
                      {c.title || '(sem título)'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {c.username} · {c.game ? gameLabel(c.game) : '—'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-gray-300">
                    <span className="inline-flex items-center gap-1" title="Visualizações">
                      <Eye className="h-3 w-3" /> {c.views || 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {c.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {c.comentarios}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* 14 dias */}
      <div className="ui-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="ui-section-title">
            Últimos 14 dias
          </h3>
          <span className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-zinc-400" /> clips
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-sky-400" /> comentários
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-emerald-400" /> visitas
            </span>
          </span>
        </div>
        <div className="flex h-32 items-end gap-1.5">
          {porDia.map((d) => (
            <div
              key={d.dia}
              className="group flex flex-1 flex-col items-center gap-1"
              title={`${d.dia}: ${d.clips} clips, ${d.comentarios} comentários, ${d.visitas} visitas`}
            >
              <div className="flex h-28 w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/3 rounded-t bg-zinc-500"
                  style={{ height: `${Math.round((d.clips / maxDia) * 100)}%`, minHeight: d.clips ? 3 : 0 }}
                />
                <div
                  className="w-1/3 rounded-t bg-sky-400"
                  style={{ height: `${Math.round((d.comentarios / maxDia) * 100)}%`, minHeight: d.comentarios ? 3 : 0 }}
                />
                <div
                  className="w-1/3 rounded-t bg-emerald-400"
                  style={{ height: `${Math.round((d.visitas / maxDia) * 100)}%`, minHeight: d.visitas ? 3 : 0 }}
                />
              </div>
              <span className="hidden text-[9px] text-gray-500 sm:block">
                {String(d.dia).slice(8)}/{String(d.dia).slice(5, 7)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top comentaristas */}
      <div className="ui-card">
        <h3 className="ui-section-title mb-3">
          Quem mais comenta
        </h3>
        {topAutores.length === 0 ? (
          <Estado compacto icon={MessageSquare} titulo="Sem comentários" />
        ) : (
          <div className="space-y-3">
            {topAutores.map((a) => (
              <Barra key={a.username} rotulo={a.username} valor={a.n} max={topAutores[0].n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
