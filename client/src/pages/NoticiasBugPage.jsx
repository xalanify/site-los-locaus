import { Navigate } from 'react-router-dom'
import { Bug, Newspaper, RefreshCcw } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'
import { desafioAtivo, marcarBug, useDesafioSabino } from '../lib/desafioSabino'

/* ============================================================
   NOTÍCIAS — página “avariada” do desafio Sabinojr
   ============================================================ */
export default function NoticiasBugPage() {
  const estado = useDesafioSabino()

  if (!desafioAtivo()) return <Navigate to="/" replace />

  const encontrado = Boolean(estado?.bugs?.includes('noticias'))

  return (
    <PageShell>
      <PageHeader
        title="Notícias"
        subtitle="As últimas novidades dos jogos e da comunidade."
      />

      <div className="glass relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#c50337]/10 blur-3xl" />
        <div className="relative flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-[#ff2e5b] ring-1 ring-white/10">
            <Newspaper className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-xl font-black text-white">
            Não foi possível carregar as notícias
          </h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
            O serviço de notícias não respondeu. Tenta novamente mais tarde.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled>
              <RefreshCcw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => marcarBug('noticias')}
              disabled={encontrado}
              className="ui-btn ui-btn-primary ui-btn-sm"
            >
              <Bug className="h-3.5 w-3.5" />
              {encontrado ? 'Bug encontrado' : 'Encontrar bug'}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
