import { useState } from 'react'
import { X, LogIn, UserPlus, Loader2, User } from 'lucide-react'

/* Entrar ou criar conta de utilizador (para clips) */
export default function AuthModal({ isOpen, onClose, onAuthed }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isOpen) return null

  const switchMode = (m) => {
    setMode(m)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/users/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
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
      if (onAuthed) onAuthed(data)
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15'

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div className="glass w-full max-w-sm rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-black text-white">
            <User className="h-5 w-5 text-violet-400" />
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>
          <button
            onClick={() => onClose && onClose()}
            className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex rounded-full bg-white/10 p-1">
          <button
            onClick={() => switchMode('login')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition-colors ${
              mode === 'login' ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn className="h-4 w-4" /> Entrar
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition-colors ${
              mode === 'register' ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Palavra-passe (mín. 6)"
            maxLength={100}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={inputCls}
          />

          {error && (
            <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'login' ? (
              'Entrar'
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Com conta podes publicar clips, gostar, comentar e guardar.
        </p>
      </div>
    </div>
  )
}
