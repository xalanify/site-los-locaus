import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Music2, Pause, Play } from 'lucide-react'
import { tocarYoutube, pararYoutube } from '../lib/youtubeAudio'

/* ============================================================
   CARTAS COM MÚSICA — Supra / Underground / Niko
   · Desktop: trecho toca no hover, legenda por baixo
   · Telemóvel: botão play/pause por baixo da carta
   · Marca de água do membro só num halo à volta do rato
   ============================================================ */

export const CARTAS_NOVAS = new Set(['supra', 'nfs', 'niko'])

export const MUSICAS_CARTAS = {
  supra: {
    imagem: '/cartas/supra.jpg',
    musica: '/cartas/musica-supra.mp3',
    cancao: 'GTA V — Main Theme',
    titulo: 'SUPRA',
    kicker: '2 FAST · 2 FURIOUS',
    rodape: 'TOKYO DRIFT',
  },
  nfs: {
    imagem: '/cartas/nfs.jpg',
    musica: '/cartas/musica-nfs.mp3',
    cancao: 'GTA IV — Theme',
    titulo: 'UNDERGROUND',
    kicker: 'NEED FOR SPEED',
    rodape: 'STREET RACING',
  },
  niko: {
    imagem: '/cartas/Niko.jpg',
    musica: '/cartas/musica-niko.mp3',
    cancao: 'Soviet Connection',
    titulo: 'NIKO',
    kicker: 'AFTER HOURS',
    rodape: 'AFTER HOURS',
  },
}

let audioAtual = null
let cacheMusicas = null
let pedidoMusicas = null

export async function carregarMusicas(forcar = false) {
  if (forcar) {
    cacheMusicas = null
    pedidoMusicas = null
  }
  if (cacheMusicas) return cacheMusicas
  if (!pedidoMusicas) {
    pedidoMusicas = fetch('/api/cartas', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && d.itens) || {})
      .catch(() => ({}))
  }
  cacheMusicas = await pedidoMusicas
  return cacheMusicas
}

const urlDe = (u, fallback) => {
  const m = /^yt:([A-Za-z0-9_-]{11})$/.exec(String(u || ''))
  if (m) return `/api/musica/stream/${m[1]}`
  return u || fallback || ''
}

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

