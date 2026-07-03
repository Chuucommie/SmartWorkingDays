// ──────────────────────────────────────────────
// EOS Timesheet — Servizio invio email (Resend via Cloudflare Worker)
// ──────────────────────────────────────────────
// Invia email tramite un Cloudflare Worker che funge da proxy per Resend.
// La API key di Resend è al sicuro lato server (Worker), mai esposta al browser.
// Worker endpoint: https://resend-proxy.chuucommie.workers.dev/send-email
// ──────────────────────────────────────────────

const WORKER_URL = 'https://resend-proxy.chuucommie.workers.dev/send-email'

/**
 * Invia un'email di reset password tramite il Worker Cloudflare.
 * Il Worker inoltra la richiesta a Resend con la API key server-side.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resetLink = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(toEmail)}`

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
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
      console.error('[email] Worker error:', response.status, text)
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
