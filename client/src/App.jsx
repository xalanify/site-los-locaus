import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import RightColumn from './components/RightColumn'
import MobileMenu from './components/MobileMenu'
import BetaBadge from './components/BetaBadge'
import Hero from './components/Hero'
import InstalarApp from './components/InstalarApp'
import VideosSection from './components/VideosSection'
import BarraAnuncios from './components/BarraAnuncios'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import AuthScreen from './components/AuthScreen'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import BootScreen from './components/BootScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { Toasts, Dialogos } from './components/Feedback'
import GatePage from './components/GatePage'
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
const InfoAoVivoPage = lazy(() => import('./pages/InfoAoVivoPage'))

/* /perfil/:username — se o nome da rota é o do utilizador ligado,
   mostra o MESMO perfil cheio da sidebar (bio, editar, distinções…);
   os dos outros membros continuam na página pública. */
function RotaPerfil({
  user,
  onRequestAuth,
  onUserUpdate,
  isAdmin,
  onLogout,
  onPanelClick,
  onAuthClick,
  onProfile,
}) {
  const { username } = useParams()
  const [dono, setDono] = useState(false)
  useEffect(() => {
    // saber se a página é do utilizador ligado (username não distingue
    // maiúsculas — o servidor guarda username_lower)
    let vivo = true
    if (!user || !user.username) {
      setDono(false)
      if (!user) onRequestAuth && onRequestAuth()
      return undefined
    }
    const igual =
      String(user.username).toLowerCase() === String(username || '').toLowerCase() ||
      (user.username_lower && String(user.username_lower).toLowerCase() ===
        String(username || '').toLowerCase())
    setDono(igual)
    return () => {
      vivo = false
    }
  }, [user, username])
  if (dono) {
    return (
      <ProfilePage
        user={user}
        isAdmin={isAdmin}
        onLogout={onLogout}
        onPanelClick={onPanelClick}
        onAuthClick={onAuthClick}
        onProfile={onProfile}
        onUserUpdate={onUserUpdate}
      />
    )
  }
  return <PublicProfilePage user={user} onRequestAuth={onRequestAuth} onProfile={onProfile} />
}

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
  // Portão do site publicado: "em breve" + código. Fica desbloqueado
  // neste browser depois de acertar no código (chave aj-gate-v1).
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem('aj-gate-v1') === '1'
    } catch {
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()

  // Sessão de utilizador guardada — obrigatória para entrar no site
  useEffect(() => {
    if (!unlocked) return
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
  }, [unlocked])

  // Presença — sinal online/offline na lista de membros
  useEffect(() => {
    if (!unlocked || !sessionChecked || !user) return
    const ping = () =>
      fetch('/api/users/presence', { method: 'POST', headers: authHeaders() }).catch(() => {})
    ping()
    const t = setInterval(ping, 30000)
    return () => clearInterval(t)
  }, [unlocked, sessionChecked, user])

  // Volta ao topo ao mudar de página
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Specs do PC — recolhidas no browser, enviadas de 3 em 3 dias
  // (ou logo na primeira entrada); o servidor guarda a baseline.
  useEffect(() => {
    if (!unlocked || !sessionChecked || !user) return
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
  }, [unlocked, sessionChecked, user])

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

  // Sem o código certo, o site nem se monta: fica a página "em breve".
  if (!unlocked) {
    return (
      <GatePage
        onUnlock={() => {
          setEntered(false) // o CMD de entrada toca a seguir
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen">
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
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
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
                <main className="pb-24 lg:pb-0 lg:pl-[260px] xl:pl-[280px] xl:pr-[320px]">
                  {/* Muro de erros: se uma página rebentar no render, só
                      ela cai — e a key pelo caminho limpa o erro quando
                      se navega para outro sítio */}
                  <ErrorBoundary key={location.pathname}>
                  <Suspense
                    fallback={
                      <div className="flex min-h-[60vh] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                      </div>
                    }
                  >
                  {/* Transição entre páginas ao estilo iOS:
                      a nova entra pela direita, a antiga sai para a esquerda */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={location.pathname}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
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
                          {/* Só no telemóvel: instalar o site como app */}
                          <InstalarApp />
                          {/* Os vídeos do canal, mais em baixo */}
                          <VideosSection />
                        </>
                      }
                    />
                    {/* Contas de jogo — aberto a todos os membros */}
                    <Route path="/jogos" element={<GamesPage />} />
                    {/* PCs dos membros: dashboard de specs — aberto a todos */}
                    <Route path="/pcs" element={<PcsPage />} />
                    {/* Ferramentas Windows: scripts no PC do servidor — aberto a todos */}
                    <Route path="/ferramentas" element={<FerramentasPage />} />
                    {/* InfoAoVivo (beta) — app nativo de overlays do PC */}
                    <Route path="/infoaovivo" element={<InfoAoVivoPage />} />
                    <Route path="/distincoes" element={<UpdatesPage />} />
                    <Route path="/atualizacoes" element={<Navigate to="/distincoes" replace />} />
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
                    {/* Perfil público com página própria — se o nome
                        na rota é o do utilizador ligado, mostra o
                        MESMO perfil cheio da sidebar (bio, editar…) */}
                    <Route
                      path="/perfil/:username"
                      element={
                        <RotaPerfil
                          user={user}
                          onRequestAuth={() => setShowAuth(true)}
                          onProfile={openMember}
                          onUserUpdate={setUser}
                          isAdmin={isAdmin}
                          onLogout={handleUserLogout}
                          onPanelClick={() => setShowAdminPanel(true)}
                          onAuthClick={() => setShowAuth(true)}
                        />
                      }
                    />
                    <Route path="*" element={<Hero />} />
                    </Routes>
                    </motion.div>
                  </AnimatePresence>
                  </Suspense>
                  </ErrorBoundary>
                </main>
                <Footer />
                <BackToTop />

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

      {/* Avisos do site (toasts) e diálogo de confirmação do site */}
      <Toasts />
      <Dialogos />
    </div>
  )
}

export default App
