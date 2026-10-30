import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clapperboard,
  LogOut,
  LayoutDashboard,
  RefreshCcw,
  Camera,
  Loader2,
  Check,
  Upload,
  ZoomIn,
  X,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Music,
  User,
  Share2,
  Radio,
  CreditCard,
} from 'lucide-react'
import PlatformIcon from '../components/PlatformIcon'
import { BadgeGem, badgesDe, devLabelClass, distincoesOverclock, nomeDouradoClass, temPrevisao1, hexToRgba } from '../components/BadgeGem'
import ClipCard from '../components/ClipCard'
import UserPostCard from '../components/UserPostCard'
import { searchMice } from '../data/mice'
import { gameLabel } from '../data/clipGames'
import { svgAvatar } from '../lib/avatar'
import PageShell from '../components/PageShell'
import ProfileHero from '../components/ProfileHero'
import ProfileCard from '../components/ProfileCard'
import ProfileStylePreview from '../components/ProfileStylePreview'
import FeedToolbar from '../components/FeedToolbar'
import ProfileMusic from '../components/ProfileMusic'
import {
  BANNERS,
  FUNDOS,
  MUSICAS,
  CORES_BORDA,
  bannerDe,
  corBordaDe,
  estiloFundo,
  fundoDe,
  musicaDe,
} from '../data/temasPerfil'
import { CORES_NOME, EFEITOS_NOME, classesCard, classesNome } from '../data/nomeEfeitos'
import { toast } from '../components/Feedback'
import { useLive } from '../lib/live'

