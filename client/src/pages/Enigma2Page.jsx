import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Headphones,
  HelpCircle,
  Monitor,
  Skull,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMA 2 — PROTOCOLO ORION
   Vermelho, escuro, minimalista. Sem scroll.
   Cada etapa: 2 pistas → PALAVRA-SUFIXO.
   ============================================================ */

const CACHE_KEY = 'enigma2:estado'

const lerCache = () => {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    return d && d.payload && d.etapa ? d : null
  } catch {
    return null
  }
}

const gravarCache = (d) => {
  try {
    if (!d) localStorage.removeItem(CACHE_KEY)
    else localStorage.setItem(CACHE_KEY, JSON.stringify(d))
  } catch {
    /* sem storage */
  }
}

const VERMELHO = '#ff2d55'
const ROSA = '#ff8fa3'

const ETAPAS = [
  {
    n: 1,
    codigo: 'SINAL',
    titulo: 'O primeiro sinal',
    missao: 'A transmissão deixou duas marcas.',
  },
  {
    n: 2,
    codigo: 'ÓRBITA',
    titulo: 'Órbita quebrada',
    missao: 'A órbita esconde mais do que mostra.',
  },
  {
    n: 3,
    codigo: 'CIFRA',
    titulo: 'A cifra dos navegadores',
    missao: 'Os navegadores falavam por código.',
  },
  {
    n: 4,
    codigo: 'ECO',
    titulo: 'Eco no vazio',
    missao: 'O eco repete o que já sabias.',
  },
  {
    n: 5,
    codigo: 'HORIZONTE',
    titulo: 'Horizonte de eventos',
    missao: 'O fim está escondido no princípio.',
  },
]

const MORSE_TABELA =
  'A .- · B -... · C -.-. · D -.. · E . · F ..-. · G --. · H .... · I .. · J .--- · K -.- · L .-.. · M -- · N -. · O --- · P .--. · Q --.- · R .-. · S ... · T - · U ..- · V ...- · W .-- · X -..- · Y -.-- · Z --.. · 0 ----- · 1 .---- · 2 ..--- · 3 ...-- · 4 ....- · 5 ..... · 6 -.... · 7 --... · 8 ---.. · 9 ----.'

const DICAS = {
  sinal: [
    'Nem todos os códigos estão escritos por extenso.',
    'O fundo também guarda segredos.',
    'São duas metades: uma vês, a outra tens de revelar.',
  ],
  orbita: [
    'A imagem tem memória.',
    'O que procuras não está no ecrã — está escrito no ficheiro.',
    'Copia as coordenadas com a vírgula (ex.: 38.7, -9.1) para o Google Maps.',
    'O nome da cidade, em português, é a palavra.',
  ],
  cifra: [
    'Descarrega a imagem e abre-a: a palavra está lá dentro.',
    'O nome do ficheiro guarda a segunda metade.',
    'Junta as duas com um hífen.',
  ],
  eco: [
    'O eco fala em pontos e traços.',
    'Há uma palavra que te leva mais longe.',
    'Junta as duas metades.',
  ],
  horizonte: [
    'O fim está escondido no princípio.',
    'Um número abre a lista.',
    'O sufixo está do outro lado.',
  ],
}

/* ------------------------------------------------------------
   Estrelas (tom vermelho)
   ------------------------------------------------------------ */
