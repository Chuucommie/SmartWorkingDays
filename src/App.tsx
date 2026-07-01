import { useEffect, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { isFeatureEnabled, APP_CONFIG } from './modules/shared/config.ts'
import { initPlanBackend } from './modules/shared/planBackend.ts'
import { initializeAuth } from './modules/shared/msAuth.ts'
import { useTheme } from './modules/shared/ThemeProvider.tsx'
import { isLoggedIn, loadSession, clearSession, initTursoAuth } from './modules/shared/tursoAuth.ts'
import type { AuthUser } from './modules/shared/tursoAuth.ts'
import Dashboard from './Dashboard.tsx'
import SmartWorkingApp from './modules/smartworking/SmartWorkingApp.tsx'
import TeamViewPage from './modules/smartworking/TeamViewPage.tsx'
import SavedWeeksPage from './modules/smartworking/SavedWeeksPage.tsx'
import SettingsPage from './modules/smartworking/SettingsPage.tsx'
import TimesheetApp from './modules/timesheet/TimesheetApp.tsx'
import AuthPage from './modules/smartworking/AuthPage.tsx'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Init Turso auth
    if (APP_CONFIG.features.tursoBackend) {
      initTursoAuth({ url: APP_CONFIG.turso.url, token: APP_CONFIG.turso.token })
    }

    // Check existing session
    const session = loadSession()
    if (session) {
      setUser({
        id: session.userId,
        email: session.email,
        name: session.name,
        department: session.department,
        locationCode: session.locationCode,
      })
    }
    setAuthChecked(true)

    // Init MS auth (non-blocking)
    initializeAuth().then(() => {
      console.info('[App] Auth inizializzata')
    }).catch(err =>
      console.warn('[App] Inizializzazione auth fallita:', err)
    )

    // Init plan backend
    initPlanBackend().catch(err =>
      console.warn('[App] Inizializzazione backend fallita:', err)
    )
  }, [])

  const handleLogin = (authUser: AuthUser) => {
    setUser(authUser)
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
  }

  if (!authChecked) {
    return (
      <div className="app-shell">
        <main className="app-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Caricamento...</p>
          </div>
        </main>
      </div>
    )
  }

  // Show auth page if not logged in and Turso backend is active
  if (!user && APP_CONFIG.features.tursoBackend) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <nav className="global-nav">
        <div className="nav-inner">
          <NavLink to="/" end className="nav-brand">
            ⏱️ EOS Timesheet
          </NavLink>
          <div className="nav-links">
            {isFeatureEnabled('smartWorking') && (
              <NavLink to="/smartworking" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                🏠 Smart Working
              </NavLink>
            )}
            {isFeatureEnabled('timesheet') && (
              <NavLink to="/timesheet" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                ⏱️ Timesheet
              </NavLink>
            )}
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              ⚙️
            </NavLink>
            {user && (
              <button onClick={handleLogout} className="nav-link logout-btn" title="Esci">
                🚪 {user.name.split(' ')[0]}
              </button>
            )}
            <button
              onClick={toggleTheme}
              className={'theme-switch ' + (theme === 'dark' ? 'dark' : '')}
              title={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
              aria-label={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
            >
              <span className="theme-switch-icon sun">☀️</span>
              <span className="theme-switch-icon moon">🌙</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/smartworking" element={<SmartWorkingApp />} />
          <Route path="/smartworking/team" element={<TeamViewPage />} />
          <Route path="/smartworking/saved" element={<SavedWeeksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/timesheet" element={<TimesheetApp />} />
        </Routes>
      </main>
    </div>
  )
}
