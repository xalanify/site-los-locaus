import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

/* ============================================================
   Avisos (toasts) e diálogos de confirmação
   ------------------------------------------------------------
   Duas coisas pequenas que faltavam em todo o site:

   1) AVISOS — em vez de o erro ficar escondido no canto de cada
      página, aparece uma faixa no fundo do ecrã. Chamar de
      qualquer lado (mesmo fora de componentes React):

          import { toast } from './components/Feedback'
          toast.ok('Guardado!')
          toast.erro('Sem ligação ao servidor.')
          toast.info('A sincronizar…')

   2) CONFIRMAR — perguntas destrutivas deixam de usar a janela
      feia do sistema e passam a usar o estilo do site:

          if (!(await confirmar('Eliminar este clip?'))) return

   Os dois desenham-se no <Toasts /> e <Dialogos /> montados no App.
   ============================================================ */

/* ---------- canal interno (funciona fora de componentes) ---------- */
const ouvintesAviso = new Set()
let seq = 0

export function toast(texto, tipo = 'info') {
  if (!texto) return null
  const aviso = { id: ++seq, texto: String(texto), tipo }
  ouvintesAviso.forEach((f) => f(aviso))
  return aviso.id
}
toast.ok = (t) => toast(t, 'ok')
toast.erro = (t) => toast(t, 'erro')
toast.info = (t) => toast(t, 'info')

const AVISO_ESTILO = {
  ok: { Icone: CheckCircle2, cor: 'text-emerald-300', fundo: 'bg-emerald-500/15', anel: 'ring-emerald-400/30' },
  erro: { Icone: AlertTriangle, cor: 'text-red-300', fundo: 'bg-red-500/15', anel: 'ring-red-400/30' },
  info: { Icone: Info, cor: 'text-zinc-300', fundo: 'bg-zinc-500/15', anel: 'ring-zinc-400/30' },
}

export function Toasts() {
  const [lista, setLista] = useState([])

  useEffect(() => {
    const receber = (aviso) => {
      setLista((prev) => [aviso, ...prev].slice(0, 4))
      setTimeout(() => {
        setLista((prev) => prev.filter((x) => x.id !== aviso.id))
      }, 4200)
    }
    ouvintesAviso.add(receber)
    return () => ouvintesAviso.delete(receber)
  }, [])

  const fechar = (id) => setLista((prev) => prev.filter((x) => x.id !== id))

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence initial={false}>
        {lista.map((a) => {
          const e = AVISO_ESTILO[a.tipo] || AVISO_ESTILO.info
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101012]/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${e.fundo} ${e.anel}`}
              >
                <e.Icone className={`h-4 w-4 ${e.cor}`} />
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold text-gray-100">{a.texto}</p>
              <button
                onClick={() => fechar(a.id)}
                aria-label="Fechar aviso"
                className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/* ---------- diálogo de confirmação (substitui window.confirm) ---------- */
let montarDialogo = null

export function confirmar(texto, opcoes = {}) {
  // se o <Dialogos /> ainda não estiver montado, nunca deixa o botão
  // pendurado: cai no confirm do sistema
  if (!montarDialogo) return Promise.resolve(window.confirm(String(texto || '')))

  return new Promise((resolve) => {
    montarDialogo({
      id: ++seq,
      texto: String(texto || ''),
      titulo: opcoes.titulo || 'Tens a certeza?',
      okTexto: opcoes.okTexto || 'Confirmar',
      cancelarTexto: opcoes.cancelarTexto || 'Cancelar',
      perigoso: opcoes.perigoso !== false,
      resolve,
    })
  })
}

export function Dialogos() {
  const [pedido, setPedido] = useState(null)

  useEffect(() => {
    montarDialogo = (p) => setPedido(p)
    return () => {
      montarDialogo = null
    }
  }, [])

  const responder = (valor) => {
    const atual = pedido
    setPedido(null)
    if (atual) atual.resolve(valor)
  }

  // Enter = confirmar, Esc = cancelar
  useEffect(() => {
    if (!pedido) return undefined
    const tecla = (ev) => {
      if (ev.key === 'Escape') responder(false)
      if (ev.key === 'Enter') responder(true)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pedido])

  return (
    <AnimatePresence>
      {pedido && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => responder(false)}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(ev) => ev.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101012] p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                  pedido.perigoso
                    ? 'bg-red-500/15 ring-red-400/30'
                    : 'bg-zinc-500/15 ring-zinc-400/30'
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${pedido.perigoso ? 'text-red-300' : 'text-zinc-300'}`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-white">{pedido.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{pedido.texto}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => responder(false)}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-gray-200 transition-colors hover:bg-white/20"
              >
                {pedido.cancelarTexto}
              </button>
              <button
                autoFocus
                onClick={() => responder(true)}
                className={`rounded-full px-4 py-2 text-sm font-bold text-white transition-colors ${
                  pedido.perigoso
                    ? 'bg-red-500 hover:bg-red-400'
                    : 'bg-zinc-500 hover:bg-zinc-400'
                }`}
              >
                {pedido.okTexto}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
