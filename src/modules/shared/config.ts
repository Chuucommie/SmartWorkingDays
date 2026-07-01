// ──────────────────────────────────────────────
// EOS Timesheet — Configurazione centralizzata
// ──────────────────────────────────────────────
//
// Tutti i riferimenti agli ambienti esterni (BC, Graph, Teams)
// sono centralizzati qui. Per attivare un'integrazione reale,
// basta sostituire i valori mock con quelli dell'ambiente target.
// ──────────────────────────────────────────────

// ── Tipi condivisi ──

/** Stato di un singolo giorno della settimana.
 *  'half' è usato solo nei risultati delle permutazioni (mezza giornata),
 *  non è selezionabile direttamente dall'utente. */
export type DayState = 'free' | 'sw' | 'office' | 'absent' | 'half'

// ── Regole Smart Working per utente ──
// In produzione il lookup sarà fatto in Business Central.
// Per ora usiamo una mappa statica con mock user.

import type { SwRule } from './userProfile.ts'
export type { SwRule } from './userProfile.ts'

/** Mappa statica utenti → regole SW */
export const USER_RULES: Record<string, SwRule> = {
  // Mock user — Ricardo (default 60%)
  'mock-oid-ricardo': { type: 'percentage', value: 60 },

  // Esempi di altri utenti con regole diverse
  'mock-oid-collega1': { type: 'fixed', value: 2 },
  'mock-oid-collega2': { type: 'percentage', value: 40 },
  'mock-oid-collega3': { type: 'fixed', value: 3 },
}

/** Regola di default per utenti non trovati nella mappa */
export const DEFAULT_SW_RULE: SwRule = { type: 'percentage', value: 60 }

/** Microsoft user ID dell'utente mock (usato finché non c'è MSAL reale) */
export const MOCK_USER_ID = 'mock-oid-ricardo'

/** Pianificazione settimanale: 5 giorni (Lun-Ven) */
export type WeekPlan = [DayState, DayState, DayState, DayState, DayState]

/** Dati di un dipendente */
export interface EmployeeData {
  employeeId: string
  employeeName: string
  department: string
  locationCode: string
  email: string
}

/** Pianificazione di un membro del team per una settimana */
export interface TeamPlan {
  employeeId: string
  employeeName: string
  department: string
  locationCode: string
  week: WeekPlan
  swDaysRequested: number
}

/** Configurazione completa dell'applicazione */
export interface AppConfig {
  appName: string
  appVersion: string
  entraId: {
    clientId: string
    authority: string
    redirectUri: string
    scopes: string[]
  }
  businessCentral: {
    baseUrl: string
    companyId: string
    planningTableName: string
    timesheetTableName: string
  }
  graph: {
    baseUrl: string
  }
  teams: {
    webhookUrl: string
  }
  github: {
    token: string
    owner: string
    repo: string
    branch: string
    plansPath: string
  }
  features: Record<string, boolean>
  polling: {
    teamWatcherIntervalMs: number
    minApiIntervalMs: number
  }
  limits: {
    maxSavedWeeks: number
    maxWatchedMembers: number
  }
}

/**
 * Configurazione dell'applicazione.
 * Modificare questo file per adattare l'app a un tenant specifico.
 */
