// ──────────────────────────────────────────────
// EOS Timesheet — Entry point
// ──────────────────────────────────────────────
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// HashRouter invece di BrowserRouter per compatibilità con GitHub Pages
// URL: /SmartWorkingDays/#/smartworking/team
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
