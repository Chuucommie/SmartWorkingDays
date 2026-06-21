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

/**
 * Genera TUTTE le 2^k combinazioni per i giorni liberi.
 *
 * @param dayStates — array di 5 elementi: 'free' | 'sw' | 'office' | 'absent'
 * @param swTarget — giorni SW target (es. 3.0, 2.5)
 * @param officeTarget — giorni Ufficio target (es. 2.0, 1.5)
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
    if (state === 'sw') fixedSW++
    else if (state === 'office') fixedOffice++
    else if (state === 'free') freeIndices.push(i)
  })

  const k = freeIndices.length

  // Nessun giorno libero: una sola permutazione (i vincoli già decisi)
  if (k === 0) {
    const totalSW = fixedSW
    const totalOffice = fixedOffice
    const swOk = totalSW >= Math.floor(swTarget) && totalSW <= Math.ceil(swTarget)
    const officeOk = totalOffice >= Math.floor(officeTarget) && totalOffice <= Math.ceil(officeTarget)
    return [{ week: [...dayStates] as WeekPlan, totalSW, totalOffice, valid: swOk && officeOk }]
  }

  const totalCombos = 1 << k // 2^k
  const all: Permutation[] = []

  for (let mask = 0; mask < totalCombos; mask++) {
    const week = [...dayStates] as WeekPlan
    let assignedSW = 0
    let assignedOffice = 0

    for (let bit = 0; bit < k; bit++) {
      const dayIdx = freeIndices[bit]
      if (mask & (1 << bit)) {
        week[dayIdx] = 'sw'
        assignedSW++
      } else {
        week[dayIdx] = 'office'
        assignedOffice++
      }
    }

    const totalSW = fixedSW + assignedSW
    const totalOffice = fixedOffice + assignedOffice

    const swOk = totalSW >= Math.floor(swTarget) && totalSW <= Math.ceil(swTarget)
    const officeOk = totalOffice >= Math.floor(officeTarget) && totalOffice <= Math.ceil(officeTarget)

    all.push({ week, totalSW, totalOffice, valid: swOk && officeOk })
  }

  return all
}
