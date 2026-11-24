import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import MoedaLocaus from './MoedaLocaus'
import ItemMini from './ItemMini'
import { classesNome } from '../data/nomeEfeitos'

/* ============================================================
   VITRINE 3D DO MERCADO
   ------------------------------------------------------------
   Carrossel em perspetiva: as cartas giram num leque 3D.
   Roda sozinho, dá para arrastar, usar as setas e o teclado.
   ============================================================ */

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('pt-PT')

const RARIDADE_COR = {
  comum: '#a1a1aa',
  raro: '#60a5fa',
  epico: '#c084fc',
  lendario: '#f5c542',
}

const RARIDADE_NOME = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
}

export default function MercadoVitrine({ itens = [], me, onAbrir }) {
  const total = itens.length
  const [ativo, setAtivo] = useState(0)
  const [pausa, setPausa] = useState(false)
  const arrasto = useRef({ x: 0, ativo: false, mudou: false })

  const ir = (passo) => {
    if (!total) return
    setAtivo((a) => (a + passo + total) % total)
  }

  // roda sozinho (para quando o rato está em cima)
  useEffect(() => {
    if (total < 2 || pausa) return undefined
    const t = setInterval(() => setAtivo((a) => (a + 1) % total), 5200)
    return () => clearInterval(t)
  }, [total, pausa])

  useEffect(() => {
    if (ativo > total - 1) setAtivo(0)
  }, [ativo, total])

  if (!total) return null

  const deslocamento = (i) => {
    if (total < 3) return i - ativo
    let d = i - ativo
    if (d > total / 2) d -= total
    if (d < -total / 2) d += total
    return d
  }

  const item = itens[Math.min(ativo, total - 1)]
  const cor = RARIDADE_COR[item.raridade] || '#a1a1aa'
  const sobe = item.variacao >= 0

  const aoDescer = (e) => {
    // nas setas e nos pontos não se agarra o arrasto (senão o clique não chega)
    if (e.target.closest && e.target.closest('button')) return
    arrasto.current = { x: e.clientX, ativo: true, mudou: false }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* sem captura */
    }
  }
  const aoMover = (e) => {
    if (!arrasto.current.ativo) return
    if (Math.abs(e.clientX - arrasto.current.x) > 46) {
      ir(e.clientX < arrasto.current.x ? 1 : -1)
      arrasto.current = { x: e.clientX, ativo: true, mudou: true }
    }
  }
  const aoSubir = () => {
    arrasto.current = { ...arrasto.current, ativo: false }
  }

  return (
    <section className="mk-vitrine" aria-label="Vitrine 3D do mercado">
      <header className="mk-vitrine-topo">
        <span className="mk-kicker">
          <Sparkles className="h-3.5 w-3.5" /> em destaque
          <span className="mk-kicker-dim">· carrossel 3d</span>
        </span>
        <span className="mk-contador">
          {String(ativo + 1).padStart(2, '0')}
          <span className="mk-contador-dim">/ {String(total).padStart(2, '0')}</span>
        </span>
      </header>

      <div className="mk-vitrine-corpo">
        <div
          className="mk-palco"
          onPointerEnter={() => setPausa(true)}
          onPointerLeave={() => {
            setPausa(false)
            aoSubir()
          }}
          onPointerDown={aoDescer}
          onPointerMove={aoMover}
          onPointerUp={aoSubir}
          onPointerCancel={aoSubir}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') ir(-1)
            if (e.key === 'ArrowRight') ir(1)
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="carrossel"
        >
          <span className="mk-palco-luz" aria-hidden="true" />
          <span className="mk-palco-chao" aria-hidden="true" />

          {itens.map((it, i) => {
            const d = deslocamento(i)
            const abs = Math.abs(d)
            const frente = d === 0
            const c = RARIDADE_COR[it.raridade] || '#a1a1aa'
            return (
              <div
                key={it.id}
                className={`mk-slide${frente ? ' is-ativo' : ''}`}
                style={{
                  transform: `translate(-50%, -50%) translateX(${d * 54}%) translateZ(${-abs * 96}px) rotateY(${d * -24}deg) scale(${1 - abs * 0.035})`,
                  opacity: abs > 3 ? 0 : 1,
                  zIndex: 40 - abs,
                  filter: abs ? `brightness(${Math.max(0.45, 1 - abs * 0.17)})` : 'none',
                  pointerEvents: abs > 2 ? 'none' : 'auto',
                  '--mk-cor': c,
                }}
                role="button"
                tabIndex={frente ? 0 : -1}
                aria-label={`${it.nome} — ${RARIDADE_NOME[it.raridade] || ''}`}
                onClick={() => {
                  if (arrasto.current.mudou) {
                    arrasto.current.mudou = false
                    return
                  }
                  if (frente) onAbrir(it)
                  else setAtivo(i)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    frente ? onAbrir(it) : setAtivo(i)
                  }
                }}
              >
                <span className="mk-slide-brilho" aria-hidden="true" />
                {it.tipo === 'cor' ? (
                  <span className="mk-slide-cor">
                    <span className={classesNome(it.valor)}>{me?.username || 'Nome'}</span>
                  </span>
                ) : (
                  <ItemMini item={it} me={me} className="mk-mini-vitrine" />
                )}
                <span className="mk-slide-sombra" aria-hidden="true" />
              </div>
            )
          })}

          <button
            type="button"
            className="mk-seta mk-seta--esq"
            onClick={(e) => {
              e.stopPropagation()
              ir(-1)
            }}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="mk-seta mk-seta--dir"
            onClick={(e) => {
              e.stopPropagation()
              ir(1)
            }}
            aria-label="Seguinte"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mk-ficha" style={{ '--mk-cor': cor }}>
          <span className="mk-ficha-raridade">{RARIDADE_NOME[item.raridade] || 'Raro'}</span>
          <h3 className="mk-ficha-nome">{item.nome}</h3>
          <p className="mk-ficha-meta">
            {item.tipo === 'cor' ? 'cor de nome' : 'carta de perfil'}
            {item.comprado ? ' · já é tua' : item.emBreve ? ' · em breve' : ''}
          </p>

          <div className="mk-ficha-preco">
            <b>{fmt(item.comprado ? item.preco_venda : item.preco_compra)}</b>
            <MoedaLocaus size={16} />
            <span className={`mk-var ${sobe ? 'is-sobe' : 'is-desce'}`}>
              {sobe ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {sobe ? '+' : ''}
              {Number(item.variacao || 0).toFixed(1)}%
            </span>
          </div>

          <button type="button" className="mk-ficha-btn" onClick={() => onAbrir(item)}>
            {item.comprado ? 'ver item' : 'ver e comprar'}
          </button>

          <div className="mk-pontos" role="tablist" aria-label="Escolher destaque">
            {itens.map((it, i) => (
              <button
                key={it.id}
                type="button"
                role="tab"
                aria-selected={i === ativo}
                aria-label={it.nome}
                className={`mk-ponto${i === ativo ? ' is-ativo' : ''}`}
                onClick={() => setAtivo(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
