/* ============================================================
   Moldura comum das páginas
   ------------------------------------------------------------
   Todas as páginas usam a mesma largura, o mesmo topo e o mesmo
   alinhamento — para os títulos ficarem sempre no mesmo sítio.
   ============================================================ */
export default function PageShell({
  children,
  className = '',
  narrow = false,
  background = '',
}) {
  return (
    <section className={`page-shell ${className}`}>
      {background && <div className={`perfil-fundo ${background}`} aria-hidden="true" />}
      <div
        className={`page-container ${narrow ? 'max-w-3xl' : ''} ${
          background ? 'relative z-10' : ''
        }`}
      >
        {children}
      </div>
    </section>
  )
}
