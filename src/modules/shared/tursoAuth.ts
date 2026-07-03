// Turso Auth — register/login via SQLite
import type { TursoBackendConfig } from './tursoPlans.ts'
import { sanitizeName } from './sanitize.ts'

export interface AuthUser {
  id: string; email: string; name: string; department: string; locationCode: string
}
export interface AuthResult {
  success: boolean; user?: AuthUser; error?: string
}

const SESSION_KEY = 'eos-session'

export interface Session {
  userId: string; email: string; name: string; department: string; locationCode: string; token: string
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isLoggedIn(): boolean {
  return loadSession() !== null
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 600_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  const hashArray = Array.from(new Uint8Array(derivedBits))
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0') }).join('')
}

function generateSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, function(b) { return b.toString(16).padStart(2, '0') }).join('')
}

function generateUserId(): string {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return 'usr_' + Array.from(arr, function(b) { return b.toString(36) }).join('').replace(/0/g, '')
}

let _config: TursoBackendConfig | null = null

export function initTursoAuth(config: TursoBackendConfig): void {
  _config = config
}

function getConfig(): TursoBackendConfig {
  if (!_config) throw new Error('Turso auth not initialized')
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
      error?: { message: string }
      response?: { result?: { cols: Array<{ name: string }>; rows: Array<Array<unknown>> } }
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

export async function register(
  email: string, password: string, name: string, department: string, locationCode: string
): Promise<AuthResult> {
  try {
    const existing = await executeSql('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) return { success: false, error: 'Email gia registrata' }
    const id = generateUserId()
    const salt = generateSalt()
    const passwordHash = await hashPassword(password, salt)
    const now = new Date().toISOString()
    const safeName = sanitizeName(name)
    const safeDepartment = sanitizeName(department)
    const safeLocation = sanitizeName(locationCode)
    await executeSql(
      'INSERT INTO users (id, email, password_hash, name, department, location_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, salt + ':' + passwordHash, safeName, safeDepartment, safeLocation, now, now]
    )
    const user: AuthUser = { id, email, name: safeName, department: safeDepartment, locationCode: safeLocation }
    return { success: true, user }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const rows = await executeSql(
      'SELECT id, email, password_hash, name, department, location_code FROM users WHERE email = ?',
      [email]
    )
    if (rows.length === 0) return { success: false, error: 'Email non trovata' }
    const row = rows[0]
    const storedHash = row.password_hash as string
    const parts = storedHash.split(':')
    if (parts.length < 2) return { success: false, error: 'Dati utente corrotti' }
    const salt = parts[0]
    const hash = parts[1]
    const computedHash = await hashPassword(password, salt)
    if (computedHash !== hash) return { success: false, error: 'Password errata' }
    const user: AuthUser = {
      id: row.id as string, email: row.email as string, name: row.name as string,
      department: (row.department as string) || 'IT', locationCode: (row.location_code as string) || 'MILANO',
    }
    return { success: true, user }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// ── Password Reset ──

function generateResetToken(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, function(b) { return b.toString(16).padStart(2, '0') }).join('')
}

export interface ResetResult {
  success: boolean; token?: string; error?: string
}

export async function requestPasswordReset(email: string): Promise<ResetResult> {
  try {
    const rows = await executeSql('SELECT id FROM users WHERE email = ?', [email])
    if (rows.length === 0) return { success: false, error: 'Email non trovata' }
    const token = generateResetToken()
    const expires = new Date(Date.now() + 3600_000).toISOString() // 1 ora
    await executeSql(
      'INSERT OR REPLACE INTO password_resets (email, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
      [email, token, expires, new Date().toISOString()]
    )
    return { success: true, token }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<AuthResult> {
  try {
    const rows = await executeSql(
      'SELECT token, expires_at FROM password_resets WHERE email = ? AND token = ?',
      [email, token]
    )
    if (rows.length === 0) return { success: false, error: 'Token non valido' }
    const row = rows[0]
    const expires = new Date(row.expires_at as string)
    if (expires < new Date()) {
      await executeSql('DELETE FROM password_resets WHERE email = ?', [email])
      return { success: false, error: 'Token scaduto' }
    }
    const salt = generateSalt()
    const passwordHash = await hashPassword(newPassword, salt)
    await executeSql(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?',
      [salt + ':' + passwordHash, new Date().toISOString(), email]
    )
    await executeSql('DELETE FROM password_resets WHERE email = ?', [email])
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
