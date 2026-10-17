import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

/* ============================================================
   Logo 3D verdadeiro — carrega o modelo /2.glb com Three.js,
   gira em cima de si mesmo e segue o mouse de quem vê.
   Sem quadrado, sem imagem estática: é renderizado em tempo
   real no WebGL, ao estilo "os sites modernos".
   ============================================================ */

function Modelo() {
  const grupo = useRef(null)
  const { scene } = useGLTF('/2.glb')

  useFrame(({ clock, pointer }) => {
    if (!grupo.current) return
    const t = clock.getElapsedTime()
    // rotação constante lenta + inclinação suave com o mouse
    grupo.current.rotation.y = t * 0.6 + pointer.x * 0.5
    grupo.current.rotation.x = 0.15 + pointer.y * 0.35
    grupo.current.position.y = Math.sin(t * 1.2) * 0.08
  })

  return (
    <group ref={grupo}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/2.glb')

export default function Logo3D({ largura = 96, altura = 96 }) {
  return (
    <div
      style={{ width: largura, height: altura }}
      className="pointer-events-auto select-none"
      title="Inicio"
    >
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 40 }}
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
