import { useRef } from 'react'
import { Mouse, Keyboard, Headphones, Monitor, Star } from 'lucide-react'
import ProfileBanner from './ProfileBanner'
import { BadgeGem, badgesDe, distincoesOverclock } from './BadgeGem'
import GameLogo from './GameLogo'
import { classesNome } from '../data/nomeEfeitos'
import { svgAvatar } from '../lib/avatar'

const FOTO_SRC = {
  'foto-remember': '/edicoes/edicao-remember.jpg',
  'foto-nightops': '/edicoes/edicao-nightops.jpg',
  'foto-stealth': '/edicoes/edicao-stealth.jpg',
  'foto-apex': '/edicoes/edicao-apex.jpg',
  'foto-nfsu1': '/cartas/nfs1.png',
  'foto-nfsu2': '/cartas/nfs2.png',
  'foto-guerra': '/cartas/waw.png',
}

const FOTO_TAG = {
  'foto-remember': 'Remember',
  'foto-nightops': 'Night Ops',
  'foto-stealth': 'Stealth',
  'foto-apex': 'Apex',
  'foto-nfsu1': 'Underground',
  'foto-nfsu2': 'Underground 2',
  'foto-guerra': 'Guerra',
}

/* ============================================================
   Cartas de perfil — 4 estilos (license, kova, dvd, felony)
   + o estilo padrão. Usadas nos membros, loja e editor.
   ============================================================ */

const VARIANT_LABEL = {
  padrao: 'LOCAUS CARD',
  license: 'AIMER LICENSE',
  kova: 'KOVA CARD',
  dvd: 'LOCAUS // RED',
  felony: 'FELONY CARD',
  neon: 'NEON CARD',
  blood: 'BLOOD CARD',
  cosmic: 'COSMIC CARD',
  crimson: 'CRIMSON CARD',
  violet: 'VIOLET CARD',
  sleepin: 'AIMER LICENSE',
  river: 'MENTALIST',
  dev: 'AIMER LICENSE',
  'arte-topo': 'TOPO CARD',
  'arte-nebula': 'NEBULA CARD',
  'arte-neon': 'NEON FLUX',
  'arte-tempestade': 'STORM CARD',
  'arte-brasas': 'EMBER CARD',
  'arte-galaxia': 'GALAXY CARD',
  'arte-cristal': 'CRYSTAL CARD',
  'arte-metal': 'HEX METAL',
  'arte-tranzit': 'TRANZIT CARD',
  'arte-hipnose': 'PSYCHIC CARD',
  'arte-eter': 'ETER CARD',
  'arte-rubra': 'ID CARD',
  'arte-oxido': 'OXIDE CARD',
  'arte-cromo': 'CHROME CARD',
  'arte-aurora': 'AURORA CARD',
  'arte-malaquite': 'MALAQUITE CARD',
  'arte-filigrana': 'FILIGRANA CARD',
  'arte-dragao': 'DRAGON CARD',
  'arte-estrela': 'STAR CARD',
  'arte-ouro': 'GOLD CARD',
  'arte-vidro': 'GLASS CARD',
  'arte-operador': 'OPERATOR CARD',
  'arte-inverno': 'WINTER CARD',
  'arte-corrente': 'CHAIN CARD',
  'arte-vela': 'VELA CARD',
  'arte-siberia': 'SIBERIA CARD',
  'arte-mercurio': 'MERCURY CARD',
  'arte-marmore': 'MARBLE CARD',
  'arte-tinta': 'INK CARD',
  'arte-asfalto': 'ASPHALT CARD',
  'arte-ouro-negro': 'BLACK GOLD',
  'arte-glitch': 'GLITCH CARD',
  'arte-anjo': 'ANGEL CARD',
  'arte-teia': 'WEB CARD',
  'arte-suspenso': 'SUSPENDED CARD',
  'arte-prisma': 'PRISM CARD',
  'foto-remember': 'REMEMBER CARD',
  'foto-nightops': 'NIGHT OPS CARD',
  'foto-stealth': 'STEALTH CARD',
  'foto-apex': 'APEX CARD',
  'foto-nfsu1': 'UNDERGROUND CARD',
  'foto-nfsu2': 'UNDERGROUND 2 CARD',
  'foto-guerra': 'GUERRA CARD',
}

