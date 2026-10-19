import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/* Se uma página rebentar no render (um campo undefined, uma resposta
   com formato inesperado…), o React desmontava a app TODA e ficava um
   ecrã branco sem explicação nenhuma.

   Este muro apanha o erro, mostra um cartão e deixa tentar outra vez
   ou recarregar — o resto do site (sidebar, sessão, navegação) fica
   vivo. Fica à volta das rotas, com key no caminho da página, para
   que navegar para outro sítio limpe o erro sozinho. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    // fica no registo do browser — ajuda a perceber o que se passou
    console.error('Página rebentou:', erro, info)
  }

  render() {
    if (!this.state.erro) return this.props.children

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-white/[0.04] p-6 text-center backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 ring-1 ring-red-400/30">
            <AlertTriangle className="h-6 w-6 text-red-300" />
          </div>

          <h2 className="text-lg font-black text-white">Esta secção deu um nó</h2>
          <p className="mt-2 text-sm text-gray-400">
            Um erro inesperado travou só esta página — o resto do site continua bem.
          </p>

          {this.state.erro && this.state.erro.message && (
            <p className="mt-3 break-words rounded-xl bg-black/30 p-2 text-left text-[11px] font-mono text-red-300/80">
              {String(this.state.erro.message)}
            </p>
          )}

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ erro: null })}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-gray-200 transition-colors hover:bg-white/20"
            >
              Tentar outra vez
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-400"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
