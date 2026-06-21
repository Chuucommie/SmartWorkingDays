// ──────────────────────────────────────────────
// EOS Timesheet — Notifiche Teams (Incoming Webhook)
// ──────────────────────────────────────────────
//
// STUB: In attesa del webhook URL configurato in APP_CONFIG.teams.webhookUrl.
// Quando l'URL sarà configurato, questo modulo invierà messaggi
// e Adaptive Card al canale Teams.
//
// Per ora logga i messaggi in console.
// ──────────────────────────────────────────────

import { APP_CONFIG } from './config.ts'
import type { TeamPlan } from './config.ts'

/** Risultato invio notifica */
export interface NotifyResult {
  success: boolean
  error?: string
  mock?: boolean
}

/**
 * Invia un messaggio semplice al canale Teams.
 */
export async function notifyChannel(message: string): Promise<NotifyResult> {
  const webhookUrl = APP_CONFIG.teams.webhookUrl

  if (!webhookUrl || !APP_CONFIG.features.teamsNotifications) {
    console.info('[teamsNotify] Mock — messaggio non inviato:', message.substring(0, 100))
    return { success: true, mock: true }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.5',
              body: [
                {
                  type: 'TextBlock',
                  text: message,
                  wrap: true,
                },
              ],
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Teams ha risposto ${response.status}` }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Invia una Adaptive Card riepilogativa al canale Teams.
 * Mostra la pianificazione settimanale di uno o più membri del team.
 */
export async function notifyChannelCard(teamPlans: TeamPlan[], weekStart: string): Promise<NotifyResult> {
  const webhookUrl = APP_CONFIG.teams.webhookUrl

  if (!webhookUrl || !APP_CONFIG.features.teamsNotifications) {
    console.info('[teamsNotify] Mock — card non inviata')
    return { success: true, mock: true }
  }

  const card = buildWeeklySummaryCard(teamPlans, weekStart)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card,
          },
        ],
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Teams ha risposto ${response.status}` }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/** Elemento di una Adaptive Card */
interface AdaptiveCardElement {
  type: string
  [key: string]: unknown
}

/**
 * Costruisce una Adaptive Card riepilogativa.
 * Funzione pura, testabile.
 */
export function buildWeeklySummaryCard(teamPlans: TeamPlan[], weekStart: string): AdaptiveCardElement {
  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
  const STATE_ICONS: Record<string, string> = { sw: '🏠', office: '🏢', absent: '✕', free: '◌' }

  const memberRows = teamPlans.map(plan => {
    const dayText = plan.week
      .map((state, i) => `${STATE_ICONS[state] || '◌'} ${DAY_LABELS[i]}`)
      .join(' · ')

    const swCount = plan.week.filter(s => s === 'sw').length
    const officeCount = plan.week.filter(s => s === 'office').length

    return {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: plan.employeeName, weight: 'Bolder' }],
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [{ type: 'TextBlock', text: dayText, spacing: 'Small' }],
        },
        {
          type: 'Column',
          width: 'auto',
          items: [{ type: 'TextBlock', text: `${swCount} SW · ${officeCount} Uff`, isSubtle: true }],
        },
      ],
    }
  })

  return {
    type: 'AdaptiveCard',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: `📅 Pianificazione SW — Settimana del ${weekStart}`,
        weight: 'Bolder',
        size: 'Large',
      },
      ...memberRows,
    ],
  }
}
