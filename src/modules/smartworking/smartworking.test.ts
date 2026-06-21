import { describe, it, expect } from 'vitest'
import { generateAllPermutations } from './smartworking.ts'
import type { Permutation } from './smartworking.ts'
import { computeTarget } from '../shared/userProfile.ts'
import type { SwRule } from '../shared/userProfile.ts'

// ──────────────────────────────────────────────
// Regole di test
// ──────────────────────────────────────────────
const RULE_60: SwRule = { type: 'percentage', value: 60 }
const RULE_FIXED_2: SwRule = { type: 'fixed', value: 2 }
const RULE_FIXED_3: SwRule = { type: 'fixed', value: 3 }
const RULE_40: SwRule = { type: 'percentage', value: 40 }

// ──────────────────────────────────────────────
// 1. computeTarget
// ──────────────────────────────────────────────
describe('computeTarget', () => {
  describe('percentage 60%', () => {
    it('5 giorni → 3.0 SW / 2.0 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_60, 5)
      expect(targetSW).toBe(3.0)
      expect(targetOffice).toBe(2.0)
    })
    it('4 giorni → 2.5 SW / 1.5 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_60, 4)
      expect(targetSW).toBe(2.5)
      expect(targetOffice).toBe(1.5)
    })
    it('3 giorni → 2.0 SW / 1.0 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_60, 3)
      expect(targetSW).toBe(2.0)
      expect(targetOffice).toBe(1.0)
    })
    it('2 giorni → 1.0 SW / 1.0 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_60, 2)
      expect(targetSW).toBe(1.0)
      expect(targetOffice).toBe(1.0)
    })
    it('1 giorno → 0.0 SW / 1.0 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_60, 1)
      expect(targetSW).toBe(0.0)
      expect(targetOffice).toBe(1.0)
    })
    it('0 giorni → 0.0 SW / 0.0 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_60, 0)
      expect(targetSW).toBe(0.0)
      expect(targetOffice).toBe(0.0)
    })
  })

  describe('percentage 40%', () => {
    it('5 giorni → 2.0 SW / 3.0 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_40, 5)
      expect(targetSW).toBe(2.0)
      expect(targetOffice).toBe(3.0)
    })
  })

  describe('fixed 2 giorni', () => {
    it('5 giorni → 2 SW / 3 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_FIXED_2, 5)
      expect(targetSW).toBe(2)
      expect(targetOffice).toBe(3)
    })
    it('1 giorno → 1 SW / 0 Office (capped)', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_FIXED_2, 1)
      expect(targetSW).toBe(1)
      expect(targetOffice).toBe(0)
    })
  })

  describe('fixed 3 giorni', () => {
    it('5 giorni → 3 SW / 2 Office', () => {
      const { targetSW, targetOffice } = computeTarget(RULE_FIXED_3, 5)
      expect(targetSW).toBe(3)
      expect(targetOffice).toBe(2)
    })
  })
})

