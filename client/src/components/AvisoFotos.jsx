import { AlertTriangle } from 'lucide-react'

/* Aviso sempre visível debaixo da navbar: as fotos de perfil estão
   temporariamente indisponíveis, mas o chat continua a funcionar. */
export default function AvisoFotos() {
  return (
    <div className="aviso-fotos" role="status">
      <AlertTriangle className="aviso-fotos-icon" aria-hidden="true" />
      <span className="aviso-fotos-texto aviso-fotos-texto--longo">
        As fotos de perfil não estão a aparecer por enquanto por um problema. O chat continua a
        funcionar.
      </span>
      <span className="aviso-fotos-texto aviso-fotos-texto--curto">
        Fotos de perfil indisponíveis por um problema — o chat continua a funcionar.
      </span>
    </div>
  )
}
