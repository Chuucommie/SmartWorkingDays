// ──────────────────────────────────────────────
// Turso Settings — Profilo utente persistente su database
// ──────────────────────────────────────────────
//
// Legge e scrive nome, dipartimento e sede direttamente
// nella tabella users di Turso. L'employeeId è sempre
// uguale al userId Turso (fisso e unico).
//
// Niente più localStorage per le impostazioni: tutto
// nel database, accessibile da qualsiasi browser.
// ──────────────────────────────────────────────

import type { TursoBackendConfig } from './tursoPlans.ts'
import { sanitizeName } from './sanitize.ts'
import { loadSession, saveSession } from './tursoAuth.ts'
import type { Session } from './tursoAuth.ts'

export interface UserProfile {
  userId: string
  employeeId: string  // = userId, sempre
  displayName: string
  department: string
  locationCode: string
  email: string
}

export interface SaveProfileResult {
  success: boolean
  error?: string
  profile?: UserProfile
}

let _config: TursoBackendConfig | null = null

export function initTursoSettings(config: TursoBackendConfig): void {
  _config = config
}

function getConfig(): TursoBackendConfig {
  if (!_config) throw new Error('Turso settings not initialized')
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

/**
 * Carica il profilo utente dal database.
 * Usa la sessione corrente per determinare l'userId.
 */
export async function loadUserProfile(): Promise<UserProfile | null> {
  const session = loadSession()
  if (!session) return null

  try {
    const rows = await executeSql(
      'SELECT id, email, name, department, location_code FROM users WHERE id = ?',
      [session.userId]
    )
    if (rows.length === 0) return null

    const row = rows[0]
    return {
      userId: row.id as string,
      employeeId: row.id as string,  // employeeId = userId, sempre
      displayName: (row.name as string) || '',
      department: (row.department as string) || 'IT',
      locationCode: (row.location_code as string) || 'MILANO',
      email: (row.email as string) || '',
    }
  } catch {
    return null
  }
}

/**
 * Salva nome e sede nel database.
 * Aggiorna anche la sessione localStorage.
 */
export async function saveUserProfile(
  displayName: string,
  locationCode: string
): Promise<SaveProfileResult> {
  const session = loadSession()
  if (!session) return { success: false, error: 'Non autenticato' }

  try {
    const safeName = sanitizeName(displayName)
    const safeLocation = sanitizeName(locationCode)
    const now = new Date().toISOString()

    await executeSql(
      'UPDATE users SET name = ?, location_code = ?, updated_at = ? WHERE id = ?',
      [safeName, safeLocation, now, session.userId]
    )

    // Aggiorna sessione
    const updatedSession: Session = {
      ...session,
      name: safeName,
      locationCode: safeLocation,
    }
    saveSession(updatedSession)

    return {
      success: true,
      profile: {
        userId: session.userId,
        employeeId: session.userId,
        displayName: safeName,
        department: session.department || 'IT',
        locationCode: safeLocation,
        email: session.email,
      },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto'
    return { success: false, error: msg }
  }
}

/**
 * Crea la tabella user_settings se non esiste (per eventuali preferenze future).
 * Attualmente le impostazioni principali sono nelle colonne di users.
 */
export async function ensureSettingsTable(): Promise<void> {
  try {
    await executeSql(
      'CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY, preferences TEXT, updated_at TEXT)',
      []
    )
  } catch {
    // Non bloccare se la tabella esiste già
  }
}