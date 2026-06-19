// ──────────────────────────────────────────────
// SmartWorkingDays — Team Watcher (notifiche cambi stato)
// ──────────────────────────────────────────────
//
// Modulo per il polling delle pianificazioni dei membri del team
// che l'utente ha scelto di "seguire". Rileva cambiamenti e
// notifica l'utente tramite callback.
//
// In produzione, i dati arrivano da BC OData.
// In sviluppo, usa mock data da config.
// ──────────────────────────────────────────────

import { fetchEmployeePlan } from '../shared/businessCentral.js'
import { APP_CONFIG } from '../shared/config.js'

const WATCHED_KEY = 'sw-watched-members'
const MAX_WATCHED = APP_CONFIG.limits.maxWatchedMembers
const POLL_INTERVAL = APP_CONFIG.polling.teamWatcherIntervalMs

/**
 * Crea un watcher per i membri del team.
 * Restituisce un controller con metodi start/stop e accesso alle notifiche.
 *
 * @param {function} onNotification - Callback chiamata per ogni nuova notifica
 *   Riceve: { employeeId, employeeName, timestamp, changes, read }
 * @returns {{ start, stop, getNotifications, getUnreadCount, markRead, markAllRead, clearAll, addWatched, removeWatched, getWatchedIds, isWatched }}
 */
export function createTeamWatcher(onNotification) {
  // ── Stato interno ──
  let timer = null
  let watchedIds = loadWatchedMembers()
  const stateCache = new Map() // Map<employeeId, { week, hash }>
  const notifications = []     // Array di notifiche

  // ── Persistenza localStorage (interna alla closure) ──

  function loadWatchedMembers() {
    const raw = localStorage.getItem(WATCHED_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      localStorage.removeItem(WATCHED_KEY)
      return []
    }
  }

  function persistWatched() {
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watchedIds))
  }

  // ── Metodi pubblici ──

  async function start() {
    await initializeCache()
    startPolling()
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }

  function getNotifications() {
    return [...notifications]
  }

  function getUnreadCount() {
    return notifications.filter(n => !n.read).length
  }

  function markRead(index) {
    if (notifications[index]) {
      notifications[index].read = true
    }
  }

  function markAllRead() {
    for (const n of notifications) {
      n.read = true
    }
  }

  function clearAll() {
    notifications.length = 0
  }

  function addWatched(employeeId) {
    if (watchedIds.includes(employeeId)) {
      return { success: false, error: 'Già nella lista' }
    }
    if (watchedIds.length >= MAX_WATCHED) {
      return { success: false, error: `Limite di ${MAX_WATCHED} membri raggiunto` }
    }
    watchedIds.push(employeeId)
    persistWatched()
    fetchAndCache(employeeId)
    return { success: true }
  }

  function removeWatched(employeeId) {
    const idx = watchedIds.indexOf(employeeId)
    if (idx === -1) {
      return { success: false, error: 'Membro non trovato nella lista' }
    }
    watchedIds.splice(idx, 1)
    stateCache.delete(employeeId)
    persistWatched()
    return { success: true }
  }

  function getWatchedIds() {
    return [...watchedIds]
  }

  function isWatched(employeeId) {
    return watchedIds.includes(employeeId)
  }

  // ── Metodi interni ──

  async function initializeCache() {
    const weekStart = getCurrentWeekStart()
    for (const id of watchedIds) {
      await fetchAndCache(id, weekStart)
    }
  }

  async function fetchAndCache(employeeId, weekStartOverride) {
    const weekStart = weekStartOverride || getCurrentWeekStart()
    try {
      const plan = await fetchEmployeePlan(employeeId, weekStart)
      if (plan) {
        stateCache.set(employeeId, {
          week: plan.week,
          hash: hashWeek(plan.week),
        })
      }
    } catch (error) {
      console.warn('[teamWatcher] Fetch fallito per', employeeId, error.message)
    }
  }

  async function poll() {
    const weekStart = getCurrentWeekStart()
    for (const id of watchedIds) {
      try {
        const plan = await fetchEmployeePlan(id, weekStart)
        if (!plan) continue

        const newHash = hashWeek(plan.week)
        const cached = stateCache.get(id)

        if (cached && cached.hash !== newHash) {
          const changes = diffWeeks(cached.week, plan.week)
          const notification = {
            employeeId: id,
            employeeName: plan.employeeName || id,
            timestamp: new Date().toISOString(),
            changes,
            read: false,
          }
          notifications.unshift(notification)

          if (onNotification) {
            try { onNotification(notification) } catch (e) { /* silenzioso */ }
          }
        }

        stateCache.set(id, { week: plan.week, hash: newHash })
      } catch (error) {
        console.warn('[teamWatcher] Poll fallito per', id, error.message)
      }
    }
  }

  function startPolling() {
    timer = setInterval(poll, POLL_INTERVAL)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }
  }

  function handleVisibility() {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    } else {
      poll()
      if (!timer) {
        timer = setInterval(poll, POLL_INTERVAL)
      }
    }
  }

  return {
    start,
    stop,
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    clearAll,
    addWatched,
    removeWatched,
    getWatchedIds,
    isWatched,
  }
}

// ── Funzioni pure helper (esportate per test) ──

/**
 * Hash semplice per confrontare due settimane.
 * @param {string[]} week - Array di 5 stati
 * @returns {string} Hash (es. "sw|office|office|sw|sw")
 */
export function hashWeek(week) {
  if (!Array.isArray(week) || week.length !== 5) return ''
  return week.join('|')
}

/**
 * Calcola le differenze giorno per giorno tra due settimane.
 * @param {string[]} oldWeek - Settimana precedente
 * @param {string[]} newWeek - Settimana corrente
 * @returns {object[]} Array di cambiamenti { day, label, from, to }
 */
export function diffWeeks(oldWeek, newWeek) {
  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
  const changes = []

  if (!Array.isArray(oldWeek) || !Array.isArray(newWeek)) return changes
  const len = Math.min(oldWeek.length, newWeek.length)

  for (let i = 0; i < len; i++) {
    if (oldWeek[i] !== newWeek[i]) {
      changes.push({
        day: i,
        label: DAY_LABELS[i] || `Giorno ${i + 1}`,
        from: oldWeek[i],
        to: newWeek[i],
      })
    }
  }

  return changes
}

/**
 * Restituisce la data di inizio della settimana corrente (lunedì) in formato ISO.
 * @returns {string} YYYY-MM-DD
 */
export function getCurrentWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}
