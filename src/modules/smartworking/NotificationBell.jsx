// ──────────────────────────────────────────────
// SmartWorkingDays — Campanella notifiche
// ──────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { createTeamWatcher } from './teamWatcher.js'

const STATE_LABELS = { sw: 'SW', office: 'Ufficio', absent: 'Assenza', free: 'Libero' }

/**
 * Componente campanella notifiche con badge e dropdown.
 * Mostra le notifiche di cambiamento pianificazione dei membri seguiti.
 */
export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const watcherRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    // Crea watcher e avvia polling
    const watcher = createTeamWatcher((notification) => {
      // Aggiorna stato React quando arriva una notifica
      setNotifications(watcher.getNotifications())
      setUnreadCount(watcher.getUnreadCount())
    })

    watcher.start()
    watcherRef.current = watcher

    // Sincronizza stato iniziale
    setNotifications(watcher.getNotifications())
    setUnreadCount(watcher.getUnreadCount())

    return () => watcher.stop()
  }, [])

  // Chiudi dropdown quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleDropdown = () => {
    setIsOpen(prev => !prev)
    // Marca tutte come lette quando apri
    if (!isOpen && watcherRef.current) {
      watcherRef.current.markAllRead()
      setUnreadCount(0)
      setNotifications(watcherRef.current.getNotifications())
    }
  }

  const clearAll = () => {
    if (watcherRef.current) {
      watcherRef.current.clearAll()
      setNotifications([])
      setUnreadCount(0)
    }
  }

  const formatTime = (isoString) => {
    const d = new Date(isoString)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return 'Adesso'
    if (diffMin < 60) return `${diffMin} min fa`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH} ore fa`
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button onClick={toggleDropdown} className="notification-bell-btn" title="Notifiche team">
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifiche team</span>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="notification-clear-btn">Pulisci</button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">
              Nessuna notifica. Segui i membri del team nella vista team per ricevere aggiornamenti.
            </div>
          ) : (
            notifications.map((notif, idx) => (
              <div key={idx} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                <div className="notification-item-time">
                  {notif.read ? '⚪' : '🟡'} {formatTime(notif.timestamp)}
                </div>
                <div className="notification-item-name">
                  {notif.employeeName}
                </div>
                <div className="notification-item-changes">
                  {notif.changes.map((change, ci) => (
                    <div key={ci}>
                      {change.label}: {STATE_LABELS[change.from] || change.from} → {STATE_LABELS[change.to] || change.to}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
