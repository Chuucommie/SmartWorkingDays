// ──────────────────────────────────────────────
// SmartWorkingDays — Logica pura (testabile)
// ──────────────────────────────────────────────

import type { DayState, WeekPlan } from '../shared/config.ts'

/** Mappatura giorni SW spettanti in base ai giorni effettivamente lavorati */
export const SW_DAYS_MAP: Record<number, number> = { 5: 3.0, 4: 2.5, 3: 2.0, 2: 1.0, 1: 0.0, 0: 0.0 }
export const OFFICE_DAYS_MAP: Record<number, number> = { 5: 2.0, 4: 1.5, 3: 1.0, 2: 1.0, 1: 1.0, 0: 0.0 }

/** Una permutazione generata */
export interface Permutation {
  week: WeekPlan
  totalSW: number
  totalOffice: number
  valid: boolean
}

const EPSILON = 0.001

/**
 * Genera TUTTE le 3^k combinazioni per i giorni liberi.
 * Ogni giorno libero può diventare: sw, office, o half (mezza giornata).
 * Il giorno half contribuisce 0.5 a SW e 0.5 a Ufficio,
 * permettendo di raggiungere esattamente target frazionari (es. 2.5 SW, 1.5 Ufficio).
 */
export function generateAllPermutations(
  dayStates: WeekPlan,
  swTarget: number,
  officeTarget: number
): Permutation[] {
  const freeIndices: number[] = []
  let fixedSW = 0
  let fixedOffice = 0

  dayStates.forEach((state, i) => {
    if (state === 'sw') fixedSW += 1
    else if (state === 'office') fixedOffice += 1
    else if (state === 'half') { fixedSW += 0.5; fixedOffice += 0.5 }
    else if (state === 'free') freeIndices.push(i)
  })

  const k = freeIndices.length

  // Nessun giorno libero: una sola permutazione (i vincoli già decisi)
  if (k === 0) {
    const totalSW = fixedSW
    const totalOffice = fixedOffice
    const valid = Math.abs(totalSW - swTarget) < EPSILON && Math.abs(totalOffice - officeTarget) < EPSILON
    return [{ week: [...dayStates] as WeekPlan, totalSW, totalOffice, valid }]
  }

  // 3^k combinazioni: ogni giorno libero → sw, office, o half
  const totalCombos = Math.pow(3, k)
  const all: Permutation[] = []
  const choices: DayState[] = ['sw', 'office', 'half']

  for (let mask = 0; mask < totalCombos; mask++) {
    const week = [...dayStates] as WeekPlan
    let assignedSW = 0
    let assignedOffice = 0
    let m = mask

    for (let bit = 0; bit < k; bit++) {
      const choice = m % 3
      m = Math.floor(m / 3)
      const dayIdx = freeIndices[bit]
      const state = choices[choice]
      week[dayIdx] = state
      if (state === 'sw') assignedSW += 1
      else if (state === 'office') assignedOffice += 1
      else if (state === 'half') { assignedSW += 0.5; assignedOffice += 0.5 }
    }

    const totalSW = fixedSW + assignedSW
    const totalOffice = fixedOffice + assignedOffice

    const valid = Math.abs(totalSW - swTarget) < EPSILON && Math.abs(totalOffice - officeTarget) < EPSILON

    all.push({ week, totalSW, totalOffice, valid })
  }

  return all
}
