import { useEffect, useRef, useState } from 'react'
import { Loader2, Music2, Play, Save, Search, Square, Trash2 } from 'lucide-react'
import ProfileCard from './ProfileCard'
import { MUSICAS_CARTAS } from './CartaMusical'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ADMIN — cartas no mercado + música por carta (pesquisa YouTube)
   ============================================================ */

const MUSICAIS = ['supra', 'nfs', 'niko']

const fmt = (s) => {
  const n = Math.max(0, Math.round(Number(s) || 0))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

function EditorMusica({ variante, meta, onGuardado }) {
  const def = MUSICAS_CARTAS[variante]
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [aProcurar, setAProcurar] = useState(false)
  const [erro, setErro] = useState('')
  const [sel, setSel] = useState(null)
  const [titulo, setTitulo] = useState(meta?.titulo || def?.cancao || '')
  const [inicio, setInicio] = useState(meta?.inicio ?? 0)
  const [fim, setFim] = useState(meta?.fim ?? 14)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [aTocar, setATocar] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    setTitulo(meta?.titulo || def?.cancao || '')
    setInicio(meta?.inicio ?? 0)
    setFim(meta?.fim ?? 14)
  }, [meta, def])

  useEffect(
    () => () => {
      if (audioRef.current) audioRef.current.pause()
    },
    [],
  )

  const procurar = async (e) => {
    e?.preventDefault()
    const texto = q.trim()
    if (!texto) return
    setAProcurar(true)
    setErro('')
    try {
      const r = await fetch(`/api/musica/search?q=${encodeURIComponent(texto)}`, {
        headers: authHeaders(),
        cache: 'no-store',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Não consegui pesquisar.')
      setResultados(Array.isArray(d.resultados) ? d.resultados : [])
      if (!d.resultados?.length) setErro('Sem resultados.')
    } catch (err) {
      setResultados([])
      setErro(err.message || 'Não consegui pesquisar.')
    } finally {
      setAProcurar(false)
    }
  }

  const escolher = (m) => {
    setSel(m)
    setTitulo(m.titulo || '')
    setInicio(0)
    setFim(Math.min(14, Math.max(5, Math.round(Number(m.duracao) || 14))))
    setMsg('')
  }

  const guardar = async (limpar = false) => {
    setBusy(true)
    setMsg('')
    try {
      const corpo = limpar
        ? { titulo: '', url: '', inicio: 0, fim: 0 }
        : {
            titulo: titulo || sel?.titulo || '',
            url: sel ? `yt:${sel.id}` : meta?.url?.startsWith('yt:') ? meta.url : '',
            inicio: Number(inicio) || 0,
            fim: Number(fim) || 14,
          }
      const r = await fetch(`/api/cartas/musica/${variante}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(corpo),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.ok) throw new Error(d?.erro || 'Não consegui guardar.')
      setMsg(limpar ? 'Música removida (volta à padrão).' : 'Guardado.')
      window.dispatchEvent(new Event('locaus:cartas-musica'))
      onGuardado?.()
    } catch (e) {
      setMsg(e.message || 'Erro.')
    } finally {
      setBusy(false)
    }
  }

  const ouvir = () => {
    if (aTocar) {
      audioRef.current?.pause()
      setATocar(false)
      return
    }
    const id = sel?.id || (/^yt:([A-Za-z0-9_-]{11})$/.exec(meta?.url || '') || [])[1]
    const src = id ? `/api/musica/stream/${id}` : meta?.url || def?.musica
    if (!src) return
    const a = new Audio(src)
    a.volume = 0.12
    const ini = Number(inicio) || 0
    const f = Number(fim) || 14
    a.currentTime = ini
    a.addEventListener('timeupdate', () => {
      if (a.currentTime >= f) {
        a.pause()
        setATocar(false)
      }
    })
    a.onended = () => setATocar(false)
    audioRef.current = a
    a.play().then(() => setATocar(true)).catch(() => setATocar(false))
  }

  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-xs font-bold uppercase tracking-[0.14em] text-[#ff9db0] sm:w-28">
          {def?.titulo || variante}
        </span>
        <form onSubmit={procurar} className="flex min-w-[200px] flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar música (YouTube)…"
              className="w-full rounded-full bg-white/5 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-zinc-500"
            />
          </div>
          <button type="submit" disabled={aProcurar} className="ui-btn ui-btn-ghost ui-btn-sm">
            {aProcurar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Procurar'}
          </button>
        </form>
      </div>

      {resultados.length > 0 && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-black/20">
          {resultados.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => escolher(m)}
              className={`flex w-full items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-left text-xs last:border-0 ${
                sel?.id === m.id ? 'bg-[#c50337]/20 text-white' : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Music2 className="h-3.5 w-3.5 shrink-0 text-[#ff9db0]" />
              <span className="min-w-0 flex-1 truncate">{m.titulo}</span>
              <span className="font-mono text-[10px] text-zinc-500">{fmt(m.duracao)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nome da música"
          className="min-w-[150px] flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
        />
        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
          início
          <input
            type="number"
            min="0"
            step="1"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="w-16 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
          fim
          <input
            type="number"
            min="1"
            step="1"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="w-16 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
          />
        </label>
        <button type="button" onClick={() => guardar(false)} disabled={busy} className="ui-btn ui-btn-sm ui-btn-primary">
          <Save className="h-3.5 w-3.5" /> Aplicar
        </button>
        <button type="button" onClick={ouvir} className="ui-btn ui-btn-sm ui-btn-ghost">
          {aTocar ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {aTocar ? 'Parar' : 'Ouvir'}
        </button>
        <button
          type="button"
          onClick={() => guardar(true)}
          disabled={busy}
          className="ui-btn ui-btn-sm ui-btn-danger"
          title="Remover música personalizada"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
        <span>
          {meta?.url
            ? `Atual: ${meta.titulo || 'música personalizada'} (${meta.inicio || 0}s–${meta.fim || 14}s)`
            : 'Sem música personalizada — usa a padrão'}
        </span>
        {erro && <span className="text-[#ffb3c1]">{erro}</span>}
        {msg && <span className="text-emerald-400">{msg}</span>}
      </div>
    </div>
  )
}

export default function AdminCartas() {
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')
  const [musicas, setMusicas] = useState({})
  const [versao, setVersao] = useState(0)

  const carregarMusicas = () =>
    fetch('/api/cartas', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMusicas((d && d.itens) || {}))
      .catch(() => {})

  useEffect(() => {
    fetch('/api/mercado', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) throw new Error('Sem resposta do mercado.')
        const cartas = (d.itens || []).filter((x) => x.tipo === 'carta')
        cartas.sort((a, b) => (Number(b.preco_compra) || 0) - (Number(a.preco_compra) || 0))
        setItens(cartas)
      })
      .catch((e) => setErro(e.message || 'Não consegui abrir o mercado.'))
    carregarMusicas()
  }, [])

  const perfil = { username: 'membro', display_id: 1, created_at: '2026-01-01' }

  return (
    <div>
      <p className="mb-4 text-xs text-gray-400">
        Todas as cartas do mercado. Nas cartas com música podes <b>pesquisar no YouTube</b> (como
        na música do perfil), escolher o <b>início</b> e o <b>fim</b> do trecho e aplicar. O volume
        é o mesmo da música dos perfis.
      </p>

      <section className="mb-6 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Music2 className="h-4 w-4 text-[#ff7a94]" /> Música das cartas
        </h3>

        {MUSICAIS.map((v) => (
          <EditorMusica
            key={`${v}-${versao}`}
            variante={v}
            meta={musicas[v]}
            onGuardado={() => {
              carregarMusicas()
              setVersao((x) => x + 1)
            }}
          />
        ))}
      </section>

      {erro && <p className="mb-3 text-xs text-red-400">{erro}</p>}

      {!itens ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((item) => (
            <div key={item.id} className="glass rounded-2xl p-3">
              <div className="mx-auto w-full max-w-[240px]">
                <ProfileCard perfil={{ ...perfil, card_style: item.valor }} variant={item.valor} className="w-full" />
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{item.nome}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    {item.raridade} · base {item.base}
                  </p>
                  {MUSICAS_CARTAS[item.valor] && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[#ffb3c1]">
                      <Music2 className="h-3 w-3" />{' '}
                      {musicas[item.valor]?.titulo || MUSICAS_CARTAS[item.valor].cancao}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold text-[#f5c542]">{item.preco_compra}</p>
                  <p className="text-[9px] uppercase tracking-wider text-zinc-500">moedas</p>
                  {item.comprado && (
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-emerald-400">comprada</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
