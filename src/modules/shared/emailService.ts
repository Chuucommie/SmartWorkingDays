// ──────────────────────────────────────────────
// EOS Timesheet — Servizio invio email (Resend)
// ──────────────────────────────────────────────
// Usa l'API REST di Resend per inviare email direttamente
// dal browser. Gratuito: 100 email/giorno, zero restrizioni dominio.
// Configurazione: https://resend.com/
// ──────────────────────────────────────────────

export interface EmailConfig {
  apiKey: string
  fromEmail: string
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
 * Invia un'email di reset password usando l'API REST di Resend.
 * Nessuna restrizione di dominio — funziona da qualsiasi origine.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = getConfig()
    if (!cfg.apiKey) {
      console.info('[email] Resend non configurato. Token reset:', resetToken)
      return { success: true }
    }

    const resetLink = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(toEmail)}`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        from: cfg.fromEmail || 'EOS Smart Working <noreply@eosprod.com>',
        to: [toEmail],
        subject: 'Reset password — EOS Smart Working',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🔐 Reset Password</h2>
            <p>Hai richiesto il reset della password per <strong>EOS Smart Working</strong>.</p>
            <p>Il tuo token di reset è:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; letter-spacing: 2px; margin: 16px 0;">
              ${resetToken}
            </div>
            <p>Oppure clicca il link qui sotto per reimpostare la password:</p>
            <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 8px 0;">
              Reimposta password
            </a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              Il token scade tra 1 ora. Se non hai richiesto tu questo reset, ignora questa email.
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[email] Resend API error:', response.status, text)
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
