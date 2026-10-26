import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import RightColumn from './components/RightColumn'
import MobileMenu from './components/MobileMenu'
import Hero from './components/Hero'
import BetaBadge from './components/BetaBadge'
import TorneiosContagem from './components/TorneiosContagem'
import InstalarApp from './components/InstalarApp'
import VideosSection from './components/VideosSection'
import BarraAnuncios from './components/BarraAnuncios'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import AuthScreen from './components/AuthScreen'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import NovidadesModal from './components/NovidadesModal'
import BootScreen from './components/BootScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { Toasts, Dialogos } from './components/Feedback'
import { authHeaders, clearUserSession, setUserSession } from './lib/auth'
import { enviarSpecs } from './lib/specs'

// Páginas pesadas entram em separado (lazy) — a home abre mais rápido
const GamesPage = lazy(() => import('./pages/GamesPage'))
const SteamStorePage = lazy(() => import('./pages/SteamStorePage'))
const PcsPage = lazy(() => import('./pages/PcsPage'))
const FerramentasPage = lazy(() => import('./pages/FerramentasPage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const ClipsPage = lazy(() => import('./pages/ClipsPage'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'))
const MembrosPage = lazy(() => import('./pages/MembrosPage'))
const InfoAoVivoPage = lazy(() => import('./pages/InfoAoVivoPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const PrevisoesPage = lazy(() => import('./pages/PrevisoesPage'))
const RecuperarPage = lazy(() => import('./pages/RecuperarPage'))
const ComponentesPage = lazy(() => import('./pages/ComponentesPage'))

/* /perfil/:username — perfil público. O próprio user também vê o
   perfil público; para editar vai a /perfil/editar. */
function RotaPerfil({
  user,
  onRequestAuth,
  onProfile,
  onUserUpdate,
  isAdmin,
  onPanelClick,
  onLogout,
}) {
  return (
    <PublicProfilePage
      user={user}
      onRequestAuth={onRequestAuth}
      onProfile={onProfile}
      onUserUpdate={onUserUpdate}
      isAdmin={isAdmin}
      onPanelClick={onPanelClick}
      onLogout={onLogout}
    />
  )
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
  // Site normal e aberto a todos — sem página "em breve" nem código.
  const unlocked = true
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
    // plataforma: telemóvel vs PC (o site mostra "No PC" / "No Telemóvel")
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Mac|Linux/i.test(navigator.userAgent) && window.innerWidth < 1024)
    const ping = () =>
      fetch('/api/users/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ plataforma: isMobile ? 'mobile' : 'pc' }),
      }).catch(() => {})
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
            <BetaBadge />
            {/* Etiqueta BETA — em todos os ecrãs */}
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
            {sessionChecked && !user && location.pathname === '/recuperar' && (
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                  </div>
                }
              >
                <RecuperarPage onAuthed={handleAuthed} />
              </Suspense>
            )}
            {sessionChecked && !user && location.pathname !== '/recuperar' && (
              <AuthScreen onAuthed={handleAuthed} />
            )}

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
                          {/* Contagem regressiva até aos próximos torneios */}
                          <TorneiosContagem />
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
                    <Route path="/jogos-steam" element={<SteamStorePage />} />
                    <Route path="/chat" element={<ChatPage user={user} />} />
                    <Route path="/previsoes" element={<PrevisoesPage user={user} />} />
                    {/* Componentes e Periféricos — só admin (em testes) */}
                    <Route path="/componentes" element={<ComponentesPage user={user} />} />
                    {/* PCs dos membros: dashboard de specs — aberto a todos */}
                    <Route path="/pcs" element={<PcsPage isAdmin={isAdmin} />} />
                    {/* Ferramentas Windows: scripts no PC do servidor — aberto a todos */}
                    <Route path="/ferramentas" element={<FerramentasPage isAdmin={isAdmin} />} />
                    {/* /ligar: a app abria este endereço — manda para as ferramentas */}
                    <Route path="/ligar" element={<Navigate to="/ferramentas" replace />} />
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
                        <Navigate
                          to={`/perfil/${encodeURIComponent(user?.username || '')}`}
                          replace
                        />
                      }
                    />
                    <Route
                      path="/perfil/editar"
                      element={
                        <Navigate
                          to={`/perfil/${encodeURIComponent(user?.username || '')}`}
                          replace
                        />
                      }
                    />
                    {/* Perfil público — todos os membros (incluindo o próprio).
                        O editar abre a janela diretamente nesta página. */}
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
                    <Route path="/recuperar" element={<RecuperarPage onAuthed={handleAuthed} />} />
                    </Routes>
                    </motion.div>
                  </AnimatePresence>
                  </Suspense>
                  </ErrorBoundary>
                </main>
                <Footer />
                <BackToTop />
                <NovidadesModal user={user} />

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