function Starfield() {
  const ref = useRef(null)
  const rato = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    let raf = 0
    let largura = 0
    let altura = 0
    let estrelas = []
    let cadente = null

    const criar = () => {
      const n = Math.min(200, Math.round((largura * altura) / 10000))
      estrelas = Array.from({ length: n }).map(() => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        z: 0.3 + Math.random() * 0.7,
        r: 0.4 + Math.random() * 1.5,
        t: Math.random() * Math.PI * 2,
        v: 0.3 + Math.random() * 0.9,
      }))
    }

    const redimensionar = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      largura = canvas.clientWidth
      altura = canvas.clientHeight
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      criar()
    }

    const mover = (e) => {
      rato.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      rato.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura)
      for (const e of estrelas) {
        e.t += 0.01 * e.v
        const brilho = 0.3 + (Math.sin(e.t) + 1) * 0.28
        const x = e.x + rato.current.x * 16 * e.z
        const y = e.y + rato.current.y * 16 * e.z
        ctx.beginPath()
        ctx.fillStyle = `rgba(255,225,232,${brilho.toFixed(3)})`
        ctx.arc(x, y, e.r * e.z, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!cadente && Math.random() < 0.0035) {
        cadente = { x: Math.random() * largura * 0.7, y: Math.random() * altura * 0.4, vx: 6 + Math.random() * 4, vy: 2 + Math.random() * 2, vida: 1 }
      }
      if (cadente) {
        const c = cadente
        c.x += c.vx
        c.y += c.vy
        c.vida -= 0.014
        const grad = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 8, c.y - c.vy * 8)
        grad.addColorStop(0, `rgba(255,210,220,${Math.max(0, c.vida).toFixed(2)})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(c.x - c.vx * 8, c.y - c.vy * 8)
        ctx.stroke()
        if (c.vida <= 0 || c.x > largura + 80 || c.y > altura + 80) cadente = null
      }
      raf = requestAnimationFrame(desenhar)
    }

    redimensionar()
    window.addEventListener('resize', redimensionar)
    window.addEventListener('pointermove', mover)
    raf = requestAnimationFrame(desenhar)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', redimensionar)
      window.removeEventListener('pointermove', mover)
    }
  }, [])

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}

function Constelacao({ etapa }) {
  return (
    <div className="relative flex items-center justify-center gap-3 sm:gap-5">
      <span className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1
        const feito = n < etapa
        const atual = n === etapa
        return (
          <span
            key={n}
            className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border text-[10px] font-black transition-all duration-500 sm:h-8 sm:w-8 ${
              atual
                ? 'border-[#ff2d55] bg-[#ff2d55] text-black shadow-[0_0_22px_rgba(255,45,85,.55)]'
                : feito
                  ? 'border-[#ff2d55]/50 bg-[#ff2d55]/15 text-[#ff8fa3]'
                  : 'border-white/10 bg-white/[0.02] text-white/25'
            }`}
          >
            {feito ? <Star className="h-3 w-3" /> : n}
          </span>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------
   Conteúdo da etapa
   ------------------------------------------------------------ */
function Desafio({ payload, troll, aoPedirAjuda, setTabelaMorseAberta }) {
  const [zoom, setZoom] = useState(null)
  if (!payload) return null

  let corpo = null

  if (payload.tipo === 'sinal') {
    corpo = (
      <div className="space-y-2.5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-white/30">Base64</p>
          <p className="mt-1 break-all rounded-lg border border-white/8 bg-black/50 px-3 py-2 font-mono text-[13px] tracking-[0.14em] text-[#ffd1da]">
            {payload.b64}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-[#080406] px-3 py-2">
          <p className="select-text font-mono text-[12px] leading-relaxed" style={{ color: '#080406', userSelect: 'text' }}>
            sufixo: {payload.sufixo}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={aoPedirAjuda}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60 hover:bg-white/[0.06]"
          >
            <HelpCircle className="h-3 w-3" /> Ajuda
          </button>
          {troll && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-200/80">
              <Skull className="h-3.5 w-3.5" /> {troll}
            </span>
          )}
        </div>
      </div>
    )
  } else if (payload.tipo === 'orbita') {
    corpo = (
      <div className="space-y-2">
        <button type="button" onClick={() => setZoom(payload.imagem)} className="group relative block w-full">
          <img src={payload.imagem} alt="Mapa orbital" className="mx-auto max-h-[24vh] w-full object-contain" />
        </button>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.16em]">
          <a href={payload.imagem} target="_blank" rel="noreferrer" className="text-[#ff8fa3] hover:text-white">
            abrir imagem ↗
          </a>
        </div>
      </div>
    )
  } else if (payload.tipo === 'cifra') {
    corpo = (
      <div className="space-y-2">
        <a
          href={payload.download}
          className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#ff8fa3] transition hover:bg-[#ff2d55]/20 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" /> descarregar imagem
        </a>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
          a cifra está no ficheiro
        </p>
      </div>
    )
  } else if (payload.tipo === 'eco') {
    corpo = (
      <div className="space-y-2">
        <audio controls src={payload.audio} className="w-full max-w-md" preload="none" />
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.16em]">
          <a
            href={payload.pagina}
            target="_blank"
            rel="noreferrer"
            className="text-[#ff8fa3] underline decoration-[#ff2d55]/40 underline-offset-4 hover:text-white"
          >
            memória ↗
          </a>
          <button
            type="button"
            onClick={() => setTabelaMorseAberta(true)}
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70"
          >
            <Headphones className="h-3 w-3" /> tabela morse
          </button>
        </div>
      </div>
    )
  } else if (payload.tipo === 'horizonte') {
    corpo = (
      <div className="space-y-2">
        <a
          href={payload.pagina}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff8fa3] underline decoration-[#ff2d55]/40 underline-offset-4 hover:text-white"
        >
          início ↗
        </a>
        <ol className="grid grid-cols-3 gap-x-3 gap-y-0.5 rounded-lg border border-white/8 bg-black/35 px-3 py-2 font-mono text-[9.5px] text-white/55 sm:grid-cols-5">
          {payload.lista.map((palavra, i) => (
            <li key={palavra} className="flex gap-1">
              <span className="w-4 text-right text-white/25">{i + 1}</span>
              <span className="truncate uppercase tracking-[0.06em]">{palavra}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <>
      {corpo}
      {zoom &&
        createPortal(
          <div
            className="fixed inset-0 z-[420] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setZoom(null)}
            role="dialog"
            aria-label="Imagem ampliada"
          >
            <img src={zoom} alt="Imagem ampliada" className="max-h-full max-w-full rounded-lg border border-white/10" />
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70"
            >
              fechar
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}

/* ------------------------------------------------------------
   Painel (fixo, sem 3D)
   ------------------------------------------------------------ */
function PainelEtapa({ etapa, payload, valor, setValor, aoSubmeter, erro, troll, carregando, abrirMorse }) {
  const [cliquesAjuda, setCliquesAjuda] = useState(0)
  const [ajudaTroll, setAjudaTroll] = useState('')
  const [ajudaAberta, setAjudaAberta] = useState(false)

  const pedirAjuda = () => {
    const movel =
      typeof window !== 'undefined' &&
      (window.matchMedia('(max-width: 1023px)').matches || window.matchMedia('(pointer: coarse)').matches)
    if (movel) {
      setAjudaAberta(true)
      return
    }
    const n = cliquesAjuda + 1
    setCliquesAjuda(n)
    setAjudaTroll(
      n === 1
        ? 'Seu burro. A ajuda tem de ser escrita na consola (F12).'
        : 'A consola é o mapa. Escreve ajuda lá.',
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:p-5"
      style={{ boxShadow: '0 30px 90px -50px rgba(255,45,85,.55), inset 0 1px 0 rgba(255,255,255,.05)' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'radial-gradient(600px circle at 50% 0%, rgba(255,45,85,.12), transparent 60%)' }} />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/50">
            Etapa {etapa.n} / 5
          </span>
          <span className="rounded-full bg-[#ff2d55]/15 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-[#ff8fa3]">
            {etapa.codigo}
          </span>
          <span className="ml-auto hidden font-mono text-[9px] uppercase tracking-[0.18em] text-white/25 sm:block">
            F12 → ajuda
          </span>
        </div>

        <h2 className="mt-2.5 font-['Inter_Tight',sans-serif] text-[clamp(20px,2.6vw,30px)] font-black uppercase leading-none tracking-tight text-white">
          {etapa.titulo}
        </h2>
        <p className="mt-1 text-[12px] text-white/45">{etapa.missao}</p>

        <div className="mt-3 rounded-xl border border-dashed border-white/8 bg-black/25 p-3">
          <Desafio payload={payload} troll={ajudaTroll} aoPedirAjuda={pedirAjuda} setTabelaMorseAberta={abrirMorse} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            aoSubmeter()
          }}
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="PALAVRA-SUFIXO"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-full border border-white/10 bg-black/50 px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] text-white outline-none transition placeholder:text-white/20 focus:border-[#ff2d55]/60 focus:ring-2 focus:ring-[#ff2d55]/15 sm:max-w-[280px]"
          />
          <button
            type="submit"
            disabled={carregando}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff2d55] px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#ff4a6b] active:scale-[.98] disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {carregando ? 'a validar…' : etapa.n === 5 ? 'concluir' : 'continuar'}
          </button>
        </form>

        {erro && (
          <p className={`mt-2 text-[11px] ${troll ? 'text-amber-200' : 'text-[#ff8fa3]'}`}>
            {troll ? '☠ ' : ''}
            {erro}
          </p>
        )}

        {ajudaAberta &&
          createPortal(
            <div
              className="fixed inset-0 z-[430] grid place-items-center bg-black/95 p-4"
              onClick={() => setAjudaAberta(false)}
              role="dialog"
              aria-label="Pistas"
            >
              <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a0507] p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#ff8fa3]">pistas</p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-white/65">
                  {(DICAS[payload?.tipo] || ['Segue o rasto.']).map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="text-[#ff2d55]">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setAjudaAberta(false)}
                  className="mt-4 rounded-full border border-white/12 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60"
                >
                  fechar
                </button>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </motion.div>
  )
}

function Resultado({ posicao, moedas, voltar }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-center sm:p-10"
      style={{ boxShadow: '0 40px 120px -50px rgba(255,45,85,.5)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-56 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,45,85,.45), transparent 70%)' }} />
      <div className="relative">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Trophy className="h-6 w-6 text-amber-300" />
        </span>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.32em] text-white/35">protocolo orion</p>
        <h2 className="mt-1 font-['Inter_Tight',sans-serif] text-[clamp(24px,4vw,40px)] font-black uppercase leading-none tracking-tight text-white">
          Sinal concluído
        </h2>

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/8 bg-black/30 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">posição</p>
            <p className="mt-1 text-3xl font-black text-white">
              {posicao || '—'}
              <span className="text-base text-white/30">.º</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/30 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">moedas</p>
            <p className="mt-1 text-3xl font-black" style={{ color: VERMELHO }}>
              +{moedas || 0}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={voltar}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-[12px] font-bold text-white/80 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
        </button>
      </div>
    </motion.div>
  )
}

const ehTelemovel = () => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(max-width: 1023px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

export default function Enigma2Page() {
  const navigate = useNavigate()
  const [movel, setMovel] = useState(ehTelemovel)
  const [estado, setEstado] = useState(() => {
    const c = lerCache()
    return c ? { iniciado: true, concluido: false, etapa: c.etapa, payload: c.payload } : null
  })
  const [payload, setPayload] = useState(() => (lerCache() || {}).payload || null)
  const [etapa, setEtapa] = useState(() => (lerCache() || {}).etapa || 1)
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')
  const [troll, setTroll] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [morse, setMorse] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px), (pointer: coarse)')
    const aplicar = () => setMovel(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  /* página fixa: sem scroll do body enquanto se joga */
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  const aplicar = useCallback((d) => {
    setEstado(d || null)
    if (d && !d.concluido) {
      setEtapa(d.etapa || 1)
      setPayload(d.payload || null)
      gravarCache({ etapa: d.etapa || 1, payload: d.payload || null })
    } else {
      gravarCache(null)
    }
  }, [])

  useEffect(() => {
    if (movel) return undefined
    let vivo = true
    fetch('/api/enigma2/estado', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && aplicar(d))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [aplicar, movel])

  /* consola: escrever "ajuda" (Enter) mostra pistas, sem passo-a-passo */
  useEffect(() => {
    if (!payload) return undefined
    const mostrar = () => {
      const lista = DICAS[payload.tipo] || ['Segue o rasto.']
      /* eslint-disable no-console */
      console.log('%cORION', 'color:#ff2d55;font-weight:900;letter-spacing:3px', '· pistas')
      for (const d of lista) {
        console.log('%c• %c' + d, 'color:#ff2d55;font-weight:900', 'color:#e9e9ec;font-size:12px')
      }
      console.log(
        '%c• %c' + 'a resposta é sempre PALAVRA-SUFIXO',
        'color:#ff2d55;font-weight:900',
        'color:#ff8fa3;font-size:12px',
      )
      /* eslint-enable no-console */
      return 'pistas enviadas ↑'
    }

    Object.defineProperty(window, 'ajuda', { configurable: true, get: mostrar })
    return () => {
      try {
        delete window.ajuda
      } catch {
        window.ajuda = undefined
      }
    }
  }, [payload])

  const iniciar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const r = await fetch('/api/enigma2/iniciar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: '{}',
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não consegui iniciar.')
      aplicar(d)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  const responder = async () => {
    if (!valor.trim() || carregando) return
    setCarregando(true)
    setErro('')
    setTroll(false)
    try {
      const r = await fetch('/api/enigma2/responder', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ palavra: valor.trim() }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'O sinal falhou.')
      if (d.erro) {
        setErro(d.erro)
        setTroll(Boolean(d.troll))
        return
      }
      setValor('')
      if (d.concluido) {
        gravarCache(null)
        setEstado({ iniciado: true, concluido: true, posicao: d.posicao, moedas: d.moedas, etapa: 6 })
        return
      }
      setEtapa(d.etapa)
      setPayload(d.payload)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  const concluido = Boolean(estado && estado.concluido)
  const iniciado = Boolean(estado && estado.iniciado)

  if (movel) {
    return (
      <div
        className="relative grid place-items-center overflow-hidden px-5 text-white"
        style={{
          height: 'calc(100dvh - var(--nv-header, 72px) - 22px)',
          marginBottom: '-32px',
          background: '#070406',
        }}
      >
        <Starfield />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 500px at 50% -10%, rgba(255,45,85,.18), transparent 60%)',
          }}
        />
        <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[#ff2d55]/30 bg-[#ff2d55]/10">
            <Monitor className="h-5 w-5 text-[#ff8fa3]" />
          </span>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">
            protocolo orion
          </p>
          <h2 className="mt-1.5 font-['Inter_Tight',sans-serif] text-2xl font-black uppercase leading-none tracking-tight">
            Só no computador
          </h2>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">
            O Enigma 2 precisa de teclado, da consola (F12) e de imagens grandes. Abre o{' '}
            <b className="text-white/75">locaus.fun</b> num PC para jogar.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/enigmas')}
              className="rounded-full bg-[#ff2d55] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#ff4a6b]"
            >
              voltar aos enigmas
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full border border-white/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/55"
            >
              página inicial
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        height: 'calc(100dvh - var(--nv-header, 72px) - 22px)',
        marginBottom: '-32px',
        background: '#070406',
      }}
    >
      <Starfield />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 560px at 12% -12%, rgba(255,45,85,.16), transparent 60%), radial-gradient(900px 520px at 100% 110%, rgba(120,10,30,.22), transparent 60%)',
        }}
      />

      <div className="relative mx-auto flex h-full w-full max-w-3xl flex-col px-4 py-2.5 sm:px-5 sm:py-3">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/enigmas"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55 transition hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> enigmas
          </Link>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
            <span>protocolo orion</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span style={{ color: VERMELHO }}>{concluido ? 'concluído' : iniciado ? 'em curso' : 'à espera'}</span>
          </div>
        </header>

        <div className="mt-3">
          <Constelacao etapa={concluido ? 6 : etapa} />
        </div>

        <main className="mt-3 flex min-h-0 flex-1 items-start justify-center">
          <div className="w-full">
            <AnimatePresence mode="wait">
              {concluido ? (
                <Resultado key="fim" posicao={estado.posicao} moedas={estado.moedas} voltar={() => navigate('/enigmas')} />
              ) : !iniciado ? (
                <motion.div
                  key="inicio"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] p-7 text-center sm:p-10"
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-white/35">enigma 2</p>
                  <h2 className="mt-2 font-['Inter_Tight',sans-serif] text-[clamp(26px,4vw,42px)] font-black uppercase leading-none tracking-tight">
                    Protocolo Orion
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-white/45">
                    Cinco etapas, duas pistas em cada uma. No fim escreves sempre{' '}
                    <b className="text-white/70">PALAVRA-SUFIXO</b>. As chaves são únicas por jogador.
                  </p>
                  <button
                    type="button"
                    onClick={iniciar}
                    disabled={carregando}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff2d55] px-6 py-2.5 text-[12px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#ff4a6b] active:scale-[.98] disabled:opacity-60"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> {carregando ? 'a abrir…' : 'Iniciar protocolo'}
                  </button>
                  {erro && <p className="mt-2 text-[11px] text-[#ff8fa3]">{erro}</p>}
                </motion.div>
              ) : (
                <PainelEtapa
                  key={etapa}
                  etapa={ETAPAS[etapa - 1]}
                  payload={payload}
                  valor={valor}
                  setValor={setValor}
                  aoSubmeter={responder}
                  erro={erro}
                  troll={troll}
                  carregando={carregando}
                  abrirMorse={() => setMorse(true)}
                />
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="mt-2 flex items-center justify-between gap-3 border-t border-white/5 pt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
          <span>locaus · enigma 2</span>
          <span>etapa {concluido ? 6 : etapa} de 6</span>
        </footer>
      </div>

      {morse &&
        createPortal(
          <div
            className="fixed inset-0 z-[430] grid place-items-center bg-black/95 p-4"
            onClick={() => setMorse(false)}
            role="dialog"
            aria-label="Tabela Morse"
          >
            <div className="max-w-2xl rounded-xl border border-white/10 bg-[#0a0507] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#ff8fa3]">tabela morse</p>
              <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-white/60">{MORSE_TABELA}</p>
              <button
                type="button"
                onClick={() => setMorse(false)}
                className="mt-4 rounded-full border border-white/12 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60"
              >
                fechar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
