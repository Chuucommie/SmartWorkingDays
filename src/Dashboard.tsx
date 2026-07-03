// ──────────────────────────────────────────────
// EOS Smart Working — Dashboard
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
 * Dashboard principale di EOS Smart Working.
 * Mostra card per ogni modulo disponibile.
 */
export default function Dashboard() {
  const modules: ModuleCard[] = [
    {
      title: 'Pianifica',
      description: 'Configura i tuoi giorni di smart working e ufficio per la settimana.',
      icon: '📅',
      path: '/smartworking',
      status: isFeatureEnabled('smartWorking') ? 'active' : 'coming-soon',
      color: '#34C759',
    },
    {
      title: 'Team',
      description: 'Visualizza le pianificazioni del tuo team e le coincidenze in ufficio.',
      icon: '👥',
      path: '/smartworking/team',
      status: 'active',
      color: '#007AFF',
    },
    {
      title: 'Template',
      description: 'Gestisci le tue settimane salvate come template riutilizzabili.',
      icon: '💾',
      path: '/smartworking/saved',
      status: 'active',
      color: '#FF9500',
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">EOS Smart Working</h1>
        <p className="dashboard-subtitle">
          Pianificazione smart working per il team EOS Prod
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
        <p>EOS Smart Working · IgelDev</p>
      </footer>
    </div>
  )
}
