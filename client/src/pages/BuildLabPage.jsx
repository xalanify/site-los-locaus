import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  MonitorPlay,
  MemoryStick,
  PlugZap,
  Gauge,
  Swords,
  Flame,
  ArrowRightLeft,
  Info,
  AlertTriangle,
  Check,
  Zap,
  Thermometer,
  Gamepad2,
  RefreshCw,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import {
  CPUS,
  GPUS,
  RAMS,
  PSUS,
  JOGOS,
  PRESETS,
  OC_CPUS,
  OC_GPUS,
  buscar,
} from '../data/builds'

/* ============================================================
   LABORATÓRIO DE BUILDS — comparador, FPS e overclock
   ------------------------------------------------------------
   Estimativas locais com pontuações relativas. Não é um
   benchmark oficial: serve para comparar peças e ter uma ideia
   realista antes de gastar dinheiro.
   ============================================================ */

const ABAS = [
  { id: 'comparador', nome: 'Comparador', Icon: ArrowRightLeft },
  { id: 'fps', nome: 'Calculadora FPS', Icon: Gauge },
  { id: 'overclock', nome: 'Overclock', Icon: Flame },
]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function fpsDe(cpu, gpu, ram, jogo, preset, res) {
  const cpuF = 0.62 + 0.38 * (cpu.score / 100)
  const gpuF = gpu.score / 100
  const ramF = 0.92 + 0.08 * (ram.score / 100)
  const pesoCpu = clamp(
    jogo.cpuPeso + (res === '1080' ? 0.08 : res === '1440' ? 0 : -0.08),
    0.05,
    0.65,
  )
  const combinado = gpuF * (1 - pesoCpu) + Math.min(gpuF, cpuF) * pesoCpu
  let fps = jogo.base * combinado * ramF * preset.mult
  if (res === '1440') fps *= jogo.m1440
  if (res === '4k') fps *= jogo.m4k
  if (jogo.cap) fps = Math.min(fps, jogo.cap)
  return Math.max(1, fps)
}

function gargalo(cpu, gpu, jogo, res) {
  const cpuF = 0.62 + 0.38 * (cpu.score / 100)
  const gpuF = gpu.score / 100
  const pesoCpu = clamp(
    jogo.cpuPeso + (res === '1080' ? 0.08 : res === '1440' ? 0 : -0.08),
    0.05,
    0.65,
  )
  const cpuSupply = cpuF * (1 + pesoCpu * 0.55)
  const diff = (gpuF - cpuSupply) / Math.max(gpuF, cpuSupply, 0.01)
  if (diff > 0.12) return { tipo: 'cpu', texto: 'CPU é o limite', cor: 'amber', diff }
  if (diff < -0.12) return { tipo: 'gpu', texto: 'GPU é o limite', cor: 'violet', diff }
  return { tipo: 'equilibrado', texto: 'Build equilibrada', cor: 'emerald', diff }
}

const fmt = (n) => Math.round(n).toLocaleString('pt-PT')
const eur = (n) => `${Math.round(n).toLocaleString('pt-PT')} €`

export default function BuildLabPage() {
  const [aba, setAba] = useState('comparador')

  return (
    <PageShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-5">
          <h1 className="font-display text-2xl font-black text-white sm:text-3xl">
            Laboratório de <span className="gradient-text">builds</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Compara duas builds, calcula os FPS por jogo e resolução, e vê o overclock estável
            recomendado para cada peça. Tudo com estimativas locais.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-black transition sm:text-xs ${
                aba === a.id
                  ? 'border-violet-400/40 bg-violet-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <a.Icon className="h-4 w-4 shrink-0" /> {a.nome}
            </button>
          ))}
        </div>

        {aba === 'comparador' && <Comparador />}
        {aba === 'fps' && <CalculadoraFps />}
        {aba === 'overclock' && <Overclock />}

        <p className="mt-6 flex items-start gap-1.5 text-[10px] leading-relaxed text-gray-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Valores estimados a partir de pontuações relativas e perfis de jogos. O FPS real varia com
          drivers, mapa, servidor, temperatura e definições. Usa isto para comparar, não como promessa.
        </p>
      </motion.div>
    </PageShell>
  )
}

