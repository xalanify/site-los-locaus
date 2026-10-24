import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { setUserSession } from '../lib/auth'

/* ============================================================
   Recuperar palavra-passe — abre via link do email
   URL: /recuperar?token=...
   ============================================================ */
export default function RecuperarPage({ onAuthed }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [username, setUsername] = useState('')
  const [validando, setValidando] = useState(true)
  const [erro, setErro] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!token) {
      setErro('Token em falta. Pede um novo link de recuperação.')
      setValidando(false)
      return
    }
    fetch(`/api/users/reset?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d && d.ok) {
          setUsername(d.username || '')
        } else {
          setErro((d && d.error) || 'Token inválido ou expirado.')
        }
      })
      .catch(() => setErro('Sem ligação ao servidor.'))
      .finally(() => setValidando(false))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (password.length < 6) {
      setErro('A nova palavra-passe precisa de pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setErro('As palavras-passe não coincidem.')
      return
    }
    setBusy(true)
    setErro('')
    try {
      const res = await fetch('/api/users/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.token || !d.user) {
        setErro((d && d.error) || 'Não foi possível definir a nova palavra-passe.')
        return
      }
      setUserSession(d.token, d.user)
      if (onAuthed) onAuthed(d)
      setOk(true)
      setTimeout(() => navigate('/'), 1500)
    } catch {
      setErro('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-[110px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
            <LogIn className="h-6 w-6 text-violet-400" />
          </span>
          <h1 className="gradient-text font-display text-2xl font-black uppercase tracking-wide">
            Locaus
          </h1>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.3em] text-gray-500">
            Recuperar palavra-passe
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          {validando ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> A validar o link…
            </div>
          ) : erro ? (
            <div className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
              <p className="text-sm font-bold text-red-300">{erro}</p>
              <button
                onClick={() => navigate('/')}
                className="rounded-full bg-violet-500 px-5 py-2 text-sm font-black text-white hover:bg-violet-600"
              >
                Voltar ao site
              </button>
            </div>
          ) : ok ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-300">Palavra-passe alterada!</p>
              <p className="text-xs text-gray-400">A entrar automaticamente…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm text-gray-300">
                Conta: <strong className="text-white">{username}</strong>
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova palavra-passe"
                autoFocus
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15 focus:ring-2 focus:ring-violet-500/40"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmar palavra-passe"
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15 focus:ring-2 focus:ring-violet-500/40"
              />
              {erro && <p className="text-xs font-bold text-red-400">{erro}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Definir nova palavra-passe'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
