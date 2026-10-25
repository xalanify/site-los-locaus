import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  Flame,
  Calendar,
  Tag,
  ExternalLink,
  X,
  TrendingUp,
  Sparkles,
  Gamepad2,
  Store,
  ChevronRight,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { GTA_VI, RUMORES, CANCELADOS } from '../data/jogosRumores'

const GENEROS = [
  { id: '', nome: 'Todos' },
  { id: 'acao', nome: 'Ação' },
  { id: 'aventura', nome: 'Aventura' },
  { id: 'rpg', nome: 'RPG' },
  { id: 'estrategia', nome: 'Estratégia' },
  { id: 'simulacao', nome: 'Simulação' },
  { id: 'indie', nome: 'Indie' },
  { id: 'corrida', nome: 'Corrida' },
  { id: 'desporto', nome: 'Desporto' },
]

const PRECOS = [
  { id: '', nome: 'Qualquer preço' },
  { id: '0', nome: 'Grátis / sem preço' },
  { id: '1000', nome: 'Até 10 €' },
  { id: '2000', nome: 'Até 20 €' },
  { id: '4000', nome: 'Até 40 €' },
]

const ORDENS = [
  { id: 'relevancia', nome: 'Relevância' },
  { id: 'lancamento', nome: 'Mais recentes' },
  { id: 'preco_asc', nome: 'Preço: menor' },
  { id: 'preco_desc', nome: 'Preço: maior' },
  { id: 'avaliacao', nome: 'Melhor avaliados' },
  { id: 'nome', nome: 'Nome A-Z' },
]

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-PT')

