import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Gift, Loader2, Sparkles, Coins, X, ArrowRight } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { toast } from './Feedback'
import MoedaLocaus from './MoedaLocaus'
import ProfileCard from './ProfileCard'
import ProfileStylePreview from './ProfileStylePreview'
import { classesNome } from '../data/nomeEfeitos'

/* ============================================================
   LOCAUS PACKS
   ------------------------------------------------------------
   O próprio utilizador abre o pack: arrasta para cima (rato ou
   dedo). Primeiro sai a raridade, depois o item com pré-visualização.
   ============================================================ */

const TIPOS = {
  basico: { nome: 'Básico', cor: '#a1a1aa', brilho: 'rgba(161,161,170,0.35)', odds: '70% comum · 22% raro · 7% épico · 1% lendário' },
  epico: { nome: 'Épico', cor: '#c084fc', brilho: 'rgba(192,132,252,0.4)', odds: '30% comum · 45% raro · 22% épico · 3% lendário' },
  lendario: { nome: 'Lendário', cor: '#f5c542', brilho: 'rgba(245,197,66,0.45)', odds: '5% comum · 25% raro · 45% épico · 25% lendário' },
}

const CORES_RARIDADE = {
  comum: '#a1a1aa',
  raro: '#60a5fa',
  epico: '#c084fc',
  lendario: '#f5c542',
}

const NOME_RARIDADE = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
}

function PrevisaoItem({ item, me }) {
  if (!item) return null
  if (item.tipo === 'cor') {
    return (
      <div className="pack-preview-cor">
        <span className={classesNome(item.valor_cor || item.valor_textura || '')}>
          {me?.username || 'O teu nome'}
        </span>
      </div>
    )
  }
  if (item.tipo === 'carta') {
    return (
      <div className="pack-preview-carta">
        <ProfileCard
          perfil={{ ...(me || {}), card_style: item.valor }}
          variant={item.valor}
          jogos={[
            ...new Set([
              ...((me && me.game_accounts) || []),
              ...Object.keys((me && me.game_ranks) || {}),
            ]),
          ].filter((g) => g !== 'csgo')}
        />
      </div>
    )
  }
  return <ProfileStylePreview style={item.valor} nome={me?.username || 'O teu nome'} />
}