const VARIANT_ACCENT = {
  padrao: '#a1a1aa',
  license: '#e4e4e7',
  kova: '#a1a1aa',
  dvd: '#ff4d4d',
  felony: '#c084fc',
  neon: '#e879f9',
  blood: '#ff3b3b',
  cosmic: '#60a5fa',
  crimson: '#ef4444',
  violet: '#c084fc',
  sleepin: '#e4e4e7',
  river: '#f9a8d4',
  dev: '#e4e4e7',
  'arte-topo': '#ff7a59',
  'arte-nebula': '#a855f7',
  'arte-neon': '#67e8f9',
  'arte-tempestade': '#ff3b3b',
  'arte-brasas': '#ef4444',
  'arte-galaxia': '#f472b6',
  'arte-cristal': '#a78bfa',
  'arte-metal': '#cbd5e1',
  'arte-tranzit': '#d9a441',
  'arte-hipnose': '#c084fc',
  'arte-eter': '#818cf8',
  'arte-rubra': '#dc2626',
  'arte-oxido': '#b45309',
  'arte-cromo': '#e5e7eb',
  'arte-aurora': '#5eead4',
  'arte-malaquite': '#10b981',
  'arte-filigrana': '#bfdbfe',
  'arte-dragao': '#ef4444',
  'arte-estrela': '#dc2626',
  'arte-ouro': '#f5c542',
  'arte-vidro': '#e2e8f0',
  'arte-operador': '#a1a1aa',
  'arte-inverno': '#bfdbfe',
  'arte-corrente': '#94a3b8',
  'arte-vela': '#93c5fd',
  'arte-siberia': '#e5e7eb',
  'arte-mercurio': '#cbd5e1',
  'arte-marmore': '#1d4ed8',
  'arte-tinta': '#14b8a6',
  'arte-asfalto': '#64748b',
  'arte-ouro-negro': '#b45309',
  'arte-glitch': '#ef4444',
  'arte-anjo': '#a1a1aa',
  'arte-teia': '#cbd5e1',
  'arte-suspenso': '#e5e7eb',
  'arte-prisma': '#e0f2fe',
}

const ano = (iso) => {
  if (!iso) return '2026'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '2026' : String(d.getFullYear())
}

/* As cartas já não mostram ranks de jogos — só a identidade do membro. */

