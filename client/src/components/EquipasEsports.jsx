import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  X,
  ArrowLeft,
  Trophy,
  Users,
  DollarSign,
  CalendarDays,
  ExternalLink,
  MapPin,
  RefreshCw,
  Shield,
  Star,
  Swords,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'
import AvatarImg from './AvatarImg'

/* ============================================================
   Equipas de esports — pesquisa CS2 / Rainbow Six
   ------------------------------------------------------------
   Os dados vêm da Liquipedia (API pública) através do nosso
   servidor, que faz cache para não sobrecarregar a fonte.
   ============================================================ */

const JOGOS = [
  { id: 'cs2', nome: 'CS2' },
  { id: 'r6', nome: 'Rainbow Six' },
]

const moeda = (v) => {
  if (!v) return null
  return String(v).replace(/\s/g, '')
}

const dataCurta = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EquipasEsports({ aberto, onFechar }) {
  const [jogo, setJogo] = useState('cs2')
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [aProcurar, setAProcurar] = useState(false)
  const [erro, setErro] = useState('')
  const [equipaSel, setEquipaSel] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [aCarregar, setACarregar] = useState(false)
  const [erroDetalhe, setErroDetalhe] = useState('')
  const cacheRef = useRef(new Map())
  const pedidoRef = useRef(0)

  // limpa ao fechar
  useEffect(() => {
    if (!aberto) {
      setEquipaSel(null)
      setDetalhe(null)
      setErroDetalhe('')
    }
  }, [aberto])

  // pesquisa com atraso (evita um pedido por tecla)
  useEffect(() => {
    if (!aberto || equipaSel) return
    const termo = q.trim()
    if (termo.length < 2) {
      setResultados([])
      setErro('')
      setAProcurar(false)
      return
    }
    const chave = `${jogo}:${termo.toLowerCase()}`
    const guardado = cacheRef.current.get(chave)
    if (guardado) {
      setResultados(guardado)
      setErro('')
      setAProcurar(false)
      return
    }
    const id = ++pedidoRef.current
    setAProcurar(true)
    setErro('')
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/equipas?jogo=${jogo}&q=${encodeURIComponent(termo)}`, {
          headers: authHeaders(),
        })
        const d = await r.json().catch(() => null)
        if (id !== pedidoRef.current) return
        if (!r.ok) throw new Error((d && d.error) || 'Não foi possível pesquisar.')
        const lista = (d && d.resultados) || []
        cacheRef.current.set(chave, lista)
        setResultados(lista)
      } catch (e) {
        if (id === pedidoRef.current) setErro(e.message || 'Não foi possível pesquisar.')
      } finally {
        if (id === pedidoRef.current) setAProcurar(false)
      }
    }, 550)
    return () => clearTimeout(t)
  }, [q, jogo, aberto, equipaSel])

  const abrirEquipa = async (r) => {
    setEquipaSel(r)
    setDetalhe(null)
    setErroDetalhe('')
    const chave = `equipa:${r.jogo}:${(r.ref || r.titulo).toLowerCase()}`
    const guardado = cacheRef.current.get(chave)
    if (guardado) {
      setDetalhe(guardado)
      return
    }
    setACarregar(true)
    try {
      const resp = await fetch(
        `/api/equipas/${r.jogo}/${encodeURIComponent(r.ref || r.titulo)}`,
        { headers: authHeaders() },
      )
      const d = await resp.json().catch(() => null)
      if (!resp.ok || !d || !d.ok) {
        throw new Error((d && d.error) || 'Não foi possível abrir a equipa.')
      }
      cacheRef.current.set(chave, d)
      setDetalhe(d)
    } catch (e) {
      setErroDetalhe(e.message || 'Não foi possível abrir a equipa.')
    } finally {
      setACarregar(false)
    }
  }

  if (!aberto) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:items-center"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
          className="my-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0a16] shadow-2xl"
        >
          {/* cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              {equipaSel ? (
                <button
                  type="button"
                  onClick={() => {
                    setEquipaSel(null)
                    setDetalhe(null)
                    setErroDetalhe('')
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  title="Voltar à pesquisa"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Shield className="h-4 w-4" />
                </span>
              )}
              <h2 className="truncate text-sm font-black text-white sm:text-base">
                {equipaSel ? equipaSel.titulo : 'Equipas de esports'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!equipaSel && (
            <div className="p-4 sm:p-5">
              {/* escolher jogo */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                {JOGOS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setJogo(g.id)
                      setQ('')
                      setResultados([])
                      setErro('')
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                      jogo === g.id
                        ? 'border-violet-400/40 bg-violet-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {g.nome}
                  </button>
                ))}
              </div>

              {/* pesquisa */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={jogo === 'cs2' ? 'Ex.: NAVI, Vitality, G2…' : 'Ex.: G2, Team Secret, Wolves…'}
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-violet-400/40 focus:outline-none"
                />
                {aProcurar && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-300" />
                )}
              </div>

              <p className="mt-2 text-[10px] text-gray-500">
                Pesquisa por nome oficial. Os dados (plantel, torneios e prémios) vêm da Liquipedia.
              </p>

              {erro && (
                <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {erro}
                  <button
                    type="button"
                    onClick={() => setQ((x) => x + ' ')}
                    className="mt-2 flex items-center gap-1 text-xs font-bold text-rose-100 underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Tentar outra vez
                  </button>
                </div>
              )}

              {!erro && !aProcurar && q.trim().length >= 2 && !resultados.length && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Sem resultados. Tenta o nome completo da organização.
                </p>
              )}

              {resultados.length > 0 && (
                <ul className="mt-4 max-h-[46vh] space-y-1 overflow-y-auto pr-1">
                  {resultados.map((r) => (
                    <li key={r.titulo}>
                      <button
                        type="button"
                        onClick={() => abrirEquipa(r)}
                        className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-violet-400/30 hover:bg-white/[0.07]"
                      >
                        <span className="block text-sm font-bold text-white">{r.titulo}</span>
                        {r.resumo && (
                          <span className="mt-0.5 line-clamp-2 block text-[11px] text-gray-500">
                            {r.resumo}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {equipaSel && (
            <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-5">
              {aCarregar && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-300" />
                  <p className="mt-3 text-sm">A abrir a ficha da equipa…</p>
                </div>
              )}

              {!aCarregar && erroDetalhe && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {erroDetalhe}
                  <button
                    type="button"
                    onClick={() => abrirEquipa(equipaSel)}
                    className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-100 underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Tentar outra vez
                  </button>
                </div>
              )}

              {!aCarregar && detalhe && <Ficha d={detalhe} />}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Ficha({ d }) {
  return (
    <div>
      {/* identidade */}
      <div className="flex flex-wrap items-center gap-3">
        <AvatarImg src={d.logo} name={d.nome} className="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-black text-white">{d.nome}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
            {d.pais && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {d.pais}
              </span>
            )}
            {d.regiao && <span className="uppercase">{d.regiao}</span>}
            {d.criado && <span>Criada em {d.criado}</span>}
          </p>
        </div>
        <a
          href={d.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-gray-300 hover:bg-white/10 hover:text-white"
        >
          {d.jogo === 'r6' ? 'Liquipedia' : 'bo3.gg'} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* números rápidos */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini
          icon={DollarSign}
          rotulo="Dinheiro ganho"
          valor={moeda(d.ganhos) || '—'}
          destaque
        />
        <Mini icon={Users} rotulo="Jogadores" valor={d.jogadores.length || '—'} />
        <Mini
          icon={Trophy}
          rotulo="Títulos"
          valor={d.vitoriasTorneios != null ? d.vitoriasTorneios : d.ultimosTorneios.length || '—'}
        />
        <Mini icon={Star} rotulo="Ranking" valor={d.rank ? `#${d.rank}` : '—'} />
      </div>

      {(d.capitao || d.treinador || d.ceo) && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
          {d.capitao && (
            <span>
              <span className="font-bold text-gray-300">Capitão:</span> {d.capitao}
            </span>
          )}
          {d.treinador && (
            <span>
              <span className="font-bold text-gray-300">Treinador:</span> {d.treinador}
            </span>
          )}
          {d.ceo && (
            <span>
              <span className="font-bold text-gray-300">CEO:</span> {d.ceo}
            </span>
          )}
        </p>
      )}

      {/* plantel */}
      <Secao titulo="Plantel" icon={Users}>
        {d.jogadores.length ? (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {d.jogadores.map((j) => (
              <li
                key={`${j.id}-${j.entrou || ''}`}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2"
              >
                <AvatarImg name={j.id} className="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-bold text-white">
                    {j.id}
                    {j.capitao && (
                      <span className="rounded bg-amber-400/15 px-1 text-[8px] font-black uppercase text-amber-300">
                        C
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[10px] text-gray-500">
                    {[j.nome, j.pais].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {j.entrou && (
                  <span className="shrink-0 text-[9px] text-gray-500">{dataCurta(j.entrou)}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>Plantel não disponível na Liquipedia.</Vazio>
        )}
      </Secao>

      {/* próximos torneios */}
      <Secao titulo="Próximos torneios" icon={CalendarDays}>
        {d.proximosTorneios.length ? (
          <ul className="space-y-1.5">
            {d.proximosTorneios.map((t, i) => (
              <li
                key={`${t.nome}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/15 bg-sky-500/[0.06] px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{t.nome}</span>
                {t.tier && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase text-gray-400">
                    {t.tier}
                  </span>
                )}
                {t.datas && <span className="text-[11px] font-semibold text-sky-200">{t.datas}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>Sem torneios futuros registados.</Vazio>
        )}
      </Secao>

      {/* próximos jogos */}
      {d.proximosJogos.length > 0 && (
        <Secao titulo="Próximos jogos" icon={Trophy}>
          <ul className="space-y-1.5">
            {d.proximosJogos.map((j, i) => (
              <li
                key={`${j.torneio}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs"
              >
                <span className="font-bold text-white">{j.adversario || 'Adversário a definir'}</span>
                {j.torneio && <span className="truncate text-gray-400">· {j.torneio}</span>}
                {j.data && <span className="ml-auto text-[11px] font-semibold text-violet-200">{j.data}</span>}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* últimos jogos (CS2) */}
      {d.ultimosJogos && d.ultimosJogos.length > 0 && (
        <Secao titulo="Últimos jogos" icon={Swords}>
          <ul className="space-y-1.5">
            {d.ultimosJogos.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs"
              >
                <span
                  className={`w-5 shrink-0 rounded text-center text-[10px] font-black ${
                    j.venceu
                      ? 'bg-emerald-400/20 text-emerald-300'
                      : 'bg-rose-400/15 text-rose-300'
                  }`}
                  title={j.venceu ? 'Vitória' : 'Derrota'}
                >
                  {j.venceu ? 'V' : 'D'}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold text-white">
                  {j.adversario || 'Adversário'}
                </span>
                {j.placar && (
                  <span className="shrink-0 font-black tabular-nums text-gray-300">{j.placar}</span>
                )}
                {j.torneio && (
                  <span className="w-full truncate text-[10px] text-gray-500 sm:w-auto">
                    {j.torneio}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[10px] text-gray-500">{dataCurta(j.data)}</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* conquistas (CS2) */}
      {d.conquistas && d.conquistas.length > 0 && (
        <Secao titulo="Conquistas" icon={Trophy}>
          <ul className="space-y-1.5">
            {d.conquistas.map((c, i) => (
              <li
                key={`${c.data}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-3 py-2 text-xs"
              >
                <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  {c.titulo === 'winner' ? '🏆 1.º' : c.titulo}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{c.torneio}</span>
                {c.premio && (
                  <span className="shrink-0 text-[11px] font-bold text-emerald-300">{c.premio}</span>
                )}
                <span className="shrink-0 text-[10px] text-gray-500">{dataCurta(c.data)}</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* últimos torneios */}
      <Secao titulo="Últimos torneios e prémios" icon={Trophy}>
        {d.ultimosTorneios.length ? (
          <ul className="space-y-1.5">
            {d.ultimosTorneios.map((t, i) => (
              <li
                key={`${t.data}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <span className="w-16 shrink-0 text-[10px] text-gray-500">{dataCurta(t.data)}</span>
                {t.posicao && (
                  <span
                    className={`w-10 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-black ${
                      /^1/.test(t.posicao || '')
                        ? 'bg-amber-400/20 text-amber-300'
                        : /^[23]/.test(t.posicao || '')
                          ? 'bg-gray-300/10 text-gray-300'
                          : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    {t.posicao}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
                  {t.torneio || 'Torneio'}
                </span>
                {t.tier && (
                  <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-gray-400">
                    {t.tier}
                  </span>
                )}
                {t.premio && (
                  <span className="shrink-0 text-[11px] font-bold text-emerald-300">{t.premio}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>Sem resultados recentes registados.</Vazio>
        )}
      </Secao>

      <p className="mt-4 text-right text-[9px] text-gray-600">
        Dados: {d.jogo === 'r6' ? 'Liquipedia' : 'bo3.gg'} · atualizado{' '}
        {d.atualizado ? new Date(d.atualizado).toLocaleString('pt-PT') : 'agora'}
      </p>
    </div>
  )
}

function Mini({ icon: Icon, rotulo, valor, destaque }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        destaque
          ? 'border-emerald-400/20 bg-emerald-500/[0.07]'
          : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
        <Icon className={`h-3 w-3 ${destaque ? 'text-emerald-300' : ''}`} /> {rotulo}
      </span>
      <span
        className={`mt-0.5 block truncate text-sm font-black tabular-nums ${
          destaque ? 'text-emerald-200' : 'text-white'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

function Secao({ titulo, icon: Icon, children }) {
  return (
    <section className="mt-5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Icon className="h-3.5 w-3.5" /> {titulo}
      </h4>
      {children}
    </section>
  )
}

function Vazio({ children }) {
  return <p className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-xs text-gray-500">{children}</p>
}
