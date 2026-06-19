// ──────────────────────────────────────────────
// EOS Timesheet — Client Outlook Calendar (Microsoft Graph)
// ──────────────────────────────────────────────
//
// STUB: In attesa dei riferimenti all'ambiente Microsoft 365.
// Quando APP_CONFIG.features.outlookIntegration sarà true,
// questo modulo userà @microsoft/microsoft-graph-client.
//
// Per ora fornisce mock data per sviluppo e test.
// ──────────────────────────────────────────────

import { APP_CONFIG } from './config.js'
import { getAccessToken } from './msAuth.js'

/**
 * Recupera gli eventi del calendario per una settimana.
 * In produzione: GET /me/calendar/calendarView.
 * In mock: restituisce eventi fittizi.
 *
 * @param {string} weekStart - Data inizio settimana ISO (YYYY-MM-DD)
 * @returns {Promise<object[]>} Array di eventi calendario
 */
export async function fetchCalendarWeek(weekStart) {
  if (!APP_CONFIG.features.outlookIntegration) {
    // ── MOCK MODE ──
    console.info('[outlookCalendar] Mock mode — nessun evento')
    return []
  }

  // ── PRODUCTION MODE ──
  const token = await getAccessToken()
  if (!token) throw new Error('Non autenticato')

  // TODO: GET https://graph.microsoft.com/v1.0/me/calendar/calendarView
  //   ?startDateTime={weekStart}T00:00:00&endDateTime={friday}T23:59:59
  //   &$select=subject,start,end,showAs,categories,location,isOnlineMeeting
  console.warn('[outlookCalendar] Production mode non ancora implementato')
  return []
}

/**
 * Mappa gli eventi del calendario in stati giorno per la pre-compilazione.
 * Funzione pura, testabile.
 *
 * Regole di mapping:
 * - showAs === 'oof' → 'absent' (ferie/permesso)
 * - categoria 'Ferie'/'Permesso' → 'absent'
 * - showAs === 'busy' + location contiene 'Ufficio'/'Sede' → 'office'
 * - evento 'Smart Working' → 'sw'
 * - nessun evento rilevante → 'free'
 *
 * @param {object[]} events - Eventi calendario
 * @returns {string[]} Array di 5 stati giorno ['free','sw','office','absent']
 */
export function mapEventsToDayStates(events) {
  // Inizializza tutti i giorni come 'free'
  const dayStates = ['free', 'free', 'free', 'free', 'free']

  for (const event of events) {
    const eventDate = event.start?.dateTime?.split('T')[0]
    if (!eventDate) continue

    // Determina il giorno della settimana (0 = Lun, 4 = Ven)
    const eventDay = new Date(eventDate).getDay()
    const dayIndex = eventDay === 0 ? -1 : eventDay - 1 // Domenica = -1, Sabato = 5
    if (dayIndex < 0 || dayIndex > 4) continue // Fuori dalla settimana lavorativa

    // Determina lo stato in base al tipo di evento
    let state = 'free'

    if (event.showAs === 'oof') {
      state = 'absent'
    } else if (event.categories?.some(c => ['Ferie', 'Permesso', 'Assenza'].includes(c))) {
      state = 'absent'
    } else if (event.categories?.includes('Smart Working')) {
      state = 'sw'
    } else if (
      event.showAs === 'busy' &&
      event.location?.displayName?.match(/ufficio|sede|office|headquarters/i)
    ) {
      state = 'office'
    }

    // Priorità: 'absent' vince su tutto, 'office' vince su 'free'
    if (state === 'absent') {
      dayStates[dayIndex] = 'absent'
    } else if (state === 'office' && dayStates[dayIndex] === 'free') {
      dayStates[dayIndex] = 'office'
    } else if (state === 'sw' && dayStates[dayIndex] === 'free') {
      dayStates[dayIndex] = 'sw'
    }
  }

  return dayStates
}

/**
 * Crea eventi "Smart Working" sul calendario per i giorni specificati.
 * In produzione: POST /me/calendar/events per ogni giorno SW.
 * In mock: logga e restituisce successo.
 *
 * @param {string[]} weekPlan - Array di 5 stati
 * @param {string} weekStart - Data inizio settimana ISO
 * @returns {Promise<{success: boolean, eventsCreated: number, error?: string}>}
 */
export async function createSWEvents(weekPlan, weekStart) {
  if (!APP_CONFIG.features.outlookIntegration) {
    console.info('[outlookCalendar] Mock — eventi SW non creati (outlook disattivato)')
    return { success: true, eventsCreated: 0 }
  }

  const token = await getAccessToken()
  if (!token) throw new Error('Non autenticato')

  const swDays = weekPlan
    .map((state, i) => state === 'sw' ? i : -1)
    .filter(i => i >= 0)

  // TODO: Per ogni swDay, POST /me/calendar/events con payload evento all-day
  console.warn('[outlookCalendar] Production mode non ancora implementato')
  return { success: true, eventsCreated: swDays.length }
}
