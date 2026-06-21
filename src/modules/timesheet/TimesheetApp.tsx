// ──────────────────────────────────────────────
// EOS Timesheet — Placeholder modulo Timesheet
// ──────────────────────────────────────────────
import { Link } from 'react-router-dom'

/**
 * Placeholder per il modulo Timesheet.
 * Mostra un messaggio "In sviluppo" con link per tornare alla dashboard.
 */
export default function TimesheetApp() {
  return (
    <div className="placeholder-page">
      <div className="placeholder-card">
        <span className="placeholder-icon">⏱️</span>
        <h1 className="placeholder-title">Timesheet</h1>
        <p className="placeholder-desc">
          Registrazione ore lavorate direttamente su Business Central di EOS Prod.
        </p>
        <div className="placeholder-features">
          <span>📋 Inserimento ore</span>
          <span>📊 Riepilogo settimanale</span>
          <span>🔄 Sync con BC</span>
        </div>
        <Link to="/" className="sw-nav-link">
          ← Torna alla Dashboard
        </Link>
      </div>
    </div>
  )
}