export default function ProfileCard({
  perfil = {},
  variant = 'padrao',
  jogos = null,
  className = '',
}) {
  const v = VARIANT_LABEL[variant] ? variant : 'padrao'
  const accent = VARIANT_ACCENT[v]
  const wide =
    v === 'license' || v === 'blood' || v === 'crimson' || v === 'sleepin' || v === 'dev'
  const violet = v === 'violet'
  const ref = useRef(null)
  const username = perfil.username || 'Membro'
  const id = perfil.display_id ?? perfil.id ?? '—'
  const avatar = perfil.avatar_url || svgAvatar(username, '#a1a1aa')
  const nomeCls = classesNome(perfil.name_color, perfil.name_effect)
  const marca = v === 'dev' ? 'desenvolvedor' : username
  const badges = [
    ...badgesDe(perfil.badges),
    ...distincoesOverclock(perfil.distincoes),
  ]
  const listaJogos = (
    jogos || perfil.game_accounts || []
  ).filter((g) => g && g !== 'csgo')
  const barcode = `LOCAUS<<${String(username).toUpperCase()}<<${id}<<${ano(perfil.created_at)}<<<<`

  const aoMover = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`)
    el.style.setProperty('--rx', `${(-y * 16).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 20).toFixed(2)}deg`)
    el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-4px)`
  }
  const aoSair = () => {
    if (!ref.current) return
    ref.current.style.transform = ''
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }
  const arrasto = useRef({ x: 0, y: 0, ativo: false, ultimo: 0 })
  const aoClicar = (e) => {
    const el = ref.current
    if (!el) return
    arrasto.current.x = e.clientX
    arrasto.current.y = e.clientY
    arrasto.current.ativo = false
    if (e.pointerType !== 'mouse') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* sem captura */
      }
    }
    const r = el.getBoundingClientRect()
    el.style.setProperty('--cx', `${e.clientX - r.left}px`)
    el.style.setProperty('--cy', `${e.clientY - r.top}px`)
    el.classList.remove('pc-clicado')
    void el.offsetWidth
    el.classList.add('pc-clicado')
    window.setTimeout(() => el.classList.remove('pc-clicado'), 520)
  }
  const aoMoverPointer = (e) => {
    if (e.pointerType !== 'mouse') {
      const dx = e.clientX - arrasto.current.x
      const dy = e.clientY - arrasto.current.y
      if (Math.abs(dx) + Math.abs(dy) > 6) arrasto.current.ativo = true
    }
    aoMover(e)
  }
  const aoSoltar = (e) => {
    if (e.pointerType !== 'mouse') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* sem captura */
      }
    }
    if (arrasto.current.ativo) arrasto.current.ultimo = Date.now()
    aoSair()
  }
  const aoClicarCarta = (e) => {
    if (Date.now() - arrasto.current.ultimo < 450) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div
      ref={ref}
      onPointerMove={aoMoverPointer}
      onPointerLeave={aoSair}
      onPointerDown={aoClicar}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onClick={aoClicarCarta}
      className={`profile-card profile-card--${v} group ${
        wide
          ? 'profile-card--wide'
          : violet
            ? 'profile-card--violet aspect-[3/4]'
            : v === 'river'
              ? 'aspect-[4/5]'
              : 'min-h-[440px]'
      } ${className}`}
      style={{ '--pc-accent': accent }}
    >
      {v === 'dvd' && (
        <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/70 via-black/45 to-black/90" />
      )}
      <span className="pc-watermark" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, row) => (
          <span key={row} className="pc-watermark-row">
            {Array.from({ length: 6 }).map((_, col) => (
              <span key={col} className="pc-watermark-word">
                {marca}
              </span>
            ))}
          </span>
        ))}
      </span>
      <span className="pc-glow" aria-hidden="true" />
      <span className="pc-ripple" aria-hidden="true" />

      <div className={`pc-body relative z-10 flex h-full flex-col ${v === 'sleepin' || v === 'dev' || v === 'river' || v.startsWith('foto-') ? 'p-0' : 'p-4 sm:p-5'}`}>
        {v.startsWith('foto-') ? (
          <div className={`foto-card foto-card--${v.replace('foto-', '')}`}>
            <img
              src={FOTO_SRC[v]}
              alt=""
              loading="lazy"
              className="foto-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="foto-veu" aria-hidden="true" />
            <span className="foto-tag">{FOTO_TAG[v] || 'Locaus'}</span>
            <h3 className="foto-nome">{username}</h3>
            <span className="foto-sub">Membro Locaus · #{id}</span>
            <span className="foto-marca" aria-hidden="true">
              {username}
            </span>
          </div>
        ) : v === 'sleepin' || v === 'dev' ? (
          <div className="sleepin-body">
            <div className="sleepin-bg" aria-hidden="true">
              <ProfileBanner bannerId={perfil.banner_id} overlay="from-black/30 via-black/25 to-black/85" />
            </div>
            <div className="sleepin-top">
              <img
                src={avatar}
                alt={username}
                loading="lazy"
                className="sleepin-avatar"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
              <div className="sleepin-title">
                <span className="sleepin-kicker">AIMER LICENSE</span>
                <h3 className={`sleepin-name ${nomeCls || 'text-white'}`}>{username}</h3>
                <p>@{username} · Membro #{id}</p>
              </div>
            </div>
            <div className="sleepin-grid">
              <div><span>NAME</span><strong>{username}</strong></div>
              <div><span>TEAM</span><strong>{perfil.team || 'LOCAUS'}</strong></div>
              <div><span>STATUS</span><strong>LOCAUS</strong></div>
              <div><span>COUNTRY</span><strong>{perfil.country || 'PT'} {ano(perfil.created_at)}</strong></div>
              <div><span>SENS</span><strong>{perfil.sens || '—'}</strong></div>
              <div><span>DPI</span><strong>{perfil.dpi || '—'}</strong></div>
              <div><span>POLLING</span><strong>{perfil.polling || '1000 Hz'}</strong></div>
              <div><span>MOUSE</span><strong>{perfil.mouse || '—'}</strong></div>
            </div>
            <div className="sleepin-foot">
              <span>F1 V3 ULTIMATE+</span>
              <span>{perfil.keyboard || 'ES EDT70'}</span>
              <span className="sleepin-sign">{username}</span>
            </div>
            <p className="sleepin-barcode">{barcode}</p>
          </div>
        ) : v === 'river' ? (
          <div className="river-body">
            <div className="river-head">
              <span className="river-name">
                {username} <Star className="h-3 w-3" />
              </span>
              <span className="river-mark">✦</span>
            </div>
            <div className="river-banner">
              <span className="river-word">MENTALIST</span>
              <img
                src={avatar}
                alt={username}
                loading="lazy"
                className="river-avatar"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
              <span className="river-phonetic">/ˈmen·tə·list/ noun.</span>
            </div>
            <div className="river-chips">
              <span className="river-chip river-chip--master">master</span>
              <span className="river-chip">locaus</span>
              <span className="river-chip">sea aim</span>
            </div>
            <div className="river-stats">
              <div><span>VALORANT SENS</span><strong>{perfil.sens || '0.163'}</strong></div>
              <div><span>DPI</span><strong>{perfil.dpi || '1600'}</strong></div>
              <div><span>POLLING</span><strong>{perfil.polling || '2000 hz'}</strong></div>
            </div>
            <ul className="river-gear">
              <li><Mouse className="h-3.5 w-3.5" /> {perfil.mouse || 'viper v4 pro'} <span>RAZER</span></li>
              <li><Keyboard className="h-3.5 w-3.5" /> {perfil.keyboard || 'sp-005 (summer miku)'} <span>WALLHACK</span></li>
              <li><Monitor className="h-3.5 w-3.5" /> {perfil.monitor || '80he+ tenz'} <span>WOOTING</span></li>
              <li><Headphones className="h-3.5 w-3.5" /> {perfil.headset || 'arctis nova pro wireless'} <span>STEELSERIES</span></li>
            </ul>
            <div className="river-foot">
              #{id} · 9 GEAR · {ano(perfil.created_at)} <span>kova.</span>
            </div>
          </div>
        ) : v === 'arte-tranzit' ? (
          <div className="tranzit-body">
            <div className="tranzit-top">
              <span className="tranzit-tag">Tranzit</span>
              <span className="tranzit-stamp" aria-hidden="true">
                <b>GREEN RUN</b>
                <i>PT · {ano(perfil.created_at)}</i>
              </span>
            </div>

            <div className="tranzit-center">
              <span className="tranzit-kicker">Greetings from</span>
              <h3 className={`tranzit-name ${nomeCls || ''}`}>{username}</h3>
              <span className="tranzit-user">@{username} · Membro #{id}</span>
            </div>

            <div className="tranzit-foot">
              <span className="tranzit-postmark">Locaus · {ano(perfil.created_at)}</span>
              <span className="tranzit-serial">#{id}</span>
            </div>
          </div>
        ) : v === 'arte-hipnose' ? (
          <div className="hip-body">
            <div className="hip-top">
              <span className="hip-nome">{username}</span>
              <span className="hip-hp">HP <b>100</b></span>
            </div>
            <div className="hip-tipo">
              <span className="hip-badge">Psychic</span>
              <span className="hip-num">#{id}</span>
            </div>
            <div className="hip-ataque">
              <div className="hip-ataque-top">
                <span>Hipnose</span>
                <b>40</b>
              </div>
              <p>O adversário fica confuso e vê o perfil em loop.</p>
            </div>
            <div className="hip-rodape">
              <span>Fraqueza · sono</span>
              <span>Locaus {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-eter' ? (
          <div className="eter-body">
            <div className="eter-head">
              <span className="eter-badge">Trainer</span>
              <span className="eter-num">#{id}</span>
            </div>
            <h3 className="eter-nome">{username}</h3>
            <div className="eter-caixa">
              <p>
                <b>Éter</b> — cura 30 de dano de cada membro do teu lado.
              </p>
              <p className="eter-flavor">“O vazio também respira.”</p>
            </div>
            <div className="eter-rodape">
              <span>Locaus · {ano(perfil.created_at)}</span>
              <span>90/90</span>
            </div>
          </div>
        ) : v === 'arte-rubra' ? (
          <div className="rub-body">
            <div className="rub-head">
              <span>República Locaus</span>
              <span>Cartão de membro</span>
            </div>
            <div className="rub-meio">
              <span className="rub-foto">
                <img
                  src={avatar}
                  alt={username}
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fb) return
                    e.currentTarget.dataset.fb = '1'
                    e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                  }}
                />
              </span>
              <div className="rub-dados">
                <p>
                  <span>Nome</span>
                  <b>{username}</b>
                </p>
                <p>
                  <span>Nº</span>
                  <b>#{id}</b>
                </p>
                <p>
                  <span>Desde</span>
                  <b>{ano(perfil.created_at)}</b>
                </p>
              </div>
            </div>
            <div className="rub-chip" />
            <p className="rub-serie">{barcode}</p>
          </div>
        ) : v === 'arte-oxido' ? (
          <div className="oxi-body">
            <div className="oxi-head">
              <span>Locaus · Registo</span>
              <span className="oxi-carimbo">válido</span>
            </div>
            <div className="oxi-nome">{username}</div>
            <div className="oxi-linhas">
              <p>
                Operador <b>#{id}</b>
              </p>
              <p>
                Setor <b>Ferro-velho</b>
              </p>
              <p>
                Desde <b>{ano(perfil.created_at)}</b>
              </p>
            </div>
            <p className="oxi-rodape">Propriedade da Locaus · não transferível</p>
          </div>
        ) : v === 'arte-cromo' ? (
          <div className="crom-body">
            <div className="crom-top">
              <span>Locaus</span>
              <span>{ano(perfil.created_at)}</span>
            </div>
            <div className="crom-centro">
              <span className="crom-mono">{String(username).slice(0, 1).toUpperCase()}</span>
              <h3 className="crom-nome">{username}</h3>
              <span className="crom-sub">Membro #{id}</span>
            </div>
            <div className="crom-rodape">
              <span className="crom-linha" />
              <span>Cromo · série {id}</span>
            </div>
          </div>
        ) : v === 'arte-aurora' ? (
          <div className="aur-body">
            <span className="aur-kicker">Locaus</span>
            <h3 className="aur-nome">{username}</h3>
            <span className="aur-sub">Membro #{id} · {ano(perfil.created_at)}</span>
            <span className="aur-rule" />
            <span className="aur-rodape">Aurora</span>
          </div>
        ) : v === 'arte-malaquite' ? (
          <div className="mal-body">
            <div className="mal-top">
              <span>Malaquite</span>
              <span>47°N · 8°W</span>
            </div>
            <div className="mal-centro">
              <span className="mal-coord">Elev. 1.240 m</span>
              <h3 className="mal-nome">{username}</h3>
            </div>
            <div className="mal-grade">
              <span>Setor {id}</span>
              <span>Escala 1:{id}00</span>
              <span>Locaus {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-filigrana' ? (
          <div className="fil-body">
            <span className="fil-orn">❦</span>
            <h3 className="fil-nome">{username}</h3>
            <span className="fil-rule" />
            <span className="fil-sub">Filigrana · Membro #{id}</span>
            <span className="fil-rodape">Locaus {ano(perfil.created_at)}</span>
          </div>
        ) : v === 'arte-dragao' ? (
          <div className="dra-body">
            <div className="dra-lado">
              <span className="dra-selo">{String(username).slice(0, 1).toUpperCase()}</span>
              <h3 className="dra-vertical">{username}</h3>
            </div>
            <div className="dra-dir">
              <span className="dra-titulo">Dragão</span>
              <span className="dra-sub">
                Membro #{id}
                <br />
                Locaus {ano(perfil.created_at)}
              </span>
            </div>
          </div>
        ) : v === 'arte-estrela' ? (
          <div className="est-body">
            <div className="est-top">
              <span>Estrela</span>
              <span>#{id}</span>
            </div>
            <h3 className="est-nome">{username}</h3>
            <span className="est-linha" />
            <span className="est-sub">Membro Locaus · {ano(perfil.created_at)}</span>
            <div className="est-rodape">
              <span>Olho aberto</span>
              <span>Locaus</span>
            </div>
          </div>
        ) : v === 'arte-ouro' ? (
          <div className="our-body">
            <span className="our-kicker">Locaus</span>
            <h3 className="our-nome">{username}</h3>
            <span className="our-rule" />
            <span className="our-sub">Ouro · Membro #{id}</span>
            <span className="our-rodape">{ano(perfil.created_at)} · Série {id}</span>
          </div>
        ) : v === 'arte-vidro' ? (
          <div className="vid-body">
            <div className="vid-top">
              <span>Obj: Vidro</span>
              <span>#{id}</span>
            </div>
            <div className="vid-centro">
              <span className="vid-obj">Material · cristal</span>
              <h3 className="vid-nome">{username}</h3>
              <span className="vid-linha" />
            </div>
            <div className="vid-rodape">
              <span>Locaus</span>
              <span>{ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-operador' ? (
          <div className="ope-body">
            <div className="ope-top">
              <span>Dossiê · Operador</span>
              <span className="ope-selo">Ativo</span>
            </div>
            <h3 className="ope-nome">{username}</h3>
            <span className="ope-redig" />
            <div className="ope-linhas">
              <p>
                ID <b>#{id}</b>
              </p>
              <p>
                Unidade <b>Locaus</b>
              </p>
              <p>
                Estado <b>Ativo</b>
              </p>
            </div>
            <p className="ope-rodape">Confidencial · {ano(perfil.created_at)}</p>
          </div>
        ) : v === 'arte-inverno' ? (
          <div className="inv-body">
            <span className="inv-top">Inverno</span>
            <h3 className="inv-nome">{username}</h3>
            <span className="inv-rule" />
            <div className="inv-rodape">
              <span>Membro #{id}</span>
              <span>Locaus {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-corrente' ? (
          <div className="cor-body">
            <div className="cor-top">
              <span>Chain</span>
              <span>#{id}</span>
            </div>
            <div className="cor-centro">
              <h3 className="cor-nome">{username}</h3>
              <span className="cor-sub">Membro Locaus</span>
            </div>
            <div className="cor-rodape">
              <span>{ano(perfil.created_at)}</span>
              <span>Série {id}</span>
            </div>
          </div>
        ) : v === 'arte-vela' ? (
          <div className="vel-body">
            <div className="vel-top">
              <span>Vela</span>
              <span>Alto mar</span>
            </div>
            <h3 className="vel-nome">{username}</h3>
            <div className="vel-linha" />
            <div className="vel-rodape">
              <span>Maré 3,2 m</span>
              <span>Locaus {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-siberia' ? (
          <div className="sib-body">
            <div className="sib-top">
              <span>−40°C</span>
              <span>Sibéria</span>
            </div>
            <h3 className="sib-nome">{username}</h3>
            <span className="sib-sub">Membro #{id} · {ano(perfil.created_at)}</span>
          </div>
        ) : v === 'arte-mercurio' ? (
          <div className="mer-body">
            <div className="mer-top">
              <span>Mercúrio</span>
              <span>Hg · 80</span>
            </div>
            <h3 className="mer-nome">{username}</h3>
            <div className="mer-linha" />
            <span className="mer-sub">Membro Locaus · #{id}</span>
          </div>
        ) : v === 'arte-marmore' ? (
          <div className="mar-body">
            <div className="mar-moldura">
              <span className="mar-kicker">Mármore</span>
              <h3 className="mar-nome">{username}</h3>
              <span className="mar-sub">Membro #{id}</span>
              <span className="mar-rodape">Locaus {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-tinta' ? (
          <div className="tin-body">
            <span className="tin-selo">✦</span>
            <h3 className="tin-nome">{username}</h3>
            <span className="tin-sub">Tinta · #{id}</span>
            <span className="tin-rodape">Locaus {ano(perfil.created_at)}</span>
          </div>
        ) : v === 'arte-asfalto' ? (
          <div className="asf-body">
            <div className="asf-top">
              <span>Asfalto</span>
              <span>280 km/h</span>
            </div>
            <div className="asf-centro">
              <span className="asf-kicker">Night drive</span>
              <h3 className="asf-nome">{username}</h3>
              <span className="asf-linha" />
            </div>
            <div className="asf-rodape">
              <span>Locaus {ano(perfil.created_at)}</span>
              <span>#{id}</span>
            </div>
          </div>
        ) : v === 'arte-ouro-negro' ? (
          <div className="oun-body">
            <span className="oun-barra">{String(username).slice(0, 1).toUpperCase()}</span>
            <div className="oun-dir">
              <span className="oun-kicker">Ouro Negro</span>
              <h3 className="oun-nome">{username}</h3>
              <span className="oun-sub">Membro #{id} · {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-glitch' ? (
          <div className="gli-body">
            <div className="gli-top">
              <span>Glitch</span>
              <span>ERR 0x{id}</span>
            </div>
            <h3 className="gli-nome">{username}</h3>
            <div className="gli-rodape">
              <span>Signal lost</span>
              <span>Locaus</span>
            </div>
          </div>
        ) : v === 'arte-anjo' ? (
          <div className="anj-body">
            <span className="anj-halo" aria-hidden="true" />
            <span className="anj-foto">
              <img
                src={avatar}
                alt={username}
                loading="lazy"
                onError={(e) => {
                  if (e.currentTarget.dataset.fb) return
                  e.currentTarget.dataset.fb = '1'
                  e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                }}
              />
            </span>
            <h3 className="anj-nome">{username}</h3>
            <span className="anj-sub">Anjo · Membro #{id}</span>
            <span className="anj-rodape">Locaus {ano(perfil.created_at)}</span>
          </div>
        ) : v === 'arte-teia' ? (
          <div className="tei-body">
            <div className="tei-top">
              <span>Teia</span>
              <span>Web 0{id}</span>
            </div>
            <div className="tei-centro">
              <span className="tei-foto">
                <img
                  src={avatar}
                  alt={username}
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fb) return
                    e.currentTarget.dataset.fb = '1'
                    e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                  }}
                />
              </span>
              <h3 className="tei-nome">{username}</h3>
              <span className="tei-sub">Membro Locaus</span>
            </div>
            <div className="tei-rodape">
              <span>{ano(perfil.created_at)}</span>
              <span>Série {id}</span>
            </div>
          </div>
        ) : v === 'arte-suspenso' ? (
          <div className="sus-body">
            <div className="sus-moldura">
              <div className="sus-top">
                <span>Suspenso</span>
                <span>Gravidade 0</span>
              </div>
              <span className="sus-foto">
                <img
                  src={avatar}
                  alt={username}
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fb) return
                    e.currentTarget.dataset.fb = '1'
                    e.currentTarget.src = svgAvatar(username, '#a1a1aa')
                  }}
                />
              </span>
              <h3 className="sus-nome">{username}</h3>
              <span className="sus-sub">Membro #{id} · {ano(perfil.created_at)}</span>
            </div>
          </div>
        ) : v === 'arte-prisma' ? (
          <div className="pri-body">
            <div className="pri-painel">
              <span className="pri-kicker">Prisma</span>
              <h3 className="pri-nome">{username}</h3>
              <span className="pri-sub">Membro #{id}</span>
            </div>
            <span className="pri-rodape">Locaus {ano(perfil.created_at)}</span>
          </div>
        ) : (
          <>
        <div className="pc-head flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
            {VARIANT_LABEL[v]}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="brand-serif shrink-0 text-sm text-white">locaus.</span>
          </span>
        </div>

        {violet && (
          <div className="pc-mouse-hero mt-3 flex flex-col items-center justify-center gap-1">
            <Mouse className="h-12 w-12 text-zinc-400" />
            <span className="text-[11px] font-semibold text-zinc-300">
              {perfil.mouse || 'Mouse'}
            </span>
          </div>
        )}

        <div className="pc-id mt-4 flex items-center gap-3">
          <img
            src={avatar}
            alt={username}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/15 sm:h-16 sm:w-16"
            onError={(e) => {
              if (e.currentTarget.dataset.fb) return
              e.currentTarget.dataset.fb = '1'
              e.currentTarget.src = svgAvatar(username, '#a1a1aa')
            }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`truncate font-display text-xl font-black sm:text-2xl ${
                  nomeCls || 'text-white'
                }`}
              >
                {username}
              </span>
              {badges.slice(0, 3).map((b) => (
                <BadgeGem key={b.id} badge={b} size={15} />
              ))}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-zinc-500">
              @{username} · Membro #{id}
            </p>
          </div>
        </div>

        <div className="pc-stats mt-4 grid grid-cols-2 gap-1.5">
          <div className="pc-stat">
            <span>Mouse</span>
            <strong>{perfil.mouse || '—'}</strong>
          </div>
          <div className="pc-stat">
            <span>DPI</span>
            <strong>{perfil.dpi || '—'}</strong>
          </div>
        </div>

        {listaJogos.length > 0 && (
          <div className="pc-games mt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Jogos</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listaJogos.slice(0, 5).map((g) => {
                const logoLargo = ['cod', 'cs2'].includes(g)
                return (
                  <div
                    key={g}
                    className={`flex flex-col items-center gap-0.5 ${logoLargo ? 'w-20' : 'w-14'}`}
                  >
                    <span
                      className={`grid place-items-center rounded-xl border border-white/10 bg-white/[0.04] ${
                        logoLargo ? 'h-14 w-20' : 'h-14 w-14'
                      }`}
                    >
                      <GameLogo
                        game={g}
                        className={logoLargo ? 'h-8 w-16' : 'h-9 w-9'}
                      />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="pc-foot mt-auto pt-3">
          <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>LOCAUS · {ano(perfil.created_at)}</span>
            <span>#{id}</span>
          </div>
          <p className="mt-1.5 truncate font-mono text-[8px] tracking-[0.18em] text-zinc-600">
            {barcode}
          </p>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
