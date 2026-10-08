import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import ClipCard from './ClipCard'
import { authHeaders } from '../lib/auth'

/* Mostra SÓ o clip público mais recente — quando alguém publica
   outro, é este cartão que muda na página inicial.
   Quando não há clip nenhum, avisa o HomeFeed (onEmptyChange)
   para ele mostrar o bloco centrado no ecrã. */
export default function RecentClip({ user, onRequestAuth, onProfile, onPublish, onEmptyChange }) {
  const [clip, setClip] = useState(undefined) // undefined = a carregar, null = vazio

  useEffect(() => {
    let alive = true
    fetch('/api/clips/latest', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => alive && setClip(d || null))
      .catch(() => alive && setClip(null))
    return () => {
      alive = false
    }
  }, [user?.id])

  // diz ao pai se está vazio (só depois de carregar)
  useEffect(() => {
    if (clip !== undefined) onEmptyChange && onEmptyChange(clip === null)
  }, [clip, onEmptyChange])

  if (clip === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (clip === null) return null // o HomeFeed desenha o estado vazio centrado

  return (
    <div>
      <ClipCard
        clip={clip}
        user={user}
        onRequestAuth={onRequestAuth}
        onProfile={onProfile}
        onUpdate={setClip}
        onDelete={() => onEmptyChange && onEmptyChange(true)}
      />
    </div>
  )
}
