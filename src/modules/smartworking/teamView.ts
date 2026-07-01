// ──────────────────────────────────────────────
// SmartWorkingDays — Vista team e coincidenze ufficio
// ──────────────────────────────────────────────
//
// Modulo puro (zero dipendenze DOM/React).
// Recupera le pianificazioni del team e calcola le coincidenze.
// Supporta filtro per sede (Treviso, Bologna, Milano).
// ──────────────────────────────────────────────

import { fetchTeamPlans } from '../shared/planBackend.ts'
import { getCurrentUserProfile } from '../shared/msAuth.ts'
import type { TeamPlan, WeekPlan, DayState } from '../shared/config.ts'

/** Sedi disponibili */
export const LOCATIONS = ['TREVISO', 'BOLOGNA', 'MILANO'] as const
export type LocationCode = typeof LOCATIONS[number]

/** Risultato della vista team */
export interface TeamViewResult {
  myPlan: TeamPlan | null
  colleagues: TeamPlan[]
  department: string
  location: string
  allLocations: string[]
}

/** Mappa giorno → nomi colleghi in ufficio */
export type OfficeOverlaps = Record<number, string[]>

/**
 * Estrae tutte le sedi distinte dalle pianificazioni.
 */
export function extractLocations(plans: TeamPlan[]): string[] {
  const locs = new Set<string>()
  for (const p of plans) {
    if (p.locationCode) locs.add(p.locationCode)
  }
  return Array.from(locs).sort()
}

/**
 * Recupera e filtra le pianificazioni del team per la settimana.
 * @param weekStart Data inizio settimana (ISO)
 * @param locationFilter Sede da filtrare. Se undefined, usa la sede dell'utente.
 *                       Passa 'ALL' per vedere tutte le sedi.
 */
export async function getTeamView(
  weekStart: string,
  locationFilter?: string
): Promise<TeamViewResult> {
  const myProfile = getCurrentUserProfile()
  if (!myProfile) {
    throw new Error('Utente non autenticato — impossibile determinare dipartimento e sede')
  }

  const myEmployeeId = myProfile.employeeId
  const myDepartment = myProfile.department
  const myLocation = myProfile.locationCode

  // Recupera TUTTE le pianificazioni della settimana
  const allPlans = await fetchTeamPlans(weekStart)

  // Estrai tutte le sedi disponibili
  const allLocations = extractLocations(allPlans)

  // Determina il filtro sede
  const effectiveFilter = locationFilter === 'ALL' ? undefined : (locationFilter || myLocation)

  // Filtra: stesso dipartimento + (opzionale) stessa sede
  const teamPlans = allPlans.filter(p => {
    if (p.department !== myDepartment) return false
    if (effectiveFilter && p.locationCode !== effectiveFilter) return false
    return true
  })

  // Separa il piano dell'utente da quello dei colleghi
  const myPlan = teamPlans.find(p => p.employeeId === myEmployeeId) || null
  const colleagues = teamPlans.filter(p => p.employeeId !== myEmployeeId)

  return {
    myPlan,
    colleagues,
    department: myDepartment,
    location: effectiveFilter || 'Tutte',
    allLocations,
  }
}

/**
 * Calcola per ogni giorno della settimana quali colleghi
 * sono in ufficio insieme all'utente.
 */
export function computeOfficeOverlaps(
  myPlan: TeamPlan | null,
  colleagues: TeamPlan[]
): OfficeOverlaps {
  const overlaps: OfficeOverlaps = {}

  if (!myPlan || !myPlan.week) return overlaps

  for (let day = 0; day < 5; day++) {
    if (myPlan.week[day] !== 'office') continue

    const colleaguesInOffice = colleagues
      .filter(c => c.week && c.week[day] === 'office')
      .map(c => c.employeeName)

    if (colleaguesInOffice.length > 0) {
      overlaps[day] = colleaguesInOffice
    }
  }

  return overlaps
}

/**
 * Versione estesa: calcola TUTTE le coincidenze tra TUTTI i membri del team.
 */
export function computeFullOverlapMatrix(
  myPlan: TeamPlan | null,
  colleagues: TeamPlan[]
): boolean[][] {
  const matrix: boolean[][] = []
  for (let day = 0; day < 5; day++) {
    matrix[day] = colleagues.map(c =>
      !!(myPlan && myPlan.week && myPlan.week[day] === 'office' &&
         c.week && c.week[day] === 'office')
    )
  }
  return matrix
}

/** Formato raw di una pianificazione da Business Central */
export interface BcPlanRaw {
  employeeId?: string
  employeeNo?: string
  employeeName?: string
  employee?: { firstName?: string; lastName?: string; department?: string; locationCode?: string }
  department?: string
  locationCode?: string
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  swDaysRequested?: number
}

/**
 * Converte una pianificazione BC nel formato interno dell'app.
 */
export function bcPlanToInternal(bcPlan: BcPlanRaw | null): TeamPlan | null {
  if (!bcPlan) return null

  const dayTypeMap: Record<string, DayState> = {
    'Free': 'free',
    'SmartWorking': 'sw',
    'Office': 'office',
    'Absent': 'absent',
  }

  return {
    employeeId: bcPlan.employeeId || bcPlan.employeeNo || '',
    employeeName: bcPlan.employeeName || `${bcPlan.employee?.firstName || ''} ${bcPlan.employee?.lastName || ''}`.trim(),
    department: bcPlan.department || bcPlan.employee?.department || '',
    locationCode: bcPlan.locationCode || bcPlan.employee?.locationCode || '',
    week: [
      dayTypeMap[bcPlan.monday || ''] || 'free',
      dayTypeMap[bcPlan.tuesday || ''] || 'free',
      dayTypeMap[bcPlan.wednesday || ''] || 'free',
      dayTypeMap[bcPlan.thursday || ''] || 'free',
      dayTypeMap[bcPlan.friday || ''] || 'free',
    ] as WeekPlan,
    swDaysRequested: bcPlan.swDaysRequested || 0,
  }
}