export default function Packs() {
  const [packs, setPacks] = useState(null)
  const [me, setMe] = useState(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null)
  const [fase, setFase] = useState('idle') // idle | abrindo | raridade | item
  const [resultado, setResultado] = useState(null)
  const [arrasto, setArrasto] = useState({ x: 0, ativo: false })
  const [alvo, setAlvo] = useState(null)
  const inicioX = useRef(null)
  const alvoRef = useRef(null)

  const carregar = async () => {
    try {
      const r = await fetch('/api/mercado/packs', { headers: authHeaders(), cache: 'no-store' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir os packs.')
      setPacks(d.packs || [])
      setErro('')
    } catch (e) {
      setErro(e.message)
      setPacks([])
    }
  }

  useEffect(() => {
    carregar()
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {})
  }, [])

  const abrir = async (pack) => {
    if (fase !== 'idle' || !pack) return
    setAberto(pack)
    setResultado(null)
    setFase('abrindo')
    try {
      const r = await fetch(`/api/mercado/packs/${pack.id}/abrir`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível abrir o pack.')
      setResultado(d)
      window.setTimeout(() => setFase('raridade'), 1400)
      window.setTimeout(() => setFase('item'), 2700)
    } catch (e) {
      toast.erro(e.message)
      setAberto(null)
      setFase('idle')
    }
  }

  const fechar = () => {
    setAberto(null)
    setFase('idle')
    setResultado(null)
    carregar()
    window.dispatchEvent(new Event('locaus:moedas'))
  }

  /* ---------- arrastar para abrir (rato e dedo) ---------- */
  const aoDescer = (e, pack) => {
    if (fase !== 'idle') return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* sem captura */
    }
    inicioX.current = e.clientX
    alvoRef.current = pack
    setAlvo(pack)
    setArrasto({ x: 0, ativo: true })
  }

  const aoMover = (e) => {
    if (inicioX.current == null) return
    const dx = Math.max(0, e.clientX - inicioX.current)
    setArrasto({ x: dx, ativo: true })
  }

  const aoSoltar = (e) => {
    const dx = inicioX.current == null ? 0 : e.clientX - inicioX.current
    const pack = alvoRef.current
    inicioX.current = null
    alvoRef.current = null
    setArrasto({ x: 0, ativo: false })
    setAlvo(null)
    if (dx > 70 && pack) abrir(pack)
  }

  const naoAbertos = (packs || []).filter((p) => !p.aberto)
  const abertos = (packs || []).filter((p) => p.aberto).slice(0, 6)

  if (packs === null) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#121214]/80 py-20 text-sm text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> A abrir os packs…
      </div>
    )
  }

  return (
    <div>
      {erro && <p className="mb-3 text-xs text-red-300">{erro}</p>}

      {naoAbertos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <Gift className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-bold text-white">Ainda não tens packs</p>
          <p className="mt-1 text-xs text-zinc-500">
            Quando o admin te der um Locaus Pack, aparece aqui para abrires.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <ArrowRight className="h-3.5 w-3.5" /> arrasta o pack para a direita para abrir
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {naoAbertos.map((p) => {
              const t = TIPOS[p.tipo] || TIPOS.basico
              const aArrastar = arrasto.ativo && alvo && alvo.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onPointerDown={(e) => aoDescer(e, p)}
                  onPointerMove={aoMover}
                  onPointerUp={aoSoltar}
                  onPointerCancel={aoSoltar}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      abrir(p)
                    }
                  }}
                  className="pack-card"
                  style={{
                    '--pack-cor': t.cor,
                    '--pack-brilho': t.brilho,
                    transform: aArrastar ? `translateX(${arrasto.x}px)` : undefined,
                    transition: aArrastar ? 'none' : 'transform 0.25s ease',
                  }}
                  title={t.odds}
                >
                  <span className="pack-glow" aria-hidden="true" />
                  <span className="pack-sachet">
                    <span className="pack-furo" aria-hidden="true" />
                    <span className="pack-selo">ALPHA PACK</span>
                    <span className="pack-faixa">{t.nome} pack</span>
                    <span className="pack-logo">LOCAUS</span>
                    <span className="pack-simbolo">L</span>
                    <span className="pack-fecho" aria-hidden="true" />
                  </span>
                  <span className="pack-rodape">Arrasta →</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {abertos.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Já abertos
          </p>
          <ul className="space-y-1">
            {abertos.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[11px] text-zinc-400"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: CORES_RARIDADE[p.raridade] || '#52525b' }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {NOME_RARIDADE[p.raridade] || 'Pack'} · {p.item_id || '—'}
                </span>
                <span className="shrink-0 text-zinc-600">
                  {new Date(p.aberto_em || p.criado_em).toLocaleDateString('pt-PT')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- Animação de abertura ---------------- */}
      {aberto &&
        createPortal(
        <div className="pack-overlay" role="dialog" aria-modal="true" aria-label="Abrir pack">
          <div className="pack-palco">
            {fase === 'abrindo' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="pack-animando"
                style={{ '--pack-cor': (TIPOS[aberto.tipo] || TIPOS.basico).cor }}
              >
                <span className="pack-anel" />
                <span className="pack-anel pack-anel--2" />
                <Gift className="h-16 w-16" />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                  A abrir…
                </p>
              </motion.div>
            )}

            {fase === 'raridade' && resultado && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pack-raridade"
                style={{ '--rar-cor': CORES_RARIDADE[resultado.raridade] }}
              >
                <span className="pack-raridade-brilho" />
                <p className="pack-raridade-nome">{NOME_RARIDADE[resultado.raridade]}</p>
                <p className="pack-raridade-sub">encontrado</p>
              </motion.div>
            )}

            {fase === 'item' && resultado && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="pack-resultado"
                style={{ '--rar-cor': CORES_RARIDADE[resultado.raridade] }}
              >
                <button type="button" onClick={fechar} className="pack-fechar" aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>

                <p className="pack-resultado-raridade">{NOME_RARIDADE[resultado.raridade]}</p>

                <div className="pack-resultado-caixa">
                  <PrevisaoItem item={resultado.item} me={me} />
                  <p
                    className={`mt-3 text-xl font-black ${
                      resultado.item.tipo === 'cor'
                        ? classesNome(resultado.item.valor_cor || resultado.item.valor_textura || '') ||
                          'text-white'
                        : 'text-white'
                    }`}
                  >
                    {resultado.item.nome}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {resultado.item.tipo === 'cor' ? 'Cor de nome' : resultado.item.tipo}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.06] px-3 py-1 text-sm font-black text-amber-100">
                    <MoedaLocaus size={14} /> {resultado.item.valor} moedas
                  </p>
                  {resultado.duplicado && (
                    <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-300">
                      <Coins className="h-3.5 w-3.5" /> Já tinhas — recebeste {resultado.creditos} moedas
                    </p>
                  )}
                </div>

                <button type="button" onClick={fechar} className="pack-continuar">
                  Continuar
                </button>
              </motion.div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