export const APP_CONFIG: AppConfig = {
  // ── Identità app ──
  appName: 'EOS Timesheet',
  appVersion: '3.0.0',

  // ── Microsoft Entra ID (Azure AD) ──
  // Sostituire con i valori della propria App Registration
  entraId: {
    clientId: 'YOUR_CLIENT_ID_HERE',       // Da Azure Portal → App Registration
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: (typeof window !== 'undefined' ? window.location.origin : 'http://localhost') + '/SmartWorkingDays/',
    scopes: [
      'https://api.businesscentral.dynamics.com/.default',  // BC OData
      'Calendars.ReadWrite',                                 // Outlook Calendar
      'MailboxSettings.Read',                                // Out of Office
      'User.Read',                                           // Profilo utente
    ],
  },

  // ── Business Central ──
  // Sostituire con l'URL del proprio tenant BC e Company ID
  businessCentral: {
    baseUrl: 'https://api.businesscentral.dynamics.com/v2.0/YOUR_TENANT_ID/YOUR_ENVIRONMENT',
    companyId: 'YOUR_COMPANY_ID',  // Es. 'CRONUS IT'
    // Nome della tabella custom AL per le pianificazioni SW
    planningTableName: 'customTable_SWPlanning',
    // Nome della tabella custom AL per il timesheet
    timesheetTableName: 'customTable_Timesheet',
  },

  // ── Microsoft Graph (Outlook + Teams) ──
  graph: {
    baseUrl: 'https://graph.microsoft.com/v1.0',
  },

  // ── Teams ──
  // Incoming Webhook URL configurato dall'amministratore Teams
  teams: {
    webhookUrl: '',  // Lasciare vuoto se non configurato
  },

  // ── GitHub Backend ──
  // Backend alternativo: usa un file JSON nel repo come database condiviso.
  // Richiede un GitHub Personal Access Token (classic o fine-grained) con scope repo.
  // Vedi: https://github.com/settings/tokens
  github: {
    token: '',                          // GitHub PAT (NON committare il token reale!)
    owner: 'Chuucommie',               // Username o org proprietaria del repo
    repo: 'SmartWorkingDays',          // Nome del repository
    branch: 'main',                    // Branch dove risiede data/plans.json
    plansPath: 'data/plans.json',      // Percorso del file JSON nel repo
  },

  // ── Feature flags ──
  // Attivare/disattivare moduli senza modificare il codice
  features: {
    smartWorking: true,       // Modulo pianificazione SW
    teamView: true,           // Vista team + coincidenze
    teamNotifications: true,  // Notifiche cambi stato (polling)
    savedWeeks: true,         // Template settimanali salvati
    timesheet: true,          // Modulo timesheet
    outlookIntegration: false, // Import/export calendario Outlook
    teamsNotifications: false, // Notifiche canale Teams
    bcIntegration: false,     // Salvataggio pianificazioni su BC
    githubBackend: false,    // Backend alternativo via GitHub API (JSON file-based)
  },

  // ── Polling ──
  polling: {
    teamWatcherIntervalMs: 5 * 60 * 1000, // 5 minuti
    minApiIntervalMs: 1000,               // 1 secondo tra chiamate API
  },

  // ── Limiti ──
  limits: {
    maxSavedWeeks: 20,        // Max template salvati in localStorage
    maxWatchedMembers: 15,    // Max membri del team da seguire
  },
}

/**
 * Verifica se una feature è attiva.
 */
export function isFeatureEnabled(featureName: string): boolean {
  return (APP_CONFIG.features as Record<string, boolean>)[featureName] === true
}

/**
 * Restituisce i dati mock per un dipendente (usato in assenza di BC).
 * Sostituire con chiamata reale a BC OData quando l'integrazione è attiva.
 */
export function getMockEmployeeData(): EmployeeData {
  return {
    employeeId: 'EMP001',
    employeeName: 'Ricardo Quintero',
    department: 'IT',
    locationCode: 'TREVISO',
    email: 'ricardo.quintero@eosprod.com',
  }
}

/**
 * Restituisce dati mock per i membri del team (usato in assenza di BC).
 * Sostituire con chiamata reale a BC OData quando l'integrazione è attiva.
 */
export function getMockTeamMembers(): EmployeeData[] {
  return [
    // ── Sede TREVISO ──
    {
      employeeId: 'EMP001',
      employeeName: 'Ricardo Quintero',
      department: 'IT',
      locationCode: 'TREVISO',
      email: 'ricardo.quintero@eosprod.com',
    },
    {
      employeeId: 'EMP002',
      employeeName: 'Mario Rossi',
      department: 'IT',
      locationCode: 'TREVISO',
      email: 'mario.rossi@eosprod.com',
    },
    {
      employeeId: 'EMP003',
      employeeName: 'Anna Bianchi',
      department: 'IT',
      locationCode: 'TREVISO',
      email: 'anna.bianchi@eosprod.com',
    },
    // ── Sede BOLOGNA ──
    {
      employeeId: 'EMP004',
      employeeName: 'Luca Verdi',
      department: 'IT',
      locationCode: 'BOLOGNA',
      email: 'luca.verdi@eosprod.com',
    },
    {
      employeeId: 'EMP005',
      employeeName: 'Sofia Neri',
      department: 'IT',
      locationCode: 'BOLOGNA',
      email: 'sofia.neri@eosprod.com',
    },
    // ── Sede MILANO ──
    {
      employeeId: 'EMP006',
      employeeName: 'Marco Gialli',
      department: 'IT',
      locationCode: 'MILANO',
      email: 'marco.gialli@eosprod.com',
    },
    {
      employeeId: 'EMP007',
      employeeName: 'Elena Blu',
      department: 'IT',
      locationCode: 'MILANO',
      email: 'elena.blu@eosprod.com',
    },
  ]
}

/**
 * Restituisce dati mock per le pianificazioni SW del team.
 * In produzione, questi dati arrivano da BC OData.
 */
export function getMockTeamPlans(_weekStart: string): TeamPlan[] {
  // Nessun dato finto — le pianificazioni vengono salvate in localStorage
  // e popolate dagli utenti tramite "Pubblica pianificazione"
  return []
}
