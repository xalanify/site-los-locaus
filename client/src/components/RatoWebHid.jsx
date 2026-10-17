import { useState } from 'react'
import { Mouse, Check, X, Search, Loader2 } from 'lucide-react'
import { searchMice } from '../data/mice'

/* ============================================================
   Identificar o meu Rato (WebHID)
   ------------------------------------------------------------
   1. Botão "Identificar o meu Rato" → abre o seletor nativo
      do navegador (WebHID API) filtrado para ratos.
   2. Lê productName + vendorId/productId (hex, ex.: 0x046D).
   3. Se o nome vier genérico, traduz o VID por marcas reais.
   4. Painel de confirmação [Sim] / [Não].
   5. Sim → guarda; Não (ou falha/cancelar) → pesquisa manual.
   ============================================================ */

/* mapa estático de Vendor IDs conhecidos (hexadecimal) */
const VENDORS = {
  '0x046d': 'Logitech',
  '0x1532': 'Razer',
  '0x1b1c': 'Corsair',
  '0x1e71': 'SteelSeries',
  '0x2433': 'HyperX',
  '0x2516': 'Glorious',
  '0x1b1f': 'Vaxee',
  '0x256c': 'Zowie',
  '0x12ba': 'Zowie (antiga)',
  '0x3853': 'Pulsar',
  '0x11ff': 'Ninjutso',
}

/* hex bonito ex.: 0x046D */
const hex = (n) => '0x' + Number(n || 0).toString(16).padStart(4, '0').toUpperCase()

/* resultados manuais fixos + resultados da nossa base */
const MANUAIS_FIXOS = [
  { brand: 'Logitech', model: 'G Pro Wireless' },
  { brand: 'Razer', model: 'DeathAdder V3' },
  { brand: 'Corsair', model: 'Harpoon Wireless' },
  { brand: 'Generico', model: 'Rato de Escritório Genérico' },
]

export default function RatoWebHid({ onEscolher }) {
  const [fase, setFase] = useState('botao') // botao | detetando | confirmar | manual | ok
  const [disp, setDisp] = useState(null) // { nome, vid, pid }
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  /* procura manual: mistura os fixos com a nossa base de dados */
  const resultados = () => {
    const q = busca.trim().toLowerCase()
    const da_base = q ? searchMice(q) : []
    const fixos = MANUAIS_FIXOS.map((m) => ({
      ...m,
      fixo: true,
      logo: '',
      mostra: `${m.brand} ${m.model}`,
    }))
    if (!q) return [...fixos, { brand: 'Base', model: 'todos os 700+ modelos', dica_base: true, mostra: 'Digite para procurar na base de dados (ex.: razer)' }]
    return [
      ...fixos.filter((m) => m.mostra.toLowerCase().includes(q)),
      ...(da_base || []).map((m) => ({ ...m, mostra: `${m.brand} ${m.model}` })),
    ]
  }

  /* deteção via WebHID */
  const detetar = async () => {
    setErro('')
    if (!('hid' in navigator)) {
      // sem WebHID (Firefox/iOS): vai direto à pesquisa manual
      setFase('manual')
      setErro('O teu navegador não suporta deteção automática (WebHID). Pesquisa manualmente.')
      return
    }
    setFase('detetando')
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [{ usagePage: 0x01, usage: 0x02 }], // rato / generic desktop
      })
      const d = devices && devices[0]
      if (!d) {
        // cancelou o seletor: vai à pesquisa manual
        setFase('manual')
        return
      }
      const vid = hex(d.vendorId)
      const marca = VENDORS[vid.toLowerCase()] || ''
      const nome = d.productName && d.productName !== 'Generic Mouse' && d.productName !== 'USB Receiver'
        ? (marca && !d.productName.toLowerCase().includes(marca) ? `${marca} ${d.productName}` : d.productName)
        : marca || 'Rato desconhecido'
      setDisp({ nome, vid, pid: hex(d.productId) })
      setFase('confirmar')
    } catch {
      setFase('manual')
      setErro('Deteção cancelada ou indisponível. Escolhe manualmente abaixo.')
    }
  }

  const guardar = (nome) => {
    if (disp) {
      try {
        localStorage.setItem('rato_vid', disp.vid)
        localStorage.setItem('rato_pid', disp.pid)
      } catch {}
    }
    try {
      localStorage.setItem('rato_escolhido', nome)
    } catch {}
    onEscolher?.(nome, disp?.vid, disp?.pid)
    setFase('ok')
  }

  /* --------- estados visuais --------- */

  if (fase === 'ok') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300">
        <Check className="h-4 w-4" /> Rato guardado no seu perfil!
      </div>
    )
  }

  if (fase === 'botao') {
    return (
      <button
        type="button"
        onClick={detetar}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-black text-violet-200 transition-colors hover:bg-violet-500/25"
      >
        <Mouse className="h-4 w-4" /> Identificar o meu Rato
      </button>
    )
  }

  if (fase === 'detetando') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-gray-300">
        <Loader2 className="h-4 w-4 animate-spin text-violet-400" /> Escolhe o rato na janela do navegador…
      </div>
    )
  }

  if (fase === 'confirmar' && disp) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
        <p className="text-sm text-gray-200">
          Detetámos o seguinte dispositivo:{' '}
          <span className="font-black text-white">{disp.nome}</span>{' '}
          <span className="text-[11px] text-gray-400">
            (VID: {disp.vid} · PID: {disp.pid})
          </span>
          . É este o seu rato?
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => guardar(disp.nome)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-black text-white transition-colors hover:bg-emerald-400"
          >
            <Check className="h-4 w-4" /> Sim
          </button>
          <button
            type="button"
            onClick={() => setFase('manual')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-1.5 text-sm font-black text-gray-200 transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" /> Não
          </button>
        </div>
      </div>
    )
  }

  /* --------- pesquisa manual (fallback) --------- */
  return (
    <div className="rounded-xl border border-white/15 bg-black/40 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400">
        <Search className="h-3.5 w-3.5" /> Pesquisa manual
      </p>
      {erro && <p className="mb-2 text-[12px] font-semibold text-amber-300">{erro}</p>}
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Escreve a marca ou modelo (ex.: logitech, razer)"
        className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
      />
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {resultados().map((m, i) =>
          m.dica_base ? (
            <li key={i} className="px-3 py-2 text-[11px] text-gray-500">
              {m.mostra}
            </li>
          ) : (
          <li key={i}>
            <button
              type="button"
              onClick={() => guardar(m.mostra)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-gray-200 transition-colors hover:bg-violet-500/20"
            >
              <span>
                <span className="font-bold">{m.brand}</span> {m.model}
              </span>
              {m.fixo && <span className="text-[10px] font-bold text-gray-500">comum</span>}
            </button>
          </li>
          )
        )}
        {resultados().length === 0 && (
          <li className="px-3 py-2 text-xs text-gray-500">Não encontramos “{busca}”. Tente outra marca.</li>
        )}
      </ul>
    </div>
  )
}
