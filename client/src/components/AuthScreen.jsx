import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  LogIn,
  UserPlus,
  Loader2,
  ShieldCheck,
  MailCheck,
  KeyRound,
} from 'lucide-react'

/* ============================================================
   Ecrã de entrada obrigatório — para entrar no site é preciso
   conta (nome, email e palavra-passe).

   "Esqueci a pass" NÃO envia email: regista um pedido que o admin
   vê no painel. Quando o admin liga o "modo recuperação", ao entrar
   no site aparece sempre o ecrã de criar nova palavra-passe
   (forceReset).
   ============================================================ */

export default function AuthScreen({ onAuthed, forceReset = false, forceUsername = '' }) {
  const [mode, setMode] = useState(forceReset ? 'reset' : 'login') // login | register | forgot | reset
  const [username, setUsername] = useState(forceUsername)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Estado do pedido de recuperação
  const [sentInfo, setSentInfo] = useState(null) // { ok: true }

  const [showExists, setShowExists] = useState(false)
  const existsTimer = useRef(null)

  // Só mostra "Esqueci a pass" se o nome escrito existir na BD.
  // Se a conta estiver em modo recuperação, salta logo ao ecrã de nova pass.
  useEffect(() => {
    if (mode !== 'login') return
    const u = username.trim()
    if (u.length < 3) {
      setShowExists(false)
      return
    }
    if (existsTimer.current) clearTimeout(existsTimer.current)
    existsTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/users/exists?username=${encodeURIComponent(u)}`)
        const d = await r.json()
        setShowExists(!!d.exists)
        if (d.exists && d.recovery) setMode('reset')
      } catch {
        setShowExists(false)
      }
    }, 400)
    return () => {
      if (existsTimer.current) clearTimeout(existsTimer.current)
    }
  }, [username, mode])

  const switchMode = (m) => {
    if (forceReset && m !== 'reset') return
    setMode(m)
    setError('')
    setSentInfo(null)
    if (m !== 'reset') {
      setPassword('')
      setConfirm('')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (mode === 'forgot' || mode === 'reset') return
    setBusy(true)
    setError('')
    try {
      const payload = { username: username.trim(), password }
      if (mode === 'register') payload.email = email.trim()

      const res = await fetch(`/api/users/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let data = null
      try {
        data = await res.json()
      } catch {
        /* resposta inválida */
      }
      if (!res.ok) {
        setError((data && data.error) || 'Erro. Tenta outra vez.')
        return
      }
      setUsername('')
      setPassword('')
      setEmail('')
      if (onAuthed) onAuthed(data)
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  // Cria a nova palavra-passe (modo de recuperação ligado pelo admin)
  const submitReset = async (e) => {
    e.preventDefault()
    if (busy) return
    const u = username.trim()
    if (!u) return setError('Escreve o teu nome.')
    if (password.length < 6) {
      return setError('A nova palavra-passe precisa de pelo menos 6 caracteres.')
    }
    if (password !== confirm) return setError('As palavras-passe não coincidem.')

    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/users/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, new_password: password }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d.error || 'Não foi possível criar a nova palavra-passe.')
        return
      }
      setPassword('')
      setConfirm('')
      if (onAuthed) onAuthed(d)
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  // Regista o pedido "esqueci a pass" para o admin ver no painel
  const sendRecovery = async () => {
    const u = username.trim()
    if (!u) {
      setError('Escreve primeiro o teu nome.')
      return
    }
    setBusy(true)
    setError('')
    setSentInfo(null)
    try {
      const r = await fetch('/api/users/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.ok) {
        setError(d.error || 'Não foi possível registar o pedido.')
        return
      }
      setSentInfo({ ok: true, dev: Boolean(d.dev) })
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15 focus:ring-2 focus:ring-violet-500/40'

  const tabCls = (on) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition-colors ${
      on ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]' : 'text-gray-400 hover:text-white'
    }`

  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  const subtitle = isForgot
    ? 'Recuperar palavra-passe'
    : isReset
      ? 'Criar nova palavra-passe'
      : 'Conta para entrar'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black px-4 py-8">
      {/* Brilho violeta subtil */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-[110px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Marca */}
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
            <ShieldCheck className="h-6 w-6 text-violet-400" />
          </span>
          <h1 className="gradient-text font-display text-2xl font-black uppercase tracking-wide">
            Locaus
          </h1>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.3em] text-gray-500">
            {subtitle}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          {/* ------------- "Esqueci a pass" (pedido ao admin) ------------- */}
          {isForgot ? (
            sentInfo ? (
              <div className="space-y-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
                  <MailCheck className="h-6 w-6 text-violet-400" />
                </span>
                <p className="text-sm leading-relaxed text-gray-300">
                  Enviámos um <b className="text-white">email de recuperação</b> para a conta
                  <br />
                  <b className="text-white">{username.trim()}</b>.
                  <br />
                  <br />
                  Abre o link no email (válido 1 hora) para definir uma nova
                  palavra-passe. Se não vires o email, verifica o spam.
                </p>
                {sentInfo && sentInfo.dev && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-300">
                    (Modo local: o link foi impresso na consola do servidor.)
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-white/15 hover:text-white"
                >
                  Voltar a entrar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendRecovery()
                }}
                className="space-y-3"
              >
                <p className="text-xs leading-relaxed text-gray-400">
                  Escreve o teu nome — enviamos um link de recuperação para o email associado à conta.
                </p>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="O teu nome"
                  maxLength={20}
                  autoComplete="username"
                  className={inputCls}
                />

                {error && (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !username.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pedir recuperação'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-1 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
                >
                  Voltar
                </button>
              </form>
            )
          ) : isReset ? (
            /* ------------- Nova palavra-passe (modo recuperação) ------------- */
            <form onSubmit={submitReset} className="space-y-3">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
                <KeyRound className="h-6 w-6 text-violet-400" />
              </span>
              <p className="text-center text-xs leading-relaxed text-gray-400">
                A recuperação foi aprovada pelo admin — cria já a tua nova palavra-passe.
              </p>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="O teu nome"
                maxLength={20}
                autoComplete="username"
                readOnly={forceReset}
                className={`${inputCls} ${forceReset ? 'opacity-70' : ''}`}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova palavra-passe (mín. 6)"
                maxLength={100}
                autoComplete="new-password"
                className={inputCls}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repete a nova palavra-passe"
                maxLength={100}
                autoComplete="new-password"
                className={inputCls}
              />

              {error && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !username.trim() || !password || !confirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar nova palavra-passe'}
              </button>

              {!forceReset && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-1 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
                >
                  Voltar
                </button>
              )}
            </form>
          ) : (
            <>
              {/* Entrar / Criar conta */}
              <div className="mb-5 flex rounded-full bg-white/10 p-1">
                <button type="button" onClick={() => switchMode('login')} className={tabCls(mode === 'login')}>
                  <LogIn className="h-4 w-4" /> Entrar
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={tabCls(mode === 'register')}
                >
                  <UserPlus className="h-4 w-4" /> Criar conta
                </button>
              </div>

              <form onSubmit={submit} className="space-y-3">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome (3 a 20 caracteres)"
                  maxLength={20}
                  autoComplete="username"
                  className={inputCls}
                />

                {mode === 'register' && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (ex: nome@dominio.com)"
                    maxLength={254}
                    autoComplete="email"
                    className={inputCls}
                  />
                )}

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Palavra-passe (mín. 6)"
                  maxLength={100}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={inputCls}
                />

                {/* Link "Esqueci a pass" — só aparece se o nome existir */}
                {mode === 'login' && showExists && (
                  <p
                    onClick={() => {
                      setError('')
                      setSentInfo(null)
                      setMode('forgot')
                    }}
                    className="text-center text-xs text-violet-400 underline cursor-pointer hover:text-violet-300"
                  >
                    Esqueci a pass
                  </p>
                )}

                {error && (
                  <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    busy ||
                    !username.trim() ||
                    !password ||
                    (mode === 'register' && !email.trim())
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="h-4 w-4" /> Entrar
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Criar conta
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
                {mode === 'login'
                  ? 'Entra com o teu nome e a tua palavra-passe.'
                  : 'Nome, email e uma palavra-passe — o email serve para recuperar a pass.'}
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
