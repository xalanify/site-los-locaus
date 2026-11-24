import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Loader2, Trophy } from 'lucide-react'
import CartaEnigma from '../components/CartaEnigma'
import CartaEnigma2 from '../components/CartaEnigma2'
import { authHeaders } from '../lib/auth'

/* ============================================================
   ENIGMAS — estilo "terminal" (dark navy / azul / mono)
   O Enigma 2 está fechado: em preparação, abre em breve.
   ============================================================ */

const AZUL = '#5b9dff'
const AZUL_FORTE = '#2f6bff'
const CIANO = '#7ee7ff'
const VERDE = '#3dffa1'
const VERMELHO = '#ff4d6d'

export default function EnigmasPage() {
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [zoom, setZoom] = useState(null)
  const [zoomEnigma, setZoomEnigma] = useState(false)
  const [tabela, setTabela] = useState(null)

  const nomeConta = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').username || 'membro'
    } catch {
      return 'membro'
    }
  })()
  const { hash } = useLocation()

  useEffect(() => {
    fetch('/api/enigma/arquivo', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) throw new Error('Sem resposta.')
        setArquivo(d)
      })
      .catch((e) => setErro(e.message || 'Não consegui abrir o arquivo.'))
  }, [])

  useEffect(() => {
    let vivo = true
    fetch('/api/enigma2/tabela', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setTabela((d && d.jogadores) || []))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    if (hash === '#arquivo') {
      const el = document.getElementById('arquivo')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, arquivo])

  const vencedores = arquivo?.vencedores || []

  return (
    <div
      className="relative min-h-screen font-mono text-[#b9d4ff]"
      style={{
        background:
          'linear-gradient(rgba(70,130,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(70,130,255,.045) 1px, transparent 1px), #02040c',
        backgroundSize: '56px 56px, 56px 56px, auto',
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* topo */}
        <nav className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 border border-[#2f6bff]/60 bg-[#2f6bff]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cfe2ff]">
            <i className="not-italic text-[#5b9dff]">◆</i> Enigmas
          </span>
          <a
            href="#arquivo"
            className="inline-flex items-center gap-2 border border-[#2f6bff]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f9fd8] transition hover:border-[#2f6bff]/70 hover:text-[#cfe2ff]"
          >
            <i className="not-italic text-[#5b9dff]">◆</i> Arquivo
          </a>
          <Link
            to="/cartas"
            className="inline-flex items-center gap-2 border border-[#2f6bff]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f9fd8] transition hover:border-[#2f6bff]/70 hover:text-[#cfe2ff]"
          >
            <i className="not-italic text-[#5b9dff]">◆</i> Cartas
          </Link>
        </nav>

        {/* marca */}
        <header className="mt-10 text-center sm:mt-14">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[#2f6bff]/60 shadow-[0_0_45px_rgba(47,107,255,.35)]">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-[#5b9dff]/30 bg-[#071228]">
              <Trophy className="h-7 w-7 text-[#5b9dff]" />
            </span>
          </div>

          <h1
            className="mt-6 text-[clamp(34px,7vw,64px)] font-black uppercase leading-none tracking-[0.24em] text-[#5b9dff]"
            style={{ textShadow: '0 0 28px rgba(47,107,255,.55)' }}
          >
            Enigmas
          </h1>
          <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-[#6f9fd8]">
            protocolo orion · em preparação _
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: VERMELHO }}>
            sistema online · enigma 2 em breve
          </p>
        </header>

        {/* enigma 2 em preparação */}
        <section
          className="mt-10 border p-5 sm:p-7"
          style={{ borderColor: 'rgba(255,77,109,.65)', background: 'rgba(8,10,30,.72)' }}
        >
          <p className="text-center text-[13px] font-black uppercase tracking-[0.2em]" style={{ color: VERMELHO }}>
            ⚠ enigma 2 em preparação
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[12.5px] leading-relaxed text-[#8fb3e6]">
            O Protocolo Orion está a ser montado. Vai ter cinco etapas, pistas espalhadas pelo site e
            uma carta dourada 1/1 para o primeiro a terminar. Abre em breve.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <span
              className="cursor-not-allowed border px-8 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#0a1226] opacity-60"
              style={{ background: 'linear-gradient(180deg,#5b9dff,#2f6bff)', borderColor: '#5b9dff' }}
            >
              abre em breve
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#5f7fae]">
              ainda não é possível entrar
            </span>
          </div>

          {erro && <p className="mt-4 text-center text-[11px]" style={{ color: VERMELHO }}>{erro}</p>}
        </section>

        {/* carta */}
        <section className="mt-4 border" style={{ borderColor: 'rgba(47,107,255,.45)', background: 'rgba(5,9,26,.72)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(47,107,255,.28)' }}>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: CIANO }}>
              <span className="inline-block h-1.5 w-1.5" style={{ background: CIANO }} /> carta do enigma 2
            </span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#5f7fae]">1 / 1</span>
          </div>

          <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
            <button
              type="button"
              onClick={() => setZoomEnigma(true)}
              className="mx-auto w-[190px] shrink-0 border p-1 transition hover:brightness-110 sm:mx-0"
              style={{ borderColor: 'rgba(245,197,66,.45)', background: 'rgba(245,197,66,.04)' }}
              title="Ver a carta em grande"
            >
              <CartaEnigma2 nome={nomeConta} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-[#dbe9ff]">
                exclusiva do vencedor da semana 2
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#8fb3e6]">
                Só há uma unidade. É entregue ao <b className="text-[#cfe2ff]">1.º classificado</b> do
                Enigma 2 e fica na coleção dele. Os restantes levam moedas.
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#5f7fae]">
                prémios: 1.º carta 1/1 + 40 moedas · 2.º 30 · 3.º 25 · 4.º 20 · 5.º 15
              </p>
            </div>
          </div>
        </section>

        {/* classificação */}
        <section className="mt-4 border" style={{ borderColor: 'rgba(47,107,255,.45)', background: 'rgba(5,9,26,.72)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(47,107,255,.28)' }}>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: CIANO }}>
              <span className="inline-block h-1.5 w-1.5" style={{ background: CIANO }} /> classificação
            </span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#5f7fae]">protocolo orion</span>
          </div>

          {!tabela ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-[#5f7fae]" />
            </div>
          ) : tabela.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-[#8fb3e6]">
              Ainda ninguém entrou no Protocolo Orion.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12px]">
                <thead>
                  <tr className="border-b text-[9px] uppercase tracking-[0.2em] text-[#5f7fae]" style={{ borderColor: 'rgba(47,107,255,.2)' }}>
                    <th className="px-4 py-2.5 font-bold">#</th>
                    <th className="px-4 py-2.5 font-bold">membro</th>
                    <th className="px-4 py-2.5 font-bold">etapa</th>
                    <th className="px-4 py-2.5 font-bold">tempo</th>
                    <th className="px-4 py-2.5 text-right font-bold">moedas</th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.map((j, i) => {
                    const posicao = j.concluido && j.posicao ? j.posicao : i + 1
                    const mm = j.tempoMs ? String(Math.floor(j.tempoMs / 60000)).padStart(2, '0') : null
                    const ss = j.tempoMs ? String(Math.floor((j.tempoMs % 60000) / 1000)).padStart(2, '0') : null
                    return (
                      <tr key={`${j.username}-${i}`} className="border-b last:border-0" style={{ borderColor: 'rgba(47,107,255,.12)' }}>
                        <td className="px-4 py-2.5" style={{ color: j.concluido ? '#f5c542' : '#5f7fae' }}>
                          {j.admin ? 'dev' : j.concluido ? `${posicao}.º` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[#cfe2ff]">
                          {j.username}
                          {j.admin && (
                            <span className="ml-2 border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(255,77,109,.4)', color: VERMELHO }}>
                              não conta
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[#8fb3e6]">
                          {j.concluido ? 'concluído' : `etapa ${j.etapa} / 5`}
                        </td>
                        <td className="px-4 py-2.5 text-[#8fb3e6]">{mm ? `${mm}:${ss}` : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-[#8fb3e6]">
                          {j.admin ? '—' : j.moedas ? `+${j.moedas}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* arquivo */}
        <section id="arquivo" className="mt-4 scroll-mt-24 border" style={{ borderColor: 'rgba(47,107,255,.45)', background: 'rgba(5,9,26,.72)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(47,107,255,.28)' }}>
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: CIANO }}>
              <span className="inline-block h-1.5 w-1.5" style={{ background: CIANO }} /> vencedores anteriores
            </span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#5f7fae]">
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
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-[#2f6bff]/10"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center border" style={{ borderColor: 'rgba(245,197,66,.4)', color: '#f5c542' }}>
                      <Trophy className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9px] uppercase tracking-[0.22em]" style={{ color: VERMELHO }}>
                        enigma {String(v.semana).replace('semana-', '')}
                      </span>
                      <span className="mt-0.5 block truncate text-[14px] font-black uppercase tracking-[0.08em] text-[#dbe9ff]">
                        {v.nome}
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-[#5f7fae]">
                        1.º lugar · +{v.moedas} moedas · carta 1/1
                      </span>
                    </span>
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-[#5b9dff]">
                      ver carta →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center text-[9px] uppercase tracking-[0.3em] text-[#3d5d8a]">
          locaus.fun // protocolo orion // 2026
        </p>
      </div>

      {/* zoom carta do enigma */}
      {zoomEnigma && (
        <div
          className="fixed inset-0 z-[140] grid place-items-center bg-black/90 p-4"
          onClick={() => setZoomEnigma(false)}
          role="presentation"
        >
          <div className="w-full max-w-[400px]" onClick={(e) => e.stopPropagation()}>
            <CartaEnigma2 nome={nomeConta} ampliada />
            <button
              type="button"
              onClick={() => setZoomEnigma(false)}
              className="mt-3 w-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cfe2ff]"
              style={{ borderColor: 'rgba(47,107,255,.5)', background: 'rgba(47,107,255,.12)' }}
            >
              fechar
            </button>
          </div>
        </div>
      )}

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
