import { Clock } from 'lucide-react'

/* Aviso "Em breve" dos clips — só texto a flutuar no topo da
   página inicial, logo abaixo da barra de navegação (sem caixa
   nem fundo). */
export default function ClipNotice() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-20 text-center sm:px-6">
      <p
        className="inline-flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-[0.3em] text-orange-400"
        style={{ textShadow: '0 0 16px rgba(255,140,40,.55)' }}
      >
        <Clock className="h-3.5 w-3.5" />
        Em breve
      </p>
      <p className="mt-1.5 text-sm text-gray-400">
        Estamos a preparar a <span className="font-bold text-white">publicação de clips</span> no
        site — já vai estar disponível por aqui.
      </p>
    </div>
  )
}
