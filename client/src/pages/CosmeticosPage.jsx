import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import Mercado from '../components/Mercado'
import MeusItens from '../components/MeusItens'
import Packs from '../components/Packs'
import Historico from '../components/Historico'

/* ============================================================
   MERCADO DE COSMÉTICOS
   ------------------------------------------------------------
   A loja de preços fixos saiu: agora só há mercado (preço a
   mexer com as compras e vendas) e os Locaus Packs.
   ============================================================ */

const ABAS = [
  { id: 'mercado', nome: 'Mercado ao vivo' },
  { id: 'meus', nome: 'Os meus itens' },
  { id: 'packs', nome: 'Packs · Em breve' },
  { id: 'historico', nome: 'Histórico' },
]

export default function CosmeticosPage({ isAdmin = false }) {
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
          badge="Ao vivo"
          subtitle="Cores de nome, cartas e estilos com preço a subir e a descer. Compra, vende e equipa — tudo com Moedas Locaus."
        />

        <div className="mb-5 flex flex-wrap gap-1.5">
          {ABAS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                aba === t.id
                  ? 'border-[#f7a8a8]/50 bg-[#f7a8a8]/15 text-[#f7a8a8]'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white'
              }`}
            >
              {t.nome}
            </button>
          ))}
        </div>

        {aba === 'mercado' ? (
          <Mercado />
        ) : aba === 'meus' ? (
          <MeusItens />
        ) : aba === 'packs' ? (
          isAdmin ? (
            <div>
              <p className="mb-3 text-[11px] font-bold text-amber-300">
                Só tu (admin) vês os packs. Para os membros está “Em breve”.
              </p>
              <Packs />
            </div>
          ) : (
            <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
              <Gift className="mx-auto h-9 w-9 text-zinc-600" />
              <p className="mt-3 text-base font-black text-white">Packs — em breve</p>
              <p className="mt-1 text-xs text-zinc-500">
                Estamos a preparar os Locaus Packs (Básico, Épico e Lendário). Volta em breve.
              </p>
            </div>
          )
        ) : (
          <Historico />
        )}
      </motion.div>
    </PageShell>
  )
}