/* ---------------- Comparador ---------------- */
function Comparador() {
  const [a, setA] = useState({
    cpu: 'r7-7800x3d',
    gpu: 'rtx4070s',
    ram: 'ddr5-32-6000',
    psu: 'psu-750',
  })
  const [b, setB] = useState({
    cpu: 'r5-7600',
    gpu: 'rtx4060',
    ram: 'ddr5-16-5600',
    psu: 'psu-550',
  })
  const [jogoId, setJogoId] = useState('cs2')
  const [presetId, setPresetId] = useState('alto')
  const jogo = buscar(JOGOS, jogoId)
  const preset = buscar(PRESETS, presetId)

  const calcular = (x) => {
    const cpu = buscar(CPUS, x.cpu)
    const gpu = buscar(GPUS, x.gpu)
    const ram = buscar(RAMS, x.ram)
    const psu = buscar(PSUS, x.psu)
    const f1080 = fpsDe(cpu, gpu, ram, jogo, preset, '1080')
    const f1440 = fpsDe(cpu, gpu, ram, jogo, preset, '1440')
    const f4k = fpsDe(cpu, gpu, ram, jogo, preset, '4k')
    const consumo = cpu.consumo + gpu.consumo + 70
    const recomendado = Math.ceil((consumo * 1.35) / 50) * 50
    return {
      cpu,
      gpu,
      ram,
      psu,
      f1080,
      f1440,
      f4k,
      consumo,
      recomendado,
      preco: cpu.preco + gpu.preco + ram.preco + psu.preco,
      gargalo: gargalo(cpu, gpu, jogo, '1440'),
      psuOk: psu.watts >= recomendado,
    }
  }

  const A = useMemo(() => calcular(a), [a, jogo, preset])
  const B = useMemo(() => calcular(b), [b, jogo, preset])

  return (
    <div>
      {/* jogo / preset */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
            <Gamepad2 className="h-3 w-3" /> Jogo
          </span>
          <select
            value={jogoId}
            onChange={(e) => setJogoId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white focus:border-violet-400/50 focus:outline-none"
          >
            {JOGOS.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Gráficos
          </span>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white focus:border-violet-400/50 focus:outline-none"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BuildCard titulo="Build A" valor={a} setValor={setA} calc={A} jogo={jogo} cor="violet" />
        <BuildCard titulo="Build B" valor={b} setValor={setB} calc={B} jogo={jogo} cor="sky" />
      </div>

      {/* comparação direta */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0f0a1a]/80">
        <div className="border-b border-white/10 px-4 py-2.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-300">
            Comparação direta · {jogo.nome}
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {[
            ['1080p', A.f1080, B.f1080],
            ['1440p', A.f1440, B.f1440],
            ['4K', A.f4k, B.f4k],
          ].map(([rotulo, va, vb]) => {
            const melhor = va >= vb ? 'A' : 'B'
            const dif = Math.abs(va - vb) / Math.max(va, vb, 1)
            return (
              <div key={rotulo} className="flex items-center gap-3 px-4 py-2 text-xs">
                <span className="w-12 shrink-0 font-black text-gray-400">{rotulo}</span>
                <span className={`w-20 shrink-0 text-right font-black tabular-nums ${melhor === 'A' ? 'text-violet-300' : 'text-gray-400'}`}>
                  {fmt(va)} FPS
                </span>
                <span className="flex-1 text-center text-[10px] font-bold text-gray-600">
                  {dif < 0.02 ? 'praticamente igual' : `+${Math.round(dif * 100)}% para ${melhor}`}
                </span>
                <span className={`w-20 shrink-0 font-black tabular-nums ${melhor === 'B' ? 'text-sky-300' : 'text-gray-400'}`}>
                  {fmt(vb)} FPS
                </span>
              </div>
            )
          })}
        </div>
        <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-3">
          <Mini rotulo="Consumo estimado" valor={`${A.consumo} W vs ${B.consumo} W`} />
          <Mini rotulo="Fonte recomendada" valor={`${A.recomendado} W vs ${B.recomendado} W`} />
          <Mini rotulo="Preço das peças" valor={`${eur(A.preco)} vs ${eur(B.preco)}`} />
        </div>
      </div>
    </div>
  )
}

function BuildCard({ titulo, valor, setValor, calc, jogo, cor }) {
  const corTexto = cor === 'violet' ? 'text-violet-300' : 'text-sky-300'
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`text-sm font-black ${corTexto}`}>{titulo}</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-gray-400">
          {eur(calc.preco)}
        </span>
      </div>

      <div className="space-y-2">
        <SelectPeca
          icon={Cpu}
          rotulo="CPU"
          lista={CPUS}
          valor={valor.cpu}
          onChange={(cpu) => setValor((v) => ({ ...v, cpu }))}
        />
        <SelectPeca
          icon={MonitorPlay}
          rotulo="GPU"
          lista={GPUS}
          valor={valor.gpu}
          onChange={(gpu) => setValor((v) => ({ ...v, gpu }))}
        />
        <SelectPeca
          icon={MemoryStick}
          rotulo="RAM"
          lista={RAMS}
          valor={valor.ram}
          onChange={(ram) => setValor((v) => ({ ...v, ram }))}
        />
        <SelectPeca
          icon={PlugZap}
          rotulo="Fonte"
          lista={PSUS}
          valor={valor.psu}
          onChange={(psu) => setValor((v) => ({ ...v, psu }))}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          ['1080p', calc.f1080],
          ['1440p', calc.f1440],
          ['4K', calc.f4k],
        ].map(([r, v]) => (
          <div key={r} className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-center">
            <span className="block text-[8px] font-black uppercase tracking-wide text-gray-500">{r}</span>
            <span className="block text-sm font-black tabular-nums text-white">{fmt(v)}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
        <span
          className={`rounded-full px-2 py-0.5 ${
            calc.gargalo.cor === 'amber'
              ? 'bg-amber-400/15 text-amber-300'
              : calc.gargalo.cor === 'violet'
                ? 'bg-violet-400/15 text-violet-300'
                : 'bg-emerald-400/15 text-emerald-300'
          }`}
        >
          {calc.gargalo.texto}
        </span>
        <span className={`rounded-full px-2 py-0.5 ${calc.psuOk ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'}`}>
          {calc.psuOk ? 'Fonte suficiente' : `Fonte curta · ${calc.recomendado} W`}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-gray-400">{calc.consumo} W</span>
      </div>
      <p className="mt-2 text-[10px] text-gray-500">
        {calc.cpu.nome} + {calc.gpu.nome} + {calc.ram.nome.split(' ').slice(0, 3).join(' ')} ·{' '}
        {jogo.nome}
      </p>
    </div>
  )
}

function SelectPeca({ icon: Icon, rotulo, lista, valor, onChange }) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
        <Icon className="h-2.5 w-2.5" /> {rotulo}
      </span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[12px] font-bold text-gray-200 focus:border-violet-400/50 focus:outline-none"
      >
        {lista.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nome}
          </option>
        ))}
      </select>
    </label>
  )
}

