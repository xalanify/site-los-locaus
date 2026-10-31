import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  MessageSquare,
  Mouse,
  Pencil,
} from 'lucide-react'
import ProfileBanner from './ProfileBanner'
import LiveBadge from './LiveBadge'
import SocialLinks from './SocialLinks'
import { BadgeGem, nomeDouradoClass, temPrevisao1 } from './BadgeGem'
import { gameLabel } from '../data/clipGames'
import { svgAvatar } from '../lib/avatar'
import { authHeaders } from '../lib/auth'
import { infoRato, nomeRato } from '../lib/ratos'
import { classesCard } from '../data/nomeEfeitos'

/* ============================================================
   Cartão principal do perfil — banner grande, avatar sobreposto,
   nome, ligações, estatísticas, jogos e setup.
   É usado pelo perfil da conta e pelo perfil público.
   ============================================================ */

const ABREV = {
  cs2: 'CS2',
  csgo: 'CS:GO',
  r6: 'R6',
  bf1: 'BF1',
  bfv: 'BFV',
  bf6: 'BF6',
  eafc: 'FC',
  fortnite: 'FN',
  minecraft: 'MC',
  roblox: 'RBX',
  valorant: 'VAL',
  apex: 'APEX',
  cod: 'COD',
  gta: 'GTA',
  rocket: 'RL',
  lol: 'LOL',
  dota: 'DOTA',
  pubg: 'PUBG',
  outro: '+',
}

const abrevJogo = (g) => ABREV[g] || String(gameLabel(g) || g || '').slice(0, 4).toUpperCase()

const mousePhotoCache = new Map()

const GAME_LOGO = {
  cs2: '/jogos/cs2.svg',
  csgo: '/jogos/csgo.svg',
  r6: '/jogos/r6.png',
  cod: '/jogos/cod.png',
  fortnite: '/jogos/fortnite.svg',
  bf1: '/jogos/bf6.svg',
  bfv: '/jogos/bf6.svg',
  bf6: '/jogos/bf6.svg',
  apex: '/jogos/apex.svg',
  valorant: '/jogos/valorant.svg',
  minecraft: '/jogos/minecraft.svg',
  roblox: '/jogos/roblox.svg',
  gta: '/jogos/gta.svg',
  rocket: '/jogos/rocket.svg',
  lol: '/jogos/lol.svg',
  dota: '/jogos/dota.svg',
  pubg: '/jogos/pubg.svg',
  eafc: '/jogos/eafc.svg',
  steam: '/jogos/steam.svg',
}

const RANK_CORES = {
  bronze: '#b08d57',
  silver: '#c0c0c0',
  gold: '#f5c542',
  platinum: '#5eead4',
  emerald: '#34d399',
  diamond: '#60a5fa',
  champion: '#f472b6',
  bf: '#ff9e9e',
}

function RankIcon({ tier }) {
  const cor = RANK_CORES[tier] || '#a1a1aa'
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" fill={cor} opacity="0.9" />
      <path d="M12 6l5 2v3c0 3-2 5-5 7-3-2-5-4-5-7V8z" fill="#0a0a0b" opacity="0.25" />
    </svg>
  )
}

function num(n) {
  return Number(n || 0).toLocaleString('pt-PT')
}

