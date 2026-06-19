// ──────────────────────────────────────────────
// EOS Timesheet — Configurazione centralizzata
// ──────────────────────────────────────────────
//
// Tutti i riferimenti agli ambienti esterni (BC, Graph, Teams)
// sono centralizzati qui. Per attivare un'integrazione reale,
// basta sostituire i valori mock con quelli dell'ambiente target.
// ──────────────────────────────────────────────

/**
 * Configurazione dell'applicazione.
 * Modificare questo file per adattare l'app a un tenant specifico.
 */
export const APP_CONFIG = {
  // ── Identità app ──
  appName: 'EOS Timesheet',
  appVersion: '3.0.0',

  // ── Regola Smart Working ──
  // Modificabile per adattarsi a policy aziendali diverse dal 60%
  smartWorking: {
    ratio: 0.6, // 60% dei giorni lavorati
    daysMap: {
      // giorniLavorati → giorniSW
      5: 3.0,
      4: 2.5,
      3: 2.0,
      2: 1.0,
      1: 0.0,
      0: 0.0,
    },
    officeDaysMap: {
      // giorniLavorati → giorniUfficio
      5: 2.0,
      4: 1.5,
      3: 1.0,
      2: 1.0,
      1: 1.0,
      0: 0.0,
    },
  },

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
 * @param {string} featureName - Nome della feature in APP_CONFIG.features
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
  return APP_CONFIG.features[featureName] === true
}

/**
 * Restituisce i dati mock per un dipendente (usato in assenza di BC).
 * Sostituire con chiamata reale a BC OData quando l'integrazione è attiva.
 */
export function getMockEmployeeData() {
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
export function getMockTeamMembers() {
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
export function getMockTeamPlans(weekStart) {
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
