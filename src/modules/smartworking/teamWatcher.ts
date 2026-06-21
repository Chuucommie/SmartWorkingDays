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

import { fetchEmployeePlan } from '../shared/businessCentral.ts'
import { APP_CONFIG } from '../shared/config.ts'
import type { WeekPlan } from '../shared/config.ts'

/** Notifica di cambiamento stato */
export interface TeamNotification {
  employeeId: string
  employeeName: string
  timestamp: string
  changes: DayChange[]
  read: boolean
}

/** Cambiamento di un singolo giorno */
export interface DayChange {
  day: number
  label: string
  from: string
  to: string
}

/** Controller del team watcher */
export interface TeamWatcher {
  start: () => Promise<void>
  stop: () => void
  getNotifications: () => TeamNotification[]
  getUnreadCount: () => number
  markRead: (index: number) => void
  markAllRead: () => void
  clearAll: () => void
  addWatched: (employeeId: string) => { success: boolean; error?: string }
  removeWatched: (employeeId: string) => { success: boolean; error?: string }
  getWatchedIds: () => string[]
  isWatched: (employeeId: string) => boolean
}

/** Stato in cache di un membro */
interface CachedState {
  week: WeekPlan
  hash: string
}

const WATCHED_KEY = 'sw-watched-members'
const MAX_WATCHED = APP_CONFIG.limits.maxWatchedMembers
const POLL_INTERVAL = APP_CONFIG.polling.teamWatcherIntervalMs

/**
 * Crea un watcher per i membri del team.
 * Restituisce un controller con metodi start/stop e accesso alle notifiche.
 */
export function createTeamWatcher(onNotification: (n: TeamNotification) => void): TeamWatcher {
  // ── Stato interno ──
  let timer: ReturnType<typeof setInterval> | null = null
  let watchedIds: string[] = loadWatchedMembers()
  const stateCache = new Map<string, CachedState>()
  const notifications: TeamNotification[] = []

  // ── Persistenza localStorage (interna alla closure) ──

  function loadWatchedMembers(): string[] {
    const raw = localStorage.getItem(WATCHED_KEY)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      localStorage.removeItem(WATCHED_KEY)
      return []
    }
  }

  function persistWatched(): void {
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watchedIds))
  }

  // ── Metodi pubblici ──

  async function start(): Promise<void> {
    await initializeCache()
    startPolling()
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }

  function getNotifications(): TeamNotification[] {
    return [...notifications]
  }

  function getUnreadCount(): number {
    return notifications.filter(n => !n.read).length
  }

  function markRead(index: number): void {
    if (notifications[index]) {
      notifications[index].read = true
    }
  }

  function markAllRead(): void {
    for (const n of notifications) {
      n.read = true
    }
  }

  function clearAll(): void {
    notifications.length = 0
  }

  function addWatched(employeeId: string): { success: boolean; error?: string } {
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

  function removeWatched(employeeId: string): { success: boolean; error?: string } {
    const idx = watchedIds.indexOf(employeeId)
    if (idx === -1) {
      return { success: false, error: 'Membro non trovato nella lista' }
    }
    watchedIds.splice(idx, 1)
    stateCache.delete(employeeId)
    persistWatched()
    return { success: true }
  }

  function getWatchedIds(): string[] {
    return [...watchedIds]
  }

  function isWatched(employeeId: string): boolean {
    return watchedIds.includes(employeeId)
  }

  // ── Metodi interni ──

  async function initializeCache(): Promise<void> {
    const weekStart = getCurrentWeekStart()
    for (const id of watchedIds) {
      await fetchAndCache(id, weekStart)
    }
  }

  async function fetchAndCache(employeeId: string, weekStartOverride?: string): Promise<void> {
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
      console.warn('[teamWatcher] Fetch fallito per', employeeId, (error as Error).message)
    }
  }

  async function poll(): Promise<void> {
    const weekStart = getCurrentWeekStart()
    for (const id of watchedIds) {
      try {
        const plan = await fetchEmployeePlan(id, weekStart)
        if (!plan) continue

        const newHash = hashWeek(plan.week)
        const cached = stateCache.get(id)

        if (cached && cached.hash !== newHash) {
          const changes = diffWeeks(cached.week, plan.week)
          const notification: TeamNotification = {
            employeeId: id,
            employeeName: plan.employeeName || id,
            timestamp: new Date().toISOString(),
            changes,
            read: false,
          }
          notifications.unshift(notification)

          if (onNotification) {
            try { onNotification(notification) } catch (_e) { /* silenzioso */ }
          }
        }

        stateCache.set(id, { week: plan.week, hash: newHash })
      } catch (error) {
        console.warn('[teamWatcher] Poll fallito per', id, (error as Error).message)
      }
    }
  }

  function startPolling(): void {
    timer = setInterval(poll, POLL_INTERVAL)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
    }
  }

  function handleVisibility(): void {
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
 */
export function hashWeek(week: WeekPlan): string {
  if (!Array.isArray(week) || week.length !== 5) return ''
  return week.join('|')
}

/**
 * Calcola le differenze giorno per giorno tra due settimane.
 */
export function diffWeeks(oldWeek: WeekPlan, newWeek: WeekPlan): DayChange[] {
  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
  const changes: DayChange[] = []

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
 */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}
