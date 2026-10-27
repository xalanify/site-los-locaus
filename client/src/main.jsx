import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LiveProvider } from './lib/live'
import './index.css'
import { registarSW } from './lib/pwa'

// PWA: regista o service worker (cache do site + notificações push)
registarSW()

// Guarda o evento beforeinstallprompt assim que dispara (antes mesmo do React)
// para o botão "Instalar app" conseguir abrir o prompt nativo num clique direto.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__ajInstallPrompt = e
})
window.addEventListener('appinstalled', () => {
  window.__ajInstallPrompt = null
})

// Em modo PWA standalone no telemóvel, desliga o zoom/pinch.
if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
  document.documentElement.classList.add('pwa-no-zoom')

  // Bloqueia o "pinch" (dois dedos) — Safari iOS ignora o touch-action.
  document.addEventListener(
    'gesturestart',
    (e) => {
      e.preventDefault()
    },
    { passive: false },
  )
  document.addEventListener(
    'gesturechange',
    (e) => {
      e.preventDefault()
    },
    { passive: false },
  )
  document.addEventListener(
    'gestureend',
    (e) => {
      e.preventDefault()
    },
    { passive: false },
  )
  // Dois dedos em qualquer elemento = zoom: bloqueia.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    },
    { passive: false },
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LiveProvider>
        <App />
      </LiveProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
