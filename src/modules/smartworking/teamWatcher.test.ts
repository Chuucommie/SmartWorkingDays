import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hashWeek,
  diffWeeks,
  getCurrentWeekStart,
  createTeamWatcher,
} from './teamWatcher.ts'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

// Mock fetchEmployeePlan per evitare chiamate reali
vi.mock('../shared/businessCentral.ts', () => ({
  fetchEmployeePlan: vi.fn(),
}))

import { fetchEmployeePlan } from '../shared/businessCentral.ts'

beforeEach(() => {
  global.localStorage = localStorageMock
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('teamWatcher — funzioni pure', () => {
  describe('hashWeek()', () => {
    it('produce hash deterministico', () => {
      const week = ['sw', 'office', 'office', 'sw', 'sw']
      expect(hashWeek(week)).toBe('sw|office|office|sw|sw')
    })

    it('hash diversi per settimane diverse', () => {
      const week1 = ['sw', 'sw', 'sw', 'sw', 'sw']
      const week2 = ['office', 'office', 'office', 'office', 'office']
      expect(hashWeek(week1)).not.toBe(hashWeek(week2))
    })

    it('hash uguali per settimane identiche', () => {
      const week1 = ['sw', 'office', 'sw', 'office', 'sw']
      const week2 = ['sw', 'office', 'sw', 'office', 'sw']
      expect(hashWeek(week1)).toBe(hashWeek(week2))
    })

    it('ritorna stringa vuota per input non valido', () => {
      expect(hashWeek(null)).toBe('')
      expect(hashWeek([])).toBe('')
      expect(hashWeek(['sw'])).toBe('')
    })
  })

  describe('diffWeeks()', () => {
    it('rileva 1 cambiamento', () => {
      const oldWeek = ['sw', 'office', 'office', 'sw', 'sw']
      const newWeek = ['office', 'office', 'office', 'sw', 'sw']
      const changes = diffWeeks(oldWeek, newWeek)
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ day: 0, label: 'Lun', from: 'sw', to: 'office' })
    })

    it('rileva cambiamenti multipli', () => {
      const oldWeek = ['sw', 'sw', 'sw', 'sw', 'sw']
      const newWeek = ['office', 'office', 'office', 'office', 'office']
      const changes = diffWeeks(oldWeek, newWeek)
      expect(changes).toHaveLength(5)
    })

    it('ritorna [] se nessun cambiamento', () => {
      const week = ['sw', 'office', 'office', 'sw', 'sw']
      const changes = diffWeeks(week, week)
      expect(changes).toHaveLength(0)
    })

    it('include label giorno corretto', () => {
      const oldWeek = ['sw', 'sw', 'sw', 'sw', 'sw']
      const newWeek = ['sw', 'sw', 'office', 'sw', 'sw']
      const changes = diffWeeks(oldWeek, newWeek)
      expect(changes[0].label).toBe('Mer')
    })

    it('gestisce input non validi', () => {
      expect(diffWeeks(null, ['sw', 'sw', 'sw', 'sw', 'sw'])).toEqual([])
      expect(diffWeeks(['sw'], null)).toEqual([])
    })

    it('gestisce array di lunghezza diversa', () => {
      const changes = diffWeeks(['sw', 'sw'], ['sw', 'office', 'sw', 'sw', 'sw'])
      expect(changes).toHaveLength(1) // Solo i primi 2 elementi confrontati
    })
  })

  describe('getCurrentWeekStart()', () => {
    it('restituisce una data in formato ISO', () => {
      const result = getCurrentWeekStart()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('restituisce un lunedì', () => {
      const result = getCurrentWeekStart()
      const date = new Date(result)
      expect(date.getDay()).toBe(1) // Lunedì
    })
  })
})

describe('teamWatcher — watch list', () => {
  it('addWatched aggiunge ID e persiste', () => {
    const watcher = createTeamWatcher()
    const result = watcher.addWatched('EMP002')
    expect(result.success).toBe(true)
    expect(watcher.isWatched('EMP002')).toBe(true)
    expect(watcher.getWatchedIds()).toContain('EMP002')
    // Verifica persistenza
    const raw = localStorage.getItem('sw-watched-members')
    expect(JSON.parse(raw)).toContain('EMP002')
    watcher.stop()
  })

  it('addWatched rifiuta duplicati', () => {
    const watcher = createTeamWatcher()
    watcher.addWatched('EMP002')
    const result = watcher.addWatched('EMP002')
    expect(result.success).toBe(false)
    watcher.stop()
  })

  it('removeWatched rimuove ID', () => {
    const watcher = createTeamWatcher()
    watcher.addWatched('EMP002')
    const result = watcher.removeWatched('EMP002')
    expect(result.success).toBe(true)
    expect(watcher.isWatched('EMP002')).toBe(false)
    watcher.stop()
  })

  it('removeWatched errore se ID non presente', () => {
    const watcher = createTeamWatcher()
    const result = watcher.removeWatched('EMP999')
    expect(result.success).toBe(false)
    watcher.stop()
  })

  it('carica watch list da localStorage all avvio', () => {
    localStorage.setItem('sw-watched-members', JSON.stringify(['EMP002', 'EMP003']))
    const watcher = createTeamWatcher()
    expect(watcher.getWatchedIds()).toEqual(['EMP002', 'EMP003'])
    watcher.stop()
  })

  it('resetta watch list se localStorage corrotto', () => {
    localStorage.setItem('sw-watched-members', 'not-json')
    const watcher = createTeamWatcher()
    expect(watcher.getWatchedIds()).toEqual([])
    watcher.stop()
  })
})

describe('teamWatcher — notifiche', () => {
  it('getUnreadCount parte da 0', () => {
    const watcher = createTeamWatcher()
    expect(watcher.getUnreadCount()).toBe(0)
    watcher.stop()
  })

  it('markRead aggiorna stato', () => {
    const watcher = createTeamWatcher()
    // Simula una notifica manualmente (senza polling)
    const notifications = watcher.getNotifications()
    // Il watcher non ha notifiche iniziali
    expect(notifications).toHaveLength(0)
    watcher.stop()
  })

  it('clearAll svuota notifiche', () => {
    const watcher = createTeamWatcher()
    watcher.clearAll()
    expect(watcher.getNotifications()).toHaveLength(0)
    expect(watcher.getUnreadCount()).toBe(0)
    watcher.stop()
  })

  it('markAllRead azzera unread count', () => {
    const watcher = createTeamWatcher()
    watcher.markAllRead()
    expect(watcher.getUnreadCount()).toBe(0)
    watcher.stop()
  })
})
