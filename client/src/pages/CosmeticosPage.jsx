import { useState } from 'react'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import Mercado from '../components/Mercado'
import MeusItens from '../components/MeusItens'
import Historico from '../components/Historico'

/* ============================================================
   MERCADO DE COSMÉTICOS — aberto a todos os membros.
   ============================================================ */

const ABAS = [
  { id: 'mercado', nome: 'Mercado ao vivo' },
  { id: 'meus', nome: 'Os meus itens' },
  { id: 'historico', nome: 'Histórico' },
]

export default function CosmeticosPage() {
  const [aba, setAba] = useState('mercado')

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={
            <>
              Mercado <span className="gradient-text">de cosméticos</span>
            </>
          }
          badge="Mercado ao vivo"
          subtitle="Compra e vende cartas e cores de nome. Os preços sobem e descem ao longo do dia."
        />

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
