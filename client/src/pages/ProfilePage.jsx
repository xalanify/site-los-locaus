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
} from 'lucide-react'
import { BadgeGem, badgesDe, devLabelClass, distincoesOverclock, nomeDouradoClass, temPrevisao1, hexToRgba } from '../components/BadgeGem'
import ClipCard from '../components/ClipCard'
import UserPostCard from '../components/UserPostCard'
import { searchMice } from '../data/mice'
import { gameLabel } from '../data/clipGames'
import { svgAvatar } from '../lib/avatar'
import PageShell from '../components/PageShell'
import ProfileBanner from '../components/ProfileBanner'
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
import { FONTES, fonteDe } from '../data/fontesPerfil'
import { extrairCores } from '../lib/coresFundo'

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
  borda_cor: u?.borda_cor || 'banner',
  fonte_perfil: u?.fonte_perfil || '',
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
  const [previewTema, setPreviewTema] = useState(null)
  const [musicaQ, setMusicaQ] = useState('')
  const [musicaResultados, setMusicaResultados] = useState([])
  const [musicaLoading, setMusicaLoading] = useState(false)
  const [musicaAlterada, setMusicaAlterada] = useState(false)
  const [coresExtra, setCoresExtra] = useState(null)
  const [form, setForm] = useState(() => formDe(user))
  const abriuState = useRef(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [crop, setCrop] = useState(null)
  const cropImgRef = useRef(null)
  const cropDragRef = useRef(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mouseSug, setMouseSug] = useState([])
  const [myClips, setMyClips] = useState([]) // publicações desta conta
  const [myPosts, setMyPosts] = useState([]) // mensagens desta conta
  const [filtroFeed, setFiltroFeed] = useState('tudo') // tudo | videos | mensagens
  const [ordemClips, setOrdemClips] = useState('recentes')
  const [jogoClips, setJogoClips] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  /* Sempre que o perfil abre: dados frescos (distinções atribuídas
     no painel, foto) sem precisar de recarregar a página. */
  useEffect(() => {
    let vivo = true
    fetch('/api/users/me', { headers: authHeaders() })
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
  const dinamico = me?.dynamic_colors !== false && temFundo

  /* cor dominante REAL da imagem (não a cor fixa do tema) */
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
    if (standaloneEdit) return
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
  }, [temFundo, dinamico, fundoAtual.id, accent, accent2, accentRgb])

  /* fonte escolhida pelo user — aplica-se a todos os textos */
  const fonteId = edit ? form.fonte_perfil : me?.fonte_perfil
  const fonte = fonteDe(fonteId)
  useEffect(() => {
    if (standaloneEdit) return
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

  const avatarSrc = me.avatar_url || svgAvatar(me.username, '#8B5CF6')

  const abrirEditar = () => {
    // game_nick mantém-se guardado (liga o TOP 1 KILL ao CS2) — invisível no perfil
    setForm(formDe(me))
    setAvatarFile(null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    setRemoveAvatar(false)
    setErr('')
    setMusicaAlterada(false)
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
    ctx.fillStyle = '#0d0a16'
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
            }
          : {}),
        borda_cor: form.borda_cor,
        fonte_perfil: form.fonte_perfil,
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
              <div className="glass max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-violet-500/30 p-4 shadow-2xl sm:p-6">
              <div className="sticky -top-4 z-20 -mx-4 -mt-4 mb-2 flex items-start justify-between gap-3 border-b border-white/10 bg-[#140f22]/95 px-4 py-3 backdrop-blur sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6">
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
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-violet-500/50"
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
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-violet-500/50"
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

              {/* recortar / arrastar a foto antes de guardar */}
              {crop &&
                createPortal(
                  <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm"
                    onClick={fecharCrop}
                  >
                    <div
                      className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0a16] p-4 shadow-2xl"
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
                        className="relative mx-auto touch-none select-none overflow-hidden rounded-full bg-black ring-2 ring-violet-500/50"
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
                          className="h-1.5 w-full accent-violet-500"
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
                          className="flex-1 rounded-xl bg-violet-500 py-2 text-xs font-black text-white transition hover:bg-violet-400"
                        >
                          Aplicar recorte
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )}

              {/* Rato + DPI */}
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
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
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
                    className="w-32 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Banner animado do perfil */}
              <div>
                <label className="block text-xs font-bold text-gray-400">Banner do perfil</label>
                <p className="mb-2 text-[11px] text-gray-500">
                  O mesmo tema aparece no teu cartão em Membros e Membros online.
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                            className="block h-12 w-full rounded-md object-cover"
                          />
                        ) : (
                          <span className="block h-12 w-full rounded-md bg-gradient-to-br from-[#1b1230] to-[#0b0716]" />
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
              <div>
                <label className="block text-xs font-bold text-gray-400">Fundo da página</label>
                <p className="mb-2 text-[11px] text-gray-500">
                  Muda o ambiente quando alguém abre o teu perfil.
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
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
                            className="block h-9 w-full rounded-md object-cover"
                          />
                        ) : (
                          <span
                            className="block h-9 w-full rounded-md"
                            style={{ background: 'linear-gradient(135deg, #1b1230, #0b0716)' }}
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

              {/* Cor das linhas / brilho do cartão e do avatar */}
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

              {/* Fonte dos textos do perfil */}
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-xs font-bold text-gray-300">Fonte do perfil</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                  Muda todos os textos do perfil e das sidebars enquanto o teu perfil está aberto.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {FONTES.map((f) => (
                    <button
                      key={f.id || 'padrao'}
                      type="button"
                      onClick={() => setForm((x) => ({ ...x, fonte_perfil: f.id }))}
                      className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                        form.fonte_perfil === f.id
                          ? 'border-white/60 bg-white/15 text-white'
                          : 'border-white/10 bg-black/20 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="block truncate text-[15px] leading-tight"
                        style={f.familia ? { fontFamily: f.familia } : undefined}
                      >
                        {f.exemplo}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] font-black uppercase tracking-wider text-gray-500">
                        {f.nome}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cores dinâmicas do perfil */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-300">Cores dinâmicas do perfil</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                    O site adapta os títulos, sidebars, cartões e bordas às cores do fundo que escolheres.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.dynamic_colors}
                  onClick={() => setForm((f) => ({ ...f, dynamic_colors: !f.dynamic_colors }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.dynamic_colors ? 'bg-violet-500' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.dynamic_colors ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Música do perfil */}
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

              {(isAdmin || me.is_admin) && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3">
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

              {err && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                  {err}
                </p>
              )}
              <div className="sticky -bottom-4 z-20 -mx-4 -mb-4 mt-4 flex justify-end gap-2 border-t border-white/10 bg-[#140f22]/95 px-4 py-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
                <button
                  onClick={fecharEditar}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-violet-400 disabled:opacity-50"
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
    <PageShell background={estiloFundo(fundoAtual)}>
        {/* ---------------- Saudação ---------------- */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 font-black gradient-text"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)' }}
        >
          Editar perfil
        </motion.h1>

        {/* ---------------- Cartão da conta ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`glass relative mb-8 overflow-hidden rounded-3xl border p-5 sm:p-6 ${classesCard(me.name_effect)}`}
          style={{
            borderColor: `${corBorda}66`,
            boxShadow: `0 0 40px ${corBorda}22, inset 0 0 0 1px ${corBorda}18`,
          }}
        >
          <ProfileBanner bannerId={me.banner_id} />
          {/* letra fantasma ao fundo */}
          <span className="pointer-events-none absolute -top-3 right-2 select-none font-display text-7xl font-black uppercase leading-none text-white/5">
            {me.username}
          </span>

          <div className="relative flex items-center gap-4">
            {/* foto de perfil com botão de editar */}
            <div className="relative shrink-0">
              <img
                src={avatarSrc}
                alt={me.username}
                className="h-16 w-16 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 2px ${corBorda}99, 0 0 26px ${corBorda}66` }}
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(me.username, '#8B5CF6')
                }}
              />
              <button
                onClick={abrirEditar}
                title="Editar foto e perfil"
                className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#0a0813]/88 text-gray-300 ring-1 ring-white/25 transition-colors hover:bg-violet-500 hover:text-white"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`truncate font-display text-xl font-black uppercase ${
                    nomeCls || (temPrevisao1(badges) ? nomeDouradoClass : 'text-white')
                  }`}
                >
                  {me.username}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                <span>Membro desde {criado}</span>
                <span
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gray-500"
                  title="ID da conta"
                >
                  ID {me.display_id ?? me.id}
                </span>
              </p>
              {me.mouse && (
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Mouse</span>
                  {(() => {
                    const m = (searchMice(me.mouse) || []).find(
                      (x) => `${x.brand} ${x.model}` === me.mouse,
                    )
                    return m && m.logo ? (
                      <img src={m.logo} alt="" className="h-5 w-5 shrink-0 rounded-sm object-contain" />
                    ) : null
                  })()}
                  <span className="font-bold">{me.mouse}</span>
                  {me.dpi ? <span className="text-gray-500">· {me.dpi} DPI</span> : null}
                </p>
              )}
            </div>
          </div>

          {/* distinções obtidas (DEV fica só ao lado do nome) */}
          {minhas.length > 0 && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2.5">
              {minhas.map((b) => (
                <span
                  key={b.id}
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 ring-1"
                  style={{
                    background: hexToRgba(b.color, 0.09),
                    boxShadow: `0 0 14px ${hexToRgba(b.glow || b.color, 0.25)}`,
                    // eslint-disable-next-line react/forbid-dom-props
                    ['--tw-ring-color']: hexToRgba(b.glow || b.color, 0.4),
                  }}
                >
                  <BadgeGem badge={b} size={24} />
                  <span className="font-display text-[10.5px] font-black uppercase tracking-wider" style={{ color: b.labelColor || b.color }}>
                    {b.label}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* editar foto (ficheiro) */}
          {modalEdicao}
        </motion.div>

        {/* ---------------- Feed: clips + mensagens ---------------- */}
        <div className="mb-8">
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

          {filtroFeed !== 'mensagens' && myClips.length > 0 && (
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
                Publica um clip ou uma mensagem na aba{' '}
                <span className="font-bold text-white">Clips e Publicações</span> e aparece aqui, no
                teu perfil.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedMostrado.map((f) =>
                f.tipo === 'clip' ? (
                  <div key={f.chave} className="mx-auto w-full max-w-3xl">
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
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-violet-400 glow-violet"
            >
              <LayoutDashboard className="h-4 w-4" />
              Painel Admin
            </button>
          )}
          <button
            onClick={abrirEditar}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Camera className="h-4 w-4" />
            Editar perfil
          </button>
          <button
            onClick={() => onProfile?.(me.username)}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Sparkles className="h-4 w-4" />
            Ver perfil público
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('locaus:abrir-novidades'))}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
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
