// ──────────────────────────────────────────────
// EOS Timesheet — Router principale
// ──────────────────────────────────────────────
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'
import SmartWorkingApp from './modules/smartworking/SmartWorkingApp.jsx'
import TeamViewPage from './modules/smartworking/TeamViewPage.jsx'
import SavedWeeksPage from './modules/smartworking/SavedWeeksPage.jsx'
import TimesheetApp from './modules/timesheet/TimesheetApp.jsx'
import { isFeatureEnabled } from './modules/shared/config.js'

export default function App() {
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
          </div>
        </div>
      </nav>

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
