import { motion } from 'framer-motion'
import { Wrench, Clock3, Sparkles } from 'lucide-react'
import PageShell from './PageShell'

/* Aviso para quem não é admin: a página ainda está em desenvolvimento.
   O admin continua a ver tudo normalmente (downloads, ferramentas, etc.). */
export default function EmDesenvolvimento({ titulo, descricao }) {
  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex min-h-[62vh] max-w-2xl flex-col items-center justify-center text-center"
      >
        <div className="relative mb-6">
          <span className="absolute inset-0 -z-10 rounded-full bg-violet-500/30 blur-2xl" />
          <div className="grid h-20 w-20 place-items-center rounded-3xl border border-violet-400/30 bg-violet-500/15">
            <Wrench className="h-9 w-9 text-violet-300" />
          </div>
          <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20">
            <Clock3 className="h-3.5 w-3.5 text-amber-300" />
          </span>
        </div>

        <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
          {titulo}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-400 sm:text-base">
          {descricao}
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-gray-300">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          Em desenvolvimento — volta em breve
        </div>

        <p className="mt-6 text-[11px] text-gray-600">
          Esta área está reservada a administradores durante os testes.
        </p>
      </motion.div>
    </PageShell>
  )
}
