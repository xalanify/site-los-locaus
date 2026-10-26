import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clapperboard,
  Camera,
  Loader2,
  UserRoundX,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import ClipCard from '../components/ClipCard'
import UserPostCard from '../components/UserPostCard'
import Estado from '../components/Estado'
import ProfilePage from './ProfilePage'
import { BadgeGem, badgesDe, devLabelClass, distincoesOverclock, nomeDouradoClass, temPrevisao1 } from '../components/BadgeGem'
import { authHeaders } from '../lib/auth'
import { searchMice } from '../data/mice'
import { gameLabel } from '../data/clipGames'
import { svgAvatar } from '../lib/avatar'
import PageShell from '../components/PageShell'
import ProfileBanner from '../components/ProfileBanner'
import ProfileMusic from '../components/ProfileMusic'
import { bannerDe, corBordaDe, estiloFundo, fundoDe } from '../data/temasPerfil'
import { fonteDe } from '../data/fontesPerfil'
import { extrairCores } from '../lib/coresFundo'
import { classesCard, classesNome } from '../data/nomeEfeitos'

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
export default function PublicProfilePage({
  user,
  onRequestAuth,
  onProfile,
  onUserUpdate,
  isAdmin,
  onPanelClick,
  onLogout,
}) {
  const { username } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [erro, setErro] = useState('')
  const [carregado, setCarregado] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [ordemClips, setOrdemClips] = useState('recentes')
  const [jogoClips, setJogoClips] = useState('')
  const [posts, setPosts] = useState([])
  const [filtroFeed, setFiltroFeed] = useState('tudo')
  const [coresExtra, setCoresExtra] = useState(null)

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

  /* Mensagens públicas deste membro (feed do perfil). */
  useEffect(() => {
    const uid = data?.profile?.id
    if (!uid) {
      setPosts([])
      return
    }
    let vivo = true
    fetch(`/api/posts?user_id=${encodeURIComponent(uid)}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => vivo && setPosts(Array.isArray(lista) ? lista : []))
      .catch(() => vivo && setPosts([]))
    return () => {
      vivo = false
    }
  }, [data?.profile?.id])

  const fundoAtual = fundoDe(data?.profile?.background_id)
  const temFundo = Boolean(fundoAtual.imagem)
  const dinamico = data?.profile?.dynamic_colors !== false && temFundo

  useEffect(() => {
    let vivo = true
    setCoresExtra(null)
    if (!temFundo || !dinamico) return
    extrairCores(fundoAtual.imagem).then((c) => {
      if (vivo && c) setCoresExtra(c)
    })
    return () => {
      vivo = false
    }
  }, [temFundo, dinamico, fundoAtual.imagem])

  const accent = coresExtra?.cor || fundoAtual.cor
  const accent2 = coresExtra?.cor2 || fundoAtual.cor2
  const accentRgb = coresExtra?.rgb || fundoAtual.rgb

  useEffect(() => {
    const root = document.documentElement
    document.body.classList.toggle('profile-bg', temFundo)
    if (!dinamico) {
      document.body.classList.remove('profile-theme')
      root.style.removeProperty('--perfil-accent')
      root.style.removeProperty('--perfil-accent-2')
      root.style.removeProperty('--perfil-accent-rgb')
      root.style.removeProperty('--aj-300')
      root.style.removeProperty('--aj-400')
      root.style.removeProperty('--aj-500')
      root.style.removeProperty('--aj-600')
      root.style.removeProperty('--aj-700')
      root.style.removeProperty('--aj-line')
      return () => document.body.classList.remove('profile-bg')
    }
    document.body.classList.add('profile-theme')
    root.style.setProperty('--perfil-accent', accent)
    root.style.setProperty('--perfil-accent-2', accent2)
    root.style.setProperty('--perfil-accent-rgb', accentRgb)
    root.style.setProperty('--aj-300', accentRgb)
    root.style.setProperty('--aj-400', accentRgb)
    root.style.setProperty('--aj-500', accentRgb)
    root.style.setProperty('--aj-600', accentRgb)
    root.style.setProperty('--aj-700', accentRgb)
    root.style.setProperty('--aj-line', `rgba(${accentRgb.split(' ').join(', ')}, 0.22)`)
    return () => {
      document.body.classList.remove('profile-theme')
      document.body.classList.remove('profile-bg')
      root.style.removeProperty('--perfil-accent')
      root.style.removeProperty('--perfil-accent-2')
      root.style.removeProperty('--perfil-accent-rgb')
      root.style.removeProperty('--aj-300')
      root.style.removeProperty('--aj-400')
      root.style.removeProperty('--aj-500')
      root.style.removeProperty('--aj-600')
      root.style.removeProperty('--aj-700')
      root.style.removeProperty('--aj-line')
    }
  }, [dinamico, fundoAtual.id, accent, accent2, accentRgb])

  const fonte = fonteDe(data?.profile?.fonte_perfil)
  useEffect(() => {
    const body = document.body
    if (!fonte.familia) {
      body.classList.remove('profile-fonte')
      body.style.removeProperty('--perfil-fonte')
      return
    }
    body.classList.add('profile-fonte')
    body.style.setProperty('--perfil-fonte', fonte.familia)
    return () => {
      body.classList.remove('profile-fonte')
      body.style.removeProperty('--perfil-fonte')
    }
  }, [fonte.id, fonte.familia])

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
  const corBorda = corBordaDe(p.borda_cor, tema.cor)
  const nomeCls = classesNome(p.name_color, p.name_effect)
  const clips = data.clips || []
  const jogosClips = [...new Set(clips.map((c) => c.game).filter(Boolean))]
  let clipsMostrados = [...clips]
  if (jogoClips) clipsMostrados = clipsMostrados.filter((c) => c.game === jogoClips)
  if (ordemClips === 'views') clipsMostrados.sort((a, b) => (b.views || 0) - (a.views || 0))
  else if (ordemClips === 'titulo')
    clipsMostrados.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'pt'))
  else if (ordemClips === 'jogo')
    clipsMostrados.sort((a, b) => gameLabel(a.game).localeCompare(gameLabel(b.game), 'pt'))
  else clipsMostrados.sort((a, b) => Number(b.id) - Number(a.id))

  const feedMostrado = [
    ...(filtroFeed === 'mensagens' ? [] : clipsMostrados).map((c) => ({
      tipo: 'clip',
      chave: `c${c.id}`,
      data: c.created_at,
      item: c,
    })),
    ...(filtroFeed === 'videos' ? [] : posts).map((p2) => ({
      tipo: 'post',
      chave: `p${p2.id}`,
      data: p2.created_at,
      item: p2,
    })),
  ].sort((a, b) => (new Date(b.data || 0).getTime() || 0) - (new Date(a.data || 0).getTime() || 0))
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
    ...badgesDe(badges),
    ...distOc,
  ]

  const avatarSrc = p.avatar_url || svgAvatar(p.username, '#8B5CF6')
  /* margem de casal: 0/1 clip público da até aparecer cheio */

  return (
    <PageShell background={estiloFundo(fundoAtual)}>
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
          className={`glass relative mb-8 overflow-hidden rounded-3xl border p-5 sm:p-6 ${classesCard(p.name_effect)}`}
          style={{
            borderColor: `${corBorda}66`,
            boxShadow: `0 0 40px ${corBorda}22, inset 0 0 0 1px ${corBorda}18`,
          }}
        >
          <ProfileBanner bannerId={p.banner_id} />
          {/* letra fantasma ao fundo */}
          <span className="pointer-events-none absolute -top-3 right-2 select-none font-display text-7xl font-black uppercase leading-none text-white/5">
            {p.username}
          </span>

          <div className="relative flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={avatarSrc}
                alt={p.username}
                className="h-16 w-16 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 2px ${corBorda}99, 0 0 26px ${corBorda}66` }}
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(p.username, '#8B5CF6')
                }}
              />
              {souEu && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  title="Editar foto e perfil"
                  className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#0a0813]/88 text-gray-300 ring-1 ring-white/25 transition-colors hover:bg-violet-500 hover:text-white"
                >
                  <Camera className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`truncate font-display text-xl font-black uppercase ${
                    nomeCls || (temPrevisao1(badges) ? nomeDouradoClass : 'text-white')
                  }`}
                >
                  {p.username}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                <span>Membro desde {criado}</span>
                <span
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-500"
                  title="ID da conta"
                >
                  ID {p.display_id ?? p.id}
                </span>
              </p>
              {p.mouse && (
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Mouse</span>
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
                    boxShadow: `0 0 14px ${b.glow || b.color}40`,
                    ringColor: `${b.glow || b.color}66`,
                  }}
                >
                  <BadgeGem badge={b} size={28} />
                  <span className="font-display text-[11.5px] font-black uppercase tracking-wider" style={{ color: b.labelColor || b.color }}>
                    {b.label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* ---------------- Feed do membro: clips + mensagens ---------------- */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2
              className="font-display text-2xl font-black uppercase sm:text-3xl"
              style={{ color: 'var(--perfil-accent, #fff)' }}
            >
              {souEu ? 'As minhas publicações' : `Publicações de ${p.username}`}
            </h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gray-300">
              {feedMostrado.length}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { id: 'tudo', label: 'Tudo' },
              { id: 'videos', label: 'Vídeos' },
              { id: 'mensagens', label: 'Mensagens' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroFeed(f.id)}
                className={`filtro-clips rounded-full border px-3 py-1.5 text-[11px] font-black ${
                  filtroFeed === f.id
                    ? 'border-white/60 bg-white/15 text-white'
                    : 'border-white/10 bg-[#17112a] text-gray-300 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtroFeed !== 'mensagens' && clips.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <select
                value={jogoClips}
                onChange={(e) => setJogoClips(e.target.value)}
                className="filtro-clips rounded-xl border border-white/10 bg-[#17112a] px-3 py-2 text-[11px] font-bold text-gray-200 outline-none"
              >
                <option value="">Todos os jogos</option>
                {jogosClips.map((g) => (
                  <option key={g} value={g}>
                    {gameLabel(g)}
                  </option>
                ))}
              </select>
              <select
                value={ordemClips}
                onChange={(e) => setOrdemClips(e.target.value)}
                className="filtro-clips rounded-xl border border-white/10 bg-[#17112a] px-3 py-2 text-[11px] font-bold text-gray-200 outline-none"
              >
                <option value="recentes">Mais recentes</option>
                <option value="views">Mais vistos</option>
                <option value="titulo">Título (A-Z)</option>
                <option value="jogo">Jogo (A-Z)</option>
              </select>
            </div>
          )}

          {feedMostrado.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-violet-500/40 bg-violet-500/5 p-6 text-center">
              <Clapperboard className="mx-auto mb-2 h-7 w-7 text-violet-400" />
              <p className="font-bold text-white">
                {filtroFeed === 'mensagens'
                  ? 'Ainda sem mensagens'
                  : filtroFeed === 'videos'
                    ? 'Ainda sem clips'
                    : 'Ainda sem publicações'}
              </p>
              <p className="mx-auto max-w-md text-sm text-gray-400">
                {souEu
                  ? 'Publica um clip ou uma mensagem e aparece aqui no teu perfil.'
                  : `${p.username} ainda não publicou nada no site.`}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedMostrado.map((f) =>
                f.tipo === 'clip' ? (
                  <div key={f.chave} className="mx-auto w-full max-w-3xl">
                    <ClipCard
                      clip={f.item}
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
                      transparent
                    />
                  </div>
                ) : (
                  <UserPostCard
                    key={f.chave}
                    post={f.item}
                    viewer={user}
                    autor={p}
                    onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* ---------------- Ações (só se a página for tua) ---------------- */}
        {souEu && (
          <div className="flex flex-wrap justify-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={onPanelClick}
                className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-violet-400 glow-violet"
              >
                <LayoutDashboard className="h-4 w-4" />
                Painel Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Camera className="h-4 w-4" />
              Editar perfil
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('locaus:abrir-novidades'))}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
              Novidades
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/15"
            >
              <LogOut className="h-4 w-4" />
              Terminar sessão
            </button>
          </div>
        )}
        {souEu && editOpen && (
          <ProfilePage
            standaloneEdit
            user={user}
            isAdmin={isAdmin}
            onLogout={onLogout}
            onPanelClick={onPanelClick}
            onAuthClick={onRequestAuth}
            onProfile={onProfile}
            onUserUpdate={(d) => {
              setData((prev) =>
                prev ? { ...prev, profile: { ...prev.profile, ...d } } : prev,
              )
              if (onUserUpdate) onUserUpdate(d)
            }}
            onCloseEdit={() => setEditOpen(false)}
          />
        )}
        <ProfileMusic
          musicaId={p.musica_id}
          musicaUrl={p.musica_url}
          musicaNome={p.musica_nome}
        />
    </PageShell>
  )
}
