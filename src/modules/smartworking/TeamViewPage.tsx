// ──────────────────────────────────────────────
// SmartWorkingDays — Pagina Vista Team (ridisegnata)
// ──────────────────────────────────────────────
//
// Mostra le pianificazioni SW del team con:
//   - Dropdown filtro sede (Treviso, Bologna, Milano, Tutte)
//   - Card per ogni membro con 5 giorni ben visibili
//   - Badge coincidenze ufficio (👥 +N)
//   - Navigazione settimana
// ──────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getTeamView, computeOfficeOverlaps, LOCATIONS } from './teamView.ts'
import type { TeamViewResult, OfficeOverlaps } from './teamView.ts'
import { createTeamWatcher, getCurrentWeekStart, formatLocalDate, normalizeToMonday } from './teamWatcher.ts'
import type { TeamWatcher } from './teamWatcher.ts'
import { deletePlanning } from '../shared/planBackend.ts'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'] as const
const DAY_LABELS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'] as const

const STATE_CONFIG: Record<string, { icon: string; label: string; cls: string }> = {
  sw:     { icon: '🏠', label: 'Smart Working', cls: 'day-sw' },
  office: { icon: '🏢', label: 'Ufficio',       cls: 'day-office' },
  absent: { icon: '✕', label: 'Assente',        cls: 'day-absent' },
  free:   { icon: '—', label: 'Non pianificato', cls: 'day-free' },
}

/**
 * Pagina Vista Team ridisegnata.
 */
