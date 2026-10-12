import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import RightColumn from './components/RightColumn'
import MobileMenu from './components/MobileMenu'
import BetaBadge from './components/BetaBadge'
import Hero from './components/Hero'
import VideosSection from './components/VideosSection'
import BarraAnuncios from './components/BarraAnuncios'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import AuthScreen from './components/AuthScreen'
import Footer from './components/Footer'
import BootScreen from './components/BootScreen'
import { authHeaders, clearUserSession, setUserSession } from './lib/auth'
import { enviarSpecs } from './lib/specs'

// Páginas pesadas entram em separado (lazy) — a home abre mais rápido
const GamesPage = lazy(() => import('./pages/GamesPage'))
const PcsPage = lazy(() => import('./pages/PcsPage'))
const FerramentasPage = lazy(() => import('./pages/FerramentasPage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const ClipsPage = lazy(() => import('./pages/ClipsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'))
const MembrosPage = lazy(() => import('./pages/MembrosPage'))

function App() {
  const [entered, setEntered] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false) // menu lateral (telemóvel)
  const [user, setUser] = useState(null) // conta de utilizador (obrigatória)
  const [showAuth, setShowAuth] = useState(false)
  // false enquanto ainda não sabemos se há sessão guardada
  const [sessionChecked, setSessionChecked] = useState(
    () => !localStorage.getItem('userToken'),
  )
  const location = useLocation()
  const navigate = useNavigate()

  // Sessão de utilizador guardada — obrigatória para entrar no site
  useEffect(() => {
    if (!localStorage.getItem('userToken')) {
      setSessionChecked(true)
      return
    }
    fetch('/api/users/me', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUser(data)
        else clearUserSession()
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true))
  }, [])

  // Presença — sinal online/offline na lista de membros
  useEffect(() => {
    if (!sessionChecked || !user) return
    const ping = () =>
      fetch('/api/users/presence', { method: 'POST', headers: authHeaders() }).catch(() => {})
    ping()
    const t = setInterval(ping, 30000)
    return () => clearInterval(t)
  }, [sessionChecked, user])

  // Volta ao topo ao mudar de página
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Specs do PC — recolhidas no browser, enviadas de 3 em 3 dias
  // (ou logo na primeira entrada); o servidor guarda a baseline.
  useEffect(() => {
    if (!sessionChecked || !user) return
    try {
      const ultimo = Number(localStorage.getItem('specsAt') || 0)
      if (Date.now() - ultimo < 3 * 24 * 3600 * 1000) return
      enviarSpecs()
        .then((d) => {
          if (d && d.ok) localStorage.setItem('specsAt', String(Date.now()))
        })
        .catch(() => {})
    } catch {
      /* nada a fazer */
    }
  }, [sessionChecked, user])

  // Conta de utilizador (a sessão é obrigatória para entrar)
  const handleAuthed = (data) => {
    setUserSession(data.token, data.user)
    setUser(data.user)
    setShowAuth(false)
  }
  const handleUserLogout = () => {
    clearUserSession()
    setUser(null)
    setShowAdminPanel(false)
  }

  const authed = sessionChecked && Boolean(user)
  // Admin = conta de utilizador com is_admin (marcada no servidor)
  const isAdmin = Boolean(user?.is_admin)
  // Modo recuperação ligado pelo admin -> obriga ao ecrã de nova pass
  const needsRecovery = authed && Boolean(user?.recovery)

  // Ver o perfil público de um membro — cada um tem página própria
  const openMember = (name) => navigate(`/perfil/${encodeURIComponent(name)}`)

  return (
    <div className="min-h-screen bg-dark">
      {/* Ecrã de carregamento — entra sozinho depois da barra encher */}
      <BootScreen visible={!entered} onEnter={() => setEntered(true)} />

      {/* Site */}
      <AnimatePresence>
        {entered && (
          <motion.div
            key="site"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="origin-center"
          >
            {/* Etiqueta BETA — em todos os ecrãs */}
            <BetaBadge />
            {/* A verificar sessão guardada */}
            {!sessionChecked && (
              <div className="flex min-h-screen flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">
                  A verificar sessão
                </p>
              </div>
            )}

            {/* Link de recuperação -> ecrã de nova palavra-passe */}
            {sessionChecked && !user && <AuthScreen onAuthed={handleAuthed} />}

            {/* Conta em modo recuperação -> sempre no ecrã de nova pass */}
            {needsRecovery && (
              <AuthScreen forceReset forceUsername={user.username} onAuthed={handleAuthed} />
            )}

            {/* Com conta -> site completo */}
            {authed && !needsRecovery && (
              <>
                {/* Barra de navegação (só no telemóvel) */}
                <Navbar
                  isAdmin={isAdmin}
                  user={user}
                  onMenu={() => setMenuOpen(true)}
                />
                {/* Menu lateral estilo X (só no telemóvel) */}
                <MobileMenu
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  user={user}
                  isAdmin={isAdmin}
                  onLogout={handleUserLogout}
                />
                {/* Sidebar lateral (só no PC) */}
                <Sidebar user={user} isAdmin={isAdmin} />
                {/* Coluna direita (só em ecrãs largos) */}
                <RightColumn />
                <main className="lg:pl-[260px] xl:pl-[280px] xl:pr-[320px]">
                  <Suspense
                    fallback={
                      <div className="flex min-h-[60vh] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                      </div>
                    }
                  >
                  {/* Transição entre páginas ao estilo iOS:
                      a nova entra pela direita, a antiga sai para a esquerda */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, x: 26 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -26 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    >
                    <Routes location={location}>
                    <Route
                      path="/"
                      element={
                        <>
                          {/* Anúncios presos no topo — só aparece se houver */}
                          <BarraAnuncios />
                          {/* O canal: foto, nome, subscritores e visualizações */}
                          <Hero />
                          {/* Os vídeos do canal, mais em baixo */}
                          <VideosSection />
                        </>
                      }
                    />
                    {/* Contas de jogo: ficam no backend — só o admin abre */}
                    <Route
                      path="/jogos"
                      element={isAdmin ? <GamesPage /> : <Navigate to="/" replace />}
                    />
                    {/* PCs dos membros: dashboard de specs — só o admin */}
                    <Route
                      path="/pcs"
                      element={isAdmin ? <PcsPage /> : <Navigate to="/" replace />}
                    />
                    {/* Ferramentas Windows: scripts no PC do servidor — só o admin */}
                    <Route
                      path="/ferramentas"
                      element={isAdmin ? <FerramentasPage /> : <Navigate to="/" replace />}
                    />
                    <Route path="/atualizacoes" element={<UpdatesPage />} />
                    <Route
                      path="/membros"
                      element={<MembrosPage onProfile={openMember} />}
                    />
                    <Route
                      path="/clips"
                      element={
                        <ClipsPage
                          user={user}
                          onRequestAuth={() => setShowAuth(true)}
                          onProfile={openMember}
                        />
                      }
                    />
                    <Route
                      path="/perfil"
                      element={
                        <ProfilePage
                          user={user}
                          isAdmin={isAdmin}
                          onLogout={handleUserLogout}
                          onPanelClick={() => setShowAdminPanel(true)}
                          onAuthClick={() => setShowAuth(true)}
                          onUserUpdate={setUser}
                          onProfile={openMember}
                        />
                      }
                    />
                    {/* Perfil público com página própria */}
                    <Route
                      path="/perfil/:username"
                      element={
                        <PublicProfilePage
                          user={user}
                          onRequestAuth={() => setShowAuth(true)}
                          onProfile={openMember}
                        />
                      }
                    />
                    <Route path="*" element={<Hero />} />
                    </Routes>
                    </motion.div>
                  </AnimatePresence>
                  </Suspense>
                </main>
                <Footer />

                {/* Conta de utilizador: entrar / criar conta (reserva) */}
                <AuthModal
                  isOpen={showAuth}
                  onClose={() => setShowAuth(false)}
                  onAuthed={handleAuthed}
                />

                {/* Painel admin — só para contas com is_admin */}
                {isAdmin && showAdminPanel && (
                  <AdminPanel
                    user={user}
                    onClose={() => setShowAdminPanel(false)}
                    onLogout={handleUserLogout}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
