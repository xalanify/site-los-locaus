import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, CheckCheck, Heart, MessageSquare, Award, Sparkles, Trash2, ChevronRight } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import { ativarPush, desligarPush, pushLigado, temPWA } from '../lib/pwa'
import Estado from './Estado'

/* Ícone e cor por tipo de notificação */
const TIPOS = {
  comment: { Icon: MessageSquare, cor: 'text-sky-300', fundo: 'bg-sky-400/15' },
  reply: { Icon: MessageSquare, cor: 'text-sky-300', fundo: 'bg-sky-400/15' },
  like: { Icon: Heart, cor: 'text-rose-300', fundo: 'bg-rose-400/15' },
  save: { Icon: Sparkles, cor: 'text-amber-300', fundo: 'bg-amber-400/15' },
  badge: { Icon: Award, cor: 'text-zinc-300', fundo: 'bg-zinc-400/15' },
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
export default function Sino({ user, posicao = 'topo', variant = 'icone' }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [items, setItems] = useState([])
  const [nLidas, setNLidas] = useState(0)
  const [push, setPush] = useState(false)
  const [subs, setSubs] = useState(null)
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

  /* Estado do push */
  useEffect(() => {
    let vivo = true
    pushLigado().then((v) => vivo && setPush(v))
    return () => {
      vivo = false
    }
  }, [])

  /* ao abrir o painel, confirma se o servidor tem este dispositivo ligado */
  useEffect(() => {
    if (aberto && user) carregarStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, user])

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

  /* Apaga o histórico todo (notificações já vistas) */
  const limparHistorico = async () => {
    setItems((prev) => prev.filter((x) => !x.read))
    try {
      await fetch('/api/notifications', { method: 'DELETE', headers: authHeaders() })
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
    await carregarStatus()
    setBusy(false)
  }

  const testarPush = async () => {
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/notifications/push/test', {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => ({}))
      setMsg(r.ok ? 'Enviado. Deve aparecer no Windows em segundos.' : d.error || 'Não deu para enviar.')
      if (r.ok) carregarStatus()
    } catch {
      setMsg('Não deu para enviar o teste.')
    } finally {
      setBusy(false)
    }
  }

  const carregarStatus = async () => {
    try {
      const r = await fetch('/api/notifications/push/status', { headers: authHeaders() })
      if (!r.ok) return
      const d = await r.json()
      setSubs(Number(d.subs) || 0)
    } catch {
      /* ignora */
    }
  }

  const reativarPush = async () => {
    setBusy(true)
    setMsg('')
    const r = await ativarPush()
    setPush(r.ok)
    setMsg(r.ok ? 'Notificações ligadas neste dispositivo.' : r.erro || 'Não deu para reativar.')
    await carregarStatus()
    setBusy(false)
  }

  const card = variant === 'card'
  return (
    <div className={`relative ${card ? 'w-full' : ''}`} ref={caixa}>
      {card ? (
        <button
          onClick={() => setAberto((v) => !v)}
          aria-label={nLidas ? `${nLidas} notificações por ler` : 'Notificações'}
          aria-expanded={aberto}
          className="glass flex w-full items-center gap-3 rounded-2xl border border-white/10 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-500/10 text-zinc-300 ring-1 ring-white/10">
            {nLidas ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {nLidas > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white shadow">
                {nLidas > 9 ? '9+' : nLidas}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
              Notificações
            </span>
            <span className="block text-sm font-black leading-tight text-white">
              {nLidas > 0 ? `${nLidas} por ler` : 'Em dia'}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        </button>
      ) : (
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
      )}

      {aberto &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
            onClick={() => setAberto(false)}
          >
            <div
              className="glass flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-black text-white">Notificações</span>
            <span className="flex items-center gap-3">
              {items.some((i) => !i.read) && (
                <button
                  onClick={marcarTudo}
                  className="flex items-center gap-1 text-xs font-bold text-zinc-300 hover:text-white"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> marcar tudo
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={limparHistorico}
                  className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" /> limpar
                </button>
              )}
            </span>
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
                  texto="Quando alguém comentar, mandar mensagem no chat, houver notícias novas ou um jogo das previsões começar, aparece aqui."
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
                    {!it.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-zinc-400" />}
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
              {push && (
                <button
                  onClick={testarPush}
                  disabled={busy}
                  className="mt-2 w-full rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
                >
                  Testar notificação com som
                </button>
              )}
              {push && subs !== null && (
                <p className={`mt-1.5 text-center text-[10px] font-bold ${subs > 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {subs > 0
                    ? `${subs} dispositivo(s) ligado(s) no servidor`
                    : 'Este dispositivo não está registado no servidor'}
                </p>
              )}
              {push && subs === 0 && (
                <button
                  onClick={reativarPush}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-full bg-emerald-500/90 px-4 py-1.5 text-[11px] font-black text-black transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  Reativar neste dispositivo
                </button>
              )}
              {msg && <p className="mt-2 text-center text-[11px] text-gray-400">{msg}</p>}
              <p className="mt-2 text-center text-[9px] leading-relaxed text-gray-600">
                No Windows, mantém o Chrome/Edge abertos em segundo plano ou instala o site como app
                para receber avisos com o browser fechado.
              </p>
            </div>
          )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
