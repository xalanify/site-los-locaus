import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  Film,
  Heart,
  Loader2,
  Save,
  UserRoundX,
} from 'lucide-react'
import AvatarImg from '../components/AvatarImg'
import ClipCard from '../components/ClipCard'
import Estado from '../components/Estado'
import { BadgeGem, BADGES, distincoesOverclock } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'
import { searchMice } from '../data/mice'

/* Contador de uma estatística (rótulo em baixo, número em cima) */
function Stat({ valor, rotulo, Icon }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-2xl px-3 py-3">
      <Icon className="h-4 w-4 text-violet-300" />
      <span className="font-display text-xl font-black leading-none text-white">
        {Number(valor) || 0}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {rotulo}
      </span>
    </div>
  )
}

/* ============================================================
   Perfil público com página própria — /perfil/:username

   Mostra quem é o membro (foto, distinções, conta em jogo),
   as contagens e os clips públicos dele. Chega por um clique
   no nome de qualquer autor de clip.
   ============================================================ */
export default function PublicProfilePage({ user, onRequestAuth, onProfile }) {
  const { username } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [erro, setErro] = useState('')
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    let vivo = true
    setData(null)
    setErro('')
    setCarregado(false)
    fetch(`/api/users/${encodeURIComponent(username)}`, { headers: authHeaders() })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        if (!r.ok) setErro(d?.error || 'Perfil não encontrado')
        else setData(d)
      })
      .catch(() => vivo && setErro('Não deu para carregar o perfil.'))
      .finally(() => vivo && setCarregado(true))
    return () => {
      vivo = false
    }
  }, [username])

  if (!carregado) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center gap-3 pt-14">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-gray-500">A abrir o perfil…</p>
      </section>
    )
  }

  if (erro || !data) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <Estado
          tipo="erro"
          icon={UserRoundX}
          titulo="Perfil não encontrado"
          texto={erro || 'Esta conta não existe ou foi removida.'}
          acao={{ label: 'Ver os clips', onClick: () => navigate('/clips') }}
        />
      </section>
    )
  }

  const p = data.profile || {}
  const s = data.stats || {}
  const clips = data.clips || []
  const souEu = p.username && user && p.username.toLowerCase() === user.username.toLowerCase()
  const desde = p.created_at
    ? new Date(p.created_at).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  return (
    <section className="mx-auto max-w-4xl px-4 pb-24 pt-20 sm:px-6 sm:pt-24">
      <button
        onClick={() => navigate(-1)}
        className="btn-glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Cabeçalho do perfil */}
      <div className="glass overflow-hidden rounded-3xl">
        <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <div className="relative">
            <AvatarImg
              src={p.avatar_url}
              name={p.username}
              className="h-20 w-20 text-2xl sm:h-24 sm:w-24"
            />
            {p.online && (
              <span
                title="Online agora"
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-[#0B0B12]"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                {p.username}
              </h1>
              {souEu && (
                <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-200 ring-1 ring-violet-400/30">
                  és tu
                </span>
              )}
              {p.online && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                  online
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> desde {desde}
              </span>
              {p.mouse && (
                <span className="inline-flex items-center gap-1.5">
                  {(() => {
                    const m = (searchMice(p.mouse) || []).find(
                      (x) => `${x.brand} ${x.model}` === p.mouse,
                    )
                    return m && m.logo ? (
                      <img src={m.logo} alt="" className="h-4 w-4 rounded-sm object-contain" />
                    ) : null
                  })()}
                  <span className="font-bold text-gray-200">{p.mouse}</span>
                  {p.dpi ? <span>· {p.dpi} DPI</span> : null}
                </span>
              )}
            </div>

            {(() => {
              const estaticos = (p.badges || [])
                .map((id) => BADGES.find((b) => b.id === id))
                .filter(Boolean)
              const dist = distincoesOverclock(p.distincoes)
              const todos = [...estaticos, ...dist]
              if (!todos.length) return null
              return (
                <div className="mt-3 flex flex-wrap gap-2">
                  {todos.map((b) => (
                    <span
                      key={b.id}
                      title={b.desc}
                      className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ring-1"
                      style={{
                        background: `${b.color}18`,
                        boxShadow: `0 0 14px ${b.color}40`,
                        ringColor: `${b.color}66`,
                      }}
                    >
                      <BadgeGem badge={b} size={18} />
                      <span
                        className="font-display text-[10px] font-black uppercase tracking-wider"
                        style={{ color: b.color }}
                      >
                        {b.label}
                      </span>
                    </span>
                  ))}
                </div>
              )
            })()}
          </div>

          {souEu && (
            <Link
              to="/perfil"
              className="btn-glass rounded-full px-4 py-2 text-sm font-bold text-white"
            >
              Gerir conta
            </Link>
          )}
        </div>

        {/* Contagens */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
          <Stat valor={s.clips} rotulo="clips" Icon={Film} />
          <Stat valor={s.views} rotulo="vistos" Icon={Eye} />
          <Stat valor={s.likes} rotulo="gostos" Icon={Heart} />
          <Stat valor={s.downloads} rotulo="transferidos" Icon={Download} />
          <Stat valor={s.saved} rotulo="guardados" Icon={Save} />
        </div>

        {/* As contas de jogo ficam no backend — não aparecem aqui */}
        </div>
      </div>

      {/* Clips do perfil */}
      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
          Clips de <span>{p.username}</span>
        </h2>
        <span className="text-sm text-gray-500">{clips.length}</span>
      </div>

      {clips.length === 0 ? (
        <Estado
          icon={Film}
          titulo="Ainda não há clips"
          texto={
            souEu
              ? 'Publica o teu primeiro clip e aparece aqui na tua página.'
              : `${p.username} ainda não publicou nenhum clip.`
          }
          acao={souEu ? { label: 'Publicar clip', onClick: () => navigate('/clips') } : null}
        />
      ) : (
        <div className="space-y-6">
          {clips.map((c) => (
            <ClipCard
              key={c.id}
              clip={c}
              user={user}
              onRequestAuth={onRequestAuth}
              onProfile={onProfile}
              onUpdate={(next) =>
                setData((prev) => ({
                  ...prev,
                  clips: prev.clips.map((x) => (x.id === next.id ? next : x)),
                }))
              }
              onDelete={(id) =>
                setData((prev) => ({ ...prev, clips: prev.clips.filter((x) => x.id !== id) }))
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
