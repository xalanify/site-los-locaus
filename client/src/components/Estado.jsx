import { Inbox } from 'lucide-react'

/* ============================================================
   Estado vazio / erro — um cartão sólido com ícone, título,
   texto e (opcional) ação. Todos os sítios sem conteúdo usam
   este componente para ficarem iguais.
   ============================================================ */
export default function Estado({
  icon: Icon = Inbox,
  titulo = 'Nada por aqui',
  texto = '',
  acao = null, // { label, onClick }
  tipo = 'vazio', // 'vazio' | 'erro'
  compacto = false,
}) {
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`estado glass rounded-2xl ${compacto ? 'estado-curto' : ''}`}
    >
      <span className={`estado-icone ${tipo === 'erro' ? 'erro' : ''}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="estado-titulo">{titulo}</p>
      {texto && <p className="estado-texto">{texto}</p>}
      {acao && (
        <button onClick={acao.onClick} className="btn-glass estado-acao">
          {acao.label}
        </button>
      )}
    </div>
  )
}
