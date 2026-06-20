// ──────────────────────────────────────────────
// EOS Timesheet — Entry point (React Router v6)
// ──────────────────────────────────────────────
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProvider } from './modules/shared/ThemeProvider.jsx'
import App from './App.jsx'
import './index.css'

// HashRouter per compatibilità con GitHub Pages
// URL: /SmartWorkingDays/#/smartworking/team
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
)
