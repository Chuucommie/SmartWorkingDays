// Turso Plans — HTTP client for browser
import type { TeamPlan, WeekPlan } from './config.ts'
import { sanitizeName } from './sanitize.ts'

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
    cols.forEach(function(col: { name: string }, i: number) {
      const cell = row[i]
      if (cell && typeof cell === 'object' && 'value' in cell) {
        obj[col.name] = (cell as { value: unknown }).value
      } else {
        obj[col.name] = cell
      }
    })
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
      employeeName: sanitizeName(row.employee_name as string),
      department: sanitizeName((row.department as string) || 'IT'),
      locationCode: sanitizeName((row.location_code as string) || 'MILANO'),
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
    employeeName: sanitizeName(row.employee_name as string),
    department: sanitizeName((row.department as string) || 'IT'),
    locationCode: sanitizeName((row.location_code as string) || 'MILANO'),
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
      id: row.id as string, name: sanitizeName(row.name as string),
      department: sanitizeName((row.department as string) || 'IT'),
      locationCode: sanitizeName((row.location_code as string) || 'MILANO'),
      email: row.email as string,
    }
  })
}

// ── Notifiche coincidenze ufficio ──

/**
 * Quando un utente invia un piano, verifica quali colleghi della stessa
 * sede e dipartimento hanno giorni office in coincidenza, e invia
 * un'email di notifica a ciascuno di loro.
 */
export async function checkAndNotifyOfficeOverlaps(
  senderId: string,
  senderName: string,
  weekStart: string,
  myWeek: WeekPlan,
  department: string,
  locationCode: string
): Promise<void> {
  try {
    // 1. Recupera tutti i membri del team
    const members = await fetchTeamMembers()

    // 2. Recupera tutti i piani della settimana
    const allPlans = await fetchTeamPlans(weekStart)

    // 3. Per ogni collega della stessa sede + dipartimento che ha office
    //    negli stessi giorni dell'utente che ha appena inviato, invia email
    const DAY_LABELS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']

    for (const member of members) {
      // Salta se stesso
      if (member.id === senderId) continue
      // Solo stesso dipartimento e stessa sede
      if (member.department !== department) continue
      if (member.locationCode !== locationCode) continue

      // Trova il piano di questo membro
      const memberPlan = allPlans.find(p => p.employeeId === member.id)
      if (!memberPlan || !memberPlan.week) continue

      // Verifica coincidenze office
      const sharedDays: string[] = []
      for (let i = 0; i < 5; i++) {
        if (myWeek[i] === 'office' && memberPlan.week[i] === 'office') {
          sharedDays.push(DAY_LABELS[i])
        }
      }

      if (sharedDays.length === 0) continue

      // Invia email di notifica a questo membro
      const weekRange = formatWeekRangeShort(weekStart)
      const subject = `🏢 ${senderName} sarà in ufficio con te — ${weekRange}`
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #007AFF;">🏢 Coincidenza in ufficio</h2>
          <p><strong>${senderName}</strong> ha appena inviato la pianificazione per la settimana del <strong>${weekRange}</strong>.</p>
          <p>Sarete in ufficio insieme nei seguenti giorni:</p>
          <div style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <ul style="margin: 0; padding-left: 20px;">
              ${sharedDays.map(d => `<li style="font-size: 16px; margin: 4px 0;">📅 <strong>${d}</strong></li>`).join('')}
            </ul>
          </div>
          <p>Accedi a <a href="https://chuucommie.github.io/SmartWorkingDays/" style="color: #007AFF;">EOS Smart Working</a> per vedere la pianificazione completa del team.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Ricevi questa email perché sei nello stesso team e sede di ${senderName}.
          </p>
        </div>
      `

      await sendNotificationEmail(member.email, subject, html)
    }
  } catch (error) {
    // Non blocchiamo l'invio del piano se le notifiche falliscono
    console.warn('[tursoPlans] Notifica coincidenze fallita:', error)
  }
}

function formatWeekRangeShort(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `${d.toLocaleDateString('it-IT', opts)} – ${end.toLocaleDateString('it-IT', opts)}`
}

async function sendNotificationEmail(
  toEmail: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    const WORKER_URL = 'https://resend-proxy.chuucommie.workers.dev/send-email'
    await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toEmail, subject, html }),
    })
    console.info('[overlap-notify] Email inviata a', toEmail)
  } catch (error) {
    console.warn('[overlap-notify] Invio fallito per', toEmail, error)
  }
}
