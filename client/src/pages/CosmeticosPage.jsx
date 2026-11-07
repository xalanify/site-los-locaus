import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Hammer, Lock, Sparkles } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import Mercado from '../components/Mercado'
import MeusItens from '../components/MeusItens'
import Historico from '../components/Historico'

/* ============================================================
   MERCADO DE COSMÉTICOS
   ------------------------------------------------------------
   A loja está fechada ao público enquanto as cartas e o mercado
   estão a ser refeitos. O admin continua a conseguir entrar.
   ============================================================ */

const ABAS = [
  { id: 'mercado', nome: 'Mercado ao vivo' },
  { id: 'meus', nome: 'Os meus itens' },
  { id: 'historico', nome: 'Histórico' },
]

function LojaFechada() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111113] p-6 sm:p-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f7a8a8]/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#f7a8a8]/25 bg-[#f7a8a8]/10 text-[#f7a8a8]">
          <Hammer className="h-8 w-8" />
        </span>
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
          <Lock className="h-3 w-3" /> Loja temporariamente fechada
        </p>
        <h1 className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">
          Estamos a refazer a loja
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          O mercado, as cartas e os preços estão a ser melhorados. Volta em breve — os itens que já
          tens continuam guardados na tua conta e podes equipá-los no editor de perfil.
        </p>

        <div className="mx-auto mt-6 grid max-w-md gap-2 text-left">
          {[
            'Cartas com novos designs e informações',
            'Preços e compras automáticas mais estáveis',
            'Fotos e miniaturas a voltar a funcionar',
          ].map((t) => (
            <div
              key={t}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#f7a8a8]" />
              <span className="text-[12px] font-semibold text-zinc-300">{t}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link to="/" className="ui-btn ui-btn-primary ui-btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao início
          </Link>
          <Link to="/perfil" className="ui-btn ui-btn-ghost ui-btn-sm">
            Editar perfil
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default function CosmeticosPage({ isAdmin = false }) {
  const [aba, setAba] = useState('mercado')

  if (!isAdmin) {
    return (
      <PageShell>
        <PageHeader
          title={
            <>
              Mercado <span className="gradient-text">de cosméticos</span>
            </>
          }
          badge="Em manutenção"
          subtitle="A loja está a ser refeita. Entretanto, mantém os teus itens e equipa-os no perfil."
        />
        <LojaFechada />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={
            <>
              Mercado <span className="gradient-text">de cosméticos</span>
            </>
          }
          badge="Modo admin"
          subtitle="Loja fechada ao público enquanto está a ser refeita. Só o admin vê e testa o mercado."
        />

        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-[11px] font-semibold text-amber-200">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Modo admin — os membros normais veem o aviso de manutenção.
        </div>

        <div className="ui-tabs mb-5">
          {ABAS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              data-active={aba === t.id}
              className="ui-tab"
            >
              {t.nome}
            </button>
          ))}
        </div>

        {aba === 'mercado' ? (
          <Mercado />
        ) : aba === 'meus' ? (
          <MeusItens />
        ) : (
          <Historico />
        )}
      </motion.div>
    </PageShell>
  )
}
