import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadAll,
  save,
  remove,
  rename,
  exportAll,
  importFromJSON,
  count,
} from './savedWeeks.ts'

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

// Replace global localStorage
beforeEach(() => {
  global.localStorage = localStorageMock
  localStorageMock.clear()
})

describe('savedWeeks', () => {
  describe('loadAll()', () => {
    it('ritorna [] se localStorage è vuoto', () => {
      expect(loadAll()).toEqual([])
    })

    it('ritorna array se dati validi', () => {
      const templates = [{ id: '1', name: 'Test', days: ['sw','sw','office','sw','sw'], swDaysRequested: 3 }]
      localStorage.setItem('sw-saved-weeks', JSON.stringify(templates))
      expect(loadAll()).toEqual(templates)
    })

    it('ritorna [] e pulisce localStorage se dati corrotti', () => {
      localStorage.setItem('sw-saved-weeks', 'not-valid-json{{{')
      expect(loadAll()).toEqual([])
      expect(localStorage.getItem('sw-saved-weeks')).toBeNull()
    })
  })

  describe('save()', () => {
    it('salva un template valido', () => {
      const result = save('Standard', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      expect(result.success).toBe(true)
      expect(result.template.name).toBe('Standard')
      expect(result.template.days).toEqual(['sw', 'sw', 'office', 'sw', 'sw'])
      expect(result.template.swDaysRequested).toBe(3)
      expect(result.template.id).toBeDefined()
      expect(loadAll()).toHaveLength(1)
    })

    it('rifiuta nome vuoto', () => {
      const result = save('', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      expect(result.success).toBe(false)
      expect(result.error).toContain('nome')
    })

    it('rifiuta nome con solo spazi', () => {
      const result = save('   ', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      expect(result.success).toBe(false)
    })

    it('rifiuta nome > 50 caratteri', () => {
      const longName = 'A'.repeat(51)
      const result = save(longName, ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      expect(result.success).toBe(false)
      expect(result.error).toContain('lungo')
    })

    it('rifiuta days non array', () => {
      const result = save('Test', 'not-array', 3)
      expect(result.success).toBe(false)
    })

    it('rifiuta days con length != 5', () => {
      const result = save('Test', ['sw', 'sw'], 3)
      expect(result.success).toBe(false)
    })

    it('rifiuta days con stati non validi', () => {
      const result = save('Test', ['sw', 'invalid', 'office', 'sw', 'sw'], 3)
      expect(result.success).toBe(false)
    })

    it('rifiuta nome duplicato (case-insensitive)', () => {
      save('Standard', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const result = save('STANDARD', ['office', 'office', 'office', 'sw', 'sw'], 2)
      expect(result.success).toBe(false)
      expect(result.error).toContain('già')
    })

    it('accetta 20 template, rifiuta il 21esimo', () => {
      for (let i = 0; i < 20; i++) {
        const result = save(`Template ${i}`, ['sw', 'sw', 'office', 'sw', 'sw'], 3)
        expect(result.success).toBe(true)
      }
      const result21 = save('Template 21', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      expect(result21.success).toBe(false)
      expect(result21.error).toContain('Limite')
    })
  })

  describe('remove()', () => {
    it('elimina template esistente', () => {
      const { template } = save('Test', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const result = remove(template.id)
      expect(result.success).toBe(true)
      expect(loadAll()).toHaveLength(0)
    })

    it('errore se ID non trovato', () => {
      const result = remove('non-existent-id')
      expect(result.success).toBe(false)
      expect(result.error).toContain('non trovato')
    })
  })

  describe('rename()', () => {
    it('rinomina con successo', () => {
      const { template } = save('Old Name', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const result = rename(template.id, 'New Name')
      expect(result.success).toBe(true)
      expect(result.template.name).toBe('New Name')
      expect(loadAll()[0].name).toBe('New Name')
    })

    it('errore se nome vuoto', () => {
      const { template } = save('Test', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const result = rename(template.id, '')
      expect(result.success).toBe(false)
    })

    it('errore se ID non trovato', () => {
      const result = rename('non-existent', 'New')
      expect(result.success).toBe(false)
    })

    it('errore se nuovo nome duplica esistente', () => {
      save('Alpha', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const { template } = save('Beta', ['office', 'office', 'office', 'sw', 'sw'], 2)
      const result = rename(template.id, 'Alpha')
      expect(result.success).toBe(false)
      expect(result.error).toContain('già')
    })
  })

  describe('exportAll()', () => {
    it('esporta JSON formattato', () => {
      save('Test', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const json = exportAll()
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Test')
    })

    it('esporta array vuoto se nessun template', () => {
      const json = exportAll()
      expect(json).toBe('[]')
    })
  })

  describe('importFromJSON()', () => {
    it('importa array valido', () => {
      const incoming = JSON.stringify([
        { name: 'Imported', days: ['sw', 'sw', 'office', 'sw', 'sw'], swDaysRequested: 3 }
      ])
      const result = importFromJSON(incoming)
      expect(result.success).toBe(true)
      expect(result.added).toBe(1)
      expect(loadAll()).toHaveLength(1)
    })

    it('merge con esistenti, skip duplicati per nome', () => {
      save('Existing', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      const incoming = JSON.stringify([
        { name: 'Existing', days: ['office', 'office', 'office', 'sw', 'sw'], swDaysRequested: 2 },
        { name: 'New One', days: ['sw', 'office', 'sw', 'office', 'sw'], swDaysRequested: 3 },
      ])
      const result = importFromJSON(incoming)
      expect(result.success).toBe(true)
      expect(result.added).toBe(1) // Solo 'New One', 'Existing' skippato
      expect(loadAll()).toHaveLength(2)
    })

    it('errore su JSON malformato', () => {
      const result = importFromJSON('not-json')
      expect(result.success).toBe(false)
      expect(result.error).toContain('non valido')
    })

    it('errore se non è array', () => {
      const result = importFromJSON('{"name":"test"}')
      expect(result.success).toBe(false)
    })

    it('rispetta limite 20 anche in import', () => {
      for (let i = 0; i < 20; i++) {
        save(`T${i}`, ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      }
      const incoming = JSON.stringify([
        { name: 'Extra', days: ['sw', 'sw', 'office', 'sw', 'sw'], swDaysRequested: 3 }
      ])
      const result = importFromJSON(incoming)
      expect(result.added).toBe(0)
    })
  })

  describe('count()', () => {
    it('ritorna 0 se vuoto', () => {
      expect(count()).toBe(0)
    })

    it('ritorna numero template salvati', () => {
      save('A', ['sw', 'sw', 'office', 'sw', 'sw'], 3)
      save('B', ['office', 'office', 'office', 'sw', 'sw'], 2)
      expect(count()).toBe(2)
    })
  })
})
