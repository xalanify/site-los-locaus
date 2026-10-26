/* ============================================================
   Sons suaves do chat (Web Audio API, sem ficheiros)
   ------------------------------------------------------------
   - "recebido": dois tons curtos e baixos (ding suave)
   - "enviado": dois tons mais graves/curtos
   O volume é intencionalmente baixo. O utilizador pode desligar
   no cabeçalho do chat (guardado em localStorage).
   ============================================================ */

let ctx = null
let ultimo = 0
let ultimoTipo = ''

function somAtivo() {
  try {
    return localStorage.getItem('locaus:som-chat') !== '0'
  } catch {
    return true
  }
}

export function desbloquearAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

export function tocarSom(tipo = 'recebido') {
  try {
    if (!somAtivo() || document.hidden) return
    const agora = Date.now()
    // evita som duplicado quando o sidebar e o menu mobile pollam juntos
    if (tipo === ultimoTipo && agora - ultimo < 650) return
    ultimo = agora
    ultimoTipo = tipo

    const audio = desbloquearAudio()
    if (!audio || audio.state !== 'running') return

    const notas = tipo === 'enviado' ? [659.25, 880] : [880, 1174.66]
    const volume = tipo === 'enviado' ? 0.022 : 0.032
    const t0 = audio.currentTime

    notas.forEach((freq, i) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t0)
      const inicio = t0 + i * 0.085
      gain.gain.setValueAtTime(0.0001, inicio)
      gain.gain.exponentialRampToValueAtTime(volume, inicio + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.16)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.18)
    })
  } catch {
    /* sem áudio: não estraga o chat */
  }
}

/* O browser só deixa tocar depois de uma interação. */
if (typeof window !== 'undefined') {
  const desbloquear = () => {
    desbloquearAudio()
    window.removeEventListener('pointerdown', desbloquear)
    window.removeEventListener('keydown', desbloquear)
  }
  window.addEventListener('pointerdown', desbloquear, { once: true })
  window.addEventListener('keydown', desbloquear, { once: true })
}
