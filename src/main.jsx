// ──────────────────────────────────────────────
// EOS Timesheet — Entry point (React Router v7)
// ──────────────────────────────────────────────
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider } from './modules/shared/ThemeProvider.jsx'
import App from './App.jsx'
import Dashboard from './Dashboard.jsx'
import SmartWorkingApp from './modules/smartworking/SmartWorkingApp.jsx'
import TeamViewPage from './modules/smartworking/TeamViewPage.jsx'
import SavedWeeksPage from './modules/smartworking/SavedWeeksPage.jsx'
import TimesheetApp from './modules/timesheet/TimesheetApp.jsx'
import './index.css'

// createHashRouter per compatibilità con GitHub Pages
// In React Router v7, i path figli sono RELATIVI al parent
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'smartworking', element: <SmartWorkingApp /> },
      { path: 'smartworking/team', element: <TeamViewPage /> },
      { path: 'smartworking/saved', element: <SavedWeeksPage /> },
      { path: 'timesheet', element: <TimesheetApp /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)
