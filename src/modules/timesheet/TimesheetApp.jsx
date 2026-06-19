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
        <h2 className="placeholder-title">Timesheet</h2>
        <p className="placeholder-desc">
          Questo modulo permetterà di registrare le ore lavorate
          direttamente su Business Central di EOS Prod.
        </p>
        <div className="placeholder-features">
          <span>📝 Registrazione ore giornaliere</span>
          <span>📊 Riepilogo settimanale/mensile</span>
          <span>📤 Export Excel</span>
          <span>🔄 Sincronizzazione con BC</span>
        </div>
        <p className="placeholder-note">Disponibile prossimamente</p>
        <Link to="/" className="placeholder-back">
          ← Torna alla Dashboard
        </Link>
      </div>
    </div>
  )
}
