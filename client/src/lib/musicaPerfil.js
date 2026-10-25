/* Controlo global: quando um vídeo começa, a música do perfil pausa;
   quando todos os vídeos param, a música volta ao mesmo ponto. */
let videosATocar = 0

export function videoComecou() {
  videosATocar += 1
  window.dispatchEvent(new Event('locaus:video-play'))
}

export function videoParou() {
  videosATocar = Math.max(0, videosATocar - 1)
  if (videosATocar === 0) window.dispatchEvent(new Event('locaus:video-stop'))
}
