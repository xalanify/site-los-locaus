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
import ProfileHero from '../components/ProfileHero'
import FeedToolbar from '../components/FeedToolbar'
import ProfileMusic from '../components/ProfileMusic'
import { bannerDe, corBordaDe, estiloFundo, fundoDe } from '../data/temasPerfil'
import { classesCard, classesNome } from '../data/nomeEfeitos'

/* ============================================================
   Perfil p�blico com página pr�pria � /perfil/:username

   O design e a ordem sóo EXATAMENTE os do perfil normal da
   sidebar (ProfilePage): saudação grande, cartão da conta com
   letra fantasma e anel violeta, distintivo DEV ao lado do
   nome, membro desde, rato/DPI, distinções e por fim os clips.
   Nenhum azulejo de contagens � nada de cartão de visitas.
   S� muda: � a página de OUTRO membro (ou fallback se o nome
   da rota n�o bater com o utilizador ligado).
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

  useEffect(() => {
    let vivo = true
    setData(null)
    setErro('')
    setCarregado(false)
    fetch(`/api/users/${encodeURIComponent(username)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        if (!r.ok) setErro(d?.error || 'Perfil n�o encontrado')
        else setData(d)
      })
      .catch(() => vivo && setErro('N�o deu para carregar o perfil.'))
      .finally(() => vivo && setCarregado(true))
    return () => {
      vivo = false
    }
  }, [username])

  /* Mensagens p�blicas deste membro (feed do perfil). */
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

  useEffect(() => {
    const root = document.documentElement
    document.body.classList.toggle('profile-bg', temFundo)
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
  }, [temFundo])

  /* Fonte do perfil removida � fica sempre a fonte Locaus padr�o. */
  useEffect(() => {
    const body = document.body
    body.classList.remove('profile-fonte')
    body.style.removeProperty('--perfil-fonte')
  }, [])

  if (!carregado) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center gap-3 pt-14">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        <p className="text-sm text-gray-500">A abrir o perfil�</p>
      </section>
    )
  }

  if (erro || !data) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-gray-300"
        >
          <UserRoundX className="h-4 w-4" /> Voltar
        </button>
        <Estado
          tipo="erro"
          icon={UserRoundX}
          titulo="Perfil n�o encontrado"
          texto={erro || 'Esta conta n�o existe ou foi removida.'}
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
  const jogosPerfil = [
    ...new Set([
      ...(p.game_accounts || []),
      ...jogosClips,
      ...Object.keys(p.game_ranks || {}),
    ]),
  ].filter((g) => g !== 'csgo')
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
    ? '�'
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  const badges = Array.isArray(p.badges) ? p.badges : []
  const distOc = distincoesOverclock(p.distincoes)
  const minhas = [
    ...badgesDe(badges),
    ...distOc,
  ]

  const avatarSrc = p.avatar_url || svgAvatar(p.username, '#a1a1aa')
  /* margem de casal: 0/1 clip p�blico da at� aparecer cheio */

  return (
    <PageShell
      background={estiloFundo(fundoAtual)}
      className={`profile-style profile-style--${p.profile_style || 'padrao'}`}
    >
        <ProfileHero
          perfil={p}
          avatarSrc={avatarSrc}
          nomeCls={nomeCls}
          corBorda={corBorda}
          badges={badges}
          minhas={minhas}
          criado={criado}
          memberId={p.display_id ?? p.id}
          clips={clips}
          jogos={jogosPerfil}
          gameRanks={p.game_ranks || {}}
          isOwn={souEu}
          onEdit={souEu ? () => setEditOpen(true) : undefined}
          onPrimary={() =>
            document.getElementById('publicacoes')?.scrollIntoView({ behavior: 'smooth' })
          }
          primaryLabel="Ver publicações"
        />

        {/* ---------------- Feed do membro: clips + mensagens ---------------- */}
        <div id="publicacoes" className="mb-8">
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

          <FeedToolbar
            filtro={filtroFeed}
            setFiltro={setFiltroFeed}
            jogos={jogosClips}
            jogo={jogoClips}
            setJogo={setJogoClips}
            ordem={ordemClips}
            setOrdem={setOrdemClips}
            mostrarFiltros={filtroFeed !== 'mensagens' && clips.length > 0}
          />

          {feedMostrado.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-500/40 bg-zinc-500/5 p-6 text-center">
              <Clapperboard className="mx-auto mb-2 h-7 w-7 text-zinc-400" />
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
                  : `${p.username} ainda n�o publicou nada no site.`}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedMostrado.map((f) =>
                f.tipo === 'clip' ? (
                  <div key={f.chave} className="mx-auto w-full max-w-4xl">
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
                className="ui-btn ui-btn-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                Painel Admin
              </button>
            )}
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
              Terminar sessóo
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
