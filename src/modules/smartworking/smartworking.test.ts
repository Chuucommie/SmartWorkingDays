import { describe, it, expect } from 'vitest'
import {
  SW_DAYS_MAP,
  OFFICE_DAYS_MAP,
  generateAllPermutations,
} from './smartworking.ts'

// ──────────────────────────────────────────────
// 1. MAPPE GIORNI LAVORATI → SW / UFFICIO
// ──────────────────────────────────────────────
describe('SW_DAYS_MAP', () => {
  it('5 giorni lavorati → 3.0 SW', () => { expect(SW_DAYS_MAP[5]).toBe(3.0) })
  it('4 giorni lavorati → 2.5 SW', () => { expect(SW_DAYS_MAP[4]).toBe(2.5) })
  it('3 giorni lavorati → 2.0 SW', () => { expect(SW_DAYS_MAP[3]).toBe(2.0) })
  it('2 giorni lavorati → 1.0 SW', () => { expect(SW_DAYS_MAP[2]).toBe(1.0) })
  it('1 giorno lavorato → 0.0 SW', () => { expect(SW_DAYS_MAP[1]).toBe(0.0) })
  it('0 giorni lavorati → 0.0 SW', () => { expect(SW_DAYS_MAP[0]).toBe(0.0) })
})

describe('OFFICE_DAYS_MAP', () => {
  it('5 giorni lavorati → 2.0 Ufficio', () => { expect(OFFICE_DAYS_MAP[5]).toBe(2.0) })
  it('4 giorni lavorati → 1.5 Ufficio', () => { expect(OFFICE_DAYS_MAP[4]).toBe(1.5) })
  it('3 giorni lavorati → 1.0 Ufficio', () => { expect(OFFICE_DAYS_MAP[3]).toBe(1.0) })
  it('2 giorni lavorati → 1.0 Ufficio', () => { expect(OFFICE_DAYS_MAP[2]).toBe(1.0) })
  it('1 giorno lavorato → 1.0 Ufficio', () => { expect(OFFICE_DAYS_MAP[1]).toBe(1.0) })
  it('0 giorni lavorati → 0.0 Ufficio', () => { expect(OFFICE_DAYS_MAP[0]).toBe(0.0) })
})

