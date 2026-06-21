// ──────────────────────────────────────────────
// EOS Timesheet — Dashboard
// ──────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { isFeatureEnabled } from './modules/shared/config.ts'

interface ModuleCard {
  title: string
  description: string
  icon: string
  path: string
  status: 'active' | 'coming-soon'
  color: string
}

/**
 * Dashboard principale di EOS Timesheet.
 * Mostra card per ogni modulo disponibile.
 */
export default function Dashboard() {
  const modules: ModuleCard[] = [
    {
      title: 'Smart Working',
      description: 'Pianifica i tuoi giorni di smart working, visualizza il team, ricevi notifiche sui cambiamenti.',
      icon: '🏠',
      path: '/smartworking',
      status: isFeatureEnabled('smartWorking') ? 'active' : 'coming-soon',
      color: '#34C759',
    },
    {
      title: 'Timesheet',
      description: 'Registra le ore lavorate direttamente su Business Central di EOS Prod.',
      icon: '⏱️',
      path: '/timesheet',
      status: isFeatureEnabled('timesheet') ? 'active' : 'coming-soon',
      color: '#007AFF',
    },
    {
      title: 'Report',
      description: 'Report mensili, statistiche dipartimentali, export Excel.',
      icon: '📊',
      path: '/reports',
      status: 'coming-soon',
      color: '#FF9500',
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">EOS Timesheet</h1>
        <p className="dashboard-subtitle">
          Gestione presenze, smart working e timesheet per EOS Prod
        </p>
      </div>

      <div className="module-cards">
        {modules.map(mod => (
          <Link
            key={mod.path}
            to={mod.status === 'active' ? mod.path : '#'}
            className={`module-card ${mod.status}`}
            style={{ '--card-accent': mod.color } as React.CSSProperties}
            onClick={e => {
              if (mod.status !== 'active') e.preventDefault()
            }}
          >
            <span className="module-icon">{mod.icon}</span>
            <div className="module-info">
              <h2 className="module-title">{mod.title}</h2>
              <p className="module-desc">{mod.description}</p>
            </div>
            {mod.status === 'coming-soon' && (
              <span className="module-badge">In sviluppo</span>
            )}
            {mod.status === 'active' && (
              <span className="module-arrow">→</span>
            )}
          </Link>
        ))}
      </div>

      <footer className="dashboard-footer">
        <p>EOS Timesheet v3 · IgelDev</p>
      </footer>
    </div>
  )
}
