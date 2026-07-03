import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hashWeek,
  diffWeeks,
  getCurrentWeekStart,
  normalizeToMonday,
  formatLocalDate,
  createTeamWatcher,
} from './teamWatcher.ts'
import type { WeekPlan } from '../shared/config.ts'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

// Mock fetchEmployeePlan
vi.mock('../shared/planBackend.ts', () => ({
  fetchEmployeePlan: vi.fn(),
}))

beforeEach(() => {
  (globalThis as any).localStorage = localStorageMock
  localStorageMock.clear()
  vi.clearAllMocks()
})

const w = (arr: string[]): WeekPlan => arr as unknown as WeekPlan

// ═══════════════════════════════════════════════════════════
// TEST CRITICI: date in fuso orario italiano (UTC+2)
// ═══════════════════════════════════════════════════════════

describe('formatLocalDate() — formato data locale (NO UTC)', () => {
  it('formatta una data in YYYY-MM-DD usando ora locale', () => {
    const d = new Date(2026, 5, 30, 0, 0, 0)
    expect(formatLocalDate(d)).toBe('2026-06-30')
  })

  it('NON arretra di un giorno come toISOString() in UTC+2', () => {
    const d = new Date(2026, 5, 30, 0, 0, 0)
    const local = formatLocalDate(d)
    expect(local).toBe('2026-06-30')
  })

  it('formatta correttamente date a cavallo di anno', () => {
    const d = new Date(2025, 11, 31, 23, 59, 59)
    expect(formatLocalDate(d)).toBe('2025-12-31')
  })

  it('formatta correttamente il 1° gennaio', () => {
    const d = new Date(2026, 0, 1, 0, 0, 0)
    expect(formatLocalDate(d)).toBe('2026-01-01')
  })

  it('padding corretti per mesi e giorni < 10', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatLocalDate(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
})

describe('getCurrentWeekStart() — deve restituire LUNEDÌ in ora locale', () => {
  it('restituisce una data in formato ISO', () => {
    const result = getCurrentWeekStart()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('restituisce un lunedì (getDay() === 1)', () => {
    const result = getCurrentWeekStart()
    const date = new Date(result + 'T12:00:00')
    expect(date.getDay()).toBe(1)
  })

  it('restituisce SEMPRE un lunedì, non domenica', () => {
    const result = getCurrentWeekStart()
    const date = new Date(result + 'T12:00:00')
    expect(date.getDay()).not.toBe(0)
  })
})

describe('normalizeToMonday() — normalizza qualsiasi data al lunedì', () => {
  it('giovedì 2 luglio 2026 → lunedì 29 giugno 2026', () => {
    expect(normalizeToMonday('2026-07-02')).toBe('2026-06-29')
  })

  it('venerdì → lunedì della stessa settimana', () => {
    expect(normalizeToMonday('2026-07-03')).toBe('2026-06-29')
  })

  it('lunedì resta lunedì', () => {
    expect(normalizeToMonday('2026-06-29')).toBe('2026-06-29')
  })

  it('domenica → lunedì della stessa settimana', () => {
    expect(normalizeToMonday('2026-07-05')).toBe('2026-06-29')
  })

  it('sabato → lunedì della stessa settimana', () => {
    expect(normalizeToMonday('2026-07-04')).toBe('2026-06-29')
  })

  it('mercoledì → lunedì della stessa settimana', () => {
    expect(normalizeToMonday('2026-07-01')).toBe('2026-06-29')
  })

  it('gestisce date di anni diversi', () => {
    expect(normalizeToMonday('2025-12-31')).toBe('2025-12-29')
    expect(normalizeToMonday('2026-01-01')).toBe('2025-12-29')
  })

  it('restituisce la data originale se invalida', () => {
    expect(normalizeToMonday('non-una-data')).toBe('non-una-data')
  })
})

// ═══════════════════════════════════════════════════════════
// TEST ESISTENTI
// ═══════════════════════════════════════════════════════════

describe('teamWatcher — funzioni pure', () => {
  describe('hashWeek()', () => {
    it('produce hash deterministico', () => {
      const week = w(['sw', 'office', 'office', 'sw', 'sw'])
      expect(hashWeek(week)).toBe('sw|office|office|sw|sw')
    })

    it('hash diversi per settimane diverse', () => {
      expect(hashWeek(w(['sw', 'sw', 'sw', 'sw', 'sw']))).not.toBe(
        hashWeek(w(['office', 'office', 'office', 'office', 'office']))
      )
    })

    it('hash uguali per settimane identiche', () => {
      expect(hashWeek(w(['sw', 'office', 'sw', 'office', 'sw']))).toBe(
        hashWeek(w(['sw', 'office', 'sw', 'office', 'sw']))
      )
    })

    it('ritorna stringa vuota per input non valido', () => {
      expect(hashWeek(null as any)).toBe('')
      expect(hashWeek([] as any)).toBe('')
      expect(hashWeek(['sw'] as any)).toBe('')
    })
  })

  describe('diffWeeks()', () => {
    it('rileva 1 cambiamento', () => {
      const changes = diffWeeks(
        w(['sw', 'office', 'office', 'sw', 'sw']),
        w(['office', 'office', 'office', 'sw', 'sw'])
      )
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ day: 0, label: 'Lun', from: 'sw', to: 'office' })
    })

    it('rileva cambiamenti multipli', () => {
      const changes = diffWeeks(
        w(['sw', 'sw', 'sw', 'sw', 'sw']),
        w(['office', 'office', 'office', 'office', 'office'])
      )
      expect(changes).toHaveLength(5)
    })

    it('ritorna [] se nessun cambiamento', () => {
      const week = w(['sw', 'office', 'office', 'sw', 'sw'])
      expect(diffWeeks(week, week)).toHaveLength(0)
    })

    it('include label giorno corretto', () => {
      const changes = diffWeeks(
        w(['sw', 'sw', 'sw', 'sw', 'sw']),
        w(['sw', 'sw', 'office', 'sw', 'sw'])
      )
      expect(changes[0].label).toBe('Mer')
    })

    it('gestisce input non validi', () => {
      expect(diffWeeks(null as any, w(['sw', 'sw', 'sw', 'sw', 'sw']))).toEqual([])
      expect(diffWeeks(['sw'] as any, null as any)).toEqual([])
    })

    it('gestisce array di lunghezza diversa', () => {
      const changes = diffWeeks(
        ['sw', 'sw'] as any,
        w(['sw', 'office', 'sw', 'sw', 'sw'])
      )
      expect(changes).toHaveLength(1)
    })
  })
})

describe('teamWatcher — watch list', () => {
  it('addWatched aggiunge ID e persiste', () => {
    const watcher = createTeamWatcher(() => {})
    const result = watcher.addWatched('EMP002')
    expect(result.success).toBe(true)
    expect(watcher.isWatched('EMP002')).toBe(true)
    expect(watcher.getWatchedIds()).toContain('EMP002')
    const raw = localStorageMock.getItem('sw-watched-members')
    expect(JSON.parse(raw!)).toContain('EMP002')
    watcher.stop()
  })

  it('addWatched rifiuta duplicati', () => {
    const watcher = createTeamWatcher(() => {})
    watcher.addWatched('EMP002')
    const result = watcher.addWatched('EMP002')
    expect(result.success).toBe(false)
    watcher.stop()
  })

  it('removeWatched rimuove ID', () => {
    const watcher = createTeamWatcher(() => {})
    watcher.addWatched('EMP002')
    const result = watcher.removeWatched('EMP002')
    expect(result.success).toBe(true)
    expect(watcher.isWatched('EMP002')).toBe(false)
    watcher.stop()
  })

  it('removeWatched errore se ID non presente', () => {
    const watcher = createTeamWatcher(() => {})
    const result = watcher.removeWatched('EMP999')
    expect(result.success).toBe(false)
    watcher.stop()
  })

  it('carica watch list da localStorage all avvio', () => {
    localStorageMock.setItem('sw-watched-members', JSON.stringify(['EMP002', 'EMP003']))
    const watcher = createTeamWatcher(() => {})
    expect(watcher.getWatchedIds()).toEqual(['EMP002', 'EMP003'])
    watcher.stop()
  })

  it('resetta watch list se localStorage corrotto', () => {
    localStorageMock.setItem('sw-watched-members', 'not-json')
    const watcher = createTeamWatcher(() => {})
    expect(watcher.getWatchedIds()).toEqual([])
    watcher.stop()
  })
})

describe('teamWatcher — notifiche', () => {
  it('getUnreadCount parte da 0', () => {
    const watcher = createTeamWatcher(() => {})
    expect(watcher.getUnreadCount()).toBe(0)
    watcher.stop()
  })

  it('getNotifications parte vuoto', () => {
    const watcher = createTeamWatcher(() => {})
    expect(watcher.getNotifications()).toHaveLength(0)
    watcher.stop()
  })

  it('clearAll svuota notifiche', () => {
    const watcher = createTeamWatcher(() => {})
    watcher.clearAll()
    expect(watcher.getNotifications()).toHaveLength(0)
    expect(watcher.getUnreadCount()).toBe(0)
    watcher.stop()
  })

  it('markAllRead azzera unread count', () => {
    const watcher = createTeamWatcher(() => {})
    watcher.markAllRead()
    expect(watcher.getUnreadCount()).toBe(0)
    watcher.stop()
  })
})
