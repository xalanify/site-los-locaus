import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, CheckCheck, Heart, MessageSquare, Award, Sparkles } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { ativarPush, desligarPush, pushLigado, temPWA } from '../lib/pwa'
import Estado from './Estado'

/* Ícone e cor por tipo de notificação */
const TIPOS = {
  comment: { Icon: MessageSquare, cor: 'text-sky-300', fundo: 'bg-sky-400/15' },
  reply: { Icon: MessageSquare, cor: 'text-sky-300', fundo: 'bg-sky-400/15' },
  like: { Icon: Heart, cor: 'text-rose-300', fundo: 'bg-rose-400/15' },
  save: { Icon: Sparkles, cor: 'text-amber-300', fundo: 'bg-amber-400/15' },
  badge: { Icon: Award, cor: 'text-violet-300', fundo: 'bg-violet-400/15' },
}
const padrao = TIPOS.comment

const quando = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'agora'
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`
  if (seg < 86400 * 7) return `há ${Math.floor(seg / 86400)} d`
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

/* ============================================================
   Sino de notificações — mora na barra de topo.

   • conta as não lidas (atualiza sozinha)
   • abre a lista com o que aconteceu nos teus clips
   • ativa/desativa o push do PWA neste dispositivo
   ============================================================ */
export default function Sino({ user }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [items, setItems] = useState([])
  const [nLidas, setNLidas] = useState(0)
  const [push, setPush] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const caixa = useRef(null)
  const inloaded = useRef(false)

  const carregar = useCallback(async () => {
    if (!user) return
    try {
      const r = await fetch('/api/notifications', { headers: authHeaders() })
      if (!r.ok) return
      const d = await r.json()
      setItems(d.items || [])
      setNLidas(d.unread || 0)
      inloaded.current = true
    } catch {
      /* rede em baixo: fica com o que tinha */
    }
  }, [user])

  /* Contagem em segundo plano (mesmo com o painel fechado) */
  useEffect(() => {
    if (!user) {
      setItems([])
      setNLidas(0)
      return undefined
    }
    carregar()
    const id = setInterval(async () => {
      try {
        const r = await fetch('/api/notifications/unread', { headers: authHeaders() })
        if (r.ok) setNLidas((await r.json()).n || 0)
      } catch {
        /* ignora */
      }
    }, 30000)
    return () => clearInterval(id)
  }, [user, carregar])

  /* Estado do push + fecha ao clicar fora */
  useEffect(() => {
    let vivo = true
    pushLigado().then((v) => vivo && setPush(v))
    const fora = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => {
      vivo = false
      document.removeEventListener('mousedown', fora)
    }
  }, [])

  if (!user) return null

  const clicar = async (it) => {
    if (!it.read) {
      try {
        await fetch(`/api/notifications/${it.id}/read`, { method: 'POST', headers: authHeaders() })
      } catch {
        /* segue */
      }
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, read: true } : x)))
      setNLidas((v) => Math.max(0, v - 1))
    }
    setAberto(false)
    if (it.link) navigate(it.link)
  }

  const marcarTudo = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
    setNLidas(0)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', headers: authHeaders() })
    } catch {
      /* ignora */
    }
  }

  const alternarPush = async () => {
    setBusy(true)
    setMsg('')
    const r = push ? await desligarPush() : await ativarPush()
    setPush(push ? false : r.ok)
    setMsg(r.ok ? (push ? 'Notificações desligadas.' : 'Notificações ligadas neste aparelho.') : r.erro || 'Não deu.')
    setBusy(false)
  }

  return (
    <div className="relative" ref={caixa}>
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label={nLidas ? `${nLidas} notificações por ler` : 'Notificações'}
        aria-expanded={aberto}
        className="btn-glass relative flex h-9 w-9 items-center justify-center rounded-full text-gray-300 sm:h-10 sm:w-10"
      >
        {nLidas ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {nLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white shadow">
            {nLidas > 9 ? '9+' : nLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="glass absolute right-0 top-11 z-50 w-[min(92vw,23rem)] overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-black text-white">Notificações</span>
            {items.some((i) => !i.read) && (
              <button
                onClick={marcarTudo}
                className="flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" /> marcar tudo
              </button>
            )}
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {!inloaded.current ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">A carregar…</div>
            ) : items.length === 0 ? (
              <div className="p-3">
                <Estado
                  compacto
                  icon={Bell}
                  titulo="Sem notificações"
                  texto="Quando alguém comentar ou gostar dos teus clips, aparece aqui."
                />
              </div>
            ) : (
              items.map((it) => {
                const { Icon, cor, fundo } = TIPOS[it.type] || padrao
                return (
                  <button
                    key={it.id}
                    onClick={() => clicar(it)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                      it.read ? 'opacity-70' : 'bg-white/[0.04]'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${fundo}`}>
                      <Icon className={`h-4 w-4 ${cor}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{it.title}</span>
                      {it.body && <span className="block truncate text-xs text-gray-400">{it.body}</span>}
                      <span className="text-[11px] text-gray-500">{quando(it.created_at)}</span>
                    </span>
                    {!it.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-400" />}
                  </button>
                )
              })
            )}
          </div>

          {temPWA() && (
            <div className="border-t border-white/10 px-4 py-3">
              <button
                onClick={alternarPush}
                disabled={busy}
                className="btn-glass flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black text-white disabled:opacity-60"
              >
                {push ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                {push ? 'Notificações ligadas no aparelho' : 'Receber avisos mesmo com o site fechado'}
              </button>
              {msg && <p className="mt-2 text-center text-[11px] text-gray-400">{msg}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
