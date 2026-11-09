/* ============================================================
   Moeda Locaus — a cara enviada pelo admin, sem fundo.
   A imagem original foi apenas recortada e teve o fundo removido;
   não foi redesenhada nem recriada.
   ============================================================ */
export default function MoedaLocaus({ size = 20, className = '' }) {
  return (
    <img
      src="/moeda-locaus.png"
      alt="Moeda Locaus"
      width={size}
      height={size}
      className={className}
      draggable={false}
      decoding="async"
      style={{
        flexShrink: 0,
        display: 'block',
        width: size,
        height: size,
        objectFit: 'contain',
      }}
    />
  )
}
