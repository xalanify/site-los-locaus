// ============================================================
//  Canal em tempo real (SSE)
//
//  Uma só ligação por separador. O chat e o sino subscrevem os
//  eventos de que precisam. Se o servidor não suportar (Vercel),
//  a ligação falha e as páginas continuam com o polling lento.
// ============================================================

let es = null
let tokenAtual = ''
let tentativa = null
const ouvintes = new Set()

const TIPOS = [
  'hello',
  'chat:message',
  'chat:typing',
  'chat:reaction',
  'chat:delete',
  'chat:pin',
  'chat:tema',
  'notification',
]

function emitir(tipo, dados) {
  for (const fn of [...ouvintes]) {
    try {
      fn(tipo, dados)
    } catch {
      /* um ouvinte avariado não parte os outros */
    }
  }
}

function fecharLigacao() {
  try {
    es && es.close()
  } catch {
    /* nada */
  }
  es = null
}

function ligar() {
  if (typeof window === 'undefined' || !('EventSource' in window)) return
  const token = localStorage.getItem('userToken') || ''
  if (!token) return
  if (es && tokenAtual === token) return

  fecharLigacao()
  tokenAtual = token
  try {
    es = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`)
  } catch {
    es = null
    return
  }

  for (const tipo of TIPOS) {
    es.addEventListener(tipo, (e) => {
      let dados = null
      try {
        dados = e.data ? JSON.parse(e.data) : null
      } catch {
        dados = null
      }
      emitir(tipo, dados)
    })
  }

  es.onerror = () => {
    // o EventSource já tenta sozinho; aqui só tratamos do caso "fechado"
    if (es && es.readyState === EventSource.CLOSED) {
      fecharLigacao()
      clearTimeout(tentativa)
      tentativa = setTimeout(() => {
        tentativa = null
        ligar()
      }, 5000)
    }
  }
}

/** Subscreve os eventos. Devolve a função para cancelar. */
export function subscribe(fn) {
  ouvintes.add(fn)
  ligar()
  return () => {
    ouvintes.delete(fn)
  }
}

/** A ligação está aberta? (para decidir se o polling de recurso corre) */
export function ligado() {
  return Boolean(es && es.readyState === 1)
}

/** Fecha a ligação (logout, por exemplo). */
export function fechar() {
  clearTimeout(tentativa)
  tentativa = null
  tokenAtual = ''
  fecharLigacao()
}
