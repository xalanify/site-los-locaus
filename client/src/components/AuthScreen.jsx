import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Loader2, ShieldCheck, MailCheck, MailWarning } from 'lucide-react'

/* ============================================================
   Ecrã de entrada obrigatório — para entrar no site é preciso
   conta (nome, email e palavra-passe).

   "Esqueci a pass" envia um link por email; ao abri-lo o site
   mostra o ecrã de nova palavra-passe (ver RecoveryScreen).
   ============================================================ */

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login') // login | register | forgot
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Estado do pedido de recuperação
  const [sentInfo, setSentInfo] = useState(null) // { masked, dev, devUrl }

  const [showExists, setShowExists] = useState(false)
  const existsTimer = useRef(null)

  // Só mostra "Esqueci a pass" se o nome escrito existir na BD
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
      } catch {
        setShowExists(false)
      }
    }, 400)
    return () => {
      if (existsTimer.current) clearTimeout(existsTimer.current)
    }
  }, [username, mode])

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setSentInfo(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (mode === 'forgot') return
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

  // Envia o link de recuperação por email
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
        setError(d.error || 'Não foi possível enviar o email.')
        return
      }
      setSentInfo({ masked: d.masked, dev: !!d.dev, devUrl: d.devUrl })
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15 focus:ring-2 focus:ring-orange-500/40'

  const tabCls = (on) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition-colors ${
      on ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]' : 'text-gray-400 hover:text-white'
    }`

  const isForgot = mode === 'forgot'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black px-4 py-8">
      {/* Brilho violeta subtil */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[110px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Marca */}
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 ring-1 ring-orange-500/30">
            <ShieldCheck className="h-6 w-6 text-orange-400" />
          </span>
          <h1 className="gradient-text font-display text-2xl font-black uppercase tracking-wide">
            Ashow e Jazer
          </h1>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.3em] text-gray-500">
            {isForgot ? 'Recuperar palavra-passe' : 'Conta para entrar'}
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          {/* ------------- "Esqueci a pass" ------------- */}
          {isForgot ? (
            sentInfo ? (
              <div className="space-y-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 ring-1 ring-orange-500/30">
                  <MailCheck className="h-6 w-6 text-orange-400" />
                </span>
                <p className="text-sm leading-relaxed text-gray-300">
                  Enviámos um link para
                  <br />
                  <b className="text-white">{sentInfo.masked}</b>
                  <br />
                  Abre o email para escolher a nova palavra-passe.
                </p>

                {sentInfo.dev && sentInfo.devUrl && (
                  <div className="rounded-xl bg-orange-500/10 p-3 text-left ring-1 ring-orange-500/25">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-300">
                      <MailWarning className="h-3.5 w-3.5" /> Modo local (sem SMTP)
                    </p>
                    <a
                      href={sentInfo.devUrl}
                      className="block break-all text-xs text-orange-400 underline"
                    >
                      {sentInfo.devUrl}
                    </a>
                  </div>
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
                  Escreve o teu nome e enviamos um link para o email da tua conta.
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link por email'}
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
                    className="text-center text-xs text-orange-400 underline cursor-pointer hover:text-orange-300"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
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
