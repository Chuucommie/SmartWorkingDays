// Turso Plans — HTTP client for browser
import type { TeamPlan, WeekPlan } from './config.ts'

export interface TursoBackendConfig { url: string; token: string }
export interface SaveResult { success: boolean; entryId?: string; error?: string }

let _config: TursoBackendConfig | null = null

export function initTursoBackend(config: TursoBackendConfig): void {
  _config = config
}

function getConfig(): TursoBackendConfig {
  if (!_config) throw new Error('Turso backend not initialized')
  return _config
}

async function executeSql(sql: string, args: unknown[] = []): Promise<Record<string, unknown>[]> {
  const config = getConfig()
  const url = config.url + '/v2/pipeline'
  const body = {
    requests: [{
      type: 'execute',
      stmt: {
        sql: sql,
        args: args.map(function(a: unknown) {
          if (typeof a === 'number') return { type: 'integer', value: String(a) }
          return { type: 'text', value: String(a || '') }
        }),
      },
    }],
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error('Turso HTTP ' + res.status + ': ' + text)
  }
  const data = await res.json() as {
    results: Array<{
      type: string
      response?: { type: string; result?: { cols: Array<{ name: string }>; rows: Array<Array<unknown>> } }
      error?: { message: string }
    }>
  }
  const result = data.results?.[0]
  if (result?.error) throw new Error('Turso SQL error: ' + result.error.message)
  const cols = result?.response?.result?.cols ?? []
  const rows = result?.response?.result?.rows ?? []
  return rows.map(function(row: Array<unknown>) {
    const obj: Record<string, unknown> = {}
    cols.forEach(function(col: { name: string }, i: number) { obj[col.name] = row[i] })
    return obj
  })
}

function parseWeek(json: string): WeekPlan {
  try {
    const arr = JSON.parse(json)
    if (Array.isArray(arr) && arr.length === 5) return arr as WeekPlan
  } catch (_e) { /* fallback */ }
  return ['free', 'free', 'free', 'free', 'free']
}

function weekToJson(week: WeekPlan): string { return JSON.stringify(week) }

export async function fetchTeamPlans(weekStart: string): Promise<TeamPlan[]> {
  const rows = await executeSql('SELECT * FROM plans WHERE week_start = ?', [weekStart])
  return rows.map(function(row) {
    return {
      employeeId: row.user_id as string,
      employeeName: row.employee_name as string,
      department: (row.department as string) || 'IT',
      locationCode: (row.location_code as string) || 'MILANO',
      week: parseWeek(row.week_json as string),
      swDaysRequested: (row.sw_days_requested as number) || 0,
    }
  })
}

export async function fetchEmployeePlan(userId: string, weekStart: string): Promise<TeamPlan | null> {
  const rows = await executeSql('SELECT * FROM plans WHERE user_id = ? AND week_start = ?', [userId, weekStart])
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    employeeId: row.user_id as string,
    employeeName: row.employee_name as string,
    department: (row.department as string) || 'IT',
    locationCode: (row.location_code as string) || 'MILANO',
    week: parseWeek(row.week_json as string),
    swDaysRequested: (row.sw_days_requested as number) || 0,
  }
}

export async function savePlanning(planning: {
  employeeId: string; employeeName: string; department: string; locationCode: string
  weekStart: string; week: WeekPlan; swDaysRequested: number
}): Promise<SaveResult> {
  try {
    const now = new Date().toISOString()
    const id = planning.employeeId + '-' + planning.weekStart
    await executeSql(
      'INSERT OR REPLACE INTO plans (id, user_id, employee_name, department, location_code, week_start, week_json, sw_days_requested, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, planning.employeeId, planning.employeeName, planning.department, planning.locationCode, planning.weekStart, weekToJson(planning.week), planning.swDaysRequested, now]
    )
    return { success: true, entryId: id }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function fetchTeamMembers(): Promise<Array<{
  id: string; name: string; department: string; locationCode: string; email: string
}>> {
  const rows = await executeSql('SELECT id, name, department, location_code, email FROM users ORDER BY name')
  return rows.map(function(row) {
    return {
      id: row.id as string, name: row.name as string,
      department: (row.department as string) || 'IT',
      locationCode: (row.location_code as string) || 'MILANO',
      email: row.email as string,
    }
  })
}
