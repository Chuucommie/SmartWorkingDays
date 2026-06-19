// ──────────────────────────────────────────────
// SmartWorkingDays — Pagina Vista Team
// ──────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getTeamView, computeOfficeOverlaps } from './teamView.js'
import { createTeamWatcher } from './teamWatcher.js'
import { getCurrentWeekStart } from './teamWatcher.js'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
const STATE_ICONS = { sw: '🏠', office: '🏢', absent: '✕', free: '◌' }
const STATE_LABELS = { sw: 'SW', office: 'Ufficio', absent: 'Assenza', free: 'Libero' }

/**
 * Pagina che mostra le pianificazioni SW del team
 * e le coincidenze in ufficio.
 */
export default function TeamViewPage() {
  const [teamData, setTeamData] = useState(null)
  const [overlaps, setOverlaps] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart())
  const [watcher, setWatcher] = useState(null)
  const [watchedIds, setWatchedIds] = useState([])

  // Carica dati team
  const loadTeamData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTeamView(weekStart)
      setTeamData(data)
      setOverlaps(computeOfficeOverlaps(data.myPlan, data.colleagues))
    } catch (err) {
      setError(err.message || 'Errore nel caricamento dei dati del team')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  // Inizializza watcher per notifiche
  useEffect(() => {
    const w = createTeamWatcher()
    w.start()
    setWatcher(w)
    setWatchedIds(w.getWatchedIds())
    return () => w.stop()
  }, [])

  // Naviga settimana
  const changeWeek = (direction) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + direction * 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  // Toggle watch
  const toggleWatch = (employeeId) => {
    if (!watcher) return
    if (watcher.isWatched(employeeId)) {
      watcher.removeWatched(employeeId)
    } else {
      watcher.addWatched(employeeId)
    }
    setWatchedIds(watcher.getWatchedIds())
  }

  // ── Render ──
  return (
    <div className="team-view-page">
      {/* Header */}
      <div className="team-header">
        <div>
          <h1 className="team-title">👥 Il mio team</h1>
          {teamData && (
            <p className="team-meta">
              {teamData.department} · {teamData.location} · Settimana del {weekStart}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => changeWeek(-1)} className="saved-action-btn">
            ← Prec.
          </button>
          <button onClick={() => changeWeek(1)} className="saved-action-btn">
            Succ. →
          </button>
          <button onClick={loadTeamData} className="saved-action-btn">
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="team-empty">
          <span className="team-empty-icon">⏳</span>
          <p className="team-empty-text">Caricamento pianificazioni...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="team-empty">
          <span className="team-empty-icon">⚠️</span>
          <p className="team-empty-text">{error}</p>
          <button onClick={loadTeamData} className="saved-action-btn">Riprova</button>
        </div>
      )}

      {/* Tabella team */}
      {teamData && !loading && (
        <div className="team-table-card">
          <table className="team-table">
            <thead>
              <tr>
                <th>Nome</th>
                {DAY_LABELS.map(d => <th key={d} style={{ textAlign: 'center' }}>{d}</th>)}
                <th style={{ textAlign: 'center' }}>SW</th>
                <th style={{ textAlign: 'center' }}>Segui</th>
              </tr>
            </thead>
            <tbody>
              {/* Riga utente corrente */}
              {teamData.myPlan ? (
                <tr className="row-self">
                  <td>{teamData.myPlan.employeeName} 👤</td>
                  {teamData.myPlan.week.map((state, i) => (
                    <td key={i} className="team-day-cell">
                      <span className="team-day-icon" title={STATE_LABELS[state]}>
                        {STATE_ICONS[state]}
                      </span>
                      {overlaps[i] && (
                        <span className="team-overlap-badge" title={overlaps[i].join(', ')}>
                          👥 +{overlaps[i].length}
                        </span>
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#248A3D' }}>
                    {teamData.myPlan.week.filter(s => s === 'sw').length}
                  </td>
                  <td></td>
                </tr>
              ) : (
                <tr className="row-self">
                  <td colSpan={8} style={{ textAlign: 'center', color: '#8E8E93', fontStyle: 'italic' }}>
                    Non hai ancora pianificato questa settimana —
                    <Link to="/smartworking" style={{ color: '#007AFF', marginLeft: 4 }}>Pianifica ora</Link>
                  </td>
                </tr>
              )}

              {/* Righe colleghi */}
              {teamData.colleagues.length === 0 && teamData.myPlan && (
                <tr>
                  <td colSpan={8}>
                    <div className="team-empty">
                      <span className="team-empty-icon">😶</span>
                      <p className="team-empty-text">Nessun collega ha ancora pianificato questa settimana</p>
                      <p className="team-empty-sub">Condividi l'app con il tuo team!</p>
                    </div>
                  </td>
                </tr>
              )}

              {teamData.colleagues.map(colleague => (
                <tr key={colleague.employeeId}>
                  <td>{colleague.employeeName}</td>
                  {colleague.week.map((state, i) => (
                    <td key={i} className="team-day-cell">
                      <span className="team-day-icon" title={STATE_LABELS[state]}>
                        {STATE_ICONS[state]}
                      </span>
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', color: '#248A3D' }}>
                    {colleague.week.filter(s => s === 'sw').length}
                  </td>
                  <td className="team-watch-cell">
                    <button
                      onClick={() => toggleWatch(colleague.employeeId)}
                      className={`team-watch-btn ${watchedIds.includes(colleague.employeeId) ? 'watching' : ''}`}
                    >
                      {watchedIds.includes(colleague.employeeId) ? '✓ Seguito' : 'Segui'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link navigazione */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/smartworking" className="sw-nav-link">🏠 Pianifica SW</Link>
        <Link to="/smartworking/saved" className="sw-nav-link" style={{ marginLeft: 8 }}>💾 Combinazioni salvate</Link>
        <Link to="/" className="sw-nav-link" style={{ marginLeft: 8 }}>⏱️ Dashboard</Link>
      </div>
    </div>
  )
}
