import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, Music2, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import BannerMedia from './BannerMedia'
import { BANNERS, BANNERS_REMOVIDOS, FUNDOS_REMOVIDOS } from '../data/temasPerfil'
import { BADGES, badgeDe, BadgeGem } from './BadgeGem'
import CartaMusical from './CartaMusical'

const CHAVE = 'locaus:novidades:2026-11-28-cartas-r34-gta5-v4'

const NOMES_BANNER = {
  g02: 'Banner 02',
  g09: 'Banner 09',
  g10: 'Banner 10',
  g15: 'Banner 15',
}
const NOMES_FUNDO = {
  f03: 'Espaço',
  f10: 'Red Dead 2',
  f11: 'Espaço 01',
  f12: 'Espaço 02',
}

export default function AvisosIniciais({ user }) {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(user)
  const [carregado, setCarregado] = useState(false)
  const [novidades, setNovidades] = useState(false)
  const [situacao, setSituacao] = useState(false)
  const decidido = useRef(false)

  useEffect(() => {
    if (!user?.id) return undefined
    // Bloqueia a moeda diária até este aviso decidir se abre.
    window.__novidadesAberta = true
    return () => {
      window.__novidadesAberta = false
      window.dispatchEvent(new Event('locaus:novidades-fechou'))
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return undefined
    let vivo = true
    fetch('/api/users/me', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d) setPerfil(d)
      })
      .catch(() => {})
      .finally(() => vivo && setCarregado(true))
    return () => {
      vivo = false
    }
  }, [user?.id])

  const bannerRemovido = BANNERS_REMOVIDOS.has(perfil?.banner_id)
  const fundoRemovido = FUNDOS_REMOVIDOS.has(perfil?.background_id)
  const temRemovido = bannerRemovido || fundoRemovido

  useEffect(() => {
    if (!carregado || !user?.id || decidido.current) return
    decidido.current = true
    const chave = `${CHAVE}:${user.id}`
    let visto = false
    try {
      visto = localStorage.getItem(chave) === '1'
    } catch {
      visto = false
    }
    if (!visto) {
      setNovidades(true)
      window.__novidadesAberta = true
    } else if (temRemovido) {
      setSituacao(true)
      window.__novidadesAberta = true
    } else {
      window.dispatchEvent(new Event('locaus:novidades-fechou'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado, user?.id])

  const fecharNovidades = (naoMostrar = false) => {
    if (naoMostrar === true) {
      try {
        localStorage.setItem(`${CHAVE}:${user.id}`, '1')
      } catch {
        /* nada */
      }
    }
    setNovidades(false)
    if (temRemovido) {
      window.setTimeout(() => setSituacao(true), 220)
    } else {
      window.__novidadesAberta = false
      window.dispatchEvent(new Event('locaus:novidades-fechou'))
    }
  }

  const fecharSituacao = () => {
    setSituacao(false)
    window.__novidadesAberta = false
    window.dispatchEvent(new Event('locaus:novidades-fechou'))
  }

  const editarPerfil = () => {
    fecharSituacao()
    navigate('/perfil/editar')
  }

  const novosBanners = ['g28', 'g29', 'g30']
    .map((id) => BANNERS.find((b) => b.id === id))
    .filter(Boolean)

  const novosIcones = [
    BADGES.find((b) => b.id === 'dev'),
    BADGES.find((b) => b.id === 'top1'),
    BADGES.find((b) => b.id === 'previsao1'),
    BADGES.find((b) => b.id === 'fortnite-rank1'),
    BADGES.find((b) => b.id === 'cs2-inventory'),
    badgeDe('streak-5'),
  ].filter(Boolean)

  if (!user?.id) return null

  const modal = (conteudo, onFechar, largura = 'max-w-3xl') =>
    createPortal(
      <div
        className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 p-3 sm:p-5"
        onClick={onFechar}
        role="presentation"
      >
        <div
          className={`flex max-h-[92dvh] w-full ${largura} flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#14110c] shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {conteudo}
        </div>
      </div>,
      document.body,
    )

  return (
    <>
      {novidades &&
        modal(
          <>
            <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#e4cf9f]">
                  <Sparkles className="h-3 w-3" /> Novidades
                </p>
                <h2 className="mt-1 font-display text-2xl font-black text-white">
                  Novidades
                </h2>
                <p className="mt-1 text-[12px] text-zinc-400">
                  As cartas com música já estão disponíveis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fecharNovidades(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="flex items-start gap-3 rounded-xl border border-[#c9a86a]/25 bg-[#c9a86a]/[0.07] px-4 py-3">
                <Music2 className="mt-0.5 h-5 w-5 shrink-0 text-[#e4cf9f]" />
                <div>
                  <p className="text-[13px] font-black text-white">Cartas com música</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#d8cbb2]/80">
                    GTA V, Supra, Underground e Niko. No computador ouve o tema ao
                    passar o rato; no telemóvel aparece um botão play por baixo da carta.
                  </p>
                </div>
              </div>

              <section>
                <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  <Sparkles className="h-3 w-3" /> Novas cartas
                </h3>
                <div className="mt-2 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
                  {[
                    { v: 'gta5g', nome: 'GTA V' },
                    { v: 'supra', nome: 'Supra' },
                    { v: 'nfs', nome: 'Underground' },
                    { v: 'niko', nome: 'Niko' },
                  ].map((c) => (
                    <div key={c.v} className="w-[148px] shrink-0 sm:mx-auto sm:w-full sm:max-w-[210px]">
                      <div className="relative aspect-[5/7] overflow-hidden rounded-2xl">
                        <CartaMusical
                          variant={c.v}
                          perfil={perfil || user || {}}
                          username={perfil?.username || user.username}
                          id={perfil?.display_id ?? user.id ?? '—'}
                          semPlayFixo
                        />
                        <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-full bg-[#c9a86a]/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#0b0a08]">
                          Novo
                        </span>
                      </div>
                      <p className="mt-1.5 text-center text-[12px] font-black text-white">{c.nome}</p>
                      <p className="text-center text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        carta com música
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600 lg:hidden">
                  Toca na carta para ouvir
                </p>
              </section>


              <p className="text-[11px] leading-relaxed text-zinc-500">
                As cartas novas já estão no mercado e em <b className="text-zinc-300">/cartas</b>.
              </p>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5">
              <button type="button" onClick={() => fecharNovidades(false)} className="ui-btn ui-btn-ghost ui-btn-sm">
                OK
              </button>
              <button type="button" onClick={() => fecharNovidades(true)} className="ui-btn ui-btn-primary ui-btn-sm">
                Não mostrar novamente
              </button>
            </footer>
          </>,
          () => fecharNovidades(false),
        )}

      {situacao &&
        modal(
          <>
            <header className="flex items-start justify-between gap-3 border-b border-amber-400/20 bg-amber-500/[0.07] px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Atualização do perfil
                </p>
                <h2 className="mt-1 font-display text-2xl font-black text-white">
                  {bannerRemovido && fundoRemovido
                    ? 'O teu banner e fundo foram removidos'
                    : bannerRemovido
                      ? 'O teu banner foi removido'
                      : 'O teu fundo foi removido'}
                </h2>
              </div>
              <button
                type="button"
                onClick={fecharSituacao}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-zinc-400">
              {bannerRemovido && (
                <p>
                  O banner <b className="text-white">{NOMES_BANNER[perfil.banner_id] || perfil.banner_id}</b>{' '}
                  já não existe. O teu perfil está a usar o banner padrão.
                </p>
              )}
              {fundoRemovido && (
                <p>
                  O fundo <b className="text-white">{NOMES_FUNDO[perfil.background_id] || perfil.background_id}</b>{' '}
                  já não existe. O teu perfil está a usar o fundo padrão.
                </p>
              )}
              <p>
                Escolhe um novo visual no editor do perfil para ficares com o teu estilo outra vez.
              </p>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5">
              <button type="button" onClick={fecharSituacao} className="ui-btn ui-btn-ghost ui-btn-sm">
                Agora não
              </button>
              <button type="button" onClick={editarPerfil} className="ui-btn ui-btn-primary ui-btn-sm">
                <Pencil className="h-3.5 w-3.5" /> Editar perfil
              </button>
            </footer>
          </>,
          fecharSituacao,
          'max-w-lg',
        )}
    </>
  )
}
