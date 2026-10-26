import { authHeaders } from './auth'

/* ============================================================
   PWA — service worker + Web Push

   O service worker (public/sw.js) é quem mostra a notificação
   quando o site está fechado; aqui só pedimos a permissão e
   guardamos a subscrição no servidor.
   ============================================================ */

/** true quando o browser pode instalar/PWA-izar (não em Safari antigo, etc.) */
export const temPWA = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window

const bytes = (b64) => {
  const norm = String(b64).replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (norm.length % 4)) % 4)
  const bin = atob(norm + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Regista o SW (fica ativo de seguida). Devolve a regista ou null. */
export async function registarSW() {
  if (!temPWA()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

async function chavePublica() {
  try {
    const r = await fetch('/api/notifications/push/public-key')
    const d = await r.json()
    return d.key || null
  } catch {
    return null
  }
}

/** Já está subscrito neste dispositivo? */
export async function pushLigado() {
  if (!temPWA()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager?.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

/** Pede permissão, subscreve o dispositivo e avisa o servidor. */
export async function ativarPush() {
  if (!temPWA()) return { ok: false, erro: 'Este browser não suporta notificações.' }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    return { ok: false, erro: 'Permissão de notificações recusada.' }
  }

  try {
    // garante que o service worker está registado/ativo (evita "push
    // service error" quando o browser ainda não tem o SW pronto)
    const existente = await navigator.serviceWorker.getRegistration()
    if (!existente) await registarSW()
    const reg = await navigator.serviceWorker.ready
    if (!reg) return { ok: false, erro: 'Sem service worker.' }

    const chave = await chavePublica()
    if (!chave) return { ok: false, erro: 'Push não está configurado no servidor.' }

    // remove uma subscrição antiga (chave VAPID antiga / browser atualizado)
    try {
      const antiga = await reg.pushManager.getSubscription()
      if (antiga) await antiga.unsubscribe()
    } catch {
      /* segue para a nova subscrição */
    }

    const opcoes = {
      userVisibleOnly: true,
      applicationServerKey: bytes(chave),
    }

    let sub = null
    try {
      sub = await reg.pushManager.subscribe(opcoes)
    } catch (primeiroErro) {
      // segunda tentativa depois de garantir o SW pronto
      await new Promise((r) => setTimeout(r, 800))
      try {
        sub = await reg.pushManager.subscribe(opcoes)
      } catch (segundoErro) {
        const msg = String((segundoErro && segundoErro.message) || primeiroErro?.message || '')
        if (/push service error|registration failed/i.test(msg)) {
          return {
            ok: false,
            erro:
              'O browser não conseguiu ligar ao serviço de push. Usa Chrome ou Edge, desativa VPN/firewall temporariamente e confirma que as notificações do Windows estão ligadas. No Brave, ativa “Use Google services for push messaging”.',
          }
        }
        return { ok: false, erro: msg || 'Não deu para subscrever as notificações.' }
      }
    }

    if (!sub) return { ok: false, erro: 'Não deu para criar a subscrição de push.' }

    const r = await fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(sub.toJSON()),
    })
    if (!r.ok) throw new Error('Falhou o registo no servidor')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e.message || 'Não deu para ativar.' }
  }
}

/** Desliga as notificações deste dispositivo. */
export async function desligarPush() {
  if (!temPWA()) return { ok: true }
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager?.getSubscription()
    if (!sub) return { ok: true }
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await fetch('/api/notifications/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ endpoint }),
    })
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
