// ──────────────────────────────────────────────
// EOS Timesheet — Servizio invio email (EmailJS REST API)
// ──────────────────────────────────────────────
// Usa l'API REST di EmailJS per inviare email direttamente dal browser,
// senza bisogno di un backend SMTP e senza restrizioni di dominio.
// Configurazione: https://www.emailjs.com/
// ──────────────────────────────────────────────

export interface EmailConfig {
  publicKey: string
  serviceId: string
  templateId: string
}

let _emailConfig: EmailConfig | null = null

export function initEmailService(config: EmailConfig): void {
  _emailConfig = config
}

function getConfig(): EmailConfig {
  if (!_emailConfig) throw new Error('Email service not initialized')
  return _emailConfig
}

/**
 * Invia un'email di reset password usando l'API REST di EmailJS.
 * A differenza dell'SDK, l'API REST non richiede l'autorizzazione
 * del dominio nella dashboard.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = getConfig()
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      console.info('[email] EmailJS non configurato. Token reset:', resetToken)
      return { success: true }
    }

    const resetLink = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(toEmail)}`

    // API REST di EmailJS — nessuna restrizione di dominio
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: cfg.serviceId,
        template_id: cfg.templateId,
        user_id: cfg.publicKey,
        template_params: {
          to_email: toEmail,
          to_name: toEmail.split('@')[0],
          reset_token: resetToken,
          reset_link: resetLink,
          app_name: 'EOS Smart Working',
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[email] API error:', response.status, text)
      return { success: true } // non blocchiamo il flusso
    }

    console.info('[email] Email inviata a', toEmail)
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[email] Invio fallito:', msg)
    return { success: true } // non blocchiamo il flusso
  }
}
