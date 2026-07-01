// ──────────────────────────────────────────────
// EOS Timesheet — Configurazione centralizzata
// ──────────────────────────────────────────────

export type DayState = 'free' | 'sw' | 'office' | 'absent' | 'half'

import type { SwRule } from './userProfile.ts'
export type { SwRule } from './userProfile.ts'

export const USER_RULES: Record<string, SwRule> = {
  'mock-oid-ricardo': { type: 'percentage', value: 60 },
  'mock-oid-collega1': { type: 'fixed', value: 2 },
  'mock-oid-collega2': { type: 'percentage', value: 40 },
  'mock-oid-collega3': { type: 'fixed', value: 3 },
}

export const DEFAULT_SW_RULE: SwRule = { type: 'percentage', value: 60 }
export const MOCK_USER_ID = 'mock-oid-ricardo'

export type WeekPlan = [DayState, DayState, DayState, DayState, DayState]

export interface EmployeeData {
  employeeId: string; employeeName: string; department: string; locationCode: string; email: string
}

export interface TeamPlan {
  employeeId: string; employeeName: string; department: string; locationCode: string
  week: WeekPlan; swDaysRequested: number
}

export interface AppConfig {
  appName: string; appVersion: string
  entraId: { clientId: string; authority: string; redirectUri: string; scopes: string[] }
  businessCentral: { baseUrl: string; companyId: string; planningTableName: string; timesheetTableName: string }
  graph: { baseUrl: string }
  teams: { webhookUrl: string }
  github: { token: string; owner: string; repo: string; branch: string; plansPath: string }
  turso: { url: string; token: string }
  features: Record<string, boolean>
  polling: { teamWatcherIntervalMs: number; minApiIntervalMs: number }
  limits: { maxSavedWeeks: number; maxWatchedMembers: number }
}

export const APP_CONFIG: AppConfig = {
  appName: 'EOS Timesheet',
  appVersion: '4.0.0',

  entraId: {
    clientId: 'YOUR_CLIENT_ID_HERE',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: (typeof window !== 'undefined' ? window.location.origin : 'http://localhost') + '/SmartWorkingDays/',
    scopes: [
      'https://api.businesscentral.dynamics.com/.default',
      'Calendars.ReadWrite',
      'MailboxSettings.Read',
      'User.Read',
    ],
  },

  businessCentral: {
    baseUrl: 'https://api.businesscentral.dynamics.com/v2.0/YOUR_TENANT_ID/YOUR_ENVIRONMENT',
    companyId: 'YOUR_COMPANY_ID',
    planningTableName: 'customTable_SWPlanning',
    timesheetTableName: 'customTable_Timesheet',
  },

  graph: { baseUrl: 'https://graph.microsoft.com/v1.0' },
  teams: { webhookUrl: '' },

  github: {
    token: '',
    owner: 'Chuucommie',
    repo: 'SmartWorkingDays',
    branch: 'main',
    plansPath: 'data/plans.json',
  },

  turso: {
    url: 'libsql://smartworking-chuucommie.aws-eu-west-1.turso.io',
    token: '1|eyJhbG...p2AQ',
  },

  features: {
    smartWorking: true,
    teamView: true,
    teamNotifications: true,
    savedWeeks: true,
    timesheet: true,
    outlookIntegration: false,
    teamsNotifications: false,
    bcIntegration: false,
    githubBackend: false,
    tursoBackend: true,
  },

  polling: {
    teamWatcherIntervalMs: 5 * 60 * 1000,
    minApiIntervalMs: 1000,
  },

  limits: {
    maxSavedWeeks: 20,
    maxWatchedMembers: 15,
  },
}

export function isFeatureEnabled(featureName: string): boolean {
  return (APP_CONFIG.features as Record<string, boolean>)[featureName] === true
}

export function getMockEmployeeData(): EmployeeData {
  return {
    employeeId: 'EMP001',
    employeeName: 'Ricardo Quintero',
    department: 'IT',
    locationCode: 'TREVISO',
    email: 'ricardo.quintero@eosprod.com',
  }
}

export function getMockTeamMembers(): EmployeeData[] {
  return [
    { employeeId: 'EMP001', employeeName: 'Ricardo Quintero', department: 'IT', locationCode: 'TREVISO', email: 'ricardo.quintero@eosprod.com' },
    { employeeId: 'EMP002', employeeName: 'Mario Rossi', department: 'IT', locationCode: 'TREVISO', email: 'mario.rossi@eosprod.com' },
    { employeeId: 'EMP003', employeeName: 'Anna Bianchi', department: 'IT', locationCode: 'TREVISO', email: 'anna.bianchi@eosprod.com' },
    { employeeId: 'EMP004', employeeName: 'Luca Verdi', department: 'IT', locationCode: 'BOLOGNA', email: 'luca.verdi@eosprod.com' },
    { employeeId: 'EMP005', employeeName: 'Sofia Neri', department: 'IT', locationCode: 'BOLOGNA', email: 'sofia.neri@eosprod.com' },
    { employeeId: 'EMP006', employeeName: 'Marco Gialli', department: 'IT', locationCode: 'MILANO', email: 'marco.gialli@eosprod.com' },
    { employeeId: 'EMP007', employeeName: 'Elena Blu', department: 'IT', locationCode: 'MILANO', email: 'elena.blu@eosprod.com' },
  ]
}

export function getMockTeamPlans(_weekStart: string): TeamPlan[] {
  return []
}
