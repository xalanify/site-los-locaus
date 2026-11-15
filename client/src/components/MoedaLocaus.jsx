/* ============================================================
   Moeda Locaus — estrela de 8 pontas em ouro (o formato da
   referência enviada, sem fundo e recolhido a dourado).
   Se existir /moeda-locaus.png (imagem final preparada pelo
   admin) ele é usado automaticamente em vez do desenho.
   ============================================================ */
export default function MoedaLocaus({ size = 20, className = '' }) {
  return (
    <img
      src="/moeda-locaus.png"
      alt="Moeda Locaus"
      width={size}
      height={size}
      className={`moeda-locaus ${className}`}
      draggable={false}
      decoding="async"
      style={{
        flexShrink: 0,
        display: 'block',
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
      }}
    />
  )
}
