// ──────────────────────────────────────────────
// EOS Timesheet — Backend GitHub (JSON file-based)
// ──────────────────────────────────────────────
//
// Backend alternativo a Business Central.
// Usa un file JSON nel repository GitHub come "database"
// condiviso per le pianificazioni del team.
//
// Vantaggi:
//   - Zero server da mantenere
//   - Git history = audit log naturale
//   - GitHub Pages già hosta l'app → stesso repo
//   - Accesso controllato via token personali
//
// L'autenticazione usa un GitHub Personal Access Token
// (classic o fine-grained) con scope repo.
// ──────────────────────────────────────────────

import type { TeamPlan, WeekPlan } from './config.ts'

// ── Tipi ──

/** Struttura del file data/plans.json */
interface PlansFile {
  plans: StoredPlan[]
}

/** Singola pianificazione salvata nel JSON */
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

/** Risposta dell'API GitHub Contents (GET) */
interface GitHubContentResponse {
  sha: string
  content: string  // base64
  encoding: string
  size: number
}

/** Configurazione per il backend GitHub */
export interface GitHubBackendConfig {
  token: string
  owner: string
  repo: string
  branch: string
  plansPath: string
}

/** Risultato salvataggio */
export interface SaveResult {
  success: boolean
  entryId?: string
  error?: string
}

// ── Configurazione di default ──

let _config: GitHubBackendConfig | null = null

/**
 * Inizializza il backend GitHub con la configurazione.
 * Chiamare una volta all'avvio dell'app.
 */
export function initGitHubBackend(config: GitHubBackendConfig): void {
  _config = config
}

function getConfig(): GitHubBackendConfig {
  if (!_config) {
    throw new Error('GitHub backend non inizializzato. Chiamare initGitHubBackend() prima.')
  }
  return _config
}

// ── Helpers ──

/**
 * Effettua una chiamata autenticata all'API GitHub.
 */
async function githubApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cfg = getConfig()
  const url = `https://api.github.com${path}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${cfg.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...((options.headers as Record<string, string>) || {}),
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    const body = await res.text()
    let detail = body
    try {
      const parsed = JSON.parse(body)
      detail = parsed.message || body
    } catch { /* use raw body */ }
    throw new Error(`GitHub API error ${res.status}: ${detail}`)
  }

  return res.json() as Promise<T>
}

/**
 * Recupera il contenuto del file plans.json dal repo.
 */
async function fetchPlansFile(): Promise<{ plans: StoredPlan[]; sha: string }> {
  const cfg = getConfig()
  const path = `/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.plansPath}?ref=${cfg.branch}`

  const data = await githubApi<GitHubContentResponse>(path)

  // Decodifica base64 → JSON
  const jsonStr = atob(data.content.replace(/\s/g, ''))
  const parsed: PlansFile = JSON.parse(jsonStr)

  return { plans: parsed.plans || [], sha: data.sha }
}

/**
 * Salva il file plans.json nel repo (commit + push).
 */
async function savePlansFile(plans: StoredPlan[], sha: string, commitMessage: string): Promise<void> {
  const cfg = getConfig()
  const path = `/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.plansPath}`

  const content: PlansFile = { plans }
  const jsonStr = JSON.stringify(content, null, 2)
  // btoa in browser gestisce UTF-8 male, usiamo un encoder corretto
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)))

  await githubApi(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      content: base64,
      sha,
      branch: cfg.branch,
    }),
  })
}

// ── API pubbliche (stessa interfaccia di businessCentral.ts) ──

/**
 * Recupera le pianificazioni SW di tutti i dipendenti per una settimana.
 */
export async function fetchTeamPlans(weekStart: string): Promise<TeamPlan[]> {
  const { plans } = await fetchPlansFile()

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

/**
 * Recupera la pianificazione di un singolo dipendente per una settimana.
 */
export async function fetchEmployeePlan(employeeId: string, weekStart: string): Promise<TeamPlan | null> {
  const allPlans = await fetchTeamPlans(weekStart)
  return allPlans.find(p => p.employeeId === employeeId) || null
}

/**
 * Salva (crea o aggiorna) una pianificazione SW.
 * Se esiste già una pianificazione per lo stesso employeeId + weekStart,
 * la sovrascrive. Altrimenti la crea.
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
  try {
    const { plans, sha } = await fetchPlansFile()

    const now = new Date().toISOString()
    const existingIdx = plans.findIndex(
      p => p.employeeId === planning.employeeId && p.weekStart === planning.weekStart
    )

    const storedPlan: StoredPlan = {
      employeeId: planning.employeeId,
      employeeName: planning.employeeName,
      department: planning.department,
      locationCode: planning.locationCode,
      weekStart: planning.weekStart,
      week: planning.week,
      swDaysRequested: planning.swDaysRequested,
      updatedAt: now,
    }

    let commitMsg: string
    if (existingIdx >= 0) {
      plans[existingIdx] = storedPlan
      commitMsg = `✏️ Aggiorna pianificazione SW di ${planning.employeeName} (settimana ${planning.weekStart})`
    } else {
      plans.push(storedPlan)
      commitMsg = `➕ Nuova pianificazione SW di ${planning.employeeName} (settimana ${planning.weekStart})`
    }

    await savePlansFile(plans, sha, commitMsg)

    return { success: true, entryId: `${planning.employeeId}-${planning.weekStart}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto'
    console.error('[githubPlans] savePlanning fallito:', msg)
    return { success: false, error: msg }
  }
}
