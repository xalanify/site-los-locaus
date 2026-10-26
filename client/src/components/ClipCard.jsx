import { useState, useEffect, useRef } from 'react'
import {
  Heart,
  MessageCircle,
  Bookmark,
  Download,
  Eye,
  Trash2,
  Send,
  Lock,
  X,
  Gamepad2,
  Pencil,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
} from 'lucide-react'
import AvatarImg from './AvatarImg'
import Estado from './Estado'
import { authHeaders, mmss } from '../lib/auth'
import { CLIP_GAMES, gameLabel } from '../data/clipGames'
import { confirmar, toast } from './Feedback'
import { videoComecou, videoParou } from '../lib/musicaPerfil'

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso.includes('T') || iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fmtComment = fmtDate

/* Página de comentários (quantos comentários de topo por vez) */
const PAGE_COMENT = 12

/* ---------------------------------------------------------------
   Player próprio.

   O vídeo vive fora do site, mas a cara é toda nossa:
   - a capa é UM FRAME DO PRÓPRIO VÍDEO (tirado no browser antes de
     subir) — nunca a capa da plataforma;
   - enquanto o vídeo ainda está a processar, mostramos o AVISO
     NOSSO ("a processar") e o leitor remoto só carrega quando está
     pronto — por isso nunca aparece o ecrã de processamento deles;
   - depois de tocar, os controlos são todos nossos (play/pause,
     barra, tempo, VOLUME, som e ecrã inteiro) e a qualidade fica
     forçada ao máximo (1080p60 quando o vídeo tem).
   --------------------------------------------------------------- */
  let apiPronta = null
function carregarApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (apiPronta) return apiPronta
  apiPronta = new Promise((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof anterior === 'function') anterior()
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => reject(new Error('sem api'))
    document.head.appendChild(s)
    // se em 12 s não der nada, quem chama cai no modo simples
    setTimeout(() => {
      if (window.YT && window.YT.Player) resolve(window.YT)
      else reject(new Error('api lenta'))
    }, 12000)
  })
  return apiPronta
}

/* --------- qualidade guardada (por máquina) — o clip arranca logo
   na qualidade escolhida da última vez (vq no player desde o início).
   Por defeito: MÁXIMA disponível (nunca “auto” a 360p). */
const ORDEM_QUAL = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny']
const melhorQualidade = (niveis) => {
  const lista = Array.isArray(niveis) ? niveis.filter((q) => q && q !== 'auto') : []
  return ORDEM_QUAL.find((q) => lista.includes(q)) || lista[0] || 'highres'
}
const NOME_QUAL = {
  highres: '2160p+',
  hd2160: '2160p',
  hd1440: '1440p',
  hd1080: '1080p',
  hd720: '720p',
  large: '480p',
  medium: '480p',
  small: '360p',
  tiny: '240p',
}

const qualGravada = () => {
  try {
    const q = localStorage.getItem('aj-clip-qual')
    return !q || q === 'auto' ? 'max' : q
  } catch {
    return 'max'
  }
}
const gravarQual = (q) => {
  try {
    localStorage.setItem('aj-clip-qual', q || 'auto')
  } catch {}
}

