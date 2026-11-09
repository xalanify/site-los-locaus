import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, Image as ImageIcon, Pencil } from 'lucide-react'
import { authHeaders } from '../lib/auth'
import BannerMedia from './BannerMedia'
import { BANNERS, BANNERS_REMOVIDOS, FUNDOS_REMOVIDOS } from '../data/temasPerfil'
import { BADGES, badgeDe, BadgeGem } from './BadgeGem'

const CHAVE = 'locaus:novidades:2026-11-09-banners-diamante-v1'

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

  const fecharNovidades = () => {
    try {
      localStorage.setItem(`${CHAVE}:${user.id}`, '1')
    } catch {
      /* nada */
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
          className={`flex max-h-[92dvh] w-full ${largura} flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111113] shadow-2xl`}
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
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#c4b5fd]">
                  <Sparkles className="h-3 w-3" /> Novidades
                </p>
                <h2 className="mt-1 font-display text-2xl font-black text-white">
                  Novos banners e novas distinções
                </h2>
                <p className="mt-1 text-[12px] text-zinc-400">
                  Três banners novos e um novo visual para as insígnias do site.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharNovidades}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <section>
                <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  <ImageIcon className="h-3 w-3" /> Novos banners
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {novosBanners.map((b) => (
                    <div
                      key={b.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    >
                      <BannerMedia
                        banner={b}
                        className="block h-24 w-full object-cover"
                      />
                      <div className="px-2.5 py-2">
                        <p className="text-[11px] font-bold text-white">{b.nome}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                          disponível no editor
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  <Sparkles className="h-3 w-3" /> Novas distinções
                </h3>
                <div className="mt-2 flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  {novosIcones.map((b) => (
                    <div key={b.id} className="flex w-[78px] flex-col items-center gap-1.5 text-center">
                      <BadgeGem badge={b} size={48} />
                      <span className="text-[8px] font-bold uppercase leading-tight tracking-wide text-zinc-400">
                        {b.id === 'cs2-inventory' ? 'INVENTÁRIO CS2' : b.label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                  As distinções normais passam a usar o <b className="text-zinc-300">diamante</b>,
                  cada uma com a sua cor. O inventário CS2 mais caro usa a nova{' '}
                  <b className="text-zinc-300">cara dourada</b>. O overclock mantém o ícone antigo.
                </p>
              </section>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5">
              <button type="button" onClick={fecharNovidades} className="ui-btn ui-btn-ghost ui-btn-sm">
                OK
              </button>
              <button type="button" onClick={fecharNovidades} className="ui-btn ui-btn-primary ui-btn-sm">
                Não mostrar novamente
              </button>
            </footer>
          </>,
          fecharNovidades,
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
