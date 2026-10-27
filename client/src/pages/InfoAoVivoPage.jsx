import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Cpu,
  Download,
  HardDrive,
  Loader2,
  MemoryStick,
  MonitorDot,
  Palette,
  Power,
  ShieldCheck,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react'
import { authHeaders } from '../lib/auth'
import Estado from '../components/Estado'
import { confirmar, toast } from '../components/Feedback'

/* aqui tão os labels dos módulos (igual ao app) */
const MODULOS = [
  { icone: Cpu, nome: 'CPU / Clock / Temperatura', desc: 'Uso do processador, GHz reais e temperatura (quando o PC expõe).' },
  { icone: MemoryStick, nome: 'RAM', desc: 'GBytes usados contra o total, ao segundo.' },
  { icone: Zap, nome: 'GPU / VRAM', desc: 'Uso da placa gráfica e memória de vídeo.' },
  { icone: HardDrive, nome: 'Disco — I/O e espaço', desc: 'Leitura/escrita ao vivo MB/s e GB livres por unidade.' },
  { icone: Wifi, nome: 'Rede — subida/descida', desc: 'Mbps ao segundo, somando todas as interfaces.' },
  { icone: Activity, nome: 'Uptime, processos, bateria', desc: 'Tempo ligado, nº de processos e carga da bateria.' },
]

const PRESETS = [
  { nome: 'Mínimo', mods: 'CPU · RAM · Rede', cor: 'from-emerald-500/60' },
  { nome: 'Resumo', mods: 'CPU · Clock · RAM · Discos · Uptime', cor: 'from-violet-500/60' },
  { nome: 'Gamer', mods: 'CPU · Clock · Temp · GPU · VRAM · RAM', cor: 'from-fuchsia-500/60' },
  { nome: 'Rede', mods: 'Descida · Subida · Disco I/O', cor: 'from-sky-500/60' },
  { nome: 'Completo', mods: 'Tudo — 14 módulos combinados', cor: 'from-amber-500/60' },
]

/* Uma "captura" feita em CSS — nenhuma imagem falsa: são as mesmas
   linhas que o overlay desenha no PC à frente. */
function MockOverlay({ title, corDeBorda, linhas, esc }) {
  return (
    <div
      className="w-[270px] rounded-[18px] border bg-[#0c0b14]/95 p-3.5 shadow-2xl"
      style={{ borderColor: `${corDeBorda}66` }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        <span className="text-[13px] font-black uppercase tracking-wide text-gray-200">
          {title}
        </span>
      </div>
      <div className="space-y-1.5">
        {linhas.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              {l.label}
            </span>
            <span className="whitespace-nowrap font-bold" style={{ color: corDeBorda }}>
              {l.valor}
            </span>
          </div>
        ))}
      </div>
      {esc && (
        <div className="mt-2.5 border-t border-white/5 pt-2 text-[10px] text-gray-600">
          arrastável · sempre no topo · pode deixar o rato atravessar
        </div>
      )}
    </div>
  )
}