function VideoRemoto({ id, titulo, capa, aoDarPlay }) {  const [aberto, setAberto] = useState(false)
  const [erroCapa, setErroCapa] = useState(false)
  const [semApi, setSemApi] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [volume, setVolume] = useState(25)
  const [tempo, setTempo] = useState(0)
  const [vqPedida, setVqPedida] = useState(qualGravada)
  const tempoRef = useRef(0)
  const [dur, setDur] = useState(0)
  const [cheio, setCheio] = useState(false)
  /* qualidade manual do vídeo */
  const [menuQual, setMenuQual] = useState(false)
  const [niveisQual, setNiveisQual] = useState([]) // chaves YT disponíveis
  const qualEsc = useRef(qualGravada())
  const [qualAtual, setQualAtual] = useState('auto')
  /* qualidade FORÇADA: enquanto o leitor não reportar a qualidade
     escolhida, o vídeo fica tapado com o aviso nosso */
  const [qualAlvo, setQualAlvo] = useState(qualGravada)
  const [veuQual, setVeuQual] = useState(null)
  const qualAlvoRef = useRef(qualGravada())
  const watchdogQual = useRef(null)
  const tentativasQual = useRef(0)
  /* estado do processamento: null = a perguntar, true = pronto,
     false = ainda a processar (mostra o aviso nosso) */
  const [processando, setProcessando] = useState(null)
  /* estado do leitor: -1 arranque, 0 fim, 1 a tocar, 2 pausa,
     3 a carregar, 5 pronto para tocar */
  const [estado, setEstado] = useState(-1)
  const musicaPausada = useRef(false)
  /* véu NOSSO: 'inicio' cobre o título/logótipo deles no arranque,
     'fim' substitui o ecrã de fim deles (com o NOSSO botão) */
  const [veu, setVeu] = useState('nada')
  const [veuSai, setVeuSai] = useState(false)
  const moldura = useRef(null)
  const caixa = useRef(null)
  const api = useRef(null)
  const qualidadeFeita = useRef(false)
  const veuTempo = useRef([])

  const chamou = (fn, args) => {
    const p = api.current
    try {
      if (p && typeof p[fn] === 'function') p[fn].apply(p, args || [])
    } catch {
      /* player ainda não pronto */
    }
  }

  /* só depois de abrir é que perguntamos ao servidor se o vídeo
     está pronto — assim o leitor remoto nunca aparece a meio */
  useEffect(() => {
    if (!aberto) return
    let vivo = true
    setProcessando(null)
    fetch(`/api/clips/pub/pronto/${encodeURIComponent(id)}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { pronto: true }))
      .then((d) => vivo && setProcessando(!!(d && d.pronto)))
      .catch(() => vivo && setProcessando(true))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, id])

  /* criar / limpar o leitor quando alguém dá play */
  useEffect(() => {
    if (!aberto || semApi || processando !== true) return
    let vivo = true
    carregarApi()
      .then((YT) => {
        if (!vivo || !caixa.current || !YT || !YT.Player) return
        try {
          api.current = new YT.Player(caixa.current, {
            videoId: id,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              autoplay: 0,
              controls: 0, // sem barra deles
              modestbranding: 1, // sem logotipo
              rel: 0,
              showinfo: 0,
              iv_load_policy: 3,
              playsinline: 1,
              fs: 0, // sem botão deles de ecrã inteiro
              disablekb: 1,
              enablejsapi: 1,
              origin: window.location.origin,
              ...(vqPedida !== 'auto' ? { vq: vqPedida } : {}),
              start: Math.floor(tempoRef.current),

            },
            events: {
              onReady: (e) => {
                if (!vivo) return
                setPronto(true)
                setTocando(true)
                qualidadeFeita.current = false
                try {
                  e.target.setVolume(volume)
                  e.target.unMute && e.target.unMute()
                  setDur(e.target.getDuration() || 0)
                } catch {}
                const ifr = e.target.getIframe && e.target.getIframe()
                if (ifr) ifr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0'
                /* qualidade máxima disponível: escolhe o melhor nível real
                   (4K/2K/1080p) e só deixa tocar quando lá chegar */
                let niveis = []
                try {
                  niveis = e.target.getAvailableQualityLevels
                    ? e.target.getAvailableQualityLevels()
                    : []
                } catch {}
                setNiveisQual(niveis)
                let alvo = qualEsc.current
                if (!alvo || alvo === 'auto' || alvo === 'max') {
                  alvo = melhorQualidade(niveis)
                  qualEsc.current = alvo
                  gravarQual(alvo)
                }
                qualAlvoRef.current = alvo
                setQualAlvo(alvo)
                setVqPedida(alvo)
                setVeuQual(NOME_QUAL[alvo] || alvo)
                try {
                  e.target.pauseVideo && e.target.pauseVideo()
                } catch {}
                forcerQualidade(e.target)
                arrancaWatchdog()
              },
              onStateChange: (e) => {
                if (!vivo) return
                setEstado(e.data)
                setTocando(e.data === 1)
                try {
                  const d = e.target.getDuration()
                  if (d) setDur(d)
                } catch {}
                if (e.data === 1) {
                  if (!musicaPausada.current) {
                    musicaPausada.current = true
                    videoComecou()
                  }
                  forcerQualidade(e.target)
                  // o vídeo começou a tocar: levanta qualquer véu anterior
                  setVeu('nada')
                  setVeuSai(false)
                  clearTimeout(veuTempo.current[0])
                }
                if (e.data === 0 || e.data === 2) {
                  if (musicaPausada.current) {
                    musicaPausada.current = false
                    videoParou()
                  }
                }
                if (e.data === 0) {
                  // fim do vídeo: entra o ecrã nosso (o deles não aparece)
                  clearTimeout(veuTempo.current[0])
                  setVeuSai(false)
                  setVeu('fim')
                }
              },
              onPlaybackQualityChange: (e) => {
                if (!vivo) return
                const q = e.data
                if (q && q !== 'unknown') setQualAtual(q)
                // chegou à qualidade FORÇADA: solta o véu e toca
                const alvo = qualAlvoRef.current
                const chegou =
                  q &&
                  (q === alvo ||
                    (q === 'highres' && alvo === 'hd2160') ||
                    (q === 'hd2160' && alvo === 'highres'))
                if (chegou) {
                  limpaWatchdog()
                  tentativasQual.current = 0
                  setVeuQual(null)
                  try {
                    typeof e.target.playVideo === 'function' && e.target.playVideo()
                  } catch {}
                }
              },
            },
          })
        } catch {
          setSemApi(true)
        }
      })
      .catch(() => {
        if (vivo) setSemApi(true)
      })

    const t = setInterval(() => {
      try {
        const p = api.current
        if (p && typeof p.getCurrentTime === 'function') {
          setTempo(p.getCurrentTime() || 0)
          tempoRef.current = p.getCurrentTime() || 0
          const d = p.getDuration && p.getDuration()
          if (d) setDur(d)
        }
        /* níveis de qualidade disponíveis + atual do leitor */
        if (p && typeof p.getAvailableQualityLevels === 'function') {
          const nv = p.getAvailableQualityLevels()
          if (Array.isArray(nv) && nv.length) setNiveisQual(nv)
          const q = typeof p.getPlaybackQuality === 'function' ? p.getPlaybackQuality() : ''
          if (q && q !== 'unknown') setQualAtual(q)
        }
      } catch {}
    }, 400)

    return () => {
      vivo = false
      clearInterval(t)
      limpaWatchdog()
      clearTimeout(veuTempo.current[0])
      try {
        api.current && typeof api.current.destroy === 'function' && api.current.destroy()
      } catch {}
      api.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, semApi, id, processando, vqPedida])

  /* qualidade o mais alta possível: pede "highres" e, se o leitor
     baixar, volta a pedir (só 2 tentativas para não loop).
     MAS se o utilizador escolheu uma qualidade específica, é ESSA
     que se pede — nunca por cima da escolha dele. */
  const forcerQualidade = (alvo) => {
    if (!alvo) return
    let q = qualAlvoRef.current
    if (!q || q === 'auto' || q === 'max') {
      let niveis = []
      try {
        niveis = alvo.getAvailableQualityLevels ? alvo.getAvailableQualityLevels() : []
      } catch {}
      q = melhorQualidade(niveis)
      qualAlvoRef.current = q
      setQualAlvo(q)
      setVqPedida(q)
    }
    qualidadeFeita.current = true
    try {
      if (typeof alvo.setPlaybackQualityRange === 'function') alvo.setPlaybackQualityRange(q, q)
      if (typeof alvo.setPlaybackQuality === 'function') alvo.setPlaybackQuality(q)
    } catch {}
  }

  /* ===== QUALIDADE FORÇADA =====
     O setPlaybackQuality do YouTube hoje em dia é ignorado: pedimos,
     o leitor acena "sim" e continua em 360p. Aqui fixamos a qualidade
     alvo, PAUSAMOS o vídeo e repetimos o pedido a cada 500 ms; se o
     leitor continuar a ignorar, RECARREGA com loadVideoById já na
     qualidade pedida (suggestedQuality). O véu só sai quando
     getPlaybackQuality() reportar a qualidade escolhida. */
  const [tentouRecarregar, setTentouRecarregar] = useState(0)

  const watchdogHard = useRef(null)
  const limpaWatchdog = () => {
    if (watchdogQual.current) {
      clearInterval(watchdogQual.current)
      watchdogQual.current = null
    }
    if (watchdogHard.current) {
      clearTimeout(watchdogHard.current)
      watchdogHard.current = null
    }
  }

  const qualidadeAgora = () => {
    const p = api.current
    try {
      if (!p || typeof p.getPlaybackQuality !== 'function') return ''
      return p.getPlaybackQuality() || ''
    } catch {
      return ''
    }
  }

  const arrancaWatchdog = () => {
    limpaWatchdog()
    tentativasQual.current = 0
    watchdogQual.current = setInterval(() => {
      const p = api.current
      const alvo = qualAlvoRef.current
      if (!p || alvo === 'auto') return limpaWatchdog()
      const q = qualidadeAgora()
      const chegou =
        (q && q === alvo) ||
        (q === 'highres' && alvo === 'hd2160') ||
        (q === 'hd2160' && alvo === 'highres')
      if (chegou) {
        limpaWatchdog()
        tentativasQual.current = 0
        setVeuQual(null)
        try {
          typeof p.playVideo === 'function' && p.playVideo()
        } catch {}
        return
      }
      tentativasQual.current += 1
      try {
        if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange(alvo, alvo)
        if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality(alvo)
      } catch {}
      if (tentativasQual.current === 12) {
        setTentouRecarregar((x) => x + 1)
      }
      if (tentativasQual.current >= 24) {
        limpaWatchdog()
        tentativasQual.current = 0
        setVeuQual(null)
        setQualAtual(q || alvo)
        try {
          typeof p.playVideo === 'function' && p.playVideo()
        } catch {}
      }
    }, 500)
    // rede de segurança absoluta: jamais deixar o véu preso
    watchdogHard.current = setTimeout(() => {
      limpaWatchdog()
      tentativasQual.current = 0
      setVeuQual(null)
      try {
        const p = api.current
        if (p && typeof p.playVideo === 'function') p.playVideo()
      } catch {}
    }, 20000)
  }

  /* recarregar o vídeo já na qualidade pedida (suggestedQuality é o
     argumento que o leitor ainda respeita ao carregar) */
  useEffect(() => {
    if (!tentouRecarregar) return
    const p = api.current
    const alvo = qualAlvoRef.current
    if (!p || alvo === 'auto') return
    tentativasQual.current = 0
    try {
      const t = typeof p.getCurrentTime === 'function' ? p.getCurrentTime() || 0 : 0
      p.loadVideoById({ videoId: id, startSeconds: Math.max(0, t), suggestedQuality: alvo })
    } catch {}
    // após 6 s do recarrego: o que vier é o que o vídeo tem —
    // solta SEMPRE (nunca deixa o véu preso)
    const desiste = setTimeout(() => {
      limpaWatchdog()
      const q = qualidadeAgora()
      setVeuQual(null)
      setQualAtual(q || alvo)
      if (q && q !== alvo) {
        // o vídeo não tem o alvo: volta ao modo auto e segue
        setQualAlvo('auto')
        qualAlvoRef.current = 'auto'
        qualEsc.current = 'auto'
      }
      try {
        const pp = api.current
        typeof pp.playVideo === 'function' && pp.playVideo()
      } catch {}
    }, 6000)
    return () => clearTimeout(desiste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentouRecarregar, id])

  /* --------- QUALIDADE MANUAL (botão da engrenagem) ---------
     Chaves do leitor YouTube → etiquetas:
     highres/hd2160 → 2160p; hd1440 → 1440p; hd1080 → 1080p;
     hd720 → 720p; large → 480p; medium → 480p... etc.
  */
  const ETIQUETA_QUAL = {
    auto: 'Auto',
    max: 'Máxima',
    highres: '2160p+',
    hd2160: '2160p',
    hd1440: '1440p',
    hd1080: '1080p',
    hd720: '720p',
    large: '480p',
    medium: '480p',
    small: '360p',
    tiny: '240p',
  }
  const RANK_QUAL = {
    hd2160: 10,
    highres: 10,
    hd1440: 9,
    hd1080: 8,
    hd720: 7,
    large: 6,
    medium: 5,
    small: 4,
    tiny: 3,
  }

  /* guardado na máquina: da próxima vez o clip arranca logo na
     qualidade escolhida (parâmetro vq no player desde o início) */

  /* escolha a partir do menu: 'max' resolve para o melhor nível real */
  const escolherQualidade = (q) => {
    let real = q
    if (q === 'max') {
      const itens = niveisQual.filter((n) => n !== 'auto')
      real = itens.length
        ? itens.slice().sort((a, b) => (RANK_QUAL[b] || 0) - (RANK_QUAL[a] || 0))[0]
        : 'highres'
    }
    definirQualidade(real)
  }

  const definirQualidade = (q) => {
    if (q === 'auto') {
      q = melhorQualidade(niveisQual)
    }
    qualEsc.current = q
    setMenuQual(false)
    const p = api.current
    if (!p) return
    if (q === 'auto') {
      gravarQual('auto')
      limpaWatchdog()
      tentativasQual.current = 0
      setVeuQual(null)
      setQualAlvo('auto')
      qualAlvoRef.current = 'auto'
      qualEsc.current = 'auto'
      forcerQualidade(p)
      qualidadeFeita.current = false
      forcerQualidade(p)
      setVqPedida('auto')
      return
    }
    /* se já sabemos os níveis do vídeo e o escolhido não existe,
       avisa logo — nada de véu preso */
    const itens = niveisQual.filter((n) => n !== 'auto')
    if (itens.length && !itens.includes(q)) {
      setQualAlvo('auto')
      qualAlvoRef.current = 'auto'
      qualEsc.current = 'auto'
      setVeuQual(`Este vídeo não tem ${ETIQUETA_QUAL[q] || q} — fica no melhor (auto).`)
      setTimeout(() => setVeuQual((v) => (v && v.startsWith('Este') ? null : v)), 3000)
      try {
        typeof p.playVideo === 'function' && p.playVideo()
      } catch {}
      return
    }
    qualAlvoRef.current = q
    setQualAlvo(q)
    gravarQual(q)
    try {
      if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange(q, q)
      if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality(q)
    } catch {}
    // pede a qualidade ao leitor e recarrega com a sugestão (o YouTube
    // é quem decide a final — não bloqueia o vídeo)
    try {
      if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange(q, q)
      if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality(q)
    } catch {}
    setVqPedida(q)
    // recarrega já na qualidade pedida (suggestedQuality)
    try {
      const t = typeof p.getCurrentTime === 'function' ? p.getCurrentTime() || 0 : 0
      if (typeof p.loadVideoById === 'function') {
        p.loadVideoById({ videoId: id, startSeconds: Math.max(0, t), suggestedQuality: q })
      }
    } catch {}
    try {
      typeof p.playVideo === 'function' && p.playVideo()
    } catch {}
  }

  /* ecrã inteiro (nosso botão, não o deles) */
  useEffect(() => {
    const f = () => setCheio(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', f)
    document.addEventListener('webkitfullscreenchange', f)
    return () => {
      document.removeEventListener('fullscreenchange', f)
      document.removeEventListener('webkitfullscreenchange', f)
    }
  }, [])

  const alternarEcrã = () => {
    const el = moldura.current
    if (!el) return
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const sai = document.exitFullscreen || document.webkitExitFullscreen
      try {
        sai && sai.call(document)
      } catch {}
      return
    }
    const entra = el.requestFullscreen || el.webkitRequestFullscreen
    try {
      entra && entra.call(el)
    } catch {}
  }

  const alternarSom = () => {
    const novo = !mudo
    setMudo(novo)
    chamou(novo ? 'mute' : 'unMute')
  }

  const alternar = () => {
    const novo = !tocando
    setTocando(novo)
    chamou(novo ? 'playVideo' : 'pauseVideo')
  }

  /* clique no vídeo: no fim, recomeça; noutro lado, pausa/continua.
     O véu de início NÃO se deixa fechar ao clique — enquanto o
     leitor remoto mostra o título/logótipo deles, tapamos sempre. */
  const aoClicar = () => {
    if (estado === 0) {
      chamou('seekTo', [0, true])
      chamou('playVideo')
      return
    }
    alternar()
  }

  /* volume propriamente dito (0 a 100) — o botão de som só muda
     o mudo; a barra ao lado é que mexe mesmo no volume */
  const mexerVolume = (v) => {
    const n = Math.max(0, Math.min(100, Math.round(v)))
    setVolume(n)
    if (n > 0 && mudo) setMudo(false)
    try {
      const p = api.current
      if (p && typeof p.setVolume === 'function') {
        p.setVolume(n)
        if (n > 0 && typeof p.unMute === 'function') p.unMute()
        if (n === 0 && typeof p.mute === 'function') p.mute()
      }
    } catch {
      /* player ainda não pronto */
    }
  }

  const procurar = (seg) => {
    setTempo(seg)
    chamou('seekTo', [seg, true])
  }

  /* Ainda a processar: mostramos o AVISO NOSSO e nunca o leitor
     remoto — assim não aparece o ecrã de processamento deles. */
  if (aberto && processando === false) {
    return (
      <div className="mt-3 flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-[#0f0b1c] px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm font-bold text-white">A processar o vídeo…</p>
        <p className="text-xs text-gray-400">
          Fica pronto dentro de uns minutos — enquanto isso dá para ver as outras coisas.
        </p>
        <button
          type="button"
          onClick={() => setProcessando(null)}
          className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-500"
        >
          Já deve estar — tentar outra vez
        </button>
      </div>
    )
  }

  if (aberto && !semApi && processando !== false) {
    const pct = dur > 0 ? Math.min(100, (tempo / dur) * 100) : 0
    return (
      <div
        ref={moldura}
        className="player-ecra group/vid relative mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black"
      >
        {/* caixa do vídeo — em ecrã inteiro fica 16:9 ao centro, com
            barras pretas NOSSAS (nada da plataforma aparece) */}
        <div ref={caixa} className="player-caixa absolute inset-0 h-full w-full" />

        {!pronto && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </span>
        )}

        {/* sem som: aviso silencioso no canto */}
        {mudo && (
          <span className="pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-gray-300">
            <VolumeX className="h-4 w-4" />
          </span>
        )}

        {/* qualidade FORÇADA: enquanto o leitor não reportar a
            qualidade escolhida, o vídeo fica tapado (não toca) */}
        {veuQual && (
          <div className="absolute inset-0 z-[7] grid place-items-center bg-black/85 px-6 text-center">
            <div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />
              <p className="mt-3 text-sm font-black text-white">
                {veuQual.startsWith('Este') ? veuQual : `A forçar ${veuQual}…`}
              </p>
              {!veuQual.startsWith('Este') && (
                <p className="mt-1 text-[11px] text-gray-400">
                  O vídeo só segue quando a qualidade chegar à que escolheste.
                </p>
              )}
            </div>
          </div>
        )}

        {/* clica no vídeo -> pausa / continua (ou repete, no fim) */}
        <button
          type="button"
          onClick={aoClicar}
          className="absolute inset-0 z-[6]"
          aria-label={estado === 0 ? 'Repetir' : tocando ? 'Pausar' : 'Reproduzir'}
        />

        {/* Máscaras permanentes: escondem título, "não listado" e logótipo
            que o leitor remoto insiste em mostrar (topo e canto inferior
            direito), sem tapar o vídeo. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-20 bg-gradient-to-b from-black/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-16 bg-gradient-to-t from-black/90 to-transparent" />
        {veu !== 'nada' && (
          <button
            type="button"
            onClick={aoClicar}
            className={
              'absolute inset-0 z-[5] flex cursor-pointer flex-col justify-between bg-gradient-to-br from-[#1b1030] via-[#120d22] to-[#0d0a18] px-5 py-4 text-left transition-opacity duration-700 ' +
              (veuSai ? 'pointer-events-none opacity-0' : 'opacity-100')
            }
            aria-label={veu === 'fim' ? 'Repetir vídeo' : 'Fechar aviso'}
          >
            {capa && (
              <img
                src={capa}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <AvatarImg name={titulo || 'clip'} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">
                  {titulo || 'Clip'}
                </span>
                <span className="block text-[11px] font-semibold text-gray-300">
                  {veu === 'fim' ? 'Fim do vídeo' : tocando ? 'A reproduzir…' : 'Em pausa'}
                </span>
              </span>
            </span>
            <span className="relative z-10 grid place-items-center self-center pb-6">
              {veu === 'fim' && (
                <>
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-violet-600 shadow-[0_8px_30px_rgba(139,92,246,0.6)]">
                    <Play className="ml-1 h-7 w-7 text-white" fill="currentColor" />
                  </span>
                  <span className="mt-2 text-xs font-black uppercase tracking-wider text-white">
                    Ver outra vez
                  </span>
                </>
              )}
            </span>
            <span className="relative z-10 text-[11px] font-bold uppercase tracking-wider text-violet-300">
              Los Locaus
            </span>
          </button>
        )}

        {/* OS NOSSOS controlos — só aparece ao passar o rato
            (ou sempre que o vídeo está pausado) */}
        <div
          className={
            'player-controlos pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 group-focus-within/vid:opacity-100 group-hover/vid:opacity-100 ' +
            (tocando ? 'opacity-0' : 'opacity-100')
          }
        >
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={alternar}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-violet-500"
              aria-label={tocando ? 'Pausar' : 'Reproduzir'}
            >
              {tocando ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
              )}
            </button>

            <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-300">
              {mmss(Math.floor(tempo))}
            </span>

            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/20" />
              <span
                className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-violet-500"
                style={{ width: pct + '%' }}
              />
              <input
                type="range"
                min={0}
                max={dur > 0 ? dur : 1}
                step={0.1}
                value={Math.min(tempo, dur > 0 ? dur : 1)}
                onChange={(e) => procurar(Number(e.target.value))}
                aria-label="Barra de progresso"
                className="relative h-1.5 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-violet-300 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-300"
              />
            </div>

            <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-500">
              {mmss(Math.floor(dur || 0))}
            </span>

            <button
              type="button"
              onClick={alternarSom}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-violet-500"
              aria-label={mudo ? 'Ligar som' : 'Desligar som'}
            >
              {mudo || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* VOLUME a sério: barra ao lado do botão de som */}
            <div className="relative hidden w-20 shrink-0 sm:block">
              <span className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/20" />
              <span
                className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-violet-400"
                style={{ width: (mudo ? 0 : volume) + '%' }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={mudo ? 0 : volume}
                onChange={(e) => mexerVolume(Number(e.target.value))}
                aria-label="Volume"
                className="relative h-1 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-violet-200 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-200"
              />
            </div>

            {/* qualidade manual */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuQual((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-violet-500"
                aria-label="Qualidade do vídeo"
                title={`Qualidade: ${ETIQUETA_QUAL[qualAtual] || qualAtual}`}
              >
                <Settings className="h-4 w-4" />
              </button>
              {menuQual && (
                <div className="absolute bottom-11 right-0 z-30 w-28 overflow-hidden rounded-xl border border-white/10 bg-[#16121f] py-1 shadow-xl">
                  {['auto', 'max', ...niveisQual.filter((n) => n !== 'auto')].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => escolherQualidade(q)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] font-bold transition-colors ${
                        qualEsc.current === q
                          ? 'bg-violet-500/25 text-violet-200'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {ETIQUETA_QUAL[q] || q}
                      {qualEsc.current === q && <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                    </button>
                  ))}
                  {!niveisQual.length && (
                    <p className="px-3 py-1.5 text-[10px] text-gray-500">A carregar níveis…</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={alternarEcrã}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-violet-500"
              aria-label={cheio ? 'Sair do ecrã inteiro' : 'Ecrã inteiro'}
            >
              {cheio ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* sem API (rede/csp): o vídeo toca com os controlos do próprio
     leitor — é a exceção, não a regra. */
  if (aberto && semApi) {
    return (
      <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
          title={titulo || 'Clip'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </div>
    )
  }

  /* Capa NOSSA: um frame do próprio vídeo, guardado no site.
     Se ainda não houver (clip antigo), mostramos um fundo nosso
     com o ícone do jogo — nunca a capa da plataforma. */
  const temCapa = !!capa && !erroCapa

  return (
    <button
      onClick={() => {
        aoDarPlay && aoDarPlay()
        setAberto(true)
      }}
      className="group relative mt-3 block w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#1b1030] to-[#0d0a18]"
      aria-label={'Reproduzir ' + (titulo || 'clip')}
    >
      {temCapa ? (
        <img
          src={capa}
          alt=""
          loading="lazy"
          onError={() => setErroCapa(true)}
          className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <span className="grid aspect-video w-full place-items-center">
          <Gamepad2 className="h-14 w-14 text-violet-500/40" />
        </span>
      )}
      <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors group-hover:bg-black/45">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-violet-600 shadow-[0_8px_30px_rgba(139,92,246,0.55)] transition-transform group-hover:scale-110">
          <Play className="ml-0.5 h-6 w-6 text-white" fill="currentColor" />
        </span>
      </span>
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-gray-200">
        HD
      </span>
    </button>
  )
}

/* Vistas já contadas nesta sessão — evita somar o mesmo clip duas
   vezes quando o utilizador dá play, pausa e volta a dar play. */
const vistos = new Set()
async function registarVista(id, setC) {
  if (!id || vistos.has(id)) return
  vistos.add(id)
  try {
    const res = await fetch(`/api/clips/${id}/view`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) {
      vistos.delete(id)
      return
    }
    const d = await res.json()
    if (d && typeof d.views === 'number') setC((prev) => ({ ...prev, views: d.views }))
  } catch {
    /* sem rede — deixa tentar outra vez */
    vistos.delete(id)
  }
}

/* Cartão de um clip: vídeo (com corte), autor, gostos,
   comentários com respostas, guardar e transferir. */
export default function ClipCard({
  clip,
  user,
  onRequestAuth,
  onProfile,
  onUpdate,
  onDelete,
  transparent = false,
}) {
  const [c, setC] = useState(clip)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadedComments, setLoadedComments] = useState(false)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [busy, setBusy] = useState(false)
  // paginação dos comentários (só os de topo são paginados)
  const [maisComent, setMaisComent] = useState(false)
  const [offsetComent, setOffsetComent] = useState(0)
  const [aCarregarMais, setACarregarMais] = useState(false)
  const videoRef = useRef(null)
  const musicaVideoLocal = useRef(false)

  // edição (só para o dono do clip)
  const [editando, setEditando] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoJogo, setNovoJogo] = useState('')
  const [novaVis, setNovaVis] = useState('public')
  const [errEdit, setErrEdit] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => setC(clip), [clip])

  const start = Number(c.start) || 0
  const end = c.end != null ? Number(c.end) : null

  const update = (next) => {
    setC(next)
    if (onUpdate) onUpdate(next)
  }

  /* ---- vídeo: reproduz só o trecho cortado ---- */
  const onMeta = () => {
    const v = videoRef.current
    if (v && start > 0) v.currentTime = start
  }
  const onTime = () => {
    const v = videoRef.current
    if (!v) return
    if (start > 0 && v.currentTime < start - 0.5) {
      v.currentTime = start
      return
    }
    if (end != null && v.currentTime >= end - 0.06) {
      v.currentTime = start
    }
  }

  /* ---- gostar ---- */
  const like = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clips/${c.id}/like`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) update({ ...c, liked: data.liked, likes: data.likes })
    } catch {
      /* sem rede */
    } finally {
      setBusy(false)
    }
  }

  /* ---- guardar ---- */
  const save = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clips/${c.id}/save`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) update({ ...c, saved: data.saved, saves: data.saves })
    } catch {
      /* sem rede */
    } finally {
      setBusy(false)
    }
  }

  /* ---- transferir (ficheiro próprio ou cópia MP4 no Storage) ----
     O servidor devolve um URL do Supabase com Content-Disposition:
     attachment. É isso que faz o download funcionar no telemóvel,
     onde o browser não tem yt-dlp. */
  const [baixando, setBaixando] = useState(false)
  const download = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
      (typeof navigator !== 'undefined' && navigator.userAgent) || '',
    )
    if (isMobile) {
      toast.info('O download de vídeos ainda não está disponível no telemóvel. Usa um PC.')
      return
    }
    if (busy || baixando) return
    setBusy(true)
    setBaixando(true)
    try {
      const pedir = (rota) => fetch(rota, { headers: authHeaders() })
      let res = await pedir(`/api/clips/${c.id}/download`)
      // Clips antigos sem cópia: tenta o fallback remoto (só existe no PC local)
      if (res.status === 409 || res.status === 404) {
        const alt = await pedir(`/api/clips/${c.id}/download-remoto`)
        if (alt.ok || alt.status !== 404) res = alt
      }
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        if (res.status === 401) return onRequestAuth && onRequestAuth()
        toast.erro((d && d.error) || `Não deu para transferir (HTTP ${res.status}).`)
        return
      }

      const tipo = String(res.headers.get('content-type') || '')
      if (tipo.includes('application/json')) {
        const d = await res.json()
        if (!d || !d.url) throw new Error('URL em falta')
        const a = document.createElement('a')
        a.href = d.url
        a.download = d.filename || `${c.title || 'clip'}.mp4`
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        a.remove()
        update({ ...c, downloads: (c.downloads || 0) + 1 })
        toast.ok('Transferência iniciada.')
        return
      }

      // Compatibilidade: resposta em stream (PC local sem cópia)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${c.title || 'clip'}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      update({ ...c, downloads: (c.downloads || 0) + 1 })
    } catch {
      toast.erro('Sem ligação ao servidor. Tenta outra vez.')
    } finally {
      setBusy(false)
      setBaixando(false)
    }
  }

  /* ---- comentários ---- */
  const toggleComments = async () => {
    const next = !showComments
    setShowComments(next)
    if (next && !loadedComments) {
      try {
        const res = await fetch(`/api/clips/${c.id}/comments?limit=${PAGE_COMENT}`)
        if (res.ok) {
          const data = await res.json()
          const tops = data.filter((x) => !x.parent_id)
          setComments(data)
          setOffsetComent(tops.length)
          setMaisComent(tops.length === PAGE_COMENT)
          setLoadedComments(true)
        }
      } catch {
        /* sem rede */
      }
    }
  }

  const carregarMaisComentarios = async () => {
    if (aCarregarMais) return
    setACarregarMais(true)
    try {
      const res = await fetch(
        `/api/clips/${c.id}/comments?limit=${PAGE_COMENT}&offset=${offsetComent}`,
      )
      if (res.ok) {
        const data = await res.json()
        const tops = data.filter((x) => !x.parent_id)
        setComments((prev) => [...prev, ...data])
        setOffsetComent((n) => n + tops.length)
        setMaisComent(tops.length === PAGE_COMENT)
      }
    } catch {
      /* sem rede */
    } finally {
      setACarregarMais(false)
    }
  }

  const send = async () => {
    if (!user) return onRequestAuth && onRequestAuth()
    const content = text.trim()
    if (!content || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clips/${c.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content, parent_id: replyTo }),
      })
      if (res.ok) {
        const cm = await res.json()
        setComments((prev) => [...prev, cm])
        setText('')
        setReplyTo(null)
        update({ ...c, comments_count: (c.comments_count || 0) + 1 })
      }
    } catch {
      /* sem rede */
    } finally {
      setBusy(false)
    }
  }

  const removeComment = async (cm) => {
    try {
      const res = await fetch(`/api/clips/${c.id}/comments/${cm.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        setComments((prev) => prev.filter((x) => x.id !== cm.id && x.parent_id !== cm.id))
        // um comentário de topo a menos na lista -> a página seguinte recua
        if (!cm.parent_id) setOffsetComent((n) => Math.max(0, n - 1))
        update({ ...c, comments_count: Math.max(0, (c.comments_count || 0) - 1) })
      }
    } catch {
      /* sem rede */
    }
  }

  /* ---- gosto num comentário (toggle) ---- */
  const toggleCommentLike = async (cm) => {
    if (!user) return onRequestAuth && onRequestAuth()
    const liked = !cm.liked
    const anterior = cm.likes || 0
    // atualiza já, sem esperar pelo servidor
    setComments((prev) =>
      prev.map((x) =>
        x.id === cm.id ? { ...x, liked, likes: Math.max(0, anterior + (liked ? 1 : -1)) } : x,
      ),
    )
    try {
      const res = await fetch(`/api/clips/${c.id}/comments/${cm.id}/like`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (res.ok) {
        const d = await res.json()
        setComments((prev) => prev.map((x) => (x.id === cm.id ? { ...x, ...d } : x)))
      } else {
        throw new Error('falhou')
      }
    } catch {
      // sem rede -> volta ao que estava
      setComments((prev) =>
        prev.map((x) => (x.id === cm.id ? { ...x, liked: !liked, likes: anterior } : x)),
      )
    }
  }

  /* ---- editar (só o dono) ---- */
  const abrirEdicao = () => {
    setNovoTitulo(c.title)
    setNovoJogo(c.game || '')
    setNovaVis(c.visibility === 'private' ? 'private' : 'public')
    setErrEdit('')
    setEditando(true)
  }

  const guardarEdicao = async () => {
    if (salvando) return
    const t = novoTitulo.trim()
    if (!t) return setErrEdit('O título não pode ficar vazio.')
    setSalvando(true)
    setErrEdit('')
    try {
      const res = await fetch(`/api/clips/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ title: t, game: novoJogo || undefined, visibility: novaVis }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrEdit((data && data.error) || 'Não consegui guardar as alterações.')
        return
      }
      update({ ...c, ...data })
      setEditando(false)
    } catch {
      setErrEdit('Sem rede — tenta outra vez.')
    } finally {
      setSalvando(false)
    }
  }

  const removeClip = async () => {
    const ok = await confirmar('Eliminar este clip?', { titulo: 'Eliminar clip', okTexto: 'Eliminar' })
    if (!ok) return
    try {
      const res = await fetch(`/api/clips/${c.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) return
      const d = await res.json().catch(() => ({}))
      // O clip sai do site e o vídeo remoto também — se o remoto não
      // sair, dizemos (não pode ficar sem avisar).
      if (d && d.remoto === false) {
        toast.erro(
          'Clip apagado do site. O vídeo remoto ficou por apagar — falta de autorização (renova a autorização do servidor).',
        )
      } else {
        toast.ok('Clip eliminado.')
      }
      if (onDelete) onDelete(c.id)
    } catch {
      toast.erro('Sem ligação ao servidor.')
    }
  }

  const tops = comments.filter((x) => !x.parent_id)
  const repliesOf = (id) => comments.filter((x) => x.parent_id === id)

  const actionCls = (active) =>
    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
      active
        ? 'bg-violet-500/20 text-violet-400'
        : 'text-gray-400 hover:bg-white/10 hover:text-white'
    }`

  const renderComment = (cm, isReply = false) => (
    <div key={cm.id} className={isReply ? 'ml-6 mt-2' : 'mt-3'}>
      <div className="flex items-start gap-2">
        <AvatarImg name={cm.author} src={cm.author_avatar} className="h-6 w-6" />
        <div className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-2">
            <button
              onClick={() => onProfile && onProfile(cm.author)}
              className="text-xs font-bold text-violet-400 hover:underline"
            >
              {cm.author}
            </button>
            <span className="text-[10px] text-gray-500">{fmtComment(cm.created_at)}</span>
          </div>
          <p className="mt-0.5 break-words text-sm text-gray-200">{cm.content}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={() => toggleCommentLike(cm)}
            title={cm.liked ? 'Tirar o gosto' : 'Gostar do comentário'}
            aria-pressed={!!cm.liked}
            className={`flex items-center gap-0.5 rounded p-1 transition-colors ${
              cm.liked ? 'text-rose-400' : 'text-gray-500 hover:bg-white/10 hover:text-rose-400'
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={cm.liked ? 'currentColor' : 'none'} />
            {!!cm.likes && <span className="text-[10px] font-black leading-none">{cm.likes}</span>}
          </button>
          <button
            onClick={() => {
              if (!user) return onRequestAuth && onRequestAuth()
              setReplyTo(replyTo === cm.id ? null : cm.id)
            }}
            title="Responder"
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-violet-400"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
          {cm.deletable && (
            <button
              onClick={() => removeComment(cm)}
              title="Eliminar comentário"
              className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {!isReply && repliesOf(cm.id).map((r) => renderComment(r, true))}
    </div>
  )

  return (
    <div
      className={`clip-card overflow-hidden rounded-2xl border ${
        transparent
          ? 'border-white/10 bg-white/[0.035] backdrop-blur-[3px]'
          : 'glass border-transparent'
      }`}
    >
      {/* Autor + jogo + data */}
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
        <button
          onClick={() => onProfile && onProfile(c.author)}
          className="group flex items-center gap-2.5"
        >
          <AvatarImg name={c.author} src={c.author_avatar} className="h-9 w-9" />
          <span className="text-sm font-bold text-white group-hover:text-violet-400">
            {c.author}
          </span>
        </button>
        {c.game && (
          <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-bold text-violet-300 ring-1 ring-violet-500/30">
            <Gamepad2 className="h-3 w-3" /> {gameLabel(c.game)}
          </span>
        )}
        <span className="text-xs text-gray-500">{fmtDate(c.created_at)}</span>
        {c.visibility === 'private' && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-bold text-yellow-400">
            <Lock className="h-3 w-3" /> Privado
          </span>
        )}
        {c.mine && (
          <div className={`flex items-center gap-1 ${c.visibility === 'private' ? '' : 'ml-auto'}`}>
            {!editando && (
              <button
                onClick={abrirEdicao}
                title="Editar clip"
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-violet-500/15 hover:text-violet-400"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={removeClip}
              title="Eliminar clip"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Título + vídeo */}
      <div className="px-4 pt-3">
        {editando ? (
          <div className="rounded-xl bg-white/5 p-3">
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              maxLength={100}
              placeholder="Título do clip"
              className="w-full rounded-lg bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none ring-1 ring-white/10 focus:ring-violet-500/50"
            />
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={novoJogo}
                onChange={(e) => setNovoJogo(e.target.value)}
                title="Jogo do clip"
                className="cursor-pointer rounded-lg bg-black/40 px-2.5 py-2 text-xs font-bold text-gray-200 outline-none ring-1 ring-white/10 focus:ring-violet-500/50"
              >
                {!novoJogo && (
                  <option value="" className="bg-neutral-900">
                    Escolher jogo…
                  </option>
                )}
                {CLIP_GAMES.map((g) => (
                  <option key={g.id} value={g.id} className="bg-neutral-900">
                    {g.label}
                  </option>
                ))}
              </select>
              <select
                value={novaVis}
                onChange={(e) => setNovaVis(e.target.value)}
                title="Visibilidade do clip"
                className="cursor-pointer rounded-lg bg-black/40 px-2.5 py-2 text-xs font-bold text-gray-200 outline-none ring-1 ring-white/10 focus:ring-violet-500/50"
              >
                <option value="public" className="bg-neutral-900">
                  Público — vê toda a gente
                </option>
                <option value="private" className="bg-neutral-900">
                  Privado — vês só tu
                </option>
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={guardarEdicao}
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-violet-600 disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> A guardar…
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
              <button
                onClick={() => setEditando(false)}
                disabled={salvando}
                className="flex-1 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/20 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
            {errEdit && <p className="mt-2 text-xs font-bold text-red-400">{errEdit}</p>}
          </div>
        ) : (
          <h3 className="font-bold text-white">{c.title}</h3>
        )}
        {c.remoto ? (
          <VideoRemoto
            id={c.remoto}
            titulo={c.title}
            capa={c.thumb_url}
            aoDarPlay={() => registarVista(c.id, setC)}
          />
        ) : (
          <video
            ref={videoRef}
            src={c.url}
            controls
            preload="metadata"
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.volume = 0.25
              onMeta(e)
            }}
            onTimeUpdate={onTime}
            /* só um clip a tocar de cada vez (menos CPU e banda) */
            onPlay={() => {
              if (!musicaVideoLocal.current) {
                musicaVideoLocal.current = true
                videoComecou()
              }
              registarVista(c.id, setC)
              document.querySelectorAll('video').forEach((v) => {
                if (v !== videoRef.current && !v.paused) v.pause()
              })
            }}
            onPause={() => {
              if (musicaVideoLocal.current) {
                musicaVideoLocal.current = false
                videoParou()
              }
            }}
            onEnded={() => {
              if (musicaVideoLocal.current) {
                musicaVideoLocal.current = false
                videoParou()
              }
            }}
            className="mt-3 max-h-[65vh] w-full rounded-xl bg-black"
          />
        )}
        {(start > 0 || end != null) && (
          <p className="mt-1.5 text-xs text-gray-500">
            Trecho: {mmss(start)} – {end != null ? mmss(end) : 'fim'}
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-3">
        {/* Visualizações — só se mostra (o contador soma no play) */}
        <span
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-bold text-gray-400"
          title="Visualizações"
        >
          <Eye className="h-4 w-4" />
          {c.views || 0}
        </span>
        <button onClick={like} className={actionCls(c.liked)} title="Gosto">
          <Heart className={`h-4 w-4 ${c.liked ? 'fill-violet-400 text-violet-400' : ''}`} />
          {c.likes || 0}
        </button>
        <button onClick={toggleComments} className={actionCls(showComments)} title="Comentários">
          <MessageCircle className="h-4 w-4" />
          {c.comments_count || 0}
        </button>
        {/* transferir — serve o ficheiro nosso OU o remoto (à máxima) */}
        <button
          onClick={download}
          className={actionCls(false)}
          title={baixando ? 'A transferir…' : 'Transferir o vídeo (máxima qualidade)'}
          disabled={baixando || busy}
        >
          {baixando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {baixando ? 'A transferir…' : c.downloads || 0}
        </button>
      </div>

      {/* Comentários */}
      {showComments && (
        <div className="border-t border-white/10 px-4 py-3">
          {comments.length === 0 && loadedComments && (
            <Estado
              compacto
              icon={MessageCircle}
              titulo="Ainda não há comentários"
              texto="Sê o primeiro a deixar a tua neste clip."
            />
          )}
          {tops.map((cm) => renderComment(cm))}

          {maisComent && (
            <button
              onClick={carregarMaisComentarios}
              disabled={aCarregarMais}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {aCarregarMais ? 'A carregar…' : 'Carregar mais comentários'}
            </button>
          )}

          {replyTo && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300">
              A responder a {comments.find((x) => x.id === replyTo)?.author}
              <button onClick={() => setReplyTo(null)} className="hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {user ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={replyTo ? 'Escreve uma resposta…' : 'Escreve um comentário…'}
                maxLength={1000}
                className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15"
              />
              <button
                onClick={send}
                disabled={busy || !text.trim()}
                className="rounded-full bg-violet-500 p-2.5 text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRequestAuth && onRequestAuth()}
              className="mt-3 w-full rounded-xl border border-dashed border-white/20 py-2.5 text-sm font-bold text-gray-400 transition-colors hover:border-violet-500/50 hover:text-violet-400"
            >
              Entra na conta para comentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
