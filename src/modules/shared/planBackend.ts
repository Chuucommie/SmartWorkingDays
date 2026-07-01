// ──────────────────────────────────────────────
// EOS Timesheet — Plan Backend (Facade)
// ──────────────────────────────────────────────
//
// Sceglie automaticamente il backend in base alla configurazione:
//   - githubBackend = true  → usa githubPlans.ts (JSON nel repo)
//   - bcIntegration  = true → usa businessCentral.ts (BC OData)
//   - entrambi false         → localStorage (dati reali, senza server)
//
// I consumer (teamView, teamWatcher) importano da QUI,
// non direttamente da businessCentral o githubPlans.
// ──────────────────────────────────────────────

import { APP_CONFIG } from './config.ts'
import type { TeamPlan, WeekPlan } from './config.ts'
import { getGitHubToken } from './settings.ts'

import * as BcBackend from './businessCentral.ts'
import type { SaveResult } from './businessCentral.ts'
export type { SaveResult } from './businessCentral.ts'

// ── Inizializzazione ──

let _githubInitialized = false

export async function initPlanBackend(): Promise<void> {
  if (APP_CONFIG.features.githubBackend && !_githubInitialized) {
    const { initGitHubBackend } = await import('./githubPlans.ts')
    const token = getGitHubToken() || APP_CONFIG.github.token
    initGitHubBackend({
      token,
      owner: APP_CONFIG.github.owner,
      repo: APP_CONFIG.github.repo,
      branch: APP_CONFIG.github.branch,
      plansPath: APP_CONFIG.github.plansPath,
    })
    _githubInitialized = true
    console.info('[planBackend] GitHub backend inizializzato')
  }
}

// ── localStorage backend (mock mode) ──

const LOCAL_STORAGE_KEY = 'eos-team-plans'

interface StoredPlan {
  employeeId: string
  employeeName: string
  department: string
  locationCode: string
  weekStart: string
  week: WeekPlan
  swDaysRequested: number
  updatedAt: string
}

function loadLocalPlans(): StoredPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as StoredPlan[]
  } catch {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    return []
  }
}

function saveLocalPlans(plans: StoredPlan[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans))
}

// ── API pubbliche ──

export async function fetchTeamPlans(weekStart: string): Promise<TeamPlan[]> {
  if (APP_CONFIG.features.githubBackend) {
    const { fetchTeamPlans: ghFetch } = await import('./githubPlans.ts')
    return ghFetch(weekStart)
  }

  if (APP_CONFIG.features.bcIntegration) {
    return BcBackend.fetchTeamPlans(weekStart)
  }

  // localStorage mode: restituisce i piani salvati localmente
  const plans = loadLocalPlans()
  return plans
    .filter(p => p.weekStart === weekStart)
    .map(p => ({
      employeeId: p.employeeId,
      employeeName: p.employeeName,
      department: p.department,
      locationCode: p.locationCode,
      week: p.week,
      swDaysRequested: p.swDaysRequested,
    }))
}

export async function fetchEmployeePlan(employeeId: string, weekStart: string): Promise<TeamPlan | null> {
  if (APP_CONFIG.features.githubBackend) {
    const { fetchEmployeePlan: ghFetch } = await import('./githubPlans.ts')
    return ghFetch(employeeId, weekStart)
  }

  if (APP_CONFIG.features.bcIntegration) {
    return BcBackend.fetchEmployeePlan(employeeId, weekStart)
  }

  const allPlans = await fetchTeamPlans(weekStart)
  return allPlans.find(p => p.employeeId === employeeId) || null
}

export async function savePlanning(planning: {
  employeeId: string
  employeeName: string
  department: string
  locationCode: string
  weekStart: string
  week: WeekPlan
  swDaysRequested: number
}): Promise<SaveResult> {
  if (APP_CONFIG.features.githubBackend) {
    const { savePlanning: ghSave } = await import('./githubPlans.ts')
    return ghSave(planning)
  }

  if (APP_CONFIG.features.bcIntegration) {
    return BcBackend.savePlanning(planning)
  }

  // localStorage mode: salva localmente
  try {
    const plans = loadLocalPlans()
    const now = new Date().toISOString()

    const existingIdx = plans.findIndex(
      p => p.employeeId === planning.employeeId && p.weekStart === planning.weekStart
    )

    const stored: StoredPlan = {
      employeeId: planning.employeeId,
      employeeName: planning.employeeName,
      department: planning.department,
      locationCode: planning.locationCode,
      weekStart: planning.weekStart,
      week: planning.week,
      swDaysRequested: planning.swDaysRequested,
      updatedAt: now,
    }

    if (existingIdx >= 0) {
      plans[existingIdx] = stored
    } else {
      plans.push(stored)
    }

    saveLocalPlans(plans)
    console.info('[planBackend] Piano salvato in localStorage:', stored.employeeName, stored.weekStart)
    return { success: true, entryId: `${planning.employeeId}-${planning.weekStart}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto'
    console.error('[planBackend] savePlanning fallito:', msg)
    return { success: false, error: msg }
  }
}
