import { useEffect, useState } from 'react'
import { Coins, Trophy, X } from 'lucide-react'
import { authHeaders } from '../lib/auth'

/* Aviso flutuante de vitória no enigma (uma vez por resultado) */
export default function AvisoVitoriaEnigma({ user }) {
  const [info, setInfo] = useState(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch('/api/enigma/eu', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d || !d.terminou || d.admin) return
        const chave = `locaus:enigma-vitoria:v1:${user?.id || user?.username}:${d.posicao}:${d.moedas}`
        try {
          if (localStorage.getItem(chave)) return
        } catch {
          return
        }
        setInfo({ ...d, chave })
        setAberto(true)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [user?.id, user?.username])

  const fechar = () => {
    if (info?.chave) {
      try {
        localStorage.setItem(info.chave, '1')
      } catch {
        /* sem armazenamento */
      }
    }
    setAberto(false)
  }

  if (!aberto || !info) return null

  return (
    <div className="aviso-vitoria" role="status">
      <span className="aviso-vitoria-ico">
        <Trophy className="h-5 w-5" />
      </span>
      <div className="aviso-vitoria-txt">
        <span className="aviso-vitoria-kicker">Enigma semana 1</span>
        <b>Ganhaste o enigma!</b>
        <em>
          {info.posicao}.º lugar · <Coins className="inline h-3 w-3" /> +{info.moedas} moedas
        </em>
        {info.posicao === 1 && (
          <em className="text-[#f5c542]">+ carta exclusiva 1/1 para ti</em>
        )}
      </div>
      <button type="button" onClick={fechar} aria-label="Fechar aviso">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