// ──────────────────────────────────────────────
// 2. generateAllPermutations — ALGORITMO BASE-3 CON HALF
// ──────────────────────────────────────────────
describe('generateAllPermutations', () => {
  // ── 2a. 5 giorni tutti liberi, target 3.0 SW / 2.0 Office ──
  describe('5 giorni tutti liberi (3.0 SW, 2.0 Office)', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
    const result = generateAllPermutations(dayStates as any, 3.0, 2.0)

    it('genera 243 permutazioni totali (3^5)', () => {
      expect(result).toHaveLength(243)
    })

    it('almeno una permutazione è valida', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
    })

    it('ogni permutazione valida ha totalSW = 3.0 e totalOffice = 2.0 (esatto)', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBe(3.0)
        expect(p.totalOffice).toBe(2.0)
      }
    })

    it('ogni permutazione ha esattamente 5 elementi in week', () => {
      for (const p of result) {
        expect(p.week).toHaveLength(5)
      }
    })

    it('ogni giorno è sw, office o half (nessun free residuo)', () => {
      for (const p of result) {
        for (const state of p.week) {
          expect(['sw', 'office', 'half']).toContain(state)
        }
      }
    })

    it('totalSW + totalOffice = 5 per ogni permutazione', () => {
      for (const p of result) {
        expect(p.totalSW + p.totalOffice).toBe(5)
      }
    })
  })

  // ── 2b. 4 giorni lavorati, tutti liberi (1 assenza), target 2.5 SW / 1.5 Office ──
  describe('4 giorni liberi + 1 assenza (2.5 SW, 1.5 Office)', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, 2.5, 1.5)

    it('genera 81 permutazioni totali (3^4)', () => {
      expect(result).toHaveLength(81)
    })

    it('almeno una permutazione è valida', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
    })

    it('permutazioni valide: totalSW = 2.5, totalOffice = 1.5 (esatto)', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBe(2.5)
        expect(p.totalOffice).toBe(1.5)
      }
    })

    it('il giorno 4 (absent) resta absent in ogni permutazione', () => {
      for (const p of result) {
        expect(p.week[4]).toBe('absent')
      }
    })

    it('almeno una permutazione valida contiene un giorno half', () => {
      const valid = result.filter(p => p.valid)
      const hasHalf = valid.some(p => p.week.includes('half'))
      expect(hasHalf).toBe(true)
    })
  })

  // ── 2c. 3 giorni liberi + 2 assenze, target 2.0 SW / 1.0 Office ──
  describe('3 giorni liberi + 2 assenze (2.0 SW, 1.0 Office)', () => {
    const dayStates = ['free', 'free', 'free', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, 2.0, 1.0)

    it('genera 27 permutazioni totali (3^3)', () => {
      expect(result).toHaveLength(27)
    })

    it('permutazioni valide: totalSW = 2.0, totalOffice = 1.0', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
      for (const p of valid) {
        expect(p.totalSW).toBe(2.0)
        expect(p.totalOffice).toBe(1.0)
      }
    })
  })

  // ── 2d. 2 giorni liberi + 3 assenze, target 1.0 SW / 1.0 Office ──
  describe('2 giorni liberi + 3 assenze (1.0 SW, 1.0 Office)', () => {
    const dayStates = ['free', 'free', 'absent', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, 1.0, 1.0)

    it('genera 9 permutazioni totali (3^2)', () => {
      expect(result).toHaveLength(9)
    })

    it('permutazioni valide: totalSW = 1.0, totalOffice = 1.0', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
      for (const p of valid) {
        expect(p.totalSW).toBe(1.0)
        expect(p.totalOffice).toBe(1.0)
      }
    })
  })

  // ── 2e. 1 giorno libero + 4 assenze, target 0.0 SW / 1.0 Office ──
  describe('1 giorno libero + 4 assenze (0.0 SW, 1.0 Office)', () => {
    const dayStates = ['free', 'absent', 'absent', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, 0.0, 1.0)

    it('genera 3 permutazioni totali (3^1)', () => {
      expect(result).toHaveLength(3)
    })

    it('1 permutazione è valida (free→office)', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(1)
      expect(valid[0].totalSW).toBe(0)
      expect(valid[0].totalOffice).toBe(1)
      expect(valid[0].week[0]).toBe('office')
    })
  })

  // ── 2f. 0 giorni liberi (tutti fissati) ──
  describe('0 giorni liberi (tutti fissati)', () => {
    it('3 SW + 2 Office → 1 permutazione, valida', () => {
      const dayStates = ['sw', 'sw', 'sw', 'office', 'office'] as const
      const result = generateAllPermutations(dayStates as any, 3.0, 2.0)
      expect(result).toHaveLength(1)
      expect(result[0].valid).toBe(true)
      expect(result[0].totalSW).toBe(3)
      expect(result[0].totalOffice).toBe(2)
    })

    it('4 SW + 1 Office → 1 permutazione, NON valida (troppi SW)', () => {
      const dayStates = ['sw', 'sw', 'sw', 'sw', 'office'] as const
      const result = generateAllPermutations(dayStates as any, 3.0, 2.0)
      expect(result).toHaveLength(1)
      expect(result[0].valid).toBe(false)
    })
  })

  // ── 2g. Tutti assenti ──
  describe('tutti assenti (0 giorni lavorati)', () => {
    const dayStates = ['absent', 'absent', 'absent', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, 0.0, 0.0)

    it('genera 1 permutazione (0 giorni liberi)', () => {
      expect(result).toHaveLength(1)
    })

    it('è valida (0 SW, 0 Office)', () => {
      expect(result[0].valid).toBe(true)
      expect(result[0].totalSW).toBe(0)
      expect(result[0].totalOffice).toBe(0)
    })
  })

  // ── 2h. Unicità delle permutazioni ──
  describe('unicità delle permutazioni', () => {
    it('5 giorni liberi: tutte le 243 permutazioni sono uniche', () => {
      const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
      const result = generateAllPermutations(dayStates as any, 3.0, 2.0)
      const serialized = result.map(p => p.week.join(','))
      const unique = new Set(serialized)
      expect(unique.size).toBe(243)
    })
  })

  // ── 2i. Proprietà: somma SW+Office = giorni lavorati ──
  describe('proprietà: totalSW + totalOffice = giorni lavorati', () => {
    const cases = [
      { dayStates: ['free','free','free','free','free'] as const, worked: 5, swT: 3.0, offT: 2.0 },
      { dayStates: ['free','free','free','free','absent'] as const, worked: 4, swT: 2.5, offT: 1.5 },
      { dayStates: ['sw','office','absent','free','free'] as const, worked: 4, swT: 2.5, offT: 1.5 },
      { dayStates: ['free','free','absent','absent','absent'] as const, worked: 2, swT: 1.0, offT: 1.0 },
      { dayStates: ['free','absent','absent','absent','absent'] as const, worked: 1, swT: 0.0, offT: 1.0 },
    ]

    for (const { dayStates, worked, swT, offT } of cases) {
      it(`${worked} giorni lavorati: SW+Office = ${worked}`, () => {
        const result = generateAllPermutations(dayStates as any, swT, offT)
        for (const p of result) {
          expect(p.totalSW + p.totalOffice).toBe(worked)
        }
      })
    }
  })

  // ── 2j. Nessuna permutazione valida se target impossibile ──
  describe('target impossibile', () => {
    it('5 giorni liberi, target 5.0 SW / 5.0 Office → impossibile (10 unità con 5 giorni)', () => {
      const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
      const result = generateAllPermutations(dayStates as any, 5.0, 5.0)
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(0)
    })

    it('1 giorno libero, target 1.0 SW / 1.0 Office → impossibile (1 giorno = 1 unità totale)', () => {
      const dayStates = ['free', 'absent', 'absent', 'absent', 'absent'] as const
      const result = generateAllPermutations(dayStates as any, 1.0, 1.0)
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(0)
    })
  })
})
