import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Navbar from './components/Navbar'
import RightColumn from './components/RightColumn'
import Mapa from './components/Mapa'
import BetaBadge from './components/BetaBadge'
import MercadoHome from './components/MercadoHome'
import TorneiosHome from './components/TorneiosHome'
import VideosModal from './components/VideosModal'
import AvisosIniciais from './components/AvisosIniciais'
import DiarioModal from './components/DiarioModal'
import BonusBugModal from './components/BonusBugModal'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import AuthScreen from './components/AuthScreen'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import BootScreen from './components/BootScreen'
import ErrorBoundary from './components/ErrorBoundary'
import MorphPointer from './components/MorphPointer'
import ClickSplash from './components/ClickSplash'
import KovaTopbar from './components/KovaTopbar'
import FundoVivo from './components/FundoVivo'
import { modeDe } from './data/navegacao'
import { Toasts, Dialogos } from './components/Feedback'
import { authHeaders, clearUserSession, setUserSession } from './lib/auth'
import { fechar as fecharSSE } from './lib/sse'
import { enviarSpecs } from './lib/specs'

// Páginas pesadas entram em separado (lazy) — a home abre mais rápido
const GamesPage = lazy(() => import('./pages/GamesPage'))
const FerramentasPage = lazy(() => import('./pages/FerramentasPage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const ClipsPage = lazy(() => import('./pages/ClipsPage'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'))
const MembrosPage = lazy(() => import('./pages/MembrosPage'))
const CartasPage = lazy(() => import('./pages/CartasPage'))
const InfoAoVivoPage = lazy(() => import('./pages/InfoAoVivoPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const PrevisoesPage = lazy(() => import('./pages/PrevisoesPage'))
const RecuperarPage = lazy(() => import('./pages/RecuperarPage'))
const ComponentesPage = lazy(() => import('./pages/ComponentesPage'))
const CosmeticosPage = lazy(() => import('./pages/CosmeticosPage'))
const BuildLabPage = lazy(() => import('./pages/BuildLabPage'))

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
  const [menuAberto, setMenuAberto] = useState(false)
  const [showVideos, setShowVideos] = useState(false) // janela flutuante dos vídeos
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

  // O corpo sabe em que modo está (cor de acento por secção).
  useEffect(() => {
    document.body.dataset.mode = modeDe(location.pathname).id
  }, [location.pathname])

  // O menu fecha com Esc.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuAberto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    setMenuAberto(false)
  }, [location.pathname])

  // Analytics simples: uma visita por página (sem cookies e sem nomes)
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/users/track', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: location.pathname, referrer: document.referrer || '' }),
      }).catch(() => {})
    }, 700)
    return () => clearTimeout(t)
  }, [location.pathname])

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

  // Presença — sinal online/ausente na lista de membros
  useEffect(() => {
    if (!unlocked || !sessionChecked || !user) return
    // plataforma: telemóvel vs PC (o site mostra "No PC" / "No Telemóvel")
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Mac|Linux/i.test(navigator.userAgent) && window.innerWidth < 1024)
    const AUSENTE_MS = 5 * 60 * 1000
    let ultimoClique = Date.now()
    const ping = () => {
      const away = Date.now() - ultimoClique >= AUSENTE_MS
      fetch('/api/users/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ plataforma: isMobile ? 'mobile' : 'pc', away }),
      }).catch(() => {})
    }
    const ativo = () => {
      const estavaAusente = Date.now() - ultimoClique >= AUSENTE_MS
      ultimoClique = Date.now()
      if (estavaAusente) ping()
    }
    window.addEventListener('pointerdown', ativo)
    window.addEventListener('keydown', ativo)
    ping()
    const t = setInterval(ping, 30000)
    return () => {
      clearInterval(t)
      window.removeEventListener('pointerdown', ativo)
      window.removeEventListener('keydown', ativo)
    }
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
    try {
      fecharSSE()
    } catch {
      /* nada */
    }
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
      <MorphPointer />
      <ClickSplash />
      {/* Fundo animado (rosa salmão) */}
      {authed && <FundoVivo />}
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
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
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
                    <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
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
                {/* Barra de topo (desktop) — tema experimental */}
                <KovaTopbar user={user} isAdmin={isAdmin} />
                <Navbar user={user} onMenu={() => setMenuAberto(true)} />
                <Mapa
                  open={menuAberto}
                  onClose={() => setMenuAberto(false)}
                  user={user}
                  isAdmin={isAdmin}
                  onLogout={handleUserLogout}
                />
                {/* Sidebar lateral (só no PC) */}
                {/* Removida: a navegação vive na barra de topo. */}
                {/* Coluna direita (só em ecrãs largos) */}
                <RightColumn />
                <main className="lv-main pb-[calc(2rem+env(safe-area-inset-bottom))]">
                  {/* Muro de erros: se uma página rebentar no render, só
                      ela cai — e a key pelo caminho limpa o erro quando
                      se navega para outro sítio */}
                  <ErrorBoundary key={location.pathname}>
                  <Suspense
                    fallback={
                      <div className="flex min-h-[60vh] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
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
                        <div className="home-dash">
                          <p className="home-beta-note">
                            <b>BETA</b> O design ainda está a evoluir — pode mudar.
                          </p>
                          <MercadoHome isAdmin={isAdmin} />
                          <TorneiosHome />
                        </div>
                      }
                    />
{/* Contas de jogo — aberto a todos os membros */}
                    <Route path="/jogos" element={<GamesPage />} />
                    <Route path="/chat" element={<ChatPage user={user} />} />
                    <Route path="/previsoes" element={<PrevisoesPage user={user} />} />
                    <Route
                      path="/builds"
                      element={isAdmin ? <BuildLabPage /> : <Navigate to="/" replace />}
                    />
                    {/* Componentes e Periféricos — só admin (em testes) */}
                    <Route
                      path="/componentes"
                      element={
                        isAdmin ? <ComponentesPage user={user} /> : <Navigate to="/" replace />
                      }
                    />
                    {/* PCs dos membros: agora dentro de Ferramentas Windows */}
                    <Route path="/pcs" element={<Navigate to="/ferramentas?aba=pcs" replace />} />
                    {/* Loja de cosméticos — aberta a todos */}
                    <Route path="/cosmeticos" element={<CosmeticosPage isAdmin={isAdmin} />} />
                    {/* Ferramentas Windows: aberta a todos; Otimizações só admin */}
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
                    <Route path="/cartas" element={<CartasPage />} />
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
                    <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    </motion.div>
                  </AnimatePresence>
                  </Suspense>
                  </ErrorBoundary>
                </main>
                <Footer />
                <BackToTop />
                <VideosModal open={showVideos} onClose={() => setShowVideos(false)} />
                <AvisosIniciais user={user} />
                <DiarioModal user={user} />
                <BonusBugModal user={user} />

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
