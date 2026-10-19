import { useEffect, useState } from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'

/* ============================================================
   INSTALAR COMO APP (PWA) — só em telemóvel
   ------------------------------------------------------------
   Aparece na home, por baixo do cartão do canal:
   · Android/Chrome: usa o beforeinstallprompt (instalação nativa)
   · iPhone/iPad: mostra as instruções Partilhar → Adicionar ao
     Ecrã Principal (a Apple não deixa o botão instalar sozinho)
   · Se já estiver instalado (standalone), não aparece
   · O X esconde para sempre neste browser
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
  const [prompt, setPrompt] = useState(null)
  const [visivel, setVisivel] = useState(false)
  const [ajuda, setAjuda] = useState('') // 'ios' | 'manual'
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (!eTelemovel() || jaInstalado()) return undefined
    try {
      if (localStorage.getItem(CHAVE) === '1') return undefined
    } catch {
      /* segue */
    }

    const ua = navigator.userAgent || ''
    setIos(/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1))
    setVisivel(true)

    const guardarPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
      setVisivel(true)
    }
    const jaFicou = () => setVisivel(false)

    window.addEventListener('beforeinstallprompt', guardarPrompt)
    window.addEventListener('appinstalled', jaFicou)
    return () => {
      window.removeEventListener('beforeinstallprompt', guardarPrompt)
      window.removeEventListener('appinstalled', jaFicou)
    }
  }, [])

  if (!visivel) return null

  const instalar = async () => {
    if (prompt) {
      await prompt.prompt()
      const escolha = await prompt.userChoice
      setPrompt(null)
      if (escolha && escolha.outcome === 'accepted') setVisivel(false)
      return
    }
    // sem prompt nativo: iPhone -> instruções da Apple;
    // outros browsers -> instruções genéricas do menu
    setAjuda(ios ? 'ios' : 'manual')
  }

  const fechar = () => {
    setVisivel(false)
    try {
      localStorage.setItem(CHAVE, '1')
    } catch {
      /* sem armazenamento */
    }
  }

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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-400"
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