function Mini({ rotulo, valor }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
      <span className="block text-[9px] font-black uppercase tracking-wider text-gray-500">{rotulo}</span>
      <span className="mt-0.5 block truncate text-xs font-black text-white">{valor}</span>
    </div>
  )
}

/* ---------------- Calculadora de FPS ---------------- */
function CalculadoraFps() {
  const [cpuId, setCpuId] = useState('r7-7800x3d')
  const [gpuId, setGpuId] = useState('rtx4070s')
  const [ramId, setRamId] = useState('ddr5-32-6000')
  const [jogoId, setJogoId] = useState('cs2')
  const [presetId, setPresetId] = useState('alto')
  const [res, setRes] = useState('1440')

  const cpu = buscar(CPUS, cpuId)
  const gpu = buscar(GPUS, gpuId)
  const ram = buscar(RAMS, ramId)
  const jogo = buscar(JOGOS, jogoId)
  const preset = buscar(PRESETS, presetId)
  const fps = fpsDe(cpu, gpu, ram, jogo, preset, res)
  const low = fps * (0.66 + 0.1 * clamp(cpu.score / 130, 0, 1))
  const gargaloInfo = gargalo(cpu, gpu, jogo, res)
  const hz = fps >= 240 ? 240 : fps >= 165 ? 165 : fps >= 144 ? 144 : fps >= 100 ? 100 : 60

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectPeca icon={Cpu} rotulo="CPU" lista={CPUS} valor={cpuId} onChange={setCpuId} />
          <SelectPeca icon={MonitorPlay} rotulo="GPU" lista={GPUS} valor={gpuId} onChange={setGpuId} />
          <SelectPeca icon={MemoryStick} rotulo="RAM" lista={RAMS} valor={ramId} onChange={setRamId} />
          <SelectPeca icon={Gamepad2} rotulo="Jogo" lista={JOGOS} valor={jogoId} onChange={setJogoId} />
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">
            Resolução
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ['1080', '1080p'],
              ['1440', '1440p'],
              ['4k', '4K'],
            ].map(([id, nome]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRes(id)}
                className={`rounded-lg border py-2 text-xs font-black transition ${
                  res === id
                    ? 'border-violet-400/40 bg-violet-500/20 text-white'
                    : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07]'
                }`}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">
            Qualidade
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${
                  presetId === p.id
                    ? 'bg-white text-black'
                    : 'bg-white/[0.06] text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-3 text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-300">
              FPS médio
            </span>
            <span className="block font-display text-3xl font-black tabular-nums text-white">{fmt(fps)}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-gray-500">1% low</span>
            <span className="block font-display text-2xl font-black tabular-nums text-gray-200">{fmt(low)}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-gray-500">Monitor ideal</span>
            <span className="block font-display text-2xl font-black tabular-nums text-gray-200">{hz} Hz</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
            <Gauge className="h-3.5 w-3.5" /> Leitura rápida
          </h3>
          <p className={`text-sm font-black ${gargaloInfo.cor === 'amber' ? 'text-amber-300' : gargaloInfo.cor === 'violet' ? 'text-violet-300' : 'text-emerald-300'}`}>
            {gargaloInfo.texto}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
            {gargaloInfo.tipo === 'cpu'
              ? 'A CPU está a limitar a gráfica neste jogo/resolução. Sobe resolução ou qualidade para a gráfica trabalhar mais.'
              : gargaloInfo.tipo === 'gpu'
                ? 'A gráfica é o limite. Baixar qualidade ou ligar DLSS/FSR dá mais FPS do que trocar de CPU.'
                : 'As duas peças estão bem casadas para este cenário. Não há um limite óbvio.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
          <h3 className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Configuração
          </h3>
          <ul className="space-y-1 text-[11px] text-gray-400">
            <li className="flex justify-between gap-2"><span>CPU</span><span className="text-right font-bold text-white">{cpu.nome}</span></li>
            <li className="flex justify-between gap-2"><span>GPU</span><span className="text-right font-bold text-white">{gpu.nome}</span></li>
            <li className="flex justify-between gap-2"><span>RAM</span><span className="text-right font-bold text-white">{ram.nome}</span></li>
            <li className="flex justify-between gap-2"><span>Jogo</span><span className="text-right font-bold text-white">{jogo.nome}</span></li>
          </ul>
          <p className="mt-2 text-[10px] text-gray-500">
            Consumo estimado: {cpu.consumo + gpu.consumo + 70} W · fonte recomendada{' '}
            {Math.ceil(((cpu.consumo + gpu.consumo + 70) * 1.35) / 50) * 50} W
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Overclock ---------------- */
function Overclock() {
  const [cpuId, setCpuId] = useState('r7-9800x3d')
  const [gpuId, setGpuId] = useState('rtx5070')
  const [arrefecimento, setArrefecimento] = useState('aio')
  const [perfil, setPerfil] = useState('seguro')
  const [jogoId, setJogoId] = useState('cs2')
  const [res, setRes] = useState('1440')

  const cpu = buscar(CPUS, cpuId)
  const gpu = buscar(GPUS, gpuId)
  const jogo = buscar(JOGOS, jogoId)
  const ocCpu = OC_CPUS[cpuId] || { ganho: 5, allCore: cpu.boost + 0.2, voltagem: 1.25, nota: 'OC moderado.' }
  const ocGpu = OC_GPUS[gpuId] || { ganho: 8, core: 150, mem: 800, power: 108, nota: 'OC moderado.' }

  const fatorArrefecimento = arrefecimento === 'ar' ? 0.78 : arrefecimento === 'aio' ? 1 : 1.12
  const fatorPerfil = perfil === 'seguro' ? 0.72 : perfil === 'agressivo' ? 1.25 : 1
  const ganhoCpu = ocCpu.ganho * fatorArrefecimento * fatorPerfil
  const ganhoGpu = ocGpu.ganho * fatorArrefecimento * fatorPerfil
  const pesoCpu = clamp(jogo.cpuPeso + (res === '1080' ? 0.08 : res === '1440' ? 0 : -0.08), 0.05, 0.65)
  const ganhoFps = ganhoGpu * (1 - pesoCpu) + ganhoCpu * pesoCpu
  const ganhoReal = ganhoFps * 0.75

  const ramBase = buscar(RAMS, 'ddr5-32-6000')
  const fpsAntes = fpsDe(cpu, gpu, ramBase, jogo, buscar(PRESETS, 'alto'), res)
  const fpsDepois = fpsAntes * (1 + ganhoReal / 100)

  const temperatura = arrefecimento === 'ar' ? '75–85 °C' : arrefecimento === 'aio' ? '65–75 °C' : '55–68 °C'
  const risco = perfil === 'agressivo' ? 'alto' : perfil === 'seguro' ? 'baixo' : 'médio'

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f0a1a]/80 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectPeca icon={Cpu} rotulo="CPU" lista={CPUS} valor={cpuId} onChange={setCpuId} />
          <SelectPeca icon={MonitorPlay} rotulo="GPU" lista={GPUS} valor={gpuId} onChange={setGpuId} />
          <SelectPeca icon={Gamepad2} rotulo="Jogo para medir" lista={JOGOS} valor={jogoId} onChange={setJogoId} />
          <label className="block">
            <span className="mb-0.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
              <Thermometer className="h-2.5 w-2.5" /> Arrefecimento
            </span>
            <select
              value={arrefecimento}
              onChange={(e) => setArrefecimento(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[12px] font-bold text-gray-200 focus:border-violet-400/50 focus:outline-none"
            >
              <option value="ar">Ar (torre)</option>
              <option value="aio">AIO 240/360 mm</option>
              <option value="custom">Custom loop</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['seguro', 'Seguro'],
            ['equilibrado', 'Equilibrado'],
            ['agressivo', 'Agressivo'],
          ].map(([id, nome]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPerfil(id)}
              className={`rounded-lg border py-2 text-[11px] font-black transition ${
                perfil === id
                  ? 'border-amber-400/40 bg-amber-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07]'
              }`}
            >
              {nome}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['1080', '1080p'],
            ['1440', '1440p'],
            ['4k', '4K'],
          ].map(([id, nome]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRes(id)}
              className={`rounded-lg border py-2 text-[11px] font-black transition ${
                res === id
                  ? 'border-violet-400/40 bg-violet-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07]'
              }`}
            >
              {nome}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-3 text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-amber-300">Ganho de FPS</span>
            <span className="block font-display text-3xl font-black tabular-nums text-white">+{Math.round(ganhoReal)}%</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-gray-500">Antes</span>
            <span className="block font-display text-2xl font-black tabular-nums text-gray-200">{fmt(fpsAntes)}</span>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-3 text-center">
            <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-300">Depois</span>
            <span className="block font-display text-2xl font-black tabular-nums text-white">{fmt(fpsDepois)}</span>
          </div>
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-500">
          {jogo.nome} · {res === '4k' ? '4K' : `${res}p`} · ganho estimado com CPU + GPU + RAM em conjunto
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
            <Zap className="h-3.5 w-3.5" /> Melhor OC estável registado
          </h3>
          <p className="text-sm font-black text-white">{cpu.nome}</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-gray-300">
            <li>All-core: <b>{ocCpu.allCore.toFixed(1)} GHz</b></li>
            <li>Voltagem segura: <b>{ocCpu.voltagem.toFixed(2)} V</b></li>
            <li>Temperatura: <b>{temperatura}</b></li>
          </ul>
          <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">{ocCpu.nota}</p>

          <div className="mt-3 border-t border-white/10 pt-2">
            <p className="text-sm font-black text-white">{gpu.nome}</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-gray-300">
              <li>Core: <b>+{ocGpu.core} MHz</b></li>
              <li>Memória: <b>+{ocGpu.mem} MHz</b></li>
              <li>Power limit: <b>{ocGpu.power}%</b></li>
            </ul>
            <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">{ocGpu.nota}</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          risco === 'alto'
            ? 'border-red-400/20 bg-red-500/[0.06]'
            : risco === 'médio'
              ? 'border-amber-400/20 bg-amber-500/[0.05]'
              : 'border-emerald-400/20 bg-emerald-500/[0.05]'
        }`}>
          <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Risco {risco}
          </h3>
          <p className="text-[11px] leading-relaxed text-gray-400">
            {perfil === 'agressivo'
              ? 'Testa sempre com stress test 30 min e vigia temperaturas. Se houver crash, baixa 50 MHz no core ou +0,02 V.'
              : perfil === 'seguro'
                ? 'Perfil conservador: ganhos menores, mas quase sem risco de instabilidade ou degradação.'
                : 'Perfil equilibrado: bom ganho com margem de segurança. Valida com 20 min de stress test.'}
          </p>
          <p className="mt-1.5 text-[10px] text-gray-500">
            RAM: ativa XMP/EXPO (6000 CL30 é o ponto doce em AM5) — +3 a 6% em jogos CPU-bound.
          </p>
        </div>
      </div>
    </div>
  )
}
