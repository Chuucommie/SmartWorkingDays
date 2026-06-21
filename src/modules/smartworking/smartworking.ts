// ──────────────────────────────────────────────
// SmartWorkingDays — Logica pura (testabile)
// ──────────────────────────────────────────────
//
// Genera permutazioni base-3 con half-day.
// Validazione flessibile: totalSW <= targetSW (massimo, non obbligo).
// Risultati ordinati per SW decrescente (ottimali in cima).
// ──────────────────────────────────────────────

import type { DayState, WeekPlan } from '../shared/config.ts'
import type { SwRule } from '../shared/userProfile.ts'
import { computeTarget } from '../shared/userProfile.ts'

/** Una permutazione generata */
export interface Permutation {
  week: WeekPlan
  totalSW: number
  totalOffice: number
  valid: boolean
  /** Aderenza al target SW: 0-1 (1 = target pieno, 0 = tutto ufficio) */
  adherence: number
}

const EPSILON = 0.001

/**
 * Genera TUTTE le 3^k combinazioni per i giorni liberi.
 * Ogni giorno libero può diventare: sw, office, o half (mezza giornata).
 *
 * Validazione flessibile: totalSW <= targetSW.
 * L'utente può fare MENO SW del target (anche 0 = tutti in ufficio).
 * Superare il target NON è valido.
 *
 * 'half' appare SOLO nei risultati — non è selezionabile dall'utente.
 *
 * @param dayStates - Stato corrente dei 5 giorni (free/sw/office/absent)
 * @param rule - Regola SW dell'utente (percentage o fixed)
 * @returns Permutazioni ordinate per SW decrescente
 */
export function generateAllPermutations(
  dayStates: WeekPlan,
  rule: SwRule
): Permutation[] {
  const workedCount = dayStates.filter(s => s !== 'absent').length
  const { targetSW, targetOffice } = computeTarget(rule, workedCount)

  const freeIndices: number[] = []
  let fixedSW = 0
  let fixedOffice = 0

  dayStates.forEach((state, i) => {
    if (state === 'sw') fixedSW += 1
    else if (state === 'office') fixedOffice += 1
    else if (state === 'free') freeIndices.push(i)
  })

  const k = freeIndices.length

  // Nessun giorno libero: una sola permutazione (i vincoli già decisi)
  if (k === 0) {
    const totalSW = fixedSW
    const totalOffice = fixedOffice
    const valid = totalSW <= targetSW + EPSILON
    const adherence = targetSW > 0 ? Math.min(totalSW / targetSW, 1) : 1
    return [{ week: [...dayStates] as WeekPlan, totalSW, totalOffice, valid, adherence }]
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

    // Validazione flessibile: SW <= target (massimo, non obbligo)
    const valid = totalSW <= targetSW + EPSILON
    // Aderenza: quanto del target SW è stato raggiunto (0-1)
    const adherence = targetSW > 0 ? Math.min(totalSW / targetSW, 1) : 1

    all.push({ week, totalSW, totalOffice, valid, adherence })
  }

  // Ordina per SW decrescente (ottimali in cima)
  all.sort((a, b) => b.totalSW - a.totalSW)

  return all
}
