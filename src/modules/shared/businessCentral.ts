// ──────────────────────────────────────────────
// EOS Timesheet — Client Business Central (OData)
// ──────────────────────────────────────────────
//
// STUB: In attesa dei riferimenti all'ambiente BC.
// Quando APP_CONFIG.businessCentral sarà configurato,
// questo modulo userà axios per chiamate OData reali.
//
// Per ora fornisce mock data per sviluppo e test.
// ──────────────────────────────────────────────

import { APP_CONFIG, getMockTeamPlans } from './config.ts'
import { getAccessToken } from './msAuth.ts'
import type { TeamPlan } from './config.ts'

/** Dati per il salvataggio di una pianificazione */
export interface PlanningData {
  employeeId: string
  weekStart: string
  week: TeamPlan['week']
  swDaysRequested: number
}

/** Risultato salvataggio */
export interface SaveResult {
  success: boolean
  entryId?: string
  error?: string
}

/** Entry timesheet */
export interface TimesheetEntry {
  employeeId: string
  weekStart: string
  day: number
  hours: number
  projectCode?: string
  description?: string
}

/**
 * Recupera le pianificazioni SW di tutti i dipendenti per una settimana.
 * In produzione: GET OData con $expand=employee.
 * In mock: restituisce dati da config.
 */
export async function fetchTeamPlans(weekStart: string): Promise<TeamPlan[]> {
  if (!APP_CONFIG.features.bcIntegration) {
    // ── MOCK MODE ──
    console.info('[businessCentral] Mock mode — usando dati team da config')
    // Simula latenza di rete (300-800ms)
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500))
    return getMockTeamPlans(weekStart)
  }

  // ── PRODUCTION MODE ──
  const token = await getAccessToken()
  if (!token) throw new Error('Non autenticato')

  const { baseUrl, companyId, planningTableName } = APP_CONFIG.businessCentral
  const url = `${baseUrl}/companies(${companyId})/${planningTableName}`
    + `?$filter=weekStart eq ${weekStart}&$expand=employee`

  // TODO: axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
  console.warn('[businessCentral] Production mode non ancora implementato')
  return getMockTeamPlans(weekStart)
}

/**
 * Recupera la pianificazione di un singolo dipendente per una settimana.
 */
export async function fetchEmployeePlan(employeeId: string, weekStart: string): Promise<TeamPlan | null> {
  if (!APP_CONFIG.features.bcIntegration) {
    // Mock: cerca nei dati mock
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200))
    const allPlans = getMockTeamPlans(weekStart)
    return allPlans.find(p => p.employeeId === employeeId) || null
  }

  // TODO: OData query con filtro per employeeId
  const plans = await fetchTeamPlans(weekStart)
  return plans.find(p => p.employeeId === employeeId) || null
}

/**
 * Salva una pianificazione SW su Business Central.
 * In produzione: POST OData sulla tabella custom.
 * In mock: logga e restituisce successo fittizio.
 */
export async function savePlanning(planning: PlanningData): Promise<SaveResult> {
  if (!APP_CONFIG.features.bcIntegration) {
    console.info('[businessCentral] Mock save:', planning)
    await new Promise(r => setTimeout(r, 200))
    return { success: true, entryId: 'mock-entry-' + Date.now() }
  }

  // TODO: POST OData
  console.warn('[businessCentral] Production save non ancora implementato')
  return { success: true, entryId: 'pending' }
}

/**
 * Recupera il timesheet (ore lavorate) di un dipendente per una settimana.
 * Placeholder per il modulo Timesheet futuro.
 */
export async function fetchTimesheet(_employeeId: string, _weekStart: string): Promise<TimesheetEntry[]> {
  if (!APP_CONFIG.features.bcIntegration) {
    console.info('[businessCentral] Mock timesheet — vuoto')
    return []
  }
  // TODO: GET OData timeRegistrationEntries
  console.warn('[businessCentral] Timesheet fetch non ancora implementato')
  return []
}

/**
 * Salva una entry timesheet su Business Central.
 * Placeholder per il modulo Timesheet futuro.
 */
export async function saveTimesheetEntry(entry: TimesheetEntry): Promise<SaveResult> {
  if (!APP_CONFIG.features.bcIntegration) {
    console.info('[businessCentral] Mock timesheet save:', entry)
    return { success: true }
  }
  // TODO: POST OData
  console.warn('[businessCentral] Timesheet save non ancora implementato')
  return { success: true }
}
