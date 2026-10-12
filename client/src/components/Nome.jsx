import { estiloNome } from '../lib/banners'

/* ============================================================
   Nome de um membro com a cor e o efeito que ele escolheu
   (aparência do perfil — experimental). Sem escolha, fica normal.
   ============================================================ */
export default function Nome({ nome, color, effect, className = '' }) {
  const { className: extra, style } = estiloNome(color, effect)
  return (
    <span className={`${className} ${extra}`.trim()} style={style}>
      {nome}
    </span>
  )
}
