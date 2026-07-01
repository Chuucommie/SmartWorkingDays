// ──────────────────────────────────────────────
// EOS Timesheet — Impostazioni utente (localStorage)
// ──────────────────────────────────────────────
//
// Ogni membro del team configura dall'app stessa:
//   - Token GitHub (per leggere/scrivere plans.json)
//   - Nome visualizzato
//   - Sede (Treviso, Bologna, Milano)
//
// I dati sono salvati in localStorage e sopravvivono
// a refresh/chiusura browser. Mai committati nel repo.
// ──────────────────────────────────────────────

import { LOCATIONS } from '../smartworking/teamView.ts'
import type { LocationCode } from '../smartworking/teamView.ts'

// ── Tipi ──

export interface UserSettings {
  /** GitHub Personal Access Token (classic o fine-grained, scope repo) */
  githubToken: string
  /** Turso database URL (es. libsql://xxx.turso.io) */
  tursoUrl: string
  /** Turso auth token */
  tursoToken: string
  /** Nome visualizzato nell'app (es. "Ricardo Quintero") */
  displayName: string
  /** Sede di appartenenza */
  location: LocationCode | ''
  /** ID dipendente (generato automaticamente al primo salvataggio) */
  employeeId: string
}

const STORAGE_KEY = 'eos-user-settings'

// ── Default ──

function generateEmployeeId(): string {
  return 'EMP-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

const DEFAULT_SETTINGS: UserSettings = {
  githubToken: '',
  tursoUrl: '',
  tursoToken: '',
  displayName: '',
  location: '',
  employeeId: generateEmployeeId(),
}

// ── API pubbliche ──

/**
 * Carica le impostazioni da localStorage.
 * Se non esistono, restituisce i default.
 */
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS, employeeId: generateEmployeeId() }

    const parsed = JSON.parse(raw) as Partial<UserSettings>

    return {
      githubToken: parsed.githubToken || '',
      tursoUrl: parsed.tursoUrl || '',
      tursoToken: parsed.tursoToken || '',
      displayName: parsed.displayName || '',
      location: (LOCATIONS as readonly string[]).includes(parsed.location || '')
        ? (parsed.location as LocationCode)
        : '',
      employeeId: parsed.employeeId || generateEmployeeId(),
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return { ...DEFAULT_SETTINGS, employeeId: generateEmployeeId() }
  }
}

/**
 * Salva le impostazioni in localStorage.
 */
export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * Verifica se l'utente ha completato la configurazione iniziale.
 */
export function isConfigured(): boolean {
  const s = loadSettings()
  const hasBackend = s.tursoUrl.length > 0 || s.githubToken.length > 0
  return hasBackend && s.displayName.length > 0 && s.location.length > 0
}

/**
 * Restituisce il token GitHub configurato.
 */
export function getGitHubToken(): string {
  return loadSettings().githubToken
}

/**
 * Restituisce l'URL del database Turso configurato.
 */
export function getTursoUrl(): string {
  return loadSettings().tursoUrl
}

/**
 * Restituisce il token Turso configurato.
 */
export function getTursoToken(): string {
  return loadSettings().tursoToken
}

/**
 * Restituisce il nome visualizzato.
 */
export function getDisplayName(): string {
  return loadSettings().displayName
}

/**
 * Restituisce la sede configurata.
 */
export function getLocation(): LocationCode | '' {
  return loadSettings().location
}

/**
 * Restituisce l'ID dipendente.
 */
export function getEmployeeId(): string {
  return loadSettings().employeeId
}

/**
 * Esporta le impostazioni come stringa JSON (per backup o trasferimento).
 */
export function exportSettings(): string {
  return JSON.stringify(loadSettings(), null, 2)
}

/**
 * Importa impostazioni da una stringa JSON.
 * @returns true se l'import è riuscito, false se il JSON non è valido
 */
export function importSettings(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString) as Partial<UserSettings>
    // Validazione minima
    if (!parsed || typeof parsed !== 'object') return false

    const settings: UserSettings = {
      githubToken: typeof parsed.githubToken === 'string' ? parsed.githubToken : '',
      tursoUrl: typeof parsed.tursoUrl === 'string' ? parsed.tursoUrl : '',
      tursoToken: typeof parsed.tursoToken === 'string' ? parsed.tursoToken : '',
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
      location: (LOCATIONS as readonly string[]).includes(parsed.location || '')
        ? (parsed.location as LocationCode)
        : '',
      employeeId: typeof parsed.employeeId === 'string' && parsed.employeeId.length > 0
        ? parsed.employeeId
        : generateEmployeeId(),
    }

    saveSettings(settings)
    return true
  } catch {
    return false
  }
}
