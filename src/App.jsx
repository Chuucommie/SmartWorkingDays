// ──────────────────────────────────────────────
// EOS Timesheet — Layout principale (React Router v6)
// ──────────────────────────────────────────────
import { Routes, Route, NavLink } from 'react-router-dom'
import { isFeatureEnabled } from './modules/shared/config.js'
import { useTheme } from './modules/shared/ThemeProvider.jsx'
import Dashboard from './Dashboard.jsx'
import SmartWorkingApp from './modules/smartworking/SmartWorkingApp.jsx'
import TeamViewPage from './modules/smartworking/TeamViewPage.jsx'
import SavedWeeksPage from './modules/smartworking/SavedWeeksPage.jsx'
import TimesheetApp from './modules/timesheet/TimesheetApp.jsx'

/**
 * Layout globale con navbar, tema toggle e routing.
 */
export default function App() {
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

      {/* Area contenuto con routing */}
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/smartworking" element={<SmartWorkingApp />} />
          <Route path="/smartworking/team" element={<TeamViewPage />} />
          <Route path="/smartworking/saved" element={<SavedWeeksPage />} />
          <Route path="/timesheet" element={<TimesheetApp />} />
        </Routes>
      </main>
    </div>
  )
}