/* ============================================================
   Perfil da conta — abre ao clicar no ícone de Conta.
   - Foto de perfil: o utilizador ESCOLHE UM FICHEIRO e o site
     guarda-o no servidor, associando o link à conta.
   - Distinções obtidas (DEV fica só na chip ao lado do nome) —
     dados frescos ao abrir o perfil.
   - A ligação automática ao CS2 (TOP 1 KILL) funciona nos
     bastidores, sem mostrar nada no perfil.
   ============================================================ */
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('userToken') || localStorage.getItem('adminToken')}`,
})

const TOKEN = () => localStorage.getItem('userToken') || localStorage.getItem('adminToken')

const SECOES_EDIT = [
  { id: 'perfil', nome: 'Perfil', Icon: User },
  { id: 'banner', nome: 'Banner', Icon: ImageIcon },
  { id: 'fundo', nome: 'Fundo', Icon: ImageIcon },
  { id: 'estilo', nome: 'Estilo', Icon: Palette },
  { id: 'carta', nome: 'Carta', Icon: CreditCard },
  { id: 'estiloPerfil', nome: 'Estilo de perfil', Icon: Sparkles },
  { id: 'musica', nome: 'Música', Icon: Music },
  { id: 'redes', nome: 'Redes & live', Icon: Share2 },
]

const CARD_STYLES = [
  { id: 'padrao', nome: 'Padrão Locaus' },
  { id: 'license', nome: 'Aimer License' },
  { id: 'kova', nome: 'Kova' },
  { id: 'dvd', nome: 'Red DVD' },
  { id: 'felony', nome: 'Felony' },
  { id: 'neon', nome: 'Neon' },
  { id: 'blood', nome: 'Blood' },
  { id: 'cosmic', nome: 'Cosmic' },
  { id: 'crimson', nome: 'Crimson' },
  { id: 'violet', nome: 'Violet' },
  { id: 'sleepin', nome: 'Sleepin' },
  { id: 'river', nome: 'River' },
  { id: 'dev', nome: 'Desenvolvedor', adminOnly: true },
]

const PROFILE_STYLES = [
  { id: 'padrao', nome: 'Padrão Locaus' },
  { id: 'felony', nome: 'Felony' },
  { id: 'neon', nome: 'Neon' },
  { id: 'blood', nome: 'Blood' },
  { id: 'cosmic', nome: 'Cosmic' },
  { id: 'crimson', nome: 'Crimson' },
  { id: 'm1key', nome: 'M1KEY' },
  { id: 'monarcs', nome: 'Monarcs' },
  { id: 'pyvno', nome: 'Pyvno' },
  { id: 'speedy', nome: 'Speedy' },
  { id: 'lafayette', nome: 'Lafayette' },
  { id: 'saowur', nome: 'Saowur' },
  { id: 'kichies', nome: 'Kichies' },
]

const REDES_SOCIAIS = [
  { id: 'youtube', nome: 'YouTube', placeholder: '@canal ou link do canal' },
  { id: 'twitch', nome: 'Twitch', placeholder: '@canal ou link da twitch' },
  { id: 'tiktok', nome: 'TikTok', placeholder: '@perfil ou link do tiktok' },
  { id: 'kick', nome: 'Kick', placeholder: '@canal ou link da kick' },
]

const PLATAFORMAS_LIVE = [
  { id: 'youtube', nome: 'YouTube' },
  { id: 'twitch', nome: 'Twitch' },
  { id: 'tiktok', nome: 'TikTok' },
  { id: 'kick', nome: 'Kick' },
]

const formDe = (u) => ({
  game_nick: u?.game_nick || '',
  mouse: u?.mouse || '',
  dpi: u?.dpi || '',
  banner_id: u?.banner_id || '',
  background_id: u?.background_id || '',
  musica_id: u?.musica_id || '',
  musica_url: u?.musica_url || '',
  musica_nome: u?.musica_nome || '',
  dynamic_colors: u?.dynamic_colors !== false,
  name_color: u?.name_color || '',
  name_effect: u?.name_effect || '',
  borda_cor: u?.borda_cor || 'preto',
  card_style: u?.card_style || 'padrao',
  profile_style: u?.profile_style || 'padrao',
  cs2_inventory_eur: u?.cs2_inventory_eur ?? 0,
  socials: u?.socials && typeof u.socials === 'object' ? u.socials : {},
})

const CROP = 288
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function ProfilePage({
  user,
  isAdmin,
  onLogout,
  onPanelClick,
  onAuthClick,
  onUserUpdate,
  onProfile,
  standaloneEdit = false,
  onCloseEdit,
}) {
  const location = useLocation()
  const [me, setMe] = useState(user)
  const [edit, setEdit] = useState(Boolean(standaloneEdit))
  const [secaoEdit, setSecaoEdit] = useState('perfil')
  const [previewTema, setPreviewTema] = useState(null)
  const [musicaQ, setMusicaQ] = useState('')
  const [musicaResultados, setMusicaResultados] = useState([])
  const [musicaLoading, setMusicaLoading] = useState(false)
  const [musicaAlterada, setMusicaAlterada] = useState(false)
  const [form, setForm] = useState(() => formDe(user))
  const abriuState = useRef(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [crop, setCrop] = useState(null)
  const cropImgRef = useRef(null)
  const cropDragRef = useRef(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aSyncInv, setASyncInv] = useState(false)
  const [mouseSug, setMouseSug] = useState([])
  const [myClips, setMyClips] = useState([]) // publicações desta conta
  const [myPosts, setMyPosts] = useState([]) // mensagens desta conta
  const [filtroFeed, setFiltroFeed] = useState('tudo') // tudo | videos | mensagens
  const [ordemClips, setOrdemClips] = useState('recentes')
  const [jogoClips, setJogoClips] = useState('')
  const [err, setErr] = useState('')
  const { liveByUser } = useLive()
  const minhaLive = me?.username ? liveByUser[String(me.username).toLowerCase()] : null
  const fileRef = useRef(null)

  /* Sempre que o perfil abre: dados frescos (distinções atribuídas
     no painel, foto) sem precisar de recarregar a página. */
  useEffect(() => {
    let vivo = true
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d && d.id) {
          setMe(d)
          if (onUserUpdate) onUserUpdate(d)
        }
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  /* Clips/publicações desta conta */
  useEffect(() => {
    let vivo = true
    fetch('/api/clips?mine=1', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => vivo && setMyClips(Array.isArray(list) ? list : []))
      .catch(() => {})
    fetch('/api/posts?mine=1', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => vivo && setMyPosts(Array.isArray(list) ? list : []))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  /* Veio do botão "Editar perfil" do perfil público -> abre logo a janela */
  useEffect(() => {
    if (!location.state?.abrirEditar || !me || abriuState.current) return
    abriuState.current = true
    setForm(formDe(me))
    setMusicaAlterada(false)
    setEdit(true)
  }, [location.state, me])

  /* Modo "janela sobre o perfil público": ao fechar, avisa o pai */
  useEffect(() => {
    if (standaloneEdit && !edit) onCloseEdit?.()
  }, [standaloneEdit, edit, onCloseEdit])

  const fundoAtual = fundoDe(me?.background_id)
  const temFundo = Boolean(fundoAtual.imagem)

  /* O fundo personalizado já não muda as cores do site. Só deixa os
     painéis/cartões mais transparentes para a imagem se ver melhor. */
  useEffect(() => {
    if (standaloneEdit) return
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
  }, [temFundo, standaloneEdit])

  /* A fonte do perfil foi removida: garante sempre a fonte Locaus padrão. */
  useEffect(() => {
    const body = document.body
    body.classList.remove('profile-fonte')
    body.style.removeProperty('--perfil-fonte')
  }, [])

  if (!me) return null

  const d = new Date(me.created_at)
  const criado = Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  const badges = Array.isArray(me.badges) ? me.badges : []
  /* chips em baixo: todas menos a DEV (essa fica só ao lado do nome) */
  const distOc = distincoesOverclock(me.distincoes)
  const minhas = [
    ...badgesDe([...badges, ...(isAdmin ? ['dev'] : [])]),
    ...distOc,
  ]

  const avatarSrc = me.avatar_url || svgAvatar(me.username, '#a1a1aa')

  const abrirEditar = () => {
    // game_nick mantém-se guardado (liga o TOP 1 KILL ao CS2) — invisível no perfil
    setForm(formDe(me))
    setAvatarFile(null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    setRemoveAvatar(false)
    setErr('')
    setMusicaAlterada(false)
    setSecaoEdit('perfil')
    setEdit(true)
  }

  const fecharEditar = () => {
    if (standaloneEdit) {
      onCloseEdit?.()
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    setAvatarFile(null)
    setRemoveAvatar(false)
    setErr('')
    setEdit(false)
    if (location.state?.abrirEditar && onProfile) onProfile(me.username)
  }

  /* utilizador escolhe um ficheiro de imagem */
  const onPick = (f) => {
    setErr('')
    if (!f) return
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
      setErr('Formato não suportado — usa JPG, PNG, WebP ou GIF.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr('A foto é demasiado grande (máx. 5 MB).')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      cropImgRef.current = img
      setCrop({ src: url, w: img.naturalWidth, h: img.naturalHeight, zoom: 1, x: 0, y: 0 })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setErr('Não foi possível abrir esta imagem.')
    }
    img.src = url
    setRemoveAvatar(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  /* limites do arrasto: a imagem tem de cobrir o quadrado */
  const limitesCrop = (c) => {
    if (!c) return { maxX: 0, maxY: 0 }
    const escala = Math.max(CROP / c.w, CROP / c.h) * c.zoom
    return {
      maxX: Math.max(0, (c.w * escala - CROP) / 2),
      maxY: Math.max(0, (c.h * escala - CROP) / 2),
    }
  }

  const fecharCrop = () => {
    if (crop && crop.src) URL.revokeObjectURL(crop.src)
    setCrop(null)
    cropImgRef.current = null
    cropDragRef.current = null
  }

  const aplicarCrop = () => {
    const img = cropImgRef.current
    if (!img || !crop) return
    const OUT = 512
    const escala = Math.max(CROP / crop.w, CROP / crop.h) * crop.zoom
    const ratio = OUT / CROP
    const dw = crop.w * escala * ratio
    const dh = crop.h * escala * ratio
    const dx = OUT / 2 + crop.x * ratio - dw / 2
    const dy = OUT / 2 + crop.y * ratio - dh / 2
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#101012'
    ctx.fillRect(0, 0, OUT, OUT)
    ctx.drawImage(img, dx, dy, dw, dh)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErr('Não foi possível recortar a imagem.')
          return
        }
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
        if (avatarPreview) URL.revokeObjectURL(avatarPreview)
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
        setRemoveAvatar(false)
        fecharCrop()
      },
      'image/jpeg',
      0.92,
    )
  }

  const cropDown = (e) => {
    if (!crop) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    cropDragRef.current = { sx: e.clientX, sy: e.clientY, x: crop.x, y: crop.y }
  }

  const cropMove = (e) => {
    if (!crop || !cropDragRef.current) return
    const { maxX, maxY } = limitesCrop(crop)
    const d = cropDragRef.current
    setCrop((c) => ({
      ...c,
      x: clamp(d.x + (e.clientX - d.sx), -maxX, maxX),
      y: clamp(d.y + (e.clientY - d.sy), -maxY, maxY),
    }))
  }

  const cropUp = () => {
    cropDragRef.current = null
  }

  const procurarMusica = async (e) => {
    e?.preventDefault()
    const q = musicaQ.trim()
    if (!q) return
    setMusicaLoading(true)
    setMusicaResultados([])
    try {
      const r = await fetch(`/api/admin/musica/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => ({}))
      setMusicaResultados(Array.isArray(d?.resultados) ? d.resultados : [])
    } catch {
      setMusicaResultados([])
    } finally {
      setMusicaLoading(false)
    }
  }

  const sincronizarInventario = async () => {
    setASyncInv(true)
    try {
      const r = await fetch('/api/users/cs2-inventory/sync', {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error((d && d.error) || 'Não foi possível atualizar.')
      const me2 = await fetch('/api/users/me', {
        headers: authHeaders(),
        cache: 'no-store',
      })
        .then((x) => (x.ok ? x.json() : null))
        .catch(() => null)
      if (me2) {
        setMe(me2)
        setForm((f) => ({ ...f, cs2_inventory_eur: me2.cs2_inventory_eur ?? 0 }))
      }
      toast.ok('Inventários CS2 atualizados.')
    } catch (e) {
      toast.erro(e.message || 'Não foi possível atualizar os inventários.')
    } finally {
      setASyncInv(false)
    }
  }

  const guardar = async () => {
    if (saving) return
    setSaving(true)
    setErr('')
    try {
      // 1) foto escolhida â†’ o site guarda o ficheiro e associa o link à conta
      if (avatarFile) {
        const up = await fetch('/api/users/me/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': avatarFile.type || 'image/jpeg',
            Authorization: `Bearer ${TOKEN()}`,
          },
          body: avatarFile,
        })
        const d1 = await up.json().catch(() => ({}))
        if (!up.ok) {
          setErr(d1.error || 'Erro ao enviar a foto.')
          return
        }
        setMe(d1)
        if (onUserUpdate) onUserUpdate(d1)
      }

      // 2) guardar (+ remoção da foto atual, se pedida); o nick guardado
      //    (ligação ao CS2) é preservado sem nunca aparecer no perfil
      const body = {
        game_nick: form.game_nick,
        mouse: form.mouse,
        dpi: form.dpi,
        banner_id: form.banner_id,
        background_id: form.background_id,
        musica_id: form.musica_id,
        dynamic_colors: form.dynamic_colors,
        ...(isAdmin || me.is_admin
          ? {
              musica_url: form.musica_url,
              musica_nome: form.musica_nome,
              name_color: form.name_color,
              name_effect: form.name_effect,
              card_style: form.card_style,
              profile_style: form.profile_style,
              cs2_inventory_eur: Number(form.cs2_inventory_eur) || 0,
              socials: form.socials,
            }
          : {}),
        borda_cor: form.borda_cor,
        musica_alterada: musicaAlterada,
      }
      if (removeAvatar && !avatarFile) body.avatar_url = ''

      const res = await fetch('/api/users/me/profile', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const d2 = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(d2.error || 'Erro ao guardar o perfil.')
        return
      }
      setMe(d2)
      if (onUserUpdate) onUserUpdate(d2)

      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarFile(null)
      setAvatarPreview('')
      setRemoveAvatar(false)
      setEdit(false)
      if (!standaloneEdit && location.state?.abrirEditar && onProfile) onProfile(d2.username)
    } catch {
      setErr('Sem ligação ao servidor.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15'

  const mostrarFotoAtual = me.avatar_url && !removeAvatar && !avatarFile
  const tema = bannerDe(me.banner_id)
  const corBorda = corBordaDe(edit ? form.borda_cor : me.borda_cor, tema.cor)
  const nomeCls = classesNome(me.name_color, me.name_effect)
  const jogosClips = [...new Set(myClips.map((c) => c.game).filter(Boolean))]
  const jogosPerfil = [
    ...new Set([
      ...(me.game_accounts || []),
      ...jogosClips,
      ...Object.keys(me.game_ranks || {}),
    ]),
  ].filter((g) => g !== 'csgo')
  const clipsMostrados = useMemo(() => {
    let lista = [...myClips]
    if (jogoClips) lista = lista.filter((c) => c.game === jogoClips)
    if (ordemClips === 'views') lista.sort((a, b) => (b.views || 0) - (a.views || 0))
    else if (ordemClips === 'titulo') lista.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'pt'))
    else if (ordemClips === 'jogo') lista.sort((a, b) => gameLabel(a.game).localeCompare(gameLabel(b.game), 'pt'))
    else lista.sort((a, b) => Number(b.id) - Number(a.id))
    return lista
  }, [myClips, jogoClips, ordemClips])

  /* Feed do perfil: clips (vídeos) + mensagens, por ordem do mais recente. */
  const feedMostrado = useMemo(() => {
    const clips = filtroFeed === 'mensagens' ? [] : clipsMostrados
    const posts = filtroFeed === 'videos' ? [] : myPosts
    return [
      ...clips.map((c) => ({ tipo: 'clip', chave: `c${c.id}`, data: c.created_at, item: c })),
      ...posts.map((p) => ({ tipo: 'post', chave: `p${p.id}`, data: p.created_at, item: p })),
    ].sort((a, b) => {
      const ta = new Date(a.data || 0).getTime() || 0
      const tb = new Date(b.data || 0).getTime() || 0
      return tb - ta
    })
  }, [clipsMostrados, myPosts, filtroFeed])

  const modalEdicao = edit ? (

            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
              <div className="glass max-h-[92dvh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-3xl border border-zinc-500/30 p-4 shadow-2xl sm:p-6">
              <div className="sticky -top-4 z-20 -mx-4 -mt-4 mb-2 flex items-start justify-between gap-3 border-b border-white/10 bg-[#141416]/95 px-4 py-3 backdrop-blur sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6">
                <div>
                  <h2 className="font-display text-xl font-black text-white">Editar perfil</h2>
                  <p className="text-xs text-gray-400">
                    Foto, banners, fundos, música e estilo do teu perfil.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharEditar}
                  className="rounded-full bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* separadores do editor */}
              <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1.5">
                {SECOES_EDIT.filter(
                  (s) =>
                    (s.id !== 'redes' || me?.is_admin) &&
                    (s.id !== 'carta' || me?.is_admin) &&
                    (s.id !== 'estiloPerfil' || me?.is_admin),
                ).map(({ id, nome, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSecaoEdit(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-black transition-colors ${
                      secaoEdit === id
                        ? 'bg-zinc-500 text-white shadow-lg shadow-zinc-900/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {nome}
                  </button>
                ))}
              </div>

              {/* Foto de perfil */}
              <section className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${secaoEdit === 'perfil' ? '' : 'hidden'}`}>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                  Foto de perfil
                </h3>
              {/* escolher ficheiro */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current && fileRef.current.click()}
                  className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Upload className="h-4 w-4" />
                  {avatarFile ? 'Trocar foto' : 'Escolher foto'}
                </button>
                {!avatarFile && me.avatar_url && !removeAvatar && (
                  <button
                    type="button"
                    onClick={() => setRemoveAvatar(true)}
                    className="text-xs font-bold text-red-400 transition-colors hover:text-red-300"
                  >
                    Remover foto
                  </button>
                )}
                <span className="text-[11px] text-gray-500">JPG, PNG, WebP ou GIF · máx. 5 MB</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onPick(e.target.files && e.target.files[0])}
              />

              {/* pré-visualização / aviso de remoção */}
              {avatarPreview && (
                <div className="flex items-center gap-3">
                  <img
                    src={avatarPreview}
                    alt="Pré-visualização"
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-500/50"
                  />
                  <span className="text-xs text-gray-400">
                    Pré-visualização — será guardada ao clicar em Guardar.
                  </span>
                </div>
              )}
              {!avatarFile && mostrarFotoAtual && (
                <div className="flex items-center gap-3">
                  <img
                    src={me.avatar_url}
                    alt="Foto atual"
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-500/50"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="text-xs text-gray-400">Foto atual</span>
                </div>
              )}
              {removeAvatar && (
                <p className="text-xs font-bold text-red-400">
                  A tua foto atual será removida ao guardar.
                </p>
              )}
              </section>

              {/* recortar / arrastar a foto antes de guardar */}
              {crop &&
                createPortal(
                  <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm"
                    onClick={fecharCrop}
                  >
                    <div
                      className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101012] p-4 shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-black text-white">Recortar foto</h3>
                        <button
                          type="button"
                          onClick={fecharCrop}
                          className="rounded-lg bg-white/10 p-1.5 text-gray-300 hover:bg-white/20 hover:text-white"
                          aria-label="Fechar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div
                        className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-black ring-2 ring-zinc-500/50"
                        style={{ width: CROP, height: CROP, cursor: 'grab' }}
                        onPointerDown={cropDown}
                        onPointerMove={cropMove}
                        onPointerUp={cropUp}
                        onPointerCancel={cropUp}
                      >
                        <img
                          src={crop.src}
                          alt="Recorte"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: crop.w * Math.max(CROP / crop.w, CROP / crop.h) * crop.zoom,
                            height: crop.h * Math.max(CROP / crop.w, CROP / crop.h) * crop.zoom,
                            maxWidth: 'none',
                            transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px)`,
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>

                      <p className="mt-2 text-center text-[10px] text-gray-500">
                        Arrasta a foto para centrar · usa o zoom para aproximar
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <ZoomIn className="h-4 w-4 shrink-0 text-gray-400" />
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={crop.zoom}
                          onChange={(e) => {
                            const zoom = Number(e.target.value)
                            setCrop((c) => {
                              if (!c) return c
                              const { maxX, maxY } = limitesCrop({ ...c, zoom })
                              return {
                                ...c,
                                zoom,
                                x: clamp(c.x, -maxX, maxX),
                                y: clamp(c.y, -maxY, maxY),
                              }
                            })
                          }}
                          className="h-1.5 w-full accent-zinc-500"
                        />
                        <span className="w-9 shrink-0 text-right text-[10px] font-bold tabular-nums text-gray-400">
                          {crop.zoom.toFixed(1)}×
                        </span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={fecharCrop}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-black text-gray-300 hover:bg-white/10 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={aplicarCrop}
                          className="flex-1 rounded-xl bg-zinc-500 py-2 text-xs font-black text-white transition hover:bg-zinc-400"
                        >
                          Aplicar recorte
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )}

              {/* Rato + DPI */}
              <section className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${secaoEdit === 'perfil' ? '' : 'hidden'}`}>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                  Rato e DPI
                </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400">O teu rato (mouse)</label>
                <div className="relative">
                  <input
                    value={form.mouse}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, mouse: e.target.value }))
                      setMouseSug(searchMice(e.target.value))
                    }}
                    onFocus={() => setMouseSug(searchMice(form.mouse))}
                    onBlur={() => setTimeout(() => setMouseSug([]), 150)}
                    placeholder="Ex.: Razer Viper V3 Pro"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-zinc-500/50 focus:outline-none"
                  />
                  {mouseSug.length > 0 && (
                    <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#1a1428] py-1 shadow-lg">
                      {mouseSug.map((m, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onMouseDown={() => {
                              setForm((f) => ({ ...f, mouse: `${m.brand} ${m.model}` }))
                              setMouseSug([])
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-white/10"
                          >
                            {m.logo && (
                              <img src={m.logo} alt="" className="h-4 w-4 rounded-sm object-contain" />
                            )}
                            <span>
                              <span className="font-bold">{m.brand}</span> {m.model}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400">DPI</label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    value={form.dpi}
                    onChange={(e) => setForm((f) => ({ ...f, dpi: e.target.value }))}
                    placeholder="Ex.: 800"
                    className="w-32 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-zinc-500/50 focus:outline-none"
                  />
                </div>
              </div>
              </div>
              </section>

              {/* Banner animado do perfil */}
              <section className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${secaoEdit === 'banner' || secaoEdit === 'fundo' ? '' : 'hidden'}`}>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                  {secaoEdit === 'banner' ? 'Banner do perfil' : 'Fundo da página'}
                </h3>
              <div className={secaoEdit === 'banner' ? '' : 'hidden'}>
                <label className="block text-xs font-bold text-gray-400">Banner do perfil</label>
                <p className="mb-2 text-[11px] text-gray-500">
                  O mesmo tema aparece no teu cartão em Membros e Membros online.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BANNERS.map((b) => (
                    <div key={b.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, banner_id: b.id }))}
                        className={`w-full rounded-xl border p-1.5 text-left transition-colors ${
                          form.banner_id === b.id
                            ? 'border-white/60 bg-white/10'
                            : 'border-white/10 bg-black/20 hover:border-white/30'
                        }`}
                      >
                        {b.ficheiro ? (
                          <img
                            src={b.ficheiro}
                            alt=""
                            loading="lazy"
                            className="block h-16 w-full rounded-md object-cover sm:h-20"
                          />
                        ) : (
                          <span className="block h-16 w-full rounded-md bg-gradient-to-br from-[#1b1230] to-[#0b0b0c] sm:h-20" />
                        )}
                        <span className="mt-1 block truncate text-[10px] font-bold text-gray-300">
                          {b.nome}
                        </span>
                      </button>
                      {b.ficheiro && (
                        <button
                          type="button"
                          onClick={() => setPreviewTema(b.ficheiro)}
                          className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                          title="Ver imagem"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fundo da página do perfil */}
              <div className={secaoEdit === 'fundo' ? '' : 'hidden'}>
                <label className="block text-xs font-bold text-gray-400">Fundo da página</label>
                <p className="mb-2 text-[11px] text-gray-500">
                  Muda o ambiente quando alguém abre o teu perfil.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {FUNDOS.map((f) => (
                    <div key={f.id || 'padrao'} className="relative">
                      <button
                        type="button"
                        title={f.nome}
                        onClick={() => setForm((f2) => ({ ...f2, background_id: f.id }))}
                        className={`w-full rounded-xl border p-1 transition-colors ${
                          form.background_id === f.id
                            ? 'border-white/60 bg-white/10'
                            : 'border-white/10 bg-black/20 hover:border-white/30'
                        }`}
                      >
                        {f.imagem ? (
                          <img
                            src={f.imagem}
                            alt=""
                            loading="lazy"
                            className="block h-20 w-full rounded-md object-cover sm:h-24"
                          />
                        ) : (
                          <span
                            className="block h-20 w-full rounded-md sm:h-24"
                            style={{ background: 'linear-gradient(135deg, #1b1230, #0b0b0c)' }}
                          />
                        )}
                        <span className="mt-1 block truncate text-[9px] font-bold text-gray-400">
                          {f.nome}
                        </span>
                      </button>
                      {f.imagem && (
                        <button
                          type="button"
                          onClick={() => setPreviewTema(f.imagem)}
                          className="absolute right-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                          title="Ver imagem"
                        >
                          <ZoomIn className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              </section>

              {/* Cor das linhas / brilho do cartão e do avatar */}
              <section className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${secaoEdit === 'estilo' ? '' : 'hidden'}`}>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                  Estilo do perfil
                </h3>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-xs font-bold text-gray-300">Linhas e brilho do perfil</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  A linha do banner, o brilho do cartão e o anel da foto.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CORES_BORDA.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, borda_cor: b.id }))}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                        form.borda_cor === b.id
                          ? 'border-white/60 bg-white/15 text-white'
                          : 'border-white/10 bg-black/20 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle ring-1 ring-white/30"
                        style={{ background: b.cor || tema.cor }}
                      />
                      {b.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fonte dos textos do perfil — removida (fonte Locaus padrão) */}

              {/* Fundo personalizado — transparência dos painéis */}
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-xs font-bold text-gray-300">Fundo personalizado</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  As cores do site mantêm-se iguais. Quando escolhes um fundo, os sidebars,
                  cartões e painéis ficam mais transparentes para a imagem se ver melhor.
                </p>
              </div>
              </section>

              {/* Música do perfil */}
              <section className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${secaoEdit === 'musica' ? '' : 'hidden'}`}>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                  Música do perfil
                </h3>
              <div>
                <label className="block text-xs font-bold text-gray-400">Música do perfil</label>
                <p className="mb-2 text-[11px] text-gray-500">
                  Toca baixinho quando alguém abre o teu perfil. Podes pausar ou ajustar o volume.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMusicaAlterada(true)
                      setForm((f) => ({ ...f, musica_id: '', musica_url: '', musica_nome: '' }))
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                      !form.musica_id && !form.musica_url
                        ? 'border-white/60 bg-white/15 text-white'
                        : 'border-white/10 bg-black/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    Sem música
                  </button>
                  {MUSICAS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMusicaAlterada(true)
                        setForm((f) => ({
                          ...f,
                          musica_id: m.id,
                          musica_url: '',
                          musica_nome: '',
                        }))
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                        form.musica_id === m.id
                          ? 'border-white/60 bg-white/15 text-white'
                          : 'border-white/10 bg-black/20 text-gray-400 hover:text-white'
                      }`}
                    >
                      {m.nome}
                    </button>
                  ))}
                </div>
                {form.musica_id && musicaDe(form.musica_id) && (
                  <audio
                    key={form.musica_id}
                    src={musicaDe(form.musica_id).ficheiro}
                    controls
                    preload="none"
                    className="mt-2 h-8 w-full"
                    ref={(el) => {
                      if (el) el.volume = 0.12
                    }}
                  />
                )}

                {(isAdmin || me.is_admin) && (
                  <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Pesquisar música (admin)
                    </p>
                    <form onSubmit={procurarMusica} className="mt-2 flex gap-2">
                      <input
                        value={musicaQ}
                        onChange={(e) => setMusicaQ(e.target.value)}
                        placeholder="Ex.: GTA 5 theme, COD WaW…"
                        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-amber-400/50"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-black hover:bg-amber-400"
                      >
                        {musicaLoading ? '…' : 'Procurar'}
                      </button>
                    </form>
                    {form.musica_url && (
                      <p className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-gray-300">
                        <span className="truncate">
                          Música escolhida: <b className="text-white">{form.musica_nome}</b>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, musica_url: '', musica_nome: '' }))
                          }
                          className="shrink-0 text-red-300 hover:text-red-200"
                        >
                          Remover
                        </button>
                      </p>
                    )}
                    {musicaResultados.length > 0 && (
                      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                        {musicaResultados.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                musica_id: '',
                                musica_url: `yt:${m.id}`,
                                musica_nome: m.titulo,
                              }))
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/10"
                          >
                            {m.thumb && (
                              <img src={m.thumb} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-bold text-white">
                                {m.titulo}
                              </span>
                              <span className="block truncate text-[10px] text-gray-500">{m.canal}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </section>

              {(isAdmin || me.is_admin) && (
                <div className={`rounded-xl border border-[#ff9e9e]/20 bg-[#ff9e9e]/[0.03] p-3 ${secaoEdit === 'carta' ? '' : 'hidden'}`}>
                  <p className="text-xs font-black uppercase tracking-wider text-[#ff9e9e]">
                    Carta do perfil (admin)
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Muda o estilo da carta na aba Cartas e no teu perfil.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {CARD_STYLES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, card_style: c.id }))}
                        className={`rounded-xl border p-1.5 text-left transition-colors ${
                          form.card_style === c.id
                            ? 'border-[#ff9e9e]/60 bg-[#ff9e9e]/5'
                            : 'border-white/10 bg-black/20 hover:border-white/25'
                        }`}
                      >
                        <ProfileCard
                          perfil={{ ...me, ...form, card_style: c.id }}
                          variant={c.id}
                          jogos={jogosPerfil}
                          className="w-full"
                        />
                        <span className="mt-1.5 block px-1 text-[10px] font-bold text-zinc-300">
                          {c.nome}
                        </span>
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block text-xs font-bold text-gray-400">
                    Inventário CS2 (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cs2_inventory_eur}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cs2_inventory_eur: e.target.value }))
                    }
                    className={inputCls}
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    O badge de inventário mais caro é atribuído automaticamente a quem tiver o
                    valor mais alto.
                  </p>
                  <button
                    type="button"
                    onClick={sincronizarInventario}
                    disabled={aSyncInv}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCcw className={`h-3 w-3 ${aSyncInv ? 'animate-spin' : ''}`} />
                    {aSyncInv ? 'A atualizar…' : 'Atualizar automaticamente'}
                  </button>
                </div>
              )}

              {(isAdmin || me.is_admin) && (
                <div className={`rounded-xl border border-[#ff9e9e]/20 bg-[#ff9e9e]/[0.03] p-3 ${secaoEdit === 'estiloPerfil' ? '' : 'hidden'}`}>
                  <p className="text-xs font-black uppercase tracking-wider text-[#ff9e9e]">
                    Estilo de perfil (admin)
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Muda o design da página do teu perfil.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {PROFILE_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, profile_style: s.id }))}
                        className={`rounded-xl border p-1.5 text-left transition-colors ${
                          form.profile_style === s.id
                            ? 'border-[#ff9e9e]/60 bg-[#ff9e9e]/5'
                            : 'border-white/10 bg-black/20 hover:border-white/25'
                        }`}
                      >
                        <ProfileStylePreview style={s.id} nome={me.username} />
                        <span className="mt-1.5 block px-1 text-[10px] font-bold text-zinc-300">
                          {s.nome}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(isAdmin || me.is_admin) && (
                <div className={`rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3 ${secaoEdit === 'estilo' ? '' : 'hidden'}`}>
                  <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Efeitos de nome (admin)
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Só tu vês estas opções. Aplica-se ao teu nome e ao cartão do perfil.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CORES_NOME.map((c) => (
                      <button
                        key={c.id || 'normal'}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, name_color: c.id }))}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                          form.name_color === c.id
                            ? 'border-white/60 bg-white/15'
                            : 'border-white/10 bg-black/20'
                        }`}
                      >
                        <span className={classesNome(c.id, '')}>{c.nome}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {EFEITOS_NOME.map((e) => (
                      <button
                        key={e.id || 'none'}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, name_effect: e.id }))}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                          form.name_effect === e.id
                            ? 'border-white/60 bg-white/15'
                            : 'border-white/10 bg-black/20'
                        }`}
                      >
                        {e.nome}
                      </button>
                    ))}
                  </div>
                  <p
                    className={`mt-2 truncate font-display text-lg font-black uppercase ${classesNome(
                      form.name_color,
                      form.name_effect,
                    )}`}
                  >
                    Pré-visualização do nome
                  </p>
                </div>
              )}

              {/* Redes sociais + live (só admin, para testes) */}
              {me?.is_admin && (
                <section className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${secaoEdit === 'redes' ? '' : 'hidden'}`}>
                  <h3 className="mb-1 text-[11px] font-black uppercase tracking-widest text-zinc-300">
                    Redes sociais
                  </h3>
                  <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
                    Cola o link ou escreve o @. Os ícones aparecem ao lado do teu nome no perfil.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {REDES_SOCIAIS.map((rede) => (
                      <label key={rede.id} className="block">
                        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                          <PlatformIcon platform={rede.id} className="h-3 w-3" />
                          {rede.nome}
                        </span>
                        <input
                          value={(form.socials && form.socials[rede.id]) || ''}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              socials: { ...(f.socials || {}), [rede.id]: e.target.value },
                            }))
                          }
                          placeholder={rede.placeholder}
                          maxLength={300}
                          className={inputCls}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <h4 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-gray-300">
                      <Radio className="h-3.5 w-3.5 text-red-400" /> Live automática
                    </h4>

                    {minhaLive ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`live-badge live-${minhaLive.platform}`}>
                          <span className="live-pulso" aria-hidden="true" />
                          <PlatformIcon platform={minhaLive.platform} className="h-3 w-3" />
                          em live
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Estás em live na{' '}
                          {PLATAFORMAS_LIVE.find((p) => p.id === minhaLive.platform)?.nome ||
                            minhaLive.platform}
                          .
                        </span>
                        <a
                          href={minhaLive.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="ui-btn ui-btn-ghost ui-btn-sm ml-auto"
                        >
                          Abrir live
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] leading-relaxed text-gray-400">
                        Deteção automática ativa. Quando começares a transmitir num dos canais
                        ligados, o selo “em live” aparece sozinho no teu perfil, chat, membros e
                        clips.
                      </p>
                    )}
                  </div>
                </section>
              )}


              {err && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                  {err}
                </p>
              )}
              <div className="sticky -bottom-4 z-20 -mx-4 -mb-4 mt-4 flex justify-end gap-2 border-t border-white/10 bg-[#141416]/95 px-4 py-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
                <button
                  onClick={fecharEditar}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={saving}
                  className="ui-btn ui-btn-primary"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Guardar
                </button>
              </div>
            </div>
            </div>

  ) : null

  /* Pré-visualização (zoom) de banners/fundos. Fica fora do modal de
     edição para funcionar tanto na página normal como em /perfil/editar. */
  const previewOverlay = previewTema
    ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-6"
          onClick={() => setPreviewTema(null)}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setPreviewTema(null)}
            className="absolute right-4 top-4 rounded-full bg-white/[0.12] p-2 text-white hover:bg-white/25"
            aria-label="Fechar imagem"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewTema}
            alt=""
            className="max-h-[72vh] max-w-[min(960px,94vw)] rounded-2xl border border-white/15 object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )
    : null

  if (standaloneEdit) {
    return (
      <>
        {modalEdicao}
        {previewOverlay}
      </>
    )
  }

  return (
    <PageShell
      background={estiloFundo(fundoAtual)}
      className={`profile-style profile-style--${me.profile_style || 'padrao'}`}
    >
        <ProfileHero
          perfil={me}
          avatarSrc={avatarSrc}
          nomeCls={nomeCls}
          corBorda={corBorda}
          badges={badges}
          minhas={minhas}
          criado={criado}
          memberId={me.display_id ?? me.id}
          clips={myClips}
          jogos={jogosPerfil}
          gameRanks={me.game_ranks || {}}
          isOwn
          onEdit={abrirEditar}
        />

        {modalEdicao}

        {/* ---------------- Feed: clips + mensagens ---------------- */}
        <div id="publicacoes" className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2
              className="font-display text-2xl font-black uppercase sm:text-3xl"
              style={{ color: 'var(--perfil-accent, #fff)' }}
            >
              Publicações
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
            mostrarFiltros={filtroFeed !== 'mensagens' && myClips.length > 0}
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
                Publica um clip ou uma mensagem na aba{' '}
                <span className="font-bold text-white">Clips e Publicações</span> e aparece aqui, no
                teu perfil.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedMostrado.map((f) =>
                f.tipo === 'clip' ? (
                  <div key={f.chave} className="mx-auto w-full max-w-4xl">
                    <ClipCard
                      clip={f.item}
                      user={me}
                      onRequestAuth={onAuthClick}
                      onProfile={onProfile}
                      onUpdate={(next) =>
                        setMyClips((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                      }
                      onDelete={(id) => setMyClips((prev) => prev.filter((x) => x.id !== id))}
                      transparent
                    />
                  </div>
                ) : (
                  <UserPostCard
                    key={f.chave}
                    post={f.item}
                    viewer={me}
                    autor={me}
                    onDelete={(id) => setMyPosts((prev) => prev.filter((x) => x.id !== id))}
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* ---------------- Ações da conta ---------------- */}
        <div className="flex flex-wrap justify-center gap-3">
          {isAdmin && (
            <button
              onClick={onPanelClick}
              className="ui-btn ui-btn-primary"
            >
              <LayoutDashboard className="h-4 w-4" />
              Painel Admin
            </button>
          )}
          <button
            onClick={() => onProfile?.(me.username)}
            className="ui-btn ui-btn-ghost"
          >
            <Sparkles className="h-4 w-4" />
            Ver perfil público
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('locaus:abrir-novidades'))}
            className="ui-btn ui-btn-ghost"
          >
            <Sparkles className="h-4 w-4" />
            Novidades
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/15"
          >
            <LogOut className="h-4 w-4" />
            Terminar sessão
          </button>
        </div>
        {!edit && (
          <ProfileMusic
            musicaId={me.musica_id}
            musicaUrl={me.musica_url}
            musicaNome={me.musica_nome}
          />
        )}
        {previewOverlay}
    </PageShell>
  )
}
