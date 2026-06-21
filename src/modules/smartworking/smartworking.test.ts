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
  it('5 giorni lavorati → 3.0 SW', () => {
    expect(SW_DAYS_MAP[5]).toBe(3.0)
  })
  it('4 giorni lavorati → 2.5 SW', () => {
    expect(SW_DAYS_MAP[4]).toBe(2.5)
  })
  it('3 giorni lavorati → 2.0 SW', () => {
    expect(SW_DAYS_MAP[3]).toBe(2.0)
  })
  it('2 giorni lavorati → 1.0 SW', () => {
    expect(SW_DAYS_MAP[2]).toBe(1.0)
  })
  it('1 giorno lavorato → 0.0 SW', () => {
    expect(SW_DAYS_MAP[1]).toBe(0.0)
  })
  it('0 giorni lavorati → 0.0 SW', () => {
    expect(SW_DAYS_MAP[0]).toBe(0.0)
  })
})

describe('OFFICE_DAYS_MAP', () => {
  it('5 giorni lavorati → 2.0 Ufficio', () => {
    expect(OFFICE_DAYS_MAP[5]).toBe(2.0)
  })
  it('4 giorni lavorati → 1.5 Ufficio', () => {
    expect(OFFICE_DAYS_MAP[4]).toBe(1.5)
  })
  it('3 giorni lavorati → 1.0 Ufficio', () => {
    expect(OFFICE_DAYS_MAP[3]).toBe(1.0)
  })
  it('2 giorni lavorati → 1.0 Ufficio', () => {
    expect(OFFICE_DAYS_MAP[2]).toBe(1.0)
  })
  it('1 giorno lavorato → 1.0 Ufficio', () => {
    expect(OFFICE_DAYS_MAP[1]).toBe(1.0)
  })
  it('0 giorni lavorati → 0.0 Ufficio', () => {
    expect(OFFICE_DAYS_MAP[0]).toBe(0.0)
  })
})