export default function TeamViewPage() {
  const [teamData, setTeamData] = useState<TeamViewResult | null>(null)
  const [overlaps, setOverlaps] = useState<OfficeOverlaps>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart())
  const [locationFilter, setLocationFilter] = useState<string>('') // '' = sede utente
  const [watcher, setWatcher] = useState<TeamWatcher | null>(null)
  const [watchedIds, setWatchedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Carica dati team
  const loadTeamData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filter = locationFilter || undefined // '' → usa sede utente
      const data = await getTeamView(weekStart, filter)
      setTeamData(data)
      setOverlaps(computeOfficeOverlaps(data.myPlan, data.colleagues))
    } catch (err) {
      setError((err as Error).message || 'Errore nel caricamento dei dati del team')
    } finally {
      setLoading(false)
    }
  }, [weekStart, locationFilter])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  // Inizializza watcher per notifiche
  useEffect(() => {
    const w = createTeamWatcher(() => {})
    w.start()
    setWatcher(w)
    setWatchedIds(w.getWatchedIds())
    return () => w.stop()
  }, [])

  // Naviga settimana
  const changeWeek = (direction: number) => {
    const d = new Date(weekStart + 'T12:00:00')
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + direction * 7)
    setWeekStart(formatLocalDate(target))
  }

  // Toggle watch
  const toggleWatch = (employeeId: string) => {
    if (!watcher) return
    if (watcher.isWatched(employeeId)) {
      watcher.removeWatched(employeeId)
    } else {
      watcher.addWatched(employeeId)
    }
    setWatchedIds(watcher.getWatchedIds())
  }

  // Cancella la propria pianificazione
  const handleDelete = async () => {
    if (!teamData?.myPlan) return
    if (!confirm('Cancellare la tua pianificazione per questa settimana? Il team non la vedrà più.')) return

    setDeleting(true)
    setDeleteMsg(null)

    try {
      const result = await deletePlanning(teamData.myPlan.employeeId, normalizeToMonday(weekStart))
      if (result.success) {
        setDeleteMsg({ type: 'success', text: 'Pianificazione cancellata!' })
        // Ricarica i dati del team
        await loadTeamData()
      } else {
        setDeleteMsg({ type: 'error', text: result.error || 'Errore durante la cancellazione' })
      }
    } catch {
      setDeleteMsg({ type: 'error', text: 'Errore di connessione' })
    } finally {
      setDeleting(false)
      setTimeout(() => setDeleteMsg(null), 4000)
    }
  }

  // Formatta data
  const formatWeekRange = (start: string) => {
    const d = new Date(start + 'T12:00:00')
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 4)
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${d.toLocaleDateString('it-IT', opts)} – ${end.toLocaleDateString('it-IT', opts)}`
  }

  // ── Render ──
  return (
    <div className="team-view-page">
      {/* Header */}
      <div className="team-header">
        <div>
          <h1 className="team-title">👥 Team Smart Working</h1>
          {teamData && (
            <p className="team-meta">
              {teamData.department} · {formatWeekRange(weekStart)}
            </p>
          )}
        </div>
      </div>

      {/* Barra controlli: navigazione settimana + filtro sede */}
      <div className="team-controls">
        <div className="week-nav">
          <button onClick={() => changeWeek(-1)} className="ctrl-btn" title="Settimana precedente">
            ◀
          </button>
          <span className="week-label">{formatWeekRange(weekStart)}</span>
          <button onClick={() => changeWeek(1)} className="ctrl-btn" title="Settimana successiva">
            ▶
          </button>
          <button onClick={() => setWeekStart(getCurrentWeekStart())} className="ctrl-btn" title="Vai a questa settimana">
            📅 Oggi
          </button>
        </div>

        <div className="location-filter">
          <label className="filter-label">Sede:</label>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">La mia sede</option>
            <option value="ALL">🏢 Tutte le sedi</option>
            <option disabled>──</option>
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>
                📍 {loc.charAt(0) + loc.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
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
          <button onClick={loadTeamData} className="ctrl-btn">Riprova</button>
        </div>
      )}

      {/* Card membri */}
      {teamData && !loading && (
        <div className="team-cards">
          {/* Card utente corrente */}
          {teamData.myPlan ? (
            <MemberCard
              member={teamData.myPlan}
              isSelf={true}
              overlaps={overlaps}
              isWatched={false}
              onToggleWatch={undefined}
              onDelete={handleDelete}
              deleting={deleting}
              deleteMsg={deleteMsg}
            />
          ) : (
            <div className="member-card member-card-self member-card-empty">
              <div className="member-name">Tu</div>
              <div className="no-plan-msg">
                Non hai ancora pianificato questa settimana
                <Link to="/smartworking" className="plan-link">Pianifica ora →</Link>
              </div>
            </div>
          )}

          {/* Card colleghi */}
          {teamData.colleagues.length === 0 && teamData.myPlan && (
            <div className="team-empty" style={{ gridColumn: '1 / -1' }}>
              <span className="team-empty-icon">😶</span>
              <p className="team-empty-text">Nessun collega ha ancora pianificato questa settimana</p>
              <p className="team-empty-sub">Condividi l'app con il tuo team!</p>
            </div>
          )}

          {teamData.colleagues.map(colleague => (
            <MemberCard
              key={colleague.employeeId}
              member={colleague}
              isSelf={false}
              overlaps={overlaps}
              isWatched={watchedIds.includes(colleague.employeeId)}
              onToggleWatch={() => toggleWatch(colleague.employeeId)}
            />
          ))}
        </div>
      )}

      {/* Riepilogo coincidenze — SEZIONE EVIDENZIATA */}
      {teamData && !loading && teamData.myPlan && (
        <OfficeOverlapSection
          myPlan={teamData.myPlan}
          colleagues={teamData.colleagues}
          overlaps={overlaps}
        />
      )}

      {/* Link navigazione */}
      <div className="team-footer-links">
        <Link to="/smartworking" className="sw-nav-link">📅 Pianifica</Link>
        <Link to="/smartworking/saved" className="sw-nav-link">💾 Combinazioni salvate</Link>
        <Link to="/" className="sw-nav-link">📊 Dashboard</Link>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Componente: Sezione Coincidenze Ufficio
// ──────────────────────────────────────────────

interface OfficeOverlapSectionProps {
  myPlan: { week: string[]; employeeName: string }
  colleagues: Array<{ week: string[]; employeeName: string; employeeId: string }>
  overlaps: OfficeOverlaps
}

function OfficeOverlapSection({ myPlan, colleagues, overlaps }: OfficeOverlapSectionProps) {
  const hasAnyOverlap = Object.keys(overlaps).length > 0
  const officeDays = myPlan.week.map((s, i) => ({ day: i, state: s })).filter(d => d.state === 'office')

  if (officeDays.length === 0) {
    return (
      <div className="overlap-summary" style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem' }}>
        <h3 className="overlap-title">🏢 Coincidenze in ufficio</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Non hai giorni in ufficio questa settimana. Nessuna coincidenza da mostrare.
        </p>
      </div>
    )
  }

  return (
    <div className="overlap-summary" style={{
      background: 'var(--bg-card)',
      borderRadius: '16px',
      padding: '1.5rem',
      marginTop: '1rem',
      border: hasAnyOverlap ? '2px solid var(--accent-blue)' : '1px solid var(--border-primary)',
    }}>
      <h3 className="overlap-title" style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        🏢 Chi è in ufficio con te
      </h3>

      {/* Tabella per ogni giorno in ufficio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {DAY_LABELS.map((label, i) => {
          if (myPlan.week[i] !== 'office') return null

          const colleaguesInOffice = colleagues.filter(c => c.week && c.week[i] === 'office')

          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: colleaguesInOffice.length > 0 ? 'rgba(0, 122, 255, 0.08)' : 'var(--bg-hover)',
            }}>
              <div style={{ flexShrink: 0, width: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.25rem' }}>🏢</div>
              </div>
              <div style={{ flex: 1 }}>
                {colleaguesInOffice.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      👥 {colleaguesInOffice.length} {colleaguesInOffice.length === 1 ? 'collega' : 'colleghi'} in ufficio
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {colleaguesInOffice.map(c => c.employeeName).join(', ')}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    🏠 Solo tu in ufficio
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Componente Card Membro
// ──────────────────────────────────────────────

interface MemberCardProps {
  member: {
    employeeId: string
    employeeName: string
    locationCode: string
    week: string[]
    swDaysRequested: number
  }
  isSelf: boolean
  overlaps: OfficeOverlaps
  isWatched: boolean
  onToggleWatch: (() => void) | undefined
  onDelete?: () => void
  deleting?: boolean
  deleteMsg?: { type: 'success' | 'error'; text: string } | null
}

function MemberCard({ member, isSelf, overlaps, isWatched, onToggleWatch, onDelete, deleting, deleteMsg }: MemberCardProps) {
  const swCount = member.week.filter(s => s === 'sw').length
  const officeCount = member.week.filter(s => s === 'office').length

  return (
    <div className={`member-card ${isSelf ? 'member-card-self' : ''}`}>
      {/* Intestazione */}
      <div className="member-header">
        <div className="member-info">
          <span className="member-name">
            {isSelf ? '👤 ' : ''}{member.employeeName}
          </span>
          <span className="member-location">📍 {member.locationCode}</span>
        </div>
        <div className="member-stats">
          <span className="stat-badge stat-sw" title="Giorni Smart Working">🏠 {swCount}</span>
          <span className="stat-badge stat-office" title="Giorni in Ufficio">🏢 {officeCount}</span>
        </div>
      </div>

      {/* Griglia giorni */}
      <div className="member-days">
        {DAY_LABELS.map((label, i) => {
          const state = member.week[i] || 'free'
          const cfg = STATE_CONFIG[state] || STATE_CONFIG.free
          const hasOverlap = overlaps[i] && isSelf
          const overlapCount = hasOverlap ? overlaps[i].length : 0

          return (
            <div
              key={i}
              className={`day-cell ${cfg.cls} ${hasOverlap ? 'has-overlap' : ''}`}
              title={`${DAY_LABELS_FULL[i]}: ${cfg.label}${hasOverlap ? ` — ${overlapCount} colleghi in ufficio` : ''}`}
            >
              <span className="day-label">{label}</span>
              <span className="day-icon">{cfg.icon}</span>
              {hasOverlap && (
                <span className="day-overlap-badge" title={overlaps[i].join(', ')}>
                  👥{overlapCount}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: tasto Segui (colleghi) o Cancella (self) */}
      {!isSelf && onToggleWatch && (
        <div className="member-footer">
          <button
            onClick={onToggleWatch}
            className={`watch-btn ${isWatched ? 'watching' : ''}`}
          >
            {isWatched ? '🔔 Seguito' : '🔔 Segui'}
          </button>
        </div>
      )}
      {isSelf && onDelete && (
        <div className="member-footer">
          {deleteMsg && (
            <p className="text-xs mb-1" style={{ color: deleteMsg.type === 'success' ? 'var(--text-green)' : 'var(--text-red)' }}>
              {deleteMsg.text}
            </p>
          )}
          <button
            onClick={onDelete}
            disabled={deleting}
            className="watch-btn"
            style={{ color: 'var(--text-red)', borderColor: 'var(--text-red)' }}
          >
            {deleting ? '⏳...' : '🗑️ Cancella pianificazione'}
          </button>
        </div>
      )}
    </div>
  )
}
