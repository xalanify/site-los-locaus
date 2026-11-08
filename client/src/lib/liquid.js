/* ============================================================
   ÁGUA — o brilho segue o rato e os cliques fazem uma onda
   ============================================================ */

const HOVER =
  '.ui-btn, .tab-item, .lv-nav-link, .lv-mlink, .lv-user, .lv-mbar-user, .lv-mbar-menu, .auth-tab, .pf-tile, .mercado-linha, .kova-moedas, .btn-glass, .liquid-cmd-item, .liquid-searchbar, .liquid-searchicon'

const RIPPLE =
  '.ui-btn, .tab-item, .lv-nav-link, .lv-mlink, .lv-user, .lv-mbar-user, .lv-mbar-menu, .auth-tab, .mercado-linha, .liquid-cmd-item, .liquid-searchbar, .liquid-searchicon, .btn-glass'

export function instalarLiquid() {
  if (typeof window === 'undefined' || window.__liquidInstalado) return
  window.__liquidInstalado = true

  document.addEventListener(
    'pointermove',
    (e) => {
      const alvo = e.target && e.target.closest ? e.target.closest(HOVER) : null
      if (!alvo) return
      const r = alvo.getBoundingClientRect()
      if (!r.width || !r.height) return
      alvo.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
      alvo.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
    },
    { passive: true },
  )

  document.addEventListener(
    'pointerdown',
    (e) => {
      const alvo = e.target && e.target.closest ? e.target.closest(RIPPLE) : null
      if (!alvo) return
      const r = alvo.getBoundingClientRect()
      if (!r.width || !r.height) return
      const onda = document.createElement('span')
      onda.className = 'liquid-ripple'
      onda.style.left = `${e.clientX - r.left}px`
      onda.style.top = `${e.clientY - r.top}px`
      alvo.appendChild(onda)
      window.setTimeout(() => onda.remove(), 760)
    },
    { passive: true },
  )
}