// ──────────────────────────────────────────────
// 2. generateAllPermutations — CASI CHIAVE
// ──────────────────────────────────────────────
describe('generateAllPermutations', () => {
  // ── 2a. Tutti liberi (5 giorni) ──
  describe('5 giorni tutti liberi', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'free']
    const swTarget = 3.0
    const officeTarget = 2.0
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 32 permutazioni totali (2^5)', () => {
      expect(result).toHaveLength(32)
    })

    it('10 permutazioni sono valide', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(10)
    })

    it('ogni permutazione valida ha totalSW ∈ [3,3] e totalOffice ∈ [2,2]', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeGreaterThanOrEqual(3)
        expect(p.totalSW).toBeLessThanOrEqual(3)
        expect(p.totalOffice).toBeGreaterThanOrEqual(2)
        expect(p.totalOffice).toBeLessThanOrEqual(2)
      }
    })

    it('ogni permutazione ha esattamente 5 elementi in week', () => {
      for (const p of result) {
        expect(p.week).toHaveLength(5)
      }
    })

    it('ogni giorno è "sw" o "office" (nessun "free" residuo)', () => {
      for (const p of result) {
        for (const state of p.week) {
          expect(['sw', 'office']).toContain(state)
        }
      }
    })

    it('totalSW + totalOffice = 5 per ogni permutazione', () => {
      for (const p of result) {
        expect(p.totalSW + p.totalOffice).toBe(5)
      }
    })
  })

  // ── 2b. 2 giorni ufficio + 3 liberi ──
  describe('2 ufficio + 3 liberi', () => {
    const dayStates = ['office', 'office', 'free', 'free', 'free']
    const swTarget = 3.0
    const officeTarget = 2.0
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 8 permutazioni totali (2^3)', () => {
      expect(result).toHaveLength(8)
    })

    it('1 permutazione è valida (tutti i liberi → sw)', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(1)
      expect(valid[0].totalSW).toBe(3)
      expect(valid[0].totalOffice).toBe(2)
    })

    it('permutazioni valide: totalSW ∈ [3,3], totalOffice ∈ [2,2]', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeGreaterThanOrEqual(3)
        expect(p.totalSW).toBeLessThanOrEqual(3)
        expect(p.totalOffice).toBeGreaterThanOrEqual(2)
        expect(p.totalOffice).toBeLessThanOrEqual(2)
      }
    })

    it('i primi 2 giorni restano "office" in ogni permutazione', () => {
      for (const p of result) {
        expect(p.week[0]).toBe('office')
        expect(p.week[1]).toBe('office')
      }
    })
  })

  // ── 2c. 4 giorni lavorati, tutti liberi ──
  describe('4 giorni lavorati, tutti liberi (1 assenza)', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'absent']
    const swTarget = 2.5
    const officeTarget = 1.5
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 16 permutazioni totali (2^4)', () => {
      expect(result).toHaveLength(16)
    })

    it('10 permutazioni sono valide', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(10)
    })

    it('permutazioni valide: totalSW ∈ [2,3], totalOffice ∈ [1,2]', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeGreaterThanOrEqual(2)
        expect(p.totalSW).toBeLessThanOrEqual(3)
        expect(p.totalOffice).toBeGreaterThanOrEqual(1)
        expect(p.totalOffice).toBeLessThanOrEqual(2)
      }
    })

    it('il giorno 4 (absent) resta "absent" in ogni permutazione', () => {
      for (const p of result) {
        expect(p.week[4]).toBe('absent')
      }
    })
  })

  // ── 2d. 0 giorni liberi (tutti fissati) ──
  describe('0 giorni liberi (tutti fissati)', () => {
    it('3 SW + 2 Office → 1 permutazione, valida', () => {
      const dayStates = ['sw', 'sw', 'sw', 'office', 'office']
      const result = generateAllPermutations(dayStates, 3.0, 2.0)
      expect(result).toHaveLength(1)
      expect(result[0].valid).toBe(true)
      expect(result[0].totalSW).toBe(3)
      expect(result[0].totalOffice).toBe(2)
    })

    it('4 SW + 1 Office → 1 permutazione, NON valida (troppi SW)', () => {
      const dayStates = ['sw', 'sw', 'sw', 'sw', 'office']
      const result = generateAllPermutations(dayStates, 3.0, 2.0)
      expect(result).toHaveLength(1)
      expect(result[0].valid).toBe(false)
    })
  })

  // ── 2e. 1 giorno libero ──
  describe('1 giorno libero', () => {
    const dayStates = ['sw', 'sw', 'office', 'office', 'free']
    const swTarget = 3.0
    const officeTarget = 2.0
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 2 permutazioni totali (2^1)', () => {
      expect(result).toHaveLength(2)
    })

    it('1 permutazione è valida (quella con free→sw)', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(1)
      expect(valid[0].totalSW).toBe(3)
      expect(valid[0].totalOffice).toBe(2)
    })
  })

  // ── 2f. Tutti assenti ──
  describe('tutti assenti (0 giorni lavorati)', () => {
    const dayStates = ['absent', 'absent', 'absent', 'absent', 'absent']
    const result = generateAllPermutations(dayStates, 0.0, 0.0)

    it('genera 1 permutazione (0 giorni liberi)', () => {
      expect(result).toHaveLength(1)
    })

    it('è valida (0 SW, 0 Office)', () => {
      expect(result[0].valid).toBe(true)
      expect(result[0].totalSW).toBe(0)
      expect(result[0].totalOffice).toBe(0)
    })
  })

  // ── 2g. Mix: 1 SW + 1 Office + 1 Absent + 2 liberi ──
  describe('mix: 1 SW + 1 Office + 1 Absent + 2 liberi', () => {
    const dayStates = ['sw', 'office', 'absent', 'free', 'free']
    // 4 giorni lavorati (sw, office, free, free) → 2.5 SW, 1.5 Office
    const swTarget = 2.5
    const officeTarget = 1.5
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 4 permutazioni totali (2^2)', () => {
      expect(result).toHaveLength(4)
    })

    it('3 permutazioni sono valide', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(3)
    })

    it('permutazioni valide: totalSW ∈ [2,3], totalOffice ∈ [1,2]', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeGreaterThanOrEqual(2)
        expect(p.totalSW).toBeLessThanOrEqual(3)
        expect(p.totalOffice).toBeGreaterThanOrEqual(1)
        expect(p.totalOffice).toBeLessThanOrEqual(2)
      }
    })

    it('i giorni pre-fissati restano invariati', () => {
      for (const p of result) {
        expect(p.week[0]).toBe('sw')
        expect(p.week[1]).toBe('office')
        expect(p.week[2]).toBe('absent')
      }
    })
  })

  // ── 2h. 3 giorni lavorati, tutti liberi ──
  describe('3 giorni lavorati, tutti liberi (2 assenze)', () => {
    const dayStates = ['free', 'free', 'free', 'absent', 'absent']
    const swTarget = 2.0
    const officeTarget = 1.0
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 8 permutazioni totali (2^3)', () => {
      expect(result).toHaveLength(8)
    })

    it('3 permutazioni sono valide', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(3)
    })

    it('permutazioni valide: totalSW ∈ [2,2], totalOffice ∈ [1,1]', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeGreaterThanOrEqual(2)
        expect(p.totalSW).toBeLessThanOrEqual(2)
        expect(p.totalOffice).toBeGreaterThanOrEqual(1)
        expect(p.totalOffice).toBeLessThanOrEqual(1)
      }
    })
  })

  // ── 2i. 2 giorni lavorati, tutti liberi ──
  describe('2 giorni lavorati, tutti liberi (3 assenze)', () => {
    const dayStates = ['free', 'free', 'absent', 'absent', 'absent']
    const swTarget = 1.0
    const officeTarget = 1.0
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 4 permutazioni totali (2^2)', () => {
      expect(result).toHaveLength(4)
    })

    it('2 permutazioni sono valide', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(2)
    })

    it('permutazioni valide: totalSW ∈ [1,1], totalOffice ∈ [1,1]', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeGreaterThanOrEqual(1)
        expect(p.totalSW).toBeLessThanOrEqual(1)
        expect(p.totalOffice).toBeGreaterThanOrEqual(1)
        expect(p.totalOffice).toBeLessThanOrEqual(1)
      }
    })
  })

  // ── 2j. 1 giorno lavorato, libero ──
  describe('1 giorno lavorato, libero (4 assenze)', () => {
    const dayStates = ['free', 'absent', 'absent', 'absent', 'absent']
    const swTarget = 0.0
    const officeTarget = 1.0
    const result = generateAllPermutations(dayStates, swTarget, officeTarget)

    it('genera 2 permutazioni totali (2^1)', () => {
      expect(result).toHaveLength(2)
    })

    it('1 permutazione è valida (free→office)', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(1)
      expect(valid[0].totalSW).toBe(0)
      expect(valid[0].totalOffice).toBe(1)
    })
  })

  // ── 2k. Tutti i giorni sono unici (nessuna permutazione duplicata) ──
  describe('unicità delle permutazioni', () => {
    it('5 giorni liberi: tutte le 32 permutazioni sono uniche', () => {
      const dayStates = ['free', 'free', 'free', 'free', 'free']
      const result = generateAllPermutations(dayStates, 3.0, 2.0)
      const serialized = result.map(p => p.week.join(','))
      const unique = new Set(serialized)
      expect(unique.size).toBe(32)
    })
  })

  // ── 2l. Proprietà: somma SW+Office = giorni lavorati per ogni permutazione ──
  describe('proprietà: totalSW + totalOffice = giorni lavorati', () => {
    const cases = [
      { dayStates: ['free','free','free','free','free'], worked: 5, swT: 3.0, offT: 2.0 },
      { dayStates: ['office','office','free','free','free'], worked: 5, swT: 3.0, offT: 2.0 },
      { dayStates: ['free','free','free','free','absent'], worked: 4, swT: 2.5, offT: 1.5 },
      { dayStates: ['sw','office','absent','free','free'], worked: 4, swT: 2.5, offT: 1.5 },
      { dayStates: ['free','free','absent','absent','absent'], worked: 2, swT: 1.0, offT: 1.0 },
      { dayStates: ['free','absent','absent','absent','absent'], worked: 1, swT: 0.0, offT: 1.0 },
    ]

    for (const { dayStates, worked, swT, offT } of cases) {
      it(`${worked} giorni lavorati: SW+Office = ${worked}`, () => {
        const result = generateAllPermutations(dayStates, swT, offT)
        for (const p of result) {
          expect(p.totalSW + p.totalOffice).toBe(worked)
        }
      })
    }
  })
})
