import { motion } from 'framer-motion'

/* ============================================================
   Cabeçalho comum das páginas
   ------------------------------------------------------------
   Título, subtítulo, etiqueta e ações sempre com o mesmo
   tamanho, espaçamento e alinhamento em todas as páginas.
   ============================================================ */
export default function PageHeader({
  title,
  subtitle,
  badge,
  eyebrow,
  children,
  className = '',
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`page-head ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="page-eyebrow">
            Locaus
            {eyebrow && (
              <>
                <span>/</span>
                {eyebrow}
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`page-title ${compact ? 'page-title--compact' : ''}`}>{title}</h1>
            {badge && <span className="page-badge">{badge}</span>}
          </div>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </motion.div>
  )
}
