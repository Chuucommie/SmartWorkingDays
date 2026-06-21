// ──────────────────────────────────────────────
// SmartWorkingDays — Profilo utente e regole SW
// ──────────────────────────────────────────────
//
// Ogni utente Microsoft ha la propria regola SW.
// Il lookup reale sarà fatto in Business Central;
// per ora usiamo una mappa statica con mock user.
// ──────────────────────────────────────────────

/** Regola Smart Working di un utente */
export interface SwRule {
  type: 'percentage' | 'fixed'
  value: number  // per 'percentage': 60 = 60%, per 'fixed': 2 = max 2 giorni SW
}

/** Profilo utente completo */
export interface UserProfile {
  msId: string           // Microsoft user ID (oid claim)
  displayName: string
  email: string
  swRule: SwRule
  department?: string
}

/**
 * Arrotondamento 60% standard:
 *   5 → 3.0, 4 → 2.5, 3 → 2.0, 2 → 1.0, 1 → 0.0
 */
function round60(raw: number): number {
  if (raw >= 2.4 && raw < 2.6) return 2.5
  if (raw >= 1.8 && raw < 2.1) return 2.0
  if (raw >= 1.0 && raw < 1.4) return 1.0
  if (raw <= 0.6) return 0.0
  return Math.round(raw * 2) / 2 // arrotonda al mezzo giorno più vicino
}

/**
 * Calcola il target SW e Ufficio in base alla regola e ai giorni lavorati.
 * Per regole 'fixed', il target è il valore fisso (capped ai giorni lavorati).
 * Per regole 'percentage', si applica l'arrotondamento 60%.
 */
export function computeTarget(rule: SwRule, workingDays: number): { targetSW: number; targetOffice: number } {
  if (rule.type === 'percentage') {
    const raw = (rule.value / 100) * workingDays
    const targetSW = round60(raw)
    return { targetSW, targetOffice: workingDays - targetSW }
  } else {
    // fixed: es. "massimo 2 giorni SW"
    const targetSW = Math.min(rule.value, workingDays)
    return { targetSW, targetOffice: workingDays - targetSW }
  }
}

/**
 * Mappa statica utenti → regole SW.
 * In produzione sarà sostituita da lookup in Business Central.
 */
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

/**
 * Recupera la regola SW per un dato Microsoft user ID.
 * Fallback alla regola di default se l'utente non è nella mappa.
 */
export function getSwRule(msId: string): SwRule {
  return USER_RULES[msId] ?? DEFAULT_SW_RULE
}

/**
 * Restituisce una descrizione human-readable della regola.
 */
export function describeSwRule(rule: SwRule): string {
  if (rule.type === 'percentage') {
    return `${rule.value}% SW`
  } else {
    return `Max ${rule.value} gg SW`
  }
}
