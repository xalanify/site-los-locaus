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
  children,
  className = '',
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
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