// ──────────────────────────────────────────────
// 2. generateAllPermutations — ALGORITMO BASE-3 CON HALF + FLESSIBILE
// ──────────────────────────────────────────────
describe('generateAllPermutations', () => {
  // ── 2a. 5 giorni tutti liberi, regola 60% (target 3.0 SW) ──
  describe('5 giorni tutti liberi, regola 60%', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
    const result = generateAllPermutations(dayStates as any, RULE_60)

    it('genera 243 permutazioni totali (3^5)', () => {
      expect(result).toHaveLength(243)
    })

    it('almeno una permutazione è valida', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
    })

    it('permutazioni valide: totalSW <= 3.0', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeLessThanOrEqual(3.0)
      }
    })

    it('permutazioni con totalSW > 3.0 sono NON valide', () => {
      const invalid = result.filter(p => !p.valid)
      for (const p of invalid) {
        expect(p.totalSW).toBeGreaterThan(3.0)
      }
    })

    it('almeno una permutazione valida ha totalSW = 3.0 (target pieno)', () => {
      const valid = result.filter(p => p.valid)
      const fullTarget = valid.filter(p => p.totalSW === 3.0)
      expect(fullTarget.length).toBeGreaterThan(0)
    })

    it('almeno una permutazione valida ha totalSW = 0 (tutti ufficio)', () => {
      const valid = result.filter(p => p.valid)
      const allOffice = valid.filter(p => p.totalSW === 0)
      expect(allOffice.length).toBeGreaterThan(0)
    })

    it('risultati ordinati per SW decrescente', () => {
      for (let i = 1; i < result.length; i++) {
        expect(result[i].totalSW).toBeLessThanOrEqual(result[i - 1].totalSW)
      }
    })

    it('ogni permutazione ha campo adherence (0-1)', () => {
      for (const p of result) {
        expect(p.adherence).toBeGreaterThanOrEqual(0)
        expect(p.adherence).toBeLessThanOrEqual(1)
      }
    })

    it('permutazione con totalSW=3.0 ha adherence=1', () => {
      const full = result.find(p => p.totalSW === 3.0)
      expect(full).toBeDefined()
      expect(full!.adherence).toBe(1)
    })

    it('permutazione con totalSW=0 ha adherence=0', () => {
      const zero = result.find(p => p.totalSW === 0)
      expect(zero).toBeDefined()
      expect(zero!.adherence).toBe(0)
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

  // ── 2b. 4 giorni liberi + 1 assenza, regola 60% (target 2.5 SW) ──
  describe('4 giorni liberi + 1 assenza, regola 60%', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, RULE_60)

    it('genera 81 permutazioni totali (3^4)', () => {
      expect(result).toHaveLength(81)
    })

    it('permutazioni valide: totalSW <= 2.5', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
      for (const p of valid) {
        expect(p.totalSW).toBeLessThanOrEqual(2.5)
      }
    })

    it('almeno una permutazione valida ha totalSW = 2.5 (target pieno con half)', () => {
      const valid = result.filter(p => p.valid)
      const fullTarget = valid.filter(p => p.totalSW === 2.5)
      expect(fullTarget.length).toBeGreaterThan(0)
    })

    it('almeno una permutazione valida contiene un giorno half', () => {
      const valid = result.filter(p => p.valid)
      const hasHalf = valid.some(p => p.week.includes('half'))
      expect(hasHalf).toBe(true)
    })

    it('il giorno 4 (absent) resta absent in ogni permutazione', () => {
      for (const p of result) {
        expect(p.week[4]).toBe('absent')
      }
    })

    it('totalSW + totalOffice = 4 per ogni permutazione', () => {
      for (const p of result) {
        expect(p.totalSW + p.totalOffice).toBe(4)
      }
    })
  })

  // ── 2c. 3 giorni liberi + 2 assenze, regola 60% (target 2.0 SW) ──
  describe('3 giorni liberi + 2 assenze, regola 60%', () => {
    const dayStates = ['free', 'free', 'free', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, RULE_60)

    it('genera 27 permutazioni totali (3^3)', () => {
      expect(result).toHaveLength(27)
    })

    it('permutazioni valide: totalSW <= 2.0', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
      for (const p of valid) {
        expect(p.totalSW).toBeLessThanOrEqual(2.0)
      }
    })
  })

  // ── 2d. 2 giorni liberi + 3 assenze, regola 60% (target 1.0 SW) ──
  describe('2 giorni liberi + 3 assenze, regola 60%', () => {
    const dayStates = ['free', 'free', 'absent', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, RULE_60)

    it('genera 9 permutazioni totali (3^2)', () => {
      expect(result).toHaveLength(9)
    })

    it('permutazioni valide: totalSW <= 1.0', () => {
      const valid = result.filter(p => p.valid)
      expect(valid.length).toBeGreaterThan(0)
      for (const p of valid) {
        expect(p.totalSW).toBeLessThanOrEqual(1.0)
      }
    })
  })

  // ── 2e. 1 giorno libero + 4 assenze, regola 60% (target 0.0 SW) ──
  describe('1 giorno libero + 4 assenze, regola 60%', () => {
    const dayStates = ['free', 'absent', 'absent', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, RULE_60)

    it('genera 3 permutazioni totali (3^1)', () => {
      expect(result).toHaveLength(3)
    })

    it('solo office è valido (SW=0 <= 0)', () => {
      const valid = result.filter(p => p.valid)
      expect(valid).toHaveLength(1)
      expect(valid[0].totalSW).toBe(0)
      expect(valid[0].totalOffice).toBe(1)
      expect(valid[0].week[0]).toBe('office')
    })
  })

  // ── 2f. 0 giorni liberi (tutti fissati) ──
  describe('0 giorni liberi (tutti fissati)', () => {
    it('3 SW + 2 Office → 1 permutazione, valida (SW=3 <= 3)', () => {
      const dayStates = ['sw', 'sw', 'sw', 'office', 'office'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      expect(result).toHaveLength(1)
      expect(result[0].valid).toBe(true)
      expect(result[0].totalSW).toBe(3)
      expect(result[0].totalOffice).toBe(2)
    })

    it('4 SW + 1 Office → 1 permutazione, NON valida (SW=4 > 3)', () => {
      const dayStates = ['sw', 'sw', 'sw', 'sw', 'office'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      expect(result).toHaveLength(1)
      expect(result[0].valid).toBe(false)
    })
  })

  // ── 2g. Tutti assenti ──
  describe('tutti assenti (0 giorni lavorati)', () => {
    const dayStates = ['absent', 'absent', 'absent', 'absent', 'absent'] as const
    const result = generateAllPermutations(dayStates as any, RULE_60)

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
      const result = generateAllPermutations(dayStates as any, RULE_60)
      const serialized = result.map(p => p.week.join(','))
      const unique = new Set(serialized)
      expect(unique.size).toBe(243)
    })
  })

  // ── 2i. Proprietà: somma SW+Office = giorni lavorati ──
  describe('proprietà: totalSW + totalOffice = giorni lavorati', () => {
    const cases = [
      { dayStates: ['free','free','free','free','free'] as const, worked: 5, rule: RULE_60 },
      { dayStates: ['free','free','free','free','absent'] as const, worked: 4, rule: RULE_60 },
      { dayStates: ['sw','office','absent','free','free'] as const, worked: 4, rule: RULE_60 },
      { dayStates: ['free','free','absent','absent','absent'] as const, worked: 2, rule: RULE_60 },
      { dayStates: ['free','absent','absent','absent','absent'] as const, worked: 1, rule: RULE_60 },
    ]

    for (const { dayStates, worked, rule } of cases) {
      it(`${worked} giorni lavorati: SW+Office = ${worked}`, () => {
        const result = generateAllPermutations(dayStates as any, rule)
        for (const p of result) {
          expect(p.totalSW + p.totalOffice).toBe(worked)
        }
      })
    }
  })

  // ── 2j. Regola fixed 2 giorni ──
  describe('regola fixed: max 2 giorni SW', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
    const result = generateAllPermutations(dayStates as any, RULE_FIXED_2)

    it('permutazioni valide: totalSW <= 2', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeLessThanOrEqual(2)
      }
    })

    it('permutazioni con totalSW=0 sono valide', () => {
      const zero = result.filter(p => p.totalSW === 0 && p.valid)
      expect(zero.length).toBeGreaterThan(0)
    })

    it('permutazioni con totalSW=2 sono valide (target pieno)', () => {
      const full = result.filter(p => p.totalSW === 2 && p.valid)
      expect(full.length).toBeGreaterThan(0)
    })

    it('permutazioni con totalSW=3 NON sono valide', () => {
      const over = result.filter(p => p.totalSW === 3)
      for (const p of over) {
        expect(p.valid).toBe(false)
      }
    })
  })

  // ── 2k. Regola fixed 3 giorni ──
  describe('regola fixed: max 3 giorni SW', () => {
    const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
    const result = generateAllPermutations(dayStates as any, RULE_FIXED_3)

    it('permutazioni valide: totalSW <= 3', () => {
      const valid = result.filter(p => p.valid)
      for (const p of valid) {
        expect(p.totalSW).toBeLessThanOrEqual(3)
      }
    })

    it('permutazioni con totalSW=3 sono valide', () => {
      const full = result.filter(p => p.totalSW === 3 && p.valid)
      expect(full.length).toBeGreaterThan(0)
    })
  })

  // ── 2l. Ordinamento: prima permutazione ha SW massimo ──
  describe('ordinamento per SW decrescente', () => {
    it('prima permutazione ha il massimo totalSW tra tutte', () => {
      const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      const maxSW = Math.max(...result.map(p => p.totalSW))
      expect(result[0].totalSW).toBe(maxSW)
    })

    it('ultima permutazione ha il minimo totalSW tra tutte', () => {
      const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      const minSW = Math.min(...result.map(p => p.totalSW))
      expect(result[result.length - 1].totalSW).toBe(minSW)
    })
  })

  // ── 2m. Adherence calcolato correttamente ──
  describe('campo adherence', () => {
    it('target 3.0: totalSW=3.0 → adherence=1.0', () => {
      const dayStates = ['sw', 'sw', 'sw', 'office', 'office'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      expect(result[0].adherence).toBe(1)
    })

    it('target 3.0: totalSW=1.5 → adherence=0.5', () => {
      const dayStates = ['free', 'free', 'free', 'free', 'free'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      const half = result.find(p => p.totalSW === 1.5)
      expect(half).toBeDefined()
      expect(half!.adherence).toBe(0.5)
    })

    it('target 0: adherence=1 (nessuna divisione per zero)', () => {
      const dayStates = ['absent', 'absent', 'absent', 'absent', 'absent'] as const
      const result = generateAllPermutations(dayStates as any, RULE_60)
      expect(result[0].adherence).toBe(1)
    })
  })
})