export default function CartaMusical({ variant = 'supra', perfil = {}, username = 'Membro', id = '—', semPlayFixo = false }) {
  const cfg = MUSICAS_CARTAS[variant] || MUSICAS_CARTAS.supra
  const accent = { supra: '#ff6a00', nfs: '#a855f7', niko: '#e5e7eb' }[variant] || '#ffffff'
  const [semImg, setSemImg] = useState(false)
  const [localForcado, setLocalForcado] = useState(false)

  useEffect(() => {
    setLocalForcado(false)
  }, [variant])
  const [movel, setMovel] = useState(false)
  const audioRef = useRef(null)
  const raizRef = useRef(null)
  const [aTocar, setATocar] = useState(false)
  const aTocarRef = useRef(false)

  useEffect(() => {
    aTocarRef.current = aTocar
  }, [aTocar])

  /* sair da pré-visualização/página: corta o som */
  useEffect(
    () => () => {
      if (!aTocarRef.current) return
      pararYoutube()
      const a = audioRef.current
      if (a) a.pause()
      if (a && audioAtual === a) audioAtual = null
    },
    [],
  )
  const [legenda, setLegenda] = useState(null)
  const [botao, setBotao] = useState(null)
  const [meta, setMeta] = useState(() => ({
    url: cfg.musica,
    titulo: cfg.cancao,
    inicio: 0,
    fim: 14,
  }))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const aplicar = () => setMovel(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  const aplicaMeta = (itens) => {
    const m = itens[variant]
    if (!m) {
      setMeta({ url: cfg.musica, titulo: cfg.cancao, inicio: 0, fim: 14 })
      return
    }
    setMeta({
      url: m.url || cfg.musica || '',
      titulo: m.titulo || cfg.cancao,
      inicio: Number.isFinite(Number(m.inicio)) ? Number(m.inicio) : 0,
      fim: Number(m.fim) > 0 ? Number(m.fim) : 14,
    })
  }

  useEffect(() => {
    let vivo = true
    carregarMusicas().then((itens) => vivo && aplicaMeta(itens))
    const aoMudar = () => carregarMusicas(true).then((itens) => vivo && aplicaMeta(itens))
    window.addEventListener('locaus:cartas-musica', aoMudar)
    return () => {
      vivo = false
      window.removeEventListener('locaus:cartas-musica', aoMudar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  const ytId = (/^yt:([A-Za-z0-9_-]{11})$/.exec(String(meta.url || '')) || [])[1] || null
  const usaYt = Boolean(ytId) && !localForcado
  const srcFinal = usaYt ? '' : localForcado ? cfg.musica : urlDe(meta.url, cfg.musica)
  const inicioEf = localForcado ? 0 : meta.inicio
  const fimEf = localForcado ? 9999 : meta.fim
  const temMusica = (usaYt || Boolean(srcFinal)) && meta.titulo !== 'Sem música'

  useEffect(() => {
    if (usaYt || !srcFinal) {
      audioRef.current = null
      return undefined
    }
    const a = new Audio(srcFinal)
    a.preload = 'none'
    a.volume = 0.12
    audioRef.current = a

    const manterTrecho = () => {
      if (a.currentTime >= fimEf) a.currentTime = inicioEf
      if (a.currentTime < inicioEf - 0.4) a.currentTime = inicioEf
    }
    /* se o stream do YouTube falhar (ex.: Railway sem yt-dlp), usa o MP3 local */
    const aoFalhar = () => {
      if (!localForcado && cfg.musica) setLocalForcado(true)
    }
    a.addEventListener('timeupdate', manterTrecho)
    a.addEventListener('error', aoFalhar)
    return () => {
      a.removeEventListener('timeupdate', manterTrecho)
      a.removeEventListener('error', aoFalhar)
      a.pause()
      if (audioAtual === a) audioAtual = null
    }
  }, [usaYt, srcFinal, inicioEf, fimEf, localForcado, cfg.musica])

  /* posição da legenda/botão por baixo da carta */
  const atualizarPosicoes = () => {
    const el = raizRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = clamp(r.left + r.width / 2, 120, window.innerWidth - 120)
    const y = Math.min(window.innerHeight - 46, r.bottom + 8)
    if (movel) {
      if (r.width >= 160 && temMusica) {
        setBotao((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }))
      } else {
        setBotao((prev) => (prev === null ? prev : null))
      }
    } else if (legenda) {
      setLegenda((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }))
    }
  }

  useEffect(() => {
    atualizarPosicoes()
    const aoMudar = () => atualizarPosicoes()
    window.addEventListener('scroll', aoMudar, true)
    window.addEventListener('resize', aoMudar)
    return () => {
      window.removeEventListener('scroll', aoMudar, true)
      window.removeEventListener('resize', aoMudar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movel, temMusica, legenda])

  const aoMover = (e) => {
    const el = raizRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
  }

  const tocar = () => {
    if (usaYt) {
      tocarYoutube(ytId, { inicio: meta.inicio, fim: meta.fim, volume: 0.12 }).then((ok) => {
        if (!ok) return
        setATocar(true)
        atualizarPosicoes()
      })
      return
    }
    const a = audioRef.current
    if (!a) return
    if (audioAtual && audioAtual !== a) {
      audioAtual.pause()
      audioAtual.currentTime = 0
    }
    audioAtual = a
    try {
      a.currentTime = inicioEf
    } catch {
      /* sem metadata */
    }
    a.play()
      .then(() => {
        setATocar(true)
        atualizarPosicoes()
      })
      .catch(() => {})
  }

  const parar = () => {
    if (usaYt) {
      pararYoutube()
      setATocar(false)
      setLegenda(null)
      return
    }
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = inicioEf
    }
    setATocar(false)
    setLegenda(null)
  }

  const aoEntrar = () => {
    if (movel) return
    if (temMusica) {
      tocar()
      const el = raizRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        setLegenda({
          x: clamp(r.left + r.width / 2, 120, window.innerWidth - 120),
          y: Math.min(window.innerHeight - 46, r.bottom + 8),
        })
      }
    }
  }

  const aoSair = () => {
    if (!movel) parar()
  }

  const ano = perfil?.created_at ? new Date(perfil.created_at).getFullYear() : '2026'

  return (
    <div
      ref={raizRef}
      className={`cm cm--${variant} ${aTocar ? 'cm--a-tocar' : ''}`}
      style={{ '--cm-accent': accent }}
      onPointerEnter={aoEntrar}
      onPointerMove={aoMover}
      onPointerLeave={aoSair}
      onClick={() => {
        if (!movel && usaYt) tocar()
      }}
    >
      {!semImg && (
        <img
          className="cm-img"
          src={cfg.imagem}
          alt=""
          draggable={false}
          onError={() => setSemImg(true)}
        />
      )}
      <span className="cm-veu" aria-hidden="true" />

      <span className="cm-watermark" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, r) => (
          <span key={r} className="cm-watermark-row">
            {Array.from({ length: 8 }).map((_, c) => (
              <span key={c}>{username}</span>
            ))}
          </span>
        ))}
      </span>

      <span className="cm-kicker">{cfg.kicker}</span>

      <span className="cm-info">
        <span className="cm-nome">{username}</span>
        <span className="cm-sub">
          @{username} · Membro #{id}
        </span>
        <span className="cm-rodape">
          {cfg.rodape} · {ano}
        </span>
      </span>

      <span className="cm-som" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} />
        ))}
      </span>

      {!movel && aTocar && legenda && temMusica &&
        createPortal(
          <span className="cm-legenda" style={{ left: legenda.x, top: legenda.y }} role="status">
            <Music2 className="h-3 w-3" /> {meta.titulo}
          </span>,
          document.body,
        )}

      {movel && semPlayFixo && temMusica && (
        <button
          type="button"
          className="cm-play-inline"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (aTocar) parar()
            else tocar()
          }}
        >
          {aTocar ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {aTocar ? 'parar' : 'ouvir'}
        </button>
      )}

      {movel && !semPlayFixo && botao && temMusica &&
        createPortal(
          <button
            type="button"
            className="cm-play"
            style={{ left: botao.x, top: botao.y }}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (aTocar) parar()
              else tocar()
            }}
          >
            {aTocar ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {meta.titulo}
          </button>,
          document.body,
        )}
    </div>
  )
}
