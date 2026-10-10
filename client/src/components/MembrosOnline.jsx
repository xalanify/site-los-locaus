import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import AvatarImg from './AvatarImg'

/* ============================================================
   Presença na página inicial — quem está no site agora.

   Lê a mesma lista de membros da barra de membros dos clips
   (sinal online = ping nos últimos 2 minutos) e mostra os
   online em destaque; os restantes ficam apagados.
   ============================================================ */
export default function MembrosOnline({ onProfile }) {
  const [lista, setLista] = useState([])
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    let vivo = true
    const carregar = () =>
      fetch('/api/users/list')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!vivo) return
          if (d) setLista(d.users || [])
          setCarregado(true)
        })
        .catch(() => vivo && setCarregado(true))

    carregar()
    const t = setInterval(carregar, 60000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])

  if (!carregado) return null

  const ordenada = [...lista].sort((a, b) => Number(b.online) - Number(a.online)).slice(0, 12)
  const nOnline = lista.filter((u) => u.online).length

  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-wide text-white sm:text-base">
            <Users className="h-4 w-4 text-violet-300" /> Presença
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400">
            <span
              className={`h-2 w-2 rounded-full ${nOnline ? 'bg-emerald-400' : 'bg-gray-600'}`}
            />
            {nOnline === 0
              ? 'ninguém online agora'
              : `${nOnline} online agora`}
          </span>
        </div>

        {ordenada.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não há membros registados.</p>
        ) : (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {ordenada.map((m) => (
              <button
                key={m.id}
                onClick={() => onProfile && onProfile(m.username)}
                title={
                  m.online
                    ? `${m.username} está online`
                    : `${m.username} — offline`
                }
                className={`btn-glass flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-opacity ${
                  m.online ? 'opacity-100' : 'opacity-55'
                }`}
              >
                <span className="relative">
                  <AvatarImg src={m.avatar_url} name={m.username} className="h-7 w-7" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#141418] ${
                      m.online ? 'bg-emerald-400' : 'bg-gray-600'
                    }`}
                  />
                </span>
                <span className="max-w-28 truncate text-xs font-bold text-gray-200">
                  {m.username}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
