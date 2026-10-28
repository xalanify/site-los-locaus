import { useEffect, useRef, useState } from 'react'

/* ============================================================
   Panorama 360° da entrada
   ------------------------------------------------------------
   Uma esfera invertida com a imagem equirretangular. No PC a
   vista segue o rato; no telemóvel usa o giroscópio (quando o
   utilizador autoriza) e, como alternativa, arrastar o dedo.
   O Three.js só é descarregado quando esta entrada aparece.
   ============================================================ */
export default function Panorama360({ desktopSrc, mobileSrc, className = '' }) {
  const caixa = useRef(null)
  const [semWebgl, setSemWebgl] = useState(false)

  useEffect(() => {
    let vivo = true
    let renderer = null
    let scene = null
    let camera = null
    let sphere = null
    let raf = 0
    let alvoY = 0
    let alvoX = 0
    let atualY = 0
    let atualX = 0
    let arrastando = false
    let ultimoX = 0
    let ultimoY = 0
    let gyroBase = null
    let jaPediuGyro = false
    let texto3D = null
    let textoBaseY = 0
    const limpar = []

    const iniciar = async () => {
      const el = caixa.current
      if (!el) return

      let THREE
      try {
        THREE = await import('three')
      } catch {
        if (vivo) setSemWebgl(true)
        return
      }
      if (!vivo || !caixa.current) return

      const telemovel = window.matchMedia('(max-width: 768px)').matches
      const src = telemovel && mobileSrc ? mobileSrc : desktopSrc

      try {
        scene = new THREE.Scene()
        camera = new THREE.PerspectiveCamera(72, el.clientWidth / Math.max(1, el.clientHeight), 0.1, 1200)
        camera.position.set(0, 0, 0.01)

        const geometria = new THREE.SphereGeometry(500, 60, 40)
        geometria.scale(-1, 1, 1)

        const textura = new THREE.TextureLoader().load(
          src,
          () => {
            if (vivo && renderer && renderer.domElement) {
              renderer.domElement.style.opacity = '1'
            }
            try {
              const texturaEnv = textura.clone()
              texturaEnv.mapping = THREE.EquirectangularReflectionMapping
              texturaEnv.needsUpdate = true
              const pmrem = new THREE.PMREMGenerator(renderer)
              pmrem.compileEquirectangularShader()
              const ambiente = pmrem.fromEquirectangular(texturaEnv).texture
              scene.environment = ambiente
              pmrem.dispose()
            } catch {
              /* sem reflexos do céu — as luzes chegam */
            }
          },
          undefined,
          () => {
            if (vivo) setSemWebgl(true)
          },
        )
        textura.colorSpace = THREE.SRGBColorSpace
        textura.minFilter = THREE.LinearFilter
        textura.generateMipmaps = false

        sphere = new THREE.Mesh(
          geometria,
          new THREE.MeshBasicMaterial({ map: textura }),
        )
        scene.add(sphere)

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'high-performance',
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telemovel ? 1.5 : 2))
        renderer.setSize(el.clientWidth, el.clientHeight)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.domElement.style.opacity = '0'
        renderer.domElement.style.transition = 'opacity 700ms ease'
        el.appendChild(renderer.domElement)

        // Luzes + ambiente: o texto 3D é metálico e reflete o céu.
        scene.add(new THREE.AmbientLight(0xffffff, 1.25))
        const luzSol = new THREE.DirectionalLight(0xffd9b0, 2.4)
        luzSol.position.set(5, 8, 4)
        scene.add(luzSol)
        const luzRoxa = new THREE.PointLight(0xffffff, 55, 40)
        luzRoxa.position.set(-6, 1.5, 3)
        scene.add(luzRoxa)
        const luzTexto = new THREE.PointLight(0xffffff, 28, 18)
        luzTexto.position.set(0, 3.4, -5)
        scene.add(luzTexto)

        const carregarTexto3D = async () => {
          try {
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
            const loader = new GLTFLoader()
            loader.load('/boot/LOCAUS3D.gltf', (gltf) => {
              if (!vivo) return
              const modelo = gltf.scene
              const caixa = new THREE.Box3().setFromObject(modelo)
              const tamanho = caixa.getSize(new THREE.Vector3())
              const centro = caixa.getCenter(new THREE.Vector3())
              modelo.position.sub(centro)

              const z = -9
              const visivel =
                2 * Math.abs(z) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect
              const larguraAlvo = Math.min(9.5, visivel * 0.72)
              const escala = larguraAlvo / Math.max(0.001, tamanho.x)
              modelo.scale.setScalar(escala)

              const caixa2 = new THREE.Box3().setFromObject(modelo)
              const centro2 = caixa2.getCenter(new THREE.Vector3())
              textoBaseY = 3.05
              modelo.position.x = 0
              modelo.position.y += textoBaseY - centro2.y
              modelo.position.z = z

              modelo.traverse((o) => {
                if (o.isMesh && o.material) {
                  if (o.material.color) o.material.color.setHex(0xf4f4f5)
                  if (o.material.metalness != null) o.material.metalness = 0.55
                  if (o.material.roughness != null) o.material.roughness = 0.25
                  o.material.envMapIntensity = 2.2
                  if (o.material.emissive) {
                    o.material.emissive.setHex(0x4a4a52)
                    o.material.emissiveIntensity = 0.5
                  }
                  o.material.needsUpdate = true
                }
              })

              scene.add(modelo)
              texto3D = modelo
            })
          } catch {
            /* sem texto 3D — fica só o panorama */
          }
        }
        carregarTexto3D()

        const largura = () => el.clientWidth || window.innerWidth
        const altura = () => el.clientHeight || window.innerHeight

        const aoMover = (e) => {
          if (arrastando) {
            const dx = e.clientX - ultimoX
            const dy = e.clientY - ultimoY
            ultimoX = e.clientX
            ultimoY = e.clientY
            alvoY += dx * 0.0042
            alvoX = Math.max(-0.4, Math.min(0.4, alvoX + dy * 0.0028))
            return
          }
          if (e.pointerType === 'touch') return
          const x = (e.clientX / largura()) * 2 - 1
          const y = (e.clientY / altura()) * 2 - 1
          alvoY = x * 1.35
          alvoX = Math.max(-0.32, Math.min(0.32, y * 0.32))
        }

        const aoPremir = (e) => {
          const alvo = e.target
          if (
            alvo &&
            alvo.closest &&
            alvo.closest('button, a, input, select, textarea, [role="button"], [role="link"]')
          ) {
            return
          }
          arrastando = true
          ultimoX = e.clientX
          ultimoY = e.clientY
          if (e.pointerType === 'touch' && !jaPediuGyro) {
            jaPediuGyro = true
            pedirGyro()
          }
        }
        const aoLargar = () => {
          arrastando = false
        }

        const aoGirar = (e) => {
          if (e.alpha == null) return
          if (gyroBase == null) gyroBase = e.alpha
          let delta = e.alpha - gyroBase
          if (delta > 180) delta -= 360
          if (delta < -180) delta += 360
          alvoY = -delta * (Math.PI / 180)
        }

        function pedirGyro() {
          const DOE = window.DeviceOrientationEvent
          if (!DOE) return
          try {
            if (typeof DOE.requestPermission === 'function') {
              DOE.requestPermission()
                .then((estado) => {
                  if (estado === 'granted' && vivo) {
                    window.addEventListener('deviceorientation', aoGirar)
                    limpar.push(() => window.removeEventListener('deviceorientation', aoGirar))
                  }
                })
                .catch(() => {})
            } else {
              window.addEventListener('deviceorientation', aoGirar)
              limpar.push(() => window.removeEventListener('deviceorientation', aoGirar))
            }
          } catch {
            /* segue só com o arrasto */
          }
        }

        const aoRedimensionar = () => {
          if (!renderer || !camera) return
          camera.aspect = largura() / Math.max(1, altura())
          camera.updateProjectionMatrix()
          renderer.setSize(largura(), altura())
        }

        const aoPedirGyro = () => {
          jaPediuGyro = true
          pedirGyro()
        }
        window.addEventListener('locaus:pedir-gyro', aoPedirGyro)
        limpar.push(() => window.removeEventListener('locaus:pedir-gyro', aoPedirGyro))

        window.addEventListener('pointerdown', aoPremir)
        window.addEventListener('pointermove', aoMover)
        window.addEventListener('pointerup', aoLargar)
        window.addEventListener('pointercancel', aoLargar)
        window.addEventListener('resize', aoRedimensionar)
        limpar.push(() => window.removeEventListener('pointerdown', aoPremir))
        limpar.push(() => window.removeEventListener('pointermove', aoMover))
        limpar.push(() => window.removeEventListener('pointerup', aoLargar))
        limpar.push(() => window.removeEventListener('pointercancel', aoLargar))
        limpar.push(() => window.removeEventListener('resize', aoRedimensionar))

        const animar = () => {
          if (!vivo) return
          raf = requestAnimationFrame(animar)
          atualY += (alvoY - atualY) * 0.055
          atualX += (alvoX - atualX) * 0.055
          sphere.rotation.y = atualY
          sphere.rotation.x = atualX
          if (texto3D) {
            const t = performance.now() * 0.001
            const parallax = Math.max(-0.32, Math.min(0.32, atualY * 0.16))
            texto3D.rotation.y = Math.sin(t * 0.55) * 0.06 + parallax
            texto3D.position.x = Math.max(-0.8, Math.min(0.8, atualY * 0.3))
            texto3D.position.y = textoBaseY + Math.sin(t * 0.9) * 0.045
          }
          renderer.render(scene, camera)
        }
        animar()
      } catch {
        if (vivo) setSemWebgl(true)
      }
    }

    iniciar()

    return () => {
      vivo = false
      if (raf) cancelAnimationFrame(raf)
      limpar.forEach((fn) => {
        try {
          fn()
        } catch {
          /* ignora */
        }
      })
      try {
        if (sphere) {
          sphere.geometry?.dispose?.()
          sphere.material?.map?.dispose?.()
          sphere.material?.dispose?.()
        }
        if (renderer) {
          renderer.dispose()
          const canvas = renderer.domElement
          if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
        }
      } catch {
        /* ignora */
      }
    }
  }, [desktopSrc, mobileSrc])

  return (
    <div
      ref={caixa}
      className={`pano-fundo absolute inset-0 overflow-hidden bg-[#08080a] ${className}`}
      style={{
        backgroundImage: `url("${mobileSrc || desktopSrc}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      aria-hidden="true"
    >
      {semWebgl && (
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `url("${desktopSrc}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </div>
  )
}
