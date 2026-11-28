import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy } from 'lucide-react'
import CartaEnigma from '../components/CartaEnigma'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMAS — estilo "terminal" (dark navy / azul / mono)
   O Enigma 2 está fechado: em preparação, abre em breve.
   Página em fluxo normal (rola se precisar) para funcionar
   bem no PC e no telemóvel. O fundo navy cobre o ecrã inteiro.
   ============================================================ */

const CIANO = '#7ee7ff'
const VERMELHO = '#ff4d6d'

export default function EnigmasPage() {
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [zoom, setZoom] = useState(null)

  // fundo navy só nesta página: esconde o fundo rosa animado do site
  useEffect(() => {
    document.body.classList.add('in-enigma')
    return () => document.body.classList.remove('in-enigma')
  }, [])

  useEffect(() => {
    fetch('/api/enigma/arquivo', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) throw new Error('Sem resposta.')
        setArquivo(d)
      })
      .catch((e) => setErro(e.message || 'Não consegui abrir o arquivo.'))
  }, [])

  const vencedores = arquivo?.vencedores || []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-1 font-mono text-[#b9d4ff] sm:px-6">
      {/* topo */}
      <nav className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 border border-[#2f6bff]/60 bg-[#2f6bff]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cfe2ff]">
          <i className="not-italic text-[#5b9dff]">◆</i> Enigmas
        </span>
        <Link
          to="/cartas"
          className="inline-flex items-center gap-2 border border-[#2f6bff]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f9fd8] transition hover:border-[#2f6bff]/70 hover:text-[#cfe2ff]"
        >
          <i className="not-italic text-[#5b9dff]">◆</i> Cartas
        </Link>
      </nav>

      {/* marca */}
      <header className="mt-5 text-center sm:mt-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#2f6bff]/60 shadow-[0_0_45px_rgba(47,107,255,.35)] sm:h-20 sm:w-20">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-[#5b9dff]/30 bg-[#071228] sm:h-14 sm:w-14">
            <Trophy className="h-5 w-5 text-[#5b9dff] sm:h-6 sm:w-6" />
          </span>
        </div>
        <h1
          className="mt-3 text-[clamp(28px,8vw,54px)] font-black uppercase leading-none tracking-[0.18em] text-[#5b9dff] sm:mt-4 sm:tracking-[0.24em]"
          style={{ textShadow: '0 0 28px rgba(47,107,255,.55)' }}
        >
          Enigmas
        </h1>
      </header>

      {/* enigma 2 em breve — mensagem simples */}
      <section
        className="mt-5 border p-4 text-center sm:mt-6 sm:p-5"
        style={{ borderColor: 'rgba(255,77,109,.65)', background: 'rgba(8,10,30,.72)' }}
      >
        <p className="text-[12px] font-black uppercase tracking-[0.16em] sm:text-[13px] sm:tracking-[0.2em]" style={{ color: VERMELHO }}>
          ⚠ enigma 2 em breve
        </p>
        {erro && <p className="mt-3 text-[11px]" style={{ color: VERMELHO }}>{erro}</p>}
      </section>

      {/* últimos vencedores */}
      <section
        className="mt-4 overflow-hidden border"
        style={{ borderColor: 'rgba(47,107,255,.45)', background: 'rgba(5,9,26,.82)' }}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'rgba(47,107,255,.28)' }}>
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: CIANO }}>
            <span className="inline-block h-1.5 w-1.5" style={{ background: CIANO }} /> últimos vencedores
          </span>
          <span className="shrink-0 text-[9px] uppercase tracking-[0.2em] text-[#5f7fae]">
            {vencedores.length} semana{vencedores.length === 1 ? '' : 's'}
          </span>
        </div>

        {!arquivo ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-[#5f7fae]" />
          </div>
        ) : vencedores.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-[#8fb3e6]">Ainda não há vencedores.</p>
        ) : (
          <ul>
            {vencedores.map((v) => (
              <li key={v.semana} className="border-b last:border-0" style={{ borderColor: 'rgba(47,107,255,.12)' }}>
                <button
                  type="button"
                  onClick={() => setZoom(v)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#2f6bff]/10 sm:gap-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center border" style={{ borderColor: 'rgba(245,197,66,.4)', color: '#f5c542' }}>
                    <Trophy className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] uppercase tracking-[0.2em]" style={{ color: VERMELHO }}>
                      enigma {String(v.semana).replace('semana-', '')}
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] font-black uppercase tracking-[0.06em] text-[#dbe9ff]">
                      {v.nome}
                    </span>
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-[#5f7fae]">
                      1.º lugar · +{v.moedas} moedas · carta 1/1
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-[9px] uppercase tracking-[0.16em] text-[#5b9dff] sm:inline">
                    ver carta →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-center text-[9px] uppercase tracking-[0.3em] text-[#3d5d8a]">
        locaus.fun // enigmas // 2026
      </p>

      {/* zoom vencedor */}
      {zoom && (
        <div
          className="fixed inset-0 z-[140] grid place-items-center bg-black/90 p-4"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <div className="w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <CartaEnigma nome={zoom.nome} ampliada />
            <div className="mt-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: VERMELHO }}>
                enigma {String(zoom.semana).replace('semana-', '')} · 1.º lugar
              </p>
              <button
                type="button"
                onClick={() => setZoom(null)}
                className="mt-2 w-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cfe2ff]"
                style={{ borderColor: 'rgba(47,107,255,.5)', background: 'rgba(47,107,255,.12)' }}
              >
                fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
