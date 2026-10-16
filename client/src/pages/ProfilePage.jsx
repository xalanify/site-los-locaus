import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clapperboard,
  LogOut,
  LayoutDashboard,
  RefreshCcw,
  Camera,
  Loader2,
  Check,
  Upload,
} from 'lucide-react'
import { BadgeGem, BADGES, devLabelClass, distincoesOverclock } from '../components/BadgeGem'
import ClipCard from '../components/ClipCard'
import { searchMice } from '../data/mice'
import { svgAvatar } from '../lib/avatar'

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

export default function ProfilePage({
  user,
  isAdmin,
  onLogout,
  onPanelClick,
  onAuthClick,
  onUserUpdate,
  onProfile,
}) {
  const [me, setMe] = useState(user)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ game_nick: '', mouse: '', dpi: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mouseSug, setMouseSug] = useState([])
  const [myClips, setMyClips] = useState([]) // publicações desta conta
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
    return () => {
      vivo = false
    }
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
    ...BADGES.filter((b) => badges.includes(b.id) && b.id !== 'dev'),
    ...distOc,
  ]
  const temDev = badges.includes('dev') || isAdmin
  const devBadge = BADGES.find((b) => b.id === 'dev')

  const avatarSrc = me.avatar_url || svgAvatar(me.username, '#8B5CF6')

  const abrirEditar = () => {
    // game_nick mantém-se guardado (liga o TOP 1 KILL ao CS2) — invisível no perfil
    setForm({ game_nick: me.game_nick || '', mouse: me.mouse || '', dpi: me.dpi || '' })
    setAvatarFile(null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    setRemoveAvatar(false)
    setErr('')
    setEdit(true)
  }

  const fecharEditar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview('')
    setAvatarFile(null)
    setRemoveAvatar(false)
    setErr('')
    setEdit(false)
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
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
    setRemoveAvatar(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const guardar = async () => {
    if (saving) return
    setSaving(true)
    setErr('')
    try {
      // 1) foto escolhida → o site guarda o ficheiro e associa o link à conta
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
    } catch {
      setErr('Sem ligação ao servidor.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:bg-white/15'

  const mostrarFotoAtual = me.avatar_url && !removeAvatar && !avatarFile

  return (
    <section className="min-h-screen px-4 pb-24 pt-24 sm:pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* ---------------- Saudação ---------------- */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 font-display font-black"
          style={{ fontSize: 'clamp(1.7rem, 6vw, 2.6rem)' }}
        >
          Bem-vindo, <span className="text-violet-400">{me.username}</span>
        </motion.h1>

        {/* ---------------- Cartão da conta ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass relative mb-8 overflow-hidden rounded-3xl border border-violet-500/40 p-5 sm:p-6"
          style={{ boxShadow: '0 0 40px rgba(139,92,246,.15)' }}
        >
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
                className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-500/60"
                style={{ boxShadow: '0 0 26px rgba(139,92,246,.45)' }}
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
                <span className="truncate font-display text-xl font-black uppercase text-white">
                  {me.username}
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
                  ID {me.id}
                </span>
              </p>
              {me.mouse && (
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                  {(() => {
                    const m = (searchMice(me.mouse) || []).find(
                      (x) => `${x.brand} ${x.model}` === me.mouse,
                    )
                    return m && m.logo ? (
                      <img src={m.logo} alt="" className="h-5 w-5 rounded-sm object-contain" />
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
            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              {minhas.map((b) => (
                <span
                  key={b.id}
                  className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ring-1"
                  style={{
                    background: `${b.color}18`,
                    boxShadow: `0 0 14px ${b.color}40`,
                    ringColor: `${b.color}66`,
                  }}
                >
                  <BadgeGem badge={b} size={18} />
                  <span className="font-display text-[10px] font-black uppercase tracking-wider" style={{ color: b.color }}>
                    {b.label}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* editar foto (ficheiro) */}
          {edit && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="glass w-full max-w-lg space-y-4 rounded-3xl border border-violet-500/30 p-6 shadow-2xl">
              <p className="text-xs text-gray-400">
                Escolhe uma foto tua — o site guarda o ficheiro e fica associado à tua conta.
              </p>

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

              {err && (
                <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-400">
                  {err}
                </p>
              )}
              <div className="flex justify-end gap-2">
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
          )}
        </motion.div>

        {/* ---------------- Os meus clips ---------------- */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black uppercase sm:text-3xl">
              Os meus clips
            </h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gray-300">
              {myClips.length}
            </span>
          </div>

          {myClips.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-violet-500/40 bg-violet-500/5 p-6 text-center">
              <Clapperboard className="mx-auto mb-2 h-7 w-7 text-violet-400" />
              <p className="font-bold text-white">Ainda sem clips</p>
              <p className="mx-auto max-w-md text-sm text-gray-400">
                Publica o teu primeiro clip na aba{' '}
                <span className="font-bold text-white">Clips e Publicações</span> e ele aparece
                aqui, no teu perfil, com gostos e comentários.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {myClips.map((c) => (
                <ClipCard
                  key={c.id}
                  clip={c}
                  user={me}
                  onRequestAuth={onAuthClick}
                  onProfile={onProfile}
                  onUpdate={(next) =>
                    setMyClips((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                  }
                  onDelete={(id) => setMyClips((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------------- Ações da conta ---------------- */}
        <div className="flex flex-wrap gap-3">
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
            onClick={onAuthClick}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCcw className="h-4 w-4" />
            Trocar de conta
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/15"
          >
            <LogOut className="h-4 w-4" />
            Terminar sessão
          </button>
        </div>
      </div>
    </section>
  )
}