function CartaoJogo({ jogo, onClick, destaque = false }) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(jogo.appid)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group overflow-hidden rounded-2xl border border-white/10 bg-[#120d20]/80 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#17112a]/90 ${
        destaque ? 'sm:col-span-2' : ''
      }`}
    >
      <div className="aspect-[460/215] overflow-hidden bg-black/40">
        {jogo.imagem ? (
          <img
            src={jogo.imagem}
            alt={jogo.nome}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              if (jogo.imagemFallback && e.currentTarget.src !== jogo.imagemFallback) {
                e.currentTarget.src = jogo.imagemFallback
              } else {
                e.currentTarget.style.display = 'none'
              }
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-gray-600">
            <Gamepad2 className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-black text-white">{jogo.nome}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold text-gray-500">
            {jogo.lancamento || 'Data a anunciar'}
          </span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {jogo.preco?.desconto > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-black text-red-300">
                Promoção -{jogo.preco.desconto}%
              </span>
            )}
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
              {jogo.preco?.texto || (jogo.emBreve ? 'Em breve' : jogo.lancamento ? 'Sem preço' : 'Em breve')}
            </span>
          </span>
        </div>
      </div>
    </motion.button>
  )
}

function FichaJogo({ appid, onClose }) {
  const [estado, setEstado] = useState({ loading: true, jogo: null, erro: '' })
  const [zoom, setZoom] = useState(null)

  useEffect(() => {
    if (!appid) return
    let vivo = true
    setEstado({ loading: true, jogo: null, erro: '' })
    fetch(`/api/games/steam/jogo/${appid}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return
        if (!d?.ok) setEstado({ loading: false, jogo: null, erro: d?.error || 'Erro.' })
        else setEstado({ loading: false, jogo: d.jogo, erro: '' })
      })
      .catch(() => vivo && setEstado({ loading: false, jogo: null, erro: 'Sem ligação à Steam.' }))
    return () => {
      vivo = false
    }
  }, [appid])

  const j = estado.jogo

  return (
    <>
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0716]/97 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-gray-300 backdrop-blur hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          {j?.imagem ? (
            <img src={j.imagem} alt="" className="h-48 w-full object-cover sm:h-60" />
          ) : (
            <div className="h-40 w-full bg-[#17112a]" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0716] to-transparent p-4 pt-16">
            <h2 className="font-display text-xl font-black text-white sm:text-2xl">{j?.nome || 'A carregar…'}</h2>
            <p className="text-[11px] font-semibold text-gray-400">
              {[j?.desenvolvedor, j?.lancamento].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {estado.loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> A ler a ficha na Steam…
            </p>
          ) : estado.erro ? (
            <p className="py-8 text-center text-sm text-yellow-300">{estado.erro}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {(j.generos || []).map((g) => (
                  <span key={g} className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-gray-300">
                    {g}
                  </span>
                ))}
                {j.emBreve && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-black text-amber-300">
                    Em breve
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                <Tag className="h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Preço na Steam</p>
                  <p className="flex flex-wrap items-center gap-2 font-display text-lg font-black text-white">
                    {j.preco?.texto}
                    {j.preco?.original && j.preco.desconto > 0 && (
                      <span className="text-xs font-semibold text-gray-500 line-through">
                        {j.preco.original}
                      </span>
                    )}
                    {j.preco?.desconto > 0 && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-300">
                        Promoção -{j.preco.desconto}%
                      </span>
                    )}
                  </p>
                </div>
                <a
                  href={j.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-black text-black hover:bg-emerald-400"
                >
                  Abrir na Steam <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <p className="text-sm leading-relaxed text-gray-300">{j.descricao}</p>

              {j.imagens?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {j.imagens.map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setZoom(img)}
                      className="overflow-hidden rounded-xl focus:outline-none"
                      title="Ampliar imagem"
                    >
                      <img
                        src={img}
                        alt=""
                        className="aspect-video w-full cursor-zoom-in object-cover transition-transform hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Comprar / comparar lojas
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(j.links || []).map((l) => (
                    <a
                      key={l.nome}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black text-white">{l.nome}</span>
                        <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                          {l.tipo}
                        </span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    </a>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-snug text-gray-600">
                  Os preços e disponibilidade são das lojas oficiais/retalhistas. Confirma sempre na loja antes de comprar.
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
    {zoom && (
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-3 sm:p-6"
        onClick={() => setZoom(null)}
        role="presentation"
      >
        <button
          type="button"
          onClick={() => setZoom(null)}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Fechar imagem"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={zoom}
          alt=""
          className="max-h-[92vh] max-w-[96vw] rounded-xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}

function CartaoEditorial({ item, onClick, destaque = false }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 p-4 text-left transition-transform hover:-translate-y-0.5 ${
        destaque ? 'sm:col-span-2' : ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${item.cor}44, #0b0716 70%)`,
      }}
    >
      <span
        className="pointer-events-none absolute -right-2 -top-4 font-display text-7xl font-black opacity-20"
        style={{ color: item.cor }}
      >
        {destaque ? 'VI' : item.nome.slice(0, 1)}
      </span>
      <span className="relative block text-[9px] font-black uppercase tracking-widest" style={{ color: item.cor }}>
        {item.estado}
      </span>
      <span className="relative mt-1 block font-display text-lg font-black text-white">{item.nome}</span>
      <span className="relative mt-1 block text-[11px] leading-snug text-gray-400">
        {item.lancamento || item.descricao.slice(0, 100) + '…'}
      </span>
    </button>
  )
}

function FichaEditorial({ item, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0716]/97 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: item.cor }}>
              {item.estado}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black text-white">{item.nome}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-gray-300 hover:text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm leading-relaxed text-gray-300">{item.descricao}</p>
          {item.lancamento && (
            <p className="mt-3 text-[12px] font-bold text-white">Lançamento: {item.lancamento}</p>
          )}
          {item.pc && <p className="mt-1 text-[12px] font-semibold text-amber-300">{item.pc}</p>}
          {item.aviso && <p className="mt-2 text-[10px] text-gray-500">{item.aviso}</p>}
        </div>
      </motion.div>
    </div>
  )
}

export default function SteamStorePage() {
  const [aba, setAba] = useState('embreve')
  const [subEmBreve, setSubEmBreve] = useState('steam')
  const [editorial, setEditorial] = useState(null)
  const [emBreve, setEmBreve] = useState({ loading: true, jogos: [], erro: '' })
  const [top, setTop] = useState({ loading: true, jogos: [], erro: '' })
  const [maisComprados, setMaisComprados] = useState({ loading: true, jogos: [] })
  const [pesquisa, setPesquisa] = useState({ loading: false, jogos: [], erro: '' })
  const [q, setQ] = useState('')
  const [genero, setGenero] = useState('')
  const [maxpreco, setMaxpreco] = useState('')
  const [ordenar, setOrdenar] = useState('relevancia')
  const [ficha, setFicha] = useState(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/games/steam/em-breve')
      .then((r) => r.json())
      .then((d) => vivo && setEmBreve({ loading: false, jogos: d?.jogos || [], erro: d?.error || '' }))
      .catch(() => vivo && setEmBreve({ loading: false, jogos: [], erro: 'Sem ligação.' }))
    fetch('/api/games/steam/top')
      .then((r) => r.json())
      .then((d) => vivo && setTop({ loading: false, jogos: d?.jogos || [], erro: d?.error || '' }))
      .catch(() => vivo && setTop({ loading: false, jogos: [], erro: 'Sem ligação.' }))
    fetch('/api/games/steam/mais-comprados')
      .then((r) => r.json())
      .then((d) => vivo && setMaisComprados({ loading: false, jogos: d?.jogos || [] }))
      .catch(() => vivo && setMaisComprados({ loading: false, jogos: [] }))
    return () => {
      vivo = false
    }
  }, [])

  const procurar = async (e) => {
    e?.preventDefault()
    setPesquisa((p) => ({ ...p, loading: true, erro: '' }))
    try {
      const params = new URLSearchParams({ q, genero, maxpreco, ordenar })
      const r = await fetch(`/api/games/steam/procurar?${params}`)
      const d = await r.json()
      setPesquisa({ loading: false, jogos: d?.jogos || [], erro: d?.error || '' })
    } catch {
      setPesquisa({ loading: false, jogos: [], erro: 'Sem ligação à Steam.' })
    }
  }

  const abrir = (appid) => setFicha(appid)

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-black gradient-text" style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}>
          Jogos
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Lançamentos, os mais jogados na Steam e pesquisa de qualquer jogo — com preços e links para as lojas.
        </p>
      </motion.div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          { id: 'embreve', label: 'Em breve', Icon: Calendar },
          { id: 'top', label: 'Mais jogados', Icon: TrendingUp },
          { id: 'procurar', label: 'Procurar', Icon: Search },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors sm:gap-2 sm:px-3 sm:text-[11px] ${
              aba === t.id
                ? 'border-violet-400/40 bg-violet-500/20 text-white'
                : 'border-white/10 bg-[#120d20]/80 text-gray-400 hover:text-white'
            }`}
          >
            <t.Icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {aba === 'embreve' && (
        <section className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-gray-300">
                Em breve
              </h2>
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                { id: 'steam', label: 'Steam' },
                { id: 'rumores', label: 'Rumores' },
                { id: 'cancelados', label: 'Cancelados / fechados' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubEmBreve(s.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                    subEmBreve === s.id
                      ? 'bg-violet-500 text-white'
                      : 'border border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {subEmBreve === 'steam' && (
            <>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <CartaoEditorial item={GTA_VI} onClick={setEditorial} destaque />
              </div>
              {emBreve.loading ? (
                <p className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar lançamentos…
                </p>
              ) : emBreve.erro ? (
                <p className="py-6 text-center text-sm text-yellow-300">{emBreve.erro}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {emBreve.jogos.map((j) => (
                    <CartaoJogo key={j.appid} jogo={j} onClick={abrir} />
                  ))}
                </div>
              )}
            </>
          )}

          {subEmBreve === 'rumores' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <CartaoEditorial item={GTA_VI} onClick={setEditorial} destaque />
              {RUMORES.map((r) => (
                <CartaoEditorial key={r.id} item={r} onClick={setEditorial} />
              ))}
            </div>
          )}

          {subEmBreve === 'cancelados' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {CANCELADOS.map((r) => (
                <CartaoEditorial key={r.id} item={r} onClick={setEditorial} />
              ))}
            </div>
          )}
        </section>
      )}

      {aba === 'top' && (
        <section className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-gray-300">
              Top 10 mais jogados agora na Steam
            </h2>
          </div>
          {top.loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar o top…
            </p>
          ) : top.erro ? (
            <p className="py-6 text-center text-sm text-yellow-300">{top.erro}</p>
          ) : (
            <div className="space-y-2">
              {top.jogos.map((j, i) => (
                <button
                  key={j.appid}
                  onClick={() => abrir(j.appid)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-2.5 text-left transition-colors hover:border-orange-400/30 hover:bg-orange-500/[0.05]"
                >
                  <span className="w-7 shrink-0 text-center font-display text-lg font-black text-gray-500">
                    {i + 1}
                  </span>
                  <img src={j.imagem} alt="" className="h-12 w-24 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-white">{j.nome}</span>
                    <span className="block text-[11px] font-semibold text-gray-500">
                      {fmtNum(j.ccu)} jogadores agora
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
                      {j.desconto > 0 && (
                        <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-black text-red-300">
                          -{j.desconto}%
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                        {j.preco}
                      </span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 sm:flex">
                    {j.desconto > 0 && (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-[9px] font-black text-red-300">
                        Promoção -{j.desconto}%
                      </span>
                    )}
                    <span className="max-w-[180px] truncate rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                      {j.preco}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {aba === 'procurar' && (
        <section className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
          <form onSubmit={procurar} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Escreve o nome de um jogo…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-black text-white hover:bg-violet-400"
              >
                Procurar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#17112a] px-3 py-2 text-[11px] font-bold text-gray-200 outline-none"
              >
                {GENEROS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
              <select
                value={maxpreco}
                onChange={(e) => setMaxpreco(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#17112a] px-3 py-2 text-[11px] font-bold text-gray-200 outline-none"
              >
                {PRECOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <select
                value={ordenar}
                onChange={(e) => setOrdenar(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#17112a] px-3 py-2 text-[11px] font-bold text-gray-200 outline-none"
              >
                {ORDENS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {!q.trim() && pesquisa.jogos.length === 0 && maisComprados.jogos.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <TrendingUp className="h-3.5 w-3.5 text-violet-400" /> Mais comprados agora na Steam
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {maisComprados.jogos.map((j) => (
                  <CartaoJogo key={j.appid} jogo={j} onClick={abrir} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            {pesquisa.loading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> A procurar na Steam…
              </p>
            ) : pesquisa.erro ? (
              <p className="py-6 text-center text-sm text-yellow-300">{pesquisa.erro}</p>
            ) : pesquisa.jogos.length === 0 ? (
              q.trim() ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Sem resultados para “{q.trim()}”.
                </p>
              ) : null
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {pesquisa.jogos.map((j) => (
                  <CartaoJogo key={j.appid} jogo={j} onClick={abrir} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-[10px] font-semibold text-gray-600">
        <Store className="h-3.5 w-3.5" /> Dados e imagens da Steam / SteamSpy. Preços sujeitos a alteração.
      </p>

      <AnimatePresence>
        {ficha && <FichaJogo appid={ficha} onClose={() => setFicha(null)} />}
        {editorial && <FichaEditorial item={editorial} onClose={() => setEditorial(null)} />}
      </AnimatePresence>
    </PageShell>
  )
}
