import { useMemo, useState } from 'react'
import { Camera, Check, MapPin, RotateCcw, Trophy } from 'lucide-react'
import PageShell from '../components/PageShell'
import PageHeader from '../components/PageHeader'

/* ============================================================
   GeoGuessr GTA — mostra um recorte do mapa de Los Santos e o
   jogador tem de clicar onde fica. 5 rondas, pontuação por
   distância. (Quando houver fotos do GTA, é só trocar a imagem
   do "camera" e manter x/y de cada local.)
   ============================================================ */

const MAPA = { w: 1562, h: 1070, src: '/gta/mapa.jpg' }
const ZOOM = 2.35
const RONDAS = 5
const MAX_PONTOS = 5000

const LOCAIS = [
  { nome: 'Los Santos', x: 0.55, y: 0.62 },
  { nome: 'Vinewood', x: 0.42, y: 0.42 },
  { nome: 'Sandy Shores', x: 0.62, y: 0.22 },
  { nome: 'Paleto Bay', x: 0.3, y: 0.08 },
  { nome: 'Grapeseed', x: 0.78, y: 0.12 },
  { nome: 'Del Perro', x: 0.25, y: 0.72 },
  { nome: 'Aeroporto LSIA', x: 0.62, y: 0.9 },
  { nome: 'Monte Chiliad', x: 0.42, y: 0.12 },
  { nome: 'Vespucci', x: 0.33, y: 0.65 },
  { nome: 'Rockford Hills', x: 0.38, y: 0.5 },
]

const sortear = () => [...LOCAIS].sort(() => Math.random() - 0.5).slice(0, RONDAS)
const distanciaPx = (a, b) => Math.hypot((a.x - b.x) * MAPA.w, (a.y - b.y) * MAPA.h)
const pontosDe = (d) => Math.max(0, Math.round(MAX_PONTOS - d * 6))
const kmDe = (d) => Math.max(0, d * 0.008)

export default function GeoGuessrPage() {
  const [rondas, setRondas] = useState(sortear)
  const [idx, setIdx] = useState(0)
  const [palpite, setPalpite] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [total, setTotal] = useState(0)
  const [fim, setFim] = useState(false)

  const local = rondas[idx]

  const aoClicarMapa = (e) => {
    if (resultado || fim) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    setPalpite({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) })
  }

  const confirmar = () => {
    if (!palpite || !local) return
    const d = distanciaPx(palpite, local)
    const p = pontosDe(d)
    setResultado({ d, p, km: kmDe(d) })
    setTotal((t) => t + p)
  }

  const proxima = () => {
    if (idx + 1 >= rondas.length) {
      setFim(true)
      return
    }
    setIdx((i) => i + 1)
    setPalpite(null)
    setResultado(null)
  }

  const reiniciar = () => {
    setRondas(sortear())
    setIdx(0)
    setPalpite(null)
    setResultado(null)
    setTotal(0)
    setFim(false)
  }

  const crop = useMemo(() => {
    if (!local) return null
    // imagem ampliada (2.35x) centrada no local, mas sempre a cobrir a caixa
    const w = ZOOM * 100
    const h = ZOOM * (MAPA.h / MAPA.w) * 100
    const left = Math.min(0, Math.max(100 - w, 50 - local.x * w))
    const top = Math.min(0, Math.max(100 - h, 50 - local.y * h))
    return {
      width: `${w}%`,
      height: `${h}%`,
      left: `${left}%`,
      top: `${top}%`,
    }
  }, [local])

  return (
    <PageShell>
      <PageHeader
        title="GeoGuessr GTA"
        subtitle="Olha para a câmara e clica no mapa de Los Santos onde achas que fica."
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-zinc-300">
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          {total.toLocaleString('pt-PT')} pts
        </div>
      </PageHeader>

      {fim ? (
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-amber-300" />
          <h2 className="mt-3 font-display text-2xl font-black text-white">Fim do jogo</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Fizeste <b className="text-white">{total.toLocaleString('pt-PT')}</b> de{' '}
            {(RONDAS * MAX_PONTOS).toLocaleString('pt-PT')} pontos.
          </p>
          <button
            type="button"
            onClick={reiniciar}
            className="ui-btn ui-btn-primary ui-btn-sm mt-4 inline-flex"
          >
            <RotateCcw className="h-4 w-4" /> Jogar outra vez
          </button>
        </div>
      ) : (
        <div className="grid gap-4 pb-28 lg:grid-cols-[minmax(0,360px)_1fr] lg:pb-4">
          {/* câmara */}
          <div>
            <div className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl sm:max-w-[340px]">
              {crop && (
                <img
                  src={MAPA.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{ width: crop.width, height: crop.height, left: crop.left, top: crop.top }}
                />
              )}
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
                <Camera className="h-3 w-3" /> Câmara {idx + 1}/{RONDAS}
              </span>
            </div>
            <p className="mt-2 text-center text-[11px] font-semibold text-zinc-500">
              Onde fica esta zona do mapa?
            </p>
          </div>

          {/* mapa */}
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black">
              <img
                src={MAPA.src}
                alt="Mapa de Los Santos"
                draggable={false}
                onClick={aoClicarMapa}
                className="block w-full cursor-crosshair select-none"
              />
              {resultado && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <line
                    x1={palpite.x * 100}
                    y1={palpite.y * 100}
                    x2={local.x * 100}
                    y2={local.y * 100}
                    stroke="#f7a8a8"
                    strokeWidth="0.45"
                    strokeDasharray="1.4 1"
                  />
                </svg>
              )}
              {palpite && (
                <span
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ff9e9e] shadow-[0_0_0_3px_rgba(255,158,158,0.25)]"
                  style={{ left: `${palpite.x * 100}%`, top: `${palpite.y * 100}%` }}
                  title="O teu palpite"
                />
              )}
              {resultado && (
                <span
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.3)]"
                  style={{ left: `${local.x * 100}%`, top: `${local.y * 100}%` }}
                  title={local.nome}
                />
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {!resultado ? (
                <>
                  <p className="text-[11px] text-zinc-500">
                    <MapPin className="mr-1 inline h-3.5 w-3.5" />
                    {palpite ? 'Palpite colocado. Confirma.' : 'Clica no mapa para marcares.'}
                  </p>
                  <button
                    type="button"
                    onClick={confirmar}
                    disabled={!palpite}
                    className="ui-btn ui-btn-primary ui-btn-sm disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" /> Confirmar
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-white">
                    {local.nome} · {resultado.km.toFixed(1)} km ·{' '}
                    <span className="text-amber-300">+{resultado.p.toLocaleString('pt-PT')}</span>
                  </p>
                  <button type="button" onClick={proxima} className="ui-btn ui-btn-primary ui-btn-sm">
                    {idx + 1 >= rondas.length ? 'Ver resultado' : 'Próxima'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
