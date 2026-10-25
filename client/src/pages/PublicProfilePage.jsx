import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clapperboard,
  Camera,
  Loader2,
  UserRoundX,
} from 'lucide-react'
import ClipCard from '../components/ClipCard'
import Estado from '../components/Estado'
import { BadgeGem, BADGES, devLabelClass, distincoesOverclock, nomeDouradoClass, temPrevisao1 } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'
import { searchMice } from '../data/mice'
import { svgAvatar } from '../lib/avatar'
import PageShell from '../components/PageShell'
import UserBanner from '../components/UserBanner'
import { bannerDe, classeFundo } from '../data/temasPerfil'

/* ============================================================
   Perfil público com página própria — /perfil/:username

   O design e a ordem são EXATAMENTE os do perfil normal da
   sidebar (ProfilePage): saudação grande, cartão da conta com
   letra fantasma e anel violeta, distintivo DEV ao lado do
   nome, membro desde, rato/DPI, distinções e por fim os clips.
   Nenhum azulejo de contagens — nada de cartão de visitas.
   Só muda: é a página de OUTRO membro (ou fallback se o nome
   da rota não bater com o utilizador ligado).
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
          <UserRoundX className="h-4 w-4" /> Voltar
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
  const tema = bannerDe(p.banner_id)
  const clips = data.clips || []
  const souEu =
    p.username && user && p.username.toLowerCase() === user.username.toLowerCase()

  /* ---- mesma construção de distinções do perfil normal ---- */
  const d = new Date(p.created_at)
  const criado = Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  const badges = Array.isArray(p.badges) ? p.badges : []
  const distOc = distincoesOverclock(p.distincoes)
  const minhas = [
    ...BADGES.filter((b) => badges.includes(b.id) && b.id !== 'dev'),
    ...distOc,
  ]
  const temDev = badges.includes('dev')
  const devBadge = BADGES.find((b) => b.id === 'dev')

  const avatarSrc = p.avatar_url || svgAvatar(p.username, '#8B5CF6')
  /* margem de casal: 0/1 clip público da até aparecer cheio */

  return (
    <PageShell background={classeFundo(p.background_id)}>
        {/* ---------------- Saudação (igual ao perfil normal) ---------------- */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 font-black gradient-text"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
        >
          {souEu ? (
            <>Bem-vindo</>
          ) : (
            <>
              Perfil de <span className="text-violet-400">{p.username}</span>
            </>
          )}
        </motion.h1>

        {/* ---------------- Cartão da conta (igual ao perfil normal) ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass relative mb-8 overflow-hidden rounded-3xl border p-5 sm:p-6"
          style={{
            borderColor: `${tema.cor}66`,
            boxShadow: `0 0 40px ${tema.cor}22, inset 0 0 0 1px ${tema.cor}18`,
          }}
        >
          <UserBanner bannerId={p.banner_id} className="absolute inset-x-0 top-0 h-1.5" />
          {/* letra fantasma ao fundo */}
          <span className="pointer-events-none absolute -top-3 right-2 select-none font-display text-7xl font-black uppercase leading-none text-white/5">
            {p.username}
          </span>

          <div className="relative flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={avatarSrc}
                alt={p.username}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-500/60"
                style={{ boxShadow: '0 0 26px rgba(139,92,246,.45)' }}
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(p.username, '#8B5CF6')
                }}
              />
              {souEu && (
                <Link
                  to="/perfil"
                  title="Editar foto e perfil"
                  className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#0a0813]/88 text-gray-300 ring-1 ring-white/25 transition-colors hover:bg-violet-500 hover:text-white"
                >
                  <Camera className="h-3 w-3" />
                </Link>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`truncate font-display text-xl font-black uppercase ${
                    temPrevisao1(badges) ? nomeDouradoClass : 'text-white'
                  }`}
                >
                  {p.username}
                </span>
                {temDev && (
                  <span
                    className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5"
                    style={{ boxShadow: '0 0 14px rgba(255,31,61,.35)' }}
                  >
                    <BadgeGem badge={devBadge} size={16} />
                    <span className={`font-display text-[10px] font-black uppercase tracking-wider ${devLabelClass}`}>
                      Dev
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-violet-400" />
                  Membro desde {criado}
                </span>
                <span
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-500"
                  title="ID da conta"
                >
                  ID {p.id}
                </span>
              </p>
              {p.mouse && (
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-violet-400">Mouse</span>
                  {(() => {
                    const m = (searchMice(p.mouse) || []).find(
                      (x) => `${x.brand} ${x.model}` === p.mouse,
                    )
                    return m && m.logo ? (
                      <img src={m.logo} alt="" className="h-5 w-5 shrink-0 rounded-sm object-contain" />
                    ) : null
                  })()}
                  <span className="font-bold">{p.mouse}</span>
                  {p.dpi ? <span className="text-gray-500">· {p.dpi} DPI</span> : null}
                </p>
              )}
            </div>
          </div>

          {/* distinções obtidas (DEV fica só ao lado do nome), igual ao perfil normal */}
          {minhas.length > 0 && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2.5">
              {minhas.map((b) => (
                <span
                  key={b.id}
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 ring-1"
                  style={{
                    background: `${b.color}18`,
                    boxShadow: `0 0 14px ${b.color}40`,
                    ringColor: `${b.color}66`,
                  }}
                >
                  <BadgeGem badge={b} size={22} />
                  <span className="font-display text-[11.5px] font-black uppercase tracking-wider" style={{ color: b.color }}>
                    {b.label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* ---------------- Clips do membro (mesma ordem/estilo) ---------------- */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black uppercase sm:text-3xl">
              {souEu ? 'Os meus clips' : `Clips de ${p.username}`}
            </h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gray-300">
              {clips.length}
            </span>
          </div>

          {clips.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-violet-500/40 bg-violet-500/5 p-6 text-center">
              <Clapperboard className="mx-auto mb-2 h-7 w-7 text-violet-400" />
              <p className="font-bold text-white">Ainda sem clips</p>
              <p className="mx-auto max-w-md text-sm text-gray-400">
                {souEu
                  ? 'Publica o teu primeiro clip e ele aparece aqui, no teu perfil, com gostos e comentários.'
                  : `${p.username} ainda não publicou nenhum clip no site.`}
              </p>
            </div>
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
        </div>

        {/* ---------------- Ação (só se a página for tua) ---------------- */}
        {souEu && (
          <div className="flex flex-wrap gap-3">
            <Link
              to="/perfil"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Camera className="h-4 w-4" />
              Editar perfil
            </Link>
          </div>
        )}
    </PageShell>
  )
}
