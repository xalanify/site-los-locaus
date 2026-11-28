/* ============================================================
   Áudio do YouTube no browser (IFrame API)

   Usado pelas cartas com música e pelo painel admin: o som vem
   do próprio YouTube (IP do utilizador), por isso funciona no
   Railway sem stream no servidor e sem ficheiros MP3.

   Um único player escondido; trocar de música = loadVideoById.
   ============================================================ */

let api = null
let player = null
let pronto = null
let videoAtual = null
let laco = null

function carregarApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem browser'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (api) return api
  api = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        anterior && anterior()
      } catch {
        /* ignora */
      }
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    document.head.appendChild(s)
  })
  return api
}

function garantirPlayer() {
  if (player) return pronto
  pronto = new Promise((resolve) => {
    const div = document.createElement('div')
    div.id = 'locaus-yt-audio'
    div.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(div)
    player = new window.YT.Player(div, {
      width: '2',
      height: '2',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => resolve(player),
      },
    })
  })
  return pronto
}

function pararLaco() {
  if (laco) {
    clearInterval(laco)
    laco = null
  }
}

/** Toca a música do YouTube (id de 11 caracteres). */
export async function tocarYoutube(id, { inicio = 0, fim = 0, volume = 0.12 } = {}) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(String(id || ''))) return false
  try {
    await carregarApi()
    await garantirPlayer()
    pararLaco()

    if (videoAtual !== id) {
      videoAtual = id
      player.loadVideoById({ videoId: id, startSeconds: Math.max(0, Number(inicio) || 0) })
    } else {
      if (inicio > 0) player.seekTo(Number(inicio), true)
      player.playVideo()
    }

    try {
      player.setVolume(Math.round(Math.max(0, Math.min(1, volume)) * 100))
    } catch {
      /* volume antes do ready */
    }

    const limite = Number(fim) || 0
    if (limite > 0) {
      laco = setInterval(() => {
        try {
          const t = player.getCurrentTime()
          if (t >= limite) player.seekTo(Number(inicio) || 0, true)
        } catch {
          /* ignora */
        }
      }, 400)
    }
    return true
  } catch {
    return false
  }
}

/** Pausa o que estiver a tocar. */
export function pararYoutube() {
  pararLaco()
  try {
    player && player.pauseVideo()
  } catch {
    /* ignora */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('locaus:yt-stop'))
  }
}

/** O player do YouTube está pronto? */
export function youtubePronto() {
  return Boolean(player)
}
