import { motion } from 'framer-motion'
import { Store, Wrench } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'

/* ============================================================
   Loja fechada — estamos a preparar o mercado ao vivo.
   ============================================================ */
export default function CosmeticosPage() {
  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={
            <>
              Loja de <span className="gradient-text">cosméticos</span>
            </>
          }
          badge="Fechada"
          subtitle="Estamos a preparar uma novidade para a comunidade."
        />

        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#121214]/80 p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            <Store className="h-7 w-7 text-zinc-400" />
          </span>
          <h2 className="mt-4 text-xl font-black text-white">Loja fechada</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Estamos a fazer alterações para colocar um <b className="text-white">mercado ao vivo</b>,
            com preços a subir e a descer, históricos e vendas entre membros.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <Wrench className="h-3.5 w-3.5" /> volta em breve
          </p>
        </div>
      </motion.div>
    </PageShell>
  )
}
