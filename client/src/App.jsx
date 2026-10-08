import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import VideosSection from './components/VideosSection'
import HomeFeed from './components/HomeFeed'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import AuthScreen from './components/AuthScreen'
import RecoveryScreen from './components/RecoveryScreen'
import Footer from './components/Footer'
import GamesPage from './pages/GamesPage'
import UpdatesPage from './pages/UpdatesPage'
import BootScreen, { BackToMenu } from './components/BootScreen'
import ProfilePage from './pages/ProfilePage'
import ClipNotice from './components/ClipNotice'
import { authHeaders, clearUserSession, setUserSession } from './lib/auth'

function App() {
  const [entered, setEntered] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [user, setUser] = useState(null) // conta de utilizador (obrigatória)
  const [showAuth, setShowAuth] = useState(false)
  // false enquanto ainda não sabemos se há sessão guardada
  const [sessionChecked, setSessionChecked] = useState(
    () => !localStorage.getItem('userToken'),
  )
  const location = useLocation()
  const navigate = useNavigate()

  // Link de recuperação que chegou por email: /recuperar?token=...
  const recoveryToken =
    location.pathname === '/recuperar'
      ? new URLSearchParams(location.search).get('token')
      : null

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

  // Volta ao topo ao mudar de página
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

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

  return (
    <div className="min-h-screen bg-dark">
      {/* Ecrã de carregamento — mantém-se montado para a seta voltar */}
      <BootScreen visible={!entered} onEnter={() => setEntered(true)} />

      {/* Seta de voltar */}
      {entered && <BackToMenu onClick={() => setEntered(false)} />}

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
            {/* A verificar sessão guardada */}
            {!sessionChecked && (
              <div className="flex min-h-screen flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">
                  A verificar sessão
                </p>
              </div>
            )}

            {/* Link do email -> ecrã de nova palavra-passe */}
            {recoveryToken ? (
              <RecoveryScreen token={recoveryToken} onAuthed={handleAuthed} />
            ) : (
              sessionChecked && !user && <AuthScreen onAuthed={handleAuthed} />
            )}

            {/* Com conta -> site completo */}
            {authed && (
              <>
                <Navbar isAdmin={isAdmin} user={user} />
                <main>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <>
                          <ClipNotice />
                          <Hero />
                          <HomeFeed />
                          <VideosSection />
                        </>
                      }
                    />
                    <Route path="/jogos" element={<GamesPage />} />
                    <Route path="/atualizacoes" element={<UpdatesPage />} />
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
                        />
                      }
                    />
                    <Route path="*" element={<Hero />} />
                  </Routes>
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
