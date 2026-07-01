// ──────────────────────────────────────────────
// EOS Timesheet — Backend Turso (SQLite hosted)
// ──────────────────────────────────────────────
//
// Backend persistente basato su Turso (SQLite nel cloud).
// Usa @libsql/client per query HTTP dirette al database.
//
// Vantaggi:
//   - SQLite reale, persistente, condiviso tra tutto il team
//   - Tier gratuito: 9GB storage, 1B row reads/mese
//   - API HTTP, nessun server da mantenere
//   - Stessa interfaccia di githubPlans e businessCentral
//
// Setup:
//   1. Vai su https://turso.tech e crea un database
//   2. Ottieni URL e token dal dashboard
//   3. Configurali nelle Impostazioni dell'app
// ──────────────────────────────────────────────

import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import type { TeamPlan, WeekPlan } from './config.ts'

// ── Tipi ──

/** Configurazione per il backend Turso */
export interface TursoBackendConfig {
  url: string
  token: string
}

/** Risultato salvataggio */
export interface SaveResult {
  success: boolean
  entryId?: string
  error?: string
}

// ── Client ──

let _client: Client | null = null

/**
 * Inizializza il backend Turso.
 * Chiamare una volta all'avvio dell'app.
 */
export function initTursoBackend(config: TursoBackendConfig): void {
  _client = createClient({
    url: config.url,
    authToken: config.token,
  })
  console.info('[tursoPlans] Backend Turso inizializzato')
}

function getClient(): Client {
  if (!_client) {
    throw new Error('Turso backend non inizializzato. Chiamare initTursoBackend() prima.')
  }
  return _client
}

// ── Schema ──

/**
 * Crea la tabella plans se non esiste.
 * Chiamare dopo initTursoBackend().
 */
export async function ensureSchema(): Promise<void> {
  const client = getClient()
  await client.execute(`
    CREATE TABLE IF NOT EXISTS plans (
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'IT',
      location_code TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_json TEXT NOT NULL,
      sw_days_requested INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (employee_id, week_start)
    )
  `)
  console.info('[tursoPlans] Schema verificato')
}

// ── Helpers ──

function parseWeek(json: string): WeekPlan {
  try {
    const arr = JSON.parse(json)
    if (Array.isArray(arr) && arr.length === 5) {
      return arr as WeekPlan
    }
  } catch { /* fallback */ }
  return ['free', 'free', 'free', 'free', 'free']
}

function weekToJson(week: WeekPlan): string {
  return JSON.stringify(week)
}

// ── API pubbliche ──

/**
 * Recupera le pianificazioni SW di tutti i dipendenti per una settimana.
 */
export async function fetchTeamPlans(weekStart: string): Promise<TeamPlan[]> {
  const client = getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM plans WHERE week_start = ?',
    args: [weekStart],
  })

  return result.rows.map(row => ({
    employeeId: row.employee_id as string,
    employeeName: row.employee_name as string,
    department: row.department as string,
    locationCode: row.location_code as string,
    week: parseWeek(row.week_json as string),
    swDaysRequested: row.sw_days_requested as number,
  }))
}

/**
 * Recupera la pianificazione di un singolo dipendente per una settimana.
 */
export async function fetchEmployeePlan(employeeId: string, weekStart: string): Promise<TeamPlan | null> {
  const client = getClient()
  const result = await client.execute({
    sql: 'SELECT * FROM plans WHERE employee_id = ? AND week_start = ?',
    args: [employeeId, weekStart],
  })

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    employeeId: row.employee_id as string,
    employeeName: row.employee_name as string,
    department: row.department as string,
    locationCode: row.location_code as string,
    week: parseWeek(row.week_json as string),
    swDaysRequested: row.sw_days_requested as number,
  }
}

/**
 * Salva (crea o aggiorna) una pianificazione SW.
 */
export async function savePlanning(planning: {
  employeeId: string
  employeeName: string
  department: string
  locationCode: string
  weekStart: string
  week: WeekPlan
  swDaysRequested: number
}): Promise<SaveResult> {
  try {
    const client = getClient()
    const now = new Date().toISOString()

    await client.execute({
      sql: `INSERT OR REPLACE INTO plans
            (employee_id, employee_name, department, location_code, week_start, week_json, sw_days_requested, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        planning.employeeId,
        planning.employeeName,
        planning.department,
        planning.locationCode,
        planning.weekStart,
        weekToJson(planning.week),
        planning.swDaysRequested,
        now,
      ],
    })

    console.info('[tursoPlans] Piano salvato:', planning.employeeName, planning.weekStart)
    return { success: true, entryId: `${planning.employeeId}-${planning.weekStart}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto'
    console.error('[tursoPlans] savePlanning fallito:', msg)
    return { success: false, error: msg }
  }
}
