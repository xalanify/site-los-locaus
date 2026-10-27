import { useEffect, useState } from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'

/* ============================================================
   INSTALAR COMO APP (PWA) — só em telemóvel
   ------------------------------------------------------------
   Aparece na home, por baixo do cartão do canal:
   · Android/Chrome: o browser dispara beforeinstallprompt e
     o botão abre o prompt de instalação nativo num clique direto.
   · iPhone/iPad: a Apple não deixa instalar com API, então o
     clique mostra um mini-guia Partilhar → Adicionar ao Ecrã Principal.
   · Se já estiver instalado (standalone), não aparece.
   · O X esconde para sempre neste browser.
   ============================================================ */

const CHAVE = 'aj-install-dismiss'

function eTelemovel() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const movel = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile|Windows Phone/i.test(ua)
  const ipadNovo = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  return movel || ipadNovo
}

function jaInstalado() {
  if (typeof window === 'undefined') return false
  const standalone =
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
  return Boolean(standalone || window.navigator.standalone === true)
}

export default function InstalarApp() {
  const [visivel, setVisivel] = useState(false)
  const [ajuda, setAjuda] = useState('') // 'ios' | 'manual'

  useEffect(() => {
    if (!eTelemovel() || jaInstalado()) return undefined
    try {
      if (localStorage.getItem(CHAVE) === '1') return undefined
    } catch {
      /* segue */
    }
    setVisivel(true)
  }, [])

  const prompt = window.__ajInstallPrompt || null

  const instalar = async () => {
    const ua = navigator.userAgent || ''
    const brave = /Brave/i.test(ua) || (typeof navigator.brave !== 'undefined')
    // No Brave o prompt nativo pode disparar mas falhar por causa dos Shields.
    // Por isso, no Brave mostramos sempre as instruções manuais.
    if (prompt && !brave) {
      try {
        await prompt.prompt()
        const escolha = await prompt.userChoice
        if (escolha && escolha.outcome === 'accepted') setVisivel(false)
      } catch {}
      return
    }
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    if (brave) setAjuda('brave')
    else if (ios) setAjuda('ios')
    else setAjuda('manual')
  }

  const fechar = () => {
    setVisivel(false)
    try {
      localStorage.setItem(CHAVE, '1')
    } catch {
      /* sem armazenamento */
    }
  }

  if (!visivel) return null

  return (
    <div className="mx-auto mt-4 max-w-2xl px-4 sm:hidden">
      <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-violet-500/10 p-4">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar sugestão de instalação"
          className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-400/30">
            <Smartphone className="h-5 w-5 text-violet-300" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">
              Estás num telemóvel
            </p>
            <h3 className="mt-1 font-display text-base font-black leading-snug text-white">
              Instala o site como app
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Fica no ecrã principal, abre num toque e sem barra do browser — como uma app.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={instalar}
          className="ui-btn ui-btn-primary mt-3 w-full"
        >
          <Download className="h-4 w-4" />
          Instalar app
        </button>

        {ajuda === 'ios' && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-black/30 p-3 text-xs leading-relaxed text-gray-300">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <span>
              No iPhone: toca em <b className="text-white">Partilhar</b> e depois em{' '}
              <b className="text-white">Adicionar ao Ecrã Principal</b>.
            </span>
          </div>
        )}

        {ajuda === 'brave' && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-black/30 p-3 text-xs leading-relaxed text-gray-300">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <span>
              No Brave a instalação nativa pode falhar por causa dos Shields. Toca no ícone do{' '}
              <b className="text-white">leão</b> (Shields) na barra de endereço, desativa os Shields
              para este site, e depois usa o menu (⋮) → <b className="text-white">Instalar aplicação</b>.
            </span>
          </div>
        )}

        {ajuda === 'manual' && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-black/30 p-3 text-xs leading-relaxed text-gray-300">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <span>
              Abre o menu do browser (⋮) e escolhe{' '}
              <b className="text-white">Instalar aplicação</b> ou{' '}
              <b className="text-white">Adicionar ao ecrã principal</b>.
            </span>
          </div>
        )}

        <p className="mt-3 text-center text-[10px] text-gray-600">
          Versão para telemóvel ainda em melhoria contínua.
        </p>
      </div>
    </div>
  )
}
