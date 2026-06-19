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

import { APP_CONFIG, getMockEmployeeData } from './config.js'

/**
 * Stato corrente dell'autenticazione.
 * @typedef {object} AuthState
 * @property {boolean} isAuthenticated
 * @property {object|null} account - Account Microsoft
 * @property {string|null} accessToken - Token di accesso
 * @property {object|null} userProfile - Profilo utente (employee data)
 */

/** @type {AuthState} */
let authState = {
  isAuthenticated: false,
  account: null,
  accessToken: null,
  userProfile: null,
}

// Callback registrate per notificare cambiamenti di stato auth
const authListeners = new Set()

/**
 * Inizializza il modulo di autenticazione.
 * In produzione: inizializza MSAL.js PublicClientApplication.
 * In mock: simula utente autenticato con dati da config.
 *
 * @returns {Promise<AuthState>}
 */
export async function initializeAuth() {
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
  // const msalInstance = new PublicClientApplication({
  //   auth: {
  //     clientId: APP_CONFIG.entraId.clientId,
  //     authority: APP_CONFIG.entraId.authority,
  //     redirectUri: APP_CONFIG.entraId.redirectUri,
  //   },
  //   cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  // })
  // await msalInstance.initialize()
  // ... handleRedirectPromise, acquireTokenSilent, etc.

  console.warn('[msAuth] Production mode non ancora implementato — usare mock')
  return initializeAuth() // fallback a mock
}

/**
 * Avvia il flusso di login interattivo.
 * In produzione: msalInstance.loginPopup() o loginRedirect().
 * In mock: imposta immediatamente autenticato.
 *
 * @returns {Promise<AuthState>}
 */
export async function login() {
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
 *
 * @returns {Promise<void>}
 */
export async function logout() {
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
 *
 * @returns {Promise<string|null>} Token di accesso o null se non autenticato
 */
export async function getAccessToken() {
  if (!authState.isAuthenticated) return null

  if (APP_CONFIG.entraId.clientId === 'YOUR_CLIENT_ID_HERE') {
    return authState.accessToken
  }

  // TODO: msalInstance.acquireTokenSilent({ scopes: APP_CONFIG.entraId.scopes, account: authState.account })
  return authState.accessToken
}

/**
 * Restituisce lo stato corrente dell'autenticazione.
 * @returns {AuthState}
 */
export function getAuthState() {
  return { ...authState }
}

/**
 * Restituisce il profilo dell'utente corrente (dipendente).
 * @returns {object|null}
 */
export function getCurrentUserProfile() {
  return authState.userProfile
}

/**
 * Restituisce l'ID del dipendente corrente.
 * @returns {string|null}
 */
export function getCurrentEmployeeId() {
  return authState.userProfile?.employeeId || null
}

/**
 * Registra un listener per cambiamenti di stato auth.
 * @param {function} listener - Callback chiamata quando authState cambia
 * @returns {function} Funzione per deregistrare il listener
 */
export function onAuthChange(listener) {
  authListeners.add(listener)
  return () => authListeners.delete(listener)
}

function notifyListeners() {
  const state = getAuthState()
  for (const listener of authListeners) {
    try { listener(state) } catch (e) { console.error('[msAuth] Listener error:', e) }
  }
}
