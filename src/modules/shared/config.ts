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

  // ── Feature flags ──
  // Attivare/disattivare moduli senza modificare il codice
  features: {
    smartWorking: true,       // Modulo pianificazione SW
    teamView: true,           // Vista team + coincidenze
    teamNotifications: true,  // Notifiche cambi stato (polling)
    savedWeeks: true,         // Template settimanali salvati
    timesheet: false,         // Modulo timesheet (in sviluppo)
    outlookIntegration: false, // Import/export calendario Outlook
    teamsNotifications: false, // Notifiche canale Teams
    bcIntegration: false,     // Salvataggio pianificazioni su BC
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
    locationCode: 'MILANO',
    email: 'ricardo.quintero@eosprod.com',
  }
}

/**
 * Restituisce dati mock per i membri del team (usato in assenza di BC).
 * Sostituire con chiamata reale a BC OData quando l'integrazione è attiva.
 */
export function getMockTeamMembers(): EmployeeData[] {
  return [
    {
      employeeId: 'EMP001',
      employeeName: 'Ricardo Quintero',
      department: 'IT',
      locationCode: 'MILANO',
      email: 'ricardo.quintero@eosprod.com',
    },
    {
      employeeId: 'EMP002',
      employeeName: 'Mario Rossi',
      department: 'IT',
      locationCode: 'MILANO',
      email: 'mario.rossi@eosprod.com',
    },
    {
      employeeId: 'EMP003',
      employeeName: 'Anna Bianchi',
      department: 'IT',
      locationCode: 'MILANO',
      email: 'anna.bianchi@eosprod.com',
    },
    {
      employeeId: 'EMP004',
      employeeName: 'Luca Verdi',
      department: 'IT',
      locationCode: 'MILANO',
      email: 'luca.verdi@eosprod.com',
    },
    {
      employeeId: 'EMP005',
      employeeName: 'Sofia Neri',
      department: 'IT',
      locationCode: 'ROMA',  // Sede diversa — non apparirà nella vista team
      email: 'sofia.neri@eosprod.com',
    },
  ]
}

/**
 * Restituisce dati mock per le pianificazioni SW del team.
 * In produzione, questi dati arrivano da BC OData.
 */
export function getMockTeamPlans(_weekStart: string): TeamPlan[] {
  // Simula pianificazioni diverse per ogni membro
  return [
    {
      employeeId: 'EMP001',
      employeeName: 'Ricardo Quintero',
      department: 'IT',
      locationCode: 'MILANO',
      week: ['sw', 'office', 'office', 'sw', 'sw'],
      swDaysRequested: 3,
    },
    {
      employeeId: 'EMP002',
      employeeName: 'Mario Rossi',
      department: 'IT',
      locationCode: 'MILANO',
      week: ['office', 'office', 'office', 'sw', 'sw'],
      swDaysRequested: 2,
    },
    {
      employeeId: 'EMP003',
      employeeName: 'Anna Bianchi',
      department: 'IT',
      locationCode: 'MILANO',
      week: ['sw', 'sw', 'office', 'office', 'office'],
      swDaysRequested: 2,
    },
    {
      employeeId: 'EMP004',
      employeeName: 'Luca Verdi',
      department: 'IT',
      locationCode: 'MILANO',
      week: ['office', 'sw', 'sw', 'sw', 'office'],
      swDaysRequested: 3,
    },
  ]
}
