import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

/* ============================================================
   Logo 3D verdadeiro — carrega /2.glb com Three.js.
   • segue o mouse em QUALQUER parte do ecrã (listener global)
   • NÃO gira automaticamente — só se inclina na direção
     onde o mouse está
   ============================================================ */

/* posição global do mouse, partilhada por todas as cópias (ref externa) */
const alvoGlobal = { x: 0, y: 0 }
let escutaMontada = false

function montarEscutaGlobal() {
  if (escutaMontada) return
  escutaMontada = true
  if (typeof window === 'undefined') return
  window.addEventListener('mousemove', (e) => {
    alvoGlobal.x = (e.clientX / window.innerWidth) * 2 - 1
    alvoGlobal.y = (e.clientY / window.innerHeight) * 2 - 1
  })
}

function Modelo() {
  const grupo = useRef(null)
  const { scene } = useGLTF('/2.glb')

  useFrame(() => {
    if (!grupo.current) return
    const g = grupo.current
    const suave = 0.08
    // só segue o mouse — sem rotação automática
    g.rotation.y += (alvoGlobal.x * 0.6 - g.rotation.y) * suave
    g.rotation.x += (alvoGlobal.y * 0.35 - g.rotation.x) * suave
    g.position.x += (alvoGlobal.x * 0.15 - g.position.x) * suave
    g.position.y += (-alvoGlobal.y * 0.12 - g.position.y) * suave
  })

  return (
    <group ref={grupo}>
      <primitive object={scene} />
    </group>
  )
}

export default function Logo3D({ largura = 90, altura = 90 }) {
  useEffect(montarEscutaGlobal, [])

  return (
    <div
      style={{ width: largura, height: altura }}
      className="pointer-events-auto select-none"
      title="Inicio"
    >
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <directionalLight position={[-3, -2, -3]} intensity={0.8} color="#a78bfa" />
        <Suspense fallback={null}>
          <Modelo />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/2.glb')
