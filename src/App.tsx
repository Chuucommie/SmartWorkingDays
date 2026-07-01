// ──────────────────────────────────────────────
// EOS Timesheet — Layout principale (React Router v6)
// ──────────────────────────────────────────────
import { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { isFeatureEnabled } from './modules/shared/config.ts'
import { initPlanBackend } from './modules/shared/planBackend.ts'
import { initializeAuth } from './modules/shared/msAuth.ts'
import { useTheme } from './modules/shared/ThemeProvider.tsx'
import Dashboard from './Dashboard.tsx'
import SmartWorkingApp from './modules/smartworking/SmartWorkingApp.tsx'
import TeamViewPage from './modules/smartworking/TeamViewPage.tsx'
import SavedWeeksPage from './modules/smartworking/SavedWeeksPage.tsx'
import SettingsPage from './modules/smartworking/SettingsPage.tsx'
import TimesheetApp from './modules/timesheet/TimesheetApp.tsx'

/**
 * Layout globale con navbar, tema toggle Apple-style e routing.
 */
export default function App() {
  const { theme, toggleTheme } = useTheme()

  // Inizializza auth e backend all'avvio
  useEffect(() => {
    initializeAuth().then(() => {
      console.info('[App] Auth inizializzata')
    }).catch(err =>
      console.warn('[App] Inizializzazione auth fallita:', err)
    )
    initPlanBackend().catch(err =>
      console.warn('[App] Inizializzazione backend fallita:', err)
    )
  }, [])

  return (
    <div className="app-shell">
      {/* Navbar globale */}
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
            {/* Apple-style theme toggle switch */}
            <button
              onClick={toggleTheme}
              className={`theme-switch ${theme === 'dark' ? 'dark' : ''}`}
              title={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
              aria-label={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
            >
              <span className="theme-switch-icon sun">☀️</span>
              <span className="theme-switch-icon moon">🌙</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Area contenuto con routing */}
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
