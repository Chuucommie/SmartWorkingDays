// ──────────────────────────────────────────────
// EOS Timesheet — Autenticazione Microsoft (MSAL.js)
// ──────────────────────────────────────────────
//
// STUB: In attesa dei riferimenti all'ambiente Entra ID.
// Quando APP_CONFIG.entraId.clientId sarà configurato,
// questo modulo userà MSAL.js per il flusso OAuth PKCE.
//
// Per ora fornisce un mock che simula un utente autenticato.
// ──────────────────────────────────────────────

import { APP_CONFIG, getMockEmployeeData, MOCK_USER_ID } from './config.ts'
import type { EmployeeData } from './config.ts'

/** Stato corrente dell'autenticazione */
export interface AuthState {
  isAuthenticated: boolean
  account: { username: string; name: string } | null
  accessToken: string | null
  userProfile: EmployeeData | null
}

/** @type {AuthState} */
let authState: AuthState = {
  isAuthenticated: false,
  account: null,
  accessToken: null,
  userProfile: null,
}

// Callback registrate per notificare cambiamenti di stato auth
const authListeners = new Set<(state: AuthState) => void>()

/**
 * Inizializza il modulo di autenticazione.
 * In produzione: inizializza MSAL.js PublicClientApplication.
 * In mock: simula utente autenticato con dati da config.
 */
export async function initializeAuth(): Promise<AuthState> {
  const clientId = APP_CONFIG.entraId.clientId

  if (clientId === 'YOUR_CLIENT_ID_HERE') {
    // ── MOCK MODE ──
    // Nessun client ID configurato → usa dati mock
    console.info('[msAuth] Mock mode — usando dati dipendente da config')
    const mockEmployee = getMockEmployeeData()
    authState = {
      isAuthenticated: true,
      account: { username: mockEmployee.email, name: mockEmployee.employeeName },
      accessToken: 'mock-token-for-development',
      userProfile: mockEmployee,
    }
    notifyListeners()
    return authState
  }

  // ── PRODUCTION MODE ──
  // TODO: Inizializzare MSAL.js quando i riferimenti sono configurati
  console.warn('[msAuth] Production mode non ancora implementato — usare mock')
  return initializeAuth() // fallback a mock
}

/**
 * Avvia il flusso di login interattivo.
 * In produzione: msalInstance.loginPopup() o loginRedirect().
 * In mock: imposta immediatamente autenticato.
 */
export async function login(): Promise<AuthState> {
  if (APP_CONFIG.entraId.clientId === 'YOUR_CLIENT_ID_HERE') {
    // Mock: già autenticato dopo initializeAuth
    return authState
  }
  // TODO: msalInstance.loginPopup({ scopes: APP_CONFIG.entraId.scopes })
  return authState
}

/**
 * Effettua il logout.
 * In produzione: msalInstance.logoutPopup().
 * In mock: resetta lo stato.
 */
export async function logout(): Promise<void> {
  authState = {
    isAuthenticated: false,
    account: null,
    accessToken: null,
    userProfile: null,
  }
  notifyListeners()
}

/**
 * Ottiene un token di accesso valido (silent refresh se necessario).
 */
export async function getAccessToken(): Promise<string | null> {
  if (!authState.isAuthenticated) return null

  if (APP_CONFIG.entraId.clientId === 'YOUR_CLIENT_ID_HERE') {
    return authState.accessToken
  }

  // TODO: msalInstance.acquireTokenSilent({ scopes: APP_CONFIG.entraId.scopes, account: authState.account })
  return authState.accessToken
}

/**
 * Restituisce lo stato corrente dell'autenticazione.
 */
export function getAuthState(): AuthState {
  return { ...authState }
}

/**
 * Restituisce il profilo dell'utente corrente (dipendente).
 */
export function getCurrentUserProfile(): EmployeeData | null {
  return authState.userProfile
}

/**
 * Restituisce l'ID del dipendente corrente.
 */
export function getCurrentEmployeeId(): string | null {
  return authState.userProfile?.employeeId || null
}

/**
 * Registra un listener per cambiamenti di stato auth.
 * @returns Funzione per deregistrare il listener
 */
export function onAuthChange(listener: (state: AuthState) => void): () => void {
  authListeners.add(listener)
  return () => { authListeners.delete(listener) }
}

function notifyListeners(): void {
  const state = getAuthState()
  for (const listener of authListeners) {
    try { listener(state) } catch (e) { console.error('[msAuth] Listener error:', e) }
  }
}

/**
 * Restituisce il Microsoft user ID (oid) dell'utente corrente.
 * In mock mode restituisce MOCK_USER_ID.
 * In produzione: dal token ID.
 */
export function getCurrentMsId(): string | null {
  if (APP_CONFIG.entraId.clientId === 'YOUR_CLIENT_ID_HERE') {
    return MOCK_USER_ID
  }
  // TODO: estrarre oid dal token ID
  return authState.account?.username ?? null
}