export default function InfoAoVivoPage() {
  const [s, setS] = useState(null)        /* status do servidor */
  const [aInstalar, setAInstalar] = useState(false)
  const [aviso, setAviso] = useState('')
  const [miraAcao, setMiraAcao] = useState(null)

  useEffect(() => {
    fetch('/api/infoaovivo/status')
      .then((r) => r.json())
      .then((d) => setS(d?.ok === false ? null : d))
      .catch(() => setS(null))
  }, [])

  const instalar = async () => {
    setAInstalar(true)
    setAviso('')
    try {
      const r = await fetch('/api/infoaovivo/instalar', {
        method: 'POST',
        headers: authHeaders(),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) setAviso(d.error || 'Não deu para instalar.')
      else {
        setS(d.ok ? { ok: true, instalado: true, aCorrer: d.aCorrer, versao: '0.1.0' } : s)
      }
    } catch {
      setAviso('Sem ligação ao servidor.')
    } finally {
      setAInstalar(false)
    }
  }

  const abrir = async () => {
    setMiraAcao('abrir')
    try {
      await fetch('/api/infoaovivo/abrir', { method: 'POST', headers: authHeaders() })
    } catch {}
    setMiraAcao(null)
  }

  const desinstalar = async () => {
    const ok = await confirmar(
      'Remover o InfoAoVivo do PC? Fica tudo limpo (app, definições, atalho).',
      { titulo: 'Desinstalar InfoAoVivo', okTexto: 'Remover' },
    )
    if (!ok) return
    setMiraAcao('apagar')
    try {
      const r = await fetch('/api/infoaovivo/desinstalar', {
        method: 'POST',
        headers: authHeaders(),
      })
      if (r.ok) {
        setS({ ok: true, instalado: false, aCorrer: false, tamanho: null, versao: '0.1.0' })
        toast.ok('InfoAoVivo removido do PC.')
      } else {
        toast.erro('Não deu para remover o InfoAoVivo.')
      }
    } catch {
      toast.erro('Sem ligação ao servidor.')
    }
    setMiraAcao(null)
  }

  const instalado = s?.instalado

  return (
    <section className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* ---------------- Hero ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass relative overflow-hidden rounded-[28px] border border-violet-500/30 p-6 sm:p-9"
          style={{ boxShadow: '0 0 60px rgba(139,92,246,.14)' }}
        >
          <div className="pointer-events-none absolute -right-6 -top-8 select-none text-[110px] font-black leading-none text-white/5">
            0.1
          </div>
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-300 ring-1 ring-violet-400/30">
                app nativo · beta privado
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                ~35 MB de RAM
              </span>
            </div>
            <h1 className="font-display font-black leading-tight" style={{ fontSize: 'clamp(1.8rem, 5.5vw, 2.8rem)' }}>
              Info <span className="text-violet-400">Ao Vivo</span>
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-400">
              Overlays do desempenho do teu PC, <span className="font-bold text-gray-200">sempre no topo e
              ao vivo</span>: CPU, gráfica, RAM, rede, discos, bateria… em cartõezinhos escuros que
              arrastas para onde quiseres. Feito à mão em Windows nativo — <span className="font-bold">não
              é Electron</span>, abre em 1 segundo e o gestor de tarefas mal o nota.
            </p>
            <div className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-[13px] leading-relaxed text-sky-200/90">
              <b className="text-sky-300">Idea de ouro:</b> quem tem <b className="text-sky-300">2 monitores</b> pousa
              os overlays no segundo ecran e acompanha o jogo no primeiro — nunca te abrasta nada
              a vista. Com um só monitor, usa o modo "rato atravessa".
            </div>
          </div>
        </motion.div>

        {/* ---------------- Capturas (mock CSS do resto real) ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="glass rounded-[28px] p-6"
        >
          <h2 className="font-display mb-4 text-2xl font-black uppercase">
            Como se vê no PC
          </h2>
          <div className="flex flex-wrap gap-4">
            <MockOverlay
              title="Gamer"
              corDeBorda="#e879f9"
              linhas={[
                { label: 'CPU', valor: '22 %' },
                { label: 'CLOCK', valor: '4.18 GHz' },
                { label: 'TEMP', valor: '61 °C' },
                { label: 'GPU', valor: '47 %' },
                { label: 'VRAM', valor: '2312 / VRAM MB' },
                { label: 'RAM', valor: '21.7 / 32.0 GB' },
              ]}
            />
            <MockOverlay
              title="Rede"
              corDeBorda="#38bdf8"
              linhas={[
                { label: 'DESCIDA', valor: '318 Mbps' },
                { label: 'SUBIDA', valor: '44 Mbps' },
                { label: 'DISCO', valor: '2.4 / 0.7 MB/s' },
              ]}
            />
            <MockOverlay
              title="Resumo"
              corDeBorda="#8b5cf6"
              linhas={[
                { label: 'CPU', valor: '12 %' },
                { label: 'CLOCK', valor: '3.94 GHz' },
                { label: 'RAM', valor: '18.5 / 32.0 GB' },
                { label: 'DISCOS', valor: 'C: 412/931GB' },
                { label: 'LIGADO', valor: '3 h 12 m' },
              ]}
              esc
            />
          </div>
          <p className="mt-4 text-xs text-gray-600">
            Exemplos com números reais de amostragem — no teu PC são os teus valores, de segundo a segundo.
          </p>
        </motion.div>

        {/* ---------------- Módulos ---------------- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => (
            <div
              key={m.nome}
              className="glass rounded-2xl p-4 transition-colors hover:border-violet-500/30"
            >
              <div className="mb-2 flex items-center gap-2">
                <m.icone className="h-4 w-4 text-violet-300" />
                <span className="text-[13.5px] font-bold text-gray-100">{m.nome}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-gray-400">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* ---------------- Presets ---------------- */}
        <div>
          <h2 className="font-display mb-3 text-2xl font-black uppercase">Presets prontos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PRESETS.map((p) => (
              <div key={p.nome} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${p.cor} to-transparent`} />
                <p className="mb-1 font-display text-[15px] font-black uppercase tracking-wide text-white">
                  {p.nome}
                </p>
                <p className="text-[11.5px] leading-snug text-gray-400">{p.mods}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- Instalação ---------------- */}
        <div className="glass rounded-[28px] border border-violet-500/25 p-6 sm:p-8">
          <h2 className="font-display mb-1 text-2xl font-black uppercase">Instalar no teu PC</h2>
          <p className="mb-5 text-[13.5px] text-gray-400">
            Um único executável (39 KB), sem instalador: fica em{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-gray-300">%LOCALAPPDATA%\InfoAoVivo</code>{' '}
            com atalho no Menu Iniciar e abre logo. Aparece depois na bandeja do relógio.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!instalado ? (
              <button
                onClick={instalar}
                disabled={aInstalar}
                className="ui-btn ui-btn-primary ui-btn-lg"
              >
                {aInstalar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Instalar e abrir agora
              </button>
            ) : (
              <>
                <span className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-[13px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                  <ShieldCheck className="h-4 w-4" />
                  Já está no teu PC {s.aCorrer ? '· a correr' : ''}
                </span>
                {!s.aCorrer && (
                  <button
                    onClick={abrir}
                    disabled={miraAcao === 'abrir'}
                    className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    {miraAcao === 'abrir' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                    Abrir
                  </button>
                )}
                <button
                  onClick={desinstalar}
                  disabled={miraAcao === 'apagar'}
                  className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {miraAcao === 'apagar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Desinstalar
                </button>
              </>
            )}
          </div>
          {aviso && (
            <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-[13px] font-semibold text-red-300">
              {aviso}
            </p>
          )}

          <div className="mt-6 grid gap-3 text-[12.5px] text-gray-400 sm:grid-cols-3">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <b className="text-gray-200">Passo 1</b>
              <p>Instalas — o site copia o app e arranca-o.</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <b className="text-gray-200">Passo 2</b>
              <p>Bandeja do relógio → Definições: escolhe módulos, presets, cor, opacidade.</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <b className="text-gray-200">Passo 3</b>
              <p>Arrasta os overlays para o teu segundo ecran e deixa-os lá.</p>
            </div>
          </div>
        </div>

        {/* ---------------- Nota do beta ---------------- */}
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-[12.5px] leading-relaxed text-amber-200/80">
          <b className="text-amber-300">Beta 0.1</b> — as leituras usam só a WMI do próprio Windows
          (nada instalado, nada a rodar de fundo). A temperatura não vem de alguns PCs (o fabricante
          não expõe) e aí o overlay mostra "—". Novos módulos e gráficos chegam na 0.2 — digam-nos
          o que querem ver!
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300/60">
            <Palette className="h-3 w-3" /> {s?.versao ? `versão ${s.versao} disponível neste servidor` : 'informação indisponível'}
          </div>
        </div>
      </div>
    </section>
  )
}
