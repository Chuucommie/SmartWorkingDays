// ──────────────────────────────────────────────
// EOS Timesheet — Layout principale (React Router v7)
// ──────────────────────────────────────────────
import { Outlet, NavLink } from 'react-router-dom'
import { isFeatureEnabled } from './modules/shared/config.js'
import { ThemeProvider, useTheme } from './modules/shared/ThemeProvider.jsx'

/**
 * Layout interno che usa il tema.
 * Separato per rispettare l'ordine: RouterProvider > App > ThemeProvider > Outlet
 */
function AppInner() {
  const { theme, toggleTheme } = useTheme()

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
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Area contenuto — renderizza la route figlia attiva */}
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Layout globale che wrappa tutto con ThemeProvider.
 * ThemeProvider DEVE essere dentro il RouterProvider, non fuori.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
