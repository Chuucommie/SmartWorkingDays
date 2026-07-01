// ──────────────────────────────────────────────
// EOS Timesheet — Plan Backend (Facade)
// ──────────────────────────────────────────────
//
// Sceglie automaticamente il backend in base alla configurazione:
//   - githubBackend = true  → usa githubPlans.ts (JSON nel repo)
//   - bcIntegration  = true → usa businessCentral.ts (BC OData)
//   - entrambi false         → mock data da config.ts
//
// I consumer (teamView, teamWatcher) importano da QUI,
// non direttamente da businessCentral o githubPlans.
// ──────────────────────────────────────────────

import { APP_CONFIG, getMockTeamPlans } from './config.ts'
import type { TeamPlan, WeekPlan } from './config.ts'
import { getGitHubToken } from './settings.ts'

// Import condizionali: i bundler moderni (Vite) fanno tree-shaking,
// ma per sicurezza usiamo import dinamici solo quando servono.
// In realtà Vite include tutto nel bundle, ma il codice inutilizzato
// viene rimosso. Usiamo un approccio lazy per evitare di importare
// githubPlans se non configurato.

import * as BcBackend from './businessCentral.ts'
import type { SaveResult } from './businessCentral.ts'
export type { SaveResult } from './businessCentral.ts'

// ── Inizializzazione ──

let _githubInitialized = false

/**
 * Inizializza il backend GitHub se configurato.
 * Chiamare all'avvio dell'app (es. in main.tsx o App.tsx).
 */
export async function initPlanBackend(): Promise<void> {
  if (APP_CONFIG.features.githubBackend && !_githubInitialized) {
    const { initGitHubBackend } = await import('./githubPlans.ts')
    // Usa il token dalle impostazioni utente (localStorage), con fallback al config
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

// ── API pubbliche ──

/**
 * Recupera le pianificazioni SW di tutti i dipendenti per una settimana.
 */
export async function fetchTeamPlans(weekStart: string): Promise<TeamPlan[]> {
  if (APP_CONFIG.features.githubBackend) {
    const { fetchTeamPlans: ghFetch } = await import('./githubPlans.ts')
    return ghFetch(weekStart)
  }

  if (APP_CONFIG.features.bcIntegration) {
    return BcBackend.fetchTeamPlans(weekStart)
  }

  // Fallback: mock data
  console.info('[planBackend] Mock mode — usando dati team da config')
  await new Promise(r => setTimeout(r, 300 + Math.random() * 500))
  return getMockTeamPlans(weekStart)
}

/**
 * Recupera la pianificazione di un singolo dipendente per una settimana.
 */
export async function fetchEmployeePlan(employeeId: string, weekStart: string): Promise<TeamPlan | null> {
  if (APP_CONFIG.features.githubBackend) {
    const { fetchEmployeePlan: ghFetch } = await import('./githubPlans.ts')
    return ghFetch(employeeId, weekStart)
  }

  if (APP_CONFIG.features.bcIntegration) {
    return BcBackend.fetchEmployeePlan(employeeId, weekStart)
  }

  // Fallback: mock
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200))
  const allPlans = getMockTeamPlans(weekStart)
  return allPlans.find(p => p.employeeId === employeeId) || null
}

/**
 * Salva una pianificazione SW.
 */
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

  // Fallback: mock
  console.info('[planBackend] Mock save:', planning)
  await new Promise(r => setTimeout(r, 200))
  return { success: true, entryId: 'mock-entry-' + Date.now() }
}
