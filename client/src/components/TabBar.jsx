import { useState } from 'react'

/* ============================================================
   Barra de abas em "segmented control" (estilo iOS): um vidro
   com os separadores dentro e o ativo preenchido a violeta.

   Serve para as abas de Clips, Jogos, Atualizações e do painel
   admin — toda a interface passa a ter o mesmo comportamento.
   ============================================================ */
export default function TabBar({ items = [], value, onChange, ariaLabel, className = '' }) {
  const [refAtivo, setRefAtivo] = useState(null)

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`tabbar glass inline-flex max-w-full flex-wrap items-center gap-1 rounded-full p-1 ${className}`}
    >
      {items.map((it) => {
        const ativo = it.id === value
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={ativo}
            disabled={it.disabled}
            ref={ativo ? setRefAtivo : null}
            onClick={() => onChange && onChange(it.id)}
            title={it.title || it.label}
            className={`tab-item ${ativo ? 'tab-ativo' : ''} ${it.Icon ? 'tem-icone' : ''}`}
          >
            {it.Icon && <it.Icon className="h-4 w-4 shrink-0" />}
            <span className="tab-texto">{it.label}</span>
            {it.cont != null && <em className="tab-cont">{it.cont}</em>}
          </button>
        )
      })}
    </div>
  )
}
