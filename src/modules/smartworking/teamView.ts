// ──────────────────────────────────────────────
// SmartWorkingDays — Vista team e coincidenze ufficio
// ──────────────────────────────────────────────
//
// Modulo puro (zero dipendenze DOM/React).
// Recupera le pianificazioni del team e calcola le coincidenze.
// In produzione, i dati arrivano da BC OData.
// In sviluppo, usa mock data da config.
// ──────────────────────────────────────────────

import { fetchTeamPlans } from '../shared/businessCentral.ts'
import { getCurrentEmployeeId, getCurrentUserProfile } from '../shared/msAuth.ts'
import type { TeamPlan, WeekPlan, EmployeeData } from '../shared/config.ts'

/** Risultato della vista team */
export interface TeamViewResult {
  myPlan: TeamPlan | null
  colleagues: TeamPlan[]
  department: string
  location: string
}

/** Mappa giorno → nomi colleghi in ufficio */
export type OfficeOverlaps = Record<number, string[]>

/**
 * Recupera e filtra le pianificazioni del team per la settimana.
 * Filtra per stesso dipartimento e stessa sede dell'utente corrente.
 */
export async function getTeamView(weekStart: string): Promise<TeamViewResult> {
  const myProfile = getCurrentUserProfile()
  if (!myProfile) {
    throw new Error('Utente non autenticato — impossibile determinare dipartimento e sede')
  }

  const myEmployeeId = myProfile.employeeId
  const myDepartment = myProfile.department
  const myLocation = myProfile.locationCode

  // Recupera TUTTE le pianificazioni della settimana da BC (o mock)
  const allPlans = await fetchTeamPlans(weekStart)

  // Filtra: stesso dipartimento E stessa sede
  const teamPlans = allPlans.filter(p =>
    p.department === myDepartment &&
    p.locationCode === myLocation
  )

  // Separa il piano dell'utente da quello dei colleghi
  const myPlan = teamPlans.find(p => p.employeeId === myEmployeeId) || null
  const colleagues = teamPlans.filter(p => p.employeeId !== myEmployeeId)

  return {
    myPlan,
    colleagues,
    department: myDepartment,
    location: myLocation,
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
    // Se l'utente non è in ufficio quel giorno, nessuna coincidenza da segnalare
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
 * Restituisce una matrice giorni × colleghi per heatmap.
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
  employee?: { firstName?: string; lastName?: string }
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
 * Funzione pura, testabile.
 */
export function bcPlanToInternal(bcPlan: BcPlanRaw | null): TeamPlan | null {
  if (!bcPlan) return null

  // Mappa enum BC → stati interni
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
