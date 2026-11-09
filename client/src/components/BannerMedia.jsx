/* Média do banner: imagem/GIF ou vídeo MP4/WebM. */
export default function BannerMedia({ banner, className = '', style, ...props }) {
  const src = banner && banner.ficheiro
  if (!src) return null
  const ehVideo = /\.(mp4|webm)(\?|$)/i.test(src)

  if (ehVideo) {
    return (
      <video
        src={src}
        poster={banner.poster || undefined}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        className={className}
        style={style}
        aria-hidden="true"
        {...props}
      />
    )
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={className}
      style={style}
      aria-hidden="true"
      {...props}
    />
  )
}