export default function ProfileHero({
  perfil,
  avatarSrc,
  nomeCls,
  corBorda,
  badges = [],
  minhas = [],
  criado,
  memberId,
  clips = [],
  jogos = [],
  gameRanks = {},
  isOwn = false,
  onEdit,
  onPrimary,
  primaryLabel = 'Ver publicações',
}) {
  const views = clips.reduce((total, c) => total + Number(c.views || 0), 0)
  const mouseInfo = infoRato(perfil.mouse)
  const [fotoMouse, setFotoMouse] = useState(null)
  const [fotoSemBase, setFotoSemBase] = useState(false)
  const [fotoClara, setFotoClara] = useState(false)

  useEffect(() => {
    if (!perfil.mouse) {
      setFotoMouse(null)
      return undefined
    }
    let vivo = true
    const key = perfil.mouse
    const cached = mousePhotoCache.get(key)
    if (cached) {
      setFotoMouse(cached.url)
      setFotoSemBase(cached.semBase)
      setFotoClara(Boolean(cached.clara))
      return undefined
    }
    fetch(`/api/componentes/imagem?q=${encodeURIComponent(key)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d || !d.imagem) return
        const semBase = /base|dock|stand|combo/i.test(d.imagem)
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            const w = canvas.width
            const h = canvas.height
            const dados = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const px = dados.data
            const visitado = new Uint8Array(w * h)
            const pilha = []
            const visitar = (x, y) => {
              const idx = y * w + x
              if (visitado[idx]) return
              visitado[idx] = 1
              const i = idx * 4
              if (px[i] > 235 && px[i + 1] > 235 && px[i + 2] > 235) {
                px[i + 3] = 0
                pilha.push(idx)
              }
            }
            for (let x = 0; x < w; x++) {
              visitar(x, 0)
              visitar(x, h - 1)
            }
            for (let y = 0; y < h; y++) {
              visitar(0, y)
              visitar(w - 1, y)
            }
            while (pilha.length) {
              const idx = pilha.pop()
              const x = idx % w
              const y = (idx - x) / w
              if (x > 0) visitar(x - 1, y)
              if (x < w - 1) visitar(x + 1, y)
              if (y > 0) visitar(x, y - 1)
              if (y < h - 1) visitar(x, y + 1)
            }
            ctx.putImageData(dados, 0, 0)
            const url = canvas.toDataURL('image/png')
            mousePhotoCache.set(key, { url, semBase })
            if (vivo) {
              setFotoMouse(url)
              setFotoClara(false)
              setFotoSemBase(semBase)
            }
          } catch {
            if (vivo) {
              setFotoMouse(d.imagem)
              setFotoSemBase(semBase)
            }
          }
        }
        img.onerror = () => {
          if (vivo) setFotoMouse(null)
        }
        img.src = `/api/componentes/imagem-proxy?q=${encodeURIComponent(key)}`
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [perfil.mouse])

  const bio = perfil.mouse
    ? `${nomeRato(perfil.mouse)}${perfil.dpi ? ` · ${perfil.dpi} DPI` : ''}`
    : 'Membro Locaus'
  const gear = []
  if (perfil.mouse) {
    gear.push({
      key: 'mouse',
      tipo: 'Mouse',
      Icon: Mouse,
      marca: mouseInfo?.brand || '',
      modelo: mouseInfo?.model || perfil.mouse,
      logo: mouseInfo?.logo || null,
      detalhe: perfil.dpi ? `${perfil.dpi} DPI` : 'Periférico',
      img: fotoMouse || null,
      semBase: fotoSemBase,
      clara: fotoClara,
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`profile-hero glass relative mb-5 overflow-hidden rounded-3xl border ${classesCard(perfil.name_effect)}`}
        style={{
          borderColor: `${corBorda}55`,
          boxShadow: `0 0 44px ${corBorda}18, inset 0 0 0 1px ${corBorda}14`,
        }}
      >
        {/* Banner */}
        <div className="relative h-40 overflow-hidden sm:h-56">
          <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/5 via-black/15 to-black/70" />
          <span className="pointer-events-none absolute right-4 top-3 select-none font-display text-5xl font-black uppercase leading-none text-white/[0.07] sm:text-7xl">
            {perfil.username}
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#121214] to-transparent" />
        </div>

        {/* Corpo */}
        <div className="relative px-4 pb-4 sm:px-6 sm:pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-end gap-3 sm:gap-4">
              <div className="relative -mt-10 shrink-0 sm:-mt-12">
                <img
                  src={avatarSrc}
                  alt={perfil.username}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-[#121214] sm:h-24 sm:w-24"
                  style={{ boxShadow: `0 0 0 1px ${corBorda}aa, 0 0 28px ${corBorda}55` }}
                  onError={(e) => {
                    if (e.currentTarget.dataset.fb) return
                    e.currentTarget.dataset.fb = '1'
                    e.currentTarget.src = svgAvatar(perfil.username, '#a1a1aa')
                  }}
                />
                {isOwn && onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    title="Editar foto e perfil"
                    className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[#0a0a0b]/90 text-zinc-300 ring-1 ring-white/25 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`truncate font-display text-2xl font-black sm:text-3xl ${
                      nomeCls || (temPrevisao1(badges) ? nomeDouradoClass : 'text-white')
                    }`}
                  >
                    {perfil.username}
                  </span>
                  {minhas.slice(0, 4).map((b) => (
                    <BadgeGem key={b.id} badge={b} size={18} />
                  ))}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                  <span>@{perfil.username}</span>
                  <span aria-hidden="true">·</span>
                  <span>{criado}</span>
                  <span aria-hidden="true">·</span>
                  <span>Membro #{memberId}</span>
                </p>
                <p className="mt-1.5 truncate text-sm text-zinc-400">{bio}</p>
                {minhas.length > 0 && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {minhas.map((b) => (
                      <span key={b.id} className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: b.color }}
                        />
                        {b.label}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            {/* Ações + estatísticas */}
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <SocialLinks socials={perfil.socials} />
                <LiveBadge username={perfil.username} />
                {isOwn ? (
                  <button type="button" onClick={onEdit} className="ui-btn ui-btn-primary ui-btn-sm">
                    <Pencil className="h-3.5 w-3.5" /> Editar perfil
                  </button>
                ) : (
                  <button type="button" onClick={onPrimary} className="ui-btn ui-btn-primary ui-btn-sm">
                    <MessageSquare className="h-3.5 w-3.5" /> {primaryLabel}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-6 lg:justify-end">
                <div className="text-right">
                  <span className="block font-display text-lg font-black leading-none text-white">
                    {num(clips.length)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Clips
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-display text-lg font-black leading-none text-white">
                    {num(views)}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Views
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-display text-lg font-black leading-none text-white">
                    #{memberId}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Membro
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Jogos */}
      {jogos.length > 0 && (
        <div className="profile-games mb-5">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Jogos · {jogos.length}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {jogos.map((g) => {
              const logoLargo = ['cod', 'cs2'].includes(g)
              return (
                <div key={g} className="flex w-[104px] flex-col items-center gap-1">
                  <span
                    title={gameLabel(g) || g}
                    className={`relative grid place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] ${
                      logoLargo ? 'h-14 w-24' : 'h-16 w-16'
                    }`}
                  >
                    {GAME_LOGO[g] ? (
                      <img
                        src={`${GAME_LOGO[g]}?v=3`}
                        alt=""
                        loading="lazy"
                        className={`object-contain brightness-0 invert ${
                          logoLargo ? 'h-9 w-20' : 'h-11 w-11'
                        }`}
                      />
                    ) : (
                      <span className="text-[11px] font-black text-zinc-300">{abrevJogo(g)}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Periférico — só o rato, num cartão quadrado */}
      {gear.length > 0 && (
        <div className="profile-mouse mb-8">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Periférico ativo
          </p>
          <div className="mx-auto mt-2.5 w-full max-w-[250px]">
            {gear.map((g) => {
              const Icon = g.Icon
              const semBase = g.semBase
              return (
                <div key={g.key} className="glass aspect-square rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" /> {g.tipo}
                    </span>
                    <span className="truncate">{g.detalhe}</span>
                  </div>
                  <div className="relative mt-3 flex h-[120px] items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.18),rgba(255,255,255,0.06)_55%,rgba(255,255,255,0.02))] ring-1 ring-white/10">
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.22),transparent_65%)]" />
                    {g.img ? (
                      <img
                        src={g.img}
                        alt=""
                        loading="lazy"
                        className="relative z-10 max-h-full max-w-full object-contain brightness-125 contrast-110 drop-shadow-[0_10px_22px_rgba(255,255,255,0.16)]"
                        style={semBase ? { clipPath: 'inset(0 0 18% 0)' } : undefined}
                      />
                    ) : (
                      <Icon className="h-12 w-12 text-zinc-500" />
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] leading-tight text-white">
                    {g.logo && (
                      <img
                        src={g.logo}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                        className="h-4 w-4 shrink-0 rounded-sm object-contain"
                      />
                    )}
                    {g.marca && <span className="shrink-0 font-black">{g.marca}</span>}
                    <span className="truncate font-semibold text-zinc-300">{g.modelo}</span>
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
