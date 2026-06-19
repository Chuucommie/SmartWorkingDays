// ──────────────────────────────────────────────
// SmartWorkingDays — Combinazioni settimanali salvate
// ──────────────────────────────────────────────
//
// Modulo puro (zero dipendenze DOM/React).
// Storage: localStorage del browser.
// In futuro, quando BC sarà configurato, i template potranno
// essere sincronizzati anche lato server.
// ──────────────────────────────────────────────

import { APP_CONFIG } from '../shared/config.js'

const STORAGE_KEY = 'sw-saved-weeks'
const MAX_TEMPLATES = APP_CONFIG.limits.maxSavedWeeks

/**
 * Carica tutti i template salvati.
 * @returns {object[]} Array di template, vuoto se nessuno o dati corrotti
 */
export function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Dati corrotti → reset silenzioso per non bloccare l'utente
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

/**
 * Salva un nuovo template.
 * @param {string} name - Nome descrittivo (max 50 caratteri)
 * @param {string[]} days - Array di 5 stati: 'free'|'sw'|'office'|'absent'
 * @param {number} swDaysRequested - Giorni SW desiderati dall'utente
 * @returns {{ success: boolean, error?: string, template?: object }}
 */
export function save(name, days, swDaysRequested) {
  // Validazione input
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Il nome è obbligatorio' }
  }
  if (name.length > 50) {
    return { success: false, error: 'Nome troppo lungo (max 50 caratteri)' }
  }
  if (!Array.isArray(days) || days.length !== 5) {
    return { success: false, error: 'Configurazione non valida: servono 5 giorni' }
  }
  const validStates = ['free', 'sw', 'office', 'absent']
  if (days.some(d => !validStates.includes(d))) {
    return { success: false, error: 'Configurazione non valida: stato giorno non riconosciuto' }
  }

  const all = loadAll()

  if (all.length >= MAX_TEMPLATES) {
    return { success: false, error: `Limite di ${MAX_TEMPLATES} template raggiunto. Elimina alcuni template prima di salvarne di nuovi.` }
  }

  // Nome duplicato? (case-insensitive)
  const trimmedName = name.trim()
  if (all.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, error: 'Esiste già un template con questo nome' }
  }

  const template = {
    id: crypto.randomUUID(),
    name: trimmedName,
    days,
    swDaysRequested,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  all.push(template)
  persist(all)
  return { success: true, template }
}

/**
 * Elimina un template per ID.
 * @param {string} id
 * @returns {{ success: boolean, error?: string }}
 */
export function remove(id) {
  const all = loadAll()
  const filtered = all.filter(t => t.id !== id)
  if (filtered.length === all.length) {
    return { success: false, error: 'Template non trovato' }
  }
  persist(filtered)
  return { success: true }
}

/**
 * Rinomina un template.
 * @param {string} id
 * @param {string} newName
 * @returns {{ success: boolean, error?: string, template?: object }}
 */
export function rename(id, newName) {
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: 'Il nome è obbligatorio' }
  }
  if (newName.length > 50) {
    return { success: false, error: 'Nome troppo lungo (max 50 caratteri)' }
  }

  const all = loadAll()
  const template = all.find(t => t.id === id)
  if (!template) {
    return { success: false, error: 'Template non trovato' }
  }

  const trimmedName = newName.trim()
  // Controlla duplicati (escludendo il template stesso)
  if (all.some(t => t.id !== id && t.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, error: 'Esiste già un template con questo nome' }
  }

  template.name = trimmedName
  template.updatedAt = new Date().toISOString()
  persist(all)
  return { success: true, template }
}

/**
 * Esporta tutti i template come stringa JSON (per backup).
 * @returns {string} JSON formattato
 */
export function exportAll() {
  return JSON.stringify(loadAll(), null, 2)
}

/**
 * Importa template da una stringa JSON.
 * Fa merge con i template esistenti, saltando duplicati per nome.
 * @param {string} jsonString
 * @returns {{ success: boolean, added: number, total: number, error?: string }}
 */
export function importFromJSON(jsonString) {
  let incoming
  try {
    incoming = JSON.parse(jsonString)
  } catch {
    return { success: false, added: 0, total: 0, error: 'JSON non valido' }
  }

  if (!Array.isArray(incoming)) {
    return { success: false, added: 0, total: 0, error: 'Formato non valido: array atteso' }
  }

  const all = loadAll()
  let added = 0

  for (const t of incoming) {
    if (all.length >= MAX_TEMPLATES) break
    if (!t.name || !Array.isArray(t.days) || t.days.length !== 5) continue
    if (all.some(existing => existing.name.toLowerCase() === t.name.toLowerCase())) continue

    all.push({
      id: t.id || crypto.randomUUID(),
      name: t.name,
      days: t.days,
      swDaysRequested: t.swDaysRequested || 0,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    added++
  }

  persist(all)
  return { success: true, added, total: all.length }
}

/**
 * Restituisce il numero di template salvati.
 * @returns {number}
 */
export function count() {
  return loadAll().length
}

// ── Helper interno ──

function persist(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}
