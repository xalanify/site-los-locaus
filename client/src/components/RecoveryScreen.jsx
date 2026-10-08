import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, Eye, EyeOff, ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react'

/* ============================================================
   Ecrã de nova palavra-passe — aberto pelo link que chegou
   por email (/recuperar?token=...).

   - Mostra a conta e o email (escondido) que recebeu o link
   - Campo da nova pass com "olho" para revelar/esconder
   - Botão de voltar, caso tenhas clicado sem querer
   - O token só pode ser usado uma vez (60 min de validade)
   ============================================================ */
export default function RecoveryScreen({ token, onAuthed }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(null) // { username, email }
  const [fail, setFail] = useState('')

  const [newPass, setNewPass] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Valida o link ao abrir
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch(`/api/users/recovery?token=${encodeURIComponent(token)}`)
        const d = await r.json().catch(() => ({}))
        if (!alive) return
        if (!r.ok || !d.ok) {
          setFail(d.error || 'Este link não é válido.')
          return
        }
        setInfo({ username: d.username, email: d.email })
      } catch {
        if (alive) setFail('Sem ligação ao servidor.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [token])

  const goBack = () => {
    navigate('/', { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (newPass.length < 6) {
      setError('A nova palavra-passe precisa de pelo menos 6 caracteres.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/users/recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPass }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.ok) {
        setError(d.error || 'Não foi possível alterar a palavra-passe.')
        return
      }
      // Password alterada — entra logo com a conta
      if (onAuthed) onAuthed(d)
    } catch {
      setError('Sem ligação ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15 focus:ring-2 focus:ring-orange-500/40'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[110px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 ring-1 ring-orange-500/30">
            <ShieldCheck className="h-6 w-6 text-orange-400" />
          </span>
          <h1 className="gradient-text font-display text-2xl font-black uppercase tracking-wide">
            Ashow e Jazer
          </h1>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.3em] text-gray-500">
            Nova palavra-passe
          </p>
        </div>

        <div className="glass rounded-2xl p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">
                A validar o link
              </p>
            </div>
          ) : fail ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </span>
              <p className="text-sm leading-relaxed text-gray-300">{fail}</p>
              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-white/15 hover:text-white"
              >
                Voltar
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 px-3 py-2 ring-1 ring-orange-500/20">
                <KeyRound className="h-4 w-4 shrink-0 text-orange-400" />
                <p className="min-w-0 text-xs text-orange-200">
                  <b className="text-white">{info?.username}</b>
                  {info?.email ? <span className="block truncate text-orange-300/80">{info.email}</span> : null}
                </p>
              </div>

              <div className="relative">
                <input
                  type={reveal ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Nova palavra-passe (mín. 6)"
                  maxLength={100}
                  autoComplete="new-password"
                  autoFocus
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-white"
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || newPass.length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" /> Guardar e entrar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={goBack}
                className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar (não quero mudar)
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
