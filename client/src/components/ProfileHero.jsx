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
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`pf-hero ${classesCard(perfil.name_effect)}`}
      >
        <div className="pf-cover">
          <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/20 via-black/45 to-black/85" />
          <span className="pf-cover-name" aria-hidden="true">
            {perfil.username}
          </span>
        </div>

        <div className="pf-main">
          <div className="pf-avatar-wrap">
            <img
              src={avatarSrc}
              alt={perfil.username}
              className="pf-avatar"
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
                className="pf-avatar-edit"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="pf-identity">
            <div className="pf-eyebrow">
              <span>Membro #{memberId}</span>
              <span className="pf-dot" />
              <span>{criado}</span>
            </div>

            <div className="pf-name-row">
              <h1
                className={`pf-name ${
                  nomeCls || (temPrevisao1(badges) ? nomeDouradoClass : '')
                }`}
              >
                {perfil.username}
              </h1>
              {minhas.slice(0, 4).map((b) => (
                <BadgeGem key={b.id} badge={b} size={16} />
              ))}
            </div>

            <p className="pf-bio">{bio}</p>

            {minhas.length > 0 && (
              <div className="pf-badges">
                {minhas.map((b) => (
                  <span key={b.id}>
                    <span className="pf-dot-cor" style={{ background: b.color }} />
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pf-side">
            <div className="pf-actions">
              <SocialLinks socials={perfil.socials} />
              <LiveBadge username={perfil.username} />
              {isOwn ? (
                <button type="button" onClick={onEdit} className="ui-btn ui-btn-primary ui-btn-sm">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              ) : (
                <button type="button" onClick={onPrimary} className="ui-btn ui-btn-primary ui-btn-sm">
                  <MessageSquare className="h-3.5 w-3.5" /> {primaryLabel}
                </button>
              )}
            </div>

            <div className="pf-stats">
              <div className="pf-stat">
                <b>{num(clips.length)}</b>
                <span>Clips</span>
              </div>
              <div className="pf-stat">
                <b>{num(views)}</b>
                <span>Views</span>
              </div>
              <div className="pf-stat">
                <b>#{memberId}</b>
                <span>Membro</span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>

      {jogos.length > 0 && (
        <section className="pf-games">
          <p className="nv-label">Jogos · {jogos.length}</p>
          <div className="pf-tiles">
            {jogos.map((g) => (
              <div key={g} className="pf-tile" title={gameLabel(g) || g}>
                <span className="pf-tile-abbr">{abrevJogo(g)}</span>
                {GAME_LOGO[g] && (
                  <img
                    src={`${GAME_LOGO[g]}?v=3`}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {gear.length > 0 && (
        <section className="pf-mouse">
          <p className="nv-label">Periférico ativo</p>
          {gear.map((g) => {
            const Icon = g.Icon
            const semBase = g.semBase
            return (
              <div key={g.key} className="pf-mouse-card">
                <div className="min-w-0">
                  <div className="pf-mouse-meta">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" /> {g.tipo}
                    </span>
                    <span className="truncate">{g.detalhe}</span>
                  </div>
                  <p className="pf-mouse-nome">
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
                    {g.marca && <span className="shrink-0 font-semibold text-white">{g.marca}</span>}
                    <span className="truncate text-zinc-400">{g.modelo}</span>
                  </p>
                </div>
                <div className="pf-mouse-img">
                  {g.img ? (
                    <img
                      src={g.img}
                      alt=""
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                      style={semBase ? { clipPath: 'inset(0 0 18% 0)' } : undefined}
                    />
                  ) : (
                    <Icon className="h-10 w-10 text-zinc-500" />
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </>
  )
}
