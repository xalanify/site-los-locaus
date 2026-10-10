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
import Footer from './components/Footer'
import GamesPage from './pages/GamesPage'
import UpdatesPage from './pages/UpdatesPage'
import ClipsPage from './pages/ClipsPage'
import RecentClip from './components/RecentClip'
import BootScreen, { BackToMenu } from './components/BootScreen'
import ProfilePage from './pages/ProfilePage'
import Snow from './components/Snow'
import { authHeaders, clearUserSession, setUserSession } from './lib/auth'
import { carregarTema, getTema, onTema } from './lib/theme'
import { ligarSons } from './lib/sound'
import { ligarVidro } from './lib/glass'

function App() {
  const [entered, setEntered] = useState(false)
  // tema escolhido no painel admin ('normal' | 'natal')
  const [tema, setTema] = useState(getTema())
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [user, setUser] = useState(null) // conta de utilizador (obrigatória)
  const [showAuth, setShowAuth] = useState(false)
  // false enquanto ainda não sabemos se há sessão guardada
  const [sessionChecked, setSessionChecked] = useState(
    () => !localStorage.getItem('userToken'),
  )
  const [showRecent, setShowRecent] = useState(true) // último clip público na home
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

  // Tema do site (escolhido no painel admin) + sons + vidro dos botões
  useEffect(() => {
    ligarSons()
    ligarVidro()
    carregarTema()
    return onTema(setTema)
  }, [])

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

  // Ver o perfil público de um membro (a partir de um clip)
  const openMember = (name) => navigate('/clips', { state: { member: name } })

  return (
    <div className="min-h-screen bg-dark">
      {/* Ecrã de carregamento — mantém-se montado para a seta voltar */}
      <BootScreen visible={!entered} onEnter={() => setEntered(true)} />

      {/* Seta de voltar — só na página inicial */}
      {entered && location.pathname === '/' && <BackToMenu onClick={() => setEntered(false)} />}

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
            {/* Tema de Natal — cordão de luzes no topo + neve a cair */}
            {tema === 'natal' && (
              <>
                <div className="luzes-natal" aria-hidden="true" />
                <Snow />
              </>
            )}
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
                <Navbar isAdmin={isAdmin} user={user} />
                <main>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <>
                          <Hero />
                          {/* Último clip público + botão para a aba de clips */}
                          {showRecent && (
                            <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6">
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
                                  Último clip publicado
                                </h2>
                                <button
                                  onClick={() => navigate('/clips')}
                                  className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-600 sm:text-sm"
                                >
                                  Ver todos os clips
                                </button>
                              </div>
                              <div className="mx-auto max-w-2xl">
                                <RecentClip
                                  user={user}
                                  onRequestAuth={() => setShowAuth(true)}
                                  onProfile={openMember}
                                  onEmptyChange={(empty) => setShowRecent(!empty)}
                                />
                              </div>
                            </section>
                          )}
                          <HomeFeed />
                          <VideosSection />
                        </>
                      }
                    />
                    <Route path="/jogos" element={<GamesPage />} />
                    <Route path="/atualizacoes" element={<UpdatesPage />} />
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
