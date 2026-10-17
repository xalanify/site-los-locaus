import { useState, useEffect, useRef } from 'react';

/* ============================================================
   Logo 3D simples (sem bibliotecas externas)
   Usa uma imagem com efeito de inclinação baseada no mouse
   ============================================================ */
export default function GLBLogo() {
  const container = useRef(null);
  const img = useRef(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      const rect = container.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = ((e.clientX - cx) / rect.width) * 2;
      const ry = -((e.clientY - cy) / rect.height) * 2;
      setRot({ x: ry * 15, y: rx * 15 });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <a href="/" className="group flex items-center gap-3 text-xl sm:text-2xl font-black tracking-tight text-white hover:text-violet-300 transition-colors" title="Ashow e Jazer — Início">
      {/* Logo 3D — imagem do ficheiro 2.glb (renderizado como thumb) */}
      <img
        src="/2.glb"
        alt="Logo 3D"
        className="h-10 w-10 rounded-xl object-cover shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        style={{
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale(1.05)`,
          transition: 'transform 0.15s ease-out',
          willChange: 'transform',
        }}
      />
      <span>Ashow e Jazer</span>
    </a>
  );
}
